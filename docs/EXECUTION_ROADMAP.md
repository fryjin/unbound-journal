# Execution Roadmap

This file and `docs/STATUS.md` are authoritative for milestone numbering. Historical baseline documents under `docs/baseline/` remain frozen references and should not be renumbered.

## P0 — Paper Engine Prototype

- P0.0 — Repository Bootstrap — COMPLETE
- P0.1 — Paper Asset Contract + Starter Pack — COMPLETE
- P0.2 — Page & Viewport — COMPLETE
- P0.3 — Paper Renderer — COMPLETE
- P0.4 — Paper Brush — COMPLETE
- P0.5 — Paper Eraser — COMPLETE
- P0.6 — Fill / Replace — COMPLETE
- P0.7 — History / Undo / Redo — COMPLETE
- P0.8 — Persistence / Autosave — COMPLETE
- P0.9 — Mobile QA / P0 Acceptance — FUNCTIONALLY ACCEPTED

P0 acceptance evidence is recorded in `docs/P0.9_ACCEPTANCE_REPORT.md`.

One low-risk coverage item remains: repeat the QA harness in standalone Android Chrome because the existing Android report came from an embedded Chromium WebView. This does not block P1 planning or P1.1 implementation.

---

# P1 — Content Stack & Product Shell

## P1.0 — Planning / Scope Freeze

Deliverables:

- freeze P1 product scope and exclusions
- freeze unified content document direction
- define content ordering / transforms / commands
- define local asset storage boundary
- define migration from P0 persistence
- define P1 implementation sequence
- define ChatGPT / Codex ownership
- define Design Engineering Review gate

No large feature implementation belongs in P1.0.

## P1.1 — Unified PageDocument + Content Stack Foundation — IMPLEMENTATION READY

Goal:

Create the data and interaction foundation required by every content type.

Must include:

- migrate P0 `PaperPageDocumentV1` to unified `PageDocument`
- ordered `elements: ContentElement[]`
- renderer-independent element base contract
- Select mode
- selected element identity
- common translation / scale / rotation transform contract
- add / remove / transform / reorder Commands
- content renderer boundary above Paper Compositor
- persistence migration with no P0 data loss
- no high-frequency pointermove React document mutation
- stable z-order rules

A development-only placeholder element is acceptable for validating selection/transform before real content types exist.

## P1.2 — Ink Engine

Goal:

Introduce the first real ContentElement using the unified foundation.

Must include:

- handwriting and drawing as distinct UI modes
- shared vector Ink Engine
- committed stroke data independent from Konva
- renderer-only active stroke buffer
- pen color / width / opacity baseline
- Ink Eraser semantics independent from Paper Eraser
- Undo / Redo
- persistence / reload
- mobile two-finger viewport gesture coexistence

P1 scope does not require advanced calligraphy simulation, brush marketplaces, or handwriting recognition.

## P1.3 — Image Element + Local Asset Storage

Goal:

Make photos a first-class scrapbook content element.

Must include:

- local image import
- document stores `assetId`, never Data URL / HTMLImageElement
- IndexedDB binary asset store
- object URL runtime hydration
- move / scale / rotate
- delete / replace
- crop mode
- correct orientation handling
- Undo / Redo for document mutations
- reload recovery

Cloud R2 remains deferred.

## P1.4 — Text Element + IME

Goal:

Support reliable global-first text entry.

Must include:

- DOM input/textarea overlay for composition
- final Canvas/Konva rendering
- English
- Japanese IME
- Korean IME
- Traditional Chinese IME
- add / edit / move / scale / rotate / delete
- baseline typography controls
- Undo / Redo
- reload recovery

Do not implement rich-text-per-range editing in P1 unless a later product decision explicitly adds it.

## P1.5 — Multi-page Journal Document

Goal:

Move from one persistent page to a journal containing multiple pages.

Must include:

- `JournalDocument`
- ordered page references
- create / duplicate / delete / reorder page
- active page state separate from persisted artwork state
- page-level persistence and migration
- lightweight page thumbnail strategy
- no cloud sync yet

## P1.6 — Product Shell + Mobile Editor Ergonomics

Goal:

Replace the development-oriented editor shell with a coherent mobile creation product shell.

Must include:

- mobile-first tool navigation
- bottom-sheet / drawer patterns where appropriate
- paper / image / text / ink entry points
- page navigation
- clear selection state
- safe area handling
- keyboard / IME viewport behavior
- no tutorial dependency for the core creation loop
- maintain desktop QA usability

This milestone is where Design Engineering Review becomes a formal gate.

## P1.7 — Design Engineering Review + Mobile QA / P1 Acceptance

Gate:

- GitHub Actions green
- Desktop Chrome
- iPhone Safari
- standalone Android Chrome
- local persistence migration from P0
- multi-page reload
- image binary asset reload
- Japanese / Korean / Traditional Chinese IME
- content transforms after zoom/pan
- two-finger gesture isolation
- representative stress scene
- novice-user creation flow

P1 must not be declared accepted solely from code-side tests.

---

# Deferred beyond P1

Unless explicitly pulled forward:

- VideoElement playback/editing
- Cloudflare Workers
- D1
- R2 remote asset storage
- accounts / authentication
- cloud sync
- creator center
- marketplace
- entitlements / payments
- collaboration
- final production paper catalog
