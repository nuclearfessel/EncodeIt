import { EventEmitter } from 'events'
import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'
import { resolveOutputPath } from '../shared/buildCommand'
import { DEFAULT_PRESET_ID, getPreset } from '../shared/presets'
import type { AppSettings, EncodeProgress, QueueJob } from '../shared/types'
import { FfmpegRunner } from './ffmpeg'
import { probeMedia } from './probe'

export class EncodeQueue extends EventEmitter {
  jobs: QueueJob[] = []
  private running = false
  private stopped = false
  private runner: FfmpegRunner | null = null
  private settings: AppSettings

  constructor(settings: AppSettings) {
    super()
    this.settings = settings
  }

  updateSettings(settings: AppSettings): void {
    this.settings = settings
  }

  list(): QueueJob[] {
    return this.jobs
  }

  async addFiles(paths: string[], presetId = DEFAULT_PRESET_ID): Promise<QueueJob[]> {
    const preset = getPreset(presetId) ?? getPreset(DEFAULT_PRESET_ID)!
    const created: QueueJob[] = []

    for (const sourcePath of paths) {
      if (!fs.existsSync(sourcePath)) continue
      let media
      try {
        media = await probeMedia(this.settings.ffprobePath, sourcePath)
      } catch {
        media = undefined
      }
      const outputPath = resolveOutputPath(sourcePath, preset, this.settings.outputDirectory)
      const job: QueueJob = {
        id: uuid(),
        sourcePath,
        outputPath,
        formatId: preset.formatId,
        presetId: preset.id,
        status: 'waiting',
        progress: 0,
        createdAt: Date.now(),
        media
      }
      this.jobs.push(job)
      created.push(job)
    }
    this.emit('change', this.jobs)
    return created
  }

  remove(ids: string[]): void {
    this.jobs = this.jobs.filter((j) => !ids.includes(j.id))
    this.emit('change', this.jobs)
  }

  clearDone(): void {
    this.jobs = this.jobs.filter((j) => j.status !== 'done' && j.status !== 'skipped')
    this.emit('change', this.jobs)
  }

  clearAll(): void {
    if (this.running) this.stop()
    this.jobs = []
    this.emit('change', this.jobs)
  }

  setPreset(ids: string[], presetId: string): void {
    const preset = getPreset(presetId)
    if (!preset) return
    for (const job of this.jobs) {
      if (!ids.includes(job.id)) continue
      if (job.status === 'encoding') continue
      job.presetId = preset.id
      job.formatId = preset.formatId
      job.outputPath = resolveOutputPath(job.sourcePath, preset, this.settings.outputDirectory)
      job.status = 'waiting'
      job.progress = 0
      job.error = undefined
    }
    this.emit('change', this.jobs)
  }

  setOutputDirectory(ids: string[], directory: string): void {
    fs.mkdirSync(directory, { recursive: true })
    for (const job of this.jobs) {
      if (!ids.includes(job.id) || job.status === 'encoding') continue
      const preset = getPreset(job.presetId)
      if (!preset) continue
      const fileName = path.basename(job.outputPath)
      job.outputPath = path.join(directory, fileName.includes('%') ? fileName : path.basename(resolveOutputPath(job.sourcePath, preset, directory)))
    }
    this.emit('change', this.jobs)
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true
    this.stopped = false
    this.emit('state', { running: true })

    for (const job of this.jobs) {
      if (this.stopped) break
      if (job.status !== 'waiting' && job.status !== 'error' && job.status !== 'stopped') continue

      job.status = 'encoding'
      job.progress = 0
      job.startedAt = Date.now()
      job.error = undefined
      this.emit('change', this.jobs)

      fs.mkdirSync(path.dirname(job.outputPath.replace('%06d', '000000')), { recursive: true })

      this.runner = new FfmpegRunner()
      this.runner.on('progress', (p: EncodeProgress) => {
        const target = this.jobs.find((j) => j.id === p.jobId)
        if (!target) return
        target.progress = p.progress
        target.speed = p.speed
        target.fps = p.fps
        target.time = p.time
        target.status = p.status
        this.emit('progress', p)
        this.emit('change', this.jobs)
      })

      try {
        await this.runner.run(job, this.settings)
        job.status = 'done'
        job.progress = 100
        job.finishedAt = Date.now()
      } catch (err) {
        job.status = this.stopped ? 'stopped' : 'error'
        job.error = err instanceof Error ? err.message : String(err)
        job.finishedAt = Date.now()
      } finally {
        this.runner = null
        this.emit('change', this.jobs)
      }
    }

    this.running = false
    this.emit('state', { running: false })
  }

  stop(): void {
    this.stopped = true
    this.runner?.stop()
  }
}
