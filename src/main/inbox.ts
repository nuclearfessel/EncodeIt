import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { logger } from './logger'
import type { EncodeQueue } from './queue'

export interface InboxJob {
  paths: string[]
  presetId?: string
  start?: boolean
}

const DONE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const ERROR_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

export function inboxDirectory(): string {
  const dir = path.join(app.getPath('userData'), 'inbox')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function cleanupOld(dir: string): void {
  let files: string[] = []
  try {
    files = fs.readdirSync(dir)
  } catch {
    return
  }
  const now = Date.now()
  for (const name of files) {
    const full = path.join(dir, name)
    let age = 0
    try {
      age = now - fs.statSync(full).mtimeMs
    } catch {
      continue
    }
    const isDone = name.endsWith('.json.done') || name.endsWith('.done')
    const isError = name.endsWith('.json.error') || name.endsWith('.error')
    if (isDone && age > DONE_MAX_AGE_MS) {
      try {
        fs.unlinkSync(full)
      } catch {
        /* ignore */
      }
    } else if (isError && age > ERROR_MAX_AGE_MS) {
      try {
        fs.unlinkSync(full)
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * Poll a JSON inbox so host apps (AE ExtendScript) can drop jobs without HTTP.
 * Each file: { "paths": ["..."], "presetId": optional, "start": true }
 */
export class InboxWatcher {
  private timer: NodeJS.Timeout | null = null
  private queue: EncodeQueue
  private dir: string
  private ticks = 0

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
    this.ticks += 1
    if (this.ticks % 40 === 1) cleanupOld(this.dir)

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
      } catch (err) {
        logger.warn(`Inbox job failed: ${name}`, err)
        try {
          fs.renameSync(full, full + '.error')
        } catch {
          /* ignore */
        }
      }
    }
  }
}
