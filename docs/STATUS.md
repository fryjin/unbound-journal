# Project Status

## Current

- Project codename / repository name: `unbound-journal`
- Milestone: `P0.2 — Page & Viewport`
- Driver: ChatGPT
- Complex engineering handoff: Codex when trigger conditions are met

## Completed in P0.0

- Monorepo/workspace skeleton
- React + TypeScript + Vite web app configuration
- Tier-1/Tier-2 i18n resource foundation
- Mobile editor shell placeholder
- Logical page constant: 1000 × 1400
- Package boundaries for editor-core / paper-engine / renderer / storage / shared / ui
- Baseline project documents copied into repository
- Git initialized with `main`

## Completed in P0.1

- Versioned `PaperRuntimeManifest` TypeScript contract
- Paper pack index contract and runtime loader
- Runtime manifest type guard
- `paperVersionId` as the immutable work reference
- 40-paper model-generated development starter pack
  - 24 Pattern / tile fixtures
  - 16 Full-sheet / cover fixtures
- Per-paper runtime variants: original / editor / preview / thumbnail
- English / Japanese / Korean / Traditional Chinese localized paper titles
- Node-only `npm run papers:validate` pack validation
- Editor Shell verifies `/papers/index.json` can be consumed at runtime
- Model-generated source board retained for provenance

## Completed in P0.2

- Real `react-konva` Stage replaces the static page placeholder
- Renderer-independent viewport math in `editor-core`
- 1000 × 1400 logical page rendered through a transform Group
- Responsive Fit calculation with page padding
- Page ↔ screen coordinate conversion helpers
- Pinch zoom from Fit to 4×
- Simultaneous two-finger pan + pinch zoom
- Pan boundary clamping and auto-centering on smaller axes
- ResizeObserver handling with zoom-ratio preservation
- Public `PageViewportHandle` for future Paper Brush coordinate mapping
- Desktop wheel zoom for QA
- Fit-to-page control and localized viewport guidance
- DPR information surfaced for Retina QA; Konva owns backing-canvas pixel ratio

## Starter pack quality boundary

The P0.1 assets are development fixtures generated from the model image-generation workflow. They intentionally validate asset diversity and runtime contracts; they are not final marketplace-quality creator assets.

Future official or creator assets will enter through the same PaperRuntimeManifest contract with higher-quality source masters.

## Environment limitation

The original generation environment could not resolve all public npm packages through its configured registry. P0.2 therefore must still be built/typechecked once in a normal npm environment before being considered deployment-ready.

The dependency-free paper-pack validator remains available through:

```bash
npm run papers:validate
```

## Next

`P0.3 — Paper Renderer`

1. Resolve PaperRuntimeManifest assets
2. Render `tile` Pattern papers in stable page texture coordinates
3. Render `cover` Full-sheet papers
4. Introduce PaperLayer visual stacking without brush masks yet
5. Validate editor-resolution assets and clipping to page bounds
