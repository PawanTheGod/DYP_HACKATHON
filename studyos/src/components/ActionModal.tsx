import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ScheduleBlock } from '../types';

interface ActionModalProps {
  block: ScheduleBlock;
  onClose: () => void;
  mode?: 'complete' | 'miss';
}

export const ActionModal: React.FC<ActionModalProps> = ({ block, onClose, mode }) => {
  const { markSessionComplete, markSessionMissed, updateScheduleBlock } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const getDuration = () => {
    const [sh, sm] = block.startTime.split(':').map(Number);
    const [eh, em] = block.endTime.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  };

  const handleMarkDone = async () => {
    setIsLoading(true);
    try {
      await markSessionComplete(block.id, 'none');
      onClose();
    } catch (err) {
      console.error('Failed to mark session complete:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReschedule = async () => {
    setIsLoading(true);
    try {
      // Move to next day as a simple reschedule
      const nextDay = new Date(block.date);
      nextDay.setDate(nextDay.getDate() + 1);
      await updateScheduleBlock(block.id, {
        date: nextDay.toISOString().split('T')[0],
        status: 'pending',
      });
      onClose();
    } catch (err) {
      console.error('Failed to reschedule:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkMissed = async () => {
    setIsLoading(true);
    try {
      await markSessionMissed(block.id);
      onClose();
    } catch (err) {
      console.error('Failed to mark session missed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Dimmer Overlay */}
      <div
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-md"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="relative z-10 w-[90%] max-w-md bg-surface-container-lowest rounded-DEFAULT shadow-modal p-6 md:p-8 flex flex-col space-y-8 animate-scale-in">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <span className="inline-flex items-center px-2 py-1 rounded-sm text-[10px] font-label font-medium uppercase tracking-wide bg-tertiary-container text-on-tertiary-container">
              {block.type.replace('_', ' ')}
            </span>
            <h2 className="font-headline text-[1.75rem] font-semibold tracking-tight text-on-surface leading-tight">
              {block.subject}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors p-2 -mr-2 -mt-2"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Session Details */}
        <div className="bg-surface-container-low rounded-DEFAULT p-5 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">schedule</span>
            </div>
            <div>
              <p className="font-label text-xs text-on-surface-variant uppercase tracking-wide">
                Time
              </p>
              <p className="font-body text-base font-medium text-on-surface">
                {formatTime(block.startTime)} - {formatTime(block.endTime)} ({getDuration()} min)
              </p>
            </div>
          </div>
          {block.topic && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">category</span>
              </div>
              <div>
                <p className="font-label text-xs text-on-surface-variant uppercase tracking-wide">
                  Topic Focus
                </p>
                <p className="font-body text-base font-medium text-on-surface">{block.topic}</p>
              </div>
            </div>
          )}
          {block.notes && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">notes</span>
              </div>
              <div>
                <p className="font-label text-xs text-on-surface-variant uppercase tracking-wide">
                  Notes
                </p>
                <p className="font-body text-sm text-on-surface">{block.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col space-y-3 pt-2">
          {block.status !== 'completed' && (
            <button
              onClick={handleMarkDone}
              disabled={isLoading}
              className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-full py-4 px-8 font-body font-medium text-base shadow-cta hover:scale-[0.98] transition-transform flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              <span
                className="material-symbols-outlined icon-fill"
              >
                check_circle
              </span>
              <span>Mark as Completed</span>
            </button>
          )}

          {block.status !== 'missed' && (
            <>
              <button
                onClick={handleReschedule}
                disabled={isLoading}
                className="w-full bg-surface-container text-primary rounded-full py-4 px-8 font-body font-medium text-base hover:bg-surface-container-highest transition-colors flex items-center justify-center space-x-2 disabled:opacity-60"
              >
                <span className="material-symbols-outlined">event_repeat</span>
                <span>Reschedule Session</span>
              </button>

              <button
                onClick={handleMarkMissed}
                disabled={isLoading}
                className="w-full bg-transparent text-error font-body font-medium text-sm py-3 mt-2 hover:bg-error-container/50 rounded-full transition-colors flex items-center justify-center space-x-2 disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-sm">cancel</span>
                <span>Mark as Missed</span>
              </button>
            </>
          )}

          {block.status === 'completed' && (
            <p className="text-center text-sm text-on-surface-variant font-body">
              ✓ This session has been completed.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
