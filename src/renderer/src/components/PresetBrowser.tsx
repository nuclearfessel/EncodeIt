import { useMemo, useState } from 'react'
import type { PresetDefinition } from '../../../shared/types'

interface Props {
  grouped: Record<string, Record<string, PresetDefinition[]>>
  activePresetId: string
  onSelect: (id: string) => void
}

export function PresetBrowser({ grouped, activePresetId, onSelect }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return grouped
    const next: Record<string, Record<string, PresetDefinition[]>> = {}
    for (const [group, subgroups] of Object.entries(grouped)) {
      for (const [subgroup, presets] of Object.entries(subgroups)) {
        const hits = presets.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.id.toLowerCase().includes(q) ||
            p.sources.join(' ').includes(q) ||
            group.toLowerCase().includes(q) ||
            subgroup.toLowerCase().includes(q)
        )
        if (!hits.length) continue
        if (!next[group]) next[group] = {}
        next[group][subgroup] = hits
      }
    }
    return next
  }, [grouped, query])

  return (
    <>
      <input
        className="preset-search"
        placeholder="Search presets, AME, Shutter…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="preset-tree">
        {Object.entries(filtered).map(([group, subgroups]) => (
          <details key={group} className="preset-group" open>
            <summary>{group}</summary>
            {Object.entries(subgroups).map(([subgroup, presets]) => (
              <details key={`${group}-${subgroup}`} className="preset-subgroup" open={Boolean(query)}>
                <summary>{subgroup}</summary>
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`preset-item ${preset.id === activePresetId ? 'active' : ''}`}
                    onClick={() => onSelect(preset.id)}
                    title={preset.description ?? preset.id}
                  >
                    {preset.name}
                    <span className="preset-sources">{preset.sources.join(' · ')}</span>
                  </button>
                ))}
              </details>
            ))}
          </details>
        ))}
      </div>
    </>
  )
}
