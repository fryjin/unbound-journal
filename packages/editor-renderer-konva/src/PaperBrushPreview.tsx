import { LOGICAL_PAGE_SIZE, type Point, type Size } from '@unbound-journal/editor-core';
import { createPaintStroke, type PaperMaskStroke, type PaperRuntimeAsset } from '@unbound-journal/paper-engine';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import { Image as KonvaImage } from 'react-konva';
import type Konva from 'konva';
import { useImageAsset, type ImageLoadStatus } from './image-loader';
import { configureLogicalCanvas, renderTextureSourceCanvas } from './paper-raster';

export interface PaperBrushPreviewHandle {
  isReady: () => boolean;
  beginStroke: (point: Point, size: number) => boolean;
  appendPoint: (point: Point) => void;
  finishStroke: (strokeId: string) => PaperMaskStroke | null;
  cancelStroke: () => void;
  clearPreview: () => void;
}

export interface PaperBrushPreviewProps {
  asset: PaperRuntimeAsset | null;
  pageSize?: Size;
  onLoadStateChange?: (status: ImageLoadStatus) => void;
}

type ActiveStroke = {
  points: Point[];
  size: number;
};

export const PaperBrushPreview = forwardRef<PaperBrushPreviewHandle, PaperBrushPreviewProps>(
  function PaperBrushPreview(
    { asset, pageSize = LOGICAL_PAGE_SIZE, onLoadStateChange },
    forwardedRef,
  ) {
    const imageState = useImageAsset(asset?.variants.editor ?? '', onLoadStateChange);
    const imageNodeRef = useRef<Konva.Image | null>(null);
    const activeStrokeRef = useRef<ActiveStroke | null>(null);
    const textureCanvas = useMemo(() => document.createElement('canvas'), []);
    const previewCanvas = useMemo(() => document.createElement('canvas'), []);

    const redraw = () => imageNodeRef.current?.getLayer()?.batchDraw();

    const clearPreview = () => {
      configureLogicalCanvas(previewCanvas, pageSize);
      previewCanvas.getContext('2d')?.clearRect(0, 0, pageSize.width, pageSize.height);
      activeStrokeRef.current = null;
      redraw();
    };

    useEffect(() => {
      clearPreview();
    }, [asset?.manifest.paperVersionId]);

    useLayoutEffect(() => {
      configureLogicalCanvas(previewCanvas, pageSize);
      configureLogicalCanvas(textureCanvas, pageSize);
      if (!asset || imageState.status !== 'ready') return;
      renderTextureSourceCanvas(textureCanvas, asset, imageState.image, pageSize);
      redraw();
    }, [asset, imageState, pageSize, previewCanvas, textureCanvas]);

    const drawDot = (point: Point, size: number) => {
      const context = previewCanvas.getContext('2d');
      if (!context) return;
      const pattern = context.createPattern(textureCanvas, 'no-repeat');
      if (!pattern) return;
      context.save();
      context.fillStyle = pattern;
      context.beginPath();
      context.arc(point.x, point.y, Math.max(0.5, size / 2), 0, Math.PI * 2);
      context.fill();
      context.restore();
    };

    const drawSegment = (from: Point, to: Point, size: number) => {
      const context = previewCanvas.getContext('2d');
      if (!context) return;
      const pattern = context.createPattern(textureCanvas, 'no-repeat');
      if (!pattern) return;
      context.save();
      context.strokeStyle = pattern;
      context.lineWidth = Math.max(1, size);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
      context.restore();
    };

    useImperativeHandle(
      forwardedRef,
      () => ({
        isReady: () => Boolean(asset && imageState.status === 'ready'),
        beginStroke: (point: Point, size: number) => {
          if (!asset || imageState.status !== 'ready') return false;
          clearPreview();
          const active = { points: [{ ...point }], size };
          activeStrokeRef.current = active;
          drawDot(point, size);
          redraw();
          return true;
        },
        appendPoint: (point: Point) => {
          const active = activeStrokeRef.current;
          if (!active) return;
          const previous = active.points[active.points.length - 1];
          if (!previous) return;
          const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
          if (distance < Math.max(0.75, active.size * 0.015)) return;
          active.points.push({ ...point });
          drawSegment(previous, point, active.size);
          redraw();
        },
        finishStroke: (strokeId: string) => {
          const active = activeStrokeRef.current;
          if (!active || active.points.length === 0) return null;
          activeStrokeRef.current = null;
          return createPaintStroke(strokeId, active.points, active.size);
        },
        cancelStroke: clearPreview,
        clearPreview,
      }),
      [asset, imageState, pageSize, previewCanvas, textureCanvas],
    );

    if (!asset || imageState.status !== 'ready') return null;

    return (
      <KonvaImage
        ref={imageNodeRef}
        image={previewCanvas}
        width={pageSize.width}
        height={pageSize.height}
        listening={false}
        perfectDrawEnabled={false}
      />
    );
  },
);
