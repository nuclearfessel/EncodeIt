/** Pure helpers for watch-folder “file finished writing” detection. */

export interface SizeSample {
  size: number
  /** Consecutive polls where size was unchanged. */
  stableCount: number
}

export interface SettleOptions {
  /** Minimum age since mtime before considering settled (ms). */
  minAgeMs?: number
  /** Required consecutive identical-size polls. */
  requiredStablePolls?: number
  /** Current time (ms). */
  now?: number
}

const DEFAULTS = {
  minAgeMs: 1500,
  requiredStablePolls: 2
}

/**
 * Update settle state for a file. Returns true when the file looks finished
 * (old enough + size stable across enough polls).
 */
export function updateSettleSample(
  prev: SizeSample | undefined,
  size: number,
  mtimeMs: number,
  options: SettleOptions = {}
): { sample: SizeSample; settled: boolean } {
  const minAgeMs = options.minAgeMs ?? DEFAULTS.minAgeMs
  const required = options.requiredStablePolls ?? DEFAULTS.requiredStablePolls
  const now = options.now ?? Date.now()

  let sample: SizeSample
  if (!prev || prev.size !== size) {
    sample = { size, stableCount: 1 }
  } else {
    sample = { size, stableCount: prev.stableCount + 1 }
  }

  const oldEnough = now - mtimeMs >= minAgeMs
  const settled = oldEnough && sample.stableCount >= required
  return { sample, settled }
}

/** Keep at most `max` entries; drop keys not in `keep` first. */
export function pruneSeenSet(seen: Set<string>, keep: Iterable<string>, max = 5000): Set<string> {
  const keepSet = new Set(keep)
  const next = new Set<string>()
  for (const key of seen) {
    if (keepSet.has(key)) next.add(key)
  }
  if (next.size <= max) return next
  const trimmed = [...next].slice(-max)
  return new Set(trimmed)
}
