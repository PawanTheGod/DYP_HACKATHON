import React from 'react';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
}

// TODO: Person 4 - Implement animated SVG progress circle
export const ProgressRing: React.FC<ProgressRingProps> = ({ progress, size = 120 }) => {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="w-full h-full transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={size/2 - 10} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
        <circle cx={size/2} cy={size/2} r={size/2 - 10} stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={2 * Math.PI * (size/2-10)} strokeDashoffset={2 * Math.PI * (size/2-10) * (1 - progress/100)} className="text-primary-600 transition-all duration-1000" />
      </svg>
      <span className="absolute text-xl font-bold">{progress}%</span>
    </div>
  );
};
