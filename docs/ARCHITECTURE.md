# Architecture

## Decision summary

Foundation OS v1 is a local-first single-page application with a typed domain core. This is the smallest architecture that can prove the full family workflow without creating a pretend backend or collecting sensitive data before access control exists.

### Current runtime

```text
React views
   │
   ├── domain types and workflow rules
   ├── derived portfolio calculations
   └── one FoundationState boundary
             │
             └── browser localStorage (demo persistence)
```

- **React + TypeScript:** component model and compile-time domain constraints.
- **Vite:** fast local development and a static production build.
- **Pure calculation helpers:** budget totals, vote completion, and stage progression are testable without rendering.
- **One persisted aggregate:** changes are immutable and saved to a versioned browser key.
- **No network or secrets:** the public demo contains fictional data and runs without configuration.

## Domain boundaries

| Boundary | Core records | Invariants |
| --- | --- | --- |
| Strategy | Foundation brief, objective | Target and deadline exist; projects reference an objective |
| Portfolio | Project, stage, evidence, amount | Stage follows the defined grant lifecycle |
| Governance | Member, vote, decision rule | Decision → active requires all eligible approvals |
| Stewardship | Project steward, next action | One member is accountable at a time |
| Convening | Meeting, slot, availability, agenda | Availability is member-specific; confirmed slot is retained |

## Why not start with a spreadsheet-shaped database

The difficult part is not storing rows. It is preserving invariants across strategy, decisions, ownership, and learning. Modeling those concepts first prevents the future database schema from encoding accidental spreadsheet columns as the product.

## Production target architecture

```text
Browser / installable web app
            │ HTTPS
Application API / server actions
   ├── authorization policy
   ├── portfolio + voting services
   ├── meeting + notification services
   └── immutable audit events
            │
   ┌────────┼───────────┐
Postgres  Object store  Job queue
shared    grant files   mail/calendar
records
```

### Recommended implementation path

1. Move domain mutations behind application services while keeping the current React screens.
2. Add email magic-link or passkey authentication and invitation-only family workspaces.
3. Use Postgres row-level tenancy keyed by `family_id`; make authorization checks server-side and default-deny.
4. Add append-only audit events for votes, stage changes, steward changes, money fields, and document access.
5. Store files in private object storage with short-lived signed URLs, malware scanning, and retention controls.
6. Add a background queue for reminders and calendar/email delivery with idempotency keys.

## Proposed relational model

```text
families ──< memberships >── users
   │
   ├──< objectives
   ├──< projects ──< project_documents
   │       ├──< votes
   │       ├──< reviews
   │       └──< tasks
   └──< meetings
            ├──< meeting_slots ──< availability
            └──< agenda_items
```

Money should be stored as integer minor units plus ISO currency. Dates should be stored in UTC with the meeting’s IANA time zone retained separately. Outcome measurements should be append-only observations instead of overwriting a single current number.

## Authorization model

- A user can belong to multiple family workspaces.
- `admin` manages membership and strategy settings.
- `member` can propose projects, vote, and edit meetings.
- `observer` is read-only and cannot be part of a unanimity denominator.
- A conflict recusal removes a member from the eligible set for that decision but remains visible in the audit record.
- A steward is responsibility metadata, not a permission boundary.

## Security and privacy baseline

- invitation-only tenancy and server-side authorization on every object;
- encrypted transport and managed encryption at rest;
- private-by-default documents, least-privilege service credentials, and no secrets in the client bundle;
- audit trails for financial and governance mutations;
- data export and deletion controls;
- dependency, secret, and static analysis in CI;
- threat modeling before the first real-family pilot.

## Testing strategy

The current repository includes unit tests for financial totals, workflow order, and unanimity plus interface smoke tests. Production milestones should add API contract tests, authorization matrix tests, database integration tests, and end-to-end tests for the full grant and meeting loops.

## Architectural risks

| Risk | Response |
| --- | --- |
| Estimated outcome values become misleading attribution | Label as estimates; record methodology, confidence, and observations over time |
| Unanimity causes stalled decisions | Make pending/concern state visible; add explicit recusal and deferred decision states |
| One steward becomes an information silo | Keep all documents, actions, and reviews visible to the family |
| Sensitive grant material leaks across families | Enforce tenancy in database and service layers; test object-level authorization |
| Notification retries create duplicate invitations | Queue with idempotency keys and provider event IDs |
