import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';

export const AnalyticsScreen: React.FC = () => {
  const { scheduleBlocks, completionLog, calculateMetrics, userProfile } = useAppContext();
  const metrics = useMemo(() => calculateMetrics(), [calculateMetrics]);

  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const today = new Date().getDay(); // 0 = Sun
  const weeklyLoad = weekDays.map((_, i) => {
    const dayIdx = (i + 1) % 7; // Mon=1...Sun=0
    const count = scheduleBlocks.filter(b => new Date(b.date).getDay() === dayIdx).length;
    return Math.min(100, count * 15); // Normalise to %
  });

  const sessionsCompleted = completionLog.length;
  const missedSessions = scheduleBlocks.filter(b => b.status === 'missed').length;
  const totalH = Math.floor(metrics.totalHours);
  const totalM = Math.round((metrics.totalHours - totalH) * 60);
  
  const weeklyTotal = scheduleBlocks.filter(b => {
    const bDate = new Date(b.date);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    return bDate >= startOfWeek;
  });
  const weeklyCompleted = weeklyTotal.filter(b => b.status === 'completed').length;
  const weeklyPct = weeklyTotal.length > 0 ? Math.round((weeklyCompleted / weeklyTotal.length) * 100) : 0;
  const hoursRemaining = Math.max(0, (userProfile?.availableHours?.weekday ?? 4) * 5 - metrics.totalHours);

  return (
    <main className="max-w-2xl mx-auto px-6 pt-12 pb-32 flex flex-col gap-10">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-5xl font-headline font-black text-on-surface tracking-tight leading-none">
          Neural Metrics
        </h1>
        <p className="text-lg font-body text-on-surface-variant font-medium">
          Quantifying your cognitive evolution over time.
        </p>
      </div>

      {/* Primary Goal Bento */}
      <section className="bg-white rounded-[2.5rem] p-10 shadow-card border border-outline-variant/10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary bg-primary/10 px-4 py-1.5 rounded-full self-start">
              Performance Goal
            </span>
            <h2 className="text-3xl font-headline font-bold text-on-surface">Weekly Synthesis</h2>
            <p className="font-body text-on-surface-variant leading-relaxed max-w-xs pt-1">
              You've achieved <span className="text-primary font-bold">{weeklyPct}%</span> of your optimal output this week.
            </p>
          </div>
          
          <div className="relative">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-surface-container-highest" />
              <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={364.4} strokeDashoffset={364.4 - (364.4 * weeklyPct) / 100} strokeLinecap="round" className="text-primary transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-headline font-black text-2xl">
              {weeklyPct}%
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-outline-variant/10 flex justify-between items-center relative z-10">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-outline">Remaining Time</span>
            <span className="text-xl font-headline font-bold text-on-surface">{hoursRemaining.toFixed(1)}h</span>
          </div>
          <button className="px-6 py-3 rounded-2xl bg-surface-container-low text-on-surface font-headline font-bold text-sm hover:bg-surface-container transition-colors">
            Optimize Flow
          </button>
        </div>
      </section>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-surface-container-lowest rounded-[2rem] p-8 shadow-card border border-outline-variant/10 flex flex-col gap-4">
          <div className="flex items-center gap-3 text-secondary">
            <span className="material-symbols-outlined text-2xl">hourglass_empty</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Total Deep Work</span>
          </div>
          <div className="text-5xl font-headline font-black text-on-surface group">
            {totalH}<span className="text-2xl text-on-surface-variant font-medium ml-1">h</span> {totalM}<span className="text-2xl text-on-surface-variant font-medium ml-1">m</span>
          </div>
          <div className="mt-auto pt-4 border-t border-outline-variant/10">
            <p className="text-xs font-body text-on-surface-variant">
              Increasing by <span className="text-secondary font-bold">12%</span> compared to last epoch.
            </p>
          </div>
        </div>

        <div className="bg-primary text-white rounded-[2rem] p-8 shadow-xl shadow-primary/20 flex flex-col gap-4 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-20">
              <span className="material-symbols-outlined text-6xl">verified</span>
           </div>
           <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Sessions</span>
           <div className="text-6xl font-headline font-black leading-none">{sessionsCompleted}</div>
           <p className="text-xs font-medium opacity-80 mt-auto">Completed milestones</p>
        </div>
      </div>

      {/* Cognitive Load Bento */}
      <section className="bg-white rounded-[2.5rem] p-10 shadow-card border border-outline-variant/10">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h3 className="text-2xl font-headline font-bold text-on-surface">Cognitive Load</h3>
            <p className="text-sm font-body text-on-surface-variant mt-1">Energy expenditure across the week.</p>
          </div>
          <span className="px-4 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-[0.15em]">
            This Week
          </span>
        </div>

        <div className="h-48 flex items-end justify-between gap-4 mt-4 relative pt-4">
          {/* Horizontal Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 translate-y-4">
            <div className="w-full border-t border-outline-variant/10 border-dashed"></div>
            <div className="w-full border-t border-outline-variant/10 border-dashed"></div>
            <div className="w-full border-t border-outline-variant/10 border-dashed"></div>
          </div>
          
          {weeklyLoad.map((pct, i) => {
            const isToday = i === (new Date().getDay() + 6) % 7;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-4 z-10 group/bar">
                <div
                  className={`w-full max-w-[40px] rounded-2xl transition-all duration-500 relative ${isToday ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-surface-container-highest hover:bg-primary/30'}`}
                  style={{ height: `${Math.max(12, pct)}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-on-surface text-surface px-2 py-1 rounded text-[10px] font-bold">
                    {Math.round(pct)}%
                  </div>
                </div>
                <span className={`text-[11px] font-bold uppercase tracking-widest ${isToday ? 'text-primary' : 'text-on-surface-variant/60'}`}>{weekDays[i]}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Subject Mastery Bento */}
      {userProfile?.subjects && userProfile.subjects.length > 0 && (
        <section className="bg-surface-container-low rounded-[2.5rem] p-10 border border-outline-variant/5">
          <div className="flex items-center gap-3 mb-8">
            <span className="material-symbols-outlined text-primary">psychology</span>
            <h3 className="text-2xl font-headline font-bold text-on-surface">Subject Mastery</h3>
          </div>
          
          <div className="flex flex-col gap-6">
            {userProfile.subjects.map(subject => {
              const mastery = metrics.masteryBySubject[subject.id] ?? 0;
              return (
                <div key={subject.id} className="bg-white/50 backdrop-blur-sm p-6 rounded-[2rem] border border-white/40 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: subject.color }}></div>
                      <span className="text-lg font-headline font-bold text-on-surface">{subject.name}</span>
                    </div>
                    <span className="text-sm font-headline font-black text-primary">{mastery}%</span>
                  </div>
                  <div className="w-full h-3 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out bg-primary"
                      style={{ width: `${mastery}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
};

