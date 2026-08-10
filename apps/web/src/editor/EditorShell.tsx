import {
  LOGICAL_PAGE_SIZE,
  canRedo as historyCanRedo,
  canUndo as historyCanUndo,
  createCommandHistory,
  executeCommand,
  redoCommand,
  undoCommand,
  type CommandHistory,
} from '@unbound-journal/editor-core';
import {
  PageViewport,
  PaperBrushPreview,
  PaperStack,
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
  type PaperHistoryState,
  type PaperPackIndex,
  type PaperRuntimeAsset,
} from '@unbound-journal/paper-engine';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { useTranslation } from 'react-i18next';

const tools = ['paper', 'media', 'text', 'draw'] as const;
const DEFAULT_BRUSH_SIZE = 180;
const DEFAULT_ERASER_SIZE = 180;
const MIN_TOOL_SIZE = 60;
const MAX_TOOL_SIZE = 360;

type PaperToolMode = 'brush' | 'eraser';

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
  const strokeAssetRef = useRef<PaperRuntimeAsset | null>(null);
  const activeEraseLayerIdRef = useRef<string | null>(null);
  const historyRef = useRef<CommandHistory<PaperHistoryState>>(createCommandHistory([]));
  const paperLayersRef = useRef<PaperHistoryState>(historyRef.current.present);

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
  const [history, setHistory] = useState<CommandHistory<PaperHistoryState>>(historyRef.current);

  const publishHistory = useCallback((nextHistory: CommandHistory<PaperHistoryState>) => {
    historyRef.current = nextHistory;
    paperLayersRef.current = nextHistory.present;
    setHistory(nextHistory);
  }, []);

  const commitPaperCommand = useCallback(
    (command: PaperHistoryCommand) => {
      const nextHistory = executeCommand(historyRef.current, command);
      if (nextHistory !== historyRef.current) publishHistory(nextHistory);
    },
    [publishHistory],
  );

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

  const paperLayers = history.present;
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

  const cancelActiveInput = useCallback(() => {
    brushPreviewRef.current?.cancelStroke();
    paperStackRef.current?.cancelErase();
    strokeAssetRef.current = null;
    activeEraseLayerIdRef.current = null;
  }, []);

  const performUndo = useCallback(() => {
    cancelActiveInput();
    const nextHistory = undoCommand(historyRef.current);
    if (nextHistory !== historyRef.current) publishHistory(nextHistory);
  }, [cancelActiveInput, publishHistory]);

  const performRedo = useCallback(() => {
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
      if (!event.insidePage) return;

      if (paperToolMode === 'eraser') {
        const current = paperLayersRef.current;
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
    [brushSize, eraserSize, paperAsset, paperToolMode],
  );

  const handlePageInputMove = useCallback((event: PageInputEvent) => {
    if (activeEraseLayerIdRef.current) {
      paperStackRef.current?.appendErasePoint(event.pagePoint);
      return;
    }

    if (strokeAssetRef.current) brushPreviewRef.current?.appendPoint(event.pagePoint);
  }, []);

  const handlePageInputEnd = useCallback(
    (event: PageInputEvent | null) => {
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

      const currentLayers = paperLayersRef.current;
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
    [commitPaperCommand],
  );

  const fillPage = useCallback(() => {
    if (!paperAsset || paperToolMode !== 'brush') return;
    cancelActiveInput();
    const fillStroke = createFillPageStroke(createId('fill'), LOGICAL_PAGE_SIZE);
    const currentLayers = paperLayersRef.current;
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
  }, [cancelActiveInput, commitPaperCommand, paperAsset, paperToolMode]);

  const replaceTopLayer = useCallback(() => {
    if (!paperAsset || paperToolMode !== 'brush') return;
    cancelActiveInput();
    const currentLayers = paperLayersRef.current;
    const topLayer = currentLayers[currentLayers.length - 1];
    if (!topLayer || topLayer.paperVersionId === paperAsset.manifest.paperVersionId) return;

    const replacement = replacePaperLayerFromAsset(topLayer, paperAsset);
    commitPaperCommand(
      createReplacePaperLayerCommand(createId('command'), topLayer, replacement),
    );
  }, [cancelActiveInput, commitPaperCommand, paperAsset, paperToolMode]);

  const clearPage = useCallback(() => {
    cancelActiveInput();
    const currentLayers = paperLayersRef.current;
    if (currentLayers.length === 0) return;
    commitPaperCommand(createClearPaperLayersCommand(createId('command'), currentLayers));
  }, [cancelActiveInput, commitPaperCommand]);

  const changePaperToolMode = useCallback(
    (nextMode: PaperToolMode) => {
      if (nextMode === paperToolMode) return;
      cancelActiveInput();
      setPaperToolMode(nextMode);
    },
    [cancelActiveInput, paperToolMode],
  );

  const paperReady = Boolean(paperAsset && paperTextureStatus === 'ready' && !paperAssetError);
  const topPaperLayer = paperLayers[paperLayers.length - 1] ?? null;
  const canFillPage = Boolean(paperAsset && paperToolMode === 'brush' && !paperAssetError);
  const canReplaceTopLayer = Boolean(
    paperAsset &&
      paperToolMode === 'brush' &&
      topPaperLayer &&
      topPaperLayer.paperVersionId !== paperAsset.manifest.paperVersionId,
  );
  const undoAvailable = historyCanUndo(history);
  const redoAvailable = historyCanRedo(history);
  const activeToolSize = paperToolMode === 'brush' ? brushSize : eraserSize;
  const hintKey = paperToolMode === 'brush' ? 'editor.paperBrushHint' : 'editor.paperEraserHint';

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
        </PageViewport>

        <div className="viewport-hud" aria-live="polite">
          <div className="viewport-hud__status">
            <strong>
              {LOGICAL_PAGE_SIZE.width} × {LOGICAL_PAGE_SIZE.height}
            </strong>
            <span>
              {paperPack
                ? t('editor.historyLayerStatus', {
                    layers: paperLayers.length,
                    undo: history.undoStack.length,
                    redo: history.redoStack.length,
                  })
                : paperPackError
                  ? t('editor.assetPackErrorShort')
                  : t('editor.assetPackLoadingShort')}
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
            >
              ↷
            </button>
            <button
              type="button"
              className="viewport-fit-button"
              onClick={() => viewportRef.current?.fitToPage()}
              aria-label={t('editor.fitPageAria', { zoom: zoomPercent })}
            >
              {t('editor.fitPage')} · {zoomPercent}%
            </button>
          </div>
        </div>

        <div className="paper-brush-panel" aria-label={t('editor.paperBrushPanelLabel')}>
          <div className="paper-tool-mode" role="group" aria-label={t('editor.paperToolModeLabel')}>
            <button
              type="button"
              className={paperToolMode === 'brush' ? 'is-active' : ''}
              aria-pressed={paperToolMode === 'brush'}
              onClick={() => changePaperToolMode('brush')}
            >
              {t('editor.paperToolLay')}
            </button>
            <button
              type="button"
              className={paperToolMode === 'eraser' ? 'is-active' : ''}
              aria-pressed={paperToolMode === 'eraser'}
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
              disabled={paperToolMode === 'eraser'}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                cancelActiveInput();
                setSelectedManifestUrl(event.target.value);
              }}
              aria-label={t('editor.paperPreviewSelect')}
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
            >
              {t('editor.paperFillPage')}
            </button>
            <button
              type="button"
              disabled={!canReplaceTopLayer}
              onClick={replaceTopLayer}
              aria-label={t('editor.paperReplaceTopAria')}
            >
              {t('editor.paperReplaceTop')}
            </button>
            <button
              type="button"
              className="paper-brush-panel__clear"
              disabled={paperLayers.length === 0}
              onClick={clearPage}
            >
              {t('editor.paperBrushClear')}
            </button>
          </div>
        </div>

        <div className="viewport-gesture-hint">{t(hintKey)}</div>
      </div>

      <nav className="tool-dock" aria-label={t('editor.toolsLabel')}>
        {tools.map((tool) => (
          <button key={tool} type="button" disabled={tool !== 'paper'}>
            <span className="tool-icon" aria-hidden="true">
              {tool === 'paper' ? '▱' : tool === 'media' ? '▧' : tool === 'text' ? 'T' : '✎'}
            </span>
            <span>{t(`editor.tools.${tool}`)}</span>
          </button>
        ))}
      </nav>
    </section>
  );
}
