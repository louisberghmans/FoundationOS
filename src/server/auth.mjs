import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { HttpError, now, parseCookies, sha256, token } from './core.mjs'
import { capabilitiesFor } from './policy.mjs'

export const SESSION_COOKIE = 'foundationos_session'
const SESSION_DAYS = 14

export function validateUsername(value) {
  const username = String(value ?? '').trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) {
    throw new HttpError(400, 'Username must contain 3–32 letters, numbers, dots, dashes, or underscores.', 'validation_error')
  }
  return username
}

export function validatePassword(value) {
  const password = String(value ?? '')
  if (password.length < 12 || password.length > 200) {
    throw new HttpError(400, 'Password must contain at least 12 characters.', 'validation_error')
  }
  return password
}

export function passwordHash(password) {
  const salt = randomBytes(16)
  const derived = scryptSync(password, salt, 64)
  return `scrypt$${salt.toString('base64url')}$${derived.toString('base64url')}`
}

export function passwordMatches(password, encoded) {
  try {
    const [scheme, saltText, hashText] = String(encoded).split('$')
    if (scheme !== 'scrypt') return false
    const expected = Buffer.from(hashText, 'base64url')
    const actual = scryptSync(password, Buffer.from(saltText, 'base64url'), expected.length)
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

export function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    active: Boolean(row.active),
    capabilities: capabilitiesFor(row.role),
  }
}

export function createSession(db, accountId) {
  const rawToken = token(32)
  const csrfToken = token(24)
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString()
  db.prepare('insert into sessions (token_hash, account_id, csrf_token, expires_at, created_at) values (?, ?, ?, ?, ?)')
    .run(sha256(rawToken), accountId, csrfToken, expiresAt, now())
  return { rawToken, csrfToken, expiresAt }
}

export function sessionCookie(rawToken, secure) {
  return `${SESSION_COOKIE}=${encodeURIComponent(rawToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure ? '; Secure' : ''}`
}

export function clearSessionCookie(secure) {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`
}

export function getSession(db, req) {
  const rawToken = parseCookies(req.headers.cookie)[SESSION_COOKIE]
  if (!rawToken) return null
  const tokenHash = sha256(rawToken)
  const row = db.prepare(`select s.token_hash, s.csrf_token, s.expires_at,
    a.id, a.username, a.display_name, a.email, a.role, a.active
    from sessions s join accounts a on a.id = s.account_id
    where s.token_hash = ?`).get(tokenHash)
  if (!row || !row.active) return null
  if (row.expires_at <= now()) {
    db.prepare('delete from sessions where token_hash = ?').run(tokenHash)
    return null
  }
  return { tokenHash, csrfToken: row.csrf_token, user: publicUser(row) }
}

export function requireSession(db, req) {
  const session = getSession(db, req)
  if (!session) throw new HttpError(401, 'Sign in is required.', 'authentication_required')
  return session
}

export function requireCsrf(req, session) {
  const supplied = String(req.headers['x-csrf-token'] ?? '')
  const expected = session.csrfToken
  const valid = supplied.length === expected.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  if (!valid) throw new HttpError(403, 'Security token is invalid. Reload and try again.', 'csrf_failed')
}
