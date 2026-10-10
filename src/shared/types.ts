export type Platform = 'win32' | 'darwin' | 'linux'

export type BitrateMode = 'cbr' | 'vbr1' | 'vbr2' | 'crf' | 'cq'

export type SourceFamily =
  | 'ame'
  | 'shutter'
  | 'compressor'
  | 'tmpgenc'
  | 'common'

export interface VideoSettings {
  codec: string
  encoder?: string
  profile?: string
  level?: string
  pixelFormat?: string
  width?: number | 'match'
  height?: number | 'match'
  frameRate?: number | string | 'match'
  bitrateKbps?: number
  maxBitrateKbps?: number
  bitrateMode?: BitrateMode
  crf?: number
  quality?: string | number
  gop?: number
  bFrames?: number
  avcintraClass?: 50 | 100 | 200 | 300 | 480
  dnxProfile?: string
  proresProfile?: string
  cineformQuality?: string
  tag?: string
  extraArgs?: string[]
  videoFilters?: string[]
}

export interface AudioSettings {
  enabled: boolean
  codec: string
  bitrateKbps?: number
  sampleRate?: number | 'match'
  channels?: number | 'match'
  extraArgs?: string[]
}

export interface FormatDefinition {
  id: string
  name: string
  extension: string
  container: string
  category: 'video' | 'audio' | 'still' | 'sequence'
  platforms: Array<Platform | 'all'>
  sources: SourceFamily[]
  description: string
  codecs: string[]
  notes?: string
}

export interface CodecVariant {
  id: string
  name: string
  formatIds: string[]
  sources: SourceFamily[]
  platforms: Array<Platform | 'all'>
  video: Partial<VideoSettings>
  audio?: Partial<AudioSettings>
  description?: string
  notes?: string
}

export interface PresetDefinition {
  id: string
  name: string
  group: string
  subgroup?: string
  formatId: string
  sources: SourceFamily[]
  platforms: Array<Platform | 'all'>
  description?: string
  video: VideoSettings
  audio: AudioSettings
  muxerArgs?: string[]
  sequence?: boolean
}

export type JobStatus =
  | 'waiting'
  | 'encoding'
  | 'done'
  | 'error'
  | 'stopped'
  | 'skipped'

export interface MediaStreamInfo {
  index: number
  codecType: 'video' | 'audio' | 'subtitle' | 'data' | string
  codecName?: string
  width?: number
  height?: number
  frameRate?: string
  duration?: number
  bitRate?: number
  sampleRate?: number
  channels?: number
  pixFmt?: string
}

export interface MediaInfo {
  path: string
  formatName?: string
  duration?: number
  size?: number
  bitRate?: number
  streams: MediaStreamInfo[]
}

export interface QueueJob {
  id: string
  sourcePath: string
  outputPath: string
  formatId: string
  presetId: string
  status: JobStatus
  progress: number
  speed?: string
  fps?: number
  time?: string
  error?: string
  createdAt: number
  startedAt?: number
  finishedAt?: number
  media?: MediaInfo
  videoOverrides?: Partial<VideoSettings>
  audioOverrides?: Partial<AudioSettings>
}

export interface WatchFolder {
  id: string
  path: string
  presetId: string
  outputDir: string
  enabled: boolean
}

export interface AppSettings {
  ffmpegPath: string
  ffprobePath: string
  outputDirectory: string
  maxConcurrent: number
  overwriteOutput: boolean
  hardwareAcceleration: 'auto' | 'none' | 'nvenc' | 'qsv' | 'amf' | 'videotoolbox'
}

export interface EncodeProgress {
  jobId: string
  progress: number
  speed?: string
  fps?: number
  time?: string
  status: JobStatus
  error?: string
}

export interface CatalogStats {
  formats: number
  codecs: number
  presets: number
  bySource: Record<SourceFamily, number>
}
