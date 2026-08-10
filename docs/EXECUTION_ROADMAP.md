# P0 Execution Roadmap

`docs/baseline/P0_DEVELOPMENT_SPEC.md` records the original planning sequence and is retained as historical baseline. During implementation, early paper-model work was folded into adjacent milestones, so the actual executed numbering after P0.2 differs by one step.

For all ongoing development, **`docs/STATUS.md` and this file are authoritative for milestone numbering.**

## Executed sequence

- P0.0 — Repository Bootstrap
- P0.1 — Paper Asset Contract + Starter Pack
- P0.2 — Page & Viewport
- P0.3 — Paper Renderer
- P0.4 — Paper Brush
- P0.5 — Paper Eraser
- P0.6 — Fill / Replace
- P0.7 — History / Undo / Redo
- P0.8 — Persistence / Autosave
- P0.9 — Mobile QA / P0 Acceptance — **in progress: QA harness ready, CI/device acceptance pending**

Do not renumber completed work to match the original baseline document. The baseline remains useful for product decisions; the execution roadmap controls implementation handoff and status reporting.


## P0 completion gate

P0.9 is not closed by code generation alone. Final P0 acceptance requires a green normal-environment build plus Desktop Chrome, iPhone Safari, Android Chrome, persistence recovery, five-layer stress, and novice-user checks documented in `docs/P0.9_ACCEPTANCE_REPORT.md`.
