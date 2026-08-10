import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(process.cwd(), 'apps/web/public/papers');
const indexPath = path.join(root, 'index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const locales = ['en', 'ja-JP', 'ko-KR', 'zh-Hant'];
const errors = [];
const versionIds = new Set();

if (index.schemaVersion !== 1) errors.push('index.schemaVersion must be 1');
if (index.papers.length !== index.counts.total) errors.push('index counts.total mismatch');

for (const entry of index.papers) {
  const rel = entry.manifest.replace(/^\/papers\//, '');
  const manifestPath = path.join(root, rel);
  if (!fs.existsSync(manifestPath)) {
    errors.push(`missing manifest: ${entry.manifest}`);
    continue;
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.schemaVersion !== 1) errors.push(`${entry.paperVersionId}: schemaVersion`);
  if (versionIds.has(manifest.paperVersionId)) errors.push(`duplicate version id: ${manifest.paperVersionId}`);
  versionIds.add(manifest.paperVersionId);
  if (manifest.type === 'pattern' && manifest.renderMode !== 'tile') errors.push(`${manifest.paperVersionId}: pattern must tile`);
  if (manifest.type === 'full-sheet' && manifest.renderMode !== 'cover') errors.push(`${manifest.paperVersionId}: full-sheet must cover`);
  for (const locale of locales) {
    if (!manifest.title?.[locale]) errors.push(`${manifest.paperVersionId}: missing title ${locale}`);
  }
  for (const [variant, relPath] of Object.entries(manifest.variants ?? {})) {
    const filePath = path.resolve(path.dirname(manifestPath), relPath);
    if (!fs.existsSync(filePath)) errors.push(`${manifest.paperVersionId}: missing ${variant} ${relPath}`);
  }
}

if (errors.length) {
  console.error(`Paper pack validation failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Paper pack valid: ${index.papers.length} papers (${index.counts.pattern} pattern / ${index.counts['full-sheet']} full-sheet)`);
