import { useEffect, useMemo, useState } from 'react'
import type { CatalogStats, PresetDefinition, QueueJob } from '../../../shared/types'
import { applyThemeMode } from '../theme'
import { ExportSettingsDialog } from './ExportSettingsDialog'
import { WindowControls } from './WindowControls'

interface CatalogPayload {
  presets: PresetDefinition[]
  grouped: Record<string, Record<string, PresetDefinition[]>>
  stats: CatalogStats
  defaultPresetId: string
}

function jobIdsFromUrl(): string[] {
  const raw = new URLSearchParams(window.location.search).get('jobs')
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Floating Export Settings BrowserWindow entry. */
export function ExportSettingsWindow() {
  const [jobs, setJobs] = useState<QueueJob[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>(() => jobIdsFromUrl())
  const [catalog, setCatalog] = useState<CatalogPayload | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void (async () => {
      const [queue, ui, cat, cfg] = await Promise.all([
        window.EncodeIt.listQueue(),
        window.EncodeIt.getUiState(),
        window.EncodeIt.getCatalog(),
        window.EncodeIt.getSettings()
      ])
      setJobs(queue)
      setCatalog(cat)
      applyThemeMode(cfg.themeMode)
      const fromUrl = jobIdsFromUrl()
      setSelectedIds(fromUrl.length ? fromUrl : ui.selectedJobIds)
      setReady(true)
    })()

    const offQueue = window.EncodeIt.onQueueChanged(setJobs)
    const offUi = window.EncodeIt.onUiChanged((ui) => {
      if (!jobIdsFromUrl().length) setSelectedIds(ui.selectedJobIds)
    })
    const offSettings = window.EncodeIt.onSettingsChanged((cfg) => {
      applyThemeMode(cfg.themeMode)
    })
    return () => {
      offQueue()
      offUi()
      offSettings()
    }
  }, [])

  const selectedJobs = useMemo(
    () => jobs.filter((j) => selectedIds.includes(j.id)),
    [jobs, selectedIds]
  )

  if (!ready || !catalog) {
    return (
      <div className="app floating-app export-settings-window-app">
        <div className="float-titlebar">
          <span className="float-titlebar-label">Export Settings</span>
          <WindowControls />
        </div>
        <div className="prefs-window-loading">Loading…</div>
      </div>
    )
  }

  if (!selectedJobs.length) {
    return (
      <div className="app floating-app export-settings-window-app">
        <div className="float-titlebar">
          <span className="float-titlebar-label">Export Settings</span>
          <WindowControls />
        </div>
        <div className="prefs-window-loading">Select one or more queue items first.</div>
      </div>
    )
  }

  return (
    <ExportSettingsDialog
      open
      presentation="window"
      jobs={selectedJobs}
      presets={catalog.presets}
      onClose={() => void window.EncodeIt.windowClose()}
      onApplied={setJobs}
      onCatalogUpdated={(next) => setCatalog(next as CatalogPayload)}
    />
  )
}
