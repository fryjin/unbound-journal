# Paper Asset Spec v1

## 1. 目标

Paper Asset Spec v1 同时服务于：

1. P0 开发阶段的模型生成测试纸张
2. 后续官方纸张
3. 未来 Creator Center 创作者上传
4. Marketplace Runtime Asset

原则：

> Creators submit source assets; platform produces runtime assets.

---

## 2. Asset / Product / Version 分离

### CreatorAsset
创作者提交的源资产。

### PaperTemplate
一款纸张的长期身份。

### PaperVersion
某次不可变发布版本。

### Product
一个可销售商品，可包含一个或多个 PaperTemplate。

### Listing
地区、渠道与价格信息。

### Entitlement
用户对商品/资产的使用权。

---

## 3. Paper Types

### Pattern Paper

用于：

- 格纹
- 点阵
- 小碎花
- 条纹
- 重复图形
- 纤维
- 布纹

推荐 Source：

```text
2048 × 2048 px
```

最低：

```text
1024 × 1024 px
```

要求：

- 正方形
- 优先无缝
- sRGB

Runtime：

```text
renderMode = tile
```

### Full-sheet Paper

用于：

- 完整插画
- 报纸
- 大型水彩
- 复古版式
- 大面积材质
- 完整背景构图

推荐 Source：

```text
3000 × 4200 px
```

最低：

```text
2000 × 2800 px
```

P0 页面比例：

```text
5:7
```

Runtime：

```text
renderMode = cover
```

---

## 4. Supported Formats v1

支持 Source：

- PNG
- JPEG/JPG
- WebP

颜色空间：

- sRGB

暂不作为正式 Paper Runtime Source：

- PSD
- PSB
- AI
- Procreate project
- Canva project
- SVG

源工程可以后续作为 Archive，但不作为客户端运行格式。

---

## 5. Development Paper Pack

P0 开发纸张由模型图像生成能力制作。

首轮建议：

- Pattern Paper：24
- Full-sheet Paper：16
- 合计：40

要求尽可能覆盖不同：

### Color families

- Neutral
- Cream
- Kraft
- Grey
- Blue
- Green
- Pink
- Yellow
- Purple
- Orange
- Vintage Brown
- Deep Red
- Dark Green

### Pattern families

- Grid
- Dot
- Stripe
- Floral
- Geometric
- Handwritten texture
- Newspaper
- Watercolor
- Fabric
- Fiber
- Distressed
- Collage
- Minimal solid texture
- Illustration

这些纸张必须按正式 Runtime Manifest 组织，不允许只是散图。

---

## 6. Runtime Variants

平台最终自动生成：

### Pattern example

```text
source master
runtime/original
runtime/editor
runtime/preview
runtime/thumbnail
```

### Full-sheet example

```text
source master
runtime/original
runtime/editor-2x
runtime/editor-1x
runtime/preview
runtime/thumbnail
```

创作者不需要手工制作多个尺寸。

---

## 7. Runtime Manifest

示例：

```json
{
  "schemaVersion": 1,
  "paperTemplateId": "paper_blue_grid",
  "paperVersionId": "paper_blue_grid_v1",
  "type": "pattern",
  "renderMode": "tile",
  "sourceLocale": "en",
  "title": {
    "en": "Blue Grid",
    "ja-JP": "ブルーグリッド",
    "ko-KR": "블루 그리드",
    "zh-Hant": "藍色格紋"
  },
  "variants": {
    "original": "./original.webp",
    "editor": "./editor.webp",
    "preview": "./preview.webp",
    "thumbnail": "./thumbnail.webp"
  },
  "texture": {
    "defaultScale": 1,
    "rotation": 0,
    "offsetX": 0,
    "offsetY": 0
  },
  "tags": ["grid", "blue", "journal", "pattern"]
}
```

Runtime Manifest 只描述渲染必要信息。

价格、销量、商品折扣等 Marketplace 数据不得进入 Runtime Manifest。

---

## 8. Version Rule

页面必须保存：

```text
paperVersionId
```

而不是仅保存：

```text
paperTemplateId
```

已发布版本不可修改。

任何视觉变化必须创建新 PaperVersion。

---

## 9. Creator Delivery Flow

未来 Creator Center：

```text
创建资产
↓
选择 Pattern / Full-sheet
↓
上传 Source Master
↓
自动 Preflight
↓
自动 Runtime Build
↓
Journal Preview
↓
填写 Metadata
↓
提交审核
↓
审核通过
↓
生成 Immutable PaperVersion
↓
发布
```

---

## 10. Preflight

自动检查：

- 可读取性
- 分辨率
- 长宽比
- 文件大小
- 色彩空间
- Alpha
- 图片损坏
- Metadata 异常
- 重复文件 Hash

Pattern additionally：

- Left ↔ Right seam
- Top ↔ Bottom seam
- 3×3 tile preview

---

## 11. Lifecycle

建议状态：

```text
draft
uploading
processing
needs_fix
ready
submitted
in_review
approved
published
rejected
unlisted
archived
revoked
```

### Unlisted
商城不可见，但已拥有用户继续使用。

### Archived
停止维护，但历史作品正常。

### Revoked
仅用于严重侵权、法律或安全问题。

---

## 12. Local Development Packaging

P0 fixture 目录示例：

```text
fixtures/
└── papers/
    ├── blue-grid/
    │   ├── manifest.json
    │   ├── editor.webp
    │   ├── preview.webp
    │   └── thumbnail.webp
    └── ...
```

Paper Engine 必须只通过 Manifest 读取资产。

禁止组件硬编码图片路径数组。
