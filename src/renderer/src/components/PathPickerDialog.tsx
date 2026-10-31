import { useCallback, useEffect, useState } from 'react'
import { basename, joinPath } from '../../../shared/pathUtil'
import {
  ArrowUp,
  File,
  FileAudio,
  FileImage,
  FileVideo,
  Folder,
  RefreshCw,
  Search,
  iconSize,
  mediaKindIcon
} from './icons'

export type PathPickerMode = 'openFiles' | 'openDirectory' | 'saveFile'

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
  isRoots?: boolean
}

interface Props {
  mode: PathPickerMode
  title: string
  startPath?: string
  defaultFileName?: string
  onCancel: () => void
  onConfirm: (value: string[] | string) => void
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

function listModeFor(mode: PathPickerMode): 'media' | 'directories' | 'files' {
  if (mode === 'openDirectory') return 'directories'
  if (mode === 'saveFile') return 'files'
  return 'media'
}

export function PathPickerDialog({
  mode,
  title,
  startPath,
  defaultFileName,
  onCancel,
  onConfirm
}: Props) {
  const [listing, setListing] = useState<BrowserListing | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [filter, setFilter] = useState('')
  const [fileName, setFileName] = useState(defaultFileName || 'output.mp4')

  const load = useCallback(
    async (dir?: string) => {
      setError(null)
      try {
        const next = await window.EncodeIt.listDirectory(dir, listModeFor(mode))
        setListing(next)
        setSelected(mode === 'openDirectory' && !next.isRoots ? [next.path] : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    },
    [mode]
  )

  useEffect(() => {
    void load(startPath)
  }, [load, startPath])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  function toggleSelect(entry: BrowserEntry, additive: boolean) {
    if (mode === 'openDirectory') {
      if (entry.kind === 'dir') setSelected([entry.path])
      return
    }
    if (mode === 'saveFile') {
      if (entry.kind === 'dir') return
      setSelected([entry.path])
      setFileName(entry.name)
      return
    }
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
    if (mode === 'openFiles' && entry.kind === 'media') {
      onConfirm([entry.path])
      return
    }
    if (mode === 'saveFile') {
      setFileName(entry.name)
      setSelected([entry.path])
    }
  }

  function confirm() {
    if (mode === 'openFiles') {
      if (!selected.length) return
      onConfirm(selected)
      return
    }
    if (mode === 'openDirectory') {
      const dir = selected[0] || (listing && !listing.isRoots ? listing.path : null)
      if (!dir) return
      onConfirm(dir)
      return
    }
    const name = fileName.trim()
    if (!name || !listing || listing.isRoots) return
    onConfirm(joinPath(listing.path, name))
  }

  const query = filter.trim().toLowerCase()
  const entries =
    listing?.entries.filter((e) => !query || e.name.toLowerCase().includes(query)) ?? []

  const canConfirm =
    mode === 'openFiles'
      ? selected.length > 0
      : mode === 'openDirectory'
        ? Boolean(selected[0] || (listing && !listing.isRoots))
        : Boolean(fileName.trim() && listing && !listing.isRoots)

  const confirmLabel =
    mode === 'openFiles'
      ? `Add${selected.length ? ` (${selected.length})` : ''}`
      : mode === 'openDirectory'
        ? 'Select Folder'
        : 'Save'

  return (
    <div className="prefs-backdrop path-picker-backdrop" role="presentation" onMouseDown={onCancel}>
      <div
        className="path-picker-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="path-picker-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="prefs-header">
          <h2 id="path-picker-title">{title}</h2>
          <button type="button" className="icon-btn" title="Close" onClick={onCancel}>
            ×
          </button>
        </header>

        <div className="path-picker-toolbar">
          <button
            type="button"
            className="icon-btn"
            title="Up"
            disabled={!listing?.parent}
            onClick={() => {
              if (listing?.parent) void load(listing.parent)
            }}
          >
            <ArrowUp size={iconSize.md} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="icon-btn"
            title="Locations"
            onClick={() => void load(undefined)}
          >
            <Folder size={iconSize.md} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="icon-btn"
            title="Refresh"
            onClick={() => void load(listing?.isRoots ? undefined : listing?.path)}
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

        <div className="path-picker-list">
          {error ? <div className="media-browser-error">{error}</div> : null}
          {!error && entries.length === 0 ? (
            <div className="media-browser-empty">Nothing here</div>
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
            >
              <span className={`media-browser-icon ${entry.kind}`}>
                <EntryIcon kind={entry.kind} name={entry.name} />
              </span>
              <span className="media-browser-name">{entry.name}</span>
            </button>
          ))}
        </div>

        {mode === 'saveFile' ? (
          <label className="path-picker-filename">
            <span>File name</span>
            <input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canConfirm) confirm()
              }}
            />
          </label>
        ) : null}

        {mode === 'saveFile' && listing && !listing.isRoots ? (
          <div className="path-picker-preview" title={joinPath(listing.path, fileName.trim())}>
            {joinPath(listing.path, fileName.trim() || basename(startPath || 'output'))}
          </div>
        ) : null}

        <footer className="prefs-footer">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="primary"
            disabled={!canConfirm}
            onClick={confirm}
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  )
}
