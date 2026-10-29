import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { resolveRedirect } from './download-ffmpeg.mjs'

describe('resolveRedirect', () => {
  it('resolves relative Location against current URL', () => {
    const resolved = resolveRedirect(
      'https://ffmpeg.martin-riedl.de/redirect/latest/macos/arm64/release/ffmpeg.zip',
      '/download/macos/arm64/1789931890_9.0.2/ffmpeg.zip'
    )
    assert.equal(
      resolved,
      'https://ffmpeg.martin-riedl.de/download/macos/arm64/1789931890_9.0.2/ffmpeg.zip'
    )
  })

  it('keeps absolute Location unchanged', () => {
    const abs = 'https://cdn.example.com/ffmpeg.zip'
    assert.equal(resolveRedirect('https://example.com/r', abs), abs)
  })
})
