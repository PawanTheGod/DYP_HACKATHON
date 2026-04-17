import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { SubjectObject } from '../types';

interface SubjectManagementProps {
  onClose?: () => void;
}

export const SubjectManagement: React.FC<SubjectManagementProps> = ({ onClose }) => {
  const { userProfile, setUserProfile } = useAppContext();

  const [formData, setFormData] = useState({
    name: '',
    difficulty: 3,
    deadline: '',
    targetHours: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Subject name is required.');
      return;
    }
    if (!formData.deadline) {
      setError('Deadline is required.');
      return;
    }
    if (!userProfile) {
      setError('No profile found. Please complete onboarding first.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const newSubject: SubjectObject = {
        id: `sub_${Date.now()}`,
        name: formData.name.trim(),
        difficulty: formData.difficulty,
        deadline: formData.deadline,
        currentLevel: 5,
        color: SUBJECT_COLORS[userProfile.subjects.length % SUBJECT_COLORS.length],
        masteryScore: 0,
        priorityScore: 0,
      };
      const updatedProfile = {
        ...userProfile,
        subjects: [...userProfile.subjects, newSubject],
      };
      await setUserProfile(updatedProfile);
      setFormData({ name: '', difficulty: 3, deadline: '', targetHours: '' });
    } catch (err) {
      setError('Failed to add subject. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (subjectId: string) => {
    if (!userProfile) return;
    try {
      const updatedProfile = {
        ...userProfile,
        subjects: userProfile.subjects.filter((s) => s.id !== subjectId),
      };
      await setUserProfile(updatedProfile);
    } catch (err) {
      console.error('Failed to delete subject:', err);
    }
  };

  const getDifficultyLabel = (d: number) => {
    if (d <= 1) return 'Intro';
    if (d <= 2) return 'Easy';
    if (d <= 3) return 'Moderate';
    if (d <= 4) return 'Hard';
    if (d <= 5) return 'Complex';
    return 'Expert';
  };

  const getDifficultyChip = (difficulty: number) => {
    if (difficulty >= 7)
      return 'bg-error-container text-on-error-container';
    if (difficulty >= 4)
      return 'bg-primary/10 text-primary';
    return 'bg-tertiary-container text-on-tertiary-fixed-variant';
  };

  const getDifficultyText = (difficulty: number) => {
    if (difficulty >= 7) return 'High Difficulty';
    if (difficulty >= 4) return 'Medium Difficulty';
    return 'Low Difficulty';
  };

  return (
    <div className="flex-grow w-full max-w-xl mx-auto px-6 py-6 flex flex-col gap-8 md:max-w-2xl">
      {/* Add Subject Form */}
      <section className="bg-surface-container-lowest rounded-DEFAULT p-6 shadow-card flex flex-col gap-6 relative overflow-hidden">
        {/* Decorative gradient */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined icon-fill">add_circle</span>
          </div>
          <h2 className="font-headline text-[1.375rem] font-semibold tracking-tight text-on-surface">
            Add Subject
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Subject Name */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-on-surface-variant font-label uppercase tracking-wide">
              Subject Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-surface-container-high rounded-DEFAULT px-4 py-3 text-on-surface font-body border-none outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline"
              placeholder="e.g. Cognitive Psychology"
              required
            />
          </div>

          {/* Difficulty Slider */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-on-surface-variant font-label uppercase tracking-wide">
                Difficulty Assessment
              </label>
              <span className="text-sm font-semibold text-secondary">
                Level {formData.difficulty} — {getDifficultyLabel(formData.difficulty)}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={formData.difficulty}
              onChange={(e) =>
                setFormData({ ...formData, difficulty: Number(e.target.value) * 2 })
              }
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-outline font-medium px-1">
              <span>Intro</span>
              <span>Complex</span>
            </div>
          </div>

          {/* Deadline & Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-on-surface-variant font-label uppercase tracking-wide">
                Deadline
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full bg-surface-container-high rounded-DEFAULT px-4 py-3 text-on-surface font-body border-none outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-on-surface-variant font-label uppercase tracking-wide">
                Target Hours
              </label>
              <input
                type="number"
                min={1}
                value={formData.targetHours}
                onChange={(e) => setFormData({ ...formData, targetHours: e.target.value })}
                className="w-full bg-surface-container-high rounded-DEFAULT px-4 py-3 text-on-surface font-body border-none outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="0"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-error font-body">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-full py-4 px-8 font-label text-base font-medium shadow-cta hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSubmitting && (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {isSubmitting ? 'Adding...' : 'Establish Subject'}
          </button>
        </form>
      </section>

      {/* Active Subjects Roster */}
      <section className="flex flex-col gap-5">
        <h3 className="font-headline text-[1.375rem] font-semibold text-on-surface">
          Active Roster
        </h3>
        {!userProfile || userProfile.subjects.length === 0 ? (
          /* Empty State */
          <div className="bg-surface-container-low rounded-DEFAULT p-8 flex flex-col items-center text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-primary-fixed flex items-center justify-center">
              <span
                className="material-symbols-outlined text-5xl text-primary icon-fill"
              >
                menu_book
              </span>
            </div>
            <div className="space-y-2">
              <h2 className="font-headline text-[1.75rem] font-semibold text-on-surface">
                Your Canvas is Clear
              </h2>
              <p className="font-body text-base text-on-surface-variant leading-relaxed max-w-sm mx-auto">
                Begin your cognitive journey by adding subjects you wish to master. We'll handle the curation.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {userProfile.subjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                onDelete={() => handleDelete(subject.id)}
                getDifficultyChip={getDifficultyChip}
                getDifficultyText={getDifficultyText}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

/* ---- Subject Card ---- */
interface SubjectCardProps {
  subject: SubjectObject;
  onDelete: () => void;
  getDifficultyChip: (d: number) => string;
  getDifficultyText: (d: number) => string;
}

const SubjectCard: React.FC<SubjectCardProps> = ({
  subject,
  onDelete,
  getDifficultyChip,
  getDifficultyText,
}) => {
  const formatDeadline = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return d;
    }
  };

  return (
    <div className="bg-surface-container-lowest rounded-DEFAULT p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow relative group">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h4 className="font-body text-[1.125rem] font-semibold text-on-surface">
            {subject.name}
          </h4>
          <span
            className={`text-xs font-medium px-2 py-1 rounded-sm w-fit ${getDifficultyChip(
              subject.difficulty
            )}`}
          >
            {getDifficultyText(subject.difficulty)}
          </span>
        </div>
        <button
          onClick={onDelete}
          className="text-outline hover:text-error transition-colors rounded-full p-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          <span className="material-symbols-outlined text-[20px]">delete</span>
        </button>
      </div>
      <div className="flex items-center gap-4 text-sm text-on-surface-variant bg-surface-container-low p-3 rounded-DEFAULT">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px] text-primary">event</span>
          <span className="font-medium">{formatDeadline(subject.deadline)}</span>
        </div>
        <div className="w-px h-4 bg-outline-variant/30" />
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px] text-tertiary">
            bar_chart
          </span>
          <span className="font-medium">Mastery {subject.masteryScore}%</span>
        </div>
      </div>
    </div>
  );
};

const SUBJECT_COLORS = [
  '#3525cd', '#712ae2', '#005338', '#ba1a1a',
  '#006e4b', '#4f46e5', '#8a4cfc', '#d2bbff',
];
