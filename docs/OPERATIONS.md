# Alpha operations guide

FoundationOS alpha releases are for evaluation. They are not suitable as the only system of record for sensitive or material operations.

## Persistent data

The container writes to `/data`:

```text
/data/foundationos.sqlite3
/data/foundationos.sqlite3-wal
/data/foundationos.sqlite3-shm
/data/documents/
/data/backups/
```

Compose stores it in the `foundationos-data` volume. `docker compose down` preserves the volume; `docker compose down --volumes` destroys it.

## Network boundary

The app serves HTTP. For networked evaluation, place it behind a trusted HTTPS reverse proxy and set:

```dotenv
FOUNDATION_OS_COOKIE_SECURE=true
FOUNDATION_OS_TRUST_PROXY=true
```

Only enable trusted-proxy handling when the app is reachable exclusively through that proxy. HSTS and TLS termination belong there.

## Backup creation

An administrator can call:

```http
POST /api/admin/backups
X-CSRF-Token: <current session token>
```

The server uses SQLite's online backup API, copies the document tree, and writes a manifest containing application version, database checksum, timestamp, and document-version count.

Known limitations:

- no administration UI, schedule, export, encryption, retention, or restore command;
- document copying is not coordinated with uploads, so a busy installation needs a maintenance window;
- backups remain plaintext in the same volume until exported and protected;
- creation is integration-tested, but restoration is not automatically tested.

## Manual restore drill (unverified)

Use only on an isolated copy until a roadmap milestone provides automation:

1. Stop FoundationOS.
2. Preserve the current `/data` volume as a rollback copy.
3. Verify `manifest.json` and the database SHA-256.
4. Replace the database and document tree together from one completed backup.
5. Start FoundationOS and check `/health/ready`.
6. Sign in and verify members, commitments, recent audit events, and representative downloads.

Never copy only a live database; WAL data and documents may be omitted. Never rehearse against the only important copy.

## Health and logs

- `/health/live` confirms the process responds.
- `/health/ready` performs a database read after startup migrations.
- Structured lifecycle/failure logs go to stdout.

These endpoints do not prove every workflow, document, backup, or external dependency is healthy.

## Upgrade

1. Export and protect a completed backup.
2. Read target release notes and migration limitations.
3. Recreate the container with the same volume.
4. Confirm readiness and reported application version.
5. Verify one critical synthetic workflow and representative document access.

Migrations run transactionally at startup, but cross-version upgrade/downgrade matrices are not yet proven. Downgrade is not automatic.
