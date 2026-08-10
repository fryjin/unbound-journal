import { LOGICAL_PAGE_SIZE } from '@unbound-journal/editor-core';
import {
  PageViewport,
  PaperBrushPreview,
  PaperStack,
  type PageInputEvent,
  type PageViewportHandle,
  type PageViewportState,
  type PaperBrushPreviewHandle,
  type PaperRenderLayer,
  type PaperTextureLoadStatus,
} from '@unbound-journal/editor-renderer-konva';
import {
  appendPaperMaskStroke,
  createPaperLayerFromAsset,
  loadPaperPackIndex,
  loadPaperRuntimeAsset,
  type PaperAssetLocale,
  type PaperCatalogEntry,
  type PaperPackIndex,
  type PaperRuntimeAsset,
} from '@unbound-journal/paper-engine';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const tools = ['paper', 'media', 'text', 'draw'] as const;
const DEFAULT_BRUSH_SIZE = 180;
const MIN_BRUSH_SIZE = 60;
const MAX_BRUSH_SIZE = 360;

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function EditorShell() {
  const { i18n, t } = useTranslation();
  const viewportRef = useRef<PageViewportHandle | null>(null);
  const brushPreviewRef = useRef<PaperBrushPreviewHandle | null>(null);
  const strokeAssetRef = useRef<PaperRuntimeAsset | null>(null);
  const [viewportState, setViewportState] = useState<PageViewportState | null>(null);
  const [paperPack, setPaperPack] = useState<PaperPackIndex | null>(null);
  const [paperPackError, setPaperPackError] = useState(false);
  const [selectedManifestUrl, setSelectedManifestUrl] = useState<string | null>(null);
  const [paperAsset, setPaperAsset] = useState<PaperRuntimeAsset | null>(null);
  const [paperAssetError, setPaperAssetError] = useState(false);
  const [paperTextureStatus, setPaperTextureStatus] = useState<PaperTextureLoadStatus>('idle');
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_SIZE);
  const [paperLayers, setPaperLayers] = useState<PaperRenderLayer[]>([]);

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
        if (active) setPaperAsset(asset);
      })
      .catch(() => {
        if (active) setPaperAssetError(true);
      });

    return () => {
      active = false;
    };
  }, [selectedManifestUrl]);

  const locale = (i18n.resolvedLanguage ?? 'en') as PaperAssetLocale;
  const zoomPercent = Math.round((viewportState?.zoom ?? 1) * 100);

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

  const cancelActiveStroke = useCallback(() => {
    brushPreviewRef.current?.cancelStroke();
    strokeAssetRef.current = null;
  }, []);

  const handlePageInputStart = useCallback(
    (event: PageInputEvent) => {
      if (!event.insidePage || !paperAsset) return;
      const started = brushPreviewRef.current?.beginStroke(event.pagePoint, brushSize) ?? false;
      strokeAssetRef.current = started ? paperAsset : null;
    },
    [brushSize, paperAsset],
  );

  const handlePageInputMove = useCallback((event: PageInputEvent) => {
    if (!strokeAssetRef.current) return;
    brushPreviewRef.current?.appendPoint(event.pagePoint);
  }, []);

  const handlePageInputEnd = useCallback((event: PageInputEvent | null) => {
    const strokeAsset = strokeAssetRef.current;
    if (!strokeAsset) return;

    if (event) brushPreviewRef.current?.appendPoint(event.pagePoint);
    const stroke = brushPreviewRef.current?.finishStroke(createId('stroke')) ?? null;
    strokeAssetRef.current = null;
    if (!stroke) {
      brushPreviewRef.current?.clearPreview();
      return;
    }

    setPaperLayers((currentLayers) => {
      const topLayer = currentLayers[currentLayers.length - 1];
      if (topLayer?.layer.paperVersionId === strokeAsset.manifest.paperVersionId) {
        return [
          ...currentLayers.slice(0, -1),
          {
            ...topLayer,
            layer: appendPaperMaskStroke(topLayer.layer, stroke),
          },
        ];
      }

      return [
        ...currentLayers,
        {
          layer: createPaperLayerFromAsset(
            createId('paper-layer'),
            strokeAsset,
            new Date().toISOString(),
            [stroke],
          ),
          asset: strokeAsset,
        },
      ];
    });

    requestAnimationFrame(() => brushPreviewRef.current?.clearPreview());
  }, []);

  const clearPage = useCallback(() => {
    cancelActiveStroke();
    setPaperLayers([]);
  }, [cancelActiveStroke]);

  const paperReady = Boolean(paperAsset && paperTextureStatus === 'ready' && !paperAssetError);

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
          onPageInputCancel={cancelActiveStroke}
        >
          <PaperStack layers={paperLayers} />
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
                ? t('editor.brushLayerStatus', {
                    layers: paperLayers.length,
                    total: paperPack.counts.total,
                  })
                : paperPackError
                  ? t('editor.assetPackErrorShort')
                  : t('editor.assetPackLoadingShort')}
            </span>
          </div>
          <button
            type="button"
            className="viewport-fit-button"
            onClick={() => viewportRef.current?.fitToPage()}
            aria-label={t('editor.fitPageAria', { zoom: zoomPercent })}
          >
            {t('editor.fitPage')} · {zoomPercent}%
          </button>
        </div>

        <div className="paper-brush-panel" aria-label={t('editor.paperBrushPanelLabel')}>
          <div className="paper-brush-panel__paper">
            <span>{t('editor.paperBrushSelected')}</span>
            <strong>{selectedTitle || t('editor.paperPreviewLoading')}</strong>
            <small className={paperReady ? 'is-ready' : ''}>
              {paperAssetError || paperTextureStatus === 'error'
                ? t('editor.paperPreviewError')
                : paperReady
                  ? t('editor.paperBrushReady')
                  : t('editor.paperPreviewLoading')}
            </small>
          </div>

          {paperPack ? (
            <select
              value={selectedManifestUrl ?? ''}
              onChange={(event) => {
                cancelActiveStroke();
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
              {t('editor.paperBrushSize')} <strong>{brushSize}</strong>
            </span>
            <input
              type="range"
              min={MIN_BRUSH_SIZE}
              max={MAX_BRUSH_SIZE}
              step={10}
              value={brushSize}
              onChange={(event) => setBrushSize(Number(event.target.value))}
            />
          </label>

          <button
            type="button"
            className="paper-brush-panel__clear"
            disabled={paperLayers.length === 0}
            onClick={clearPage}
          >
            {t('editor.paperBrushClear')}
          </button>
        </div>

        <div className="viewport-gesture-hint">{t('editor.paperBrushHint')}</div>
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
