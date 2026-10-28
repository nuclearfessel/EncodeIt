import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'
import { pruneSeenSet, updateSettleSample, type SizeSample } from '../shared/fileSettle'
import type { WatchFolder, WatchFolderSettings } from '../shared/types'
import { logger } from './logger'
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

function listMediaPaths(folderPath: string, recursive: boolean): string[] {
  if (!fs.existsSync(folderPath)) return []
  const out: string[] = []

  const walk = (dir: string, depth: number) => {
    let entries: fs.Dirent[] = []
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (recursive && depth < 8) walk(full, depth + 1)
        continue
      }
      if (!entry.isFile()) continue
      const ext = path.extname(entry.name).toLowerCase()
      if (!MEDIA_EXT.has(ext)) continue
      out.push(full)
    }
  }

  walk(folderPath, 0)
  return out
}

export class WatchFolderManager {
  folders: WatchFolder[] = []
  private timers = new Map<string, NodeJS.Timeout>()
  private seen = new Map<string, Set<string>>()
  private settling = new Map<string, Map<string, SizeSample>>()
  private queue: EncodeQueue

  constructor(queue: EncodeQueue) {
    this.queue = queue
  }

  list(): WatchFolder[] {
    return this.folders
  }

  toSettings(): WatchFolderSettings[] {
    return this.folders.map((f) => ({
      id: f.id,
      path: f.path,
      presetId: f.presetId,
      outputDir: f.outputDir,
      enabled: f.enabled,
      autoStart: f.autoStart,
      recursive: f.recursive
    }))
  }

  restore(entries: WatchFolderSettings[]): void {
    for (const entry of entries) {
      if (!entry?.path) continue
      const folder: WatchFolder = {
        id: entry.id || uuid(),
        path: entry.path,
        presetId: entry.presetId || 'h264-match-source-high-bitrate',
        outputDir: entry.outputDir || '',
        enabled: entry.enabled !== false,
        autoStart: entry.autoStart !== false,
        recursive: Boolean(entry.recursive)
      }
      this.folders.push(folder)
      this.seen.set(folder.id, new Set(listMediaPaths(folder.path, folder.recursive)))
      this.settling.set(folder.id, new Map())
      if (folder.enabled) this.startWatch(folder)
    }
  }

  add(folderPath: string, presetId: string, outputDir: string): WatchFolder {
    const folder: WatchFolder = {
      id: uuid(),
      path: folderPath,
      presetId,
      outputDir,
      enabled: true,
      autoStart: true,
      recursive: false
    }
    this.folders.push(folder)
    this.seen.set(folder.id, new Set(listMediaPaths(folderPath, folder.recursive)))
    this.settling.set(folder.id, new Map())
    this.startWatch(folder)
    return folder
  }

  remove(id: string): void {
    const timer = this.timers.get(id)
    if (timer) clearInterval(timer)
    this.timers.delete(id)
    this.seen.delete(id)
    this.settling.delete(id)
    this.folders = this.folders.filter((f) => f.id !== id)
  }

  setEnabled(id: string, enabled: boolean): void {
    const folder = this.folders.find((f) => f.id === id)
    if (!folder) return
    folder.enabled = enabled
    if (enabled) {
      this.seen.set(folder.id, new Set(listMediaPaths(folder.path, folder.recursive)))
      this.settling.set(folder.id, new Map())
      this.startWatch(folder)
    } else {
      const timer = this.timers.get(id)
      if (timer) clearInterval(timer)
      this.timers.delete(id)
    }
  }

  update(
    id: string,
    patch: Partial<Pick<WatchFolder, 'presetId' | 'outputDir' | 'path' | 'autoStart' | 'recursive'>>
  ): WatchFolder | null {
    const folder = this.folders.find((f) => f.id === id)
    if (!folder) return null
    if (patch.presetId !== undefined) folder.presetId = patch.presetId
    if (patch.outputDir !== undefined) folder.outputDir = patch.outputDir
    if (patch.autoStart !== undefined) folder.autoStart = patch.autoStart
    const pathOrRecursiveChanged =
      (patch.path !== undefined && patch.path !== folder.path) ||
      (patch.recursive !== undefined && patch.recursive !== folder.recursive)
    if (patch.path !== undefined) folder.path = patch.path
    if (patch.recursive !== undefined) folder.recursive = patch.recursive
    if (pathOrRecursiveChanged) {
      this.seen.set(folder.id, new Set(listMediaPaths(folder.path, folder.recursive)))
      this.settling.set(folder.id, new Map())
    }
    return folder
  }

  private startWatch(folder: WatchFolder): void {
    if (this.timers.has(folder.id)) return
    const tick = async () => {
      if (!folder.enabled) return
      if (!fs.existsSync(folder.path)) return

      const currentPaths = listMediaPaths(folder.path, folder.recursive)
      const seen = this.seen.get(folder.id) ?? new Set<string>()
      const settling = this.settling.get(folder.id) ?? new Map<string, SizeSample>()
      const fresh: string[] = []

      for (const full of currentPaths) {
        if (seen.has(full)) continue
        let size = 0
        let mtimeMs = 0
        try {
          const stat = fs.statSync(full)
          if (!stat.isFile()) continue
          size = stat.size
          mtimeMs = stat.mtimeMs
        } catch {
          continue
        }

        const { sample, settled } = updateSettleSample(settling.get(full), size, mtimeMs)
        settling.set(full, sample)
        if (!settled) continue

        settling.delete(full)
        seen.add(full)
        fresh.push(full)
      }

      // Drop settle state for paths that vanished.
      for (const key of [...settling.keys()]) {
        if (!currentPaths.includes(key)) settling.delete(key)
      }

      this.seen.set(folder.id, pruneSeenSet(seen, currentPaths))
      this.settling.set(folder.id, settling)

      if (!fresh.length) return

      logger.info(`Watch folder queued ${fresh.length} file(s)`, folder.path)
      await this.queue.addFiles(fresh, folder.presetId)
      if (folder.outputDir) {
        this.queue.setOutputDirectory(
          this.queue.list().filter((j) => fresh.includes(j.sourcePath)).map((j) => j.id),
          folder.outputDir
        )
      }
      if (folder.autoStart) void this.queue.start()
    }
    void tick()
    this.timers.set(folder.id, setInterval(() => void tick(), 3000))
  }

  dispose(): void {
    for (const timer of this.timers.values()) clearInterval(timer)
    this.timers.clear()
  }
}
