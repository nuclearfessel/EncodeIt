import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AUDIO_BITRATE_OPTIONS,
  AUDIO_CODEC_OPTIONS,
  getAudioCodecOption
} from '../../../shared/audioCodecs'
import {
  diffAudioSettings,
  diffVideoSettings,
  getEffectiveAudio,
  getEffectiveVideo
} from '../../../shared/effectiveSettings'
import {
  AVCINTRA_CLASSES,
  BITRATE_MODES,
  CINEFORM_QUALITIES,
  CRF_PRESETS,
  DNX_PROFILES,
  FRAME_RATE_OPTIONS,
  GOP_PRESETS,
  CHANNEL_OPTIONS,
  PRORES_PROFILES,
  RESOLUTION_PRESETS,
  SAMPLE_RATES,
  VIDEO_BITRATE_PRESETS,
  codecFamily,
  codecsForFormat,
  defaultsForCodec,
  formatsAsOptions,
  levelsForCodec,
  pixelFormatsForCodec,
  profilesForCodec,
  summarizeVideo,
  usesBitrate,
  usesQuality,
  withCurrent,
  type SelectOption
} from '../../../shared/exportFieldOptions'
import type {
  AudioSettings,
  BitrateMode,
  PresetDefinition,
  QueueJob,
  VideoSettings
} from '../../../shared/types'

type TabId = 'video' | 'audio' | 'advanced'

interface Props {
  open: boolean
  jobs: QueueJob[]
  presets: PresetDefinition[]
  onClose: () => void
  onApplied: (jobs: QueueJob[]) => void
  onCatalogUpdated: (catalog: unknown) => void
}

function cloneVideo(v: VideoSettings): VideoSettings {
  return {
    ...v,
    extraArgs: [...(v.extraArgs ?? [])],
    videoFilters: v.videoFilters ? [...v.videoFilters] : undefined
  }
}

function cloneAudio(a: AudioSettings): AudioSettings {
  return { ...a, extraArgs: [...(a.extraArgs ?? [])] }
}

function Field({
  label,
  hint,
  children
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="ex-field">
      <span className="ex-field-label">
        {label}
        {hint ? <small>{hint}</small> : null}
      </span>
      <span className="ex-field-control">{children}</span>
    </label>
  )
}

function Select({
  id,
  value,
  options,
  disabled,
  onChange
}: {
  id: string
  value: string
  options: SelectOption[]
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const opts = withCurrent(options, value)
  return (
    <select
      id={id}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {opts.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function basename(filePath: string): string {
  return filePath.replace(/^.*[\\/]/, '')
}

export function ExportSettingsDialog({
  open,
  jobs,
  presets,
  onClose,
  onApplied,
  onCatalogUpdated
}: Props) {
  const focus = jobs[0]
  const basePreset = useMemo(
    () => presets.find((p) => p.id === focus?.presetId) ?? presets[0],
    [presets, focus?.presetId]
  )

  const [tab, setTab] = useState<TabId>('video')
  const [presetId, setPresetId] = useState('')
  const [formatId, setFormatId] = useState('')
  const [exportVideo, setExportVideo] = useState(true)
  const [exportAudio, setExportAudio] = useState(true)
  const [video, setVideo] = useState<VideoSettings | null>(null)
  const [audio, setAudio] = useState<AudioSettings | null>(null)
  const [extraArgsText, setExtraArgsText] = useState('')
  const [filtersText, setFiltersText] = useState('')
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customResolution, setCustomResolution] = useState(false)
  const [constrainAspect, setConstrainAspect] = useState(true)
  const [widthText, setWidthText] = useState('1920')
  const [heightText, setHeightText] = useState('1080')

  function syncSizeFields(width: number, height: number) {
    setWidthText(String(width))
    setHeightText(String(height))
  }

  function evenDim(n: number): number {
    return Math.max(16, Math.round(n / 2) * 2)
  }

  function aspectRatio(v: VideoSettings): number {
    if (typeof v.width === 'number' && typeof v.height === 'number' && v.height > 0) {
      return v.width / v.height
    }
    const stream = focus?.media?.streams.find((s) => s.codecType === 'video')
    if (stream?.width && stream?.height) return stream.width / stream.height
    return 16 / 9
  }

  useEffect(() => {
    if (!open || !focus || !basePreset) return
    const preset = presets.find((p) => p.id === focus.presetId) ?? basePreset
    setPresetId(preset.id)
    setFormatId(preset.formatId)
    setExportVideo(focus.exportVideo)
    setExportAudio(focus.exportAudio)
    const v = getEffectiveVideo(focus, preset)
    const a = getEffectiveAudio(focus, preset)
    setVideo(cloneVideo(v))
    setAudio(cloneAudio(a))
    setExtraArgsText((v.extraArgs ?? []).join(' '))
    setFiltersText((v.videoFilters ?? []).join(','))
    setSaveName(`${preset.name} Custom`)
    setTab('video')
    setError(null)
    setConstrainAspect(true)
    const matchedPreset = RESOLUTION_PRESETS.some(
      (r) => r.width === v.width && r.height === v.height
    )
    const isMatch = v.width === 'match' || v.height === 'match' || v.width == null
    setCustomResolution(!isMatch && !matchedPreset)
    const w = typeof v.width === 'number' ? v.width : focus.media?.streams.find((s) => s.codecType === 'video')?.width ?? 1920
    const h = typeof v.height === 'number' ? v.height : focus.media?.streams.find((s) => s.codecType === 'video')?.height ?? 1080
    syncSizeFields(w, h)
  }, [open, focus, basePreset, presets])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const editable = Boolean(focus) && focus?.status !== 'encoding'
  const family = video ? codecFamily(video.encoder ?? video.codec) : 'generic'

  const presetsForFormat = useMemo(() => {
    if (!formatId) return presets
    const matched = presets.filter((p) => p.formatId === formatId)
    return matched.length ? matched : presets
  }, [presets, formatId])

  const presetOptions: SelectOption[] = presetsForFormat.map((p) => ({
    value: p.id,
    label: p.origin === 'user' ? `★ ${p.name}` : p.name
  }))

  if (!open || !focus || !video || !audio) return null

  function patchVideo(partial: Partial<VideoSettings>) {
    setVideo((prev) => (prev ? { ...prev, ...partial } : prev))
  }

  function patchAudio(partial: Partial<AudioSettings>) {
    setAudio((prev) => (prev ? { ...prev, ...partial } : prev))
  }

  function onPresetChange(nextId: string) {
    const preset = presets.find((p) => p.id === nextId)
    if (!preset) return
    setPresetId(nextId)
    setFormatId(preset.formatId)
    setVideo(cloneVideo(preset.video))
    setAudio(cloneAudio(preset.audio))
    setExportVideo(preset.video.codec !== 'none')
    setExportAudio(preset.audio.enabled && preset.audio.codec !== 'none')
    setExtraArgsText((preset.video.extraArgs ?? []).join(' '))
    setFiltersText((preset.video.videoFilters ?? []).join(','))
    setSaveName(`${preset.name} Custom`)
    const v = preset.video
    const matched = RESOLUTION_PRESETS.some((r) => r.width === v.width && r.height === v.height)
    const isMatch = v.width === 'match' || v.height === 'match' || v.width == null
    setCustomResolution(!isMatch && !matched)
  }

  function onFormatChange(nextFormat: string) {
    setFormatId(nextFormat)
    const match = presets.find((p) => p.formatId === nextFormat)
    if (match) onPresetChange(match.id)
    else {
      const codecs = codecsForFormat(nextFormat)
      if (codecs[0]) patchVideo(defaultsForCodec(codecs[0].value))
    }
  }

  function onCodecChange(codec: string) {
    patchVideo(defaultsForCodec(codec))
  }

  function buildVideoForApply(): VideoSettings {
    const args = extraArgsText.trim().split(/\s+/).filter(Boolean)
    const filters = filtersText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    return {
      ...video!,
      extraArgs: args.length ? args : undefined,
      videoFilters: filters.length ? filters : undefined
    }
  }

  async function apply() {
    if (!editable || !video || !audio) return
    const preset = presets.find((p) => p.id === presetId)
    if (!preset) {
      setError('Preset not found')
      return
    }
    const nextVideo = buildVideoForApply()
    const nextAudio = { ...audio, enabled: exportAudio }
    const videoDiff = diffVideoSettings(preset.video, nextVideo)
    const audioDiff = diffAudioSettings(preset.audio, nextAudio)
    try {
      const list = await window.EncodeIt.applyExportSettings(
        jobs.map((j) => j.id),
        {
          presetId,
          exportVideo,
          exportAudio,
          videoOverrides: Object.keys(videoDiff).length ? videoDiff : null,
          audioOverrides: Object.keys(audioDiff).length ? audioDiff : null
        }
      )
      onApplied(list)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function saveAsPreset() {
    if (!video || !audio) return
    const name = saveName.trim()
    if (!name) {
      setError('Enter a name for the custom preset')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const result = await window.EncodeIt.saveUserPreset({
        name,
        group: 'User',
        subgroup: 'Custom',
        formatId,
        description: `Custom preset based on ${presetId}`,
        video: buildVideoForApply(),
        audio: { ...audio, enabled: exportAudio },
        muxerArgs: presets.find((p) => p.id === presetId)?.muxerArgs
      })
      onCatalogUpdated(result.catalog)
      setSaveName(result.preset.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const matchedRes = RESOLUTION_PRESETS.find(
    (r) => r.width === video.width && r.height === video.height
  )
  const resKey = customResolution
    ? 'custom'
    : video.width === 'match' || video.height === 'match' || video.width == null
      ? 'match'
      : matchedRes
        ? `${video.width}x${video.height}`
        : 'custom'

  const resolutionOptions: SelectOption[] = [
    ...RESOLUTION_PRESETS.map((r) => ({
      value: r.width === 'match' ? 'match' : `${r.width}x${r.height}`,
      label: r.label
    })),
    {
      value: 'custom',
      label:
        customResolution && typeof video.width === 'number' && typeof video.height === 'number'
          ? `Custom (${video.width}×${video.height})`
          : 'Custom width × height…'
    }
  ]

  const codecValue = video.encoder ?? video.codec
  const profileOptions = profilesForCodec(codecValue)
  const levelOptions = levelsForCodec(codecValue)
  const pixOptions = pixelFormatsForCodec(codecValue)

  return (
    <div className="ex-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="ex-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ex-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="ex-header">
          <div>
            <h2 id="ex-title">Export Settings</h2>
            <p className="ex-subtitle">
              {basename(focus.sourcePath)}
              {jobs.length > 1 ? ` · ${jobs.length} selected jobs` : ''}
            </p>
          </div>
          <button type="button" className="icon-btn" title="Close" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="ex-topbar">
          <Field label="Format">
            <Select
              id="ex-format"
              disabled={!editable}
              value={formatId}
              options={formatsAsOptions()}
              onChange={onFormatChange}
            />
          </Field>
          <Field label="Preset" hint="Starting point for these settings">
            <Select
              id="ex-preset"
              disabled={!editable}
              value={presetId}
              options={presetOptions}
              onChange={onPresetChange}
            />
          </Field>
          <div className="ex-summary">{summarizeVideo(video)}</div>
          <div className="ex-tracks">
            <label>
              <input
                type="checkbox"
                checked={exportVideo}
                disabled={!editable}
                onChange={(e) => setExportVideo(e.target.checked)}
              />
              Video
            </label>
            <label>
              <input
                type="checkbox"
                checked={exportAudio}
                disabled={!editable}
                onChange={(e) => setExportAudio(e.target.checked)}
              />
              Audio
            </label>
          </div>
        </div>

        <div className="ex-body">
          <nav className="ex-nav" aria-label="Export settings sections">
            {(
              [
                ['video', 'Video'],
                ['audio', 'Audio'],
                ['advanced', 'Advanced']
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

          <div className="ex-panel">
            {tab === 'video' ? (
              <>
                <section className="ex-section">
                  <h3>Codec</h3>
                  <div className="ex-grid">
                    <Field label="Video codec">
                      <Select
                        id="ex-codec"
                        disabled={!editable || !exportVideo}
                        value={codecValue}
                        options={codecsForFormat(formatId)}
                        onChange={onCodecChange}
                      />
                    </Field>
                    {profileOptions.length ? (
                      <Field label="Profile">
                        <Select
                          id="ex-profile"
                          disabled={!editable || !exportVideo}
                          value={video.profile ?? profileOptions[0]?.value ?? ''}
                          options={profileOptions}
                          onChange={(v) => patchVideo({ profile: v || undefined })}
                        />
                      </Field>
                    ) : null}
                    {levelOptions.length ? (
                      <Field label="Level">
                        <Select
                          id="ex-level"
                          disabled={!editable || !exportVideo}
                          value={video.level ?? ''}
                          options={[{ value: '', label: 'Auto' }, ...levelOptions]}
                          onChange={(v) => patchVideo({ level: v || undefined })}
                        />
                      </Field>
                    ) : null}
                    <Field label="Pixel format">
                      <Select
                        id="ex-pix"
                        disabled={!editable || !exportVideo}
                        value={video.pixelFormat ?? pixOptions[0]?.value ?? 'yuv420p'}
                        options={pixOptions}
                        onChange={(v) => patchVideo({ pixelFormat: v || undefined })}
                      />
                    </Field>
                  </div>
                </section>

                {(family === 'prores' ||
                  family === 'dnx' ||
                  family === 'cineform' ||
                  family === 'avcintra') && (
                  <section className="ex-section">
                    <h3>Mezzanine options</h3>
                    <div className="ex-grid">
                      {family === 'prores' ? (
                        <Field label="ProRes profile">
                          <Select
                            id="ex-prores"
                            disabled={!editable || !exportVideo}
                            value={video.proresProfile ?? 'hq'}
                            options={PRORES_PROFILES}
                            onChange={(v) => patchVideo({ proresProfile: v })}
                          />
                        </Field>
                      ) : null}
                      {family === 'dnx' ? (
                        <Field label="DNx profile">
                          <Select
                            id="ex-dnx"
                            disabled={!editable || !exportVideo}
                            value={video.dnxProfile ?? 'dnxhr_hq'}
                            options={DNX_PROFILES}
                            onChange={(v) => patchVideo({ dnxProfile: v })}
                          />
                        </Field>
                      ) : null}
                      {family === 'cineform' ? (
                        <Field label="CineForm quality">
                          <Select
                            id="ex-cf"
                            disabled={!editable || !exportVideo}
                            value={video.cineformQuality ?? 'high'}
                            options={CINEFORM_QUALITIES}
                            onChange={(v) => patchVideo({ cineformQuality: v })}
                          />
                        </Field>
                      ) : null}
                      {family === 'avcintra' ? (
                        <Field label="AVC-Intra class">
                          <Select
                            id="ex-avci"
                            disabled={!editable || !exportVideo}
                            value={String(video.avcintraClass ?? 100)}
                            options={AVCINTRA_CLASSES}
                            onChange={(v) =>
                              patchVideo({
                                avcintraClass: Number(v) as 50 | 100 | 200 | 300 | 480
                              })
                            }
                          />
                        </Field>
                      ) : null}
                    </div>
                  </section>
                )}

                <section className="ex-section">
                  <h3>Frame size & rate</h3>
                  <div className="ex-grid">
                    <Field label="Resolution">
                      <Select
                        id="ex-res"
                        disabled={!editable || !exportVideo}
                        value={resKey}
                        options={resolutionOptions}
                        onChange={(v) => {
                          if (v === 'match') {
                            setCustomResolution(false)
                            patchVideo({ width: 'match', height: 'match' })
                            return
                          }
                          if (v === 'custom') {
                            setCustomResolution(true)
                            const stream = focus.media?.streams.find((s) => s.codecType === 'video')
                            const w =
                              typeof video.width === 'number'
                                ? video.width
                                : stream?.width ?? 1920
                            const h =
                              typeof video.height === 'number'
                                ? video.height
                                : stream?.height ?? 1080
                            patchVideo({ width: w, height: h })
                            syncSizeFields(w, h)
                            return
                          }
                          setCustomResolution(false)
                          const [w, h] = v.split('x').map(Number)
                          patchVideo({ width: w, height: h })
                        }}
                      />
                    </Field>
                    {customResolution || resKey === 'custom' ? (
                      <div className="ex-size-field">
                        <span className="ex-field-label">
                          Frame size
                          <small>
                            {constrainAspect
                              ? 'Aspect ratio locked — change one side to scale the other'
                              : 'Aspect ratio unlocked — width and height edit independently'}
                          </small>
                        </span>
                        <div className="ex-size-row">
                          <label className="ex-size-dim" htmlFor="ex-w">
                            <span>W</span>
                            <input
                              id="ex-w"
                              type="text"
                              inputMode="numeric"
                              autoComplete="off"
                              spellCheck={false}
                              disabled={!editable || !exportVideo}
                              value={widthText}
                              onChange={(e) => setWidthText(e.target.value.replace(/[^\d]/g, ''))}
                              onBlur={() => {
                                const n = Number.parseInt(widthText, 10)
                                if (!Number.isFinite(n) || n <= 0) {
                                  syncSizeFields(
                                    typeof video.width === 'number' ? video.width : 1920,
                                    typeof video.height === 'number' ? video.height : 1080
                                  )
                                  return
                                }
                                const w = evenDim(n)
                                if (constrainAspect) {
                                  const h = evenDim(w / aspectRatio(video))
                                  patchVideo({ width: w, height: h })
                                  syncSizeFields(w, h)
                                } else {
                                  patchVideo({ width: w })
                                  setWidthText(String(w))
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            className={`ex-aspect-lock ${constrainAspect ? 'locked' : ''}`}
                            disabled={!editable || !exportVideo}
                            title={
                              constrainAspect
                                ? 'Constrain width and height (on)'
                                : 'Constrain width and height (off)'
                            }
                            aria-pressed={constrainAspect}
                            aria-label="Constrain aspect ratio"
                            onClick={() => setConstrainAspect((v) => !v)}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              aria-hidden="true"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                            >
                              {constrainAspect ? (
                                <>
                                  <path d="M5.5 6.5H4a2.5 2.5 0 0 0 0 5h3" />
                                  <path d="M10.5 9.5H12a2.5 2.5 0 0 0 0-5H9" />
                                  <path d="M6.5 8.5h3" />
                                </>
                              ) : (
                                <>
                                  <path d="M5.5 5.5H4a2.5 2.5 0 0 0 0 5h2" />
                                  <path d="M10.5 10.5H12a2.5 2.5 0 0 0 0-5h-2" />
                                </>
                              )}
                            </svg>
                          </button>
                          <label className="ex-size-dim" htmlFor="ex-h">
                            <span>H</span>
                            <input
                              id="ex-h"
                              type="text"
                              inputMode="numeric"
                              autoComplete="off"
                              spellCheck={false}
                              disabled={!editable || !exportVideo}
                              value={heightText}
                              onChange={(e) => setHeightText(e.target.value.replace(/[^\d]/g, ''))}
                              onBlur={() => {
                                const n = Number.parseInt(heightText, 10)
                                if (!Number.isFinite(n) || n <= 0) {
                                  syncSizeFields(
                                    typeof video.width === 'number' ? video.width : 1920,
                                    typeof video.height === 'number' ? video.height : 1080
                                  )
                                  return
                                }
                                const h = evenDim(n)
                                if (constrainAspect) {
                                  const w = evenDim(h * aspectRatio(video))
                                  patchVideo({ width: w, height: h })
                                  syncSizeFields(w, h)
                                } else {
                                  patchVideo({ height: h })
                                  setHeightText(String(h))
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    ) : null}
                    <Field label="Frame rate">
                      <Select
                        id="ex-fps"
                        disabled={!editable || !exportVideo}
                        value={
                          !video.frameRate || video.frameRate === 'match'
                            ? 'match'
                            : String(video.frameRate)
                        }
                        options={FRAME_RATE_OPTIONS}
                        onChange={(v) =>
                          patchVideo({ frameRate: v === 'match' ? 'match' : v })
                        }
                      />
                    </Field>
                  </div>
                </section>

                <section className="ex-section">
                  <h3>Bitrate & quality</h3>
                  <div className="ex-grid">
                    <Field label="Rate control" hint={BITRATE_MODES.find((m) => m.id === (video.bitrateMode ?? 'vbr1'))?.hint}>
                      <Select
                        id="ex-mode"
                        disabled={!editable || !exportVideo}
                        value={video.bitrateMode ?? 'vbr1'}
                        options={BITRATE_MODES.map((m) => ({
                          value: m.id,
                          label: m.label
                        }))}
                        onChange={(v) => patchVideo({ bitrateMode: v as BitrateMode })}
                      />
                    </Field>
                    {usesQuality(video) ? (
                      <Field label={video.bitrateMode === 'cq' ? 'CQ value' : 'CRF value'}>
                        <Select
                          id="ex-crf"
                          disabled={!editable || !exportVideo}
                          value={String(video.crf ?? 23)}
                          options={CRF_PRESETS}
                          onChange={(v) => patchVideo({ crf: Number(v) })}
                        />
                      </Field>
                    ) : null}
                    {usesBitrate(video) ? (
                      <>
                        <Field label="Target bitrate">
                          <Select
                            id="ex-br"
                            disabled={!editable || !exportVideo}
                            value={String(video.bitrateKbps ?? 8000)}
                            options={VIDEO_BITRATE_PRESETS}
                            onChange={(v) => patchVideo({ bitrateKbps: Number(v) })}
                          />
                        </Field>
                        <Field label="Max bitrate">
                          <Select
                            id="ex-maxbr"
                            disabled={!editable || !exportVideo}
                            value={String(
                              video.maxBitrateKbps ??
                                Math.round((video.bitrateKbps ?? 8000) * 1.5)
                            )}
                            options={VIDEO_BITRATE_PRESETS}
                            onChange={(v) => patchVideo({ maxBitrateKbps: Number(v) })}
                          />
                        </Field>
                      </>
                    ) : null}
                    <Field label="GOP / keyframe interval">
                      <Select
                        id="ex-gop"
                        disabled={!editable || !exportVideo}
                        value={video.gop != null ? String(video.gop) : ''}
                        options={GOP_PRESETS}
                        onChange={(v) =>
                          patchVideo({ gop: v ? Number(v) : undefined })
                        }
                      />
                    </Field>
                  </div>
                </section>
              </>
            ) : null}

            {tab === 'audio' ? (
              <section className="ex-section">
                <h3>Audio</h3>
                {!exportAudio ? (
                  <p className="ex-empty">Export Audio is off. Enable it in the header to edit these settings.</p>
                ) : (
                  <div className="ex-grid">
                    <Field label="Audio codec">
                      <Select
                        id="ex-acodec"
                        disabled={!editable}
                        value={audio.codec}
                        options={AUDIO_CODEC_OPTIONS.map((o) => ({
                          value: o.id,
                          label: o.label
                        }))}
                        onChange={(codec) => {
                          const opt = getAudioCodecOption(codec)
                          patchAudio({
                            enabled: true,
                            codec,
                            ...(opt?.lossless
                              ? { bitrateKbps: undefined }
                              : {
                                  bitrateKbps: opt?.bitrateKbps ?? audio.bitrateKbps ?? 320
                                })
                          })
                        }}
                      />
                    </Field>
                    {!getAudioCodecOption(audio.codec)?.lossless && audio.codec !== 'none' ? (
                      <Field label="Audio bitrate">
                        <Select
                          id="ex-abr"
                          disabled={!editable}
                          value={String(audio.bitrateKbps ?? 320)}
                          options={AUDIO_BITRATE_OPTIONS.map((kbps) => ({
                            value: String(kbps),
                            label: `${kbps} kbps`
                          }))}
                          onChange={(v) => patchAudio({ bitrateKbps: Number(v) })}
                        />
                      </Field>
                    ) : null}
                    <Field label="Sample rate">
                      <Select
                        id="ex-ar"
                        disabled={!editable}
                        value={
                          audio.sampleRate === 'match' || audio.sampleRate == null
                            ? 'match'
                            : String(audio.sampleRate)
                        }
                        options={SAMPLE_RATES}
                        onChange={(v) =>
                          patchAudio({
                            sampleRate: v === 'match' ? 'match' : Number(v)
                          })
                        }
                      />
                    </Field>
                    <Field label="Channels">
                      <Select
                        id="ex-ac"
                        disabled={!editable}
                        value={
                          audio.channels === 'match' || audio.channels == null
                            ? 'match'
                            : String(audio.channels)
                        }
                        options={CHANNEL_OPTIONS}
                        onChange={(v) =>
                          patchAudio({
                            channels: v === 'match' ? 'match' : Number(v)
                          })
                        }
                      />
                    </Field>
                  </div>
                )}
              </section>
            ) : null}

            {tab === 'advanced' ? (
              <section className="ex-section">
                <h3>Advanced</h3>
                <p className="ex-help">
                  Optional FFmpeg extras for power users. Leave blank unless you need them.
                </p>
                <div className="ex-stack">
                  <Field label="Extra FFmpeg arguments" hint="Space-separated, no input/output paths">
                    <input
                      id="ex-extra"
                      disabled={!editable}
                      value={extraArgsText}
                      onChange={(e) => setExtraArgsText(e.target.value)}
                      placeholder="-movflags +faststart"
                    />
                  </Field>
                  <Field label="Video filters" hint="Comma-separated filtergraph">
                    <input
                      id="ex-vf"
                      disabled={!editable}
                      value={filtersText}
                      onChange={(e) => setFiltersText(e.target.value)}
                      placeholder="scale=1920:1080,fps=24"
                    />
                  </Field>
                  <Field label="Output file">
                    <input value={focus.outputPath} readOnly />
                  </Field>
                </div>
              </section>
            ) : null}
          </div>
        </div>

        <footer className="ex-footer">
          <div className="ex-save">
            <input
              value={saveName}
              disabled={!editable || saving}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Custom preset name"
              aria-label="Custom preset name"
            />
            <button type="button" disabled={!editable || saving} onClick={() => void saveAsPreset()}>
              Save as Custom Preset
            </button>
          </div>
          <div className="ex-actions">
            {error ? <span className="ex-error">{error}</span> : null}
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="primary"
              disabled={!editable}
              onClick={() => void apply()}
            >
              OK
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
