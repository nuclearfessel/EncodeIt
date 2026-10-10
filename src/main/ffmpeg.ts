import { spawn, type ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { buildFfmpegArgs, estimateDurationSeconds } from '../shared/buildCommand'
import type { AppSettings, EncodeProgress, QueueJob } from '../shared/types'

function parseTimeToSeconds(value: string): number {
  const parts = value.split(':').map(Number)
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return 0
  return parts[0] * 3600 + parts[1] * 60 + parts[2]
}

export class FfmpegRunner extends EventEmitter {
  private child: ChildProcess | null = null
  private stopped = false

  async run(job: QueueJob, settings: AppSettings): Promise<void> {
    this.stopped = false
    const built = buildFfmpegArgs(job, settings, job.media)
    const duration = estimateDurationSeconds(job.media)

    this.emit('progress', {
      jobId: job.id,
      progress: 0,
      status: 'encoding'
    } satisfies EncodeProgress)

    await new Promise<void>((resolve, reject) => {
      const child = spawn(settings.ffmpegPath, built.args, {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      })
      this.child = child

      let stderr = ''
      child.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        stderr += text
        const timeMatch = text.match(/time=(\d+:\d+:\d+\.\d+)/)
        const speedMatch = text.match(/speed=\s*([0-9.]+x)/)
        const fpsMatch = text.match(/fps=\s*([0-9.]+)/)
        let progress = 0
        if (timeMatch && duration && duration > 0) {
          progress = Math.min(99, (parseTimeToSeconds(timeMatch[1]) / duration) * 100)
        }
        this.emit('progress', {
          jobId: job.id,
          progress,
          speed: speedMatch?.[1],
          fps: fpsMatch ? Number(fpsMatch[1]) : undefined,
          time: timeMatch?.[1],
          status: 'encoding'
        } satisfies EncodeProgress)
      })

      child.on('error', (err) => {
        this.child = null
        reject(err)
      })

      child.on('close', (code) => {
        this.child = null
        if (this.stopped) {
          reject(new Error('Stopped'))
          return
        }
        if (code === 0) {
          this.emit('progress', {
            jobId: job.id,
            progress: 100,
            status: 'done'
          } satisfies EncodeProgress)
          resolve()
        } else {
          const message = stderr.trim().split('\n').slice(-8).join('\n') || `ffmpeg exited with ${code}`
          reject(new Error(message))
        }
      })
    })
  }

  stop(): void {
    this.stopped = true
    if (this.child) {
      this.child.kill('SIGTERM')
      this.child = null
    }
  }
}

export async function whichBinary(name: string): Promise<string | null> {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' ? 'where' : 'which'
    const child = spawn(cmd, [name], { windowsHide: true })
    let out = ''
    child.stdout.on('data', (d: Buffer) => {
      out += d.toString()
    })
    child.on('close', (code) => {
      if (code !== 0) {
        resolve(null)
        return
      }
      const first = out.split(/\r?\n/).map((s) => s.trim()).find(Boolean)
      resolve(first ?? null)
    })
    child.on('error', () => resolve(null))
  })
}
