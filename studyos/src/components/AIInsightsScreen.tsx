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
    <main className="flex-1 w-full max-w-xl mx-auto px-6 py-6 pb-32 flex flex-col gap-8 animate-slide-up">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-sm font-label uppercase tracking-widest text-outline ml-1">Sage Analysis</p>
        <h1 className="text-4xl font-headline font-extrabold tracking-tight text-on-surface leading-tight">
          Optimization
        </h1>
      </div>

      {/* AI Analyzing / Insights Card - Resolved Merge: AI Logic + Friend's UI style */}
      <section className="bg-white rounded-[2rem] p-8 relative overflow-hidden group shadow-card border border-outline-variant/10 min-h-[160px] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-50"></div>
        <div className="relative z-10 flex flex-col gap-5 w-full">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${isAnalyzing ? 'bg-primary text-white animate-pulse shadow-primary/20' : 'bg-primary/10 text-primary shadow-none'}`}>
              <span className="material-symbols-outlined icon-fill">{isAnalyzing ? 'auto_awesome' : 'psychology'}</span>
            </div>
            <div>
              <h3 className="text-lg font-headline font-bold text-on-surface leading-none mb-1">
                {isAnalyzing ? 'Sage is analyzing...' : 'Sage\'s Cognitive Analysis'}
              </h3>
              <p className="text-xs font-body text-outline uppercase tracking-wider">
                {isAnalyzing ? 'Syncing behavior patterns' : 'Intelligence report active'}
              </p>
            </div>
          </div>
          
          {isAnalyzing ? (
            <div className="space-y-3 mt-2">
              <div className="h-3 rounded-full bg-surface-container-high w-3/4 ai-shimmer"></div>
              <div className="h-3 rounded-full bg-surface-container-high w-full ai-shimmer"></div>
              <div className="h-3 rounded-full bg-surface-container-high w-5/6 ai-shimmer"></div>
            </div>
          ) : (
            <div className="animate-fade-in space-y-4">
              <p className="font-body text-sm text-on-surface leading-relaxed italic border-l-4 border-primary/20 pl-4 py-1">
                &ldquo;{insights?.summary}&rdquo;
              </p>
              <div className="p-4 bg-primary/5 rounded-[1.5rem] border border-primary/10">
                <div className="flex items-center gap-2 mb-2">
                   <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-xs">tips_and_updates</span>
                   </div>
                   <span className="font-label text-[10px] font-bold uppercase tracking-widest text-primary">Pro Optimization Tip</span>
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
          <section className="bg-white rounded-[2rem] p-8 shadow-card border border-outline-variant/5 flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-tertiary-container text-on-tertiary-fixed flex items-center justify-center">
                <span className="material-symbols-outlined icon-fill">calendar_clock</span>
              </div>
              <h3 className="text-lg font-headline font-bold text-on-surface">Focus Window</h3>
            </div>
            <p className="font-body text-base text-on-surface-variant leading-relaxed">
              Your productivity peaks between <span className="font-bold text-primary">{peakTime}</span>. Move your heavy logic sessions here.
            </p>
            <div className="mt-auto">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-tertiary/10 text-tertiary font-label text-[10px] uppercase tracking-widest font-bold">
                Dynamic Optimization
              </span>
            </div>
          </section>

          {/* Rescheduling Advice Card */}
          <section className="bg-white rounded-[2rem] p-8 shadow-card border border-outline-variant/5 flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                   <span className="material-symbols-outlined">swap_vert</span>
                </div>
                <h3 className="text-lg font-headline font-bold text-on-surface">Advice</h3>
              </div>
            </div>
            {hardestSubject ? (
              <p className="font-body text-base text-on-surface-variant leading-relaxed">
                <span className="font-bold text-secondary">{hardestSubject.name}</span> is currently your high-difficulty priority. Tackle it in your morning burst.
              </p>
            ) : (
              <p className="font-body text-base text-outline leading-relaxed italic">
                Add subjects to receive custom rescheduling intelligence.
              </p>
            )}
            {lowEnergyBlock && (
              <button className="mt-auto w-full cta-gradient text-on-primary font-headline font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[0.98] transition-all">
                Re-align to Peak
              </button>
            )}
          </section>
        </div>
      )}

      {/* Cognitive Optimizations */}
      <section className="bg-surface-container-low rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden border border-outline-variant/20">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-secondary/5 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-tertiary-container text-on-tertiary-fixed flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined icon-fill">psychology</span>
            </div>
            <h3 className="text-2xl font-headline font-extrabold text-on-surface">Cognitive Optimizations</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="group p-6 rounded-[2rem] bg-white border border-outline-variant/10 transition-all hover:border-primary/20 hover:shadow-card-sm flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-base">timer</span>
              </div>
              <div>
                <h4 className="font-headline font-bold text-on-surface mb-1">Micro-Breaks</h4>
                <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                  5-minute resets every 45 mins maintain 92% retention.
                </p>
              </div>
            </div>
            <div className="group p-6 rounded-[2rem] bg-white border border-outline-variant/10 transition-all hover:border-secondary/20 hover:shadow-card-sm flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-base">menu_book</span>
              </div>
              <div>
                <h4 className="font-headline font-bold text-on-surface mb-1">Interleaving</h4>
                <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                  Switch task types to reduce semantic fatigue.
                </p>
              </div>
            </div>
            {userProfile?.energyPeak && (
              <div className="col-span-1 md:col-span-2 group p-6 rounded-[2rem] bg-primary/5 border border-primary/10 transition-all flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-white text-primary flex items-center justify-center shrink-0 shadow-sm">
                   <span className="material-symbols-outlined text-2xl icon-fill">bolt</span>
                </div>
                <div>
                  <h4 className="font-headline font-bold text-on-surface mb-1">Peak Matching Active</h4>
                  <p className="font-body text-sm text-primary leading-relaxed max-w-md">
                    Targeting your <strong>{userProfile.energyPeak}</strong> window. Synaptic plasticity is highest during this specific interval.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
};
