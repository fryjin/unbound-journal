# Unbound Journal

Global-first, mobile-first digital journal creation project.

## P0

Current milestone: **P0.7 — History / Undo / Redo**.

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
- IndexedDB in later P0 steps
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


## P0.7 history / undo / redo

P0.7 makes the Paper Engine editing loop reversible:

- every completed Brush / Erase gesture becomes one history command
- Fill and Replace are reversible commands
- PaperLayer creation is undone as a complete layer operation
- Clear is reversible for development QA
- history stores pure PaperLayer document state, never Canvas/Konva/image snapshots
- runtime assets stay in a separate cache keyed by immutable `paperVersionId`
- Undo/Redo buttons are available on mobile; desktop QA also supports standard keyboard shortcuts
- a new edit after Undo invalidates the Redo branch

Cloudflare remains intentionally undeployed at this milestone; the current Paper Engine does not require remote infrastructure yet.
