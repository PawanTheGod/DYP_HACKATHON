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
    <main className="max-w-xl mx-auto px-6 pt-6 pb-32 flex flex-col gap-8">
      {/* Header */}
      <section className="flex flex-col gap-4">
        <div>
          <h1 className="text-[2.75rem] font-headline font-extrabold tracking-tight text-on-surface leading-tight">Schedule</h1>
          <p className="font-body text-base text-on-surface-variant mt-1">
            {selectedStr === todayStr ? "Today" : DAY_NAMES_FULL[selectedDate.getDay()]}, {selectedDate.toLocaleDateString('en-IN', { month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Horizontal Day Selector */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-6 px-6">
          {days.map((day, i) => {
            const dStr = day.toISOString().split('T')[0];
            const isSelected = dStr === selectedStr;
            const isToday = dStr === todayStr;
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(day)}
                className={`flex flex-col items-center justify-center py-3 px-4 rounded-full min-w-[4rem] transition-transform active:scale-95 ease-in-out
                  ${isSelected
                    ? 'bg-primary text-on-primary shadow-[0_12px_32px_rgba(53,37,205,0.2)]'
                    : isToday
                    ? 'bg-surface-container-low text-on-surface shadow-sm'
                    : 'bg-surface-container text-on-surface-variant'
                  }`}
              >
                <span className={`font-label text-xs uppercase tracking-widest ${isSelected ? 'text-primary-fixed-dim' : ''}`}>
                  {DAY_NAMES[day.getDay()]}
                </span>
                <span className="font-body text-lg font-medium mt-1">{day.getDate()}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Schedule List */}
      <section className="flex flex-col gap-6 relative">
        <div className="absolute left-6 top-0 bottom-0 w-8 bg-gradient-to-b from-surface-container-low via-surface to-surface-container-low opacity-50 -z-10 rounded-full"></div>

        {dayBlocks.length === 0 && (
          <div className="bg-surface-container-lowest rounded-[1rem] p-8 text-center shadow-card">
            <span className="material-symbols-outlined text-5xl text-outline mb-3 block">event_available</span>
            <p className="font-body text-base text-on-surface-variant">No sessions scheduled for this day.</p>
            <p className="font-body text-sm text-outline mt-1">Generate your schedule from the home screen.</p>
          </div>
        )}

        {dayBlocks.map((block, idx) => {
          const isNext = isNextBlock(block, idx);
          const duration = getMins(block.endTime) - getMins(block.startTime);

          if (block.status === 'completed') {
            return (
              <article key={block.id} className="bg-surface-container-lowest rounded-[1rem] p-5 shadow-[0_12px_32px_rgba(53,37,205,0.03)] flex flex-col gap-4 opacity-70">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-label text-xs text-on-surface-variant tracking-wider uppercase mb-1">
                      {formatTime(block.startTime)} - {formatTime(block.endTime)}
                    </p>
                    <h3 className="font-body text-xl font-medium text-on-surface">{block.subject}</h3>
                    {block.topic && <p className="font-body text-sm text-on-surface-variant mt-1">{block.topic}</p>}
                  </div>
                  <span className="bg-surface-container px-2 py-1 rounded-sm text-xs font-label font-medium text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Done
                  </span>
                </div>
              </article>
            );
          }

          if (block.status === 'missed') {
            return (
              <article key={block.id} className="bg-surface-container-lowest rounded-[1rem] p-5 shadow-[0_12px_32px_rgba(53,37,205,0.03)] flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-label text-xs text-on-surface-variant tracking-wider uppercase mb-1">
                      {formatTime(block.startTime)} - {formatTime(block.endTime)}
                    </p>
                    <h3 className="font-body text-xl font-medium text-on-surface">{block.subject}</h3>
                  </div>
                  <span className="bg-error-container text-on-error-container px-2 py-1 rounded-sm text-xs font-label font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    Missed
                  </span>
                </div>
                <div className="flex gap-3 mt-1">
                  <button className="text-xs font-label font-medium text-primary hover:text-primary-container uppercase tracking-wide">
                    Reschedule
                  </button>
                </div>
              </article>
            );
          }

          // Pending block
          return (
            <article key={block.id} className={`bg-surface-container-lowest rounded-[1rem] p-5 shadow-card flex flex-col gap-5 relative overflow-hidden ${isNext ? 'ring-1 ring-primary/20' : ''}`}>
              {isNext && <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-secondary"></div>}
              <div className={`flex justify-between items-start ${isNext ? 'pl-2' : ''}`}>
                <div>
                  <p className={`font-label text-xs font-medium tracking-wider uppercase mb-1 ${isNext ? 'text-primary' : 'text-on-surface-variant'}`}>
                    {formatTime(block.startTime)} - {formatTime(block.endTime)}{isNext ? ' • Next' : ''}
                  </p>
                  <h3 className="font-body text-xl font-medium text-on-surface leading-tight">{block.subject}</h3>
                  {block.topic && <p className="font-body text-sm text-on-surface-variant mt-2">{block.topic}</p>}
                  <p className="font-body text-xs text-outline mt-1">{duration} min • {block.type?.replace('_', ' ')}</p>
                </div>
              </div>
              <div className={`flex gap-3 mt-2 ${isNext ? 'pl-2' : ''}`}>
                <button
                  onClick={() => onComplete(block)}
                  className="flex-1 bg-gradient-to-br from-primary to-primary-container text-on-primary py-3 rounded-full font-label font-medium uppercase tracking-wide text-xs transition-transform active:scale-95 shadow-cta flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">check</span>
                  Mark Done
                </button>
                <button
                  onClick={() => onMiss(block)}
                  className="flex-1 bg-surface-container hover:bg-surface-container-high text-on-surface py-3 rounded-full font-label font-medium uppercase tracking-wide text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                  Missed
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
};
