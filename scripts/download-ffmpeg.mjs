/**
 * Downloads a static FFmpeg + FFprobe build into resources/ffmpeg for bundling.
 * Run on each target OS before packaging.
 */
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  rmSync,
  chmodSync,
  copyFileSync,
  readdirSync,
  statSync
} from 'fs'
import { dirname, join, resolve as resolvePath } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { pipeline } from 'stream/promises'
import { spawnSync } from 'child_process'
import https from 'https'
import http from 'http'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(root, 'resources', 'ffmpeg')
const cacheDir = join(root, 'resources', '.ffmpeg-cache')

const CONNECT_TIMEOUT_MS = 30_000
const IDLE_TIMEOUT_MS = 60_000
const MAX_DOWNLOAD_MS = 10 * 60_000

function log(...args) {
  console.log('[download-ffmpeg]', ...args)
}

/** Resolve absolute or relative redirect Location against the current request URL. */
export function resolveRedirect(currentUrl, location) {
  return new URL(location, currentUrl).toString()
}

function requestLib(url) {
  return url.startsWith('https') ? https : http
}

function hasCurl() {
  const r = spawnSync('curl', ['--version'], { encoding: 'utf8' })
  return r.status === 0
}

/**
 * Prefer curl on macOS/Linux — handles redirects and timeouts reliably on GH runners.
 * Falls back to Node https with connect + idle timeouts.
 */
async function downloadFile(url, dest) {
  mkdirSync(dirname(dest), { recursive: true })
  if (existsSync(dest)) rmSync(dest, { force: true })

  if (hasCurl()) {
    log('curl download', url)
    const r = spawnSync(
      'curl',
      [
        '-fL',
        '--retry',
        '3',
        '--retry-delay',
        '2',
        '--connect-timeout',
        '30',
        '--max-time',
        '600',
        '-A',
        'encode-this-ffmpeg-fetch',
        '-o',
        dest,
        url
      ],
      { stdio: 'inherit' }
    )
    if (r.status === 0 && existsSync(dest) && statSync(dest).size > 0) return
    log('curl failed; falling back to Node download')
  }

  await downloadFileNode(url, dest)
}

function downloadFileNode(url, dest) {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    let settled = false
    const fail = (err) => {
      if (settled) return
      settled = true
      reject(err instanceof Error ? err : new Error(String(err)))
    }
    const ok = () => {
      if (settled) return
      settled = true
      resolve()
    }

    const overall = setTimeout(() => {
      fail(new Error(`Download timed out after ${MAX_DOWNLOAD_MS}ms: ${url}`))
    }, MAX_DOWNLOAD_MS)

    const follow = (current, redirects = 0) => {
      if (Date.now() - started > MAX_DOWNLOAD_MS) {
        fail(new Error(`Download timed out after ${MAX_DOWNLOAD_MS}ms: ${url}`))
        return
      }
      log('GET', current)
      const req = requestLib(current).get(
        current,
        {
          headers: { 'User-Agent': 'encode-this-ffmpeg-fetch' },
          timeout: CONNECT_TIMEOUT_MS
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume()
            if (redirects > 10) {
              fail(new Error('Too many redirects'))
              return
            }
            follow(resolveRedirect(current, res.headers.location), redirects + 1)
            return
          }
          if (res.statusCode !== 200) {
            res.resume()
            fail(new Error(`HTTP ${res.statusCode} for ${current}`))
            return
          }

          let idle = setTimeout(() => {
            req.destroy()
            fail(new Error(`Idle timeout (${IDLE_TIMEOUT_MS}ms) downloading ${current}`))
          }, IDLE_TIMEOUT_MS)

          const bumpIdle = () => {
            clearTimeout(idle)
            idle = setTimeout(() => {
              req.destroy()
              fail(new Error(`Idle timeout (${IDLE_TIMEOUT_MS}ms) downloading ${current}`))
            }, IDLE_TIMEOUT_MS)
          }

          res.on('data', bumpIdle)
          const file = createWriteStream(dest)
          pipeline(res, file)
            .then(() => {
              clearTimeout(idle)
              clearTimeout(overall)
              ok()
            })
            .catch((err) => {
              clearTimeout(idle)
              clearTimeout(overall)
              fail(err)
            })
        }
      )
      req.on('timeout', () => {
        req.destroy()
        fail(new Error(`Connect timeout (${CONNECT_TIMEOUT_MS}ms) for ${current}`))
      })
      req.on('error', (err) => {
        clearTimeout(overall)
        fail(err)
      })
    }

    follow(url)
  })
}

function requestBuffer(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const req = requestLib(url).get(
      url,
      {
        headers: { 'User-Agent': 'encode-this-ffmpeg-fetch' },
        timeout: CONNECT_TIMEOUT_MS
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          if (redirects > 10) {
            reject(new Error('Too many redirects'))
            return
          }
          resolve(requestBuffer(resolveRedirect(url, res.headers.location), redirects + 1))
          return
        }
        if (res.statusCode !== 200) {
          res.resume()
          reject(new Error(`HTTP ${res.statusCode} for ${url}`))
          return
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
        res.on('error', reject)
      }
    )
    req.on('timeout', () => {
      req.destroy()
      reject(new Error(`Connect timeout for ${url}`))
    })
    req.on('error', reject)
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
  // evermeet getrelease endpoints return HTTP 410; use martin-riedl static builds.
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64'
  const base = `https://ffmpeg.martin-riedl.de/redirect/latest/macos/${arch}/release`
  const ffmpegZip = join(cacheDir, `ffmpeg-mac-${arch}.zip`)
  const ffprobeZip = join(cacheDir, `ffprobe-mac-${arch}.zip`)
  log(`Downloading martin-riedl macOS ${arch} ffmpeg/ffprobe`)
  await downloadFile(`${base}/ffmpeg.zip`, ffmpegZip)
  await downloadFile(`${base}/ffprobe.zip`, ffprobeZip)
  const extractFfmpeg = join(cacheDir, `mac-ffmpeg-${arch}`)
  const extractFfprobe = join(cacheDir, `mac-ffprobe-${arch}`)
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
  // Avoid hanging `npm ci` on CI when the Release `dist` step fetches FFmpeg next.
  if (process.env.npm_lifecycle_event === 'postinstall' && process.env.CI === 'true') {
    log('CI postinstall: skipping FFmpeg fetch (dist/pack will download)')
    return
  }

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

const entryHref = process.argv[1] ? pathToFileURL(resolvePath(process.argv[1])).href : ''
if (import.meta.url === entryHref) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
