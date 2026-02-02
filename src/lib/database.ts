import Database from 'better-sqlite3';
import path from 'path';
import { DATA_DIR } from './constants';

const DB_PATH = path.join(DATA_DIR, 'content.db');

let dbInstance: Database.Database | null = null;

/**
 * Get readonly database connection for build-time queries
 * Multiple workers can safely share this connection
 */
export async function getDatabase(): Promise<Database.Database> {
  if (!dbInstance) {
    // Check if database exists
    const { existsSync } = await import('fs');
    if (!existsSync(DB_PATH)) {
      throw new Error(
        `Database not found at ${DB_PATH}. Run 'yarn index-content' first.`
      );
    }
    
    dbInstance = new Database(DB_PATH, { readonly: true });
    
    // Optimize for concurrent reads
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('synchronous = NORMAL');
  }
  
  return dbInstance;
}

/**
 * Get writable database connection (prebuild only)
 */
export async function getWritableDatabase(): Promise<Database.Database> {
  const { mkdirSync } = await import('fs');
  const { dirname } = await import('path');
  
  // Ensure directory exists
  mkdirSync(dirname(DB_PATH), { recursive: true });
  
  const db = new Database(DB_PATH);
  
  // Optimize for bulk writes
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000'); // 64MB cache
  
  return db;
}

/**
 * Close database connection (cleanup)
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}