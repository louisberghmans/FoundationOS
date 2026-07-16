# Changelog

All notable changes to FoundationOS are documented here.

## 0.5.0-alpha — 2026-07-16

### Changed

- Commitment creation now rejects an amount greater than its accepted decision.
- Commitment currency must exactly match the accepted decision currency.
- Exchange rates must be positive, finite decimal text no longer than 40 characters.
- The checks are centralized in a testable server finance module and cannot be bypassed by client controls.

### Integrity consequence

An accepted decision now places a server-enforced ceiling and currency boundary on the initial commitment. Rejected requests do not insert a commitment. This materially reduces authorization drift but does not complete FoundationOS financial integrity.

### Migration and verification

- No database migration or automatic rewrite of existing alpha records.
- Added focused unit failure paths and route-level integration cases for excess amount, currency mismatch, invalid rates, missing acceptance, and the exact valid boundary.
- Full lint, test, build, server syntax, Docker build, and runtime smoke checks are required for the release.

### Remaining limitations

- Payment, installment, amendment, budget, aggregate, and exchange-rate arithmetic/source invariants remain incomplete.
- Object-level authorization, immutable decision packets, restore testing, and concurrency controls remain roadmap work.

## 0.4.1-alpha — 2026-07-16

### Existing capabilities republished

- Persistent Node 24 and SQLite application with first-run setup and local accounts.
- Explicit non-objection decision rounds, basic grant workflow/finance, private-volume documents, meetings, reviews, audit events, backup creation, and Docker deployment.
- Server sessions, CSRF/same-origin checks, login throttling, role capabilities, security headers, and a small integration test suite.

### Baseline corrections

- Reclassified the unsupported `1.0.0` claim as `0.4.1-alpha`.
- Made `package.json` the authoritative runtime version source for bootstrap, application data, and backup manifests.
- Added the current-state assessment, version policy, roadmap to 1.0, and persistent engineering instructions.
- Corrected public, security, operations, architecture, and release language to distinguish implementation from target design.
- Prevented pre-release container tags from publishing the stable `latest` channel.
- Preserved the recoverable local prototype and rebuild history before reconstructing the public repository.

### Known limitations

- The authenticated application snapshot is broad and object-level authorization is incomplete.
- Financial caps, rate validation, immutable decision packets, upload scanning, concurrency, recovery/MFA, and automated restore testing are incomplete or absent.
- Test coverage is narrow and has no browser-level suite; accessibility and localization are not verified.
- This alpha must not be the only system of record for sensitive or material operations.
