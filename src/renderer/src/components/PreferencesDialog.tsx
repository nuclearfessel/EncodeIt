import { useEffect, useMemo, useState } from 'react'
import {
  hardwareLabel,
  hardwareOptions,
  resolveHardwareAcceleration,
  type HardwareCapabilities
} from '../../../shared/hardware'
import type { AppSettings, SettingsView } from '../../../shared/types'
import { usePathPicker } from '../pathPicker/PathPickerContext'

interface Props {
  open: boolean
  settings: SettingsView
  onClose: () => void
  onSave: (next: AppSettings) => Promise<SettingsView>
}

type PrefsTab = 'general' | 'media' | 'hardware' | 'integrations'

export function PreferencesDialog({ open, settings, onClose, onSave }: Props) {
  const [tab, setTab] = useState<PrefsTab>('general')
  const [draft, setDraft] = useState<AppSettings>(settings)
  const [caps, setCaps] = useState<HardwareCapabilities | null>(null)
  const [probing, setProbing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [intakeStatus, setIntakeStatus] = useState<{
    enabled: boolean
    port: number
    address: string | null
    inboxDir: string
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const pathPicker = usePathPicker()

  useEffect(() => {
    if (!open) return
    setDraft({
      ffmpegPath: settings.ffmpegPath,
      ffprobePath: settings.ffprobePath,
      outputDirectory: settings.outputDirectory,
      maxConcurrent: settings.maxConcurrent,
      overwriteOutput: settings.overwriteOutput,
      hardwareAcceleration: settings.hardwareAcceleration,
      intakeEnabled: settings.intakeEnabled,
      intakePort: settings.intakePort
    })
    setTab('general')
    setError(null)
    setCopied(false)
    setProbing(true)
    void window.encodeThis
      .detectHardware()
      .then(setCaps)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setProbing(false))
    void window.encodeThis
      .getIntakeStatus()
      .then(setIntakeStatus)
      .catch(() => setIntakeStatus(null))
  }, [open, settings])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

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

  if (!open) return null

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
      setCaps(await window.encodeThis.detectHardware(true))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setProbing(false)
    }
  }

  return (
    <div className="prefs-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="prefs-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prefs-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="prefs-header">
          <h2 id="prefs-title">Preferences</h2>
          <button type="button" className="icon-btn" title="Close" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="prefs-body">
          <nav className="prefs-nav" aria-label="Preference sections">
            {(
              [
                ['general', 'General'],
                ['media', 'Media'],
                ['hardware', 'Hardware'],
                ['integrations', 'Integrations']
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
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={draft.maxConcurrent}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        maxConcurrent: Math.max(1, Math.min(8, Number(e.target.value) || 1))
                      }))
                    }
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
                <h3>Host intake (AE / Resolve)</h3>
                <p className="prefs-help">
                  Phase 2 bridge — After Effects, DaVinci Resolve, and CLI tools POST jobs here while
                  Encode This is running.
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
                  <input
                    type="number"
                    min={1024}
                    max={65535}
                    value={draft.intakePort}
                    disabled={!draft.intakeEnabled}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        intakePort: Math.max(1024, Math.min(65535, Number(e.target.value) || 47821))
                      }))
                    }
                  />
                </label>
                <div className="prefs-intake-status">
                  <div className="prefs-row">
                    <span className={intakeStatus?.address ? 'prefs-muted' : 'prefs-error'}>
                      {draft.intakeEnabled
                        ? intakeStatus?.address
                          ? `Listening: ${intakeStatus.address}`
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
                    <p className="prefs-muted">Inbox: {intakeStatus.inboxDir}</p>
                  ) : null}
                  <p className="prefs-help">
                    Endpoints: <code>GET /health</code>, <code>GET /presets</code>,{' '}
                    <code>POST /queue/add</code>. Scripts live in{' '}
                    <code>integrations/after-effects</code> and{' '}
                    <code>integrations/davinci-resolve</code>.
                  </p>
                </div>
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
    </div>
  )
}
