import React, { useState } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Dashboard } from './components/Dashboard';
import { LandingPage } from './components/LandingPage';
import { AuthScreen } from './components/AuthScreen';

import './styles/globals.css';
import './styles/animations.css';
import './styles/responsive.css';
import { SplashScreen } from './components/SplashScreen';

const AppContent: React.FC = () => {
  const { isOnboardingComplete, isLoading, userProfile } = useAppContext();
  const [currentView, setCurrentView] = useState<'landing' | 'auth' | 'main' | null>(null);

  // Initial redirect once loading is done with a minimum splash time
  React.useEffect(() => {
    if (!isLoading && currentView === null) {
      const timer = setTimeout(() => {
        setCurrentView('landing');
      }, 2000); // Ensure splash is seen for at least 2s
      return () => clearTimeout(timer);
    }
  }, [isLoading, currentView]);


  if (isLoading || currentView === null) {
    return <SplashScreen />;
  }

  // If we are in the 'main' view, show Onboarding if needed, otherwise Dashboard
  if (currentView === 'main') {
    if (!isOnboardingComplete) {
      return <WelcomeScreen />;
    }
    return (
      <div className="min-h-screen bg-surface">
        <Dashboard />
      </div>
    );
  }

  // Handle Landing and Auth views
  switch (currentView) {
    case 'landing':
      return (
        <LandingPage 
          isLoggedIn={!!userProfile}
          onGetStarted={() => setCurrentView(userProfile ? 'main' : 'auth')} 
          onLogin={() => setCurrentView('auth')} 
        />
      );
    case 'auth':
      return (
        <AuthScreen 
          onBack={() => setCurrentView('landing')} 
          onAuthSuccess={() => setCurrentView('main')} 
        />
      );
    default:
      return <LandingPage isLoggedIn={!!userProfile} onGetStarted={() => setCurrentView('auth')} onLogin={() => setCurrentView('auth')} />;
  }
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

