import { EventEmitter } from 'events'
import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'
import { resolveOutputPath } from '../shared/buildCommand'
import { getFormat } from '../shared/formats'
import { DEFAULT_PRESET_ID, getPreset } from '../shared/presets'
import type {
  AppSettings,
  AudioSettings,
  EncodeProgress,
  PresetDefinition,
  QueueJob
} from '../shared/types'

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
import { FfmpegRunner } from './ffmpeg'
import { probeMedia } from './probe'

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
      const flags = exportFlagsForPreset(preset)
      const job: QueueJob = {
        id: uuid(),
        sourcePath,
        outputPath,
        formatId: preset.formatId,
        presetId: preset.id,
        status: 'waiting',
        progress: 0,
        createdAt: Date.now(),
        media,
        exportVideo: flags.exportVideo,
        exportAudio: flags.exportAudio
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
    this.emit('change', this.jobs)
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
        // Match AME: at least one stream must remain enabled.
        if (tracks.exportAudio === false) job.exportVideo = true
        else job.exportAudio = true
      }
      if (job.status === 'done' || job.status === 'error' || job.status === 'stopped') {
        job.status = 'waiting'
        job.progress = 0
        job.error = undefined
      }
    }
    this.emit('change', this.jobs)
  }

  setAudioOverrides(ids: string[], overrides: Partial<AudioSettings>): void {
    for (const job of this.jobs) {
      if (!ids.includes(job.id) || job.status === 'encoding') continue
      const next: Partial<AudioSettings> = { ...job.audioOverrides, ...overrides }
      // Explicit undefined clears a previous bitrate (e.g. switching to FLAC/PCM).
      if ('bitrateKbps' in overrides && overrides.bitrateKbps === undefined) {
        delete next.bitrateKbps
      }
      job.audioOverrides = next
      if (overrides.codec && overrides.codec !== 'none') {
        job.exportAudio = true
      }
      if (job.status === 'done' || job.status === 'error' || job.status === 'stopped') {
        job.status = 'waiting'
        job.progress = 0
        job.error = undefined
      }
    }
    this.emit('change', this.jobs)
  }

  setOutputPath(ids: string[], outputPath: string): void {
    const trimmed = outputPath.trim()
    if (!trimmed) return
    for (const job of this.jobs) {
      if (!ids.includes(job.id) || job.status === 'encoding') continue
      const preset = getPreset(job.presetId)
      job.outputPath = preset ? withPresetExtension(trimmed, preset) : trimmed
      job.customOutputPath = true
      if (job.status === 'done' || job.status === 'error' || job.status === 'stopped') {
        job.status = 'waiting'
        job.progress = 0
        job.error = undefined
      }
    }
    this.emit('change', this.jobs)
  }

  setOutputFileName(ids: string[], fileName: string): void {
    const name = fileName.trim()
    if (!name) return
    for (const job of this.jobs) {
      if (!ids.includes(job.id) || job.status === 'encoding') continue
      const dir = path.dirname(job.outputPath)
      const preset = getPreset(job.presetId)
      const next = path.join(dir, name)
      job.outputPath = preset ? withPresetExtension(next, preset) : next
      job.customOutputPath = true
      if (job.status === 'done' || job.status === 'error' || job.status === 'stopped') {
        job.status = 'waiting'
        job.progress = 0
        job.error = undefined
      }
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
      job.outputPath = path.join(directory, fileName)
      job.customOutputPath = true
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
