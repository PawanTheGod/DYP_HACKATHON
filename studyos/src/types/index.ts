// USER PROFILE
export interface UserProfile {
  userId: string;
  name: string;
  motivation: string;
  energyPeak: 'morning' | 'afternoon' | 'night';
  subjects: SubjectObject[];
  constraints: {
    sleepBy: string; // HH:MM
    wakeAt: string; // HH:MM
    blockedSlots: Array<{ day: string; from: string; to: string }>;
    breakDays: string[];
  };
  availableHours: { weekday: number; weekend: number };
  createdAt: string;
}

export interface SubjectObject {
  id: string;
  name: string;
  difficulty: number; // 1-10
  deadline: string; // YYYY-MM-DD
  currentLevel: number; // 1-10
  color: string; // #hexcode
  masteryScore: number; // 0-100
  priorityScore: number;
}

// SCHEDULE
export interface ScheduleBlock {
  id: string;
  subjectId: string;
  subject: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  type: 'new_content' | 'revision' | 'practice' | 'crunch' | 'break';
  topic: string;
  status: 'pending' | 'completed' | 'missed' | 'skipped';
  proofVerified: boolean;
  quizScore: number | null;
  notes: string;
  resourceLink: string | null;
}

// COMPLETION LOG
export interface CompletionLogEntry {
  blockId: string;
  date: string; // YYYY-MM-DD
  completedAt: string; // ISO timestamp
  proofType: 'photo' | 'quiz' | 'voice' | 'none';
  proofScore: number | null;
  pomodoroCount: number;
}

// CHAT
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'sage';
  content: string;
  timestamp: string; // ISO
}

// DAILY LOG
export interface DailyLogEntry {
  date: string; // YYYY-MM-DD
  energyLevel: number; // 1-5
  blockersText: string;
  completedCount: number;
  totalHours: number;
  timestamp: string;
}

// APP STATE
export interface AppDataStore {
  userProfile: UserProfile | null;
  scheduleBlocks: ScheduleBlock[];
  completionLog: CompletionLogEntry[];
  chatHistory: ChatMessage[];
  userDailyLog: DailyLogEntry[];
  onboardingComplete: boolean;
  metadata: {
    lastSync: string;
    appVersion: string;
    deviceId: string;
  };
}

// METRICS
export interface MetricsData {
  totalHours: number;
  sessionsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  consistencyScore: number;
  masteryBySubject: Record<string, number>;
  readinessBySubject: Record<string, number>;
}

export * from './user';
export * from './schedule';
export * from './chat';
export * from './completion';
