import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { DockState, PanelId } from '../shared/panels'
import type {
  AnyDropTarget,
  DockEdge,
  WorkspaceState
} from '../shared/workspaceLayout'
import type { HardwareCapabilities } from '../shared/hardware'
import type {
  AppSettings,
  AudioSettings,
  EncodeProgress,
  QueueJob,
  SettingsView,
  WatchFolder
} from '../shared/types'

const api = {
  getCatalog: () => ipcRenderer.invoke('catalog:get'),
  getSettings: (): Promise<SettingsView> => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: AppSettings): Promise<SettingsView> =>
    ipcRenderer.invoke('settings:set', settings),
  detectHardware: (force?: boolean): Promise<HardwareCapabilities> =>
    ipcRenderer.invoke('hardware:detect', force),
  getIntakeStatus: (): Promise<{
    enabled: boolean
    port: number
    address: string | null
    inboxDir: string
  }> => ipcRenderer.invoke('intake:status'),
  listMediaDirectory: (
    dirPath?: string
  ): Promise<{
    path: string
    parent: string | null
    entries: Array<{
      name: string
      path: string
      kind: 'dir' | 'media' | 'other'
      size?: number
      mtimeMs?: number
    }>
    isRoots?: boolean
  }> => ipcRenderer.invoke('fs:listMediaDirectory', dirPath),
  listDirectory: (
    dirPath?: string,
    mode?: 'media' | 'directories' | 'files'
  ): Promise<{
    path: string
    parent: string | null
    entries: Array<{
      name: string
      path: string
      kind: 'dir' | 'media' | 'other'
      size?: number
      mtimeMs?: number
    }>
    isRoots?: boolean
  }> => ipcRenderer.invoke('fs:listDirectory', dirPath, mode),
  defaultMediaRoot: (): Promise<string> => ipcRenderer.invoke('fs:defaultMediaRoot'),
  listQueue: (): Promise<QueueJob[]> => ipcRenderer.invoke('queue:list'),
  addToQueue: (paths: string[], presetId?: string): Promise<QueueJob[]> =>
    ipcRenderer.invoke('queue:add', paths, presetId),
  removeFromQueue: (ids: string[]): Promise<QueueJob[]> =>
    ipcRenderer.invoke('queue:remove', ids),
  clearDone: (): Promise<QueueJob[]> => ipcRenderer.invoke('queue:clearDone'),
  clearAll: (): Promise<QueueJob[]> => ipcRenderer.invoke('queue:clearAll'),
  setPreset: (ids: string[], presetId: string): Promise<QueueJob[]> =>
    ipcRenderer.invoke('queue:setPreset', ids, presetId),
  setOutputPath: (ids: string[], outputPath: string): Promise<QueueJob[]> =>
    ipcRenderer.invoke('queue:setOutputPath', ids, outputPath),
  setOutputFileName: (ids: string[], fileName: string): Promise<QueueJob[]> =>
    ipcRenderer.invoke('queue:setOutputFileName', ids, fileName),
  setJobsOutputDirectory: (ids: string[], directory: string): Promise<QueueJob[]> =>
    ipcRenderer.invoke('queue:setOutputDirectory', ids, directory),
  setExportTracks: (
    ids: string[],
    tracks: { exportVideo?: boolean; exportAudio?: boolean }
  ): Promise<QueueJob[]> => ipcRenderer.invoke('queue:setExportTracks', ids, tracks),
  setAudioOverrides: (ids: string[], overrides: Partial<AudioSettings>): Promise<QueueJob[]> =>
    ipcRenderer.invoke('queue:setAudioOverrides', ids, overrides),
  startQueue: () => ipcRenderer.invoke('queue:start'),
  stopQueue: () => ipcRenderer.invoke('queue:stop'),
  listWatchFolders: (): Promise<WatchFolder[]> => ipcRenderer.invoke('watch:list'),
  addWatchFolder: (
    folderPath: string,
    presetId: string,
    outputDir: string
  ): Promise<WatchFolder> => ipcRenderer.invoke('watch:add', folderPath, presetId, outputDir),
  removeWatchFolder: (id: string): Promise<WatchFolder[]> =>
    ipcRenderer.invoke('watch:remove', id),
  setWatchEnabled: (id: string, enabled: boolean): Promise<WatchFolder[]> =>
    ipcRenderer.invoke('watch:setEnabled', id, enabled),
  updateWatchFolder: (
    id: string,
    patch: { presetId?: string; outputDir?: string; path?: string }
  ): Promise<WatchFolder[]> => ipcRenderer.invoke('watch:update', id, patch),
  showItem: (filePath: string) => ipcRenderer.invoke('shell:showItem', filePath),
  openPath: (filePath: string) => ipcRenderer.invoke('shell:openPath', filePath),
  getPreset: (id: string) => ipcRenderer.invoke('preset:get', id),
  getWorkspace: (): Promise<WorkspaceState> => ipcRenderer.invoke('panels:getWorkspace'),
  setWorkspaceRoot: (root: WorkspaceState['root']): Promise<void> =>
    ipcRenderer.invoke('panels:setRoot', root),
  getDockState: (): Promise<DockState> => ipcRenderer.invoke('panels:getState'),
  undockPanel: (id: PanelId): Promise<WorkspaceState> => ipcRenderer.invoke('panels:undock', id),
  dockPanel: (id: PanelId, edge?: DockEdge): Promise<WorkspaceState> =>
    ipcRenderer.invoke('panels:dock', id, edge),
  dockPanelAt: (id: PanelId, target: AnyDropTarget): Promise<WorkspaceState> =>
    ipcRenderer.invoke('panels:dockAt', id, target),
  closePanel: (id: PanelId): Promise<WorkspaceState> => ipcRenderer.invoke('panels:close', id),
  dockAllPanels: (): Promise<WorkspaceState> => ipcRenderer.invoke('panels:dockAll'),
  showAllPanels: (): Promise<WorkspaceState> => ipcRenderer.invoke('panels:showAll'),
  beginPanelDrag: (id: PanelId, fromFloating: boolean): Promise<void> =>
    ipcRenderer.invoke('panels:dragBegin', id, fromFloating),
  setPanelDragTarget: (target: AnyDropTarget | null): Promise<void> =>
    ipcRenderer.invoke('panels:dragTarget', target),
  endPanelDrag: (action: 'dock' | 'undock' | 'cancel'): Promise<WorkspaceState> =>
    ipcRenderer.invoke('panels:dragEnd', action),
  hitTestMainWindow: (): Promise<{
    overMain: boolean
    relX: number
    relY: number
    width: number
    height: number
  }> => ipcRenderer.invoke('panels:hitTestMain'),
  getUiState: (): Promise<{ activePresetId: string; selectedJobIds: string[] }> =>
    ipcRenderer.invoke('ui:getState'),
  setActivePreset: (presetId: string) => ipcRenderer.invoke('ui:setActivePreset', presetId),
  setSelectedJobs: (ids: string[]) => ipcRenderer.invoke('ui:setSelectedJobs', ids),
  onWorkspaceChanged: (cb: (state: WorkspaceState) => void) => {
    const listener = (_: IpcRendererEvent, state: WorkspaceState) => cb(state)
    ipcRenderer.on('panels:changed', listener)
    return () => ipcRenderer.removeListener('panels:changed', listener)
  },
  onDockStateChanged: (cb: (state: DockState) => void) => {
    const listener = (_: IpcRendererEvent, state: WorkspaceState) => cb(state.placement)
    ipcRenderer.on('panels:changed', listener)
    return () => ipcRenderer.removeListener('panels:changed', listener)
  },
  onPanelDrag: (
    cb: (payload: {
      session: { panelId: PanelId; fromFloating: boolean } | null
      target: AnyDropTarget | null
    }) => void
  ) => {
    const listener = (
      _: IpcRendererEvent,
      payload: {
        session: { panelId: PanelId; fromFloating: boolean } | null
        target: AnyDropTarget | null
      }
    ) => cb(payload)
    ipcRenderer.on('panels:drag', listener)
    return () => ipcRenderer.removeListener('panels:drag', listener)
  },
  onUiChanged: (cb: (state: { activePresetId: string; selectedJobIds: string[] }) => void) => {
    const listener = (
      _: IpcRendererEvent,
      state: { activePresetId: string; selectedJobIds: string[] }
    ) => cb(state)
    ipcRenderer.on('ui:changed', listener)
    return () => ipcRenderer.removeListener('ui:changed', listener)
  },
  onQueueChanged: (cb: (jobs: QueueJob[]) => void) => {
    const listener = (_: IpcRendererEvent, jobs: QueueJob[]) => cb(jobs)
    ipcRenderer.on('queue:changed', listener)
    return () => ipcRenderer.removeListener('queue:changed', listener)
  },
  onQueueProgress: (cb: (p: EncodeProgress) => void) => {
    const listener = (_: IpcRendererEvent, p: EncodeProgress) => cb(p)
    ipcRenderer.on('queue:progress', listener)
    return () => ipcRenderer.removeListener('queue:progress', listener)
  },
  onQueueState: (cb: (s: { running: boolean }) => void) => {
    const listener = (_: IpcRendererEvent, s: { running: boolean }) => cb(s)
    ipcRenderer.on('queue:state', listener)
    return () => ipcRenderer.removeListener('queue:state', listener)
  },
  onSettingsChanged: (cb: (settings: SettingsView) => void) => {
    const listener = (_: IpcRendererEvent, next: SettingsView) => cb(next)
    ipcRenderer.on('settings:changed', listener)
    return () => ipcRenderer.removeListener('settings:changed', listener)
  },
  windowMinimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
  windowMaximizeToggle: (): Promise<boolean> => ipcRenderer.invoke('window:maximizeToggle'),
  windowClose: (): Promise<void> => ipcRenderer.invoke('window:close'),
  windowIsMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
  onWindowState: (cb: (state: { maximized: boolean }) => void) => {
    const listener = (_: IpcRendererEvent, state: { maximized: boolean }) => cb(state)
    ipcRenderer.on('window:state', listener)
    return () => ipcRenderer.removeListener('window:state', listener)
  }
}

contextBridge.exposeInMainWorld('encodeThis', api)

export type EncodeThisApi = typeof api
