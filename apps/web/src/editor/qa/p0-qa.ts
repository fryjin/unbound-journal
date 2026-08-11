import { LOGICAL_PAGE_SIZE, type Size } from '@unbound-journal/editor-core';
import {
  createPageDocument,
  decodePageDocument,
  type PageDocument,
} from '@unbound-journal/document-model';
import {
  createPaperPageDocument,
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
  elementCount: number;
  renderedLayerCount: number;
  undoCount: number;
  redoCount: number;
  persistenceStatus: string;
  interactionMode: string;
  selectedElementId: string | null;
  schemaVersion: number;
  indexedDbAvailable: boolean;
}

export interface RunP0QaSelfCheckInput {
  document: PageDocument;
  renderedLayerCount: number;
  viewportSize: Size;
  devicePixelRatio: number;
  undoCount: number;
  redoCount: number;
  persistenceStatus: string;
  interactionMode: string;
  selectedElementId: string | null;
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
    layerCount: input.document.paperLayers.length,
    strokeCount: countStrokes(input.document.paperLayers),
    elementCount: input.document.elements.length,
    renderedLayerCount: input.renderedLayerCount,
    undoCount: input.undoCount,
    redoCount: input.redoCount,
    persistenceStatus: input.persistenceStatus,
    interactionMode: input.interactionMode,
    selectedElementId: input.selectedElementId,
    schemaVersion: input.document.schemaVersion,
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
    marker: 'unbound-journal-p1-qa',
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

function runDocumentRoundTrip(document: PageDocument): P0QaCheckResult {
  const now = new Date().toISOString();
  const snapshot = createPageDocument(
    'p1-qa-roundtrip',
    document.paperLayers,
    document.elements,
    now,
    now,
    LOGICAL_PAGE_SIZE,
  );
  const decoded = decodePageDocument(JSON.parse(JSON.stringify(snapshot)) as unknown);

  const passed =
    decoded.ok &&
    decoded.document.paperLayers.length === document.paperLayers.length &&
    decoded.document.elements.length === document.elements.length &&
    countStrokes(decoded.document.paperLayers) === countStrokes(document.paperLayers);

  return {
    id: 'document-roundtrip',
    label: 'Unified PageDocument round-trip',
    status: passed ? 'pass' : 'fail',
    detail: passed
      ? `${document.paperLayers.length} paper layers / ${document.elements.length} content elements round-tripped as schema v2.`
      : 'Unified PageDocument did not round-trip cleanly.',
  };
}

function runP0MigrationCheck(document: PageDocument): P0QaCheckResult {
  const now = new Date().toISOString();
  const legacy = createPaperPageDocument(
    'p0-migration-qa',
    document.paperLayers,
    now,
    now,
    LOGICAL_PAGE_SIZE,
  );
  const decoded = decodePageDocument(JSON.parse(JSON.stringify(legacy)) as unknown);
  const passed =
    decoded.ok &&
    decoded.migratedFrom === 'paper-page-v1' &&
    decoded.document.schemaVersion === 2 &&
    decoded.document.paperLayers.length === document.paperLayers.length &&
    decoded.document.elements.length === 0;

  return {
    id: 'p0-v1-migration',
    label: 'P0 → P1 document migration',
    status: passed ? 'pass' : 'fail',
    detail: passed
      ? `${document.paperLayers.length} legacy paper layers migrated to PageDocument v2 without content fabrication.`
      : 'Legacy PaperPageDocumentV1 migration failed.',
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
      runDocumentRoundTrip(input.document),
      runP0MigrationCheck(input.document),
      runRendererHydrationCheck(input.document.paperLayers, input.renderedLayerCount),
      runPersistenceStateCheck(input.persistenceStatus),
      indexedDbCheck,
    ],
  };
}
