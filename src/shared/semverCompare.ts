/** Parse 1.2.3 or v1.2.3 → [1,2,3] */
export function parseVersion(input: string): number[] {
  const cleaned = input.trim().replace(/^v/i, '').split(/[-+]/)[0]
  return cleaned.split('.').map((p) => {
    const n = Number.parseInt(p, 10)
    return Number.isFinite(n) ? n : 0
  })
}

/** Return true if latest > current. */
export function isNewerVersion(latest: string, current: string): boolean {
  const a = parseVersion(latest)
  const b = parseVersion(current)
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x > y) return true
    if (x < y) return false
  }
  return false
}
