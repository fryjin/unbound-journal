export interface EditorCommand<State> {
  readonly id: string;
  readonly kind: string;
  apply(state: State): State;
  revert(state: State): State;
}

export interface CommandHistory<State> {
  readonly present: State;
  readonly undoStack: readonly EditorCommand<State>[];
  readonly redoStack: readonly EditorCommand<State>[];
  readonly limit: number;
}

export const DEFAULT_HISTORY_LIMIT = 100;

export function createCommandHistory<State>(
  initialState: State,
  limit = DEFAULT_HISTORY_LIMIT,
): CommandHistory<State> {
  return {
    present: initialState,
    undoStack: [],
    redoStack: [],
    limit: Math.max(1, Math.floor(limit)),
  };
}

export function executeCommand<State>(
  history: CommandHistory<State>,
  command: EditorCommand<State>,
): CommandHistory<State> {
  const nextPresent = command.apply(history.present);
  if (Object.is(nextPresent, history.present)) return history;

  const nextUndoStack = [...history.undoStack, command];
  const overflow = Math.max(0, nextUndoStack.length - history.limit);

  return {
    ...history,
    present: nextPresent,
    undoStack: overflow > 0 ? nextUndoStack.slice(overflow) : nextUndoStack,
    redoStack: [],
  };
}

export function undoCommand<State>(history: CommandHistory<State>): CommandHistory<State> {
  const command = history.undoStack[history.undoStack.length - 1];
  if (!command) return history;

  return {
    ...history,
    present: command.revert(history.present),
    undoStack: history.undoStack.slice(0, -1),
    redoStack: [...history.redoStack, command],
  };
}

export function redoCommand<State>(history: CommandHistory<State>): CommandHistory<State> {
  const command = history.redoStack[history.redoStack.length - 1];
  if (!command) return history;

  return {
    ...history,
    present: command.apply(history.present),
    undoStack: [...history.undoStack, command],
    redoStack: history.redoStack.slice(0, -1),
  };
}

export function canUndo<State>(history: CommandHistory<State>): boolean {
  return history.undoStack.length > 0;
}

export function canRedo<State>(history: CommandHistory<State>): boolean {
  return history.redoStack.length > 0;
}
