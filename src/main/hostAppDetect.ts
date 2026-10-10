import fs from 'fs'
import os from 'os'
import path from 'path'
import type { HostAppPresence } from '../shared/hostAppDetect'
import { emptyHostAppPresence } from '../shared/hostAppDetect'

function dirHasMatch(parent: string, predicate: (name: string) => boolean): boolean {
  if (!fs.existsSync(parent)) return false
  try {
    return fs.readdirSync(parent).some(predicate)
  } catch {
    return false
  }
}

function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath)
  } catch {
    return false
  }
}

function detectWindows(): HostAppPresence {
  const result = emptyHostAppPresence()
  const programFiles = [
    process.env['ProgramFiles'] || 'C:\\Program Files',
    process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
  ]

  for (const root of programFiles) {
    const adobe = path.join(root, 'Adobe')
    if (dirHasMatch(adobe, (n) => /^Adobe After Effects/i.test(n))) {
      result.afterEffects = true
    }
    if (dirHasMatch(adobe, (n) => /^Adobe Premiere Pro/i.test(n))) {
      result.premiere = true
    }

    const resolveExe = path.join(root, 'Blackmagic Design', 'DaVinci Resolve', 'Resolve.exe')
    if (fileExists(resolveExe)) result.resolve = true
  }

  // Resolve free/Studio sometimes only leaves AppData / shortcuts; also check common install.
  const local = process.env.LOCALAPPDATA
  if (local) {
    const resolveLocal = path.join(
      local,
      'Blackmagic Design',
      'DaVinci Resolve'
    )
    if (fs.existsSync(resolveLocal)) result.resolve = true
  }

  return result
}

function detectMac(): HostAppPresence {
  const result = emptyHostAppPresence()
  const apps = '/Applications'

  if (dirHasMatch(apps, (n) => /^Adobe After Effects.*\.app$/i.test(n))) {
    result.afterEffects = true
  }
  if (dirHasMatch(apps, (n) => /^Adobe Premiere Pro.*\.app$/i.test(n))) {
    result.premiere = true
  }
  if (
    dirHasMatch(apps, (n) => /^DaVinci Resolve( Studio)?\.app$/i.test(n)) ||
    fileExists(path.join(apps, 'DaVinci Resolve.app')) ||
    fileExists(path.join(apps, 'DaVinci Resolve Studio.app'))
  ) {
    result.resolve = true
  }

  // Some installs live under user Applications
  const userApps = path.join(os.homedir(), 'Applications')
  if (dirHasMatch(userApps, (n) => /^Adobe After Effects.*\.app$/i.test(n))) {
    result.afterEffects = true
  }
  if (dirHasMatch(userApps, (n) => /^DaVinci Resolve( Studio)?\.app$/i.test(n))) {
    result.resolve = true
  }
  if (dirHasMatch(userApps, (n) => /^Adobe Premiere Pro.*\.app$/i.test(n))) {
    result.premiere = true
  }

  return result
}

/** Probe the machine for AE / Resolve / Premiere installs. */
export function detectHostApps(): HostAppPresence {
  if (process.platform === 'darwin') return detectMac()
  if (process.platform === 'win32') return detectWindows()
  return emptyHostAppPresence()
}

/**
 * Standard install: only enable integrations for apps that are present.
 * Custom: honor user checks, but still skip apps that are not installed.
 */
export function filterFlagsByPresence(
  flags: HostAppPresence,
  presence: HostAppPresence = detectHostApps()
): HostAppPresence {
  return {
    afterEffects: Boolean(flags.afterEffects && presence.afterEffects),
    resolve: Boolean(flags.resolve && presence.resolve),
    premiere: Boolean(flags.premiere && presence.premiere)
  }
}
