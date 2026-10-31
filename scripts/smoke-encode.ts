import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'
import { buildFfmpegArgs } from '../src/shared/buildCommand'
import { DEFAULT_PRESET_ID } from '../src/shared/presets'
import type { AppSettings, QueueJob } from '../src/shared/types'

async function run(cmd: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', windowsHide: true })
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${code}`))))
  })
}

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'encodeit-smoke-'))
  const src = path.join(dir, 'src.mp4')
  await run('ffmpeg', [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    'testsrc2=size=640x360:rate=24:duration=0.5',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:sample_rate=48000:duration=0.5',
    '-shortest',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    src
  ])

  const settings: AppSettings = {
    ffmpegPath: 'ffmpeg',
    ffprobePath: 'ffprobe',
    outputDirectory: dir,
    maxConcurrent: 1,
    overwriteOutput: true,
    hardwareAcceleration: 'none',
    intakeEnabled: false,
    intakePort: 47821,
    watchFolders: [],
    hostFoldersSeeded: true
  }

  const job: QueueJob = {
    id: 'smoke',
    sourcePath: src,
    outputPath: '',
    formatId: 'h264',
    presetId: DEFAULT_PRESET_ID,
    status: 'waiting',
    progress: 0,
    createdAt: Date.now(),
    media: { path: src, duration: 0.5, streams: [] },
    exportVideo: true,
    exportAudio: true
  }

  const built = buildFfmpegArgs(job, settings, job.media)
  await run('ffmpeg', built.args)
  if (!fs.existsSync(built.outputPath)) throw new Error('missing output')
  console.log('SMOKE_OK', built.outputPath)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
