import { useCallback, useEffect, useState } from 'react'
import { usePathPicker } from '../pathPicker/PathPickerContext'
import {
  ArrowUp,
  File,
  FileAudio,
  FileImage,
  FileVideo,
  Folder,
  FolderOpen,
  RefreshCw,
  Search,
  iconSize,
  mediaKindIcon
} from './icons'
import { PanelHeader } from './PanelHeader'

interface BrowserEntry {
  name: string
  path: string
  kind: 'dir' | 'media' | 'other'
  size?: number
}

interface BrowserListing {
  path: string
  parent: string | null
  entries: BrowserEntry[]
}

interface Props {
  onAddMedia: (paths: string[]) => void
  floating?: boolean
}

function formatSize(bytes?: number): string {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function EntryIcon({ kind, name }: { kind: BrowserEntry['kind']; name: string }) {
  const type = mediaKindIcon(kind, name)
  const props = { size: iconSize.md, strokeWidth: 2 as const }
  if (type === 'folder') return <Folder {...props} />
  if (type === 'image') return <FileImage {...props} />
  if (type === 'audio') return <FileAudio {...props} />
  if (type === 'video') return <FileVideo {...props} />
  return <File {...props} />
}

export function MediaBrowser({ onAddMedia, floating }: Props) {
  const [listing, setListing] = useState<BrowserListing | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [filter, setFilter] = useState('')
  const pathPicker = usePathPicker()

  const load = useCallback(async (dir?: string) => {
    setError(null)
    try {
      const next = await window.encodeThis.listMediaDirectory(dir)
      setListing(next)
      setSelected([])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function pickRoot() {
    const dir = await pathPicker.openDirectory(listing?.path)
    if (dir) await load(dir)
  }

  function toggleSelect(entry: BrowserEntry, additive: boolean) {
    if (entry.kind !== 'media') return
    if (!additive) {
      setSelected([entry.path])
      return
    }
    setSelected((prev) =>
      prev.includes(entry.path) ? prev.filter((p) => p !== entry.path) : [...prev, entry.path]
    )
  }

  function openEntry(entry: BrowserEntry) {
    if (entry.kind === 'dir') {
      void load(entry.path)
      return
    }
    if (entry.kind === 'media') {
      onAddMedia([entry.path])
    }
  }

  const query = filter.trim().toLowerCase()
  const entries =
    listing?.entries.filter((e) => !query || e.name.toLowerCase().includes(query)) ?? []

  return (
    <aside className="panel media-browser">
      <PanelHeader title="Media Browser" panelId="media" floating={floating} />
      <div className="media-browser-toolbar">
        <button
          type="button"
          className="icon-btn"
          title="Up one folder"
          disabled={!listing?.parent}
          onClick={() => listing?.parent && void load(listing.parent)}
        >
          <ArrowUp size={iconSize.md} strokeWidth={2} />
        </button>
        <button
          type="button"
          className="icon-btn"
          title="Choose folder…"
          onClick={() => void pickRoot()}
        >
          <FolderOpen size={iconSize.md} strokeWidth={2} />
        </button>
        <button
          type="button"
          className="icon-btn"
          title="Refresh"
          onClick={() => void load(listing?.path)}
        >
          <RefreshCw size={iconSize.md} strokeWidth={2} />
        </button>
        <label className="media-browser-filter-wrap">
          <Search size={iconSize.sm} strokeWidth={2} aria-hidden="true" />
          <input
            className="media-browser-filter"
            placeholder="Filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </label>
      </div>
      <div className="media-browser-path" title={listing?.path}>
        {listing?.path ?? '…'}
      </div>
      <div className="media-browser-list">
        {error ? <div className="media-browser-error">{error}</div> : null}
        {!error && entries.length === 0 ? (
          <div className="media-browser-empty">No media in this folder</div>
        ) : null}
        {entries.map((entry) => (
          <button
            key={entry.path}
            type="button"
            className={`media-browser-row ${entry.kind} ${
              selected.includes(entry.path) ? 'selected' : ''
            }`}
            onClick={(e) => toggleSelect(entry, e.metaKey || e.ctrlKey)}
            onDoubleClick={() => openEntry(entry)}
            title={
              entry.kind === 'dir'
                ? 'Double-click to open'
                : 'Double-click to add to queue · modifier-click to multi-select'
            }
          >
            <span className={`media-browser-icon ${entry.kind}`}>
              <EntryIcon kind={entry.kind} name={entry.name} />
            </span>
            <span className="media-browser-name">{entry.name}</span>
            <span className="media-browser-meta">
              {entry.kind === 'dir' ? 'Folder' : formatSize(entry.size)}
            </span>
          </button>
        ))}
      </div>
      <div className="media-browser-footer">
        <button
          type="button"
          className="primary"
          disabled={!selected.length}
          onClick={() => onAddMedia(selected)}
        >
          Add to Queue{selected.length ? ` (${selected.length})` : ''}
        </button>
      </div>
    </aside>
  )
}
