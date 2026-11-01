import { useEffect, useMemo, useState } from 'react'
import {
  hardwareLabel,
  hardwareOptions,
  resolveHardwareAcceleration,
  type HardwareCapabilities
} from '../../../shared/hardware'
import { DEFAULT_PRESET_ID, PRESETS } from '../../../shared/presets'
import type { AppSettings, PresetDefinition, SettingsView, WatchFolder } from '../../../shared/types'
import { usePathPicker } from '../pathPicker/PathPickerContext'
import { applyThemeMode } from '../theme'
import { NumberStepper } from './NumberStepper'
import { WindowControls } from './WindowControls'

interface Props {
  open: boolean
  settings: SettingsView
  presets?: PresetDefinition[]
  onClose: () => void
  onSave: (next: AppSettings) => Promise<SettingsView>
  /** Floating BrowserWindow chrome instead of modal overlay. */
  presentation?: 'modal' | 'window'
}

type PrefsTab = 'general' | 'media' | 'hardware' | 'integrations' | 'updates'

function settingsDraft(settings: SettingsView): AppSettings {
  return {
    ffmpegPath: settings.ffmpegPath,
    ffprobePath: settings.ffprobePath,
    outputDirectory: settings.outputDirectory,
    maxConcurrent: settings.maxConcurrent,
    overwriteOutput: settings.overwriteOutput,
    hardwareAcceleration: settings.hardwareAcceleration,
    intakeEnabled: settings.intakeEnabled,
    intakePort: settings.intakePort,
    watchFolders: settings.watchFolders ?? [],
    hostFoldersSeeded: Boolean(settings.hostFoldersSeeded),
    checkForUpdatesEnabled: settings.checkForUpdatesEnabled !== false,
    themeMode: settings.themeMode ?? 'system'
  }
}

export function PreferencesDialog({
  open,
  settings,
  presets,
  onClose,
  onSave,
  presentation = 'modal'
}: Props) {
  const asWindow = presentation === 'window'
  const presetList = presets?.length ? presets : PRESETS
  const [tab, setTab] = useState<PrefsTab>('general')
  const [draft, setDraft] = useState<AppSettings>(() => settingsDraft(settings))
  const [caps, setCaps] = useState<HardwareCapabilities | null>(null)
  const [probing, setProbing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [intakeStatus, setIntakeStatus] = useState<{
    enabled: boolean
    port: number
    address: string | null
    inboxDir: string
    error: string | null
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedPath, setCopiedPath] = useState<string | null>(null)
  const [watchFolders, setWatchFolders] = useState<WatchFolder[]>([])
  const [newWatchPreset, setNewWatchPreset] = useState(DEFAULT_PRESET_ID)
  const [newWatchOutput, setNewWatchOutput] = useState('')
  const [updateMsg, setUpdateMsg] = useState<string | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const pathPicker = usePathPicker()

  // Reset the form when the dialog opens — not on every settings broadcast (Appearance
  // persists immediately and would wipe in-progress edits if we keyed off `settings`).
  useEffect(() => {
    if (!open) return
    setDraft(settingsDraft(settings))
    setTab('general')
    setError(null)
    setCopied(false)
    setUpdateMsg(null)
    setNewWatchPreset(DEFAULT_PRESET_ID)
    setNewWatchOutput(settings.outputDirectory || '')
    setProbing(true)
    void window.EncodeIt
      .detectHardware()
      .then(setCaps)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setProbing(false))
    void window.EncodeIt
      .getIntakeStatus()
      .then(setIntakeStatus)
      .catch(() => setIntakeStatus(null))
    void window.EncodeIt
      .listWatchFolders()
      .then(setWatchFolders)
      .catch(() => setWatchFolders([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-init when opened
  }, [open])

  // Keep draft Appearance aligned if theme changes from another window.
  useEffect(() => {
    if (!open) return
    setDraft((d) => (d.themeMode === settings.themeMode ? d : { ...d, themeMode: settings.themeMode }))
  }, [open, settings.themeMode])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Keep this window's tokens in sync with draft Appearance (all windows follow via setThemeMode).
  useEffect(() => {
    if (!open) return
    applyThemeMode(draft.themeMode)
  }, [open, draft.themeMode])

  const options = useMemo(
    () =>
      hardwareOptions(
        caps ?? {
          platform: 'unknown',
          ffmpegPath: draft.ffmpegPath,
          nvenc: false,
          qsv: false,
          amf: false,
          videotoolbox: false,
          encoders: [],
          probedAt: 0
        }
      ),
    [caps, draft.ffmpegPath]
  )
  const resolved = useMemo(
    () => (caps ? resolveHardwareAcceleration(draft.hardwareAcceleration, caps) : 'none'),
    [caps, draft.hardwareAcceleration]
  )

  async function pickOutput() {
    const dir = await pathPicker.openDirectory(draft.outputDirectory)
    if (dir) setDraft((d) => ({ ...d, outputDirectory: dir }))
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await onSave(draft)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  async function refreshHardware() {
    setProbing(true)
    setError(null)
    try {
      setCaps(await window.EncodeIt.detectHardware(true))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setProbing(false)
    }
  }

  async function addWatchFolder() {
    setError(null)
    const folder = await pathPicker.openDirectory()
    if (!folder) return
    try {
      const created = await window.EncodeIt.addWatchFolder(
        folder,
        newWatchPreset || DEFAULT_PRESET_ID,
        newWatchOutput || draft.outputDirectory
      )
      setWatchFolders(await window.EncodeIt.listWatchFolders())
      void created
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function pickWatchEncodeOutput() {
    const dir = await pathPicker.openDirectory(newWatchOutput || draft.outputDirectory)
    if (dir) setNewWatchOutput(dir)
  }

  if (!open) return null

  const dialogBody = (
      <div
        className={`prefs-dialog ${asWindow ? 'prefs-dialog-window' : ''}`}
        role="dialog"
        aria-modal={asWindow ? undefined : true}
        aria-labelledby="prefs-title"
        onMouseDown={asWindow ? undefined : (e) => e.stopPropagation()}
      >
        {asWindow ? (
          <h2 id="prefs-title" className="sr-only">
            Preferences
          </h2>
        ) : (
          <header className="prefs-header">
            <h2 id="prefs-title">Preferences</h2>
            <button type="button" className="icon-btn" title="Close" onClick={onClose}>
              ×
            </button>
          </header>
        )}

        <div className="prefs-body">
          <nav className="prefs-nav" aria-label="Preference sections">
            {(
              [
                ['general', 'General'],
                ['media', 'Media'],
                ['hardware', 'Hardware'],
                ['integrations', 'Integrations'],
                ['updates', 'Updates']
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={tab === id ? 'active' : ''}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="prefs-panel">
            {tab === 'general' ? (
              <div className="prefs-section">
                <h3>General</h3>
                <div className="prefs-field">
                  <span>Appearance</span>
                  <div
                    className="prefs-segmented"
                    role="radiogroup"
                    aria-label="Appearance"
                  >
                    {(
                      [
                        ['system', 'System'],
                        ['light', 'Light'],
                        ['dark', 'Dark']
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={draft.themeMode === value}
                        className={draft.themeMode === value ? 'active' : ''}
                        onClick={() => {
                          setDraft((d) => ({ ...d, themeMode: value }))
                          void window.EncodeIt.setThemeMode(value)
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="prefs-help">
                  System follows your OS light/dark setting. Light and Dark lock EncodeIt’s theme.
                </p>
                <label className="prefs-field">
                  <span>Default output folder</span>
                  <div className="prefs-row">
                    <input value={draft.outputDirectory} readOnly />
                    <button type="button" onClick={() => void pickOutput()}>
                      Browse…
                    </button>
                  </div>
                </label>
                <label className="prefs-field">
                  <span>Max concurrent encodes</span>
                  <NumberStepper
                    min={1}
                    max={8}
                    step={1}
                    value={draft.maxConcurrent}
                    onValueChange={(n) => setDraft((d) => ({ ...d, maxConcurrent: n }))}
                  />
                </label>
                <label className="prefs-check">
                  <input
                    type="checkbox"
                    checked={draft.overwriteOutput}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, overwriteOutput: e.target.checked }))
                    }
                  />
                  Overwrite existing output files
                </label>
              </div>
            ) : null}

            {tab === 'media' ? (
              <div className="prefs-section">
                <h3>Media / FFmpeg</h3>
                <p className="prefs-help">
                  Source:{' '}
                  <strong>
                    {settings.ffmpegSource === 'bundled'
                      ? 'Bundled'
                      : settings.ffmpegSource === 'custom'
                        ? 'Custom path'
                        : 'System PATH'}
                  </strong>
                  {settings.ffmpegBundled ? ' · bundled binary available' : ''}
                </p>
                <label className="prefs-field">
                  <span>FFmpeg path</span>
                  <input
                    value={draft.ffmpegPath}
                    onChange={(e) => setDraft((d) => ({ ...d, ffmpegPath: e.target.value }))}
                  />
                </label>
                <label className="prefs-field">
                  <span>FFprobe path</span>
                  <input
                    value={draft.ffprobePath}
                    onChange={(e) => setDraft((d) => ({ ...d, ffprobePath: e.target.value }))}
                  />
                </label>
              </div>
            ) : null}

            {tab === 'hardware' ? (
              <div className="prefs-section">
                <h3>Hardware acceleration</h3>
                <p className="prefs-help">
                  Detected for this machine via FFmpeg. Unavailable encoders stay disabled.
                </p>
                <div className="prefs-row" style={{ marginBottom: '0.65rem' }}>
                  <button type="button" disabled={probing} onClick={() => void refreshHardware()}>
                    {probing ? 'Detecting…' : 'Re-detect GPU encoders'}
                  </button>
                  {caps ? (
                    <span className="prefs-muted">
                      Active when encoding: <strong>{hardwareLabel(resolved)}</strong>
                    </span>
                  ) : null}
                </div>
                <label className="prefs-field">
                  <span>Default encoder acceleration</span>
                  <select
                    value={draft.hardwareAcceleration}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        hardwareAcceleration: e.target
                          .value as AppSettings['hardwareAcceleration']
                      }))
                    }
                  >
                    {options.map((opt) => (
                      <option key={opt.id} value={opt.id} disabled={!opt.available}>
                        {opt.label}
                        {!opt.available ? ' — unavailable' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <ul className="prefs-hw-list">
                  {options
                    .filter((o) => o.id !== 'auto' && o.id !== 'none')
                    .map((opt) => (
                      <li key={opt.id} className={opt.available ? 'ok' : 'miss'}>
                        <strong>{opt.label}</strong>
                        <span>{opt.description}</span>
                      </li>
                    ))}
                </ul>
                {caps?.encoders.length ? (
                  <p className="prefs-muted">
                    FFmpeg encoders: {caps.encoders.join(', ')}
                  </p>
                ) : null}
              </div>
            ) : null}

            {tab === 'integrations' ? (
              <div className="prefs-section">
                <h3>Watch folders (AE / Premiere / Resolve)</h3>
                <p className="prefs-help">
                  Install / first launch creates shared folders under your Videos (Windows) or Movies
                  (macOS) library. Point After Effects, Premiere Pro, or DaVinci Resolve at those
                  folders — no host scripts needed. New media is queued with the chosen preset; files
                  already present when a watch is added or enabled are ignored until the file size
                  settles.
                </p>
                {settings.hostFolders ? (
                  <div className="prefs-host-folders">
                    <p className="prefs-muted">Install layout:</p>
                    <ul className="prefs-host-folder-list">
                      {(
                        [
                          ['After Effects', settings.hostFolders.fromAe],
                          ['DaVinci Resolve', settings.hostFolders.fromResolve],
                          ['Premiere Pro', settings.hostFolders.fromPremiere],
                          ['Encode output', settings.hostFolders.output]
                        ] as const
                      ).map(([label, folderPath]) => (
                        <li key={label}>
                          <strong>{label}</strong>
                          <code>{folderPath}</code>
                          <span className="prefs-host-folder-actions">
                            <button
                              type="button"
                              className="linkish"
                              onClick={() => void window.EncodeIt.openPath(folderPath)}
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              className="linkish"
                              onClick={() => {
                                void navigator.clipboard.writeText(folderPath).then(() => {
                                  setCopiedPath(folderPath)
                                  window.setTimeout(() => setCopiedPath(null), 1200)
                                })
                              }}
                            >
                              {copiedPath === folderPath ? 'Copied' : 'Copy'}
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <label className="prefs-field">
                  <span>Preset for new watches</span>
                  <select
                    value={newWatchPreset}
                    onChange={(e) => setNewWatchPreset(e.target.value)}
                  >
                    {presetList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.group} / {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="prefs-field">
                  <span>Encode output folder (for new watches)</span>
                  <div className="prefs-row">
                    <input
                      value={newWatchOutput}
                      readOnly
                      placeholder={draft.outputDirectory || 'Default output'}
                    />
                    <button type="button" onClick={() => void pickWatchEncodeOutput()}>
                      Browse…
                    </button>
                  </div>
                </label>
                <div className="prefs-row prefs-watch-actions">
                  <button type="button" className="primary" onClick={() => void addWatchFolder()}>
                    Add watch folder…
                  </button>
                </div>
                {watchFolders.length === 0 ? (
                  <p className="prefs-muted">No watch folders yet.</p>
                ) : (
                  <ul className="prefs-watch-list">
                    {watchFolders.map((wf) => (
                      <li key={wf.id}>
                        <label className="prefs-check prefs-watch-enable">
                          <input
                            type="checkbox"
                            checked={wf.enabled}
                            onChange={(e) => {
                              void window.EncodeIt
                                .setWatchEnabled(wf.id, e.target.checked)
                                .then(setWatchFolders)
                            }}
                          />
                          Enabled
                        </label>
                        <label className="prefs-check prefs-watch-enable">
                          <input
                            type="checkbox"
                            checked={wf.autoStart !== false}
                            onChange={(e) => {
                              void window.EncodeIt
                                .updateWatchFolder(wf.id, { autoStart: e.target.checked })
                                .then(setWatchFolders)
                            }}
                          />
                          Auto-start queue
                        </label>
                        <label className="prefs-check prefs-watch-enable">
                          <input
                            type="checkbox"
                            checked={Boolean(wf.recursive)}
                            onChange={(e) => {
                              void window.EncodeIt
                                .updateWatchFolder(wf.id, { recursive: e.target.checked })
                                .then(setWatchFolders)
                            }}
                          />
                          Include subfolders
                        </label>
                        <div className="prefs-watch-path" title={wf.path}>
                          {wf.path}
                        </div>
                        <label className="prefs-field">
                          <span>Preset</span>
                          <select
                            value={wf.presetId}
                            onChange={(e) => {
                              void window.EncodeIt
                                .updateWatchFolder(wf.id, { presetId: e.target.value })
                                .then(setWatchFolders)
                            }}
                          >
                            {presetList.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.group} / {p.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="prefs-field">
                          <span>Encode output</span>
                          <div className="prefs-row">
                            <input value={wf.outputDir || '—'} readOnly />
                            <button
                              type="button"
                              onClick={() => {
                                void pathPicker
                                  .openDirectory(wf.outputDir || draft.outputDirectory)
                                  .then((dir) => {
                                    if (!dir) return
                                    return window.EncodeIt
                                      .updateWatchFolder(wf.id, { outputDir: dir })
                                      .then(setWatchFolders)
                                  })
                              }}
                            >
                              Browse…
                            </button>
                          </div>
                        </label>
                        <button
                          type="button"
                          className="prefs-watch-remove"
                          onClick={() => {
                            void window.EncodeIt.removeWatchFolder(wf.id).then(setWatchFolders)
                          }}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <h3 className="prefs-section-spacer">Host intake (optional)</h3>
                <p className="prefs-help">
                  Advanced bridge for scripts/CEP/CLI. Prefer watch folders above for AE, Premiere,
                  and Resolve.
                </p>
                <label className="prefs-check">
                  <input
                    type="checkbox"
                    checked={draft.intakeEnabled}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, intakeEnabled: e.target.checked }))
                    }
                  />
                  Enable localhost intake API
                </label>
                <label className="prefs-field">
                  <span>Intake port</span>
                  <NumberStepper
                    min={1024}
                    max={65535}
                    step={1}
                    value={draft.intakePort}
                    disabled={!draft.intakeEnabled}
                    onValueChange={(n) => setDraft((d) => ({ ...d, intakePort: n }))}
                  />
                </label>
                <div className="prefs-intake-status">
                  {intakeStatus?.error ? (
                    <p className="prefs-error">
                      Intake failed to start: {intakeStatus.error}. Check the port is free, then
                      save Preferences again.
                    </p>
                  ) : null}
                  <div className="prefs-row">
                    <span
                      className={
                        intakeStatus?.error
                          ? 'prefs-error'
                          : intakeStatus?.address
                            ? 'prefs-muted'
                            : 'prefs-error'
                      }
                    >
                      {draft.intakeEnabled
                        ? intakeStatus?.address
                          ? `Listening: ${intakeStatus.address}`
                          : intakeStatus?.error
                            ? 'Enabled but not listening'
                            : 'Enabled in draft — save Preferences to apply / restart intake'
                        : 'Intake is off'}
                    </span>
                    {intakeStatus?.address ? (
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard.writeText(intakeStatus.address!).then(() => {
                            setCopied(true)
                            window.setTimeout(() => setCopied(false), 1500)
                          })
                        }}
                      >
                        {copied ? 'Copied' : 'Copy URL'}
                      </button>
                    ) : null}
                  </div>
                  {intakeStatus?.inboxDir ? (
                    <p className="prefs-muted">JSON inbox: {intakeStatus.inboxDir}</p>
                  ) : null}
                  <p className="prefs-help">
                    Endpoints: <code>GET /health</code>, <code>GET /presets</code>,{' '}
                    <code>POST /queue/add</code>. Optional scripts in{' '}
                    <code>integrations/</code>.
                  </p>
                </div>
              </div>
            ) : null}

            {tab === 'updates' ? (
              <div className="prefs-section">
                <h3>Updates</h3>
                <p className="prefs-help">
                  EncodeIt can look for a newer release on GitHub. It never downloads or installs
                  updates by itself — you choose Download from the status bar or release page.
                </p>
                <label className="prefs-check">
                  <input
                    type="checkbox"
                    checked={draft.checkForUpdatesEnabled}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, checkForUpdatesEnabled: e.target.checked }))
                    }
                  />
                  Check for updates
                </label>
                <p className="prefs-muted">
                  When enabled, EncodeIt checks on launch and about once a day. Save Preferences to
                  apply.
                </p>
                <div className="prefs-row" style={{ marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    disabled={checkingUpdate}
                    onClick={() => {
                      setCheckingUpdate(true)
                      setUpdateMsg(null)
                      void window.EncodeIt
                        .checkForUpdates(true)
                        .then((s) => {
                          if (s.updateAvailable && s.latestVersion) {
                            setUpdateMsg(
                              `EncodeIt ${s.latestVersion} is available (you have ${s.currentVersion}). Use Download… on the status bar.`
                            )
                          } else if (s.error) {
                            setUpdateMsg(`Could not check: ${s.error}`)
                          } else {
                            setUpdateMsg(`You’re up to date (EncodeIt ${s.currentVersion}).`)
                          }
                        })
                        .finally(() => setCheckingUpdate(false))
                    }}
                  >
                    {checkingUpdate ? 'Checking…' : 'Check now'}
                  </button>
                </div>
                {updateMsg ? <p className="prefs-help">{updateMsg}</p> : null}
              </div>
            ) : null}

            {error ? <div className="prefs-error">{error}</div> : null}
          </div>
        </div>

        <footer className="prefs-footer">
          <button type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="primary" disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving…' : 'OK'}
          </button>
        </footer>
      </div>
  )

  if (asWindow) {
    return (
      <div className="app floating-app prefs-window-app">
        <div className="float-titlebar">
          <span className="float-titlebar-label">Preferences</span>
          <WindowControls />
        </div>
        {dialogBody}
      </div>
    )
  }

  return (
    <div className="prefs-backdrop" role="presentation" onMouseDown={onClose}>
      {dialogBody}
    </div>
  )
}
