/**
 * Template Manager Pro - IndexedDB Wrapper
 * Handles all database operations for Templates and Categories.
 */

const DB_NAME = 'TemplateManagerProDB';
const DB_VERSION = 1;

class DB {
    constructor() {
        this.db = null;
    }

    async connect() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error("DB Error:", event);
                reject('Database error: ' + event.target.errorCode);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Templates Store
                if (!db.objectStoreNames.contains('templates')) {
                    const templateStore = db.createObjectStore('templates', { keyPath: 'id' });
                    templateStore.createIndex('category', 'category', { unique: false });
                    templateStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                    templateStore.createIndex('usageCount', 'usageCount', { unique: false });
                    templateStore.createIndex('favorite', 'favorite', { unique: false });
                }

                // Categories Store
                if (!db.objectStoreNames.contains('categories')) {
                    const categoryStore = db.createObjectStore('categories', { keyPath: 'id' });
                    categoryStore.createIndex('name', 'name', { unique: true });
                }
            };
        });
    }

    // --- GENERIC HELPERS ---

    async getAll(storeName) {
        await this.connect();
        return new Promise((resolve) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
        });
    }

    async getById(storeName, id) {
        await this.connect();
        return new Promise((resolve) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async add(storeName, item) {
        await this.connect();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(item); // PUT upserts (insert or update)

            request.onsuccess = () => resolve(item);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, id) {
        await this.connect();
        return new Promise((resolve) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            store.delete(id);
            tx.oncomplete = () => resolve();
        });
    }

    async seed() {
        await this.connect();
        const cats = await this.getAll('categories');
        if (cats.length > 0) return; // Already seeded

        console.log("Seeding Database...");

        // Seed Categories
        const defaultCats = [
            { id: crypto.randomUUID(), name: 'Emails', color: '#3b82f6', createdAt: Date.now() },
            { id: crypto.randomUUID(), name: 'Social Media', color: '#ec4899', createdAt: Date.now() },
            { id: crypto.randomUUID(), name: 'Support', color: '#10b981', createdAt: Date.now() },
            { id: crypto.randomUUID(), name: 'Coding', color: '#6366f1', createdAt: Date.now() }
        ];

        for (const cat of defaultCats) {
            await this.add('categories', cat);
        }

        // Seed Templates
        const templates = [
            {
                id: crypto.randomUUID(),
                title: 'Generic Follow-up',
                content: "Hi {{name}},\n\nJust checking in on this given it's been a few days. Let me know if you are still interested.\n\nBest,\n[Your Name]",
                category: defaultCats[0].id,
                tags: ['sales', 'followup'],
                favorite: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                usageCount: 0
            },
            {
                id: crypto.randomUUID(),
                title: 'Bug Report',
                content: "## Bug Report\n**Context:** {{context}}\n**Steps to Reproduce:**\n1. \n2. \n**Expected:** \n**Actual:** ",
                category: defaultCats[3].id,
                tags: ['ticket', 'dev'],
                favorite: false,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                usageCount: 0
            }
        ];

        for (const tmpl of templates) {
            await this.add('templates', tmpl);
        }
    }
}

// Singleton export
const db = new DB();
