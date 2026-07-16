# Versioning policy

FoundationOS uses Semantic Versioning with an explicit pre-release channel until the product contract is proven.

## Version meaning

- Major `0` means APIs, schema, workflows, permissions, and operational guarantees may still change incompatibly.
- A minor increment is one coherent, reviewable maturity milestone with documented acceptance tests.
- A patch increment corrects or republishes the same maturity milestone without claiming a new capability set.
- `alpha` means core behavior is incomplete or insufficiently proven for sensitive/material operations.
- `beta` will mean the intended 1.0 feature set is complete and externally piloted, while defects and operational evidence are still being resolved.
- `rc.N` identifies a frozen 1.0 candidate that changes only for release-blocking corrections.

No alpha, beta, or release candidate is a stable production release.

## Published baseline decision

The reconstructed public baseline is **0.4.1-alpha**.

The `0.4` milestone reflects real persistence, first-run setup, authentication, role-capability checks, explicit non-objection decisions, basic finance, document storage, meetings, audit events, Docker deployment, and automated tests. The `.1` patch records a truthful republication correction after deletion of the former repository: it removes the unsupported `1.0.0` claim, centralizes version reporting, aligns documentation, and preserves recoverable history without presenting baseline corrections as new product functionality.

The evidence does not justify beta or stable status. Object-level authorization, financial caps, packet immutability, restore testing, concurrency, account recovery/MFA, accessibility, localization, browser coverage, and release evidence are incomplete.

`package.json` is the authoritative version source. Server bootstrap and backup manifests read it at runtime. Human-facing documentation, Docker label defaults, and the Compose image tag must be updated during release preparation and checked in review.

## Minor-version criteria

A minor version requires one roadmap milestone to meet all acceptance criteria, including security/integrity failure paths, documentation, migration impact, and a clean full validation suite. Unrelated roadmap areas must not be bundled to justify a larger number.

## Current release decision

The first improved release is **0.5.0-alpha**. It is one minor milestone because initial commitment creation now enforces the accepted decision's amount ceiling and currency and requires a positive finite decimal exchange rate. It has no database migration and does not claim payment, installment, amendment, budget, reconciliation, or complete exchange-rate integrity.

The next intended version is **0.6.0-alpha**, focused on targeted read APIs and server-enforced object/assignment scopes. It must reduce broad authenticated exposure without combining unrelated roadmap areas.

## Criteria for 1.0.0

`1.0.0` is a verified product contract, not a date. It requires every guarantee in `ROADMAP_TO_1.0.md`, clean-install and supported-upgrade evidence, tested restoration, object-scoped authorization, complete decision/finance/document invariants, concurrency protection, accessible and genuinely translated supported experiences, browser-level critical-workflow tests, passing CI/security checks, pilot remediation, and no unsupported documentation claim.
