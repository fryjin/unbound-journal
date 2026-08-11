import type { Point } from './viewport';

export interface ElementTransform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface ContentElementBase<Type extends string = string> {
  id: string;
  type: Type;
  transform: ElementTransform;
  createdAt: string;
  updatedAt: string;
}

/**
 * P1.1 development-only element used to prove the shared Content Stack,
 * selection, transforms, history, z-order, persistence and migration before
 * real content implementations land.
 */
export interface DevelopmentPlaceholderElement extends ContentElementBase<'placeholder'> {
  width: number;
  height: number;
  label: string;
}

export type InkMode = 'handwriting' | 'drawing';
export type InkTool = 'pen' | 'marker';

export interface InkPoint extends Point {
  pressure?: number;
}

export interface InkPath {
  points: InkPoint[];
}

export interface InkStyle {
  color: string;
  size: number;
  opacity: number;
  tool: InkTool;
}

/**
 * One InkElement represents one committed drawing gesture. Erasing may split
 * that gesture into multiple disjoint vector paths while preserving the same
 * element identity and z-order.
 */
export interface InkElement extends ContentElementBase<'ink'> {
  mode: InkMode;
  paths: InkPath[];
  style: InkStyle;
}

export type ContentElement = DevelopmentPlaceholderElement | InkElement;

export interface EditorSelectionState {
  elementId: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isInkMode(value: unknown): value is InkMode {
  return value === 'handwriting' || value === 'drawing';
}

function isInkTool(value: unknown): value is InkTool {
  return value === 'pen' || value === 'marker';
}

function cloneInkPoint(point: InkPoint): InkPoint {
  return point.pressure === undefined
    ? { x: point.x, y: point.y }
    : { x: point.x, y: point.y, pressure: point.pressure };
}

export function cloneInkPath(path: InkPath): InkPath {
  return { points: path.points.map(cloneInkPoint) };
}

export function cloneInkStyle(style: InkStyle): InkStyle {
  return { ...style };
}

export function cloneElementTransform(transform: ElementTransform): ElementTransform {
  return { ...transform };
}

export function cloneContentElement(element: ContentElement): ContentElement {
  switch (element.type) {
    case 'placeholder':
      return {
        ...element,
        transform: cloneElementTransform(element.transform),
      };
    case 'ink':
      return {
        ...element,
        transform: cloneElementTransform(element.transform),
        paths: element.paths.map(cloneInkPath),
        style: cloneInkStyle(element.style),
      };
  }
}

export function createElementTransform(
  x: number,
  y: number,
  rotation = 0,
  scaleX = 1,
  scaleY = 1,
): ElementTransform {
  return { x, y, rotation, scaleX, scaleY };
}

export function createDevelopmentPlaceholderElement(
  id: string,
  label: string,
  transform: ElementTransform,
  width: number,
  height: number,
  now: string,
): DevelopmentPlaceholderElement {
  return {
    id,
    type: 'placeholder',
    label,
    transform: cloneElementTransform(transform),
    width,
    height,
    createdAt: now,
    updatedAt: now,
  };
}

export function decodeElementTransform(value: unknown): ElementTransform | null {
  if (!isRecord(value)) return null;
  if (
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y) ||
    !isFiniteNumber(value.rotation) ||
    !isPositiveFiniteNumber(value.scaleX) ||
    !isPositiveFiniteNumber(value.scaleY)
  ) {
    return null;
  }

  return {
    x: value.x,
    y: value.y,
    rotation: value.rotation,
    scaleX: value.scaleX,
    scaleY: value.scaleY,
  };
}

function decodeInkPoint(value: unknown): InkPoint | null {
  if (!isRecord(value) || !isFiniteNumber(value.x) || !isFiniteNumber(value.y)) return null;
  if (value.pressure !== undefined) {
    if (!isFiniteNumber(value.pressure) || value.pressure < 0 || value.pressure > 1) return null;
    return { x: value.x, y: value.y, pressure: value.pressure };
  }
  return { x: value.x, y: value.y };
}

function decodeInkPath(value: unknown): InkPath | null {
  if (!isRecord(value) || !Array.isArray(value.points) || value.points.length === 0) return null;
  const points: InkPoint[] = [];
  for (const rawPoint of value.points) {
    const point = decodeInkPoint(rawPoint);
    if (!point) return null;
    points.push(point);
  }
  return { points };
}

function decodeInkStyle(value: unknown): InkStyle | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.color) || !isPositiveFiniteNumber(value.size)) return null;
  if (!isFiniteNumber(value.opacity) || value.opacity <= 0 || value.opacity > 1) return null;
  if (!isInkTool(value.tool)) return null;
  return {
    color: value.color,
    size: value.size,
    opacity: value.opacity,
    tool: value.tool,
  };
}

export function decodeContentElement(value: unknown): ContentElement | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.createdAt) || !isNonEmptyString(value.updatedAt)) {
    return null;
  }

  const transform = decodeElementTransform(value.transform);
  if (!transform) return null;

  if (value.type === 'placeholder') {
    if (!isPositiveFiniteNumber(value.width) || !isPositiveFiniteNumber(value.height)) return null;
    if (typeof value.label !== 'string') return null;
    return {
      id: value.id,
      type: 'placeholder',
      label: value.label,
      width: value.width,
      height: value.height,
      transform,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };
  }

  if (value.type === 'ink') {
    if (!isInkMode(value.mode) || !Array.isArray(value.paths) || value.paths.length === 0) return null;
    const style = decodeInkStyle(value.style);
    if (!style) return null;
    const paths: InkPath[] = [];
    for (const rawPath of value.paths) {
      const path = decodeInkPath(rawPath);
      if (!path) return null;
      paths.push(path);
    }
    return {
      id: value.id,
      type: 'ink',
      mode: value.mode,
      paths,
      style,
      transform,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };
  }

  return null;
}

export function translateElementTransform(
  transform: ElementTransform,
  delta: Point,
): ElementTransform {
  return {
    ...transform,
    x: transform.x + delta.x,
    y: transform.y + delta.y,
  };
}

export function areElementTransformsEqual(
  first: ElementTransform,
  second: ElementTransform,
): boolean {
  return (
    first.x === second.x &&
    first.y === second.y &&
    first.rotation === second.rotation &&
    first.scaleX === second.scaleX &&
    first.scaleY === second.scaleY
  );
}

function rotatePoint(point: Point, radians: number): Point {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    x: point.x * cosine - point.y * sine,
    y: point.x * sine + point.y * cosine,
  };
}

export function pagePointToElementLocalPoint(
  pagePoint: Point,
  transform: ElementTransform,
): Point {
  const translated = {
    x: pagePoint.x - transform.x,
    y: pagePoint.y - transform.y,
  };
  const unrotated = rotatePoint(translated, (-transform.rotation * Math.PI) / 180);
  return {
    x: unrotated.x / transform.scaleX,
    y: unrotated.y / transform.scaleY,
  };
}

export function elementLocalPointToPagePoint(
  localPoint: Point,
  transform: ElementTransform,
): Point {
  const scaled = {
    x: localPoint.x * transform.scaleX,
    y: localPoint.y * transform.scaleY,
  };
  const rotated = rotatePoint(scaled, (transform.rotation * Math.PI) / 180);
  return {
    x: transform.x + rotated.x,
    y: transform.y + rotated.y,
  };
}

export function distancePointToSegment(point: Point, from: Point, to: Point): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= Number.EPSILON) return Math.hypot(point.x - from.x, point.y - from.y);

  const projection = ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared;
  const t = Math.max(0, Math.min(1, projection));
  return Math.hypot(point.x - (from.x + dx * t), point.y - (from.y + dy * t));
}

export function distancePointToPolyline(point: Point, points: readonly Point[]): number {
  if (points.length === 0) return Number.POSITIVE_INFINITY;
  if (points.length === 1) {
    const only = points[0]!;
    return Math.hypot(point.x - only.x, point.y - only.y);
  }

  let distance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (!from || !to) continue;
    distance = Math.min(distance, distancePointToSegment(point, from, to));
  }
  return distance;
}

function isPointInsideInkElement(element: InkElement, pagePoint: Point): boolean {
  const local = pagePointToElementLocalPoint(pagePoint, element.transform);
  const minScale = Math.max(0.01, Math.min(element.transform.scaleX, element.transform.scaleY));
  const tolerance = element.style.size / 2 + 12 / minScale;

  for (const path of element.paths) {
    if (distancePointToPolyline(local, path.points) <= tolerance) return true;
  }
  return false;
}

export function isPointInsideContentElement(element: ContentElement, pagePoint: Point): boolean {
  switch (element.type) {
    case 'placeholder': {
      const local = pagePointToElementLocalPoint(pagePoint, element.transform);
      return local.x >= 0 && local.y >= 0 && local.x <= element.width && local.y <= element.height;
    }
    case 'ink':
      return isPointInsideInkElement(element, pagePoint);
  }
}

export function findTopContentElementAtPoint(
  elements: readonly ContentElement[],
  pagePoint: Point,
): ContentElement | null {
  for (let index = elements.length - 1; index >= 0; index -= 1) {
    const element = elements[index];
    if (element && isPointInsideContentElement(element, pagePoint)) return element;
  }
  return null;
}
