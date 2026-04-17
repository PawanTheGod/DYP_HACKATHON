/**
 * dataStore.ts — StudyOS Storage Abstraction Layer (Person 3 / Task 3.1)
 *
 * Production-grade data persistence with:
 *   - Adapter pattern: FirebaseAdapter (Firestore) or LocalStorageAdapter (fallback)
 *   - Schema versioning + migration engine
 *   - Promise-based write queue (no race conditions)
 *   - Structured StorageError with error codes
 *   - Expo/AsyncStorage ready (swap adapter in storageAdapters.ts)
 *
 * Debug: localStorage.setItem('studyos_debug', 'true')
 */

import {
  AppDataStore,
  UserProfile,
  ScheduleBlock,
  CompletionLogEntry,
  ChatMessage,
  DailyLogEntry,
  StorageError,
} from '@/types';

import { initializeFirebase } from './firebase';
import { getAdapter, initAdapter, StorageAdapter } from './storageAdapters';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Increment this when the schema changes. Migration engine runs automatically. */
export const SCHEMA_VERSION = 1;

const APP_VERSION: string =
  (import.meta.env.VITE_APP_VERSION as string | undefined) ?? '1.0.0';

const STORAGE_WARN_THRESHOLD_BYTES = 5 * 1024 * 1024; // 5 MB

/** All storage keys in one frozen object — no magic strings anywhere else. */
export const STORAGE_KEYS = Object.freeze({
  VERSION: 'studyos_schema_version',
  USER_PROFILE: 'studyos_user_profile',
  SCHEDULE_BLOCKS: 'studyos_schedule_blocks',
  COMPLETION_LOG: 'studyos_completion_log',
  CHAT_HISTORY: 'studyos_chat_history',
  DAILY_LOG: 'studyos_daily_log',
  ONBOARDING_COMPLETE: 'studyos_onboarding_complete',
  METADATA: 'studyos_metadata',
  DEBUG: 'studyos_debug',
} as const);

// ─── Write Queue (Mutex) ──────────────────────────────────────────────────────

/**
 * All write operations are serialised through this queue.
 * Prevents race conditions when multiple async actions fire simultaneously.
 */
let _writeQueue: Promise<void> = Promise.resolve();

function enqueueWrite<T>(fn: () => Promise<T>): Promise<T> {
  let resolveFn!: (value: T) => void;
  let rejectFn!: (err: unknown) => void;

  const ticket = new Promise<T>((res, rej) => {
    resolveFn = res;
    rejectFn = rej;
  });

  _writeQueue = _writeQueue
    .then(() => fn())
    .then((val) => {
      resolveFn(val);
    })
    .catch((err) => {
      rejectFn(err);
    });

  return ticket;
}

// ─── Init Guard ───────────────────────────────────────────────────────────────

let _initPromise: Promise<void> | null = null;

// ─── Debug ────────────────────────────────────────────────────────────────────

function isDebugMode(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.DEBUG) === 'true';
  } catch {
    return false;
  }
}

function debugLog(...args: unknown[]): void {
  if (isDebugMode()) console.log('[dataStore]', ...args);
}

// ─── Device ID ────────────────────────────────────────────────────────────────

function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem('studyos_device_id');
    if (existing) return existing;
    const id = `device_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem('studyos_device_id', id);
    return id;
  } catch {
    return `device_${Date.now()}`;
  }
}

// ─── Migration Engine ─────────────────────────────────────────────────────────

/**
 * Applies all migrations from `fromVersion` up to `SCHEMA_VERSION`.
 * Each migration step is idempotent — safe to run multiple times.
 */
async function migrateSchema(fromVersion: number): Promise<void> {
  const adapter = getAdapter();

  try {
    if (fromVersion < 1) {
      // v0 → v1: Ensure all collection keys exist + add version marker
      debugLog('Migration: v0 → v1 starting...');

      const allKeys: (keyof typeof STORAGE_KEYS)[] = [
        'SCHEDULE_BLOCKS',
        'COMPLETION_LOG',
        'CHAT_HISTORY',
        'DAILY_LOG',
      ];
      for (const k of allKeys) {
        const existing = await adapter.get(STORAGE_KEYS[k]);
        if (existing === null) {
          await adapter.set(STORAGE_KEYS[k], []);
        }
      }

      const onboarding = await adapter.get(STORAGE_KEYS.ONBOARDING_COMPLETE);
      if (onboarding === null) {
        await adapter.set(STORAGE_KEYS.ONBOARDING_COMPLETE, false);
      }

      // Patch metadata if it exists but lacks fields
      const meta = await adapter.get<AppDataStore['metadata']>(STORAGE_KEYS.METADATA);
      if (meta) {
        const patched: AppDataStore['metadata'] = {
          lastSync: meta.lastSync ?? new Date().toISOString(),
          appVersion: meta.appVersion ?? APP_VERSION,
          deviceId: meta.deviceId ?? getOrCreateDeviceId(),
        };
        await adapter.set(STORAGE_KEYS.METADATA, patched);
      }

      await adapter.set(STORAGE_KEYS.VERSION, 1);
      debugLog('Migration: v0 → v1 complete.');
    }

    // Template for future migrations:
    // if (fromVersion < 2) { ... await adapter.set(STORAGE_KEYS.VERSION, 2); }

  } catch (err) {
    throw new StorageError(
      'MIGRATION_FAILED',
      `Schema migration from v${fromVersion} failed: ${String(err)}`
    );
  }
}

// ─── Default Schema Creator ───────────────────────────────────────────────────

async function createDefaultSchema(adapter: StorageAdapter): Promise<void> {
  const defaultMetadata: AppDataStore['metadata'] = {
    lastSync: new Date().toISOString(),
    appVersion: APP_VERSION,
    deviceId: getOrCreateDeviceId(),
  };
  await adapter.set(STORAGE_KEYS.VERSION, SCHEMA_VERSION);
  await adapter.set(STORAGE_KEYS.METADATA, defaultMetadata);
  await adapter.set(STORAGE_KEYS.SCHEDULE_BLOCKS, []);
  await adapter.set(STORAGE_KEYS.COMPLETION_LOG, []);
  await adapter.set(STORAGE_KEYS.CHAT_HISTORY, []);
  await adapter.set(STORAGE_KEYS.DAILY_LOG, []);
  await adapter.set(STORAGE_KEYS.ONBOARDING_COMPLETE, false);
  debugLog('Default schema created.');
}

// ─── Initialization ───────────────────────────────────────────────────────────

/**
 * MUST be called on app boot (awaited in AppContext).
 * Idempotent — safe to call multiple times; only runs once.
 *
 * Steps:
 *   1. Try Firebase → set adapter
 *   2. Detect schema version → run migration if needed
 *   3. Validate data integrity
 *   4. Warn if storage is nearly full
 */
export async function initializeDataStore(): Promise<void> {
  if (_initPromise) return _initPromise;
  _initPromise = _doInit();
  return _initPromise;
}

async function _doInit(): Promise<void> {
  try {
    // 1. Initialize Firebase and select adapter
    const firebaseReady = await initializeFirebase();
    initAdapter(firebaseReady);

    const adapter = getAdapter();

    // 2. Check stored schema version
    const storedVersion = await adapter.get<number>(STORAGE_KEYS.VERSION);

    if (storedVersion === null) {
      // No version key: check for legacy data (pre-versioned store)
      const existingMeta = await adapter.get(STORAGE_KEYS.METADATA);
      if (existingMeta !== null) {
        debugLog('Legacy store detected (no version field). Running migration from v0...');
        await migrateSchema(0);
      } else {
        // Genuine first run
        debugLog('First run — creating default schema (v' + SCHEMA_VERSION + ').');
        await createDefaultSchema(adapter);
      }
    } else if (storedVersion < SCHEMA_VERSION) {
      debugLog(`Schema upgrade: v${storedVersion} → v${SCHEMA_VERSION}`);
      await migrateSchema(storedVersion);
    } else {
      debugLog(`Schema up-to-date (v${storedVersion}).`);
    }

    // 3. Integrity check (non-fatal)
    const { valid, errors } = await validateDataIntegrity();
    if (!valid) {
      console.warn('[dataStore] Integrity warnings on boot:', errors);
    }

    // 4. Storage usage warning (localStorage only — Firestore doesn't have a local byte limit)
    try {
      const usedBytes = calculateStorageUsed();
      if (usedBytes > STORAGE_WARN_THRESHOLD_BYTES) {
        console.warn(
          `[dataStore] Storage usage high: ${(usedBytes / 1024 / 1024).toFixed(2)} MB. Consider exporting data.`
        );
      }
    } catch {
      // Non-fatal; Firestore doesn't use localStorage quota
    }

    debugLog('initializeDataStore complete.');
  } catch (err) {
    console.error('[dataStore] initializeDataStore failed:', err);
    // Emergency fallback: ensure adapter exists + store is minimally valid
    try {
      initAdapter(false);
      const adapter = getAdapter();
      const hasMeta = await adapter.get(STORAGE_KEYS.METADATA);
      if (!hasMeta) await createDefaultSchema(adapter);
    } catch {
      // Silent — we've done our best
    }
    // NEVER rethrow here — the app must not crash on storage init
  }
}

// ─── Validators (Throw on Error) ──────────────────────────────────────────────

/**
 * Validates a UserProfile. Throws `StorageError` with code `VALIDATION_ERROR` if invalid.
 */
export function validateUserProfile(profile: UserProfile): void {
  if (!profile || typeof profile !== 'object') {
    throw new StorageError('VALIDATION_ERROR', 'UserProfile must be a non-null object.');
  }
  const required: (keyof UserProfile)[] = [
    'userId',
    'name',
    'motivation',
    'energyPeak',
    'subjects',
    'constraints',
    'availableHours',
    'createdAt',
  ];
  for (const field of required) {
    if (profile[field] === undefined || profile[field] === null) {
      throw new StorageError(
        'VALIDATION_ERROR',
        `UserProfile missing required field: "${String(field)}".`
      );
    }
  }
  if (!Array.isArray(profile.subjects)) {
    throw new StorageError('VALIDATION_ERROR', 'UserProfile.subjects must be an array.');
  }
}

/**
 * Validates a ScheduleBlock. Throws `StorageError` with code `VALIDATION_ERROR` if invalid.
 */
export function validateScheduleBlock(block: ScheduleBlock): void {
  if (!block || typeof block !== 'object') {
    throw new StorageError('VALIDATION_ERROR', 'ScheduleBlock must be a non-null object.');
  }
  const validTypes: ScheduleBlock['type'][] = [
    'new_content',
    'revision',
    'practice',
    'crunch',
    'break',
  ];
  if (!validTypes.includes(block.type)) {
    throw new StorageError(
      'VALIDATION_ERROR',
      `ScheduleBlock.type "${block.type}" is invalid. Must be one of: ${validTypes.join(', ')}.`
    );
  }
  if (!block.date || !/^\d{4}-\d{2}-\d{2}$/.test(block.date)) {
    throw new StorageError(
      'VALIDATION_ERROR',
      `ScheduleBlock.date "${block.date}" must be in YYYY-MM-DD format.`
    );
  }
  if (!block.startTime || !block.endTime) {
    throw new StorageError('VALIDATION_ERROR', 'ScheduleBlock missing startTime or endTime.');
  }
  if (block.startTime >= block.endTime) {
    throw new StorageError(
      'VALIDATION_ERROR',
      `ScheduleBlock startTime "${block.startTime}" must be before endTime "${block.endTime}".`
    );
  }
  if (!block.id) {
    throw new StorageError('VALIDATION_ERROR', 'ScheduleBlock missing id.');
  }
  if (!block.subjectId) {
    throw new StorageError('VALIDATION_ERROR', 'ScheduleBlock missing subjectId.');
  }
}

/**
 * Validates a CompletionLogEntry. Throws `StorageError` with code `VALIDATION_ERROR` if invalid.
 */
export function validateCompletionLogEntry(entry: CompletionLogEntry): void {
  if (!entry || typeof entry !== 'object') {
    throw new StorageError('VALIDATION_ERROR', 'CompletionLogEntry must be a non-null object.');
  }
  if (!entry.blockId) {
    throw new StorageError('VALIDATION_ERROR', 'CompletionLogEntry missing blockId.');
  }
  if (!entry.completedAt || isNaN(Date.parse(entry.completedAt))) {
    throw new StorageError(
      'VALIDATION_ERROR',
      `CompletionLogEntry.completedAt "${entry.completedAt}" is not a valid ISO timestamp.`
    );
  }
}

// ─── Read Layer (Selectors) ───────────────────────────────────────────────────

/** Returns the user's profile, or null if not set. */
export async function getUserProfile(): Promise<UserProfile | null> {
  return getAdapter().get<UserProfile>(STORAGE_KEYS.USER_PROFILE);
}

/**
 * Returns all schedule blocks, optionally filtered by status.
 * Always returns an array (never null).
 */
export async function getScheduleBlocks(
  filterByStatus?: 'pending' | 'completed' | 'missed'
): Promise<ScheduleBlock[]> {
  const blocks =
    (await getAdapter().get<ScheduleBlock[]>(STORAGE_KEYS.SCHEDULE_BLOCKS)) ?? [];
  return filterByStatus ? blocks.filter((b) => b.status === filterByStatus) : blocks;
}

/**
 * Returns the completion log, optionally limited to the last N days.
 */
export async function getCompletionLog(days?: number): Promise<CompletionLogEntry[]> {
  const log =
    (await getAdapter().get<CompletionLogEntry[]>(STORAGE_KEYS.COMPLETION_LOG)) ?? [];
  if (days !== undefined) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);
    return log.filter((e) => new Date(e.completedAt) >= cutoff);
  }
  return log;
}

/** Returns the full chat history. */
export async function getChatHistory(): Promise<ChatMessage[]> {
  return (await getAdapter().get<ChatMessage[]>(STORAGE_KEYS.CHAT_HISTORY)) ?? [];
}

/**
 * Returns daily log entries, optionally filtered to a single YYYY-MM-DD date.
 */
export async function getUserDailyLog(date?: string): Promise<DailyLogEntry[]> {
  const log = (await getAdapter().get<DailyLogEntry[]>(STORAGE_KEYS.DAILY_LOG)) ?? [];
  return date ? log.filter((e) => e.date === date) : log;
}

/** Returns whether onboarding has been completed. */
export async function isOnboardingComplete(): Promise<boolean> {
  return (await getAdapter().get<boolean>(STORAGE_KEYS.ONBOARDING_COMPLETE)) ?? false;
}

/** Returns app metadata, falling back to safe defaults. */
export async function getMetadata(): Promise<AppDataStore['metadata']> {
  return (
    (await getAdapter().get<AppDataStore['metadata']>(STORAGE_KEYS.METADATA)) ?? {
      lastSync: new Date().toISOString(),
      appVersion: APP_VERSION,
      deviceId: getOrCreateDeviceId(),
    }
  );
}

// ─── Write Layer (Atomic via Queue) ───────────────────────────────────────────

/** Persists a validated UserProfile and updates lastSync in metadata. */
export async function setUserProfile(profile: UserProfile): Promise<void> {
  return enqueueWrite(async () => {
    validateUserProfile(profile);
    await getAdapter().set(STORAGE_KEYS.USER_PROFILE, profile);
    const meta = await getMetadata();
    await getAdapter().set(STORAGE_KEYS.METADATA, {
      ...meta,
      lastSync: new Date().toISOString(),
    });
    debugLog('setUserProfile: saved.');
  });
}

/**
 * Replaces the entire schedule blocks array.
 * All blocks are validated before any write occurs.
 */
export async function updateScheduleBlocks(blocks: ScheduleBlock[]): Promise<void> {
  return enqueueWrite(async () => {
    if (!Array.isArray(blocks)) {
      throw new StorageError('VALIDATION_ERROR', 'updateScheduleBlocks: argument must be an array.');
    }
    for (const block of blocks) {
      validateScheduleBlock(block);
    }
    await getAdapter().set(STORAGE_KEYS.SCHEDULE_BLOCKS, blocks);
    debugLog(`updateScheduleBlocks: ${blocks.length} blocks saved.`);
  });
}

/** Merges partial updates into a single block identified by blockId. */
export async function updateScheduleBlock(
  blockId: string,
  updates: Partial<ScheduleBlock>
): Promise<void> {
  return enqueueWrite(async () => {
    const blocks = await getScheduleBlocks();
    const index = blocks.findIndex((b) => b.id === blockId);
    if (index === -1) {
      throw new StorageError(
        'VALIDATION_ERROR',
        `updateScheduleBlock: block "${blockId}" not found.`
      );
    }
    const merged = { ...blocks[index], ...updates };
    validateScheduleBlock(merged);
    blocks[index] = merged;
    await getAdapter().set(STORAGE_KEYS.SCHEDULE_BLOCKS, blocks);
    debugLog(`updateScheduleBlock: "${blockId}" updated.`);
  });
}

/** Appends a validated entry to the completion log. */
export async function addCompletionLogEntry(entry: CompletionLogEntry): Promise<void> {
  return enqueueWrite(async () => {
    validateCompletionLogEntry(entry);
    const log = await getCompletionLog();
    await getAdapter().set(STORAGE_KEYS.COMPLETION_LOG, [...log, entry]);
    debugLog('addCompletionLogEntry: saved.');
  });
}

/** Appends a chat message to the chat history. */
export async function addChatMessage(message: ChatMessage): Promise<void> {
  return enqueueWrite(async () => {
    if (!message.id || !message.content || !message.role) {
      throw new StorageError(
        'VALIDATION_ERROR',
        'ChatMessage missing required fields: id, role, or content.'
      );
    }
    const history = await getChatHistory();
    await getAdapter().set(STORAGE_KEYS.CHAT_HISTORY, [...history, message]);
    debugLog('addChatMessage: saved.');
  });
}

/** Sets the onboarding complete flag. */
export async function setOnboardingComplete(complete: boolean): Promise<void> {
  return enqueueWrite(async () => {
    await getAdapter().set(STORAGE_KEYS.ONBOARDING_COMPLETE, complete);
    debugLog(`setOnboardingComplete: ${complete}`);
  });
}

/**
 * Upserts a daily log entry.
 * If an entry already exists for the same date, it is replaced.
 */
export async function addDailyLogEntry(entry: DailyLogEntry): Promise<void> {
  return enqueueWrite(async () => {
    if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
      throw new StorageError(
        'VALIDATION_ERROR',
        `DailyLogEntry.date "${entry.date}" must be in YYYY-MM-DD format.`
      );
    }
    const log = await getUserDailyLog();
    const idx = log.findIndex((e) => e.date === entry.date);
    if (idx !== -1) {
      log[idx] = entry;
    } else {
      log.push(entry);
    }
    await getAdapter().set(STORAGE_KEYS.DAILY_LOG, log);
    debugLog(`addDailyLogEntry: ${entry.date} saved.`);
  });
}

/**
 * Factory reset — deletes all StudyOS data.
 * Only call this from a Settings screen with explicit user confirmation.
 */
export async function clearAllData(): Promise<void> {
  return enqueueWrite(async () => {
    await getAdapter().clear(Object.values(STORAGE_KEYS));
    try {
      localStorage.removeItem('studyos_device_id');
    } catch {
      // Non-fatal
    }
    _initPromise = null; // Allow re-initialization
    console.log('[dataStore] All data cleared.');
  });
}

// ─── Data Integrity Engine ────────────────────────────────────────────────────

/**
 * Validates all stored data for structural correctness.
 * Returns { valid, errors }. Never throws.
 */
export async function validateDataIntegrity(): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  const adapter = getAdapter();

  // Metadata
  try {
    const metadata = await adapter.get<AppDataStore['metadata']>(STORAGE_KEYS.METADATA);
    if (!metadata) {
      errors.push('Missing metadata document.');
    } else {
      if (!metadata.appVersion) errors.push('metadata.appVersion is missing.');
      if (!metadata.deviceId) errors.push('metadata.deviceId is missing.');
      if (!metadata.lastSync) errors.push('metadata.lastSync is missing.');
    }
  } catch {
    errors.push('Could not read metadata.');
  }

  // UserProfile (nullable — only validate if present)
  try {
    const profile = await adapter.get<UserProfile>(STORAGE_KEYS.USER_PROFILE);
    if (profile !== null) {
      try {
        validateUserProfile(profile);
      } catch (e) {
        errors.push(`UserProfile invalid: ${(e as Error).message}`);
      }
    }
  } catch {
    errors.push('Could not read userProfile.');
  }

  // ScheduleBlocks
  try {
    const blocks = await adapter.get<ScheduleBlock[]>(STORAGE_KEYS.SCHEDULE_BLOCKS);
    if (blocks !== null && !Array.isArray(blocks)) {
      errors.push('scheduleBlocks is not an array.');
    } else if (Array.isArray(blocks)) {
      blocks.forEach((block, i) => {
        try {
          validateScheduleBlock(block);
        } catch (e) {
          errors.push(`scheduleBlocks[${i}] (id: ${block?.id ?? 'unknown'}): ${(e as Error).message}`);
        }
      });
    }
  } catch {
    errors.push('Could not read scheduleBlocks.');
  }

  // CompletionLog
  try {
    const log = await adapter.get(STORAGE_KEYS.COMPLETION_LOG);
    if (log !== null && !Array.isArray(log)) errors.push('completionLog is not an array.');
  } catch {
    errors.push('Could not read completionLog.');
  }

  // ChatHistory
  try {
    const chat = await adapter.get(STORAGE_KEYS.CHAT_HISTORY);
    if (chat !== null && !Array.isArray(chat)) errors.push('chatHistory is not an array.');
  } catch {
    errors.push('Could not read chatHistory.');
  }

  // DailyLog
  try {
    const daily = await adapter.get(STORAGE_KEYS.DAILY_LOG);
    if (daily !== null && !Array.isArray(daily)) errors.push('userDailyLog is not an array.');
  } catch {
    errors.push('Could not read userDailyLog.');
  }

  return { valid: errors.length === 0, errors };
}

// ─── Export / Import ──────────────────────────────────────────────────────────

/** Serialises the entire store as a JSON string (for file download or backup). */
export async function exportDataAsJSON(): Promise<string> {
  const adapter = getAdapter();
  const store: AppDataStore = {
    version: SCHEMA_VERSION,
    userProfile: await adapter.get<UserProfile>(STORAGE_KEYS.USER_PROFILE),
    scheduleBlocks:
      (await adapter.get<ScheduleBlock[]>(STORAGE_KEYS.SCHEDULE_BLOCKS)) ?? [],
    completionLog:
      (await adapter.get<CompletionLogEntry[]>(STORAGE_KEYS.COMPLETION_LOG)) ?? [],
    chatHistory: (await adapter.get<ChatMessage[]>(STORAGE_KEYS.CHAT_HISTORY)) ?? [],
    userDailyLog: (await adapter.get<DailyLogEntry[]>(STORAGE_KEYS.DAILY_LOG)) ?? [],
    onboardingComplete:
      (await adapter.get<boolean>(STORAGE_KEYS.ONBOARDING_COMPLETE)) ?? false,
    metadata: await getMetadata(),
  };
  return JSON.stringify(store, null, 2);
}

/**
 * Overwrites the store with imported JSON data.
 * Validates structure and schema version before writing.
 * Enqueued — safe to call alongside other writes.
 */
export async function importDataFromJSON(jsonString: string): Promise<void> {
  return enqueueWrite(async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new StorageError('VALIDATION_ERROR', 'Import failed: the file is not valid JSON.');
    }

    const data = parsed as Partial<AppDataStore>;

    if (typeof data !== 'object' || data === null) {
      throw new StorageError('VALIDATION_ERROR', 'Import failed: root element must be a JSON object.');
    }

    // Version guard — reject data from a newer app version
    if (typeof data.version === 'number' && data.version > SCHEMA_VERSION) {
      throw new StorageError(
        'VALIDATION_ERROR',
        `Import failed: data schema v${data.version} is newer than app schema v${SCHEMA_VERSION}. Please update the app.`
      );
    }

    if (!Array.isArray(data.scheduleBlocks)) {
      throw new StorageError(
        'VALIDATION_ERROR',
        'Import failed: "scheduleBlocks" must be an array.'
      );
    }

    const adapter = getAdapter();

    if (data.userProfile !== undefined) {
      await adapter.set(STORAGE_KEYS.USER_PROFILE, data.userProfile);
    }
    await adapter.set(STORAGE_KEYS.SCHEDULE_BLOCKS, data.scheduleBlocks ?? []);
    await adapter.set(STORAGE_KEYS.COMPLETION_LOG, data.completionLog ?? []);
    await adapter.set(STORAGE_KEYS.CHAT_HISTORY, data.chatHistory ?? []);
    await adapter.set(STORAGE_KEYS.DAILY_LOG, data.userDailyLog ?? []);
    await adapter.set(STORAGE_KEYS.ONBOARDING_COMPLETE, data.onboardingComplete ?? false);
    await adapter.set(STORAGE_KEYS.VERSION, SCHEMA_VERSION);

    const importedMeta: AppDataStore['metadata'] = {
      lastSync: new Date().toISOString(),
      appVersion: data.metadata?.appVersion ?? APP_VERSION,
      deviceId: getOrCreateDeviceId(),
    };
    await adapter.set(STORAGE_KEYS.METADATA, importedMeta);

    debugLog('importDataFromJSON: complete.');
  });
}

// ─── Storage Monitoring ───────────────────────────────────────────────────────

/**
 * Returns approximate bytes used by StudyOS keys in localStorage.
 * Only meaningful when using LocalStorageAdapter.
 */
export function calculateStorageUsed(): number {
  let total = 0;
  for (const key of Object.values(STORAGE_KEYS)) {
    const value = localStorage.getItem(key);
    if (value) {
      total += (key.length + value.length) * 2; // UTF-16: ~2 bytes/char
    }
  }
  return total;
}

// ─── Debug ────────────────────────────────────────────────────────────────────

/**
 * Logs the full store snapshot to the console.
 * Only active when localStorage key `studyos_debug` === `'true'`.
 */
export async function debugDataStore(): Promise<void> {
  if (!isDebugMode()) return;
  const snapshot = await exportDataAsJSON();
  console.group('[dataStore] Full Store Snapshot');
  console.log(JSON.parse(snapshot));
  console.groupEnd();
}
