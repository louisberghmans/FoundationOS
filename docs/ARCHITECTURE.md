# FoundationOS architecture

Status: current alpha architecture and known gaps
Last reviewed: 2026-07-16

## Product boundary

One self-hosted installation represents one family or small grantmaking foundation. The alpha manages strategy, opportunities, explicit decision responses, basic grant finance, documents, meetings, reviews, and audit events.

FoundationOS is not statutory accounting software, a bank, a tax/legal system, an automated grant approver, a universal impact score, a multi-tenant service, or a public applicant portal.

## Deployment

```text
Browser
  |
  | HTTPS from an operator-managed reverse proxy
  v
Single non-root Node container
  +-- compiled React client
  +-- HTTP/JSON server
  +-- authentication, CSRF and capability checks
  +-- Node SQLite connection and migrations
  |
  +-- /data/foundationos.sqlite3
  +-- /data/documents/<opaque-document-id>/<opaque-version-id>
  +-- /data/backups/<backup-id>/
```

SQLite, one process, one container, and one volume are intentional defaults before 1.0. Compose makes the container root read-only except `/data`. Node's SQLite API emits an experimental warning, so database-specific access must remain bounded and tested.

## Current source boundaries

- `src/server/app.mjs` contains routing, many domain checks, and SQL. At roughly 700 lines it is understandable but too broad for safe growth.
- `auth.mjs`, `policy.mjs`, `database.mjs`, and `core.mjs` isolate authentication helpers, capabilities, migrations/transactions, and HTTP primitives.
- `src/server/migrations/` holds forward-only transactional SQL migrations.
- `src/App.tsx` contains the React shell and feature views in one dense module.
- `src/api.ts` is the browser API client.

The roadmap moves validation and bounded SQL into services/repositories incrementally. It does not call for microservices or a rewrite.

## Security model

Setup creates the administrator; later accounts use one-time invitations. Passwords use salted scrypt; session and invitation tokens are stored hashed. Mutations require same-origin and CSRF checks. Role presets expand to server capabilities.

The model is incomplete: `/api/app` returns a universal snapshot to any role with `foundation.read`, object/assignment scopes are absent, and some commands combine capabilities with direct role checks. UI hiding is never security.

## Governance and integrity

Every eligible non-recused decision member must record Support, Neutral, or Object. Any active objection blocks; missing responses stay open. Response changes append rows and deactivate the prior row.

Rounds freeze electorate, proposal version, amount, and currency, but not exact document versions. Formal recusal changes, objection resolution, cancellation, and supersession commands are absent.

Money uses integer minor units with currency and recorded base amounts/rates. Append-only payment/reversal rows exist, but decision ceilings, installment/payment caps, rate arithmetic, and aggregate concurrency rules are incomplete.

## Documents and backups

Document bytes use opaque server paths outside the web root. Metadata records versions, checksums, uploader, classification, and trust state; authenticated downloads are audited. The internal-upload path trusts caller content type and marks content `trusted_internal`; no scanner or object authorization exists.

Backup creation uses SQLite's online API and copies documents. Restoration, concurrent-upload consistency, encryption, export, and retention are not automated. See [OPERATIONS.md](OPERATIONS.md).

## Evolution constraints

- Keep the self-hosted single-container profile and SQLite default before 1.0.
- Keep route handlers thin as code is touched; put rules in testable modules and SQL in bounded data-access modules.
- Keep multi-record mutations transactional.
- Introduce focused APIs and object-scoped authorization before expanding features.
- Do not add infrastructure without a verified milestone need.

Target architecture and gates live in [ROADMAP_TO_1.0.md](ROADMAP_TO_1.0.md), not as claims about current capability.
