import { HttpError } from './core.mjs'

export function positiveExchangeRate(value) {
  const text = String(value ?? '').trim()
  const numeric = Number(text)
  if (text.length > 40 || !/^\d+(?:\.\d+)?$/.test(text) || !Number.isFinite(numeric) || numeric <= 0) {
    throw new HttpError(400, 'Exchange rate must be a positive decimal.', 'validation_error')
  }
  return text
}

export function validateCommitmentAgainstDecision({ decision, amountMinor, currency, exchangeRate }) {
  if (!decision || decision.status !== 'accepted') {
    throw new HttpError(409, 'An accepted decision round is required.', 'decision_required')
  }
  if (amountMinor > decision.amount_minor) {
    throw new HttpError(409, 'Commitment amount cannot exceed the accepted decision amount.', 'commitment_exceeds_decision')
  }
  if (currency !== decision.currency) {
    throw new HttpError(409, 'Commitment currency must match the accepted decision currency.', 'commitment_currency_mismatch')
  }
  return { amountMinor, currency, exchangeRate: positiveExchangeRate(exchangeRate) }
}
