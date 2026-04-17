import React from 'react';
import { useAppContext } from '../../context/AppContext';

interface TopBarProps {
  onSettingsClick?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onSettingsClick }) => {
  const { userProfile } = useAppContext();
  const initial = userProfile?.name?.charAt(0)?.toUpperCase() ?? 'S';

  return (
    <header className="w-full top-0 sticky z-40 bg-[#f7f9fb]">
      <div className="flex justify-between items-center px-6 py-4 max-w-xl mx-auto">
        <div className="flex items-center gap-3">
          {/* Avatar circle */}
          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-headline font-bold text-sm shadow-sm cursor-pointer hover:opacity-90 transition-opacity">
            {initial}
          </div>
          <div className="flex flex-col">
            <span className="font-headline font-semibold tracking-tight text-on-surface text-sm">Study Planner</span>
            <span className="text-xl font-extrabold text-primary font-headline">Editorial Intelligence</span>
          </div>
        </div>
        <button
          onClick={onSettingsClick}
          className="p-2 rounded-full hover:bg-[#e1e2e5] transition-colors"
        >
          <span className="material-symbols-outlined text-[#44474a]">settings</span>
        </button>
      </div>
    </header>
  );
};
