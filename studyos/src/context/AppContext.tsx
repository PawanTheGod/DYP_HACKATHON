import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { UserProfile, ScheduleBlock, CompletionLogEntry, MetricsData } from '@types/index';

interface AppContextType {
  // State
  userProfile: UserProfile | null;
  scheduleBlocks: ScheduleBlock[];
  completionLog: CompletionLogEntry[];
  isLoading: boolean;
  isOnboardingComplete: boolean;

  // Actions
  setUserProfile: (profile: UserProfile) => Promise<void>;
  updateScheduleBlock: (blockId: string, updates: Partial<ScheduleBlock>) => Promise<void>;
  regenerateSchedule: () => Promise<void>;
  markSessionComplete: (blockId: string, proofType: 'photo' | 'quiz' | 'voice' | 'none', score?: number) => Promise<void>;
  markSessionMissed: (blockId: string) => Promise<void>;
  calculateMetrics: () => MetricsData;
  refreshAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
  const [scheduleBlocks, setScheduleBlocksState] = useState<ScheduleBlock[]>([]);
  const [completionLog, setCompletionLogState] = useState<CompletionLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboardingComplete, setIsOnboardingCompleteState] = useState(false);

  // TODO: Person 3 - Implement storage persistence and state syncing
  const setUserProfile = useCallback(async (profile: UserProfile) => {
    setUserProfileState(profile);
    // Persist to localStorage
  }, []);

  const updateScheduleBlock = useCallback(async (blockId: string, updates: Partial<ScheduleBlock>) => {
    setScheduleBlocksState(prev => prev.map(block => 
      block.id === blockId ? { ...block, ...updates } : block
    ));
    // Update in localStorage
  }, []);

  const regenerateSchedule = useCallback(async () => {
    // TODO: Person 1 - Integration with scheduleGenerator.ts
    console.log('Regenerating schedule...');
  }, [userProfile]);

  const markSessionComplete = useCallback(async (blockId: string, proofType: 'photo' | 'quiz' | 'voice' | 'none', score?: number) => {
    // Implementation
  }, []);

  const markSessionMissed = useCallback(async (blockId: string) => {
    // TODO: Person 1 - Trigger cascadeRescheduler.ts
  }, []);

  const calculateMetrics = useCallback((): MetricsData => {
    // TODO: Person 3 - Implement metrics calculation logic
    return {
      totalHours: 0,
      sessionsCompleted: 0,
      currentStreak: 0,
      longestStreak: 0,
      consistencyScore: 0,
      masteryBySubject: {},
      readinessBySubject: {},
    };
  }, [completionLog]);

  const refreshAllData = useCallback(async () => {
    // Reload from storage
  }, []);

  useEffect(() => {
    // TODO: Person 3 - Load initial data from localStorage/IndexedDB on mount
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AppContext.Provider value={{
      userProfile,
      scheduleBlocks,
      completionLog,
      isLoading,
      isOnboardingComplete,
      setUserProfile,
      updateScheduleBlock,
      regenerateSchedule,
      markSessionComplete,
      markSessionMissed,
      calculateMetrics,
      refreshAllData,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};
