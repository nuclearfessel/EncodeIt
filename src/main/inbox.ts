import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import type { EncodeQueue } from './queue'

export interface InboxJob {
  paths: string[]
  presetId?: string
  start?: boolean
}

export function inboxDirectory(): string {
  const dir = path.join(app.getPath('userData'), 'inbox')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * Poll a JSON inbox so host apps (AE ExtendScript) can drop jobs without HTTP.
 * Each file: { "paths": ["..."], "presetId": optional, "start": true }
 */
export class InboxWatcher {
  private timer: NodeJS.Timeout | null = null
  private queue: EncodeQueue
  private dir: string

  constructor(queue: EncodeQueue, dir = inboxDirectory()) {
    this.queue = queue
    this.dir = dir
    fs.mkdirSync(this.dir, { recursive: true })
  }

  start(intervalMs = 1500): void {
    if (this.timer) return
    this.timer = setInterval(() => void this.tick(), intervalMs)
    void this.tick()
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private async tick(): Promise<void> {
    let files: string[] = []
    try {
      files = fs.readdirSync(this.dir).filter((f) => f.endsWith('.json'))
    } catch {
      return
    }

    for (const name of files) {
      const full = path.join(this.dir, name)
      const processed = full + '.done'
      try {
        const raw = fs.readFileSync(full, 'utf8')
        const job = JSON.parse(raw) as InboxJob
        if (!job.paths?.length) {
          fs.renameSync(full, processed)
          continue
        }
        await this.queue.addFiles(job.paths, job.presetId)
        if (job.start) void this.queue.start()
        fs.renameSync(full, processed)
      } catch {
        try {
          fs.renameSync(full, full + '.error')
        } catch {
          /* ignore */
        }
      }
    }
  }
}
