export interface GenericStringStorage {
  getItem(key: string): string | Promise<string | null> | null;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

export class GenericStringInMemoryStorage implements GenericStringStorage {
  #store = new Map<string, string>();

  getItem(key: string): string | Promise<string | null> | null {
    return this.#store.has(key) ? this.#store.get(key)! : null;
  }
  setItem(key: string, value: string): void | Promise<void> {
    this.#store.set(key, value);
  }
  removeItem(key: string): void | Promise<void> {
    this.#store.delete(key);
  }
}

// IndexedDB storage for persistence
export class GenericStringIndexedDBStorage implements GenericStringStorage {
  #dbName = "shadowfinance-storage";
  #storeName = "keyvalue";

  async getItem(key: string): Promise<string | null> {
    const db = await this.#openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.#storeName], "readonly");
      const store = transaction.objectStore(this.#storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async setItem(key: string, value: string): Promise<void> {
    const db = await this.#openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.#storeName], "readwrite");
      const store = transaction.objectStore(this.#storeName);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async removeItem(key: string): Promise<void> {
    const db = await this.#openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.#storeName], "readwrite");
      const store = transaction.objectStore(this.#storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async #openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.#dbName, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.#storeName)) {
          db.createObjectStore(this.#storeName);
        }
      };
    });
  }
}




