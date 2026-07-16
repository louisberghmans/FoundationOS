# Interface and design-system specification

## Design principles

1. **Trust before delight.** Exact actors, amounts, states and evidence are always visible near consequential actions.
2. **Quiet structure.** Hierarchy comes from spacing, type, borders and grouping—not ornamental gradients or piles of shadows.
3. **Progress with provenance.** Every progress claim links to its definition, period and evidence state.
4. **One action, every input method.** Pointer, keyboard and assistive-technology paths invoke the same server command.
5. **Dense when scanning, spacious when deciding.** Tables and boards optimize comparison; detail and decision pages create focus.

## Foundation

Primer React and Primer Primitives provide accessible components, focus behavior and tested scales. FoundationOS owns a thin semantic theme so the interface is recognizably FoundationOS rather than a GitHub imitation.

### Semantic color tokens

Feature code uses semantic tokens only:

```text
--fos-canvas
--fos-surface
--fos-surface-subtle
--fos-border
--fos-border-strong
--fos-text
--fos-text-muted
--fos-accent
--fos-accent-emphasis
--fos-success
--fos-attention
--fos-danger
--fos-focus
```

Status treatments combine token color with text and icon. Raw hex values are confined to the theme definition and verified in light and dark themes. Color contrast targets WCAG AA: 4.5:1 for normal text and 3:1 for large text, UI boundaries and focus indicators.

### Type and numbers

- Interface: system UI sans-serif stack.
- Reading measure: at most 72 characters for long explanations.
- Page title: 24/32, semibold; section: 18/28, semibold; body: 14/20; metadata: 12/16.
- Money, percentages, dates in comparison columns use tabular numerals.
- Currency codes appear when context can contain more than one currency.

### Space, shape and elevation

- Base unit: 4 px; standard gaps: 8, 12, 16, 24, 32.
- Control minimum height: 32 px; primary form controls: 36–40 px.
- Radius: 6 px controls, 8 px panels, full radius only for small status labels.
- Shadows are limited to overlays, dialogs and a dragged card.
- Page surfaces use borders; card grids do not float in decorative elevation.

## Application shell

Desktop navigation groups work by mental model:

```text
Overview
Strategy
Opportunities
Grants
Decisions
Meetings
Finance
Documents
Administration
```

Items are hidden only when the user has no read capability. The current foundation and environment appear in the shell; the account menu shows role presets and session controls. On narrow screens, navigation becomes a labeled drawer and board users can switch to the accessible table view.

## Page anatomy

Every route uses:

1. breadcrumb when nested;
2. title, concise state and primary action;
3. optional tabs for stable sub-resources;
4. filter/action bar that remains consistent between board and table;
5. content surface;
6. contextual detail panel or full detail route.

Primary actions are verbs with objects: “Open decision round,” “Record payment,” “Invite member.” Avoid generic “Submit” outside small forms.

## Board specification

- Column headers contain stage label, item count, WIP limit, total requested amount, policy link and overflow actions.
- Cards show organization/opportunity title, requested amount, objective, steward, age and at most two blocking signals.
- The whole card title opens details. A separate labeled drag handle avoids accidental dragging.
- Card action menu includes Open, Assign steward, Move to stage, and permitted dispositions.
- Drag hover shows valid destinations; invalid destinations are not drop targets.
- Drop opens a transition confirmation only when policy requires additional data or consequence acknowledgement.
- The live region announces pickup, destination, success and rejection.
- A detail side panel supports quick review; consequential editing uses a full page.
- Compact/comfortable density, swimlane, filters and grouping are preferences, never persisted business rules.

## Goal achievement specification

The default visualization is a horizontal progress bar because the common axis makes part-to-whole comparison easier than a collection of decorative radial gauges. It includes exact values and these rows:

```text
Outcome label                         Status: On track
Baseline 18%        Current 31%        Target 45% by Dec 2028
[-----------|==============|........................]
Observed +13 pp      Remaining 14 pp   Last evidence: 12 Jun 2026
Expected portfolio contribution: 4–7 pp (not yet verified)
```

Unknown baseline, stale evidence and incompatible aggregation produce an explicit message instead of a fabricated zero. Trends show period observations on a shared-axis line chart with a data table alternative.

## Decision specification

The decision page places the frozen packet summary and response matrix above discussion:

| Member | Eligibility | Response | Recorded | Note |
| --- | --- | --- | --- | --- |
| … | Eligible/Recused | Pending/Support/Neutral/Object | timestamp | objection or recusal context |

The status banner says exactly why a round is pending, blocked, accepted, superseded or cancelled. Responding uses three equally legible choices; Object is not hidden as a destructive secondary action. Confirmation repeats the proposal version and amount. Changing a response is allowed only by policy and always retains history.

## Finance specification

- Ledger-like tables are the primary finance surface.
- Columns align currency amounts right and keep original/base values adjacent.
- Totals remain visible when filtering and state what the total includes.
- Posted, scheduled, draft, reversed and refunded are textual statuses.
- Record pages show source decision, agreement, schedule, bank/reference metadata and audit timeline.
- Destructive-looking corrections are labeled “Reverse transaction” and explain the resulting entries.
- Charts support portfolio scanning but never replace transaction tables.

## Forms and setup

The first-run setup wizard is a resumable sequence:

1. secure administrator;
2. foundation identity;
3. region, time zone and language;
4. base currency and fiscal year;
5. governance/decision policy;
6. role assignments and invitations;
7. first fund and budget;
8. first objective;
9. document and public-portal settings;
10. review and lock setup.

Each step explains why information is needed, validates inline after interaction, and allows back navigation without losing entered data. Security-critical steps are never silently defaulted.

## Accessibility acceptance criteria

- Full setup, opportunity transition, decision response and payment recording work by keyboard.
- Dragging has action-menu and keyboard alternatives.
- Focus is visible and not obscured by sticky regions or dialogs.
- Targets meet at least 24 by 24 CSS pixels with adequate spacing.
- Status never relies on color alone.
- Dialog focus is trapped, titled and restored to its invoker.
- Dynamic results use polite live regions; blocking errors receive focus.
- At 200% zoom and 320 CSS-pixel width, content reflows without two-dimensional scrolling except true data tables/boards, which have an equivalent linear view.
- Automated axe checks and manual keyboard/screen-reader checks are release gates.
