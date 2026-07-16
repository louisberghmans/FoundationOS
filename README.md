# FoundationOS

**Trustworthy grantmaking for families and small foundations.**

FoundationOS is a generic, self-hosted workspace for defining impact objectives, reviewing opportunities, making explicit non-objection decisions, tracking grant finances, storing private documents, and coordinating meetings.

There is no demonstration foundation and no personal seed data. A clean installation starts with a genuine administrator setup workflow.

## What v1.0 provides

- first-run foundation and administrator setup;
- invitation-only accounts with server-enforced role capabilities;
- mission, theory-of-change objectives, indicators, targets, and evidence state;
- accessible action board with server-enforced workflow transitions;
- immutable decision rounds with Support, Neutral, and Object responses;
- mandatory explicit response from every eligible, non-recused member;
- funds, fiscal budgets, multi-currency commitments, payments, and refunds;
- private documents on the persistent data volume with checksums and access audit;
- meeting-slot polls with explicit member availability;
- append-only audit events for security, governance, workflow, and finance actions.

FoundationOS is a grant-management subledger, not a replacement for statutory accounting, banking, tax, or legal advice.

## Run with Docker

Docker Compose is the recommended installation method.

```bash
cp .env.example .env
docker compose up --build -d
```

Open `http://localhost:8080` and complete the administrator setup. On PowerShell, copy the example with `Copy-Item .env.example .env`.

Use another host port by setting `FOUNDATION_OS_PORT` in `.env`:

```dotenv
FOUNDATION_OS_PORT=8090
```

Check or stop the installation:

```bash
docker compose ps
docker compose logs --tail 100
docker compose down
```

Application data is stored in the named `foundationos-data` volume. `docker compose down` keeps it; `docker compose down --volumes` permanently deletes it.

### HTTPS reverse proxy

For an internet-facing installation, place FoundationOS behind a trusted HTTPS reverse proxy and set:

```dotenv
FOUNDATION_OS_COOKIE_SECURE=true
FOUNDATION_OS_TRUST_PROXY=true
```

Do not expose an HTTP-only installation to the public internet.

## Local development

Requires Node.js 24 and pnpm 11.

```bash
pnpm install
pnpm build
pnpm start
```

The production-style server is then available on `http://localhost:3000`. `pnpm dev` runs the Vite client only and expects an API server during feature development.

## Quality checks

```bash
pnpm lint
pnpm test
pnpm build
pnpm check:server
```

The server integration suite verifies first-run locking, invitations, permission denial, explicit decision completion, workflow gates, commitments, payments, sessions, and CSRF.

## Architecture and product research

- [Architecture](docs/ARCHITECTURE.md)
- [Domain model and invariants](docs/DOMAIN_MODEL.md)
- [Design-system specification](docs/DESIGN_SYSTEM.md)
- [Product and UX research](docs/RESEARCH.md)
- [Delivery roadmap](docs/ROADMAP.md)
- [Operations and backup guide](docs/OPERATIONS.md)

The deployment follows ParcOS's operational simplicity—one Node container and one persistent volume—while the source is split into client, server, database, policy, and domain boundaries. The interface uses GPL-compatible Primer components and primitives under a FoundationOS semantic theme.

## Data and privacy

- Files are private by default and are never served directly from `/data`.
- Passwords are stored as salted scrypt hashes.
- Sessions are opaque, server-side, expiring, and revocable.
- State-changing requests require same-origin and CSRF checks.
- Posted financial transactions and final decision history are not silently rewritten.
- Public charity intake is intentionally disabled in v1 and will use a separate quarantine boundary.

Read [SECURITY.md](SECURITY.md) before operating FoundationOS with confidential records.

## License

FoundationOS is free software licensed under **GNU GPL-3.0-or-later**. See [LICENSE](LICENSE). Third-party components and their licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
