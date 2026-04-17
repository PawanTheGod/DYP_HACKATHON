import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { ScheduleBlock } from '../types';

interface HomeDashboardProps {
  onStartSession: (block: ScheduleBlock) => void;
  onMarkMissed: (block: ScheduleBlock) => void;
  onAddSubject: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onStartSession,
  onMarkMissed,
  onAddSubject,
}) => {
  const { userProfile, scheduleBlocks, completionLog, calculateMetrics, regenerateSchedule, isLoading } = useAppContext();

  const metrics = useMemo(() => calculateMetrics(), [calculateMetrics]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayBlocks = useMemo(
    () => scheduleBlocks.filter(b => b.date === todayStr).slice(0, 3),
    [scheduleBlocks, todayStr]
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning,' : hour < 17 ? 'Good afternoon,' : 'Good evening,';

  const weeklyTotal = scheduleBlocks.filter(b => {
    const bDate = new Date(b.date);
    const now = new Date();
    const startOfWeek = new Date(now); 
    startOfWeek.setDate(now.getDate() - now.getDay());
    return bDate >= startOfWeek;
  });
  const weeklyCompleted = weeklyTotal.filter(b => b.status === 'completed').length;
  const weeklyPct = weeklyTotal.length > 0 ? Math.round((weeklyCompleted / weeklyTotal.length) * 100) : 0;

  const aiTip = useMemo(() => {
    const subjects = userProfile?.subjects ?? [];
    if (subjects.length === 0) return 'Add subjects and generate your schedule to get personalized AI insights.';
    const hardest = [...subjects].sort((a, b) => b.difficulty - a.difficulty)[0];
    return `Focus on ${hardest.name} first today. It has the highest difficulty rating in your active syllabus.`;
  }, [userProfile]);

  const getStatusColor = (block: ScheduleBlock) => {
    if (block.status === 'completed') return 'bg-tertiary-fixed-dim';
    const sub = userProfile?.subjects.find(s => s.id === block.subjectId);
    const diff = sub?.difficulty ?? 5;
    return diff >= 7 ? 'bg-error-container' : 'bg-tertiary-container';
  };

  const getDiffBadge = (block: ScheduleBlock) => {
    const sub = userProfile?.subjects.find(s => s.id === block.subjectId);
    const diff = sub?.difficulty ?? 5;
    if (diff >= 7) return { label: 'High Diff', bg: 'bg-error-container text-on-error-container' };
    if (diff >= 4) return { label: 'Med Diff', bg: 'bg-[#4f46e5]/10 text-primary' };
    return { label: 'Low Diff', bg: 'bg-tertiary-container text-on-tertiary-fixed-variant' };
  };

  const totalHours = Math.round(metrics.totalHours);
  const activeSubjects = userProfile?.subjects.length ?? 0;

  return (
    <main className="max-w-xl mx-auto px-6 pt-2 pb-32 space-y-8">

      {/* Welcome Area */}
      <section className="space-y-1">
        <h1 className="text-[2.75rem] font-headline font-extrabold tracking-tight text-on-surface leading-tight">{greeting}</h1>
        <h2 className="text-[2.75rem] font-headline font-extrabold tracking-tight text-primary leading-tight">{userProfile?.name || '...'}</h2>
      </section>

      {/* AI Tip Card */}
      <section className="rounded-[1rem] p-5 glass-gradient border border-outline-variant/15 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <span className="material-symbols-outlined text-6xl text-primary">auto_awesome</span>
        </div>
        <div className="flex items-start gap-4 relative z-10">
          <div className="p-2 rounded-full bg-primary-container text-on-primary-container shrink-0 mt-1">
            <span className="material-symbols-outlined text-sm icon-fill">lightbulb</span>
          </div>
          <div>
            <h3 className="text-xs font-label uppercase tracking-wider text-primary mb-1">AI Intelligence</h3>
            <p className="text-sm font-body text-on-surface">{aiTip}</p>
          </div>
        </div>
      </section>

      {/* Bento Grid: Quick Stats */}
      <section className="grid grid-cols-2 gap-4">
        {/* Wide weekly progress card */}
        <div className="col-span-2 bg-surface-container-lowest rounded-[1rem] p-5 shadow-card relative overflow-hidden">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="text-xs font-label uppercase text-on-surface-variant mb-1">Weekly Progress</h3>
              <p className="text-2xl font-headline font-semibold text-on-surface">{weeklyPct}% <span className="text-base font-body text-outline font-normal">completed</span></p>
            </div>
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary">trending_up</span>
            </div>
          </div>
          <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
            <div className="h-full progress-gradient rounded-full transition-all duration-700" style={{ width: `${weeklyPct}%` }}></div>
          </div>
        </div>

        {/* Active Subjects */}
        <div className="bg-surface-container-low rounded-[1rem] p-4 flex flex-col justify-between aspect-square">
          <span className="material-symbols-outlined text-tertiary mb-2">library_books</span>
          <div>
            <p className="text-[2.75rem] font-headline font-extrabold tracking-tight text-on-surface leading-none mb-1">{activeSubjects}</p>
            <p className="text-xs font-label uppercase text-on-surface-variant">Active Subjects</p>
          </div>
        </div>

        {/* Study Hours */}
        <div className="bg-surface-container-low rounded-[1rem] p-4 flex flex-col justify-between aspect-square">
          <span className="material-symbols-outlined text-primary mb-2">timer</span>
          <div>
            <p className="text-[2.75rem] font-headline font-extrabold tracking-tight text-on-surface leading-none mb-1">{totalHours}<span className="text-xl text-outline">h</span></p>
            <p className="text-xs font-label uppercase text-on-surface-variant">Study Hours</p>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="flex gap-3">
        <button
          onClick={regenerateSchedule}
          disabled={isLoading}
          className="flex-1 cta-gradient text-on-primary rounded-full py-4 px-6 flex items-center justify-center gap-2 font-body font-medium transition-transform active:scale-95 shadow-cta disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-sm">auto_awesome</span>
          {isLoading ? 'Generating...' : 'Generate Schedule'}
        </button>
        <button
          onClick={onAddSubject}
          className="bg-surface-container-highest text-on-surface rounded-full py-4 px-6 flex items-center justify-center gap-2 font-body font-medium transition-transform active:scale-95"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Subject
        </button>
      </section>

      {/* Today's Plan */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-headline font-semibold text-on-surface">Today's Plan</h3>
          <button className="text-primary text-sm font-body font-medium hover:underline">View All</button>
        </div>

        <div className="space-y-3">
          {todayBlocks.length === 0 && (
            <div className="bg-surface-container-low rounded-[1rem] p-6 text-center">
              <span className="material-symbols-outlined text-4xl text-outline mb-2 block">event_available</span>
              <p className="text-sm font-body text-on-surface-variant">No sessions scheduled for today.</p>
              <p className="text-xs font-body text-outline mt-1">Generate your schedule to get started.</p>
            </div>
          )}

          {todayBlocks.map(block => {
            const isComplete = block.status === 'completed';
            const badge = getDiffBadge(block);
            const colorBar = getStatusColor(block);

            if (isComplete) {
              return (
                <div key={block.id} className="bg-surface-container-low rounded-[1rem] p-4 opacity-75 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-tertiary-fixed-dim text-on-tertiary-fixed flex items-center justify-center">
                      <span className="material-symbols-outlined text-lg icon-fill">check</span>
                    </div>
                    <div>
                      <h4 className="text-base font-headline font-semibold text-on-surface line-through decoration-outline">{block.subject}</h4>
                      <p className="text-sm font-body text-outline">Completed</p>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={block.id} className="bg-surface-container-lowest rounded-[1rem] p-4 shadow-card-sm flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-10 ${colorBar} rounded-full`}></div>
                    <div>
                      <h4 className="text-base font-headline font-semibold text-on-surface">{block.subject}</h4>
                      <p className="text-sm font-body text-outline flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">schedule</span>
                        {block.startTime} • {Math.round((new Date(`1970-01-01T${block.endTime}`).getTime() - new Date(`1970-01-01T${block.startTime}`).getTime()) / 60000)} mins
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-label uppercase tracking-wider rounded-sm ${badge.bg}`}>{badge.label}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onMarkMissed(block)}
                    className="flex-1 bg-surface-container py-2 rounded-full text-sm font-body font-medium text-on-surface hover:bg-surface-container-high transition-colors"
                  >
                    Mark Missed
                  </button>
                  <button
                    onClick={() => onStartSession(block)}
                    className="flex-1 bg-primary text-on-primary py-2 rounded-full text-sm font-body font-medium hover:opacity-90 transition-opacity"
                  >
                    Start Session
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
};
