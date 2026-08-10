import {
  isPaperRuntimeManifest,
  type PaperPackIndex,
  type PaperRuntimeManifest,
} from './asset-contract';

export const DEFAULT_PAPER_PACK_INDEX_URL = '/papers/index.json';

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
