import { Menu, app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import { getCatalogStats } from '../shared/catalog'
import { CODEC_VARIANTS } from '../shared/codecs'
import { FORMATS } from '../shared/formats'
import type { PanelId } from '../shared/panels'
import { DEFAULT_PRESET_ID, PRESETS, getPreset, presetsGrouped } from '../shared/presets'
import type { AppSettings } from '../shared/types'
import { resolveBundledFfmpeg } from './bundledFfmpeg'
import { clearHardwareCache, detectHardwareCapabilities } from './hardwareDetect'
import { InboxWatcher, inboxDirectory } from './inbox'
import { IntakeServer } from './intakeServer'
import {
  defaultBrowserRoot,
  listBrowserDirectory,
  type BrowserListMode
} from './mediaBrowser'
import { PanelWindowManager } from './panelWindows'
import { EncodeQueue } from './queue'
import {
  ffmpegSourceLabel,
  loadSettings,
  normalizeAppSettings,
  saveSettings
} from './settings'
import { WatchFolderManager } from './watchFolder'

let mainWindow: BrowserWindow | null = null
let settings: AppSettings
let queue: EncodeQueue
let watchers: WatchFolderManager
let intake: IntakeServer | null = null
let inbox: InboxWatcher
let panels: PanelWindowManager
let uiState = {
  activePresetId: DEFAULT_PRESET_ID,
  selectedJobIds: [] as string[]
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Encode This',
    backgroundColor: '#1a1a1a',
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  const emitWinState = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    mainWindow.webContents.send('window:state', {
      maximized: mainWindow.isMaximized()
    })
  }
  mainWindow.on('maximize', emitWinState)
  mainWindow.on('unmaximize', emitWinState)

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
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload)
  }
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

  ipcMain.handle('settings:get', () => ({
    ...settings,
    ffmpegSource: ffmpegSourceLabel(settings),
    ffmpegBundled: Boolean(resolveBundledFfmpeg())
  }))
  ipcMain.handle('settings:set', async (_e, next: AppSettings) => {
    const prev = settings
    settings = normalizeAppSettings(next)
    saveSettings(settings)
    queue.updateSettings(settings)
    if (prev.ffmpegPath !== settings.ffmpegPath) {
      clearHardwareCache()
    }
    if (
      prev.intakeEnabled !== settings.intakeEnabled ||
      prev.intakePort !== settings.intakePort
    ) {
      await restartIntake()
    }
    broadcast('settings:changed', {
      ...settings,
      ffmpegSource: ffmpegSourceLabel(settings),
      ffmpegBundled: Boolean(resolveBundledFfmpeg())
    })
    return {
      ...settings,
      ffmpegSource: ffmpegSourceLabel(settings),
      ffmpegBundled: Boolean(resolveBundledFfmpeg())
    }
  })

  ipcMain.handle('hardware:detect', async (_e, force?: boolean) => {
    return detectHardwareCapabilities(settings.ffmpegPath, Boolean(force))
  })

  ipcMain.handle('intake:status', () => ({
    enabled: settings.intakeEnabled,
    port: settings.intakePort,
    address: intake ? `http://127.0.0.1:${settings.intakePort}` : null,
    inboxDir: inboxDirectory()
  }))

  ipcMain.handle('panels:getWorkspace', () => panels.getWorkspace())
  ipcMain.handle('panels:setRoot', (_e, root: unknown) => {
    panels.setRootSilent(root as import('../shared/workspaceLayout').WorkspaceState['root'])
  })
  ipcMain.handle('panels:getState', () => panels.getState())
  ipcMain.handle('panels:undock', (_e, id: PanelId) => panels.undock(id))
  ipcMain.handle('panels:dock', (_e, id: PanelId, edge?: 'left' | 'right' | 'top' | 'bottom') =>
    panels.dock(id, edge ?? 'right')
  )
  ipcMain.handle('panels:dockAt', (_e, id: PanelId, target: unknown) =>
    panels.dockAt(id, target as Parameters<typeof panels.dockAt>[1])
  )
  ipcMain.handle('panels:close', (_e, id: PanelId) => panels.close(id))
  ipcMain.handle('panels:dockAll', () => panels.dockAll())
  ipcMain.handle('panels:showAll', () => panels.showAll())
  ipcMain.handle('panels:dragBegin', (_e, id: PanelId, fromFloating: boolean) => {
    panels.beginDrag(id, fromFloating)
  })
  ipcMain.handle('panels:dragTarget', (_e, target: unknown) => {
    panels.updateDragTarget(target as Parameters<typeof panels.updateDragTarget>[0])
  })
  ipcMain.handle('panels:dragEnd', (_e, action: 'dock' | 'undock' | 'cancel') =>
    panels.endDrag(action)
  )
  ipcMain.handle('panels:hitTestMain', () => panels.hitTestMainWindow())

  ipcMain.handle('ui:getState', () => uiState)
  ipcMain.handle('ui:setActivePreset', (_e, presetId: string) => {
    uiState.activePresetId = presetId
    broadcast('ui:changed', uiState)
    return uiState
  })
  ipcMain.handle('ui:setSelectedJobs', (_e, ids: string[]) => {
    uiState.selectedJobIds = ids
    broadcast('ui:changed', uiState)
    return uiState
  })

  ipcMain.handle('fs:listMediaDirectory', (_e, dirPath?: string) => {
    return listBrowserDirectory(dirPath || defaultBrowserRoot(), 'media')
  })
  ipcMain.handle(
    'fs:listDirectory',
    (_e, dirPath?: string, mode?: BrowserListMode) => {
      if (!dirPath) return listBrowserDirectory('', mode ?? 'media')
      return listBrowserDirectory(dirPath, mode ?? 'media')
    }
  )
  ipcMain.handle('fs:defaultMediaRoot', () => defaultBrowserRoot())

  function windowFromEvent(e: Electron.IpcMainInvokeEvent): BrowserWindow | null {
    return BrowserWindow.fromWebContents(e.sender)
  }

  ipcMain.handle('window:minimize', (e) => {
    windowFromEvent(e)?.minimize()
  })
  ipcMain.handle('window:maximizeToggle', (e) => {
    const win = windowFromEvent(e)
    if (!win) return false
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
    return win.isMaximized()
  })
  ipcMain.handle('window:close', (e) => {
    windowFromEvent(e)?.close()
  })
  ipcMain.handle('window:isMaximized', (e) => {
    return Boolean(windowFromEvent(e)?.isMaximized())
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
  ipcMain.handle('queue:setOutputPath', (_e, ids: string[], outputPath: string) => {
    queue.setOutputPath(ids, outputPath)
    return queue.list()
  })
  ipcMain.handle('queue:setOutputFileName', (_e, ids: string[], fileName: string) => {
    queue.setOutputFileName(ids, fileName)
    return queue.list()
  })
  ipcMain.handle('queue:setOutputDirectory', (_e, ids: string[], directory: string) => {
    queue.setOutputDirectory(ids, directory)
    return queue.list()
  })
  ipcMain.handle(
    'queue:setExportTracks',
    (_e, ids: string[], tracks: { exportVideo?: boolean; exportAudio?: boolean }) => {
      queue.setExportTracks(ids, tracks)
      return queue.list()
    }
  )
  ipcMain.handle(
    'queue:setAudioOverrides',
    (_e, ids: string[], overrides: Partial<import('../shared/types').AudioSettings>) => {
      queue.setAudioOverrides(ids, overrides)
      return queue.list()
    }
  )
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

  panels = new PanelWindowManager({
    preloadPath: path.join(__dirname, '../preload/index.js'),
    getMainWindow: () => mainWindow,
    onChange: (state) => broadcast('panels:changed', state),
    onDrag: (session, target) => broadcast('panels:drag', { session, target })
  })

  queue.on('change', (jobs) => broadcast('queue:changed', jobs))
  queue.on('progress', (p) => broadcast('queue:progress', p))
  queue.on('state', (s) => broadcast('queue:state', s))

  registerIpc()
  // No native OS menu — all chrome lives in the app UI.
  Menu.setApplicationMenu(null)
  createWindow()

  // Warm hardware probe so Preferences / first encode are snappy.
  void detectHardwareCapabilities(settings.ffmpegPath).catch(() => undefined)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  watchers.dispose()
  inbox.stop()
  void intake?.stop()
  panels.dispose()
  app.quit()
})
