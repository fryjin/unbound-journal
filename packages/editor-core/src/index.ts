export const LOGICAL_PAGE_SIZE = Object.freeze({
  width: 1000,
  height: 1400,
});

export type EditorMode =
  | 'select'
  | 'paper'
  | 'paper-erase'
  | 'text-input'
  | 'handwriting'
  | 'drawing'
  | 'ink-erase'
  | 'crop';

export {
  DEFAULT_VIEWPORT_EDGE_MARGIN,
  DEFAULT_VIEWPORT_PADDING,
  MAX_VIEWPORT_ZOOM,
  clampViewportTransform,
  createFitTransform,
  getFitScale,
  moveViewport,
  pageToScreen,
  screenToPage,
  zoomViewportAtPoint,
  type Point,
  type Size,
  type ViewportTransform,
} from './viewport';

export {
  DEFAULT_HISTORY_LIMIT,
  canRedo,
  canUndo,
  createCommandHistory,
  executeCommand,
  redoCommand,
  undoCommand,
  type CommandHistory,
  type EditorCommand,
} from './history';

export {
  areElementTransformsEqual,
  cloneContentElement,
  cloneElementTransform,
  cloneInkPath,
  cloneInkStyle,
  createDevelopmentPlaceholderElement,
  createElementTransform,
  decodeContentElement,
  decodeElementTransform,
  distancePointToPolyline,
  distancePointToSegment,
  elementLocalPointToPagePoint,
  findTopContentElementAtPoint,
  isPointInsideContentElement,
  pagePointToElementLocalPoint,
  translateElementTransform,
  type ContentElement,
  type ContentElementBase,
  type DevelopmentPlaceholderElement,
  type EditorSelectionState,
  type ElementTransform,
  type InkElement,
  type InkMode,
  type InkPath,
  type InkPoint,
  type InkStyle,
  type InkTool,
} from './content';
