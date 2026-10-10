import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type {
  AppSettings,
  EncodeProgress,
  QueueJob,
  WatchFolder
} from '../shared/types'

const api = {
  getCatalog: () => ipcRenderer.invoke('catalog:get'),
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: AppSettings): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:set', settings),
  openFiles: (): Promise<string[]> => ipcRenderer.invoke('dialog:openFiles'),
  openDirectory: (): Promise<string | null> => ipcRenderer.invoke('dialog:openDirectory'),
  listQueue: (): Promise<QueueJob[]> => ipcRenderer.invoke('queue:list'),
  addToQueue: (paths: string[], presetId?: string): Promise<QueueJob[]> =>
    ipcRenderer.invoke('queue:add', paths, presetId),
  removeFromQueue: (ids: string[]): Promise<QueueJob[]> =>
    ipcRenderer.invoke('queue:remove', ids),
  clearDone: (): Promise<QueueJob[]> => ipcRenderer.invoke('queue:clearDone'),
  clearAll: (): Promise<QueueJob[]> => ipcRenderer.invoke('queue:clearAll'),
  setPreset: (ids: string[], presetId: string): Promise<QueueJob[]> =>
    ipcRenderer.invoke('queue:setPreset', ids, presetId),
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
  showItem: (filePath: string) => ipcRenderer.invoke('shell:showItem', filePath),
  openPath: (filePath: string) => ipcRenderer.invoke('shell:openPath', filePath),
  getPreset: (id: string) => ipcRenderer.invoke('preset:get', id),
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
  }
}

contextBridge.exposeInMainWorld('encodeThis', api)

export type EncodeThisApi = typeof api
