import { createHash, randomBytes } from 'node:crypto'

export class HttpError extends Error {
  constructor(status, message, code = 'request_failed', details = undefined) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export const now = () => new Date().toISOString()
export const id = () => crypto.randomUUID()
export const token = (bytes = 32) => randomBytes(bytes).toString('base64url')
export const sha256 = (value) => createHash('sha256').update(value).digest('hex')

export function cleanText(value, name, { min = 1, max = 500 } = {}) {
  const result = String(value ?? '').trim()
  if (result.length < min || result.length > max) {
    throw new HttpError(400, `${name} must contain ${min} to ${max} characters.`, 'validation_error')
  }
  return result
}

export function optionalText(value, name, max = 5000) {
  const result = String(value ?? '').trim()
  if (result.length > max) throw new HttpError(400, `${name} is too long.`, 'validation_error')
  return result || null
}

export function enumValue(value, allowed, name) {
  const result = String(value ?? '')
  if (!allowed.includes(result)) throw new HttpError(400, `${name} is invalid.`, 'validation_error')
  return result
}

export function integer(value, name, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  const result = Number(value)
  if (!Number.isSafeInteger(result) || result < min || result > max) {
    throw new HttpError(400, `${name} must be a whole number.`, 'validation_error')
  }
  return result
}

export function parseCookies(header = '') {
  return Object.fromEntries(String(header).split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const index = part.indexOf('=')
    return index < 0 ? [part, ''] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))]
  }))
}

export async function readJson(req, maxBytes = 2 * 1024 * 1024) {
  const type = String(req.headers['content-type'] ?? '').split(';')[0].trim()
  if (type !== 'application/json') throw new HttpError(415, 'Content-Type must be application/json.', 'unsupported_media_type')
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBytes) throw new HttpError(413, 'Request body is too large.', 'body_too_large')
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  } catch {
    throw new HttpError(400, 'The request contains invalid JSON.', 'invalid_json')
  }
}

export function json(res, status, body, headers = {}) {
  const data = Buffer.from(JSON.stringify(body))
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': data.length,
    'Cache-Control': 'no-store',
    ...headers,
  })
  res.end(data)
}

export function securityHeaders(res) {
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
}

export function ensureSameOrigin(req, trustProxy = false) {
  const origin = req.headers.origin
  if (!origin) return
  const forwardedHost = trustProxy ? String(req.headers['x-forwarded-host'] ?? '').split(',')[0].trim() : ''
  const host = forwardedHost || req.headers.host
  const forwardedProto = trustProxy ? String(req.headers['x-forwarded-proto'] ?? '').split(',')[0].trim() : ''
  const protocol = forwardedProto || (req.socket.encrypted ? 'https' : 'http')
  if (!host || origin !== `${protocol}://${host}`) throw new HttpError(403, 'Cross-origin request rejected.', 'origin_rejected')
}
