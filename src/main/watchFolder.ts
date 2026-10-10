import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'
import type { WatchFolder } from '../shared/types'
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

  add(folderPath: string, presetId: string, outputDir: string): WatchFolder {
    const folder: WatchFolder = {
      id: uuid(),
      path: folderPath,
      presetId,
      outputDir,
      enabled: true
    }
    this.folders.push(folder)
    this.seen.set(folder.id, new Set())
    this.startWatch(folder)
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
    if (enabled) this.startWatch(folder)
    else {
      const timer = this.timers.get(id)
      if (timer) clearInterval(timer)
      this.timers.delete(id)
    }
  }

  private startWatch(folder: WatchFolder): void {
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
          // skip files still being written
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
        this.queue.setOutputDirectory(
          this.queue.list().filter((j) => fresh.includes(j.sourcePath)).map((j) => j.id),
          folder.outputDir
        )
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
