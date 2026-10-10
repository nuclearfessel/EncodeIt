import type { AudioSettings, PresetDefinition, VideoSettings } from './types'

const aacStereo = (kbps = 320): AudioSettings => ({
  enabled: true,
  codec: 'aac',
  bitrateKbps: kbps,
  sampleRate: 48000,
  channels: 2
})

const pcm48 = (): AudioSettings => ({
  enabled: true,
  codec: 'pcm_s16le',
  sampleRate: 48000,
  channels: 2
})

const noAudio: AudioSettings = { enabled: false, codec: 'none' }

function h264(
  name: string,
  group: string,
  subgroup: string | undefined,
  width: number | 'match',
  height: number | 'match',
  bitrateKbps: number,
  extras: Partial<PresetDefinition> = {}
): PresetDefinition {
  const id = `h264-${group}-${subgroup ?? 'main'}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
  return {
    id,
    name,
    group,
    subgroup,
    formatId: 'h264',
    sources: ['ame', 'shutter', 'compressor', 'tmpgenc', 'common'],
    platforms: ['all'],
    video: {
      codec: 'libx264',
      profile: 'high',
      level: '5.1',
      pixelFormat: 'yuv420p',
      width,
      height,
      frameRate: 'match',
      bitrateMode: 'vbr1',
      bitrateKbps,
      maxBitrateKbps: Math.round(bitrateKbps * 1.5),
      extraArgs: ['-movflags', '+faststart']
    },
    audio: aacStereo(Math.min(320, Math.max(128, Math.round(bitrateKbps / 40)))),
    ...extras
  }
}

function hevc(
  name: string,
  group: string,
  subgroup: string | undefined,
  width: number | 'match',
  height: number | 'match',
  bitrateKbps: number
): PresetDefinition {
  return {
    id: `hevc-${group}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    group,
    subgroup,
    formatId: 'hevc',
    sources: ['ame', 'shutter', 'compressor', 'tmpgenc'],
    platforms: ['all'],
    video: {
      codec: 'libx265',
      profile: 'main',
      pixelFormat: 'yuv420p',
      tag: 'hvc1',
      width,
      height,
      frameRate: 'match',
      bitrateMode: 'vbr1',
      bitrateKbps,
      maxBitrateKbps: Math.round(bitrateKbps * 1.5),
      extraArgs: ['-movflags', '+faststart', '-x265-params', 'log-level=error']
    },
    audio: aacStereo(192)
  }
}

function prores(
  name: string,
  profile: string,
  pix: string,
  formatId: 'prores-mov' | 'prores-mxf' | 'quicktime' = 'prores-mov',
  alpha = false
): PresetDefinition {
  const video: VideoSettings = {
    codec: 'prores_ks',
    proresProfile: profile,
    pixelFormat: pix,
    width: 'match',
    height: 'match',
    frameRate: 'match',
    extraArgs: alpha
      ? ['-vendor', 'apl0', '-alpha_bits', '16']
      : ['-vendor', 'apl0']
  }
  return {
    id: `prores-${formatId}-${profile}`,
    name,
    group: 'Broadcast',
    subgroup: formatId === 'prores-mxf' ? 'Apple ProRes MXF OP1a' : 'Apple ProRes',
    formatId,
    sources: ['ame', 'compressor', 'shutter'],
    platforms: ['all'],
    video,
    audio: pcm48()
  }
}

function dnxhr(name: string, profile: string, pix: string, formatId: 'dnx-mxf' | 'dnx-mov'): PresetDefinition {
  return {
    id: `dnx-${formatId}-${profile}`,
    name,
    group: 'Broadcast',
    subgroup: formatId === 'dnx-mxf' ? 'DNxHR/DNxHD MXF OP1a' : 'DNx QuickTime',
    formatId,
    sources: ['ame', 'shutter'],
    platforms: ['all'],
    video: {
      codec: 'dnxhd',
      dnxProfile: profile,
      pixelFormat: pix,
      width: 'match',
      height: 'match',
      frameRate: 'match'
    },
    audio: pcm48()
  }
}

const SYSTEM_PRESETS: PresetDefinition[] = [
  // Match Source — like AME
  {
    id: 'h264-match-source-high-bitrate',
    name: 'Match Source - High bitrate',
    group: 'System Presets',
    subgroup: 'Match Source',
    formatId: 'h264',
    sources: ['ame', 'shutter'],
    platforms: ['all'],
    description: 'Keep source frame size/rate; high-quality H.264.',
    video: {
      codec: 'libx264',
      profile: 'high',
      level: '5.1',
      pixelFormat: 'yuv420p',
      width: 'match',
      height: 'match',
      frameRate: 'match',
      bitrateMode: 'crf',
      crf: 18,
      extraArgs: ['-movflags', '+faststart']
    },
    audio: aacStereo(320)
  },
  {
    id: 'h264-match-source-adaptive-high',
    name: 'Match Source - Adaptive High Bitrate',
    group: 'System Presets',
    subgroup: 'Match Source',
    formatId: 'h264',
    sources: ['ame'],
    platforms: ['all'],
    video: {
      codec: 'libx264',
      profile: 'high',
      pixelFormat: 'yuv420p',
      width: 'match',
      height: 'match',
      frameRate: 'match',
      bitrateMode: 'crf',
      crf: 20,
      extraArgs: ['-movflags', '+faststart']
    },
    audio: aacStereo(256)
  },
  {
    id: 'hevc-match-source-high',
    name: 'Match Source - High bitrate',
    group: 'System Presets',
    subgroup: 'Match Source HEVC',
    formatId: 'hevc',
    sources: ['ame', 'compressor'],
    platforms: ['all'],
    video: {
      codec: 'libx265',
      profile: 'main',
      tag: 'hvc1',
      pixelFormat: 'yuv420p',
      width: 'match',
      height: 'match',
      frameRate: 'match',
      bitrateMode: 'crf',
      crf: 20,
      extraArgs: ['-movflags', '+faststart', '-x265-params', 'log-level=error']
    },
    audio: aacStereo(256)
  },

  // Social / web — AME style
  h264('YouTube 2160p 4K', 'System Presets', 'YouTube', 3840, 2160, 45000),
  h264('YouTube 1080p HD', 'System Presets', 'YouTube', 1920, 1080, 16000),
  h264('YouTube 720p HD', 'System Presets', 'YouTube', 1280, 720, 10000),
  h264('YouTube 480p SD', 'System Presets', 'YouTube', 854, 480, 5000),
  h264('YouTube 480p SD Wide', 'System Presets', 'YouTube', 854, 480, 5000),
  h264('Vimeo 1080p HD', 'System Presets', 'Vimeo', 1920, 1080, 20000),
  h264('Vimeo 720p HD', 'System Presets', 'Vimeo', 1280, 720, 10000),
  h264('Vimeo 480p SD', 'System Presets', 'Vimeo', 854, 480, 4000),
  h264('Vimeo 480p SD Wide', 'System Presets', 'Vimeo', 854, 480, 4000),
  h264('Facebook 720HD', 'System Presets', 'Facebook', 1280, 720, 8000),
  h264('Twitter 720P', 'System Presets', 'Twitter', 1280, 720, 6000),
  h264('Instagram Feed 1080x1080', 'System Presets', 'Instagram', 1080, 1080, 8000, {
    sources: ['shutter', 'common']
  }),
  h264('Instagram Stories 1080x1920', 'System Presets', 'Instagram', 1080, 1920, 8000, {
    sources: ['shutter', 'common']
  }),
  h264('TikTok 1080x1920', 'System Presets', 'TikTok', 1080, 1920, 10000, {
    sources: ['shutter', 'common']
  }),

  // Apple devices — Compressor style
  h264('Apple Devices 1080p', 'System Presets', 'Apple Devices', 1920, 1080, 12000, {
    sources: ['compressor', 'ame']
  }),
  h264('Apple Devices 4K', 'System Presets', 'Apple Devices', 3840, 2160, 35000, {
    sources: ['compressor', 'ame']
  }),
  hevc('Apple Devices HEVC 1080p', 'System Presets', 'Apple Devices', 1920, 1080, 8000),
  hevc('Apple Devices HEVC 4K', 'System Presets', 'Apple Devices', 3840, 2160, 20000),
  {
    id: 'hevc-alpha-mov',
    name: 'HEVC with Alpha (MOV)',
    group: 'System Presets',
    subgroup: 'Apple Devices',
    formatId: 'hevc-mov',
    sources: ['compressor'],
    platforms: ['all'],
    description: 'HEVC Main with alpha via yuza when source has alpha; best on Apple silicon VideoToolbox later.',
    video: {
      codec: 'libx265',
      profile: 'main',
      tag: 'hvc1',
      pixelFormat: 'yuv420p',
      width: 'match',
      height: 'match',
      frameRate: 'match',
      bitrateMode: 'crf',
      crf: 18,
      extraArgs: ['-x265-params', 'log-level=error']
    },
    audio: aacStereo(256)
  },

  // Broadcast ProRes
  prores('Apple ProRes 422 Proxy', 'proxy', 'yuv422p10le'),
  prores('Apple ProRes 422 LT', 'lt', 'yuv422p10le'),
  prores('Apple ProRes 422', 'standard', 'yuv422p10le'),
  prores('Apple ProRes 422 HQ', 'hq', 'yuv422p10le'),
  prores('Apple ProRes 4444', '4444', 'yuva444p10le', 'prores-mov', true),
  prores('Apple ProRes 4444 XQ', '4444xq', 'yuva444p10le', 'prores-mov', true),
  prores('Apple ProRes 422 Proxy MXF', 'proxy', 'yuv422p10le', 'prores-mxf'),
  prores('Apple ProRes 422 LT MXF', 'lt', 'yuv422p10le', 'prores-mxf'),
  prores('Apple ProRes 422 MXF', 'standard', 'yuv422p10le', 'prores-mxf'),
  prores('Apple ProRes 422 HQ MXF', 'hq', 'yuv422p10le', 'prores-mxf'),
  prores('Apple ProRes 4444 MXF', '4444', 'yuva444p10le', 'prores-mxf', true),
  prores('Apple ProRes 4444 XQ MXF', '4444xq', 'yuva444p10le', 'prores-mxf', true),

  // DNx
  dnxhr('DNxHR LB', 'dnxhr_lb', 'yuv422p', 'dnx-mxf'),
  dnxhr('DNxHR SQ', 'dnxhr_sq', 'yuv422p', 'dnx-mxf'),
  dnxhr('DNxHR HQ', 'dnxhr_hq', 'yuv422p', 'dnx-mxf'),
  dnxhr('DNxHR HQX', 'dnxhr_hqx', 'yuv422p10le', 'dnx-mxf'),
  dnxhr('DNxHR 444', 'dnxhr_444', 'yuv444p10le', 'dnx-mxf'),
  {
    id: 'dnxhd-145-1080p23976',
    name: 'DNxHD 145 1080p23.976',
    group: 'Broadcast',
    subgroup: 'DNxHR/DNxHD MXF OP1a',
    formatId: 'dnx-mxf',
    sources: ['ame', 'shutter'],
    platforms: ['all'],
    video: {
      codec: 'dnxhd',
      dnxProfile: 'dnxhd',
      bitrateKbps: 145000,
      bitrateMode: 'cbr',
      width: 1920,
      height: 1080,
      frameRate: '24000/1001',
      pixelFormat: 'yuv422p',
      videoFilters: ['scale=1920:1080', 'fps=24000/1001', 'format=yuv422p']
    },
    audio: pcm48()
  },
  {
    id: 'dnxhd-175-1080p23976',
    name: 'DNxHD 175 1080p23.976',
    group: 'Broadcast',
    subgroup: 'DNxHR/DNxHD MXF OP1a',
    formatId: 'dnx-mxf',
    sources: ['ame'],
    platforms: ['all'],
    video: {
      codec: 'dnxhd',
      dnxProfile: 'dnxhd',
      bitrateKbps: 175000,
      bitrateMode: 'cbr',
      width: 1920,
      height: 1080,
      frameRate: '24000/1001',
      pixelFormat: 'yuv422p',
      videoFilters: ['scale=1920:1080', 'fps=24000/1001', 'format=yuv422p']
    },
    audio: pcm48()
  },
  dnxhr('DNxHR HQ MOV', 'dnxhr_hq', 'yuv422p', 'dnx-mov'),
  dnxhr('DNxHR HQX MOV', 'dnxhr_hqx', 'yuv422p10le', 'dnx-mov'),

  // CineForm
  {
    id: 'cineform-high-yuv',
    name: 'GoPro CineForm High YUV',
    group: 'Broadcast',
    subgroup: 'QuickTime',
    formatId: 'quicktime',
    sources: ['ame', 'shutter'],
    platforms: ['all'],
    video: {
      codec: 'cfhd',
      cineformQuality: 'high',
      pixelFormat: 'yuv422p10le',
      width: 'match',
      height: 'match',
      frameRate: 'match'
    },
    audio: pcm48()
  },
  {
    id: 'cineform-film1-alpha',
    name: 'GoPro CineForm Film1 + Alpha',
    group: 'Broadcast',
    subgroup: 'QuickTime',
    formatId: 'quicktime',
    sources: ['ame', 'shutter'],
    platforms: ['all'],
    video: {
      codec: 'cfhd',
      cineformQuality: 'film1',
      pixelFormat: 'gbrap12le',
      width: 'match',
      height: 'match',
      frameRate: 'match'
    },
    audio: pcm48()
  },
  {
    id: 'qt-animation',
    name: 'Animation',
    group: 'Broadcast',
    subgroup: 'QuickTime',
    formatId: 'quicktime',
    sources: ['ame', 'compressor'],
    platforms: ['all'],
    video: {
      codec: 'qtrle',
      pixelFormat: 'rgba',
      width: 'match',
      height: 'match',
      frameRate: 'match'
    },
    audio: pcm48()
  },
  {
    id: 'qt-v210',
    name: 'Uncompressed 10-bit 4:2:2 (V210)',
    group: 'Broadcast',
    subgroup: 'QuickTime',
    formatId: 'quicktime',
    sources: ['ame'],
    platforms: ['all'],
    video: {
      codec: 'v210',
      pixelFormat: 'yuv422p10le',
      width: 'match',
      height: 'match',
      frameRate: 'match'
    },
    audio: pcm48()
  },

  // MXF broadcast family
  {
    id: 'mxf-avc-intra-100',
    name: 'AVC-Intra 100 1080p25',
    group: 'Broadcast',
    subgroup: 'MXF OP1a',
    formatId: 'mxf-op1a',
    sources: ['ame'],
    platforms: ['all'],
    video: {
      codec: 'libx264',
      avcintraClass: 100,
      width: 1920,
      height: 1080,
      frameRate: 25,
      pixelFormat: 'yuv422p10le',
      videoFilters: ['scale=1920:1080', 'fps=25', 'format=yuv422p10le']
    },
    audio: pcm48()
  },
  {
    id: 'mxf-avc-intra-50',
    name: 'AVC-Intra 50 1080p25',
    group: 'Broadcast',
    subgroup: 'MXF OP1a',
    formatId: 'mxf-op1a',
    sources: ['ame'],
    platforms: ['all'],
    video: {
      codec: 'libx264',
      avcintraClass: 50,
      width: 1440,
      height: 1080,
      frameRate: 25,
      pixelFormat: 'yuv420p10le',
      videoFilters: ['scale=1440:1080', 'fps=25', 'format=yuv420p10le']
    },
    audio: pcm48()
  },
  {
    id: 'mxf-avc-intra-200',
    name: 'AVC-Intra 200 1080p29.97',
    group: 'Broadcast',
    subgroup: 'MXF OP1a',
    formatId: 'mxf-op1a',
    sources: ['ame'],
    platforms: ['all'],
    video: {
      codec: 'libx264',
      avcintraClass: 200,
      width: 1920,
      height: 1080,
      frameRate: '30000/1001',
      pixelFormat: 'yuv422p10le',
      videoFilters: ['scale=1920:1080', 'fps=30000/1001', 'format=yuv422p10le']
    },
    audio: pcm48()
  },
  {
    id: 'mxf-avc-intra-300',
    name: 'AVC-Intra 300 2160p25',
    group: 'Broadcast',
    subgroup: 'MXF OP1a',
    formatId: 'mxf-op1a',
    sources: ['ame'],
    platforms: ['all'],
    video: {
      codec: 'libx264',
      avcintraClass: 300,
      width: 3840,
      height: 2160,
      frameRate: 25,
      pixelFormat: 'yuv422p10le',
      videoFilters: ['scale=3840:2160', 'fps=25', 'format=yuv422p10le']
    },
    audio: pcm48()
  },
  {
    id: 'mxf-xavc-longgop',
    name: 'XAVC Long GOP HD 50 Mbps',
    group: 'Broadcast',
    subgroup: 'MXF OP1a',
    formatId: 'mxf-op1a',
    sources: ['ame'],
    platforms: ['all'],
    video: {
      codec: 'libx264',
      profile: 'high422',
      pixelFormat: 'yuv422p',
      bitrateMode: 'cbr',
      bitrateKbps: 50000,
      width: 1920,
      height: 1080,
      frameRate: 'match',
      gop: 12,
      videoFilters: ['scale=1920:1080', 'format=yuv422p']
    },
    audio: pcm48()
  },
  {
    id: 'mxf-xdcamhd-50',
    name: 'XDCAM HD 50',
    group: 'Broadcast',
    subgroup: 'MXF OP1a',
    formatId: 'mxf-op1a',
    sources: ['ame'],
    platforms: ['all'],
    video: {
      codec: 'mpeg2video',
      bitrateMode: 'cbr',
      bitrateKbps: 50000,
      maxBitrateKbps: 50000,
      pixelFormat: 'yuv422p',
      width: 1920,
      height: 1080,
      frameRate: 'match',
      gop: 12,
      videoFilters: ['scale=1920:1080', 'format=yuv422p'],
      extraArgs: ['-minrate', '50M', '-bufsize', '17M']
    },
    audio: pcm48()
  },
  {
    id: 'mxf-xdcamhd-35',
    name: 'XDCAM HD 35',
    group: 'Broadcast',
    subgroup: 'MXF OP1a',
    formatId: 'mxf-op1a',
    sources: ['ame'],
    platforms: ['all'],
    video: {
      codec: 'mpeg2video',
      bitrateMode: 'cbr',
      bitrateKbps: 35000,
      pixelFormat: 'yuv420p',
      width: 1440,
      height: 1080,
      gop: 12,
      videoFilters: ['scale=1440:1080']
    },
    audio: pcm48()
  },
  {
    id: 'mxf-imx-50',
    name: 'IMX 50',
    group: 'Broadcast',
    subgroup: 'MXF OP1a',
    formatId: 'mxf-op1a',
    sources: ['ame'],
    platforms: ['all'],
    video: {
      codec: 'mpeg2video',
      bitrateMode: 'cbr',
      bitrateKbps: 50000,
      pixelFormat: 'yuv422p',
      width: 720,
      height: 608,
      gop: 1,
      videoFilters: ['scale=720:608', 'format=yuv422p']
    },
    audio: pcm48()
  },
  {
    id: 'as10-xdcamhd-50',
    name: 'AS-10 XDCAM HD 50',
    group: 'Broadcast',
    subgroup: 'AS-10',
    formatId: 'as10',
    sources: ['ame'],
    platforms: ['all'],
    video: {
      codec: 'mpeg2video',
      bitrateMode: 'cbr',
      bitrateKbps: 50000,
      pixelFormat: 'yuv422p',
      width: 1920,
      height: 1080,
      videoFilters: ['scale=1920:1080', 'format=yuv422p']
    },
    audio: pcm48()
  },
  {
    id: 'as11-avci-100',
    name: 'AS-11 AVC-Intra HD Shim',
    group: 'Broadcast',
    subgroup: 'AS-11',
    formatId: 'as11',
    sources: ['ame'],
    platforms: ['all'],
    video: {
      codec: 'libx264',
      avcintraClass: 100,
      width: 1920,
      height: 1080,
      frameRate: 25,
      pixelFormat: 'yuv422p10le',
      videoFilters: ['scale=1920:1080', 'fps=25', 'format=yuv422p10le']
    },
    audio: pcm48()
  },
  {
    id: 'as11-imx-50',
    name: 'AS-11 IMX 50 SD Shim',
    group: 'Broadcast',
    subgroup: 'AS-11',
    formatId: 'as11',
    sources: ['ame'],
    platforms: ['all'],
    video: {
      codec: 'mpeg2video',
      bitrateMode: 'cbr',
      bitrateKbps: 50000,
      pixelFormat: 'yuv422p',
      width: 720,
      height: 608,
      gop: 1,
      videoFilters: ['scale=720:608', 'format=yuv422p']
    },
    audio: pcm48()
  },

  // DV / P2
  {
    id: 'dv25-ntsc',
    name: 'DV NTSC',
    group: 'Broadcast',
    subgroup: 'DV',
    formatId: 'avi',
    sources: ['ame', 'tmpgenc', 'shutter'],
    platforms: ['all'],
    video: {
      codec: 'dvvideo',
      width: 720,
      height: 480,
      frameRate: '30000/1001',
      pixelFormat: 'yuv411p',
      videoFilters: ['scale=720:480', 'fps=30000/1001', 'format=yuv411p']
    },
    audio: pcm48()
  },
  {
    id: 'dv25-pal',
    name: 'DV PAL',
    group: 'Broadcast',
    subgroup: 'DV',
    formatId: 'avi',
    sources: ['ame', 'tmpgenc'],
    platforms: ['all'],
    video: {
      codec: 'dvvideo',
      width: 720,
      height: 576,
      frameRate: 25,
      pixelFormat: 'yuv420p',
      videoFilters: ['scale=720:576', 'fps=25', 'format=yuv420p']
    },
    audio: pcm48()
  },
  {
    id: 'p2-avci-100',
    name: 'P2 AVC-Intra 100',
    group: 'Broadcast',
    subgroup: 'P2 Movie',
    formatId: 'p2',
    sources: ['ame'],
    platforms: ['all'],
    video: {
      codec: 'libx264',
      avcintraClass: 100,
      width: 1920,
      height: 1080,
      frameRate: 25,
      pixelFormat: 'yuv422p10le',
      videoFilters: ['scale=1920:1080', 'fps=25', 'format=yuv422p10le']
    },
    audio: pcm48()
  },

  // MPEG-2 / Blu-ray / DVD — AME + TMPGEnc
  {
    id: 'mpeg2-dvd-ntsc',
    name: 'MPEG-2 DVD NTSC',
    group: 'Optical Disc',
    subgroup: 'DVD',
    formatId: 'mpeg2-dvd',
    sources: ['ame', 'tmpgenc'],
    platforms: ['all'],
    video: {
      codec: 'mpeg2video',
      bitrateMode: 'cbr',
      bitrateKbps: 6000,
      width: 720,
      height: 480,
      frameRate: '30000/1001',
      pixelFormat: 'yuv420p',
      videoFilters: ['scale=720:480', 'fps=30000/1001']
    },
    audio: { enabled: true, codec: 'mp2', bitrateKbps: 384, sampleRate: 48000, channels: 2 }
  },
  {
    id: 'mpeg2-dvd-pal',
    name: 'MPEG-2 DVD PAL',
    group: 'Optical Disc',
    subgroup: 'DVD',
    formatId: 'mpeg2-dvd',
    sources: ['ame', 'tmpgenc'],
    platforms: ['all'],
    video: {
      codec: 'mpeg2video',
      bitrateMode: 'cbr',
      bitrateKbps: 6000,
      width: 720,
      height: 576,
      frameRate: 25,
      pixelFormat: 'yuv420p',
      videoFilters: ['scale=720:576', 'fps=25']
    },
    audio: { enabled: true, codec: 'mp2', bitrateKbps: 384, sampleRate: 48000, channels: 2 }
  },
  {
    id: 'h264-bluray-1080p',
    name: 'H.264 Blu-ray 1080p24',
    group: 'Optical Disc',
    subgroup: 'Blu-ray',
    formatId: 'h264-bluray',
    sources: ['ame', 'tmpgenc'],
    platforms: ['all'],
    video: {
      codec: 'libx264',
      profile: 'high',
      level: '4.1',
      bitrateMode: 'cbr',
      bitrateKbps: 25000,
      width: 1920,
      height: 1080,
      frameRate: 24,
      pixelFormat: 'yuv420p',
      videoFilters: ['scale=1920:1080', 'fps=24']
    },
    audio: { enabled: true, codec: 'ac3', bitrateKbps: 640, sampleRate: 48000, channels: 2 }
  },
  {
    id: 'mpeg2-bluray-1080p',
    name: 'MPEG-2 Blu-ray 1080p24',
    group: 'Optical Disc',
    subgroup: 'Blu-ray',
    formatId: 'mpeg2-bluray',
    sources: ['ame', 'tmpgenc'],
    platforms: ['all'],
    video: {
      codec: 'mpeg2video',
      bitrateMode: 'cbr',
      bitrateKbps: 30000,
      width: 1920,
      height: 1080,
      frameRate: 24,
      pixelFormat: 'yuv420p',
      videoFilters: ['scale=1920:1080', 'fps=24']
    },
    audio: { enabled: true, codec: 'ac3', bitrateKbps: 640, sampleRate: 48000, channels: 2 }
  },

  // Windows Media / AVI
  {
    id: 'wmv-hd-1080p',
    name: 'Windows Media HD 1080p',
    group: 'Legacy',
    subgroup: 'Windows Media',
    formatId: 'windows-media',
    sources: ['ame', 'tmpgenc'],
    platforms: ['all'],
    video: {
      codec: 'wmv2',
      bitrateMode: 'cbr',
      bitrateKbps: 8000,
      width: 1920,
      height: 1080,
      frameRate: 'match',
      pixelFormat: 'yuv420p'
    },
    audio: { enabled: true, codec: 'wmav2', bitrateKbps: 192, sampleRate: 48000, channels: 2 }
  },
  {
    id: 'avi-uyvy',
    name: 'AVI Uncompressed UYVY',
    group: 'Legacy',
    subgroup: 'AVI',
    formatId: 'avi-uncompressed',
    sources: ['ame'],
    platforms: ['all'],
    video: {
      codec: 'rawvideo',
      pixelFormat: 'uyvy422',
      tag: 'uyvy',
      width: 'match',
      height: 'match',
      frameRate: 'match'
    },
    audio: pcm48()
  },
  {
    id: 'avi-v210',
    name: 'AVI Uncompressed V210',
    group: 'Legacy',
    subgroup: 'AVI',
    formatId: 'avi-uncompressed',
    sources: ['ame'],
    platforms: ['all'],
    video: {
      codec: 'v210',
      pixelFormat: 'yuv422p10le',
      width: 'match',
      height: 'match',
      frameRate: 'match'
    },
    audio: pcm48()
  },

  // JPEG 2000 / DCP essence
  {
    id: 'j2k-mxf',
    name: 'JPEG 2000 MXF OP1a',
    group: 'Broadcast',
    subgroup: 'JPEG 2000',
    formatId: 'jpeg2000-mxf',
    sources: ['ame'],
    platforms: ['all'],
    video: {
      codec: 'jpeg2000',
      pixelFormat: 'yuv422p10le',
      width: 'match',
      height: 'match',
      frameRate: 'match'
    },
    audio: pcm48()
  },
  {
    id: 'dcp-j2k',
    name: 'DCP JPEG 2000 (essence)',
    group: 'Cinema',
    subgroup: 'DCP',
    formatId: 'dcp',
    sources: ['ame'],
    platforms: ['all'],
    description: 'JPEG 2000 encode only — not a full Wraptor DCP package.',
    video: {
      codec: 'jpeg2000',
      pixelFormat: 'xyz12le',
      width: 2048,
      height: 1080,
      frameRate: 24,
      videoFilters: ['scale=2048:1080', 'fps=24']
    },
    audio: pcm48()
  },

  // Shutter-style modern web / archive
  {
    id: 'av1-web-1080p',
    name: 'AV1 1080p Web',
    group: 'Modern Web',
    subgroup: 'AV1',
    formatId: 'av1',
    sources: ['shutter', 'common'],
    platforms: ['all'],
    video: {
      codec: 'libaom-av1',
      bitrateMode: 'crf',
      crf: 30,
      width: 1920,
      height: 1080,
      frameRate: 'match',
      pixelFormat: 'yuv420p',
      extraArgs: ['-cpu-used', '6', '-row-mt', '1', '-movflags', '+faststart']
    },
    audio: { enabled: true, codec: 'libopus', bitrateKbps: 160, sampleRate: 48000, channels: 2 }
  },
  {
    id: 'vp9-webm-1080p',
    name: 'VP9 WebM 1080p',
    group: 'Modern Web',
    subgroup: 'VP9',
    formatId: 'vp9',
    sources: ['shutter'],
    platforms: ['all'],
    video: {
      codec: 'libvpx-vp9',
      bitrateMode: 'crf',
      crf: 32,
      width: 1920,
      height: 1080,
      frameRate: 'match',
      pixelFormat: 'yuv420p',
      extraArgs: ['-b:v', '0', '-row-mt', '1']
    },
    audio: { enabled: true, codec: 'libopus', bitrateKbps: 160, sampleRate: 48000, channels: 2 }
  },
  {
    id: 'ffv1-mkv',
    name: 'FFV1 Lossless MKV',
    group: 'Archive',
    subgroup: 'FFV1',
    formatId: 'ffv1',
    sources: ['shutter'],
    platforms: ['all'],
    video: {
      codec: 'ffv1',
      pixelFormat: 'yuv422p10le',
      width: 'match',
      height: 'match',
      frameRate: 'match',
      extraArgs: ['-level', '3', '-coder', '1', '-context', '1', '-g', '1']
    },
    audio: { enabled: true, codec: 'flac', sampleRate: 48000, channels: 2 }
  },
  {
    id: 'hap-mov',
    name: 'Hap',
    group: 'Playback',
    subgroup: 'Hap',
    formatId: 'hap',
    sources: ['shutter'],
    platforms: ['all'],
    video: {
      codec: 'hap',
      pixelFormat: 'rgba',
      width: 'match',
      height: 'match',
      frameRate: 'match'
    },
    audio: pcm48()
  },

  // Stills / sequences
  {
    id: 'png-sequence',
    name: 'PNG Sequence',
    group: 'Stills',
    subgroup: 'Sequences',
    formatId: 'still-png',
    sources: ['ame', 'shutter', 'compressor'],
    platforms: ['all'],
    sequence: true,
    video: { codec: 'png', width: 'match', height: 'match', frameRate: 'match' },
    audio: noAudio
  },
  {
    id: 'jpeg-sequence',
    name: 'JPEG Sequence',
    group: 'Stills',
    subgroup: 'Sequences',
    formatId: 'still-jpeg',
    sources: ['ame', 'shutter'],
    platforms: ['all'],
    sequence: true,
    video: { codec: 'mjpeg', quality: 2, width: 'match', height: 'match', frameRate: 'match' },
    audio: noAudio
  },
  {
    id: 'tiff-sequence',
    name: 'TIFF Sequence',
    group: 'Stills',
    subgroup: 'Sequences',
    formatId: 'still-tiff',
    sources: ['ame', 'shutter', 'compressor'],
    platforms: ['all'],
    sequence: true,
    video: { codec: 'tiff', width: 'match', height: 'match', frameRate: 'match' },
    audio: noAudio
  },
  {
    id: 'dpx-sequence',
    name: 'DPX Sequence',
    group: 'Stills',
    subgroup: 'Sequences',
    formatId: 'still-dpx',
    sources: ['ame', 'shutter'],
    platforms: ['all'],
    sequence: true,
    video: {
      codec: 'dpx',
      pixelFormat: 'gbrp10le',
      width: 'match',
      height: 'match',
      frameRate: 'match'
    },
    audio: noAudio
  },
  {
    id: 'exr-sequence',
    name: 'OpenEXR Sequence',
    group: 'Stills',
    subgroup: 'Sequences',
    formatId: 'still-exr',
    sources: ['ame', 'shutter', 'compressor'],
    platforms: ['all'],
    sequence: true,
    video: { codec: 'exr', width: 'match', height: 'match', frameRate: 'match' },
    audio: noAudio
  },
  {
    id: 'tga-sequence',
    name: 'Targa Sequence',
    group: 'Stills',
    subgroup: 'Sequences',
    formatId: 'still-tga',
    sources: ['ame'],
    platforms: ['all'],
    sequence: true,
    video: { codec: 'targa', width: 'match', height: 'match', frameRate: 'match' },
    audio: noAudio
  },
  {
    id: 'bmp-sequence',
    name: 'BMP Sequence',
    group: 'Stills',
    subgroup: 'Sequences',
    formatId: 'still-bmp',
    sources: ['ame'],
    platforms: ['all'],
    sequence: true,
    video: { codec: 'bmp', width: 'match', height: 'match', frameRate: 'match' },
    audio: noAudio
  },
  {
    id: 'animated-gif',
    name: 'Animated GIF',
    group: 'Stills',
    subgroup: 'GIF',
    formatId: 'gif',
    sources: ['ame', 'shutter'],
    platforms: ['all'],
    video: {
      codec: 'gif',
      width: 640,
      height: -2,
      frameRate: 12,
      videoFilters: [
        '[0:v]fps=12,scale=640:-2:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse'
      ]
    },
    audio: noAudio
  },

  // Audio only
  {
    id: 'audio-aac-320',
    name: 'AAC 320 kbps',
    group: 'Audio',
    subgroup: 'AAC',
    formatId: 'audio-aac',
    sources: ['ame', 'shutter', 'compressor', 'tmpgenc'],
    platforms: ['all'],
    video: { codec: 'none' },
    audio: aacStereo(320)
  },
  {
    id: 'audio-mp3-320',
    name: 'MP3 320 kbps',
    group: 'Audio',
    subgroup: 'MP3',
    formatId: 'audio-mp3',
    sources: ['ame', 'shutter', 'tmpgenc'],
    platforms: ['all'],
    video: { codec: 'none' },
    audio: { enabled: true, codec: 'libmp3lame', bitrateKbps: 320, sampleRate: 48000, channels: 2 }
  },
  {
    id: 'audio-wav-24',
    name: 'WAV 24-bit 48 kHz',
    group: 'Audio',
    subgroup: 'WAV',
    formatId: 'audio-wav',
    sources: ['ame', 'shutter', 'compressor'],
    platforms: ['all'],
    video: { codec: 'none' },
    audio: { enabled: true, codec: 'pcm_s24le', sampleRate: 48000, channels: 2 }
  },
  {
    id: 'audio-aiff-24',
    name: 'AIFF 24-bit 48 kHz',
    group: 'Audio',
    subgroup: 'AIFF',
    formatId: 'audio-aiff',
    sources: ['ame', 'compressor'],
    platforms: ['all'],
    video: { codec: 'none' },
    audio: { enabled: true, codec: 'pcm_s24be', sampleRate: 48000, channels: 2 }
  },
  {
    id: 'audio-flac',
    name: 'FLAC',
    group: 'Audio',
    subgroup: 'FLAC',
    formatId: 'audio-flac',
    sources: ['shutter'],
    platforms: ['all'],
    video: { codec: 'none' },
    audio: { enabled: true, codec: 'flac', sampleRate: 48000, channels: 2 }
  },
  {
    id: 'audio-opus',
    name: 'Opus 160 kbps',
    group: 'Audio',
    subgroup: 'Opus',
    formatId: 'audio-opus',
    sources: ['shutter'],
    platforms: ['all'],
    video: { codec: 'none' },
    audio: { enabled: true, codec: 'libopus', bitrateKbps: 160, sampleRate: 48000, channels: 2 }
  },

  // Resolution ladders — HEVC
  hevc('HEVC 8K', 'System Presets', 'HEVC', 7680, 4320, 80000),
  hevc('HEVC 4K', 'System Presets', 'HEVC', 3840, 2160, 35000),
  hevc('HEVC 1080p', 'System Presets', 'HEVC', 1920, 1080, 12000),
  hevc('HEVC 720p', 'System Presets', 'HEVC', 1280, 720, 6000),

  // TMPGEnc-style MPEG-4
  {
    id: 'mpeg4-asp-hdtv',
    name: 'MPEG-4 ASP HDTV',
    group: 'Legacy',
    subgroup: 'MPEG-4',
    formatId: 'mpeg4',
    sources: ['ame', 'tmpgenc'],
    platforms: ['all'],
    video: {
      codec: 'mpeg4',
      bitrateMode: 'cbr',
      bitrateKbps: 8000,
      width: 1920,
      height: 1080,
      frameRate: 'match',
      pixelFormat: 'yuv420p'
    },
    audio: aacStereo(192)
  }
]

/** Deduplicate by id (helpers can collide in edge cases). */
export const PRESETS: PresetDefinition[] = Array.from(
  new Map(SYSTEM_PRESETS.map((p) => [p.id, p])).values()
)

export function getPreset(id: string): PresetDefinition | undefined {
  return PRESETS.find((p) => p.id === id)
}

export function presetsGrouped(): Map<string, Map<string, PresetDefinition[]>> {
  const root = new Map<string, Map<string, PresetDefinition[]>>()
  for (const preset of PRESETS) {
    const subgroup = preset.subgroup ?? 'General'
    if (!root.has(preset.group)) root.set(preset.group, new Map())
    const group = root.get(preset.group)!
    if (!group.has(subgroup)) group.set(subgroup, [])
    group.get(subgroup)!.push(preset)
  }
  return root
}

export const DEFAULT_PRESET_ID = 'h264-match-source-high-bitrate'
