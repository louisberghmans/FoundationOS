import assert from 'node:assert/strict'
import { test } from 'node:test'
import { HttpError } from '../src/server/core.mjs'
import { positiveExchangeRate, validateCommitmentAgainstDecision } from '../src/server/finance.mjs'

const acceptedDecision = { status: 'accepted', amount_minor: 4500000, currency: 'EUR' }

test('a commitment may match its accepted decision exactly', () => {
  assert.deepEqual(validateCommitmentAgainstDecision({
    decision: acceptedDecision,
    amountMinor: 4500000,
    currency: 'EUR',
    exchangeRate: '1.25',
  }), { amountMinor: 4500000, currency: 'EUR', exchangeRate: '1.25' })
})

test('commitments cannot exceed or change the currency of an accepted decision', () => {
  assert.throws(() => validateCommitmentAgainstDecision({
    decision: { ...acceptedDecision, status: 'open' },
    amountMinor: 4500000,
    currency: 'EUR',
    exchangeRate: '1',
  }), (error) => error instanceof HttpError && error.code === 'decision_required')

  assert.throws(() => validateCommitmentAgainstDecision({
    decision: acceptedDecision,
    amountMinor: 4500001,
    currency: 'EUR',
    exchangeRate: '1',
  }), (error) => error instanceof HttpError && error.code === 'commitment_exceeds_decision')

  assert.throws(() => validateCommitmentAgainstDecision({
    decision: acceptedDecision,
    amountMinor: 4500000,
    currency: 'USD',
    exchangeRate: '1',
  }), (error) => error instanceof HttpError && error.code === 'commitment_currency_mismatch')
})

test('exchange rates must be positive finite bounded decimal text', () => {
  for (const value of ['0', '-1', 'NaN', 'Infinity', '1e3', '', null, '1'.repeat(41)]) {
    assert.throws(() => positiveExchangeRate(value), (error) => error instanceof HttpError && error.code === 'validation_error')
  }
  assert.equal(positiveExchangeRate('0.5'), '0.5')
})
