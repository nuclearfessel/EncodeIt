/**
 * Downloads a static FFmpeg + FFprobe build into resources/ffmpeg for bundling.
 * Run on each target OS before packaging.
 */
import { createWriteStream, existsSync, mkdirSync, rmSync, chmodSync, copyFileSync, readdirSync, statSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { pipeline } from 'stream/promises'
import { spawnSync } from 'child_process'
import https from 'https'
import http from 'http'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(root, 'resources', 'ffmpeg')
const cacheDir = join(root, 'resources', '.ffmpeg-cache')

function log(...args) {
  console.log('[download-ffmpeg]', ...args)
}

function requestBuffer(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    lib
      .get(url, { headers: { 'User-Agent': 'encode-this-ffmpeg-fetch' } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (redirects > 10) {
            reject(new Error('Too many redirects'))
            return
          }
          resolve(requestBuffer(res.headers.location, redirects + 1))
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`))
          return
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
        res.on('error', reject)
      })
      .on('error', reject)
  })
}

async function downloadFile(url, dest) {
  mkdirSync(dirname(dest), { recursive: true })
  const lib = url.startsWith('https') ? https : http
  await new Promise((resolve, reject) => {
    const follow = (current, redirects = 0) => {
      lib
        .get(current, { headers: { 'User-Agent': 'encode-this-ffmpeg-fetch' } }, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            if (redirects > 10) {
              reject(new Error('Too many redirects'))
              return
            }
            follow(res.headers.location, redirects + 1)
            return
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} for ${current}`))
            return
          }
          const file = createWriteStream(dest)
          pipeline(res, file).then(resolve).catch(reject)
        })
        .on('error', reject)
    }
    follow(url)
  })
}

function findFiles(dir, names) {
  const hits = {}
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name)
      const st = statSync(full)
      if (st.isDirectory()) walk(full)
      else if (names.includes(name)) hits[name] = full
    }
  }
  walk(dir)
  return hits
}

function extractArchive(archive, dest) {
  mkdirSync(dest, { recursive: true })
  if (archive.endsWith('.zip')) {
    const r = spawnSync('tar', ['-xf', archive, '-C', dest], { stdio: 'inherit' })
    if (r.status !== 0) {
      const ps = spawnSync(
        'powershell',
        ['-NoProfile', '-Command', `Expand-Archive -Path '${archive}' -DestinationPath '${dest}' -Force`],
        { stdio: 'inherit' }
      )
      if (ps.status !== 0) throw new Error('Failed to extract zip')
    }
    return
  }
  if (archive.endsWith('.tar.xz') || archive.endsWith('.txz')) {
    const r = spawnSync('tar', ['-xJf', archive, '-C', dest], { stdio: 'inherit' })
    if (r.status !== 0) throw new Error('Failed to extract tar.xz')
    return
  }
  throw new Error(`Unsupported archive: ${archive}`)
}

async function latestBtbNAsset(matcher) {
  const body = await requestBuffer(
    'https://api.github.com/repos/BtbN/FFmpeg-Builds/releases/latest'
  )
  const release = JSON.parse(body.toString('utf8'))
  const asset = (release.assets || []).find((a) => matcher(a.name))
  if (!asset) throw new Error(`No BtbN asset matching ${matcher}`)
  return asset.browser_download_url
}

async function fetchWindows() {
  const url = await latestBtbNAsset(
    (n) => n.includes('win64-gpl.zip') && !n.includes('shared') && !n.includes('lgpl')
  )
  const archive = join(cacheDir, 'ffmpeg-win64-gpl.zip')
  log('Downloading', url)
  await downloadFile(url, archive)
  const extractTo = join(cacheDir, 'win-extract')
  rmSync(extractTo, { recursive: true, force: true })
  extractArchive(archive, extractTo)
  const hits = findFiles(extractTo, ['ffmpeg.exe', 'ffprobe.exe'])
  if (!hits['ffmpeg.exe'] || !hits['ffprobe.exe']) throw new Error('win binaries missing in archive')
  return hits
}

async function fetchLinux() {
  const url = await latestBtbNAsset(
    (n) =>
      n.includes('linux64-gpl.tar.xz') &&
      !n.includes('shared') &&
      !n.includes('lgpl') &&
      !n.includes('arm64')
  )
  const archive = join(cacheDir, 'ffmpeg-linux64-gpl.tar.xz')
  log('Downloading', url)
  await downloadFile(url, archive)
  const extractTo = join(cacheDir, 'linux-extract')
  rmSync(extractTo, { recursive: true, force: true })
  extractArchive(archive, extractTo)
  const hits = findFiles(extractTo, ['ffmpeg', 'ffprobe'])
  if (!hits.ffmpeg || !hits.ffprobe) throw new Error('linux binaries missing in archive')
  return hits
}

async function fetchMac() {
  // evermeet provides current static macOS builds
  const ffmpegZip = join(cacheDir, 'ffmpeg-mac.zip')
  const ffprobeZip = join(cacheDir, 'ffprobe-mac.zip')
  log('Downloading evermeet ffmpeg/ffprobe')
  await downloadFile('https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip', ffmpegZip)
  await downloadFile('https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip', ffprobeZip)
  const extractFfmpeg = join(cacheDir, 'mac-ffmpeg')
  const extractFfprobe = join(cacheDir, 'mac-ffprobe')
  rmSync(extractFfmpeg, { recursive: true, force: true })
  rmSync(extractFfprobe, { recursive: true, force: true })
  extractArchive(ffmpegZip, extractFfmpeg)
  extractArchive(ffprobeZip, extractFfprobe)
  const ffmpegHits = findFiles(extractFfmpeg, ['ffmpeg'])
  const ffprobeHits = findFiles(extractFfprobe, ['ffprobe'])
  if (!ffmpegHits.ffmpeg || !ffprobeHits.ffprobe) throw new Error('mac binaries missing')
  return { ffmpeg: ffmpegHits.ffmpeg, ffprobe: ffprobeHits.ffprobe }
}

async function main() {
  mkdirSync(cacheDir, { recursive: true })
  mkdirSync(outDir, { recursive: true })

  const platform = process.platform
  const exeName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  const probeName = platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'
  const existing = join(outDir, exeName)
  const existingProbe = join(outDir, probeName)
  if (process.env.FFMPEG_FORCE !== '1' && existsSync(existing) && existsSync(existingProbe)) {
    log('Already present:', existing)
    return
  }

  let hits
  if (platform === 'win32') hits = await fetchWindows()
  else if (platform === 'linux') hits = await fetchLinux()
  else if (platform === 'darwin') hits = await fetchMac()
  else throw new Error(`Unsupported platform: ${platform}`)

  const ffmpegSrc = hits['ffmpeg.exe'] || hits.ffmpeg
  const ffprobeSrc = hits['ffprobe.exe'] || hits.ffprobe
  copyFileSync(ffmpegSrc, join(outDir, exeName))
  copyFileSync(ffprobeSrc, join(outDir, probeName))
  if (platform !== 'win32') {
    chmodSync(join(outDir, exeName), 0o755)
    chmodSync(join(outDir, probeName), 0o755)
  }
  log('Installed to', outDir)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
