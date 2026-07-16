# Security policy

## Supported version

Only the latest tagged alpha receives best-effort security fixes. Alpha status is not a production-support promise.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub private vulnerability reporting when enabled. Until it is confirmed enabled, contact the repository owner privately and include reproduction steps, affected versions, and likely impact without including real foundation data.

## Implemented controls

- salted scrypt password hashes;
- hashed opaque server-side sessions with fixed expiry;
- one-time, expiring invitation tokens;
- same-origin and per-session CSRF checks for mutations;
- in-memory login throttling;
- server-side capability checks on protected commands;
- CSP and common browser hardening headers;
- document bytes outside the public directory and streamed through authenticated routes;
- append-only audit events for many significant actions;
- non-root, read-only-root container deployment except for `/data`.

## Material alpha limitations

- `foundation.read` unlocks a broad snapshot containing unrelated member, decision, finance, document, meeting, and review data. Object-level authorization is absent.
- Assigned steward/reviewer scopes are not enforced on reads or related mutations.
- Password recovery, MFA, session inventory, idle expiry, and durable distributed throttling are absent.
- Internal upload MIME type is caller-supplied and no malware scanner is integrated. Do not upload untrusted content.
- Backups are plaintext under `/data`; automated restore integrity/confidentiality is unproven.
- No security audit, dependency vulnerability gate, browser authorization suite, or penetration test establishes production readiness.

## Operator responsibilities

- Do not expose FoundationOS directly to the public internet during alpha evaluation.
- Use a maintained HTTPS reverse proxy and secure cookies for any networked deployment.
- Restrict access to the Docker host, data volume, logs, and backup copies.
- Encrypt/export backups with operator tooling and rehearse restoration on an isolated copy.
- Keep the host, Docker, proxy, Node image, and FoundationOS release updated.
- Use only synthetic/non-sensitive data unless the operator independently accepts every documented risk.

See [the assessment](docs/CURRENT_STATE_ASSESSMENT.md) and [roadmap](docs/ROADMAP_TO_1.0.md).
