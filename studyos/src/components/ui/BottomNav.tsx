import React from 'react';

type Tab = 'home' | 'schedule' | 'analytics' | 'insights';

interface NavItem {
  id: Tab;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home',      label: 'Home',       icon: 'home' },
  { id: 'schedule',  label: 'Schedule',   icon: 'calendar_today' },
  { id: 'analytics', label: 'Analytics',  icon: 'query_stats' },
  { id: 'insights',  label: 'AI Insights',icon: 'auto_awesome' },
];

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => (
  <nav className="fixed bottom-0 w-full z-50 rounded-t-[32px] bg-white/80 backdrop-blur-xl shadow-nav md:hidden">
    <div className="flex justify-around items-center px-4 pt-3 pb-8 max-w-xl mx-auto">
      {NAV_ITEMS.map(item => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center justify-center px-4 py-1 rounded-full transition-all duration-200
              ${isActive
                ? 'bg-[#3525cd]/10 text-[#3525cd]'
                : 'text-[#44474a] hover:text-[#3525cd]'
              }`}
          >
            <span
              className="material-symbols-outlined mb-1"
              style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-medium tracking-wide uppercase font-body">{item.label}</span>
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
  <aside className="hidden md:flex flex-col w-56 min-h-screen bg-surface-container-lowest border-r border-outline-variant/20 pt-8 px-4 gap-2 sticky top-0 shadow-card">
    <div className="mb-8 px-2">
      <h1 className="font-headline font-extrabold text-xl text-primary">StudyOS</h1>
      <p className="text-xs text-outline font-body">Editorial Intelligence</p>
    </div>
    {NAV_ITEMS.map(item => {
      const isActive = activeTab === item.id;
      return (
        <button
          key={item.id}
          onClick={() => onTabChange(item.id)}
          className={`flex items-center gap-3 px-4 py-3 rounded-[1rem] transition-all duration-200 text-left
            ${isActive
              ? 'bg-[#3525cd]/10 text-[#3525cd] font-medium'
              : 'text-[#44474a] hover:text-[#3525cd] hover:bg-surface-container'
            }`}
        >
          <span
            className="material-symbols-outlined"
            style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}
          >
            {item.icon}
          </span>
          <span className="text-sm font-body">{item.label}</span>
        </button>
      );
    })}
  </aside>
);
