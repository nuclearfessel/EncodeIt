import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import type { AppSettings } from '../shared/types'
import { whichBinary } from './ffmpeg'

const DEFAULTS: AppSettings = {
  ffmpegPath: 'ffmpeg',
  ffprobePath: 'ffprobe',
  outputDirectory: '',
  maxConcurrent: 1,
  overwriteOutput: true,
  hardwareAcceleration: 'auto'
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

  const ffmpeg = stored.ffmpegPath || (await whichBinary('ffmpeg')) || 'ffmpeg'
  const ffprobe = stored.ffprobePath || (await whichBinary('ffprobe')) || 'ffprobe'
  const outputDirectory =
    stored.outputDirectory || path.join(app.getPath('videos'), 'Encode This')

  const settings: AppSettings = {
    ...DEFAULTS,
    ...stored,
    ffmpegPath: ffmpeg,
    ffprobePath: ffprobe,
    outputDirectory
  }

  fs.mkdirSync(settings.outputDirectory, { recursive: true })
  saveSettings(settings)
  return settings
}

export function saveSettings(settings: AppSettings): void {
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true })
  fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), 'utf8')
}
