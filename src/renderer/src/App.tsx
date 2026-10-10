import { useEffect, useMemo, useState, type DragEvent } from 'react'
import type {
  AppSettings,
  CatalogStats,
  PresetDefinition,
  QueueJob,
  WatchFolder
} from '../../shared/types'
import { PresetBrowser } from './components/PresetBrowser'
import { QueueTable } from './components/QueueTable'
import { FooterPanels } from './components/FooterPanels'

interface CatalogPayload {
  presets: PresetDefinition[]
  grouped: Record<string, Record<string, PresetDefinition[]>>
  stats: CatalogStats
  defaultPresetId: string
}

export default function App() {
  const [catalog, setCatalog] = useState<CatalogPayload | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [jobs, setJobs] = useState<QueueJob[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [activePresetId, setActivePresetId] = useState<string>('')
  const [running, setRunning] = useState(false)
  const [watchFolders, setWatchFolders] = useState<WatchFolder[]>([])
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    void (async () => {
      const [cat, cfg, queue, watches] = await Promise.all([
        window.encodeThis.getCatalog(),
        window.encodeThis.getSettings(),
        window.encodeThis.listQueue(),
        window.encodeThis.listWatchFolders()
      ])
      setCatalog(cat)
      setSettings(cfg)
      setJobs(queue)
      setWatchFolders(watches)
      setActivePresetId(cat.defaultPresetId)
    })()

    const offChange = window.encodeThis.onQueueChanged(setJobs)
    const offState = window.encodeThis.onQueueState((s) => setRunning(s.running))
    const offProgress = window.encodeThis.onQueueProgress(() => {
      /* queue:changed also fires */
    })
    return () => {
      offChange()
      offState()
      offProgress()
    }
  }, [])

  const selectedJobs = useMemo(
    () => jobs.filter((j) => selectedIds.includes(j.id)),
    [jobs, selectedIds]
  )

  const activePreset = useMemo(
    () => catalog?.presets.find((p) => p.id === activePresetId),
    [catalog, activePresetId]
  )

  async function addFiles(paths?: string[]) {
    const files = paths ?? (await window.encodeThis.openFiles())
    if (!files.length) return
    await window.encodeThis.addToQueue(files, activePresetId || catalog?.defaultPresetId)
  }

  async function applyPreset(presetId: string) {
    setActivePresetId(presetId)
    if (selectedIds.length) {
      await window.encodeThis.setPreset(selectedIds, presetId)
    }
  }

  async function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const paths = [...e.dataTransfer.files]
      .map((f) => (f as File & { path?: string }).path)
      .filter((p): p is string => Boolean(p))
    if (paths.length) await addFiles(paths)
  }

  if (!catalog || !settings) {
    return <div className="empty">Loading Encode This…</div>
  }

  return (
    <div
      className={`app ${dragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => void onDrop(e)}
    >
      <header className="toolbar">
        <div className="brand">
          <strong>Encode This</strong>
          <span>Open batch media encoder</span>
        </div>
        <button type="button" onClick={() => void addFiles()}>
          Add Source…
        </button>
        <button
          type="button"
          className="primary"
          disabled={!jobs.some((j) => j.status === 'waiting' || j.status === 'error') || running}
          onClick={() => void window.encodeThis.startQueue()}
        >
          Start Queue
        </button>
        <button type="button" disabled={!running} onClick={() => void window.encodeThis.stopQueue()}>
          Stop
        </button>
        <button
          type="button"
          disabled={!selectedIds.length}
          onClick={() => void window.encodeThis.removeFromQueue(selectedIds).then(() => setSelectedIds([]))}
        >
          Remove
        </button>
        <button type="button" onClick={() => void window.encodeThis.clearDone()}>
          Clear Done
        </button>
        <button type="button" className="danger" onClick={() => void window.encodeThis.clearAll()}>
          Clear All
        </button>
        <div className="spacer" />
        <div className="stats">
          {catalog.stats.formats} formats · {catalog.stats.codecs} codecs · {catalog.stats.presets}{' '}
          presets
        </div>
      </header>

      <div className="workspace">
        <aside className="panel">
          <div className="panel-header">Preset Browser</div>
          <PresetBrowser
            grouped={catalog.grouped}
            activePresetId={activePresetId}
            onSelect={(id) => void applyPreset(id)}
          />
        </aside>

        <section className="queue-panel">
          <div className="panel-header">Encoding Queue</div>
          <QueueTable
            jobs={jobs}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
            presetName={(id) => catalog.presets.find((p) => p.id === id)?.name ?? id}
            onAdd={() => void addFiles()}
          />
        </section>
      </div>

      <FooterPanels
        settings={settings}
        onSettings={async (next) => {
          const saved = await window.encodeThis.setSettings(next)
          setSettings(saved)
        }}
        selectedJobs={selectedJobs}
        activePreset={activePreset}
        watchFolders={watchFolders}
        onRefreshWatch={async () => setWatchFolders(await window.encodeThis.listWatchFolders())}
        defaultPresetId={activePresetId}
      />
    </div>
  )
}
