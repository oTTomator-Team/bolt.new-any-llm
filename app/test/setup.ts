import { vi, beforeEach } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
  removeItem: vi.fn(),
  length: 0,
  key: vi.fn(),
};

// Mock IDBRequest
class MockIDBRequest implements IDBRequest {
  result: any;
  error: DOMException | null = null;
  source: any = null;
  transaction: any = null;
  readyState: IDBRequestReadyState = 'pending';
  onupgradeneeded: ((this: IDBRequest, ev: IDBVersionChangeEvent) => any) | null = null;
  onsuccess: ((this: IDBRequest, ev: Event) => any) | null = null;
  onerror: ((this: IDBRequest, ev: Event) => any) | null = null;

  // Implement EventTarget methods
  addEventListener(
    _type: string,
    _listener: EventListenerOrEventListenerObject,
    _options?: boolean | AddEventListenerOptions,
  ): void {
    // No-op implementation for tests
  }

  removeEventListener(
    _type: string,
    _listener: EventListenerOrEventListenerObject,
    _options?: boolean | EventListenerOptions,
  ): void {
    // No-op implementation for tests
  }

  dispatchEvent(_event: Event): boolean {
    // Always return true for tests
    return true;
  }
}

// Mock IDBDatabase
class MockIDBDatabase {
  objectStoreNames: string[] = [];
  version = 1;

  createObjectStore(name: string, _options?: IDBObjectStoreParameters) {
    this.objectStoreNames.push(name);

    return {
      createIndex: vi.fn(),
      deleteIndex: vi.fn(),
      index: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      get: vi.fn(),
    };
  }
}

// Mock indexedDB
const indexedDBMock = {
  open: vi.fn().mockImplementation(() => {
    const request = new MockIDBRequest();

    setTimeout(() => {
      if (request.onupgradeneeded) {
        const db = new MockIDBDatabase();
        request.result = db;

        const event = { target: request } as unknown as IDBVersionChangeEvent;
        request.onupgradeneeded(event);
      }

      if (request.onsuccess) {
        const event = { target: request } as unknown as Event;
        request.onsuccess(event);
      }
    }, 0);

    return request;
  }),
  deleteDatabase: vi.fn(),
  cmp: vi.fn(),
  databases: vi.fn(),
} as unknown as IDBFactory;

// Set up global mocks
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

Object.defineProperty(global, 'indexedDB', { value: indexedDBMock });

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
