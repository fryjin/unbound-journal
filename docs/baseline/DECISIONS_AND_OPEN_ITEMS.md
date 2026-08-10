# Decisions and Open Items

## Frozen for P0

以下事项在 P0 期间视为冻结，不随意修改。

### Product

- Paper creation 是第一核心体验
- 首轮只做 Paper Engine
- 打开项目直接进入 Editor

### Market

Tier 1：

- English
- Japanese
- Korean

Tier 2：

- Traditional Chinese

不做：

- Simplified Chinese 产品专项体验

### Page

- P0 logical page = 1000 × 1400
- 默认竖版 5:7

### Paper

- Texture + Mask
- Multi-layer
- Paint
- Fill
- Erase
- Replace
- 一次擦除手势只擦一个 layer
- Paper 与未来 Content Stack 分层
- paperVersionId 锁定具体版本

### Asset

- Pattern / Full-sheet
- Manifest driven
- Creator source 与 runtime 分开
- Published PaperVersion immutable

### Development

- ChatGPT 前期主导
- Codex 复杂工程阶段接管

---

## Open but Non-blocking

这些事项允许继续讨论，但不阻塞 P0。

### Paper Effects

- 撕纸边
- 毛边
- 锯齿边
- 波浪边
- 特殊铺纸笔
- Texture scale UI
- Texture rotation UI
- Texture offset UI

### Content

- 照片最终对象工具栏
- 视频最大时长与大小
- 字体系统
- 手写笔刷
- DecorationElement
- Tape / Sticker

### Page

- 横版
- 正方形
- A 系列
- 自定义比例
- 双页

### Product

- App 名称
- Logo
- Brand System
- Notebook Shell
- Home
- Calendar
- Sharing

### Cloud

- Account provider
- Sync conflict strategy
- D1 schema
- R2 region/layout
- Billing

### Creator Marketplace

- Creator verification
- Revenue share
- Payout
- Pricing
- Review SLA
- Copyright policy
- AI-generated creator content policy

---

## Decision Log Rule

以后每次修改 Frozen Decision：

必须记录：

```text
Date
Decision
Reason
Impact
Migration required?
```

不能仅依赖聊天上下文。
