import { FeatureExtractionPipeline, pipeline } from '@xenova/transformers';
import { createRxDatabase, type RxDatabase, type RxCollection, type RxDocument } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { TextChunker, type ChunkOptions } from './text-chunker';

// Define the document schema type
interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

// Define the collection schema
const vectorStoreSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    content: {
      type: 'string',
    },
    embedding: {
      type: 'array',
      items: {
        type: 'number',
      },
    },
    metadata: {
      type: 'object',
    },
  },
  required: ['id', 'content', 'embedding'],
};

export class VectorStore {
  private _db: RxDatabase | undefined;
  private _collection: RxCollection | undefined;
  private _embedder: Promise<FeatureExtractionPipeline>;
  private _chunker: TextChunker;
  private _initialized: boolean = false;

  get isInitialized(): boolean {
    return this._initialized;
  }

  constructor(chunkOptions: ChunkOptions = {}) {
    this._embedder = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    this._chunker = new TextChunker(chunkOptions);
  }

  async initialize(dbName: string = 'doc-store'): Promise<void> {
    this._db = await createRxDatabase({
      name: dbName,
      storage: getRxStorageDexie(),
    });

    await this._db.addCollections({
      documents: {
        schema: vectorStoreSchema,
      },
    });

    this._collection = this._db.documents;
    this._initialized = true;
  }

  private async _getEmbedding(text: string): Promise<number[]> {
    const pipe = await this._embedder;
    const output = await pipe(text, { pooling: 'mean', normalize: true });

    return Array.from(output.data);
  }

  async addDocument(content: string, metadata?: Record<string, any>, id?: string): Promise<RxDocument<VectorDocument>> {
    if (!this._initialized) {
      throw new Error('Vector store not initialized');
    }

    if (!this._collection) {
      throw new Error('Collection not initialized');
    }

    const embedding = await this._getEmbedding(content);
    const docId = id || crypto.randomUUID();

    const document: VectorDocument = {
      id: docId,
      content,
      embedding,
      metadata,
    };

    return await this._collection.insert(document);
  }

  async addDocuments(
    documents: Array<{ content: string; metadata?: Record<string, any>; id?: string }>,
  ): Promise<RxDocument<VectorDocument>[]> {
    const promises = documents.map((doc) => this.addDocument(doc.content, doc.metadata, doc.id));
    return Promise.all(promises);
  }

  async addDocumentWithChunking(
    content: string,
    metadata?: Record<string, any>,
    baseId?: string,
  ): Promise<RxDocument<VectorDocument>[]> {
    const chunks = this._chunker.chunk(content);

    const documents = chunks.map((chunk, index) => ({
      content: chunk,
      metadata: {
        ...metadata,
        chunkIndex: index,
        totalChunks: chunks.length,
        originalText: content.slice(0, 100) + '...', // Store the beginning of original text
      },
      id: baseId ? `${baseId}-chunk-${index}` : undefined,
    }));

    return this.addDocuments(documents);
  }

  private _cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async similaritySearch(
    query: string,
    k: number = 5,
  ): Promise<Array<{ content: string; similarity: number; metadata?: Record<string, any> }>> {
    if (!this._initialized) {
      throw new Error('Vector store not initialized');
    }

    if (!this._collection) {
      throw new Error('Collection not initialized');
    }

    const queryEmbedding = await this._getEmbedding(query);
    const documents = await this._collection?.find().exec();

    const results = documents.map((doc) => ({
      content: doc.content,
      metadata: doc.metadata,
      similarity: this._cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, k);
  }

  async deleteDocument(id: string): Promise<void> {
    if (!this._initialized) {
      throw new Error('Vector store not initialized');
    }

    if (!this._collection) {
      throw new Error('Collection not initialized');
    }

    await this._collection.findOne(id).remove();
  }

  async close(): Promise<void> {
    await this._db?.destroy();
  }
}
