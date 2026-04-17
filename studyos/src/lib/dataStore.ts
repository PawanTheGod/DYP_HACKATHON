import { AppDataStore, UserProfile, ScheduleBlock, CompletionLogEntry, ChatMessage, DailyLogEntry } from '@types/index';

const STORAGE_KEYS = {
  USER_PROFILE: 'studyos_user_profile',
  SCHEDULE_BLOCKS: 'studyos_schedule_blocks',
  COMPLETION_LOG: 'studyos_completion_log',
  CHAT_HISTORY: 'studyos_chat_history',
  DAILY_LOG: 'studyos_daily_log',
  ONBOARDING_COMPLETE: 'studyos_onboarding_complete',
  METADATA: 'studyos_metadata',
} as const;

// TODO: Person 3 - Implement localStorage/IndexedDB persistence logic

export async function initializeDataStore(): Promise<void> {
  // Initialize storage with default schema if empty
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
  return data ? JSON.parse(data) : null;
}

export async function setUserProfile(profile: UserProfile): Promise<void> {
  localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
}

export async function getScheduleBlocks(filterByStatus?: 'pending' | 'completed' | 'missed'): Promise<ScheduleBlock[]> {
  const data = localStorage.getItem(STORAGE_KEYS.SCHEDULE_BLOCKS);
  const blocks: ScheduleBlock[] = data ? JSON.parse(data) : [];
  if (filterByStatus) {
    return blocks.filter(b => b.status === filterByStatus);
  }
  return blocks;
}

export async function updateScheduleBlock(blockId: string, updates: Partial<ScheduleBlock>): Promise<void> {
  const blocks = await getScheduleBlocks();
  const updated = blocks.map(b => b.id === blockId ? { ...b, ...updates } : b);
  localStorage.setItem(STORAGE_KEYS.SCHEDULE_BLOCKS, JSON.stringify(updated));
}

export async function getCompletionLog(days?: number): Promise<CompletionLogEntry[]> {
  const data = localStorage.getItem(STORAGE_KEYS.COMPLETION_LOG);
  return data ? JSON.parse(data) : [];
}

export async function addCompletionLogEntry(entry: CompletionLogEntry): Promise<void> {
  const logs = await getCompletionLog();
  localStorage.setItem(STORAGE_KEYS.COMPLETION_LOG, JSON.stringify([...logs, entry]));
}

export async function clearAllData(): Promise<void> {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
}

export function validateDataIntegrity(): { valid: boolean; errors: string[] } {
  return { valid: true, errors: [] };
}
