/** Selectable FFmpeg audio encoders for the Encoding panel. */
export interface AudioCodecOption {
  id: string
  label: string
  /** Default bitrate when the codec is lossy. */
  bitrateKbps?: number
  /** Codecs that ignore bitrate controls. */
  lossless?: boolean
}

export const AUDIO_CODEC_OPTIONS: AudioCodecOption[] = [
  { id: 'aac', label: 'AAC', bitrateKbps: 320 },
  { id: 'libmp3lame', label: 'MP3', bitrateKbps: 320 },
  { id: 'ac3', label: 'Dolby Digital (AC-3)', bitrateKbps: 640 },
  { id: 'eac3', label: 'Dolby Digital Plus', bitrateKbps: 384 },
  { id: 'libopus', label: 'Opus', bitrateKbps: 160 },
  { id: 'mp2', label: 'MPEG-1 Layer II', bitrateKbps: 384 },
  { id: 'wmav2', label: 'Windows Media Audio', bitrateKbps: 192 },
  { id: 'flac', label: 'FLAC', lossless: true },
  { id: 'alac', label: 'Apple Lossless (ALAC)', lossless: true },
  { id: 'pcm_s16le', label: 'PCM 16-bit', lossless: true },
  { id: 'pcm_s24le', label: 'PCM 24-bit', lossless: true },
  { id: 'copy', label: 'Copy (passthrough)', lossless: true }
]

export const AUDIO_BITRATE_OPTIONS = [
  96, 128, 160, 192, 224, 256, 320, 384, 448, 512, 640
] as const

export function getAudioCodecOption(id: string): AudioCodecOption | undefined {
  return AUDIO_CODEC_OPTIONS.find((c) => c.id === id)
}

export function audioCodecLabel(id: string): string {
  return getAudioCodecOption(id)?.label ?? id
}
