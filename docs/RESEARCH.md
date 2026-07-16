# Product and UX research

Status: design input for the v1.0 rebuild
Last reviewed: 2026-07-16

## Strategy and impact framework

FoundationOS uses a compact theory of change rather than a flat list of goals:

```text
Mission and scope
  -> long-term outcomes
  -> intermediate outcomes
  -> outputs
  -> funded activities
     constrained by assumptions, risks and external factors
```

Each objective records:

- the population, place, time horizon and desired change;
- baseline, target, unit and measurement method;
- the causal thesis, important assumptions and principal risks;
- indicators with data source, cadence, owner and disaggregation;
- expected contribution from grants separately from observed and verified results;
- evidence freshness, verification state and confidence notes.

This combines the practical theory-of-change questions summarized by [BetterEvaluation](https://www.betterevaluation.org/tools-resources/creating-your-theory-change-npcs-practical-guide) with the five IRIS+ impact dimensions—what, who, how much, contribution and risk—and its sequence of goals, strategy, metrics, targets, measurement and learning ([IRIS+ introduction](https://iris.thegiin.org/introduction/)).

OECD's six evaluation criteria—relevance, coherence, effectiveness, efficiency, impact and sustainability—are review lenses, not a numeric score or a methodology. OECD explicitly recommends adapting them to context and grounding conclusions in credible evidence and the intervention logic ([OECD guidance](https://www.oecd.org/en/publications/applying-evaluation-criteria-thoughtfully_543e84ed-en.html)).

### Consequence for the interface

A goal card never shows a naked completion ring. It shows an exact baseline/current/target statement, reporting period, trend, evidence state, and the split between expected contribution and verified observation. Progress can be unknown, on track, at risk, off track, achieved, or not yet measurable; color is never the only signal.

## Kanban and workflow research

The [Kanban Guide](https://kanban.university/kanban-guide/) treats boards as a way to visualize workflow, risks and work; limit work in progress; make policies explicit; and manage flow using feedback and metrics. OpenProject's GPL board model usefully distinguishes a visual board from an action board where moving a card updates the underlying work item attribute and remains constrained by workflow permissions ([OpenProject boards](https://www.openproject.org/docs/user-guide/agile-boards/)).

FoundationOS therefore uses the board as a projection of the opportunity workflow, not as the database model:

- each column is a configured stage with a visible definition and exit policy;
- stage changes call a server command and are rejected when permissions or transition policy fail;
- WIP limits are visible and warn before a bottleneck becomes invisible;
- cards show only decision-useful metadata: organization, request, linked objective, steward, blockers, document readiness and age in stage;
- compact, comfortable and expanded density are user preferences;
- filters and saved views work identically in board and table views;
- a detail panel preserves board context while reviewing one opportunity;
- moving a card by drag, keyboard, or the “Move to stage” action invokes the same command.

Taiga's swimlanes, WIP limits, filtering, search and card density are useful interaction references, but Taiga is AGPL. FoundationOS studies those public patterns and does not copy its source.

## Accessible interaction requirements

WCAG 2.2 requires a non-drag single-pointer alternative for functionality that uses dragging ([Understanding Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements)). Each card therefore has a visible action menu with “Move to stage,” and the board supports keyboard movement with announced results. Dragging is an enhancement.

[WCAG's use-of-color guidance](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color) means objecting votes, overdue reports, budget warnings and goal status always include text and/or an icon. Controls meet the WCAG 2.2 24 by 24 CSS-pixel minimum target rule, focus is visible and not obscured, and interface state is announced to assistive technology.

## Financial workflow research

ERPNext provides useful GPL reference patterns: budgets attach amounts to fiscal periods and dimensions, payment terms become schedules, multi-currency transactions retain exchange rates, and immutable ledgers use reversal entries instead of deleting posted transactions ([budgets](https://docs.frappe.io/erpnext/budget), [multi-currency](https://docs.frappe.io/erpnext/multi-currency-accounting), [immutable ledger](https://docs.frappe.io/erpnext/immutable-ledger-in-erpnext)).

FoundationOS adopts these controls at grant-subledger level:

```text
Fund
  -> fiscal-period budget
  -> allocation to objective/program
  -> approved commitment
  -> agreement and amendments
  -> scheduled disbursements
  -> recorded payments
  -> refunds, cancellations and reversals
```

The interface keeps original currency and base-currency equivalent visible together, aligns money with tabular numerals, labels totals by state (budgeted, committed, scheduled, paid, returned, available), and links every amount to its source transaction and audit history. It never labels the subledger as audited accounts.

## Decision design

Each decision opens an immutable round that freezes:

- the eligible electorate and any disclosed recusals;
- the exact proposal version, amount, currency and attached decision packet;
- the response policy and deadline;
- each Support, Neutral or Object response with actor and timestamp.

Support and Neutral are non-objections. Object blocks. Pending remains pending indefinitely; deadlines generate reminders but never manufacture a response. An objection includes a reason and can be resolved through a recorded proposal revision, withdrawal by the objector, or cancellation of the round. A revised material proposal starts a new round rather than rewriting votes.

The primary decision view is a response matrix and timeline, not a celebratory approval animation. It makes the missing response or active objection unmistakable without shaming a member.

## Design-system research

FoundationOS will use the MIT-licensed Primer React and Primer Primitives packages as its component and token foundation. Primer is designed for compact productivity interfaces, maintains accessibility guidance per component, and separates functional tokens from raw color values ([Primer React](https://primer.style/product/getting-started/react/), [component catalog](https://primer.style/product/components/), [token naming](https://primer.style/product/primitives/token-names/)).

The product will not mimic GitHub branding. FoundationOS maps semantic product tokens—canvas, surface, border, text, accent, success, attention, danger, focus—onto tested Primer scales. No feature code may introduce arbitrary hex colors, gradients, glass effects or decorative elevation. Shadows indicate actual layering such as menus and dialogs, never importance.

The visual voice is quiet, precise and editorial:

- neutral canvas and white data surfaces;
- one restrained civic blue accent;
- status colors reserved for status;
- 4/8-pixel spacing rhythm;
- 6-pixel control radius, 8-pixel panel radius;
- dense tables and boards with generous page-level whitespace;
- native/system sans-serif for interface text and tabular numerals for finance;
- icons support labels and are not a private visual language.

## GPL reuse policy

The application is GPL-3.0-or-later. Code may be reused only when its license is GPLv3-compatible and attribution/notice obligations are preserved. Suitable references and dependencies include:

- ParcOS and OpenProject, GPL-3.0, for self-hosting, security and workflow patterns;
- ERPNext, GPL-3.0, for financial transaction patterns;
- React, Primer, dnd-kit and other permissive dependencies, with their notices retained.

AGPL products such as Taiga, Leantime and most of Vikunja are UX research only. GNU explains that GPLv3 and AGPLv3 can be combined only with the combined work governed by the AGPL terms, so their application source will not be copied into this GPL project ([GNU license compatibility](https://www.gnu.org/licenses/license-compatibility.en.html), [GNU GPL FAQ](https://www.gnu.org/licenses/gpl-faq.en.html)).

A `THIRD_PARTY_NOTICES.md` file will record each shipped dependency, license and provenance. This is an engineering policy, not legal advice.
