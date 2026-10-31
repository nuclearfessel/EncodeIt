import { CODEC_VARIANTS } from './codecs'
import { FORMATS, getFormat } from './formats'
import type { BitrateMode, VideoSettings } from './types'

export interface SelectOption {
  value: string
  label: string
}

/** Ensure the current value appears even if not in the catalog. */
export function withCurrent(options: SelectOption[], current?: string | number | null): SelectOption[] {
  if (current == null || current === '') return options
  const value = String(current)
  if (options.some((o) => o.value === value)) return options
  return [{ value, label: `${value} (current)` }, ...options]
}

export function codecFamily(codec?: string): string {
  const c = (codec ?? '').toLowerCase()
  if (c.includes('x264') || c.includes('h264') || c === 'mpeg4') return 'h264'
  if (c.includes('x265') || c.includes('hevc')) return 'hevc'
  if (c.includes('prores')) return 'prores'
  if (c.includes('dnx')) return 'dnx'
  if (c.includes('cfhd') || c.includes('cineform')) return 'cineform'
  if (c.includes('avci') || c.includes('avcintra')) return 'avcintra'
  if (c.includes('mpeg2')) return 'mpeg2'
  if (c.includes('vp9') || c.includes('libvpx-vp9')) return 'vp9'
  if (c.includes('vp8') || c === 'libvpx') return 'vp8'
  if (c.includes('av1') || c.includes('aom')) return 'av1'
  if (c.includes('ffv1')) return 'ffv1'
  if (['png', 'tiff', 'dpx', 'exr', 'targa', 'bmp', 'mjpeg', 'jpeg2000'].includes(c)) return 'still'
  return 'generic'
}

const CODEC_LABELS: Record<string, string> = {
  libx264: 'H.264 (x264)',
  libx265: 'HEVC (x265)',
  prores_ks: 'Apple ProRes',
  dnxhd: 'DNxHD / DNxHR',
  cfhd: 'GoPro CineForm',
  mpeg2video: 'MPEG-2',
  mpeg4: 'MPEG-4 Part 2',
  libvpx: 'VP8',
  'libvpx-vp9': 'VP9',
  'libaom-av1': 'AV1 (libaom)',
  ffv1: 'FFV1',
  hap: 'HAP',
  dvvideo: 'DV',
  qtrle: 'QuickTime Animation',
  v210: 'Uncompressed 10-bit 4:2:2',
  rawvideo: 'Raw video',
  mjpeg: 'MJPEG',
  jpeg2000: 'JPEG 2000',
  png: 'PNG',
  tiff: 'TIFF',
  dpx: 'DPX',
  exr: 'OpenEXR',
  targa: 'Targa',
  bmp: 'BMP',
  gif: 'GIF',
  copy: 'Copy (no re-encode)',
  none: 'None'
}

export function codecLabel(codec: string): string {
  return CODEC_LABELS[codec] ?? codec
}

export function codecsForFormat(formatId: string): SelectOption[] {
  const format = getFormat(formatId)
  const ids = format?.codecs?.length
    ? format.codecs
    : [...new Set(CODEC_VARIANTS.flatMap((c) => (c.formatIds.includes(formatId) ? [c.video.codec] : [])))]
  const unique = [...new Set(ids.filter(Boolean))] as string[]
  return unique.map((id) => ({ value: id, label: codecLabel(id) }))
}

export function formatsAsOptions(): SelectOption[] {
  return FORMATS.map((f) => ({ value: f.id, label: `${f.name} (.${f.extension})` })).sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
  )
}

const H264_PROFILES: SelectOption[] = [
  { value: 'baseline', label: 'Baseline' },
  { value: 'main', label: 'Main' },
  { value: 'high', label: 'High' },
  { value: 'high10', label: 'High 10' },
  { value: 'high422', label: 'High 4:2:2' },
  { value: 'high444', label: 'High 4:4:4' }
]

const HEVC_PROFILES: SelectOption[] = [
  { value: 'main', label: 'Main' },
  { value: 'main10', label: 'Main 10' },
  { value: 'main422-10', label: 'Main 4:2:2 10' },
  { value: 'main444-10', label: 'Main 4:4:4 10' }
]

const LEVELS: SelectOption[] = [
  { value: '3.0', label: '3.0' },
  { value: '3.1', label: '3.1' },
  { value: '4.0', label: '4.0' },
  { value: '4.1', label: '4.1' },
  { value: '4.2', label: '4.2' },
  { value: '5.0', label: '5.0' },
  { value: '5.1', label: '5.1' },
  { value: '5.2', label: '5.2' },
  { value: '6.0', label: '6.0' },
  { value: '6.1', label: '6.1' },
  { value: '6.2', label: '6.2' }
]

const PIX_COMMON: SelectOption[] = [
  { value: 'yuv420p', label: '8-bit 4:2:0 (yuv420p)' },
  { value: 'yuv420p10le', label: '10-bit 4:2:0 (yuv420p10le)' },
  { value: 'yuv422p', label: '8-bit 4:2:2 (yuv422p)' },
  { value: 'yuv422p10le', label: '10-bit 4:2:2 (yuv422p10le)' },
  { value: 'yuv444p', label: '8-bit 4:4:4 (yuv444p)' },
  { value: 'yuv444p10le', label: '10-bit 4:4:4 (yuv444p10le)' },
  { value: 'yuva444p10le', label: '10-bit 4:4:4 + alpha' },
  { value: 'yuv411p', label: '4:1:1 (yuv411p)' },
  { value: 'uyvy422', label: 'UYVY 4:2:2' },
  { value: 'rgb24', label: 'RGB 8-bit' },
  { value: 'rgba', label: 'RGBA 8-bit' },
  { value: 'gbrp10le', label: 'GBR 10-bit' },
  { value: 'gbrp12le', label: 'GBR 12-bit' },
  { value: 'gbrap12le', label: 'GBRA 12-bit' },
  { value: 'xyz12le', label: 'XYZ 12-bit' }
]

export const PRORES_PROFILES: SelectOption[] = [
  { value: 'proxy', label: 'ProRes 422 Proxy' },
  { value: 'lt', label: 'ProRes 422 LT' },
  { value: 'standard', label: 'ProRes 422' },
  { value: 'hq', label: 'ProRes 422 HQ' },
  { value: '4444', label: 'ProRes 4444' },
  { value: '4444xq', label: 'ProRes 4444 XQ' }
]

export const DNX_PROFILES: SelectOption[] = [
  { value: 'dnxhd', label: 'DNxHD' },
  { value: 'dnxhr_lb', label: 'DNxHR LB' },
  { value: 'dnxhr_sq', label: 'DNxHR SQ' },
  { value: 'dnxhr_hq', label: 'DNxHR HQ' },
  { value: 'dnxhr_hqx', label: 'DNxHR HQX' },
  { value: 'dnxhr_444', label: 'DNxHR 444' }
]

export const CINEFORM_QUALITIES: SelectOption[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'film1', label: 'Film 1' },
  { value: 'film2', label: 'Film 2' },
  { value: 'film3', label: 'Film 3' }
]

export const AVCINTRA_CLASSES: SelectOption[] = [
  { value: '50', label: 'Class 50' },
  { value: '100', label: 'Class 100' },
  { value: '200', label: 'Class 200' },
  { value: '300', label: 'Class 300' },
  { value: '480', label: 'Class 480' }
]

export const BITRATE_MODES: { id: BitrateMode; label: string; hint: string }[] = [
  { id: 'vbr1', label: 'VBR (1-pass)', hint: 'Target average bitrate' },
  { id: 'vbr2', label: 'VBR (2-pass)', hint: 'Better quality at a target size' },
  { id: 'cbr', label: 'CBR', hint: 'Constant bitrate' },
  { id: 'crf', label: 'CRF', hint: 'Constant rate factor (quality)' },
  { id: 'cq', label: 'CQ', hint: 'Constant quality (hardware-friendly)' }
]

export const RESOLUTION_PRESETS: { label: string; width: number | 'match'; height: number | 'match' }[] = [
  { label: 'Match source', width: 'match', height: 'match' },
  { label: '8K UHD — 7680×4320', width: 7680, height: 4320 },
  { label: '4K UHD — 3840×2160', width: 3840, height: 2160 },
  { label: '2K DCI — 2048×1080', width: 2048, height: 1080 },
  { label: '1080p — 1920×1080', width: 1920, height: 1080 },
  { label: '720p — 1280×720', width: 1280, height: 720 },
  { label: 'SD NTSC — 720×480', width: 720, height: 480 },
  { label: 'SD PAL — 720×576', width: 720, height: 576 },
  { label: 'Vertical 1080×1920', width: 1080, height: 1920 },
  { label: 'Vertical 1080×1350', width: 1080, height: 1350 }
]

export const FRAME_RATE_OPTIONS: SelectOption[] = [
  { value: 'match', label: 'Match source' },
  { value: '23.976', label: '23.976 fps' },
  { value: '24', label: '24 fps' },
  { value: '25', label: '25 fps' },
  { value: '29.97', label: '29.97 fps' },
  { value: '30', label: '30 fps' },
  { value: '48', label: '48 fps' },
  { value: '50', label: '50 fps' },
  { value: '59.94', label: '59.94 fps' },
  { value: '60', label: '60 fps' }
]

export const SAMPLE_RATES: SelectOption[] = [
  { value: 'match', label: 'Match source' },
  { value: '44100', label: '44.1 kHz' },
  { value: '48000', label: '48 kHz' },
  { value: '96000', label: '96 kHz' }
]

export const CHANNEL_OPTIONS: SelectOption[] = [
  { value: 'match', label: 'Match source' },
  { value: '1', label: 'Mono' },
  { value: '2', label: 'Stereo' },
  { value: '6', label: '5.1 surround' },
  { value: '8', label: '7.1 surround' }
]

export const GOP_PRESETS: SelectOption[] = [
  { value: '', label: 'Auto (encoder default)' },
  { value: '12', label: '12' },
  { value: '24', label: '24' },
  { value: '30', label: '30' },
  { value: '48', label: '48' },
  { value: '60', label: '60' },
  { value: '120', label: '120' },
  { value: '250', label: '250' }
]

export const VIDEO_BITRATE_PRESETS: SelectOption[] = [
  { value: '1000', label: '1 Mbps' },
  { value: '2500', label: '2.5 Mbps' },
  { value: '5000', label: '5 Mbps' },
  { value: '8000', label: '8 Mbps' },
  { value: '12000', label: '12 Mbps' },
  { value: '16000', label: '16 Mbps' },
  { value: '20000', label: '20 Mbps' },
  { value: '35000', label: '35 Mbps' },
  { value: '50000', label: '50 Mbps' },
  { value: '100000', label: '100 Mbps' }
]

export const CRF_PRESETS: SelectOption[] = [
  { value: '14', label: '14 — visually lossless' },
  { value: '16', label: '16 — very high' },
  { value: '18', label: '18 — high' },
  { value: '20', label: '20 — high' },
  { value: '23', label: '23 — default' },
  { value: '26', label: '26 — medium' },
  { value: '28', label: '28 — smaller file' },
  { value: '32', label: '32 — low' }
]

export function profilesForCodec(codec?: string): SelectOption[] {
  const family = codecFamily(codec)
  if (family === 'h264' || family === 'mpeg2') return H264_PROFILES
  if (family === 'hevc') return HEVC_PROFILES
  return []
}

export function levelsForCodec(codec?: string): SelectOption[] {
  const family = codecFamily(codec)
  if (family === 'h264' || family === 'hevc' || family === 'mpeg2') return LEVELS
  return []
}

export function pixelFormatsForCodec(codec?: string): SelectOption[] {
  const family = codecFamily(codec)
  if (family === 'prores') {
    return PIX_COMMON.filter((p) =>
      ['yuv422p10le', 'yuva444p10le', 'yuv422p', 'yuv444p10le'].includes(p.value)
    )
  }
  if (family === 'dnx') {
    return PIX_COMMON.filter((p) =>
      ['yuv422p', 'yuv422p10le', 'yuv444p10le'].includes(p.value)
    )
  }
  if (family === 'still') {
    return PIX_COMMON.filter((p) =>
      ['rgb24', 'rgba', 'yuv420p', 'yuv422p10le', 'gbrp12le', 'gbrap12le', 'xyz12le'].includes(
        p.value
      )
    )
  }
  return PIX_COMMON
}

export function usesBitrate(video: VideoSettings): boolean {
  const mode = video.bitrateMode ?? 'vbr1'
  return mode === 'vbr1' || mode === 'vbr2' || mode === 'cbr'
}

export function usesQuality(video: VideoSettings): boolean {
  const mode = video.bitrateMode ?? 'vbr1'
  return mode === 'crf' || mode === 'cq'
}

/** Sensible defaults when switching codec via the dropdown. */
export function defaultsForCodec(codec: string): Partial<VideoSettings> {
  const match = CODEC_VARIANTS.find((c) => c.video.codec === codec)
  if (match) {
    return {
      codec,
      encoder: undefined,
      profile: match.video.profile,
      level: match.video.level,
      pixelFormat: match.video.pixelFormat,
      proresProfile: match.video.proresProfile,
      dnxProfile: match.video.dnxProfile,
      cineformQuality: match.video.cineformQuality,
      avcintraClass: match.video.avcintraClass,
      tag: match.video.tag
    }
  }
  const family = codecFamily(codec)
  if (family === 'h264') {
    return { codec, profile: 'high', level: '5.1', pixelFormat: 'yuv420p', bitrateMode: 'vbr1' }
  }
  if (family === 'hevc') {
    return { codec, profile: 'main', pixelFormat: 'yuv420p', tag: 'hvc1', bitrateMode: 'vbr1' }
  }
  if (family === 'prores') {
    return { codec, proresProfile: 'hq', pixelFormat: 'yuv422p10le' }
  }
  if (family === 'dnx') {
    return { codec, dnxProfile: 'dnxhr_hq', pixelFormat: 'yuv422p' }
  }
  return { codec }
}

export function summarizeVideo(video: VideoSettings): string {
  const codec = codecLabel(video.encoder ?? video.codec)
  const size =
    video.width === 'match' || video.height === 'match' || video.width == null
      ? 'Match source'
      : `${video.width}×${video.height}`
  let rate = '—'
  if (usesQuality(video) && video.crf != null) rate = `CRF ${video.crf}`
  else if (video.bitrateKbps != null) rate = `${video.bitrateKbps} kbps`
  return `${codec} · ${size} · ${rate}`
}
