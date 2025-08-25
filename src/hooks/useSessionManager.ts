import { useCallback } from 'react';

export const useSessionManager = () => {
  const clearAllSessionData = useCallback(() => {
    console.log('🧹 Clearing all session data');
    
    // Clear localStorage
    const keysToRemove = ['host_id', 'player_id', 'player_name', 'session_id'];
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    console.log('✅ Session data cleared');
  }, []);

  const forceNewSession = useCallback(() => {
    console.log('🔄 Forcing new session');
    clearAllSessionData();
    
    // Add a timestamp to force new session
    localStorage.setItem('session_reset_time', Date.now().toString());
    
    // Reload the page to start fresh
    window.location.reload();
  }, [clearAllSessionData]);

  const isValidSession = useCallback((sessionId?: string) => {
    if (!sessionId) return false;
    
    // Check if session was recently reset
    const resetTime = localStorage.getItem('session_reset_time');
    if (resetTime) {
      const timeSinceReset = Date.now() - parseInt(resetTime);
      // If reset was less than 5 seconds ago, consider session invalid
      if (timeSinceReset < 5000) {
        return false;
      }
    }
    
    return true;
  }, []);

  const startNewQuiz = useCallback(() => {
    console.log('🎮 Starting new quiz session');
    clearAllSessionData();
    
    // Navigate to home page
    window.location.href = '/';
  }, [clearAllSessionData]);

  return {
    clearAllSessionData,
    forceNewSession,
    isValidSession,
    startNewQuiz
  };
};