import { LOGICAL_PAGE_SIZE, type Point, type Size } from '@unbound-journal/editor-core';
import type { PaperLayer, PaperMaskStroke } from './model';

export const PAPER_DOCUMENT_SCHEMA_VERSION = 1 as const;

export interface PaperPageDocumentV1 {
  schemaVersion: typeof PAPER_DOCUMENT_SCHEMA_VERSION;
  id: string;
  size: Size;
  paperLayers: PaperLayer[];
  createdAt: string;
  updatedAt: string;
}

export type PaperPageDocument = PaperPageDocumentV1;

export type PaperDocumentDecodeResult =
  | { ok: true; document: PaperPageDocument }
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

function decodePoint(value: unknown): Point | null {
  if (!isRecord(value) || !isFiniteNumber(value.x) || !isFiniteNumber(value.y)) return null;
  return { x: value.x, y: value.y };
}

function decodeStroke(value: unknown): PaperMaskStroke | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.id)) return null;
  if (value.operation !== 'paint' && value.operation !== 'erase') return null;
  if (!isFiniteNumber(value.size) || value.size <= 0) return null;
  if (!Array.isArray(value.points)) return null;

  const points: Point[] = [];
  for (const rawPoint of value.points) {
    const point = decodePoint(rawPoint);
    if (!point) return null;
    points.push(point);
  }

  return {
    id: value.id,
    operation: value.operation,
    size: value.size,
    points,
  };
}

function decodeLayer(value: unknown): PaperLayer | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.paperVersionId)) return null;
  if (!isNonEmptyString(value.createdAt)) return null;
  if (!isRecord(value.texture) || !Array.isArray(value.maskStrokes)) return null;

  const { texture } = value;
  if (
    !isFiniteNumber(texture.scale) ||
    !isFiniteNumber(texture.rotation) ||
    !isFiniteNumber(texture.offsetX) ||
    !isFiniteNumber(texture.offsetY)
  ) {
    return null;
  }

  const maskStrokes: PaperMaskStroke[] = [];
  for (const rawStroke of value.maskStrokes) {
    const stroke = decodeStroke(rawStroke);
    if (!stroke) return null;
    maskStrokes.push(stroke);
  }

  return {
    id: value.id,
    paperVersionId: value.paperVersionId,
    createdAt: value.createdAt,
    texture: {
      scale: texture.scale,
      rotation: texture.rotation,
      offsetX: texture.offsetX,
      offsetY: texture.offsetY,
    },
    maskStrokes,
  };
}

function decodeSize(value: unknown): Size | null {
  if (!isRecord(value) || !isFiniteNumber(value.width) || !isFiniteNumber(value.height)) {
    return null;
  }
  if (value.width <= 0 || value.height <= 0) return null;
  return { width: value.width, height: value.height };
}

function clonePaperLayer(layer: PaperLayer): PaperLayer {
  return {
    ...layer,
    texture: { ...layer.texture },
    maskStrokes: layer.maskStrokes.map((stroke) => ({
      ...stroke,
      points: stroke.points.map((point) => ({ ...point })),
    })),
  };
}

export function clonePaperPageDocument(document: PaperPageDocument): PaperPageDocument {
  return {
    ...document,
    size: { ...document.size },
    paperLayers: document.paperLayers.map(clonePaperLayer),
  };
}

export function createPaperPageDocument(
  id: string,
  paperLayers: readonly PaperLayer[],
  now: string,
  createdAt = now,
  size: Size = LOGICAL_PAGE_SIZE,
): PaperPageDocument {
  return clonePaperPageDocument({
    schemaVersion: PAPER_DOCUMENT_SCHEMA_VERSION,
    id,
    size,
    paperLayers: paperLayers.map(clonePaperLayer),
    createdAt,
    updatedAt: now,
  });
}

export function decodePaperPageDocument(value: unknown): PaperDocumentDecodeResult {
  if (!isRecord(value)) return { ok: false, reason: 'invalid' };
  if (value.schemaVersion !== PAPER_DOCUMENT_SCHEMA_VERSION) {
    return { ok: false, reason: 'unsupported-version' };
  }
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.createdAt) || !isNonEmptyString(value.updatedAt)) {
    return { ok: false, reason: 'invalid' };
  }

  const size = decodeSize(value.size);
  if (
    !size ||
    size.width !== LOGICAL_PAGE_SIZE.width ||
    size.height !== LOGICAL_PAGE_SIZE.height ||
    !Array.isArray(value.paperLayers)
  ) {
    return { ok: false, reason: 'invalid' };
  }

  const paperLayers: PaperLayer[] = [];
  for (const rawLayer of value.paperLayers) {
    const layer = decodeLayer(rawLayer);
    if (!layer) return { ok: false, reason: 'invalid' };
    paperLayers.push(layer);
  }

  return {
    ok: true,
    document: {
      schemaVersion: PAPER_DOCUMENT_SCHEMA_VERSION,
      id: value.id,
      size,
      paperLayers,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    },
  };
}
