import { LOGICAL_PAGE_SIZE } from '@unbound-journal/editor-core';
import {
  PageViewport,
  type PageViewportHandle,
  type PageViewportState,
} from '@unbound-journal/editor-renderer-konva';
import { loadPaperPackIndex, type PaperPackIndex } from '@unbound-journal/paper-engine';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const tools = ['paper', 'media', 'text', 'draw'] as const;

export function EditorShell() {
  const { t } = useTranslation();
  const viewportRef = useRef<PageViewportHandle | null>(null);
  const [viewportState, setViewportState] = useState<PageViewportState | null>(null);
  const [paperPack, setPaperPack] = useState<PaperPackIndex | null>(null);
  const [paperPackError, setPaperPackError] = useState(false);

  useEffect(() => {
    let active = true;
    void loadPaperPackIndex()
      .then((pack) => {
        if (active) setPaperPack(pack);
      })
      .catch(() => {
        if (active) setPaperPackError(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const zoomPercent = Math.round((viewportState?.zoom ?? 1) * 100);

  return (
    <section className="editor-shell" aria-label={t('editor.canvasLabel')}>
      <div className="viewport-frame">
        <PageViewport
          ref={viewportRef}
          ariaLabel={t('editor.viewportLabel')}
          onViewportChange={setViewportState}
        />

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
