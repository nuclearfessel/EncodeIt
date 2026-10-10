import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'
import type { WatchFolder, WatchFolderSettings } from '../shared/types'
import type { EncodeQueue } from './queue'

const MEDIA_EXT = new Set([
  '.mp4',
  '.mov',
  '.mkv',
  '.mxf',
  '.avi',
  '.m4v',
  '.wmv',
  '.mpg',
  '.mpeg',
  '.m2ts',
  '.ts',
  '.webm',
  '.mp3',
  '.wav',
  '.aif',
  '.aiff',
  '.flac',
  '.aac',
  '.m4a',
  '.png',
  '.jpg',
  '.jpeg',
  '.tif',
  '.tiff',
  '.exr',
  '.dpx',
  '.tga',
  '.bmp'
])

function listMediaPaths(folderPath: string): string[] {
  if (!fs.existsSync(folderPath)) return []
  let entries: string[] = []
  try {
    entries = fs.readdirSync(folderPath)
  } catch {
    return []
  }
  const out: string[] = []
  for (const name of entries) {
    const full = path.join(folderPath, name)
    const ext = path.extname(name).toLowerCase()
    if (!MEDIA_EXT.has(ext)) continue
    try {
      if (fs.statSync(full).isFile()) out.push(full)
    } catch {
      /* skip */
    }
  }
  return out
}

export class WatchFolderManager {
  folders: WatchFolder[] = []
  private timers = new Map<string, NodeJS.Timeout>()
  private seen = new Map<string, Set<string>>()
  private queue: EncodeQueue

  constructor(queue: EncodeQueue) {
    this.queue = queue
  }

  list(): WatchFolder[] {
    return this.folders
  }

  /** Snapshot for settings.json (Win + macOS). */
  toSettings(): WatchFolderSettings[] {
    return this.folders.map((f) => ({
      id: f.id,
      path: f.path,
      presetId: f.presetId,
      outputDir: f.outputDir,
      enabled: f.enabled
    }))
  }

  /**
   * Restore persisted folders. Existing media is marked seen so restart
   * does not re-queue the whole folder — only new arrivals encode.
   */
  restore(entries: WatchFolderSettings[]): void {
    for (const entry of entries) {
      if (!entry?.path) continue
      const folder: WatchFolder = {
        id: entry.id || uuid(),
        path: entry.path,
        presetId: entry.presetId || 'h264-match-source-high-bitrate',
        outputDir: entry.outputDir || '',
        enabled: entry.enabled !== false
      }
      this.folders.push(folder)
      this.seen.set(folder.id, new Set(listMediaPaths(folder.path)))
      if (folder.enabled) this.startWatch(folder, false)
    }
  }

  add(folderPath: string, presetId: string, outputDir: string): WatchFolder {
    const folder: WatchFolder = {
      id: uuid(),
      path: folderPath,
      presetId,
      outputDir,
      enabled: true
    }
    this.folders.push(folder)
    // Seed current files so “Add watch” does not dump the whole directory into the queue.
    this.seen.set(folder.id, new Set(listMediaPaths(folderPath)))
    this.startWatch(folder, false)
    return folder
  }

  remove(id: string): void {
    const timer = this.timers.get(id)
    if (timer) clearInterval(timer)
    this.timers.delete(id)
    this.seen.delete(id)
    this.folders = this.folders.filter((f) => f.id !== id)
  }

  setEnabled(id: string, enabled: boolean): void {
    const folder = this.folders.find((f) => f.id === id)
    if (!folder) return
    folder.enabled = enabled
    if (enabled) {
      // Re-seed so enable does not re-queue files already on disk.
      this.seen.set(folder.id, new Set(listMediaPaths(folder.path)))
      this.startWatch(folder, false)
    } else {
      const timer = this.timers.get(id)
      if (timer) clearInterval(timer)
      this.timers.delete(id)
    }
  }

  update(
    id: string,
    patch: Partial<Pick<WatchFolder, 'presetId' | 'outputDir' | 'path'>>
  ): WatchFolder | null {
    const folder = this.folders.find((f) => f.id === id)
    if (!folder) return null
    if (patch.presetId !== undefined) folder.presetId = patch.presetId
    if (patch.outputDir !== undefined) folder.outputDir = patch.outputDir
    if (patch.path !== undefined && patch.path !== folder.path) {
      folder.path = patch.path
      this.seen.set(folder.id, new Set(listMediaPaths(folder.path)))
    }
    return folder
  }

  private startWatch(folder: WatchFolder, _queueExisting: boolean): void {
    if (this.timers.has(folder.id)) return
    const tick = async () => {
      if (!folder.enabled) return
      if (!fs.existsSync(folder.path)) return
      let entries: string[] = []
      try {
        entries = fs.readdirSync(folder.path)
      } catch {
        return
      }
      const seen = this.seen.get(folder.id) ?? new Set<string>()
      const fresh: string[] = []
      for (const name of entries) {
        const full = path.join(folder.path, name)
        const ext = path.extname(name).toLowerCase()
        if (!MEDIA_EXT.has(ext)) continue
        if (seen.has(full)) continue
        try {
          const stat = fs.statSync(full)
          if (!stat.isFile()) continue
          // Skip files still being written (Win + macOS render targets).
          if (Date.now() - stat.mtimeMs < 1500) continue
        } catch {
          continue
        }
        seen.add(full)
        fresh.push(full)
      }
      this.seen.set(folder.id, seen)
      if (fresh.length) {
        await this.queue.addFiles(fresh, folder.presetId)
        if (folder.outputDir) {
          this.queue.setOutputDirectory(
            this.queue.list().filter((j) => fresh.includes(j.sourcePath)).map((j) => j.id),
            folder.outputDir
          )
        }
        void this.queue.start()
      }
    }
    void tick()
    this.timers.set(folder.id, setInterval(() => void tick(), 3000))
  }

  dispose(): void {
    for (const timer of this.timers.values()) clearInterval(timer)
    this.timers.clear()
  }
}
