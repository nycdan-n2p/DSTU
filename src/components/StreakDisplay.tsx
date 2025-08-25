import React from 'react';
import { Flame, Target } from 'lucide-react';

interface StreakDisplayProps {
  currentStreak: number;
  maxStreak: number;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export const StreakDisplay: React.FC<StreakDisplayProps> = ({ 
  currentStreak, 
  maxStreak, 
  className = '',
  size = 'medium'
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'text-xs px-2 py-1';
      case 'large':
        return 'text-lg px-4 py-2';
      default:
        return 'text-sm px-3 py-1';
    }
  };

  const getStreakColor = () => {
    if (currentStreak >= 5) return 'bg-red-500/20 border-red-400 text-red-300';
    if (currentStreak >= 3) return 'bg-orange-500/20 border-orange-400 text-orange-300';
    if (currentStreak >= 2) return 'bg-yellow-500/20 border-yellow-400 text-yellow-300';
    return 'bg-gray-500/20 border-gray-400 text-gray-300';
  };

  if (currentStreak === 0 && maxStreak === 0) return null;

  return (
    <div className={`inline-flex items-center gap-1 rounded-full border ${getStreakColor()} ${getSizeClasses()} ${className}`}>
      {currentStreak > 0 ? (
        <>
          <Flame className={`w-3 h-3 ${currentStreak >= 3 ? 'animate-pulse' : ''}`} />
          <span className="font-bold">{currentStreak}</span>
        </>
      ) : (
        <>
          <Target className="w-3 h-3" />
          <span className="font-bold">Best: {maxStreak}</span>
        </>
      )}
    </div>
  );
};