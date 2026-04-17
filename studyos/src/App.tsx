import React, { useEffect } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Dashboard } from './components/Dashboard';

import './styles/globals.css';
import './styles/animations.css';
import './styles/responsive.css';

const AppContent: React.FC = () => {
  const { isOnboardingComplete, isLoading, userProfile } = useAppContext();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-medium">StudyOS is loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {userProfile ? (
        <Dashboard />
      ) : (
        <WelcomeScreen />
      )}
    </div>
  );
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
