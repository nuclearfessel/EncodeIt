import http from 'http'
import type { IncomingMessage, ServerResponse } from 'http'
import { allPresets } from './presetCatalog'
import type { EncodeQueue } from './queue'

export interface IntakeServerOptions {
  port: number
  host?: string
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(Buffer.from(c)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  })
  res.end(payload)
}

export class IntakeServer {
  private server: http.Server | null = null
  private queue: EncodeQueue
  private port: number
  private host: string

  constructor(queue: EncodeQueue, options: IntakeServerOptions) {
    this.queue = queue
    this.port = options.port
    this.host = options.host ?? '127.0.0.1'
  }

  get address(): string {
    return `http://${this.host}:${this.port}`
  }

  start(): Promise<void> {
    if (this.server) return Promise.resolve()
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        void this.handle(req, res)
      })
      this.server.once('error', reject)
      this.server.listen(this.port, this.host, () => resolve())
    })
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve()
        return
      }
      this.server.close(() => {
        this.server = null
        resolve()
      })
    })
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method === 'OPTIONS') {
      sendJson(res, 204, {})
      return
    }

    const url = new URL(req.url ?? '/', `http://${this.host}`)

    try {
      if (req.method === 'GET' && url.pathname === '/health') {
        sendJson(res, 200, { ok: true, service: 'encodeit', address: this.address })
        return
      }

      if (req.method === 'GET' && url.pathname === '/presets') {
        sendJson(
          res,
          200,
          allPresets().map((p) => ({
            id: p.id,
            name: p.name,
            group: p.group,
            subgroup: p.subgroup,
            formatId: p.formatId
          }))
        )
        return
      }

      if (req.method === 'GET' && url.pathname === '/queue') {
        sendJson(res, 200, { jobs: this.queue.list() })
        return
      }

      if (req.method === 'POST' && url.pathname === '/queue/add') {
        const raw = await readBody(req)
        const body = JSON.parse(raw || '{}') as {
          paths?: string[]
          path?: string
          presetId?: string
          start?: boolean
        }
        const paths = [
          ...(body.paths ?? []),
          ...(body.path ? [body.path] : [])
        ].filter(Boolean)
        if (!paths.length) {
          sendJson(res, 400, { error: 'paths required' })
          return
        }
        const jobs = await this.queue.addFiles(paths, body.presetId)
        if (body.start) void this.queue.start()
        sendJson(res, 200, { ok: true, added: jobs.length, jobs })
        return
      }

      sendJson(res, 404, { error: 'not found' })
    } catch (err) {
      sendJson(res, 500, {
        error: err instanceof Error ? err.message : String(err)
      })
    }
  }
}
