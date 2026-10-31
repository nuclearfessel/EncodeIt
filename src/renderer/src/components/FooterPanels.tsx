import { useEffect, useState } from 'react'
import { hardwareOptions, type HardwareCapabilities } from '../../../shared/hardware'
import type {
  AppSettings,
  PresetDefinition,
  QueueJob,
  SettingsView
} from '../../../shared/types'
import { usePathPicker } from '../pathPicker/PathPickerContext'

interface Props {
  settings: SettingsView
  onSettings: (next: AppSettings) => Promise<void>
  selectedJobs: QueueJob[]
  activePreset?: PresetDefinition
}

function basename(filePath: string): string {
  return filePath.replace(/^.*[\\/]/, '')
}

function dirname(filePath: string): string {
  return filePath.replace(/[\\/][^\\/]+$/, '') || filePath
}

export function FooterPanels({
  settings,
  onSettings,
  selectedJobs,
  activePreset
}: Props) {
  const focus = selectedJobs[0]
  const selectedIds = selectedJobs.map((j) => j.id)
  const [fileName, setFileName] = useState('')
  const [hwCaps, setHwCaps] = useState<HardwareCapabilities | null>(null)
  const pathPicker = usePathPicker()

  useEffect(() => {
    setFileName(focus ? basename(focus.outputPath) : '')
  }, [focus?.id, focus?.outputPath])

  useEffect(() => {
    void window.EncodeIt.detectHardware().then(setHwCaps).catch(() => setHwCaps(null))
  }, [settings.ffmpegPath, settings.hardwareAcceleration])

  async function pickOutputDir() {
    const dir = await pathPicker.openDirectory(settings.outputDirectory)
    if (!dir) return
    await onSettings({ ...settings, outputDirectory: dir })
  }

  async function applyFileName() {
    if (!selectedIds.length || !fileName.trim()) return
    await window.EncodeIt.setOutputFileName(selectedIds, fileName.trim())
  }

  async function saveAs() {
    if (!focus) return
    const chosen = await pathPicker.saveFile(focus.outputPath)
    if (!chosen) return
    await window.EncodeIt.setOutputPath(selectedIds, chosen)
  }

  async function pickJobOutputFolder() {
    if (!selectedIds.length) return
    const dir = await pathPicker.openDirectory(
      focus ? dirname(focus.outputPath) : settings.outputDirectory
    )
    if (!dir) return
    await window.EncodeIt.setJobsOutputDirectory(selectedIds, dir)
  }

  const canEditOutput = Boolean(focus) && focus?.status !== 'encoding'

  return (
    <footer className="footer">
      <div className="footer-card">
        <h3>Source / Output</h3>
        {focus ? (
          <>
            <dl className="meta-grid">
              <dt>File</dt>
              <dd title={focus.sourcePath}>{basename(focus.sourcePath)}</dd>
              <dt>Duration</dt>
              <dd>{focus.media?.duration ? `${focus.media.duration.toFixed(2)}s` : '—'}</dd>
              <dt>Video</dt>
              <dd>
                {focus.media?.streams.find((s) => s.codecType === 'video')
                  ? `${focus.media.streams.find((s) => s.codecType === 'video')?.width}×${
                      focus.media.streams.find((s) => s.codecType === 'video')?.height
                    } ${focus.media.streams.find((s) => s.codecType === 'video')?.codecName ?? ''}`
                  : '—'}
              </dd>
              <dt>Folder</dt>
              <dd title={dirname(focus.outputPath)}>{dirname(focus.outputPath)}</dd>
            </dl>

            <div className="output-edit">
              <label htmlFor="out-name">Output name</label>
              <div className="output-edit-row">
                <input
                  id="out-name"
                  value={fileName}
                  disabled={!canEditOutput}
                  onChange={(e) => setFileName(e.target.value)}
                  onBlur={() => void applyFileName()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    }
                  }}
                  title="Edit the output file name, then press Enter or click away"
                />
                <button type="button" disabled={!canEditOutput} onClick={() => void saveAs()}>
                  Save As…
                </button>
                <button
                  type="button"
                  disabled={!canEditOutput}
                  onClick={() => void pickJobOutputFolder()}
                >
                  Folder…
                </button>
              </div>
              <div className="output-path-hint" title={focus.outputPath}>
                {focus.outputPath}
                {focus.customOutputPath ? ' · custom' : ''}
              </div>
            </div>

            <div className="export-tracks">
              <div className="export-tracks-title">Export Settings</div>
              <label className="export-track">
                <input
                  type="checkbox"
                  checked={focus.exportVideo}
                  disabled={!canEditOutput}
                  onChange={(e) =>
                    void window.EncodeIt.setExportTracks(selectedIds, {
                      exportVideo: e.target.checked
                    })
                  }
                />
                Export Video
              </label>
              <label className="export-track">
                <input
                  type="checkbox"
                  checked={focus.exportAudio}
                  disabled={!canEditOutput}
                  onChange={(e) =>
                    void window.EncodeIt.setExportTracks(selectedIds, {
                      exportAudio: e.target.checked
                    })
                  }
                />
                Export Audio
              </label>
              <div className="output-path-hint">
                Uncheck Export Audio for a silent movie (same as Adobe Media Encoder).
              </div>
            </div>

            {focus.error ? (
              <div className="error-text" title={focus.error} style={{ marginTop: 8 }}>
                {focus.error}
              </div>
            ) : null}
          </>
        ) : (
          <div style={{ color: '#6b7787', fontSize: '0.8rem' }}>Select a queue item</div>
        )}
      </div>

      <div className="footer-card">
        <h3>Active Preset</h3>
        {activePreset ? (
          <dl className="meta-grid">
            <dt>Name</dt>
            <dd>{activePreset.name}</dd>
            <dt>Format</dt>
            <dd>{activePreset.formatId}</dd>
            <dt>Video</dt>
            <dd>
              {activePreset.video.codec}
              {activePreset.video.proresProfile
                ? ` / ${activePreset.video.proresProfile}`
                : activePreset.video.dnxProfile
                  ? ` / ${activePreset.video.dnxProfile}`
                  : activePreset.video.profile
                    ? ` / ${activePreset.video.profile}`
                    : ''}
            </dd>
            <dt>Audio</dt>
            <dd>
              {focus && !focus.exportAudio
                ? 'Off (Export Audio unchecked)'
                : activePreset.audio.enabled
                  ? `${activePreset.audio.codec}${
                      activePreset.audio.bitrateKbps ? ` ${activePreset.audio.bitrateKbps}k` : ''
                    }`
                  : 'None'}
            </dd>
            <dt>Sources</dt>
            <dd>{activePreset.sources.join(', ')}</dd>
          </dl>
        ) : (
          <div style={{ color: '#6b7787', fontSize: '0.8rem' }}>No preset selected</div>
        )}
      </div>

      <div className="footer-card">
        <h3>Settings</h3>
        <div className="settings-grid">
          <label htmlFor="out">Default output</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input id="out" value={settings.outputDirectory} readOnly style={{ flex: 1 }} />
            <button type="button" onClick={() => void pickOutputDir()}>
              …
            </button>
          </div>
          <label htmlFor="hw">Hardware</label>
          <select
            id="hw"
            value={settings.hardwareAcceleration}
            title="Also available under Edit → Preferences"
            onChange={(e) =>
              void onSettings({
                ...settings,
                hardwareAcceleration: e.target.value as AppSettings['hardwareAcceleration']
              })
            }
          >
            {hardwareOptions(
              hwCaps ?? {
                platform: 'unknown',
                ffmpegPath: settings.ffmpegPath,
                nvenc: false,
                qsv: false,
                amf: false,
                videotoolbox: false,
                encoders: [],
                probedAt: 0
              }
            ).map((opt) => (
              <option key={opt.id} value={opt.id} disabled={!opt.available}>
                {opt.label}
                {!opt.available ? ' — unavailable' : ''}
              </option>
            ))}
          </select>
          <label htmlFor="intake">Host intake</label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              id="intake"
              type="checkbox"
              checked={settings.intakeEnabled}
              onChange={(e) =>
                void onSettings({ ...settings, intakeEnabled: e.target.checked })
              }
            />
            <span style={{ color: '#9aa6b5' }}>localhost:{settings.intakePort}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
