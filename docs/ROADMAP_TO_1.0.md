# Roadmap to FoundationOS 1.0.0

Status: evidence-based release plan

Starting point: **0.4.1-alpha**

Stable endpoint: **1.0.0 only after every release guarantee is proven**

Each milestone is cumulative. A milestone cannot ship while its acceptance criteria or inherited blockers remain open. Dates do not override evidence.

## 0.4.1-alpha — reconstructed truthful baseline

- **Objective:** Publish the existing functional internal alpha under an honest version and preserve its recoverable two-commit history.
- **Scope:** Version consistency, current-state assessment, corrected public/security/operations guidance, roadmap, engineering rules, CI and container validation.
- **Explicit non-goals:** New domain features, broad refactoring, stronger authorization, or new financial rules.
- **Database migrations:** None.
- **Security consequences:** Removes misleading assurances; does not reduce known broad authenticated exposure.
- **Tests required:** Frozen install, lint, existing suites, build, server syntax, Docker build, and first-run health/bootstrap smoke.
- **Documentation required:** Assessment, version policy, this roadmap, changelog, alpha README, security and operations guidance.
- **Acceptance criteria:** All checks pass; version is consistently reported; no secret/real data is tracked; public release is a pre-release.
- **Release blockers:** Sensitive data, unidentified changes, failing checks, unverified tag/commit, or unsafe remote history.
- **Dependency:** None; this is the reconstructed baseline.

## 0.5.0-alpha — commitment creation integrity (implemented)

- **Objective:** Prevent a commitment from contradicting the accepted decision that authorizes it.
- **Selected scope:** Central server validation rejects a commitment above the accepted amount, a currency different from the decision currency, or a non-positive/non-finite exchange rate. Add allow and failure-path integration tests.
- **Reason selected first:** This is a small server-side boundary with immediate trust value and no schema migration. The baseline demonstrably accepts invalid commitments.
- **Affected risks:** Financial authorization drift, currency inconsistency, and invalid rate records.
- **Explicit non-goals:** Payment/installment caps, budget availability, amendment totals, accounting, API redesign, authorization scopes, or UI refactoring.
- **Database migrations:** None; compatible with existing baseline data. Existing invalid records are documented but not rewritten.
- **Security consequences:** Finance requests remain capability-protected; business authorization becomes stricter on the server.
- **Tests required:** Exact accepted amount succeeds; excess amount, mismatched currency, zero/negative/non-numeric rate, and missing accepted decision fail without insertion.
- **Documentation required:** Changelog, roadmap status, finance limitation and migration note.
- **Acceptance criteria:** Focused tests plus full suite and Docker build pass; route calls one testable finance validator.
- **Release blockers:** Regression in decisions, duplicate commitments, or valid baseline data.
- **Dependency:** 0.4.1-alpha must be publicly tagged and released first.
- **Implementation status:** Completed after publication of the baseline. No schema migration was required; focused allow/failure tests and the full release suite are the evidence gate.

## 0.6.0-alpha — targeted read APIs and scoped authorization (next recommended milestone)

- **Objective:** Stop broad authenticated data exposure and enforce assignment/object scope.
- **Scope:** Focused dashboard, opportunity, finance-summary, and document endpoints; restricted fields; steward/reviewer assignment enforcement; documented transitional subset of `/api/app`.
- **Explicit non-goals:** Full UI redesign, custom roles, multi-tenancy, or public portal.
- **Database migrations:** Assignment indexes/scope records only if needed, with compatibility notes.
- **Security consequences:** Least-privilege reads become server-enforced; allow and deny matrices are mandatory.
- **Tests required:** Anonymous, viewer, voting member, finance manager, assigned/unassigned steward/reviewer, enumeration and unrelated-object denial.
- **Documentation required:** Permission matrix, endpoint contracts, transitional architecture, threat-model update.
- **Acceptance criteria:** No supported role can retrieve unrelated finance/document/private member data; legacy snapshot has a removal plan.
- **Release blockers:** Client reliance on unrestricted payloads, missing deny tests, or ambiguous ownership.
- **Dependency:** 0.5.0 finance boundary and baseline policy vocabulary.

## 0.7.0-alpha — document security and immutable decision packets

- **Objective:** Make document access and decision evidence trustworthy.
- **Scope:** Classification-aware authorization, content detection/allowlist, safe streaming, failure cleanup, immutable decision packet/version joins, exact-version agreement references, audited access.
- **Explicit non-goals:** Public applicant portal, general file sharing, or in-process malware engine.
- **Database migrations:** Packet/item tables, agreement version reference, scan/classification constraints, tested upgrade fixture.
- **Security consequences:** File metadata/bytes follow object scope; untrusted content cannot be presented as verified.
- **Tests required:** Authorized/unauthorized metadata/download, traversal/content-disposition, size/type rejection, orphan cleanup, packet immutability, historical retrieval.
- **Documentation required:** Upload threat model, scanner boundary, retention and incident guidance.
- **Acceptance criteria:** Opened decisions point to immutable bytes/checksums; unrelated users cannot enumerate/download them.
- **Release blockers:** MIME trust, mutable packet references, missing access audit, or unsafe migration.
- **Dependency:** Focused APIs and scopes from 0.6.0.

## 0.8.0-alpha — governed workflow, decisions, and concurrency

- **Objective:** Complete governance lifecycle without silent overwrites.
- **Scope:** Server-driven transition requirements, proposal revisions, electorate/recusal lifecycle, objection resolution, cancellation/supersession, immutable accepted rounds, compare-and-swap versions.
- **Explicit non-goals:** Configurable workflow engine, automatic approvals, or universal policy scoring.
- **Database migrations:** Proposal revisions, requirement evidence, recusal/resolution events, immutable-state support, version indexes.
- **Security consequences:** Only authorized actors change electorate/workflow state; stale writes return conflicts.
- **Tests required:** Missing response, objection persistence, recusal, supersession, packet mismatch, forbidden transition, stale update, and audit preservation.
- **Documentation required:** State machines, actor rules, conflict UX, migration notes.
- **Acceptance criteria:** Silence cannot become consent; accepted history cannot change; unmet requirements are truthful; conflicts are visible.
- **Release blockers:** Any route mutating final history or bypassing transition requirements.
- **Dependency:** 0.7.0 packets and 0.6.0 scopes.

## 0.9.0-alpha — complete financial and account-security invariants

- **Objective:** Harden material-value and account boundaries before beta.
- **Scope:** Commitment/amendment ceilings, budget/fund validity, installment totals, payment/refund/reversal caps, rate arithmetic/source, transactional aggregates, recovery, MFA, session inventory/revocation, durable throttling.
- **Explicit non-goals:** Statutory accounting, bank initiation, tax filing, or automatic approval.
- **Database migrations:** Financial/rate provenance support, recovery/MFA credentials, session metadata, with upgrade/backfill strategy.
- **Security consequences:** Stronger takeover resistance and segregation of material actions.
- **Tests required:** Every financial failure path; recovery/MFA replay/bypass denial; revocation; rollback and concurrency.
- **Documentation required:** Finance contract, reconciliation boundary, recovery runbook, MFA guidance.
- **Acceptance criteria:** Commitments cannot exceed decisions; payments cannot exceed commitments/installments; rates and corrections are validated and append-only.
- **Release blockers:** Arithmetic ambiguity, silent edits, recovery bypass, unsafe MFA secrets, or missing denial tests.
- **Dependency:** Governed decisions and concurrency in 0.8.0.

## 0.10.0-beta — operationally complete core and maintainable UX

- **Objective:** Reach feature-complete beta with recoverable operations and accessible core journeys.
- **Scope:** Tested backup/restore, upgrade fixtures, monitoring/privacy-safe events, bounded modules, keyboard/focus/screen-reader remediation, translation infrastructure and complete declared translations.
- **Explicit non-goals:** Optional integrations, multi-foundation hosting, or major visual redesign.
- **Database migrations:** Compatibility support only; every supported prior upgrade fixture passes.
- **Security consequences:** Restore integrity, safer logs, and reduced monolithic review risk.
- **Tests required:** Clean install, restore with checksums/documents, supported upgrades, critical browser journeys, accessibility automation/manual checklist, locale completeness.
- **Documentation required:** Monitoring guide, restore runbook, support matrix, architecture, accessibility and language statements.
- **Acceptance criteria:** Feature-complete scope, tested recovery, maintainable ownership, keyboard-accessible core, and complete supported locales.
- **Release blockers:** Untested restore/upgrade, accessibility blocker, untranslated supported UI, or privacy-unsafe telemetry.
- **Dependency:** Contracts through 0.9.0.

## 0.11.0-beta — external pilot and release governance

- **Objective:** Prove the complete product through external pilot and governed releases.
- **Scope:** Pilot onboarding/remediation, browser regression, performance envelopes, dependency/code/container scanning, signed provenance/SBOM, protected-main process, upgrade rehearsal.
- **Explicit non-goals:** Expanding scope for every pilot request or declaring stability with blockers.
- **Database migrations:** Pilot-remediation changes only, with tested upgrade/rollback plans.
- **Security consequences:** Independent findings and supply-chain checks become release evidence.
- **Tests required:** Full role matrix, critical browsers, supported upgrades, disaster-recovery drill, security scans, pilot regressions.
- **Documentation required:** Pilot findings, limitations, support/security policy, release checklist, compatibility matrix.
- **Acceptance criteria:** Pilot blockers closed or defer 1.0; governance prevents unreviewed/unverified publication.
- **Release blockers:** Critical/high security issues, data-loss findings, incomplete remediation, flaky critical tests, or untraceable artifacts.
- **Dependency:** Feature-complete 0.10.0-beta.

## 1.0.0-rc.1 — frozen release candidate

- **Objective:** Validate an unchanged candidate against the stable contract.
- **Scope:** Release-blocking fixes only; final install, upgrade, restore, security, accessibility, localization, documentation and artifact verification.
- **Explicit non-goals:** New features, schema redesign, or roadmap acceleration.
- **Database migrations:** None unless fixing a blocker; any change requires a new RC and full matrix.
- **Security consequences:** Final threat-model and private-reporting verification.
- **Tests required:** Entire release matrix from clean source and published images on supported platforms.
- **Documentation required:** Final install/upgrade/rollback, limitations, security, admin and user guidance.
- **Acceptance criteria:** All guarantees below have evidence and no blocker remains.
- **Release blockers:** Any behavior/documentation change requires a new RC.
- **Dependency:** Successful 0.11.0 pilot/remediation.

## 1.0.0 — stable product contract

- **Objective:** Publish the first stable, supportable FoundationOS contract.
- **Scope:** Promote the verified RC commit without code changes; publish signed/tagged artifacts and support policy.
- **Explicit non-goals:** Unverified last-minute fixes or optional integrations.
- **Database migrations:** Identical to the accepted RC.
- **Security consequences:** Supported-version and disclosure commitments become active.
- **Tests required:** Verify tag, artifact digest, provenance and notes match the tested RC.
- **Documentation required:** Stable contract, compatibility window, limitations and next-version policy.
- **Acceptance criteria:** Every guarantee below is proven and the tag matches the tested commit.
- **Release blockers:** Missing evidence, unsupported claim, artifact mismatch, or unresolved critical issue.
- **Dependency:** Accepted 1.0.0 release candidate.

## Mandatory 1.0.0 release guarantees

`1.0.0` is blocked until all of the following are proven:

- a clean installation works;
- upgrades from every supported prior release work;
- backup and restore are automatically tested;
- permissions are server-enforced and object-scoped;
- users cannot retrieve unrelated data;
- decision packets are immutable;
- decision electorates and recusal are explicit;
- silence cannot become consent;
- commitments cannot exceed approved decisions;
- payments cannot exceed valid commitments or installments;
- exchange-rate calculations are validated;
- financial corrections are append-only;
- document access is scoped and audited;
- uploads are safely handled;
- concurrency conflicts cannot silently overwrite records;
- the core application is keyboard accessible;
- all supported languages are genuinely translated;
- critical workflows have browser-level tests;
- CI and security checks pass;
- known limitations are documented;
- no unsupported claim remains in the documentation.
