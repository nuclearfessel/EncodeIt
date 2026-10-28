import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildFfmpegArgs } from './buildCommand'
import { DEFAULT_PRESET_ID } from './presets'
import type { AppSettings, QueueJob } from './types'

function settings(overwrite: boolean): AppSettings {
  return {
    ffmpegPath: 'ffmpeg',
    ffprobePath: 'ffprobe',
    outputDirectory: '/tmp/out',
    maxConcurrent: 1,
    overwriteOutput: overwrite,
    hardwareAcceleration: 'none',
    intakeEnabled: false,
    intakePort: 47821,
    watchFolders: [],
    hostFoldersSeeded: false
  }
}

function job(): QueueJob {
  return {
    id: 'j1',
    sourcePath: '/tmp/in.mov',
    outputPath: '/tmp/out/in.mp4',
    formatId: 'h264',
    presetId: DEFAULT_PRESET_ID,
    status: 'waiting',
    progress: 0,
    createdAt: 1,
    exportVideo: true,
    exportAudio: true
  }
}

describe('buildFfmpegArgs overwrite flag', () => {
  it('passes -y when overwrite is enabled', () => {
    const built = buildFfmpegArgs(job(), settings(true))
    assert.equal(built.args.includes('-y'), true)
    assert.equal(built.args.includes('-n'), false)
  })

  it('passes -n when overwrite is disabled', () => {
    const built = buildFfmpegArgs(job(), settings(false))
    assert.equal(built.args.includes('-n'), true)
    assert.equal(built.args.includes('-y'), false)
  })
})
