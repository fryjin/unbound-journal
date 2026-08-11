import {
  cloneElementTransform,
  type ContentElement,
  type ElementTransform,
  type InkElement,
  type InkPath,
} from '@unbound-journal/editor-core';
import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react';
import type Konva from 'konva';
import { Group, Rect, Shape, Text } from 'react-konva';

export interface ContentStackHandle {
  previewElementTransform: (elementId: string, transform: ElementTransform) => boolean;
  restoreElementTransform: (elementId: string) => void;
  restoreAllElementTransforms: () => void;
  previewInkElements: (elements: readonly InkElement[]) => void;
  restoreInkPreview: () => void;
}

export interface ContentStackProps {
  elements: readonly ContentElement[];
  selectedElementId: string | null;
}

function applyTransform(node: Konva.Group, transform: ElementTransform) {
  node.position({ x: transform.x, y: transform.y });
  node.rotation(transform.rotation);
  node.scale({ x: transform.scaleX, y: transform.scaleY });
}

function drawInkPaths(
  context: Konva.Context,
  shape: Konva.Shape,
  paths: readonly InkPath[],
  size: number,
) {
  for (const path of paths) {
    const first = path.points[0];
    if (!first) continue;

    if (path.points.length === 1) {
      context.beginPath();
      context.arc(first.x, first.y, Math.max(0.5, size / 2), 0, Math.PI * 2, false);
      context.closePath();
      context.fillShape(shape);
      continue;
    }

    context.beginPath();
    context.moveTo(first.x, first.y);
    for (let index = 1; index < path.points.length; index += 1) {
      const point = path.points[index];
      if (point) context.lineTo(point.x, point.y);
    }
    context.strokeShape(shape);
  }
}

export const ContentStack = forwardRef<ContentStackHandle, ContentStackProps>(
  function ContentStack({ elements, selectedElementId }, forwardedRef) {
    const nodeRefs = useRef(new Map<string, Konva.Group>());
    const inkShapeRefs = useRef(new Map<string, Konva.Shape>());
    const canonicalTransformsRef = useRef(new Map<string, ElementTransform>());

    canonicalTransformsRef.current = new Map(
      elements.map((element) => [element.id, cloneElementTransform(element.transform)]),
    );

    const restoreInkPreview = () => {
      let layer: Konva.Layer | null = null;
      for (const node of inkShapeRefs.current.values()) {
        node.setAttr('previewInkPaths', null);
        node.setAttr('previewInkHidden', false);
        layer ??= node.getLayer();
      }
      layer?.batchDraw();
    };

    useLayoutEffect(() => {
      restoreInkPreview();
    }, [elements]);

    useImperativeHandle(
      forwardedRef,
      () => ({
        previewElementTransform: (elementId: string, transform: ElementTransform) => {
          const node = nodeRefs.current.get(elementId);
          if (!node) return false;
          applyTransform(node, transform);
          node.getLayer()?.batchDraw();
          return true;
        },
        restoreElementTransform: (elementId: string) => {
          const node = nodeRefs.current.get(elementId);
          const transform = canonicalTransformsRef.current.get(elementId);
          if (!node || !transform) return;
          applyTransform(node, transform);
          node.getLayer()?.batchDraw();
        },
        restoreAllElementTransforms: () => {
          for (const [elementId, node] of nodeRefs.current) {
            const transform = canonicalTransformsRef.current.get(elementId);
            if (transform) applyTransform(node, transform);
          }
          nodeRefs.current.values().next().value?.getLayer()?.batchDraw();
        },
        previewInkElements: (nextElements: readonly InkElement[]) => {
          const byId = new Map(nextElements.map((element) => [element.id, element]));
          let layer: Konva.Layer | null = null;
          for (const [elementId, node] of inkShapeRefs.current) {
            const preview = byId.get(elementId);
            node.setAttr('previewInkHidden', !preview);
            node.setAttr('previewInkPaths', preview?.paths ?? null);
            layer ??= node.getLayer();
          }
          layer?.batchDraw();
        },
        restoreInkPreview,
      }),
      [],
    );

    return (
      <Group listening={false} name="content-stack">
        {elements.map((element) => {
          const selected = element.id === selectedElementId;

          if (element.type === 'placeholder') {
            return (
              <Group
                key={element.id}
                ref={(node: Konva.Group | null) => {
                  if (node) nodeRefs.current.set(element.id, node);
                  else nodeRefs.current.delete(element.id);
                }}
                x={element.transform.x}
                y={element.transform.y}
                rotation={element.transform.rotation}
                scaleX={element.transform.scaleX}
                scaleY={element.transform.scaleY}
                listening={false}
              >
                <Rect
                  width={element.width}
                  height={element.height}
                  cornerRadius={18}
                  fill="rgba(255,255,255,0.82)"
                  stroke={selected ? '#6157d9' : 'rgba(55,49,42,0.24)'}
                  strokeWidth={selected ? 6 : 3}
                  dash={selected ? [18, 10] : undefined}
                  shadowColor="rgba(40,34,28,0.16)"
                  shadowBlur={selected ? 18 : 10}
                  shadowOffsetY={6}
                  shadowOpacity={1}
                  perfectDrawEnabled={false}
                />
                <Text
                  x={22}
                  y={22}
                  width={Math.max(1, element.width - 44)}
                  text={element.label}
                  fontSize={34}
                  fontStyle="bold"
                  fill="#39342e"
                  listening={false}
                />
                <Text
                  x={22}
                  y={70}
                  width={Math.max(1, element.width - 44)}
                  text="P1.1 placeholder · renderer-independent"
                  fontSize={20}
                  fill="#746d63"
                  listening={false}
                />
              </Group>
            );
          }

          return (
            <Group
              key={element.id}
              ref={(node: Konva.Group | null) => {
                if (node) nodeRefs.current.set(element.id, node);
                else nodeRefs.current.delete(element.id);
              }}
              x={element.transform.x}
              y={element.transform.y}
              rotation={element.transform.rotation}
              scaleX={element.transform.scaleX}
              scaleY={element.transform.scaleY}
              listening={false}
            >
              <Shape
                ref={(node: Konva.Shape | null) => {
                  if (node) inkShapeRefs.current.set(element.id, node);
                  else inkShapeRefs.current.delete(element.id);
                }}
                sceneFunc={(context, shape) => {
                  if (shape.getAttr('previewInkHidden')) return;
                  const preview = shape.getAttr('previewInkPaths') as InkPath[] | null | undefined;
                  drawInkPaths(context, shape, preview ?? element.paths, element.style.size);
                }}
                stroke={element.style.color}
                fill={element.style.color}
                strokeWidth={element.style.size}
                lineCap="round"
                lineJoin="round"
                opacity={element.style.opacity}
                perfectDrawEnabled={false}
                shadowForStrokeEnabled={false}
                listening={false}
              />
              {selected ? (
                <Rect
                  x={-18}
                  y={-18}
                  width={36}
                  height={36}
                  cornerRadius={18}
                  fill="rgba(97,87,217,0.12)"
                  stroke="#6157d9"
                  strokeWidth={3}
                  listening={false}
                />
              ) : null}
            </Group>
          );
        })}
      </Group>
    );
  },
);
