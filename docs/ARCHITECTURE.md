# FoundationOS architecture

Status: accepted for the v1.0 rebuild
Last reviewed: 2026-07-16

## Product boundary

FoundationOS is a self-hosted operating system for a small grantmaking foundation. One installation represents one foundation. It manages strategy, applications, decisions, grant commitments, disbursement tracking, documents, meetings, reviews, and the audit history that connects them.

It is deliberately not:

- a general ledger, bank, or tax-accounting system;
- an automated grant recommender or automated decision maker;
- a public file-sharing system;
- a multi-tenant SaaS in v1.

The system may calculate readiness and show policy violations, but it never infers consent. A decision only completes after every member in its frozen electorate explicitly records Support, Neutral, or Object and no active objection remains.

## Deployment architecture

The deployment model follows the operational simplicity of ParcOS while keeping the source modular.

```text
Browser
  |
  | HTTPS (provided by the operator's reverse proxy)
  v
FoundationOS container
  +-- server-rendered shell and compiled React client
  +-- HTTP/JSON API
  +-- authentication, authorization, CSRF and rate limits
  +-- domain application services
  +-- scheduled maintenance jobs
  |
  +-- /data/foundationos.sqlite3
  +-- /data/documents/<opaque-id>/<version>
  +-- /data/backups/
```

The image runs as a non-root user and is read-only except for `/data`. SQLite uses WAL mode, foreign keys, transactions, and versioned migrations. Files and the database share one operator-controlled persistent volume so backup and restore are understandable for a family administrator.

### Why this shape

- A family should be able to run the product with Docker Compose and one volume.
- A single process eliminates a database service and object-storage service from the first production boundary.
- The HTTP API and repository interfaces are explicit migration seams for a later Postgres/object-storage deployment.
- Source modules prevent the one-file server and client bloat identified in the ParcOS roadmap.

Node 24's built-in SQLite module is currently a release candidate rather than a fully stable API. Database access is therefore isolated under `src/server/database`; no domain module imports `node:sqlite` directly. This is an accepted v1 deployment tradeoff and is covered by migration and backup/restore tests.

## Source boundaries

```text
src/
  client/                 application shell, routes and view models
    components/           accessible product primitives
    features/             route-level feature UI
    styles/               FoundationOS semantic tokens
  server/
    http/                 routing, parsing, response and security headers
    auth/                 accounts, sessions, CSRF, recovery and throttling
    authorization/        permission checks and policy composition
    database/             connection, migrations, transactions, repositories
    documents/            private blob storage and validation
    jobs/                 reminders, cleanup and backup coordination
  domain/
    setup/
    membership/
    strategy/
    organizations/
    opportunities/
    decisions/
    grants/
    finance/
    reviews/
    meetings/
    public-portal/
    audit/
  shared/                 identifiers, money, dates and API contracts
```

Domain modules expose commands and queries through application services. Route handlers never write SQL and React components never encode authorization or workflow truth.

## Security model

### Authentication

- First run creates the first administrator through a one-time setup flow.
- Later accounts are invitation-only by default.
- Passwords are hashed with scrypt using a unique salt and a server-side work factor.
- Sessions are opaque, server-side, expiring, revocable, and stored as hashes.
- State-changing requests require same-origin checks and CSRF protection.
- Login, recovery, invite acceptance, and public submission endpoints are throttled.
- Recovery uses expiring, single-use links; FoundationOS never stores recoverable passwords.

### Authorization

Permissions are capabilities, not client-side role labels. Every service command checks the authenticated membership and object scope. Default roles are presets that administrators can assign:

| Role preset | Purpose |
| --- | --- |
| Administrator | Installation, security, roles, backups and all foundation data |
| Foundation manager | Strategy, workflows, meetings and grant portfolio |
| Voting member | Read decision packet and explicitly respond to assigned decisions |
| Finance manager | Budgets, commitments, schedules, payments, refunds and exports |
| Project steward | Maintain assigned grants, documents, actions and reports |
| Reviewer | Complete assigned diligence and review records |
| Viewer | Read permitted internal records without mutations |

The presets expand to named capabilities such as `decision.respond`, `payment.record`, and `document.download`. Being a grant steward is responsibility metadata; it does not silently grant administrative access.

### Auditability

Security- and governance-significant actions append an audit event containing actor, action, object, timestamp, request identifier, and a safe structured summary. Password hashes, session values, CSRF tokens, recovery tokens, and document bodies are never logged.

Final decision rounds and posted financial transactions are immutable. Corrections are new versions, amendments, withdrawals, cancellations, refunds, or reversing entries—not destructive edits.

## Data and transaction rules

- Identifiers are opaque UUIDs generated by the server.
- Monetary amounts are integer minor units plus ISO 4217 currency.
- Base-currency equivalents retain the entered exchange rate, rate date, and source.
- Timestamps are UTC; an IANA time zone is retained for meetings and fiscal presentation.
- User-authored rich text is sanitized on input and output.
- All mutations that affect more than one aggregate run in one database transaction.
- Optimistic concurrency versions prevent one browser from overwriting another user's edit.
- Database constraints enforce uniqueness, foreign keys, and state invariants where practical.

## Document architecture

Document bytes live outside the database under opaque paths. The database stores logical document, version, MIME type, size, SHA-256 checksum, uploader, access classification, scan state, and retention state.

- Downloads stream through an authorized route; raw data-volume paths are never public.
- Upload names are presentation metadata and never become filesystem paths.
- Size, extension, detected type, and allowed MIME type are checked.
- Public-submission documents enter an untrusted quarantine area and cannot become internal grant documents without an explicit authorized promotion.
- v1 provides a configurable external malware-scanner hook. Until a scanner reports clean, public uploads cannot be downloaded by ordinary members.

## Public/private separation

The public portal is disabled by default. When enabled, it has its own routes, rate limits, upload quarantine, consent text, and data-retention policy. A public submission creates an inbox item, not an organization, opportunity, decision, or grant. Promotion is an explicit internal action and is audited.

No internal record becomes public by changing a generic visibility flag. Future public impact pages use a separately reviewed publication record so internal notes and files cannot leak through object serialization.

## Operational controls

- `/health/live` proves the process is alive; `/health/ready` checks database access and migrations.
- Startup refuses to run when `/data` is not writable, secrets are insecure, or migrations fail.
- The administrator can create a consistent backup containing database, documents, manifest, and checksums.
- Restore is a documented offline operation and is exercised in automated release tests.
- Structured logs go to stdout without personal or secret data.
- The container exposes one unprivileged HTTP port and expects TLS at the reverse proxy.

## Evolution path

When installations outgrow a single node, repositories can move to Postgres, document storage to an S3-compatible service, and jobs to a worker without changing domain commands or client contracts. Multi-foundation SaaS tenancy is a separate architectural decision and is not smuggled into v1 tables.

## Rejected alternatives

| Alternative | Reason rejected for v1 |
| --- | --- |
| Browser-only local storage | No real membership, shared state, access control, files, or auditability |
| Postgres plus object storage by default | Operational burden is disproportionate for a small self-hosted installation |
| Spreadsheet-shaped CRUD | Does not protect decision, finance, document, or workflow invariants |
| Copying an AGPL application | Would place the combined work under AGPL; the requested project license is GPL-3.0-or-later |
| Automatic approval after a deadline | Silence is not consent and would destroy governance trust |
| One universal impact score | Hides incompatible outcomes, uncertainty, contribution, and evidence quality |
