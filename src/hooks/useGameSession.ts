import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Player, GameSession, PlayerAnswer } from '../types/game';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeSync } from './useRealtimeSync';

export const useGameSession = (sessionId?: string) => {
  const { user } = useAuth();
  const [session, setSession] = useState<GameSession | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const lastLoadedQuestionRef = useRef<number>(-1);
  const isLoadingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const versionRef = useRef<number>(0);

  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Handle realtime state updates
  const handleStateUpdate = useCallback((gameState: any) => {
    if (!isMountedRef.current) return;
    
    console.log('🔄 Handling realtime state update:', gameState);
    
    // Update session state
    setSession(prev => prev ? {
      ...prev,
      current_phase: gameState.phase,
      current_question: gameState.currentQuestionIndex,
      question_start_time: gameState.questionStartTime,
      current_question_options_shuffled: gameState.shuffledOptions
    } : null);
    
    // Update version
    versionRef.current = gameState.version;
    
    console.log('✅ Session state updated from realtime sync');
  }, []);

  // Reload players data
  const reloadPlayers = useCallback(async () => {
    if (!sessionId) return;

    try {
      console.log('🔄 Reloading players data');
      
      const { data: playersData, error } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', sessionId)
        .order('score', { ascending: false });

      if (error) {
        console.error('❌ Failed to reload players:', error);
        return;
      }

      if (isMountedRef.current) {
        setPlayers(playersData || []);
        console.log('✅ Players reloaded:', {
          count: playersData?.length || 0,
          players: playersData?.map(p => ({
            id: p.id,
            name: p.name,
            score: p.score,
            currentPhase: p.current_phase,
            hasSubmitted: p.has_submitted
          })) || []
        });
      }
    } catch (err) {
      console.error('❌ Error reloading players:', err);
    }
  }, [sessionId]);

  // Handle realtime player updates
  const handlePlayerJoin = useCallback((player: any) => {
    if (!isMountedRef.current) return;
    
    console.log('👋 Realtime player join:', player);
    setPlayers(prev => {
      const existingIndex = prev.findIndex(p => p.id === player.id);
      if (existingIndex === -1) {
        console.log('✅ Adding new player to list:', player.name);
        return [...prev, player as Player].sort((a, b) => (b.score || 0) - (a.score || 0));
      } else {
        console.log('🔄 Player already exists, updating:', player.name);
        const updated = prev.map(p => p.id === player.id ? { ...p, ...player } : p);
        return updated.sort((a, b) => (b.score || 0) - (a.score || 0));
      }
    });
    
    // Also trigger a full player reload to ensure we have the latest data
    setTimeout(() => {
      if (isMountedRef.current) {
        reloadPlayers();
      }
    }, 500);
  }, [reloadPlayers]);

  const handlePlayerUpdate = useCallback((player: any) => {
    if (!isMountedRef.current) return;
    
    console.log('🔄 Realtime player update:', player);
    setPlayers(prev => {
      const updatedPlayers = prev.map(p => 
        p.id === player.id ? { ...p, ...player } : p
      );
      return updatedPlayers.sort((a, b) => (b.score || 0) - (a.score || 0));
    });
  }, []);

  const handlePlayerLeave = useCallback((playerId: string) => {
    if (!isMountedRef.current) return;
    
    console.log('👋 Realtime player leave:', playerId);
    setPlayers(prev => prev.filter(p => p.id !== playerId));
  }, []);

  // Initialize realtime sync
  const {
    isConnected,
    isHealthy,
    fallbackPolling,
    broadcastStateUpdate,
    broadcastPlayerJoin,
    getTelemetryData
  } = useRealtimeSync({
    sessionId: sessionId || '',
    onStateUpdate: handleStateUpdate,
    onPlayerJoin: handlePlayerJoin,
    onPlayerUpdate: handlePlayerUpdate,
    onPlayerLeave: handlePlayerLeave,
    enableTelemetry: true
  });

  // Clear polling interval helper
  const clearPollingInterval = useCallback(() => {
    if (pollIntervalRef.current !== null) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Load initial session and players data
  const loadInitialData = useCallback(async () => {
    if (!sessionId || isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    
    try {
      console.log('🔄 Loading initial data for:', sessionId);
      
      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        console.error('❌ Session not found:', sessionError);
        if (isMountedRef.current) {
          setError('Game session not found');
        }
        return;
      }

      // Fetch players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', sessionId)
        .order('score', { ascending: false });

      if (playersError) {
        console.error('❌ Failed to load players:', playersError);
        if (isMountedRef.current) {
          setError('Failed to load players');
        }
        return;
      }

      if (isMountedRef.current) {
        setSession(sessionData);
        setPlayers(playersData || []);
        setError(null);
        versionRef.current = sessionData.version || Date.now();
        console.log('✅ Initial data loaded:', { 
          sessionId: sessionData.id,
          sessionPhase: sessionData.current_phase,
          sessionQuestion: sessionData.current_question,
          playersCount: playersData?.length || 0,
          version: versionRef.current
        });
      }
    } catch (err) {
      console.error('❌ Error loading initial data:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load session');
      }
    } finally {
      isLoadingRef.current = false;
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

  // Create a new game session (host)
  const createSession = useCallback(async (title?: string): Promise<string> => {
    if (!user) {
      throw new Error('Must be logged in to create a session');
    }
    
    try {
      console.log('🎮 Creating new game session...');
      const hostId = crypto.randomUUID();
      
      const { data, error } = await supabase
        .from('game_sessions')
        .insert({
          user_id: user.id,
          host_id: hostId,
          current_question: 0,
          current_phase: 'waiting',
          title: title || 'Untitled Quiz'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Database error creating session:', error);
        throw new Error(`Failed to create session: ${error.message}`);
      }

      const newSession: GameSession = {
        id: data.id,
        host_id: data.host_id,
        current_question: data.current_question,
        current_phase: data.current_phase,
        question_start_time: data.question_start_time,
        created_at: data.created_at,
        players: []
      };

      if (isMountedRef.current) {
        setSession(newSession);
      }
      
      // Broadcast initial state
      if (broadcastStateUpdate) {
        await broadcastStateUpdate({
          phase: 'waiting',
          currentQuestionIndex: 0,
          playersOnline: 0
        });
      }
      
      localStorage.setItem('host_id', hostId);
      console.log('✅ Session created successfully:', data.id);
      return data.id;
    } catch (err) {
      console.error('❌ Failed to create session:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to create session');
      }
      throw err;
    }
  }, [user]);

  // Join an existing session (player)
  const joinSession = useCallback(async (sessionId: string, playerName: string): Promise<string> => {
    try {
      console.log('🔍 Player joining session:', { sessionId, playerName });
      
      // First check if session exists
      const { data: sessionCheck, error: sessionError } = await supabase
        .from('game_sessions')
        .select('id, current_phase')
        .eq('id', sessionId)
        .single();

      if (sessionError || !sessionCheck) {
        console.error('❌ Session not found:', sessionError);
        throw new Error('Game session not found. Please check the QR code or link.');
      }

      console.log('✅ Session found:', sessionCheck);

      // Check if player name already exists in this session
      const { data: existingPlayer, error: playerCheckError } = await supabase
        .from('players')
        .select('id, name')
        .eq('session_id', sessionId)
        .eq('name', playerName)
        .maybeSingle();

      if (playerCheckError) {
        console.error('⚠️ Error checking existing player:', playerCheckError);
      }

      if (existingPlayer) {
        console.log('🔄 Player already exists, using existing ID:', existingPlayer.id);
        localStorage.setItem('player_id', existingPlayer.id);
        localStorage.setItem('player_name', playerName);
        return existingPlayer.id;
      }

      console.log('🆕 Creating new player:', playerName);

      const playerId = crypto.randomUUID();
      
      const { data: newPlayer, error: insertError } = await supabase
        .from('players')
        .insert({
          id: playerId,
          session_id: sessionId,
          name: playerName,
          score: 0,
          current_phase: 'waiting',
          current_question: 0,
          has_submitted: false,
          last_updated: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Failed to join session:', insertError);
        throw new Error(`Failed to join session: ${insertError.message}`);
      }

      console.log('✅ Player joined successfully - Database response:', {
        playerId: newPlayer.id,
        playerName: newPlayer.name,
        sessionId: newPlayer.session_id,
        score: newPlayer.score,
        joinedAt: newPlayer.joined_at,
        fullPlayerData: newPlayer
      });

      localStorage.setItem('player_id', playerId);
      localStorage.setItem('player_name', playerName);
      
      // Broadcast player join
      if (broadcastPlayerJoin) {
        await broadcastPlayerJoin(playerId, playerName);
      }
      
      return playerId;
    } catch (err) {
      console.error('❌ Join session error:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to join session');
      }
      throw err;
    }
  }, []);

  // Submit answer with comprehensive duplicate prevention
  const submitAnswer = useCallback(async (
    playerId: string,
    questionIndex: number,
    answer: string | number,
    isCorrect: boolean,
    responseTime: number
  ) => {
    try {
      console.log('📝 Submitting answer:', { playerId, questionIndex, answer, isCorrect, responseTime });
      
      // Check for existing answer with comprehensive query
      const { data: existingAnswers, error: checkError } = await supabase
        .from('player_answers')
        .select('id, answered_at')
        .eq('player_id', playerId)
        .eq('session_id', sessionId!)
        .eq('question_index', questionIndex);

      if (checkError) {
        console.error('⚠️ Error checking existing answer:', checkError);
        throw new Error(`Database error: ${checkError.message}`);
      }

      if (existingAnswers && existingAnswers.length > 0) {
        console.log('⚠️ Answer already exists for this question:', existingAnswers);
        throw new Error('You have already submitted an answer for this question.');
      }

      // Enhanced speed-based scoring system
      let pointsEarned = 0;
      if (isCorrect) {
        const basePoints = 1000;
        const timePenalty = Math.floor(responseTime / 1000) * 10;
        pointsEarned = Math.max(200, basePoints - timePenalty);
        
        console.log('🏆 Speed-based scoring:', {
          responseTimeMs: responseTime,
          responseTimeSec: Math.floor(responseTime / 1000),
          timePenalty,
          pointsEarned
        });
      }

      // Atomic transaction: Insert answer and update score in one operation
      console.log('🔧 Calling RPC function with params:', {
        p_player_id: playerId,
        p_session_id: sessionId!,
        p_question_index: questionIndex,
        p_answer: answer.toString(),
        p_is_correct: isCorrect,
        p_response_time: responseTime,
        p_points_earned: pointsEarned
      });
      
      const { error: insertError } = await supabase.rpc('submit_player_answer', {
        p_player_id: playerId,
        p_session_id: sessionId!,
        p_question_index: questionIndex,
        p_answer: answer.toString(),
        p_is_correct: isCorrect,
        p_response_time: responseTime,
        p_points_earned: pointsEarned
      });

      if (insertError) {
        console.error('❌ Failed to submit answer via RPC:', insertError);
        console.error('❌ Error details:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        });
        
        // Check if it's a duplicate key error (answer already exists)
        if (insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
          throw new Error('Answer already submitted for this question.');
        }
        
        // ✅ FALLBACK: Try direct insertion if RPC fails
        console.log('🔄 RPC failed, trying direct insertion as fallback...');
        
        try {
          // Insert answer directly
          const { error: directInsertError } = await supabase
            .from('player_answers')
            .insert({
              player_id: playerId,
              session_id: sessionId!,
              question_index: questionIndex,
              answer: answer.toString(),
              is_correct: isCorrect,
              response_time: responseTime,
              points_earned: pointsEarned,
              answered_at: new Date().toISOString()
            });
          
          if (directInsertError) {
            console.error('❌ Direct insertion also failed:', directInsertError);
            throw new Error(`Failed to submit answer: ${directInsertError.message}`);
          }
          
          // Update player score separately
          const { error: scoreUpdateError } = await supabase
            .from('players')
            .update({
              has_submitted: true,
              last_updated: new Date().toISOString()
            })
            .eq('id', playerId);
          
          // Update score with increment (we'll do this in a separate query)
          if (!scoreUpdateError) {
            const { error: scoreIncrementError } = await supabase
              .from('players')
              .update({
                score: pointsEarned
              })
              .eq('id', playerId);
            
            if (scoreIncrementError) {
              console.error('⚠️ Score increment failed:', scoreIncrementError);
            }
          }
          
          if (scoreUpdateError) {
            console.error('⚠️ Score update failed but answer was saved:', scoreUpdateError);
            // Don't throw here - the answer was saved successfully
          }
          
          console.log('✅ Answer submitted successfully via fallback method');
          
        } catch (fallbackError) {
          console.error('❌ Fallback method also failed:', fallbackError);
          throw new Error(`Failed to submit answer: ${insertError.message} (fallback also failed)`);
        }
      }
      
      console.log('✅ Answer submitted successfully');
    } catch (err) {
      console.error('❌ Failed to submit answer:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to submit answer');
      }
      throw err;
    }
  }, [sessionId]);

  // Clean up stale players from previous sessions
  const cleanupStalePlayers = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      console.log('🧹 Cleaning up stale players...');
      
      // Remove players that joined more than 1 hour ago
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: stalePlayers, error: selectError } = await supabase
        .from('players')
        .select('id, name, joined_at')
        .eq('session_id', sessionId)
        .lt('joined_at', oneHourAgo);
      
      if (selectError) {
        console.error('⚠️ Error finding stale players:', selectError);
        return;
      }
      
      if (stalePlayers && stalePlayers.length > 0) {
        console.log('🗑️ Found stale players to remove:', stalePlayers.map(p => p.name));
        
        const { error: deleteError } = await supabase
          .from('players')
          .delete()
          .in('id', stalePlayers.map(p => p.id));
          
        if (deleteError) {
          console.error('❌ Failed to delete stale players:', deleteError);
        } else {
          console.log('✅ Stale players cleaned up successfully');
          
          // Update local state to remove stale players
          if (isMountedRef.current) {
            setPlayers(prev => prev.filter(p => !stalePlayers.some(sp => sp.id === p.id)));
          }
        }
      } else {
        console.log('✅ No stale players found');
      }
    } catch (err) {
      console.error('❌ Error cleaning up stale players:', err);
    }
  }, [sessionId]);

  // Clear all players when starting fresh game
  const clearAllPlayers = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      console.log('🧹 Clearing all players for fresh start...');
      
      const { error: deleteError } = await supabase
        .from('players')
        .delete()
        .eq('session_id', sessionId);
        
      if (deleteError) {
        console.error('❌ Failed to clear all players:', deleteError);
      } else {
        console.log('✅ All players cleared successfully');
        
        // Update local state
        if (isMountedRef.current) {
          setPlayers([]);
        }
      }
    } catch (err) {
      console.error('❌ Error clearing all players:', err);
    }
  }, [sessionId]);

  // Update session phase (host only)
  const updateSessionPhase = useCallback(async (
    phase: GameSession['current_phase'],
    questionIndex?: number,
    questionStartTime?: string,
    shuffledOptions?: string[] | null,
    numSponsorBreaks?: number
  ) => {
    if (!session) return;

    try {
      console.log('🔄 Updating session phase:', { phase, questionIndex, questionStartTime, shuffledOptions });
      
      // Clean up stale players when starting a new game phase
      if (phase === 'intro') {
        // For intro phase, clear all players to start fresh
        await clearAllPlayers();
      } else if (phase === 'question') {
        // For question phase, just clean up old stale players
        await cleanupStalePlayers();
      }
      
      const updates: any = { current_phase: phase };
      if (questionIndex !== undefined) updates.current_question = questionIndex;
      if (questionStartTime !== undefined) updates.question_start_time = questionStartTime;
      if (shuffledOptions !== undefined) updates.current_question_options_shuffled = shuffledOptions;
      if (numSponsorBreaks !== undefined) updates.num_sponsor_breaks = numSponsorBreaks;

      // Primary attempt including all fields
      let { data, error } = await supabase
        .from('game_sessions')
        .update(updates)
        .eq('id', session.id)
        .select()
        .single();

      // Fallback: retry without optional columns that may not exist in DB
      if (error) {
        const msg = error?.message || '';
        console.warn('⚠️ Session update failed, attempting reduced payload:', msg);

        // Build a reduced update omitting potentially missing columns
        const reducedUpdates: any = { current_phase: updates.current_phase };
        if (updates.current_question !== undefined) reducedUpdates.current_question = updates.current_question;
        if (updates.question_start_time !== undefined) reducedUpdates.question_start_time = updates.question_start_time;
        // Intentionally omit current_question_options_shuffled and num_sponsor_breaks

        const retry = await supabase
          .from('game_sessions')
          .update(reducedUpdates)
          .eq('id', session.id)
          .select()
          .single();

        data = retry.data as any;
        error = retry.error as any;

        if (error) {
          console.error('❌ Reduced payload update also failed:', error);
          throw new Error(`Failed to update session: ${error.message}`);
        } else {
          console.warn('✅ Session updated with reduced payload (schema may be missing optional columns).');
        }
      }
      
      console.log('✅ Session updated successfully:', data);

      // Update local session state immediately
      if (isMountedRef.current) {
        setSession(prev => prev ? {
          ...prev,
          ...data
        } : null);
        
        // Broadcast state update
        if (broadcastStateUpdate) {
          await broadcastStateUpdate({
            phase: data.current_phase,
            currentQuestionIndex: data.current_question,
            questionStartTime: data.question_start_time,
            shuffledOptions: data.current_question_options_shuffled,
            playersOnline: players.length
          });
        }
      }
    } catch (err) {
      console.error('❌ Failed to update session phase:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to update session phase');
      }
      throw err;
    }
  }, [session]);

  // Update individual player session
  const updatePlayerSession = useCallback(async (
    playerId: string,
    updates: {
      phase?: string;
      current_question?: number;
      question_start_time?: string;
      has_submitted?: boolean;
    }
  ) => {
    try {
      console.log('👤 Updating player session:', { playerId, updates });
      
      const playerUpdates: any = { last_updated: new Date().toISOString() };
      if (updates.phase !== undefined) playerUpdates.current_phase = updates.phase;
      if (updates.current_question !== undefined) playerUpdates.current_question = updates.current_question;
      if (updates.question_start_time !== undefined) playerUpdates.question_start_time = updates.question_start_time;
      if (updates.has_submitted !== undefined) playerUpdates.has_submitted = updates.has_submitted;

      let error;
      try {
        const result = await supabase
          .from('players')
          .update(playerUpdates)
          .eq('id', playerId);
        error = result.error;
      } catch (networkError) {
        console.error('❌ Network error updating player session:', networkError);
        throw new Error('Network connection failed. Unable to update player status.');
      }

      if (error) {
        console.error('❌ Failed to update player session:', error);
        
        if (error.message?.includes('Failed to fetch')) {
          throw new Error('Failed to update player: Network connection lost. Please check your internet connection.');
        } else {
          throw new Error(`Failed to update player: ${error.message}`);
        }
      }
      
      console.log('✅ Player session updated successfully');
    } catch (err) {
      console.error('❌ Error updating player session:', err);
      throw err;
    }
  }, []);

  // Update all player sessions
  const updateAllPlayerSessions = useCallback(async (
    playerIds: string[],
    updates: {
      phase?: string;
      current_question?: number;
      question_start_time?: string;
      has_submitted?: boolean;
    }
  ) => {
    try {
      console.log('👥 Updating all player sessions:', { playerIds, updates });
      
      const playerUpdates: any = { last_updated: new Date().toISOString() };
      if (updates.phase !== undefined) playerUpdates.current_phase = updates.phase;
      if (updates.current_question !== undefined) playerUpdates.current_question = updates.current_question;
      if (updates.question_start_time !== undefined) playerUpdates.question_start_time = updates.question_start_time;
      if (updates.has_submitted !== undefined) playerUpdates.has_submitted = updates.has_submitted;

      const { error } = await supabase
        .from('players')
        .update(playerUpdates)
        .in('id', playerIds);

      if (error) {
        console.error('❌ Failed to update player sessions:', error);
        throw new Error(`Failed to update players: ${error.message}`);
      }
      
      console.log('✅ All player sessions updated successfully');
    } catch (err) {
      console.error('❌ Error updating player sessions:', err);
      throw err;
    }
  }, []);

  // Get question results
  const getQuestionResults = useCallback(async (questionIndex: number) => {
    if (!sessionId) return null;

    try {
      console.log('📊 Getting results for question:', questionIndex);
      
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
        console.error('❌ Failed to get question results:', error);
        throw new Error(`Failed to get results: ${error.message}`);
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

      console.log('✅ Question results:', results);
      return results;
    } catch (err) {
      console.error('❌ Error getting question results:', err);
      throw err;
    }
  }, [sessionId]);

  // Load custom sponsors
  const loadCustomSponsors = useCallback(async () => {
    if (!sessionId) return [];

    try {
      console.log('📺 Loading custom sponsors for session:', sessionId);
      
      const { data, error } = await supabase
        .from('custom_sponsors')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Failed to load custom sponsors:', error);
        return [];
      }

      console.log('✅ Custom sponsors loaded:', data?.length);
      return data || [];
    } catch (err) {
      console.error('❌ Error loading custom sponsors:', err);
      return [];
    }
  }, [sessionId]);

  // Add custom sponsor
  const addCustomSponsor = useCallback(async (text: string, imageUrl?: string | null) => {
    if (!sessionId || sessionId.trim() === '') {
      throw new Error('Invalid session ID. Please refresh the page and try again.');
    }

    try {
      console.log('📺 Adding custom sponsor:', { text, imageUrl });
      
      const { data, error } = await supabase
        .from('custom_sponsors')
        .insert({
          session_id: sessionId,
          text: text.trim(),
          image_url: imageUrl
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to add custom sponsor:', error);
        throw new Error(`Failed to add sponsor: ${error.message}`);
      }

      console.log('✅ Custom sponsor added successfully:', data);
      return data;
    } catch (err) {
      console.error('❌ Error adding custom sponsor:', err);
      throw err;
    }
  }, [sessionId]);

  // Delete custom sponsor
  const deleteCustomSponsor = useCallback(async (sponsorId: string) => {
    try {
      console.log('🗑️ Deleting custom sponsor:', sponsorId);
      
      const { error } = await supabase
        .from('custom_sponsors')
        .delete()
        .eq('id', sponsorId);

      if (error) {
        console.error('❌ Failed to delete custom sponsor:', error);
        throw new Error(`Failed to delete sponsor: ${error.message}`);
      }

      console.log('✅ Custom sponsor deleted successfully');
    } catch (err) {
      console.error('❌ Error deleting custom sponsor:', err);
      throw err;
    }
  }, []);

  // Return all hook values
  return {
    session,
    players,
    loading,
    error,
    // Realtime sync status
    isConnected,
    isHealthy,
    fallbackPolling,
    // Original functions
    createSession,
    joinSession,
    submitAnswer,
    updateSessionPhase,
    updatePlayerSession,
    updateAllPlayerSessions,
    getQuestionResults,
    reloadPlayers,
    loadCustomSponsors,
    addCustomSponsor,
    deleteCustomSponsor,
    clearPollingInterval,
    cleanupStalePlayers,
    clearAllPlayers,
    // New realtime functions
    broadcastStateUpdate,
    broadcastPlayerJoin,
    getTelemetryData
  };
};
