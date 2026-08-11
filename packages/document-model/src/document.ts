import {
  LOGICAL_PAGE_SIZE,
  cloneContentElement,
  decodeContentElement,
  type ContentElement,
  type Size,
} from '@unbound-journal/editor-core';
import {
  clonePaperLayer,
  decodePaperLayer,
  decodePaperPageDocument,
  type PaperLayer,
  type PaperPageDocument,
} from '@unbound-journal/paper-engine';

export const PAGE_DOCUMENT_SCHEMA_VERSION = 2 as const;

export interface PageDocumentV2 {
  schemaVersion: typeof PAGE_DOCUMENT_SCHEMA_VERSION;
  id: string;
  size: Size;
  paperLayers: PaperLayer[];
  elements: ContentElement[];
  createdAt: string;
  updatedAt: string;
}

export type PageDocument = PageDocumentV2;
export type PageDocumentMigrationSource = 'none' | 'paper-page-v1';

export type PageDocumentDecodeResult =
  | {
      ok: true;
      document: PageDocument;
      migratedFrom: PageDocumentMigrationSource;
    }
  | { ok: false; reason: 'invalid' | 'unsupported-version' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function decodeSize(value: unknown): Size | null {
  if (!isRecord(value) || !isFiniteNumber(value.width) || !isFiniteNumber(value.height)) {
    return null;
  }
  if (value.width <= 0 || value.height <= 0) return null;
  return { width: value.width, height: value.height };
}

function isSupportedPageSize(size: Size): boolean {
  return size.width === LOGICAL_PAGE_SIZE.width && size.height === LOGICAL_PAGE_SIZE.height;
}

export function clonePageDocument(document: PageDocument): PageDocument {
  return {
    ...document,
    size: { ...document.size },
    paperLayers: document.paperLayers.map(clonePaperLayer),
    elements: document.elements.map(cloneContentElement),
  };
}

export function createPageDocument(
  id: string,
  paperLayers: readonly PaperLayer[],
  elements: readonly ContentElement[],
  now: string,
  createdAt = now,
  size: Size = LOGICAL_PAGE_SIZE,
): PageDocument {
  return clonePageDocument({
    schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
    id,
    size,
    paperLayers: paperLayers.map(clonePaperLayer),
    elements: elements.map(cloneContentElement),
    createdAt,
    updatedAt: now,
  });
}

export function migratePaperPageDocument(document: PaperPageDocument): PageDocument {
  return createPageDocument(
    document.id,
    document.paperLayers,
    [],
    document.updatedAt,
    document.createdAt,
    document.size,
  );
}

export function withPageDocumentUpdatedAt(document: PageDocument, updatedAt: string): PageDocument {
  if (document.updatedAt === updatedAt) return clonePageDocument(document);
  return clonePageDocument({ ...document, updatedAt });
}

export function decodePageDocument(value: unknown): PageDocumentDecodeResult {
  if (!isRecord(value)) return { ok: false, reason: 'invalid' };

  if (value.schemaVersion === 1) {
    const legacy = decodePaperPageDocument(value);
    if (!legacy.ok) return legacy;
    return {
      ok: true,
      document: migratePaperPageDocument(legacy.document),
      migratedFrom: 'paper-page-v1',
    };
  }

  if (value.schemaVersion !== PAGE_DOCUMENT_SCHEMA_VERSION) {
    return { ok: false, reason: 'unsupported-version' };
  }

  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.createdAt) || !isNonEmptyString(value.updatedAt)) {
    return { ok: false, reason: 'invalid' };
  }

  const size = decodeSize(value.size);
  if (!size || !isSupportedPageSize(size) || !Array.isArray(value.paperLayers) || !Array.isArray(value.elements)) {
    return { ok: false, reason: 'invalid' };
  }

  const paperLayers: PaperLayer[] = [];
  for (const rawLayer of value.paperLayers) {
    const layer = decodePaperLayer(rawLayer);
    if (!layer) return { ok: false, reason: 'invalid' };
    paperLayers.push(layer);
  }

  const elements: ContentElement[] = [];
  for (const rawElement of value.elements) {
    const element = decodeContentElement(rawElement);
    if (!element) return { ok: false, reason: 'invalid' };
    elements.push(element);
  }

  return {
    ok: true,
    migratedFrom: 'none',
    document: {
      schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
      id: value.id,
      size,
      paperLayers,
      elements,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    },
  };
}
