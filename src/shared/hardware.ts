export type HardwareAcceleration =
  | 'auto'
  | 'none'
  | 'nvenc'
  | 'qsv'
  | 'amf'
  | 'videotoolbox'

export interface HardwareCapabilities {
  platform: string
  /** FFmpeg binary used for the probe. */
  ffmpegPath: string
  nvenc: boolean
  qsv: boolean
  amf: boolean
  videotoolbox: boolean
  /** Encoder ids reported by ffmpeg (subset). */
  encoders: string[]
  probedAt: number
}

export interface HardwareOption {
  id: HardwareAcceleration
  label: string
  description: string
  available: boolean
}

export function resolveHardwareAcceleration(
  preference: HardwareAcceleration,
  caps: HardwareCapabilities
): Exclude<HardwareAcceleration, 'auto'> {
  if (preference === 'none') return 'none'
  if (preference !== 'auto') {
    return caps[preference] ? preference : 'none'
  }

  // Auto: prefer the strongest platform-native GPU encode path when present.
  if (caps.platform === 'darwin' && caps.videotoolbox) return 'videotoolbox'
  if (caps.nvenc) return 'nvenc'
  if (caps.amf) return 'amf'
  if (caps.qsv) return 'qsv'
  if (caps.videotoolbox) return 'videotoolbox'
  return 'none'
}

export function hardwareOptions(caps: HardwareCapabilities): HardwareOption[] {
  const resolvedAuto = resolveHardwareAcceleration('auto', caps)
  const autoHint =
    resolvedAuto === 'none'
      ? 'Software encoding (no GPU encoder detected)'
      : `Uses ${hardwareLabel(resolvedAuto)} when available`

  return [
    {
      id: 'auto',
      label: 'Auto',
      description: autoHint,
      available: true
    },
    {
      id: 'none',
      label: 'None (software)',
      description: 'CPU encode — typically best quality, slower',
      available: true
    },
    {
      id: 'nvenc',
      label: 'NVIDIA NVENC',
      description: caps.nvenc ? 'Detected in FFmpeg' : 'Not available on this system',
      available: caps.nvenc
    },
    {
      id: 'qsv',
      label: 'Intel Quick Sync (QSV)',
      description: caps.qsv ? 'Detected in FFmpeg' : 'Not available on this system',
      available: caps.qsv
    },
    {
      id: 'amf',
      label: 'AMD AMF',
      description: caps.amf ? 'Detected in FFmpeg' : 'Not available on this system',
      available: caps.amf
    },
    {
      id: 'videotoolbox',
      label: 'Apple VideoToolbox',
      description: caps.videotoolbox ? 'Detected in FFmpeg' : 'Not available on this system',
      available: caps.videotoolbox
    }
  ]
}

export function hardwareLabel(id: Exclude<HardwareAcceleration, 'auto'> | HardwareAcceleration): string {
  switch (id) {
    case 'auto':
      return 'Auto'
    case 'none':
      return 'Software'
    case 'nvenc':
      return 'NVIDIA NVENC'
    case 'qsv':
      return 'Intel QSV'
    case 'amf':
      return 'AMD AMF'
    case 'videotoolbox':
      return 'Apple VideoToolbox'
    default:
      return id
  }
}
