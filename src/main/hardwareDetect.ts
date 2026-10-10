import { spawn } from 'child_process'
import type { HardwareCapabilities } from '../shared/hardware'

let cache: HardwareCapabilities | null = null

function runFfmpeg(ffmpegPath: string, args: string[]): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(ffmpegPath, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let out = ''
    child.stdout?.on('data', (c: Buffer) => {
      out += c.toString()
    })
    child.stderr?.on('data', (c: Buffer) => {
      out += c.toString()
    })
    child.on('error', () => resolve(out))
    child.on('close', () => resolve(out))
  })
}

/**
 * Probe FFmpeg for hardware encoders available on this machine/build.
 */
export async function detectHardwareCapabilities(
  ffmpegPath: string,
  force = false
): Promise<HardwareCapabilities> {
  if (!force && cache && cache.ffmpegPath === ffmpegPath) {
    return cache
  }

  const text = await runFfmpeg(ffmpegPath, ['-hide_banner', '-encoders'])
  const has = (name: string) =>
    new RegExp(`(^|\\s)${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`, 'm').test(
      text
    )

  const encoders = [
    'h264_nvenc',
    'hevc_nvenc',
    'av1_nvenc',
    'h264_qsv',
    'hevc_qsv',
    'av1_qsv',
    'h264_amf',
    'hevc_amf',
    'av1_amf',
    'h264_videotoolbox',
    'hevc_videotoolbox',
    'prores_videotoolbox'
  ].filter((id) => has(id))

  cache = {
    platform: process.platform,
    ffmpegPath,
    nvenc: has('h264_nvenc') || has('hevc_nvenc'),
    qsv: has('h264_qsv') || has('hevc_qsv'),
    amf: has('h264_amf') || has('hevc_amf'),
    videotoolbox: has('h264_videotoolbox') || has('hevc_videotoolbox'),
    encoders,
    probedAt: Date.now()
  }
  return cache
}

export function clearHardwareCache(): void {
  cache = null
}
