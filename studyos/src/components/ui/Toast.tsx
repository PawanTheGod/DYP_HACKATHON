import React from 'react';

// TODO: Person 4 - Implement temporary toast notification component
export const Toast: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="fixed bottom-4 right-4 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-lg animate-slideUp">
      {message}
    </div>
  );
};
