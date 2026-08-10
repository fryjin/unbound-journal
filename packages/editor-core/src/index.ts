export const LOGICAL_PAGE_SIZE = Object.freeze({
  width: 1000,
  height: 1400,
});

export type Point = Readonly<{
  x: number;
  y: number;
}>;

export type EditorMode = 'select' | 'paper' | 'paper-erase';
