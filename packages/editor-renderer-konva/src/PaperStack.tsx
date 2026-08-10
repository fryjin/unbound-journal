import { LOGICAL_PAGE_SIZE, type Size } from '@unbound-journal/editor-core';
import type { PaperRuntimeAsset } from '@unbound-journal/paper-engine';
import { Group } from 'react-konva';
import { PaperTexture, type PaperTextureLoadStatus } from './PaperTexture';

export interface PaperRenderLayer {
  id: string;
  asset: PaperRuntimeAsset;
  visible?: boolean;
}

export interface PaperStackProps {
  layers: readonly PaperRenderLayer[];
  pageSize?: Size;
  onLayerLoadStateChange?: (layerId: string, status: PaperTextureLoadStatus) => void;
}

/**
 * Renderer-only ordered paper stack. Layers are drawn bottom → top.
 * P0.3 renders complete textures; P0.4 will supply per-layer mask compositing
 * without changing the PaperRuntimeAsset → texture rendering contract.
 */
export function PaperStack({
  layers,
  pageSize = LOGICAL_PAGE_SIZE,
  onLayerLoadStateChange,
}: PaperStackProps) {
  return (
    <Group listening={false}>
      {layers.map((layer) =>
        layer.visible === false ? null : (
          <Group key={layer.id} listening={false}>
            <PaperTexture
              asset={layer.asset}
              pageSize={pageSize}
              onLoadStateChange={(status) => onLayerLoadStateChange?.(layer.id, status)}
            />
          </Group>
        ),
      )}
    </Group>
  );
}
