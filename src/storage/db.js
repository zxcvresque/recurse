/**
 * ReCURSE - Storage Manager
 * IndexedDB wrapper for pages, assets, and crawl metadata
 */

const DB_NAME = 'recurse_archive';
const DB_VERSION = 1;

export class StorageManager {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Pages store
                if (!db.objectStoreNames.contains('pages')) {
                    const pagesStore = db.createObjectStore('pages', { keyPath: 'id' });
                    pagesStore.createIndex('url', 'url', { unique: false });
                    pagesStore.createIndex('depth', 'depth', { unique: false });
                    pagesStore.createIndex('crawlId', 'crawlId', { unique: false });
                    pagesStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Assets store
                if (!db.objectStoreNames.contains('assets')) {
                    const assetsStore = db.createObjectStore('assets', { keyPath: 'hash' });
                    assetsStore.createIndex('type', 'type', { unique: false });
                    assetsStore.createIndex('url', 'url', { unique: false });
                    assetsStore.createIndex('crawlId', 'crawlId', { unique: false });
                }

                // Crawls store (metadata)
                if (!db.objectStoreNames.contains('crawls')) {
                    const crawlsStore = db.createObjectStore('crawls', { keyPath: 'id' });
                    crawlsStore.createIndex('startUrl', 'startUrl', { unique: false });
                    crawlsStore.createIndex('status', 'status', { unique: false });
                    crawlsStore.createIndex('startedAt', 'startedAt', { unique: false });
                }
            };
        });
    }

    // ==================== CRAWLS ====================

    async saveCrawl(crawl) {
        return this.put('crawls', crawl);
    }

    async getCrawl(id) {
        return this.get('crawls', id);
    }

    async updateCrawl(id, updates) {
        const crawl = await this.getCrawl(id);
        if (!crawl) return null;
        const updated = { ...crawl, ...updates, updatedAt: Date.now() };
        await this.put('crawls', updated);
        return updated;
    }

    async getAllCrawls() {
        return this.getAll('crawls');
    }

    // ==================== PAGES ====================

    async savePage(page) {
        return this.put('pages', page);
    }

    async getPage(id) {
        return this.get('pages', id);
    }

    async getPageByUrl(url) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('pages', 'readonly');
            const store = transaction.objectStore('pages');
            const index = store.index('url');
            const request = index.get(url);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async getAllPages(crawlId = null) {
        if (!crawlId) {
            return this.getAll('pages');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('pages', 'readonly');
            const store = transaction.objectStore('pages');
            const index = store.index('crawlId');
            const request = index.getAll(crawlId);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async getPageCount() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('pages', 'readonly');
            const store = transaction.objectStore('pages');
            const request = store.count();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    // ==================== ASSETS ====================

    async saveAsset(asset) {
        // Check if asset already exists (deduplication)
        const existing = await this.getAsset(asset.hash);
        if (existing) {
            // Increment reference count
            existing.refCount = (existing.refCount || 1) + 1;
            return this.put('assets', existing);
        }

        asset.refCount = 1;
        return this.put('assets', asset);
    }

    async getAsset(hash) {
        return this.get('assets', hash);
    }

    async getAllAssets(crawlId = null) {
        if (!crawlId) {
            return this.getAll('assets');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('assets', 'readonly');
            const store = transaction.objectStore('assets');
            const index = store.index('crawlId');
            const request = index.getAll(crawlId);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async getAssetByUrl(url) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('assets', 'readonly');
            const store = transaction.objectStore('assets');
            const index = store.index('url');
            const request = index.get(url);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    // ==================== UTILITIES ====================

    async getTotalSize() {
        const pages = await this.getAll('pages');
        const assets = await this.getAll('assets');

        let total = 0;

        for (const page of pages) {
            total += page.html?.length || 0;
        }

        for (const asset of assets) {
            total += asset.size || 0;
        }

        return total;
    }

    async clear() {
        const storeNames = ['pages', 'assets', 'crawls'];

        for (const storeName of storeNames) {
            await new Promise((resolve, reject) => {
                const transaction = this.db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.clear();

                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve();
            });
        }
    }

    async deleteCrawl(crawlId) {
        // Delete all pages for this crawl
        const pages = await this.getAllPages(crawlId);
        for (const page of pages) {
            await this.delete('pages', page.id);
        }

        // Delete crawl metadata
        await this.delete('crawls', crawlId);
    }

    // ==================== GENERIC HELPERS ====================

    put(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }
}
