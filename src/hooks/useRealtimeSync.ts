import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';

interface GameState {
  sessionId: string;
  phase: string;
  currentQuestionId: string | null;
  currentQuestionIndex: number;
  version: number;
  updatedAt: number;
  playersOnline: number;
  questionStartTime?: string;
  shuffledOptions?: string[];
}

interface RealtimeSyncOptions {
  sessionId: string;
  onStateUpdate: (state: GameState) => void;
  onPlayerJoin?: (player: any) => void;
  onPlayerUpdate?: (player: any) => void;
  onPlayerLeave?: (playerId: string) => void;
  enableTelemetry?: boolean;
}

interface TelemetryData {
  sessionId: string;
  version: number;
  latencyMs: number;
  eventType: string;
  timestamp: number;
}

export const useRealtimeSync = ({
  sessionId,
  onStateUpdate,
  onPlayerJoin,
  onPlayerUpdate,
  onPlayerLeave,
  enableTelemetry = true
}: RealtimeSyncOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isHealthy, setIsHealthy] = useState(true);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [localVersion, setLocalVersion] = useState(0);
  const [fallbackPolling, setFallbackPolling] = useState(false);
  
  const channelRef = useRef<any>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const fallbackIntervalRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const lastHeartbeatRef = useRef<number>(Date.now());
  const isMountedRef = useRef<boolean>(true);
  const telemetryRef = useRef<TelemetryData[]>([]);
  const isReconnectingRef = useRef<boolean>(false);
  const connectionStableRef = useRef<boolean>(false);

  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Telemetry logging
  const logTelemetry = useCallback((data: Omit<TelemetryData, 'timestamp'>) => {
    if (!enableTelemetry) return;
    
    const telemetryEntry: TelemetryData = {
      ...data,
      timestamp: Date.now()
    };
    
    telemetryRef.current.push(telemetryEntry);
    
    // Keep only last 100 entries
    if (telemetryRef.current.length > 100) {
      telemetryRef.current = telemetryRef.current.slice(-100);
    }
    
    console.log('📊 Telemetry:', telemetryEntry);
  }, [enableTelemetry]);

  // Clear intervals helper
  const clearIntervals = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      window.clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (fallbackIntervalRef.current) {
      window.clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Fetch current state from API
  const fetchCurrentState = useCallback(async (): Promise<GameState | null> => {
    try {
      console.log('🔄 Fetching current state for session:', sessionId);
      
      // Check if Supabase is properly configured
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.error('❌ Supabase environment variables not configured');
        throw new Error('Supabase configuration missing. Please check your .env file.');
      }
      
      let sessionData, sessionError;
      try {
        const result = await supabase
          .from('game_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();
        sessionData = result.data;
        sessionError = result.error;
      } catch (networkError) {
        console.error('❌ Network error fetching session:', networkError);
        throw new Error('Network connection failed. Please check your internet connection and try again.');
      }

      if (sessionError) {
        console.error('❌ Failed to fetch session state:', {
          error: sessionError,
          message: sessionError.message,
          details: sessionError.details,
          hint: sessionError.hint,
          code: sessionError.code
        });
        
        if (sessionError.message?.includes('Failed to fetch')) {
          throw new Error('Unable to connect to the game server. Please check your internet connection and refresh the page.');
        } else {
          throw new Error(`Database error: ${sessionError.message}`);
        }
      }

      let playersData, playersError;
      try {
        const result = await supabase
          .from('players')
          .select('*')
          .eq('session_id', sessionId);
        playersData = result.data;
        playersError = result.error;
      } catch (networkError) {
        console.error('❌ Network error fetching players:', networkError);
        // Don't throw here, just log the error and continue with empty players
        playersData = [];
        playersError = null;
      }

      if (playersError) {
        console.error('❌ Failed to fetch players:', playersError);
      }

      // Trigger player updates if we have onPlayerJoin callback
      if (playersData && onPlayerJoin) {
        playersData.forEach(player => {
          // This will trigger reloading in the game session hook
          onPlayerJoin(player);
        });
      }

      const playersCount = playersData?.length || 0;

      const state: GameState = {
        sessionId: sessionData.id,
        phase: sessionData.current_phase,
        currentQuestionId: `${sessionData.current_question}`,
        currentQuestionIndex: sessionData.current_question,
        version: sessionData.version || Date.now(), // Use timestamp as version if not available
        updatedAt: new Date(sessionData.updated_at || sessionData.created_at).getTime(),
        playersOnline: playersCount,
        questionStartTime: sessionData.question_start_time,
        shuffledOptions: sessionData.current_question_options_shuffled
      };

      console.log('✅ Fetched current state:', state);
      return state;
    } catch (error) {
      console.error('❌ Error fetching current state:', error);
      return null;
    }
  }, [sessionId]);

  // Apply state update safely (idempotent)
  const applyStateSafely = useCallback((incomingState: GameState) => {
    if (!isMountedRef.current) return;

    console.log('🔄 Applying state update:', {
      incomingVersion: incomingState.version,
      localVersion,
      sessionId: incomingState.sessionId,
      phase: incomingState.phase
    });

    // Ignore if version is not newer
    if (incomingState.version <= localVersion) {
      console.log('⏭️ Ignoring state update - version not newer:', {
        incoming: incomingState.version,
        local: localVersion
      });
      return;
    }

    // Calculate latency for telemetry
    const latencyMs = Date.now() - incomingState.updatedAt;
    logTelemetry({
      sessionId: incomingState.sessionId,
      version: incomingState.version,
      latencyMs,
      eventType: 'state_update'
    });

    // Update local version
    setLocalVersion(incomingState.version);

    // Apply the state update
    onStateUpdate(incomingState);

    console.log('✅ State applied successfully:', {
      newVersion: incomingState.version,
      phase: incomingState.phase,
      latencyMs
    });
  }, [localVersion, onStateUpdate, logTelemetry]);

  // Start fallback polling
  const startFallbackPolling = useCallback(() => {
    if (fallbackIntervalRef.current || !isMountedRef.current) return;

    console.log('🔄 Starting fallback polling', {
      reason: 'Connection lost',
      isConnected,
      isHealthy,
      reconnectAttempts,
      timestamp: new Date().toISOString()
    });
    setFallbackPolling(true);

    fallbackIntervalRef.current = window.setInterval(async () => {
      if (!isMountedRef.current) return;

      try {
        const currentState = await fetchCurrentState();
        if (currentState) {
          applyStateSafely(currentState);
        }
      } catch (error) {
        console.error('❌ Fallback polling error:', error);
      }
    }, 1000); // Faster polling for quiz responsiveness

    logTelemetry({
      sessionId,
      version: localVersion,
      latencyMs: 0,
      eventType: 'fallback_polling_started'
    });
  }, [fetchCurrentState, applyStateSafely, sessionId, localVersion, logTelemetry]);

  // Stop fallback polling
  const stopFallbackPolling = useCallback(() => {
    if (fallbackIntervalRef.current) {
      window.clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
      setFallbackPolling(false);
      console.log('⏹️ Stopped fallback polling', {
        reason: 'Realtime reconnected',
        timestamp: new Date().toISOString()
      });
      
      logTelemetry({
        sessionId,
        version: localVersion,
        latencyMs: 0,
        eventType: 'fallback_polling_stopped'
      });
    }
  }, [sessionId, localVersion, logTelemetry]);

  // Heartbeat monitoring
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) return;

    heartbeatIntervalRef.current = window.setInterval(() => {
      if (!isMountedRef.current) return;

      const now = Date.now();
      const timeSinceLastHeartbeat = now - lastHeartbeatRef.current;

      // If no heartbeat for more than 40s (2 missed intervals), mark as unhealthy
      if (timeSinceLastHeartbeat > 40000) {
        console.log('💔 Socket unhealthy - no heartbeat for', timeSinceLastHeartbeat, 'ms');
        setIsHealthy(false);
        startFallbackPolling();
      }

      // Send heartbeat ping
      if (channelRef.current && isConnected) {
        try {
          channelRef.current.send({
            type: 'broadcast',
            event: 'heartbeat',
            payload: { timestamp: now }
          });
          lastHeartbeatRef.current = now;
        } catch (error) {
          console.error('❌ Heartbeat send failed:', error);
          setIsHealthy(false);
          startFallbackPolling();
        }
      }
    }, 20000); // Every 20 seconds
  }, [isConnected, startFallbackPolling]);

  // Reconnect with exponential backoff
  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current || !isMountedRef.current || isReconnectingRef.current) return;

    isReconnectingRef.current = true;
    const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    console.log(`🔄 Reconnecting in ${backoffDelay}ms (attempt ${reconnectAttempts + 1})`);

    reconnectTimeoutRef.current = window.setTimeout(() => {
      if (!isMountedRef.current) {
        isReconnectingRef.current = false;
        return;
      }

      setReconnectAttempts(prev => prev + 1);
      connectionStableRef.current = false;
      setupRealtimeChannel();
      
      // Give connection time to stabilize before allowing another reconnect
      setTimeout(() => {
        isReconnectingRef.current = false;
      }, 5000);
      
      logTelemetry({
        sessionId,
        version: localVersion,
        latencyMs: backoffDelay,
        eventType: 'reconnect_attempt'
      });
    }, backoffDelay);
  }, [reconnectAttempts, sessionId, localVersion, logTelemetry]);

  // Setup realtime channel
  const setupRealtimeChannel = useCallback(() => {
    if (channelRef.current) {
      try {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.warn('⚠️ Error cleaning up previous channel:', error);
      }
      channelRef.current = null;
    }

    console.log('🔌 Setting up simplified realtime channel for session:', sessionId);

    // Use shared read-only channel for all participants (presenter, jumbotron, players)
    const sharedChannelId = `session-${sessionId}`;
    console.log('🎮 Setting up shared game channel:', sharedChannelId);
    
    const channel = supabase
      .channel(sharedChannelId, {
        config: {
          postgres_changes: [
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'game_sessions',
              filter: `id=eq.${sessionId}`
            },
            {
              event: '*',
              schema: 'public',
              table: 'players',
              filter: `session_id=eq.${sessionId}`
            }
          ]
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_sessions',
        filter: `id=eq.${sessionId}`
      }, (payload) => {
        console.log('🎮 Game session updated:', payload);
        lastHeartbeatRef.current = Date.now();
        setIsHealthy(true);
        
        if (payload.new) {
          const state: GameState = {
            sessionId: payload.new.id,
            phase: payload.new.current_phase,
            currentQuestionId: `${payload.new.current_question}`,
            currentQuestionIndex: payload.new.current_question,
            version: payload.new.version || Date.now(),
            updatedAt: new Date(payload.new.updated_at || payload.new.created_at).getTime(),
            playersOnline: 0,
            questionStartTime: payload.new.question_start_time,
            shuffledOptions: payload.new.current_question_options_shuffled
          };
          
          applyStateSafely(state);
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public', 
        table: 'players',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        console.log('👥 Player change:', payload);
        lastHeartbeatRef.current = Date.now();
        
        if (payload.eventType === 'INSERT' && onPlayerJoin) {
          onPlayerJoin(payload.new);
        } else if (payload.eventType === 'UPDATE' && onPlayerUpdate) {
          onPlayerUpdate(payload.new);
        } else if (payload.eventType === 'DELETE' && onPlayerLeave) {
          onPlayerLeave(payload.old?.id);
        }
      })
      .subscribe((status) => {
        console.log('📡 Channel subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Game sync channel connected! Real-time updates active.');
          setIsConnected(true);
          setIsHealthy(true);
          setReconnectAttempts(0);
          isReconnectingRef.current = false;
          connectionStableRef.current = true;
          
          // Don't stop polling immediately - keep it as backup for 10 seconds
          setTimeout(() => {
            if (connectionStableRef.current && isConnected) {
              console.log('🎯 Websocket stable, reducing polling frequency');
              stopFallbackPolling();
            }
          }, 10000);
          
          logTelemetry({
            sessionId,
            version: localVersion,
            latencyMs: 0,
            eventType: 'realtime_sync_active'
          });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('❌ Channel error:', status);
          
          if (status === 'TIMED_OUT') {
            console.warn('🔍 REALTIME CONNECTION TIMEOUT TROUBLESHOOTING:');
            console.warn('1. Check if Realtime is enabled in your Supabase project:');
            console.warn('   - Go to Project Settings > API > Realtime');
            console.warn('   - Ensure "Enable Realtime" is turned ON');
            console.warn('2. Verify your database has the required tables and RLS policies');
            console.warn('3. Check if your Supabase project is active and not paused');
            console.warn('4. Ensure your network allows WebSocket connections');
            console.warn('5. Try refreshing the page or clearing browser cache');
            console.warn('📋 Current config:', {
              url: import.meta.env.VITE_SUPABASE_URL,
              keyPresent: !!import.meta.env.VITE_SUPABASE_ANON_KEY
            });
          }
          
          setIsConnected(false);
          setIsHealthy(false);
          
          // Start fallback polling immediately
          if (!fallbackPolling) {
            console.log('🔄 Starting fallback polling due to channel error');
            startFallbackPolling();
          }
          
          // Only attempt reconnect if we haven't exceeded max attempts
          if (reconnectAttempts < 5) {
            reconnect();
          } else {
            console.log('⚠️ Max reconnect attempts reached, staying in fallback mode');
          }
          
          logTelemetry({
            sessionId,
            version: localVersion,
            latencyMs: 0,
            eventType: `channel_error_${status.toLowerCase()}`
          });
        } else if (status === 'CLOSED') {
          console.log('📡 Channel closed, connection lost');
          setIsConnected(false);
          connectionStableRef.current = false;
          
          // Only start fallback polling if connection wasn't stable
          if (!connectionStableRef.current) {
            setTimeout(() => {
              if (!isMountedRef.current || isConnected) return;
              
              if (!fallbackPolling) {
                console.log('🔄 Starting fallback polling after unstable connection');
                startFallbackPolling();
              }
            }, 2000);
          }
          
          // Less aggressive reconnection - wait longer before attempting
          if (reconnectAttempts < 3 && !isReconnectingRef.current) {
            console.log('⏳ Scheduling reconnection attempt');
            setTimeout(() => {
              if (isMountedRef.current && !isConnected) {
                reconnect();
              }
            }, 5000); // Wait 5 seconds before reconnecting
          }
        }
      });

    channelRef.current = channel;
    startHeartbeat();
  }, [sessionId, applyStateSafely, onPlayerJoin, onPlayerUpdate, onPlayerLeave, startHeartbeat, stopFallbackPolling, reconnect, logTelemetry, localVersion]);

  // Initialize connection and fetch initial state
  const initialize = useCallback(async () => {
    console.log('🚀 Initializing hybrid sync for session:', sessionId);
    
    try {
      // Fetch initial state
      const initialState = await fetchCurrentState();
      if (initialState && isMountedRef.current) {
        setLocalVersion(initialState.version);
        onStateUpdate(initialState);
        console.log('✅ Initial state loaded:', initialState);
      }
      
      // Use hybrid approach: start with polling, add websocket enhancement
      console.log('🎮 Starting multi-participant game sync for session:', sessionId);
      startFallbackPolling();
      
      // Add websocket for faster updates (all participants listen to same channel)
      setTimeout(() => {
        if (isMountedRef.current) {
          console.log('🔌 Adding websocket enhancement for real-time sync');
          setupRealtimeChannel();
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Failed to initialize sync:', error);
      startFallbackPolling();
    }
  }, [sessionId, fetchCurrentState, onStateUpdate, setupRealtimeChannel, startFallbackPolling]);

  // Database-driven broadcast - triggers postgres_changes for all participants
  const broadcastStateUpdate = useCallback(async (updates: Partial<GameState>) => {
    try {
      console.log('🎮 Broadcasting game state update via database:', updates);
      
      // Database updates automatically trigger postgres_changes events
      // This reaches presenter, jumbotron, and all players simultaneously
      
      logTelemetry({
        sessionId,
        version: localVersion,
        latencyMs: 0,
        eventType: 'multi_participant_sync'
      });

      console.log('✅ Game state will sync to all participants via database triggers');
    } catch (error) {
      console.error('❌ Failed to log state update:', error);
    }
  }, [sessionId, localVersion, logTelemetry]);

  // Broadcast player join (for players)
  const broadcastPlayerJoin = useCallback(async (playerId: string, playerName: string) => {
    if (!channelRef.current || !isConnected) {
      console.warn('⚠️ Cannot broadcast player join - channel not connected');
      return;
    }

    try {
      console.log('📡 Broadcasting player join:', { playerId, playerName });

      await channelRef.current.send({
        type: 'broadcast',
        event: 'player:join',
        payload: {
          sessionId,
          playerId,
          name: playerName,
          timestamp: Date.now()
        }
      });

      logTelemetry({
        sessionId,
        version: localVersion,
        latencyMs: 0,
        eventType: 'player_join_broadcast'
      });

      console.log('✅ Player join broadcasted successfully');
    } catch (error) {
      console.error('❌ Failed to broadcast player join:', error);
    }
  }, [sessionId, localVersion, isConnected, logTelemetry]);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up realtime sync');
    
    clearIntervals();
    isReconnectingRef.current = false;
    connectionStableRef.current = false;
    
    if (channelRef.current) {
      try {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.warn('⚠️ Error during channel cleanup:', error);
      }
      channelRef.current = null;
    }
    
    setIsConnected(false);
    setIsHealthy(true);
    setFallbackPolling(false);
    setReconnectAttempts(0);
  }, [clearIntervals]);

  // Initialize on mount
  useEffect(() => {
    if (sessionId) {
      initialize();
    }

    return cleanup;
  }, [sessionId, initialize, cleanup]);

  // Get telemetry data
  const getTelemetryData = useCallback(() => {
    return {
      entries: [...telemetryRef.current],
      summary: {
        totalEvents: telemetryRef.current.length,
        reconnectCount: telemetryRef.current.filter(t => t.eventType === 'reconnect_attempt').length,
        fallbackPollCount: telemetryRef.current.filter(t => t.eventType === 'fallback_polling_started').length,
        averageLatency: telemetryRef.current.length > 0 
          ? telemetryRef.current.reduce((sum, t) => sum + t.latencyMs, 0) / telemetryRef.current.length 
          : 0
      }
    };
  }, []);

  return {
    isConnected,
    isHealthy,
    fallbackPolling,
    reconnectAttempts,
    localVersion,
    broadcastStateUpdate,
    broadcastPlayerJoin,
    fetchCurrentState,
    getTelemetryData,
    cleanup
  };
};