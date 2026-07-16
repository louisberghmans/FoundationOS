# Current state assessment

Assessment date: 2026-07-16

Assessed tree: self-hosted rebuild ending at `a636ea6`

Recommended baseline: **0.4.1-alpha**

Follow-up: **0.5.0-alpha** addresses only the initial commitment amount/currency/rate gap identified here. All other status findings and 1.0 blockers remain in force.

## Method and evidence

The source, migrations, authorization, client, tests, Docker files, workflows, and documentation were inspected. The clean tree passed `pnpm install --frozen-lockfile`, lint, two client API tests, one broad server integration test, the production build, server syntax checks, and a Docker build. An ephemeral container returned healthy liveness/readiness responses and reported that first-run setup was required.

Warnings were a 569 kB minified client chunk and Node's experimental warning for `node:sqlite`. No browser automation, coverage threshold, dependency audit, automated restore drill, or migration-upgrade matrix exists.

This document uses only these statuses:

- **Implemented** — present and exercised by code or automated verification.
- **Partially implemented** — useful behavior exists, but important guarantees or paths are missing.
- **Designed but not implemented** — described without working code.
- **Not supported** — no current product support is claimed.

## Product completeness

| Capability | Status | Evidence and limitation |
| --- | --- | --- |
| First-run setup | Implemented | Creates one foundation, administrator, fund, optional budget, and session transactionally; no browser-level test. |
| Membership and invitations | Partially implemented | One-time invitation redemption works; no member deactivation, role editing, invitation revocation, or email delivery workflow. |
| Roles and permissions | Partially implemented | Named server capabilities protect commands; most reads use one broad `foundation.read` snapshot and assigned-role scopes are not enforced. |
| Strategy and objectives | Partially implemented | Objectives and append-only observations exist; focus areas, risk, correction, and evidence governance do not. |
| Organizations and opportunities | Partially implemented | Creation and ordered stage movement exist; readiness requirements, contacts, conflicts, dispositions, and scoped access are absent. |
| Decisions | Partially implemented | Electorates, explicit responses, objections, and missing-response blocking work. Packet freezing, recusal management, formal objection resolution, cancellation, supersession, and immutable proposal content are absent. |
| Commitments and agreements | Partially implemented | Accepted decisions can create commitments and agreements. Baseline code does not cap a commitment at the accepted amount or require matching currency. |
| Installments and payments | Partially implemented | Schedules, payments, refunds, and reversal entries exist. Totals, overpayment prevention, installment caps, rate validation, and reconciliation are incomplete. |
| Documents | Partially implemented | Opaque storage, checksums, version rows, authenticated downloads, and access audit exist. All readers can see all metadata/files; MIME is trusted; no malware scan, packet pinning, retention, or orphan cleanup exists. |
| Meetings | Partially implemented | Polls, availability, and agenda proposals exist. Confirmation, notes/actions lifecycle, notifications, and calendar integration are absent. |
| Impact evidence | Partially implemented | Observations distinguish reported/reviewed/verified state, but verification is only a caller-selected label. |
| Reviews and learning | Partially implemented | Review records and narrative fields exist; assignment, editing policy, evidence links, and closeout workflow are absent. |
| Audit | Partially implemented | Significant mutations append events, but reads are not uniformly audited and summaries/object scope lack systematic privacy review. |
| Backup | Partially implemented | Administrator API makes an online SQLite copy, document copy, and manifest. Confidentiality, export, scheduling, concurrent upload consistency, and retention are operator concerns. |
| Restore | Designed but not implemented | An offline procedure is documented; no restore command or automated restoration/checksum test exists. |
| Localization | Not supported | Locale and time zone are stored, but UI strings are English-only and no translation infrastructure exists. |
| Accessibility | Partially implemented | Semantic controls and some keyboard-conscious UI exist; no audited keyboard flow, focus trapping, automated accessibility test, or screen-reader verification. |

## Security

| Area | Status | Evidence and limitation |
| --- | --- | --- |
| Authentication | Partially implemented | Salted scrypt hashes, opaque hashed sessions, invitations, and login/logout exist; no recovery, MFA, session inventory, or forced revocation UI. |
| Session management | Partially implemented | Server-side 14-day sessions and secure-cookie option exist; no idle timeout, rotation, per-device view, or global logout. |
| CSRF and same-origin | Implemented | Mutations require same-origin validation and a session CSRF token; one deny test covers missing CSRF on logout. |
| Rate limiting | Partially implemented | In-memory per-IP/username login throttling resets on restart and does not cover setup, invitation redemption, or uploads. |
| Server authorization | Partially implemented | Mutation capabilities are server checked; some routes use direct role checks and the broad snapshot only requires `foundation.read`. |
| Object-level authorization | Not supported | Steward/reviewer assignments, electorate reads, and document/opportunity ownership do not scope reads or related mutations. |
| Document authorization | Partially implemented | A session plus document capability is required; no per-object or classification policy exists. |
| Password recovery | Not supported | No implementation exists despite earlier architecture claims. |
| MFA | Not supported | No implementation exists. |
| Secret handling | Partially implemented | Random sessions are stored hashed; TLS, volume encryption, and deployment secrets remain external. |
| Security headers | Implemented | CSP, no-sniff, frame denial, referrer, permissions, and opener policies are set. HSTS belongs at the HTTPS proxy. |
| Dependency security | Partially implemented | Lockfile and CI build exist; no automated audit, CodeQL, Dependabot configuration, or review policy is committed. |
| Backup confidentiality | Not supported | Backups are plaintext inside `/data`; encryption and off-host controls are not enforced. |

## Data integrity

| Area | Status | Evidence and limitation |
| --- | --- | --- |
| Schema and migrations | Partially implemented | Foreign keys, checks, uniqueness, WAL, and transactional numbered migrations exist; no rollback scripts or upgrade-path fixtures. |
| Multi-record transactions | Partially implemented | Setup and several workflows are transactional; several insert-plus-audit commands are not. |
| Decision invariants | Partially implemented | Silence cannot accept and an active objection blocks. Response replacement is append-only, but packets are not frozen and lifecycle commands are incomplete. |
| Financial append-only behavior | Partially implemented | Payments lack update/delete routes and reversal rows exist; aggregate caps and amendment constraints are incomplete. |
| Commitment invariants | Not supported | Baseline permits amount above the accepted decision, mismatched currency, and non-numeric/negative exchange-rate text. |
| Payment invariants | Not supported | Baseline does not prevent totals above commitments/schedules or validate rate/base arithmetic. |
| Document versioning | Partially implemented | New bytes create version rows; decisions/agreements do not pin versions and writes can be orphaned if the database transaction fails. |
| Backup restoration | Designed but not implemented | Creation exists; automatic restoration and document/database reconciliation do not. |
| Concurrency | Not supported | SQLite serializes writes, but API compare-and-swap checks are absent; opportunity `version` increments without checking the caller's version. |

## Engineering quality

| Area | Status | Evidence and limitation |
| --- | --- | --- |
| Code modularity | Partially implemented | Auth, policy, database, and core helpers are split out, but a 700-line route/SQL module and dense single React file hold most behavior. |
| Automated tests | Partially implemented | Core happy path and two client cases pass; failure paths, role matrix, migrations, documents, restore, concurrency, and UI workflows are sparse or absent. |
| Browser testing | Not supported | No browser-level suite exists. |
| CI | Implemented | Actions installs, lints, tests, builds, syntax-checks, and builds Docker; it has not yet run in the reconstructed repository. |
| Release automation | Partially implemented | Tag-triggered container publishing exists, but pre-release channel tags and release verification need correction before use. |
| Documentation accuracy | Partially implemented | Operator basics are useful; the pre-audit `1.0.0` claims substantially exceeded implementation. |
| Maintainability | Partially implemented | The app is small, but route SQL, policy, validation, and UI are not bounded enough for safe growth. |

## Unsafe or misleading claims

Before this assessment, the repository called the rebuild `1.0.0` and claimed object-scoped authorization, immutable decision packets, validated upload types/scanning, optimistic concurrency, recovery, restore tests, and complete accessibility behavior. Those claims were unsupported. Baseline documentation removes them or marks them as target requirements.

Operators must not rely on this alpha as the only system of record for sensitive or material operations. The broad authenticated response exposes finance, member, decision, and document metadata to roles with `foundation.read`; financial caps are incomplete; uploads are trusted; and restoration has not been automatically proven.

## Required before 1.0.0

FoundationOS needs focused APIs, server-enforced object scopes, immutable decision packets and recusal/resolution, end-to-end financial caps and arithmetic, secure document handling, verified restoration, concurrency control, recovery and MFA, modular services/repositories, accessibility and real localization, browser tests, upgrade matrices, security/release governance, and external pilot evidence. The complete gates are in `ROADMAP_TO_1.0.md`.

## Five highest-priority technical risks

1. The universal snapshot returns unrelated finance, document, member, and decision data to broadly permitted roles.
2. Financial records lack accepted-decision, commitment, schedule, currency, and rate invariants.
3. Decision rounds do not freeze document packets or provide formal recusal/objection-resolution lifecycle commands.
4. Backup restoration and upgrades are not automatically tested.
5. Missing optimistic concurrency allows stale workflow overwrites.

## Five highest-priority product gaps

1. No complete member lifecycle, password recovery, MFA, or session administration.
2. No scoped steward/reviewer experience or object-level access model.
3. No governed opportunity readiness requirements and incomplete meeting/closeout workflows.
4. No verified accessible core journey or genuine translation support.
5. No production-grade reporting, reconciliation, monitoring, or external-pilot evidence.

## Recommended maturity

**0.4.1-alpha** is appropriate. FoundationOS is a functional persistent internal alpha with authentication, primary navigation, explicit decision responses, basic finance, private-file storage, and a small test suite. Important security, integrity, recovery, accessibility, and operational guarantees remain incomplete, and the product contract is not stable.
