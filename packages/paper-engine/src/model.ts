import type { Point } from '@unbound-journal/editor-core';
import type { PaperTextureDefaults } from './asset-contract';
import type { PaperRuntimeAsset } from './catalog';

export interface PaperMaskStroke {
  id: string;
  operation: 'paint' | 'erase';
  points: Point[];
  size: number;
}

export interface PaperLayerTexture {
  scale: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
}

export interface PaperLayer {
  id: string;
  paperVersionId: string;
  texture: PaperLayerTexture;
  maskStrokes: PaperMaskStroke[];
  createdAt: string;
}

export function createPaintStroke(id: string, points: readonly Point[], size: number): PaperMaskStroke {
  return {
    id,
    operation: 'paint',
    points: points.map((point) => ({ ...point })),
    size,
  };
}

export function createPaperLayer(
  id: string,
  paperVersionId: string,
  texture: PaperTextureDefaults,
  createdAt: string,
  initialStrokes: readonly PaperMaskStroke[] = [],
): PaperLayer {
  return {
    id,
    paperVersionId,
    texture: {
      scale: texture.defaultScale,
      rotation: texture.rotation,
      offsetX: texture.offsetX,
      offsetY: texture.offsetY,
    },
    maskStrokes: initialStrokes.map(clonePaperMaskStroke),
    createdAt,
  };
}

export function createPaperLayerFromAsset(
  id: string,
  asset: PaperRuntimeAsset,
  createdAt: string,
  initialStrokes: readonly PaperMaskStroke[] = [],
): PaperLayer {
  return createPaperLayer(
    id,
    asset.manifest.paperVersionId,
    asset.manifest.texture,
    createdAt,
    initialStrokes,
  );
}

export function appendPaperMaskStroke(layer: PaperLayer, stroke: PaperMaskStroke): PaperLayer {
  return {
    ...layer,
    maskStrokes: [...layer.maskStrokes, clonePaperMaskStroke(stroke)],
  };
}

function clonePaperMaskStroke(stroke: PaperMaskStroke): PaperMaskStroke {
  return {
    ...stroke,
    points: stroke.points.map((point) => ({ ...point })),
  };
}
