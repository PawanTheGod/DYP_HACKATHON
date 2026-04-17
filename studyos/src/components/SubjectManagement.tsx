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
        topics: [],
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
    <div className="flex-grow w-full max-w-xl mx-auto px-6 py-10 flex flex-col gap-10 md:max-w-2xl">
      {/* Add Subject Header */}
      <section className="flex flex-col gap-2">
        <h1 className="text-[3.25rem] font-headline font-extrabold tracking-tight text-on-surface leading-tight">Curate</h1>
        <p className="font-body text-base text-on-surface-variant max-w-sm">
          Define your cognitive domains and set the parameters for your study cycles.
        </p>
      </section>

      {/* Add Subject Form */}
      <section className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-card border border-outline-variant/10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors"></div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-8 relative z-10">
          {/* Subject Name */}
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-bold text-outline font-label uppercase tracking-[0.2em] ml-1">
              Subject Designation
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-surface-container-low/50 rounded-2xl px-6 py-5 text-lg text-on-surface font-headline font-bold border border-transparent focus:border-primary/20 focus:bg-white focus:shadow-md transition-all placeholder:text-outline/40 placeholder:font-normal"
              placeholder="e.g. Theoretical Physics"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Difficulty Selector */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-outline font-label uppercase tracking-[0.2em]">
                  Cognitive Load
                </label>
                <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary/5 rounded-md">
                   {getDifficultyLabel(formData.difficulty)}
                </span>
              </div>
              <div className="flex flex-col gap-4 mt-2">
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.5}
                  value={formData.difficulty / 2}
                  onChange={(e) =>
                    setFormData({ ...formData, difficulty: Number(e.target.value) * 2 })
                  }
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[9px] text-outline font-bold uppercase tracking-widest px-1">
                  <span>Foundational</span>
                  <span>Complex</span>
                </div>
              </div>
            </div>

            {/* Deadline */}
            <div className="flex flex-col gap-4">
              <label className="text-[10px] font-bold text-outline font-label uppercase tracking-[0.2em] ml-1">
                Target Deadline
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full bg-surface-container-low/50 rounded-2xl px-6 py-4 text-on-surface font-label font-bold border border-transparent focus:border-primary/20 focus:bg-white transition-all appearance-none"
                  required
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-sm pointer-events-none">calendar_today</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-error/5 border border-error/10 flex items-center gap-3">
               <span className="material-symbols-outlined text-error text-lg">error</span>
               <p className="text-xs text-error font-bold tracking-wide">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full cta-gradient text-white rounded-[2rem] py-5 px-8 font-headline text-lg font-extrabold shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-3"
          >
            {isSubmitting ? (
              <span className="w-5 h-5 border-3 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-xl">temp_preferences_custom</span>
            )}
            {isSubmitting ? 'Establishing...' : 'Commit to Roster'}
          </button>
        </form>
      </section>

      {/* Active Subjects Roster */}
      <section className="flex flex-col gap-8 pb-32">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-headline text-2xl font-extrabold text-on-surface">
            Active Domains
          </h3>
          {userProfile && userProfile.subjects.length > 0 && (
            <span className="text-[10px] font-bold text-outline font-label uppercase tracking-widest bg-surface-container px-3 py-1 rounded-full">
               {userProfile.subjects.length} Enrolled
            </span>
          )}
        </div>
        
        {!userProfile || userProfile.subjects.length === 0 ? (
          <div className="bg-surface-container-low/50 rounded-[3rem] p-16 flex flex-col items-center text-center border-2 border-dashed border-outline-variant/20">
            <div className="w-24 h-24 rounded-[2rem] bg-white shadow-xl flex items-center justify-center mb-10 rotate-3">
              <span className="material-symbols-outlined text-5xl text-primary/40">auto_stories</span>
            </div>
            <div className="space-y-4">
              <h2 className="font-headline text-2xl font-extrabold text-on-surface">
                Awaiting Designation
              </h2>
              <p className="font-body text-base text-on-surface-variant leading-relaxed max-w-sm mx-auto">
                No active domains detected. Define your subjects above to initialize neural mapping.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
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
    <div className="bg-white rounded-[2rem] p-6 flex flex-col gap-6 shadow-card border border-outline-variant/10 relative group overflow-hidden transition-all hover:shadow-lg hover:border-primary/20">
      {/* Subject Color Indicator */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors"></div>
      
      <div className="flex justify-between items-start relative z-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.color }}></span>
            <span className="text-[10px] font-bold text-outline font-label uppercase tracking-widest">
              {getDifficultyText(subject.difficulty)}
            </span>
          </div>
          <h4 className="font-headline text-2xl font-extrabold text-on-surface">
            {subject.name}
          </h4>
        </div>
        <button
          onClick={onDelete}
          className="w-10 h-10 rounded-full bg-surface-container-low text-outline-variant flex items-center justify-center hover:bg-error/10 hover:text-error transition-all"
        >
          <span className="material-symbols-outlined text-lg">delete</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 relative z-10">
        <div className="bg-surface-container-low/50 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-primary text-sm">calendar_month</span>
          </div>
          <div className="flex flex-col">
             <span className="text-[9px] font-bold text-outline uppercase tracking-widest">Deadline</span>
             <span className="text-xs font-bold text-on-surface">{formatDeadline(subject.deadline)}</span>
          </div>
        </div>
        <div className="bg-surface-container-low/50 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
             <span className="material-symbols-outlined text-secondary text-sm">auto_graph</span>
          </div>
          <div className="flex flex-col">
             <span className="text-[9px] font-bold text-outline uppercase tracking-widest">Mastery</span>
             <span className="text-xs font-bold text-on-surface">{subject.masteryScore}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};


const SUBJECT_COLORS = [
  '#3525cd', '#712ae2', '#005338', '#ba1a1a',
  '#006e4b', '#4f46e5', '#8a4cfc', '#d2bbff',
];
