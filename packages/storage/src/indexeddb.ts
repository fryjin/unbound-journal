import type { DocumentStorage } from './types';

export const DEFAULT_INDEXED_DB_NAME = 'unbound-journal';
export const DEFAULT_INDEXED_DB_VERSION = 1;
export const DEFAULT_DOCUMENT_STORE_NAME = 'documents';

export interface IndexedDbDocumentStorageOptions {
  dbName?: string;
  dbVersion?: number;
  storeName?: string;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

export class IndexedDbDocumentStorage<TDocument> implements DocumentStorage<TDocument> {
  private readonly dbName: string;
  private readonly dbVersion: number;
  private readonly storeName: string;
  private databasePromise: Promise<IDBDatabase> | null = null;

  constructor(options: IndexedDbDocumentStorageOptions = {}) {
    this.dbName = options.dbName ?? DEFAULT_INDEXED_DB_NAME;
    this.dbVersion = options.dbVersion ?? DEFAULT_INDEXED_DB_VERSION;
    this.storeName = options.storeName ?? DEFAULT_DOCUMENT_STORE_NAME;
  }

  async load(id: string): Promise<TDocument | null> {
    const database = await this.openDatabase();
    const transaction = database.transaction(this.storeName, 'readonly');
    const completion = transactionToPromise(transaction);
    const request = transaction.objectStore(this.storeName).get(id);
    const result = await requestToPromise(request);
    await completion;
    return result === undefined ? null : (result as TDocument);
  }

  async save(id: string, document: TDocument): Promise<void> {
    const database = await this.openDatabase();
    const transaction = database.transaction(this.storeName, 'readwrite');
    const completion = transactionToPromise(transaction);
    transaction.objectStore(this.storeName).put(document, id);
    await completion;
  }

  async remove(id: string): Promise<void> {
    const database = await this.openDatabase();
    const transaction = database.transaction(this.storeName, 'readwrite');
    const completion = transactionToPromise(transaction);
    transaction.objectStore(this.storeName).delete(id);
    await completion;
  }

  close(): void {
    void this.databasePromise?.then((database) => database.close()).catch(() => undefined);
    this.databasePromise = null;
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (!isIndexedDbAvailable()) return Promise.reject(new Error('IndexedDB is unavailable'));
    if (this.databasePromise) return this.databasePromise;

    this.databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      let settled = false;

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(this.storeName)) {
          database.createObjectStore(this.storeName);
        }
      };

      request.onsuccess = () => {
        const database = request.result;
        if (settled) {
          database.close();
          return;
        }
        settled = true;
        database.onversionchange = () => {
          database.close();
          this.databasePromise = null;
        };
        resolve(database);
      };

      request.onerror = () => {
        if (settled) return;
        settled = true;
        this.databasePromise = null;
        reject(request.error ?? new Error('Unable to open IndexedDB'));
      };

      request.onblocked = () => {
        if (settled) return;
        settled = true;
        this.databasePromise = null;
        reject(new Error('IndexedDB upgrade is blocked by another tab'));
      };
    });

    return this.databasePromise;
  }
}

export function createIndexedDbDocumentStorage<TDocument>(
  options: IndexedDbDocumentStorageOptions = {},
): IndexedDbDocumentStorage<TDocument> {
  return new IndexedDbDocumentStorage<TDocument>(options);
}
