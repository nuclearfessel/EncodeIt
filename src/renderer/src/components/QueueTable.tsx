import { audioCodecLabel } from '../../../shared/audioCodecs'
import { getPreset } from '../../../shared/presets'
import type { QueueJob } from '../../../shared/types'
import { usePathPicker } from '../pathPicker/PathPickerContext'
import { ButtonContent } from './ButtonContent'
import {
  Check,
  CircleX,
  LoaderCircle,
  Plus,
  iconSize
} from './icons'

interface Props {
  jobs: QueueJob[]
  selectedIds: string[]
  onSelect: (ids: string[]) => void
  presetName: (id: string) => string
  onAdd: () => void
}

function basename(filePath: string): string {
  return filePath.replace(/^.*[\\/]/, '')
}

export function QueueTable({ jobs, selectedIds, onSelect, presetName, onAdd }: Props) {
  const pathPicker = usePathPicker()

  function toggle(id: string, additive: boolean) {
    if (!additive) {
      onSelect([id])
      return
    }
    onSelect(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
    )
  }

  if (!jobs.length) {
    return (
      <div className="empty">
        <div>
          <strong>Drop media here</strong>
          <div>or use Add Source — queue encodes like Adobe Media Encoder / Shutter Encoder</div>
          <div style={{ marginTop: '0.85rem' }}>
            <button type="button" className="primary btn-with-icon" onClick={onAdd}>
              <ButtonContent icon={Plus}>Add Source…</ButtonContent>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="queue-table-wrap">
      <table className="queue-table">
        <thead>
          <tr>
            <th>Source</th>
            <th>Preset</th>
            <th>Format</th>
            <th>Tracks</th>
            <th>Status</th>
            <th>Progress</th>
            <th>Output</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr
              key={job.id}
              className={selectedIds.includes(job.id) ? 'selected' : ''}
              onClick={(e) => toggle(job.id, e.metaKey || e.ctrlKey)}
            >
              <td>
                <div className="file-cell">
                  <strong title={job.sourcePath}>{basename(job.sourcePath)}</strong>
                  <span title={job.sourcePath}>{job.sourcePath}</span>
                </div>
              </td>
              <td>{presetName(job.presetId)}</td>
              <td>{job.formatId}</td>
              <td style={{ fontSize: '0.72rem', color: '#9aa6b5' }}>
                {(() => {
                  const parts: string[] = []
                  if (job.exportVideo) parts.push('V')
                  if (job.exportAudio) {
                    const codec =
                      job.audioOverrides?.codec ?? getPreset(job.presetId)?.audio.codec
                    parts.push(codec ? `A · ${audioCodecLabel(codec)}` : 'A')
                  }
                  return parts.join(' + ') || '—'
                })()}
              </td>
              <td>
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
                {job.error ? (
                  <div className="error-text" title={job.error}>
                    {job.error}
                  </div>
                ) : null}
              </td>
              <td>
                <div className="progress" title={`${Math.round(job.progress)}%`}>
                  <i style={{ width: `${Math.max(0, Math.min(100, job.progress))}%` }} />
                </div>
                <div style={{ fontSize: '0.7rem', color: '#6b7787', marginTop: 4 }}>
                  {Math.round(job.progress)}%
                  {job.speed ? ` · ${job.speed}` : ''}
                </div>
              </td>
              <td>
                <div className="file-cell">
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
                        await window.encodeThis.setOutputPath([job.id], chosen)
                      })()
                    }}
                  >
                    {basename(job.outputPath)}
                  </button>
                  {job.customOutputPath ? (
                    <span className="custom-tag">custom</span>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
