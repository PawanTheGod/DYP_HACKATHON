import React from 'react';
import { useAppContext } from '../context/AppContext';
import { LogOut, Settings, Bell, Shield, ExternalLink } from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const { logout, userProfile } = useAppContext();

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out? This will clear all local data.')) {
      await logout();
    }
  };

  return (
    <div className="p-8 space-y-8 animate-slide-up overflow-y-auto max-h-[80vh]">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <Settings size={24} />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h2>
          <p className="text-slate-500">Manage your account and preferences</p>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="relative overflow-hidden p-8 rounded-3xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 shadow-sm group">
        <div className="relative z-10">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold mb-4 tracking-wider uppercase">
            Coming Soon
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-3">Settings Panel</h3>
          <p className="text-slate-600 leading-relaxed max-w-md">
            We're building a more powerful way for you to customize your StudyOS experience.
            Soon, you'll be able to manage your energy peaks, fine-tune AI feedback, and sync across all your devices.
          </p>
        </div>
        <Settings className="absolute -right-8 -bottom-8 w-48 h-48 text-indigo-50/50 -rotate-12 transition-transform group-hover:rotate-0 duration-1000" />
      </div>

      {/* Account Management Panel */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-400 px-2 uppercase tracking-widest">Account & Session</h4>
        <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
                <span className="material-symbols-outlined text-2xl">person</span>
              </div>
              <div>
                <h5 className="font-bold text-slate-900">
                  {userProfile && userProfile.name ? userProfile.name : 'Student'}
                </h5>
                <p className="text-sm text-slate-500">Active StudyOS Session</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-50">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-50 text-red-600 font-semibold hover:bg-red-100 transition-all active:scale-[0.99] group"
            >
              <div className="flex items-center gap-3">
                <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span>Log Out of StudyOS</span>
              </div>
              <span className="material-symbols-outlined text-sm opacity-50">arrow_forward</span>
            </button>
            <p className="text-[11px] text-slate-400 mt-4 px-2 italic text-center">
              Logging out will safely clear your cognitive profile and local schedules from this device.
            </p>
          </div>
        </div>
      </div>

      {/* Placeholder Preference Groups */}
      <div className="space-y-3 opacity-40">
        <h4 className="text-sm font-semibold text-slate-400 px-2 uppercase tracking-widest">Preferences</h4>
        
        <div className="space-y-1">
          <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-3 text-slate-500">
              <Bell size={20} />
              <span className="font-medium">Notifications</span>
            </div>
            <div className="w-10 h-6 bg-slate-200 rounded-full"></div>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-3 text-slate-500">
              <Shield size={20} />
              <span className="font-medium">Privacy & Data</span>
            </div>
            <ExternalLink size={18} className="text-slate-300" />
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] text-slate-300 mt-4 tracking-[0.2em] font-medium">
        STUDYOS V1.0.0 — SAGE INTELLIGENCE
      </p>
    </div>
  );
};
