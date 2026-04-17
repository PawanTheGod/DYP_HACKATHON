import React from 'react';
import { useAppContext } from '../../context/AppContext';

interface TopBarProps {
  onSettingsClick?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onSettingsClick }) => {
  const { userProfile } = useAppContext();
  const initial = userProfile?.name?.charAt(0)?.toUpperCase() ?? 'S';

  return (
    <header className="w-full top-0 sticky z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10">
      <div className="flex justify-between items-center px-6 py-5 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 group cursor-pointer">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-headline font-black text-lg shadow-lg shadow-primary/20 group-hover:rotate-6 transition-transform">
              {initial}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-secondary rounded-full border-2 border-white"></div>
          </div>
          <div className="flex flex-col">
            <span className="font-headline font-black text-2xl text-on-surface tracking-tighter leading-none">StudyOS</span>
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mt-1">Cognitive Sanctuary</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <button
             onClick={onSettingsClick}
             className="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-surface-container transition-colors text-on-surface-variant"
           >
             <span className="material-symbols-outlined text-2xl">settings</span>
           </button>
        </div>
      </div>
    </header>
  );
};

