import { LOGICAL_PAGE_SIZE, type Point, type Size } from '@unbound-journal/editor-core';
import type {
  PaperLayer,
  PaperMaskStroke,
  PaperRuntimeAsset,
} from '@unbound-journal/paper-engine';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Group } from 'react-konva';
import {
  PaperMaskedTexture,
  type PaperMaskedTextureHandle,
} from './PaperMaskedTexture';
import type { PaperTextureLoadStatus } from './PaperTexture';

export interface PaperRenderLayer {
  layer: PaperLayer;
  asset: PaperRuntimeAsset;
  visible?: boolean;
}

export type PaperEraseCommit = Readonly<{
  layerId: string;
  stroke: PaperMaskStroke;
}>;

export interface PaperStackHandle {
  beginErase: (layerId: string, point: Point, size: number) => boolean;
  appendErasePoint: (point: Point) => void;
  finishErase: (strokeId: string) => PaperEraseCommit | null;
  cancelErase: () => void;
  getActiveEraseLayerId: () => string | null;
}

export interface PaperStackProps {
  layers: readonly PaperRenderLayer[];
  pageSize?: Size;
  onLayerLoadStateChange?: (layerId: string, status: PaperTextureLoadStatus) => void;
}

/**
 * Ordered paper stack, bottom → top.
 *
 * Every PaperLayer owns an isolated raster cache. P0.5 erasing mutates only the
 * target layer's renderer cache during the active gesture, then commits one
 * vector `erase` stroke back to the document on gesture end. This prevents a
 * renderer compositing operation from punching through lower PaperLayers.
 */
export const PaperStack = forwardRef<PaperStackHandle, PaperStackProps>(function PaperStack(
  {
    layers,
    pageSize = LOGICAL_PAGE_SIZE,
    onLayerLoadStateChange,
  },
  forwardedRef,
) {
  const layerHandlesRef = useRef(new Map<string, PaperMaskedTextureHandle>());
  const activeEraseLayerIdRef = useRef<string | null>(null);

  useImperativeHandle(
    forwardedRef,
    () => ({
      beginErase: (layerId: string, point: Point, size: number) => {
        const previousLayerId = activeEraseLayerIdRef.current;
        if (previousLayerId) layerHandlesRef.current.get(previousLayerId)?.cancelErase();

        const handle = layerHandlesRef.current.get(layerId);
        if (!handle?.beginErase(point, size)) {
          activeEraseLayerIdRef.current = null;
          return false;
        }

        activeEraseLayerIdRef.current = layerId;
        return true;
      },
      appendErasePoint: (point: Point) => {
        const layerId = activeEraseLayerIdRef.current;
        if (!layerId) return;
        layerHandlesRef.current.get(layerId)?.appendErasePoint(point);
      },
      finishErase: (strokeId: string) => {
        const layerId = activeEraseLayerIdRef.current;
        if (!layerId) return null;
        const handle = layerHandlesRef.current.get(layerId);
        const stroke = handle?.finishErase(strokeId) ?? null;
        activeEraseLayerIdRef.current = null;
        return stroke ? { layerId, stroke } : null;
      },
      cancelErase: () => {
        const layerId = activeEraseLayerIdRef.current;
        if (!layerId) return;
        layerHandlesRef.current.get(layerId)?.cancelErase();
        activeEraseLayerIdRef.current = null;
      },
      getActiveEraseLayerId: () => activeEraseLayerIdRef.current,
    }),
    [],
  );

  return (
    <Group listening={false}>
      {layers.map(({ layer, asset, visible }) =>
        visible === false ? null : (
          <Group key={layer.id} listening={false}>
            <PaperMaskedTexture
              ref={(handle: PaperMaskedTextureHandle | null) => {
                if (handle) layerHandlesRef.current.set(layer.id, handle);
                else layerHandlesRef.current.delete(layer.id);
              }}
              asset={asset}
              maskStrokes={layer.maskStrokes}
              texture={layer.texture}
              pageSize={pageSize}
              onLoadStateChange={(status: PaperTextureLoadStatus) => onLayerLoadStateChange?.(layer.id, status)}
            />
          </Group>
        ),
      )}
    </Group>
  );
});
