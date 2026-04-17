import { ScheduleBlock, UserProfile } from '@/types';

// TODO: Person 1 implements logic to shift future blocks when one is missed

/** @deprecated Use rescheduleAfterMiss instead — kept for backward compat */
export async function resolveScheduleConflicts(
  blocks: ScheduleBlock[],
  missedBlockId: string
): Promise<ScheduleBlock[]> {
  return rescheduleAfterMiss(missedBlockId, blocks, null as unknown as UserProfile);
}

/**
 * Stub — Person 1 will implement the full AI-driven cascade reschedule logic.
 * AppContext calls this when a session is marked missed.
 */
export async function rescheduleAfterMiss(
  _blockId: string,
  blocks: ScheduleBlock[],
  _userProfile: UserProfile
): Promise<ScheduleBlock[]> {
  // TODO: Person 1 — call Claude to redistribute missed block across future days
  console.warn('[cascadeRescheduler] rescheduleAfterMiss is a stub — implement in Task 1.4');
  return blocks;
}
