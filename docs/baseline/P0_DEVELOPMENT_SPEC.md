# P0 Development Spec — Paper Engine Prototype

## 1. Goal

验证：

> 数字铺纸、多层叠纸、擦纸露底的移动端体验是否成立。

---

## 2. Scope

P0 必须完成：

- Mobile-first Editor
- 1000 × 1400 logical page
- Base Paper
- Paper Runtime Manifest loader
- 40 张开发 Paper Pack 的接入能力
- Paper Selector
- Paper Brush
- Multi Paper Layers
- Fill Page
- Paper Eraser
- Top Visible Layer Detection
- Single Gesture Layer Lock
- Replace Texture while preserving Mask
- Undo
- Redo
- Zoom
- Pan
- IndexedDB
- Reload Recovery
- i18n foundation

---

## 3. Out of Scope

P0 不做：

- 首页
- 登录
- 注册
- 用户体系
- Cloud sync
- Workers API
- D1
- R2
- 商城
- 支付
- Creator Center UI
- 照片
- 视频
- 正式文字编辑
- 手写
- 涂鸦
- 多手账本
- 社区
- 分享
- AI 用户功能

打开项目后直接进入 Editor。

---

## 4. Interaction Rules

### Select Paper

选纸本身不创建新 Layer。

第一次铺纸或 Fill Page 时创建。

### Paint Paper

单指：

```text
Paper Mask += Stroke
```

纸张应为完整不透明覆盖，P0 不做 Flow / Pressure / Opacity Brush。

### Fill Page

```text
Mask = Full Page
```

### Paper Eraser

擦除当前触点最上层可见 Paper。

一次连续 pointer gesture：

> 只锁定并处理一个 PaperLayer。

即使该层被擦穿，也不继续擦下一层。

下一次 pointerDown 才重新检测目标层。

### Replace Paper

保留：

- Mask
- Texture transform

仅替换：

- paperVersionId / texture source

---

## 5. Brush Visual

P0 Paper Brush：

- Round
- Adjustable size
- Hard edge
- Anti-aliased
- 100% coverage

P0 Paper Eraser：

- Round
- Adjustable size
- Hard edge

---

## 6. Viewport

Default：

- Fit Page

Zoom：

- Min = Fit Page
- Max = 4x

Two finger：

- Pinch = Zoom
- Two-finger drag = Pan

双指操作不能产生 Paper Stroke。

---

## 7. Persistence

P0 使用 IndexedDB。

保存时机：

```text
pointerUp
→ command commit
→ debounced persistence
```

刷新页面与重新打开浏览器后，PageDocument 必须恢复。

---

## 8. i18n

Tier 1：

- en
- ja-JP
- ko-KR

Tier 2：

- zh-Hant

不创建产品 `zh-CN` locale。

英文作为 Source Locale。

禁止 UI 硬编码文字。

---

## 9. Performance Red Lines

### Never

在每个 `pointermove`：

```text
setState(PageDocument)
```

### Use

```text
Active mutable buffer
→ immediate renderer
→ pointerUp
→ commit document change
```

### Never

每个 `pointermove` 写 IndexedDB。

### Never

把 Konva JSON 当 PageDocument。

---

## 10. Development Milestones

### P0.0 Repository Bootstrap

优先由 ChatGPT 完成：

- React
- TypeScript
- Vite
- package 结构
- lint
- formatting
- base i18n
- startup docs

### P0.1 Asset Contract

优先由 ChatGPT 完成：

- Paper Asset Spec v1
- Runtime Manifest Type/Schema
- fixture loader
- development paper pack structure

### P0.2 Page & Viewport

ChatGPT 主导，必要时 Codex协助：

- logical page
- fit
- zoom
- pan
- coordinate conversion

### P0.3 Paper Model

ChatGPT 主导：

- PageDocument
- PaperLayer
- PaperMaskStroke
- paperVersionId
- serialization

### P0.4 Paper Renderer

ChatGPT 先完成最小实现。

如出现：

- 多层 mask compositing
- raster cache
- DPR 性能问题

转 Codex 深化。

### P0.5 Paper Brush

ChatGPT 先完成基础交互。

出现高频性能、Pointer Event 或多指竞争问题时交 Codex。

### P0.6 Paper Eraser

建议进入 Codex 主导阶段：

- top visible detection
- target layer lock
- erase compositing
- edge cases

### P0.7 Fill / Replace

ChatGPT 可优先完成。

### P0.8 History

Codex 主导：

- Command architecture
- Undo / Redo
- transaction boundary
- state integrity

### P0.9 Persistence

Codex 主导：

- IndexedDB
- schema version
- failure recovery
- migration-ready design

### P0.10 Mobile QA

Codex 主导修复。

ChatGPT负责：

- QA矩阵
- 问题判断
- 产品验收
- 回归标准

重点：

- iPhone Safari
- Android Chrome
- Desktop Chrome

---

## 11. P0 Definition of Done

> A first-time user can create a clearly layered, collage-like journal page on a phone using at least three different paper styles through painting, layering and erasing, without instructions, and the result remains intact after reload.
