# Foundation OS

**Thoughtful family giving, from purpose to proof.**

Foundation OS is an open-source workspace for families who want to make charitable decisions together without losing their strategy, evidence, or follow-up in spreadsheets and calls.

Version `1.0.0` covers one complete operating loop:

- define a mission, annual allocation, scope, and measurable outcomes;
- intake and assess grant opportunities on a portfolio board;
- connect every request to an objective and estimated contribution;
- record a unanimous decision across five family members;
- assign one accountable project steward;
- find a meeting slot that works for everyone and build the agenda together;
- keep completed grants connected to the foundation’s outcome history.

## Quick start

Requires Node.js 20+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173`. The included demonstration foundation is fully interactive and persists in the browser. Use **Reset demo** in the sidebar to restore its original state.

## Product principles

1. **Start with outcomes, not organizations.** A mission becomes time-bound objectives with a metric, target, population, geography, and explicit thesis.
2. **Compare without pretending certainty.** Evidence strength, risk, funding gap, estimated contribution, and cost are visible together; no opaque score hides judgment.
3. **Make governance legible.** Votes and concerns stay attached to the decision. Unanimity is a domain rule, not a meeting convention.
4. **Give ownership without creating silos.** One steward owns follow-up while every member retains visibility.
5. **Learn after funding.** Active grants move into review and completion rather than disappearing from a spreadsheet.

The product framework and source research are in [docs/RESEARCH.md](docs/RESEARCH.md).

## Architecture

The public v1 is a typed, local-first React application. Its domain model and calculations are separate from presentation, and browser persistence is isolated behind one state boundary. This makes the demo immediately useful without pretending it is a production multi-user system.

The planned production architecture adds authenticated family workspaces, Postgres, object storage, an audit log, background notifications, and calendar integration behind the same domain concepts. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the decisions and migration path.

## Roadmap

The phased roadmap is in [docs/ROADMAP.md](docs/ROADMAP.md). The next release target is a secure hosted pilot for 3–5 families, with authentication, invitations, durable shared data, documents, and email notifications.

## Quality checks

```bash
pnpm lint
pnpm test
pnpm build
```

## Privacy and production readiness

This repository contains fictional demonstration data only. Version 1.0.0 stores data in the current browser and has no authentication or cloud sync. Do not use it for sensitive documents or real grant administration until the production persistence and access-control milestone is complete.

Security policy: [SECURITY.md](SECURITY.md)

## Contributing

Issues and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a change.

## License

[MIT](LICENSE)
