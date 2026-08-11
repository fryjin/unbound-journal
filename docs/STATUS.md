# Project Status

## Current

- Repository: `fryjin/unbound-journal`
- Milestone: `P1.2 — Ink Engine`
- State: implementation ready for upload / CI / deployed device QA
- Driver: ChatGPT
- Complex engineering handoff: Codex when trigger conditions are met
- Static preview: `https://unbound-journal.pages.dev/`

## P0

P0 Paper Engine is functionally accepted.

Completed:

- P0.0 Repository Bootstrap
- P0.1 Paper Asset Contract + Starter Pack
- P0.2 Page & Viewport
- P0.3 Paper Renderer
- P0.4 Paper Brush
- P0.5 Paper Eraser
- P0.6 Fill / Replace
- P0.7 History / Undo / Redo
- P0.8 Persistence / Autosave
- P0.9 Mobile QA / P0 Acceptance

Evidence: `docs/P0.9_ACCEPTANCE_REPORT.md`.

## P1.0

P1 planning / scope freeze: COMPLETE.

Authoritative planning:

- `docs/P1.0_CONTENT_STACK_PRODUCT_SHELL_PLAN.md`
- `docs/P1_CONTENT_MODEL_SPEC.md`
- `docs/EXECUTION_ROADMAP.md`

## P1.1

**P1.1 Unified PageDocument + Content Stack Foundation: ACCEPTED.**

Confirmed before P1.2 began:

- GitHub Actions `Current validation`: PASS
- PageDocument V2 / P0 migration: PASS
- Content Add / Select / Drag / Reorder: PASS
- one drag = one History operation: PASS
- Paper + Content coexistence: PASS
- IndexedDB save/reload: PASS
- mobile second-finger cancellation: PASS
- requested Desktop / iPhone / Android P1.1 device flow: user-confirmed PASS

Evidence: `docs/P1.1_ACCEPTANCE_REPORT.md`.

## P1.2 implementation

Implemented in the current patch:

- real `InkElement` added to the renderer-independent ContentElement union
- new `@unbound-journal/ink-engine` package
- one completed Ink gesture = one InkElement
- local vector paths relative to the shared ElementTransform origin
- input densification for bounded eraser precision
- Handwriting and Drawing as distinct UI modes using the same engine
- Pen / Marker, color, width, opacity controls
- dedicated Ink Erase mode, independent from Paper Eraser semantics
- partial vector erasing across multiple InkElements
- erased strokes preserve disjoint `paths[]` under the same element id/z-order
- incremental renderer-only eraser preview to avoid recomputing the complete gesture on every move
- renderer-only active drawing preview
- second-finger cancellation integrated with the existing PageViewport gesture router
- generic reversible Content replacement command used for one-gesture Ink erase History
- Select-mode hit testing/drag compatibility for committed Ink
- IndexedDB persistence through the existing PageDocument V2 contract
- P1.2 QA Ink counts, vector erase automatic check, and `+20 ink strokes` stress fixture
- localized Ink controls for English / Japanese / Korean / Traditional Chinese
- `qa:current` extended with P1.2 contract validation

## Validation completed locally

- editor-core / paper-engine / document-model / ink-engine strict TypeScript: PASS
- all repository TS/TSX syntax parse: PASS
- Paper Pack / P0 / P1.1 / P1.2 static contract validators: PASS
- compiled Ink runtime partial-erase assertion: PASS
- full npm workspace install/typecheck/Vite build: authoritative gate remains GitHub Actions after upload

## Cloudflare

- Pages static deployment: ACTIVE
- Workers: deferred
- D1: deferred
- R2: deferred
- accounts / cloud sync: deferred

No backend Cloudflare service is required for P1.2.

## Design engineering

`emilkowalski/skills` remains approved as a later Design Engineering Review reference, primarily from P1.6 onward. P1.2 prioritizes functional ink feel and gesture correctness over final visual polish.

## Next gate

After this patch is uploaded:

1. verify actual GitHub `main`
2. require GitHub Actions `Current validation` green
3. allow Cloudflare Pages auto-deploy
4. run `/?qa=1` P1.2 Desktop / iPhone / standalone Android Chrome Ink QA
5. close blocker defects
6. mark P1.2 accepted
7. enter `P1.3 — Image Element + Local Asset Storage`
