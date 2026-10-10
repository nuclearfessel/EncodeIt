import { useEffect, useState } from 'react'
import {
  AUDIO_BITRATE_OPTIONS,
  AUDIO_CODEC_OPTIONS,
  getAudioCodecOption
} from '../../../shared/audioCodecs'
import { hardwareOptions, type HardwareCapabilities } from '../../../shared/hardware'
import type { AppSettings, PresetDefinition, QueueJob, SettingsView } from '../../../shared/types'
import { usePathPicker } from '../pathPicker/PathPickerContext'
import { ButtonContent } from './ButtonContent'
import { FolderOpen, MoreHorizontal, iconSize } from './icons'
import { PanelHeader } from './PanelHeader'

interface Props {
  jobs: QueueJob[]
  selectedJobs: QueueJob[]
  activePreset?: PresetDefinition
  settings: SettingsView
  onSettings: (next: AppSettings) => Promise<void>
  floating?: boolean
}

function basename(filePath: string): string {
  return filePath.replace(/^.*[\\/]/, '')
}

export function EncodingPanel({
  jobs,
  selectedJobs,
  activePreset,
  settings,
  onSettings,
  floating
}: Props) {
  const encoding = jobs.filter((j) => j.status === 'encoding')
  const focus = selectedJobs[0]
  const selectedIds = selectedJobs.map((j) => j.id)
  const canEdit = Boolean(focus) && focus?.status !== 'encoding'
  const [hwCaps, setHwCaps] = useState<HardwareCapabilities | null>(null)
  const pathPicker = usePathPicker()

  useEffect(() => {
    void window.encodeThis.detectHardware().then(setHwCaps).catch(() => setHwCaps(null))
  }, [settings.ffmpegPath, settings.hardwareAcceleration])

  const effectiveCodec =
    focus?.audioOverrides?.codec ?? activePreset?.audio.codec ?? 'aac'
  const codecMeta = getAudioCodecOption(effectiveCodec)
  const effectiveBitrate =
    focus?.audioOverrides?.bitrateKbps ??
    activePreset?.audio.bitrateKbps ??
    codecMeta?.bitrateKbps ??
    320
  const showBitrate = Boolean(focus?.exportAudio) && !codecMeta?.lossless && effectiveCodec !== 'none'

  async function pickOutputDir() {
    const dir = await pathPicker.openDirectory(settings.outputDirectory)
    if (!dir) return
    await onSettings({ ...settings, outputDirectory: dir })
  }

  async function setAudioCodec(codec: string) {
    if (!selectedIds.length) return
    const opt = getAudioCodecOption(codec)
    await window.encodeThis.setAudioOverrides(selectedIds, {
      enabled: true,
      codec,
      ...(opt?.lossless
        ? { bitrateKbps: undefined }
        : { bitrateKbps: opt?.bitrateKbps ?? effectiveBitrate })
    })
  }

  async function setAudioBitrate(bitrateKbps: number) {
    if (!selectedIds.length) return
    await window.encodeThis.setAudioOverrides(selectedIds, { bitrateKbps })
  }

  return (
    <aside className={`panel encoding-panel ${floating ? 'floating-fill' : ''}`}>
      <PanelHeader title="Encoding" panelId="encoding" floating={floating} />
      <div className="encoding-body">
        <div className="encoding-status">
          {encoding.length === 0 ? (
            <div className="encoding-idle">Not currently encoding</div>
          ) : (
            encoding.map((job) => (
              <div key={job.id} className="encoding-row">
                <div className="encoding-row-top">
                  <strong title={job.sourcePath}>{basename(job.sourcePath)}</strong>
                  <span>{Math.round(job.progress)}%</span>
                </div>
                <div className="progress">
                  <i style={{ width: `${Math.max(0, Math.min(100, job.progress))}%` }} />
                </div>
                <div className="encoding-meta">
                  {job.speed ? `${job.speed}` : ''}
                  {job.time ? ` · ${job.time}` : ''}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="encoding-details">
          <div className="encoding-section-title">Selection</div>
          {focus ? (
            <dl className="meta-grid">
              <dt>Source</dt>
              <dd title={focus.sourcePath}>{basename(focus.sourcePath)}</dd>
              <dt>Output</dt>
              <dd title={focus.outputPath}>{basename(focus.outputPath)}</dd>
              <dt>Preset</dt>
              <dd>{activePreset?.name ?? focus.presetId}</dd>
            </dl>
          ) : (
            <div className="encoding-idle">Select a queue item</div>
          )}

          {focus ? (
            <div className="export-tracks compact">
              <div className="export-tracks-title">Export</div>
              <label className="export-track">
                <input
                  type="checkbox"
                  checked={focus.exportVideo}
                  disabled={!canEdit}
                  onChange={(e) =>
                    void window.encodeThis.setExportTracks(selectedIds, {
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
                  disabled={!canEdit}
                  onChange={(e) =>
                    void window.encodeThis.setExportTracks(selectedIds, {
                      exportAudio: e.target.checked
                    })
                  }
                />
                Export Audio
              </label>

              <div className="audio-codec-grid">
                <label htmlFor="enc-audio-codec">Audio codec</label>
                <select
                  id="enc-audio-codec"
                  disabled={!canEdit || !focus.exportAudio}
                  value={
                    AUDIO_CODEC_OPTIONS.some((c) => c.id === effectiveCodec)
                      ? effectiveCodec
                      : effectiveCodec
                  }
                  onChange={(e) => void setAudioCodec(e.target.value)}
                >
                  {!AUDIO_CODEC_OPTIONS.some((c) => c.id === effectiveCodec) &&
                  effectiveCodec !== 'none' ? (
                    <option value={effectiveCodec}>{effectiveCodec}</option>
                  ) : null}
                  {AUDIO_CODEC_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {showBitrate ? (
                  <>
                    <label htmlFor="enc-audio-bitrate">Audio bitrate</label>
                    <select
                      id="enc-audio-bitrate"
                      disabled={!canEdit || !focus.exportAudio}
                      value={String(effectiveBitrate)}
                      onChange={(e) => void setAudioBitrate(Number(e.target.value))}
                    >
                      {!AUDIO_BITRATE_OPTIONS.includes(
                        effectiveBitrate as (typeof AUDIO_BITRATE_OPTIONS)[number]
                      ) ? (
                        <option value={String(effectiveBitrate)}>{effectiveBitrate} kbps</option>
                      ) : null}
                      {AUDIO_BITRATE_OPTIONS.map((kbps) => (
                        <option key={kbps} value={String(kbps)}>
                          {kbps} kbps
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}
              </div>

              <div className="output-edit-row" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="btn-with-icon"
                  disabled={!canEdit}
                  onClick={() =>
                    void (async () => {
                      const chosen = await pathPicker.saveFile(focus.outputPath)
                      if (!chosen) return
                      await window.encodeThis.setOutputPath(selectedIds, chosen)
                    })()
                  }
                >
                  <ButtonContent icon={FolderOpen}>Output Path…</ButtonContent>
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="encoding-settings">
          <div className="encoding-section-title">Settings</div>
          <div className="settings-grid">
            <label htmlFor="enc-out">Output folder</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input id="enc-out" value={settings.outputDirectory} readOnly style={{ flex: 1 }} />
              <button
                type="button"
                className="icon-btn"
                title="Choose output folder"
                onClick={() => void pickOutputDir()}
              >
                <MoreHorizontal size={iconSize.md} strokeWidth={2} />
              </button>
            </div>
            <label htmlFor="enc-hw">Hardware</label>
            <select
              id="enc-hw"
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
          </div>
        </div>
      </div>
    </aside>
  )
}
