import type { HardwareAcceleration } from './hardware'

export type { HardwareAcceleration }

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
  /** When true, preset changes keep the chosen folder/name and only refresh the extension. */
  customOutputPath?: boolean
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
  /** Adobe Media Encoder–style Export Video checkbox (default true). */
  exportVideo: boolean
  /** Adobe Media Encoder–style Export Audio checkbox (default follows preset). */
  exportAudio: boolean
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

/** Persisted watch-folder entry (id assigned at runtime / on create). */
export interface WatchFolderSettings {
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
  hardwareAcceleration: HardwareAcceleration
  /** Localhost intake for AE / Resolve / CLI (Phase 2). */
  intakeEnabled: boolean
  intakePort: number
  /** Hotfolders for AE / Resolve / any render destination (Win + macOS). */
  watchFolders: WatchFolderSettings[]
  /**
   * True after install/first-launch seeded default from-ae / from-resolve / from-premiere watches.
   * Prevents re-adding watches if the user removes them.
   */
  hostFoldersSeeded: boolean
}

/** Extra fields returned by settings:get for the UI (not persisted). */
export type SettingsView = AppSettings & {
  ffmpegSource?: 'bundled' | 'system' | 'custom'
  ffmpegBundled?: boolean
  /** Canonical install folders (Videos/Movies/Encode This/…). */
  hostFolders?: {
    root: string
    fromAe: string
    fromResolve: string
    fromPremiere: string
    output: string
  }
  /**
   * True when first launch needs Standard/Custom integration choices
   * (no installer options file — typical for macOS DMG / portable).
   */
  needsIntegrationSetup?: boolean
  /** Which host NLEs were detected on this machine. */
  hostAppPresence?: {
    afterEffects: boolean
    resolve: boolean
    premiere: boolean
  }
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
