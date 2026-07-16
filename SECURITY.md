# Security policy

## Supported version

Only the latest tagged release receives security fixes.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub private vulnerability reporting for the repository and include reproduction steps, affected versions, and likely impact.

## Operator responsibilities

- Put public installations behind a maintained HTTPS reverse proxy.
- Set secure-cookie and trusted-proxy options only when the proxy is correctly configured.
- Restrict access to the Docker host and the persistent data volume.
- Back up the database and documents together, protect backups, and test restoration.
- Keep the FoundationOS image, host operating system, Docker, and reverse proxy updated.
- Configure and monitor the external malware-scanner hook before enabling future public uploads.
- Review member accounts and roles after staffing or governance changes.

## Security properties in v1

- invitation-only membership after first-run setup;
- scrypt password hashes and hashed opaque session tokens;
- expiring server-side sessions and one-time invitations;
- same-origin validation, CSRF tokens, security headers, and login throttling;
- server-side capability checks for every protected command;
- private document streaming through authorized routes;
- append-only audit events for significant actions;
- read-only container filesystem except for `/data`.

## Important limitations

FoundationOS does not provide full-disk encryption, host hardening, a built-in TLS endpoint, email delivery, or statutory accounting controls. Internal uploads are trusted as coming from authorized members; the v1 public-upload quarantine is infrastructure for a later portal and is not a complete malware-scanning service.
