import React from 'react';
import { Button } from './ui/Button';

// TODO: Person 4 - Implement high-impact welcome screen with animations
export const WelcomeScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <h1 className="text-4xl font-bold text-slate-900 mb-6 animate-slideUp">Welcome to StudyOS</h1>
      <p className="max-w-md text-slate-600 mb-10 animate-slideUp" style={{ animationDelay: '100ms' }}>
        Your personal AI study companion that adapts to your energy, pace, and lifestyle.
      </p>
      <Button className="animate-slideUp" style={{ animationDelay: '200ms' }}>
        Get Started
      </Button>
    </div>
  );
};
