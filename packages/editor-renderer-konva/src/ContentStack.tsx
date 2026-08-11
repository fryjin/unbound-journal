import {
  cloneElementTransform,
  type ContentElement,
  type ElementTransform,
} from '@unbound-journal/editor-core';
import {
  forwardRef,
  useImperativeHandle,
  useRef,
} from 'react';
import type Konva from 'konva';
import { Group, Rect, Text } from 'react-konva';

export interface ContentStackHandle {
  previewElementTransform: (elementId: string, transform: ElementTransform) => boolean;
  restoreElementTransform: (elementId: string) => void;
  restoreAllElementTransforms: () => void;
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

export const ContentStack = forwardRef<ContentStackHandle, ContentStackProps>(
  function ContentStack({ elements, selectedElementId }, forwardedRef) {
    const nodeRefs = useRef(new Map<string, Konva.Group>());
    const canonicalTransformsRef = useRef(new Map<string, ElementTransform>());

    canonicalTransformsRef.current = new Map(
      elements.map((element) => [element.id, cloneElementTransform(element.transform)]),
    );

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
      }),
      [],
    );

    return (
      <Group listening={false} name="content-stack">
        {elements.map((element) => {
          if (element.type !== 'placeholder') return null;
          const selected = element.id === selectedElementId;
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
                stroke={selected ? "#6157d9" : "rgba(55,49,42,0.24)"}
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
        })}
      </Group>
    );
  },
);
