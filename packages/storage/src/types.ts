export interface DocumentStorage<TDocument> {
  load(id: string): Promise<TDocument | null>;
  save(id: string, document: TDocument): Promise<void>;
  remove(id: string): Promise<void>;
}
