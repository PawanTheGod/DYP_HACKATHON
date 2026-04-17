import { ScheduleBlock } from './index';

export type ScheduleStatus = 'pending' | 'completed' | 'missed' | 'skipped';
export type ScheduleBlockType = 'new_content' | 'revision' | 'practice' | 'crunch' | 'break';

export interface ScheduleStatistics {
  pendingCount: number;
  completedCount: number;
  missedCount: number;
}
