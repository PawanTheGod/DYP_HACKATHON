import React from 'react';

// TODO: Person 2 - Implement the main analytics dashboard with Recharts
export const Dashboard: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Study Insights</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="h-40 bg-slate-50 rounded-xl border border-dashed flex items-center justify-center text-slate-400">
          Chart Placeholder
        </div>
      </div>
    </div>
  );
};
