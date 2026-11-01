import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import type { HardwareAcceleration } from '../shared/hardware'
import type { AppSettings, ThemeMode, WatchFolderSettings } from '../shared/types'
import { pickBinaryPath, resolveBundledFfmpeg } from './bundledFfmpeg'
import { whichBinary } from './ffmpeg'

const DEFAULTS: AppSettings = {
  ffmpegPath: 'ffmpeg',
  ffprobePath: 'ffprobe',
  outputDirectory: '',
  maxConcurrent: 1,
  overwriteOutput: true,
  hardwareAcceleration: 'auto',
  intakeEnabled: true,
  intakePort: 47821,
  watchFolders: [],
  hostFoldersSeeded: false,
  checkForUpdatesEnabled: true,
  themeMode: 'system'
}

const THEME_MODES: ThemeMode[] = ['system', 'light', 'dark']

function normalizeThemeMode(value: unknown): ThemeMode {
  return THEME_MODES.includes(value as ThemeMode) ? (value as ThemeMode) : 'system'
}

function normalizeWatchFolders(value: unknown): WatchFolderSettings[] {
  if (!Array.isArray(value)) return []
  const out: WatchFolderSettings[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Partial<WatchFolderSettings>
    if (typeof r.path !== 'string' || !r.path.trim()) continue
    out.push({
      id: typeof r.id === 'string' && r.id ? r.id : `wf-${out.length}`,
      path: r.path.trim(),
      presetId:
        typeof r.presetId === 'string' && r.presetId
          ? r.presetId
          : 'h264-match-source-high-bitrate',
      outputDir: typeof r.outputDir === 'string' ? r.outputDir : '',
      enabled: r.enabled !== false,
      autoStart: r.autoStart !== false,
      recursive: Boolean(r.recursive)
    })
  }
  return out
}

const HW_VALUES: HardwareAcceleration[] = [
  'auto',
  'none',
  'nvenc',
  'qsv',
  'amf',
  'videotoolbox'
]

function normalizeHardware(value: unknown): HardwareAcceleration {
  return HW_VALUES.includes(value as HardwareAcceleration)
    ? (value as HardwareAcceleration)
    : 'auto'
}

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

export async function loadSettings(): Promise<AppSettings> {
  const file = settingsPath()
  let stored: Partial<AppSettings> = {}
  if (fs.existsSync(file)) {
    try {
      stored = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<AppSettings>
    } catch {
      stored = {}
    }
  }

  const bundled = resolveBundledFfmpeg()
  let ffmpeg = pickBinaryPath(stored.ffmpegPath, bundled?.ffmpeg ?? null, 'ffmpeg')
  let ffprobe = pickBinaryPath(stored.ffprobePath, bundled?.ffprobe ?? null, 'ffprobe')
  if (!path.isAbsolute(ffmpeg) || !fs.existsSync(ffmpeg)) {
    ffmpeg = (await whichBinary('ffmpeg')) || bundled?.ffmpeg || ffmpeg
  }
  if (!path.isAbsolute(ffprobe) || !fs.existsSync(ffprobe)) {
    ffprobe = (await whichBinary('ffprobe')) || bundled?.ffprobe || ffprobe
  }
  const outputDirectory =
    stored.outputDirectory ||
    path.join(app.getPath('videos'), 'EncodeIt', 'Output')

  const settings: AppSettings = {
    ...DEFAULTS,
    ...stored,
    ffmpegPath: ffmpeg,
    ffprobePath: ffprobe,
    outputDirectory
  }

  fs.mkdirSync(settings.outputDirectory, { recursive: true })
  // Do not persist resolved absolute bundled paths as "custom" overrides.
  const toStore: AppSettings = {
    ...settings,
    ffmpegPath:
      bundled && settings.ffmpegPath === bundled.ffmpeg ? 'ffmpeg' : settings.ffmpegPath,
    ffprobePath:
      bundled && settings.ffprobePath === bundled.ffprobe ? 'ffprobe' : settings.ffprobePath
  }
  saveSettings(toStore)
  return settings
}

/** Strip UI-only fields (e.g. ffmpegSource) before persist / queue use. */
export function normalizeAppSettings(input: AppSettings): AppSettings {
  return {
    ffmpegPath: input.ffmpegPath || DEFAULTS.ffmpegPath,
    ffprobePath: input.ffprobePath || DEFAULTS.ffprobePath,
    outputDirectory: input.outputDirectory || DEFAULTS.outputDirectory,
    maxConcurrent: Math.max(1, Math.min(8, Number(input.maxConcurrent) || 1)),
    overwriteOutput: Boolean(input.overwriteOutput),
    hardwareAcceleration: normalizeHardware(input.hardwareAcceleration),
    intakeEnabled: Boolean(input.intakeEnabled),
    intakePort: Math.max(1024, Math.min(65535, Number(input.intakePort) || 47821)),
    watchFolders: normalizeWatchFolders(input.watchFolders),
    hostFoldersSeeded: Boolean(input.hostFoldersSeeded),
    checkForUpdatesEnabled:
      input.checkForUpdatesEnabled === undefined ? true : Boolean(input.checkForUpdatesEnabled),
    themeMode: normalizeThemeMode(input.themeMode)
  }
}

export function saveSettings(settings: AppSettings): void {
  const clean = normalizeAppSettings(settings)
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true })
  fs.writeFileSync(settingsPath(), JSON.stringify(clean, null, 2), 'utf8')
}

export function ffmpegSourceLabel(settings: AppSettings): 'bundled' | 'system' | 'custom' {
  const bundled = resolveBundledFfmpeg()
  if (bundled && settings.ffmpegPath === bundled.ffmpeg) return 'bundled'
  if (path.isAbsolute(settings.ffmpegPath) && settings.ffmpegPath !== bundled?.ffmpeg) {
    return 'custom'
  }
  return 'system'
}
