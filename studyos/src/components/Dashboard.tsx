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
import { ScheduleBlock } from '../types';

type Tab = 'home' | 'schedule' | 'analytics' | 'insights';

export const Dashboard: React.FC = () => {
  const { markSessionComplete, markSessionMissed } = useAppContext();

  const [activeTab, setActiveTab]               = useState<Tab>('home');
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showSettings, setShowSettings]         = useState(false);
  const [actionBlock, setActionBlock]           = useState<ScheduleBlock | null>(null);
  const [actionType, setActionType]             = useState<'complete' | 'miss'>('complete');

  // Called from HomeDashboard → "Start Session" => opens ActionModal for proof
  const handleStartSession = (block: ScheduleBlock) => {
    setActionBlock(block);
    setActionType('complete');
  };

  // Called from HomeDashboard / ScheduleView → "Mark Missed"
  const handleMarkMissed = (block: ScheduleBlock) => {
    setActionBlock(block);
    setActionType('miss');
  };

  const handleCloseAction = () => setActionBlock(null);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeDashboard
            onStartSession={handleStartSession}
            onMarkMissed={handleMarkMissed}
            onAddSubject={() => setShowSubjectModal(true)}
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
      <div className="flex-1 flex flex-col min-h-screen">
        <TopBar onSettingsClick={() => setShowSettings(s => !s)} />

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
          {renderContent()}
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
