# P0 Acceptance Checklist

## A. Basic Page

- [ ] 打开项目直接进入 Editor
- [ ] 页面逻辑尺寸为 1000×1400
- [ ] 移动端默认 Fit Page
- [ ] 页面渲染清晰，无明显 DPR 模糊

## B. Paper Assets

- [ ] Paper Engine 通过 Manifest 加载
- [ ] 没有硬编码图片数组
- [ ] 支持 Pattern
- [ ] 支持 Full-sheet
- [ ] paperVersionId 进入 PageDocument

## C. Paper Brush

- [ ] 可选择纸张
- [ ] 选择本身不创建空 Layer
- [ ] 第一次铺纸创建 Layer
- [ ] 单指连续铺纸顺畅
- [ ] 纸张图案不会随着 brush stamp 出现接缝错位
- [ ] Pattern 固定于页面/纹理坐标系

## D. Multi-layer

- [ ] 同页至少支持 5 个 Paper Layer
- [ ] 更换纸张后可创建上层
- [ ] 下层仍保持完整

## E. Fill Page

- [ ] 当前 Paper 可整页铺满
- [ ] Fill Page 可 Undo
- [ ] Fill Page 可 Redo

## F. Eraser

- [ ] 自动识别触点位置最上层可见纸
- [ ] pointerDown 锁定目标层
- [ ] 同一次手势不会继续擦下一层
- [ ] 抬手再次擦除时可重新识别下层
- [ ] 下层纸正确露出

## G. Replace

- [ ] 可替换某 PaperLayer 的 paperVersionId
- [ ] Mask 不变化
- [ ] 当前形状不变化

## H. Zoom / Pan

- [ ] 双指缩放
- [ ] 双指移动
- [ ] 双指操作不会误产生 Paper Stroke
- [ ] Zoom 后绘制坐标准确
- [ ] Pan 后绘制坐标准确

## I. History

- [ ] Paint Undo/Redo
- [ ] Erase Undo/Redo
- [ ] Fill Undo/Redo
- [ ] Replace Undo/Redo
- [ ] 连续 5 次 Undo / 5 次 Redo 状态正确

## J. Persistence

- [ ] pointermove 不直接写数据库
- [ ] pointerUp / command commit 后自动保存
- [ ] 刷新恢复
- [ ] 关闭页面后重新进入恢复
- [ ] 数据损坏/读取失败不导致页面白屏

## K. i18n

Tier 1：

- [ ] English
- [ ] 日本語
- [ ] 한국어

Tier 2：

- [ ] 繁體中文基础语言包

- [ ] UI 无硬编码产品文案
- [ ] 三个 Tier 1 Locale 工具栏不溢出
- [ ] Bottom Sheet 不出现明显布局问题

## L. Performance

至少测试：

- [ ] 5 Paper Layers
- [ ] 每层大量 Stroke
- [ ] Zoom / Pan 仍可使用
- [ ] 连续铺纸无明显掉帧
- [ ] 无持续性内存暴涨

## M. Browser Matrix

- [ ] iPhone Safari
- [ ] Android Chrome
- [ ] Desktop Chrome

## N. Final User Test

一个未看教程的用户能够：

- [ ] 选 3 种纸
- [ ] 铺出不同区域
- [ ] 叠加
- [ ] 擦掉上层露出下层
- [ ] Undo
- [ ] Redo
- [ ] Zoom
- [ ] Pan
- [ ] 刷新后继续看到作品
