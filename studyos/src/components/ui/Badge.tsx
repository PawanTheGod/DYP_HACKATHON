import React from 'react';

// TODO: Person 4 - Implement Badge variants
export const Badge: React.FC<{ children: React.ReactNode, variant?: string }> = ({ children, variant = "default" }) => {
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
      {children}
    </span>
  );
};
