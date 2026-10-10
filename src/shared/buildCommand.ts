import path from 'path'
import { getFormat } from './formats'
import {
  resolveHardwareAcceleration,
  type HardwareCapabilities,
  type HardwareAcceleration
} from './hardware'
import { getPreset } from './presets'
import type {
  AppSettings,
  AudioSettings,
  MediaInfo,
  PresetDefinition,
  QueueJob,
  VideoSettings
} from './types'

export interface BuiltCommand {
  args: string[]
  outputPath: string
  display: string
}

function mergeVideo(base: VideoSettings, over?: Partial<VideoSettings>): VideoSettings {
  return { ...base, ...over, extraArgs: [...(base.extraArgs ?? []), ...(over?.extraArgs ?? [])] }
}

function mergeAudio(base: AudioSettings, over?: Partial<AudioSettings>): AudioSettings {
  return { ...base, ...over, extraArgs: [...(base.extraArgs ?? []), ...(over?.extraArgs ?? [])] }
}

function sizeArgs(video: VideoSettings): string[] {
  if (video.width === 'match' || video.height === 'match' || video.width == null) return []
  if (video.height === -2 || video.width === -2) return []
  return ['-s', `${video.width}x${video.height}`]
}

function rateArgs(video: VideoSettings): string[] {
  if (!video.frameRate || video.frameRate === 'match') return []
  return ['-r', String(video.frameRate)]
}

function bitrateArgs(video: VideoSettings): string[] {
  const args: string[] = []
  if (video.bitrateMode === 'crf' && video.crf != null) {
    if (video.codec === 'libvpx' || video.codec === 'libvpx-vp9') {
      args.push('-b:v', '0', '-crf', String(video.crf))
    } else {
      args.push('-crf', String(video.crf))
    }
    return args
  }
  if (video.bitrateKbps != null) {
    args.push('-b:v', `${video.bitrateKbps}k`)
    if (video.maxBitrateKbps != null) {
      args.push('-maxrate', `${video.maxBitrateKbps}k`, '-bufsize', `${video.maxBitrateKbps * 2}k`)
    }
    if (video.bitrateMode === 'cbr' && video.bitrateKbps) {
      args.push('-minrate', `${video.bitrateKbps}k`)
    }
  }
  return args
}

function videoCodecArgs(
  video: VideoSettings,
  hw: Exclude<HardwareAcceleration, 'auto'>
): string[] {
  const args: string[] = []
  let codec = video.encoder ?? video.codec

  if (hw !== 'none' && (codec === 'libx264' || codec === 'libx265')) {
    if (hw === 'nvenc') codec = codec === 'libx265' ? 'hevc_nvenc' : 'h264_nvenc'
    if (hw === 'qsv') codec = codec === 'libx265' ? 'hevc_qsv' : 'h264_qsv'
    if (hw === 'amf') codec = codec === 'libx265' ? 'hevc_amf' : 'h264_amf'
    if (hw === 'videotoolbox') codec = codec === 'libx265' ? 'hevc_videotoolbox' : 'h264_videotoolbox'
  }

  if (codec === 'none') return ['-vn']
  if (codec === 'copy') return ['-c:v', 'copy']

  args.push('-c:v', codec)

  if (video.avcintraClass) {
    args.push('-avcintra-class', String(video.avcintraClass))
  } else if (video.proresProfile) {
    args.push('-profile:v', video.proresProfile)
  } else if (video.dnxProfile) {
    args.push('-profile:v', video.dnxProfile)
  } else if (video.profile) {
    args.push('-profile:v', video.profile)
  }

  if (video.level && !video.avcintraClass) args.push('-level:v', video.level)
  if (video.pixelFormat) args.push('-pix_fmt', video.pixelFormat)
  if (video.cineformQuality != null) args.push('-quality', String(video.cineformQuality))
  if (video.tag) args.push('-tag:v', video.tag)
  if (video.gop != null) args.push('-g', String(video.gop))
  if (video.bFrames != null) args.push('-bf', String(video.bFrames))
  if (video.quality != null && video.codec === 'mjpeg') args.push('-q:v', String(video.quality))

  args.push(...bitrateArgs(video))
  if (video.extraArgs?.length) args.push(...video.extraArgs)
  return args
}

function audioArgs(audio: AudioSettings, category: string): string[] {
  if (!audio.enabled || audio.codec === 'none' || category === 'still' || category === 'sequence') {
    return ['-an']
  }
  if (audio.codec === 'copy') {
    return ['-c:a', 'copy']
  }
  const args = ['-c:a', audio.codec]
  const skipBitrate =
    audio.codec.startsWith('pcm_') ||
    audio.codec === 'flac' ||
    audio.codec === 'alac' ||
    audio.codec === 'copy'
  if (!skipBitrate && audio.bitrateKbps) args.push('-b:a', `${audio.bitrateKbps}k`)
  if (audio.sampleRate && audio.sampleRate !== 'match') args.push('-ar', String(audio.sampleRate))
  if (audio.channels && audio.channels !== 'match') args.push('-ac', String(audio.channels))
  if (audio.extraArgs?.length) args.push(...audio.extraArgs)
  return args
}

function filterArgs(video: VideoSettings): string[] {
  if (!video.videoFilters?.length) return []
  if (video.videoFilters.some((f) => f.includes('[') || f.includes('palette'))) {
    return ['-filter_complex', video.videoFilters.join(';')]
  }
  return ['-vf', video.videoFilters.join(',')]
}

export function resolveOutputPath(
  sourcePath: string,
  preset: PresetDefinition,
  outputDirectory: string
): string {
  const format = getFormat(preset.formatId)
  const base = path.parse(sourcePath).name
  const ext = format?.extension ?? 'mp4'
  if (preset.sequence || format?.category === 'sequence' || format?.category === 'still') {
    if (format?.category === 'still' && !preset.sequence) {
      return path.join(outputDirectory, `${base}.${ext}`)
    }
    return path.join(outputDirectory, `${base}_%06d.${ext}`)
  }
  return path.join(outputDirectory, `${base}_${preset.id}.${ext}`)
}

export function buildFfmpegArgs(
  job: QueueJob,
  settings: AppSettings,
  media?: MediaInfo,
  hardware?: HardwareCapabilities
): BuiltCommand {
  const preset = getPreset(job.presetId)
  if (!preset) throw new Error(`Unknown preset: ${job.presetId}`)
  const format = getFormat(preset.formatId)
  if (!format) throw new Error(`Unknown format: ${preset.formatId}`)

  const exportVideo = job.exportVideo !== false
  const exportAudio = job.exportAudio !== false
  if (!exportVideo && !exportAudio) {
    throw new Error('Enable Export Video and/or Export Audio (same as Adobe Media Encoder).')
  }

  const hw = hardware
    ? resolveHardwareAcceleration(settings.hardwareAcceleration, hardware)
    : settings.hardwareAcceleration === 'auto'
      ? 'none'
      : settings.hardwareAcceleration

  const video = mergeVideo(preset.video, job.videoOverrides)
  const audio = mergeAudio(preset.audio, {
    ...job.audioOverrides,
    ...(exportAudio ? {} : { enabled: false, codec: 'none' })
  })
  const outputPath = job.outputPath || resolveOutputPath(job.sourcePath, preset, settings.outputDirectory)

  const args: string[] = ['-hide_banner', '-y']
  if (!settings.overwriteOutput) {
    // still use -y for queue clarity; UI warns before start
  }

  args.push('-i', job.sourcePath)

  const filters = exportVideo ? filterArgs(video) : []
  args.push(...filters)

  // When filters already scale/fps, skip redundant -s/-r for picky codecs
  const hasGeometryFilter = Boolean(video.videoFilters?.some((f) => f.includes('scale=') || f.includes('fps=')))
  if (exportVideo && !hasGeometryFilter) {
    args.push(...sizeArgs(video))
    args.push(...rateArgs(video))
  }

  if (!exportVideo || format.category === 'audio' || video.codec === 'none') {
    args.push('-vn')
    args.push(...audioArgs({ ...audio, enabled: exportAudio }, 'audio'))
  } else if (format.id === 'gif') {
    args.push('-an')
    // GIF filter_complex already set; avoid double -c:v gif conflicting with palette graph
    if (!filters.length) args.push('-c:v', 'gif')
  } else {
    args.push(...videoCodecArgs(video, hw))
    args.push(...audioArgs(audio, format.category))
  }

  if (preset.sequence || (format.category === 'still' && outputPath.includes('%'))) {
    args.push('-start_number', '0')
  } else if (format.category === 'still' && !preset.sequence) {
    args.push('-frames:v', '1', '-update', '1')
  }

  if (preset.muxerArgs?.length) args.push(...preset.muxerArgs)

  // Container hints
  if (format.container === 'mxf') args.push('-f', 'mxf')
  if (format.container === 'mpegts') args.push('-f', 'mpegts')
  if (format.id === 'audio-aac') args.push('-f', 'ipod')

  args.push(outputPath)

  // duration hint for progress (unused here but kept for callers via media)
  void media

  return {
    args,
    outputPath,
    display: `ffmpeg ${args.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ')}`
  }
}

export function estimateDurationSeconds(media?: MediaInfo): number | undefined {
  return media?.duration
}
