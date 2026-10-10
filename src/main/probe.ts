import { spawn } from 'child_process'
import type { MediaInfo, MediaStreamInfo } from '../shared/types'

interface FfprobeJson {
  format?: {
    filename?: string
    format_name?: string
    duration?: string
    size?: string
    bit_rate?: string
  }
  streams?: Array<{
    index: number
    codec_type?: string
    codec_name?: string
    width?: number
    height?: number
    avg_frame_rate?: string
    duration?: string
    bit_rate?: string
    sample_rate?: string
    channels?: number
    pix_fmt?: string
  }>
}

export async function probeMedia(ffprobePath: string, filePath: string): Promise<MediaInfo> {
  const raw = await new Promise<string>((resolve, reject) => {
    const args = [
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      filePath
    ]
    const child = spawn(ffprobePath, args, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d: Buffer) => {
      stdout += d.toString()
    })
    child.stderr.on('data', (d: Buffer) => {
      stderr += d.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve(stdout)
      else reject(new Error(stderr || `ffprobe failed (${code})`))
    })
  })

  const data = JSON.parse(raw) as FfprobeJson
  const streams: MediaStreamInfo[] = (data.streams ?? []).map((s) => ({
    index: s.index,
    codecType: s.codec_type ?? 'data',
    codecName: s.codec_name,
    width: s.width,
    height: s.height,
    frameRate: s.avg_frame_rate,
    duration: s.duration ? Number(s.duration) : undefined,
    bitRate: s.bit_rate ? Number(s.bit_rate) : undefined,
    sampleRate: s.sample_rate ? Number(s.sample_rate) : undefined,
    channels: s.channels,
    pixFmt: s.pix_fmt
  }))

  return {
    path: filePath,
    formatName: data.format?.format_name,
    duration: data.format?.duration ? Number(data.format.duration) : undefined,
    size: data.format?.size ? Number(data.format.size) : undefined,
    bitRate: data.format?.bit_rate ? Number(data.format.bit_rate) : undefined,
    streams
  }
}
