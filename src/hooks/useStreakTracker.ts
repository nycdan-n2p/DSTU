import { useState, useCallback } from 'react';

interface PlayerStreak {
  playerId: string;
  currentStreak: number;
  maxStreak: number;
  lastAnswerCorrect: boolean;
}

export const useStreakTracker = () => {
  const [playerStreaks, setPlayerStreaks] = useState<Map<string, PlayerStreak>>(new Map());

  const updateStreak = useCallback((playerId: string, isCorrect: boolean) => {
    setPlayerStreaks(prev => {
      const newMap = new Map(prev);
      const currentStreak = newMap.get(playerId) || {
        playerId,
        currentStreak: 0,
        maxStreak: 0,
        lastAnswerCorrect: false
      };

      if (isCorrect) {
        const newCurrentStreak = currentStreak.currentStreak + 1;
        const newMaxStreak = Math.max(currentStreak.maxStreak, newCurrentStreak);
        
        newMap.set(playerId, {
          ...currentStreak,
          currentStreak: newCurrentStreak,
          maxStreak: newMaxStreak,
          lastAnswerCorrect: true
        });
      } else {
        newMap.set(playerId, {
          ...currentStreak,
          currentStreak: 0,
          lastAnswerCorrect: false
        });
      }

      return newMap;
    });
  }, []);

  const getPlayerStreak = useCallback((playerId: string): PlayerStreak | null => {
    return playerStreaks.get(playerId) || null;
  }, [playerStreaks]);

  const getAllStreaks = useCallback((): PlayerStreak[] => {
    return Array.from(playerStreaks.values());
  }, [playerStreaks]);

  const resetStreaks = useCallback(() => {
    setPlayerStreaks(new Map());
  }, []);

  return {
    updateStreak,
    getPlayerStreak,
    getAllStreaks,
    resetStreaks
  };
};