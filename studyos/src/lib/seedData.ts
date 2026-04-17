/**
 * seedData.ts — Development Seed Script
 *
 * Writes realistic mock data to Firestore (or localStorage fallback)
 * using the existing dataStore API so you can verify the storage layer works.
 *
 * Usage (browser DevTools console):
 *   await window.__seedStudyOS()
 *
 * Only active in development mode (import.meta.env.DEV).
 */

import {
  setUserProfile,
  updateScheduleBlocks,
  addCompletionLogEntry,
  setOnboardingComplete,
  addDailyLogEntry,
  addChatMessage,
  initializeDataStore,
} from './dataStore';

import type {
  UserProfile,
  ScheduleBlock,
  CompletionLogEntry,
  DailyLogEntry,
  ChatMessage,
} from '@/types';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockProfile: UserProfile = {
  userId: 'mock_user_001',
  name: 'Aditya (Test)',
  motivation: 'Crack JEE Advanced',
  energyPeak: 'morning',
  subjects: [
    {
      id: 'subj_physics',
      name: 'Physics',
      difficulty: 8,
      deadline: '2026-06-01',
      currentLevel: 5,
      color: '#6366f1',
      masteryScore: 42,
      priorityScore: 90,
      topics: [],
    },
    {
      id: 'subj_math',
      name: 'Mathematics',
      difficulty: 9,
      deadline: '2026-06-01',
      currentLevel: 6,
      color: '#f59e0b',
      masteryScore: 55,
      priorityScore: 85,
      topics: [],
    },
    {
      id: 'subj_chem',
      name: 'Chemistry',
      difficulty: 7,
      deadline: '2026-06-01',
      currentLevel: 4,
      color: '#10b981',
      masteryScore: 30,
      priorityScore: 75,
      topics: [],
    },
  ],
  constraints: {
    sleepBy: '23:00',
    wakeAt: '06:00',
    blockedSlots: [
      { day: 'Saturday', from: '14:00', to: '16:00' },
    ],
    breakDays: ['Sunday'],
  },
  availableHours: { weekday: 5, weekend: 7 },
  createdAt: new Date().toISOString(),
};

const today = new Date();
const fmt = (d: Date) => d.toISOString().split('T')[0];
const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return fmt(d);
};

const mockBlocks: ScheduleBlock[] = [
  {
    id: 'block_001',
    subjectId: 'subj_physics',
    subject: 'Physics',
    date: daysAgo(2),
    startTime: '08:00',
    endTime: '09:30',
    type: 'new_content',
    topic: "Newton's Laws of Motion",
    status: 'completed',
    proofVerified: true,
    quizScore: 85,
    notes: 'Covered all three laws with examples',
    resourceLink: null,
  },
  {
    id: 'block_002',
    subjectId: 'subj_math',
    subject: 'Mathematics',
    date: daysAgo(1),
    startTime: '10:00',
    endTime: '11:30',
    type: 'revision',
    topic: 'Integration by Parts',
    status: 'completed',
    proofVerified: true,
    quizScore: 72,
    notes: '',
    resourceLink: null,
  },
  {
    id: 'block_003',
    subjectId: 'subj_chem',
    subject: 'Chemistry',
    date: daysAgo(1),
    startTime: '15:00',
    endTime: '16:00',
    type: 'practice',
    topic: 'Organic Reactions — Nucleophilic Substitution',
    status: 'missed',
    proofVerified: false,
    quizScore: null,
    notes: '',
    resourceLink: null,
  },
  {
    id: 'block_004',
    subjectId: 'subj_physics',
    subject: 'Physics',
    date: fmt(today),
    startTime: '08:00',
    endTime: '09:30',
    type: 'revision',
    topic: 'Work, Energy and Power',
    status: 'pending',
    proofVerified: false,
    quizScore: null,
    notes: '',
    resourceLink: null,
  },
  {
    id: 'block_005',
    subjectId: 'subj_math',
    subject: 'Mathematics',
    date: fmt(today),
    startTime: '10:00',
    endTime: '11:00',
    type: 'new_content',
    topic: 'Differential Equations',
    status: 'pending',
    proofVerified: false,
    quizScore: null,
    notes: '',
    resourceLink: null,
  },
];

const mockCompletionLog: CompletionLogEntry[] = [
  {
    blockId: 'block_001',
    date: daysAgo(2),
    completedAt: `${daysAgo(2)}T09:28:00.000Z`,
    proofType: 'quiz',
    proofScore: 85,
    pomodoroCount: 3,
  },
  {
    blockId: 'block_002',
    date: daysAgo(1),
    completedAt: `${daysAgo(1)}T11:22:00.000Z`,
    proofType: 'quiz',
    proofScore: 72,
    pomodoroCount: 2,
  },
];

const mockDailyLog: DailyLogEntry[] = [
  {
    date: daysAgo(2),
    energyLevel: 4,
    blockersText: '',
    completedCount: 1,
    totalHours: 1.5,
    timestamp: `${daysAgo(2)}T22:00:00.000Z`,
  },
  {
    date: daysAgo(1),
    energyLevel: 3,
    blockersText: 'Had a headache in the afternoon, missed Chem session',
    completedCount: 1,
    totalHours: 1.5,
    timestamp: `${daysAgo(1)}T22:00:00.000Z`,
  },
];

const mockChatHistory: ChatMessage[] = [
  {
    id: 'msg_001',
    role: 'user',
    content: 'What should I focus on today?',
    timestamp: `${fmt(today)}T07:00:00.000Z`,
  },
  {
    id: 'msg_002',
    role: 'sage',
    content:
      'Based on your schedule, start with Physics revision (Work & Energy) — your energy peaks in the morning. Then tackle Maths (Differential Equations) before lunch. You missed Chemistry yesterday, so consider a quick 20-min catch-up in the evening.',
    timestamp: `${fmt(today)}T07:00:03.000Z`,
  },
];

// ─── Seed Function ────────────────────────────────────────────────────────────

export async function seedStudyOSData(): Promise<void> {
  console.group('[seedData] 🌱 Seeding StudyOS mock data...');
  console.log('Target: Firestore (if connected) or localStorage (fallback)');

  try {
    await initializeDataStore();

    console.log('Writing onboarding flag...');
    await setOnboardingComplete(true);

    console.log('Writing user profile...');
    await setUserProfile(mockProfile);

    console.log('Writing schedule blocks...');
    await updateScheduleBlocks(mockBlocks);

    for (const entry of mockCompletionLog) {
      await addCompletionLogEntry(entry);
    }
    console.log(`Written ${mockCompletionLog.length} completion log entries.`);

    for (const entry of mockDailyLog) {
      await addDailyLogEntry(entry);
    }
    console.log(`Written ${mockDailyLog.length} daily log entries.`);

    for (const msg of mockChatHistory) {
      await addChatMessage(msg);
    }
    console.log(`Written ${mockChatHistory.length} chat messages.`);

    console.log('✅ Seed complete! Check Firestore Console:');
    console.log('   https://console.firebase.google.com/project/studyos-1338f/firestore/data');
    console.groupEnd();
  } catch (err) {
    console.error('[seedData] ❌ Seed failed:', err);
    console.groupEnd();
    throw err;
  }
}

// ─── Auto-expose on window in dev mode ───────────────────────────────────────

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__seedStudyOS = seedStudyOSData;
  console.log(
    '%c[StudyOS] Dev seed ready. Run: await window.__seedStudyOS()',
    'background:#6366f1;color:white;padding:4px 8px;border-radius:4px;font-weight:bold;'
  );
}
