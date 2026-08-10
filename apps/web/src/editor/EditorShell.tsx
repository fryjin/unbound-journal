import { LOGICAL_PAGE_SIZE } from '@unbound-journal/editor-core';
import {
  PageViewport,
  PaperStack,
  type PageViewportHandle,
  type PageViewportState,
  type PaperTextureLoadStatus,
} from '@unbound-journal/editor-renderer-konva';
import {
  loadPaperPackIndex,
  loadPaperRuntimeAsset,
  type PaperAssetLocale,
  type PaperCatalogEntry,
  type PaperPackIndex,
  type PaperRuntimeAsset,
} from '@unbound-journal/paper-engine';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const tools = ['paper', 'media', 'text', 'draw'] as const;

export function EditorShell() {
  const { i18n, t } = useTranslation();
  const viewportRef = useRef<PageViewportHandle | null>(null);
  const [viewportState, setViewportState] = useState<PageViewportState | null>(null);
  const [paperPack, setPaperPack] = useState<PaperPackIndex | null>(null);
  const [paperPackError, setPaperPackError] = useState(false);
  const [selectedManifestUrl, setSelectedManifestUrl] = useState<string | null>(null);
  const [paperAsset, setPaperAsset] = useState<PaperRuntimeAsset | null>(null);
  const [paperAssetError, setPaperAssetError] = useState(false);
  const [paperTextureStatus, setPaperTextureStatus] = useState<PaperTextureLoadStatus>('idle');

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

  return (
    <section className="editor-shell" aria-label={t('editor.canvasLabel')}>
      <div className="viewport-frame">
        <PageViewport
          ref={viewportRef}
          ariaLabel={t('editor.viewportLabel')}
          onViewportChange={setViewportState}
        >
          {paperAsset ? (
            <PaperStack
              layers={[{ id: 'renderer-preview', asset: paperAsset }]}
              onLayerLoadStateChange={(_layerId, status) => setPaperTextureStatus(status)}
            />
          ) : null}
        </PageViewport>

        <div className="viewport-hud" aria-live="polite">
          <div className="viewport-hud__status">
            <strong>
              {LOGICAL_PAGE_SIZE.width} × {LOGICAL_PAGE_SIZE.height}
            </strong>
            <span>
              {paperPack
                ? t('editor.assetPackShort', { total: paperPack.counts.total })
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

        <div className="paper-renderer-preview" aria-label={t('editor.paperPreviewLabel')}>
          <div className="paper-renderer-preview__meta">
            <span>{t('editor.paperPreview')}</span>
            <strong>{selectedTitle || t('editor.paperPreviewLoading')}</strong>
            {selectedEntry ? (
              <small>
                {selectedEntry.renderMode === 'tile'
                  ? t('editor.renderModeTile')
                  : t('editor.renderModeCover')}
              </small>
            ) : null}
          </div>

          {paperPack ? (
            <select
              value={selectedManifestUrl ?? ''}
              onChange={(event) => setSelectedManifestUrl(event.target.value)}
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

          <span className="paper-renderer-preview__state" role="status">
            {paperAssetError || paperTextureStatus === 'error'
              ? t('editor.paperPreviewError')
              : paperTextureStatus === 'ready'
                ? t('editor.paperPreviewReady')
                : t('editor.paperPreviewLoading')}
          </span>
        </div>

        <div className="viewport-gesture-hint">{t('editor.viewportHint')}</div>
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
