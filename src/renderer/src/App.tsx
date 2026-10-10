import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react'
import {
  PANEL_TITLES,
  defaultWorkspace,
  isPanelId,
  type PanelId,
  type WorkspaceState
} from '../../shared/panels'
import {
  resetSplitPair,
  resizeAtPath,
  type AnyDropTarget
} from '../../shared/workspaceLayout'
import type {
  AppSettings,
  CatalogStats,
  PresetDefinition,
  QueueJob,
  SettingsView
} from '../../shared/types'
import { DockDropOverlay } from './components/DockDropOverlay'
import { EncodingPanel } from './components/EncodingPanel'
import { PreferencesDialog } from './components/PreferencesDialog'
import { ButtonContent } from './components/ButtonContent'
import {
  Bin,
  PanelLeftOpen,
  PanelsTopLeft,
  Play,
  Plus,
  Square,
  X
} from './components/icons'
import { MediaBrowser } from './components/MediaBrowser'
import { PanelHeader } from './components/PanelHeader'
import { PresetBrowser } from './components/PresetBrowser'
import { QueueTable } from './components/QueueTable'
import { AppMenuBar } from './components/AppMenuBar'
import { WindowControls } from './components/WindowControls'
import { WorkspaceView } from './components/WorkspaceView'
import { usePathPicker } from './pathPicker/PathPickerContext'

interface CatalogPayload {
  presets: PresetDefinition[]
  grouped: Record<string, Record<string, PresetDefinition[]>>
  stats: CatalogStats
  defaultPresetId: string
}

function undockedFromUrl(): PanelId | null {
  const value = new URLSearchParams(window.location.search).get('undocked')
  return isPanelId(value) ? value : null
}

export default function App() {
  const floatingPanel = undockedFromUrl()
  const [catalog, setCatalog] = useState<CatalogPayload | null>(null)
  const [settings, setSettings] = useState<SettingsView | null>(null)
  const [jobs, setJobs] = useState<QueueJob[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [activePresetId, setActivePresetId] = useState<string>('')
  const [running, setRunning] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [workspace, setWorkspace] = useState<WorkspaceState>(() => defaultWorkspace())
  const [dragSession, setDragSession] = useState<{
    panelId: PanelId
    fromFloating: boolean
  } | null>(null)
  const [dropTarget, setDropTarget] = useState<AnyDropTarget | null>(null)
  const [prefsOpen, setPrefsOpen] = useState(false)
  const pathPicker = usePathPicker()

  useEffect(() => {
    void (async () => {
      const [cat, cfg, queue, ws, ui] = await Promise.all([
        window.encodeThis.getCatalog(),
        window.encodeThis.getSettings(),
        window.encodeThis.listQueue(),
        window.encodeThis.getWorkspace(),
        window.encodeThis.getUiState()
      ])
      setCatalog(cat)
      setSettings(cfg)
      setJobs(queue)
      setWorkspace(ws)
      setActivePresetId(ui.activePresetId || cat.defaultPresetId)
      setSelectedIds(ui.selectedJobIds)
    })()

    const offChange = window.encodeThis.onQueueChanged(setJobs)
    const offState = window.encodeThis.onQueueState((s) => setRunning(s.running))
    const offProgress = window.encodeThis.onQueueProgress(() => undefined)
    const offWs = window.encodeThis.onWorkspaceChanged(setWorkspace)
    const offDrag = window.encodeThis.onPanelDrag(({ session, target }) => {
      setDragSession(session)
      setDropTarget(target)
    })
    const offUi = window.encodeThis.onUiChanged((ui) => {
      setActivePresetId(ui.activePresetId)
      setSelectedIds(ui.selectedJobIds)
    })
    const offSettings = window.encodeThis.onSettingsChanged(setSettings)
    return () => {
      offChange()
      offState()
      offProgress()
      offWs()
      offDrag()
      offUi()
      offSettings()
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      if (typing) return

      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key === ',') {
        e.preventDefault()
        setPrefsOpen(true)
        return
      }
      if (mod && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        void addFiles()
        return
      }
      if (mod && e.key === 'Enter') {
        e.preventDefault()
        void window.encodeThis.startQueue()
        return
      }
      if (mod && e.key === '.') {
        e.preventDefault()
        void window.encodeThis.stopQueue()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const selectedJobs = useMemo(
    () => jobs.filter((j) => selectedIds.includes(j.id)),
    [jobs, selectedIds]
  )

  const activePreset = useMemo(
    () => catalog?.presets.find((p) => p.id === activePresetId),
    [catalog, activePresetId]
  )

  async function addFiles(paths?: string[]) {
    const files = paths ?? (await pathPicker.openFiles())
    if (!files.length) return
    await window.encodeThis.addToQueue(files, activePresetId || catalog?.defaultPresetId)
  }

  async function applyPreset(presetId: string) {
    setActivePresetId(presetId)
    await window.encodeThis.setActivePreset(presetId)
    if (selectedIds.length) {
      await window.encodeThis.setPreset(selectedIds, presetId)
    }
  }

  function selectJobs(ids: string[]) {
    setSelectedIds(ids)
    void window.encodeThis.setSelectedJobs(ids)
  }

  async function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const paths = [...e.dataTransfer.files]
      .map((f) => (f as File & { path?: string }).path)
      .filter((p): p is string => Boolean(p))
    if (paths.length) await addFiles(paths)
  }

  function renderPanel(id: PanelId): ReactNode {
    if (!catalog || !settings) return null
    if (id === 'media') {
      return <MediaBrowser onAddMedia={(paths) => void addFiles(paths)} />
    }
    if (id === 'presets') {
      return (
        <aside className="panel">
          <PanelHeader title="Preset Browser" panelId="presets" />
          <PresetBrowser
            grouped={catalog.grouped}
            activePresetId={activePresetId}
            onSelect={(pid) => void applyPreset(pid)}
          />
        </aside>
      )
    }
    if (id === 'queue') {
      return (
        <section className="queue-panel panel">
          <PanelHeader title="Queue" panelId="queue" />
          <QueueTable
            jobs={jobs}
            selectedIds={selectedIds}
            onSelect={selectJobs}
            presetName={(pid) => catalog.presets.find((p) => p.id === pid)?.name ?? pid}
            onAdd={() => void addFiles()}
          />
        </section>
      )
    }
    return (
      <EncodingPanel
        jobs={jobs}
        selectedJobs={selectedJobs}
        activePreset={activePreset}
        settings={settings}
        onSettings={async (next) => {
          setSettings(await window.encodeThis.setSettings(next))
        }}
      />
    )
  }

  if (!catalog || !settings) {
    return <div className="empty">Loading Encode This…</div>
  }

  if (floatingPanel) {
    return (
      <div className="app floating-app">
        <div className="float-titlebar">
          <span className="float-titlebar-label">{PANEL_TITLES[floatingPanel]}</span>
          <WindowControls />
        </div>
        <FloatingPanel
          panel={floatingPanel}
          catalog={catalog}
          settings={settings}
          jobs={jobs}
          selectedIds={selectedIds}
          activePresetId={activePresetId}
          activePreset={activePreset}
          selectedJobs={selectedJobs}
          onAddMedia={(paths) => void addFiles(paths)}
          onSelectJobs={selectJobs}
          onApplyPreset={(id) => void applyPreset(id)}
          onSettings={async (next) => setSettings(await window.encodeThis.setSettings(next))}
        />
      </div>
    )
  }

  const anyUndocked = Object.values(workspace.placement).some((v) => v === 'undocked')
  const closedPanels = (Object.keys(workspace.placement) as PanelId[]).filter(
    (id) => workspace.placement[id] === 'closed'
  )

  const canStart =
    jobs.some((j) => j.status === 'waiting' || j.status === 'error') && !running

  return (
    <div
      className={`app ame-shell ${dragOver ? 'drag-over' : ''} ${dragSession ? 'is-panel-dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => void onDrop(e)}
    >
      <div className="title-chrome">
        <span className="title-brand">Encode This</span>
        <AppMenuBar
          actions={{
            onAddSource: () => void addFiles(),
            onStartQueue: () => void window.encodeThis.startQueue(),
            onStopQueue: () => void window.encodeThis.stopQueue(),
            onClearDone: () => void window.encodeThis.clearDone(),
            onPreferences: () => setPrefsOpen(true),
            onDockAll: () => void window.encodeThis.dockAllPanels(),
            onShowAllPanels: () => void window.encodeThis.showAllPanels(),
            canStart,
            canStop: running
          }}
        />
        <div className="title-chrome-drag" />
        <WindowControls />
      </div>

      <header className="toolbar">
        <div className="toolbar-actions">
          <button type="button" className="btn-with-icon" onClick={() => void addFiles()}>
            <ButtonContent icon={Plus}>Add Source…</ButtonContent>
          </button>
          <button
            type="button"
            className="primary btn-with-icon"
            disabled={!canStart}
            onClick={() => void window.encodeThis.startQueue()}
          >
            <ButtonContent icon={Play}>Start Queue</ButtonContent>
          </button>
          <button
            type="button"
            className="btn-with-icon"
            disabled={!running}
            onClick={() => void window.encodeThis.stopQueue()}
          >
            <ButtonContent icon={Square}>Stop</ButtonContent>
          </button>
          <button
            type="button"
            className="btn-with-icon"
            disabled={!selectedIds.length}
            onClick={() =>
              void window.encodeThis.removeFromQueue(selectedIds).then(() => selectJobs([]))
            }
          >
            <ButtonContent icon={Bin}>Remove</ButtonContent>
          </button>
          <button
            type="button"
            className="btn-with-icon"
            onClick={() => void window.encodeThis.clearDone()}
          >
            <ButtonContent icon={X}>Clear Done</ButtonContent>
          </button>
          {anyUndocked ? (
            <button
              type="button"
              className="btn-with-icon"
              onClick={() => void window.encodeThis.dockAllPanels()}
            >
              <ButtonContent icon={PanelsTopLeft}>Dock All Panels</ButtonContent>
            </button>
          ) : null}
          {closedPanels.length ? (
            <>
              {closedPanels.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="btn-with-icon"
                  onClick={() => void window.encodeThis.dockPanel(id, 'right')}
                >
                  <ButtonContent icon={PanelLeftOpen}>Show {PANEL_TITLES[id]}</ButtonContent>
                </button>
              ))}
              <button
                type="button"
                className="btn-with-icon"
                onClick={() => void window.encodeThis.showAllPanels()}
              >
                <ButtonContent icon={PanelsTopLeft}>Show All Panels</ButtonContent>
              </button>
            </>
          ) : null}
          <button type="button" onClick={() => setPrefsOpen(true)}>
            Preferences…
          </button>
        </div>
        <div className="spacer" />
        <div className="stats">
          {catalog.stats.formats} formats · {catalog.stats.codecs} codecs · {catalog.stats.presets}{' '}
          presets
        </div>
      </header>

      <PreferencesDialog
        open={prefsOpen}
        settings={settings}
        onClose={() => setPrefsOpen(false)}
        onSave={async (next) => {
          const saved = await window.encodeThis.setSettings(next)
          setSettings(saved)
          return saved
        }}
      />

      <div className="ame-workspace">
        {workspace.root ? (
          <WorkspaceView
            root={workspace.root}
            renderPanel={renderPanel}
            onResize={(path, leftIndex, deltaPx, containerPx) => {
              setWorkspace((prev) => {
                if (!prev.root || !deltaPx || !containerPx) return prev
                const root = resizeAtPath(prev.root, path, leftIndex, deltaPx, containerPx)
                void window.encodeThis.setWorkspaceRoot(root)
                return { ...prev, root }
              })
            }}
            onResetSplit={(path, leftIndex) => {
              setWorkspace((prev) => {
                if (!prev.root) return prev
                const root = resetSplitPair(prev.root, path, leftIndex)
                void window.encodeThis.setWorkspaceRoot(root)
                return { ...prev, root }
              })
            }}
          />
        ) : (
          <div className="empty workspace-empty">
            <div>
              <strong>No docked panels</strong>
              <div>Drag a floating panel onto an edge, or use Show All Panels.</div>
            </div>
          </div>
        )}
        <DockDropOverlay
          active={Boolean(dragSession)}
          target={dropTarget}
          draggingId={dragSession?.panelId}
        />
      </div>
    </div>
  )
}

function FloatingPanel({
  panel,
  catalog,
  settings,
  jobs,
  selectedIds,
  activePresetId,
  activePreset,
  selectedJobs,
  onAddMedia,
  onSelectJobs,
  onApplyPreset,
  onSettings
}: {
  panel: PanelId
  catalog: CatalogPayload
  settings: SettingsView
  jobs: QueueJob[]
  selectedIds: string[]
  activePresetId: string
  activePreset?: PresetDefinition
  selectedJobs: QueueJob[]
  onAddMedia: (paths?: string[]) => void
  onSelectJobs: (ids: string[]) => void
  onApplyPreset: (id: string) => void
  onSettings: (next: AppSettings) => Promise<void>
}) {
  if (panel === 'media') {
    return <MediaBrowser onAddMedia={(paths) => onAddMedia(paths)} floating />
  }
  if (panel === 'presets') {
    return (
      <aside className="panel floating-fill">
        <PanelHeader title="Preset Browser" panelId="presets" floating />
        <PresetBrowser
          grouped={catalog.grouped}
          activePresetId={activePresetId}
          onSelect={onApplyPreset}
        />
      </aside>
    )
  }
  if (panel === 'queue') {
    return (
      <section className="queue-panel panel floating-fill">
        <PanelHeader title="Queue" panelId="queue" floating />
        <QueueTable
          jobs={jobs}
          selectedIds={selectedIds}
          onSelect={onSelectJobs}
          presetName={(id) => catalog.presets.find((p) => p.id === id)?.name ?? id}
          onAdd={() => onAddMedia()}
        />
      </section>
    )
  }
  return (
    <EncodingPanel
      jobs={jobs}
      selectedJobs={selectedJobs}
      activePreset={activePreset}
      settings={settings}
      onSettings={onSettings}
      floating
    />
  )
}
