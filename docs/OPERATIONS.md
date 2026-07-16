# Operations guide

## Persistent data

The container writes only to `/data`:

```text
/data/foundationos.sqlite3
/data/foundationos.sqlite3-wal
/data/foundationos.sqlite3-shm
/data/documents/
/data/backups/
```

Docker Compose stores this directory in the `foundationos-data` named volume. `docker compose down` preserves the volume. `docker compose down --volumes` destroys it.

## Backups

An administrator backup uses SQLite's online backup API and copies the private document tree into one directory under `/data/backups`. The manifest records the application version, database checksum, timestamp, and document-version count.

The authenticated API command is:

```http
POST /api/admin/backups
X-CSRF-Token: <current session token>
```

The administration interface will expose scheduling and restore controls in a later operational release. In v1, operators should copy the completed backup directory off the Docker host using their normal encrypted backup system.

Never copy a live `foundationos.sqlite3` file on its own. WAL data and documents may then be missing.

## Restore drill

Restore is intentionally offline:

1. Stop FoundationOS.
2. Preserve the current `/data` volume as a rollback copy.
3. Verify `manifest.json` and the SHA-256 checksum of the backed-up database.
4. Replace the database and document tree together from one backup directory.
5. Start FoundationOS and check `/health/ready`.
6. Sign in and verify document downloads, members, commitments, and recent audit events.

Automating a destructive restore inside the web process would create an unsafe failure mode. Operators should rehearse the procedure on a separate volume before relying on it.

## Health and logs

- `/health/live` confirms the Node process is running.
- `/health/ready` confirms that the database is readable and migrations completed.
- Structured application logs are written to stdout.

```bash
docker compose ps
docker compose logs --tail 100
```

## Upgrade

1. Create and export a backup.
2. Pull or build the new image.
3. Recreate the container with the same volume.
4. Watch logs until the readiness check is healthy.
5. Verify the application version and one critical workflow.

Database migrations are transactional and run at startup. Downgrades are not automatic.
