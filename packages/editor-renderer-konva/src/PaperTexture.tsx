import { LOGICAL_PAGE_SIZE, type Size } from '@unbound-journal/editor-core';
import type { PaperRuntimeAsset } from '@unbound-journal/paper-engine';
import { Group, Image as KonvaImage, Rect } from 'react-konva';
import { useImageAsset, type ImageLoadStatus } from './image-loader';

export type PaperTextureLoadStatus = ImageLoadStatus;

export interface PaperTextureProps {
  asset: PaperRuntimeAsset;
  pageSize?: Size;
  onLoadStateChange?: (status: PaperTextureLoadStatus) => void;
}

type LoadedPaperTextureProps = Omit<PaperTextureProps, 'pageSize'> & {
  pageSize: Size;
  image: HTMLImageElement;
};

function PatternPaper({ asset, pageSize, image }: LoadedPaperTextureProps) {
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

function FullSheetPaper({ asset, pageSize, image }: LoadedPaperTextureProps) {
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
