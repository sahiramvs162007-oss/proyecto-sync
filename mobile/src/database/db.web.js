const DB_NAME = 'sync_app_web';
const DB_VERSION = 2;

let dbPromise = null;

/**
 * Abre (y crea si no existe) la base IndexedDB con sus 4 "tablas" (object stores),
 * equivalentes a las de schema.sql pero en el navegador.
 */
export function getDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const transaction = event.target.transaction;

      let personasStore;
      if (!db.objectStoreNames.contains('personas')) {
        personasStore = db.createObjectStore('personas', { keyPath: 'uuid' });
      } else {
        personasStore = transaction.objectStore('personas');
      }

      if (!personasStore.indexNames.contains('documento')) {
        personasStore.createIndex('documento', 'documento', { unique: false });
      }
      if (!db.objectStoreNames.contains('sync_queue')) {
        const store = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        store.createIndex('status', 'status', { unique: false });
      }
      if (!db.objectStoreNames.contains('usuarios')) {
        db.createObjectStore('usuarios', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('configuracion')) {
        db.createObjectStore('configuracion', { keyPath: 'clave' });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });

  return dbPromise;
}

// Mantiene la misma firma que database/db.js (versión nativa) para que
// App.js no necesite saber en qué plataforma corre.
export async function initDatabase() {
  await getDb();
  console.log('✅ Base de datos local (IndexedDB) inicializada');
}
