import os from 'os'
import path from 'path'

export type CleanupKind = 'appData' | 'media' | 'plugin'

export interface CleanupTarget {
  kind: CleanupKind
  /** Absolute path to delete (file or directory). */
  path: string
  /** Human label for dialogs / logs. */
  label: string
}

const PRODUCT_NAMES = ['EncodeIt', 'Encode This'] as const
const CEP_IDS = ['encodeit-ae', 'encode-this-ae'] as const
const SCRIPT_NAMES = [
  'SendToEncodeIt.jsx',
  'SendToEncodeThis.jsx',
  'send_to_encodeit.py',
  'send_to_encode_this.py',
  'resolve_deliver_handoff.py',
  'resolve_deliver_handoff_encode_this.py'
] as const

function home(): string {
  return os.homedir()
}

function winAppData(): string {
  return process.env.APPDATA || path.join(home(), 'AppData', 'Roaming')
}

function winLocalAppData(): string {
  return process.env.LOCALAPPDATA || path.join(home(), 'AppData', 'Local')
}

function pushUnique(out: CleanupTarget[], target: CleanupTarget): void {
  if (out.some((t) => t.path === target.path)) return
  out.push(target)
}

/** Electron / OS app data, logs, caches (always removed). */
export function listAppDataTargets(): CleanupTarget[] {
  const out: CleanupTarget[] = []
  const platform = process.platform

  for (const name of PRODUCT_NAMES) {
    if (platform === 'win32') {
      pushUnique(out, {
        kind: 'appData',
        path: path.join(winAppData(), name),
        label: `AppData\\${name}`
      })
      pushUnique(out, {
        kind: 'appData',
        path: path.join(winLocalAppData(), name),
        label: `LocalAppData\\${name}`
      })
    } else if (platform === 'darwin') {
      pushUnique(out, {
        kind: 'appData',
        path: path.join(home(), 'Library', 'Application Support', name),
        label: `Application Support/${name}`
      })
      pushUnique(out, {
        kind: 'appData',
        path: path.join(home(), 'Library', 'Logs', name),
        label: `Logs/${name}`
      })
      pushUnique(out, {
        kind: 'appData',
        path: path.join(home(), 'Library', 'Caches', name),
        label: `Caches/${name}`
      })
      pushUnique(out, {
        kind: 'appData',
        path: path.join(home(), 'Library', 'Preferences', `com.encodeit.app.plist`),
        label: 'Preferences com.encodeit.app'
      })
      if (name === 'Encode This') {
        pushUnique(out, {
          kind: 'appData',
          path: path.join(home(), 'Library', 'Preferences', 'com.encode-this.app.plist'),
          label: 'Preferences com.encode-this.app'
        })
      }
    } else {
      pushUnique(out, {
        kind: 'appData',
        path: path.join(home(), '.config', name === 'EncodeIt' ? 'EncodeIt' : 'encode-this'),
        label: `.config/${name}`
      })
      pushUnique(out, {
        kind: 'appData',
        path: path.join(home(), '.cache', name === 'EncodeIt' ? 'EncodeIt' : 'encode-this'),
        label: `.cache/${name}`
      })
      // electron-builder / lowercase variants
      pushUnique(out, {
        kind: 'appData',
        path: path.join(home(), '.config', name === 'EncodeIt' ? 'encodeit' : 'encode-this'),
        label: `.config/${name.toLowerCase()}`
      })
    }
  }

  return out
}

/** Watch / Output media trees (removed unless keepMedia). */
export function listMediaTargets(): CleanupTarget[] {
  const out: CleanupTarget[] = []
  const platform = process.platform
  const videos =
    platform === 'darwin'
      ? path.join(home(), 'Movies')
      : path.join(home(), 'Videos')

  for (const name of PRODUCT_NAMES) {
    pushUnique(out, {
      kind: 'media',
      path: path.join(videos, name),
      label: `${platform === 'darwin' ? 'Movies' : 'Videos'}/${name}`
    })
  }
  return out
}

/**
 * Known optional host plugin / script locations.
 * Program Files Adobe Scripts may fail without elevation — caller best-effort.
 */
export function listPluginTargets(): CleanupTarget[] {
  const out: CleanupTarget[] = []
  const platform = process.platform

  for (const id of CEP_IDS) {
    if (platform === 'win32') {
      pushUnique(out, {
        kind: 'plugin',
        path: path.join(winAppData(), 'Adobe', 'CEP', 'extensions', id),
        label: `CEP/${id}`
      })
    } else if (platform === 'darwin') {
      pushUnique(out, {
        kind: 'plugin',
        path: path.join(home(), 'Library', 'Application Support', 'Adobe', 'CEP', 'extensions', id),
        label: `CEP/${id}`
      })
    }
  }

  const resolveUtilityDirs: string[] = []
  if (platform === 'win32') {
    resolveUtilityDirs.push(
      path.join(
        winAppData(),
        'Blackmagic Design',
        'DaVinci Resolve',
        'Support',
        'Fusion',
        'Scripts',
        'Utility'
      )
    )
  } else if (platform === 'darwin') {
    resolveUtilityDirs.push(
      path.join(
        home(),
        'Library',
        'Application Support',
        'Blackmagic Design',
        'DaVinci Resolve',
        'Fusion',
        'Scripts',
        'Utility'
      )
    )
  } else {
    resolveUtilityDirs.push(
      path.join(home(), '.local', 'share', 'DaVinciResolve', 'Fusion', 'Scripts', 'Utility')
    )
  }

  for (const dir of resolveUtilityDirs) {
    for (const file of SCRIPT_NAMES) {
      if (!file.endsWith('.py')) continue
      pushUnique(out, {
        kind: 'plugin',
        path: path.join(dir, file),
        label: `Resolve Utility/${file}`
      })
    }
  }

  return out
}

/** Roots to scan for SendToEncodeIt.jsx (and Encode This legacy). */
export function listAdobeScanRoots(): string[] {
  const roots: string[] = []
  if (process.platform === 'win32') {
    for (const base of [
      process.env['ProgramFiles'],
      process.env['ProgramFiles(x86)'],
      process.env.ProgramW6432
    ].filter(Boolean) as string[]) {
      roots.push(path.join(base, 'Adobe'))
    }
  } else if (process.platform === 'darwin') {
    roots.push('/Applications', path.join(home(), 'Applications'))
  }
  return roots
}

export function listCleanupTargets(options: { keepMedia: boolean }): CleanupTarget[] {
  const targets = [...listAppDataTargets(), ...listPluginTargets()]
  if (!options.keepMedia) targets.push(...listMediaTargets())
  return targets
}

export const ADOBE_SCRIPT_BASENAMES = [
  'SendToEncodeIt.jsx',
  'SendToEncodeThis.jsx'
] as const

export { PRODUCT_NAMES, CEP_IDS, SCRIPT_NAMES }
