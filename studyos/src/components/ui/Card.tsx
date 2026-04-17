import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

// TODO: Person 4 - Implement sleek card design
export const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 ${className}`}>
      {children}
    </div>
  );
};
