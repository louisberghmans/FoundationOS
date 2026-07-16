# Delivery roadmap

This roadmap replaces the prototype roadmap. Version 1.0.0 means a genuine self-hosted application: server persistence, accounts, permissions and operational data—not browser-local demonstration state.

## v1.0.0 — trustworthy core

### Release gate A: architecture and product contract

- accepted architecture, threat model and permission matrix;
- documented domain model, workflow transitions and decision invariants;
- documented design system and accessibility acceptance criteria;
- GPL-3.0-or-later license and dependency provenance policy;
- no personal, family-derived or real charity demonstration data.

### Release gate B: installation and membership

- one-container Docker Compose deployment with persistent `/data` volume;
- readiness/liveness checks and startup configuration validation;
- genuine first-run administrator wizard;
- foundation identity, locale, time zone, base currency and fiscal-year setup;
- invitation-only accounts, password login, logout, recovery and session management;
- server-enforced capability roles and member deactivation;
- audit events for authentication, permissions and administration.

### Release gate C: strategy and opportunity workflow

- mission, scope, focus areas and theory-of-change objectives;
- baseline/current/target indicators, evidence state, assumptions and risk;
- organizations, contacts and conflict disclosures;
- internal opportunity intake with required-field readiness;
- accessible action board plus table view, filters, WIP limits and explicit policies;
- server-enforced stage transitions and one accountable steward.

### Release gate D: decisions and documents

- immutable decision packets and electorate snapshots;
- explicit Support, Neutral or Object response from every eligible member;
- no deadline, administrator action or background job can infer consent;
- objection reason, discussion, revision, withdrawal and round history;
- private document upload, versioning, checksums, authorization and access audit;
- untrusted upload quarantine infrastructure for the later public portal.

### Release gate E: grant finance and stewardship

- funds, fiscal periods, budgets and objective/program allocations;
- multi-year, multi-currency commitments with explicit exchange-rate records;
- agreements, amendments and installment schedules;
- payments, cancellations, refunds and reversing corrections;
- budget/commitment/scheduled/paid/returned/available totals with drill-down;
- report milestones, follow-up actions and one accountable project steward;
- exports intended for reconciliation with formal accounting.

### Release gate F: meetings, review and operations

- member-proposed meeting slots with time-zone-safe availability matrix;
- explicit meeting confirmation, agenda proposals, notes and action ownership;
- outcome observations separated into expected, reported and verified;
- scaled review using OECD DAC lenses and learning notes;
- backup creation, documented restore and automated restore test;
- responsive keyboard and screen-reader flows for setup, board, decision and finance;
- unit, integration, authorization-matrix and end-to-end tests;
- clean install and upgrade tests against the published image.

### v1.0.0 release criteria

The release is blocked unless all of the following are true:

1. A fresh operator can install with documented Docker commands and finish setup without editing the database.
2. Two users with different roles demonstrably receive different server-enforced permissions.
3. A decision stays pending with one missing response and blocked with one active objection.
4. A posted payment cannot be deleted or silently edited; correction creates an auditable reversal or replacement.
5. A private document cannot be fetched without an authorized session.
6. Backup and restore reproduce database and document checksums.
7. The repository and Git history contain no personal seed data or prior prototype release.

## v1.1 — public intake and communication

- optional public foundation profile and eligibility page;
- configurable public inquiry/application form with consent and retention text;
- spam protection, throttling and quarantined uploads;
- internal triage inbox and explicit promotion to an organization/opportunity;
- templated email delivery, reminders and delivery audit;
- public status messages without exposing internal workflow or notes.

## v1.2 — integrations and reporting

- Google and Microsoft calendar availability/invitations;
- optional OneDrive, SharePoint and Google Drive document links;
- accounting exports and configurable finance mappings;
- reviewed public impact publications generated from explicit publication records;
- portfolio reports with evidence freshness and contribution caveats.

## v2 — larger foundations

- Postgres and S3-compatible deployment profile;
- configurable workflows, custom roles and approval segregation;
- portfolio scenarios, concentration risk and comparable outcome ranges;
- localization and translated public forms;
- optional multi-foundation hosting only after a dedicated tenancy threat model.

## Explicit non-goals

- automated charity ranking or approval;
- implied consent or silent voting;
- a universal impact score;
- statutory accounting, bank reconciliation or tax filing;
- publishing internal records by toggling visibility;
- AI-generated decisions or uncited document conclusions.
