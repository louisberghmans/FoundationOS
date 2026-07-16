# Changelog

All notable changes to FoundationOS are documented here.

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
