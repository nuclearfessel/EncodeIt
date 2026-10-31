import { useMemo, useState } from 'react'
import type { PresetDefinition } from '../../../shared/types'
import { ChevronRight, Search, iconSize } from './icons'

interface Props {
  grouped: Record<string, Record<string, PresetDefinition[]>>
  activePresetId: string
  onSelect: (id: string) => void
  onDeleteUserPreset?: (id: string) => void
}

export function PresetBrowser({
  grouped,
  activePresetId,
  onSelect,
  onDeleteUserPreset
}: Props) {
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
      <label className="preset-search-wrap">
        <Search size={iconSize.sm} strokeWidth={2} aria-hidden="true" />
        <input
          className="preset-search"
          placeholder="Search presets…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="preset-tree">
        {Object.entries(filtered).map(([group, subgroups]) => (
          <details key={group} className="preset-group" open>
            <summary>
              <ChevronRight className="preset-chevron" size={iconSize.sm} strokeWidth={2} />
              <span>{group}</span>
            </summary>
            {Object.entries(subgroups).map(([subgroup, presets]) => (
              <details
                key={`${group}-${subgroup}`}
                className="preset-subgroup"
                open={Boolean(query) || group === 'User'}
              >
                <summary>
                  <ChevronRight className="preset-chevron" size={iconSize.sm} strokeWidth={2} />
                  <span>{subgroup}</span>
                </summary>
                {presets.map((preset) => (
                  <div key={preset.id} className="preset-item-row">
                    <button
                      type="button"
                      className={`preset-item ${preset.id === activePresetId ? 'active' : ''}`}
                      onClick={() => onSelect(preset.id)}
                      title={preset.description ?? preset.id}
                    >
                      {preset.name}
                    </button>
                    {preset.origin === 'user' && onDeleteUserPreset ? (
                      <button
                        type="button"
                        className="preset-item-delete"
                        title="Delete custom preset"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (window.confirm(`Delete custom preset “${preset.name}”?`)) {
                            onDeleteUserPreset(preset.id)
                          }
                        }}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                ))}
              </details>
            ))}
          </details>
        ))}
      </div>
    </>
  )
}
