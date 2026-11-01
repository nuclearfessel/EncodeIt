import { useEffect, useState } from 'react'
import type { CatalogStats, PresetDefinition, SettingsView } from '../../../shared/types'
import { applyThemeMode } from '../theme'
import { PreferencesDialog } from './PreferencesDialog'

interface CatalogPayload {
  presets: PresetDefinition[]
  grouped: Record<string, Record<string, PresetDefinition[]>>
  stats: CatalogStats
  defaultPresetId: string
}

/** Floating Preferences BrowserWindow entry. */
export function PreferencesWindow() {
  const [settings, setSettings] = useState<SettingsView | null>(null)
  const [catalog, setCatalog] = useState<CatalogPayload | null>(null)

  useEffect(() => {
    void (async () => {
      const [cfg, cat] = await Promise.all([
        window.EncodeIt.getSettings(),
        window.EncodeIt.getCatalog()
      ])
      setSettings(cfg)
      setCatalog(cat)
      applyThemeMode(cfg.themeMode)
    })()
    const off = window.EncodeIt.onSettingsChanged((next) => {
      setSettings(next)
      applyThemeMode(next.themeMode)
    })
    return () => {
      off()
    }
  }, [])

  useEffect(() => {
    if (!settings) return
    if (settings.themeMode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemeMode('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [settings?.themeMode])

  if (!settings || !catalog) {
    return (
      <div className="app floating-app prefs-window-app">
        <div className="float-titlebar">
          <span className="float-titlebar-label">Preferences</span>
        </div>
        <div className="prefs-window-loading">Loading…</div>
      </div>
    )
  }

  return (
    <PreferencesDialog
      open
      presentation="window"
      settings={settings}
      presets={catalog.presets}
      onClose={() => void window.EncodeIt.windowClose()}
      onSave={async (next) => {
        const saved = await window.EncodeIt.setSettings(next)
        setSettings(saved)
        return saved
      }}
    />
  )
}
