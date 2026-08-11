import {
  cloneInkStyle,
  createElementTransform,
  type InkElement,
  type InkMode,
  type InkPoint,
  type InkStyle,
  type Point,
} from '@unbound-journal/editor-core';

export const DEFAULT_INK_SAMPLE_SPACING = 8;

function clonePoint(point: Point): InkPoint {
  return { x: point.x, y: point.y };
}

function interpolatePoint(from: InkPoint, to: InkPoint, t: number): InkPoint {
  const pressure =
    from.pressure !== undefined && to.pressure !== undefined
      ? from.pressure + (to.pressure - from.pressure) * t
      : undefined;
  return pressure === undefined
    ? {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      }
    : {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
        pressure,
      };
}

export function densifyInkPoints(
  points: readonly InkPoint[],
  maxSpacing = DEFAULT_INK_SAMPLE_SPACING,
): InkPoint[] {
  if (points.length === 0) return [];
  const spacing = Math.max(1, maxSpacing);
  const output: InkPoint[] = [{ ...points[0]! }];

  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (!from || !to) continue;
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / spacing));
    for (let step = 1; step <= steps; step += 1) {
      output.push(interpolatePoint(from, to, step / steps));
    }
  }

  return output;
}

export function createInkElement(
  id: string,
  mode: InkMode,
  style: InkStyle,
  pagePoints: readonly Point[],
  now: string,
): InkElement | null {
  if (pagePoints.length === 0) return null;
  const origin = pagePoints[0]!;
  const rawLocalPoints = pagePoints.map((point) => ({
    x: point.x - origin.x,
    y: point.y - origin.y,
  }));
  const maxSpacing = Math.max(3, Math.min(DEFAULT_INK_SAMPLE_SPACING, style.size * 0.45));
  const points = densifyInkPoints(rawLocalPoints.map(clonePoint), maxSpacing);
  if (points.length === 0) return null;

  return {
    id,
    type: 'ink',
    mode,
    paths: [{ points }],
    style: cloneInkStyle(style),
    transform: createElementTransform(origin.x, origin.y),
    createdAt: now,
    updatedAt: now,
  };
}

export function countInkElements(elements: readonly { type: string }[]): number {
  return elements.reduce((count, element) => count + (element.type === 'ink' ? 1 : 0), 0);
}

export function countInkPaths(elements: readonly { type: string; paths?: readonly unknown[] }[]): number {
  return elements.reduce(
    (count, element) => count + (element.type === 'ink' && Array.isArray(element.paths) ? element.paths.length : 0),
    0,
  );
}
