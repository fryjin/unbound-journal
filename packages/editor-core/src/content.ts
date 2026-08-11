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
 * real Ink/Image/Text element implementations land.
 */
export interface DevelopmentPlaceholderElement extends ContentElementBase<'placeholder'> {
  width: number;
  height: number;
  label: string;
}

export type ContentElement = DevelopmentPlaceholderElement;

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

export function isPointInsideContentElement(element: ContentElement, pagePoint: Point): boolean {
  const local = pagePointToElementLocalPoint(pagePoint, element.transform);
  switch (element.type) {
    case 'placeholder':
      return local.x >= 0 && local.y >= 0 && local.x <= element.width && local.y <= element.height;
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
