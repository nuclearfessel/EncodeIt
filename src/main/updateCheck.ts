import { app, shell } from 'electron'
import fs from 'fs'
import https from 'https'
import path from 'path'
import { isNewerVersion } from '../shared/semverCompare'
import { logger } from './logger'

export { isNewerVersion, parseVersion } from '../shared/semverCompare'

const REPO = 'nuclearfessel/EncodeIt'
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000

export interface UpdateStatus {
  currentVersion: string
  latestVersion: string | null
  latestTag: string | null
  releaseUrl: string | null
  downloadUrl: string | null
  updateAvailable: boolean
  checkedAt: number | null
  error: string | null
}

interface GhAsset {
  name: string
  browser_download_url: string
}

interface GhRelease {
  tag_name: string
  html_url: string
  assets: GhAsset[]
}

function snoozePath(): string {
  return path.join(app.getPath('userData'), 'update-snooze.json')
}

function readSnoozedTag(): string | null {
  try {
    const raw = JSON.parse(fs.readFileSync(snoozePath(), 'utf8')) as { tag?: string }
    return typeof raw.tag === 'string' ? raw.tag : null
  } catch {
    return null
  }
}

function writeSnoozedTag(tag: string | null): void {
  const file = snoozePath()
  if (!tag) {
    try {
      fs.unlinkSync(file)
    } catch {
      /* ignore */
    }
    return
  }
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify({ tag, at: Date.now() }, null, 2), 'utf8')
}

function pickDownloadUrl(assets: GhAsset[]): string | null {
  const names = assets.map((a) => ({ name: a.name.toLowerCase(), url: a.browser_download_url }))
  if (process.platform === 'win32') {
    const setup = names.find((a) => a.name.includes('setup') && a.name.endsWith('.exe'))
    if (setup) return setup.url
    const exe = names.find((a) => a.name.endsWith('.exe') && !a.name.includes('blockmap'))
    return exe?.url ?? null
  }
  if (process.platform === 'darwin') {
    const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
    const dmg =
      names.find((a) => a.name.includes(arch) && a.name.endsWith('.dmg')) ||
      names.find((a) => a.name.endsWith('.dmg'))
    return dmg?.url ?? null
  }
  const appImage = names.find((a) => a.name.endsWith('.appimage'))
  if (appImage) return appImage.url
  const deb = names.find((a) => a.name.endsWith('.deb'))
  return deb?.url ?? null
}

function fetchLatestRelease(): Promise<GhRelease> {
  const url = `https://api.github.com/repos/${REPO}/releases/latest`
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': `EncodeIt/${app.getVersion()}`,
          'X-GitHub-Api-Version': '2022-11-28'
        },
        timeout: 15000
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          https
            .get(res.headers.location, { headers: { 'User-Agent': `EncodeIt/${app.getVersion()}` } }, (res2) => {
              collect(res2, resolve, reject)
            })
            .on('error', reject)
          return
        }
        collect(res, resolve, reject)
      }
    )
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Update check timed out'))
    })
  })
}

function collect(
  res: import('http').IncomingMessage,
  resolve: (v: GhRelease) => void,
  reject: (e: Error) => void
): void {
  if (res.statusCode !== 200) {
    reject(new Error(`GitHub API HTTP ${res.statusCode}`))
    res.resume()
    return
  }
  const chunks: Buffer[] = []
  res.on('data', (c) => chunks.push(c as Buffer))
  res.on('end', () => {
    try {
      const json = JSON.parse(Buffer.concat(chunks).toString('utf8')) as GhRelease
      if (!json?.tag_name) throw new Error('Invalid release payload')
      resolve(json)
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)))
    }
  })
}

export class UpdateChecker {
  private status: UpdateStatus = {
    currentVersion: app.getVersion(),
    latestVersion: null,
    latestTag: null,
    releaseUrl: null,
    downloadUrl: null,
    updateAvailable: false,
    checkedAt: null,
    error: null
  }
  private timer: ReturnType<typeof setInterval> | null = null
  private onChange: (status: UpdateStatus) => void
  private enabled = true

  constructor(onChange: (status: UpdateStatus) => void) {
    this.onChange = onChange
  }

  getStatus(): UpdateStatus {
    return { ...this.status }
  }

  isEnabled(): boolean {
    return this.enabled
  }

  /** Enable/disable automatic GitHub checks. Clearing availability when disabled. */
  setEnabled(enabled: boolean, options?: { checkNow?: boolean }): void {
    this.enabled = enabled
    if (!enabled) {
      this.stop()
      this.status = { ...this.status, updateAvailable: false, error: null }
      this.onChange(this.getStatus())
      return
    }
    this.start(options?.checkNow !== false)
  }

  start(runImmediate = true): void {
    this.stop()
    if (!this.enabled) return
    if (runImmediate) void this.check()
    this.timer = setInterval(() => {
      if (this.enabled) void this.check()
    }, CHECK_INTERVAL_MS)
    this.timer.unref?.()
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  /**
   * @param force When true, run even if automatic checks are disabled (Help / Preferences “Check now”).
   */
  async check(force = false): Promise<UpdateStatus> {
    const currentVersion = app.getVersion()
    if (!this.enabled && !force) {
      this.status = {
        ...this.status,
        currentVersion,
        updateAvailable: false,
        checkedAt: Date.now(),
        error: null
      }
      this.onChange(this.getStatus())
      return this.getStatus()
    }
    try {
      const release = await fetchLatestRelease()
      const latestTag = release.tag_name
      const latestVersion = latestTag.replace(/^v/i, '')
      const snoozed = readSnoozedTag()
      const newer = isNewerVersion(latestVersion, currentVersion)
      const updateAvailable = newer && snoozed !== latestTag
      this.status = {
        currentVersion,
        latestVersion,
        latestTag,
        releaseUrl: release.html_url,
        downloadUrl: pickDownloadUrl(release.assets ?? []) ?? release.html_url,
        updateAvailable,
        checkedAt: Date.now(),
        error: null
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.warn('Update check failed', message)
      this.status = {
        ...this.status,
        currentVersion,
        checkedAt: Date.now(),
        error: message,
        updateAvailable: false
      }
    }
    this.onChange(this.getStatus())
    return this.getStatus()
  }

  dismissCurrent(): UpdateStatus {
    if (this.status.latestTag) writeSnoozedTag(this.status.latestTag)
    this.status = { ...this.status, updateAvailable: false }
    this.onChange(this.getStatus())
    return this.getStatus()
  }

  async openDownload(): Promise<void> {
    const url = this.status.downloadUrl || this.status.releaseUrl
    if (!url) {
      await shell.openExternal(`https://github.com/${REPO}/releases/latest`)
      return
    }
    await shell.openExternal(url)
  }
}
