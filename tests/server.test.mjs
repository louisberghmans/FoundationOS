import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { createApp } from '../src/server/app.mjs'

let app
let baseUrl
let dataDir

before(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'foundationos-test-'))
  app = createApp({ dataDir, publicDir: join(process.cwd(), 'dist') })
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve))
  const address = app.server.address()
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  await new Promise((resolve) => app.server.close(resolve))
  app.close()
  rmSync(dataDir, { recursive: true, force: true })
})

function client() {
  let cookie = ''
  let csrf = ''
  return {
    get csrf() { return csrf },
    async request(path, { method = 'GET', body, sendCsrf = true } = {}) {
      const headers = {}
      if (body !== undefined) headers['Content-Type'] = 'application/json'
      if (cookie) headers.Cookie = cookie
      if (sendCsrf && csrf && method !== 'GET') headers['X-CSRF-Token'] = csrf
      const response = await fetch(`${baseUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
      const setCookie = response.headers.get('set-cookie')
      if (setCookie) cookie = setCookie.split(';')[0]
      const payload = await response.json()
      if (payload.csrfToken) csrf = payload.csrfToken
      return { response, payload }
    },
  }
}

test('setup, membership, permissions, explicit decisions, and finance are server enforced', async () => {
  const admin = client()
  const member = client()

  let result = await admin.request('/api/bootstrap')
  assert.equal(result.payload.setupRequired, true)
  assert.equal(result.payload.version, '0.4.1-alpha')

  result = await admin.request('/api/setup', { method: 'POST', body: {
    foundationName: 'Northstar Giving Trust',
    mission: 'Support durable improvements in human well-being.',
    locale: 'en', timezone: 'Europe/Brussels', baseCurrency: 'EUR', fiscalYearStartMonth: 1,
    fundName: 'General fund', annualBudgetMinor: 25000000, fiscalYear: 2026,
    adminDisplayName: 'Jordan Avery', username: 'jordan', password: 'correct horse battery staple',
  } })
  assert.equal(result.response.status, 201)
  assert.equal(result.payload.user.role, 'administrator')
  assert.equal(result.payload.setupRequired, false)

  result = await admin.request('/api/setup', { method: 'POST', body: {} })
  assert.equal(result.response.status, 409)

  result = await admin.request('/api/invitations', { method: 'POST', body: { role: 'voting_member', email: 'member@example.invalid' } })
  assert.equal(result.response.status, 201)
  const inviteToken = result.payload.token

  result = await member.request('/api/invitations/redeem', { method: 'POST', body: {
    token: inviteToken, displayName: 'Casey Morgan', username: 'casey', password: 'a different secure passphrase',
  } })
  assert.equal(result.response.status, 201)
  assert.equal(result.payload.user.role, 'voting_member')

  result = await member.request('/api/opportunities', { method: 'POST', body: {
    title: 'Unauthorized opportunity', organizationName: 'Example Network', requestMinor: 10000, requestCurrency: 'EUR',
  } })
  assert.equal(result.response.status, 403)

  result = await admin.request('/api/objectives', { method: 'POST', body: {
    title: 'Improve durable access', outcome: 'More participants have durable access to an essential service.',
    metric: 'Participants with durable access', unit: 'people', baselineValue: 0, targetValue: 1000,
    targetDate: '2028-12-31', causalThesis: 'Locally maintained services can contribute to durable access.',
  } })
  assert.equal(result.response.status, 201)
  const objectiveId = result.payload.id

  result = await admin.request(`/api/objectives/${objectiveId}/observations`, { method: 'POST', body: {
    value: 125, observedAt: '2026-07-15', state: 'verified', source: 'Synthetic verification report',
    methodology: 'A test observation with no real people or organizations.', confidenceNote: 'Automated fixture.',
  } })
  assert.equal(result.response.status, 201)

  result = await admin.request('/api/opportunities', { method: 'POST', body: {
    title: 'Community service access pilot', organizationName: 'Cedar Bridge Association', countryCode: 'BE',
    objectiveId, summary: 'A synthetic opportunity used for automated verification.', requestMinor: 4500000, requestCurrency: 'EUR',
  } })
  assert.equal(result.response.status, 201)
  const opportunityId = result.payload.id

  for (const stage of ['screening', 'diligence', 'decision']) {
    result = await admin.request(`/api/opportunities/${opportunityId}/stage`, { method: 'PATCH', body: { stage } })
    assert.equal(result.response.status, 200)
  }

  result = await admin.request('/api/app')
  const adminId = result.payload.members.find((item) => item.username === 'jordan').id
  const memberId = result.payload.members.find((item) => item.username === 'casey').id
  const fundId = result.payload.funds[0].id

  result = await admin.request('/api/budgets', { method: 'POST', body: {
    fundId, objectiveId, fiscalYear: 2027, amountMinor: 5000000, status: 'approved',
  } })
  assert.equal(result.response.status, 201)

  result = await admin.request('/api/decisions', { method: 'POST', body: {
    opportunityId, title: 'Approve pilot grant', amountMinor: 4500000, currency: 'EUR', eligibleMemberIds: [adminId, memberId],
  } })
  assert.equal(result.response.status, 201)
  const roundId = result.payload.id

  result = await admin.request(`/api/decisions/${roundId}/respond`, { method: 'POST', body: { response: 'support', note: 'The packet is complete.' } })
  assert.equal(result.payload.status, 'open', 'one missing response must stay pending')

  result = await admin.request(`/api/opportunities/${opportunityId}/stage`, { method: 'PATCH', body: { stage: 'agreement' } })
  assert.equal(result.response.status, 409, 'workflow must not pass decision without full explicit acceptance')

  result = await member.request(`/api/decisions/${roundId}/respond`, { method: 'POST', body: { response: 'neutral', note: 'No objection.' } })
  assert.equal(result.payload.status, 'accepted')

  result = await admin.request(`/api/opportunities/${opportunityId}/stage`, { method: 'PATCH', body: { stage: 'agreement' } })
  assert.equal(result.response.status, 200)

  for (const invalidCommitment of [
    { amountMinor: 4500001, currency: 'EUR', exchangeRate: '1', expectedCode: 'commitment_exceeds_decision' },
    { amountMinor: 4500000, currency: 'USD', exchangeRate: '1', expectedCode: 'commitment_currency_mismatch' },
    { amountMinor: 4500000, currency: 'EUR', exchangeRate: '0', expectedCode: 'validation_error' },
    { amountMinor: 4500000, currency: 'EUR', exchangeRate: '-1', expectedCode: 'validation_error' },
    { amountMinor: 4500000, currency: 'EUR', exchangeRate: 'not-a-number', expectedCode: 'validation_error' },
  ]) {
    result = await admin.request('/api/commitments', { method: 'POST', body: {
      decisionRoundId: roundId, fundId, amountMinor: invalidCommitment.amountMinor,
      currency: invalidCommitment.currency, baseMinor: 4500000,
      exchangeRate: invalidCommitment.exchangeRate, rateDate: '2026-07-16',
    } })
    assert.equal(result.response.status, invalidCommitment.expectedCode === 'validation_error' ? 400 : 409)
    assert.equal(result.payload.error.code, invalidCommitment.expectedCode)
  }

  result = await admin.request('/api/app')
  assert.equal(result.payload.commitments.length, 0, 'rejected commitments must not be inserted')

  result = await admin.request('/api/commitments', { method: 'POST', body: {
    decisionRoundId: roundId, fundId, amountMinor: 4500000, currency: 'EUR', baseMinor: 4500000,
    exchangeRate: '1', rateDate: '2026-07-16',
  } })
  assert.equal(result.response.status, 201)
  const commitmentId = result.payload.id

  result = await admin.request('/api/agreements', { method: 'POST', body: {
    commitmentId, reference: 'AGR-TEST-001', agreementDate: '2026-07-16', startsOn: '2026-08-01', endsOn: '2028-07-31', status: 'executed',
  } })
  assert.equal(result.response.status, 201)

  result = await admin.request('/api/disbursement-schedules', { method: 'POST', body: {
    commitmentId, dueDate: '2026-08-15', amountMinor: 1500000, currency: 'EUR', condition: 'Executed agreement received', status: 'ready',
  } })
  assert.equal(result.response.status, 201)
  const scheduleId = result.payload.id

  result = await admin.request('/api/payments', { method: 'POST', body: {
    commitmentId, kind: 'payment', amountMinor: 1500000, currency: 'EUR', baseMinor: 1500000,
    exchangeRate: '1', rateDate: '2026-07-16', paymentDate: '2026-07-16', reference: 'TEST-001', scheduleId,
  } })
  assert.equal(result.response.status, 201)
  const paymentId = result.payload.id

  result = await admin.request(`/api/payments/${paymentId}/reverse`, { method: 'POST', body: {
    reversalDate: '2026-07-17', reason: 'Synthetic bank rejection used to verify immutable reversal.',
  } })
  assert.equal(result.response.status, 201)

  result = await admin.request(`/api/commitments/${commitmentId}/amendments`, { method: 'POST', body: {
    kind: 'extension', deltaMinor: 0, deltaBaseMinor: 0, effectiveDate: '2026-09-01', newEndDate: '2028-12-31',
    reason: 'Synthetic timetable extension.',
  } })
  assert.equal(result.response.status, 201)

  result = await admin.request('/api/meetings', { method: 'POST', body: {
    title: 'Quarterly grant review', timezone: 'Europe/Brussels', slots: [
      { startsAt: '2026-10-05T16:00:00Z', endsAt: '2026-10-05T17:00:00Z' },
      { startsAt: '2026-10-06T16:00:00Z', endsAt: '2026-10-06T17:00:00Z' },
    ],
  } })
  assert.equal(result.response.status, 201)
  const meetingId = result.payload.id

  result = await admin.request(`/api/meetings/${meetingId}/agenda`, { method: 'POST', body: {
    title: 'Review first installment', itemType: 'discussion', durationMinutes: 20, notes: 'Synthetic agenda item.',
  } })
  assert.equal(result.response.status, 201)

  result = await admin.request('/api/reviews', { method: 'POST', body: {
    commitmentId, reviewDate: '2026-12-15', reviewType: 'interim', effectiveness: 'Initial milestone recorded.',
    learning: 'Synthetic review confirms that learning remains distinct from accountability.', recommendation: 'continue',
  } })
  assert.equal(result.response.status, 201)

  const firstDocument = Buffer.from('Synthetic agreement content for automated testing.').toString('base64')
  result = await admin.request('/api/documents', { method: 'POST', body: {
    originalName: 'agreement-fixture.txt', logicalName: 'Synthetic agreement', contentType: 'text/plain', base64: firstDocument, opportunityId,
  } })
  assert.equal(result.response.status, 201)
  const documentId = result.payload.id

  result = await admin.request(`/api/documents/${documentId}/versions`, { method: 'POST', body: {
    originalName: 'agreement-fixture-v2.txt', contentType: 'text/plain', base64: Buffer.from('Synthetic revised agreement content.').toString('base64'),
  } })
  assert.equal(result.response.status, 201)
  assert.equal(result.payload.version, 2)

  result = await admin.request('/api/app')
  assert.equal(result.payload.applicationVersion, '0.4.1-alpha')
  assert.equal(result.payload.objectives[0].current_value, 125)
  assert.equal(result.payload.schedules[0].status, 'ready', 'reversal reopens the linked installment')
  assert.equal(result.payload.agendaItems.length, 1)
  assert.equal(result.payload.reviews.length, 1)
  assert.equal(result.payload.documents[0].version, 2)

  result = await admin.request('/api/admin/backups', { method: 'POST', body: {} })
  assert.equal(result.response.status, 201)
  assert.equal(result.payload.version, '0.4.1-alpha')
  assert.match(result.payload.databaseSha256, /^[a-f0-9]{64}$/)
  assert.equal(result.payload.documentCount, 2)

  result = await admin.request('/api/auth/logout', { method: 'POST', body: {}, sendCsrf: false })
  assert.equal(result.response.status, 403, 'logout without CSRF must be rejected')
})
