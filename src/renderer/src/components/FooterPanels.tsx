import type { AppSettings, PresetDefinition, QueueJob, WatchFolder } from '../../../shared/types'

interface Props {
  settings: AppSettings
  onSettings: (next: AppSettings) => Promise<void>
  selectedJobs: QueueJob[]
  activePreset?: PresetDefinition
  watchFolders: WatchFolder[]
  onRefreshWatch: () => Promise<void>
  defaultPresetId: string
}

function basename(filePath: string): string {
  return filePath.replace(/^.*[\\/]/, '')
}

export function FooterPanels({
  settings,
  onSettings,
  selectedJobs,
  activePreset,
  watchFolders,
  onRefreshWatch,
  defaultPresetId
}: Props) {
  const focus = selectedJobs[0]

  async function pickOutputDir() {
    const dir = await window.encodeThis.openDirectory()
    if (!dir) return
    await onSettings({ ...settings, outputDirectory: dir })
  }

  async function addWatch() {
    const folder = await window.encodeThis.openDirectory()
    if (!folder) return
    await window.encodeThis.addWatchFolder(folder, defaultPresetId, settings.outputDirectory)
    await onRefreshWatch()
  }

  return (
    <footer className="footer">
      <div className="footer-card">
        <h3>Source / Output</h3>
        {focus ? (
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
            <dt>Output</dt>
            <dd title={focus.outputPath}>{focus.outputPath}</dd>
            {focus.error ? (
              <>
                <dt>Error</dt>
                <dd className="error-text" title={focus.error}>
                  {focus.error}
                </dd>
              </>
            ) : null}
          </dl>
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
              {activePreset.audio.enabled
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
        <h3>Watch Folders</h3>
        {watchFolders.map((w) => (
          <div className="watch-row" key={w.id}>
            <input
              type="checkbox"
              checked={w.enabled}
              onChange={(e) =>
                void window.encodeThis.setWatchEnabled(w.id, e.target.checked).then(onRefreshWatch)
              }
            />
            <code title={w.path}>{w.path}</code>
            <button
              type="button"
              onClick={() => void window.encodeThis.removeWatchFolder(w.id).then(onRefreshWatch)}
            >
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={() => void addWatch()}>
          Add Watch Folder…
        </button>
      </div>

      <div className="footer-card">
        <h3>Settings</h3>
        <div className="settings-grid">
          <label htmlFor="out">Output</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input id="out" value={settings.outputDirectory} readOnly style={{ flex: 1 }} />
            <button type="button" onClick={() => void pickOutputDir()}>
              …
            </button>
          </div>
          <label htmlFor="ffmpeg">FFmpeg</label>
          <input
            id="ffmpeg"
            value={settings.ffmpegPath}
            onChange={(e) => void onSettings({ ...settings, ffmpegPath: e.target.value })}
          />
          <label htmlFor="hw">Hardware</label>
          <select
            id="hw"
            value={settings.hardwareAcceleration}
            onChange={(e) =>
              void onSettings({
                ...settings,
                hardwareAcceleration: e.target.value as AppSettings['hardwareAcceleration']
              })
            }
          >
            <option value="auto">Auto (software default)</option>
            <option value="none">None</option>
            <option value="nvenc">NVIDIA NVENC</option>
            <option value="qsv">Intel QSV</option>
            <option value="amf">AMD AMF</option>
            <option value="videotoolbox">Apple VideoToolbox</option>
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
