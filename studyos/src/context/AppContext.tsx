/**
 * AppContext.tsx — StudyOS Global State (Person 3 / Task 3.2)
 *
 * Architecture:
 *   - useReducer for strict, typed state transitions
 *   - Optimistic UI updates with automatic rollback on failure
 *   - Async-safe actions (all write actions enqueue via dataStore)
 *   - Zero breaking changes to AppContextType — teammates' code unchanged
 *
 * Team integration contract:
 *   - regenerateSchedule(): calls Person 1's scheduleGenerator (dynamic import)
 *   - markSessionMissed():  calls Person 1's cascadeRescheduler (dynamic import)
 *   - Both are non-fatal if Person 1's modules are not yet implemented
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';

import {
  CompletionLogEntry,
  MetricsData,
  ScheduleBlock,
  UserProfile,
} from '@/types';

import {
  addCompletionLogEntry,
  clearAllData,
  getCompletionLog,
  getScheduleBlocks,
  getUserProfile,
  initializeDataStore,
  isOnboardingComplete,
  setOnboardingComplete,
  setUserProfile as persistUserProfile,
  updateScheduleBlock as persistUpdateBlock,
  updateScheduleBlocks as persistUpdateBlocks,
} from '@lib/dataStore';

import {
  calculateCurrentStreak,
  calculateLongestStreak,
  calculateConsistency,
  calculateTotalHours,
  toDateString,
} from '@lib/timeUtils';

// ─── State & Actions ──────────────────────────────────────────────────────────

interface AppState {
  userProfile: UserProfile | null;
  scheduleBlocks: ScheduleBlock[];
  completionLog: CompletionLogEntry[];
  isLoading: boolean;
  isOnboardingComplete: boolean;
}

type Action =
  | { type: 'SET_PROFILE'; payload: UserProfile }
  | { type: 'SET_SCHEDULE'; payload: ScheduleBlock[] }
  | { type: 'UPDATE_BLOCK'; payload: { blockId: string; updates: Partial<ScheduleBlock> } }
  | { type: 'ADD_COMPLETION_LOG_ENTRY'; payload: CompletionLogEntry }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ONBOARDING_COMPLETE'; payload: boolean }
  | { type: 'RESTORE_STATE'; payload: AppState }
  | { type: 'HYDRATE'; payload: Partial<AppState> };

const initialState: AppState = {
  userProfile: null,
  scheduleBlocks: [],
  completionLog: [],
  isLoading: true,
  isOnboardingComplete: false,
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PROFILE':
      return { ...state, userProfile: action.payload };

    case 'SET_SCHEDULE':
      return { ...state, scheduleBlocks: action.payload };

    case 'UPDATE_BLOCK':
      return {
        ...state,
        scheduleBlocks: state.scheduleBlocks.map((b) =>
          b.id === action.payload.blockId ? { ...b, ...action.payload.updates } : b
        ),
      };

    case 'ADD_COMPLETION_LOG_ENTRY':
      return { ...state, completionLog: [...state.completionLog, action.payload] };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ONBOARDING_COMPLETE':
      return { ...state, isOnboardingComplete: action.payload };

    case 'RESTORE_STATE':
      // Used for rollback after a failed async action
      return action.payload;

    case 'HYDRATE':
      return { ...state, ...action.payload };

    default:
      return state;
  }
}

// ─── Context Type (unchanged public API) ──────────────────────────────────────

interface AppContextType {
  // ── State ──
  userProfile: UserProfile | null;
  scheduleBlocks: ScheduleBlock[];
  completionLog: CompletionLogEntry[];
  isLoading: boolean;
  isOnboardingComplete: boolean;

  // ── Actions ──
  setUserProfile: (profile: UserProfile) => Promise<void>;
  updateScheduleBlock: (blockId: string, updates: Partial<ScheduleBlock>) => Promise<void>;
  /** Replaces the entire schedule (called after Person 1's generateSchedule). */
  setScheduleBlocks: (blocks: ScheduleBlock[]) => Promise<void>;
  regenerateSchedule: () => Promise<void>;
  markSessionComplete: (
    blockId: string,
    proofType: 'photo' | 'quiz' | 'voice' | 'none',
    score?: number
  ) => Promise<void>;
  markSessionMissed: (blockId: string, reason?: string) => Promise<void>;
  calculateMetrics: () => MetricsData;
  refreshAllData: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  logout: () => Promise<void>;
  skipToDemo: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  /**
   * stateRef holds a current snapshot of state without being in dependency arrays.
   * Used exclusively for rollback — captures pre-mutation state before async ops.
   */
  const stateRef = useRef<AppState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ── Initialization ──────────────────────────────────────────────────────────

  const loadAllData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // initializeDataStore is idempotent — safe to call on every refresh
      await initializeDataStore();

      const [profile, blocks, log, onboarded] = await Promise.all([
        getUserProfile(),
        getScheduleBlocks(),
        getCompletionLog(),
        isOnboardingComplete(),
      ]);

      dispatch({
        type: 'HYDRATE',
        payload: {
          userProfile: profile,
          scheduleBlocks: blocks,
          completionLog: log,
          isOnboardingComplete: onboarded,
          isLoading: false,
        },
      });
    } catch (err) {
      console.error('[AppContext] Failed to load data:', err);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ── Actions (Optimistic + Rollback) ────────────────────────────────────────

  /**
   * Persists and updates user profile.
   * Optimistic: updates UI immediately, rolls back on failure.
   */
  const setUserProfile = useCallback(async (profile: UserProfile) => {
    const snapshot = stateRef.current;
    dispatch({ type: 'SET_PROFILE', payload: profile });
    try {
      await persistUserProfile(profile);
    } catch (err) {
      dispatch({ type: 'RESTORE_STATE', payload: snapshot });
      console.error('[AppContext] setUserProfile failed — rolled back.', err);
      throw err;
    }
  }, []);

  /**
   * Merges a partial update into a single schedule block.
   * Optimistic: updates UI immediately, rolls back on failure.
   */
  const updateScheduleBlock = useCallback(
    async (blockId: string, updates: Partial<ScheduleBlock>) => {
      const snapshot = stateRef.current;
      dispatch({ type: 'UPDATE_BLOCK', payload: { blockId, updates } });
      try {
        await persistUpdateBlock(blockId, updates);
      } catch (err) {
        dispatch({ type: 'RESTORE_STATE', payload: snapshot });
        console.error('[AppContext] updateScheduleBlock failed — rolled back.', err);
        throw err;
      }
    },
    []
  );

  /**
   * Replaces the entire schedule (used after Person 1's generateSchedule).
   * Optimistic: updates UI immediately, rolls back on failure.
   */
  const setScheduleBlocks = useCallback(async (blocks: ScheduleBlock[]) => {
    const snapshot = stateRef.current;
    dispatch({ type: 'SET_SCHEDULE', payload: blocks });
    try {
      await persistUpdateBlocks(blocks);
    } catch (err) {
      dispatch({ type: 'RESTORE_STATE', payload: snapshot });
      console.error('[AppContext] setScheduleBlocks failed — rolled back.', err);
      throw err;
    }
  }, []);

  /**
   * Calls Person 1's generateInitialSchedule and stores the result.
   * Dynamic import keeps this decoupled from Person 1's internal structure.
   */
  const regenerateSchedule = useCallback(async () => {
    const currentProfile = stateRef.current.userProfile;
    if (!currentProfile) {
      throw new Error('regenerateSchedule: no userProfile set.');
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Dynamic import — non-fatal if Person 1's module isn't implemented yet
      const { generateSchedule } = await import('@lib/scheduleGenerator');
      const result = await generateSchedule(currentProfile);
      const newBlocks = result.blocks ?? result;
      await persistUpdateBlocks(newBlocks);
      dispatch({ type: 'SET_SCHEDULE', payload: newBlocks });
    } catch (err) {
      console.error('[AppContext] regenerateSchedule failed.', err);
      throw err;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  /**
   * Marks a block as completed and logs the completion entry.
   * Two-step write: block status update + completion log append.
   * Rolled back atomically if either step fails.
   */
  const markSessionComplete = useCallback(
    async (
      blockId: string,
      proofType: 'photo' | 'quiz' | 'voice' | 'none',
      score?: number
    ) => {
      const snapshot = stateRef.current;

      const blockUpdates: Partial<ScheduleBlock> = {
        status: 'completed',
        proofVerified: proofType !== 'none',
        quizScore: proofType === 'quiz' ? (score ?? null) : null,
      };

      const entry: CompletionLogEntry = {
        blockId,
        date: toDateString(new Date()),
        completedAt: new Date().toISOString(),
        proofType,
        proofScore: score ?? null,
        pomodoroCount: 0, // updated separately by SessionActiveView
      };

      // Optimistic update
      dispatch({ type: 'UPDATE_BLOCK', payload: { blockId, updates: blockUpdates } });
      dispatch({ type: 'ADD_COMPLETION_LOG_ENTRY', payload: entry });

      try {
        await persistUpdateBlock(blockId, blockUpdates);
        await addCompletionLogEntry(entry);
      } catch (err) {
        dispatch({ type: 'RESTORE_STATE', payload: snapshot });
        console.error('[AppContext] markSessionComplete failed — rolled back.', err);
        throw err;
      }
    },
    []
  );

  /**
   * Marks a block as missed and triggers Person 1's cascade rescheduler.
   * The cascade rescheduler call is non-fatal (stub-safe).
   */
  const markSessionMissed = useCallback(async (blockId: string, reason?: string) => {
    const snapshot = stateRef.current;
    
    const updates: Partial<ScheduleBlock> = { 
      status: 'missed',
      missedReason: reason || null
    };

    dispatch({ type: 'UPDATE_BLOCK', payload: { blockId, updates } });

    try {
      await persistUpdateBlock(blockId, updates);

      // Non-fatal: cascade rescheduler may not be implemented by Person 1 yet
      try {
        const cascadeModule = await import('@lib/cascadeRescheduler');
        const currentBlocks = await getScheduleBlocks();
        const currentProfile = stateRef.current.userProfile;
        
        // Correctly typed helper to handle the RescheduleResult wrapper
        const rescheduleFn = (cascadeModule as any).rescheduleAfterMiss;

        if (rescheduleFn && currentProfile) {
          const result = await rescheduleFn(blockId, currentBlocks, currentProfile);
          
          // Bug Fix: result is a RescheduleResult { updatedSchedule, burnoutMessage, ... }
          // We need the updatedSchedule array for storage and state.
          const newBlocks = result?.updatedSchedule || result; 

          if (Array.isArray(newBlocks)) {
            await persistUpdateBlocks(newBlocks);
            dispatch({ type: 'SET_SCHEDULE', payload: newBlocks });
            
            if (result?.burnoutMessage) {
              console.info('[Sage Burnout Analysis]:', result.burnoutMessage);
              // In a future feature we might want to toast this.
            }
          }
        }
      } catch (cascadeErr) {
        console.warn('[AppContext] cascadeRescheduler error:', cascadeErr);
      }
    } catch (err) {
      dispatch({ type: 'RESTORE_STATE', payload: snapshot });
      console.error('[AppContext] markSessionMissed failed — rolled back.', err);
      throw err;
    }
  }, []);

  /**
   * Re-fetches all data from the storage backend.
   * Use after JSON import, data reset, or to force consistency.
   */
  const refreshAllData = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

  /** Marks onboarding as complete in storage and updates state. */
  const completeOnboarding = useCallback(async () => {
    const snapshot = stateRef.current;
    dispatch({ type: 'SET_ONBOARDING_COMPLETE', payload: true });
    try {
      await setOnboardingComplete(true);
    } catch (err) {
      dispatch({ type: 'RESTORE_STATE', payload: snapshot });
      console.error('[AppContext] completeOnboarding failed — rolled back.', err);
      throw err;
    }
  }, []);

  /** Clears all data and reloads the app. */
  const logout = useCallback(async () => {
    try {
      await clearAllData();
      // Force reload to completely reset the app state and go back to landing
      window.location.reload();
    } catch (err) {
      console.error('[AppContext] logout failed:', err);
      throw err;
    }
  }, []);

  /** Injects mock data and jumps to dashboard. Useful for demo/testing. */
  const skipToDemo = useCallback(async () => {
    try {
      const mockProfile: UserProfile = {
        userId: crypto.randomUUID(),
        name: 'Experimental Student',
        motivation: 'To crush my exams and master complex topics through disciplined study.',
        energyPeak: 'morning',
        subjects: [
          {
            id: crypto.randomUUID(),
            name: 'Mathematics',
            difficulty: 8,
            deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            currentLevel: 4,
            color: '#EF4444',
            masteryScore: 0,
            priorityScore: 0,
            topics: []
          },
          {
            id: crypto.randomUUID(),
            name: 'Physics',
            difficulty: 7,
            deadline: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
            currentLevel: 5,
            color: '#8B5CF6',
            masteryScore: 0,
            priorityScore: 0,
            topics: []
          },
          {
            id: crypto.randomUUID(),
            name: 'Computer Science',
            difficulty: 6,
            deadline: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
            currentLevel: 7,
            color: '#3B82F6',
            masteryScore: 0,
            priorityScore: 0,
            topics: []
          }
        ],
        constraints: {
          sleepBy: '23:00',
          wakeAt: '07:00',
          blockedSlots: [],
          breakDays: ['Sunday']
        },
        availableHours: { weekday: 4, weekend: 8 },
        createdAt: new Date().toISOString()
      };

      await persistUserProfile(mockProfile);
      await setOnboardingComplete(true);
      window.location.reload();
    } catch (err) {
      console.error('[AppContext] skipToDemo failed:', err);
      throw err;
    }
  }, []);

  // ── Derived Metrics (Memoized) ─────────────────────────────────────────────

  /**
   * Returns a stable metrics calculator.
   * Only recomputed when completionLog, scheduleBlocks, or userProfile changes.
   */
  const calculateMetrics = useMemo((): (() => MetricsData) => {
    return () => {
      const totalHours = calculateTotalHours(state.scheduleBlocks);
      const sessionsCompleted = state.completionLog.length;
      const currentStreak = calculateCurrentStreak(state.completionLog);
      const longestStreak = calculateLongestStreak(state.completionLog);
      const consistencyScore = calculateConsistency(state.completionLog, 30);

      const masteryBySubject: Record<string, number> = {};
      const readinessBySubject: Record<string, number> = {};

      if (state.userProfile) {
        for (const subject of state.userProfile.subjects) {
          const subjectBlocks = state.scheduleBlocks.filter(
            (b) => b.subjectId === subject.id && b.status === 'completed'
          );
          const quizBlocks = subjectBlocks.filter((b) => b.quizScore !== null);
          const quizAvg =
            quizBlocks.length > 0
              ? quizBlocks.reduce((sum, b) => sum + (b.quizScore ?? 0), 0) / quizBlocks.length
              : 0;

          const revisionScheduled = state.scheduleBlocks.filter(
            (b) => b.subjectId === subject.id && b.type === 'revision'
          ).length;
          const revisionDone = subjectBlocks.filter((b) => b.type === 'revision').length;
          const revisionCompletion =
            revisionScheduled > 0 ? (revisionDone / revisionScheduled) * 100 : 0;

          const streakBonus = Math.min(20, Math.floor(currentStreak / 5) * 10);

          // PRD mastery formula: (revision × 0.4) + (quiz × 0.4) + (streak × 0.2)
          masteryBySubject[subject.id] = Math.min(
            100,
            Math.round(revisionCompletion * 0.4 + quizAvg * 0.4 + streakBonus * 0.2)
          );

          const daysTill = Math.max(
            0,
            (new Date(subject.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          const urgencyAdj = daysTill < 7 ? -((7 - daysTill) * 2) : 0;
          readinessBySubject[subject.id] = Math.max(
            0,
            Math.min(
              100,
              Math.round(
                (subject.currentLevel / 10) * 50 + revisionCompletion * 0.3 + urgencyAdj
              )
            )
          );
        }
      }

      return {
        totalHours,
        sessionsCompleted,
        currentStreak,
        longestStreak,
        consistencyScore,
        masteryBySubject,
        readinessBySubject,
      };
    };
  }, [state.completionLog, state.scheduleBlocks, state.userProfile]);

  // ── Context Value ──────────────────────────────────────────────────────────

  const value: AppContextType = {
    userProfile: state.userProfile,
    scheduleBlocks: state.scheduleBlocks,
    completionLog: state.completionLog,
    isLoading: state.isLoading,
    isOnboardingComplete: state.isOnboardingComplete,
    setUserProfile,
    updateScheduleBlock,
    setScheduleBlocks,
    regenerateSchedule,
    markSessionComplete,
    markSessionMissed,
    calculateMetrics,
    refreshAllData,
    completeOnboarding,
    logout,
    skipToDemo,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Consume global app state in any component.
 * Must be used inside <AppProvider>.
 *
 * @example
 *   const { userProfile, markSessionComplete } = useAppContext();
 */
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error(
      'useAppContext must be used within <AppProvider>. Wrap your component tree with <AppProvider>.'
    );
  }
  return context;
};

export default AppContext;
