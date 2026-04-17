import React, { useMemo, useState } from 'react';
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
    <main className="max-w-xl mx-auto px-6 pt-8 pb-32 flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-[2.75rem] font-headline font-extrabold text-on-surface -tracking-[0.02em] leading-tight">Analytics</h1>
        <p className="text-base font-body text-on-surface-variant mt-2">Your cognitive performance this week.</p>
      </div>

      {/* Progress Card */}
      <section className="bg-surface-container-lowest rounded-[1rem] p-8 shadow-card flex flex-col gap-6 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-primary-container rounded-full blur-[80px] opacity-20"></div>
        <div className="flex justify-between items-end relative z-10">
          <div>
            <h2 className="text-lg font-headline font-semibold text-on-surface">Weekly Goal</h2>
            <p className="text-xs font-label text-on-surface-variant uppercase tracking-wide mt-1">Completion</p>
          </div>
          <div className="text-[2.75rem] font-headline font-extrabold text-primary -tracking-[0.02em] leading-none">
            {weeklyPct}<span className="text-2xl">%</span>
          </div>
        </div>
        <div className="relative w-full h-4 bg-surface-container-highest rounded-full overflow-hidden z-10">
          <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-secondary to-tertiary-fixed-dim rounded-full transition-all duration-700" style={{ width: `${weeklyPct}%` }}></div>
        </div>
        <p className="text-xs font-body text-on-surface-variant text-right relative z-10">{hoursRemaining.toFixed(1)} hours remaining</p>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 gap-4">
        {/* Total hours — spans full width */}
        <div className="col-span-2 bg-surface-container-low rounded-[1rem] p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-secondary">
            <span className="material-symbols-outlined text-xl">timer</span>
            <span className="text-xs font-label uppercase tracking-wide">Total Focused Time</span>
          </div>
          <div className="text-[2.75rem] font-headline font-extrabold text-on-surface leading-none mt-2">
            {totalH}<span className="text-2xl text-on-surface-variant">h</span> {totalM}<span className="text-2xl text-on-surface-variant">m</span>
          </div>
        </div>

        {/* Sessions */}
        <div className="bg-surface-container-low rounded-[1rem] p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-tertiary">
            <span className="material-symbols-outlined text-xl">task_alt</span>
            <span className="text-xs font-label uppercase tracking-wide">Sessions</span>
          </div>
          <div className="text-2xl font-headline font-semibold text-on-surface mt-2">{sessionsCompleted}</div>
          <p className="text-xs font-body text-tertiary">+{Math.max(0, sessionsCompleted - 3)} this week</p>
        </div>

        {/* Missed */}
        <div className="bg-surface-container-low rounded-[1rem] p-6 flex flex-col gap-2 relative overflow-hidden">
          <div className="flex items-center gap-2 text-error">
            <span className="material-symbols-outlined text-xl">event_busy</span>
            <span className="text-xs font-label uppercase tracking-wide">Missed</span>
          </div>
          <div className="text-2xl font-headline font-semibold text-on-surface mt-2 relative z-10">{missedSessions}</div>
          <div className="absolute bottom-0 right-0 p-4 opacity-10 text-error">
            <span className="material-symbols-outlined text-6xl">warning</span>
          </div>
        </div>
      </section>

      {/* Cognitive Load Chart */}
      <section className="bg-surface-container-lowest rounded-[1rem] p-6 shadow-card">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-headline font-semibold text-on-surface">Cognitive Load</h3>
          <span className="bg-surface-container px-3 py-1 rounded-sm text-xs font-label text-on-surface-variant uppercase tracking-wide">This Week</span>
        </div>
        <div className="h-48 flex items-end justify-between gap-2 mt-4 relative">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none border-t border-b border-outline-variant/15">
            <div className="w-full border-t border-outline-variant/15 border-dashed"></div>
            <div className="w-full border-t border-outline-variant/15 border-dashed"></div>
            <div className="w-full border-t border-outline-variant/15 border-dashed"></div>
          </div>
          {weeklyLoad.map((pct, i) => {
            const isToday = i === (new Date().getDay() + 6) % 7;
            return (
              <div key={i} className="w-full flex flex-col items-center gap-2 z-10">
                <div
                  className={`w-8 rounded-t-sm transition-colors ${isToday ? 'bg-gradient-to-t from-primary to-primary-container shadow-[0_4px_12px_rgba(53,37,205,0.2)]' : 'bg-surface-container-high hover:bg-primary/20'}`}
                  style={{ height: `${Math.max(8, pct)}%` }}
                ></div>
                <span className={`text-xs font-body ${isToday ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>{weekDays[i]}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Subject Mastery */}
      {userProfile?.subjects && userProfile.subjects.length > 0 && (
        <section className="bg-surface-container-low rounded-[1rem] p-6 flex flex-col gap-5">
          <h3 className="text-lg font-headline font-semibold text-on-surface">Subject Mastery</h3>
          {userProfile.subjects.map(subject => {
            const mastery = metrics.masteryBySubject[subject.id] ?? 0;
            return (
              <div key={subject.id} className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {subject.color && (
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.color }}></div>
                    )}
                    <span className="text-sm font-body font-medium text-on-surface">{subject.name}</span>
                  </div>
                  <span className="text-xs font-label text-on-surface-variant">{mastery}%</span>
                </div>
                <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-secondary to-tertiary-fixed-dim"
                    style={{ width: `${mastery}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
};
