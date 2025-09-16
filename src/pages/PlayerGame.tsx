import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { GameData } from '../types/game';
import { PlayerJoinSlide } from '../components/slides/PlayerJoinSlide';
import { PlayerQuestionSlide } from '../components/slides/PlayerQuestionSlide';
import { PlayerResultsSlide } from '../components/slides/PlayerResultsSlide';
import { useGameSession } from '../hooks/useGameSession';
import { useSessionManager } from '../hooks/useSessionManager';
import { supabase } from '../lib/supabase';

export const PlayerGame: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [customQuestions, setCustomQuestions] = useState<any[]>([]);
  const [playerId, setPlayerId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [hasJoined, setHasJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joinError, setJoinError] = useState<string>('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  
  // Track individual player state
  const [playerPhase, setPlayerPhase] = useState<string>('waiting');
  const [playerQuestion, setPlayerQuestion] = useState<number>(0);
  const [playerQuestionStartTime, setPlayerQuestionStartTime] = useState<string | null>(null);
  
  // ✅ NEW: Stable shuffled question data at parent level
  const [shuffledQuestionData, setShuffledQuestionData] = useState<{
    questionId: string;
    shuffledOptions: string[];
    shuffledCorrectAnswerIndex: number;
  } | null>(null);
  
  // ✅ ENHANCED: Track answers per question with submission state
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [submissionStates, setSubmissionStates] = useState<Map<number, 'submitting' | 'submitted' | 'error'>>(new Map());

  const { 
    session, 
    players = [],
    isConnected,
    isHealthy,
    fallbackPolling,
    joinSession, 
    submitAnswer,
    getQuestionResults,
    broadcastPlayerJoin,
    updatePlayerSession
  } = useGameSession(sessionId);

  const { isValidSession, clearAllSessionData } = useSessionManager();

  useEffect(() => {
    loadGameData();
    
    // Check if this is a valid session
    if (!isValidSession(sessionId)) {
      console.log('Invalid session detected, clearing data');
      clearAllSessionData();
      return;
    }
    
    // Check if player already joined this specific session
    const savedPlayerId = localStorage.getItem('player_id');
    const savedPlayerName = localStorage.getItem('player_name');
    const savedSessionId = localStorage.getItem('session_id');
    
    if (savedPlayerId && savedPlayerName && savedSessionId === sessionId) {
      setPlayerId(savedPlayerId);
      setPlayerName(savedPlayerName);
      setHasJoined(true);
      console.log('🔄 Restored player session:', savedPlayerName);
    } else {
      // Clear old session data if it's for a different session
      clearAllSessionData();
    }
  }, [sessionId, isValidSession, clearAllSessionData]);

  // ✅ NEW: Load custom questions when sessionId is available
  useEffect(() => {
    if (sessionId) {
      loadCustomQuestions();
    }
  }, [sessionId]);
  // ✅ NEW: Track individual player state from players array
  useEffect(() => {
    if (playerId && players.length > 0) {
      const currentPlayer = players.find(p => p.id === playerId);
      if (currentPlayer) {
        console.log('👤 Found current player data:', currentPlayer);
        
        // Check if player has individual phase data
        if ((currentPlayer as any).current_phase) {
          setPlayerPhase((currentPlayer as any).current_phase);
          setPlayerQuestion((currentPlayer as any).current_question || 0);
          setPlayerQuestionStartTime((currentPlayer as any).question_start_time || null);
          
          console.log('✅ Updated player state:', {
            phase: (currentPlayer as any).current_phase,
            question: (currentPlayer as any).current_question,
            questionStartTime: (currentPlayer as any).question_start_time
          });
        } else {
          // Fallback to global session if individual data not available
          console.log('⚠️ No individual player phase data, using global session');
          setPlayerPhase(session?.current_phase || 'waiting');
          setPlayerQuestion(session?.current_question || 0);
          setPlayerQuestionStartTime(session?.question_start_time || null);
        }
      }
    } else if (session) {
      // Fallback to global session when no individual player data
      setPlayerPhase(session.current_phase || 'waiting');
      setPlayerQuestion(session.current_question || 0);
      setPlayerQuestionStartTime(session.question_start_time || null);
    }
  }, [playerId, players, session]);

  // ✅ NEW: Player heartbeat to keep last_updated current
  useEffect(() => {
    if (!playerId || !hasJoined) return;
    
    // Check if Supabase is properly configured before starting heartbeat
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.error('❌ Cannot start heartbeat - Supabase not configured');
      return;
    }

    console.log('💓 Starting player heartbeat for:', playerName);
    
    // Send initial heartbeat immediately
    const sendHeartbeat = async () => {
      try {
        await updatePlayerSession(playerId, {
          // Just update the last_updated timestamp by sending an empty update
        });
        console.log('💓 Heartbeat sent for player:', playerName);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Failed to send heartbeat:', {
          error: errorMessage,
          playerName,
          playerId,
          hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
          hasSupabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
        });
        
        // If it's a network error, don't spam the console
        if (errorMessage.includes('Network connection')) {
          console.warn('⚠️ Player heartbeat failed due to network issues. Will retry...');
        }
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval to send heartbeat every 10 seconds
    const heartbeatInterval = setInterval(sendHeartbeat, 10000);

    // Cleanup interval on unmount or when player leaves
    return () => {
      console.log('💔 Stopping player heartbeat for:', playerName);
      clearInterval(heartbeatInterval);
    };
  }, [playerId, hasJoined, playerName, updatePlayerSession]);

  // ✅ ENHANCED: Reset submission states when question changes
  useEffect(() => {
    if (playerPhase === 'question') {
      console.log('🔄 Question phase detected, current question:', playerQuestion);
      
      // ✅ FIXED: Don't set submitting state prematurely - only clear existing state
      setSubmissionStates(prev => {
        const newMap = new Map(prev);
        // Only clear the state if it exists, don't set to 'submitting'
        if (newMap.has(playerQuestion)) {
          newMap.delete(playerQuestion);
        }
        return newMap;
      });
    }
  }, [playerQuestion, playerPhase]);

  // Debug session changes
  useEffect(() => {
    console.log('🎮 Player session update:', {
      phase: playerPhase,
      question: playerQuestion,
      questionStartTime: playerQuestionStartTime,
      playerId,
      playerName,
      answeredQuestions: Array.from(answeredQuestions),
      submissionStates: Object.fromEntries(submissionStates)
    });
  }, [playerPhase, playerQuestion, playerQuestionStartTime, playerId, playerName, answeredQuestions, submissionStates]);

  const loadGameData = async () => {
    try {
      const response = await fetch('/questions.json');
      const data: GameData = await response.json();
      setGameData(data);
      console.log('✅ Game data loaded:', data);
    } catch (error) {
      console.error('Failed to load game data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Load custom questions for this session
  const loadCustomQuestions = async () => {
    if (!sessionId) return;
    
    try {
      console.log('📝 Loading custom questions for session:', sessionId);
      const { data, error } = await supabase
        .from('custom_questions')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Failed to load custom questions:', error);
        return;
      }

      console.log('📝 Loaded custom questions:', data);
      setCustomQuestions(data || []);
    } catch (error) {
      console.error('❌ Error loading custom questions:', error);
    }
  };

  // ✅ FIXED: Memoize question conversion to prevent re-shuffling on every render
  const convertedCustomQuestions = useMemo(() => {
    if (customQuestions.length === 0) return [];
    
    console.log('🔄 Converting custom questions (this should only happen once per question set)');
    return customQuestions.map((q: {
      id?: string;
      prompt: string;
      correct_answer: string;
      wrong_answers: string[];
    }, index) => {
      // Shuffle options to randomize answer positions (only once!)
      const allOptions = [q.correct_answer, ...q.wrong_answers];
      const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);
      const correctIndex = shuffledOptions.findIndex(option => option === q.correct_answer);
      
      return {
        type: 'multiple_choice' as const,
        id: q.id || `custom-${index}`, // Use database ID or fallback
        prompt: q.prompt,
        options: shuffledOptions,
        correct_index: correctIndex >= 0 ? correctIndex : 0, // This correctIndex is based on the original options, not shuffled. It will be re-calculated below.
        timer: 15, // Default timer
        feedback: {
          correct: {
            text: `Correct! You got that one right!`
          },
          wrong: {
            text: `Wrong! The correct answer was: ${q.correct_answer}`
          }
        }
      };
    });
  }, [customQuestions]); // Only recalculate when customQuestions actually changes

  // ✅ FIXED: Memoize current questions to prevent unnecessary recalculations
  const getCurrentQuestions = useMemo(() => {
    if (convertedCustomQuestions.length > 0) {
      console.log('📝 Using converted custom questions:', convertedCustomQuestions.length);
      return convertedCustomQuestions;
    }
    console.log('📝 Using default questions:', gameData?.questions?.length || 0);
    // Add stable IDs to default questions
    return (gameData?.questions || []).map((q, index) => ({
      ...q,
      id: q.id || `default-${index}`
    }));
  }, [convertedCustomQuestions, gameData?.questions]);

  // ✅ NEW: Handle shuffling at parent level when question changes
  useEffect(() => {
    console.log('DEBUG PlayerGame: useEffect for shuffled data triggered.'); // DEBUG LOG
    console.log('DEBUG PlayerGame: Current session object:', session); // DEBUG LOG
    console.log('DEBUG PlayerGame: session?.current_question_options_shuffled:', session?.current_question_options_shuffled); // DEBUG LOG
    console.log('DEBUG PlayerGame: playerPhase:', playerPhase, 'playerQuestionStartTime:', playerQuestionStartTime); // DEBUG LOG
    
    if (playerPhase === 'question' && playerQuestionStartTime) {
      // ✅ ENHANCED: Check if we have shuffled options and they're for the correct question
      const hasValidShuffledOptions = session?.current_question_options_shuffled && 
                                     session.current_question === playerQuestion;
      
      if (hasValidShuffledOptions) {
        const currentQuestions = getCurrentQuestions;
        const currentQuestion = currentQuestions[playerQuestion];
        
        if (currentQuestion && currentQuestion.options && Array.isArray(currentQuestion.options)) {
          const questionId = currentQuestion.id || `${playerQuestion}-${currentQuestion.prompt}`;
          
          // ✅ Use shuffled options from session, if available
          const shuffled = session.current_question_options_shuffled;
          
          // Find the new index of the correct answer based on the shuffled options
          let newCorrectIndex = 0;
          if (currentQuestion.correct_index !== undefined && currentQuestion.correct_index >= 0 && currentQuestion.correct_index < currentQuestion.options.length) {
            const correctOption = currentQuestion.options[currentQuestion.correct_index];
            newCorrectIndex = shuffled.findIndex(option => option === correctOption);
            if (newCorrectIndex === -1) {
              newCorrectIndex = 0; // Fallback if not found (shouldn't happen if options are consistent)
            }
          } else if (currentQuestion.correct_index === -1) {
            newCorrectIndex = -1; // Trick question
          }
          
          setShuffledQuestionData({
            questionId,
            shuffledOptions: shuffled,
            shuffledCorrectAnswerIndex: newCorrectIndex
          });
          console.log('✅ Player: Using shuffled options from session:', {
            questionId,
            shuffled: shuffled,
            newCorrectIndex: newCorrectIndex
          });
        }
      } else {
        // ✅ FIXED: Wait for shuffled options to arrive via realtime instead of fetching
        console.log('⏳ Player: Waiting for shuffled options to arrive via realtime sync');
        // Don't set shuffledQuestionData - wait for next realtime update
      }
    } else {
      // Clear shuffled data when not in question phase
      setShuffledQuestionData(null);
      console.log('DEBUG PlayerGame: Not in question phase or no start time, clearing shuffled data.'); // DEBUG LOG
    }
  }, [playerPhase, playerQuestion, playerQuestionStartTime, getCurrentQuestions, session?.current_question_options_shuffled, session?.current_question, sessionId]);

  const handleJoin = async (name: string) => {
    if (!sessionId) return;
    
    setJoinError('');
    setJoinLoading(true);
    
    try {
      console.log('🎮 Player attempting to join:', name, 'to session:', sessionId);
      const newPlayerId = await joinSession(sessionId, name);
      
      console.log('✅ Player join response received:', {
        newPlayerId,
        playerName: name,
        sessionId,
        timestamp: new Date().toISOString()
      });
      
      setPlayerId(newPlayerId);
      setPlayerName(name);
      setHasJoined(true);
      
      // Broadcast player join for immediate updates
      if (broadcastPlayerJoin) {
        await broadcastPlayerJoin(newPlayerId, name);
      }
      
      // Store session ID to track which session this player belongs to
      localStorage.setItem('session_id', sessionId);
      
      console.log('✅ Player state updated after join:', {
        playerId: newPlayerId,
        playerName: name,
        hasJoined: true,
        localStorageSessionId: localStorage.getItem('session_id')
      });
    } catch (error) {
      console.error('❌ Join failed:', error);
      setJoinError(error instanceof Error ? error.message : 'Failed to join game');
    } finally {
      setJoinLoading(false);
    }
  };

  // ✅ ENHANCED: Answer submission with comprehensive duplicate prevention
  const handleAnswer = async (answer: number, responseTime: number, shuffledCorrectAnswerIndex: number) => {
    console.log('🎯 handleAnswer called:', { 
      answer, 
      responseTime, 
      shuffledCorrectAnswerIndex,
      currentQuestion: playerQuestion, 
      playerId, 
      hasAnsweredThisQuestion: answeredQuestions.has(playerQuestion),
      submissionState: submissionStates.get(playerQuestion)
    });
    
    const currentQuestions = getCurrentQuestions;
    if (!playerId || !gameData || currentQuestions.length === 0) {
      console.log('⚠️ Cannot submit answer - missing data:', { 
        hasPlayerId: !!playerId, 
        hasGameData: !!gameData,
        hasQuestions: currentQuestions.length > 0
      });
      return;
    }

    // ✅ CRITICAL: Check multiple conditions to prevent duplicate submissions
    if (answeredQuestions.has(playerQuestion)) {
      console.log('⚠️ Already answered question', playerQuestion);
      return;
    }

    const currentSubmissionState = submissionStates.get(playerQuestion);
    if (currentSubmissionState === 'submitting' || currentSubmissionState === 'submitted') {
      console.log('⚠️ Answer already being submitted or submitted for question', playerQuestion);
      return;
    }
    
    const currentQuestion = currentQuestions[playerQuestion];
    if (!currentQuestion) {
      console.error('Current question not found');
      return;
    }
    
    let isCorrect = false;
    
    if (currentQuestion.type === 'multiple_choice') {
      if (shuffledCorrectAnswerIndex === -1) {
        // Trick question - all answers are "correct"
        isCorrect = true;
      } else {
        // ✅ FIXED: Use shuffled correct index instead of original
        isCorrect = answer === shuffledCorrectAnswerIndex;
      }
    }
    
    console.log('🎯 Answer correctness check:', {
      selectedAnswer: answer,
      shuffledCorrectAnswerIndex,
      originalCorrectIndex: currentQuestion.correct_index,
      isCorrect,
      questionType: currentQuestion.type
    });
    
    try {
      console.log('📤 Submitting answer to database...');
      console.log('📤 Answer details:', {
        playerId,
        questionIndex: playerQuestion,
        answer,
        isCorrect,
        responseTime,
        sessionId
      });
      
      // ✅ IMMEDIATE STATE UPDATES: Mark as submitting BEFORE API call
      setSubmissionStates(prev => new Map(prev).set(playerQuestion, 'submitting'));
      
      const result = await submitAnswer(playerId, playerQuestion, answer, isCorrect, responseTime);
      
      // ✅ SUCCESS: Mark as submitted and answered
      setSubmissionStates(prev => new Map(prev).set(playerQuestion, 'submitted'));
      setAnsweredQuestions(prev => new Set([...prev, playerQuestion]));
      console.log('✅ Answer submitted successfully:', result);
      
    } catch (error) {
      console.error('❌ Failed to submit answer:', error);
      console.error('❌ Error details:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        playerId,
        questionIndex: playerQuestion,
        sessionId
      });
      
      // ✅ ENHANCED ERROR HANDLING: Reset to allow retry
      setSubmissionStates(prev => new Map(prev).set(playerQuestion, 'error'));
      
      // Remove from answered questions to allow retry
      setAnsweredQuestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(playerQuestion);
        return newSet;
      });
      
      console.log('🔄 Answer submission failed, allowing retry');
      
      // ✅ NEW: Show user-friendly error message
      alert(`Failed to submit answer: ${error instanceof Error ? error.message : 'Unknown error'}. You can try again.`);
    }
  };

  // ✅ NEW: Error boundary function to catch rendering errors
  const renderWithErrorBoundary = () => {
    try {
      return renderMainContent();
    } catch (error) {
      console.error('❌ Render error caught:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown rendering error';
      setRenderError(`Rendering failed: ${errorMessage}`);
      return null;
    }
  };

  // ✅ NEW: Main content rendering function
  const renderMainContent = () => {
    if (loading || !gameData) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
          <div className="text-white text-2xl font-bold animate-pulse">
            Loading... 🎮
          </div>
        </div>
      );
    }

    if (!sessionId) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-600 to-purple-600 flex items-center justify-center">
          <div className="text-white text-2xl font-bold text-center">
            Invalid session! 😅
          </div>
        </div>
      );
    }

    if (!hasJoined) {
      return (
        <PlayerJoinSlide 
          onJoin={handleJoin}
          loading={joinLoading}
          error={joinError}
        />
      );
    }

    if (!session) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-8">
          <div className="text-center text-white">
            <div className="text-6xl mb-4 animate-pulse">🔄</div>
            <h1 className="text-3xl font-bold mb-4">Connecting...</h1>
            <p className="text-xl mb-2">Finding your game session</p>
            <p className="text-lg text-gray-300">Please wait...</p>
          </div>
        </div>
      );
    }

    // Show waiting screen for waiting phase
    if (playerPhase === 'waiting') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-8">
          <div className="text-center text-white">
            <div className="text-6xl mb-4 animate-bounce">🎮</div>
            <h1 className="text-3xl font-bold mb-4">Welcome, {playerName}!</h1>
            <p className="text-xl mb-2">You're in the game!</p>
            <p className="text-lg text-gray-300">Waiting for the host to start...</p>
            <div className="mt-8">
              <div className="animate-pulse text-4xl">⏳</div>
            </div>
            
            {/* Player count */}
            <div className="mt-6 bg-black/30 rounded-lg p-4">
              <p className="text-yellow-400 font-bold">
                {players?.length || 0} player{(players?.length || 0) !== 1 ? 's' : ''} joined
              </p>
              
              {/* Connection Status */}
              <div className="mt-2 flex items-center justify-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected && isHealthy ? 'bg-green-400 animate-pulse' : 
                  fallbackPolling ? 'bg-yellow-400 animate-pulse' : 
                  'bg-red-400'
                }`}></div>
                <span className={`text-xs ${
                  isConnected && isHealthy ? 'text-green-400' : 
                  fallbackPolling ? 'text-yellow-400' : 
                  'text-red-400'
                }`}>
                  {isConnected && isHealthy ? 'Connected' : 
                   fallbackPolling ? 'Reconnecting...' : 
                   'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Show question if in question phase
    if (playerPhase === 'question' && playerQuestionStartTime) {
      const currentQuestions = getCurrentQuestions;
      const currentQuestion = currentQuestions[playerQuestion];
      
      if (!currentQuestion) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-red-600 to-purple-600 flex items-center justify-center p-8">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">❓</div>
              <h1 className="text-3xl font-bold mb-4">Question not found</h1>
              <p className="text-xl">Question {playerQuestion + 1} doesn't exist</p>
              <p className="text-sm mt-2">Available: {currentQuestions.length} questions</p>
              
              {/* Connection Status */}
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected && isHealthy ? 'bg-green-400 animate-pulse' : 
                  fallbackPolling ? 'bg-yellow-400 animate-pulse' : 
                  'bg-red-400'
                }`}></div>
                <span className={`text-xs ${
                  isConnected && isHealthy ? 'text-green-400' : 
                  fallbackPolling ? 'text-yellow-400' : 
                  'text-red-400'
                }`}>
                  {isConnected && isHealthy ? 'Live Updates' : 
                   fallbackPolling ? 'Backup Mode' : 
                   'Connection Issues'}
                </span>
              </div>
            </div>
          </div>
        );
      }

      // ✅ ENHANCED: Check submission state for this question
      const hasAnsweredThisQuestion = answeredQuestions.has(playerQuestion);
      const submissionState = submissionStates.get(playerQuestion);

      console.log('🎯 Rendering question slide:', {
        questionIndex: playerQuestion,
        hasAnsweredThisQuestion,
        submissionState,
        questionPrompt: currentQuestion.prompt
      });

      // If already answered or submitted, show waiting state
      if (hasAnsweredThisQuestion || submissionState === 'submitted') {
        return (
          <div className="min-h-screen bg-gradient-to-br from-green-600 to-blue-600 flex items-center justify-center p-8">
            <div className="text-center text-white">
              <div className="text-6xl mb-4 animate-bounce">✅</div>
              <h1 className="text-3xl font-bold mb-4">Answer Submitted!</h1>
              <p className="text-xl mb-2">
                Waiting for other players to answer...
              </p>
              <p className="text-lg text-gray-300">The host will show results soon</p>
              <div className="mt-8">
                <div className="animate-pulse text-4xl">⏳</div>
              </div>
              
              {/* ✅ ENHANCED: Show error if submission failed but answer is locked */}
              {submissionState === 'error' && (
                <div className="mt-6 bg-red-500/20 rounded-lg p-4 border border-red-400/50">
                  <div className="text-red-300">
                    <div className="text-4xl mb-2">⚠️</div>
                    <h3 className="text-lg font-bold mb-2">Submission Issue</h3>
                    <p className="text-sm mb-2">
                      There was a problem submitting your answer to the server.
                    </p>
                    <p className="text-xs text-red-200">
                      Your answer has been recorded locally and the host may still see it.
                      If this continues, try refreshing the page.
                    </p>
                    <button
                      onClick={() => window.location.reload()}
                      className="mt-3 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      Refresh Page
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }

      // Only render question slide if we have shuffled data
      if (!shuffledQuestionData) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-8">
            <div className="text-center text-white">
              <div className="text-6xl mb-4 animate-pulse">🔄</div>
              <h1 className="text-3xl font-bold mb-4">Preparing Question...</h1>
              <p className="text-xl mb-2">
                Setting up question {playerQuestion + 1}
              </p>
            </div>
          </div>
        );
      }

      // ✅ NEW: Show submission error state if there was an error but not yet submitted
      if (submissionState === 'error' && !hasAnsweredThisQuestion) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-red-600 to-purple-600 flex items-center justify-center p-8">
            <div className="text-center text-white">
              <div className="text-6xl mb-4 animate-pulse">❌</div>
              <h1 className="text-3xl font-bold mb-4">Submission Failed</h1>
              <p className="text-xl mb-2">
                There was a problem submitting your answer
              </p>
              <div className="mt-6 bg-red-500/20 rounded-lg p-4 border border-red-400/50 max-w-md mx-auto">
                <p className="text-red-300 text-sm mb-3">
                  Your answer couldn't be sent to the server. This might be due to:
                </p>
                <ul className="text-red-200 text-xs text-left space-y-1 mb-4">
                  <li>• Network connection issues</li>
                  <li>• Server temporarily unavailable</li>
                  <li>• Question time expired</li>
                </ul>
                <div className="space-y-2">
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Refresh and Try Again
                  </button>
                  <button
                    onClick={() => {
                      setSubmissionStates(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(playerQuestion);
                        return newMap;
                      });
                      setAnsweredQuestions(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(playerQuestion);
                        return newSet;
                      });
                    }}
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Try Answering Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // ✅ NEW: Show submitting state
      if (submissionState === 'submitting') {
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-8">
            <div className="text-center text-white">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-300/30 border-t-blue-300 rounded-full animate-spin"></div>
              </div>
              <h1 className="text-3xl font-bold mb-4">Submitting Answer...</h1>
              <p className="text-xl mb-2">
                Please wait while we process your response
              </p>
              <div className="mt-6 bg-blue-500/20 rounded-lg p-4 border border-blue-400/50">
                <p className="text-blue-300 text-sm">
                  🔒 Your answer is locked and being sent to the server
                 </p>
               </div>
            </div>
          </div>
        );
      }
      
      return (
        <PlayerQuestionSlide
          question={currentQuestion}
          shuffledOptions={shuffledQuestionData.shuffledOptions}
          shuffledCorrectAnswerIndex={shuffledQuestionData.shuffledCorrectAnswerIndex}
          onAnswer={handleAnswer}
          questionStartTime={playerQuestionStartTime}
          currentQuestionIndex={playerQuestion} // ✅ NEW: Pass question index for reliable state resets
        />
      );
    }

    // Show results if in results phase
    if (playerPhase === 'results') {
      return (
        <PlayerResultsSlide
          sessionId={sessionId!}
          questionIndex={playerQuestion}
          playerId={playerId}
          playerName={playerName}
          gameData={{
            ...gameData,
            questions: getCurrentQuestions
          }}
          getQuestionResults={getQuestionResults}
        />
      );
    }

    // Show waiting for final or other phases
    const getPhaseMessage = () => {
      switch (playerPhase) {
        case 'final':
          return {
            icon: '🏆',
            title: 'Game Over!',
            subtitle: 'Thanks for playing',
            description: 'Check out the final results on the main screen!'
          };
        default:
          return {
            icon: '⭐',
            title: 'Get Ready!',
            subtitle: 'Next phase coming up',
            description: 'Stay tuned...'
          };
      }
    };

    const phaseInfo = getPhaseMessage();

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 to-blue-600 flex items-center justify-center p-8">
        <div className="text-center text-white">
          <div className="text-6xl mb-4 animate-spin">{phaseInfo.icon}</div>
          <h1 className="text-3xl font-bold mb-4">{phaseInfo.title}</h1>
          <p className="text-xl mb-2">{phaseInfo.subtitle}</p>
          <p className="text-lg text-gray-300">{phaseInfo.description}</p>
          
          {/* Debug info */}
          {import.meta.env.DEV && (
            <div className="mt-8 bg-black/30 rounded-lg p-4 text-sm">
              <p>Debug: Player: {playerName} ({playerId})</p>
              <p>Session: {sessionId}</p>
              <p>Player Phase: {playerPhase}</p>
              <p>Player Question: {playerQuestion}</p>
              <p>Global Phase: {session?.current_phase}</p>
              <p>Answered Questions: {Array.from(answeredQuestions).join(', ')}</p>
              <p>Submission States: {JSON.stringify(Object.fromEntries(submissionStates))}</p>
              <p>Players: {players?.length || 0}</p>
              <p>Custom Questions: {customQuestions.length}</p>
              <p>Using: {convertedCustomQuestions.length > 0 ? 'Custom' : 'Default'} questions</p>
              <p className="text-xs text-gray-400">Connected: {isConnected ? 'Yes' : 'No'}</p>
              <p className="text-xs text-gray-400">Healthy: {isHealthy ? 'Yes' : 'No'}</p>
              <p className="text-xs text-gray-400">Fallback: {fallbackPolling ? 'Active' : 'Inactive'}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ✅ NEW: Show error screen if render error occurred
  if (renderError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 to-purple-600 flex items-center justify-center p-8">
        <div className="text-center text-white max-w-md">
          <div className="text-6xl mb-4">💥</div>
          <h1 className="text-3xl font-bold mb-4">Oops! Something went wrong</h1>
          <div className="bg-red-500/20 rounded-lg p-4 border border-red-400/50 mb-6">
            <p className="text-red-300 text-sm mb-2">Error Details:</p>
            <p className="text-red-200 text-xs font-mono break-words">{renderError}</p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-bold transition-colors"
            >
              🔄 Refresh Page
            </button>
            <button
              onClick={() => {
                setRenderError(null);
                clearAllSessionData();
                window.location.href = '/';
              }}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold transition-colors"
            >
              🏠 Go to Home
            </button>
          </div>
          <div className="mt-6 text-xs text-gray-400">
            <p>If this keeps happening, please check your internet connection</p>
            <p>or contact support with the error details above.</p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ NEW: Use error boundary wrapper
  return renderWithErrorBoundary();
};