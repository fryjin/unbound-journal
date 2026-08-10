# Unbound Journal

Global-first, mobile-first digital journal creation project.

## P0

Current milestone: **P0.1 — Paper Asset Contract + Starter Paper Pack**.

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
