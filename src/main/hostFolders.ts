import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import type { HostAppPresence } from '../shared/hostAppDetect'
import {
  DEFAULT_INSTALL_OPTIONS,
  normalizeInstallOptions,
  resolvedInstallFlags,
  type InstallOptions
} from '../shared/installOptions'
import { DEFAULT_PRESET_ID } from '../shared/presets'
import type { WatchFolderSettings } from '../shared/types'
import { detectHostApps, filterFlagsByPresence } from './hostAppDetect'

export interface HostFolderLayout {
  /** Root: {Videos|Movies}/Encode This */
  root: string
  fromAe: string
  fromResolve: string
  fromPremiere: string
  output: string
}

export type HostFolderFlags = HostAppPresence

/**
 * Canonical host integration directories (Windows Videos + macOS Movies via Electron).
 * Same relative layout on both platforms.
 */
export function resolveHostFolderLayout(videosPath = app.getPath('videos')): HostFolderLayout {
  const root = path.join(videosPath, 'Encode This')
  return {
    root,
    fromAe: path.join(root, 'from-ae'),
    fromResolve: path.join(root, 'from-resolve'),
    fromPremiere: path.join(root, 'from-premiere'),
    output: path.join(root, 'Output')
  }
}

export function installOptionsPath(): string {
  return path.join(app.getPath('userData'), 'install-options.json')
}

export function readInstallOptionsFile(): InstallOptions | null {
  const file = installOptionsPath()
  if (!fs.existsSync(file)) return null
  try {
    return normalizeInstallOptions(JSON.parse(fs.readFileSync(file, 'utf8')))
  } catch {
    return null
  }
}

export function writeInstallOptionsFile(options: InstallOptions): void {
  const file = installOptionsPath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(normalizeInstallOptions(options), null, 2), 'utf8')
}

export function clearInstallOptionsFile(): void {
  const file = installOptionsPath()
  try {
    if (fs.existsSync(file)) fs.unlinkSync(file)
  } catch {
    /* ignore */
  }
}

/**
 * Create root + Output always; host app folders only when selected.
 * Idempotent — safe on every launch.
 */
export function ensureHostFolders(
  flags: HostFolderFlags = { afterEffects: true, resolve: true, premiere: true },
  layout = resolveHostFolderLayout()
): HostFolderLayout {
  fs.mkdirSync(layout.root, { recursive: true })
  fs.mkdirSync(layout.output, { recursive: true })
  writeHint(layout.output, 'Default encode output for watched host folders.')

  if (flags.afterEffects) {
    fs.mkdirSync(layout.fromAe, { recursive: true })
    writeHint(
      layout.fromAe,
      'Render After Effects Output Module files into this folder. Encode This watches it automatically.'
    )
  }
  if (flags.resolve) {
    fs.mkdirSync(layout.fromResolve, { recursive: true })
    writeHint(
      layout.fromResolve,
      'Set DaVinci Resolve Deliver destination to this folder. Encode This watches it automatically.'
    )
  }
  if (flags.premiere) {
    fs.mkdirSync(layout.fromPremiere, { recursive: true })
    writeHint(
      layout.fromPremiere,
      'Export from Premiere Pro into this folder. Encode This watches it automatically.'
    )
  }
  return layout
}

function writeHint(dir: string, text: string): void {
  const file = path.join(dir, 'README.txt')
  if (fs.existsSync(file)) return
  try {
    fs.writeFileSync(file, `${text}\n`, 'utf8')
  } catch {
    /* ignore */
  }
}

/** Watch-folder seeds for the integrations the user opted into. */
export function watchFolderSeedsForFlags(
  layout: HostFolderLayout,
  flags: HostFolderFlags,
  presetId = DEFAULT_PRESET_ID
): WatchFolderSettings[] {
  const seeds: WatchFolderSettings[] = []
  if (flags.afterEffects) {
    seeds.push({
      id: 'seed-from-ae',
      path: layout.fromAe,
      presetId,
      outputDir: layout.output,
      enabled: true
    })
  }
  if (flags.resolve) {
    seeds.push({
      id: 'seed-from-resolve',
      path: layout.fromResolve,
      presetId,
      outputDir: layout.output,
      enabled: true
    })
  }
  if (flags.premiere) {
    seeds.push({
      id: 'seed-from-premiere',
      path: layout.fromPremiere,
      presetId,
      outputDir: layout.output,
      enabled: true
    })
  }
  return seeds
}

/**
 * Resolve Standard/Custom choices, then drop apps that are not installed.
 * Standard = every *detected* host app; missing apps get no folders/watches.
 */
export function flagsFromInstallOptions(
  options: InstallOptions = DEFAULT_INSTALL_OPTIONS,
  presence: HostAppPresence = detectHostApps()
): HostFolderFlags {
  const requested = resolvedInstallFlags(normalizeInstallOptions(options))
  return filterFlagsByPresence(requested, presence)
}
