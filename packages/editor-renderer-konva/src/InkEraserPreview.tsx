import type { Point } from '@unbound-journal/editor-core';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import type Konva from 'konva';
import { Line } from 'react-konva';

export interface InkEraserPreviewHandle {
  beginErase: (point: Point, size: number) => boolean;
  appendPoint: (point: Point) => void;
  finishErase: () => Point[] | null;
  cancelErase: () => void;
}

type ActiveErase = {
  points: Point[];
  size: number;
};

function flattenPoints(points: readonly Point[]): number[] {
  if (points.length === 0) return [];
  if (points.length === 1) {
    const point = points[0]!;
    return [point.x, point.y, point.x + 0.01, point.y + 0.01];
  }
  return points.flatMap((point) => [point.x, point.y]);
}

export const InkEraserPreview = forwardRef<InkEraserPreviewHandle>(
  function InkEraserPreview(_props, forwardedRef) {
    const lineRef = useRef<Konva.Line | null>(null);
    const activeRef = useRef<ActiveErase | null>(null);

    const redraw = () => lineRef.current?.getLayer()?.batchDraw();
    const clear = () => {
      activeRef.current = null;
      lineRef.current?.points([]);
      redraw();
    };

    useImperativeHandle(
      forwardedRef,
      () => ({
        beginErase: (point, size) => {
          clear();
          activeRef.current = { points: [{ ...point }], size };
          const line = lineRef.current;
          if (!line) return false;
          line.strokeWidth(size);
          line.points(flattenPoints(activeRef.current.points));
          redraw();
          return true;
        },
        appendPoint: (point) => {
          const active = activeRef.current;
          if (!active) return;
          const previous = active.points[active.points.length - 1];
          if (!previous) return;
          const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
          if (distance < Math.max(1, active.size * 0.06)) return;
          active.points.push({ ...point });
          lineRef.current?.points(flattenPoints(active.points));
          redraw();
        },
        finishErase: () => {
          const active = activeRef.current;
          if (!active || active.points.length === 0) return null;
          const points = active.points.map((point) => ({ ...point }));
          clear();
          return points;
        },
        cancelErase: clear,
      }),
      [],
    );

    return (
      <Line
        ref={lineRef}
        points={[]}
        stroke="rgba(86,76,65,0.18)"
        strokeWidth={80}
        lineCap="round"
        lineJoin="round"
        listening={false}
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
      />
    );
  },
);
