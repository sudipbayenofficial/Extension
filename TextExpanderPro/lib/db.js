/**
 * Database Module - TextExpander Pro
 * IndexedDB wrapper for template and folder storage
 */

const DB_NAME = 'TextExpanderDB';
const DB_VERSION = 1;

const db = {
    instance: null,

    /**
     * Initialize the database
     */
    init: async () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                db.instance = request.result;
                resolve(db.instance);
            };

            request.onupgradeneeded = (event) => {
                const database = event.target.result;

                // Templates Store
                if (!database.objectStoreNames.contains('templates')) {
                    const templateStore = database.createObjectStore('templates', { keyPath: 'id' });
                    templateStore.createIndex('trigger', 'trigger', { unique: true });
                    templateStore.createIndex('folder', 'folder', { unique: false });
                    templateStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                }

                // Folders Store
                if (!database.objectStoreNames.contains('folders')) {
                    database.createObjectStore('folders', { keyPath: 'id' });
                }
            };
        });
    },

    /**
     * Add or update an item
     */
    add: async (storeName, item) => {
        if (!db.instance) await db.init();
        const tx = db.instance.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        await store.put(item);
        return tx.complete;
    },

    /**
     * Get all items from a store
     */
    getAll: async (storeName) => {
        if (!db.instance) await db.init();
        const tx = db.instance.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get item by ID
     */
    getById: async (storeName, id) => {
        if (!db.instance) await db.init();
        const tx = db.instance.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Delete item by ID
     */
    delete: async (storeName, id) => {
        if (!db.instance) await db.init();
        const tx = db.instance.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        await store.delete(id);
        return tx.complete;
    },

    /**
     * Seed initial data
     */
    seed: async () => {
        const existing = await db.getAll('templates');
        if (existing.length > 0) return;

        const defaultFolder = {
            id: 'default',
            name: 'General',
            color: '#6366f1'
        };

        const sampleTemplate = {
            id: crypto.randomUUID(),
            trigger: ';br',
            title: 'Best Regards',
            content: 'Best regards,<br>Your Name',
            folder: 'default',
            tags: [],
            favorite: false,
            usageCount: 0,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        await db.add('folders', defaultFolder);
        await db.add('templates', sampleTemplate);
    }
};

// Export
if (typeof self !== 'undefined') {
    self.db = db;
} else if (typeof window !== 'undefined') {
    window.db = db;
}
