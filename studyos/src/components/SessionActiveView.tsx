import React, { useState, useEffect } from 'react';
import { ScheduleBlock } from '../types';
import { ChatWithSage } from './ChatWithSage';

interface SessionActiveViewProps {
  block: ScheduleBlock;
  onEndFlow: (completed: boolean) => void;
}

export const SessionActiveView: React.FC<SessionActiveViewProps> = ({ block, onEndFlow }) => {
  // Calculate default duration in seconds
  const getInitialSeconds = () => {
    try {
      const [sh, sm] = block.startTime.split(':').map(Number);
      const [eh, em] = block.endTime.split(':').map(Number);
      const durationMins = (eh * 60 + em) - (sh * 60 + sm);
      return Math.max(durationMins * 60, 60); // Min 1 min for safety
    } catch (e) {
      return 1500; // 25 mins fallback
    }
  };

  const [timeLeft, setTimeLeft] = useState(getInitialSeconds());
  const [isActive, setIsActive] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // Auto-trigger completion flow when timer hits zero
      onEndFlow(true);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, onEndFlow]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (timeLeft / getInitialSeconds()) * 100;

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] p-12 bg-white rounded-[3rem] shadow-card border border-outline-variant/10 relative overflow-hidden animate-fade-in">
      {/* Dynamic Background Pulse */}
      <div className={`absolute inset-0 bg-primary/[0.03] transition-opacity duration-[2000ms] ${isActive ? 'opacity-100' : 'opacity-0'}`}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center text-center gap-12 w-full">
        {/* Session Status */}
        <div className="flex flex-col items-center gap-4">
          <div className="px-5 py-2 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">
             Neural Synapse Active
          </div>
          <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-on-surface tracking-tight">
            {block.subject}
          </h2>
          <p className="text-lg font-body text-on-surface-variant max-w-sm">
            Maintaining focus on <span className="text-primary font-bold">{block.topic}</span>
          </p>
        </div>

        {/* Timer Module */}
        <div className="relative group">
           <div className="absolute inset-x-0 inset-y-0 -m-8 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
           
           {/* Circular SVG Progress (Simplified) */}
           <svg className="absolute inset-0 -rotate-90 w-full h-full scale-[2.2] opacity-10 pointer-events-none" viewBox="0 0 100 100">
             <circle 
               cx="50" cy="50" r="45" 
               fill="none" stroke="currentColor" strokeWidth="2"
               strokeDasharray="283"
               strokeDashoffset={283 - (283 * progress) / 100}
               className="text-primary"
             />
           </svg>

           <div className="text-[120px] md:text-[160px] font-headline font-black text-on-surface tracking-tighter leading-none relative">
             {formatTime(timeLeft)}
           </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-6 w-full max-w-xs">
          <div className="flex gap-4">
            <button 
              onClick={() => setIsActive(!isActive)}
              className={`flex-1 flex flex-col items-center justify-center p-6 rounded-[2rem] transition-all
                ${isActive 
                  ? 'bg-surface-container-low text-on-surface hover:bg-surface-container' 
                  : 'bg-primary text-white shadow-xl shadow-primary/20 scale-105'
                }`}
            >
              <span className="material-symbols-outlined text-2xl mb-1">
                {isActive ? 'pause_circle' : 'play_circle'}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest">{isActive ? 'Pause' : 'Resume'}</span>
            </button>

            <button 
              onClick={() => onEndFlow(false)}
              className="flex-1 flex flex-col items-center justify-center p-6 rounded-[2rem] bg-error/10 text-error hover:bg-error hover:text-white transition-all group"
            >
              <span className="material-symbols-outlined text-2xl mb-1 group-hover:rotate-90 transition-transform">close</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-inherit">End Flow</span>
            </button>
          </div>

          <button 
            onClick={() => setShowHelp(true)}
            className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-all group"
          >
            <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">sos</span>
            <span className="text-xs font-bold uppercase tracking-widest">I Need Help</span>
          </button>

          <p className="text-[10px] font-bold text-outline uppercase tracking-[0.15em]">
            Neural monitoring integrated with Sage Intelligence
          </p>
        </div>
      </div>

      {showHelp && (
        <div className="fixed inset-0 z-[100] bg-on-surface/40 backdrop-blur-md flex items-end md:items-center justify-center animate-fade-in p-0 md:p-6" onClick={() => setShowHelp(false)}>
          <div className="bg-white w-full max-w-lg h-[80vh] md:h-[600px] md:rounded-[2.5rem] shadow-2xl relative overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <ChatWithSage onClose={() => setShowHelp(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

