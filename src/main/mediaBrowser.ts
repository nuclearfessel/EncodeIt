import fs from 'fs'
import os from 'os'
import path from 'path'
import { app } from 'electron'

const MEDIA_EXT = new Set([
  '.mp4',
  '.mov',
  '.mkv',
  '.mxf',
  '.avi',
  '.m4v',
  '.wmv',
  '.mpg',
  '.mpeg',
  '.m2ts',
  '.mts',
  '.ts',
  '.webm',
  '.mp3',
  '.wav',
  '.aif',
  '.aiff',
  '.flac',
  '.aac',
  '.m4a',
  '.png',
  '.jpg',
  '.jpeg',
  '.tif',
  '.tiff',
  '.exr',
  '.dpx',
  '.tga',
  '.bmp',
  '.gif'
])

export type BrowserListMode = 'media' | 'directories' | 'files'

export interface BrowserEntry {
  name: string
  path: string
  kind: 'dir' | 'media' | 'other'
  size?: number
  mtimeMs?: number
}

export interface BrowserListing {
  path: string
  parent: string | null
  entries: BrowserEntry[]
  /** True when listing machine roots / common locations. */
  isRoots?: boolean
}

export function defaultBrowserRoot(): string {
  try {
    return app.getPath('videos')
  } catch {
    return os.homedir()
  }
}

function commonLocations(): BrowserEntry[] {
  const entries: BrowserEntry[] = []
  const add = (name: string, dir: string) => {
    try {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        entries.push({ name, path: dir, kind: 'dir' })
      }
    } catch {
      /* skip */
    }
  }

  add('Home', os.homedir())
  try {
    add('Videos', app.getPath('videos'))
  } catch {
    /* skip */
  }
  try {
    add('Documents', app.getPath('documents'))
  } catch {
    /* skip */
  }
  try {
    add('Desktop', app.getPath('desktop'))
  } catch {
    /* skip */
  }
  try {
    add('Downloads', app.getPath('downloads'))
  } catch {
    /* skip */
  }

  if (process.platform === 'win32') {
    for (let code = 65; code <= 90; code++) {
      const letter = String.fromCharCode(code)
      const root = `${letter}:\\`
      try {
        if (fs.existsSync(root)) {
          entries.push({ name: `${letter}:`, path: root, kind: 'dir' })
        }
      } catch {
        /* skip */
      }
    }
  } else {
    add('Root', '/')
  }

  // De-dupe by path
  const seen = new Set<string>()
  return entries.filter((e) => {
    const key = e.path.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function listBrowserRoots(): BrowserListing {
  return {
    path: 'Locations',
    parent: null,
    isRoots: true,
    entries: commonLocations()
  }
}

export function listBrowserDirectory(
  dirPath: string,
  mode: BrowserListMode = 'media'
): BrowserListing {
  if (!dirPath || dirPath === 'Locations') {
    return listBrowserRoots()
  }

  const resolved = path.resolve(dirPath)
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error(`Not a directory: ${resolved}`)
  }

  const parentDir = path.dirname(resolved)
  const atFsRoot = parentDir === resolved
  const parent = atFsRoot ? 'Locations' : parentDir

  const names = fs.readdirSync(resolved)
  const entries: BrowserEntry[] = []

  for (const name of names) {
    if (name.startsWith('.')) continue
    const full = path.join(resolved, name)
    let st: fs.Stats
    try {
      st = fs.statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) {
      entries.push({ name, path: full, kind: 'dir', mtimeMs: st.mtimeMs })
      continue
    }
    if (!st.isFile()) continue
    if (mode === 'directories') continue

    const ext = path.extname(name).toLowerCase()
    const isMedia = MEDIA_EXT.has(ext)
    if (mode === 'media' && !isMedia) continue

    entries.push({
      name,
      path: full,
      kind: isMedia ? 'media' : 'other',
      size: st.size,
      mtimeMs: st.mtimeMs
    })
  }

  entries.sort((a, b) => {
    if (a.kind === 'dir' && b.kind !== 'dir') return -1
    if (a.kind !== 'dir' && b.kind === 'dir') return 1
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })

  return { path: resolved, parent, entries }
}
