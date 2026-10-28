import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

/** Mirrors Intake / inbox job shape validation used by host tools. */
function normalizeIntakePayload(raw: unknown): {
  paths: string[]
  presetId?: string
  start: boolean
} | null {
  if (!raw || typeof raw !== 'object') return null
  const body = raw as { paths?: unknown; presetId?: unknown; start?: unknown }
  if (!Array.isArray(body.paths)) return null
  const paths = body.paths.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
  if (!paths.length) return null
  return {
    paths,
    presetId: typeof body.presetId === 'string' ? body.presetId : undefined,
    start: Boolean(body.start)
  }
}

describe('normalizeIntakePayload', () => {
  it('accepts valid queue/add bodies', () => {
    const parsed = normalizeIntakePayload({
      paths: ['D:/a.mov', ''],
      presetId: 'h264-match-source-high-bitrate',
      start: true
    })
    assert.ok(parsed)
    assert.deepEqual(parsed.paths, ['D:/a.mov'])
    assert.equal(parsed.start, true)
  })

  it('rejects empty or invalid payloads', () => {
    assert.equal(normalizeIntakePayload(null), null)
    assert.equal(normalizeIntakePayload({ paths: [] }), null)
    assert.equal(normalizeIntakePayload({ paths: [1, 2] }), null)
  })
})
