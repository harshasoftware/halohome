/**
 * SQLite WASM Initialization
 *
 * Initializes SQLite with OPFS (Origin Private File System) for persistent storage.
 * OPFS provides better mobile support than IndexedDB (no quota issues).
 *
 * Features:
 * - Persistent storage across sessions
 * - Offline-capable
 * - Fast queries (<1ms for geocoding)
 * - Works on mobile without quota issues
 */

// NOTE: We use dynamic import() for sqlite-wasm so we can set config BEFORE module loads
// Static imports evaluate immediately, before we can set globalThis.sqlite3InitModuleState

// Database state
let db: any = null;
let sqlite3: any = null;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

// Database name
const DB_NAME = 'astrocartography.sqlite3';

// Timeout for SQLite initialization (10 seconds)
const SQLITE_INIT_TIMEOUT = 10000;

/**
 * Helper to add timeout to a promise
 */
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    ),
  ]);
}

/**
 * Initialize SQLite WASM with OPFS persistence
 */
export async function initSQLite(): Promise<void> {
  // Return existing promise if already initializing
  if (initPromise) {
    return initPromise;
  }

  // Return immediately if already initialized
  if (isInitialized && db) {
    return;
  }

  initPromise = (async () => {
    try {
      console.log('[SQLite] Initializing SQLite WASM...');

      // Load sqlite3.js as a script from our public folder
      // This ensures all relative paths (sqlite3.wasm, workers) resolve correctly
      // sqlite3.js sets globalThis.sqlite3InitModule when loaded
      const sqlite3Url = '/sqlite-wasm/sqlite3.js';
      console.log('[SQLite] Loading script from:', sqlite3Url);

      // Load as script tag (not ES module import)
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = sqlite3Url;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load sqlite3.js'));
        document.head.appendChild(script);
      });

      // Get the init function that was set on globalThis
      const sqlite3InitModule = (globalThis as any).sqlite3InitModule;
      if (!sqlite3InitModule) {
        throw new Error('sqlite3InitModule not found after loading script');
      }

      console.log('[SQLite] Script loaded, initializing...');

      // Initialize the SQLite module with timeout
      // SQLite WASM can hang if OPFS workers fail to load
      sqlite3 = await withTimeout(
        sqlite3InitModule({
          print: console.log,
          printErr: console.error,
        }),
        SQLITE_INIT_TIMEOUT,
        'SQLite WASM initialization timed out'
      );

      console.log('[SQLite] SQLite version:', sqlite3.version.libVersion);

      // Check for OPFS support
      const hasOPFS = 'opfs' in sqlite3;
      console.log('[SQLite] OPFS available:', hasOPFS);

      if (hasOPFS && typeof sqlite3.oo1.OpfsDb === 'function') {
        // Use OPFS for persistent storage (preferred)
        try {
          db = new sqlite3.oo1.OpfsDb(DB_NAME, 'c');
          console.log('[SQLite] Using OPFS persistence');
        } catch (opfsError) {
          console.warn('[SQLite] OPFS failed, falling back to in-memory:', opfsError);
          db = new sqlite3.oo1.DB(':memory:', 'c');
        }
      } else {
        // Fallback to in-memory database
        console.log('[SQLite] OPFS not available, using in-memory database');
        db = new sqlite3.oo1.DB(':memory:', 'c');
      }

      // Enable WAL mode for better performance
      db.exec('PRAGMA journal_mode = WAL');
      db.exec('PRAGMA synchronous = NORMAL');
      db.exec('PRAGMA cache_size = 10000');

      isInitialized = true;
      console.log('[SQLite] Database initialized successfully');
    } catch (error) {
      console.error('[SQLite] Initialization failed:', error);
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Get the database instance
 */
export function getDB(): any {
  if (!db) {
    throw new Error('SQLite not initialized. Call initSQLite() first.');
  }
  return db;
}

/**
 * Check if SQLite is initialized
 */
export function isDBReady(): boolean {
  return isInitialized && db !== null;
}

/**
 * Execute a SQL statement
 */
export function execSQL(sql: string, params?: any[]): void {
  const database = getDB();
  if (params && params.length > 0) {
    database.exec({ sql, bind: params });
  } else {
    database.exec(sql);
  }
}

/**
 * Execute a SQL query and return results
 */
export function querySQL<T = any>(sql: string, params?: any[]): T[] {
  const database = getDB();
  const results: T[] = [];

  database.exec({
    sql,
    bind: params,
    callback: (row: any) => {
      if (row) {
        results.push(row as T);
      }
    },
    rowMode: 'object',
  });

  return results;
}

/**
 * Execute a SQL query and return first result
 */
export function querySQLOne<T = any>(sql: string, params?: any[]): T | null {
  const results = querySQL<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Begin a transaction
 */
export function beginTransaction(): void {
  execSQL('BEGIN TRANSACTION');
}

/**
 * Commit a transaction
 */
export function commitTransaction(): void {
  execSQL('COMMIT');
}

/**
 * Rollback a transaction
 */
export function rollbackTransaction(): void {
  execSQL('ROLLBACK');
}

/**
 * Execute multiple statements in a transaction
 */
export async function withTransaction<T>(fn: () => T | Promise<T>): Promise<T> {
  beginTransaction();
  try {
    const result = await fn();
    commitTransaction();
    return result;
  } catch (error) {
    rollbackTransaction();
    throw error;
  }
}

/**
 * Close the database connection
 */
export function closeDB(): void {
  if (db) {
    db.close();
    db = null;
    isInitialized = false;
    initPromise = null;
    console.log('[SQLite] Database closed');
  }
}

/**
 * Get database file size (only for OPFS)
 */
export async function getDBSize(): Promise<number | null> {
  if (!db || !db.filename || db.filename === ':memory:') {
    return null;
  }

  try {
    // OPFS API to get file size
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(DB_NAME);
    const file = await handle.getFile();
    return file.size;
  } catch {
    return null;
  }
}

/**
 * Export database as Uint8Array
 */
export function exportDB(): Uint8Array | null {
  if (!db) return null;

  try {
    return sqlite3.capi.sqlite3_js_db_export(db);
  } catch {
    return null;
  }
}
