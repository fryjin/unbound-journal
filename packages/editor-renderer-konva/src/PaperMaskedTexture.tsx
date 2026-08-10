import { LOGICAL_PAGE_SIZE, type Size } from '@unbound-journal/editor-core';
import type {
  PaperLayerTexture,
  PaperMaskStroke,
  PaperRuntimeAsset,
} from '@unbound-journal/paper-engine';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Image as KonvaImage } from 'react-konva';
import type Konva from 'konva';
import { useImageAsset, type ImageLoadStatus } from './image-loader';
import { renderMaskedPaperToCanvas } from './paper-raster';

export interface PaperMaskedTextureProps {
  asset: PaperRuntimeAsset;
  maskStrokes: readonly PaperMaskStroke[];
  texture?: PaperLayerTexture;
  pageSize?: Size;
  onLoadStateChange?: (status: ImageLoadStatus) => void;
}

export function PaperMaskedTexture({
  asset,
  maskStrokes,
  texture,
  pageSize = LOGICAL_PAGE_SIZE,
  onLoadStateChange,
}: PaperMaskedTextureProps) {
  const imageState = useImageAsset(asset.variants.editor, onLoadStateChange);
  const imageNodeRef = useRef<Konva.Image | null>(null);
  const outputCanvas = useMemo(() => document.createElement('canvas'), []);
  const maskCanvas = useMemo(() => document.createElement('canvas'), []);

  useLayoutEffect(() => {
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
    imageNodeRef.current?.getLayer()?.batchDraw();
  }, [asset, imageState, maskCanvas, maskStrokes, outputCanvas, pageSize, texture]);

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
}
