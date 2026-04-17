import React, { useEffect, useState } from 'react';
import { LucideBookOpen } from 'lucide-react';

export const SplashScreen: React.FC = () => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length < 3 ? prev + '.' : ''));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-surface">
      <div className="relative">
        <div className="w-24 h-24 bg-on-surface rounded-[2rem] flex items-center justify-center shadow-2xl shadow-on-surface/40 animate-pulse">
          <LucideBookOpen className="text-surface w-12 h-12" />
        </div>
        
        {/* Decorative rings */}
        <div className="absolute inset-0 border-2 border-primary/20 rounded-[2rem] animate-ping scale-150 opacity-20" style={{ animationDuration: '3s' }}></div>
        <div className="absolute inset-0 border-2 border-primary/10 rounded-[2rem] animate-ping scale-[2] opacity-10" style={{ animationDuration: '4s' }}></div>
      </div>
      
      <div className="mt-12 flex flex-col items-center gap-2">
        <h1 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">StudyOS</h1>
        <p className="text-outline font-medium flex items-center min-w-[120px]">
          Initializing Sage{dots}
        </p>
      </div>

      {/* Modern thin progress bar at bottom */}
      <div className="absolute bottom-12 w-48 h-1 bg-surface-container-highest rounded-full overflow-hidden">
        <div className="h-full bg-primary animate-shimmer" style={{ width: '100%', animationDuration: '1.5s' }}></div>
      </div>
    </div>
  );
};
