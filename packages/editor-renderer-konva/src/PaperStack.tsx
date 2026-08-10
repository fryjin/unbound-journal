import { LOGICAL_PAGE_SIZE, type Size } from '@unbound-journal/editor-core';
import type { PaperLayer, PaperRuntimeAsset } from '@unbound-journal/paper-engine';
import { Group } from 'react-konva';
import { PaperMaskedTexture } from './PaperMaskedTexture';
import type { PaperTextureLoadStatus } from './PaperTexture';

export interface PaperRenderLayer {
  layer: PaperLayer;
  asset: PaperRuntimeAsset;
  visible?: boolean;
}

export interface PaperStackProps {
  layers: readonly PaperRenderLayer[];
  pageSize?: Size;
  onLayerLoadStateChange?: (layerId: string, status: PaperTextureLoadStatus) => void;
}

/**
 * Ordered paper stack, bottom → top.
 * Logical source remains Texture + vector MaskStroke[]; each layer creates an
 * isolated raster cache so future erase operations cannot punch through lower layers.
 */
export function PaperStack({
  layers,
  pageSize = LOGICAL_PAGE_SIZE,
  onLayerLoadStateChange,
}: PaperStackProps) {
  return (
    <Group listening={false}>
      {layers.map(({ layer, asset, visible }) =>
        visible === false ? null : (
          <Group key={layer.id} listening={false}>
            <PaperMaskedTexture
              asset={asset}
              maskStrokes={layer.maskStrokes}
              texture={layer.texture}
              pageSize={pageSize}
              onLoadStateChange={(status) => onLayerLoadStateChange?.(layer.id, status)}
            />
          </Group>
        ),
      )}
    </Group>
  );
}
