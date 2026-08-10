import { LOGICAL_PAGE_SIZE, type Point, type Size } from '@unbound-journal/editor-core';
import {
  createEraseStroke,
  type PaperLayerTexture,
  type PaperMaskStroke,
  type PaperRuntimeAsset,
} from '@unbound-journal/paper-engine';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import { Image as KonvaImage } from 'react-konva';
import type Konva from 'konva';
import { useImageAsset, type ImageLoadStatus } from './image-loader';
import { renderMaskedPaperToCanvas } from './paper-raster';

export interface PaperMaskedTextureHandle {
  isReady: () => boolean;
  beginErase: (point: Point, size: number) => boolean;
  appendErasePoint: (point: Point) => void;
  finishErase: (strokeId: string) => PaperMaskStroke | null;
  cancelErase: () => void;
}

export interface PaperMaskedTextureProps {
  asset: PaperRuntimeAsset;
  maskStrokes: readonly PaperMaskStroke[];
  texture?: PaperLayerTexture;
  pageSize?: Size;
  onLoadStateChange?: (status: ImageLoadStatus) => void;
}

type ActiveEraseStroke = {
  points: Point[];
  size: number;
};

export const PaperMaskedTexture = forwardRef<PaperMaskedTextureHandle, PaperMaskedTextureProps>(
  function PaperMaskedTexture(
    {
      asset,
      maskStrokes,
      texture,
      pageSize = LOGICAL_PAGE_SIZE,
      onLoadStateChange,
    },
    forwardedRef,
  ) {
    const imageState = useImageAsset(asset.variants.editor, onLoadStateChange);
    const imageNodeRef = useRef<Konva.Image | null>(null);
    const activeEraseRef = useRef<ActiveEraseStroke | null>(null);
    const outputCanvas = useMemo(() => document.createElement('canvas'), []);
    const maskCanvas = useMemo(() => document.createElement('canvas'), []);

    const redraw = useCallback(() => imageNodeRef.current?.getLayer()?.batchDraw(), []);

    const renderCommitted = useCallback(() => {
      if (imageState.status !== 'ready') return;
      renderMaskedPaperToCanvas(
        outputCanvas,
        maskCanvas,
        asset,
        imageState.image,
        maskStrokes,
        pageSize,
        texture,
      );
      redraw();
    }, [asset, imageState, maskCanvas, maskStrokes, outputCanvas, pageSize, redraw, texture]);

    useLayoutEffect(() => {
      activeEraseRef.current = null;
      renderCommitted();
    }, [renderCommitted]);

    const eraseDot = useCallback(
      (point: Point, size: number) => {
        const context = outputCanvas.getContext('2d');
        if (!context) return;
        context.save();
        context.globalCompositeOperation = 'destination-out';
        context.fillStyle = '#000';
        context.beginPath();
        context.arc(point.x, point.y, Math.max(0.5, size / 2), 0, Math.PI * 2);
        context.fill();
        context.restore();
      },
      [outputCanvas],
    );

    const eraseSegment = useCallback(
      (from: Point, to: Point, size: number) => {
        const context = outputCanvas.getContext('2d');
        if (!context) return;
        context.save();
        context.globalCompositeOperation = 'destination-out';
        context.strokeStyle = '#000';
        context.lineWidth = Math.max(1, size);
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.stroke();
        context.restore();
      },
      [outputCanvas],
    );

    useImperativeHandle(
      forwardedRef,
      () => ({
        isReady: () => imageState.status === 'ready',
        beginErase: (point: Point, size: number) => {
          if (imageState.status !== 'ready') return false;
          activeEraseRef.current = {
            points: [{ ...point }],
            size,
          };
          eraseDot(point, size);
          redraw();
          return true;
        },
        appendErasePoint: (point: Point) => {
          const active = activeEraseRef.current;
          if (!active) return;
          const previous = active.points[active.points.length - 1];
          if (!previous) return;
          const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
          if (distance < Math.max(0.75, active.size * 0.015)) return;
          active.points.push({ ...point });
          eraseSegment(previous, point, active.size);
          redraw();
        },
        finishErase: (strokeId: string) => {
          const active = activeEraseRef.current;
          if (!active || active.points.length === 0) return null;
          activeEraseRef.current = null;
          return createEraseStroke(strokeId, active.points, active.size);
        },
        cancelErase: () => {
          if (!activeEraseRef.current) return;
          activeEraseRef.current = null;
          renderCommitted();
        },
      }),
      [eraseDot, eraseSegment, imageState, redraw, renderCommitted],
    );

    if (imageState.status !== 'ready' || maskStrokes.length === 0) return null;

    return (
      <KonvaImage
        ref={imageNodeRef}
        image={outputCanvas}
        width={pageSize.width}
        height={pageSize.height}
        listening={false}
        perfectDrawEnabled={false}
      />
    );
  },
);
