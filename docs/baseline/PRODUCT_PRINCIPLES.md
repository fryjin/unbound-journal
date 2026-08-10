# Product Principles

## 1. Global-first

产品不从中国大陆用户习惯作为默认出发点，但不排斥中国互联网产品中对全球用户同样有效的优秀实践。

判断标准：

> 是否适合目标市场用户、是否降低学习成本、是否提高移动端创作效率。

可吸收：

- 高效率移动端交互
- Bottom Sheet
- 即时反馈
- 快速切换与试用
- 低输入成本
- 清晰商业化路径

不默认采用：

- 中国手机号中心化
- 中国支付方式优先
- 强任务/打卡体系
- 重运营首页
- 红点轰炸
- 高频弹窗
- 强制登录
- 复杂会员层级

## 2. Locale Priority

Tier 1：

- English
- 日本語
- 한국어

Tier 2：

- 繁體中文

Out of current scope：

- 简体中文地区专项体验

英文为 Source Locale。

## 3. Mobile-first, Native-ready

第一阶段为 Mobile Web / PWA。

所有作品数据必须独立于：

- 浏览器尺寸
- CSS px
- Konva 内部 JSON
- 单一 Web Renderer

未来原生端只替换 Renderer 与客户端壳，不推翻作品数据模型。

## 4. Paper creation before diary recording

用户首先在“做手账”，然后才“写手账”。

典型创作流程：

选纸 → 铺纸 → 叠纸 → 擦纸 → 形成底页 → 加照片/视频 → 输入/手写文字 → 涂鸦。

## 5. Paper is material, not background

Paper 不是单一 Background Image。

Paper 是：

`Texture + Mask + Version`

同一页允许多张 Paper Layer。

## 6. Local-first editing

编辑中的操作优先在本地完成。

网络不可用时，不应影响用户继续创作。

云同步后置。

## 7. Renderer-independent document

PageDocument 是产品数据。

Konva 只是 Web Renderer。

禁止把 Konva JSON 作为长期作品格式。

## 8. Creator-ready from day one

创作者中心虽然后置，但资产架构从 P0 就兼容未来 Creator Pipeline。

创作者提交：

> Source Asset

平台生成：

> Runtime Asset

## 9. Published versions are immutable

任何已经发布并被用户作品引用的 PaperVersion 不允许原地覆盖。

更新必须产生新版本。

## 10. Ease before feature count

首轮不追求功能多。

优先：

- 手感自然
- 状态清楚
- 不误操作
- 不丢数据
- 不需要教程

## 11. In-house generated development assets

开发阶段所需纸张优先由模型图像生成能力制作。

要求覆盖尽可能多的：

- 颜色
- 图案
- 纸张材质
- Pattern / Full-sheet 类型

这些资产按正式 Paper Asset Contract 打包，而不是作为临时散图硬编码。
