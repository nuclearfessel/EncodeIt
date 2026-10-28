import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { pruneSeenSet, updateSettleSample } from './fileSettle'

describe('updateSettleSample', () => {
  it('requires stable size across polls and min age', () => {
    const now = 10_000
    const mtimeMs = now - 2000

    const first = updateSettleSample(undefined, 100, mtimeMs, { now, requiredStablePolls: 2 })
    assert.equal(first.settled, false)
    assert.equal(first.sample.stableCount, 1)

    const second = updateSettleSample(first.sample, 100, mtimeMs, {
      now: now + 3000,
      requiredStablePolls: 2
    })
    assert.equal(second.settled, true)
    assert.equal(second.sample.stableCount, 2)
  })

  it('resets when size changes', () => {
    const now = 10_000
    const mtimeMs = now - 5000
    const a = updateSettleSample(undefined, 100, mtimeMs, { now, requiredStablePolls: 2 })
    const b = updateSettleSample(a.sample, 200, mtimeMs, { now, requiredStablePolls: 2 })
    assert.equal(b.sample.size, 200)
    assert.equal(b.sample.stableCount, 1)
    assert.equal(b.settled, false)
  })

  it('waits for min age even if size is stable', () => {
    const now = 10_000
    const mtimeMs = now - 100
    let sample = updateSettleSample(undefined, 50, mtimeMs, {
      now,
      minAgeMs: 1500,
      requiredStablePolls: 2
    }).sample
    sample = updateSettleSample(sample, 50, mtimeMs, {
      now,
      minAgeMs: 1500,
      requiredStablePolls: 2
    }).sample
    const third = updateSettleSample(sample, 50, mtimeMs, {
      now,
      minAgeMs: 1500,
      requiredStablePolls: 2
    })
    assert.equal(third.settled, false)
  })
})

describe('pruneSeenSet', () => {
  it('keeps only existing paths and caps size', () => {
    const seen = new Set(['a', 'b', 'c', 'd'])
    const next = pruneSeenSet(seen, ['b', 'c', 'e'], 2)
    assert.equal(next.has('a'), false)
    assert.equal(next.has('e'), false)
    assert.ok(next.size <= 2)
    assert.ok([...next].every((k) => k === 'b' || k === 'c'))
  })
})
