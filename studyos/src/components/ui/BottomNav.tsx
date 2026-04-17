import React from 'react';

type Tab = 'home' | 'schedule' | 'analytics' | 'insights';

interface NavItem {
  id: Tab;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home',      label: 'Home',       icon: 'home_app_logo' },
  { id: 'schedule',  label: 'Schedule',   icon: 'date_range' },
  { id: 'analytics', label: 'Metrics',    icon: 'monitoring' },
  { id: 'insights',  label: 'Sage',       icon: 'psychology' },
];

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => (
  <nav className="fixed bottom-0 w-full z-50 md:hidden">
    <div className="absolute inset-0 bg-white/80 backdrop-blur-2xl border-t border-outline-variant/10"></div>
    <div className="flex justify-around items-center px-4 pt-4 pb-10 max-w-xl mx-auto relative z-10">
      {NAV_ITEMS.map(item => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center justify-center gap-1.5 transition-all duration-300
              ${isActive ? 'text-primary scale-110' : 'text-on-surface-variant hover:text-primary'}`}
          >
            <div className={`p-2.5 rounded-2xl transition-all duration-300 ${isActive ? 'bg-primary/10 shadow-sm' : ''}`}>
              <span
                className="material-symbols-outlined text-2xl"
                style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}
              >
                {item.icon}
              </span>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-[0.15em] font-headline transition-opacity ${isActive ? 'opacity-100' : 'opacity-60'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  </nav>
);

// Desktop sidebar
interface SidebarNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ activeTab, onTabChange }) => (
  <aside className="hidden md:flex flex-col w-72 min-h-screen bg-surface-container-lowest border-r border-outline-variant/10 pt-10 px-6 gap-3 sticky top-0">
    <div className="mb-12 px-4">
      <h1 className="font-headline font-black text-3xl text-on-surface tracking-tighter">StudyOS</h1>
      <p className="text-[10px] text-primary font-bold uppercase tracking-[0.2em] mt-1">Cognitive Sanctuary</p>
    </div>
    
    <div className="flex flex-col gap-2">
      {NAV_ITEMS.map(item => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 text-left group
              ${isActive
                ? 'bg-on-surface text-surface shadow-xl shadow-on-surface/20 scale-[1.02]'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5'
              }`}
          >
            <span
              className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform"
              style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}
            >
              {item.icon}
            </span>
            <span className="text-sm font-headline font-bold tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </div>

    <div className="mt-auto mb-10 p-6 rounded-[2rem] bg-primary/5 border border-primary/10">
       <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center shadow-sm">
             <span className="material-symbols-outlined text-sm">bolt</span>
          </div>
          <span className="text-xs font-headline font-bold text-on-surface">Pro Synthesis</span>
       </div>
       <p className="text-[10px] font-body text-on-surface-variant leading-relaxed">
         Unlock advanced neural patterns and real-time cognitive optimization.
       </p>
       <button className="mt-4 w-full py-2.5 rounded-xl bg-on-surface text-surface text-[10px] font-bold uppercase tracking-widest shadow-sm hover:shadow-md transition-all">
         Upgrade
       </button>
    </div>
  </aside>
);

