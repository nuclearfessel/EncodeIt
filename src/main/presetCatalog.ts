import { FORMATS, CODEC_VARIANTS } from '../shared/catalog'
import { DEFAULT_PRESET_ID, PRESETS, getPreset as getSystemPreset } from '../shared/presets'
import type { PresetDefinition } from '../shared/types'
import { listUserPresets, getUserPreset } from './userPresets'

export function findPreset(id: string): PresetDefinition | undefined {
  return getUserPreset(id) ?? getSystemPreset(id)
}

export function allPresets(): PresetDefinition[] {
  const system = PRESETS.map((p) => ({ ...p, origin: p.origin ?? ('system' as const) }))
  return [...listUserPresets(), ...system]
}

export function presetsGroupedAll(): Map<string, Map<string, PresetDefinition[]>> {
  const root = new Map<string, Map<string, PresetDefinition[]>>()
  for (const preset of allPresets()) {
    const group = preset.group || (preset.origin === 'user' ? 'User' : 'Other')
    const subgroup = preset.subgroup ?? 'General'
    if (!root.has(group)) root.set(group, new Map())
    const g = root.get(group)!
    if (!g.has(subgroup)) g.set(subgroup, [])
    g.get(subgroup)!.push(preset)
  }
  // Keep User group first when present
  if (root.has('User')) {
    const user = root.get('User')!
    root.delete('User')
    const ordered = new Map<string, Map<string, PresetDefinition[]>>()
    ordered.set('User', user)
    for (const [k, v] of root) ordered.set(k, v)
    return ordered
  }
  return root
}

export function catalogPayload() {
  const presets = allPresets()
  return {
    formats: FORMATS,
    codecs: CODEC_VARIANTS,
    presets,
    grouped: Object.fromEntries(
      [...presetsGroupedAll().entries()].map(([group, subgroups]) => [
        group,
        Object.fromEntries(subgroups.entries())
      ])
    ),
    stats: {
      formats: FORMATS.length,
      codecs: CODEC_VARIANTS.length,
      presets: presets.length
    },
    defaultPresetId: DEFAULT_PRESET_ID
  }
}
