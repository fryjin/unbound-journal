import {
  DEFAULT_VIEWPORT_EDGE_MARGIN,
  DEFAULT_VIEWPORT_PADDING,
  LOGICAL_PAGE_SIZE,
  MAX_VIEWPORT_ZOOM,
  clampViewportTransform,
  createFitTransform,
  getFitScale,
  pageToScreen,
  screenToPage,
  zoomViewportAtPoint,
  type Point,
  type Size,
  type ViewportTransform,
} from '@unbound-journal/editor-core';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Group, Layer, Rect, Stage } from 'react-konva';

const EMPTY_SIZE: Size = { width: 0, height: 0 };

type GestureSnapshot = {
  center: Point;
  distance: number;
};

type TouchEventLike = {
  evt: TouchEvent;
};

type MouseEventLike = {
  evt: MouseEvent;
  target: {
    getStage: () => {
      getPointerPosition: () => Point | null;
    } | null;
  };
};

type WheelEventLike = {
  evt: WheelEvent;
  target: {
    getStage: () => {
      getPointerPosition: () => Point | null;
    } | null;
  };
};

export type PageInputEvent = Readonly<{
  pagePoint: Point;
  screenPoint: Point;
  insidePage: boolean;
  source: 'touch' | 'mouse';
}>;

export type PageViewportState = Readonly<{
  viewportSize: Size;
  transform: ViewportTransform;
  fitScale: number;
  zoom: number;
  devicePixelRatio: number;
}>;

export type PageViewportHandle = Readonly<{
  fitToPage: () => void;
  screenToPage: (point: Point) => Point;
  pageToScreen: (point: Point) => Point;
  getState: () => PageViewportState;
}>;

export type PageViewportProps = Readonly<{
  ariaLabel: string;
  children?: ReactNode;
  className?: string;
  onViewportChange?: (state: PageViewportState) => void;
  onPageInputStart?: (event: PageInputEvent) => void;
  onPageInputMove?: (event: PageInputEvent) => void;
  onPageInputEnd?: (event: PageInputEvent | null) => void;
  onPageInputCancel?: () => void;
}>;

function getTouchPoint(touch: Touch, bounds: DOMRect): Point {
  return {
    x: touch.clientX - bounds.left,
    y: touch.clientY - bounds.top,
  };
}

function getTouchCenter(first: Point, second: Point): Point {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

function getDistance(first: Point, second: Point): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function getDevicePixelRatio(): number {
  if (typeof window === 'undefined') return 1;
  return Math.max(1, window.devicePixelRatio || 1);
}

function isInsideLogicalPage(point: Point): boolean {
  return (
    point.x >= 0 &&
    point.y >= 0 &&
    point.x <= LOGICAL_PAGE_SIZE.width &&
    point.y <= LOGICAL_PAGE_SIZE.height
  );
}

export const PageViewport = forwardRef<PageViewportHandle, PageViewportProps>(
  function PageViewport(
    {
      ariaLabel,
      children,
      className,
      onViewportChange,
      onPageInputStart,
      onPageInputMove,
      onPageInputEnd,
      onPageInputCancel,
    },
    forwardedRef,
  ) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const viewportSizeRef = useRef<Size>(EMPTY_SIZE);
    const fitScaleRef = useRef(1);
    const transformRef = useRef<ViewportTransform>({ scale: 1, offsetX: 0, offsetY: 0 });
    const gestureRef = useRef<GestureSnapshot | null>(null);
    const singleTouchActiveRef = useRef(false);
    const suppressSingleTouchRef = useRef(false);
    const mouseActiveRef = useRef(false);
    const lastTouchInputAtRef = useRef(0);

    const [viewportSize, setViewportSize] = useState<Size>(EMPTY_SIZE);
    const [transform, setTransform] = useState<ViewportTransform>(transformRef.current);

    const publishTransform = useCallback(
      (nextTransform: ViewportTransform, nextViewportSize = viewportSizeRef.current) => {
        transformRef.current = nextTransform;
        setTransform(nextTransform);

        const fitScale = fitScaleRef.current;
        onViewportChange?.({
          viewportSize: nextViewportSize,
          transform: nextTransform,
          fitScale,
          zoom: fitScale > 0 ? nextTransform.scale / fitScale : 1,
          devicePixelRatio: getDevicePixelRatio(),
        });
      },
      [onViewportChange],
    );

    const makePageInputEvent = useCallback((screenPoint: Point, source: 'touch' | 'mouse') => {
      const pagePoint = screenToPage(screenPoint, transformRef.current);
      return {
        pagePoint,
        screenPoint,
        insidePage: isInsideLogicalPage(pagePoint),
        source,
      } satisfies PageInputEvent;
    }, []);

    const fitToPage = useCallback(() => {
      const size = viewportSizeRef.current;
      if (size.width <= 0 || size.height <= 0) return;

      const fitScale = getFitScale(LOGICAL_PAGE_SIZE, size, DEFAULT_VIEWPORT_PADDING);
      fitScaleRef.current = fitScale;
      publishTransform(createFitTransform(LOGICAL_PAGE_SIZE, size, DEFAULT_VIEWPORT_PADDING), size);
    }, [publishTransform]);

    useImperativeHandle(
      forwardedRef,
      () => ({
        fitToPage,
        screenToPage: (point: Point) => screenToPage(point, transformRef.current),
        pageToScreen: (point: Point) => pageToScreen(point, transformRef.current),
        getState: () => {
          const fitScale = fitScaleRef.current;
          return {
            viewportSize: viewportSizeRef.current,
            transform: transformRef.current,
            fitScale,
            zoom: fitScale > 0 ? transformRef.current.scale / fitScale : 1,
            devicePixelRatio: getDevicePixelRatio(),
          };
        },
      }),
      [fitToPage],
    );

    useLayoutEffect(() => {
      const host = hostRef.current;
      if (!host) return;

      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;

        const nextSize = {
          width: Math.max(1, Math.round(entry.contentRect.width)),
          height: Math.max(1, Math.round(entry.contentRect.height)),
        } satisfies Size;

        const previousSize = viewportSizeRef.current;
        const previousFitScale = fitScaleRef.current;
        const previousTransform = transformRef.current;
        const hadViewport = previousSize.width > 0 && previousSize.height > 0;

        const nextFitScale = getFitScale(LOGICAL_PAGE_SIZE, nextSize, DEFAULT_VIEWPORT_PADDING);
        fitScaleRef.current = nextFitScale;
        viewportSizeRef.current = nextSize;
        setViewportSize(nextSize);

        if (!hadViewport) {
          publishTransform(
            createFitTransform(LOGICAL_PAGE_SIZE, nextSize, DEFAULT_VIEWPORT_PADDING),
            nextSize,
          );
          return;
        }

        const zoomRatio = Math.min(
          MAX_VIEWPORT_ZOOM,
          Math.max(1, previousTransform.scale / Math.max(previousFitScale, Number.EPSILON)),
        );
        const previousCenter = {
          x: previousSize.width / 2,
          y: previousSize.height / 2,
        };
        const pageCenter = screenToPage(previousCenter, previousTransform);
        const nextScale = nextFitScale * zoomRatio;
        const nextTransform = clampViewportTransform(
          {
            scale: nextScale,
            offsetX: nextSize.width / 2 - pageCenter.x * nextScale,
            offsetY: nextSize.height / 2 - pageCenter.y * nextScale,
          },
          LOGICAL_PAGE_SIZE,
          nextSize,
          DEFAULT_VIEWPORT_EDGE_MARGIN,
        );

        publishTransform(nextTransform, nextSize);
      });

      observer.observe(host);
      return () => observer.disconnect();
    }, [publishTransform]);

    const resolveTouchPoint = useCallback((touch: Touch) => {
      const host = hostRef.current;
      if (!host) return null;
      return getTouchPoint(touch, host.getBoundingClientRect());
    }, []);

    const resolveTouchPair = useCallback((event: TouchEventLike) => {
      const host = hostRef.current;
      if (!host || event.evt.touches.length < 2) return null;

      const bounds = host.getBoundingClientRect();
      const firstTouch = event.evt.touches.item(0);
      const secondTouch = event.evt.touches.item(1);
      if (!firstTouch || !secondTouch) return null;

      const first = getTouchPoint(firstTouch, bounds);
      const second = getTouchPoint(secondTouch, bounds);

      return {
        center: getTouchCenter(first, second),
        distance: getDistance(first, second),
      };
    }, []);

    const cancelSingleTouch = useCallback(() => {
      if (!singleTouchActiveRef.current) return;
      singleTouchActiveRef.current = false;
      onPageInputCancel?.();
    }, [onPageInputCancel]);

    const handleTouchStart = useCallback(
      (event: TouchEventLike) => {
        lastTouchInputAtRef.current = Date.now();
        if (event.evt.cancelable) event.evt.preventDefault();

        if (event.evt.touches.length >= 2) {
          cancelSingleTouch();
          suppressSingleTouchRef.current = true;
          gestureRef.current = resolveTouchPair(event);
          return;
        }

        if (event.evt.touches.length !== 1 || suppressSingleTouchRef.current) return;
        const touch = event.evt.touches.item(0);
        if (!touch) return;
        const screenPoint = resolveTouchPoint(touch);
        if (!screenPoint) return;
        const pageEvent = makePageInputEvent(screenPoint, 'touch');
        if (!pageEvent.insidePage) return;
        singleTouchActiveRef.current = true;
        onPageInputStart?.(pageEvent);
      },
      [cancelSingleTouch, makePageInputEvent, onPageInputStart, resolveTouchPair, resolveTouchPoint],
    );

    const handleTouchMove = useCallback(
      (event: TouchEventLike) => {
        lastTouchInputAtRef.current = Date.now();
        if (event.evt.cancelable) event.evt.preventDefault();

        if (event.evt.touches.length >= 2) {
          cancelSingleTouch();
          suppressSingleTouchRef.current = true;
          const current = resolveTouchPair(event);
          const previous = gestureRef.current;
          const size = viewportSizeRef.current;
          if (!current || !previous || size.width <= 0 || size.height <= 0) {
            gestureRef.current = current;
            return;
          }

          const currentTransform = transformRef.current;
          const fitScale = fitScaleRef.current;
          const distanceRatio = previous.distance > 0 ? current.distance / previous.distance : 1;
          const targetScale = Math.min(
            fitScale * MAX_VIEWPORT_ZOOM,
            Math.max(fitScale, currentTransform.scale * distanceRatio),
          );

          const pagePointAtPreviousCenter = screenToPage(previous.center, currentTransform);
          const nextTransform = clampViewportTransform(
            {
              scale: targetScale,
              offsetX: current.center.x - pagePointAtPreviousCenter.x * targetScale,
              offsetY: current.center.y - pagePointAtPreviousCenter.y * targetScale,
            },
            LOGICAL_PAGE_SIZE,
            size,
            DEFAULT_VIEWPORT_EDGE_MARGIN,
          );

          publishTransform(nextTransform);
          gestureRef.current = current;
          return;
        }

        if (
          event.evt.touches.length === 1 &&
          singleTouchActiveRef.current &&
          !suppressSingleTouchRef.current
        ) {
          const touch = event.evt.touches.item(0);
          if (!touch) return;
          const screenPoint = resolveTouchPoint(touch);
          if (!screenPoint) return;
          onPageInputMove?.(makePageInputEvent(screenPoint, 'touch'));
        }
      },
      [cancelSingleTouch, makePageInputEvent, onPageInputMove, publishTransform, resolveTouchPair, resolveTouchPoint],
    );

    const handleTouchEnd = useCallback(
      (event: TouchEventLike) => {
        lastTouchInputAtRef.current = Date.now();
        if (event.evt.cancelable) event.evt.preventDefault();

        if (suppressSingleTouchRef.current || gestureRef.current) {
          gestureRef.current = event.evt.touches.length >= 2 ? resolveTouchPair(event) : null;
          if (event.evt.touches.length === 0) suppressSingleTouchRef.current = false;
          return;
        }

        if (!singleTouchActiveRef.current) return;
        if (event.evt.touches.length > 0) return;
        singleTouchActiveRef.current = false;
        const changedTouch = event.evt.changedTouches.item(0);
        const screenPoint = changedTouch ? resolveTouchPoint(changedTouch) : null;
        onPageInputEnd?.(screenPoint ? makePageInputEvent(screenPoint, 'touch') : null);
      },
      [makePageInputEvent, onPageInputEnd, resolveTouchPair, resolveTouchPoint],
    );

    const handleTouchCancel = useCallback(() => {
      lastTouchInputAtRef.current = Date.now();
      gestureRef.current = null;
      suppressSingleTouchRef.current = false;
      cancelSingleTouch();
    }, [cancelSingleTouch]);

    const resolveMouseEvent = useCallback(
      (event: MouseEventLike) => {
        const pointer = event.target.getStage()?.getPointerPosition();
        return pointer ? makePageInputEvent(pointer, 'mouse') : null;
      },
      [makePageInputEvent],
    );

    const handleMouseDown = useCallback(
      (event: MouseEventLike) => {
        if (Date.now() - lastTouchInputAtRef.current < 800) return;
        if (event.evt.button !== 0) return;
        const pageEvent = resolveMouseEvent(event);
        if (!pageEvent?.insidePage) return;
        mouseActiveRef.current = true;
        onPageInputStart?.(pageEvent);
      },
      [onPageInputStart, resolveMouseEvent],
    );

    const handleMouseMove = useCallback(
      (event: MouseEventLike) => {
        if (!mouseActiveRef.current) return;
        const pageEvent = resolveMouseEvent(event);
        if (pageEvent) onPageInputMove?.(pageEvent);
      },
      [onPageInputMove, resolveMouseEvent],
    );

    const finishMouseInput = useCallback(
      (event: MouseEventLike | null) => {
        if (!mouseActiveRef.current) return;
        mouseActiveRef.current = false;
        onPageInputEnd?.(event ? resolveMouseEvent(event) : null);
      },
      [onPageInputEnd, resolveMouseEvent],
    );

    const handleWheel = useCallback(
      (event: WheelEventLike) => {
        const size = viewportSizeRef.current;
        if (size.width <= 0 || size.height <= 0) return;
        if (event.evt.cancelable) event.evt.preventDefault();

        const pointer = event.target.getStage()?.getPointerPosition();
        if (!pointer) return;

        const fitScale = fitScaleRef.current;
        const currentTransform = transformRef.current;
        const zoomFactor = Math.exp(-event.evt.deltaY * 0.0015);
        const targetScale = Math.min(
          fitScale * MAX_VIEWPORT_ZOOM,
          Math.max(fitScale, currentTransform.scale * zoomFactor),
        );

        publishTransform(
          zoomViewportAtPoint(
            currentTransform,
            pointer,
            targetScale,
            LOGICAL_PAGE_SIZE,
            size,
            DEFAULT_VIEWPORT_EDGE_MARGIN,
          ),
        );
      },
      [publishTransform],
    );

    const hostClassName = ['page-viewport', className].filter(Boolean).join(' ');

    return (
      <div
        ref={hostRef}
        className={hostClassName}
        role="region"
        aria-label={ariaLabel}
        data-device-pixel-ratio={getDevicePixelRatio()}
      >
        {viewportSize.width > 0 && viewportSize.height > 0 ? (
          <Stage
            width={viewportSize.width}
            height={viewportSize.height}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={(event) => finishMouseInput(event)}
            onMouseLeave={(event) => finishMouseInput(event)}
            onWheel={handleWheel}
          >
            <Layer listening={false}>
              <Group
                x={transform.offsetX}
                y={transform.offsetY}
                scaleX={transform.scale}
                scaleY={transform.scale}
              >
                <Rect
                  width={LOGICAL_PAGE_SIZE.width}
                  height={LOGICAL_PAGE_SIZE.height}
                  fill="#f7f2e8"
                  stroke="rgba(48, 41, 32, 0.14)"
                  strokeWidth={1}
                  strokeScaleEnabled={false}
                  shadowColor="rgba(45, 37, 26, 0.18)"
                  shadowBlur={18}
                  shadowOffsetY={8}
                  shadowOpacity={0.5}
                  shadowEnabled
                />
                <Group
                  clipX={0}
                  clipY={0}
                  clipWidth={LOGICAL_PAGE_SIZE.width}
                  clipHeight={LOGICAL_PAGE_SIZE.height}
                >
                  {children}
                </Group>
              </Group>
            </Layer>
          </Stage>
        ) : null}
      </div>
    );
  },
);
