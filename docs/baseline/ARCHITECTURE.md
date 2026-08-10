# Architecture

## 1. 技术路线

### Web Client

- React
- TypeScript
- Vite
- Konva / react-konva

### Local Storage

P0：

- IndexedDB

### Future Cloud

- Cloudflare Workers
- Cloudflare D1
- Cloudflare R2

### Source Control

- GitHub

---

## 2. 编辑器总体结构

```text
Page
│
├── Paper Compositor
│   ├── Base Paper
│   ├── Paper Layer 1
│   ├── Paper Layer 2
│   └── ...
│
├── Content Stack
│   ├── ImageElement
│   ├── VideoElement
│   ├── TextElement
│   ├── InkElement
│   └── Future Elements
│
└── Interaction Layer
    ├── Selection
    ├── Transformer
    ├── Gesture Router
    ├── Guides
    ├── Zoom
    └── Pan
```

---

## 3. Logical Coordinate System

P0 默认页面：

```text
1000 × 1400
```

所有作品数据均使用 Page Logical Coordinates。

禁止存储设备 CSS px 作为作品真实坐标。

---

## 4. PageDocument

```ts
interface PageDocument {
  schemaVersion: 1;
  id: string;

  size: {
    width: number;
    height: number;
  };

  basePaper: BasePaper;
  paperLayers: PaperLayer[];
  elements: ContentElement[];

  createdAt: string;
  updatedAt: string;
}
```

P0 中：

```ts
elements = []
```

字段仍保留。

---

## 5. PaperLayer

```ts
interface PaperLayer {
  id: string;
  paperVersionId: string;

  texture: {
    scale: number;
    rotation: number;
    offsetX: number;
    offsetY: number;
  };

  maskStrokes: PaperMaskStroke[];

  createdAt: string;
}
```

---

## 6. PaperMaskStroke

```ts
interface PaperMaskStroke {
  id: string;

  operation:
    | "paint"
    | "erase";

  points: Point[];
  size: number;
}
```

逻辑层保留 Vector Stroke。

Renderer 可生成 Raster Mask Cache 以提高性能。

---

## 7. Paper Rendering Model

Paper 不作为矩形图片对象使用。

正式模型：

```text
Paper Texture
+
Mask
=
Visible Paper Region
```

Pattern：

```text
renderMode = tile
```

Full-sheet：

```text
renderMode = cover
```

---

## 8. Editor Mode

```ts
type EditorMode =
  | "select"
  | "paper"
  | "paper-erase"
  | "text-input"
  | "handwriting"
  | "drawing"
  | "ink-erase"
  | "crop";
```

P0 仅实现必要模式：

- `paper`
- `paper-erase`
- viewport gesture state

---

## 9. Gesture Architecture

```text
Pointer Event
↓
Gesture Router
↓
Current Mode
↓
Tool Handler
↓
Renderer
```

### Single finger

由 Mode 决定：

- Paper → 铺纸
- Paper Erase → 擦纸
- Future Drawing → 绘画
- Future Select → 对象操作

### Two fingers

统一：

- Pinch → Zoom
- Two-finger drag → Pan

禁止每个功能组件独立抢占 touch 事件。

---

## 10. High-frequency Input Rule

禁止：

```text
pointermove
→ React setState(PageDocument)
→ 全树重渲染
```

应采用：

```text
pointermove
↓
Mutable Active Stroke Buffer
↓
Renderer
↓
pointerUp
↓
Commit Command
↓
Document State
```

---

## 11. History

最终统一进入 Command History。

P0 最少支持：

- Add Paper Layer
- Add Paper Mask Stroke
- Erase Paper Mask
- Fill Paper
- Replace Paper

未来：

- Add Element
- Remove Element
- Transform Element
- Update Text
- Add Ink Stroke

---

## 12. Persistence

```text
Editor Operation
↓
Memory
↓
Command Commit
↓
Debounced Save
↓
IndexedDB
```

禁止每个 `pointermove` 写 IndexedDB。

---

## 13. Content Stack Future Contract

### Text

DOM input / textarea 负责 IME。

Canvas 负责最终显示。

必须正确支持：

- English
- Japanese IME
- Korean IME
- Traditional Chinese IME

### Ink

Handwriting 与 Drawing UI 分离，底层共享 Ink Engine。

### Image

ImageElement 只保存布局与 assetId。

### Video

编辑态显示 Poster；播放时使用 DOM `<video>` overlay。

---

## 14. Recommended Repository Structure

```text
journal/

apps/
└── web/
    ├── src/
    │   ├── app/
    │   ├── editor/
    │   ├── screens/
    │   ├── i18n/
    │   └── main.tsx
    └── public/

packages/
├── editor-core/
│   ├── document/
│   ├── modes/
│   ├── commands/
│   ├── history/
│   ├── geometry/
│   └── gestures/
│
├── paper-engine/
│   ├── model/
│   ├── mask/
│   ├── brushes/
│   ├── compositor/
│   └── cache/
│
├── editor-renderer-konva/
├── storage/
│   └── indexeddb/
├── shared/
└── ui/
```

避免出现超大型单文件 `Editor.tsx`。
