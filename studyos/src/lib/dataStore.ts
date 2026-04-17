/**
 * dataStore.ts — StudyOS LocalStorage Persistence Layer (Person 3 / Task 3.1)
 *
 * All functions are async even though localStorage is synchronous.
 * This future-proofs the module for migration to Firebase Firestore later.
 *
 * Debug mode: window.localStorage.setItem('studyos_debug', 'true')
 */

import {
  AppDataStore,
  UserProfile,
  ScheduleBlock,
  CompletionLogEntry,
  ChatMessage,
  DailyLogEntry,
} from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  USER_PROFILE: 'studyos_user_profile',
  SCHEDULE_BLOCKS: 'studyos_schedule_blocks',
  COMPLETION_LOG: 'studyos_completion_log',
  CHAT_HISTORY: 'studyos_chat_history',
  DAILY_LOG: 'studyos_daily_log',
  ONBOARDING_COMPLETE: 'studyos_onboarding_complete',
  METADATA: 'studyos_metadata',
  DEBUG: 'studyos_debug',
} as const;

const APP_VERSION = '1.0.0';
const STORAGE_WARN_THRESHOLD_BYTES = 5 * 1024 * 1024; // 5 MB

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Reads a raw string from localStorage, throws a descriptive error on parse failure.
 */
function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    const message = `Data corruption detected in ${key}. Run validateDataIntegrity().`;
    console.error('[dataStore]', message, err);
    throw new Error(message);
  }
}

/**
 * Parses a JSON string from localStorage. Returns null if key is absent.
 */
function readJSON<T>(key: string): T | null {
  const raw = readRaw(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    const message = `Data corruption detected in ${key}. Run validateDataIntegrity().`;
    console.error('[dataStore]', message, err);
    throw new Error(message);
  }
}

/**
 * Writes a JSON-serialisable value to localStorage.
 * Throws if quota is exceeded.
 */
function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      const message = 'Local storage quota exceeded. Please clear some data.';
      console.error('[dataStore]', message);
      throw new Error(message);
    }
    console.error('[dataStore] Write failed for key:', key, err);
    throw err;
  }
}

/** Generates a stable device ID on first run. */
function getOrCreateDeviceId(): string {
  const existing = localStorage.getItem('studyos_device_id');
  if (existing) return existing;
  const deviceId = `device_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  localStorage.setItem('studyos_device_id', deviceId);
  return deviceId;
}

// ─── Validators ───────────────────────────────────────────────────────────────

/**
 * Validates that a UserProfile contains all required fields.
 */
export function validateUserProfile(profile: UserProfile): boolean {
  if (!profile) return false;
  const required: (keyof UserProfile)[] = [
    'userId', 'name', 'motivation', 'energyPeak', 'subjects',
    'constraints', 'availableHours', 'createdAt',
  ];
  for (const field of required) {
    if (profile[field] === undefined || profile[field] === null) {
      console.warn(`[dataStore] validateUserProfile: missing field "${String(field)}"`);
      return false;
    }
  }
  if (!Array.isArray(profile.subjects)) return false;
  return true;
}

/**
 * Validates a ScheduleBlock — checks startTime < endTime, valid date, and valid type.
 */
export function validateScheduleBlock(block: ScheduleBlock): boolean {
  if (!block) return false;
  const validTypes: ScheduleBlock['type'][] = ['new_content', 'revision', 'practice', 'crunch', 'break'];
  if (!validTypes.includes(block.type)) {
    console.warn(`[dataStore] validateScheduleBlock: invalid type "${block.type}"`);
    return false;
  }
  if (!block.date || !/^\d{4}-\d{2}-\d{2}$/.test(block.date)) {
    console.warn(`[dataStore] validateScheduleBlock: invalid date "${block.date}"`);
    return false;
  }
  if (!block.startTime || !block.endTime) {
    console.warn('[dataStore] validateScheduleBlock: missing startTime or endTime');
    return false;
  }
  if (block.startTime >= block.endTime) {
    console.warn(`[dataStore] validateScheduleBlock: startTime "${block.startTime}" must be before endTime "${block.endTime}"`);
    return false;
  }
  if (!block.id || !block.subjectId) return false;
  return true;
}

/**
 * Validates a CompletionLogEntry — checks blockId exists and timestamp is valid.
 */
export function validateCompletionLogEntry(entry: CompletionLogEntry): boolean {
  if (!entry) return false;
  if (!entry.blockId) {
    console.warn('[dataStore] validateCompletionLogEntry: missing blockId');
    return false;
  }
  if (!entry.completedAt || isNaN(Date.parse(entry.completedAt))) {
    console.warn(`[dataStore] validateCompletionLogEntry: invalid timestamp "${entry.completedAt}"`);
    return false;
  }
  return true;
}

// ─── Initialize ───────────────────────────────────────────────────────────────

/**
 * Called on app startup. Creates default schema if absent, validates existing schema.
 */
export function initializeDataStore(): void {
  const isDebug = localStorage.getItem(STORAGE_KEYS.DEBUG) === 'true';

  // Check if metadata exists (first-time run indicator)
  const existingMetadata = readJSON<AppDataStore['metadata']>(STORAGE_KEYS.METADATA);

  if (!existingMetadata) {
    // First run — create defaults
    const defaultMetadata: AppDataStore['metadata'] = {
      lastSync: new Date().toISOString(),
      appVersion: APP_VERSION,
      deviceId: getOrCreateDeviceId(),
    };
    writeJSON(STORAGE_KEYS.METADATA, defaultMetadata);
    writeJSON(STORAGE_KEYS.SCHEDULE_BLOCKS, []);
    writeJSON(STORAGE_KEYS.COMPLETION_LOG, []);
    writeJSON(STORAGE_KEYS.CHAT_HISTORY, []);
    writeJSON(STORAGE_KEYS.DAILY_LOG, []);
    writeJSON(STORAGE_KEYS.ONBOARDING_COMPLETE, false);

    if (isDebug) console.log('[dataStore] First run — default schema initialized.');
  } else {
    // Existing run — validate schema & patch missing fields
    const { valid, errors } = validateDataIntegrity();
    if (!valid) {
      console.warn('[dataStore] Schema warnings:', errors);
    }
    // Patch missing fields from previous app versions
    if (!existingMetadata.appVersion) {
      writeJSON(STORAGE_KEYS.METADATA, { ...existingMetadata, appVersion: APP_VERSION });
    }
    if (isDebug) console.log('[dataStore] Store loaded. Status:', valid ? 'healthy' : 'warnings');
  }

  // Warn if storage usage is high
  const usedBytes = calculateStorageUsed();
  if (usedBytes > STORAGE_WARN_THRESHOLD_BYTES) {
    console.warn(`[dataStore] Storage usage is high: ${(usedBytes / 1024 / 1024).toFixed(2)} MB. Consider exporting and clearing old data.`);
  }
}

// ─── Read Functions (Getters) ─────────────────────────────────────────────────

/** Returns the user's profile, or null if not set. */
export async function getUserProfile(): Promise<UserProfile | null> {
  return readJSON<UserProfile>(STORAGE_KEYS.USER_PROFILE);
}

/**
 * Returns schedule blocks, optionally filtered by status.
 * Returns empty array if no blocks exist yet.
 */
export async function getScheduleBlocks(
  filterByStatus?: 'pending' | 'completed' | 'missed'
): Promise<ScheduleBlock[]> {
  const blocks = readJSON<ScheduleBlock[]>(STORAGE_KEYS.SCHEDULE_BLOCKS) ?? [];
  if (filterByStatus) {
    return blocks.filter((b) => b.status === filterByStatus);
  }
  return blocks;
}

/**
 * Returns the completion log.
 * @param days - Optional: return only entries from the last N days.
 */
export async function getCompletionLog(days?: number): Promise<CompletionLogEntry[]> {
  const log = readJSON<CompletionLogEntry[]>(STORAGE_KEYS.COMPLETION_LOG) ?? [];
  if (days !== undefined) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);
    return log.filter((entry) => new Date(entry.completedAt) >= cutoff);
  }
  return log;
}

/** Returns the full persisted chat history. */
export async function getChatHistory(): Promise<ChatMessage[]> {
  return readJSON<ChatMessage[]>(STORAGE_KEYS.CHAT_HISTORY) ?? [];
}

/**
 * Returns daily log entries.
 * @param date - Optional YYYY-MM-DD to filter for one specific day.
 */
export async function getUserDailyLog(date?: string): Promise<DailyLogEntry[]> {
  const log = readJSON<DailyLogEntry[]>(STORAGE_KEYS.DAILY_LOG) ?? [];
  if (date) {
    return log.filter((entry) => entry.date === date);
  }
  return log;
}

/** Returns whether the onboarding flow has been completed. */
export async function isOnboardingComplete(): Promise<boolean> {
  const value = readRaw(STORAGE_KEYS.ONBOARDING_COMPLETE);
  if (value === null) return false;
  return value === 'true' || JSON.parse(value) === true;
}

/** Returns the app metadata object. */
export async function getMetadata(): Promise<AppDataStore['metadata']> {
  return (
    readJSON<AppDataStore['metadata']>(STORAGE_KEYS.METADATA) ?? {
      lastSync: new Date().toISOString(),
      appVersion: APP_VERSION,
      deviceId: getOrCreateDeviceId(),
    }
  );
}

// ─── Write Functions (Setters) ────────────────────────────────────────────────

/**
 * Persists a UserProfile. Validates before writing.
 */
export async function setUserProfile(profile: UserProfile): Promise<void> {
  if (!validateUserProfile(profile)) {
    throw new Error('Invalid UserProfile: missing required fields. Check console for details.');
  }
  writeJSON(STORAGE_KEYS.USER_PROFILE, profile);
  // Update lastSync in metadata
  const meta = await getMetadata();
  writeJSON(STORAGE_KEYS.METADATA, { ...meta, lastSync: new Date().toISOString() });
}

/** Replaces the entire schedule blocks array. All blocks are validated before write. */
export async function updateScheduleBlocks(blocks: ScheduleBlock[]): Promise<void> {
  if (!Array.isArray(blocks)) {
    throw new Error('updateScheduleBlocks expects an array.');
  }
  for (const block of blocks) {
    if (!validateScheduleBlock(block)) {
      throw new Error(`Invalid ScheduleBlock (id: ${block?.id ?? 'unknown'}). Ensure startTime < endTime, valid date, and valid type.`);
    }
  }
  writeJSON(STORAGE_KEYS.SCHEDULE_BLOCKS, blocks);
}

/** Merges updates into a single schedule block identified by blockId. */
export async function updateScheduleBlock(
  blockId: string,
  updates: Partial<ScheduleBlock>
): Promise<void> {
  const blocks = await getScheduleBlocks();
  const index = blocks.findIndex((b) => b.id === blockId);
  if (index === -1) {
    throw new Error(`updateScheduleBlock: block "${blockId}" not found.`);
  }
  const merged = { ...blocks[index], ...updates };
  if (!validateScheduleBlock(merged)) {
    throw new Error(`Invalid update for block "${blockId}". Validate your data.`);
  }
  blocks[index] = merged;
  writeJSON(STORAGE_KEYS.SCHEDULE_BLOCKS, blocks);
}

/** Appends a new entry to the completion log. */
export async function addCompletionLogEntry(entry: CompletionLogEntry): Promise<void> {
  if (!validateCompletionLogEntry(entry)) {
    throw new Error('Invalid CompletionLogEntry: missing blockId or invalid timestamp.');
  }
  const log = await getCompletionLog();
  writeJSON(STORAGE_KEYS.COMPLETION_LOG, [...log, entry]);
}

/** Appends a chat message to the chat history. */
export async function addChatMessage(message: ChatMessage): Promise<void> {
  if (!message.id || !message.content || !message.role) {
    throw new Error('Invalid ChatMessage: id, role, and content are required.');
  }
  const history = await getChatHistory();
  writeJSON(STORAGE_KEYS.CHAT_HISTORY, [...history, message]);
}

/** Sets the onboarding complete flag. */
export async function setOnboardingComplete(complete: boolean): Promise<void> {
  writeJSON(STORAGE_KEYS.ONBOARDING_COMPLETE, complete);
}

/** Appends a daily log entry. Updates the entry if one for the same date already exists. */
export async function addDailyLogEntry(entry: DailyLogEntry): Promise<void> {
  if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
    throw new Error('Invalid DailyLogEntry: date must be in YYYY-MM-DD format.');
  }
  const log = await getUserDailyLog();
  const existingIndex = log.findIndex((e) => e.date === entry.date);
  if (existingIndex !== -1) {
    // Upsert: replace existing entry for the same day
    log[existingIndex] = entry;
    writeJSON(STORAGE_KEYS.DAILY_LOG, log);
  } else {
    writeJSON(STORAGE_KEYS.DAILY_LOG, [...log, entry]);
  }
}

// ─── Helper / Utility Functions ───────────────────────────────────────────────

/**
 * Factory reset — removes all StudyOS data from localStorage.
 * ONLY use in the Settings screen with user confirmation.
 */
export async function clearAllData(): Promise<void> {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem('studyos_device_id');
  console.log('[dataStore] All data cleared.');
}

/**
 * Validates the integrity of all stored data, checking for missing fields and structural issues.
 * Returns { valid, errors }. Does not throw.
 */
export function validateDataIntegrity(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Metadata check
  const metadata = readJSON<AppDataStore['metadata']>(STORAGE_KEYS.METADATA);
  if (!metadata) {
    errors.push('Missing metadata key in localStorage.');
  } else {
    if (!metadata.appVersion) errors.push('metadata.appVersion is missing.');
    if (!metadata.deviceId) errors.push('metadata.deviceId is missing.');
    if (!metadata.lastSync) errors.push('metadata.lastSync is missing.');
  }

  // UserProfile check (nullable, so only validate if present)
  const profile = readJSON<UserProfile>(STORAGE_KEYS.USER_PROFILE);
  if (profile && !validateUserProfile(profile)) {
    errors.push('UserProfile is stored but fails validation (missing required fields).');
  }

  // ScheduleBlocks check
  const blocks = readJSON<ScheduleBlock[]>(STORAGE_KEYS.SCHEDULE_BLOCKS);
  if (blocks !== null && !Array.isArray(blocks)) {
    errors.push('scheduleBlocks is not an array.');
  } else if (Array.isArray(blocks)) {
    blocks.forEach((block, i) => {
      if (!validateScheduleBlock(block)) {
        errors.push(`scheduleBlocks[${i}] (id: ${block?.id ?? 'unknown'}) is invalid.`);
      }
    });
  }

  // CompletionLog check
  const log = readJSON<CompletionLogEntry[]>(STORAGE_KEYS.COMPLETION_LOG);
  if (log !== null && !Array.isArray(log)) {
    errors.push('completionLog is not an array.');
  }

  // ChatHistory check
  const chat = readJSON<ChatMessage[]>(STORAGE_KEYS.CHAT_HISTORY);
  if (chat !== null && !Array.isArray(chat)) {
    errors.push('chatHistory is not an array.');
  }

  // DailyLog check
  const dailyLog = readJSON<DailyLogEntry[]>(STORAGE_KEYS.DAILY_LOG);
  if (dailyLog !== null && !Array.isArray(dailyLog)) {
    errors.push('userDailyLog is not an array.');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Returns the entire store as a JSON string (for export).
 */
export function exportDataAsJSON(): string {
  const store: AppDataStore = {
    userProfile: readJSON<UserProfile>(STORAGE_KEYS.USER_PROFILE),
    scheduleBlocks: readJSON<ScheduleBlock[]>(STORAGE_KEYS.SCHEDULE_BLOCKS) ?? [],
    completionLog: readJSON<CompletionLogEntry[]>(STORAGE_KEYS.COMPLETION_LOG) ?? [],
    chatHistory: readJSON<ChatMessage[]>(STORAGE_KEYS.CHAT_HISTORY) ?? [],
    userDailyLog: readJSON<DailyLogEntry[]>(STORAGE_KEYS.DAILY_LOG) ?? [],
    onboardingComplete: (readJSON<boolean>(STORAGE_KEYS.ONBOARDING_COMPLETE)) ?? false,
    metadata: readJSON<AppDataStore['metadata']>(STORAGE_KEYS.METADATA) ?? {
      lastSync: new Date().toISOString(),
      appVersion: APP_VERSION,
      deviceId: getOrCreateDeviceId(),
    },
  };
  return JSON.stringify(store, null, 2);
}

/**
 * Overwrites the entire store with imported JSON data.
 * Validates the structure before writing anything.
 */
export async function importDataFromJSON(jsonString: string): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Import failed: invalid JSON. The file could not be parsed.');
  }

  const data = parsed as Partial<AppDataStore>;

  // Basic structural validation
  if (typeof data !== 'object' || data === null) {
    throw new Error('Import failed: root element must be an object.');
  }
  if (!Array.isArray(data.scheduleBlocks)) {
    throw new Error('Import failed: missing or invalid "scheduleBlocks" array.');
  }
  if (!Array.isArray(data.completionLog)) {
    throw new Error('Import failed: missing or invalid "completionLog" array.');
  }

  // Write each key
  if (data.userProfile !== undefined) {
    writeJSON(STORAGE_KEYS.USER_PROFILE, data.userProfile);
  }
  writeJSON(STORAGE_KEYS.SCHEDULE_BLOCKS, data.scheduleBlocks ?? []);
  writeJSON(STORAGE_KEYS.COMPLETION_LOG, data.completionLog ?? []);
  writeJSON(STORAGE_KEYS.CHAT_HISTORY, data.chatHistory ?? []);
  writeJSON(STORAGE_KEYS.DAILY_LOG, data.userDailyLog ?? []);
  writeJSON(STORAGE_KEYS.ONBOARDING_COMPLETE, data.onboardingComplete ?? false);

  const importedMeta: AppDataStore['metadata'] = {
    lastSync: new Date().toISOString(),
    appVersion: data.metadata?.appVersion ?? APP_VERSION,
    deviceId: getOrCreateDeviceId(), // keep current device's ID
  };
  writeJSON(STORAGE_KEYS.METADATA, importedMeta);

  console.log('[dataStore] Data imported successfully.');
}

/**
 * Returns the approximate number of bytes used by StudyOS keys in localStorage.
 */
export function calculateStorageUsed(): number {
  let totalBytes = 0;
  for (const key of Object.values(STORAGE_KEYS)) {
    const value = localStorage.getItem(key);
    if (value) {
      // UTF-16 encoding: each char ≈ 2 bytes
      totalBytes += (key.length + value.length) * 2;
    }
  }
  return totalBytes;
}

// ─── Debug ────────────────────────────────────────────────────────────────────

/**
 * Logs the entire store to the console as pretty-printed JSON.
 * Only active when localStorage key 'studyos_debug' === 'true'.
 */
export function debugDataStore(): void {
  if (localStorage.getItem(STORAGE_KEYS.DEBUG) !== 'true') return;
  const snapshot = exportDataAsJSON();
  console.group('[dataStore] Full Store Snapshot');
  console.log(JSON.parse(snapshot));
  console.groupEnd();
}
