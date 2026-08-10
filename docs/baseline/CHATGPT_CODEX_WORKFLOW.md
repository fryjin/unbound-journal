# ChatGPT + Codex Development Workflow

## 1. 核心原则

项目不是“ChatGPT只写需求，Codex负责所有代码”。

采用：

> **前期 ChatGPT 主导，复杂工程阶段 Codex 接管。**

原因：

- 产品方向需要频繁收敛
- 早期代码规模较小
- 快速试错比工程重型流程更重要
- 过早把所有内容切给 Codex 会增加上下文与交接成本

---

## 2. ChatGPT 的职责

ChatGPT 是首轮开发的：

- 产品负责人
- 交互设计负责人
- 技术架构负责人
- 初期实现者
- Codex Task Writer
- Code Review / 验收者

优先直接完成：

### Product

- 产品规则
- Interaction Spec
- State Machine
- Edge Cases
- Scope Control

### Architecture

- PageDocument
- Asset Contract
- Module Boundary
- i18n
- Repository Structure

### Early Development

- 项目骨架
- 类型定义
- fixture
- 轻量 UI
- 简单组件
- 初版 Renderer
- 初版 Paper Brush

### QA

- Acceptance Criteria
- Bug classification
- Regression checklist

---

## 3. Codex 的职责

Codex 是复杂工程执行者。

优先处理：

### Complex Code

- 跨多个 package 的实现
- 深层 refactor
- Command History
- IndexedDB
- cache
- gesture router
- browser compatibility

### Performance

- Canvas 性能
- Raster Mask Cache
- Memory
- pointer throughput
- Safari compatibility

### Testing

- Unit tests
- Integration tests
- regression tests
- CI
- lint/typecheck fixes

---

## 4. Handoff Triggers

满足任一条件，优先交 Codex：

1. 预计修改超过 5–8 个相互关联文件
2. 需要跨 package 重构
3. 涉及高频 Pointer / Canvas 性能
4. 涉及 IndexedDB / migration / recovery
5. 需要大量自动化测试
6. 需要反复运行并定位浏览器兼容 Bug
7. 需要系统性 Codebase Review

不满足这些条件时，ChatGPT 优先直接完成。

---

## 5. 标准开发循环

```text
User
↓
ChatGPT 收敛需求
↓
ChatGPT 更新 Spec
↓
ChatGPT 先实现轻量版本
↓
验证方向
↓
复杂部分形成 Codex Task
↓
Codex 实现
↓
ChatGPT Review
↓
真机/用户验收
↓
更新 CHANGELOG / HANDOFF
```

---

## 6. Codex Task 必须包含

每个任务必须写清楚：

### Context
当前版本和已完成能力。

### Goal
本任务唯一目标。

### Scope
必须做什么。

### Out of Scope
明确禁止做什么。

### Architecture Constraints
不可破坏的边界。

### Files / Modules
预计影响区域。

### Acceptance Criteria
可验证结果。

### Tests
最低测试要求。

### Handoff Notes
完成后必须报告：

- 修改内容
- 风险
- 未解决问题
- 测试结果

---

## 7. GitHub 规则

建议：

- `main`：稳定可运行
- feature branch：复杂 Codex 工作
- 小型 ChatGPT 修改可以集中后再提交
- 每个 milestone 更新 CHANGELOG

不要让对话记录成为唯一项目状态。

必须在仓库保留：

- Product Principles
- Architecture
- Current Spec
- Changelog
- Known Issues
- Handoff

---

## 8. ChatGPT ↔ Codex 的边界

### ChatGPT 不应过早交出去的内容

- 产品命名
- 交互规则
- 信息架构
- 数据 Schema 初稿
- 小范围组件
- UI微调
- 轻量逻辑
- 测试标准

### Codex 更适合的内容

- 长时间调试
- 大规模实现
- 重构
- 性能剖析
- 测试覆盖
- 多文件联动
- 浏览器兼容

---

## 9. 决策权

任何为了工程方便而改变以下事项，都需要先回到 ChatGPT / 产品侧确认：

- Paper 擦除规则
- Layer model
- Document model
- Asset version contract
- Locale priority
- P0 scope
- Creator asset contract

Codex 不自行重新设计这些产品规则。
