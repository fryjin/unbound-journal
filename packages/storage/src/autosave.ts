export type AutosaveStatus = 'idle' | 'scheduled' | 'saving' | 'saved' | 'error';

export interface DebouncedAutosaveOptions<TValue> {
  save: (value: TValue) => Promise<void>;
  delayMs?: number;
  onStatusChange?: (status: AutosaveStatus, error?: unknown) => void;
}

export interface DebouncedAutosaveController<TValue> {
  schedule(value: TValue): void;
  flush(): Promise<void>;
  cancel(): void;
  getStatus(): AutosaveStatus;
}

export function createDebouncedAutosave<TValue>({
  save,
  delayMs = 500,
  onStatusChange,
}: DebouncedAutosaveOptions<TValue>): DebouncedAutosaveController<TValue> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingValue: TValue | undefined;
  let status: AutosaveStatus = 'idle';
  let writeChain = Promise.resolve();

  const publishStatus = (nextStatus: AutosaveStatus, error?: unknown) => {
    status = nextStatus;
    onStatusChange?.(nextStatus, error);
  };

  const enqueuePending = (): Promise<void> => {
    if (pendingValue === undefined) return writeChain;
    const value = pendingValue;
    pendingValue = undefined;

    writeChain = writeChain
      .catch(() => undefined)
      .then(async () => {
        publishStatus('saving');
        try {
          await save(value);
          publishStatus(pendingValue === undefined && timer === null ? 'saved' : 'scheduled');
        } catch (error) {
          publishStatus('error', error);
          throw error;
        }
      });

    return writeChain;
  };

  return {
    schedule(value) {
      pendingValue = value;
      if (timer) clearTimeout(timer);
      publishStatus('scheduled');
      timer = setTimeout(() => {
        timer = null;
        void enqueuePending().catch(() => undefined);
      }, Math.max(0, delayMs));
    },
    flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      return enqueuePending();
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
      pendingValue = undefined;
      publishStatus('idle');
    },
    getStatus() {
      return status;
    },
  };
}
