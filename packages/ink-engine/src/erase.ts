import {
  cloneInkPath,
  cloneInkStyle,
  distancePointToPolyline,
  elementLocalPointToPagePoint,
  type ContentElement,
  type InkElement,
  type InkPath,
  type Point,
} from '@unbound-journal/editor-core';

export interface InkEraseResult {
  elements: ContentElement[];
  changedInkIds: string[];
  changed: boolean;
}

function eraseInkPath(
  element: InkElement,
  path: InkPath,
  eraserPoints: readonly Point[],
  eraserSize: number,
): { paths: InkPath[]; changed: boolean } {
  if (path.points.length === 0 || eraserPoints.length === 0) {
    return { paths: [cloneInkPath(path)], changed: false };
  }

  const maxScale = Math.max(element.transform.scaleX, element.transform.scaleY);
  const eraseThreshold = Math.max(0.5, eraserSize / 2) + (element.style.size * maxScale) / 2;
  const output: InkPath[] = [];
  let active: InkPath | null = null;
  let changed = false;

  for (const point of path.points) {
    const pagePoint = elementLocalPointToPagePoint(point, element.transform);
    const erased = distancePointToPolyline(pagePoint, eraserPoints) <= eraseThreshold;
    if (erased) {
      changed = true;
      active = null;
      continue;
    }

    if (!active) {
      active = { points: [] };
      output.push(active);
    }
    active.points.push({ ...point });
  }

  return {
    paths: output.filter((segment) => segment.points.length > 0),
    changed,
  };
}

export function eraseInkElement(
  element: InkElement,
  eraserPoints: readonly Point[],
  eraserSize: number,
  updatedAt: string,
): InkElement | null {
  let changed = false;
  const nextPaths: InkPath[] = [];

  for (const path of element.paths) {
    const erased = eraseInkPath(element, path, eraserPoints, eraserSize);
    changed ||= erased.changed;
    nextPaths.push(...erased.paths);
  }

  if (!changed) return element;
  if (nextPaths.length === 0) return null;

  return {
    ...element,
    paths: nextPaths,
    style: cloneInkStyle(element.style),
    transform: { ...element.transform },
    updatedAt,
  };
}

export function eraseInkElements(
  elements: readonly ContentElement[],
  eraserPoints: readonly Point[],
  eraserSize: number,
  updatedAt: string,
): InkEraseResult {
  const nextElements: ContentElement[] = [];
  const changedInkIds: string[] = [];

  for (const element of elements) {
    if (element.type !== 'ink') {
      nextElements.push(element);
      continue;
    }

    const next = eraseInkElement(element, eraserPoints, eraserSize, updatedAt);
    if (next === element) {
      nextElements.push(element);
      continue;
    }

    changedInkIds.push(element.id);
    if (next) nextElements.push(next);
  }

  if (changedInkIds.length === 0) {
    return {
      elements: [...elements],
      changedInkIds,
      changed: false,
    };
  }

  return {
    elements: nextElements,
    changedInkIds,
    changed: true,
  };
}
