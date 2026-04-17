import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { TopBar } from './ui/TopBar';
import { BottomNav, SidebarNav } from './ui/BottomNav';
import { HomeDashboard } from './HomeDashboard';
import { ScheduleViewScreen } from './ScheduleViewScreen';
import { AnalyticsScreen } from './AnalyticsScreen';
import { AIInsightsScreen } from './AIInsightsScreen';
import { ActionModal } from './ActionModal';
import { SubjectManagement } from './SubjectManagement';
import { SessionActiveView } from './SessionActiveView';
import { ScheduleBlock } from '../types';

import { WelcomeScreen } from './WelcomeScreen';

type Tab = 'home' | 'schedule' | 'analytics' | 'insights';

export const Dashboard: React.FC = () => {
  const { markSessionComplete, markSessionMissed, isOnboardingComplete, userProfile } = useAppContext();

  const [activeTab, setActiveTab]               = useState<Tab>('home');
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showSettings, setShowSettings]         = useState(false);
  const [actionBlock, setActionBlock]           = useState<ScheduleBlock | null>(null);
  const [actionType, setActionType]             = useState<'complete' | 'miss'>('complete');
  const [showOnboarding, setShowOnboarding]     = useState(false);
  const [activeSession, setActiveSession]       = useState<ScheduleBlock | null>(null);


  // Called from HomeDashboard → "Start Session" => opens focus view
  const handleStartSession = (block: ScheduleBlock) => {
    setActiveSession(block);
  };

  // Called from HomeDashboard / ScheduleView → "Mark Missed"
  const handleMarkMissed = (block: ScheduleBlock) => {
    setActionBlock(block);
    setActionType('miss');
  };

  const handleCloseAction = () => setActionBlock(null);

  const handleSessionEnd = (completed: boolean) => {
    if (activeSession) {
      setActionBlock(activeSession);
      setActionType(completed ? 'complete' : 'miss');
      setActiveSession(null);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeDashboard
            onStartSession={handleStartSession}
            onMarkMissed={handleMarkMissed}
            onAddSubject={() => setShowSubjectModal(true)}
            onStartOnboarding={() => setShowOnboarding(true)}
          />
        );
      case 'schedule':
        return (
          <ScheduleViewScreen
            onComplete={handleStartSession}
            onMiss={handleMarkMissed}
          />
        );
      case 'analytics':
        return <AnalyticsScreen />;
      case 'insights':
        return <AIInsightsScreen />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-surface flex md:flex-row flex-col">

      {/* Desktop: Sidebar */}
      <SidebarNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-screen relative">
        <TopBar onSettingsClick={() => setShowSettings(s => !s)} />

        {/* Onboarding Overlay */}
        {showOnboarding && (
          <div className="fixed inset-0 z-[100] bg-surface">
            <div className="absolute top-6 right-6 z-[110]">
              <button 
                onClick={() => setShowOnboarding(false)}
                className="p-3 bg-surface-container rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <WelcomeScreen />
          </div>
        )}

        {/* Onboarding Banner - Restored as per user request */}
        {!isOnboardingComplete && activeTab === 'home' && (
          <div className="bg-primary/10 border-b border-primary/20 px-8 py-4 flex items-center justify-between animate-fade-in relative z-20">
            <p className="text-sm font-body text-on-surface flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-xl icon-fill">info</span>
              Complete your cognitive profile to unlock Sage Intelligence.
            </p>
            <button 
              onClick={() => setShowOnboarding(true)}
              className="text-sm font-headline font-bold bg-on-surface text-surface px-6 py-2 rounded-full hover:shadow-lg transition-all flex items-center gap-1 active:scale-95"
            >
              Start Onboarding <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
        )}

        {/* If settings visible, show a simple overlay */}

        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-md" onClick={() => setShowSettings(false)}>
            <div className="bg-surface-container-lowest rounded-[2rem] p-8 w-full max-w-sm shadow-modal animate-scale-in" onClick={e => e.stopPropagation()}>
              <h2 className="font-headline text-xl font-semibold text-on-surface mb-4">Settings</h2>
              <p className="font-body text-sm text-on-surface-variant">Settings panel coming soon.</p>
              <button
                onClick={() => setShowSettings(false)}
                className="mt-6 w-full cta-gradient text-on-primary py-3 rounded-full font-body font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 pb-32 md:pb-8 overflow-y-auto">
          {activeSession ? (
            <div className="max-w-xl mx-auto px-6 py-8">
              <SessionActiveView 
                block={activeSession} 
                onEndFlow={handleSessionEnd} 
              />
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </div>

      {/* Mobile: Bottom Nav */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Action Modal (Complete / Miss a Session) */}
      {actionBlock && (
        <ActionModal
          block={actionBlock}
          mode={actionType}
          onClose={handleCloseAction}
        />
      )}

      {/* Subject Management Sheet */}
      {showSubjectModal && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-on-surface/40 backdrop-blur-sm"
          onClick={() => setShowSubjectModal(false)}
        >
          <div
            className="w-full md:w-auto md:min-w-[480px] md:max-w-xl bg-surface-container-lowest rounded-t-[2rem] md:rounded-[2rem] shadow-modal animate-slide-up max-h-[85dvh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 pt-6 pb-2">
              <h2 className="font-headline text-xl font-semibold text-on-surface">Manage Subjects</h2>
              <button
                onClick={() => setShowSubjectModal(false)}
                className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <SubjectManagement onClose={() => setShowSubjectModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
};
