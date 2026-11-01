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
import { AboutDialog } from './components/AboutDialog'
import { ExportSettingsWindow } from './components/ExportSettingsWindow'
import { HelpDocumentationWindow } from './components/HelpDocumentationWindow'
import { IntegrationCoachBanner } from './components/IntegrationCoachBanner'
import { IntegrationSetupDialog } from './components/IntegrationSetupDialog'
import { PreferencesWindow } from './components/PreferencesWindow'
import { version as APP_VERSION } from '../../../package.json'
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
import { SaveWorkspaceDialog } from './components/SaveWorkspaceDialog'
import { StatusBar, type UpdateBarStatus } from './components/StatusBar'
import { UninstallDialog } from './components/UninstallDialog'
import { WindowControls } from './components/WindowControls'
import { WorkspaceView } from './components/WorkspaceView'
import { usePathPicker } from './pathPicker/PathPickerContext'
import { applyThemeMode } from './theme'

interface WorkspaceCatalogView {
  activeId: string | null
  activeName: string | null
  named: Array<{ id: string; name: string; updatedAt: number }>
}

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

function isDocsWindow(): boolean {
  return new URLSearchParams(window.location.search).get('docs') === '1'
}

function isPrefsWindow(): boolean {
  return new URLSearchParams(window.location.search).get('prefs') === '1'
}

function isExportSettingsWindow(): boolean {
  return new URLSearchParams(window.location.search).get('exportSettings') === '1'
}

export default function App() {
  if (isDocsWindow()) {
    return <HelpDocumentationWindow />
  }
  if (isPrefsWindow()) {
    return <PreferencesWindow />
  }
  if (isExportSettingsWindow()) {
    return <ExportSettingsWindow />
  }
  return <MainApp />
}

function MainApp() {
  const floatingPanel = undockedFromUrl()
  const [catalog, setCatalog] = useState<CatalogPayload | null>(null)
  const [settings, setSettings] = useState<SettingsView | null>(null)
  const [jobs, setJobs] = useState<QueueJob[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [activePresetId, setActivePresetId] = useState<string>('')
  const [running, setRunning] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [workspace, setWorkspace] = useState<WorkspaceState>(() => defaultWorkspace())
  const [wsCatalog, setWsCatalog] = useState<WorkspaceCatalogView>({
    activeId: null,
    activeName: null,
    named: []
  })
  const [saveWorkspaceOpen, setSaveWorkspaceOpen] = useState(false)
  const [uninstallOpen, setUninstallOpen] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<UpdateBarStatus | null>(null)
  const [dragSession, setDragSession] = useState<{
    panelId: PanelId
    fromFloating: boolean
  } | null>(null)
  const [dropTarget, setDropTarget] = useState<AnyDropTarget | null>(null)
  const [aboutOpen, setAboutOpen] = useState(false)
  const pathPicker = usePathPicker()

  function applyCatalog(next: {
    current: WorkspaceState
    activeId: string | null
    activeName: string | null
    named: Array<{ id: string; name: string; updatedAt: number }>
  }) {
    setWorkspace(next.current)
    setWsCatalog({
      activeId: next.activeId,
      activeName: next.activeName,
      named: next.named
    })
  }

  function openExportSettings(ids?: string[]) {
    const jobIds = ids?.length ? ids : selectedIds
    if (!jobIds.length) return
    if (ids?.length) selectJobs(ids)
    void window.EncodeIt.openExportSettings(jobIds)
  }

  function openPreferences() {
    void window.EncodeIt.openPreferences()
  }

  useEffect(() => {
    void (async () => {
      const [cat, cfg, queue, ws, ui, wsc] = await Promise.all([
        window.EncodeIt.getCatalog(),
        window.EncodeIt.getSettings(),
        window.EncodeIt.listQueue(),
        window.EncodeIt.getWorkspace(),
        window.EncodeIt.getUiState(),
        window.EncodeIt.getWorkspaceCatalog()
      ])
      setCatalog(cat)
      setSettings(cfg)
      applyThemeMode(cfg.themeMode)
      setJobs(queue)
      setWorkspace(ws)
      applyCatalog(wsc)
      setActivePresetId(ui.activePresetId || cat.defaultPresetId)
      setSelectedIds(ui.selectedJobIds)
    })()

    const offChange = window.EncodeIt.onQueueChanged(setJobs)
    const offState = window.EncodeIt.onQueueState((s) => setRunning(s.running))
    const offProgress = window.EncodeIt.onQueueProgress(() => undefined)
    const offWs = window.EncodeIt.onWorkspaceChanged(setWorkspace)
    const offWsCat = window.EncodeIt.onWorkspaceCatalog(applyCatalog)
    const offDrag = window.EncodeIt.onPanelDrag(({ session, target }) => {
      setDragSession(session)
      setDropTarget(target)
    })
    const offUi = window.EncodeIt.onUiChanged((ui) => {
      setActivePresetId(ui.activePresetId)
      setSelectedIds(ui.selectedJobIds)
    })
    const offSettings = window.EncodeIt.onSettingsChanged((next) => {
      setSettings(next)
      applyThemeMode(next.themeMode)
    })
    const offUpdate = window.EncodeIt.onUpdateStatus((s) => {
      setUpdateStatus({
        currentVersion: s.currentVersion,
        latestVersion: s.latestVersion,
        updateAvailable: s.updateAvailable
      })
    })
    void window.EncodeIt.getUpdateStatus().then((s) => {
      setUpdateStatus({
        currentVersion: s.currentVersion,
        latestVersion: s.latestVersion,
        updateAvailable: s.updateAvailable
      })
    })
    return () => {
      offChange()
      offState()
      offProgress()
      offWs()
      offWsCat()
      offDrag()
      offUi()
      offSettings()
      offUpdate()
    }
  }, [])

  useEffect(() => {
    if (!settings) return
    applyThemeMode(settings.themeMode)
    if (settings.themeMode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemeMode('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [settings?.themeMode])

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
      if (e.key === 'F1') {
        e.preventDefault()
        void window.EncodeIt.openDocumentation()
        return
      }
      if (mod && e.key === ',') {
        e.preventDefault()
        openPreferences()
        return
      }
      if (mod && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        void addFiles()
        return
      }
      if (mod && e.key === 'Enter') {
        e.preventDefault()
        void window.EncodeIt.startQueue()
        return
      }
      if (mod && e.key === '.') {
        e.preventDefault()
        void window.EncodeIt.stopQueue()
        return
      }
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        if (!jobs.length) return
        const ids = jobs.map((j) => j.id)
        setSelectedIds(ids)
        void window.EncodeIt.setSelectedJobs(ids)
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!selectedIds.length) return
        e.preventDefault()
        void window.EncodeIt.removeFromQueue(selectedIds).then(() => {
          setSelectedIds([])
          void window.EncodeIt.setSelectedJobs([])
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [jobs, selectedIds])

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
    await window.EncodeIt.addToQueue(files, activePresetId || catalog?.defaultPresetId)
  }

  async function applyPreset(presetId: string) {
    setActivePresetId(presetId)
    await window.EncodeIt.setActivePreset(presetId)
    if (selectedIds.length) {
      await window.EncodeIt.setPreset(selectedIds, presetId)
    }
  }

  async function deleteUserPreset(id: string) {
    const result = await window.EncodeIt.deleteUserPreset(id)
    if (result.catalog) setCatalog(result.catalog as CatalogPayload)
    if (activePresetId === id && result.catalog) {
      const nextId = (result.catalog as CatalogPayload).defaultPresetId
      setActivePresetId(nextId)
      await window.EncodeIt.setActivePreset(nextId)
    }
  }

  function selectJobs(ids: string[]) {
    setSelectedIds(ids)
    void window.EncodeIt.setSelectedJobs(ids)
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
            onDeleteUserPreset={(id) => void deleteUserPreset(id)}
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
            presets={catalog.presets}
            onAdd={() => void addFiles()}
            onOpenExportSettings={openExportSettings}
            onRemove={(ids) => {
              void window.EncodeIt.removeFromQueue(ids).then(() => selectJobs([]))
            }}
            onDuplicate={(ids) => {
              void window.EncodeIt.duplicateInQueue(ids).then((next) => {
                setJobs(next)
                const created = next
                  .filter((j) => !jobs.some((o) => o.id === j.id))
                  .map((j) => j.id)
                if (created.length) selectJobs(created)
              })
            }}
          />
        </section>
      )
    }
    return (
      <EncodingPanel
        jobs={jobs}
        selectedJobs={selectedJobs}
        presets={catalog.presets}
        activePreset={activePreset}
        settings={settings}
        onOpenExportSettings={() => openExportSettings()}
        onSettings={async (next) => {
          setSettings(await window.EncodeIt.setSettings(next))
        }}
      />
    )
  }

  if (!catalog || !settings) {
    return <div className="empty">Loading EncodeIt…</div>
  }

  if (floatingPanel) {
    if (!catalog || !settings) {
      return <div className="empty">Loading EncodeIt…</div>
    }
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
          onDeleteUserPreset={(id) => void deleteUserPreset(id)}
          onOpenExportSettings={openExportSettings}
          onSettings={async (next) => setSettings(await window.EncodeIt.setSettings(next))}
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
        <div className="title-chrome-leading">
          <span className="title-brand">EncodeIt</span>
          <AppMenuBar
            actions={{
              onAddSource: () => void addFiles(),
              onStartQueue: () => void window.EncodeIt.startQueue(),
              onStopQueue: () => void window.EncodeIt.stopQueue(),
              onClearDone: () => void window.EncodeIt.clearDone(),
              onPreferences: () => openPreferences(),
              onExportSettings: () => openExportSettings(),
              canExportSettings: selectedJobs.some((j) => j.status !== 'encoding'),
              onDockAll: () => void window.EncodeIt.dockAllPanels(),
              onShowAllPanels: () => void window.EncodeIt.showAllPanels(),
              onTogglePanel: (id) => void window.EncodeIt.togglePanel(id),
              panelPlacement: workspace.placement,
              workspace: {
                activeId: wsCatalog.activeId,
                activeName: wsCatalog.activeName,
                named: wsCatalog.named.map(({ id, name }) => ({ id, name }))
              },
              onNewWorkspace: () => setSaveWorkspaceOpen(true),
              onSaveWorkspace: () => {
                void window.EncodeIt.saveActiveWorkspace().then(applyCatalog)
              },
              onSwitchWorkspace: (id) => {
                void window.EncodeIt.switchWorkspace(id).then(applyCatalog)
              },
              onResetWorkspaceSaved: () => {
                void window.EncodeIt.resetWorkspaceSaved().then(applyCatalog)
              },
              onResetWorkspaceDefault: () => {
                void window.EncodeIt.resetWorkspaceDefault().then(applyCatalog)
              },
              onDeleteWorkspace: (id) => {
                const name =
                  wsCatalog.named.find((n) => n.id === id)?.name ??
                  wsCatalog.activeName ??
                  'Workspace'
                if (!window.confirm(`Delete workspace “${name}”? This cannot be undone.`)) return
                void window.EncodeIt.deleteWorkspace(id).then(applyCatalog)
              },
              onDocumentation: () => void window.EncodeIt.openDocumentation(),
              onAbout: () => setAboutOpen(true),
              onOpenLog: () => void window.EncodeIt.openLogFile(),
              onCheckForUpdates: () => {
                void window.EncodeIt.checkForUpdates(true).then((s) => {
                  setUpdateStatus({
                    currentVersion: s.currentVersion,
                    latestVersion: s.latestVersion,
                    updateAvailable: s.updateAvailable
                  })
                  if (s.updateAvailable && s.latestVersion) {
                    window.alert(
                      `EncodeIt ${s.latestVersion} is available (you have ${s.currentVersion}).\n\nUse Download… in the status bar at the bottom to open the release in your browser.`
                    )
                  } else if (s.error) {
                    window.alert(`Could not check for updates:\n${s.error}`)
                  } else {
                    window.alert(`You’re up to date (EncodeIt ${s.currentVersion}).`)
                  }
                })
              },
              onUninstall: () => setUninstallOpen(true),
              canStart,
              canStop: running
            }}
          />
          <div className="title-chrome-drag" />
        </div>
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
            onClick={() => void window.EncodeIt.startQueue()}
          >
            <ButtonContent icon={Play}>Start Queue</ButtonContent>
          </button>
          <button
            type="button"
            className="btn-with-icon"
            disabled={!running}
            onClick={() => void window.EncodeIt.stopQueue()}
          >
            <ButtonContent icon={Square}>Stop</ButtonContent>
          </button>
          <button
            type="button"
            className="btn-with-icon"
            disabled={!selectedIds.length}
            onClick={() =>
              void window.EncodeIt.removeFromQueue(selectedIds).then(() => selectJobs([]))
            }
          >
            <ButtonContent icon={Bin}>Remove</ButtonContent>
          </button>
          <button
            type="button"
            className="btn-with-icon"
            onClick={() => void window.EncodeIt.clearDone()}
          >
            <ButtonContent icon={X}>Clear Done</ButtonContent>
          </button>
          {anyUndocked ? (
            <button
              type="button"
              className="btn-with-icon"
              onClick={() => void window.EncodeIt.dockAllPanels()}
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
                  onClick={() => void window.EncodeIt.dockPanel(id, 'right')}
                >
                  <ButtonContent icon={PanelLeftOpen}>Show {PANEL_TITLES[id]}</ButtonContent>
                </button>
              ))}
              <button
                type="button"
                className="btn-with-icon"
                onClick={() => void window.EncodeIt.showAllPanels()}
              >
                <ButtonContent icon={PanelsTopLeft}>Show All Panels</ButtonContent>
              </button>
            </>
          ) : null}
          <button type="button" onClick={() => openPreferences()}>
            Preferences…
          </button>
        </div>
        <div className="spacer" />
        <label className="ws-switcher">
          <span className="ws-switcher-label">Workspace</span>
          <select
            value={wsCatalog.activeId ?? ''}
            title="Switch workspace"
            onChange={(e) => {
              const value = e.target.value
              void window.EncodeIt.switchWorkspace(value || null).then(applyCatalog)
            }}
          >
            <option value="">Default</option>
            {wsCatalog.named.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        </label>
        <div className="stats">
          {catalog.stats.formats} formats · {catalog.stats.codecs} codecs · {catalog.stats.presets}{' '}
          presets
        </div>
      </header>

      <AboutDialog
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        version={APP_VERSION}
        ffmpegPath={settings.ffmpegPath}
        ffmpegSource={settings.ffmpegSource}
      />

      <SaveWorkspaceDialog
        open={saveWorkspaceOpen}
        onClose={() => setSaveWorkspaceOpen(false)}
        onSave={async (name) => {
          applyCatalog(await window.EncodeIt.saveWorkspaceAs(name))
        }}
      />

      <UninstallDialog open={uninstallOpen} onClose={() => setUninstallOpen(false)} />

      {!floatingPanel ? (
        <IntegrationSetupDialog
          open={Boolean(settings.needsIntegrationSetup)}
          presence={settings.hostAppPresence}
          onComplete={(saved) => setSettings(saved)}
        />
      ) : null}

      {!floatingPanel ? (
        <IntegrationCoachBanner
          open={Boolean(settings.showIntegrationCoach) && !settings.needsIntegrationSetup}
          hostFolders={settings.hostFolders}
          coachHosts={settings.integrationCoachHosts}
          onDismiss={() => {
            void window.EncodeIt.dismissIntegrationCoach().then(setSettings)
          }}
        />
      ) : null}

      <div className="app-workspace">
        {workspace.root ? (
          <WorkspaceView
            root={workspace.root}
            renderPanel={renderPanel}
            onResize={(path, leftIndex, deltaPx, containerPx) => {
              setWorkspace((prev) => {
                if (!prev.root || !deltaPx || !containerPx) return prev
                const root = resizeAtPath(prev.root, path, leftIndex, deltaPx, containerPx)
                void window.EncodeIt.setWorkspaceRoot(root)
                return { ...prev, root }
              })
            }}
            onResetSplit={(path, leftIndex) => {
              setWorkspace((prev) => {
                if (!prev.root) return prev
                const root = resetSplitPair(prev.root, path, leftIndex)
                void window.EncodeIt.setWorkspaceRoot(root)
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

      <StatusBar
        status={updateStatus}
        fallbackVersion={APP_VERSION}
        onDownload={() => void window.EncodeIt.openUpdateDownload()}
        onDismiss={() => {
          void window.EncodeIt.dismissUpdate().then((s) => {
            setUpdateStatus({
              currentVersion: s.currentVersion,
              latestVersion: s.latestVersion,
              updateAvailable: s.updateAvailable
            })
          })
        }}
      />
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
  onDeleteUserPreset,
  onOpenExportSettings,
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
  onDeleteUserPreset: (id: string) => void
  onOpenExportSettings: (ids?: string[]) => void
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
          onDeleteUserPreset={onDeleteUserPreset}
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
          presets={catalog.presets}
          onAdd={() => onAddMedia()}
          onOpenExportSettings={onOpenExportSettings}
          onRemove={(ids) => {
            void window.EncodeIt.removeFromQueue(ids).then(() => onSelectJobs([]))
          }}
          onDuplicate={(ids) => {
            void window.EncodeIt.duplicateInQueue(ids).then((next) => {
              // Floating panel: parent owns jobs via queue:changed; select new copies by diffing ids.
              const before = new Set(jobs.map((j) => j.id))
              const created = next.filter((j) => !before.has(j.id)).map((j) => j.id)
              if (created.length) onSelectJobs(created)
            })
          }}
        />
      </section>
    )
  }
  return (
    <EncodingPanel
      jobs={jobs}
      selectedJobs={selectedJobs}
      presets={catalog.presets}
      activePreset={activePreset}
      settings={settings}
      onSettings={onSettings}
      onOpenExportSettings={() => onOpenExportSettings()}
      floating
    />
  )
}
