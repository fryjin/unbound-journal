# Unbound Journal

Global-first, mobile-first digital journal creation project.

## P0

Current milestone: **P0.4 — Paper Brush**.

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
