import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'
import type { PresetDefinition } from '../shared/types'

function storePath(): string {
  return path.join(app.getPath('userData'), 'user-presets.json')
}

function isPreset(raw: unknown): raw is PresetDefinition {
  if (!raw || typeof raw !== 'object') return false
  const p = raw as Partial<PresetDefinition>
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.group === 'string' &&
    typeof p.formatId === 'string' &&
    Boolean(p.video) &&
    Boolean(p.audio)
  )
}

let cache: PresetDefinition[] | null = null

export function loadUserPresets(): PresetDefinition[] {
  if (cache) return cache
  try {
    const file = storePath()
    if (!fs.existsSync(file)) {
      cache = []
      return cache
    }
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown
    const list = Array.isArray(parsed) ? parsed.filter(isPreset) : []
    cache = list.map((p) => ({ ...p, origin: 'user' as const, group: p.group || 'User' }))
    return cache
  } catch {
    cache = []
    return cache
  }
}

function persist(list: PresetDefinition[]): void {
  cache = list
  const file = storePath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(list, null, 2), 'utf8')
}

export function listUserPresets(): PresetDefinition[] {
  return loadUserPresets().map((p) => ({ ...p }))
}

export function getUserPreset(id: string): PresetDefinition | undefined {
  return loadUserPresets().find((p) => p.id === id)
}

export function saveUserPreset(
  input: Omit<PresetDefinition, 'origin' | 'id' | 'platforms'> & {
    id?: string
    platforms?: PresetDefinition['platforms']
  }
): PresetDefinition {
  const list = loadUserPresets()
  const id =
    input.id && input.id.startsWith('user-')
      ? input.id
      : `user-${uuid().slice(0, 8)}`
  const preset: PresetDefinition = {
    ...input,
    id,
    platforms: input.platforms ?? ['all'],
    group: 'User',
    subgroup: input.subgroup ?? 'Custom',
    origin: 'user'
  }
  const idx = list.findIndex((p) => p.id === id)
  if (idx >= 0) list[idx] = preset
  else list.push(preset)
  persist(list)
  return { ...preset }
}

export function renameUserPreset(id: string, name: string): PresetDefinition | undefined {
  const list = loadUserPresets()
  const preset = list.find((p) => p.id === id)
  if (!preset) return undefined
  preset.name = name.trim() || preset.name
  persist(list)
  return { ...preset }
}

export function deleteUserPreset(id: string): boolean {
  const list = loadUserPresets()
  const next = list.filter((p) => p.id !== id)
  if (next.length === list.length) return false
  persist(next)
  return true
}
