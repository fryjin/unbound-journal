export const LOGICAL_PAGE_SIZE = Object.freeze({
  width: 1000,
  height: 1400,
});

export type EditorMode = 'select' | 'paper' | 'paper-erase';

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
