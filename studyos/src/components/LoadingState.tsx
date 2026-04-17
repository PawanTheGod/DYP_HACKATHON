import React from 'react';
import { Spinner } from './ui/Spinner';

// TODO: Person 4 - Implement full-page and inline loading states
export const LoadingState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <Spinner />
      <span className="mt-4 text-slate-500 font-medium">Preparing your study path...</span>
    </div>
  );
};
