# Project Status

## Current

- Repository: `fryjin/unbound-journal`
- Milestone: `P1.1 — Unified PageDocument + Content Stack Foundation`
- State: implementation ready for upload / CI / deployed QA
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

Evidence is recorded in `docs/P0.9_ACCEPTANCE_REPORT.md`.

The prior Android report used an embedded Chromium WebView (`wv`). Standalone Android Chrome remains a low-risk browser-label coverage item and must be included no later than P1 final acceptance.

## P1.0

P1.0 planning / scope freeze is complete locally and included in the P1.1 patch because the P1.0-only planning patch was not uploaded to GitHub before P1.1 began.

Authoritative planning:

- `docs/P1.0_CONTENT_STACK_PRODUCT_SHELL_PLAN.md`
- `docs/P1_CONTENT_MODEL_SPEC.md`
- `docs/EXECUTION_ROADMAP.md`

## P1.1 implementation

Implemented in the current patch:

- new `@unbound-journal/document-model` package
- `PageDocumentV2` containing `paperLayers[]` + `elements[]`
- strict V2 decode plus deterministic P0 V1 migration
- existing P0 IndexedDB key retained; migrated document autosaves back as V2
- editor History state upgraded from `PaperLayer[]` to complete `PageDocument`
- accepted Paper Commands lifted into unified document history without rewriting Paper Engine
- renderer-independent `ContentElement` / `ElementTransform` foundation
- renderer-independent rotated/scaled placeholder hit testing
- generic Add / Remove / Transform / Reorder content commands
- `ContentStack` rendered above all Paper rendering
- imperative renderer-only content drag preview; commit only at pointer end
- explicit QA Select mode and selected-element session state
- second-finger cancellation path shared with existing viewport gesture router
- P1.1 QA harness extensions for V2 round-trip, P0 migration, content fixtures and ordering
- current-milestone CI command (`qa:current`)

## P1.1 validation completed locally

- core/document/storage strict TypeScript: PASS
- ContentStack structural TypeScript: PASS
- EditorShell + QA structural TypeScript: PASS
- P1.1 runtime model assertions: PASS
- Paper Pack validation: PASS
- full npm workspace install/build: delegated to GitHub Actions because local public npm install timed out

## Cloudflare

- Pages static deployment: ACTIVE
- Workers: deferred
- D1: deferred
- R2: deferred
- accounts / cloud sync: deferred

No backend Cloudflare service is required for P1.1.

## Design engineering

`emilkowalski/skills` is approved as a later Design Engineering Review reference, primarily from P1.6 onward. It does not override frozen interaction/data rules.

## Next gate

After this patch is uploaded:

1. verify actual GitHub `main`
2. require GitHub Actions `Current validation` green
3. allow Cloudflare Pages auto-deploy
4. run `/?qa=1` P1.1 acceptance flow
5. close blocker regressions
6. enter `P1.2 — Ink Engine`
