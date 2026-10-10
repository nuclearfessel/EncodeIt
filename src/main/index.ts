import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import path from 'path'
import { getCatalogStats } from '../shared/catalog'
import { CODEC_VARIANTS } from '../shared/codecs'
import { FORMATS } from '../shared/formats'
import { DEFAULT_PRESET_ID, PRESETS, getPreset, presetsGrouped } from '../shared/presets'
import type { AppSettings } from '../shared/types'
import { InboxWatcher, inboxDirectory } from './inbox'
import { IntakeServer } from './intakeServer'
import { EncodeQueue } from './queue'
import { loadSettings, saveSettings } from './settings'
import { WatchFolderManager } from './watchFolder'

let mainWindow: BrowserWindow | null = null
let settings: AppSettings
let queue: EncodeQueue
let watchers: WatchFolderManager
let intake: IntakeServer | null = null
let inbox: InboxWatcher

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'Encode This',
    backgroundColor: '#12151a',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function broadcast(channel: string, payload: unknown): void {
  mainWindow?.webContents.send(channel, payload)
}

function registerIpc(): void {
  ipcMain.handle('catalog:get', () => ({
    formats: FORMATS,
    codecs: CODEC_VARIANTS,
    presets: PRESETS,
    grouped: Object.fromEntries(
      [...presetsGrouped().entries()].map(([group, subgroups]) => [
        group,
        Object.fromEntries(subgroups.entries())
      ])
    ),
    stats: getCatalogStats(),
    defaultPresetId: DEFAULT_PRESET_ID
  }))

  ipcMain.handle('settings:get', () => settings)
  ipcMain.handle('settings:set', async (_e, next: AppSettings) => {
    const prev = settings
    settings = next
    saveSettings(settings)
    queue.updateSettings(settings)
    if (
      prev.intakeEnabled !== next.intakeEnabled ||
      prev.intakePort !== next.intakePort
    ) {
      await restartIntake()
    }
    return settings
  })

  ipcMain.handle('intake:status', () => ({
    enabled: settings.intakeEnabled,
    port: settings.intakePort,
    address: intake ? `http://127.0.0.1:${settings.intakePort}` : null,
    inboxDir: inboxDirectory()
  }))

  ipcMain.handle('dialog:openFiles', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Media',
          extensions: [
            'mp4',
            'mov',
            'mkv',
            'mxf',
            'avi',
            'm4v',
            'wmv',
            'mpg',
            'mpeg',
            'm2ts',
            'ts',
            'webm',
            'mp3',
            'wav',
            'aif',
            'aiff',
            'flac',
            'aac',
            'm4a',
            'png',
            'jpg',
            'jpeg',
            'tif',
            'tiff',
            'exr',
            'dpx',
            'tga',
            'bmp'
          ]
        },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory', 'createDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('queue:list', () => queue.list())
  ipcMain.handle('queue:add', async (_e, paths: string[], presetId?: string) => {
    return queue.addFiles(paths, presetId ?? DEFAULT_PRESET_ID)
  })
  ipcMain.handle('queue:remove', (_e, ids: string[]) => {
    queue.remove(ids)
    return queue.list()
  })
  ipcMain.handle('queue:clearDone', () => {
    queue.clearDone()
    return queue.list()
  })
  ipcMain.handle('queue:clearAll', () => {
    queue.clearAll()
    return queue.list()
  })
  ipcMain.handle('queue:setPreset', (_e, ids: string[], presetId: string) => {
    queue.setPreset(ids, presetId)
    return queue.list()
  })
  ipcMain.handle('queue:start', async () => {
    void queue.start()
    return { ok: true }
  })
  ipcMain.handle('queue:stop', () => {
    queue.stop()
    return { ok: true }
  })

  ipcMain.handle('watch:list', () => watchers.list())
  ipcMain.handle(
    'watch:add',
    (_e, folderPath: string, presetId: string, outputDir: string) => {
      return watchers.add(folderPath, presetId, outputDir)
    }
  )
  ipcMain.handle('watch:remove', (_e, id: string) => {
    watchers.remove(id)
    return watchers.list()
  })
  ipcMain.handle('watch:setEnabled', (_e, id: string, enabled: boolean) => {
    watchers.setEnabled(id, enabled)
    return watchers.list()
  })

  ipcMain.handle('shell:showItem', (_e, filePath: string) => {
    shell.showItemInFolder(filePath)
  })
  ipcMain.handle('shell:openPath', (_e, filePath: string) => shell.openPath(filePath))

  ipcMain.handle('preset:get', (_e, id: string) => getPreset(id))
}

async function restartIntake(): Promise<void> {
  if (intake) {
    await intake.stop()
    intake = null
  }
  if (!settings.intakeEnabled) return
  intake = new IntakeServer(queue, { port: settings.intakePort })
  try {
    await intake.start()
  } catch (err) {
    console.error('Intake server failed to start', err)
    intake = null
  }
}

app.whenReady().then(async () => {
  settings = await loadSettings()
  queue = new EncodeQueue(settings)
  watchers = new WatchFolderManager(queue)
  inbox = new InboxWatcher(queue)
  inbox.start()
  await restartIntake()

  queue.on('change', (jobs) => broadcast('queue:changed', jobs))
  queue.on('progress', (p) => broadcast('queue:progress', p))
  queue.on('state', (s) => broadcast('queue:state', s))

  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  watchers.dispose()
  inbox.stop()
  void intake?.stop()
  if (process.platform !== 'darwin') app.quit()
})
