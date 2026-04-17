import { ScheduleBlock } from '@types/index';

// TODO: Person 1 implements logic to shift future blocks when one is missed
export async function resolveScheduleConflicts(blocks: ScheduleBlock[], missedBlockId: string): Promise<ScheduleBlock[]> {
  return blocks;
}
