import React from 'react';
import { OnboardingChat } from './OnboardingChat';

export const WelcomeScreen: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-surface text-on-surface">
      <header className="p-6 text-center">
        <h1 className="text-3xl font-headline font-extrabold text-primary animate-slideDown">
          StudyOS
        </h1>
        <p className="text-sm font-body text-outline mt-1 animate-slideDown" style={{ animationDelay: '100ms' }}>
          By Sage Intelligence
        </p>
      </header>
      
      <main className="flex-1 w-full max-w-2xl mx-auto flex flex-col p-4">
        <OnboardingChat />
      </main>
    </div>
  );
};
