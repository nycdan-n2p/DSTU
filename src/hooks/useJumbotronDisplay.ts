import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Player, GameSession } from '../types/game';
import { useRealtimeSync } from './useRealtimeSync';

export const useJumbotronDisplay = (sessionId?: string) => {
  const [session, setSession] = useState<GameSession | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Handle realtime state updates (READ-ONLY)
  const handleStateUpdate = useCallback((gameState: any) => {
    if (!isMountedRef.current) return;
    
    console.log('📺 Jumbotron receiving state update:', gameState);
    
    // Update session state (read-only)
    setSession(prev => prev ? {
      ...prev,
      current_phase: gameState.phase,
      current_question: gameState.currentQuestionIndex,
      question_start_time: gameState.questionStartTime,
      current_question_options_shuffled: gameState.shuffledOptions
    } : null);
    
    console.log('📺 Jumbotron state updated');
  }, []);

  // Handle realtime player updates (READ-ONLY)
  const handlePlayerJoin = useCallback((player: any) => {
    if (!isMountedRef.current) return;
    
    console.log('📺 Jumbotron saw player join:', player);
    setPlayers(prev => {
      const existingIndex = prev.findIndex(p => p.id === player.id);
      if (existingIndex === -1) {
        return [...prev, player as Player].sort((a, b) => (b.score || 0) - (a.score || 0));
      }
      return prev.map(p => p.id === player.id ? { ...p, ...player } : p)
        .sort((a, b) => (b.score || 0) - (a.score || 0));
    });
  }, []);

  const handlePlayerUpdate = useCallback((player: any) => {
    if (!isMountedRef.current) return;
    
    console.log('📺 Jumbotron saw player update:', player);
    setPlayers(prev => {
      const updatedPlayers = prev.map(p => 
        p.id === player.id ? { ...p, ...player } : p
      );
      return updatedPlayers.sort((a, b) => (b.score || 0) - (a.score || 0));
    });
  }, []);

  const handlePlayerLeave = useCallback((playerId: string) => {
    if (!isMountedRef.current) return;
    
    console.log('📺 Jumbotron saw player leave:', playerId);
    setPlayers(prev => prev.filter(p => p.id !== playerId));
  }, []);

  // Initialize realtime sync (READ-ONLY)
  const {
    isConnected,
    isHealthy,
    fallbackPolling,
  } = useRealtimeSync({
    sessionId: sessionId || '',
    onStateUpdate: handleStateUpdate,
    onPlayerJoin: handlePlayerJoin,
    onPlayerUpdate: handlePlayerUpdate,
    onPlayerLeave: handlePlayerLeave,
    enableTelemetry: false // Disable telemetry for jumbotron
  });

  // Load initial data (READ-ONLY)
  const loadInitialData = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      console.log('📺 Jumbotron loading data for session:', sessionId);
      
      // Fetch session (READ-ONLY)
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        console.error('❌ Jumbotron: Session not found:', sessionError);
        if (isMountedRef.current) {
          setError('Game session not found');
        }
        return;
      }

      // Fetch players (READ-ONLY)
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', sessionId)
        .order('score', { ascending: false });

      if (playersError) {
        console.error('❌ Jumbotron: Failed to load players:', playersError);
        if (isMountedRef.current) {
          setError('Failed to load players');
        }
        return;
      }

      if (isMountedRef.current) {
        setSession(sessionData);
        setPlayers(playersData || []);
        setError(null);
        console.log('✅ Jumbotron data loaded:', { 
          sessionId: sessionData.id,
          sessionPhase: sessionData.current_phase,
          sessionQuestion: sessionData.current_question,
          playersCount: playersData?.length || 0
        });
      }
    } catch (err) {
      console.error('❌ Jumbotron error loading data:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load session');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [sessionId]);

  // Initialize data loading
  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    loadInitialData();
  }, [sessionId, loadInitialData]);

  // Get question results (READ-ONLY)
  const getQuestionResults = useCallback(async (questionIndex: number) => {
    if (!sessionId) return null;

    try {
      console.log('📺 Jumbotron getting results for question:', questionIndex);
      
      const { data: answers, error } = await supabase
        .from('player_answers')
        .select(`
          *,
          players!inner (
            id,
            name,
            score
          )
        `)
        .eq('session_id', sessionId)
        .eq('question_index', questionIndex)
        .order('response_time', { ascending: true });

      if (error) {
        console.error('❌ Jumbotron: Failed to get question results:', error);
        return null;
      }

      // Process results
      const correct = answers?.filter(a => a.is_correct) || [];
      const wrong = answers?.filter(a => !a.is_correct) || [];
      const fastest = answers && answers.length > 0 ? answers[0] : null;
      const slowest = answers && answers.length > 0 ? answers[answers.length - 1] : null;

      const results = {
        correct,
        wrong,
        fastest,
        slowest
      };

      console.log('✅ Jumbotron question results:', results);
      return results;
    } catch (err) {
      console.error('❌ Jumbotron error getting question results:', err);
      return null;
    }
  }, [sessionId]);

  // Load custom sponsors (READ-ONLY)
  const loadCustomSponsors = useCallback(async () => {
    if (!sessionId) return [];

    try {
      console.log('📺 Jumbotron loading sponsors for session:', sessionId);
      
      const { data, error } = await supabase
        .from('custom_sponsors')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Jumbotron: Failed to load custom sponsors:', error);
        return [];
      }

      console.log('✅ Jumbotron sponsors loaded:', data?.length);
      return data || [];
    } catch (err) {
      console.error('❌ Jumbotron error loading sponsors:', err);
      return [];
    }
  }, [sessionId]);

  return {
    session,
    players,
    loading,
    error,
    // Realtime sync status
    isConnected,
    isHealthy,
    fallbackPolling,
    // READ-ONLY functions only
    getQuestionResults,
    loadCustomSponsors
  };
};