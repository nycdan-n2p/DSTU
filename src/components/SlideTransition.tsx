import React from 'react';

interface SlideTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
  direction?: 'slide' | 'bounce' | 'rotate' | 'fade';
  className?: string;
}

export const SlideTransition: React.FC<SlideTransitionProps> = ({ 
  children, 
  isVisible, 
  direction = 'slide',
  className = '' 
}) => {
  const getTransitionClasses = () => {
    const baseClasses = `transition-all duration-700 ease-out ${className}`;
    
    if (!isVisible) {
      switch (direction) {
        case 'slide':
          return `${baseClasses} transform translate-x-[-100%] opacity-0`;
        case 'bounce':
          return `${baseClasses} transform scale-50 opacity-0`;
        case 'rotate':
          return `${baseClasses} transform rotate-180 scale-75 opacity-0`;
        case 'fade':
          return `${baseClasses} opacity-0`;
        default:
          return `${baseClasses} opacity-0`;
      }
    }
    
    return `${baseClasses} transform translate-x-0 scale-100 rotate-0 opacity-100`;
  };

  return (
    <div className={getTransitionClasses()}>
      {children}
    </div>
  );
};