import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const requiredFiles = [
  'packages/editor-core/src/content.ts',
  'packages/ink-engine/package.json',
  'packages/ink-engine/src/model.ts',
  'packages/ink-engine/src/erase.ts',
  'packages/editor-renderer-konva/src/InkStrokePreview.tsx',
  'packages/editor-renderer-konva/src/InkEraserPreview.tsx',
  'packages/editor-renderer-konva/src/ContentStack.tsx',
  'apps/web/src/editor/EditorShell.tsx',
  'apps/web/src/editor/qa/p0-qa.ts',
  'apps/web/src/editor/qa/P0QaPanel.tsx',
  'docs/P1.2_INK_ENGINE_SPEC.md',
  'docs/P1.2_ACCEPTANCE_PLAN.md',
  'docs/P1.2_RELEASE_NOTES.md',
];

for (const relativePath of requiredFiles) {
  await fs.access(path.join(root, relativePath));
}

const content = await fs.readFile(path.join(root, 'packages/editor-core/src/content.ts'), 'utf8');
for (const marker of [
  "ContentElementBase<'ink'>",
  "type InkMode = 'handwriting' | 'drawing'",
  'paths: InkPath[]',
  'style: InkStyle',
  "case 'ink'",
  'elementLocalPointToPagePoint',
]) {
  if (!content.includes(marker)) throw new Error(`Ink content contract missing marker: ${marker}`);
}

const model = await fs.readFile(path.join(root, 'packages/ink-engine/src/model.ts'), 'utf8');
for (const marker of ['createInkElement', 'densifyInkPoints', 'DEFAULT_INK_SAMPLE_SPACING']) {
  if (!model.includes(marker)) throw new Error(`Ink model missing marker: ${marker}`);
}

const erase = await fs.readFile(path.join(root, 'packages/ink-engine/src/erase.ts'), 'utf8');
for (const marker of ['eraseInkElement', 'eraseInkElements', 'distancePointToPolyline']) {
  if (!erase.includes(marker)) throw new Error(`Ink erase engine missing marker: ${marker}`);
}

const renderer = await fs.readFile(path.join(root, 'packages/editor-renderer-konva/src/ContentStack.tsx'), 'utf8');
for (const marker of ['previewInkElements', 'restoreInkPreview', "element.type === 'placeholder'", '<Shape']) {
  if (!renderer.includes(marker)) throw new Error(`Ink renderer missing marker: ${marker}`);
}

const editor = await fs.readFile(path.join(root, 'apps/web/src/editor/EditorShell.tsx'), 'utf8');
for (const marker of [
  "'handwriting' | 'drawing' | 'ink-erase'",
  'InkStrokePreview',
  'InkEraserPreview',
  'createInkElement',
  'eraseInkElements',
  "'ink.erase'",
  'onSeedInkStress',
]) {
  if (!editor.includes(marker)) throw new Error(`EditorShell missing P1.2 marker: ${marker}`);
}

const qa = await fs.readFile(path.join(root, 'apps/web/src/editor/qa/p0-qa.ts'), 'utf8');
for (const marker of ['Ink vector erase geometry', 'inkElementCount', 'inkPathCount']) {
  if (!qa.includes(marker)) throw new Error(`P1.2 QA harness missing marker: ${marker}`);
}

const webPackage = JSON.parse(await fs.readFile(path.join(root, 'apps/web/package.json'), 'utf8'));
if (webPackage.dependencies?.['@unbound-journal/ink-engine'] !== '0.0.0') {
  throw new Error('Web app is missing @unbound-journal/ink-engine workspace dependency');
}

for (const locale of ['en', 'ja-JP', 'ko-KR', 'zh-Hant']) {
  const resource = JSON.parse(await fs.readFile(path.join(root, `apps/web/src/i18n/locales/${locale}.json`), 'utf8'));
  for (const key of [
    'inkPanelLabel',
    'inkModeHandwriting',
    'inkModeDrawing',
    'inkModeErase',
    'inkToolPen',
    'inkToolMarker',
    'inkColor',
    'inkSize',
    'inkOpacity',
    'inkEraserSize',
    'handwritingHint',
    'drawingHint',
    'inkEraserHint',
  ]) {
    if (typeof resource?.editor?.[key] !== 'string' || resource.editor[key].length === 0) {
      throw new Error(`Missing editor.${key} in ${locale}`);
    }
  }
}

console.log('P1.2 ink contract validation passed: vector model, shared engine, partial eraser, renderer previews, gestures, locales, QA wiring.');
