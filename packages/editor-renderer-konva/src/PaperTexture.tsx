import { LOGICAL_PAGE_SIZE, type Size } from '@unbound-journal/editor-core';
import type { PaperRuntimeAsset } from '@unbound-journal/paper-engine';
import { useEffect, useRef, useState } from 'react';
import { Group, Image as KonvaImage, Rect } from 'react-konva';

export type PaperTextureLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

type ImageState =
  | { status: 'idle' | 'loading'; image: null }
  | { status: 'ready'; image: HTMLImageElement }
  | { status: 'error'; image: null };

export interface PaperTextureProps {
  asset: PaperRuntimeAsset;
  pageSize?: Size;
  onLoadStateChange?: (status: PaperTextureLoadStatus) => void;
}

function useImageAsset(url: string, onLoadStateChange?: (status: PaperTextureLoadStatus) => void) {
  const [state, setState] = useState<ImageState>({ status: 'idle', image: null });
  const callbackRef = useRef(onLoadStateChange);

  useEffect(() => {
    callbackRef.current = onLoadStateChange;
  }, [onLoadStateChange]);

  useEffect(() => {
    let active = true;
    const image = new window.Image();
    image.decoding = 'async';
    image.crossOrigin = 'anonymous';

    setState({ status: 'loading', image: null });
    callbackRef.current?.('loading');

    image.onload = () => {
      if (!active) return;
      setState({ status: 'ready', image });
      callbackRef.current?.('ready');
    };
    image.onerror = () => {
      if (!active) return;
      setState({ status: 'error', image: null });
      callbackRef.current?.('error');
    };
    image.src = url;

    return () => {
      active = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [url]);

  return state;
}

function PatternPaper({ asset, pageSize, image }: PaperTextureProps & { image: HTMLImageElement }) {
  const { texture } = asset.manifest;
  const scale = Math.max(0.01, texture.defaultScale);

  return (
    <Rect
      width={pageSize.width}
      height={pageSize.height}
      fillPatternImage={image}
      fillPatternRepeat="repeat"
      fillPatternScaleX={scale}
      fillPatternScaleY={scale}
      fillPatternRotation={texture.rotation}
      fillPatternOffsetX={texture.offsetX / scale}
      fillPatternOffsetY={texture.offsetY / scale}
      perfectDrawEnabled={false}
      listening={false}
    />
  );
}

function FullSheetPaper({ asset, pageSize, image }: PaperTextureProps & { image: HTMLImageElement }) {
  const { texture } = asset.manifest;
  const naturalWidth = Math.max(1, image.naturalWidth || image.width);
  const naturalHeight = Math.max(1, image.naturalHeight || image.height);
  const coverScale = Math.max(pageSize.width / naturalWidth, pageSize.height / naturalHeight);
  const renderedWidth = naturalWidth * coverScale;
  const renderedHeight = naturalHeight * coverScale;
  const textureScale = Math.max(0.01, texture.defaultScale);

  return (
    <Group
      x={pageSize.width / 2 + texture.offsetX}
      y={pageSize.height / 2 + texture.offsetY}
      rotation={texture.rotation}
      scaleX={textureScale}
      scaleY={textureScale}
      listening={false}
    >
      <KonvaImage
        image={image}
        x={-renderedWidth / 2}
        y={-renderedHeight / 2}
        width={renderedWidth}
        height={renderedHeight}
        listening={false}
        perfectDrawEnabled={false}
      />
    </Group>
  );
}

export function PaperTexture({
  asset,
  pageSize = LOGICAL_PAGE_SIZE,
  onLoadStateChange,
}: PaperTextureProps) {
  const imageState = useImageAsset(asset.variants.editor, onLoadStateChange);

  if (imageState.status !== 'ready') return null;

  return asset.manifest.renderMode === 'tile' ? (
    <PatternPaper asset={asset} pageSize={pageSize} image={imageState.image} />
  ) : (
    <FullSheetPaper asset={asset} pageSize={pageSize} image={imageState.image} />
  );
}
