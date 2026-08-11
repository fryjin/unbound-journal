import {
  LOGICAL_PAGE_SIZE,
  areElementTransformsEqual,
  canRedo as historyCanRedo,
  canUndo as historyCanUndo,
  createCommandHistory,
  createDevelopmentPlaceholderElement,
  createElementTransform,
  executeCommand,
  findTopContentElementAtPoint,
  redoCommand,
  translateElementTransform,
  undoCommand,
  type CommandHistory,
  type ContentElement,
  type ElementTransform,
  type InkElement,
  type InkMode,
  type InkStyle,
  type InkTool,
  type Point,
} from '@unbound-journal/editor-core';
import {
  ContentStack,
  InkEraserPreview,
  InkStrokePreview,
  PageViewport,
  PaperBrushPreview,
  PaperStack,
  type ContentStackHandle,
  type InkEraserPreviewHandle,
  type InkStrokePreviewHandle,
  type PageInputEvent,
  type PageViewportHandle,
  type PageViewportState,
  type PaperBrushPreviewHandle,
  type PaperRenderLayer,
  type PaperStackHandle,
  type PaperTextureLoadStatus,
} from '@unbound-journal/editor-renderer-konva';
import {
  createAddPaperLayerCommand,
  createAppendPaperMaskStrokeCommand,
  createClearPaperLayersCommand,
  createFillPageStroke,
  createPaperLayerFromAsset,
  createReplacePaperLayerCommand,
  isPointVisibleInPaperLayer,
  loadPaperPackIndex,
  loadPaperRuntimeAsset,
  replacePaperLayerFromAsset,
  type PaperAssetLocale,
  type PaperCatalogEntry,
  type PaperHistoryCommand,
  type PaperPackIndex,
  type PaperRuntimeAsset,
} from '@unbound-journal/paper-engine';
import {
  createAddContentElementCommand,
  createPageDocument,
  createRemoveContentElementCommand,
  createReorderContentElementCommand,
  createReplaceContentElementsCommand,
  createTransformContentElementCommand,
  decodePageDocument,
  liftPaperCommand,
  withPageDocumentUpdatedAt,
  type PageDocument,
  type PageDocumentCommand,
} from '@unbound-journal/document-model';
import {
  countInkElements,
  countInkPaths,
  createInkElement,
  eraseInkElements,
} from '@unbound-journal/ink-engine';
import {
  createDebouncedAutosave,
  createIndexedDbDocumentStorage,
  isIndexedDbAvailable,
  type AutosaveStatus,
  type DebouncedAutosaveController,
} from '@unbound-journal/storage';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { P0QaPanel } from './qa/P0QaPanel';
import { isP0QaMode } from './qa/p0-qa';

const tools = ['paper', 'media', 'text', 'draw'] as const;
const DEFAULT_BRUSH_SIZE = 180;
const DEFAULT_ERASER_SIZE = 180;
const DEFAULT_HANDWRITING_SIZE = 14;
const DEFAULT_DRAWING_SIZE = 44;
const DEFAULT_INK_ERASER_SIZE = 84;
const MIN_TOOL_SIZE = 60;
const MAX_TOOL_SIZE = 360;
const MIN_HANDWRITING_SIZE = 4;
const MAX_HANDWRITING_SIZE = 36;
const MIN_DRAWING_SIZE = 8;
const MAX_DRAWING_SIZE = 120;
const MIN_INK_ERASER_SIZE = 24;
const MAX_INK_ERASER_SIZE = 240;
const LOCAL_DOCUMENT_ID = 'p0-local-page'; // Stable P0 storage key; payload migrates to PageDocument V2.
const AUTOSAVE_DELAY_MS = 450;

type PaperToolMode = 'brush' | 'eraser';
type InteractionMode = 'paper' | 'select' | 'handwriting' | 'drawing' | 'ink-erase';

type ActiveContentDrag = {
  elementId: string;
  startPoint: Point;
  initialTransform: ElementTransform;
  lastTransform: ElementTransform;
  initialUpdatedAt: string;
};

type ActiveInkErase = {
  points: Point[];
  size: number;
  previewElements: ContentElement[];
  changed: boolean;
};
type PersistenceStatus =
  | 'loading'
  | 'ready'
  | 'restored'
  | 'scheduled'
  | 'saving'
  | 'saved'
  | 'error'
  | 'recovery-error'
  | 'unavailable';

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function isTextEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName.toLowerCase();
  return tagName === 'textarea' || (tagName === 'input' && target.getAttribute('type') !== 'range');
}

export function EditorShell() {
  const { i18n, t } = useTranslation();
  const viewportRef = useRef<PageViewportHandle | null>(null);
  const brushPreviewRef = useRef<PaperBrushPreviewHandle | null>(null);
  const paperStackRef = useRef<PaperStackHandle | null>(null);
  const contentStackRef = useRef<ContentStackHandle | null>(null);
  const inkStrokePreviewRef = useRef<InkStrokePreviewHandle | null>(null);
  const inkEraserPreviewRef = useRef<InkEraserPreviewHandle | null>(null);
  const activeInkStrokeRef = useRef(false);
  const activeInkEraseRef = useRef<ActiveInkErase | null>(null);
  const strokeAssetRef = useRef<PaperRuntimeAsset | null>(null);
  const activeEraseLayerIdRef = useRef<string | null>(null);
  const activeContentDragRef = useRef<ActiveContentDrag | null>(null);
  const [history, setHistory] = useState<CommandHistory<PageDocument>>(() => {
    const now = new Date().toISOString();
    return createCommandHistory(createPageDocument(LOCAL_DOCUMENT_ID, [], [], now, now, LOGICAL_PAGE_SIZE));
  });
  const historyRef = useRef<CommandHistory<PageDocument>>(history);
  const pageDocumentRef = useRef<PageDocument>(history.present);
  const autosaveRef = useRef<DebouncedAutosaveController<PageDocument> | null>(null);
  const persistenceReadyRef = useRef(false);
  const hydratingPaperVersionsRef = useRef(new Set<string>());

  const [viewportState, setViewportState] = useState<PageViewportState | null>(null);
  const [paperPack, setPaperPack] = useState<PaperPackIndex | null>(null);
  const [paperPackError, setPaperPackError] = useState(false);
  const [selectedManifestUrl, setSelectedManifestUrl] = useState<string | null>(null);
  const [paperAsset, setPaperAsset] = useState<PaperRuntimeAsset | null>(null);
  const [paperAssetsByVersion, setPaperAssetsByVersion] = useState<
    Record<string, PaperRuntimeAsset>
  >({});
  const [paperAssetError, setPaperAssetError] = useState(false);
  const [paperTextureStatus, setPaperTextureStatus] = useState<PaperTextureLoadStatus>('idle');
  const [paperToolMode, setPaperToolMode] = useState<PaperToolMode>('brush');
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_SIZE);
  const [eraserSize, setEraserSize] = useState(DEFAULT_ERASER_SIZE);
  const [inkTool, setInkTool] = useState<InkTool>('pen');
  const [inkColor, setInkColor] = useState('#35312c');
  const [inkOpacity, setInkOpacity] = useState(1);
  const [handwritingSize, setHandwritingSize] = useState(DEFAULT_HANDWRITING_SIZE);
  const [drawingSize, setDrawingSize] = useState(DEFAULT_DRAWING_SIZE);
  const [inkEraserSize, setInkEraserSize] = useState(DEFAULT_INK_ERASER_SIZE);
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus>('loading');
  const [qaStressBusy, setQaStressBusy] = useState(false);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('paper');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const qaMode = isP0QaMode();

  const scheduleDocumentSave = useCallback((document: PageDocument) => {
    if (!persistenceReadyRef.current) return;
    autosaveRef.current?.schedule(withPageDocumentUpdatedAt(document, new Date().toISOString()));
  }, []);

  const publishHistory = useCallback(
    (nextHistory: CommandHistory<PageDocument>, persist = true) => {
      historyRef.current = nextHistory;
      pageDocumentRef.current = nextHistory.present;
      setHistory(nextHistory);
      if (persist) scheduleDocumentSave(nextHistory.present);
    },
    [scheduleDocumentSave],
  );

  const commitPageCommand = useCallback(
    (command: PageDocumentCommand) => {
      const nextHistory = executeCommand(historyRef.current, command);
      if (nextHistory !== historyRef.current) publishHistory(nextHistory);
    },
    [publishHistory],
  );

  const commitPaperCommand = useCallback(
    (command: PaperHistoryCommand) => commitPageCommand(liftPaperCommand(command)),
    [commitPageCommand],
  );

  useEffect(() => {
    if (!isIndexedDbAvailable()) {
      persistenceReadyRef.current = true;
      setPersistenceStatus('unavailable');
      return;
    }

    const storage = createIndexedDbDocumentStorage<unknown>();
    let active = true;
    const autosave = createDebouncedAutosave<PageDocument>({
      delayMs: AUTOSAVE_DELAY_MS,
      save: (document) => storage.save(LOCAL_DOCUMENT_ID, document),
      onStatusChange: (status: AutosaveStatus) => {
        if (!active) return;
        if (status === 'scheduled' || status === 'saving' || status === 'saved' || status === 'error') {
          setPersistenceStatus(status);
        }
      },
    });
    autosaveRef.current = autosave;

    setPersistenceStatus('loading');

    void storage
      .load(LOCAL_DOCUMENT_ID)
      .then((rawDocument) => {
        if (!active) return;
        if (rawDocument === null) {
          persistenceReadyRef.current = true;
          setPersistenceStatus('ready');
          return;
        }

        const decoded = decodePageDocument(rawDocument);
        if (!decoded.ok) {
          persistenceReadyRef.current = true;
          setPersistenceStatus('recovery-error');
          return;
        }

        publishHistory(createCommandHistory(decoded.document), false);
        persistenceReadyRef.current = true;
        setPersistenceStatus('restored');
        if (decoded.migratedFrom === 'paper-page-v1') {
          autosave.schedule(withPageDocumentUpdatedAt(decoded.document, new Date().toISOString()));
        }
      })
      .catch(() => {
        if (!active) return;
        persistenceReadyRef.current = true;
        setPersistenceStatus('error');
      });

    const flushAutosave = () => {
      void autosave.flush().catch(() => undefined);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushAutosave();
    };

    window.addEventListener('pagehide', flushAutosave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      window.removeEventListener('pagehide', flushAutosave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void autosave.flush().catch(() => undefined);
    };
  }, [publishHistory]);

  useEffect(() => {
    let active = true;
    void loadPaperPackIndex()
      .then((pack) => {
        if (!active) return;
        setPaperPack(pack);
        setSelectedManifestUrl((current) => current ?? pack.papers[0]?.manifest ?? null);
      })
      .catch(() => {
        if (active) setPaperPackError(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedManifestUrl) {
      setPaperAsset(null);
      return;
    }

    let active = true;
    setPaperAsset(null);
    setPaperAssetError(false);
    setPaperTextureStatus('idle');

    void loadPaperRuntimeAsset(selectedManifestUrl)
      .then((asset) => {
        if (!active) return;
        setPaperAsset(asset);
        setPaperAssetsByVersion((current) => ({
          ...current,
          [asset.manifest.paperVersionId]: asset,
        }));
      })
      .catch(() => {
        if (active) setPaperAssetError(true);
      });

    return () => {
      active = false;
    };
  }, [selectedManifestUrl]);

  const pageDocument = history.present;
  const paperLayers = pageDocument.paperLayers;
  const contentElements = pageDocument.elements;

  useEffect(() => {
    if (!paperPack || paperLayers.length === 0) return;

    for (const layer of paperLayers) {
      if (paperAssetsByVersion[layer.paperVersionId]) continue;
      if (hydratingPaperVersionsRef.current.has(layer.paperVersionId)) continue;
      const entry = paperPack.papers.find((paper) => paper.paperVersionId === layer.paperVersionId);
      if (!entry) continue;

      hydratingPaperVersionsRef.current.add(layer.paperVersionId);
      void loadPaperRuntimeAsset(entry.manifest)
        .then((asset) => {
          setPaperAssetsByVersion((current) => ({
            ...current,
            [asset.manifest.paperVersionId]: asset,
          }));
        })
        .catch(() => undefined)
        .finally(() => {
          hydratingPaperVersionsRef.current.delete(layer.paperVersionId);
        });
    }
  }, [paperAssetsByVersion, paperLayers, paperPack]);
  const locale = (i18n.resolvedLanguage ?? 'en') as PaperAssetLocale;
  const zoomPercent = Math.round((viewportState?.zoom ?? 1) * 100);

  const paperRenderLayers = useMemo<PaperRenderLayer[]>(() => {
    const next: PaperRenderLayer[] = [];
    for (const layer of paperLayers) {
      const asset = paperAssetsByVersion[layer.paperVersionId];
      if (asset) next.push({ layer, asset });
    }
    return next;
  }, [paperAssetsByVersion, paperLayers]);

  const groupedPapers = useMemo(() => {
    if (!paperPack) return { pattern: [], fullSheet: [] } as const;
    return {
      pattern: paperPack.papers.filter((paper) => paper.type === 'pattern'),
      fullSheet: paperPack.papers.filter((paper) => paper.type === 'full-sheet'),
    };
  }, [paperPack]);

  const selectedEntry = useMemo<PaperCatalogEntry | null>(() => {
    return paperPack?.papers.find((paper) => paper.manifest === selectedManifestUrl) ?? null;
  }, [paperPack, selectedManifestUrl]);

  const selectedTitle = selectedEntry?.title[locale] ?? selectedEntry?.title.en ?? '';
  const currentInkMode: InkMode = interactionMode === 'drawing' ? 'drawing' : 'handwriting';
  const currentInkSize = currentInkMode === 'drawing' ? drawingSize : handwritingSize;
  const currentInkStyle = useMemo<InkStyle>(
    () => ({
      color: inkColor,
      size: currentInkSize,
      opacity: inkOpacity,
      tool: inkTool,
    }),
    [currentInkSize, inkColor, inkOpacity, inkTool],
  );
  const inkElementCount = useMemo(() => countInkElements(contentElements), [contentElements]);
  const inkPathCount = useMemo(() => countInkPaths(contentElements), [contentElements]);

  const cancelActiveInput = useCallback(() => {
    brushPreviewRef.current?.cancelStroke();
    paperStackRef.current?.cancelErase();
    inkStrokePreviewRef.current?.cancelStroke();
    inkEraserPreviewRef.current?.cancelErase();
    contentStackRef.current?.restoreInkPreview();
    const activeContentDrag = activeContentDragRef.current;
    if (activeContentDrag) {
      contentStackRef.current?.restoreElementTransform(activeContentDrag.elementId);
    }
    strokeAssetRef.current = null;
    activeEraseLayerIdRef.current = null;
    activeContentDragRef.current = null;
    activeInkStrokeRef.current = false;
    activeInkEraseRef.current = null;
  }, []);

  useEffect(() => {
    if (selectedElementId && !contentElements.some((element) => element.id === selectedElementId)) {
      setSelectedElementId(null);
    }
  }, [contentElements, selectedElementId]);

  const performUndo = useCallback(() => {
    if (!persistenceReadyRef.current) return;
    cancelActiveInput();
    const nextHistory = undoCommand(historyRef.current);
    if (nextHistory !== historyRef.current) publishHistory(nextHistory);
  }, [cancelActiveInput, publishHistory]);

  const performRedo = useCallback(() => {
    if (!persistenceReadyRef.current) return;
    cancelActiveInput();
    const nextHistory = redoCommand(historyRef.current);
    if (nextHistory !== historyRef.current) publishHistory(nextHistory);
  }, [cancelActiveInput, publishHistory]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextEditingTarget(event.target)) return;
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier) return;

      const key = event.key.toLowerCase();
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) performRedo();
        else performUndo();
        return;
      }

      if (key === 'y' && event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        performRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [performRedo, performUndo]);

  const handlePageInputStart = useCallback(
    (event: PageInputEvent) => {
      if (!event.insidePage || !persistenceReadyRef.current) return;

      if (interactionMode === 'select') {
        brushPreviewRef.current?.cancelStroke();
        paperStackRef.current?.cancelErase();
        inkStrokePreviewRef.current?.cancelStroke();
        inkEraserPreviewRef.current?.cancelErase();
        contentStackRef.current?.restoreInkPreview();
        activeInkStrokeRef.current = false;
        activeInkEraseRef.current = null;
        strokeAssetRef.current = null;
        activeEraseLayerIdRef.current = null;

        const hit = findTopContentElementAtPoint(pageDocumentRef.current.elements, event.pagePoint);
        setSelectedElementId(hit?.id ?? null);
        if (!hit) return;

        activeContentDragRef.current = {
          elementId: hit.id,
          startPoint: { ...event.pagePoint },
          initialTransform: { ...hit.transform },
          lastTransform: { ...hit.transform },
          initialUpdatedAt: hit.updatedAt,
        };
        return;
      }

      if (interactionMode === 'handwriting' || interactionMode === 'drawing') {
        brushPreviewRef.current?.cancelStroke();
        paperStackRef.current?.cancelErase();
        inkEraserPreviewRef.current?.cancelErase();
        contentStackRef.current?.restoreInkPreview();
        strokeAssetRef.current = null;
        activeEraseLayerIdRef.current = null;
        activeInkEraseRef.current = null;
        setSelectedElementId(null);
        const started =
          inkStrokePreviewRef.current?.beginStroke(
            event.pagePoint,
            interactionMode,
            currentInkStyle,
          ) ?? false;
        activeInkStrokeRef.current = started;
        return;
      }

      if (interactionMode === 'ink-erase') {
        brushPreviewRef.current?.cancelStroke();
        paperStackRef.current?.cancelErase();
        inkStrokePreviewRef.current?.cancelStroke();
        strokeAssetRef.current = null;
        activeEraseLayerIdRef.current = null;
        activeInkStrokeRef.current = false;
        setSelectedElementId(null);

        const started = inkEraserPreviewRef.current?.beginErase(event.pagePoint, inkEraserSize) ?? false;
        if (!started) return;
        const preview = eraseInkElements(
          pageDocumentRef.current.elements,
          [event.pagePoint],
          inkEraserSize,
          new Date().toISOString(),
        );
        const active: ActiveInkErase = {
          points: [{ ...event.pagePoint }],
          size: inkEraserSize,
          previewElements: preview.elements,
          changed: preview.changed,
        };
        activeInkEraseRef.current = active;
        contentStackRef.current?.previewInkElements(
          active.previewElements.filter((element): element is InkElement => element.type === 'ink'),
        );
        return;
      }

      if (paperToolMode === 'eraser') {
        const current = pageDocumentRef.current.paperLayers;
        let targetLayerId: string | null = null;
        for (let index = current.length - 1; index >= 0; index -= 1) {
          const candidate = current[index];
          if (!candidate) continue;
          if (!isPointVisibleInPaperLayer(candidate, event.pagePoint)) continue;
          targetLayerId = candidate.id;
          break;
        }
        if (!targetLayerId) return;
        const started =
          paperStackRef.current?.beginErase(targetLayerId, event.pagePoint, eraserSize) ?? false;
        activeEraseLayerIdRef.current = started ? targetLayerId : null;
        return;
      }

      if (!paperAsset) return;
      const started = brushPreviewRef.current?.beginStroke(event.pagePoint, brushSize) ?? false;
      strokeAssetRef.current = started ? paperAsset : null;
    },
    [brushSize, currentInkStyle, eraserSize, inkEraserSize, interactionMode, paperAsset, paperToolMode],
  );

  const handlePageInputMove = useCallback((event: PageInputEvent) => {
    const activeContentDrag = activeContentDragRef.current;
    if (activeContentDrag) {
      const nextTransform = translateElementTransform(activeContentDrag.initialTransform, {
        x: event.pagePoint.x - activeContentDrag.startPoint.x,
        y: event.pagePoint.y - activeContentDrag.startPoint.y,
      });
      activeContentDrag.lastTransform = nextTransform;
      contentStackRef.current?.previewElementTransform(activeContentDrag.elementId, nextTransform);
      return;
    }

    if (activeInkStrokeRef.current) {
      inkStrokePreviewRef.current?.appendPoint(event.pagePoint);
      return;
    }

    const activeInkErase = activeInkEraseRef.current;
    if (activeInkErase) {
      const previous = activeInkErase.points[activeInkErase.points.length - 1];
      if (previous) {
        const distance = Math.hypot(event.pagePoint.x - previous.x, event.pagePoint.y - previous.y);
        if (distance >= Math.max(1, activeInkErase.size * 0.06)) {
          const nextPoint = { ...event.pagePoint };
          activeInkErase.points.push(nextPoint);
          inkEraserPreviewRef.current?.appendPoint(nextPoint);
          const preview = eraseInkElements(
            activeInkErase.previewElements,
            [previous, nextPoint],
            activeInkErase.size,
            new Date().toISOString(),
          );
          activeInkErase.previewElements = preview.elements;
          activeInkErase.changed ||= preview.changed;
          contentStackRef.current?.previewInkElements(
            activeInkErase.previewElements.filter((element): element is InkElement => element.type === 'ink'),
          );
        }
      }
      return;
    }

    if (activeEraseLayerIdRef.current) {
      paperStackRef.current?.appendErasePoint(event.pagePoint);
      return;
    }

    if (strokeAssetRef.current) brushPreviewRef.current?.appendPoint(event.pagePoint);
  }, []);

  const handlePageInputEnd = useCallback(
    (event: PageInputEvent | null) => {
      const activeContentDrag = activeContentDragRef.current;
      if (activeContentDrag) {
        if (event) {
          activeContentDrag.lastTransform = translateElementTransform(activeContentDrag.initialTransform, {
            x: event.pagePoint.x - activeContentDrag.startPoint.x,
            y: event.pagePoint.y - activeContentDrag.startPoint.y,
          });
        }
        activeContentDragRef.current = null;
        contentStackRef.current?.restoreElementTransform(activeContentDrag.elementId);
        if (!areElementTransformsEqual(activeContentDrag.initialTransform, activeContentDrag.lastTransform)) {
          commitPageCommand(
            createTransformContentElementCommand(
              createId('command'),
              activeContentDrag.elementId,
              activeContentDrag.initialTransform,
              activeContentDrag.lastTransform,
              activeContentDrag.initialUpdatedAt,
              new Date().toISOString(),
            ),
          );
        }
        return;
      }

      if (activeInkStrokeRef.current) {
        if (event) inkStrokePreviewRef.current?.appendPoint(event.pagePoint);
        const draft = inkStrokePreviewRef.current?.finishStroke() ?? null;
        activeInkStrokeRef.current = false;
        if (!draft) return;
        const now = new Date().toISOString();
        const element = createInkElement(
          createId('ink'),
          draft.mode,
          draft.style,
          draft.points,
          now,
        );
        if (!element) return;
        commitPageCommand(createAddContentElementCommand(createId('command'), element));
        return;
      }

      const activeInkErase = activeInkEraseRef.current;
      if (activeInkErase) {
        if (event) {
          const previous = activeInkErase.points[activeInkErase.points.length - 1];
          if (!previous || Math.hypot(event.pagePoint.x - previous.x, event.pagePoint.y - previous.y) > 0.5) {
            const nextPoint = { ...event.pagePoint };
            if (previous) {
              const preview = eraseInkElements(
                activeInkErase.previewElements,
                [previous, nextPoint],
                activeInkErase.size,
                new Date().toISOString(),
              );
              activeInkErase.previewElements = preview.elements;
              activeInkErase.changed ||= preview.changed;
            }
            activeInkErase.points.push(nextPoint);
            inkEraserPreviewRef.current?.appendPoint(nextPoint);
          }
        }
        inkEraserPreviewRef.current?.finishErase();
        activeInkEraseRef.current = null;
        contentStackRef.current?.restoreInkPreview();
        const currentElements = pageDocumentRef.current.elements;
        if (activeInkErase.changed) {
          commitPageCommand(
            createReplaceContentElementsCommand(
              createId('command'),
              currentElements,
              activeInkErase.previewElements,
              'ink.erase',
            ),
          );
        }
        return;
      }

      const activeEraseLayerId = activeEraseLayerIdRef.current;
      if (activeEraseLayerId) {
        if (event) paperStackRef.current?.appendErasePoint(event.pagePoint);
        const commit = paperStackRef.current?.finishErase(createId('stroke')) ?? null;
        activeEraseLayerIdRef.current = null;
        if (!commit) return;

        commitPaperCommand(
          createAppendPaperMaskStrokeCommand(
            createId('command'),
            commit.layerId,
            commit.stroke,
            'erase',
          ),
        );
        return;
      }

      const strokeAsset = strokeAssetRef.current;
      if (!strokeAsset) return;

      if (event) brushPreviewRef.current?.appendPoint(event.pagePoint);
      const stroke = brushPreviewRef.current?.finishStroke(createId('stroke')) ?? null;
      strokeAssetRef.current = null;
      if (!stroke) {
        brushPreviewRef.current?.clearPreview();
        return;
      }

      const currentLayers = pageDocumentRef.current.paperLayers;
      const topLayer = currentLayers[currentLayers.length - 1];
      if (topLayer?.paperVersionId === strokeAsset.manifest.paperVersionId) {
        commitPaperCommand(
          createAppendPaperMaskStrokeCommand(
            createId('command'),
            topLayer.id,
            stroke,
            'paint',
          ),
        );
      } else {
        const newLayer = createPaperLayerFromAsset(
          createId('paper-layer'),
          strokeAsset,
          new Date().toISOString(),
          [stroke],
        );
        commitPaperCommand(createAddPaperLayerCommand(createId('command'), newLayer, 'paint'));
      }

      requestAnimationFrame(() => brushPreviewRef.current?.clearPreview());
    },
    [commitPageCommand, commitPaperCommand],
  );

  const fillPage = useCallback(() => {
    if (interactionMode !== 'paper' || !paperAsset || paperToolMode !== 'brush') return;
    cancelActiveInput();
    const fillStroke = createFillPageStroke(createId('fill'), LOGICAL_PAGE_SIZE);
    const currentLayers = pageDocumentRef.current.paperLayers;
    const topLayer = currentLayers[currentLayers.length - 1];

    if (topLayer?.paperVersionId === paperAsset.manifest.paperVersionId) {
      commitPaperCommand(
        createAppendPaperMaskStrokeCommand(
          createId('command'),
          topLayer.id,
          fillStroke,
          'fill',
        ),
      );
      return;
    }

    const newLayer = createPaperLayerFromAsset(
      createId('paper-layer'),
      paperAsset,
      new Date().toISOString(),
      [fillStroke],
    );
    commitPaperCommand(createAddPaperLayerCommand(createId('command'), newLayer, 'fill'));
  }, [cancelActiveInput, commitPaperCommand, interactionMode, paperAsset, paperToolMode]);

  const replaceTopLayer = useCallback(() => {
    if (interactionMode !== 'paper' || !paperAsset || paperToolMode !== 'brush') return;
    cancelActiveInput();
    const currentLayers = pageDocumentRef.current.paperLayers;
    const topLayer = currentLayers[currentLayers.length - 1];
    if (!topLayer || topLayer.paperVersionId === paperAsset.manifest.paperVersionId) return;

    const replacement = replacePaperLayerFromAsset(topLayer, paperAsset);
    commitPaperCommand(
      createReplacePaperLayerCommand(createId('command'), topLayer, replacement),
    );
  }, [cancelActiveInput, commitPaperCommand, interactionMode, paperAsset, paperToolMode]);

  const clearPage = useCallback(() => {
    if (interactionMode !== 'paper') return;
    cancelActiveInput();
    const currentLayers = pageDocumentRef.current.paperLayers;
    if (currentLayers.length === 0) return;
    commitPaperCommand(createClearPaperLayersCommand(createId('command'), currentLayers));
  }, [cancelActiveInput, commitPaperCommand, interactionMode]);

  const seedP0QaStress = useCallback(async () => {
    if (!paperPack || !persistenceReadyRef.current || qaStressBusy) return;
    cancelActiveInput();
    setQaStressBusy(true);

    try {
      const patterns = paperPack.papers.filter((paper) => paper.type === 'pattern');
      const fullSheets = paperPack.papers.filter((paper) => paper.type === 'full-sheet');
      const candidates = [
        patterns[0],
        patterns[Math.floor(patterns.length / 2)],
        patterns[patterns.length - 1],
        fullSheets[0],
        fullSheets[fullSheets.length - 1],
      ].filter((entry): entry is PaperCatalogEntry => Boolean(entry));
      const uniqueEntries = candidates.filter(
        (entry, index, entries) =>
          entries.findIndex((candidate) => candidate.paperVersionId === entry.paperVersionId) === index,
      );
      const assets = await Promise.all(
        uniqueEntries.slice(0, 5).map((entry) => loadPaperRuntimeAsset(entry.manifest)),
      );

      setPaperAssetsByVersion((current) => {
        const next = { ...current };
        for (const asset of assets) next[asset.manifest.paperVersionId] = asset;
        return next;
      });

      for (const [index, asset] of assets.entries()) {
        const fillStroke = createFillPageStroke(createId(`qa-fill-${index}`), LOGICAL_PAGE_SIZE);
        const layer = createPaperLayerFromAsset(
          createId(`qa-paper-layer-${index}`),
          asset,
          new Date().toISOString(),
          [fillStroke],
        );
        commitPaperCommand(createAddPaperLayerCommand(createId('qa-command'), layer, 'fill'));
      }
    } finally {
      setQaStressBusy(false);
    }
  }, [cancelActiveInput, commitPaperCommand, paperPack, qaStressBusy]);

  const seedP1QaPlaceholder = useCallback(() => {
    if (!persistenceReadyRef.current) return;
    cancelActiveInput();
    const index = pageDocumentRef.current.elements.length;
    const now = new Date().toISOString();
    const element = createDevelopmentPlaceholderElement(
      createId('content-placeholder'),
      `Content ${index + 1}`,
      createElementTransform(250 + (index % 4) * 42, 430 + (index % 3) * 54),
      360,
      220,
      now,
    );
    commitPageCommand(createAddContentElementCommand(createId('command'), element));
    setSelectedElementId(element.id);
    setInteractionMode('select');
  }, [cancelActiveInput, commitPageCommand]);

  const seedP12InkStress = useCallback(() => {
    if (!persistenceReadyRef.current) return;
    cancelActiveInput();
    const before = pageDocumentRef.current.elements;
    const additions: InkElement[] = [];
    const now = new Date().toISOString();

    for (let row = 0; row < 20; row += 1) {
      const points: Point[] = [];
      for (let step = 0; step <= 12; step += 1) {
        const x = 110 + step * 62;
        const y = 140 + row * 56 + Math.sin(step * 0.9 + row * 0.35) * 18;
        points.push({ x, y });
      }
      const style: InkStyle = {
        color: row % 3 === 0 ? '#35312c' : row % 3 === 1 ? '#5f6570' : '#6f554f',
        size: row % 2 === 0 ? 12 : 28,
        opacity: row % 2 === 0 ? 1 : 0.72,
        tool: row % 2 === 0 ? 'pen' : 'marker',
      };
      const element = createInkElement(
        createId(`qa-ink-${row}`),
        row % 2 === 0 ? 'handwriting' : 'drawing',
        style,
        points,
        now,
      );
      if (element) additions.push(element);
    }

    if (additions.length === 0) return;
    commitPageCommand(
      createReplaceContentElementsCommand(
        createId('qa-command'),
        before,
        [...before, ...additions],
        'qa.ink-stress',
      ),
    );
    setInteractionMode('handwriting');
    setSelectedElementId(null);
  }, [cancelActiveInput, commitPageCommand]);

  const transformSelectedQaElement = useCallback(
    (kind: 'rotate' | 'scale') => {
      const document = pageDocumentRef.current;
      const element = document.elements.find((item) => item.id === selectedElementId);
      if (!element) return;
      cancelActiveInput();
      const nextTransform =
        kind === 'rotate'
          ? { ...element.transform, rotation: element.transform.rotation + 15 }
          : {
              ...element.transform,
              scaleX: element.transform.scaleX * 1.1,
              scaleY: element.transform.scaleY * 1.1,
            };
      commitPageCommand(
        createTransformContentElementCommand(
          createId('command'),
          element.id,
          element.transform,
          nextTransform,
          element.updatedAt,
          new Date().toISOString(),
        ),
      );
    },
    [cancelActiveInput, commitPageCommand, selectedElementId],
  );

  const removeSelectedQaElement = useCallback(() => {
    const document = pageDocumentRef.current;
    const index = document.elements.findIndex((element) => element.id === selectedElementId);
    const element = index >= 0 ? document.elements[index] : undefined;
    if (!element) return;
    cancelActiveInput();
    commitPageCommand(createRemoveContentElementCommand(createId('command'), element, index));
    setSelectedElementId(null);
  }, [cancelActiveInput, commitPageCommand, selectedElementId]);

  const reorderSelectedQaElement = useCallback(
    (direction: 'back' | 'front') => {
      const document = pageDocumentRef.current;
      const currentIndex = document.elements.findIndex((element) => element.id === selectedElementId);
      if (currentIndex < 0 || document.elements.length < 2) return;
      const nextIndex = direction === 'front' ? document.elements.length - 1 : 0;
      if (currentIndex === nextIndex) return;
      cancelActiveInput();
      commitPageCommand(
        createReorderContentElementCommand(
          createId('command'),
          selectedElementId!,
          currentIndex,
          nextIndex,
        ),
      );
    },
    [cancelActiveInput, commitPageCommand, selectedElementId],
  );

  const changeInteractionMode = useCallback(
    (nextMode: InteractionMode) => {
      if (nextMode === interactionMode) return;
      cancelActiveInput();
      setInteractionMode(nextMode);
      if (nextMode !== 'select') setSelectedElementId(null);
    },
    [cancelActiveInput, interactionMode],
  );

  const changePaperToolMode = useCallback(
    (nextMode: PaperToolMode) => {
      if (nextMode === paperToolMode && interactionMode === 'paper') return;
      cancelActiveInput();
      setInteractionMode('paper');
      setSelectedElementId(null);
      setPaperToolMode(nextMode);
    },
    [cancelActiveInput, interactionMode, paperToolMode],
  );

  const changeInkMode = useCallback(
    (nextMode: 'handwriting' | 'drawing' | 'ink-erase') => {
      if (nextMode === interactionMode) return;
      cancelActiveInput();
      setInteractionMode(nextMode);
      setSelectedElementId(null);
    },
    [cancelActiveInput, interactionMode],
  );

  const paperReady = Boolean(paperAsset && paperTextureStatus === 'ready' && !paperAssetError);
  const topPaperLayer = paperLayers[paperLayers.length - 1] ?? null;
  const persistenceReady = persistenceStatus !== 'loading';
  const canFillPage = Boolean(
    persistenceReady && interactionMode === 'paper' && paperAsset && paperToolMode === 'brush' && !paperAssetError,
  );
  const canReplaceTopLayer = Boolean(
    persistenceReady &&
      interactionMode === 'paper' &&
      paperAsset &&
      paperToolMode === 'brush' &&
      topPaperLayer &&
      topPaperLayer.paperVersionId !== paperAsset.manifest.paperVersionId,
  );
  const undoAvailable = persistenceReady && historyCanUndo(history);
  const redoAvailable = persistenceReady && historyCanRedo(history);
  const activeToolSize = paperToolMode === 'brush' ? brushSize : eraserSize;
  const hintKey =
    interactionMode === 'select'
      ? 'editor.selectHint'
      : interactionMode === 'handwriting'
        ? 'editor.handwritingHint'
        : interactionMode === 'drawing'
          ? 'editor.drawingHint'
          : interactionMode === 'ink-erase'
            ? 'editor.inkEraserHint'
            : paperToolMode === 'brush'
              ? 'editor.paperBrushHint'
              : 'editor.paperEraserHint';
  const persistenceLabelKey =
    persistenceStatus === 'recovery-error'
      ? 'editor.persistenceRecoveryError'
      : persistenceStatus === 'unavailable'
        ? 'editor.persistenceUnavailable'
        : persistenceStatus === 'loading'
          ? 'editor.persistenceLoading'
          : persistenceStatus === 'restored'
            ? 'editor.persistenceRestored'
            : persistenceStatus === 'scheduled'
              ? 'editor.persistenceScheduled'
              : persistenceStatus === 'saving'
                ? 'editor.persistenceSaving'
                : persistenceStatus === 'saved'
                  ? 'editor.persistenceSaved'
                  : persistenceStatus === 'error'
                    ? 'editor.persistenceError'
                    : 'editor.persistenceReady';

  return (
    <section className="editor-shell" aria-label={t('editor.canvasLabel')}>
      <div className="viewport-frame">
        <PageViewport
          ref={viewportRef}
          ariaLabel={t('editor.viewportLabel')}
          onViewportChange={setViewportState}
          onPageInputStart={handlePageInputStart}
          onPageInputMove={handlePageInputMove}
          onPageInputEnd={handlePageInputEnd}
          onPageInputCancel={cancelActiveInput}
        >
          <PaperStack ref={paperStackRef} layers={paperRenderLayers} />
          <PaperBrushPreview
            ref={brushPreviewRef}
            asset={paperAsset}
            onLoadStateChange={setPaperTextureStatus}
          />
          <ContentStack
            ref={contentStackRef}
            elements={contentElements}
            selectedElementId={selectedElementId}
          />
          <InkStrokePreview ref={inkStrokePreviewRef} />
          <InkEraserPreview ref={inkEraserPreviewRef} />
        </PageViewport>

        <div className="viewport-hud" aria-live="polite">
          <div className="viewport-hud__status">
            <strong>
              {LOGICAL_PAGE_SIZE.width} × {LOGICAL_PAGE_SIZE.height}
            </strong>
            <span>
              {paperPack
                ? t('editor.historyDocumentStatus', {
                    layers: paperLayers.length,
                    elements: contentElements.length,
                    undo: history.undoStack.length,
                    redo: history.redoStack.length,
                  })
                : paperPackError
                  ? t('editor.assetPackErrorShort')
                  : t('editor.assetPackLoadingShort')}
            </span>
            <span className={`persistence-status persistence-status--${persistenceStatus}`}>
              {t(persistenceLabelKey)}
            </span>
          </div>
          <div className="viewport-hud__actions">
            <button
              type="button"
              className="viewport-history-button"
              disabled={!undoAvailable}
              onClick={performUndo}
              aria-label={t('editor.undoAria')}
              title={t('editor.undo')}
              data-qa="undo"
            >
              ↶
            </button>
            <button
              type="button"
              className="viewport-history-button"
              disabled={!redoAvailable}
              onClick={performRedo}
              aria-label={t('editor.redoAria')}
              title={t('editor.redo')}
              data-qa="redo"
            >
              ↷
            </button>
            <button
              type="button"
              className="viewport-fit-button"
              onClick={() => viewportRef.current?.fitToPage()}
              aria-label={t('editor.fitPageAria', { zoom: zoomPercent })}
              data-qa="fit-page"
            >
              {t('editor.fitPage')} · {zoomPercent}%
            </button>
          </div>
        </div>

        {interactionMode === 'paper' || interactionMode === 'select' ? (
          <div
            className={`paper-brush-panel ${interactionMode === 'select' ? 'is-inactive' : ''}`}
            aria-label={t('editor.paperBrushPanelLabel')}
          >
            <div className="paper-tool-mode" role="group" aria-label={t('editor.paperToolModeLabel')}>
              <button
                type="button"
                className={paperToolMode === 'brush' ? 'is-active' : ''}
                aria-pressed={paperToolMode === 'brush'}
                data-qa="mode-lay"
                onClick={() => changePaperToolMode('brush')}
              >
                {t('editor.paperToolLay')}
              </button>
              <button
                type="button"
                className={paperToolMode === 'eraser' ? 'is-active' : ''}
                aria-pressed={paperToolMode === 'eraser'}
                data-qa="mode-erase"
                onClick={() => changePaperToolMode('eraser')}
              >
                {t('editor.paperToolErase')}
              </button>
            </div>

            <div className="paper-brush-panel__paper">
              <span>
                {paperToolMode === 'brush'
                  ? t('editor.paperBrushSelected')
                  : t('editor.paperEraserTarget')}
              </span>
              <strong>
                {paperToolMode === 'brush'
                  ? selectedTitle || t('editor.paperPreviewLoading')
                  : t('editor.paperEraserTopVisible')}
              </strong>
              <small className={paperToolMode === 'brush' && paperReady ? 'is-ready' : ''}>
                {paperToolMode === 'eraser'
                  ? t('editor.paperEraserGestureLock')
                  : paperAssetError || paperTextureStatus === 'error'
                    ? t('editor.paperPreviewError')
                    : paperReady
                      ? t('editor.paperBrushReady')
                      : t('editor.paperPreviewLoading')}
              </small>
            </div>

            {paperPack ? (
              <select
                value={selectedManifestUrl ?? ''}
                disabled={interactionMode !== 'paper' || paperToolMode === 'eraser' || !persistenceReady}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                  cancelActiveInput();
                  setSelectedManifestUrl(event.target.value);
                }}
                aria-label={t('editor.paperPreviewSelect')}
                data-qa="paper-select"
              >
                <optgroup label={t('editor.paperTypePattern')}>
                  {groupedPapers.pattern.map((paper) => (
                    <option key={paper.paperVersionId} value={paper.manifest}>
                      {paper.title[locale] ?? paper.title.en}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={t('editor.paperTypeFullSheet')}>
                  {groupedPapers.fullSheet.map((paper) => (
                    <option key={paper.paperVersionId} value={paper.manifest}>
                      {paper.title[locale] ?? paper.title.en}
                    </option>
                  ))}
                </optgroup>
              </select>
            ) : null}

            <label className="paper-brush-panel__size">
              <span>
                {paperToolMode === 'brush'
                  ? t('editor.paperBrushSize')
                  : t('editor.paperEraserSize')}{' '}
                <strong>{activeToolSize}</strong>
              </span>
              <input
                type="range"
                min={MIN_TOOL_SIZE}
                max={MAX_TOOL_SIZE}
                step={10}
                value={activeToolSize}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  const value = Number(event.target.value);
                  if (paperToolMode === 'brush') setBrushSize(value);
                  else setEraserSize(value);
                }}
              />
            </label>

            <div className="paper-brush-panel__actions">
              <button
                type="button"
                disabled={!canFillPage}
                onClick={fillPage}
                aria-label={t('editor.paperFillPageAria')}
                data-qa="fill-page"
              >
                {t('editor.paperFillPage')}
              </button>
              <button
                type="button"
                disabled={!canReplaceTopLayer}
                onClick={replaceTopLayer}
                aria-label={t('editor.paperReplaceTopAria')}
                data-qa="replace-top"
              >
                {t('editor.paperReplaceTop')}
              </button>
              <button
                type="button"
                className="paper-brush-panel__clear"
                disabled={!persistenceReady || interactionMode !== 'paper' || paperLayers.length === 0}
                onClick={clearPage}
                data-qa="clear-page"
              >
                {t('editor.paperBrushClear')}
              </button>
            </div>
          </div>
        ) : (
          <div className="ink-panel" aria-label={t('editor.inkPanelLabel')}>
            <div className="ink-mode" role="group" aria-label={t('editor.inkModeLabel')}>
              <button
                type="button"
                className={interactionMode === 'handwriting' ? 'is-active' : ''}
                onClick={() => changeInkMode('handwriting')}
                data-qa="mode-handwriting"
              >
                {t('editor.inkModeHandwriting')}
              </button>
              <button
                type="button"
                className={interactionMode === 'drawing' ? 'is-active' : ''}
                onClick={() => changeInkMode('drawing')}
                data-qa="mode-drawing"
              >
                {t('editor.inkModeDrawing')}
              </button>
              <button
                type="button"
                className={interactionMode === 'ink-erase' ? 'is-active' : ''}
                onClick={() => changeInkMode('ink-erase')}
                data-qa="mode-ink-erase"
              >
                {t('editor.inkModeErase')}
              </button>
            </div>

            {interactionMode !== 'ink-erase' ? (
              <>
                <div className="ink-tool-mode" role="group" aria-label={t('editor.inkToolLabel')}>
                  <button
                    type="button"
                    className={inkTool === 'pen' ? 'is-active' : ''}
                    onClick={() => { setInkTool('pen'); if (inkOpacity < 0.8) setInkOpacity(1); }}
                  >
                    {t('editor.inkToolPen')}
                  </button>
                  <button
                    type="button"
                    className={inkTool === 'marker' ? 'is-active' : ''}
                    onClick={() => { setInkTool('marker'); if (inkOpacity > 0.7) setInkOpacity(0.45); }}
                  >
                    {t('editor.inkToolMarker')}
                  </button>
                </div>

                <label className="ink-panel__color">
                  <span>{t('editor.inkColor')}</span>
                  <input
                    type="color"
                    value={inkColor}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setInkColor(event.target.value)}
                    aria-label={t('editor.inkColor')}
                  />
                </label>

                <label className="ink-panel__range">
                  <span>
                    {t('editor.inkSize')} <strong>{currentInkSize}</strong>
                  </span>
                  <input
                    type="range"
                    min={interactionMode === 'drawing' ? MIN_DRAWING_SIZE : MIN_HANDWRITING_SIZE}
                    max={interactionMode === 'drawing' ? MAX_DRAWING_SIZE : MAX_HANDWRITING_SIZE}
                    step={1}
                    value={currentInkSize}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      const value = Number(event.target.value);
                      if (interactionMode === 'drawing') setDrawingSize(value);
                      else setHandwritingSize(value);
                    }}
                  />
                </label>

                <label className="ink-panel__range">
                  <span>
                    {t('editor.inkOpacity')} <strong>{Math.round(inkOpacity * 100)}%</strong>
                  </span>
                  <input
                    type="range"
                    min={0.2}
                    max={1}
                    step={0.05}
                    value={inkOpacity}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setInkOpacity(Number(event.target.value))}
                  />
                </label>
              </>
            ) : (
              <label className="ink-panel__range ink-panel__eraser-size">
                <span>
                  {t('editor.inkEraserSize')} <strong>{inkEraserSize}</strong>
                </span>
                <input
                  type="range"
                  min={MIN_INK_ERASER_SIZE}
                  max={MAX_INK_ERASER_SIZE}
                  step={4}
                  value={inkEraserSize}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setInkEraserSize(Number(event.target.value))}
                />
              </label>
            )}

            <div className="ink-panel__status">
              {t('editor.inkStatus', { strokes: inkElementCount, paths: inkPathCount })}
            </div>
          </div>
        )}

        <div className="viewport-gesture-hint">{t(hintKey)}</div>
      </div>

      {qaMode ? (
        <P0QaPanel
          selfCheckInput={{
            document: pageDocument,
            renderedLayerCount: paperRenderLayers.length,
            viewportSize: viewportState?.viewportSize ?? { width: 0, height: 0 },
            devicePixelRatio:
              viewportState?.devicePixelRatio ??
              (typeof window === 'undefined' ? 1 : Math.max(1, window.devicePixelRatio || 1)),
            undoCount: history.undoStack.length,
            redoCount: history.redoStack.length,
            persistenceStatus,
            interactionMode,
            selectedElementId,
          }}
          canSeedStress={Boolean(paperPack && persistenceReady)}
          stressBusy={qaStressBusy}
          onSeedStress={seedP0QaStress}
          onSeedContent={seedP1QaPlaceholder}
          onSeedInkStress={seedP12InkStress}
          selectedElementId={selectedElementId}
          interactionMode={interactionMode}
          onInteractionModeChange={changeInteractionMode}
          onRotateSelected={() => transformSelectedQaElement('rotate')}
          onScaleSelected={() => transformSelectedQaElement('scale')}
          onSendSelectedBack={() => reorderSelectedQaElement('back')}
          onBringSelectedFront={() => reorderSelectedQaElement('front')}
          onRemoveSelected={removeSelectedQaElement}
        />
      ) : null}

      <nav className="tool-dock" aria-label={t('editor.toolsLabel')}>
        {tools.map((tool) => {
          const disabled = tool === 'media' || tool === 'text';
          const active =
            (tool === 'paper' && (interactionMode === 'paper' || interactionMode === 'select')) ||
            (tool === 'draw' && (interactionMode === 'handwriting' || interactionMode === 'drawing' || interactionMode === 'ink-erase'));
          return (
            <button
              key={tool}
              type="button"
              disabled={disabled}
              className={active ? 'is-active' : ''}
              onClick={() => {
                if (tool === 'paper') changePaperToolMode(paperToolMode);
                if (tool === 'draw') changeInkMode('handwriting');
              }}
            >
              <span className="tool-icon" aria-hidden="true">
                {tool === 'paper' ? '▱' : tool === 'media' ? '▧' : tool === 'text' ? 'T' : '✎'}
              </span>
              <span>{t(`editor.tools.${tool}`)}</span>
            </button>
          );
        })}
      </nav>
    </section>
  );
}
