export const PAPER_ASSET_SCHEMA_VERSION = 1 as const;

export type PaperAssetLocale = 'en' | 'ja-JP' | 'ko-KR' | 'zh-Hant';
export type PaperType = 'pattern' | 'full-sheet';
export type PaperRenderMode = 'tile' | 'cover';
export type PaperSourceKind = 'model-generated' | 'creator-upload' | 'official';

export type LocalizedPaperText = Readonly<Record<PaperAssetLocale, string>>;

export interface PaperAssetVariants {
  original: string;
  editor: string;
  preview: string;
  thumbnail: string;
}

export interface PaperTextureDefaults {
  defaultScale: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
}

export interface PaperRuntimeManifest {
  schemaVersion: typeof PAPER_ASSET_SCHEMA_VERSION;
  paperTemplateId: string;
  paperVersionId: string;
  type: PaperType;
  renderMode: PaperRenderMode;
  developmentFixture?: boolean;
  sourceKind: PaperSourceKind;
  sourceLocale: PaperAssetLocale;
  title: LocalizedPaperText;
  variants: PaperAssetVariants;
  texture: PaperTextureDefaults;
  tags: string[];
  colorFamily?: string;
  styleFamily?: string;
}

export interface PaperCatalogEntry {
  manifest: string;
  paperTemplateId: string;
  paperVersionId: string;
  type: PaperType;
  renderMode: PaperRenderMode;
  title: LocalizedPaperText;
  colorFamily?: string;
  styleFamily?: string;
}

export interface PaperPackIndex {
  schemaVersion: typeof PAPER_ASSET_SCHEMA_VERSION;
  packId: string;
  generatedAt: string;
  sourceKind: PaperSourceKind;
  developmentFixture?: boolean;
  counts: {
    pattern: number;
    'full-sheet': number;
    total: number;
  };
  papers: PaperCatalogEntry[];
}

const SUPPORTED_LOCALES: PaperAssetLocale[] = ['en', 'ja-JP', 'ko-KR', 'zh-Hant'];

export function isPaperRuntimeManifest(value: unknown): value is PaperRuntimeManifest {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PaperRuntimeManifest>;

  if (candidate.schemaVersion !== PAPER_ASSET_SCHEMA_VERSION) return false;
  if (typeof candidate.paperTemplateId !== 'string' || candidate.paperTemplateId.length === 0) return false;
  if (typeof candidate.paperVersionId !== 'string' || candidate.paperVersionId.length === 0) return false;
  if (candidate.type !== 'pattern' && candidate.type !== 'full-sheet') return false;
  if (candidate.renderMode !== 'tile' && candidate.renderMode !== 'cover') return false;
  if (!candidate.title || typeof candidate.title !== 'object') return false;
  if (!candidate.variants || typeof candidate.variants !== 'object') return false;
  if (!candidate.texture || typeof candidate.texture !== 'object') return false;
  if (!Array.isArray(candidate.tags)) return false;

  for (const locale of SUPPORTED_LOCALES) {
    if (typeof candidate.title[locale] !== 'string' || candidate.title[locale].length === 0) return false;
  }

  if (candidate.type === 'pattern' && candidate.renderMode !== 'tile') return false;
  if (candidate.type === 'full-sheet' && candidate.renderMode !== 'cover') return false;

  return true;
}

export function resolvePaperTitle(
  manifest: Pick<PaperRuntimeManifest, 'title'>,
  locale: PaperAssetLocale,
): string {
  return manifest.title[locale] || manifest.title.en;
}
