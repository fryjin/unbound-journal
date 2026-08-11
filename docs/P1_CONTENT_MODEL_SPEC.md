# P1 Content Model Spec

Status: **P1.0 frozen design target**

This document defines the P1 data direction. P1.1 may refine exact TypeScript names, but must preserve the boundaries and semantics below unless a documented architecture decision changes them.

## 1. PageDocument

P1 replaces the paper-only persistence envelope with a unified renderer-independent page document.

Recommended target:

```ts
interface PageDocumentV2 {
  schemaVersion: 2;
  id: string;
  size: {
    width: number;
    height: number;
  };
  paperLayers: PaperLayer[];
  elements: ContentElement[];
  createdAt: string;
  updatedAt: string;
}
```

P1.1 must provide a deterministic migration from the existing P0 persisted document.

## 2. ContentElement

```ts
type ContentElement =
  | InkElement
  | ImageElement
  | TextElement;
```

Video is intentionally excluded from P1.

## 3. Common element base

Recommended baseline:

```ts
interface ContentElementBase {
  id: string;
  type: string;
  transform: ElementTransform;
  createdAt: string;
  updatedAt: string;
}

interface ElementTransform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}
```

Do not store screen/CSS coordinates.

## 4. Z-order

`elements[]` is ordered bottom → top.

Rules:

- Paper Compositor is always below Content Stack.
- The final item in `elements[]` is the topmost content element.
- hit testing resolves top → bottom.
- Bring Forward / Send Backward operations mutate array order through Commands.
- no duplicate persisted `zIndex` in P1.

## 5. InkElement

P1.2 should use vector source data.

A practical baseline is one committed continuous stroke per InkElement:

```ts
interface InkElement extends ContentElementBase {
  type: 'ink';
  points: InkPoint[];
  style: InkStyle;
}

interface InkPoint {
  x: number;
  y: number;
  pressure?: number;
}

interface InkStyle {
  color: string;
  size: number;
  opacity: number;
  tool: 'pen' | 'marker' | 'brush';
}
```

If partial erasing proves awkward, P1.2 may introduce renderer-independent erase-mask data or stroke splitting, but it must not store raster Canvas state as canonical data.

## 6. ImageElement

```ts
interface ImageElement extends ContentElementBase {
  type: 'image';
  assetId: string;
  width: number;
  height: number;
  crop?: ImageCrop;
}

interface ImageCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

`assetId` resolves through local asset storage.

## 7. Local binary asset record

Recommended:

```ts
interface LocalAssetRecord {
  id: string;
  kind: 'image';
  mimeType: string;
  blob: Blob;
  width: number;
  height: number;
  createdAt: string;
}
```

Storage schema may add fields for orientation/source metadata.

The PageDocument must not embed Blob/Base64/image objects.

## 8. TextElement

Recommended baseline:

```ts
interface TextElement extends ContentElementBase {
  type: 'text';
  text: string;
  width: number;
  style: TextStyle;
}

interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: 'left' | 'center' | 'right';
  lineHeight: number;
}
```

DOM editing state is runtime-only.

## 9. Selection state

Selection is editor UI state, not canonical artwork.

Example:

```ts
interface EditorSelectionState {
  elementId: string | null;
}
```

Do not persist selection as part of PageDocument.

## 10. Viewport state

Zoom and pan remain separate editor/session state.

Do not store device-specific viewport state inside PageDocument.

## 11. Commands

P1.1 generic content commands:

- AddElement
- RemoveElement
- TransformElement
- ReorderElement

Later:

- UpdateText
- AddInk
- EraseInk
- ReplaceImage
- UpdateCrop

Every command operates on renderer-independent document state.

## 12. High-frequency transform rule

During drag/scale/rotate:

```text
pointermove
→ mutable interaction buffer / renderer
```

At gesture completion:

```text
pointerup
→ one TransformElement command
→ PageDocument
→ autosave
```

Do not set the full persisted PageDocument on every pointermove.

## 13. Runtime asset caches

Runtime caches must be reconstructable from persisted IDs.

Examples:

- `paperVersionId → PaperRuntimeAsset`
- `assetId → object URL / decoded image`

Caches are never canonical data.

## 14. JournalDocument

P1.5 adds a journal-level document:

```ts
interface JournalDocumentV1 {
  schemaVersion: 1;
  id: string;
  title: string;
  pageIds: string[];
  createdAt: string;
  updatedAt: string;
}
```

Pages should remain separate stored records so one stroke does not rewrite every page.

## 15. Migration rule

P0 → P1 migration must be:

- deterministic
- idempotent where practical
- version-aware
- tested against real P0 paper documents
- failure-safe

Unknown future schema versions must never be silently coerced.

## 16. Renderer independence

Forbidden canonical persistence:

- Konva JSON
- Konva node IDs as product identity
- Canvas bitmap caches
- DOM nodes
- HTMLImageElement
- object URLs
- CSS pixel coordinates

The Web renderer may cache any of these at runtime as long as the cache is disposable.

---

## P1.1 implementation note

P1.1 implements the concrete unified document in `@unbound-journal/document-model` to keep dependency direction acyclic:

- `editor-core` owns generic ContentElement / transform / geometry primitives
- `paper-engine` owns PaperLayer and legacy P0 paper decoding
- `document-model` combines both into PageDocument V2 and generic page commands

The P1.1 `placeholder` ContentElement discriminator is a development-only fixture. It validates the common Content Stack before the union expands with real Ink/Image/Text types.
