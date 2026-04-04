/**
 * AutoReparatorStore - Manages the persistent logic knowledge base using IndexedDB.
 * Supports up to 1500+ logic variations for the Expert Brain v4.5.
 */

const DB_NAME = "CreativeEngine_KnowledgeBase";
const DB_VERSION = 1;
const STORE_NAME = "logic_variations";

let db = null;

async function openDB() {
    if (db) return db;
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
            }
        };
        request.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };
        request.onerror = (e) => reject(e);
    });
}

export async function saveVariations(variations) {
    const database = await openDB();
    const tx = database.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    // Clear existing to avoid duplicates if re-syncing
    store.clear();

    for (const v of variations) {
        store.put(v);
    }

    return new Promise((resolve) => {
        tx.oncomplete = () => resolve(true);
    });
}

export async function getAllVariations() {
    const database = await openDB();
    const tx = database.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result);
    });
}

export async function searchVariations(query) {
    const variations = await getAllVariations();
    if (!query) return variations;

    const lowerQuery = query.toLowerCase();
    return variations.filter(v =>
        v.name.toLowerCase().includes(lowerQuery) ||
        v.keywords.some(k => k.toLowerCase().includes(lowerQuery))
    );
}

/**
 * Syncs the knowledge base from AutoReparatorData.js if the store is empty
 */
export async function syncIfEmpty(defaultVariations) {
    const existing = await getAllVariations();
    if (existing.length === 0) {
        console.log(`[AutoReparatorStore] Syncing ${defaultVariations.length} default variations...`);
        await saveVariations(defaultVariations);
    } else if (existing.length < defaultVariations.length) {
        // Simple update logic: if we have more in code than in DB, update
        console.log(`[AutoReparatorStore] Updating knowledge base to ${defaultVariations.length} variations...`);
        await saveVariations(defaultVariations);
    }
}
