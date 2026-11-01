import { Menu, app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import type { PanelId } from '../shared/panels'
import { DEFAULT_PRESET_ID } from '../shared/presets'
import type { InstallOptions } from '../shared/installOptions'
import type { AppSettings, AudioSettings, PresetDefinition, VideoSettings } from '../shared/types'
import { resolveBundledFfmpeg } from './bundledFfmpeg'
import { clearHardwareCache, detectHardwareCapabilities } from './hardwareDetect'
import { detectHostApps } from './hostAppDetect'
import { coachHostsFor } from './hostAddons'
import {
  clearInstallOptionsFile,
  ensureHostFolders,
  flagsFromInstallOptions,
  readInstallOptionsFile,
  resolveHostFolderLayout,
  watchFolderSeedsForFlags
} from './hostFolders'
import type { HostAppPresence } from '../shared/hostAppDetect'
import { emptyHostAppPresence } from '../shared/hostAppDetect'
import { InboxWatcher, inboxDirectory } from './inbox'
import { IntakeServer } from './intakeServer'
import {
  defaultBrowserRoot,
  listBrowserDirectory,
  type BrowserListMode
} from './mediaBrowser'
import { DocsWindowManager } from './docsWindow'
import { runCleanup } from './cleanup'
import { getLogPath, logger } from './logger'
import { PanelWindowManager } from './panelWindows'
import { UpdateChecker } from './updateCheck'
import { catalogPayload, findPreset } from './presetCatalog'
import {
  deleteUserPreset,
  listUserPresets,
  renameUserPreset,
  saveUserPreset
} from './userPresets'
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
let intakeError: string | null = null
let inbox: InboxWatcher
let panels: PanelWindowManager
let docsWindow: DocsWindowManager
let updateChecker!: UpdateChecker
/** Pending first-launch setup when installer did not write install-options.json (e.g. DMG). */
let needsIntegrationSetup = false
/** One-shot coach after integration setup until dismissed. */
let showIntegrationCoach = false
/** Which host add-ons the coach should mention (empty = hide paths / no coach). */
let integrationCoachHosts: HostAppPresence = emptyHostAppPresence()
let uiState = {
  activePresetId: DEFAULT_PRESET_ID,
  selectedJobIds: [] as string[]
}

function applyIntegrationChoices(options: InstallOptions): void {
  const flags = flagsFromInstallOptions(options)
  const layout = ensureHostFolders(flags)
  if (watchers.list().length === 0) {
    for (const seed of watchFolderSeedsForFlags(layout, flags)) {
      watchers.add(seed.path, seed.presetId, seed.outputDir)
    }
  }
  settings = normalizeAppSettings({
    ...settings,
    watchFolders: watchers.toSettings(),
    hostFoldersSeeded: true,
    outputDirectory: settings.outputDirectory || layout.output
  })
  saveSettings(settings)
  clearInstallOptionsFile()
  needsIntegrationSetup = false
  // Only coach when EncodeIt CEP / JSX / Resolve scripts are actually installed
  // for the hosts we just set up — folder creation alone must not trigger it.
  integrationCoachHosts = coachHostsFor(flags)
  showIntegrationCoach = Boolean(
    integrationCoachHosts.afterEffects ||
      integrationCoachHosts.resolve ||
      integrationCoachHosts.premiere
  )
  queue.updateSettings(settings)
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'EncodeIt',
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
  ipcMain.handle('catalog:get', () => catalogPayload())

  function settingsPayload() {
    return {
      ...settings,
      ffmpegSource: ffmpegSourceLabel(settings),
      ffmpegBundled: Boolean(resolveBundledFfmpeg()),
      hostFolders: resolveHostFolderLayout(),
      needsIntegrationSetup,
      showIntegrationCoach,
      integrationCoachHosts: showIntegrationCoach ? integrationCoachHosts : undefined,
      hostAppPresence: detectHostApps()
    }
  }

  ipcMain.handle('settings:get', () => settingsPayload())
  ipcMain.handle('settings:set', async (_e, next: AppSettings) => {
    const prev = settings
    // Watch folders are managed via watch:* IPC — never wipe them from Preferences OK.
    settings = normalizeAppSettings({
      ...next,
      watchFolders: watchers.toSettings(),
      hostFoldersSeeded: settings.hostFoldersSeeded || Boolean(next.hostFoldersSeeded)
    })
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
    if (prev.checkForUpdatesEnabled !== settings.checkForUpdatesEnabled) {
      updateChecker.setEnabled(settings.checkForUpdatesEnabled, { checkNow: true })
    }
    const payload = settingsPayload()
    broadcast('settings:changed', payload)
    return payload
  })

  ipcMain.handle('hardware:detect', async (_e, force?: boolean) => {
    return detectHardwareCapabilities(settings.ffmpegPath, Boolean(force))
  })

  ipcMain.handle('intake:status', () => ({
    enabled: settings.intakeEnabled,
    port: settings.intakePort,
    address: intake ? `http://127.0.0.1:${settings.intakePort}` : null,
    inboxDir: inboxDirectory(),
    error: intakeError
  }))

  ipcMain.handle('integrations:completeSetup', (_e, options: InstallOptions) => {
    applyIntegrationChoices(options)
    const payload = settingsPayload()
    broadcast('settings:changed', payload)
    return payload
  })

  ipcMain.handle('integrations:dismissCoach', () => {
    showIntegrationCoach = false
    integrationCoachHosts = emptyHostAppPresence()
    const payload = settingsPayload()
    broadcast('settings:changed', payload)
    return payload
  })

  ipcMain.handle('logs:getPath', () => getLogPath())
  ipcMain.handle('logs:open', async () => {
    const file = getLogPath()
    logger.info('Opening log file from UI')
    return shell.openPath(file)
  })
  ipcMain.handle('logs:showInFolder', () => {
    shell.showItemInFolder(getLogPath())
  })

  ipcMain.handle('updates:getStatus', () => updateChecker.getStatus())
  ipcMain.handle('updates:checkNow', (_e, force?: boolean) => updateChecker.check(Boolean(force)))
  ipcMain.handle('updates:dismiss', () => updateChecker.dismissCurrent())
  ipcMain.handle('updates:openDownload', () => updateChecker.openDownload())

  ipcMain.handle('app:uninstallCleanup', (_e, keepMedia: boolean) => {
    const result = runCleanup({ keepMedia: Boolean(keepMedia) })
    logger.info('In-app uninstall cleanup finished', {
      removed: result.removed.length,
      failed: result.failed.length,
      keepMedia
    })
    return result
  })
  ipcMain.handle('app:quitAfterCleanup', () => {
    setTimeout(() => {
      app.quit()
    }, 250)
  })

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
  ipcMain.handle('panels:toggle', (_e, id: PanelId) => panels.togglePanel(id))
  ipcMain.handle('panels:dockAll', () => panels.dockAll())
  ipcMain.handle('panels:showAll', () => panels.showAll())
  ipcMain.handle('workspace:getCatalog', () => panels.getCatalog())
  ipcMain.handle('workspace:saveAs', (_e, name: string) => panels.saveAsNew(name))
  ipcMain.handle('workspace:saveActive', () => panels.saveActive())
  ipcMain.handle('workspace:switch', (_e, id: string | null) => {
    panels.switchTo(id)
    return panels.getCatalog()
  })
  ipcMain.handle('workspace:resetDefault', () => {
    panels.resetToDefault()
    return panels.getCatalog()
  })
  ipcMain.handle('workspace:resetSaved', () => {
    panels.resetToSaved()
    return panels.getCatalog()
  })
  ipcMain.handle('workspace:rename', (_e, id: string, name: string) => panels.renameNamed(id, name))
  ipcMain.handle('workspace:delete', (_e, id: string) => panels.deleteNamed(id))
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

  ipcMain.handle('docs:open', () => {
    docsWindow.open()
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
    (_e, ids: string[], overrides: Partial<AudioSettings>) => {
      queue.setAudioOverrides(ids, overrides)
      return queue.list()
    }
  )
  ipcMain.handle(
    'queue:setVideoOverrides',
    (
      _e,
      ids: string[],
      overrides: Partial<VideoSettings> | null,
      mode?: 'merge' | 'replace'
    ) => {
      queue.setVideoOverrides(ids, overrides, mode ?? 'merge')
      return queue.list()
    }
  )
  ipcMain.handle(
    'queue:applyExportSettings',
    (
      _e,
      ids: string[],
      patch: {
        presetId?: string
        exportVideo?: boolean
        exportAudio?: boolean
        videoOverrides?: Partial<VideoSettings> | null
        audioOverrides?: Partial<AudioSettings> | null
      }
    ) => {
      queue.applyExportSettings(ids, patch)
      return queue.list()
    }
  )
  ipcMain.handle('presets:listUser', () => listUserPresets())
  ipcMain.handle(
    'presets:saveUser',
    (
      _e,
      preset: Omit<PresetDefinition, 'origin' | 'id' | 'platforms'> & {
        id?: string
        platforms?: PresetDefinition['platforms']
      }
    ) => {
      const saved = saveUserPreset(preset)
      return { preset: saved, catalog: catalogPayload() }
    }
  )
  ipcMain.handle('presets:renameUser', (_e, id: string, name: string) => {
    const preset = renameUserPreset(id, name)
    return { preset, catalog: catalogPayload() }
  })
  ipcMain.handle('presets:deleteUser', (_e, id: string) => {
    const ok = deleteUserPreset(id)
    return { ok, catalog: catalogPayload() }
  })
  ipcMain.handle('queue:start', async () => {
    void queue.start()
    return { ok: true }
  })
  ipcMain.handle('queue:stop', () => {
    queue.stop()
    return { ok: true }
  })

  function persistWatchFolders(): void {
    settings = normalizeAppSettings({
      ...settings,
      watchFolders: watchers.toSettings()
    })
    saveSettings(settings)
    broadcast('settings:changed', settingsPayload())
  }

  ipcMain.handle('watch:list', () => watchers.list())
  ipcMain.handle(
    'watch:add',
    (_e, folderPath: string, presetId: string, outputDir: string) => {
      const folder = watchers.add(folderPath, presetId, outputDir)
      persistWatchFolders()
      return folder
    }
  )
  ipcMain.handle('watch:remove', (_e, id: string) => {
    watchers.remove(id)
    persistWatchFolders()
    return watchers.list()
  })
  ipcMain.handle('watch:setEnabled', (_e, id: string, enabled: boolean) => {
    watchers.setEnabled(id, enabled)
    persistWatchFolders()
    return watchers.list()
  })
  ipcMain.handle(
    'watch:update',
    (
      _e,
      id: string,
      patch: {
        presetId?: string
        outputDir?: string
        path?: string
        autoStart?: boolean
        recursive?: boolean
      }
    ) => {
      watchers.update(id, patch)
      persistWatchFolders()
      return watchers.list()
    }
  )

  ipcMain.handle('shell:showItem', (_e, filePath: string) => {
    shell.showItemInFolder(filePath)
  })
  ipcMain.handle('shell:openPath', (_e, filePath: string) => shell.openPath(filePath))

  ipcMain.handle('preset:get', (_e, id: string) => findPreset(id))
}

async function restartIntake(): Promise<void> {
  if (intake) {
    await intake.stop()
    intake = null
  }
  intakeError = null
  if (!settings.intakeEnabled) return
  intake = new IntakeServer(queue, { port: settings.intakePort })
  try {
    await intake.start()
    intakeError = null
    logger.info(`Intake listening on 127.0.0.1:${settings.intakePort}`)
  } catch (err) {
    intakeError = err instanceof Error ? err.message : String(err)
    logger.error('Intake server failed to start', intakeError)
    intake = null
  }
}

app.whenReady().then(async () => {
  settings = await loadSettings()

  // Always ensure Output root exists; host app folders follow install choices.
  const baseLayout = ensureHostFolders({
    afterEffects: false,
    resolve: false,
    premiere: false
  })
  if (!settings.outputDirectory) {
    settings = normalizeAppSettings({
      ...settings,
      outputDirectory: baseLayout.output
    })
  } else {
    const legacyDefault = path.join(app.getPath('videos'), 'EncodeIt')
    if (path.normalize(settings.outputDirectory) === path.normalize(legacyDefault)) {
      settings = normalizeAppSettings({
        ...settings,
        outputDirectory: baseLayout.output
      })
    }
  }

  logger.info('EncodeIt starting', { version: app.getVersion() })
  queue = new EncodeQueue(settings)
  queue.restorePersisted()
  watchers = new WatchFolderManager(queue)
  watchers.restore(settings.watchFolders)

  const installOptions = readInstallOptionsFile()
  if (!settings.hostFoldersSeeded && watchers.list().length === 0) {
    if (installOptions) {
      // Windows NSIS / macOS PKG already recorded Standard or Custom choices.
      applyIntegrationChoices(installOptions)
    } else {
      // DMG / portable / zip — ask in-app (same Standard vs Custom UX).
      needsIntegrationSetup = true
      settings = normalizeAppSettings({
        ...settings,
        watchFolders: watchers.toSettings(),
        hostFoldersSeeded: false
      })
      saveSettings(settings)
    }
  } else {
    // Re-ensure folders for already-seeded watches on every launch.
    const existing = watchers.list()
    ensureHostFolders({
      afterEffects: existing.some((w) => w.path === baseLayout.fromAe),
      resolve: existing.some((w) => w.path === baseLayout.fromResolve),
      premiere: existing.some((w) => w.path === baseLayout.fromPremiere)
    })
    settings = normalizeAppSettings({
      ...settings,
      watchFolders: watchers.toSettings(),
      hostFoldersSeeded: true
    })
    saveSettings(settings)
    clearInstallOptionsFile()
  }
  inbox = new InboxWatcher(queue)
  inbox.start()
  await restartIntake()

  const preloadPath = path.join(__dirname, '../preload/index.js')
  panels = new PanelWindowManager({
    preloadPath,
    getMainWindow: () => mainWindow,
    onChange: (state) => broadcast('panels:changed', state),
    onDrag: (session, target) => broadcast('panels:drag', { session, target }),
    onCatalogChange: (catalog) => broadcast('workspace:catalog', catalog)
  })
  docsWindow = new DocsWindowManager({
    preloadPath,
    getMainWindow: () => mainWindow
  })

  queue.on('change', (jobs) => broadcast('queue:changed', jobs))
  queue.on('progress', (p) => broadcast('queue:progress', p))
  queue.on('state', (s) => broadcast('queue:state', s))

  registerIpc()
  // No native OS menu — all chrome lives in the app UI.
  Menu.setApplicationMenu(null)
  createWindow()
  panels.restoreFloatingPanels()

  updateChecker = new UpdateChecker((status) => broadcast('updates:status', status))
  updateChecker.setEnabled(settings.checkForUpdatesEnabled, { checkNow: true })

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
  docsWindow.dispose()
  updateChecker?.stop()
  app.quit()
})
