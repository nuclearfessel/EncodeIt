import type { QueueJob } from '../../../shared/types'

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
            <button type="button" className="primary" onClick={onAdd}>
              Add Source…
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
              <td>
                <span className={`status ${job.status}`}>
                  <i className="status-dot" />
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
                  <span title={job.outputPath}>{basename(job.outputPath)}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
