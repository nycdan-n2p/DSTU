import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GameData, Question } from '../types/game';
import { WelcomeSlide } from '../components/slides/WelcomeSlide';
import { HostWaitingSlide } from '../components/slides/HostWaitingSlide';
import { SponsorSlide } from '../components/slides/SponsorSlide';
import { MultiplayerQuestionSlide } from '../components/slides/MultiplayerQuestionSlide';
import { ResultsSlide } from '../components/slides/ResultsSlide';
import { AwardSlide } from '../components/slides/AwardSlide';
import { FinalPodiumSlide } from '../components/slides/FinalPodiumSlide';
import { useGameSession } from '../hooks/useGameSession';
import { useSessionManager } from '../hooks/useSessionManager';
import { useStreakTracker } from '../hooks/useStreakTracker';
import { useAudio } from '../hooks/useAudio';
import { QuestionCreator } from '../components/QuestionCreator';
import { QuestionSetupSlide } from '../components/slides/QuestionSetupSlide';
import { CsvUploadSection } from '../components/CsvUploadSection';
import { supabase } from '../lib/supabase';
import { UploadedQuestion } from '../types/game';
import { GamePhaseRenderer } from '../components/GamePhaseRenderer';
import { AdminControlPanel } from '../components/AdminControlPanel';
import { RealtimeDebug } from '../components/RealtimeDebug';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

type GamePhase = 'welcome' | 'waiting' | 'question_setup' | 'sponsor1' | 'question' | 'results' | 'sponsor2' | 'podium' | 'final';

interface HostGameProps {
  onBackToDashboard?: () => void;
  existingSessionId?: string | null;
  startInQuestionCreator?: boolean; // NEW: start directly in question creator
  quizTitle?: string; // NEW: direct quiz title prop
}

export const HostGame: React.FC<HostGameProps> = ({ 
  onBackToDashboard,
  existingSessionId,
  startInQuestionCreator = false,
  quizTitle
}) => {
  const { user, signOut } = useAuth();
  const initialTitle = quizTitle || 'Untitled Quiz';
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [selectedIntroText, setSelectedIntroText] = useState<string>('');
  const [currentPhase, setCurrentPhase] = useState<GamePhase>('welcome');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [questionResults, setQuestionResults] = useState<any>(null);
  
  // ✅ NEW: Host question shuffling state
  const [shuffledHostQuestionData, setShuffledHostQuestionData] = useState<{
    questionId: string;
    shuffledOptions: string[];
    shuffledCorrectAnswerIndex: number;
  } | null>(null);
  
  // ✅ NEW: Host controls for display options
  const [showPoints, setShowPoints] = useState(true);
  // ✅ NEW: Question creation state
  const [customQuestions, setCustomQuestions] = useState<any[]>([]);
  const [showQuestionCreator, setShowQuestionCreator] = useState(false);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  
  // ✅ NEW: Sponsor management state
  const [customSponsors, setCustomSponsors] = useState<any[]>([]);
  const [currentSponsorIndex, setCurrentSponsorIndex] = useState(0);
  
  // ✅ NEW: Jumbotron display state
  const [jumbotronWindow, setJumbotronWindow] = useState<Window | null>(null);

  // ✅ Always call hooks in the same order - destructure everything at once
  const { 
    session, 
    players = [], 
    loading: gameSessionLoading,
    error: gameSessionError,
    isConnected,
    isHealthy,
    fallbackPolling,
    createSession, 
    updateSessionPhase, 
    updatePlayerSession,
    updateAllPlayerSessions,
    getQuestionResults,
    reloadPlayers,
    loadCustomSponsors,
    addCustomSponsor,
    deleteCustomSponsor,
    clearAllPlayers,
    broadcastStateUpdate,
    getTelemetryData
  } = useGameSession(sessionId || undefined);

  // ✅ DEBUG: Log when HostGame re-renders
  useEffect(() => {
    console.log('🎮 HostGame: Component re-rendered with sessionId:', sessionId);
  });

  const { forceNewSession, clearAllSessionData } = useSessionManager();
  
  // ✅ NEW: Streak tracking
  const { updateStreak, getAllStreaks, resetStreaks } = useStreakTracker();
  
  // ✅ ENHANCED: Audio control with immediate stop capability
  const { clearQueue, stopAudio } = useAudio();

  // ✅ NEW: Handle next sponsor function
  const handleNextSponsor = () => {
    setCurrentSponsorIndex(prev => prev + 1);
    console.log('🔄 Moving to next sponsor, index:', currentSponsorIndex + 1);
  };

  // ✅ NEW: Handle opening jumbotron display
  const handleOpenJumbotron = () => {
    if (jumbotronWindow && !jumbotronWindow.closed) {
      jumbotronWindow.focus();
      return;
    }

    const displayUrl = `${window.location.origin}/display/${sessionId}`;
    const newWindow = window.open(
      displayUrl,
      'jumbotron',
      'width=1920,height=1080,fullscreen=yes,toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=yes'
    );
    
    if (newWindow) {
      setJumbotronWindow(newWindow);
      console.log('🖥️ Jumbotron window opened:', displayUrl);
    } else {
      console.error('❌ Failed to open jumbotron window. Please check popup blockers.');
    }
  };

  // ✅ NEW: Dedicated function for question preparation
  const prepareQuestionForSession = useCallback(async (questionIndex: number) => {
    const currentQuestions = getCurrentQuestions();
    const currentQuestion = currentQuestions[questionIndex];
    
    if (!currentQuestion || !currentQuestion.options || !Array.isArray(currentQuestion.options)) {
      console.error('❌ Cannot prepare question - invalid question data:', currentQuestion);
      return;
    }

    const questionId = currentQuestion.id || `host-${questionIndex}-${currentQuestion.prompt}`;
    console.log('🔀 Preparing question for session:', { questionIndex, questionId });
    
    // Generate shuffled options
    const optionsCopy = [...currentQuestion.options];
    const shuffled = optionsCopy.sort(() => Math.random() - 0.5);
    
    // Find the new index of the correct answer after shuffling
    let newCorrectIndex = 0;
    if (currentQuestion.correct_index >= 0 && currentQuestion.correct_index < currentQuestion.options.length) {
      const correctOption = currentQuestion.options[currentQuestion.correct_index];
      newCorrectIndex = shuffled.findIndex(option => option === correctOption);
      if (newCorrectIndex === -1) {
        newCorrectIndex = 0; // Fallback
      }
    } else if (currentQuestion.correct_index === -1) {
      // Trick question - all answers are correct
      newCorrectIndex = -1;
    }
    
    const questionStartTime = new Date().toISOString();
    
    // Save to database in a single atomic operation
    try {
      await updateSessionPhase(
        'question',
        questionIndex,
        questionStartTime,
        shuffled // Pass the newly shuffled options to be saved in DB
      );
      
      // Set local state after successful database update
      setShuffledHostQuestionData({
        questionId,
        shuffledOptions: shuffled,
        shuffledCorrectAnswerIndex: newCorrectIndex
      });
      
      console.log('✅ Question prepared and saved to database:', {
        questionId,
        shuffled,
        newCorrectIndex,
        originalCorrectIndex: currentQuestion.correct_index
      });
      
    } catch (error) {
      console.error('❌ Failed to prepare question for session:', error);
      throw error;
    }
  }, [getCurrentQuestions, updateSessionPhase]);

  // ✅ NEW: Close jumbotron display
  const closeJumbotronDisplay = () => {
    if (jumbotronWindow && !jumbotronWindow.closed) {
      jumbotronWindow.close();
    }
    setJumbotronWindow(null);
  };

  // ✅ NEW: Check if jumbotron is open
  const isJumbotronOpen = jumbotronWindow && !jumbotronWindow.closed;
  // Combine loading states
  const isLoading = loading || gameSessionLoading;
  
  // Combine error states
  const combinedError = gameSessionError;

  // Always call useEffect hooks unconditionally
  useEffect(() => {
    console.log('🎮 HostGame: loadGameData and initializeSession effect triggered');
    loadGameData();
    initializeSession();
  }, []);

  // Load custom questions for this session - always call useEffect
  useEffect(() => {
    console.log('🎮 HostGame: loadCustomQuestions effect triggered for sessionId:', sessionId);
    if (sessionId) {
      loadCustomQuestions();
      loadCustomSponsorsData();
    }
  }, [sessionId]);

  // NEW: If starting in creator, set initial phase and open creator
  useEffect(() => {
    if (startInQuestionCreator) {
      console.log('🛠️ Starting in question setup mode');
      setCurrentPhase('question_setup');
      // Do not auto-open creator; show full setup page
      setShowQuestionCreator(false);
      setShowCsvUpload(false);
    }
  }, [startInQuestionCreator]);

  // ✅ NEW: Cleanup jumbotron window on unmount
  useEffect(() => {
    return () => {
      closeJumbotronDisplay();
    };
  }, []);

  // ✅ SIMPLIFIED: Only read shuffled options from session, don't generate them
  useEffect(() => {
    if (session?.current_question_options_shuffled && session.current_phase === 'question') {
      const currentQuestions = getCurrentQuestions();
      const currentQuestion = currentQuestions[session.current_question];
      
      if (currentQuestion && currentQuestion.options && Array.isArray(currentQuestion.options)) {
        const questionId = currentQuestion.id || `host-${session.current_question}-${currentQuestion.prompt}`;
        
        // Only update if this is genuinely new shuffled data
        if (!shuffledHostQuestionData || shuffledHostQuestionData.questionId !== questionId) {
          const shuffled = session.current_question_options_shuffled;
          
          // Find the new index of the correct answer based on the shuffled options
          let newCorrectIndex = 0;
          if (currentQuestion.correct_index !== undefined && currentQuestion.correct_index >= 0 && currentQuestion.correct_index < currentQuestion.options.length) {
            const correctOption = currentQuestion.options[currentQuestion.correct_index];
            newCorrectIndex = shuffled.findIndex(option => option === correctOption);
            if (newCorrectIndex === -1) {
              newCorrectIndex = 0;
            }
          } else if (currentQuestion.correct_index === -1) {
            newCorrectIndex = -1; // Trick question
          }
          
          setShuffledHostQuestionData({
            questionId,
            shuffledOptions: shuffled,
            shuffledCorrectAnswerIndex: newCorrectIndex
          });
          
          console.log('✅ Host: Read shuffled options from session:', {
            questionId,
            shuffledOptions: shuffled,
            newCorrectIndex
          });
        } else {
          console.log('📺 Host: Shuffled options unchanged, skipping update');
        }
      }
    } else {
      // Clear shuffled data when not in question phase or no shuffled options available
      if (shuffledHostQuestionData) {
        setShuffledHostQuestionData(null);
        console.log('🔀 Host: Cleared shuffled data (not in question phase or no options)');
      }
    }
  }, [session?.current_question_options_shuffled, session?.current_phase, session?.current_question, shuffledHostQuestionData, getCurrentQuestions]);

  // Debug logging
  useEffect(() => {
    console.log('🎮 Host Game State Update:', {
      sessionId,
      playersCount: players?.length || 0,
      playersDetailed: players?.map(p => ({ 
        id: p?.id, 
        name: p?.name, 
        score: p?.score,
        joinedAt: p?.joined_at,
        currentPhase: p?.current_phase,
        hasSubmitted: p?.has_submitted
      })) || [],
      currentPhase,
      currentQuestionIndex,
      showPoints,
      isJumbotronOpen,
      session: session ? {
        id: session.id,
        phase: session.current_phase,
        question: session.current_question,
        questionStartTime: session.question_start_time,
        hostId: session.host_id
      } : null
    });
  }, [sessionId, players, currentPhase, currentQuestionIndex, session, showPoints, isJumbotronOpen]);

  const loadGameData = async () => {
    try {
      const response = await fetch('/questions.json');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: GameData = await response.json();
      
      // Select a random intro text for this game session
      if (data.intro.texts && data.intro.texts.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.intro.texts.length);
        setSelectedIntroText(data.intro.texts[randomIndex]);
        console.log('🎭 Selected intro text:', randomIndex + 1, 'of', data.intro.texts.length);
      }
      
      setGameData(data);
      console.log('✅ Game data loaded:', data);
    } catch (error) {
      console.error('Failed to load game data:', error);
      
      // Provide more specific error information
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('Network error: Make sure you are accessing the app via http://localhost:5173/ (not https)');
      }
    } finally {
      setLoading(false);
    }
  };

  const initializeSession = async () => {
    // Prevent duplicate session creation (e.g., from React StrictMode)
    if (sessionId || existingSessionId) {
      console.log('🔄 Session already exists, skipping creation:', sessionId || existingSessionId);
      return;
    }
    
    try {
      // If we have an existing session ID, try to load it
      if (existingSessionId) {
        console.log('🔄 Loading existing session:', existingSessionId);
        setSessionId(existingSessionId);
        return;
      }
      
      clearAllSessionData();
      const newSessionId = await createSession(initialTitle);
      setSessionId(newSessionId);
      console.log('✅ Created session:', newSessionId);
    } catch (error) {
      console.error('❌ Failed to create session:', error);
      alert(`Failed to create quiz "${initialTitle}": ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  };

  const handleStartQuiz = () => {
    console.log('🎮 Starting quiz from welcome screen');
    setCurrentPhase('question_setup');
  };

  const handleStartGame = async () => {
    console.log('🎮 Starting game - moving to waiting for players phase');
    
    // ✅ STOP audio when starting game
    if (stopAudio) {
      stopAudio();
    }
    
    // ✅ Clear stale players before starting
    try {
      await clearAllPlayers();
      console.log('🧹 Cleared stale players before starting game');
    } catch (error) {
      console.error('⚠️ Failed to clear stale players:', error);
    }
    
    try {
      // 1. Move to waiting phase - jumbotron shows QR code for player joining
      setCurrentPhase('waiting');
      
      // 2. Update session to waiting phase (this will show QR code on jumbotron)
      await updateSessionPhase('waiting', 0, new Date().toISOString());
      
      // 3. Broadcast waiting phase to jumbotron
      if (broadcastStateUpdate) {
        await broadcastStateUpdate({
          phase: 'waiting',
          currentQuestionIndex: 0,
          playersOnline: players?.length || 0
        });
        console.log('📡 Broadcasted waiting phase to jumbotron');
      }
      
      console.log('🎉 Game started! Showing sponsor slide first.');
      
    } catch (error) {
      console.error('❌ Failed to start game:', error);
      alert('Failed to start game. Please try again.');
    }
  };

  const handleNextPhase = async () => {
    console.log('🔄 handleNextPhase called - Current phase:', currentPhase, 'Question:', currentQuestionIndex, 'Players:', players?.length);
    console.log('🔄 handleNextPhase called - Moving to next phase from:', currentPhase, 'Question:', currentQuestionIndex);
    console.log('🔄 Moving to next phase from:', currentPhase, 'Question:', currentQuestionIndex);
    
    // ✅ ENHANCED: Stop any current audio before transitioning
    if (clearQueue && stopAudio) {
      clearQueue();
      stopAudio();
      console.log('🔇 Stopped audio and cleared queue before phase transition');
    }
    
    try {
      switch (currentPhase) {
        case 'waiting':
          console.log('🎬 Moving from waiting to sponsor1 - Starting the chaos!');
          setCurrentPhase('sponsor1');
          await updateSessionPhase('sponsor1', 0, new Date().toISOString());
          
          // Broadcast sponsor phase to jumbotron
          if (broadcastStateUpdate) {
            await broadcastStateUpdate({
              phase: 'sponsor1',
              currentQuestionIndex: 0,
              playersOnline: players?.length || 0
            });
            console.log('📡 Broadcasted sponsor1 to jumbotron');
          }
          
          // Update players to sponsor1 phase so they can advance properly
          if (updateAllPlayerSessions && players && players.length > 0) {
            const playerIds = players.map(p => p.id).filter(Boolean);
            await updateAllPlayerSessions(playerIds, {
              phase: 'sponsor1',  // Match the actual game phase
              current_question: 0,
              has_submitted: false
            });
          }
          break;
          
        case 'sponsor1':
          console.log('📝 Moving from sponsor1 to question');
          // ✅ NEW: Use dedicated preparation function
          await prepareQuestionForSession(currentQuestionIndex);
          setCurrentPhase('question');
          
          // ✅ NOW players see the question (after sponsor finishes)
          // Broadcast state update
          if (broadcastStateUpdate) {
            await broadcastStateUpdate({
              phase: 'question',
              currentQuestionIndex,
              questionStartTime: new Date().toISOString(),
              playersOnline: players?.length || 0
            });
          }
          
          if (updateAllPlayerSessions && players && players.length > 0) {
            const playerIds = players.map(p => p.id).filter(Boolean);
            await updateAllPlayerSessions(playerIds, {
              phase: 'question',
              current_question: currentQuestionIndex,
              question_start_time: new Date().toISOString(),
              has_submitted: false
            });
          }
          break;
          
        case 'question':
          console.log('📊 Moving from question to results, getting results for question:', currentQuestionIndex);
          
          // ✅ RELOAD PLAYERS FIRST to get latest scores
          if (reloadPlayers) {
            await reloadPlayers();
            console.log('🔄 Reloaded players before getting results');
          }
          
          const results = await getQuestionResults(currentQuestionIndex);
          console.log('📊 Results retrieved:', results);
          
          // ✅ NEW: Update streaks for all players
          if (results.correct && results.wrong) {
            [...results.correct, ...results.wrong].forEach((answer: any) => {
              if (answer.players?.id) {
                updateStreak(answer.players.id, answer.is_correct);
              }
            });
          }
          
          setQuestionResults(results);
          setCurrentPhase('results');
          await updateSessionPhase('results');
          
          // Broadcast state update
          if (broadcastStateUpdate) {
            await broadcastStateUpdate({
              phase: 'results',
              currentQuestionIndex,
              playersOnline: players?.length || 0
            });
          }
          
          if (updateAllPlayerSessions && players && players.length > 0) {
            const playerIds = players.map(p => p.id).filter(Boolean);
            await updateAllPlayerSessions(playerIds, { phase: 'results' });
          }
          break;
          
        case 'results':
          const totalQuestions = getCurrentQuestions().length;
          console.log('🔄 Moving from results, current:', currentQuestionIndex, 'total:', totalQuestions);
          
          if (currentQuestionIndex < totalQuestions - 1) {
            if (currentQuestionIndex === 1) {
              console.log('📺 Moving to sponsor2');
              setCurrentPhase('sponsor2');
              
              // Broadcast state update
              if (broadcastStateUpdate) {
                await broadcastStateUpdate({
                  phase: 'sponsor2',
                  currentQuestionIndex,
                  playersOnline: players?.length || 0
                });
              }
              
              if (updateAllPlayerSessions && players && players.length > 0) {
                const playerIds = players.map(p => p.id).filter(Boolean);
                await updateAllPlayerSessions(playerIds, { phase: 'sponsor2' });
              }
            } else {
              const nextQuestion = currentQuestionIndex + 1;
              console.log('➡️ Moving to next question:', nextQuestion);
              // ✅ NEW: Use dedicated preparation function
              await prepareQuestionForSession(nextQuestion);
              setCurrentQuestionIndex(nextQuestion);
              setCurrentPhase('question');
              
              // Broadcast state update
              if (broadcastStateUpdate) {
                await broadcastStateUpdate({
                  phase: 'question',
                  currentQuestionIndex: nextQuestion,
                  questionStartTime: new Date().toISOString(),
                  playersOnline: players?.length || 0
                });
              }
              
              if (updateAllPlayerSessions && players && players.length > 0) {
                const playerIds = players.map(p => p.id).filter(Boolean);
                await updateAllPlayerSessions(playerIds, {
                  phase: 'question',
                  current_question: nextQuestion,
                  question_start_time: new Date().toISOString(),
                  has_submitted: false
                });
              }
            }
          } else {
            console.log('🏁 Moving to final podium');
            
            // ✅ RELOAD PLAYERS AGAIN before final podium to get final scores
            if (reloadPlayers) {
              await reloadPlayers();
              console.log('🔄 Reloaded players before final podium');
            }
            
            setCurrentPhase('podium');
            await updateSessionPhase('podium');
            
            // Broadcast state update
            if (broadcastStateUpdate) {
              await broadcastStateUpdate({
                phase: 'podium',
                currentQuestionIndex,
                playersOnline: players?.length || 0
              });
            }
            
            if (updateAllPlayerSessions && players && players.length > 0) {
              const playerIds = players.map(p => p.id).filter(Boolean);
              await updateAllPlayerSessions(playerIds, { phase: 'podium' });
            }
          }
          break;
          
        case 'sponsor2':
          const nextQuestion = currentQuestionIndex + 1;
          console.log('➡️ Moving from sponsor2 to question:', nextQuestion);
          // ✅ NEW: Use dedicated preparation function
          await prepareQuestionForSession(nextQuestion);
          setCurrentQuestionIndex(nextQuestion);
          setCurrentPhase('question');
          
          // Broadcast state update
          if (broadcastStateUpdate) {
            await broadcastStateUpdate({
              phase: 'question',
              currentQuestionIndex: nextQuestion,
              questionStartTime: new Date().toISOString(),
              playersOnline: players?.length || 0
            });
          }
          
          if (updateAllPlayerSessions && players && players.length > 0) {
            const playerIds = players.map(p => p.id).filter(Boolean);
            await updateAllPlayerSessions(playerIds, {
              phase: 'question',
              current_question: nextQuestion,
              question_start_time: new Date().toISOString(),
              has_submitted: false
            });
          }
          break;
          
        case 'podium':
          console.log('🎖️ Moving from podium to final award');
          setCurrentPhase('final');
          await updateSessionPhase('final');
          
          // Broadcast state update
          if (broadcastStateUpdate) {
            await broadcastStateUpdate({
              phase: 'final',
              currentQuestionIndex,
              playersOnline: players?.length || 0
            });
          }
          
          if (updateAllPlayerSessions && players && players.length > 0) {
            const playerIds = players.map(p => p.id).filter(Boolean);
            await updateAllPlayerSessions(playerIds, { phase: 'final' });
          }
          break;
          
        case 'final':
          console.log('🔄 Restarting game');
          handleRestartGame();
          break;
      }
    } catch (error) {
      console.error('❌ Error in handleNextPhase:', error);
    }
  };

  const handleRestartGame = async () => {
    console.log('🔄 Restarting game - forcing new session');
    
    // ✅ STOP audio when restarting
    if (clearQueue && stopAudio) {
      clearQueue();
      stopAudio();
    }
    
    // ✅ NEW: Close jumbotron display when restarting
    closeJumbotronDisplay();
    
    // ✅ Reset streaks
    resetStreaks();
    
    try {
      if (updateAllPlayerSessions && players && players.length > 0) {
        const playerIds = players.map(p => p.id).filter(Boolean);
        await updateAllPlayerSessions(playerIds, { 
          phase: 'waiting', 
          current_question: 0,
          has_submitted: false 
        });
      }
    } catch (error) {
      console.error('❌ Failed to reset player sessions:', error);
    }
    
    forceNewSession();
  };

  // ✅ NEW: Load custom sponsors
  const loadCustomSponsorsData = async () => {
    if (!sessionId || !loadCustomSponsors) return;
    
    try {
      const sponsors = await loadCustomSponsors();
      setCustomSponsors(sponsors || []);
      console.log('📺 Loaded custom sponsors:', sponsors);
    } catch (error) {
      console.error('❌ Error loading custom sponsors:', error);
    }
  };

  // ✅ NEW: Add sponsor handler
  const handleAddSponsor = async (text: string, imageUrl?: string | null) => {
    if (!sessionId || !addCustomSponsor) return;
    
    try {
      await addCustomSponsor(text, imageUrl);
      await loadCustomSponsorsData(); // Reload sponsors
      console.log('✅ Added custom sponsor');
    } catch (error) {
      console.error('❌ Error adding sponsor:', error);
      throw error;
    }
  };

  // ✅ NEW: Delete sponsor handler
  const handleDeleteSponsor = async (sponsorId: string) => {
    if (!deleteCustomSponsor) return;
    
    try {
      await deleteCustomSponsor(sponsorId);
      await loadCustomSponsorsData(); // Reload sponsors
      console.log('✅ Deleted custom sponsor');
    } catch (error) {
      console.error('❌ Error deleting sponsor:', error);
      throw error;
    }
  };

  // ✅ NEW: Update sponsor breaks handler
  const handleUpdateSponsorBreaks = async (numBreaks: number) => {
    if (!updateSessionPhase) return;
    
    try {
      await updateSessionPhase(
        session?.current_phase || 'waiting',
        session?.current_question || 0,
        session?.question_start_time || new Date().toISOString(),
        session?.current_question_options_shuffled || null,
        numBreaks
      );
      console.log('✅ Updated sponsor breaks to:', numBreaks);
    } catch (error) {
      console.error('❌ Error updating sponsor breaks:', error);
      throw error;
    }
  };

  // ✅ NEW: Toggle points display
  const handleTogglePoints = () => {
    setShowPoints(prev => !prev);
    console.log('🎯 Toggled points display:', !showPoints);
  };

  // ✅ NEW: Question management functions
  const handleOpenQuestionCreator = () => {
    setShowQuestionCreator(true);
  };

  const handleCloseQuestionCreator = () => {
    setShowQuestionCreator(false);
  };

  const handleQuestionAdded = () => {
    console.log('✅ Question added successfully');
    loadCustomQuestions(); // Reload the questions list
    setShowQuestionCreator(false);
  };

  const handleOpenCsvUpload = () => {
    setShowCsvUpload(true);
  };

  const handleCloseCsvUpload = () => {
    setShowCsvUpload(false);
  };

  const handleCsvQuestionsUploaded = async (uploadedQuestions: UploadedQuestion[]) => {
    console.log('📤 Saving uploaded questions:', uploadedQuestions.length);
    
    // Validate session ID first
    if (!sessionId || sessionId.trim() === '') {
      alert('Invalid session. Please refresh the page and try again.');
      return;
    }
    
    try {
      // Convert uploaded questions to the format expected by the database
      const questionsToInsert = uploadedQuestions.map(q => ({
        session_id: sessionId,
        prompt: q.prompt,
        correct_answer: q.correctAnswer,
        wrong_answers: q.wrongAnswers,
        sarcasm_level: q.sarcasmLevel
      }));

      const { data, error } = await supabase
        .from('custom_questions')
        .insert(questionsToInsert)
        .select();

      if (error) {
        console.error('❌ Failed to save uploaded questions:', error);
        alert('Failed to save questions. Please try again.');
        return;
      }

      console.log('✅ Successfully saved', data.length, 'questions from CSV');
      
      // Reload the questions list and close the upload section
      await loadCustomQuestions();
      setShowCsvUpload(false);
      
      alert(`Successfully saved ${data.length} questions from CSV!`);
      
    } catch (error) {
      console.error('❌ Error saving uploaded questions:', error);
      
      // Enhanced error logging and user feedback
      let errorMessage = 'Failed to save questions. ';
      
      if (error instanceof Error) {
        console.error('❌ Detailed error info:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        
        // Check for common Supabase errors
        if (error.message.includes('JWT')) {
          errorMessage += 'Authentication issue - please refresh the page and try again.';
        } else if (error.message.includes('permission')) {
          errorMessage += 'Permission denied - check your Supabase configuration.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage += 'Network error - check your internet connection.';
        } else if (error.message.includes('duplicate') || error.message.includes('unique')) {
          errorMessage += 'Some questions may already exist in this session.';
        } else {
          errorMessage += `Error: ${error.message}`;
        }
      } else {
        errorMessage += 'Unknown error occurred.';
      }
      
      // Log environment variables status for debugging
      console.error('❌ Environment check:', {
        hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
        hasSupabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        sessionId: sessionId,
        questionsToSave: uploadedQuestions.length,
        userAuthenticated: !!user
      });
      
      alert(errorMessage);
    }
  };

  const loadCustomQuestions = async () => {
    if (!sessionId || sessionId.trim() === '') {
      console.warn('⚠️ Cannot load custom questions - invalid session ID');
      return;
    }
    
    try {
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

  const handleStartGameWithCustomQuestions = () => {
    if (customQuestions.length === 0) {
      alert('Please create at least one question before starting the game.');
      return;
    }
    setCurrentPhase('waiting');
  };

  if (isLoading || !gameData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
        <div className="text-white text-2xl font-bold animate-pulse">
          Loading the chaos... 🎪
        </div>
      </div>
    );
  }

  if (combinedError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 to-purple-600 flex items-center justify-center p-8">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-3xl font-bold mb-4">Oops! Something went wrong</h1>
          <p className="text-xl mb-4">{combinedError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-white text-red-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ✅ NEW: Convert custom questions to game format
  const convertCustomQuestionsToGameFormat = () => {
    return customQuestions.map((q, index) => ({
      type: 'multiple_choice' as const,
      id: q.id || `custom-${index}`, // Use database ID or fallback
      prompt: q.prompt,
      options: [q.correct_answer, ...q.wrong_answers], // ✅ REMOVE SHUFFLING HERE - Shuffling is now done once in useEffect
      correct_index: 0, // Will be recalculated after shuffle
      timer: 15, // Default timer
      image_url: q.image_url, // ✅ NEW: Include image URL from database
      feedback: {
        correct: {
          text: `Correct! You got that one right!`
        },
        wrong: {
          text: `Wrong! The correct answer was: ${q.correct_answer}`
        }
      }
    }));
  };

  // ✅ NEW: Get current questions (custom or default)
  const getCurrentQuestions = () => {
    if (customQuestions.length > 0) {
      const converted = convertCustomQuestionsToGameFormat();
      // Fix correct_index after shuffling
      return converted.map(q => {
        const correctAnswer = customQuestions.find(cq => cq.prompt === q.prompt)?.correct_answer;
        const correctIndex = q.options.findIndex(option => option === correctAnswer);
        return {
          ...q,
          correct_index: correctIndex >= 0 ? correctIndex : 0
        };
      });
    }
    // Add stable IDs to default questions
    return (gameData?.questions || []).map((q, index) => ({
      ...q,
      id: q.id || `default-${index}`
    }));
  };

  return (
    <div className="font-sans bg-gray-900 min-h-screen">
      {/* ✅ NEW: Presenter Header */}
      <div className="bg-black/80 backdrop-blur-sm border-b border-white/20 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white">🎮 Presenter View</h1>
            <div className="bg-purple-500/20 px-3 py-1 rounded-full border border-purple-400/50">
              <span className="text-purple-300 text-sm font-medium">{session?.title || initialTitle}</span>
            </div>
            {user && (
              <div className="bg-blue-500/20 px-3 py-1 rounded-full border border-blue-400/50">
                <span className="text-blue-300 text-sm font-medium">👤 {user.email}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2"
              >
                ← My Quizzes
              </button>
            )}
            
            {/* Only show Jumbotron controls when session is active and not in welcome/setup phases */}
            {sessionId && currentPhase !== 'welcome' && currentPhase !== 'question_setup' && (
              !isJumbotronOpen ? (
                <button
                  onClick={handleOpenJumbotron}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2"
                >
                  📺 Open Jumbotron Display
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-sm font-medium">Jumbotron Active</span>
                  <button
                    onClick={closeJumbotronDisplay}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Close
                  </button>
                </div>
              )
            )}
            
            {/* Connection Status Indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected && isHealthy ? 'bg-green-400 animate-pulse' : 
                fallbackPolling ? 'bg-yellow-400 animate-pulse' : 
                'bg-red-400'
              }`}></div>
              <span className={`text-xs font-medium ${
                isConnected && isHealthy ? 'text-green-400' : 
                fallbackPolling ? 'text-yellow-400' : 
                'text-red-400'
              }`}>
                {isConnected && isHealthy ? 'Live' : 
                 fallbackPolling ? 'Polling' : 
                 'Offline'}
              </span>
            </div>
            
            <button
              onClick={() => window.open('/admin/analytics', '_blank')}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2"
            >
              📊 Analytics
            </button>
            
            <button
              onClick={signOut}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Debug Panel for Development */}
        {import.meta.env.DEV && (
          <div className="bg-black/60 backdrop-blur-sm border-b border-white/10 p-2">
            <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
              <div className="flex items-center gap-4 text-gray-400">
                <span>🔌 Connected: {isConnected ? 'Yes' : 'No'}</span>
                <span>💚 Healthy: {isHealthy ? 'Yes' : 'No'}</span>
                <span>📊 Polling: {fallbackPolling ? 'Active' : 'Inactive'}</span>
                <span>📈 Version: {session?.version || 'N/A'}</span>
              </div>
              <button
                onClick={() => {
                  const telemetry = getTelemetryData?.();
                  console.log('📊 Telemetry Data:', telemetry);
                  alert(`Telemetry: ${telemetry?.summary.totalEvents || 0} events, ${telemetry?.summary.reconnectCount || 0} reconnects`);
                }}
                className="bg-purple-500/20 hover:bg-purple-500/40 px-2 py-1 rounded text-purple-300"
              >
                View Telemetry
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Question Setup/Creator - Only show during setup phase */}
      {currentPhase === 'question_setup' && (
        <div className="max-w-7xl mx-auto mt-6">
          <GamePhaseRenderer
            currentPhase={currentPhase as any}
            gameData={gameData as any}
            selectedIntroText={selectedIntroText}
            sessionId={sessionId}
            players={players || []}
            currentQuestionIndex={currentQuestionIndex}
            questionResults={questionResults}
            shuffledHostQuestionData={shuffledHostQuestionData}
            showPoints={showPoints}
            customQuestions={customQuestions}
            customSponsors={customSponsors}
            numSponsorBreaks={session?.num_sponsor_breaks || 0}
            showQuestionCreator={showQuestionCreator}
            showCsvUpload={showCsvUpload}
            isJumbotron={false}
            onStartQuiz={handleStartQuiz}
            onStartGameWithCustomQuestions={() => {
              console.log('➡️ Leaving setup, going to Admin Control Panel');
              setShowQuestionCreator(false);
              setShowCsvUpload(false);
              setCurrentPhase('waiting');
            }}
            onStartGame={handleStartGame}
            onRestartGame={handleRestartGame}
            onNextPhase={handleNextPhase}
            onTogglePoints={handleTogglePoints}
            onOpenQuestionCreator={handleOpenQuestionCreator}
            onCloseQuestionCreator={handleCloseQuestionCreator}
            onQuestionAdded={handleQuestionAdded}
            onOpenCsvUpload={handleOpenCsvUpload}
            onCloseCsvUpload={handleCloseCsvUpload}
            onCsvQuestionsUploaded={handleCsvQuestionsUploaded}
            onQuestionsChanged={loadCustomQuestions}
            onAddSponsor={addCustomSponsor}
            onDeleteSponsor={deleteCustomSponsor}
            onUpdateSponsorBreaks={handleUpdateSponsorBreaks}
            onSponsorsChanged={loadCustomSponsors}
            getCurrentQuestions={getCurrentQuestions}
            getAllStreaks={getAllStreaks}
            currentSponsorIndex={currentSponsorIndex}
            onNextSponsor={handleNextSponsor}
            getQuestionResults={getQuestionResults}
            isConnected={isConnected}
            isHealthy={isHealthy}
            fallbackPolling={fallbackPolling}
            reconnectAttempts={0}
            onRefreshPlayers={reloadPlayers}
          />
        </div>
      )}
      
      {/* Hide Admin Control Panel during question setup/creator */}
      {currentPhase !== 'question_setup' && (
        <AdminControlPanel
          session={session}
          players={players || []}
          currentPhase={currentPhase}
          currentQuestionIndex={currentQuestionIndex}
          gameData={gameData}
          customQuestions={customQuestions}
          showPoints={showPoints}
          jumbotronWindow={jumbotronWindow}
          isConnected={isConnected}
          isHealthy={isHealthy}
          fallbackPolling={fallbackPolling}
          reconnectAttempts={0}
          onStartGame={handleStartGame}
          onNextPhase={handleNextPhase}
          onTogglePoints={handleTogglePoints}
          onRefreshPlayers={reloadPlayers}
          onClearAllPlayers={clearAllPlayers}
          onOpenJumbotron={handleOpenJumbotron}
          onBackToDashboard={onBackToDashboard}
          onSignOut={signOut}
        />
      )}
    </div>
  );
};