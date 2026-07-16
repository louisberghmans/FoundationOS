# FoundationOS engineering instructions

These rules apply to every change in this repository.

## Product invariants

- Silence never implies consent.
- Decision history is append-only.
- Posted financial transactions are not silently edited.
- Corrections use amendments, refunds, cancellations, or reversals.
- Authorization is enforced on the server.
- UI visibility is not security.
- Do not expose unrelated records through broad API responses.
- Do not introduce a universal impact score.
- Do not automate grant approval.
- FoundationOS is not statutory accounting software.

## Architecture constraints

- Preserve a simple self-hosted deployment.
- Preserve SQLite as the default database before 1.0 unless a milestone explicitly changes this.
- Avoid microservices.
- Keep route handlers thin.
- Keep domain rules testable.
- Keep multi-record mutations transactional.
- Keep SQL in bounded data-access modules.
- Do not add unnecessary infrastructure.

## Testing

Before completing any change, run all applicable checks:

```bash
pnpm lint
pnpm test
pnpm build
pnpm check:server
docker build -t foundationos:verification .
```

- Every security or authorization capability must have both allow and deny tests.
- Every financial invariant must have a failure-path test.

## Data protection

- Never commit real personal or foundation data.
- Use synthetic fixtures.
- Use reserved `.invalid` email addresses.
- Never commit secrets, databases, uploads, or backups.

## Git

- Do not work directly on `main` for development changes after baseline publication.
- Use focused branches.
- Keep one logical concern per commit.
- Avoid unrelated formatting changes.
- Do not rewrite public history after publication.
- Never force-push `main`.
