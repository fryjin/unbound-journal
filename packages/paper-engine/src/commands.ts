import type { EditorCommand } from '@unbound-journal/editor-core';
import type { PaperLayer, PaperMaskStroke } from './model';

export type PaperHistoryState = PaperLayer[];
export type PaperHistoryAction = 'paint' | 'erase' | 'fill' | 'replace' | 'clear';

export interface PaperHistoryCommand extends EditorCommand<PaperHistoryState> {
  readonly action: PaperHistoryAction;
}

function cloneStroke(stroke: PaperMaskStroke): PaperMaskStroke {
  return {
    ...stroke,
    points: stroke.points.map((point) => ({ ...point })),
  };
}

function cloneLayer(layer: PaperLayer): PaperLayer {
  return {
    ...layer,
    texture: { ...layer.texture },
    maskStrokes: layer.maskStrokes.map(cloneStroke),
  };
}

function replaceLayerById(
  layers: readonly PaperLayer[],
  layerId: string,
  replacement: PaperLayer,
): PaperLayer[] {
  let changed = false;
  const next = layers.map((layer) => {
    if (layer.id !== layerId) return layer;
    changed = true;
    return cloneLayer(replacement);
  });
  return changed ? next : (layers as PaperLayer[]);
}

export function createAppendPaperMaskStrokeCommand(
  id: string,
  layerId: string,
  stroke: PaperMaskStroke,
  action: Extract<PaperHistoryAction, 'paint' | 'erase' | 'fill'>,
): PaperHistoryCommand {
  const committedStroke = cloneStroke(stroke);

  return {
    id,
    kind: 'paper.append-mask-stroke',
    action,
    apply: (layers) => {
      let changed = false;
      const next = layers.map((layer) => {
        if (layer.id !== layerId) return layer;
        if (layer.maskStrokes.some((item) => item.id === committedStroke.id)) return layer;
        changed = true;
        return {
          ...layer,
          maskStrokes: [...layer.maskStrokes, cloneStroke(committedStroke)],
        };
      });
      return changed ? next : layers;
    },
    revert: (layers) => {
      let changed = false;
      const next = layers.map((layer) => {
        if (layer.id !== layerId) return layer;
        const maskStrokes = layer.maskStrokes.filter((item) => item.id !== committedStroke.id);
        if (maskStrokes.length === layer.maskStrokes.length) return layer;
        changed = true;
        return { ...layer, maskStrokes };
      });
      return changed ? next : layers;
    },
  };
}

export function createAddPaperLayerCommand(
  id: string,
  layer: PaperLayer,
  action: Extract<PaperHistoryAction, 'paint' | 'fill'>,
): PaperHistoryCommand {
  const committedLayer = cloneLayer(layer);

  return {
    id,
    kind: 'paper.add-layer',
    action,
    apply: (layers) => {
      if (layers.some((item) => item.id === committedLayer.id)) return layers;
      return [...layers, cloneLayer(committedLayer)];
    },
    revert: (layers) => {
      const next = layers.filter((item) => item.id !== committedLayer.id);
      return next.length === layers.length ? layers : next;
    },
  };
}

export function createReplacePaperLayerCommand(
  id: string,
  previousLayer: PaperLayer,
  nextLayer: PaperLayer,
): PaperHistoryCommand {
  const before = cloneLayer(previousLayer);
  const after = cloneLayer(nextLayer);

  return {
    id,
    kind: 'paper.replace-layer',
    action: 'replace',
    apply: (layers) => replaceLayerById(layers, before.id, after),
    revert: (layers) => replaceLayerById(layers, before.id, before),
  };
}

export function createClearPaperLayersCommand(
  id: string,
  previousLayers: readonly PaperLayer[],
): PaperHistoryCommand {
  const snapshot = previousLayers.map(cloneLayer);

  return {
    id,
    kind: 'paper.clear-layers',
    action: 'clear',
    apply: (layers) => (layers.length === 0 ? layers : []),
    revert: (layers) => (layers.length === 0 ? snapshot.map(cloneLayer) : layers),
  };
}
