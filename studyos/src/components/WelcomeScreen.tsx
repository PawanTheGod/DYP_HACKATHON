import React from 'react';
import { OnboardingChat } from './OnboardingChat';

export const WelcomeScreen: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-surface text-on-surface">
      <header className="px-6 pt-12 pb-8 text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-on-surface/5 border border-on-surface/10 rounded-full mb-4 animate-fade-in">
          <span className="material-symbols-outlined text-sm text-on-surface icon-fill">verified_user</span>
          <span className="text-[10px] font-label font-bold text-on-surface uppercase tracking-widest">Authentication Verified</span>
        </div>
        <h1 className="text-4xl font-headline font-black text-on-surface tracking-tight animate-slideDown">
          Initialize <span className="italic">Sage</span>
        </h1>
        <p className="text-base font-body text-on-surface-variant max-w-sm mx-auto animate-slideDown" style={{ animationDelay: '100ms' }}>
          Let's orchestrate your cognitive profile to build the perfect study environment.
        </p>
      </header>
      
      <main className="flex-1 w-full max-w-2xl mx-auto flex flex-col p-4">
        <OnboardingChat />
      </main>
    </div>
  );
};
