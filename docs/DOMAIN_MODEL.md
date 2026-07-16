# Domain model and invariants

## Aggregate map

```text
Foundation
  +-- Memberships -> Accounts, role assignments, invitations
  +-- Strategy -> Outcomes -> Indicators -> Observations
  +-- Funds -> Fiscal periods -> Budgets -> Allocations
  +-- Organizations -> Contacts, due diligence, conflicts
  +-- Opportunities -> Stage history, documents, stewardship
  |     +-- Decision rounds -> electorate, responses, objections
  |     +-- Grant -> commitment, agreement, amendments
  |            +-- Disbursement schedule -> payments/refunds/reversals
  |            +-- Reports -> reviews -> learning
  +-- Meetings -> proposed slots, availability, agenda, actions
  +-- Public inbox -> quarantined submissions and documents
  +-- Audit events
```

## Decision state machine

```text
Draft -> Open -> Pending responses
                  | all responded, no objection
                  v
                Accepted
                  \
                   \ active objection -> Blocked
                                      | objection withdrawn without material change
                                      +-> Pending responses / Accepted
                                      | proposal materially revised
                                      +-> Superseded -> new Draft round

Draft/Open/Pending/Blocked -> Cancelled (authorized explicit action)
```

Invariants:

1. Opening freezes electorate, proposal version, amount/currency and document versions.
2. Each eligible member has exactly one current explicit response in a round; changes retain history.
3. Pending is not Neutral. Deadlines only drive reminders.
4. Acceptance requires every non-recused eligible member to respond and zero active objections.
5. Recusal is explicit, reasoned, visible and fixed when the round opens.
6. A material proposal change creates a new round.

## Opportunity workflow

Default stages are configurable in label but fixed in semantic type for v1:

| Stage | Minimum exit policy |
| --- | --- |
| Inbox | Source, organization or applicant identity, summary and request captured |
| Screening | Eligibility, objective fit, conflicts and disposition recorded |
| Diligence | Required review checklist, material documents, risk and proposed terms complete |
| Decision | An accepted decision round exists for the current proposal version |
| Agreement | Commitment and executed agreement/amendments reconcile to the decision |
| Active | Steward, installment schedule and reporting expectations exist |
| Review | Required reports and finance exceptions are resolved or explicitly waived |
| Closed | Final review, remaining commitment disposition and retention state recorded |

Declined, withdrawn and duplicate are terminal dispositions, not fake board columns in the happy-path workflow.

## Money model

Every money value is `{minorUnits: integer, currency: ISO4217}`. Converted values also require `{baseMinorUnits, baseCurrency, exchangeRate, rateDate, rateSource}`.

```text
Budget availability
  = approved budget
  - active commitments
  + commitment cancellations
  + returned funds credited by policy

Commitment outstanding
  = active commitment
  + amendments
  - cancellations
  - net payments
  - credited refunds
```

The exact treatment of returned funds is a foundation policy and is shown in totals. Posted transactions are append-only. A correction references the incorrect transaction and reverses it before a replacement is posted.

## Impact model

An indicator observation contains period, value, unit, source, source document, collection method, verification state, confidence note, contributor and timestamp. It does not overwrite history.

Grant contribution records have three distinct states:

- expected: estimate in the approved proposal;
- reported: value supplied by the grantee or steward;
- verified: value accepted through a documented review.

Portfolio aggregation is allowed only for compatible metric definitions, populations, periods and units. The UI must explain exclusions and must not present contribution as sole causal attribution.

## Documents

A logical document has one or more immutable versions. References in opened decision rounds and executed agreements point to exact versions. Replacing a file adds a version and does not rewrite the decision packet.

## Meetings

Proposed slots retain their IANA time zone and normalized UTC interval. Each invited member explicitly records available, if-needed, unavailable, or no response. “Everyone can attend” requires an explicit available/if-needed response from everyone; missing responses remain visible.
