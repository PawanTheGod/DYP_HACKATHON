import { CompletionLogEntry } from './index';

export type ProofType = 'photo' | 'quiz' | 'voice' | 'none';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}
