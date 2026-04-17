/**
 * AppContext.tsx — StudyOS Global State (Person 3 / Task 3.2)
 *
 * Provides app-wide state to all components via React Context.
 * Avoids prop drilling.
 *
 * Usage (any component):
 *   const { userProfile, markSessionComplete } = useAppContext();
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  CompletionLogEntry,
  MetricsData,
  ScheduleBlock,
  UserProfile,
} from '@/types';

import {
  addCompletionLogEntry,
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

// ─── Types ─────────────────────────────────────────────────────────────────────

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
  markSessionMissed: (blockId: string) => Promise<void>;
  calculateMetrics: () => MetricsData;
  refreshAllData: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
  const [scheduleBlocks, setScheduleBlocksState] = useState<ScheduleBlock[]>([]);
  const [completionLog, setCompletionLogState] = useState<CompletionLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboardingCompleteState, setIsOnboardingCompleteState] = useState(false);

  // ── Initialization ─────────────────────────────────────────────────────────

  const loadAllData = useCallback(async () => {
    try {
      initializeDataStore();
      const [profile, blocks, log, onboarded] = await Promise.all([
        getUserProfile(),
        getScheduleBlocks(),
        getCompletionLog(),
        isOnboardingComplete(),
      ]);
      setUserProfileState(profile);
      setScheduleBlocksState(blocks);
      setCompletionLogState(log);
      setIsOnboardingCompleteState(onboarded);
    } catch (err) {
      console.error('[AppContext] Failed to load data from localStorage:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Persists and updates user profile in both context and localStorage.
   */
  const setUserProfile = useCallback(async (profile: UserProfile) => {
    try {
      await persistUserProfile(profile);
      setUserProfileState(profile);
    } catch (err) {
      console.error('[AppContext] setUserProfile failed:', err);
      throw err;
    }
  }, []);

  /**
   * Merges a partial update into a single schedule block.
   */
  const updateScheduleBlock = useCallback(
    async (blockId: string, updates: Partial<ScheduleBlock>) => {
      try {
        await persistUpdateBlock(blockId, updates);
        setScheduleBlocksState((prev) =>
          prev.map((b) => (b.id === blockId ? { ...b, ...updates } : b))
        );
      } catch (err) {
        console.error('[AppContext] updateScheduleBlock failed:', err);
        throw err;
      }
    },
    []
  );

  /**
   * Replaces the entire schedule array (used after generateSchedule from Person 1).
   */
  const setScheduleBlocks = useCallback(async (blocks: ScheduleBlock[]) => {
    try {
      await persistUpdateBlocks(blocks);
      setScheduleBlocksState(blocks);
    } catch (err) {
      console.error('[AppContext] setScheduleBlocks failed:', err);
      throw err;
    }
  }, []);

  /**
   * Calls Person 1's generateInitialSchedule and stores the result.
   * Stub until Person 1 implements scheduleGenerator.ts fully.
   */
  const regenerateSchedule = useCallback(async () => {
    if (!userProfile) {
      throw new Error('Cannot regenerate schedule: no userProfile found.');
    }
    try {
      setIsLoading(true);
      // Dynamic import to avoid circular dep if Person 1's module changes
      const { generateInitialSchedule } = await import('@lib/scheduleGenerator');
      const newBlocks = await generateInitialSchedule(userProfile);
      await persistUpdateBlocks(newBlocks);
      setScheduleBlocksState(newBlocks);
    } catch (err) {
      console.error('[AppContext] regenerateSchedule failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [userProfile]);

  /**
   * Marks a block as completed, logs the completion entry, and updates context.
   */
  const markSessionComplete = useCallback(
    async (
      blockId: string,
      proofType: 'photo' | 'quiz' | 'voice' | 'none',
      score?: number
    ) => {
      try {
        // 1. Update the block status
        await persistUpdateBlock(blockId, {
          status: 'completed',
          proofVerified: proofType !== 'none',
          quizScore: proofType === 'quiz' ? (score ?? null) : null,
        });
        setScheduleBlocksState((prev) =>
          prev.map((b) =>
            b.id === blockId
              ? { ...b, status: 'completed', proofVerified: proofType !== 'none', quizScore: proofType === 'quiz' ? (score ?? null) : null }
              : b
          )
        );

        // 2. Add completion log entry
        const entry: CompletionLogEntry = {
          blockId,
          date: toDateString(new Date()),
          completedAt: new Date().toISOString(),
          proofType,
          proofScore: score ?? null,
          pomodoroCount: 0, // updated separately by SessionActiveView
        };
        await addCompletionLogEntry(entry);
        setCompletionLogState((prev) => [...prev, entry]);
      } catch (err) {
        console.error('[AppContext] markSessionComplete failed:', err);
        throw err;
      }
    },
    []
  );

  /**
   * Marks a block as missed and triggers the cascade rescheduler (Person 1).
   */
  const markSessionMissed = useCallback(
    async (blockId: string) => {
      try {
        // 1. Update block status to missed
        await persistUpdateBlock(blockId, { status: 'missed' });
        setScheduleBlocksState((prev) =>
          prev.map((b) => (b.id === blockId ? { ...b, status: 'missed' } : b))
        );

        // 2. Trigger Person 1's cascade rescheduler (dynamic import — stub-safe)
        try {
          // Person 1 owns cascadeRescheduler.ts.
          // We import dynamically so this stays non-fatal if the function name changes.
          const cascadeModule = await import('@lib/cascadeRescheduler');
          const currentBlocks = await getScheduleBlocks();
          // Support both the final name (rescheduleAfterMiss) and the current stub name
          const rescheduleFn =
            (cascadeModule as Record<string, unknown>)['rescheduleAfterMiss'] as
              | ((id: string, blocks: ScheduleBlock[], profile: UserProfile) => Promise<ScheduleBlock[]>)
              | undefined;
          if (rescheduleFn && userProfile) {
            const newBlocks = await rescheduleFn(blockId, currentBlocks, userProfile);
            await persistUpdateBlocks(newBlocks);
            setScheduleBlocksState(newBlocks);
          }
        } catch (cascadeErr) {
          // Non-fatal: cascadeRescheduler may not be implemented yet by Person 1
          console.warn('[AppContext] cascadeRescheduler not available (Person 1 stub):', cascadeErr);
        }
      } catch (err) {
        console.error('[AppContext] markSessionMissed failed:', err);
        throw err;
      }
    },
    [userProfile]
  );

  /**
   * Re-fetches all data from localStorage.
   * Useful after JSON import, data reset, or debugging.
   */
  const refreshAllData = useCallback(async () => {
    setIsLoading(true);
    await loadAllData();
  }, [loadAllData]);

  /**
   * Marks onboarding as complete in localStorage and updates context.
   */
  const completeOnboarding = useCallback(async () => {
    await setOnboardingComplete(true);
    setIsOnboardingCompleteState(true);
  }, []);

  // ── Derived / Memoized ────────────────────────────────────────────────────

  /**
   * Calculates all metrics from completionLog.
   * Memoized — only recalculates when completionLog changes.
   */
  const calculateMetrics = useMemo((): (() => MetricsData) => {
    return () => {
      const totalHours = calculateTotalHours(scheduleBlocks);
      const sessionsCompleted = completionLog.length;
      const currentStreak = calculateCurrentStreak(completionLog);
      const longestStreak = calculateLongestStreak(completionLog);
      const consistencyScore = calculateConsistency(completionLog, 30);

      // Mastery by subject: weighted average of quiz scores (from completionLog)
      const masteryBySubject: Record<string, number> = {};
      const readinessBySubject: Record<string, number> = {};

      if (userProfile) {
        for (const subject of userProfile.subjects) {
          // Quiz scores for this subject
          const subjectBlocks = scheduleBlocks.filter(
            (b) => b.subjectId === subject.id && b.status === 'completed'
          );
          const quizBlocks = subjectBlocks.filter(
            (b) => b.quizScore !== null
          );
          const quizAvg =
            quizBlocks.length > 0
              ? quizBlocks.reduce((sum, b) => sum + (b.quizScore ?? 0), 0) / quizBlocks.length
              : 0;

          // Revision completion %
          const revisionScheduled = scheduleBlocks.filter(
            (b) => b.subjectId === subject.id && b.type === 'revision'
          ).length;
          const revisionDone = subjectBlocks.filter((b) => b.type === 'revision').length;
          const revisionCompletion =
            revisionScheduled > 0 ? (revisionDone / revisionScheduled) * 100 : 0;

          // Streak bonus: +10 per 5-streak (capped at 20)
          const streakBonus = Math.min(20, Math.floor(currentStreak / 5) * 10);

          // Mastery formula from PRD: (rev × 0.4) + (quiz × 0.4) + (streak × 0.2)
          const mastery = Math.round(
            revisionCompletion * 0.4 + quizAvg * 0.4 + streakBonus * 0.2
          );
          masteryBySubject[subject.id] = Math.min(100, mastery);

          // Readiness formula from PRD
          const daysTill = Math.max(
            0,
            (new Date(subject.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          const urgencyAdj = daysTill < 7 ? -((7 - daysTill) * 2) : 0;
          const readiness = Math.max(
            0,
            Math.min(
              100,
              Math.round(
                (subject.currentLevel / 10) * 50 + revisionCompletion * 0.3 + urgencyAdj
              )
            )
          );
          readinessBySubject[subject.id] = readiness;
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
  }, [completionLog, scheduleBlocks, userProfile]);

  // ── Context Value ─────────────────────────────────────────────────────────

  const value: AppContextType = {
    userProfile,
    scheduleBlocks,
    completionLog,
    isLoading,
    isOnboardingComplete: isOnboardingCompleteState,
    setUserProfile,
    updateScheduleBlock,
    setScheduleBlocks,
    regenerateSchedule,
    markSessionComplete,
    markSessionMissed,
    calculateMetrics,
    refreshAllData,
    completeOnboarding,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Consume global app context in any component.
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
