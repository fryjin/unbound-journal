import { LOGICAL_PAGE_SIZE, type Size } from '@unbound-journal/editor-core';
import {
  createPaperPageDocument,
  decodePaperPageDocument,
  type PaperHistoryState,
} from '@unbound-journal/paper-engine';
import {
  createIndexedDbDocumentStorage,
  isIndexedDbAvailable,
} from '@unbound-journal/storage';

export type P0QaCheckStatus = 'pass' | 'fail' | 'warn';

export interface P0QaCheckResult {
  id: string;
  label: string;
  status: P0QaCheckStatus;
  detail: string;
}

export interface P0QaRuntimeSnapshot {
  viewportSize: Size;
  devicePixelRatio: number;
  maxTouchPoints: number;
  userAgent: string;
  language: string;
  layerCount: number;
  strokeCount: number;
  renderedLayerCount: number;
  undoCount: number;
  redoCount: number;
  persistenceStatus: string;
  indexedDbAvailable: boolean;
}

export interface RunP0QaSelfCheckInput {
  paperLayers: PaperHistoryState;
  renderedLayerCount: number;
  viewportSize: Size;
  devicePixelRatio: number;
  undoCount: number;
  redoCount: number;
  persistenceStatus: string;
}

export function isP0QaMode(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('qa') === '1';
}

function countStrokes(paperLayers: PaperHistoryState): number {
  return paperLayers.reduce((total, layer) => total + layer.maskStrokes.length, 0);
}

export function createP0QaRuntimeSnapshot(input: RunP0QaSelfCheckInput): P0QaRuntimeSnapshot {
  return {
    viewportSize: input.viewportSize,
    devicePixelRatio: input.devicePixelRatio,
    maxTouchPoints: typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints,
    userAgent: typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent,
    language: typeof navigator === 'undefined' ? 'unknown' : navigator.language,
    layerCount: input.paperLayers.length,
    strokeCount: countStrokes(input.paperLayers),
    renderedLayerCount: input.renderedLayerCount,
    undoCount: input.undoCount,
    redoCount: input.redoCount,
    persistenceStatus: input.persistenceStatus,
    indexedDbAvailable: isIndexedDbAvailable(),
  };
}

async function runIndexedDbRoundTrip(): Promise<P0QaCheckResult> {
  if (!isIndexedDbAvailable()) {
    return {
      id: 'indexeddb-roundtrip',
      label: 'IndexedDB round-trip',
      status: 'warn',
      detail: 'IndexedDB is unavailable in this browser/context.',
    };
  }

  const storage = createIndexedDbDocumentStorage<unknown>({
    dbName: 'unbound-journal-p0-qa',
    storeName: 'checks',
  });
  const id = `roundtrip-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const payload = {
    marker: 'unbound-journal-p0-qa',
    timestamp: new Date().toISOString(),
    value: Math.random(),
  };

  try {
    await storage.save(id, payload);
    const restored = await storage.load(id);
    await storage.remove(id);

    const matches = JSON.stringify(restored) === JSON.stringify(payload);
    return {
      id: 'indexeddb-roundtrip',
      label: 'IndexedDB round-trip',
      status: matches ? 'pass' : 'fail',
      detail: matches ? 'Write → read → delete succeeded.' : 'Read-back value did not match write.',
    };
  } catch (error) {
    return {
      id: 'indexeddb-roundtrip',
      label: 'IndexedDB round-trip',
      status: 'fail',
      detail: error instanceof Error ? error.message : 'IndexedDB check failed.',
    };
  } finally {
    storage.close();
  }
}

function runDocumentRoundTrip(paperLayers: PaperHistoryState): P0QaCheckResult {
  const now = new Date().toISOString();
  const document = createPaperPageDocument('p0-qa-roundtrip', paperLayers, now, now, LOGICAL_PAGE_SIZE);
  const decoded = decodePaperPageDocument(JSON.parse(JSON.stringify(document)) as unknown);

  const passed =
    decoded.ok &&
    decoded.document.paperLayers.length === paperLayers.length &&
    countStrokes(decoded.document.paperLayers) === countStrokes(paperLayers);

  return {
    id: 'document-roundtrip',
    label: 'Document encode/decode',
    status: passed ? 'pass' : 'fail',
    detail: passed
      ? `${paperLayers.length} layers / ${countStrokes(paperLayers)} strokes round-tripped.`
      : 'Persisted document did not round-trip cleanly.',
  };
}

function runRendererHydrationCheck(
  paperLayers: PaperHistoryState,
  renderedLayerCount: number,
): P0QaCheckResult {
  const passed = renderedLayerCount === paperLayers.length;
  return {
    id: 'renderer-hydration',
    label: 'Runtime paper hydration',
    status: passed ? 'pass' : 'warn',
    detail: passed
      ? `${renderedLayerCount}/${paperLayers.length} document layers have runtime assets.`
      : `${renderedLayerCount}/${paperLayers.length} layers are currently renderable. Wait for assets or inspect missing manifests.`,
  };
}

function runViewportCheck(viewportSize: Size, devicePixelRatio: number): P0QaCheckResult {
  const valid = viewportSize.width > 0 && viewportSize.height > 0 && devicePixelRatio >= 1;
  return {
    id: 'viewport-runtime',
    label: 'Viewport / DPR runtime',
    status: valid ? 'pass' : 'fail',
    detail: `${Math.round(viewportSize.width)}×${Math.round(viewportSize.height)} CSS px · DPR ${devicePixelRatio.toFixed(2)}`,
  };
}

function runPersistenceStateCheck(persistenceStatus: string): P0QaCheckResult {
  const hardFailure = persistenceStatus === 'error' || persistenceStatus === 'recovery-error';
  const warning = persistenceStatus === 'unavailable';
  return {
    id: 'persistence-state',
    label: 'Editor persistence state',
    status: hardFailure ? 'fail' : warning ? 'warn' : 'pass',
    detail: persistenceStatus,
  };
}

export async function runP0QaSelfCheck(
  input: RunP0QaSelfCheckInput,
): Promise<{ snapshot: P0QaRuntimeSnapshot; checks: P0QaCheckResult[] }> {
  const snapshot = createP0QaRuntimeSnapshot(input);
  const indexedDbCheck = await runIndexedDbRoundTrip();

  return {
    snapshot,
    checks: [
      runViewportCheck(input.viewportSize, input.devicePixelRatio),
      runDocumentRoundTrip(input.paperLayers),
      runRendererHydrationCheck(input.paperLayers, input.renderedLayerCount),
      runPersistenceStateCheck(input.persistenceStatus),
      indexedDbCheck,
    ],
  };
}
