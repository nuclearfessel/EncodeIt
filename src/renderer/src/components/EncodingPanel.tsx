import { useEffect, useMemo, useState } from 'react'
import {
  AUDIO_BITRATE_OPTIONS,
  AUDIO_CODEC_OPTIONS,
  getAudioCodecOption
} from '../../../shared/audioCodecs'
import {
  BITRATE_MODE_OPTIONS,
  COMMON_FRAME_RATES,
  COMMON_RESOLUTIONS,
  formatVideoSummary,
  getEffectiveVideo
} from '../../../shared/effectiveSettings'
import { hardwareOptions, type HardwareCapabilities } from '../../../shared/hardware'
import type {
  AppSettings,
  BitrateMode,
  PresetDefinition,
  QueueJob,
  SettingsView
} from '../../../shared/types'
import { usePathPicker } from '../pathPicker/PathPickerContext'
import { ButtonContent } from './ButtonContent'
import { FolderOpen, MoreHorizontal, iconSize } from './icons'
import { PanelHeader } from './PanelHeader'

interface Props {
  jobs: QueueJob[]
  selectedJobs: QueueJob[]
  presets: PresetDefinition[]
  activePreset?: PresetDefinition
  settings: SettingsView
  onSettings: (next: AppSettings) => Promise<void>
  onOpenExportSettings?: () => void
  floating?: boolean
}

function basename(filePath: string): string {
  return filePath.replace(/^.*[\\/]/, '')
}

export function EncodingPanel({
  jobs,
  selectedJobs,
  presets,
  activePreset,
  settings,
  onSettings,
  onOpenExportSettings,
  floating
}: Props) {
  const encoding = jobs.filter((j) => j.status === 'encoding')
  const focus = selectedJobs[0]
  const selectedIds = selectedJobs.map((j) => j.id)
  const canEdit = Boolean(focus) && focus?.status !== 'encoding'
  const [hwCaps, setHwCaps] = useState<HardwareCapabilities | null>(null)
  const pathPicker = usePathPicker()

  useEffect(() => {
    void window.EncodeIt.detectHardware().then(setHwCaps).catch(() => setHwCaps(null))
  }, [settings.ffmpegPath, settings.hardwareAcceleration])

  const jobPreset = useMemo(() => {
    if (!focus) return activePreset
    return presets.find((p) => p.id === focus.presetId) ?? activePreset
  }, [focus, presets, activePreset])

  const effectiveVideo = useMemo(() => {
    if (!focus || !jobPreset) return null
    return getEffectiveVideo(focus, jobPreset)
  }, [focus, jobPreset])

  const effectiveCodec =
    focus?.audioOverrides?.codec ?? jobPreset?.audio.codec ?? 'aac'
  const codecMeta = getAudioCodecOption(effectiveCodec)
  const effectiveBitrate =
    focus?.audioOverrides?.bitrateKbps ??
    jobPreset?.audio.bitrateKbps ??
    codecMeta?.bitrateKbps ??
    320
  const showBitrate = Boolean(focus?.exportAudio) && !codecMeta?.lossless && effectiveCodec !== 'none'

  const resValue =
    !effectiveVideo ||
    effectiveVideo.width === 'match' ||
    effectiveVideo.height === 'match'
      ? 'match'
      : COMMON_RESOLUTIONS.find(
            (r) => r.width === effectiveVideo.width && r.height === effectiveVideo.height
          )
        ? `${effectiveVideo.width}x${effectiveVideo.height}`
        : 'custom'

  async function pickOutputDir() {
    const dir = await pathPicker.openDirectory(settings.outputDirectory)
    if (!dir) return
    await onSettings({ ...settings, outputDirectory: dir })
  }

  async function setAudioCodec(codec: string) {
    if (!selectedIds.length) return
    const opt = getAudioCodecOption(codec)
    await window.EncodeIt.setAudioOverrides(selectedIds, {
      enabled: true,
      codec,
      ...(opt?.lossless
        ? { bitrateKbps: undefined }
        : { bitrateKbps: opt?.bitrateKbps ?? effectiveBitrate })
    })
  }

  async function setAudioBitrate(bitrateKbps: number) {
    if (!selectedIds.length) return
    await window.EncodeIt.setAudioOverrides(selectedIds, { bitrateKbps })
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
              <dd>{jobPreset?.name ?? focus.presetId}</dd>
              {effectiveVideo ? (
                <>
                  <dt>Video</dt>
                  <dd title={formatVideoSummary(effectiveVideo)}>
                    {formatVideoSummary(effectiveVideo)}
                  </dd>
                </>
              ) : null}
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
                  disabled={!canEdit}
                  onChange={(e) =>
                    void window.EncodeIt.setExportTracks(selectedIds, {
                      exportAudio: e.target.checked
                    })
                  }
                />
                Export Audio
              </label>

              {effectiveVideo && focus.exportVideo ? (
                <div className="audio-codec-grid">
                  <label htmlFor="enc-res">Resolution</label>
                  <select
                    id="enc-res"
                    disabled={!canEdit}
                    value={resValue === 'custom' ? 'custom' : resValue}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === 'match') {
                        void window.EncodeIt.setVideoOverrides(selectedIds, {
                          width: 'match',
                          height: 'match'
                        })
                        return
                      }
                      if (v === 'custom') return
                      const [w, h] = v.split('x').map(Number)
                      void window.EncodeIt.setVideoOverrides(selectedIds, {
                        width: w,
                        height: h
                      })
                    }}
                  >
                    {COMMON_RESOLUTIONS.map((r) => (
                      <option
                        key={r.label}
                        value={r.width === 'match' ? 'match' : `${r.width}x${r.height}`}
                      >
                        {r.label}
                      </option>
                    ))}
                    {resValue === 'custom' ? (
                      <option value="custom">
                        Custom ({effectiveVideo.width}×{effectiveVideo.height})
                      </option>
                    ) : null}
                  </select>

                  <label htmlFor="enc-fps">Frame rate</label>
                  <select
                    id="enc-fps"
                    disabled={!canEdit}
                    value={
                      !effectiveVideo.frameRate || effectiveVideo.frameRate === 'match'
                        ? 'match'
                        : String(effectiveVideo.frameRate)
                    }
                    onChange={(e) => {
                      const v = e.target.value
                      void window.EncodeIt.setVideoOverrides(selectedIds, {
                        frameRate: v === 'match' ? 'match' : v
                      })
                    }}
                  >
                    {COMMON_FRAME_RATES.map((r) => (
                      <option key={r} value={r}>
                        {r === 'match' ? 'Match source' : r}
                      </option>
                    ))}
                  </select>

                  <label htmlFor="enc-mode">Bitrate mode</label>
                  <select
                    id="enc-mode"
                    disabled={!canEdit}
                    value={effectiveVideo.bitrateMode ?? 'vbr1'}
                    onChange={(e) =>
                      void window.EncodeIt.setVideoOverrides(selectedIds, {
                        bitrateMode: e.target.value as BitrateMode
                      })
                    }
                  >
                    {BITRATE_MODE_OPTIONS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>

                  {effectiveVideo.bitrateMode === 'crf' ||
                  effectiveVideo.bitrateMode === 'cq' ? (
                    <>
                      <label htmlFor="enc-crf">CRF / CQ</label>
                      <input
                        id="enc-crf"
                        type="number"
                        disabled={!canEdit}
                        value={effectiveVideo.crf ?? 23}
                        onChange={(e) =>
                          void window.EncodeIt.setVideoOverrides(selectedIds, {
                            crf: Number(e.target.value)
                          })
                        }
                      />
                    </>
                  ) : (
                    <>
                      <label htmlFor="enc-vbr">Video bitrate</label>
                      <input
                        id="enc-vbr"
                        type="number"
                        disabled={!canEdit}
                        value={effectiveVideo.bitrateKbps ?? ''}
                        onChange={(e) =>
                          void window.EncodeIt.setVideoOverrides(selectedIds, {
                            bitrateKbps: e.target.value
                              ? Number(e.target.value)
                              : undefined
                          })
                        }
                      />
                    </>
                  )}
                </div>
              ) : null}

              <div className="audio-codec-grid">
                <label htmlFor="enc-audio-codec">Audio codec</label>
                <select
                  id="enc-audio-codec"
                  disabled={!canEdit || !focus.exportAudio}
                  value={effectiveCodec}
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

              <div className="output-edit-row" style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-with-icon"
                  disabled={!canEdit}
                  onClick={() =>
                    void (async () => {
                      const chosen = await pathPicker.saveFile(focus.outputPath)
                      if (!chosen) return
                      await window.EncodeIt.setOutputPath(selectedIds, chosen)
                    })()
                  }
                >
                  <ButtonContent icon={FolderOpen}>Output Path…</ButtonContent>
                </button>
                {onOpenExportSettings ? (
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={onOpenExportSettings}
                  >
                    Export Settings…
                  </button>
                ) : null}
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
