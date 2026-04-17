import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

// TODO: Person 4 - Implement styled Input
export const Input: React.FC<InputProps> = ({ label, error, ...props }) => {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <input 
        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};
