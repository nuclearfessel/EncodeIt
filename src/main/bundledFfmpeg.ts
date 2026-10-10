import { app } from 'electron'
import fs from 'fs'
import path from 'path'

export interface BundledBinaries {
  ffmpeg: string
  ffprobe: string
}

function binaryNames(): { ffmpeg: string; ffprobe: string } {
  if (process.platform === 'win32') {
    return { ffmpeg: 'ffmpeg.exe', ffprobe: 'ffprobe.exe' }
  }
  return { ffmpeg: 'ffmpeg', ffprobe: 'ffprobe' }
}

function candidateDirs(): string[] {
  const dirs: string[] = []
  if (app.isPackaged) {
    dirs.push(path.join(process.resourcesPath, 'ffmpeg'))
  }

  // electron-vite / project layouts in development
  dirs.push(path.join(process.cwd(), 'resources', 'ffmpeg'))
  dirs.push(path.join(app.getAppPath(), 'resources', 'ffmpeg'))
  dirs.push(path.join(app.getAppPath(), '..', 'resources', 'ffmpeg'))
  dirs.push(path.join(__dirname, '../../resources/ffmpeg'))
  dirs.push(path.join(__dirname, '../../../resources/ffmpeg'))
  return dirs
}

export function resolveBundledFfmpeg(): BundledBinaries | null {
  const names = binaryNames()
  for (const dir of candidateDirs()) {
    const ffmpeg = path.join(dir, names.ffmpeg)
    const ffprobe = path.join(dir, names.ffprobe)
    if (fs.existsSync(ffmpeg) && fs.existsSync(ffprobe)) {
      return { ffmpeg, ffprobe }
    }
  }
  return null
}

/** Prefer an existing absolute custom path; otherwise bundled; otherwise PATH name. */
export function pickBinaryPath(
  stored: string | undefined,
  bundled: string | null,
  fallbackName: string
): string {
  if (stored && stored !== fallbackName && path.isAbsolute(stored) && fs.existsSync(stored)) {
    return stored
  }
  if (bundled && fs.existsSync(bundled)) return bundled
  return fallbackName
}
