/**
 * storageAdapters.ts — Storage Adapter Implementations (Person 3 / Task 3.1)
 *
 * Defines the StorageAdapter interface and two concrete implementations:
 *   - LocalStorageAdapter: browser localStorage (offline fallback)
 *   - FirebaseAdapter:     Firestore (production backend)
 *
 * Firestore document path: users/{uid}/store/{key}
 * Each document has shape: { value: T, updatedAt: string }
 *
 * Use getAdapter() in all read/write operations. Never call localStorage directly.
 */

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';

import { StorageError } from '@/types';
import { getDb, getCurrentUserId, isFirebaseReady } from './firebase';

// ─── Interface ────────────────────────────────────────────────────────────────

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(keys: string[]): Promise<void>;
}

// ─── LocalStorage Adapter ─────────────────────────────────────────────────────

export class LocalStorageAdapter implements StorageAdapter {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      throw new StorageError(
        'DATA_CORRUPTION',
        `Failed to parse value for key "${key}" from localStorage.`
      );
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        throw new StorageError(
          'STORAGE_QUOTA_EXCEEDED',
          'localStorage quota exceeded. Export and clear old data.'
        );
      }
      throw new StorageError(
        'DATA_CORRUPTION',
        `Failed to write key "${key}" to localStorage.`
      );
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch {
      // Non-fatal — key may not exist
    }
  }

  async clear(keys: string[]): Promise<void> {
    for (const key of keys) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Continue clearing remaining keys
      }
    }
  }
}

// ─── Firebase Adapter ─────────────────────────────────────────────────────────

export class FirebaseAdapter implements StorageAdapter {
  private getDocRef(key: string) {
    const db = getDb();
    const uid = getCurrentUserId();
    if (!db || !uid) {
      throw new StorageError(
        'FIREBASE_UNAVAILABLE',
        'Firebase not ready. Ensure initializeFirebase() completed successfully.'
      );
    }
    return doc(db, 'users', uid, 'store', key);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const snap = await getDoc(this.getDocRef(key));
      if (!snap.exists()) return null;
      return snap.data().value as T;
    } catch (err) {
      if (err instanceof StorageError) throw err;
      throw new StorageError(
        'DATA_CORRUPTION',
        `Firestore read failed for key "${key}": ${String(err)}`
      );
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await setDoc(this.getDocRef(key), {
        value,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof StorageError) throw err;
      throw new StorageError(
        'DATA_CORRUPTION',
        `Firestore write failed for key "${key}": ${String(err)}`
      );
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await deleteDoc(this.getDocRef(key));
    } catch (err) {
      if (err instanceof StorageError) throw err;
      throw new StorageError(
        'DATA_CORRUPTION',
        `Firestore delete failed for key "${key}": ${String(err)}`
      );
    }
  }

  async clear(keys: string[]): Promise<void> {
    const db = getDb();
    const uid = getCurrentUserId();
    if (!db || !uid) {
      throw new StorageError('FIREBASE_UNAVAILABLE', 'Firebase not ready for batch clear.');
    }
    const batch = writeBatch(db);
    for (const key of keys) {
      batch.delete(doc(db, 'users', uid, 'store', key));
    }
    try {
      await batch.commit();
    } catch (err) {
      throw new StorageError(
        'DATA_CORRUPTION',
        `Firestore batch clear failed: ${String(err)}`
      );
    }
  }
}

// ─── FirebaseAdapter Stub (future: server-side / Admin SDK) ──────────────────
//
// export class FirebaseAdminAdapter implements StorageAdapter { ... }
// Reserved for Firestore Admin SDK usage in SSR / Cloud Functions context.

// ─── Adapter Factory ──────────────────────────────────────────────────────────

let _adapter: StorageAdapter | null = null;

/**
 * Sets the active adapter. Called once during `initializeDataStore()`.
 * Pass `true` when Firebase is ready, `false` to fall back to localStorage.
 */
export function initAdapter(useFirebase: boolean): void {
  if (useFirebase && isFirebaseReady()) {
    _adapter = new FirebaseAdapter();
    console.log('[dataStore] Using FirebaseAdapter (Firestore).');
  } else {
    _adapter = new LocalStorageAdapter();
    console.log('[dataStore] Using LocalStorageAdapter (localStorage fallback).');
  }
}

/**
 * Returns the active storage adapter.
 * Falls back to LocalStorageAdapter if `initAdapter()` hasn't been called yet.
 */
export function getAdapter(): StorageAdapter {
  if (!_adapter) {
    // Safe fallback on unexpected early access
    _adapter = new LocalStorageAdapter();
  }
  return _adapter;
}
