import {
  cloneInkStyle,
  type InkMode,
  type InkStyle,
  type Point,
} from '@unbound-journal/editor-core';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import type Konva from 'konva';
import { Line } from 'react-konva';

export interface InkStrokeDraft {
  mode: InkMode;
  style: InkStyle;
  points: Point[];
}

export interface InkStrokePreviewHandle {
  beginStroke: (point: Point, mode: InkMode, style: InkStyle) => boolean;
  appendPoint: (point: Point) => void;
  finishStroke: () => InkStrokeDraft | null;
  cancelStroke: () => void;
}

type ActiveInkStroke = InkStrokeDraft;

function flattenPoints(points: readonly Point[]): number[] {
  if (points.length === 0) return [];
  if (points.length === 1) {
    const point = points[0]!;
    return [point.x, point.y, point.x + 0.01, point.y + 0.01];
  }
  return points.flatMap((point) => [point.x, point.y]);
}

export const InkStrokePreview = forwardRef<InkStrokePreviewHandle>(
  function InkStrokePreview(_props, forwardedRef) {
    const lineRef = useRef<Konva.Line | null>(null);
    const activeRef = useRef<ActiveInkStroke | null>(null);

    const redraw = () => lineRef.current?.getLayer()?.batchDraw();

    const clear = () => {
      activeRef.current = null;
      const line = lineRef.current;
      if (!line) return;
      line.points([]);
      redraw();
    };

    useImperativeHandle(
      forwardedRef,
      () => ({
        beginStroke: (point, mode, style) => {
          clear();
          activeRef.current = {
            mode,
            style: cloneInkStyle(style),
            points: [{ ...point }],
          };
          const line = lineRef.current;
          if (!line) return false;
          line.stroke(style.color);
          line.strokeWidth(style.size);
          line.opacity(style.opacity);
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
          if (distance < Math.max(0.6, active.style.size * 0.08)) return;
          active.points.push({ ...point });
          lineRef.current?.points(flattenPoints(active.points));
          redraw();
        },
        finishStroke: () => {
          const active = activeRef.current;
          if (!active || active.points.length === 0) return null;
          const draft: InkStrokeDraft = {
            mode: active.mode,
            style: cloneInkStyle(active.style),
            points: active.points.map((point) => ({ ...point })),
          };
          clear();
          return draft;
        },
        cancelStroke: clear,
      }),
      [],
    );

    return (
      <Line
        ref={lineRef}
        points={[]}
        stroke="#35312c"
        strokeWidth={12}
        lineCap="round"
        lineJoin="round"
        tension={0}
        listening={false}
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
      />
    );
  },
);
