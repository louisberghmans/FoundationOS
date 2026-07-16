import { createServer } from 'node:http'
import { backup as sqliteBackup } from 'node:sqlite'
import { cpSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  HttpError, cleanText, ensureSameOrigin, enumValue, id, integer, json, now, optionalText,
  readJson, securityHeaders, sha256, token,
} from './core.mjs'
import { audit, openDatabase, setupRequired, transaction } from './database.mjs'
import {
  clearSessionCookie, createSession, getSession, passwordHash, passwordMatches, publicUser,
  requireCsrf, requireSession, sessionCookie, validatePassword, validateUsername,
} from './auth.mjs'
import { requireCapability } from './policy.mjs'
import { validateCommitmentAgainstDecision } from './finance.mjs'
import { APP_VERSION } from './version.mjs'

const moduleDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(join(moduleDir, '..', '..'))
const STAGES = ['inbox', 'screening', 'diligence', 'decision', 'agreement', 'active', 'review', 'closed']
const CURRENCIES = /^[A-Z]{3}$/
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024

function currency(value, name = 'Currency') {
  const result = String(value ?? '').trim().toUpperCase()
  if (!CURRENCIES.test(result)) throw new HttpError(400, `${name} must be a three-letter ISO currency code.`, 'validation_error')
  return result
}

function dateOnly(value, name) {
  const result = String(value ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(Date.parse(`${result}T00:00:00Z`))) {
    throw new HttpError(400, `${name} must be a valid date.`, 'validation_error')
  }
  return result
}

function requestId(req) {
  const supplied = String(req.headers['x-request-id'] ?? '')
  return /^[a-zA-Z0-9._:-]{1,100}$/.test(supplied) ? supplied : id()
}

function setupPayload(db) {
  return { setupRequired: setupRequired(db), productName: 'FoundationOS', version: APP_VERSION }
}

function decisionStatus(db, roundId) {
  const eligible = db.prepare('select count(*) as count from decision_electorate where round_id = ? and recused = 0').get(roundId).count
  const responses = db.prepare(`select response from decision_responses
    where round_id = ? and active = 1 and account_id in
      (select account_id from decision_electorate where round_id = ? and recused = 0)`).all(roundId, roundId)
  if (responses.some((row) => row.response === 'object')) return 'blocked'
  if (eligible > 0 && responses.length === eligible) return 'accepted'
  return 'open'
}

function applicationSnapshot(db, user) {
  requireCapability(user, 'foundation.read')
  const foundation = db.prepare('select * from foundation limit 1').get()
  const members = db.prepare('select id, username, display_name, email, role, active from accounts order by display_name').all().map(publicUser)
  const objectives = db.prepare('select * from objectives order by target_date, title').all()
  const objectiveObservations = db.prepare('select * from objective_observations order by observed_at desc, recorded_at desc').all()
  const organizations = db.prepare('select * from organizations order by name').all()
  const opportunities = db.prepare(`select o.*, z.name as organization_name, x.title as objective_title, a.display_name as steward_name
    from opportunities o
    left join organizations z on z.id = o.organization_id
    left join objectives x on x.id = o.objective_id
    left join accounts a on a.id = o.steward_id
    where o.disposition is null order by o.updated_at desc`).all()
  const decisions = db.prepare(`select d.*, o.title as opportunity_title,
    (select count(*) from decision_electorate e where e.round_id = d.id and e.recused = 0) as eligible_count,
    (select count(*) from decision_responses r where r.round_id = d.id and r.active = 1) as response_count,
    (select count(*) from decision_responses r where r.round_id = d.id and r.active = 1 and r.response = 'object') as objection_count
    from decision_rounds d join opportunities o on o.id = d.opportunity_id
    order by d.opened_at desc`).all()
  const decisionResponses = db.prepare(`select r.*, a.display_name, e.recused, e.recusal_reason
    from decision_responses r join accounts a on a.id = r.account_id
    join decision_electorate e on e.round_id = r.round_id and e.account_id = r.account_id
    where r.active = 1 order by r.created_at`).all()
  const electorate = db.prepare(`select e.*, a.display_name, a.role from decision_electorate e
    join accounts a on a.id = e.account_id order by a.display_name`).all()
  const funds = db.prepare('select * from funds order by name').all()
  const budgets = db.prepare(`select b.*, f.name as fund_name, o.title as objective_title
    from budgets b join funds f on f.id = b.fund_id left join objectives o on o.id = b.objective_id
    order by b.fiscal_year desc, f.name`).all()
  const commitments = db.prepare(`select c.*, o.title as opportunity_title, f.name as fund_name,
    c.base_minor + coalesce((select sum(a.delta_base_minor) from commitment_amendments a where a.commitment_id = c.id), 0) as adjusted_base_minor,
    c.amount_minor + coalesce((select sum(a.delta_minor) from commitment_amendments a where a.commitment_id = c.id), 0) as adjusted_amount_minor,
    coalesce((select sum(case when p.kind = 'payment' then p.base_minor when p.kind in ('refund','reversal') then -p.base_minor else 0 end)
      from payments p where p.commitment_id = c.id), 0) as paid_base_minor
    from commitments c join opportunities o on o.id = c.opportunity_id join funds f on f.id = c.fund_id
    order by c.created_at desc`).all()
  const payments = db.prepare('select * from payments order by payment_date desc, posted_at desc').all()
  const agreements = db.prepare('select * from grant_agreements order by agreement_date desc').all()
  const amendments = db.prepare('select * from commitment_amendments order by effective_date desc, created_at desc').all()
  const schedules = db.prepare('select * from disbursement_schedules order by due_date, sequence').all()
  const documents = db.prepare(`select d.*, v.id as version_id, v.version, v.original_name, v.content_type, v.byte_size, v.checksum_sha256, v.scan_status, v.uploaded_at
    from documents d join document_versions v on v.document_id = d.id
    where v.version = (select max(v2.version) from document_versions v2 where v2.document_id = d.id)
    order by v.uploaded_at desc`).all()
  const meetings = db.prepare(`select m.*, (select count(*) from meeting_slots s where s.meeting_id = m.id) as slot_count
    from meetings m order by m.created_at desc`).all()
  const meetingSlots = db.prepare('select * from meeting_slots order by starts_at').all()
  const availability = db.prepare('select * from meeting_availability').all()
  const agendaItems = db.prepare('select * from agenda_items order by meeting_id, position').all()
  const reviews = db.prepare('select * from grant_reviews order by review_date desc').all()
  const auditEvents = user.role === 'administrator' || user.role === 'foundation_manager' || user.role === 'finance_manager'
    ? db.prepare(`select e.*, a.display_name from audit_events e left join accounts a on a.id = e.actor_id order by e.created_at desc limit 50`).all()
    : []

  return { applicationVersion: APP_VERSION, foundation, members, objectives, objectiveObservations, organizations, opportunities, decisions, decisionResponses, electorate, funds, budgets, commitments, agreements, amendments, schedules, payments, documents, meetings, meetingSlots, availability, agendaItems, reviews, auditEvents, stages: STAGES }
}

function serveStatic(res, publicDir, path) {
  const relative = path === '/' ? 'index.html' : path.replace(/^\/+/, '')
  let file = resolve(join(publicDir, relative))
  if (!(file === publicDir || file.startsWith(`${publicDir}${sep}`))) throw new HttpError(404, 'Not found.', 'not_found')
  if (!existsSync(file) || !statSync(file).isFile()) file = join(publicDir, 'index.html')
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8' }
  const data = readFileSync(file)
  res.writeHead(200, {
    'Content-Type': types[extname(file)] ?? 'application/octet-stream',
    'Content-Length': data.length,
    'Cache-Control': extname(file) === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  })
  res.end(data)
}

export function createApp(options = {}) {
  const dataDir = resolve(options.dataDir ?? process.env.FOUNDATION_OS_DATA_DIR ?? join(rootDir, 'data'))
  const publicDir = resolve(options.publicDir ?? process.env.FOUNDATION_OS_PUBLIC_DIR ?? join(rootDir, 'dist'))
  const documentsDir = join(dataDir, 'documents')
  const secureCookies = options.secureCookies ?? process.env.FOUNDATION_OS_COOKIE_SECURE === 'true'
  const trustProxy = options.trustProxy ?? process.env.FOUNDATION_OS_TRUST_PROXY === 'true'
  mkdirSync(documentsDir, { recursive: true })
  const db = openDatabase(dataDir)
  const loginAttempts = new Map()

  const server = createServer(async (req, res) => {
    securityHeaders(res)
    const reqId = requestId(req)
    res.setHeader('X-Request-Id', reqId)
    try {
      const url = new URL(req.url, 'http://foundationos.local')
      const path = decodeURIComponent(url.pathname)

      if (req.method === 'GET' && path === '/health/live') return json(res, 200, { status: 'ok' })
      if (req.method === 'GET' && path === '/health/ready') {
        db.prepare('select 1').get()
        return json(res, 200, { status: 'ready' })
      }

      if (path.startsWith('/api/')) {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) ensureSameOrigin(req, trustProxy)

        if (req.method === 'GET' && path === '/api/bootstrap') {
          const session = getSession(db, req)
          return json(res, 200, { ...setupPayload(db), user: session?.user ?? null, csrfToken: session?.csrfToken ?? null })
        }

        if (req.method === 'POST' && path === '/api/setup') {
          if (!setupRequired(db)) throw new HttpError(409, 'Setup has already been completed.', 'setup_complete')
          const body = await readJson(req)
          const timestamp = now()
          const foundationId = id()
          const accountId = id()
          const fundId = id()
          const baseCurrency = currency(body.baseCurrency)
          const username = validateUsername(body.username)
          const password = validatePassword(body.password)
          const foundationName = cleanText(body.foundationName, 'Foundation name', { max: 120 })
          const displayName = cleanText(body.adminDisplayName, 'Administrator name', { max: 80 })
          const email = optionalText(body.email, 'Email address', 254)
          const fiscalYear = integer(body.fiscalYear ?? new Date().getUTCFullYear(), 'Fiscal year', { min: 2000, max: 2200 })
          const annualBudgetMinor = integer(body.annualBudgetMinor ?? 0, 'Annual budget', { min: 0 })
          transaction(db, () => {
            db.prepare(`insert into foundation
              (id, name, locale, timezone, base_currency, fiscal_year_start_month, mission, setup_completed_at, created_at, updated_at)
              values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
              .run(foundationId, foundationName, cleanText(body.locale ?? 'en', 'Locale', { max: 10 }), cleanText(body.timezone ?? 'UTC', 'Time zone', { max: 100 }), baseCurrency, integer(body.fiscalYearStartMonth ?? 1, 'Fiscal year start month', { min: 1, max: 12 }), optionalText(body.mission, 'Mission', 2000), timestamp, timestamp, timestamp)
            db.prepare(`insert into accounts
              (id, username, display_name, email, password_hash, role, active, created_at, updated_at)
              values (?, ?, ?, ?, ?, 'administrator', 1, ?, ?)`)
              .run(accountId, username, displayName, email, passwordHash(password), timestamp, timestamp)
            db.prepare('insert into funds (id, name, currency, created_at, updated_at) values (?, ?, ?, ?, ?)')
              .run(fundId, cleanText(body.fundName ?? 'General fund', 'Fund name', { max: 100 }), baseCurrency, timestamp, timestamp)
            if (annualBudgetMinor > 0) {
              db.prepare(`insert into budgets (id, fund_id, objective_id, fiscal_year, amount_minor, status, created_by, created_at, updated_at)
                values (?, ?, null, ?, ?, 'approved', ?, ?, ?)`).run(id(), fundId, fiscalYear, annualBudgetMinor, accountId, timestamp, timestamp)
            }
            audit(db, { actorId: accountId, action: 'setup.complete', objectType: 'foundation', objectId: foundationId, summary: { foundationName, baseCurrency }, requestId: reqId })
          })
          const session = createSession(db, accountId)
          const row = db.prepare('select * from accounts where id = ?').get(accountId)
          return json(res, 201, { ...setupPayload(db), user: publicUser(row), csrfToken: session.csrfToken }, { 'Set-Cookie': sessionCookie(session.rawToken, secureCookies) })
        }

        if (req.method === 'POST' && path === '/api/auth/login') {
          if (setupRequired(db)) throw new HttpError(409, 'Complete initial setup first.', 'setup_required')
          const body = await readJson(req)
          const username = validateUsername(body.username)
          const ip = String(trustProxy ? (req.headers['x-forwarded-for'] ?? req.socket.remoteAddress) : req.socket.remoteAddress ?? 'unknown').split(',')[0].trim()
          const key = `${ip}:${username}`
          const attempt = loginAttempts.get(key)
          if (attempt?.until > Date.now() && attempt.count >= 6) throw new HttpError(429, 'Too many attempts. Try again later.', 'rate_limited')
          const row = db.prepare('select * from accounts where username = ? and active = 1').get(username)
          if (!row || !passwordMatches(String(body.password ?? ''), row.password_hash)) {
            loginAttempts.set(key, attempt?.until > Date.now() ? { count: attempt.count + 1, until: attempt.until } : { count: 1, until: Date.now() + 15 * 60_000 })
            throw new HttpError(401, 'Username or password is incorrect.', 'invalid_credentials')
          }
          loginAttempts.delete(key)
          const session = createSession(db, row.id)
          audit(db, { actorId: row.id, action: 'auth.login', objectType: 'account', objectId: row.id, requestId: reqId })
          return json(res, 200, { user: publicUser(row), csrfToken: session.csrfToken }, { 'Set-Cookie': sessionCookie(session.rawToken, secureCookies) })
        }

        if (req.method === 'POST' && path === '/api/invitations/redeem') {
          const body = await readJson(req)
          const rawToken = String(body.token ?? '')
          const invitation = db.prepare('select * from invitations where token_hash = ?').get(sha256(rawToken))
          if (!invitation || invitation.used_at || invitation.expires_at <= now()) {
            throw new HttpError(400, 'This invitation is invalid or expired.', 'invalid_invitation')
          }
          const accountId = id()
          const timestamp = now()
          const username = validateUsername(body.username)
          const password = validatePassword(body.password)
          const displayName = cleanText(body.displayName, 'Display name', { max: 80 })
          transaction(db, () => {
            db.prepare(`insert into accounts
              (id, username, display_name, email, password_hash, role, active, created_at, updated_at)
              values (?, ?, ?, ?, ?, ?, 1, ?, ?)`)
              .run(accountId, username, displayName, invitation.email, passwordHash(password), invitation.role, timestamp, timestamp)
            db.prepare('update invitations set used_at = ?, used_by = ? where id = ?').run(timestamp, accountId, invitation.id)
            audit(db, { actorId: accountId, action: 'invitation.redeem', objectType: 'invitation', objectId: invitation.id, summary: { role: invitation.role }, requestId: reqId })
          })
          const createdSession = createSession(db, accountId)
          const row = db.prepare('select * from accounts where id = ?').get(accountId)
          return json(res, 201, { user: publicUser(row), csrfToken: createdSession.csrfToken }, { 'Set-Cookie': sessionCookie(createdSession.rawToken, secureCookies) })
        }

        if (req.method === 'POST' && path === '/api/auth/logout') {
          const session = requireSession(db, req)
          requireCsrf(req, session)
          db.prepare('delete from sessions where token_hash = ?').run(session.tokenHash)
          audit(db, { actorId: session.user.id, action: 'auth.logout', objectType: 'account', objectId: session.user.id, requestId: reqId })
          return json(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie(secureCookies) })
        }

        const session = requireSession(db, req)
        if (!['GET', 'HEAD'].includes(req.method)) requireCsrf(req, session)
        const user = session.user

        if (req.method === 'GET' && path === '/api/app') return json(res, 200, applicationSnapshot(db, user))

        if (req.method === 'POST' && path === '/api/admin/backups') {
          if (user.role !== 'administrator') throw new HttpError(403, 'Only administrators can create backups.', 'permission_denied')
          const backupId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${id().slice(0, 8)}`
          const backupDir = join(dataDir, 'backups', backupId)
          mkdirSync(backupDir, { recursive: true })
          const timestamp = now()
          audit(db, { actorId: user.id, action: 'backup.create', objectType: 'backup', objectId: backupId, summary: {}, requestId: reqId })
          await sqliteBackup(db, join(backupDir, 'foundationos.sqlite3'))
          if (existsSync(documentsDir)) cpSync(documentsDir, join(backupDir, 'documents'), { recursive: true })
          const databaseBytes = readFileSync(join(backupDir, 'foundationos.sqlite3'))
          const manifest = {
            format: 1,
            product: 'FoundationOS',
            version: APP_VERSION,
            backupId,
            createdAt: timestamp,
            databaseSha256: sha256(databaseBytes),
            documentCount: Number(db.prepare('select count(*) as count from document_versions').get().count),
          }
          writeFileSync(join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 })
          return json(res, 201, manifest)
        }

        if (req.method === 'POST' && path === '/api/invitations') {
          requireCapability(user, 'member.read')
          if (user.role !== 'administrator') throw new HttpError(403, 'Only administrators can invite members.', 'permission_denied')
          const body = await readJson(req)
          const role = enumValue(body.role, ['foundation_manager', 'voting_member', 'finance_manager', 'project_steward', 'reviewer', 'viewer'], 'Role')
          const email = optionalText(body.email, 'Email address', 254)
          const rawToken = token(32)
          const invitationId = id()
          const expiresAt = new Date(Date.now() + 7 * 86400_000).toISOString()
          db.prepare(`insert into invitations (id, token_hash, email, role, created_by, expires_at, created_at)
            values (?, ?, ?, ?, ?, ?, ?)`).run(invitationId, sha256(rawToken), email, role, user.id, expiresAt, now())
          audit(db, { actorId: user.id, action: 'invitation.create', objectType: 'invitation', objectId: invitationId, summary: { role, email }, requestId: reqId })
          return json(res, 201, { id: invitationId, token: rawToken, expiresAt })
        }

        if (req.method === 'POST' && path === '/api/objectives') {
          requireCapability(user, 'strategy.manage')
          const body = await readJson(req)
          const objectiveId = id()
          const timestamp = now()
          db.prepare(`insert into objectives
            (id, title, outcome, population, geography, metric, unit, baseline_value, current_value, target_value, target_date, causal_thesis, assumptions, evidence_status, created_by, created_at, updated_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_measured', ?, ?, ?)`)
            .run(objectiveId, cleanText(body.title, 'Title', { max: 160 }), cleanText(body.outcome, 'Outcome', { max: 1000 }), optionalText(body.population, 'Population', 300), optionalText(body.geography, 'Geography', 300), cleanText(body.metric, 'Metric', { max: 160 }), cleanText(body.unit, 'Unit', { max: 80 }), body.baselineValue == null ? null : Number(body.baselineValue), body.baselineValue == null ? null : Number(body.baselineValue), Number(body.targetValue), dateOnly(body.targetDate, 'Target date'), optionalText(body.causalThesis, 'Causal thesis', 3000), optionalText(body.assumptions, 'Assumptions', 3000), user.id, timestamp, timestamp)
          audit(db, { actorId: user.id, action: 'objective.create', objectType: 'objective', objectId: objectiveId, summary: { title: body.title }, requestId: reqId })
          return json(res, 201, { id: objectiveId })
        }

        const observationMatch = /^\/api\/objectives\/([^/]+)\/observations$/.exec(path)
        if (req.method === 'POST' && observationMatch) {
          requireCapability(user, 'strategy.manage')
          const objective = db.prepare('select * from objectives where id = ?').get(observationMatch[1])
          if (!objective) throw new HttpError(404, 'Objective not found.', 'not_found')
          const body = await readJson(req)
          const observationId = id()
          const timestamp = now()
          const state = enumValue(body.state, ['reported', 'reviewed', 'verified'], 'Evidence state')
          const value = Number(body.value)
          if (!Number.isFinite(value)) throw new HttpError(400, 'Observation value must be a number.', 'validation_error')
          transaction(db, () => {
            db.prepare(`insert into objective_observations
              (id, objective_id, observed_at, value, state, source, methodology, confidence_note, recorded_by, recorded_at)
              values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
              .run(observationId, objective.id, dateOnly(body.observedAt, 'Observation date'), value, state, optionalText(body.source, 'Source', 1000), optionalText(body.methodology, 'Methodology', 3000), optionalText(body.confidenceNote, 'Confidence note', 2000), user.id, timestamp)
            db.prepare(`update objectives set current_value = ?, evidence_status = ?, last_evidence_at = ?, updated_at = ? where id = ?`)
              .run(value, state, dateOnly(body.observedAt, 'Observation date'), timestamp, objective.id)
            audit(db, { actorId: user.id, action: 'objective.observe', objectType: 'objective', objectId: objective.id, summary: { value, state }, requestId: reqId })
          })
          return json(res, 201, { id: observationId })
        }

        if (req.method === 'POST' && path === '/api/budgets') {
          requireCapability(user, 'finance.manage')
          const body = await readJson(req)
          const budgetId = id()
          const timestamp = now()
          db.prepare(`insert into budgets
            (id, fund_id, objective_id, fiscal_year, amount_minor, status, created_by, created_at, updated_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(budgetId, cleanText(body.fundId, 'Fund', { max: 100 }), body.objectiveId || null, integer(body.fiscalYear, 'Fiscal year', { min: 2000, max: 2200 }), integer(body.amountMinor, 'Budget amount', { min: 0 }), enumValue(body.status ?? 'approved', ['draft', 'approved'], 'Budget status'), user.id, timestamp, timestamp)
          audit(db, { actorId: user.id, action: 'budget.create', objectType: 'budget', objectId: budgetId, summary: { fiscalYear: body.fiscalYear, amountMinor: body.amountMinor }, requestId: reqId })
          return json(res, 201, { id: budgetId })
        }

        if (req.method === 'POST' && path === '/api/opportunities') {
          requireCapability(user, 'opportunity.manage')
          const body = await readJson(req)
          const timestamp = now()
          const opportunityId = id()
          let organizationId = body.organizationId || null
          transaction(db, () => {
            if (!organizationId && body.organizationName) {
              organizationId = id()
              db.prepare(`insert into organizations (id, name, country_code, website, summary, created_by, created_at, updated_at)
                values (?, ?, ?, ?, ?, ?, ?, ?)`).run(organizationId, cleanText(body.organizationName, 'Organization name', { max: 160 }), optionalText(body.countryCode, 'Country code', 2)?.toUpperCase() ?? null, optionalText(body.website, 'Website', 500), null, user.id, timestamp, timestamp)
            }
            db.prepare(`insert into opportunities
              (id, title, organization_id, objective_id, stage, summary, request_minor, request_currency, steward_id, created_by, created_at, updated_at)
              values (?, ?, ?, ?, 'inbox', ?, ?, ?, ?, ?, ?, ?)`)
              .run(opportunityId, cleanText(body.title, 'Opportunity title', { max: 180 }), organizationId, body.objectiveId || null, optionalText(body.summary, 'Summary', 5000), integer(body.requestMinor ?? 0, 'Requested amount', { min: 0 }), currency(body.requestCurrency), body.stewardId || null, user.id, timestamp, timestamp)
            audit(db, { actorId: user.id, action: 'opportunity.create', objectType: 'opportunity', objectId: opportunityId, summary: { title: body.title }, requestId: reqId })
          })
          return json(res, 201, { id: opportunityId })
        }

        const transitionMatch = /^\/api\/opportunities\/([^/]+)\/stage$/.exec(path)
        if (req.method === 'PATCH' && transitionMatch) {
          requireCapability(user, 'opportunity.manage')
          const body = await readJson(req)
          const opportunity = db.prepare('select * from opportunities where id = ?').get(transitionMatch[1])
          if (!opportunity) throw new HttpError(404, 'Opportunity not found.', 'not_found')
          const toStage = enumValue(body.stage, STAGES, 'Stage')
          const fromIndex = STAGES.indexOf(opportunity.stage)
          const toIndex = STAGES.indexOf(toStage)
          if (Math.abs(toIndex - fromIndex) > 1) throw new HttpError(409, 'Move through one workflow stage at a time.', 'invalid_transition')
          if (opportunity.stage === 'decision' && toStage === 'agreement') {
            const accepted = db.prepare(`select 1 from decision_rounds where opportunity_id = ? and proposal_version = ? and status = 'accepted'`).get(opportunity.id, opportunity.version)
            if (!accepted) throw new HttpError(409, 'An accepted explicit decision is required before agreement.', 'decision_required')
          }
          const timestamp = now()
          transaction(db, () => {
            db.prepare('update opportunities set stage = ?, version = version + 1, updated_at = ? where id = ?').run(toStage, timestamp, opportunity.id)
            db.prepare(`insert into opportunity_transitions (id, opportunity_id, from_stage, to_stage, reason, actor_id, created_at)
              values (?, ?, ?, ?, ?, ?, ?)`).run(id(), opportunity.id, opportunity.stage, toStage, optionalText(body.reason, 'Reason', 1000), user.id, timestamp)
            audit(db, { actorId: user.id, action: 'opportunity.transition', objectType: 'opportunity', objectId: opportunity.id, summary: { from: opportunity.stage, to: toStage }, requestId: reqId })
          })
          return json(res, 200, { id: opportunity.id, stage: toStage })
        }

        if (req.method === 'POST' && path === '/api/decisions') {
          requireCapability(user, 'decision.manage')
          const body = await readJson(req)
          const opportunity = db.prepare('select * from opportunities where id = ?').get(String(body.opportunityId ?? ''))
          if (!opportunity) throw new HttpError(404, 'Opportunity not found.', 'not_found')
          const existingOpen = db.prepare(`select 1 from decision_rounds where opportunity_id = ? and status in ('open','blocked')`).get(opportunity.id)
          if (existingOpen) throw new HttpError(409, 'This opportunity already has an open decision round.', 'decision_open')
          const eligibleIds = Array.isArray(body.eligibleMemberIds) ? [...new Set(body.eligibleMemberIds.map(String))] : []
          if (!eligibleIds.length) throw new HttpError(400, 'Choose at least one eligible member.', 'validation_error')
          const eligibleAccounts = db.prepare(`select id from accounts where active = 1 and id in (${eligibleIds.map(() => '?').join(',')})`).all(...eligibleIds)
          if (eligibleAccounts.length !== eligibleIds.length) throw new HttpError(400, 'One or more eligible members are invalid.', 'validation_error')
          const roundId = id()
          const timestamp = now()
          const roundNumber = Number(db.prepare('select coalesce(max(round_number), 0) + 1 as value from decision_rounds where opportunity_id = ?').get(opportunity.id).value)
          transaction(db, () => {
            db.prepare(`insert into decision_rounds
              (id, opportunity_id, round_number, status, proposal_version, amount_minor, currency, title, opened_by, opened_at)
              values (?, ?, ?, 'open', ?, ?, ?, ?, ?, ?)`)
              .run(roundId, opportunity.id, roundNumber, opportunity.version, integer(body.amountMinor ?? opportunity.request_minor, 'Decision amount', { min: 0 }), currency(body.currency ?? opportunity.request_currency), cleanText(body.title ?? `Decision: ${opportunity.title}`, 'Decision title', { max: 200 }), user.id, timestamp)
            const insert = db.prepare('insert into decision_electorate (round_id, account_id, recused) values (?, ?, 0)')
            for (const accountId of eligibleIds) insert.run(roundId, accountId)
            audit(db, { actorId: user.id, action: 'decision.open', objectType: 'decision_round', objectId: roundId, summary: { opportunityId: opportunity.id, electorateSize: eligibleIds.length }, requestId: reqId })
          })
          return json(res, 201, { id: roundId, status: 'open' })
        }

        const responseMatch = /^\/api\/decisions\/([^/]+)\/respond$/.exec(path)
        if (req.method === 'POST' && responseMatch) {
          requireCapability(user, 'decision.respond')
          const body = await readJson(req)
          const round = db.prepare(`select d.*, e.recused from decision_rounds d
            join decision_electorate e on e.round_id = d.id and e.account_id = ? where d.id = ?`).get(user.id, responseMatch[1])
          if (!round || round.recused) throw new HttpError(403, 'You are not eligible to respond in this round.', 'not_eligible')
          if (!['open', 'blocked'].includes(round.status)) throw new HttpError(409, 'This decision round is closed.', 'decision_closed')
          const response = enumValue(body.response, ['support', 'neutral', 'object'], 'Response')
          const note = optionalText(body.note, 'Response note', 3000)
          if (response === 'object' && !note) throw new HttpError(400, 'An objection requires a reason.', 'objection_reason_required')
          const responseId = id()
          const timestamp = now()
          transaction(db, () => {
            db.prepare('update decision_responses set active = 0 where round_id = ? and account_id = ? and active = 1').run(round.id, user.id)
            db.prepare(`insert into decision_responses (id, round_id, account_id, response, note, active, created_at)
              values (?, ?, ?, ?, ?, 1, ?)`).run(responseId, round.id, user.id, response, note, timestamp)
            const status = decisionStatus(db, round.id)
            db.prepare('update decision_rounds set status = ?, closed_at = ? where id = ?').run(status, status === 'accepted' ? timestamp : null, round.id)
            audit(db, { actorId: user.id, action: 'decision.respond', objectType: 'decision_round', objectId: round.id, summary: { response, status }, requestId: reqId })
          })
          return json(res, 200, { id: round.id, status: decisionStatus(db, round.id) })
        }

        if (req.method === 'POST' && path === '/api/commitments') {
          requireCapability(user, 'finance.manage')
          const body = await readJson(req)
          const round = db.prepare(`select d.*, o.id as opportunity_id from decision_rounds d join opportunities o on o.id = d.opportunity_id
            where d.id = ? and d.status = 'accepted'`).get(String(body.decisionRoundId ?? ''))
          if (!round) throw new HttpError(409, 'An accepted decision round is required.', 'decision_required')
          if (db.prepare('select 1 from commitments where decision_round_id = ? and status != ?').get(round.id, 'cancelled')) throw new HttpError(409, 'A commitment already exists for this decision.', 'commitment_exists')
          const foundation = db.prepare('select base_currency from foundation limit 1').get()
          const validated = validateCommitmentAgainstDecision({
            decision: round,
            amountMinor: integer(body.amountMinor ?? round.amount_minor, 'Commitment amount', { min: 1 }),
            currency: currency(body.currency ?? round.currency),
            exchangeRate: body.exchangeRate ?? '1',
          })
          const commitmentId = id()
          const timestamp = now()
          db.prepare(`insert into commitments
            (id, opportunity_id, decision_round_id, fund_id, amount_minor, currency, base_minor, base_currency, exchange_rate, rate_date, status, created_by, created_at, updated_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`)
            .run(commitmentId, round.opportunity_id, round.id, String(body.fundId), validated.amountMinor, validated.currency, integer(body.baseMinor, 'Base amount', { min: 1 }), foundation.base_currency, validated.exchangeRate, dateOnly(body.rateDate, 'Rate date'), user.id, timestamp, timestamp)
          audit(db, { actorId: user.id, action: 'commitment.create', objectType: 'commitment', objectId: commitmentId, summary: { decisionRoundId: round.id }, requestId: reqId })
          return json(res, 201, { id: commitmentId })
        }

        if (req.method === 'POST' && path === '/api/agreements') {
          requireCapability(user, 'grant.manage')
          const body = await readJson(req)
          const commitment = db.prepare('select 1 from commitments where id = ?').get(String(body.commitmentId ?? ''))
          if (!commitment) throw new HttpError(404, 'Commitment not found.', 'not_found')
          const startsOn = dateOnly(body.startsOn, 'Start date')
          const endsOn = dateOnly(body.endsOn, 'End date')
          if (endsOn < startsOn) throw new HttpError(400, 'Agreement end date cannot be before its start date.', 'validation_error')
          const agreementId = id()
          const timestamp = now()
          db.prepare(`insert into grant_agreements
            (id, commitment_id, document_id, reference, agreement_date, starts_on, ends_on, status, created_by, created_at, updated_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(agreementId, String(body.commitmentId), body.documentId || null, optionalText(body.reference, 'Reference', 200), dateOnly(body.agreementDate, 'Agreement date'), startsOn, endsOn, enumValue(body.status ?? 'executed', ['draft', 'executed'], 'Agreement status'), user.id, timestamp, timestamp)
          audit(db, { actorId: user.id, action: 'agreement.create', objectType: 'agreement', objectId: agreementId, summary: { commitmentId: body.commitmentId, startsOn, endsOn }, requestId: reqId })
          return json(res, 201, { id: agreementId })
        }

        const amendmentMatch = /^\/api\/commitments\/([^/]+)\/amendments$/.exec(path)
        if (req.method === 'POST' && amendmentMatch) {
          requireCapability(user, 'finance.manage')
          const commitment = db.prepare('select * from commitments where id = ?').get(amendmentMatch[1])
          if (!commitment || commitment.status !== 'active') throw new HttpError(404, 'Active commitment not found.', 'not_found')
          const body = await readJson(req)
          const kind = enumValue(body.kind, ['increase', 'decrease', 'extension', 'cancellation'], 'Amendment type')
          const deltaMinor = integer(body.deltaMinor ?? 0, 'Transaction-currency change')
          const deltaBaseMinor = integer(body.deltaBaseMinor ?? 0, 'Base-currency change')
          if (kind === 'increase' && (deltaMinor <= 0 || deltaBaseMinor <= 0)) throw new HttpError(400, 'An increase must use positive amounts.', 'validation_error')
          if (['decrease', 'cancellation'].includes(kind) && (deltaMinor > 0 || deltaBaseMinor > 0)) throw new HttpError(400, 'A decrease or cancellation cannot use positive amounts.', 'validation_error')
          if (kind === 'extension' && !body.newEndDate) throw new HttpError(400, 'An extension requires a new end date.', 'validation_error')
          if (kind === 'increase') {
            const decision = db.prepare(`select 1 from decision_rounds where id = ? and opportunity_id = ? and status = 'accepted'`).get(String(body.decisionRoundId ?? ''), commitment.opportunity_id)
            if (!decision) throw new HttpError(409, 'An accepted decision round is required for a commitment increase.', 'decision_required')
          }
          const amendmentId = id()
          const timestamp = now()
          transaction(db, () => {
            db.prepare(`insert into commitment_amendments
              (id, commitment_id, decision_round_id, kind, delta_minor, delta_base_minor, currency, effective_date, new_end_date, reason, created_by, created_at)
              values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
              .run(amendmentId, commitment.id, body.decisionRoundId || null, kind, deltaMinor, deltaBaseMinor, commitment.currency, dateOnly(body.effectiveDate, 'Effective date'), body.newEndDate ? dateOnly(body.newEndDate, 'New end date') : null, cleanText(body.reason, 'Reason', { max: 2000 }), user.id, timestamp)
            if (kind === 'cancellation') db.prepare(`update commitments set status = 'cancelled', updated_at = ? where id = ?`).run(timestamp, commitment.id)
            if (body.newEndDate) db.prepare(`update grant_agreements set ends_on = ?, updated_at = ? where commitment_id = ? and status = 'executed'`).run(dateOnly(body.newEndDate, 'New end date'), timestamp, commitment.id)
            audit(db, { actorId: user.id, action: 'commitment.amend', objectType: 'commitment', objectId: commitment.id, summary: { kind, deltaMinor, deltaBaseMinor }, requestId: reqId })
          })
          return json(res, 201, { id: amendmentId })
        }

        if (req.method === 'POST' && path === '/api/disbursement-schedules') {
          requireCapability(user, 'finance.manage')
          const body = await readJson(req)
          const commitment = db.prepare('select * from commitments where id = ?').get(String(body.commitmentId ?? ''))
          if (!commitment) throw new HttpError(404, 'Commitment not found.', 'not_found')
          const scheduleId = id()
          const timestamp = now()
          const sequence = Number(db.prepare('select coalesce(max(sequence), 0) + 1 as value from disbursement_schedules where commitment_id = ?').get(commitment.id).value)
          db.prepare(`insert into disbursement_schedules
            (id, commitment_id, sequence, due_date, amount_minor, currency, condition, status, created_by, created_at, updated_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(scheduleId, commitment.id, sequence, dateOnly(body.dueDate, 'Due date'), integer(body.amountMinor, 'Installment amount', { min: 1 }), currency(body.currency ?? commitment.currency), optionalText(body.condition, 'Release condition', 1000), enumValue(body.status ?? 'planned', ['planned', 'ready', 'held'], 'Installment status'), user.id, timestamp, timestamp)
          audit(db, { actorId: user.id, action: 'schedule.create', objectType: 'disbursement_schedule', objectId: scheduleId, summary: { commitmentId: commitment.id, sequence }, requestId: reqId })
          return json(res, 201, { id: scheduleId })
        }

        if (req.method === 'POST' && path === '/api/payments') {
          requireCapability(user, 'finance.manage')
          const body = await readJson(req)
          const commitment = db.prepare(`select c.*, f.base_currency from commitments c cross join foundation f where c.id = ? and c.status = 'active'`).get(String(body.commitmentId ?? ''))
          if (!commitment) throw new HttpError(404, 'Active commitment not found.', 'not_found')
          const schedule = body.scheduleId
            ? db.prepare('select * from disbursement_schedules where id = ? and commitment_id = ?').get(String(body.scheduleId), commitment.id)
            : null
          if (body.scheduleId && !schedule) throw new HttpError(400, 'Installment does not belong to this commitment.', 'validation_error')
          const paymentId = id()
          const timestamp = now()
          transaction(db, () => {
            db.prepare(`insert into payments
              (id, commitment_id, kind, amount_minor, currency, base_minor, base_currency, exchange_rate, rate_date, payment_date, reference, schedule_id, posted_by, posted_at)
              values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
              .run(paymentId, commitment.id, enumValue(body.kind ?? 'payment', ['payment', 'refund'], 'Transaction type'), integer(body.amountMinor, 'Amount', { min: 1 }), currency(body.currency ?? commitment.currency), integer(body.baseMinor, 'Base amount', { min: 1 }), commitment.base_currency, cleanText(body.exchangeRate ?? '1', 'Exchange rate', { max: 40 }), dateOnly(body.rateDate, 'Rate date'), dateOnly(body.paymentDate, 'Payment date'), optionalText(body.reference, 'Reference', 200), schedule?.id ?? null, user.id, timestamp)
            if (schedule && (body.kind ?? 'payment') === 'payment') db.prepare(`update disbursement_schedules set status = 'paid', updated_at = ? where id = ?`).run(timestamp, schedule.id)
            audit(db, { actorId: user.id, action: 'payment.post', objectType: 'payment', objectId: paymentId, summary: { commitmentId: commitment.id, kind: body.kind ?? 'payment', scheduleId: schedule?.id ?? null }, requestId: reqId })
          })
          return json(res, 201, { id: paymentId })
        }

        const reversalMatch = /^\/api\/payments\/([^/]+)\/reverse$/.exec(path)
        if (req.method === 'POST' && reversalMatch) {
          requireCapability(user, 'finance.manage')
          const original = db.prepare('select * from payments where id = ?').get(reversalMatch[1])
          if (!original || original.kind === 'reversal') throw new HttpError(404, 'Reversible payment not found.', 'not_found')
          if (db.prepare(`select 1 from payments where reverses_payment_id = ? and kind = 'reversal'`).get(original.id)) throw new HttpError(409, 'This transaction has already been reversed.', 'already_reversed')
          const body = await readJson(req)
          const reversalId = id()
          const timestamp = now()
          transaction(db, () => {
            db.prepare(`insert into payments
              (id, commitment_id, kind, amount_minor, currency, base_minor, base_currency, exchange_rate, rate_date, payment_date, reference, reverses_payment_id, schedule_id, posted_by, posted_at)
              values (?, ?, 'reversal', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
              .run(reversalId, original.commitment_id, original.amount_minor, original.currency, original.base_minor, original.base_currency, original.exchange_rate, original.rate_date, dateOnly(body.reversalDate, 'Reversal date'), cleanText(body.reason, 'Reversal reason', { max: 500 }), original.id, original.schedule_id, user.id, timestamp)
            if (original.schedule_id) db.prepare(`update disbursement_schedules set status = 'ready', updated_at = ? where id = ?`).run(timestamp, original.schedule_id)
            audit(db, { actorId: user.id, action: 'payment.reverse', objectType: 'payment', objectId: original.id, summary: { reversalId, reason: body.reason }, requestId: reqId })
          })
          return json(res, 201, { id: reversalId })
        }

        if (req.method === 'POST' && path === '/api/documents') {
          requireCapability(user, 'document.manage')
          const body = await readJson(req, 15 * 1024 * 1024)
          const originalName = cleanText(body.originalName, 'File name', { max: 220 }).replace(/[\\/\0]/g, '_')
          const bytes = Buffer.from(String(body.base64 ?? ''), 'base64')
          if (!bytes.length || bytes.length > MAX_DOCUMENT_BYTES) throw new HttpError(400, 'Document must be between 1 byte and 10 MB.', 'validation_error')
          const documentId = id()
          const versionId = id()
          const directory = join(documentsDir, documentId)
          mkdirSync(directory, { recursive: true })
          const storagePath = join(directory, versionId)
          writeFileSync(storagePath, bytes, { flag: 'wx', mode: 0o600 })
          const timestamp = now()
          transaction(db, () => {
            db.prepare(`insert into documents (id, opportunity_id, logical_name, classification, created_by, created_at)
              values (?, ?, ?, 'internal', ?, ?)`).run(documentId, body.opportunityId || null, cleanText(body.logicalName ?? originalName, 'Document name', { max: 220 }), user.id, timestamp)
            db.prepare(`insert into document_versions
              (id, document_id, version, original_name, storage_path, content_type, byte_size, checksum_sha256, scan_status, uploaded_by, uploaded_at)
              values (?, ?, 1, ?, ?, ?, ?, ?, 'trusted_internal', ?, ?)`)
              .run(versionId, documentId, originalName, storagePath, cleanText(body.contentType ?? 'application/octet-stream', 'Content type', { max: 150 }), bytes.length, sha256(bytes), user.id, timestamp)
            audit(db, { actorId: user.id, action: 'document.upload', objectType: 'document', objectId: documentId, summary: { originalName, byteSize: bytes.length }, requestId: reqId })
          })
          return json(res, 201, { id: documentId })
        }

        const documentVersionMatch = /^\/api\/documents\/([^/]+)\/versions$/.exec(path)
        if (req.method === 'POST' && documentVersionMatch) {
          requireCapability(user, 'document.manage')
          const document = db.prepare('select * from documents where id = ?').get(documentVersionMatch[1])
          if (!document) throw new HttpError(404, 'Document not found.', 'not_found')
          const body = await readJson(req, 15 * 1024 * 1024)
          const originalName = cleanText(body.originalName, 'File name', { max: 220 }).replace(/[\\/\0]/g, '_')
          const bytes = Buffer.from(String(body.base64 ?? ''), 'base64')
          if (!bytes.length || bytes.length > MAX_DOCUMENT_BYTES) throw new HttpError(400, 'Document must be between 1 byte and 10 MB.', 'validation_error')
          const versionId = id()
          const version = Number(db.prepare('select coalesce(max(version), 0) + 1 as value from document_versions where document_id = ?').get(document.id).value)
          const directory = join(documentsDir, document.id)
          mkdirSync(directory, { recursive: true })
          const storagePath = join(directory, versionId)
          writeFileSync(storagePath, bytes, { flag: 'wx', mode: 0o600 })
          const timestamp = now()
          transaction(db, () => {
            db.prepare(`insert into document_versions
              (id, document_id, version, original_name, storage_path, content_type, byte_size, checksum_sha256, scan_status, uploaded_by, uploaded_at)
              values (?, ?, ?, ?, ?, ?, ?, ?, 'trusted_internal', ?, ?)`)
              .run(versionId, document.id, version, originalName, storagePath, cleanText(body.contentType ?? 'application/octet-stream', 'Content type', { max: 150 }), bytes.length, sha256(bytes), user.id, timestamp)
            audit(db, { actorId: user.id, action: 'document.version', objectType: 'document', objectId: document.id, summary: { version, originalName, byteSize: bytes.length }, requestId: reqId })
          })
          return json(res, 201, { id: document.id, version })
        }

        const downloadMatch = /^\/api\/documents\/([^/]+)\/download$/.exec(path)
        if (req.method === 'GET' && downloadMatch) {
          requireCapability(user, 'document.read')
          const version = db.prepare(`select v.* from document_versions v where v.document_id = ? order by v.version desc limit 1`).get(downloadMatch[1])
          if (!version || !existsSync(version.storage_path)) throw new HttpError(404, 'Document not found.', 'not_found')
          audit(db, { actorId: user.id, action: 'document.download', objectType: 'document', objectId: downloadMatch[1], summary: { version: version.version }, requestId: reqId })
          const data = readFileSync(version.storage_path)
          const safeName = version.original_name.replace(/["\r\n]/g, '_')
          res.writeHead(200, { 'Content-Type': version.content_type, 'Content-Length': data.length, 'Content-Disposition': `attachment; filename="${safeName}"`, 'Cache-Control': 'private, no-store' })
          return res.end(data)
        }

        if (req.method === 'POST' && path === '/api/meetings') {
          requireCapability(user, 'meeting.manage')
          const body = await readJson(req)
          const slots = Array.isArray(body.slots) ? body.slots : []
          if (!slots.length) throw new HttpError(400, 'Add at least one proposed slot.', 'validation_error')
          const meetingId = id()
          const timestamp = now()
          transaction(db, () => {
            db.prepare(`insert into meetings (id, title, timezone, status, created_by, created_at, updated_at)
              values (?, ?, ?, 'polling', ?, ?, ?)`).run(meetingId, cleanText(body.title, 'Meeting title', { max: 180 }), cleanText(body.timezone ?? 'UTC', 'Time zone', { max: 100 }), user.id, timestamp, timestamp)
            const insert = db.prepare(`insert into meeting_slots (id, meeting_id, starts_at, ends_at, created_by, created_at)
              values (?, ?, ?, ?, ?, ?)`)
            for (const slot of slots) {
              const start = new Date(slot.startsAt)
              const end = new Date(slot.endsAt)
              if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end <= start) throw new HttpError(400, 'Meeting slots contain invalid times.', 'validation_error')
              insert.run(id(), meetingId, start.toISOString(), end.toISOString(), user.id, timestamp)
            }
            audit(db, { actorId: user.id, action: 'meeting.create', objectType: 'meeting', objectId: meetingId, summary: { slotCount: slots.length }, requestId: reqId })
          })
          return json(res, 201, { id: meetingId })
        }

        const agendaMatch = /^\/api\/meetings\/([^/]+)\/agenda$/.exec(path)
        if (req.method === 'POST' && agendaMatch) {
          requireCapability(user, 'meeting.manage')
          if (!db.prepare('select 1 from meetings where id = ?').get(agendaMatch[1])) throw new HttpError(404, 'Meeting not found.', 'not_found')
          const body = await readJson(req)
          const agendaId = id()
          const timestamp = now()
          const position = Number(db.prepare('select coalesce(max(position), 0) + 1 as value from agenda_items where meeting_id = ?').get(agendaMatch[1]).value)
          db.prepare(`insert into agenda_items
            (id, meeting_id, title, item_type, duration_minutes, proposed_by, owner_id, position, status, notes, created_at, updated_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, 'proposed', ?, ?, ?)`)
            .run(agendaId, agendaMatch[1], cleanText(body.title, 'Agenda title', { max: 200 }), enumValue(body.itemType ?? 'discussion', ['decision', 'discussion', 'update'], 'Agenda type'), integer(body.durationMinutes ?? 15, 'Duration', { min: 1, max: 480 }), user.id, body.ownerId || null, position, optionalText(body.notes, 'Agenda notes', 2000), timestamp, timestamp)
          audit(db, { actorId: user.id, action: 'agenda.propose', objectType: 'agenda_item', objectId: agendaId, summary: { meetingId: agendaMatch[1], position }, requestId: reqId })
          return json(res, 201, { id: agendaId })
        }

        if (req.method === 'POST' && path === '/api/reviews') {
          requireCapability(user, 'opportunity.review')
          const body = await readJson(req)
          if (!db.prepare('select 1 from commitments where id = ?').get(String(body.commitmentId ?? ''))) throw new HttpError(404, 'Commitment not found.', 'not_found')
          const reviewId = id()
          const timestamp = now()
          db.prepare(`insert into grant_reviews
            (id, commitment_id, review_date, review_type, relevance, coherence, effectiveness, efficiency, impact, sustainability, unexpected_outcomes, learning, recommendation, reviewer_id, created_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(reviewId, String(body.commitmentId), dateOnly(body.reviewDate, 'Review date'), enumValue(body.reviewType ?? 'interim', ['interim', 'final', 'renewal'], 'Review type'), optionalText(body.relevance, 'Relevance', 3000), optionalText(body.coherence, 'Coherence', 3000), optionalText(body.effectiveness, 'Effectiveness', 3000), optionalText(body.efficiency, 'Efficiency', 3000), optionalText(body.impact, 'Impact', 3000), optionalText(body.sustainability, 'Sustainability', 3000), optionalText(body.unexpectedOutcomes, 'Unexpected outcomes', 3000), cleanText(body.learning, 'Learning', { max: 5000 }), enumValue(body.recommendation, ['continue', 'renew', 'close', 'investigate'], 'Recommendation'), user.id, timestamp)
          audit(db, { actorId: user.id, action: 'review.create', objectType: 'grant_review', objectId: reviewId, summary: { commitmentId: body.commitmentId, recommendation: body.recommendation }, requestId: reqId })
          return json(res, 201, { id: reviewId })
        }

        const availabilityMatch = /^\/api\/meeting-slots\/([^/]+)\/availability$/.exec(path)
        if (req.method === 'POST' && availabilityMatch) {
          requireCapability(user, 'meeting.manage')
          const body = await readJson(req)
          const response = enumValue(body.response, ['available', 'if_needed', 'unavailable'], 'Availability')
          if (!db.prepare('select 1 from meeting_slots where id = ?').get(availabilityMatch[1])) throw new HttpError(404, 'Meeting slot not found.', 'not_found')
          db.prepare(`insert into meeting_availability (slot_id, account_id, response, updated_at) values (?, ?, ?, ?)
            on conflict(slot_id, account_id) do update set response = excluded.response, updated_at = excluded.updated_at`)
            .run(availabilityMatch[1], user.id, response, now())
          audit(db, { actorId: user.id, action: 'meeting.availability', objectType: 'meeting_slot', objectId: availabilityMatch[1], summary: { response }, requestId: reqId })
          return json(res, 200, { ok: true })
        }

        throw new HttpError(404, 'API route not found.', 'not_found')
      }

      if (!existsSync(publicDir)) throw new HttpError(503, 'Client build is not available.', 'client_missing')
      return serveStatic(res, publicDir, path)
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500
      if (status >= 500) console.error(JSON.stringify({ level: 'error', event: 'request_failed', requestId: reqId, message: error.message, stack: error.stack }))
      if (!res.headersSent) return json(res, status, { error: { code: error.code ?? 'internal_error', message: status >= 500 ? 'An unexpected error occurred.' : error.message, details: error.details } })
      res.destroy()
    }
  })

  return { server, db, close: () => db.close() }
}
