import { EventEmitter } from 'events'
import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'
import { resolveOutputPath } from '../shared/buildCommand'
import { getFormat } from '../shared/formats'
import { DEFAULT_PRESET_ID } from '../shared/presets'
import type {
  AppSettings,
  AudioSettings,
  EncodeProgress,
  PresetDefinition,
  QueueJob,
  VideoSettings
} from '../shared/types'
import { FfmpegRunner } from './ffmpeg'
import { logger } from './logger'
import { findPreset } from './presetCatalog'
import { probeMedia } from './probe'
import { loadQueueJobs, saveQueueJobs } from './queueStore'

function exportFlagsForPreset(preset: PresetDefinition): {
  exportVideo: boolean
  exportAudio: boolean
} {
  const format = getFormat(preset.formatId)
  if (format?.category === 'audio') {
    return { exportVideo: false, exportAudio: true }
  }
  if (format?.category === 'still' || format?.category === 'sequence' || format?.id === 'gif') {
    return { exportVideo: true, exportAudio: false }
  }
  return {
    exportVideo: preset.video.codec !== 'none',
    exportAudio: preset.audio.enabled && preset.audio.codec !== 'none'
  }
}

function withPresetExtension(outputPath: string, preset: PresetDefinition): string {
  const format = getFormat(preset.formatId)
  const ext =
    format?.extension ?? (path.extname(outputPath).replace(/^\./, '') || 'mp4')
  const dir = path.dirname(outputPath)
  const base = path.basename(outputPath)
  const sequence = Boolean(preset.sequence || format?.category === 'sequence')

  const stem = base
    .replace(/%0\d+d/gi, '')
    .replace(/\.[^.]+$/, '')
    .replace(/_+$/g, '')

  if (sequence) {
    return path.join(dir, `${stem}_%06d.${ext}`)
  }

  return path.join(dir, `${stem}.${ext}`)
}

function isSequenceOutput(outputPath: string): boolean {
  return /%0\d+d/i.test(outputPath)
}

export class EncodeQueue extends EventEmitter {
  jobs: QueueJob[] = []
  private running = false
  private stopped = false
  private active = new Map<string, FfmpegRunner>()
  private settings: AppSettings
  private persistTimer: NodeJS.Timeout | null = null

  constructor(settings: AppSettings) {
    super()
    this.settings = settings
  }

  updateSettings(settings: AppSettings): void {
    this.settings = settings
  }

  /** Restore jobs saved from a previous session. */
  restorePersisted(): void {
    const loaded = loadQueueJobs()
    if (!loaded.length) return
    this.jobs = loaded
    logger.info(`Restored ${loaded.length} queue job(s) from disk`)
    this.emit('change', this.jobs)
  }

  list(): QueueJob[] {
    return this.jobs
  }

  private schedulePersist(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer)
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null
      saveQueueJobs(this.jobs)
    }, 250)
  }

  private emitChange(): void {
    this.emit('change', this.jobs)
    this.schedulePersist()
  }

  async addFiles(paths: string[], presetId = DEFAULT_PRESET_ID): Promise<QueueJob[]> {
    const preset = findPreset(presetId) ?? findPreset(DEFAULT_PRESET_ID)!
    const created: QueueJob[] = []

    for (const sourcePath of paths) {
      if (!fs.existsSync(sourcePath)) continue
      let media
      let probeError: string | undefined
      try {
        media = await probeMedia(this.settings.ffprobePath, sourcePath)
      } catch (err) {
        probeError = err instanceof Error ? err.message : String(err)
        logger.warn(`Probe failed for ${sourcePath}`, probeError)
        media = undefined
      }
      const outputPath = resolveOutputPath(sourcePath, preset, this.settings.outputDirectory)
      const flags = exportFlagsForPreset(preset)
      const job: QueueJob = {
        id: uuid(),
        sourcePath,
        outputPath,
        formatId: preset.formatId,
        presetId: preset.id,
        status: probeError ? 'error' : 'waiting',
        progress: 0,
        createdAt: Date.now(),
        media,
        error: probeError
          ? `Probe failed — media duration/progress may be unavailable. ${probeError}`
          : undefined,
        exportVideo: flags.exportVideo,
        exportAudio: flags.exportAudio
      }
      // Still allow encode after probe failure — mark waiting with warning in error cleared on start,
      // but keep user-visible note: use waiting + error message as warning until start.
      if (probeError) {
        job.status = 'waiting'
        job.error = `Warning: probe failed (${probeError}). Progress may be inaccurate.`
      }
      this.jobs.push(job)
      created.push(job)
    }
    this.emitChange()
    return created
  }

  remove(ids: string[]): void {
    this.jobs = this.jobs.filter((j) => !ids.includes(j.id))
    this.emitChange()
  }

  /** Clone selected jobs (insert each copy after its source). */
  duplicate(ids: string[]): QueueJob[] {
    const created: QueueJob[] = []
    for (const id of ids) {
      const src = this.jobs.find((j) => j.id === id)
      if (!src) continue
      const copy: QueueJob = {
        ...src,
        id: uuid(),
        status: 'waiting',
        progress: 0,
        speed: undefined,
        fps: undefined,
        time: undefined,
        error: undefined,
        createdAt: Date.now(),
        startedAt: undefined,
        finishedAt: undefined,
        media: src.media ? structuredClone(src.media) : undefined,
        videoOverrides: src.videoOverrides ? { ...src.videoOverrides } : undefined,
        audioOverrides: src.audioOverrides ? { ...src.audioOverrides } : undefined
      }
      const idx = this.jobs.findIndex((j) => j.id === id)
      this.jobs.splice(idx + 1, 0, copy)
      created.push(copy)
    }
    if (created.length) this.emitChange()
    return created
  }

  clearDone(): void {
    this.jobs = this.jobs.filter((j) => j.status !== 'done' && j.status !== 'skipped')
    this.emitChange()
  }

  clearAll(): void {
    if (this.running) this.stop()
    this.jobs = []
    this.emitChange()
  }

  setPreset(ids: string[], presetId: string): void {
    const preset = findPreset(presetId)
    if (!preset) return
    for (const job of this.jobs) {
      if (!ids.includes(job.id)) continue
      if (job.status === 'encoding') continue
      job.presetId = preset.id
      job.formatId = preset.formatId
      job.outputPath = job.customOutputPath
        ? withPresetExtension(job.outputPath, preset)
        : resolveOutputPath(job.sourcePath, preset, this.settings.outputDirectory)
      const flags = exportFlagsForPreset(preset)
      job.exportVideo = flags.exportVideo
      job.exportAudio = flags.exportAudio
      job.audioOverrides = undefined
      job.videoOverrides = undefined
      job.status = 'waiting'
      job.progress = 0
      job.error = undefined
    }
    this.emitChange()
  }

  setExportTracks(
    ids: string[],
    tracks: { exportVideo?: boolean; exportAudio?: boolean }
  ): void {
    for (const job of this.jobs) {
      if (!ids.includes(job.id) || job.status === 'encoding') continue
      if (tracks.exportVideo !== undefined) job.exportVideo = tracks.exportVideo
      if (tracks.exportAudio !== undefined) job.exportAudio = tracks.exportAudio
      if (!job.exportVideo && !job.exportAudio) {
        if (tracks.exportAudio === false) job.exportVideo = true
        else job.exportAudio = true
      }
      if (job.status === 'done' || job.status === 'error' || job.status === 'stopped') {
        job.status = 'waiting'
        job.progress = 0
        job.error = undefined
      }
    }
    this.emitChange()
  }

  setAudioOverrides(ids: string[], overrides: Partial<AudioSettings>): void {
    for (const job of this.jobs) {
      if (!ids.includes(job.id) || job.status === 'encoding') continue
      const next: Partial<AudioSettings> = { ...job.audioOverrides, ...overrides }
      if ('bitrateKbps' in overrides && overrides.bitrateKbps === undefined) {
        delete next.bitrateKbps
      }
      job.audioOverrides = Object.keys(next).length ? next : undefined
      if (overrides.codec && overrides.codec !== 'none') {
        job.exportAudio = true
      }
      if (job.status === 'done' || job.status === 'error' || job.status === 'stopped') {
        job.status = 'waiting'
        job.progress = 0
        job.error = undefined
      }
    }
    this.emitChange()
  }

  setVideoOverrides(
    ids: string[],
    overrides: Partial<VideoSettings> | null,
    mode: 'merge' | 'replace' = 'merge'
  ): void {
    for (const job of this.jobs) {
      if (!ids.includes(job.id) || job.status === 'encoding') continue
      if (overrides === null) {
        job.videoOverrides = undefined
      } else if (mode === 'replace') {
        job.videoOverrides = Object.keys(overrides).length ? { ...overrides } : undefined
      } else {
        const next: Partial<VideoSettings> = { ...job.videoOverrides, ...overrides }
        job.videoOverrides = Object.keys(next).length ? next : undefined
      }
      if (job.status === 'done' || job.status === 'error' || job.status === 'stopped') {
        job.status = 'waiting'
        job.progress = 0
        job.error = undefined
      }
    }
    this.emitChange()
  }

  applyExportSettings(
    ids: string[],
    patch: {
      presetId?: string
      exportVideo?: boolean
      exportAudio?: boolean
      videoOverrides?: Partial<VideoSettings> | null
      audioOverrides?: Partial<AudioSettings> | null
    }
  ): void {
    if (patch.presetId) {
      this.setPreset(ids, patch.presetId)
    }
    if (patch.exportVideo !== undefined || patch.exportAudio !== undefined) {
      this.setExportTracks(ids, {
        exportVideo: patch.exportVideo,
        exportAudio: patch.exportAudio
      })
    }
    if (patch.videoOverrides !== undefined) {
      this.setVideoOverrides(ids, patch.videoOverrides, 'replace')
    }
    if (patch.audioOverrides !== undefined) {
      if (patch.audioOverrides === null) {
        for (const job of this.jobs) {
          if (!ids.includes(job.id) || job.status === 'encoding') continue
          job.audioOverrides = undefined
        }
        this.emitChange()
      } else {
        for (const job of this.jobs) {
          if (!ids.includes(job.id) || job.status === 'encoding') continue
          job.audioOverrides = Object.keys(patch.audioOverrides).length
            ? { ...patch.audioOverrides }
            : undefined
          if (job.status === 'done' || job.status === 'error' || job.status === 'stopped') {
            job.status = 'waiting'
            job.progress = 0
            job.error = undefined
          }
        }
        this.emitChange()
      }
    }
  }

  setOutputPath(ids: string[], outputPath: string): void {
    const trimmed = outputPath.trim()
    if (!trimmed) return
    for (const job of this.jobs) {
      if (!ids.includes(job.id) || job.status === 'encoding') continue
      const preset = findPreset(job.presetId)
      job.outputPath = preset ? withPresetExtension(trimmed, preset) : trimmed
      job.customOutputPath = true
      if (job.status === 'done' || job.status === 'error' || job.status === 'stopped') {
        job.status = 'waiting'
        job.progress = 0
        job.error = undefined
      }
    }
    this.emitChange()
  }

  setOutputFileName(ids: string[], fileName: string): void {
    const name = fileName.trim()
    if (!name) return
    for (const job of this.jobs) {
      if (!ids.includes(job.id) || job.status === 'encoding') continue
      const dir = path.dirname(job.outputPath)
      const preset = findPreset(job.presetId)
      const next = path.join(dir, name)
      job.outputPath = preset ? withPresetExtension(next, preset) : next
      job.customOutputPath = true
      if (job.status === 'done' || job.status === 'error' || job.status === 'stopped') {
        job.status = 'waiting'
        job.progress = 0
        job.error = undefined
      }
    }
    this.emitChange()
  }

  setOutputDirectory(ids: string[], directory: string): void {
    fs.mkdirSync(directory, { recursive: true })
    for (const job of this.jobs) {
      if (!ids.includes(job.id) || job.status === 'encoding') continue
      const preset = findPreset(job.presetId)
      if (!preset) continue
      const fileName = path.basename(job.outputPath)
      job.outputPath = path.join(directory, fileName)
      job.customOutputPath = true
    }
    this.emitChange()
  }

  private nextWaitingJob(): QueueJob | undefined {
    return this.jobs.find(
      (j) => j.status === 'waiting' || j.status === 'error' || j.status === 'stopped'
    )
  }

  private checkOverwrite(job: QueueJob): string | null {
    if (this.settings.overwriteOutput) return null
    if (isSequenceOutput(job.outputPath)) return null
    if (fs.existsSync(job.outputPath)) {
      return `Output already exists (overwrite disabled): ${job.outputPath}`
    }
    return null
  }

  private async runOne(job: QueueJob): Promise<void> {
    job.status = 'encoding'
    job.progress = 0
    job.startedAt = Date.now()
    // Keep probe warnings only until encode starts.
    if (job.error?.startsWith('Warning:')) job.error = undefined
    else job.error = undefined
    this.emitChange()

    const blocked = this.checkOverwrite(job)
    if (blocked) {
      job.status = 'error'
      job.error = blocked
      job.finishedAt = Date.now()
      this.emitChange()
      return
    }

    fs.mkdirSync(path.dirname(job.outputPath.replace('%06d', '000000')), { recursive: true })

    const attach = (runner: FfmpegRunner) => {
      runner.on('progress', (p: EncodeProgress) => {
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
    }

    const tryRun = async (settings: AppSettings): Promise<void> => {
      const runner = new FfmpegRunner()
      this.active.set(job.id, runner)
      attach(runner)
      try {
        await runner.run(job, settings)
      } finally {
        this.active.delete(job.id)
      }
    }

    try {
      await tryRun(this.settings)
      job.status = 'done'
      job.progress = 100
      job.finishedAt = Date.now()
    } catch (err) {
      if (this.stopped) {
        job.status = 'stopped'
        job.error = err instanceof Error ? err.message : String(err)
        job.finishedAt = Date.now()
      } else {
        const message = err instanceof Error ? err.message : String(err)
        const hw = this.settings.hardwareAcceleration
        const canFallback = hw !== 'none'
        const looksHw =
          /nvenc|qsv|amf|videotoolbox|cuda|nppc|h264_nvenc|hevc_nvenc|av1_nvenc/i.test(message) ||
          (hw !== 'auto' && hw !== 'none')

        if (canFallback && looksHw) {
          logger.warn(`HW encode failed for ${job.sourcePath}; retrying with software`, message)
          try {
            await tryRun({ ...this.settings, hardwareAcceleration: 'none' })
            job.status = 'done'
            job.progress = 100
            job.finishedAt = Date.now()
            job.error = undefined
            logger.info(`Software fallback succeeded for ${job.sourcePath}`)
          } catch (err2) {
            job.status = 'error'
            job.error = err2 instanceof Error ? err2.message : String(err2)
            job.finishedAt = Date.now()
            logger.error(`Encode failed for ${job.sourcePath}`, job.error)
          }
        } else {
          job.status = 'error'
          job.error = message
          job.finishedAt = Date.now()
          logger.error(`Encode failed for ${job.sourcePath}`, message)
        }
      }
    } finally {
      this.emitChange()
    }
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true
    this.stopped = false
    this.emit('state', { running: true })
    logger.info(`Queue started (maxConcurrent=${this.settings.maxConcurrent})`)

    const limit = Math.max(1, Math.min(8, this.settings.maxConcurrent || 1))
    const workers: Promise<void>[] = []

    const launch = async (): Promise<void> => {
      while (!this.stopped) {
        const job = this.nextWaitingJob()
        if (!job) return
        // Claim before await so other workers don't take the same job.
        job.status = 'encoding'
        await this.runOne(job)
      }
    }

    try {
      for (let i = 0; i < limit; i++) workers.push(launch())
      await Promise.all(workers)
    } finally {
      this.running = false
      this.emit('state', { running: false })
      logger.info('Queue idle')
    }
  }

  stop(): void {
    this.stopped = true
    for (const runner of this.active.values()) runner.stop()
  }
}
