/** Cross-platform path join for UI (no Node path module in renderer). */
export function joinPath(dir: string, name: string): string {
  if (!dir) return name
  if (!name) return dir
  const sep = dir.includes('\\') ? '\\' : '/'
  const trimmed = dir.endsWith('/') || dir.endsWith('\\') ? dir.slice(0, -1) : dir
  return `${trimmed}${sep}${name}`
}

export function basename(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || filePath
}

export function dirname(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const idx = normalized.lastIndexOf('/')
  if (idx <= 0) {
    // Windows drive root like C:
    if (/^[A-Za-z]:$/.test(normalized)) return filePath
    return idx === 0 ? '/' : filePath
  }
  const dir = filePath.slice(0, idx)
  // Preserve Windows drive root trailing slash style as "C:\"
  if (/^[A-Za-z]:$/i.test(dir.replace(/\\/g, '/'))) {
    return filePath.includes('\\') ? `${dir}\\` : `${dir}/`
  }
  return dir
}
