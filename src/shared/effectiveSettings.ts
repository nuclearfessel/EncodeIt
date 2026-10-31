import type {
  AudioSettings,
  BitrateMode,
  PresetDefinition,
  QueueJob,
  VideoSettings
} from './types'

export function mergeVideoSettings(
  base: VideoSettings,
  over?: Partial<VideoSettings>
): VideoSettings {
  if (!over) return { ...base, extraArgs: [...(base.extraArgs ?? [])] }
  return {
    ...base,
    ...over,
    extraArgs: [...(base.extraArgs ?? []), ...(over.extraArgs ?? [])],
    videoFilters: over.videoFilters ?? base.videoFilters
  }
}

export function mergeAudioSettings(
  base: AudioSettings,
  over?: Partial<AudioSettings>
): AudioSettings {
  if (!over) return { ...base, extraArgs: [...(base.extraArgs ?? [])] }
  return {
    ...base,
    ...over,
    extraArgs: [...(base.extraArgs ?? []), ...(over.extraArgs ?? [])]
  }
}

export function getEffectiveVideo(
  job: Pick<QueueJob, 'videoOverrides'>,
  preset: PresetDefinition
): VideoSettings {
  return mergeVideoSettings(preset.video, job.videoOverrides)
}

export function getEffectiveAudio(
  job: Pick<QueueJob, 'audioOverrides' | 'exportAudio'>,
  preset: PresetDefinition
): AudioSettings {
  const merged = mergeAudioSettings(preset.audio, job.audioOverrides)
  if (!job.exportAudio) return { ...merged, enabled: false }
  return merged
}

function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((v, i) => v === b[i])
  }
  return a === b
}

/** Fields that differ from the preset base — used as job overrides. */
export function diffVideoSettings(
  base: VideoSettings,
  next: VideoSettings
): Partial<VideoSettings> {
  const keys = new Set([...Object.keys(base), ...Object.keys(next)]) as Set<
    keyof VideoSettings
  >
  const out: Partial<VideoSettings> = {}
  for (const key of keys) {
    const b = base[key]
    const n = next[key]
    if (!sameValue(b, n)) {
      ;(out as Record<string, unknown>)[key] = n
    }
  }
  return out
}

export function diffAudioSettings(
  base: AudioSettings,
  next: AudioSettings
): Partial<AudioSettings> {
  const keys = new Set([...Object.keys(base), ...Object.keys(next)]) as Set<
    keyof AudioSettings
  >
  const out: Partial<AudioSettings> = {}
  for (const key of keys) {
    const b = base[key]
    const n = next[key]
    if (!sameValue(b, n)) {
      ;(out as Record<string, unknown>)[key] = n
    }
  }
  return out
}

export function hasCustomOverrides(job: QueueJob): boolean {
  return Boolean(
    (job.videoOverrides && Object.keys(job.videoOverrides).length) ||
      (job.audioOverrides && Object.keys(job.audioOverrides).length)
  )
}

export function formatSizeLabel(video: VideoSettings): string {
  if (video.width === 'match' || video.height === 'match' || video.width == null) {
    return 'Match source'
  }
  if (video.height == null) return `${video.width}w`
  return `${video.width}×${video.height}`
}

export function formatBitrateLabel(video: VideoSettings): string {
  if (video.bitrateMode === 'crf' && video.crf != null) return `CRF ${video.crf}`
  if (video.bitrateMode === 'cq' && video.crf != null) return `CQ ${video.crf}`
  if (video.bitrateKbps != null) {
    const mode = (video.bitrateMode ?? 'vbr1').toUpperCase()
    return `${video.bitrateKbps} kbps (${mode})`
  }
  if (video.quality != null) return `Q ${video.quality}`
  return '—'
}

export function formatVideoSummary(video: VideoSettings): string {
  const codec = video.encoder ?? video.codec
  return `${codec} · ${formatSizeLabel(video)} · ${formatBitrateLabel(video)}`
}

export const BITRATE_MODE_OPTIONS: { id: BitrateMode; label: string }[] = [
  { id: 'vbr1', label: 'VBR' },
  { id: 'cbr', label: 'CBR' },
  { id: 'crf', label: 'CRF' },
  { id: 'cq', label: 'CQ' },
  { id: 'vbr2', label: 'VBR 2-pass' }
]

export const COMMON_FRAME_RATES = ['match', '23.976', '24', '25', '29.97', '30', '50', '59.94', '60']

export const COMMON_RESOLUTIONS: { label: string; width: number | 'match'; height: number | 'match' }[] =
  [
    { label: 'Match source', width: 'match', height: 'match' },
    { label: '3840×2160', width: 3840, height: 2160 },
    { label: '1920×1080', width: 1920, height: 1080 },
    { label: '1280×720', width: 1280, height: 720 },
    { label: '720×480', width: 720, height: 480 }
  ]
