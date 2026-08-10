# Project Status

## Current

- Project codename / repository name: `unbound-journal`
- Milestone: `P0.7 — History / Undo / Redo`
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

## Completed in P0.3

- Manifest-relative runtime asset URL resolution
- Pattern / `tile` paper renderer using stable logical-page texture coordinates
- Full-sheet / `cover` renderer with preserved aspect ratio
- Ordered `PaperStack` renderer boundary for bottom → top paper layers
- Image loading state and failure reporting
- All Paper pixels remain inside the P0.2 logical-page clip
- Development-only renderer selector for all 40 Starter Paper Pack assets
- Localized paper preview names for Tier-1 and Tier-2 locales
- Renderer keeps texture rendering independent from future Paper Mask implementation

## Completed in P0.4

- Single-finger Paper Brush input mapped through logical page coordinates
- Paper selection is non-destructive and does not create empty layers
- First completed stroke creates a PaperLayer only when needed
- Same selected top paper receives additional mask strokes
- Switching paper creates a new top layer on the next stroke
- Vector PaperMaskStroke remains the document source of truth
- Isolated per-layer Texture + Mask raster cache
- Mutable renderer-only active stroke preview
- Two-finger gesture cancels active paint and suppresses accidental restart
- Adjustable hard round brush (60–360 logical units)
- Desktop mouse painting for development QA

## Completed in P0.5

- Renderer-independent hard-mask point visibility queries
- Top-visible PaperLayer hit detection at erase gesture start
- One erase gesture locks exactly one PaperLayer
- Real-time erase preview mutates only the target layer raster cache
- Lower PaperLayers are revealed but never modified by the same continuous erase gesture
- New gesture performs a fresh top-visible hit test
- Vector erase strokes append to the locked layer on gesture end
- Erase cancellation restores the target from committed mask history
- Second-finger transition cancels uncommitted erasing before viewport zoom/pan
- Separate Lay / Erase Paper tool modes
- Adjustable hard round eraser (60–360 logical units)
- Tier-1 + Tier-2 localized Paper Eraser UI

## Completed in P0.6

- Renderer-independent `createFillPageStroke()` using the existing vector paint-mask contract
- Fill Page reuses the same top PaperLayer when its paper matches the selected paper
- Fill Page creates a new top layer only when the selected paper differs
- Full-page masks remain compatible with erasing and top-visible hit testing
- `replacePaperLayerFromAsset()` preserves layer identity and complete mask history
- Replace changes `paperVersionId`, renderer asset and texture defaults without changing layer order or count
- P0.6 UI replaces only the top PaperLayer; a formal layer manager remains out of scope
- Fill / Replace cancel uncommitted input previews and are disabled in Erase mode
- Tier-1 + Tier-2 localized Fill / Replace controls


## Completed in P0.7

- Generic renderer-independent Command History in `editor-core`
- 100-operation default Undo history depth
- Standard Redo branch invalidation after new edits
- Reversible Paper commands for Paint / Erase / Fill / AddLayer / Replace / Clear
- One completed gesture equals one History entry
- Pure `PaperLayer[]` document state separated from runtime `PaperRuntimeAsset` cache
- Undo / Redo cancel active uncommitted renderer previews before transition
- Mobile HUD Undo / Redo controls
- Desktop `Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`, and Windows `Ctrl+Y` QA shortcuts
- Tier-1 + Tier-2 localized History controls

## Deployment status

- Cloudflare deployment: **not started / not required yet**
- Current P0 Paper Engine remains local-first
- Explicitly notify the user before introducing Cloudflare Workers / D1 / R2 or public remote deployment

## Starter pack quality boundary

The P0.1 assets are development fixtures generated from the model image-generation workflow. They intentionally validate asset diversity and runtime contracts; they are not final marketplace-quality creator assets.

Future official or creator assets will enter through the same PaperRuntimeManifest contract with higher-quality source masters.

## Environment limitation

The original generation environment could not resolve all public npm packages through its configured registry. P0.7 therefore must still be built/typechecked once in a normal npm environment before being considered deployment-ready.

The dependency-free paper-pack validator remains available through:

```bash
npm run papers:validate
```

## Next

`P0.8 — Persistence / Autosave`

1. Persist the current renderer-independent paper document locally in IndexedDB
2. Debounce autosave after committed History actions, not pointer movement
3. Restore the latest local document after reload/crash
4. Introduce schema versioning/migration boundary without cloud sync yet
5. Keep Cloudflare deployment deferred until remote infrastructure is actually required
