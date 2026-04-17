You are an expert full-stack TypeScript/React developer building a production-ready React web application called StudyOS.

PROJECT OVERVIEW:
- Product: StudyOS — AI-powered adaptive study planner
- Frontend: React 18 + Next.js 14 (App Router)
- Styling: TailwindCSS + custom CSS
- State: React Context API
- Storage: LocalStorage + IndexedDB (client-side only)
- AI: Anthropic Claude API integration (via /v1/messages)
- Build tool: Vite or Next.js
- Package manager: npm or pnpm

TASK: Generate the complete PROJECT FOUNDATION STRUCTURE with:
1. Full directory architecture
2. All TypeScript interfaces and types
3. Base utility modules (no implementation, just signatures)
4. React Context setup
5. Base component structure (no UI implementation yet)
6. LocalStorage schema
7. Configuration files
8. Entry point (App.tsx, main.tsx, layout.tsx)
9. TailwindCSS configuration
10. .env.example file

OUTPUT FORMAT:
- Generate file-by-file with full paths
- Include proper TypeScript interfaces
- Use React functional components with hooks
- Follow best practices (naming, structure, scalability)
- Assume all 4 team members will work in parallel
- Make it branch-friendly (clean separation of concerns)

REQUIREMENTS:
- Zero hardcoded values (all configurable)
- Type-safe throughout (no 'any')
- Clear TODO comments for Person 1-4 implementation
- Modular: easy to pick up specific files and implement
- Scalable: foundation supports all 6 phases of StudyOS
- Git-ready: clean, mergeable structure

DELIVERABLES:
1. src/ directory structure
2. All TypeScript interface definitions (types.ts files)
3. Context setup (AppContext.tsx with providers)
4. Utility function signatures (lib/ folder)
5. Base component shells (components/ folder)
6. Page structure (pages/ or app/ depending on framework)
7. Configuration files (tailwind.config.js, tsconfig.json, etc.)
8. .env.example with required API keys
9. package.json with all dependencies
10. README with setup instructions

CRITICAL REQUIREMENTS:
- Use TypeScript everywhere (strict mode)
- All functions async-ready (return Promise where needed for future backend migration)
- Proper error handling patterns established
- LocalStorage key constants defined
- Component naming: PascalCase for components, camelCase for utilities
- Folder structure: features-based (onboarding/, schedule/, dashboard/, chat/)
- Each folder has: components/, hooks/, utils/, types.ts
- All Person 1-4 tasks should have clear entry points in this foundation

Let me create the complete scaffolding now.
EXECUTE THIS PROMPT IN CURSOR/WINDSURF/CLAUDE:
Copy the above prompt into:

Cursor: Use Cmd+K (or Ctrl+K) → paste prompt → "Generate"
Windsurf: Use "Cascade" mode → paste prompt → execute
Claude (web): Paste in chat → request file-by-file output
THEN, MANUALLY CREATE THIS EXACT STRUCTURE:
Code
studyos/
├── .github/
│   └── workflows/
│       └── ci.yml
├── .gitignore
├── .env.example
├── package.json
├── tsconfig.json
├── vite.config.ts (or next.config.js if using Next.js)
├── tailwind.config.js
├── postcss.config.js
├── README.md
└── src/
    ├── types/
    │   ├── index.ts (all interfaces exported here)
    │   ├── user.ts
    │   ├── schedule.ts
    │   ├── completion.ts
    │   └── chat.ts
    ├── lib/
    │   ├── dataStore.ts (Person 3)
    │   ├── timeUtils.ts (Person 3)
    │   ├── sageSystemPrompt.ts (Person 1)
    │   ├── scheduleGenerator.ts (Person 1)
    │   ├── onboardingPipeline.ts (Person 1)
    │   ├── cascadeRescheduler.ts (Person 1)
    │   ├── proofVerifier.ts (Person 1)
    │   ├── dailyCheckIn.ts (Person 1)
    │   └── exportImport.ts (Person 3)
    ├── context/
    │   └── AppContext.tsx (Person 3)
    ├── hooks/
    │   └── useAppContext.ts (Person 3)
    ├── components/
    │   ├── ui/
    │   │   ├── Button.tsx (Person 4)
    │   │   ├── Modal.tsx (Person 4)
    │   │   ├── Card.tsx (Person 4)
    │   │   ├── Input.tsx (Person 4)
    │   │   ├── Spinner.tsx (Person 4)
    │   │   ├── Toast.tsx (Person 4)
    │   │   ├── ProgressRing.tsx (Person 4)
    │   │   └── Badge.tsx (Person 4)
    │   ├── ErrorBoundary.tsx (Person 4)
    │   ├── LoadingState.tsx (Person 4)
    │   ├── WelcomeScreen.tsx (Person 4)
    │   ├── OnboardingChat.tsx (Person 2)
    │   ├── ScheduleView.tsx (Person 2)
    │   ├── SessionActiveView.tsx (Person 2)
    │   ├── Dashboard.tsx (Person 2)
    │   ├── ChatWithSage.tsx (Person 2)
    │   └── SettingsScreen.tsx (Person 4)
    ├── pages/ (or app/ if Next.js)
    │   ├── index.tsx (entry)
    │   ├── onboarding.tsx
    │   ├── schedule.tsx
    │   ├── session.tsx
    │   ├── dashboard.tsx
    │   ├── chat.tsx
    │   └── settings.tsx
    ├── styles/
    │   ├── globals.css
    │   ├── responsive.css (Person 4)
    │   └── animations.css
    ├── App.tsx
    └── main.tsx (or _app.tsx for Next.js)
CORE FILES TO CREATE MANUALLY (Minimum Viable Foundation):
1. package.json
JSON
{
  "name": "studyos",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@anthropic-ai/sdk": "^0.16.0",
    "@fullcalendar/react": "^6.1.10",
    "@fullcalendar/daygrid": "^6.1.10",
    "@fullcalendar/timegrid": "^6.1.10",
    "recharts": "^2.10.3",
    "lucide-react": "^0.296.0",
    "clsx": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.2.0",
    "@types/react": "^18.2.0",
    "@types/node": "^20.0.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.31",
    "autoprefixer": "^10.4.16"
  }
}
2. tsconfig.json
JSON
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@lib/*": ["./src/lib/*"],
      "@types/*": ["./src/types/*"],
      "@context/*": ["./src/context/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
3. tailwind.config.js
JavaScript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          600: '#0284c7',
          900: '#082f49',
        }
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        slideUp: {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' }
        }
      },
      animation: {
        fadeIn: 'fadeIn 200ms ease-out',
        slideUp: 'slideUp 300ms ease-out'
      }
    },
  },
  plugins: [],
}
4. src/types/index.ts (All Interfaces)
TypeScript
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
  role: 'user' | 'sage';
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
5. src/context/AppContext.tsx (Provider)
TypeScript
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AppDataStore, UserProfile, ScheduleBlock, CompletionLogEntry, MetricsData } from '@types/index';

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

  // TODO: Person 3 implements these actions
  const setUserProfile = useCallback(async (profile: UserProfile) => {
    // Implementation
  }, []);

  const updateScheduleBlock = useCallback(async (blockId: string, updates: Partial<ScheduleBlock>) => {
    // Implementation
  }, []);

  const regenerateSchedule = useCallback(async () => {
    // Calls Person 1's generateSchedule()
  }, [userProfile]);

  const markSessionComplete = useCallback(async (blockId: string, proofType: 'photo' | 'quiz' | 'voice' | 'none', score?: number) => {
    // Implementation
  }, []);

  const markSessionMissed = useCallback(async (blockId: string) => {
    // Implementation - triggers cascadeRescheduler
  }, []);

  const calculateMetrics = useCallback((): MetricsData => {
    // Implementation
    return {} as MetricsData;
  }, [completionLog]);

  const refreshAllData = useCallback(async () => {
    // Implementation
  }, []);

  useEffect(() => {
    // TODO: Person 3 loads initial data from localStorage on mount
    setIsLoading(false);
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
6. src/App.tsx (Entry)
TypeScript
import React, { useEffect } from 'react';
import { AppProvider } from '@context/AppContext';
import { ErrorBoundary } from '@components/ErrorBoundary';
import { WelcomeScreen } from '@components/WelcomeScreen';
import { useAppContext } from '@context/AppContext';

const AppContent: React.FC = () => {
  const { isOnboardingComplete, isLoading } = useAppContext();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><span>Loading...</span></div>;
  }

  return isOnboardingComplete ? <div>Main App</div> : <WelcomeScreen />;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;
7. src/lib/dataStore.ts (Signature Only)
TypeScript
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

// TODO: Person 3 implements all below functions

export async function initializeDataStore(): Promise<void> {
  // Initialize localStorage with empty schema
}

export async function getUserProfile(): Promise<UserProfile | null> {
  // Retrieve from localStorage
}

export async function setUserProfile(profile: UserProfile): Promise<void> {
  // Save to localStorage
}

export async function getScheduleBlocks(filterByStatus?: 'pending' | 'completed' | 'missed'): Promise<ScheduleBlock[]> {
  // Retrieve schedule blocks
}

export async function updateScheduleBlock(blockId: string, updates: Partial<ScheduleBlock>): Promise<void> {
  // Merge update into specific block
}

export async function getCompletionLog(days?: number): Promise<CompletionLogEntry[]> {
  // Retrieve completion entries
}

export async function addCompletionLogEntry(entry: CompletionLogEntry): Promise<void> {
  // Append entry
}

export async function clearAllData(): Promise<void> {
  // Factory reset
}

export function validateDataIntegrity(): { valid: boolean; errors: string[] } {
  // Check for missing fields
}
8. .env.example
Code
VITE_ANTHROPIC_API_KEY=your_anthropic_key_here
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=development

