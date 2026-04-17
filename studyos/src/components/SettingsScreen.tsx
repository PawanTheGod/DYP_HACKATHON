import React from 'react';

// TODO: Person 4 - Implement settings screen for profile management
export const SettingsScreen: React.FC = () => {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>
      <div className="space-y-4">
        <div className="p-4 bg-white rounded-xl border">Export Data</div>
        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 italic">Clear All Data</div>
      </div>
    </div>
  );
};
