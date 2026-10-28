import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import type { QueueJob } from '../shared/types'
import { logger } from './logger'

function queuePath(): string {
  return path.join(app.getPath('userData'), 'queue.json')
}

/** Persist incomplete + recent jobs so a restart can restore the queue. */
export function saveQueueJobs(jobs: QueueJob[]): void {
  try {
    const file = queuePath()
    fs.mkdirSync(path.dirname(file), { recursive: true })
    const slim = jobs.map((j) => ({
      ...j,
      // Drop live progress noise; restore as waiting/error/stopped.
      progress: j.status === 'done' ? 100 : 0,
      speed: undefined,
      fps: undefined,
      time: undefined
    }))
    fs.writeFileSync(file, JSON.stringify(slim, null, 2), 'utf8')
  } catch (err) {
    logger.warn('Failed to persist queue', err)
  }
}

export function loadQueueJobs(): QueueJob[] {
  const file = queuePath()
  if (!fs.existsSync(file)) return []
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as QueueJob[]
    if (!Array.isArray(raw)) return []
    return raw
      .filter((j) => j && typeof j.id === 'string' && typeof j.sourcePath === 'string')
      .map((j) => {
        const status =
          j.status === 'encoding' || j.status === 'waiting'
            ? 'waiting'
            : j.status === 'done' || j.status === 'skipped'
              ? j.status
              : j.status === 'error' || j.status === 'stopped'
                ? j.status
                : 'waiting'
        return {
          ...j,
          status,
          progress: status === 'done' ? 100 : 0,
          exportVideo: j.exportVideo !== false,
          exportAudio: j.exportAudio !== false
        } satisfies QueueJob
      })
  } catch (err) {
    logger.warn('Failed to load persisted queue', err)
    return []
  }
}
