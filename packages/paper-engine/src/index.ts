import type { Point } from '@unbound-journal/editor-core';

export * from './asset-contract';
export * from './catalog';

export interface PaperMaskStroke {
  id: string;
  operation: 'paint' | 'erase';
  points: Point[];
  size: number;
}

export interface PaperLayer {
  id: string;
  paperVersionId: string;
  texture: {
    scale: number;
    rotation: number;
    offsetX: number;
    offsetY: number;
  };
  maskStrokes: PaperMaskStroke[];
  createdAt: string;
}
