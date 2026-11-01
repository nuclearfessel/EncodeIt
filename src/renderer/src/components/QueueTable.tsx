import { audioCodecLabel } from '../../../shared/audioCodecs'
import { hasCustomOverrides } from '../../../shared/effectiveSettings'
import type { PresetDefinition, QueueJob } from '../../../shared/types'
import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { usePathPicker } from '../pathPicker/PathPickerContext'
import { ButtonContent } from './ButtonContent'
import { Check, CircleX, LoaderCircle, Plus, iconSize } from './icons'

interface Props {
  jobs: QueueJob[]
  selectedIds: string[]
  onSelect: (ids: string[]) => void
  presetName: (id: string) => string
  presets: PresetDefinition[]
  onAdd: () => void
  onOpenExportSettings: (jobIds: string[]) => void
  onRemove: (ids: string[]) => void
  onDuplicate: (ids: string[]) => void
}

interface ContextMenuState {
  x: number
  y: number
  ids: string[]
}

interface MarqueeState {
  x0: number
  y0: number
  x1: number
  y1: number
}

function basename(filePath: string): string {
  return filePath.replace(/^.*[\\/]/, '')
}

function rangeSelect(jobIds: string[], fromId: string, toId: string): string[] {
  const a = jobIds.indexOf(fromId)
  const b = jobIds.indexOf(toId)
  if (a < 0 || b < 0) return [toId]
  const [lo, hi] = a < b ? [a, b] : [b, a]
  return jobIds.slice(lo, hi + 1)
}

export function QueueTable({
  jobs,
  selectedIds,
  onSelect,
  presetName,
  presets,
  onAdd,
  onOpenExportSettings,
  onRemove,
  onDuplicate
}: Props) {
  const pathPicker = usePathPicker()
  const [detailId, setDetailId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [marquee, setMarquee] = useState<MarqueeState | null>(null)
  const anchorIdRef = useRef<string | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const jobIds = jobs.map((j) => j.id)

  function resolvePreset(id: string) {
    return presets.find((p) => p.id === id)
  }

  const closeContext = useCallback(() => setContextMenu(null), [])

  useEffect(() => {
    if (!contextMenu) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (t?.closest('.ui-context-menu')) return
      closeContext()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContext()
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [contextMenu, closeContext])

  function selectClick(id: string, e: ReactMouseEvent) {
    if (e.shiftKey && anchorIdRef.current) {
      onSelect(rangeSelect(jobIds, anchorIdRef.current, id))
      return
    }
    if (e.ctrlKey || e.metaKey) {
      const next = selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
      onSelect(next)
      anchorIdRef.current = id
      return
    }
    onSelect([id])
    anchorIdRef.current = id
  }

  function onRowContextMenu(e: ReactMouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    const ids = selectedIds.includes(id) ? selectedIds : [id]
    if (!selectedIds.includes(id)) {
      onSelect([id])
      anchorIdRef.current = id
    }
    setContextMenu({ x: e.clientX, y: e.clientY, ids })
  }

  function beginMarquee(e: ReactMouseEvent) {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('.queue-card') || target.closest('button') || target.closest('a')) return
    e.preventDefault()
    const additive = e.ctrlKey || e.metaKey
    const wrap = wrapRef.current
    if (!wrap) return
    const rect = wrap.getBoundingClientRect()
    const x0 = e.clientX - rect.left + wrap.scrollLeft
    const y0 = e.clientY - rect.top + wrap.scrollTop
    setMarquee({ x0, y0, x1: x0, y1: y0 })
    setContextMenu(null)

    const onMove = (ev: MouseEvent) => {
      const x1 = ev.clientX - rect.left + wrap.scrollLeft
      const y1 = ev.clientY - rect.top + wrap.scrollTop
      setMarquee({ x0, y0, x1, y1 })
    }
    const onUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const x1 = ev.clientX - rect.left + wrap.scrollLeft
      const y1 = ev.clientY - rect.top + wrap.scrollTop
      const left = Math.min(x0, x1)
      const right = Math.max(x0, x1)
      const top = Math.min(y0, y1)
      const bottom = Math.max(y0, y1)
      const hit: string[] = []
      for (const [id, el] of rowRefs.current) {
        const r = el.getBoundingClientRect()
        const rl = r.left - rect.left + wrap.scrollLeft
        const rr = r.right - rect.left + wrap.scrollLeft
        const rt = r.top - rect.top + wrap.scrollTop
        const rb = r.bottom - rect.top + wrap.scrollTop
        if (rl < right && rr > left && rt < bottom && rb > top) hit.push(id)
      }
      if (hit.length) {
        onSelect(additive ? [...new Set([...selectedIds, ...hit])] : hit)
      } else if (!additive) {
        onSelect([])
        anchorIdRef.current = null
      }
      setMarquee(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  if (!jobs.length) {
    return (
      <div className="empty">
        <div>
          <strong>Drop media here</strong>
          <div>or use Add Source to add files to the encode queue</div>
          <div style={{ marginTop: '0.85rem' }}>
            <button type="button" className="primary btn-with-icon" onClick={onAdd}>
              <ButtonContent icon={Plus}>Add Source…</ButtonContent>
            </button>
          </div>
        </div>
      </div>
    )
  }

  const marqueeStyle = marquee
    ? {
        left: Math.min(marquee.x0, marquee.x1),
        top: Math.min(marquee.y0, marquee.y1),
        width: Math.abs(marquee.x1 - marquee.x0),
        height: Math.abs(marquee.y1 - marquee.y0)
      }
    : null

  return (
    <div
      className="queue-list-wrap"
      ref={wrapRef}
      onMouseDown={beginMarquee}
      onClick={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('queue-list')) {
          onSelect([])
          anchorIdRef.current = null
          closeContext()
        }
      }}
    >
      <div className="queue-list" role="listbox" aria-multiselectable="true">
        {jobs.map((job) => {
          const tracks = (() => {
            const parts: string[] = []
            if (job.exportVideo) parts.push('V')
            if (job.exportAudio) {
              const codec =
                job.audioOverrides?.codec ?? resolvePreset(job.presetId)?.audio.codec
              parts.push(codec ? `A · ${audioCodecLabel(codec)}` : 'A')
            }
            return parts.join(' + ') || '—'
          })()

          return (
            <div
              key={job.id}
              role="option"
              aria-selected={selectedIds.includes(job.id)}
              className={`queue-card ${selectedIds.includes(job.id) ? 'selected' : ''}`}
              ref={(el) => {
                if (el) rowRefs.current.set(job.id, el)
                else rowRefs.current.delete(job.id)
              }}
              onClick={(e) => selectClick(job.id, e)}
              onContextMenu={(e) => onRowContextMenu(e, job.id)}
              onDoubleClick={(e) => {
                e.stopPropagation()
                if (job.status === 'encoding') return
                onSelect([job.id])
                onOpenExportSettings([job.id])
              }}
            >
              <div className="queue-card-top">
                <div className="queue-card-identity">
                  <div className="queue-card-title" title={job.sourcePath}>
                    {basename(job.sourcePath)}
                  </div>
                  <div className="queue-card-path" title={job.sourcePath}>
                    {job.sourcePath}
                  </div>
                </div>
                <div className="queue-card-aside">
                  <span className={`status ${job.status}`}>
                    <span className="status-icon" aria-hidden="true">
                      {job.status === 'done' ? (
                        <Check size={iconSize.sm} strokeWidth={2} />
                      ) : job.status === 'error' ? (
                        <CircleX size={iconSize.sm} strokeWidth={2} />
                      ) : job.status === 'encoding' ? (
                        <LoaderCircle size={iconSize.sm} strokeWidth={2} className="spin" />
                      ) : (
                        <i className="status-dot" />
                      )}
                    </span>
                    {job.status}
                  </span>
                  <div
                    className="queue-card-progress"
                    title={`${Math.round(job.progress)}%${job.speed ? ` · ${job.speed}` : ''}`}
                  >
                    <div className="progress">
                      <i style={{ width: `${Math.max(0, Math.min(100, job.progress))}%` }} />
                    </div>
                    <span className="queue-progress-meta">
                      {Math.round(job.progress)}%{job.speed ? ` · ${job.speed}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              <div className="queue-card-meta">
                <div className="queue-meta-item">
                  <span className="queue-meta-label">Preset</span>
                  <button
                    type="button"
                    className="linkish queue-preset-link"
                    title="Export Settings…"
                    disabled={job.status === 'encoding'}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect([job.id])
                      onOpenExportSettings([job.id])
                    }}
                  >
                    {presetName(job.presetId)}
                    {hasCustomOverrides(job) ? <span className="custom-tag">custom</span> : null}
                  </button>
                </div>
                <div className="queue-meta-item">
                  <span className="queue-meta-label">Format</span>
                  <button
                    type="button"
                    className="linkish queue-preset-link"
                    title="Export Settings…"
                    disabled={job.status === 'encoding'}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect([job.id])
                      onOpenExportSettings([job.id])
                    }}
                  >
                    {job.formatId}
                  </button>
                </div>
                <div className="queue-meta-item">
                  <span className="queue-meta-label">Tracks</span>
                  <span className="queue-meta-value">{tracks}</span>
                </div>
                <div className="queue-meta-item queue-meta-output">
                  <span className="queue-meta-label">Output</span>
                  <div className="queue-output-line">
                    <button
                      type="button"
                      className="linkish"
                      title="Click to rename / Save As…"
                      disabled={job.status === 'encoding'}
                      onClick={(e) => {
                        e.stopPropagation()
                        void (async () => {
                          const chosen = await pathPicker.saveFile(job.outputPath)
                          if (!chosen) return
                          await window.EncodeIt.setOutputPath([job.id], chosen)
                        })()
                      }}
                    >
                      {basename(job.outputPath)}
                    </button>
                    {job.customOutputPath ? <span className="custom-tag">custom</span> : null}
                  </div>
                </div>
              </div>

              {job.error ? (
                <div className="queue-card-error error-text-wrap">
                  <div className="error-text" title={job.error}>
                    {detailId === job.id ? job.error : job.error.slice(0, 120)}
                    {detailId !== job.id && job.error.length > 120 ? '…' : ''}
                  </div>
                  <div className="error-actions">
                    <button
                      type="button"
                      className="linkish"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDetailId((id) => (id === job.id ? null : job.id))
                      }}
                    >
                      {detailId === job.id ? 'Hide details' : 'Show details'}
                    </button>
                    <button
                      type="button"
                      className="linkish"
                      onClick={(e) => {
                        e.stopPropagation()
                        void navigator.clipboard.writeText(job.error || '').then(() => {
                          setCopiedId(job.id)
                          window.setTimeout(() => setCopiedId(null), 1200)
                        })
                      }}
                    >
                      {copiedId === job.id ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {marqueeStyle ? <div className="queue-marquee" style={marqueeStyle} /> : null}

      {contextMenu ? (
        <div
          className="ui-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
        >
          <button
            type="button"
            className="ui-context-item"
            role="menuitem"
            onClick={() => {
              onDuplicate(contextMenu.ids)
              closeContext()
            }}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="ui-context-item"
            role="menuitem"
            onClick={() => {
              onRemove(contextMenu.ids)
              closeContext()
            }}
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  )
}
