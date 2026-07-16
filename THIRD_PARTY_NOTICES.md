# Third-party notices

FoundationOS is licensed under GPL-3.0-or-later. It ships with or builds upon the following GPL-compatible open-source packages. Copyright remains with their respective authors.

| Component | Version family | License | Use |
| --- | --- | --- | --- |
| React / React DOM | 19.2 | MIT | Client rendering |
| Primer React | 38.32 | MIT | Accessible product components |
| Primer Primitives | 11.9 | MIT | Design tokens and themes |
| Lucide React | 1.24 | ISC | Interface icons |
| Vite | 8.1 | MIT | Client build system |
| TypeScript | 5.9 | Apache-2.0 | Type checking and compilation |
| Vitest | 4.1 | MIT | Client tests |
| Testing Library | 16.3 / 6.9 | MIT | Interface testing utilities |
| ESLint and TypeScript ESLint | 10 / 8.64 | MIT | Static analysis |

The distribution includes the exact resolved versions in `pnpm-lock.yaml`. Dependency license texts remain available in each package distribution and upstream repository.

## Reference implementations and provenance

- ParcOS (GPL-3.0) informed the single-container, persistent-volume, session, password-hashing, CSRF, and private-media patterns. FoundationOS reimplements those patterns in modular source for its grantmaking domain.
- OpenProject (GPL-3.0) informed action-board and workflow-policy behavior.
- ERPNext (GPL-3.0) informed fiscal budget, exchange-rate, payment-schedule, and immutable-reversal concepts.
- Taiga, Leantime, and Vikunja are AGPL products used only as public UX research references. No AGPL application source is copied into FoundationOS.

See [docs/RESEARCH.md](docs/RESEARCH.md) for source links and the compatibility rationale. This notice is an engineering record, not legal advice.
