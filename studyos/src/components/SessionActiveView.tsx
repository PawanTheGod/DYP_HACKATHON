import React from 'react';

// TODO: Person 2 - Implement the active session / focus mode interface
export const SessionActiveView: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] p-6 bg-slate-900 text-white rounded-3xl">
      <h2 className="text-3xl font-bold mb-4 italic">Deep Work in Progress</h2>
      <div className="text-6xl font-mono mb-8">25:00</div>
    </div>
  );
};
