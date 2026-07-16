# FoundationOS

**Trustworthy grantmaking for families and small foundations — currently an alpha.**

FoundationOS is a generic, self-hosted workspace for defining objectives, reviewing opportunities, recording explicit non-objection decisions, tracking basic grant finances, storing private documents, and coordinating meetings.

The current release is **0.4.1-alpha**, not 1.0.0 and not production-ready. Do not rely on it as the only system of record for sensitive or material foundation operations. Backups, TLS, host security, volume confidentiality, and correct access configuration remain the operator's responsibility. See [the assessment](docs/CURRENT_STATE_ASSESSMENT.md) for verified capabilities and limitations.

## What the alpha implements

- first-run foundation and administrator setup;
- invitation-only local accounts, sessions, CSRF checks, login throttling, and role capabilities;
- objectives and evidence observations;
- organizations, opportunities, and ordered workflow transitions;
- decision rounds requiring an explicit response from every eligible non-recused member, with objections remaining blocking;
- funds, budgets, commitments, agreements, installments, payments, refunds, amendments, and reversals at a basic alpha level;
- private-volume document storage with checksums, versions, authenticated download, and audit events;
- meeting polls, agenda proposals, grant reviews, backup creation, health endpoints, and structured logs.

Important gaps include broad authenticated read responses, incomplete object-level authorization, incomplete financial caps/arithmetic, no immutable decision-document packets, no tested restore, no concurrency controls, no password recovery or MFA, and no verified localization/accessibility coverage.

FoundationOS is a grant-management subledger, not statutory accounting software, a bank, or legal/tax advice. It does not automate grant approval and does not calculate a universal impact score.

## Run with Docker

Docker Compose is the recommended evaluation method:

```bash
cp .env.example .env
docker compose up --build -d
```

Open `http://localhost:8080` and complete setup. In PowerShell, use `Copy-Item .env.example .env`. Change the host port with `FOUNDATION_OS_PORT` in `.env`.

```bash
docker compose ps
docker compose logs --tail 100
docker compose down
```

Data is stored in the `foundationos-data` volume. `docker compose down --volumes` permanently deletes it.

For any network beyond a trusted local evaluation environment, use a maintained HTTPS reverse proxy and set secure-cookie/proxy options as described in [operations](docs/OPERATIONS.md). Do not expose an HTTP-only alpha to the public internet.

## Local development

Requires Node.js 24 and pnpm 11:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Run the full validation suite before completing a change:

```bash
pnpm lint
pnpm test
pnpm build
pnpm check:server
docker build -t foundationos:verification .
```

## Project documentation

- [Current state assessment](docs/CURRENT_STATE_ASSESSMENT.md)
- [Versioning policy](docs/VERSIONING.md)
- [Roadmap to 1.0](docs/ROADMAP_TO_1.0.md)
- [Current architecture](docs/ARCHITECTURE.md)
- [Domain model](docs/DOMAIN_MODEL.md)
- [Operations](docs/OPERATIONS.md)
- [Security](SECURITY.md)

## Data and privacy

No demonstration foundation or real personal data is included. A clean installation starts with administrator setup. Contributors must use synthetic fixtures and reserved `.invalid` email addresses and must never commit secrets, databases, uploads, or backups.

## License

FoundationOS is licensed under **GNU GPL-3.0-or-later**. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
