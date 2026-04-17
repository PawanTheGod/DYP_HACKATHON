import React from 'react';

// TODO: Person 2 - Implement the main chat interface with Sage
export const ChatWithSage: React.FC = () => {
  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl border shadow-sm">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-primary-600">Sage AI Strategist</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4">Messages appear here...</div>
      <div className="p-4 border-t">Input area...</div>
    </div>
  );
};
