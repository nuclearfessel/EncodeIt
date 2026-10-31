import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  diffVideoSettings,
  hasCustomOverrides,
  mergeVideoSettings
} from './effectiveSettings'
import type { QueueJob, VideoSettings } from './types'

const base: VideoSettings = {
  codec: 'libx264',
  profile: 'high',
  width: 'match',
  height: 'match',
  frameRate: 'match',
  bitrateMode: 'vbr1',
  bitrateKbps: 8000
}

describe('effectiveSettings', () => {
  it('merges video overrides', () => {
    const merged = mergeVideoSettings(base, { bitrateKbps: 4000, width: 1920, height: 1080 })
    assert.equal(merged.bitrateKbps, 4000)
    assert.equal(merged.width, 1920)
    assert.equal(merged.codec, 'libx264')
  })

  it('diffs only changed video fields', () => {
    const next = { ...base, bitrateKbps: 5000, crf: 18, bitrateMode: 'crf' as const }
    const diff = diffVideoSettings(base, next)
    assert.deepEqual(diff, {
      bitrateKbps: 5000,
      crf: 18,
      bitrateMode: 'crf'
    })
  })

  it('detects custom overrides on a job', () => {
    const bare = { videoOverrides: undefined, audioOverrides: undefined } as QueueJob
    assert.equal(hasCustomOverrides(bare), false)
    assert.equal(
      hasCustomOverrides({ ...bare, videoOverrides: { bitrateKbps: 1 } }),
      true
    )
  })
})
