import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { ScheduleBlock } from '../types';

interface HomeDashboardProps {
  onStartSession: (block: ScheduleBlock) => void;
  onMarkMissed: (block: ScheduleBlock) => void;
  onAddSubject: () => void;
  onStartOnboarding?: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onStartSession,
  onMarkMissed,
  onAddSubject,
  onStartOnboarding,
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
    <main className="max-w-xl mx-auto px-6 pt-2 pb-32 space-y-8 animate-slide-up">
      {/* Onboarding Alert for Home */}
      {!userProfile?.subjects?.length && (
        <section className="cta-gradient px-8 py-10 rounded-[2.5rem] text-on-primary shadow-2xl shadow-primary/25 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-20 -rotate-12 translate-x-4 -translate-y-4">
            <span className="material-symbols-outlined text-[8rem] icon-fill">auto_awesome</span>
          </div>
          <div className="relative z-10 space-y-6">
            <div className="space-y-2">
              <h3 className="text-3xl font-headline font-black leading-tight bg-clip-text text-white">Your Sage Intelligence is dormant.</h3>
              <p className="font-body text-on-primary/80 text-base leading-relaxed max-w-[85%]">
                Onboarding is essential for schedule generation. Talk to Sage to initialize your cognitive profile and unlock AI-powered study sessions.
              </p>
            </div>
            <button 
              onClick={onStartOnboarding}
              className="btn-primary"
            >
              Start Onboarding Now
              <span className="material-symbols-outlined text-lg group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>
        </section>
      )}

      {/* Welcome Area */}

      <section className="flex items-end justify-between">
        <div className="space-y-1">
          <p className="text-sm font-label uppercase tracking-widest text-outline ml-1">{greeting}</p>
          <h1 className="text-4xl font-headline font-extrabold tracking-tight text-on-surface leading-tight">
            {userProfile?.name?.split(' ')[0] || 'Explorer'}
          </h1>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-surface-container-high border-2 border-white flex items-center justify-center shadow-sm overflow-hidden">
           <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile?.name || 'StudyOS'}`} alt="avatar" className="w-full h-full object-cover" />
        </div>
      </section>

      {/* AI Intelligence Card */}
      <section className="rounded-[2rem] p-6 glass-gradient border border-primary/10 relative overflow-hidden group hover:border-primary/20 transition-all duration-500">
        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
          <span className="material-symbols-outlined text-7xl text-primary animate-pulse">auto_awesome</span>
        </div>
        <div className="flex items-start gap-5 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined icon-fill">bolt</span>
          </div>
          <div className="flex-1">
            <h3 className="text-xs font-label uppercase tracking-widest text-primary font-bold mb-1">Sage Intelligence</h3>
            <p className="text-base font-body text-on-surface leading-snug">{aiTip}</p>
          </div>
        </div>
      </section>

      {/* Bento Grid: Performance Metrics */}
      <section className="grid grid-cols-6 gap-4">
        {/* Weekly Progress (4 cols) */}
        <div className="col-span-4 bg-white rounded-[2rem] p-6 shadow-card border border-outline-variant/5 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-body text-outline mb-1">Weekly Performance</p>
              <h3 className="text-3xl font-headline font-extrabold text-on-surface">{weeklyPct}%</h3>
            </div>
            <div className="bg-tertiary-fixed-dim/20 px-2 py-1 rounded-lg">
               <span className="text-xs font-bold text-on-tertiary-fixed-variant">Best Pace</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full progress-gradient rounded-full transition-all duration-1000" style={{ width: `${weeklyPct}%` }}></div>
            </div>
            <p className="text-[10px] font-label uppercase tracking-wider text-outline text-right">Target 90% completion</p>
          </div>
        </div>

        {/* Active Subjects Stat (2 cols) */}
        <div className="col-span-2 bg-surface-container-low rounded-[2rem] p-6 border border-outline-variant/10 flex flex-col items-center justify-center gap-2">
           <span className="text-4xl font-headline font-extrabold text-secondary">{activeSubjects}</span>
           <p className="text-[10px] font-label uppercase tracking-tight text-outline text-center">Active<br/>Subjects</p>
        </div>

        {/* Study Hours (3 cols) */}
        <div className="col-span-3 bg-primary/5 rounded-[2rem] p-6 border border-primary/10 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined">timer</span>
          </div>
          <div>
             <p className="text-2xl font-headline font-extrabold text-on-surface leading-tight">{totalHours}h</p>
             <p className="text-xs font-body text-outline">Total Time</p>
          </div>
        </div>

        {/* Streak or Motivation (3 cols) */}
        <div className="col-span-3 bg-secondary/5 rounded-[2rem] p-6 border border-secondary/10 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
            <span className="material-symbols-outlined icon-fill">workspace_premium</span>
          </div>
          <div>
             <p className="text-2xl font-headline font-extrabold text-on-surface leading-tight">{Math.floor(weeklyCompleted / 2)} <span className="text-sm font-normal text-outline">pts</span></p>
             <p className="text-xs font-body text-outline">Sage Points</p>
          </div>
        </div>
      </section>

      {/* Main Actions */}
      <section className="space-y-4">
        <button
          onClick={regenerateSchedule}
          disabled={isLoading}
          className="btn-primary w-full py-5 text-lg"
        >
          {isLoading ? (
             <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <span className="material-symbols-outlined icon-fill">auto_awesome</span>
              Generate Daily Schedule
            </>
          )}
        </button>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onAddSubject}
            className="btn-outline"
          >
            <span className="material-symbols-outlined text-primary">menu_book</span>
            Manage Syllabus
          </button>
          <button
            className="btn-outline"
          >
            <span className="material-symbols-outlined text-secondary">analytics</span>
            History
          </button>
        </div>
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
                    className="flex-1 bg-surface-container py-2.5 rounded-full text-sm font-body font-bold text-on-surface hover:bg-surface-container-high active:scale-95 transition-all"
                  >
                    Mark Missed
                  </button>
                  <button
                    onClick={() => onStartSession(block)}
                    className="flex-1 btn-primary py-2.5 rounded-full text-sm font-body font-bold"
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
