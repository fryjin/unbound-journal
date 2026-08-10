import type { Point } from '@unbound-journal/editor-core';
import type { PaperTextureDefaults } from './asset-contract';
import type { PaperRuntimeAsset } from './catalog';

export interface PaperMaskStroke {
  id: string;
  operation: 'paint' | 'erase';
  points: Point[];
  size: number;
}

export interface PaperLayerTexture {
  scale: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
}

export interface PaperLayer {
  id: string;
  paperVersionId: string;
  texture: PaperLayerTexture;
  maskStrokes: PaperMaskStroke[];
  createdAt: string;
}

function createMaskStroke(
  id: string,
  operation: PaperMaskStroke['operation'],
  points: readonly Point[],
  size: number,
): PaperMaskStroke {
  return {
    id,
    operation,
    points: points.map((point) => ({ ...point })),
    size,
  };
}

export function createPaintStroke(id: string, points: readonly Point[], size: number): PaperMaskStroke {
  return createMaskStroke(id, 'paint', points, size);
}

export function createEraseStroke(id: string, points: readonly Point[], size: number): PaperMaskStroke {
  return createMaskStroke(id, 'erase', points, size);
}

export function createPaperLayer(
  id: string,
  paperVersionId: string,
  texture: PaperTextureDefaults,
  createdAt: string,
  initialStrokes: readonly PaperMaskStroke[] = [],
): PaperLayer {
  return {
    id,
    paperVersionId,
    texture: {
      scale: texture.defaultScale,
      rotation: texture.rotation,
      offsetX: texture.offsetX,
      offsetY: texture.offsetY,
    },
    maskStrokes: initialStrokes.map(clonePaperMaskStroke),
    createdAt,
  };
}

export function createPaperLayerFromAsset(
  id: string,
  asset: PaperRuntimeAsset,
  createdAt: string,
  initialStrokes: readonly PaperMaskStroke[] = [],
): PaperLayer {
  return createPaperLayer(
    id,
    asset.manifest.paperVersionId,
    asset.manifest.texture,
    createdAt,
    initialStrokes,
  );
}

export function appendPaperMaskStroke(layer: PaperLayer, stroke: PaperMaskStroke): PaperLayer {
  return {
    ...layer,
    maskStrokes: [...layer.maskStrokes, clonePaperMaskStroke(stroke)],
  };
}

function pointDistanceSquared(first: Point, second: Point): number {
  const dx = first.x - second.x;
  const dy = first.y - second.y;
  return dx * dx + dy * dy;
}

function pointToSegmentDistanceSquared(point: Point, start: Point, end: Point): number {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (segmentLengthSquared <= Number.EPSILON) return pointDistanceSquared(point, start);

  const projection =
    ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) /
    segmentLengthSquared;
  const t = Math.min(1, Math.max(0, projection));
  const nearest = {
    x: start.x + segmentX * t,
    y: start.y + segmentY * t,
  };

  return pointDistanceSquared(point, nearest);
}

export function doesPaperMaskStrokeCoverPoint(stroke: PaperMaskStroke, point: Point): boolean {
  const points = stroke.points;
  if (points.length === 0) return false;

  const radius = Math.max(0.5, stroke.size / 2);
  const radiusSquared = radius * radius;

  if (points.length === 1) return pointDistanceSquared(points[0], point) <= radiusSquared;

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    if (!start || !end) continue;
    if (pointToSegmentDistanceSquared(point, start, end) <= radiusSquared) return true;
  }

  return false;
}

/**
 * Hard-mask visibility query used only at gesture start.
 * Replaying strokes in document order matches the P0 paint/erase compositor:
 * the most recent stroke that covers a point decides whether paper is visible there.
 */
export function isPointVisibleInPaperMask(
  strokes: readonly PaperMaskStroke[],
  point: Point,
): boolean {
  let visible = false;

  for (const stroke of strokes) {
    if (!doesPaperMaskStrokeCoverPoint(stroke, point)) continue;
    visible = stroke.operation === 'paint';
  }

  return visible;
}

export function isPointVisibleInPaperLayer(layer: PaperLayer, point: Point): boolean {
  return isPointVisibleInPaperMask(layer.maskStrokes, point);
}

export function findTopVisiblePaperLayerIndex(
  layers: readonly PaperLayer[],
  point: Point,
): number {
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    const layer = layers[index];
    if (layer && isPointVisibleInPaperLayer(layer, point)) return index;
  }

  return -1;
}

function clonePaperMaskStroke(stroke: PaperMaskStroke): PaperMaskStroke {
  return {
    ...stroke,
    points: stroke.points.map((point) => ({ ...point })),
  };
}
