# Unbound Journal

Global-first, mobile-first digital journal creation project.

## P0

Current milestone: **P0.9 — Mobile QA / P0 Acceptance**. P0.9 QA tooling is ready; final acceptance remains pending CI and physical-device verification.

The first product milestone is **P0 — Paper Engine Prototype**: validate painting, layering, filling, replacing, and erasing digital paper on a mobile journal page.

## Product locale priority

Tier 1:
- English (`en`)
- Japanese (`ja-JP`)
- Korean (`ko-KR`)

Tier 2:
- Traditional Chinese (`zh-Hant`)

Simplified Chinese is not currently a product locale.

## Development model

- ChatGPT leads product definition, architecture, early implementation, lightweight code, and acceptance.
- Codex takes over complex multi-module implementation, performance work, persistence, browser compatibility, and large refactors.
- GitHub is the source of truth for code and project documents.

## Tech baseline

- React
- TypeScript
- Vite
- Konva / react-konva
- i18next / react-i18next
- Native IndexedDB local persistence / autosave
- Cloudflare Workers + D1 + R2 in later cloud phases

## Local setup

```bash
npm install
npm run dev
```

> The bootstrap package was generated in an environment whose npm mirror could not resolve public packages, so dependency installation is intentionally left to the normal development environment.

## Repository layout

```text
apps/web
packages/editor-core
packages/paper-engine
packages/editor-renderer-konva
packages/storage
packages/shared
packages/ui
docs/baseline
apps/web/public/papers
```

See `docs/baseline/` for frozen P0 project decisions.

## P0.1 paper fixtures

The repository includes 40 model-generated development paper fixtures (24 Pattern / 16 Full-sheet) under `apps/web/public/papers/`. Validate them with:

```bash
npm run papers:validate
```

These assets are development fixtures, not final marketplace-quality creator assets.

## P0.2 page viewport

P0.2 replaces the static page placeholder with the real Konva viewport foundation:

- 1000 × 1400 logical page
- fit-to-viewport transform
- renderer-independent page ↔ screen coordinate math
- pinch zoom from Fit to 4×
- simultaneous two-finger zoom + pan
- bounded panning
- ResizeObserver-based responsive viewport
- Konva DPR/Retina canvas rendering
- wheel zoom for desktop QA

The viewport deliberately keeps page navigation separate from paper editing.

## P0.3 paper renderer

P0.3 connects the Paper Runtime Contract to the Konva page:

- Pattern papers render as stable repeated textures (`tile`)
- Full-sheet papers render with aspect-preserving cover behavior (`cover`)
- manifest-relative runtime asset URLs are resolved before rendering
- ordered `PaperStack` establishes the future multi-layer compositor boundary
- a development-only selector can preview all 40 fixtures

The preview selector is a QA tool, not the final paper-application interaction. P0.4 introduces actual Paper Brush masks.

## P0.4 paper brush

P0.4 turns paper rendering into the first real creation interaction:

- selecting a paper does not alter the document
- a PaperLayer is created only when the first stroke is committed
- paper visibility is driven by vector `PaperMaskStroke` data
- active strokes use a renderer-only mutable preview instead of writing document state on every move
- Pattern / Full-sheet textures stay fixed in page coordinates while the mask grows
- two-finger viewport gestures cancel and suppress single-finger painting
- switching paper creates a new top layer only on the next stroke

The committed renderer uses an isolated per-layer raster cache, preparing P0.5 erasing without allowing one layer's compositing operation to affect lower layers.


## P0.5 paper eraser

P0.5 adds layer-safe paper erasing:

- the eraser chooses the top visible PaperLayer only when a gesture starts
- the entire continuous gesture stays locked to that one PaperLayer
- erasing through the target layer reveals lower paper without continuing into it
- lifting and starting a new gesture performs a fresh top-visible hit test
- active erasing mutates only the target layer's isolated renderer cache
- gesture end commits one vector `operation: "erase"` PaperMaskStroke
- adding a second finger cancels the uncommitted erase preview and restores the committed mask

Undo/Redo remains intentionally deferred to the dedicated History milestone.


## P0.6 fill / replace

P0.6 closes the first paper-material editing loop:

- Fill applies the selected paper across the logical page using the same vector mask model as Paper Brush
- same-paper Fill appends to the existing top PaperLayer; another paper creates a new top layer only when Fill is invoked
- Replace top changes the material of the current top PaperLayer while preserving its exact mask history and layer identity
- replacement uses the new paper asset's default texture transform
- Fill / Replace remain separate from Erase mode and are structured for the upcoming unified Command History

A formal PaperLayer manager is intentionally deferred; the P0.6 UI targets the top layer while the underlying replacement helper supports any PaperLayer.


## P0.7 history

P0.7 adds renderer-independent Command History with reversible Paint / Erase / Fill / AddLayer / Replace / Clear operations, mobile Undo / Redo controls, and desktop QA shortcuts. History stores document operations rather than Canvas snapshots.

## P0.8 persistence

P0.8 persists versioned `PaperPageDocumentV1` data to native IndexedDB with debounced serialized autosave. Reload restores PaperLayers and rehydrates their pinned `paperVersionId` runtime assets. Session Undo / Redo stacks are intentionally not persisted.

## P0.9 QA / acceptance

P0.9 adds a query-gated device QA harness. Open a built preview with:

```text
/?qa=1
```

The harness performs browser IndexedDB and document round-trip checks, reports viewport/DPR/touch/runtime hydration state, can seed five real full-page PaperLayers, and produces a copyable QA report. Normal editor URLs do not render this QA UI.

The repository also includes a `P0 validation` GitHub Actions workflow. After dependencies are installed in a normal environment, the full gate is:

```bash
npm run qa:p0
```

P0 is accepted only after the build is green and Desktop Chrome, iPhone Safari, Android Chrome, reload/recovery, five-layer stress, and the novice-user flow pass. See `docs/P0.9_MOBILE_QA_PLAN.md` and `docs/P0.9_ACCEPTANCE_REPORT.md`.

For physical-device P0.9 QA, a static HTTPS preview is now required. Cloudflare Pages is sufficient; Workers, D1, R2, accounts, and cloud sync remain out of scope.
