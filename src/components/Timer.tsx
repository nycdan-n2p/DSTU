import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  duration: number;
  onTimeUp: () => void;
  isActive: boolean;
  className?: string;
}

export const Timer: React.FC<TimerProps> = ({ duration, onTimeUp, isActive, className = '' }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const intervalRef = useRef<number | null>(null);
  const onTimeUpRef = useRef(onTimeUp);
  const isMountedRef = useRef(true);

  // Keep onTimeUp ref updated
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);

  const handleTimeUp = useCallback(() => {
    if (!isMountedRef.current) return;
    console.log('⏰ Timer expired');
    onTimeUpRef.current();
  }, []);

  const clearCurrentInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Clear any existing interval
    clearCurrentInterval();

    if (!isActive || !isMountedRef.current) {
      console.log('⏸️ Timer paused or component unmounted');
      return;
    }

    console.log('▶️ Timer started with duration:', duration);

    intervalRef.current = window.setInterval(() => {
      if (!isMountedRef.current) {
        clearCurrentInterval();
        return;
      }

      setTimeLeft((prev) => {
        const newTime = prev - 1;
        console.log('⏲️ Timer tick:', newTime);
        
        if (newTime <= 0) {
          // Clear interval before calling onTimeUp to prevent race conditions
          clearCurrentInterval();
          // Use setTimeout to avoid calling handleTimeUp during render
          window.setTimeout(() => {
            if (isMountedRef.current) {
              handleTimeUp();
            }
          }, 0);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    // Cleanup function
    return () => {
      clearCurrentInterval();
    };
  }, [isActive, duration, handleTimeUp, clearCurrentInterval]);

  const percentage = Math.max(0, (timeLeft / duration) * 100);
  const isUrgent = timeLeft <= 5;
  const isCritical = timeLeft <= 3;

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-center gap-2 mb-2">
        <Clock className={`w-5 h-5 ${isCritical ? 'text-red-500 animate-bounce' : isUrgent ? 'text-red-400' : 'text-white'}`} />
        <span className={`text-2xl font-bold ${
          isCritical ? 'text-red-500 animate-pulse scale-110' : 
          isUrgent ? 'text-red-400 animate-pulse' : 
          'text-white'
        }`}>
          {timeLeft}s
        </span>
      </div>
      
      <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ease-linear ${
            isCritical ? 'bg-red-600 animate-pulse' :
            isUrgent ? 'bg-red-500' : 
            'bg-green-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {isUrgent && (
        <div className="text-center mt-2">
          <span className={`text-sm font-bold ${isCritical ? 'text-red-500 animate-bounce' : 'text-red-400'}`}>
            {isCritical ? 'TIME\'S ALMOST UP!' : 'Hurry up!'}
          </span>
        </div>
      )}
    </div>
  );
};