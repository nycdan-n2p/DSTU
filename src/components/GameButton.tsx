import React from 'react';

interface GameButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'answer' | 'next';
  disabled?: boolean;
  className?: string;
}

export const GameButton: React.FC<GameButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary',
  disabled = false,
  className = '' 
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'answer':
        return 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 px-6 rounded-lg transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl border-2 border-white/20';
      case 'next':
        return 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-3 px-8 rounded-full transform hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-xl animate-pulse';
      default:
        return 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-4 px-8 rounded-lg transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl';
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${getVariantClasses()} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      {children}
    </button>
  );
};