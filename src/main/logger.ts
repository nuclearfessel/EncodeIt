import { app } from 'electron'
import fs from 'fs'
import path from 'path'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const MAX_BYTES = 2 * 1024 * 1024

let logFilePath: string | null = null

export function getLogPath(): string {
  if (!logFilePath) {
    const dir = path.join(app.getPath('userData'), 'logs')
    fs.mkdirSync(dir, { recursive: true })
    logFilePath = path.join(dir, 'encode-this.log')
  }
  return logFilePath
}

function rotateIfNeeded(file: string): void {
  try {
    if (!fs.existsSync(file)) return
    const size = fs.statSync(file).size
    if (size < MAX_BYTES) return
    const bak = `${file}.1`
    if (fs.existsSync(bak)) fs.unlinkSync(bak)
    fs.renameSync(file, bak)
  } catch {
    /* ignore */
  }
}

export function log(level: LogLevel, message: string, detail?: unknown): void {
  const stamp = new Date().toISOString()
  let line = `[${stamp}] ${level.toUpperCase()} ${message}`
  if (detail !== undefined) {
    try {
      line +=
        ' ' +
        (detail instanceof Error
          ? detail.stack || detail.message
          : typeof detail === 'string'
            ? detail
            : JSON.stringify(detail))
    } catch {
      line += ' [unserializable]'
    }
  }
  line += '\n'

  try {
    const file = getLogPath()
    rotateIfNeeded(file)
    fs.appendFileSync(file, line, 'utf8')
  } catch {
    /* ignore disk errors */
  }

  if (level === 'error') console.error(line.trim())
  else if (level === 'warn') console.warn(line.trim())
  else console.log(line.trim())
}

export const logger = {
  debug: (msg: string, detail?: unknown) => log('debug', msg, detail),
  info: (msg: string, detail?: unknown) => log('info', msg, detail),
  warn: (msg: string, detail?: unknown) => log('warn', msg, detail),
  error: (msg: string, detail?: unknown) => log('error', msg, detail)
}
