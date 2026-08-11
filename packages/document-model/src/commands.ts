import {
  cloneContentElement,
  cloneElementTransform,
  type ContentElement,
  type EditorCommand,
  type ElementTransform,
} from '@unbound-journal/editor-core';
import type { PaperLayer } from '@unbound-journal/paper-engine';
import type { PageDocument } from './document';

export type PageDocumentCommand = EditorCommand<PageDocument>;

function replaceElements(document: PageDocument, elements: ContentElement[]): PageDocument {
  return {
    ...document,
    elements,
  };
}

function replacePaperLayers(document: PageDocument, paperLayers: PaperLayer[]): PageDocument {
  return {
    ...document,
    paperLayers,
  };
}

export function liftPaperCommand(
  command: EditorCommand<PaperLayer[]>,
): PageDocumentCommand {
  return {
    id: command.id,
    kind: command.kind,
    apply: (document) => {
      const nextLayers = command.apply(document.paperLayers);
      return Object.is(nextLayers, document.paperLayers)
        ? document
        : replacePaperLayers(document, nextLayers);
    },
    revert: (document) => {
      const previousLayers = command.revert(document.paperLayers);
      return Object.is(previousLayers, document.paperLayers)
        ? document
        : replacePaperLayers(document, previousLayers);
    },
  };
}

export function createAddContentElementCommand(
  id: string,
  element: ContentElement,
  index?: number,
): PageDocumentCommand {
  const snapshot = cloneContentElement(element);

  return {
    id,
    kind: 'content.add-element',
    apply: (document) => {
      if (document.elements.some((item) => item.id === snapshot.id)) return document;
      const insertionIndex = Math.max(0, Math.min(index ?? document.elements.length, document.elements.length));
      const elements = [...document.elements];
      elements.splice(insertionIndex, 0, cloneContentElement(snapshot));
      return replaceElements(document, elements);
    },
    revert: (document) => {
      const elements = document.elements.filter((item) => item.id !== snapshot.id);
      return elements.length === document.elements.length ? document : replaceElements(document, elements);
    },
  };
}

export function createRemoveContentElementCommand(
  id: string,
  element: ContentElement,
  index: number,
): PageDocumentCommand {
  const snapshot = cloneContentElement(element);
  const originalIndex = Math.max(0, index);

  return {
    id,
    kind: 'content.remove-element',
    apply: (document) => {
      const elements = document.elements.filter((item) => item.id !== snapshot.id);
      return elements.length === document.elements.length ? document : replaceElements(document, elements);
    },
    revert: (document) => {
      if (document.elements.some((item) => item.id === snapshot.id)) return document;
      const elements = [...document.elements];
      elements.splice(Math.min(originalIndex, elements.length), 0, cloneContentElement(snapshot));
      return replaceElements(document, elements);
    },
  };
}

function replaceElementTransform(
  document: PageDocument,
  elementId: string,
  transform: ElementTransform,
  updatedAt: string,
): PageDocument {
  let changed = false;
  const elements = document.elements.map((element) => {
    if (element.id !== elementId) return element;
    changed = true;
    return {
      ...element,
      transform: cloneElementTransform(transform),
      updatedAt,
    } as ContentElement;
  });
  return changed ? replaceElements(document, elements) : document;
}

export function createTransformContentElementCommand(
  id: string,
  elementId: string,
  previousTransform: ElementTransform,
  nextTransform: ElementTransform,
  previousUpdatedAt: string,
  nextUpdatedAt: string,
): PageDocumentCommand {
  const before = cloneElementTransform(previousTransform);
  const after = cloneElementTransform(nextTransform);

  return {
    id,
    kind: 'content.transform-element',
    apply: (document) => replaceElementTransform(document, elementId, after, nextUpdatedAt),
    revert: (document) => replaceElementTransform(document, elementId, before, previousUpdatedAt),
  };
}

function moveElementToIndex(
  document: PageDocument,
  elementId: string,
  targetIndex: number,
): PageDocument {
  const currentIndex = document.elements.findIndex((element) => element.id === elementId);
  if (currentIndex < 0) return document;
  const clampedTarget = Math.max(0, Math.min(targetIndex, document.elements.length - 1));
  if (currentIndex === clampedTarget) return document;

  const elements = [...document.elements];
  const [element] = elements.splice(currentIndex, 1);
  if (!element) return document;
  elements.splice(clampedTarget, 0, element);
  return replaceElements(document, elements);
}

export function createReorderContentElementCommand(
  id: string,
  elementId: string,
  previousIndex: number,
  nextIndex: number,
): PageDocumentCommand {
  return {
    id,
    kind: 'content.reorder-element',
    apply: (document) => moveElementToIndex(document, elementId, nextIndex),
    revert: (document) => moveElementToIndex(document, elementId, previousIndex),
  };
}
