# P0.1 Starter Paper Pack

## Status

P0.1 introduces the first machine-readable Paper Asset Contract and a development starter pack of **40 model-generated paper styles**.

- Pattern: 24
- Full-sheet: 16
- Total: 40

## Important quality note

These are **development fixtures**, not final marketplace-quality creator assets.

The visual source board was generated with the project's model image-generation workflow and then normalized into individual runtime fixtures. The pack exists to exercise:

- pattern tiling
- full-sheet cover rendering
- paper selection
- color/style variety
- future mask compositing
- future replace-paper behavior

The same runtime contract will later accept higher-resolution official and creator-upload assets without changing the editor document model.

## Runtime location

```text
apps/web/public/papers/
├── index.json
├── _sources/
├── pattern/      # 24
└── full-sheet/   # 16
```

Every paper directory contains:

```text
manifest.json
original.webp
editor.webp
preview.webp
thumbnail.webp
```

## Validation

Run:

```bash
npm run papers:validate
```

The validator checks:

- catalog counts
- unique paperVersionId values
- locale titles
- Pattern → tile mapping
- Full-sheet → cover mapping
- all referenced runtime files

## Asset provenance

All assets in this starter pack are marked:

```json
{
  "developmentFixture": true,
  "sourceKind": "model-generated"
}
```

They must never be mistaken for creator-submitted production assets.
