/** IndexedDB implementation begins in P0.9. */
export interface DocumentStorage<TDocument> {
  load(id: string): Promise<TDocument | null>;
  save(id: string, document: TDocument): Promise<void>;
}
