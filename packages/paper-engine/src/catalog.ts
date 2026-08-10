import {
  isPaperRuntimeManifest,
  type PaperAssetVariants,
  type PaperPackIndex,
  type PaperRuntimeManifest,
} from './asset-contract';

export const DEFAULT_PAPER_PACK_INDEX_URL = '/papers/index.json';

export interface PaperRuntimeAsset {
  manifestUrl: string;
  manifest: PaperRuntimeManifest;
  variants: PaperAssetVariants;
}

function getRuntimeBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.href) return window.location.href;
  return 'http://localhost/';
}

export function resolvePaperAssetUrl(
  manifestUrl: string,
  assetPath: string,
  baseUrl = getRuntimeBaseUrl(),
): string {
  const absoluteManifestUrl = new URL(manifestUrl, baseUrl);
  return new URL(assetPath, absoluteManifestUrl).toString();
}

export function resolvePaperAssetVariants(
  manifestUrl: string,
  variants: PaperAssetVariants,
  baseUrl = getRuntimeBaseUrl(),
): PaperAssetVariants {
  return {
    original: resolvePaperAssetUrl(manifestUrl, variants.original, baseUrl),
    editor: resolvePaperAssetUrl(manifestUrl, variants.editor, baseUrl),
    preview: resolvePaperAssetUrl(manifestUrl, variants.preview, baseUrl),
    thumbnail: resolvePaperAssetUrl(manifestUrl, variants.thumbnail, baseUrl),
  };
}

export async function loadPaperPackIndex(
  url = DEFAULT_PAPER_PACK_INDEX_URL,
  fetcher: typeof fetch = fetch,
): Promise<PaperPackIndex> {
  const response = await fetcher(url);
  if (!response.ok) throw new Error(`Failed to load paper pack index: ${response.status}`);
  return (await response.json()) as PaperPackIndex;
}

export async function loadPaperManifest(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<PaperRuntimeManifest> {
  const response = await fetcher(url);
  if (!response.ok) throw new Error(`Failed to load paper manifest: ${response.status}`);
  const manifest: unknown = await response.json();
  if (!isPaperRuntimeManifest(manifest)) throw new Error(`Invalid paper manifest: ${url}`);
  return manifest;
}

export async function loadPaperRuntimeAsset(
  manifestUrl: string,
  fetcher: typeof fetch = fetch,
  baseUrl = getRuntimeBaseUrl(),
): Promise<PaperRuntimeAsset> {
  const manifest = await loadPaperManifest(manifestUrl, fetcher);

  return {
    manifestUrl,
    manifest,
    variants: resolvePaperAssetVariants(manifestUrl, manifest.variants, baseUrl),
  };
}
