# Project Status

## Current

- Project codename / repository name: `unbound-journal`
- Milestone: `P0.1 — Paper Asset Contract + Starter Paper Pack`
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
- Editor Shell now verifies `/papers/index.json` can be consumed at runtime
- Model-generated source board retained for provenance

## Starter pack quality boundary

The P0.1 assets are development fixtures generated from the model image-generation workflow. They intentionally validate asset diversity and runtime contracts; they are not final marketplace-quality creator assets.

Future official or creator assets will enter through the same PaperRuntimeManifest contract with higher-quality source masters.

## Environment limitation

The current generation environment still cannot resolve all public npm packages through its configured internal registry (`prettier` returns registry 404). Therefore full `npm install`, Vite build, and TypeScript build verification remain pending in a normal development environment.

The dependency-free paper-pack validator **does pass**.

## Next

`P0.2 — Page & Viewport`

1. Implement real Konva Stage / logical 1000 × 1400 page
2. Fit-to-viewport calculation
3. Coordinate transforms
4. Pinch zoom
5. Two-finger pan
6. Prevent browser gesture conflicts without blocking intentional editor gestures
