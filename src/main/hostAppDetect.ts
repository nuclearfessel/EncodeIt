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

/**
 * Probe install locations only — apps do not need to be running.
 * Windows: Program Files (+ x86) Adobe / Blackmagic folders.
 * macOS: /Applications (+ ~/Applications) .app bundles.
 */
function detectWindows(): HostAppPresence {
  const result = emptyHostAppPresence()
  const programFiles = [
    process.env['ProgramW6432'],
    process.env['ProgramFiles'],
    process.env['ProgramFiles(x86)']
  ].filter((p): p is string => Boolean(p))

  const roots = [...new Set(programFiles)]

  for (const root of roots) {
    const adobe = path.join(root, 'Adobe')
    if (dirHasMatch(adobe, (n) => /^Adobe After Effects/i.test(n))) {
      result.afterEffects = true
    }
    if (dirHasMatch(adobe, (n) => /^Adobe Premiere Pro/i.test(n))) {
      result.premiere = true
    }

    if (fileExists(path.join(root, 'Blackmagic Design', 'DaVinci Resolve', 'Resolve.exe'))) {
      result.resolve = true
    }
  }

  // Resolve may also leave support files under LocalAppData
  const local = process.env.LOCALAPPDATA
  if (local && fs.existsSync(path.join(local, 'Blackmagic Design', 'DaVinci Resolve'))) {
    result.resolve = true
  }

  return result
}

function detectMac(): HostAppPresence {
  const result = emptyHostAppPresence()
  const appRoots = ['/Applications', path.join(os.homedir(), 'Applications')]

  for (const apps of appRoots) {
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
  }

  return result
}

/** Probe the machine for AE / Resolve / Premiere installs (disk only). */
export function detectHostApps(): HostAppPresence {
  if (process.platform === 'darwin') return detectMac()
  if (process.platform === 'win32') return detectWindows()
  return emptyHostAppPresence()
}

/**
 * Standard install: only enable integrations for apps present on disk.
 * Custom install should not use this — honor user checks as-is.
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
