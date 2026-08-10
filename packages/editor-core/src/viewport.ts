export type Point = Readonly<{
  x: number;
  y: number;
}>;

export type Size = Readonly<{
  width: number;
  height: number;
}>;

export type ViewportTransform = Readonly<{
  scale: number;
  offsetX: number;
  offsetY: number;
}>;

export const DEFAULT_VIEWPORT_PADDING = 24;
export const DEFAULT_VIEWPORT_EDGE_MARGIN = 24;
export const MAX_VIEWPORT_ZOOM = 4;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getFitScale(
  pageSize: Size,
  viewportSize: Size,
  padding = DEFAULT_VIEWPORT_PADDING,
): number {
  const availableWidth = Math.max(1, viewportSize.width - padding * 2);
  const availableHeight = Math.max(1, viewportSize.height - padding * 2);

  return Math.min(availableWidth / pageSize.width, availableHeight / pageSize.height);
}

export function createFitTransform(
  pageSize: Size,
  viewportSize: Size,
  padding = DEFAULT_VIEWPORT_PADDING,
): ViewportTransform {
  const scale = getFitScale(pageSize, viewportSize, padding);

  return {
    scale,
    offsetX: (viewportSize.width - pageSize.width * scale) / 2,
    offsetY: (viewportSize.height - pageSize.height * scale) / 2,
  };
}

export function pageToScreen(point: Point, transform: ViewportTransform): Point {
  return {
    x: transform.offsetX + point.x * transform.scale,
    y: transform.offsetY + point.y * transform.scale,
  };
}

export function screenToPage(point: Point, transform: ViewportTransform): Point {
  return {
    x: (point.x - transform.offsetX) / transform.scale,
    y: (point.y - transform.offsetY) / transform.scale,
  };
}

function clampAxisOffset(
  offset: number,
  scaledPageSize: number,
  viewportSize: number,
  edgeMargin: number,
): number {
  if (scaledPageSize + edgeMargin * 2 <= viewportSize) {
    return (viewportSize - scaledPageSize) / 2;
  }

  const minOffset = viewportSize - edgeMargin - scaledPageSize;
  const maxOffset = edgeMargin;
  return clamp(offset, minOffset, maxOffset);
}

export function clampViewportTransform(
  transform: ViewportTransform,
  pageSize: Size,
  viewportSize: Size,
  edgeMargin = DEFAULT_VIEWPORT_EDGE_MARGIN,
): ViewportTransform {
  const scaledWidth = pageSize.width * transform.scale;
  const scaledHeight = pageSize.height * transform.scale;

  return {
    scale: transform.scale,
    offsetX: clampAxisOffset(transform.offsetX, scaledWidth, viewportSize.width, edgeMargin),
    offsetY: clampAxisOffset(transform.offsetY, scaledHeight, viewportSize.height, edgeMargin),
  };
}

export function zoomViewportAtPoint(
  transform: ViewportTransform,
  focalPoint: Point,
  targetScale: number,
  pageSize: Size,
  viewportSize: Size,
  edgeMargin = DEFAULT_VIEWPORT_EDGE_MARGIN,
): ViewportTransform {
  const pagePoint = screenToPage(focalPoint, transform);

  return clampViewportTransform(
    {
      scale: targetScale,
      offsetX: focalPoint.x - pagePoint.x * targetScale,
      offsetY: focalPoint.y - pagePoint.y * targetScale,
    },
    pageSize,
    viewportSize,
    edgeMargin,
  );
}

export function moveViewport(
  transform: ViewportTransform,
  delta: Point,
  pageSize: Size,
  viewportSize: Size,
  edgeMargin = DEFAULT_VIEWPORT_EDGE_MARGIN,
): ViewportTransform {
  return clampViewportTransform(
    {
      ...transform,
      offsetX: transform.offsetX + delta.x,
      offsetY: transform.offsetY + delta.y,
    },
    pageSize,
    viewportSize,
    edgeMargin,
  );
}
