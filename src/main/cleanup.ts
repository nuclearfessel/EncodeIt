import fs from 'fs'
import path from 'path'
import {
  ADOBE_SCRIPT_BASENAMES,
  listAdobeScanRoots,
  listCleanupTargets,
  type CleanupTarget
} from './cleanupPaths'
import { logger } from './logger'

export interface CleanupResult {
  removed: string[]
  failed: Array<{ path: string; error: string }>
  skippedMedia: boolean
}

function rmPath(target: string): void {
  if (!fs.existsSync(target)) return
  fs.rmSync(target, { recursive: true, force: true })
}

function collectAdobeScriptFiles(): CleanupTarget[] {
  const out: CleanupTarget[] = []
  const names = new Set<string>(ADOBE_SCRIPT_BASENAMES)

  function walk(dir: string, depth: number): void {
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
          walk(full, depth + 1)
        } else if (depth < 2) {
          walk(full, depth + 1)
        }
      } else if (entry.isFile() && names.has(entry.name)) {
        out.push({ kind: 'plugin', path: full, label: `Adobe script ${entry.name}` })
      }
    }
  }

  for (const root of listAdobeScanRoots()) {
    if (fs.existsSync(root)) walk(root, 0)
  }
  return out
}

/** Remove EncodeIt app data, optional media, and known host plugins/scripts. */
export function runCleanup(options: { keepMedia: boolean }): CleanupResult {
  const removed: string[] = []
  const failed: Array<{ path: string; error: string }> = []
  const targets = [...listCleanupTargets(options), ...collectAdobeScriptFiles()]

  for (const target of targets) {
    try {
      if (!fs.existsSync(target.path)) continue
      rmPath(target.path)
      removed.push(target.path)
      logger.info(`Cleanup removed ${target.label}`, { path: target.path })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      failed.push({ path: target.path, error: message })
      logger.warn(`Cleanup failed for ${target.label}`, message)
    }
  }

  return { removed, failed, skippedMedia: options.keepMedia }
}
