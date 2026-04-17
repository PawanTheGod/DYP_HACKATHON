import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { ScheduleBlock } from '../types';

interface ScheduleViewScreenProps {
  onComplete: (block: ScheduleBlock) => void;
  onMiss: (block: ScheduleBlock) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const ScheduleViewScreen: React.FC<ScheduleViewScreenProps> = ({ onComplete, onMiss }) => {
  const { scheduleBlocks } = useAppContext();

  // Build 7-day window starting today
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  const [selectedDate, setSelectedDate] = useState(() => days[0]);
  const todayStr = new Date().toISOString().split('T')[0];
  const selectedStr = selectedDate.toISOString().split('T')[0];

  const dayBlocks = useMemo(
    () => scheduleBlocks
      .filter(b => b.date === selectedStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [scheduleBlocks, selectedStr]
  );

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const getMins = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const isNextBlock = (block: ScheduleBlock, index: number) => {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const blockStart = getMins(block.startTime);
    return selectedStr === todayStr
      && block.status === 'pending'
      && blockStart > nowMins
      && dayBlocks.slice(0, index).every(b => b.status !== 'pending' || getMins(b.startTime) <= nowMins);
  };

  return (
    <main className="max-w-xl mx-auto px-6 pt-10 pb-32 flex flex-col gap-10">
      {/* Header */}
      <section className="flex flex-col gap-6">
        <div>
          <h1 className="text-[3.25rem] font-headline font-extrabold tracking-tight text-on-surface leading-tight">Timeline</h1>
          <p className="font-body text-base text-on-surface-variant mt-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary">calendar_today</span>
            {selectedStr === todayStr ? "Today" : DAY_NAMES_FULL[selectedDate.getDay()]}, {selectedDate.toLocaleDateString('en-IN', { month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Horizontal Day Selector */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6">
          {days.map((day, i) => {
            const dStr = day.toISOString().split('T')[0];
            const isSelected = dStr === selectedStr;
            const isToday = dStr === todayStr;
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(day)}
                className={`flex flex-col items-center justify-center py-4 px-5 rounded-[2rem] min-w-[4.5rem] transition-all duration-300 ease-spring
                  ${isSelected
                    ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-105'
                    : 'bg-white text-on-surface border border-outline-variant/10 hover:border-primary/20 hover:bg-primary/5'
                  }`}
              >
                <span className={`font-label text-xs uppercase tracking-[0.15em] font-bold ${isSelected ? 'text-white/70' : 'text-outline'}`}>
                  {DAY_NAMES[day.getDay()]}
                </span>
                <span className="font-headline text-xl font-extrabold mt-1">{day.getDate()}</span>
                {isToday && !isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1"></div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Schedule List */}
      <section className="flex flex-col gap-6 relative">
        {dayBlocks.length === 0 && (
          <div className="bg-white rounded-[2.5rem] p-12 text-center shadow-card border border-outline-variant/10">
            <div className="w-20 h-20 rounded-full bg-surface-container-low mx-auto flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-outline-variant icon-fill">coffee_maker</span>
            </div>
            <h3 className="text-xl font-headline font-bold text-on-surface mb-2">Mental Clarity Achieved</h3>
            <p className="font-body text-base text-on-surface-variant max-w-xs mx-auto">
              No cognitive tasks scheduled for this duration. Use this time for restorative recovery.
            </p>
          </div>
        )}

        {dayBlocks.map((block, idx) => {
          const isNext = isNextBlock(block, idx);
          const duration = getMins(block.endTime) - getMins(block.startTime);

          if (block.status === 'completed') {
            return (
              <article key={block.id} className="bg-surface-container-low/40 rounded-[2rem] p-6 border border-outline-variant/5 flex flex-col gap-4 opacity-60 grayscale-[0.3]">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-tertiary">check_circle</span>
                      <p className="font-label text-xs text-outline tracking-wider uppercase font-bold">
                        {formatTime(block.startTime)} — {formatTime(block.endTime)}
                      </p>
                    </div>
                    <h3 className="font-headline text-xl font-bold text-on-surface">{block.subject}</h3>
                  </div>
                  <div className="bg-white/50 px-3 py-1 rounded-full text-[10px] font-label font-bold text-tertiary uppercase tracking-widest flex items-center gap-1.5">
                    Completed
                  </div>
                </div>
              </article>
            );
          }

          if (block.status === 'missed') {
            return (
              <article key={block.id} className="bg-white rounded-[2rem] p-6 shadow-card border-l-4 border-error border border-outline-variant/10 flex flex-col gap-5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-label text-xs text-error tracking-wider uppercase font-bold mb-1">
                      {formatTime(block.startTime)} — {formatTime(block.endTime)}
                    </p>
                    <h3 className="font-headline text-xl font-bold text-on-surface">{block.subject}</h3>
                  </div>
                  <div className="bg-error/5 text-error px-3 py-1 rounded-full text-[10px] font-label font-bold uppercase tracking-widest flex items-center gap-1.5">
                    Missed session
                  </div>
                </div>
                <button className="w-fit text-xs font-label font-bold text-primary hover:text-primary-variant uppercase tracking-widest flex items-center gap-2">
                  Find new window
                  <span className="material-symbols-outlined text-sm">trending_flat</span>
                </button>
              </article>
            );
          }

          // Pending/Next block
          return (
            <article key={block.id} className={`group bg-white rounded-[2rem] p-8 shadow-card border border-outline-variant/10 flex flex-col gap-6 relative overflow-hidden transition-all hover:shadow-lg hover:border-primary/20 ${isNext ? 'ring-2 ring-primary/10 bg-primary/[0.02]' : ''}`}>
              {isNext && (
                <div className="absolute top-0 right-0 py-2 px-6 bg-primary text-white font-label text-[10px] font-bold uppercase tracking-[0.2em] rounded-bl-2xl">
                  Focus Priority
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${isNext ? 'bg-primary' : 'bg-outline-variant'}`}></div>
                  <p className={`font-label text-xs font-bold tracking-widest uppercase ${isNext ? 'text-primary' : 'text-outline'}`}>
                    {formatTime(block.startTime)} — {formatTime(block.endTime)}
                  </p>
                </div>
                <h3 className="font-headline text-2xl font-extrabold text-on-surface leading-tight">{block.subject}</h3>
                {block.topic && (
                  <p className="font-body text-base text-on-surface-variant flex items-center gap-2 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary/30"></span>
                    {block.topic}
                  </p>
                )}
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-outline">
                    <span className="material-symbols-outlined text-[18px]">timer</span>
                    <span className="font-label text-xs font-bold">{duration}m</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-outline">
                    <span className="material-symbols-outlined text-[18px]">psychology</span>
                    <span className="font-label text-xs font-bold uppercase tracking-widest">{block.type?.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => onComplete(block)}
                  className="btn-primary flex-1 py-5"
                >
                  <span className="material-symbols-outlined text-xl">verified</span>
                  Complete Cycle
                </button>
                <button
                  onClick={() => onMiss(block)}
                  className="btn-outline w-16 h-16 !p-0"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </main>

  );
};
