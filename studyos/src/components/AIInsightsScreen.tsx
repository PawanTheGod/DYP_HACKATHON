import React, { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { generateAIInsights, BehavioralInsights } from '../lib/insightsGenerator';

export const AIInsightsScreen: React.FC = () => {
  const { userProfile, scheduleBlocks, completionLog } = useAppContext();
  
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [insights, setInsights] = useState<BehavioralInsights | null>(null);

  useEffect(() => {
    async function fetchInsights() {
      if (!userProfile) return;
      setIsAnalyzing(true);
      try {
        const result = await generateAIInsights(userProfile, scheduleBlocks, completionLog);
        setInsights(result);
      } catch (err) {
        console.error('Insights error:', err);
      } finally {
        setIsAnalyzing(false);
      }
    }
    fetchInsights();
  }, [userProfile, scheduleBlocks.length, completionLog.length]);

  // Find peak productivity window based on energyPeak
  const peakTime = useMemo(() => {
    const peak = userProfile?.energyPeak ?? 'morning';
    if (peak === 'morning') return '9:00 AM and 12:00 PM';
    if (peak === 'afternoon') return '1:00 PM and 4:00 PM';
    return '7:00 PM and 10:00 PM';
  }, [userProfile]);

  const hardestSubject = useMemo(() => {
    const subjects = userProfile?.subjects ?? [];
    if (subjects.length === 0) return null;
    return [...subjects].sort((a, b) => b.difficulty - a.difficulty)[0];
  }, [userProfile]);

  const lowEnergyBlock = useMemo(() => {
    const peak = userProfile?.energyPeak ?? 'morning';
    const offPeak = peak === 'morning' ? '15:00' : '09:00';
    return scheduleBlocks.find(b => b.startTime?.startsWith(offPeak.slice(0,2)));
  }, [scheduleBlocks, userProfile]);

  const hasData = !!userProfile;

  return (
    <main className="flex-1 w-full max-w-xl mx-auto px-6 py-6 pb-32 flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="font-headline text-[3.5rem] font-extrabold tracking-[-0.02em] leading-tight text-on-surface">Intelligence</h1>
        <p className="font-body text-base text-on-surface-variant leading-[1.6]">
          Your cognitive sanctuary is active. Let's optimize your focus.
        </p>
      </div>

      {/* AI Analyzing / Insights Card */}
      <section className="bg-surface-container-low rounded-[1rem] p-6 relative overflow-hidden group min-h-[160px] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-50"></div>
        <div className="relative z-10 flex flex-col gap-4 w-full">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isAnalyzing ? 'bg-primary-container text-on-primary-container animate-pulse' : 'bg-primary text-on-primary'}`}>
              <span className="material-symbols-outlined text-sm">{isAnalyzing ? 'auto_awesome' : 'info'}</span>
            </div>
            <h3 className="font-body text-xl font-medium text-on-surface">
              {isAnalyzing ? 'AI is analyzing your study behavior...' : 'Sage\'s Cognitive Analysis'}
            </h3>
          </div>
          
          {isAnalyzing ? (
            <div className="space-y-3 mt-2">
              <div className="h-4 rounded bg-surface-container-highest w-3/4 ai-shimmer"></div>
              <div className="h-4 rounded bg-surface-container-highest w-full ai-shimmer"></div>
              <div className="h-4 rounded bg-surface-container-highest w-5/6 ai-shimmer"></div>
            </div>
          ) : (
            <div className="animate-fade-in space-y-4">
              <p className="font-body text-sm text-on-surface leading-relaxed italic">
                &ldquo;{insights?.summary}&rdquo;
              </p>
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                <div className="flex items-center gap-2 mb-1">
                   <span className="material-symbols-outlined text-primary text-xs">tips_and_updates</span>
                   <span className="font-label text-[10px] font-bold uppercase tracking-widest text-primary">Pro Tip</span>
                </div>
                <p className="font-body text-xs text-on-surface-variant leading-relaxed">
                  {insights?.smartTip}
                </p>
              </div>
              <p className="font-body text-[10px] uppercase tracking-tighter text-outline-variant font-bold text-center">
                {insights?.encouragement}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Insights Bento Grid */}
      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Schedule Analysis Card */}
          <section className="bg-surface-container-lowest rounded-[1rem] p-6 shadow-card flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary icon-fill">calendar_month</span>
              <h3 className="font-body text-xl font-medium text-on-surface">Schedule Analysis</h3>
            </div>
            <p className="font-body text-base text-on-surface-variant leading-[1.6]">
              You are most productive between{' '}
              <span className="font-medium text-on-surface">{peakTime}</span>.
              Consider moving high-cognitive tasks to this window.
            </p>
            <div className="mt-auto pt-4 flex gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-sm bg-tertiary-container text-on-tertiary-fixed-variant font-label text-xs uppercase tracking-wide">
                Optimal Focus
              </span>
            </div>
          </section>

          {/* Rescheduling Advice Card */}
          <section className="bg-surface-container-lowest rounded-[1rem] p-6 shadow-card flex flex-col gap-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary">swap_calls</span>
                <h3 className="font-body text-xl font-medium text-on-surface">Reschedule Advice</h3>
              </div>
              <span className="material-symbols-outlined text-outline-variant">info</span>
            </div>
            {hardestSubject ? (
              <p className="font-body text-base text-on-surface-variant leading-[1.6]">
                Your &quot;{hardestSubject.name}&quot; session is your most difficult subject.
                Schedule it during your {userProfile?.energyPeak} energy window for best results.
              </p>
            ) : (
              <p className="font-body text-base text-on-surface-variant leading-[1.6]">
                Add your subjects and their difficulty ratings to get rescheduling recommendations.
              </p>
            )}
            {lowEnergyBlock && (
              <button className="mt-auto w-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-body font-medium py-4 px-8 rounded-full shadow-[0_8px_24px_rgba(53,37,205,0.2)] hover:scale-[0.98] transition-transform">
                Move to Peak Hours
              </button>
            )}
          </section>
        </div>
      )}

      {/* Cognitive Optimizations */}
      <section className="bg-surface-container-low rounded-[1rem] p-8 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-secondary/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-tertiary-fixed-dim">psychology</span>
            <h3 className="font-headline text-[1.75rem] font-semibold text-on-surface">Cognitive Optimizations</h3>
          </div>
          <ul className="flex flex-col gap-4">
            <li className="flex items-start gap-4 p-4 rounded-[1rem] bg-surface-container-lowest transition-colors hover:bg-surface-container-highest">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-sm">timer</span>
              </div>
              <div>
                <h4 className="font-body font-medium text-on-surface mb-1">Micro-Breaks Recommended</h4>
                <p className="font-body text-sm text-on-surface-variant leading-[1.6]">
                  Insert 5-minute cognitive resets every 45 minutes to maintain peak retention during long sessions.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4 p-4 rounded-[1rem] bg-surface-container-lowest transition-colors hover:bg-surface-container-highest">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-secondary text-sm">menu_book</span>
              </div>
              <div>
                <h4 className="font-body font-medium text-on-surface mb-1">Subject Alternation</h4>
                <p className="font-body text-sm text-on-surface-variant leading-[1.6]">
                  Switching between analytical and creative tasks reduces cognitive fatigue significantly.
                </p>
              </div>
            </li>
            {userProfile?.energyPeak && (
              <li className="flex items-start gap-4 p-4 rounded-[1rem] bg-surface-container-lowest transition-colors hover:bg-surface-container-highest">
                <div className="w-10 h-10 rounded-full bg-tertiary-fixed-dim/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-tertiary text-sm">bolt</span>
                </div>
                <div>
                  <h4 className="font-body font-medium text-on-surface mb-1">Energy-Matched Scheduling</h4>
                  <p className="font-body text-sm text-on-surface-variant leading-[1.6]">
                    Your peak window is <strong>{userProfile.energyPeak}</strong>. Hardest subjects should be tackled then — your brain is 40% more retentive.
                  </p>
                </div>
              </li>
            )}
          </ul>
        </div>
      </section>
    </main>
  );
};
