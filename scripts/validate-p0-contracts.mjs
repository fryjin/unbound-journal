import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const requiredFiles = [
  'packages/editor-core/src/history.ts',
  'packages/paper-engine/src/commands.ts',
  'packages/paper-engine/src/document.ts',
  'packages/storage/src/indexeddb.ts',
  'packages/storage/src/autosave.ts',
  'apps/web/src/editor/qa/P0QaPanel.tsx',
  'apps/web/src/editor/qa/p0-qa.ts',
  'docs/P0.9_MOBILE_QA_PLAN.md',
  'docs/P0.9_ACCEPTANCE_REPORT.md',
];

const requiredLocaleKeys = [
  'historyLayerStatus',
  'undo',
  'redo',
  'persistenceLoading',
  'persistenceReady',
  'persistenceRestored',
  'persistenceSaved',
  'persistenceError',
];

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
}

for (const relativePath of requiredFiles) {
  await fs.access(path.join(root, relativePath));
}

for (const locale of ['en', 'ja-JP', 'ko-KR', 'zh-Hant']) {
  const resource = await readJson(`apps/web/src/i18n/locales/${locale}.json`);
  for (const key of requiredLocaleKeys) {
    if (typeof resource?.editor?.[key] !== 'string' || resource.editor[key].length === 0) {
      throw new Error(`Missing editor.${key} in ${locale}`);
    }
  }
}

const editorShell = await fs.readFile(path.join(root, 'apps/web/src/editor/EditorShell.tsx'), 'utf8');
for (const marker of [
  'createCommandHistory',
  'createDebouncedAutosave',
  'decodePageDocument',
  'liftPaperCommand',
  'P0QaPanel',
  'data-qa="undo"',
  'data-qa="redo"',
]) {
  if (!editorShell.includes(marker)) throw new Error(`EditorShell missing P0 contract marker: ${marker}`);
}

const status = await fs.readFile(path.join(root, 'docs/STATUS.md'), 'utf8');
if (!status.includes('P0.9')) throw new Error('STATUS.md does not reference P0.9');
if (!status.includes('P1.')) throw new Error('STATUS.md does not preserve the post-P0 execution state');

console.log('P0 contract validation passed: core files, locales, persistence/history wiring, QA harness.');
