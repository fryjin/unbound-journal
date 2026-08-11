import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const requiredFiles = [
  'packages/editor-core/src/content.ts',
  'packages/document-model/package.json',
  'packages/document-model/src/document.ts',
  'packages/document-model/src/commands.ts',
  'packages/editor-renderer-konva/src/ContentStack.tsx',
  'apps/web/src/editor/EditorShell.tsx',
  'apps/web/src/editor/qa/p0-qa.ts',
  'docs/P1.0_CONTENT_STACK_PRODUCT_SHELL_PLAN.md',
  'docs/P1_CONTENT_MODEL_SPEC.md',
  'docs/P1.1_UNIFIED_DOCUMENT_CONTENT_STACK_SPEC.md',
  'docs/P1.1_RELEASE_NOTES.md',
];

for (const relativePath of requiredFiles) {
  await fs.access(path.join(root, relativePath));
}

const documentModel = await fs.readFile(path.join(root, 'packages/document-model/src/document.ts'), 'utf8');
for (const marker of [
  'PAGE_DOCUMENT_SCHEMA_VERSION = 2',
  'paperLayers: PaperLayer[]',
  'elements: ContentElement[]',
  "migratedFrom: 'paper-page-v1'",
  'decodePaperPageDocument',
]) {
  if (!documentModel.includes(marker)) throw new Error(`PageDocument missing marker: ${marker}`);
}

const commands = await fs.readFile(path.join(root, 'packages/document-model/src/commands.ts'), 'utf8');
for (const marker of [
  'liftPaperCommand',
  'createAddContentElementCommand',
  'createRemoveContentElementCommand',
  'createTransformContentElementCommand',
  'createReorderContentElementCommand',
]) {
  if (!commands.includes(marker)) throw new Error(`P1 commands missing marker: ${marker}`);
}

const content = await fs.readFile(path.join(root, 'packages/editor-core/src/content.ts'), 'utf8');
for (const marker of [
  'interface ElementTransform',
  "type: 'placeholder'",
  'findTopContentElementAtPoint',
  'pagePointToElementLocalPoint',
]) {
  if (!content.includes(marker)) throw new Error(`Content foundation missing marker: ${marker}`);
}

const editor = await fs.readFile(path.join(root, 'apps/web/src/editor/EditorShell.tsx'), 'utf8');
for (const marker of [
  'CommandHistory<PageDocument>',
  'decodePageDocument',
  'liftPaperCommand',
  'ContentStack',
  'findTopContentElementAtPoint',
  'createTransformContentElementCommand',
  "decoded.migratedFrom === 'paper-page-v1'",
]) {
  if (!editor.includes(marker)) throw new Error(`EditorShell missing P1.1 marker: ${marker}`);
}

const qa = await fs.readFile(path.join(root, 'apps/web/src/editor/qa/p0-qa.ts'), 'utf8');
for (const marker of [
  'Unified PageDocument round-trip',
  'P0 → P1 document migration',
  'schemaVersion',
  'elementCount',
]) {
  if (!qa.includes(marker)) throw new Error(`QA harness missing P1.1 marker: ${marker}`);
}

const packageJson = JSON.parse(await fs.readFile(path.join(root, 'apps/web/package.json'), 'utf8'));
if (packageJson.dependencies?.['@unbound-journal/document-model'] !== '0.0.0') {
  throw new Error('Web app is missing @unbound-journal/document-model workspace dependency');
}

for (const locale of ['en', 'ja-JP', 'ko-KR', 'zh-Hant']) {
  const resource = JSON.parse(await fs.readFile(path.join(root, `apps/web/src/i18n/locales/${locale}.json`), 'utf8'));
  for (const key of ['historyDocumentStatus', 'selectHint']) {
    if (typeof resource?.editor?.[key] !== 'string' || resource.editor[key].length === 0) {
      throw new Error(`Missing editor.${key} in ${locale}`);
    }
  }
}

console.log('P1.1 foundation contract validation passed: unified document, migration, commands, Content Stack, QA wiring.');
