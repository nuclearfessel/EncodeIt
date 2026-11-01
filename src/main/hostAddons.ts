import fs from 'fs'
import os from 'os'
import path from 'path'
import type { HostAppPresence } from '../shared/hostAppDetect'
import { emptyHostAppPresence } from '../shared/hostAppDetect'
import {
  ADOBE_SCRIPT_BASENAMES,
  CEP_IDS,
  listAdobeScanRoots,
  listPluginTargets
} from './cleanupPaths'

function exists(p: string): boolean {
  try {
    return fs.existsSync(p)
  } catch {
    return false
  }
}

/**
 * EncodeIt host add-ons / scripts on disk (CEP panel, AE/Premiere JSX, Resolve Utility).
 * Watch folders alone do not count — those are created by the installer without plugins.
 */
export function detectHostAddons(): HostAppPresence {
  const result = emptyHostAppPresence()

  for (const target of listPluginTargets()) {
    if (!exists(target.path)) continue
    const label = target.label.toLowerCase()
    if (label.startsWith('cep/')) {
      result.afterEffects = true
    } else if (label.includes('resolve')) {
      result.resolve = true
    }
  }

  // Also treat CEP ids directly in case label format changes
  for (const id of CEP_IDS) {
    const win = path.join(
      process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
      'Adobe',
      'CEP',
      'extensions',
      id
    )
    const mac = path.join(
      os.homedir(),
      'Library',
      'Application Support',
      'Adobe',
      'CEP',
      'extensions',
      id
    )
    if (exists(win) || exists(mac)) result.afterEffects = true
  }

  const scriptNames = new Set<string>(ADOBE_SCRIPT_BASENAMES)

  function walkAdobe(dir: string, depth: number): void {
    if (depth > 6) return
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        const lower = entry.name.toLowerCase()
        if (
          lower.includes('after effects') ||
          lower.includes('premiere') ||
          lower === 'scripts' ||
          lower === 'scriptui panels' ||
          lower === 'support files'
        ) {
          walkAdobe(full, depth + 1)
        } else if (depth < 2) {
          walkAdobe(full, depth + 1)
        }
      } else if (entry.isFile() && scriptNames.has(entry.name)) {
        const lower = full.toLowerCase()
        if (lower.includes('after effects')) result.afterEffects = true
        if (lower.includes('premiere')) result.premiere = true
      }
    }
  }

  for (const root of listAdobeScanRoots()) {
    if (exists(root)) walkAdobe(root, 0)
  }

  return result
}

/** Hosts that both have folder setup flags and installed add-ons/scripts. */
export function coachHostsFor(
  folderFlags: HostAppPresence,
  addons: HostAppPresence = detectHostAddons()
): HostAppPresence {
  return {
    afterEffects: Boolean(folderFlags.afterEffects && addons.afterEffects),
    resolve: Boolean(folderFlags.resolve && addons.resolve),
    premiere: Boolean(folderFlags.premiere && addons.premiere)
  }
}
