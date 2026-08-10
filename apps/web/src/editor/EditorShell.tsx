import { LOGICAL_PAGE_SIZE } from '@unbound-journal/editor-core';
import { loadPaperPackIndex, type PaperPackIndex } from '@unbound-journal/paper-engine';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const tools = ['paper', 'media', 'text', 'draw'] as const;

export function EditorShell() {
  const { t } = useTranslation();
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

  return (
    <section className="editor-shell" aria-label={t('editor.canvasLabel')}>
      <div className="viewport-placeholder">
        <div
          className="page-placeholder"
          data-page-width={LOGICAL_PAGE_SIZE.width}
          data-page-height={LOGICAL_PAGE_SIZE.height}
        >
          <div className="page-placeholder__content">
            <span>{t('editor.assetContractTitle')}</span>
            {paperPack ? (
              <small>
                {t('editor.assetPackReady', {
                  total: paperPack.counts.total,
                  pattern: paperPack.counts.pattern,
                  fullSheet: paperPack.counts['full-sheet'],
                })}
              </small>
            ) : paperPackError ? (
              <small>{t('editor.assetPackError')}</small>
            ) : (
              <small>{t('editor.assetPackLoading')}</small>
            )}
          </div>
        </div>
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
