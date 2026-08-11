import { useMemo, useState, type ChangeEvent } from 'react';
import type { P0QaCheckResult, P0QaRuntimeSnapshot, RunP0QaSelfCheckInput } from './p0-qa';
import { runP0QaSelfCheck } from './p0-qa';

const MANUAL_CHECKS = [
  ['gesture', 'Pinch / two-finger pan never lays, erases, or drags content'],
  ['coordinates', 'Paper/content coordinates remain accurate after zoom + pan'],
  ['eraser-lock', 'One paper erase gesture never crosses into the layer below'],
  ['content-select', 'Select mode targets the topmost overlapping content element'],
  ['content-drag', 'Dragging content previews smoothly and commits one history step'],
  ['content-cancel', 'Starting a two-finger gesture cancels an uncommitted content drag'],
  ['content-order', 'Front/back ordering changes hit target and rendering order together'],
  ['reload', 'Reload restores the same paper layers and content elements'],
  ['stress', '5+ paper layers plus content remain responsive during edit / zoom'],
] as const;

type ManualCheckId = (typeof MANUAL_CHECKS)[number][0];
type InteractionMode = 'paper' | 'select';

export interface P0QaPanelProps {
  selfCheckInput: RunP0QaSelfCheckInput;
  canSeedStress: boolean;
  stressBusy: boolean;
  onSeedStress: () => Promise<void>;
  onSeedContent: () => void;
  selectedElementId: string | null;
  interactionMode: InteractionMode;
  onInteractionModeChange: (mode: InteractionMode) => void;
  onRotateSelected: () => void;
  onScaleSelected: () => void;
  onSendSelectedBack: () => void;
  onBringSelectedFront: () => void;
  onRemoveSelected: () => void;
}

function statusSymbol(status: P0QaCheckResult['status']): string {
  return status === 'pass' ? 'PASS' : status === 'warn' ? 'WARN' : 'FAIL';
}

function formatSnapshot(snapshot: P0QaRuntimeSnapshot): string[] {
  return [
    `Viewport: ${Math.round(snapshot.viewportSize.width)}×${Math.round(snapshot.viewportSize.height)} CSS px`,
    `DPR: ${snapshot.devicePixelRatio.toFixed(2)}`,
    `Touch points: ${snapshot.maxTouchPoints}`,
    `Schema: PageDocument v${snapshot.schemaVersion}`,
    `Paper layers: ${snapshot.layerCount} (${snapshot.renderedLayerCount} renderable)`,
    `Mask strokes: ${snapshot.strokeCount}`,
    `Content elements: ${snapshot.elementCount}`,
    `Interaction: ${snapshot.interactionMode}`,
    `Selected: ${snapshot.selectedElementId ?? 'none'}`,
    `History: ${snapshot.undoCount} undo / ${snapshot.redoCount} redo`,
    `Persistence: ${snapshot.persistenceStatus}`,
    `IndexedDB: ${snapshot.indexedDbAvailable ? 'available' : 'unavailable'}`,
    `Language: ${snapshot.language}`,
    `UA: ${snapshot.userAgent}`,
  ];
}

export function P0QaPanel({
  selfCheckInput,
  canSeedStress,
  stressBusy,
  onSeedStress,
  onSeedContent,
  selectedElementId,
  interactionMode,
  onInteractionModeChange,
  onRotateSelected,
  onScaleSelected,
  onSendSelectedBack,
  onBringSelectedFront,
  onRemoveSelected,
}: P0QaPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [running, setRunning] = useState(false);
  const [checks, setChecks] = useState<P0QaCheckResult[]>([]);
  const [snapshot, setSnapshot] = useState<P0QaRuntimeSnapshot | null>(null);
  const [manualChecks, setManualChecks] = useState<Record<ManualCheckId, boolean>>(() =>
    Object.fromEntries(MANUAL_CHECKS.map(([id]) => [id, false])) as Record<ManualCheckId, boolean>,
  );
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const passCount = useMemo(() => checks.filter((check) => check.status === 'pass').length, [checks]);

  const runChecks = async () => {
    setRunning(true);
    setCopyState('idle');
    try {
      const result = await runP0QaSelfCheck(selfCheckInput);
      setChecks(result.checks);
      setSnapshot(result.snapshot);
    } finally {
      setRunning(false);
    }
  };

  const copyReport = async () => {
    if (!snapshot) return;
    const lines = [
      'Unbound Journal — P1.1 QA Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      ...formatSnapshot(snapshot),
      '',
      'Automatic checks:',
      ...checks.map((check) => `- [${statusSymbol(check.status)}] ${check.label}: ${check.detail}`),
      '',
      'Manual checks:',
      ...MANUAL_CHECKS.map(([id, label]) => `- [${manualChecks[id] ? 'PASS' : 'PENDING'}] ${label}`),
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  };

  if (!expanded) {
    return (
      <button
        type="button"
        className="p0-qa-toggle"
        onClick={() => setExpanded(true)}
        data-qa="open-panel"
      >
        QA
      </button>
    );
  }

  return (
    <aside className="p0-qa-panel" data-qa="panel" aria-label="P1.1 QA harness">
      <div className="p0-qa-panel__header">
        <div>
          <strong>P1.1 QA</strong>
          <span>unified document / content foundation</span>
        </div>
        <button type="button" onClick={() => setExpanded(false)} aria-label="Collapse QA panel">
          ×
        </button>
      </div>

      <div className="p0-qa-panel__actions">
        <button type="button" disabled={running} onClick={() => void runChecks()} data-qa="self-check">
          {running ? 'Checking…' : 'Run self-check'}
        </button>
        <button
          type="button"
          disabled={!canSeedStress || stressBusy}
          onClick={() => void onSeedStress()}
          data-qa="seed-stress"
        >
          {stressBusy ? 'Seeding…' : '+5 paper layers'}
        </button>
        <button type="button" onClick={onSeedContent} data-qa="seed-content">+ placeholder</button>
        <button
          type="button"
          onClick={() => onInteractionModeChange(interactionMode === 'paper' ? 'select' : 'paper')}
          data-qa="interaction-mode"
        >
          {interactionMode === 'paper' ? 'Select mode' : 'Paper mode'}
        </button>
        <button type="button" disabled={!selectedElementId} onClick={onRotateSelected}>Rotate +15°</button>
        <button type="button" disabled={!selectedElementId} onClick={onScaleSelected}>Scale +10%</button>
        <button type="button" disabled={!selectedElementId} onClick={onSendSelectedBack}>Send back</button>
        <button type="button" disabled={!selectedElementId} onClick={onBringSelectedFront}>Bring front</button>
        <button type="button" disabled={!selectedElementId} onClick={onRemoveSelected}>Remove</button>
        <button type="button" disabled={!snapshot} onClick={() => void copyReport()}>
          {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy report'}
        </button>
      </div>

      {snapshot ? (
        <dl className="p0-qa-runtime">
          <div><dt>Viewport</dt><dd>{Math.round(snapshot.viewportSize.width)}×{Math.round(snapshot.viewportSize.height)} · DPR {snapshot.devicePixelRatio.toFixed(2)}</dd></div>
          <div><dt>Touch</dt><dd>{snapshot.maxTouchPoints}</dd></div>
          <div><dt>Document</dt><dd>v{snapshot.schemaVersion} · {snapshot.layerCount} paper · {snapshot.elementCount} content</dd></div>
          <div><dt>History</dt><dd>{snapshot.undoCount} undo · {snapshot.redoCount} redo</dd></div>
          <div><dt>Mode</dt><dd>{snapshot.interactionMode} · {snapshot.selectedElementId ? 'selected' : 'none'}</dd></div>
          <div><dt>Storage</dt><dd>{snapshot.persistenceStatus}</dd></div>
        </dl>
      ) : null}

      {checks.length > 0 ? (
        <div className="p0-qa-checks">
          <div className="p0-qa-checks__summary">Automatic: {passCount}/{checks.length} pass</div>
          {checks.map((check) => (
            <div key={check.id} className={`p0-qa-check p0-qa-check--${check.status}`}>
              <strong>{statusSymbol(check.status)}</strong>
              <span>{check.label}</span>
              <small>{check.detail}</small>
            </div>
          ))}
        </div>
      ) : null}

      <fieldset className="p0-qa-manual">
        <legend>Manual device checks</legend>
        {MANUAL_CHECKS.map(([id, label]) => (
          <label key={id}>
            <input
              type="checkbox"
              checked={manualChecks[id]}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setManualChecks((current) => ({ ...current, [id]: event.target.checked }))
              }
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>

      <p className="p0-qa-panel__note">
        QA-only UI. Open with <code>?qa=1</code>. Placeholder elements are development fixtures for the shared Content Stack only.
      </p>
    </aside>
  );
}
