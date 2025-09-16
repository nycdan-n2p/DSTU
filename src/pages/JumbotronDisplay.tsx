import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { GameData } from '../types/game';
import { useJumbotronDisplay } from '../hooks/useJumbotronDisplay';
import { useSessionManager } from '../hooks/useSessionManager';
import { GamePhaseRenderer } from '../components/GamePhaseRenderer';
import { supabase } from '../lib/supabase';

export const JumbotronDisplay: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [selectedIntroText, setSelectedIntroText] = useState<string>('');
  const [customQuestions, setCustomQuestions] = useState<any[]>([]);
  const [customSponsors, setCustomSponsors] = useState<any[]>([]);
  const [currentSponsorIndex, setCurrentSponsorIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [jumbotronQuestionResults, setJumbotronQuestionResults] = useState<any>(null);
  const [shuffledHostQuestionData, setShuffledHostQuestionData] = useState<{
    questionId: string;
    shuffledOptions: string[];
    shuffledCorrectAnswerIndex: number;
  } | null>(null);

  const { 
    session, 
    players = [], 
    loading: gameSessionLoading,
    error: gameSessionError,
    isConnected,
    isHealthy,
    fallbackPolling,
    getQuestionResults,
    loadCustomSponsors
  } = useJumbotronDisplay(sessionId || undefined);

  const { isValidSession, clearAllSessionData } = useSessionManager();

  // ✅ NEW: Debug logging for jumbotron player data
  useEffect(() => {
    console.log('📺 Jumbotron Display State Update:', {
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
      sessionPhase: session?.current_phase,
      sessionQuestion: session?.current_question,
      gameSessionLoading,
      gameSessionError
    });
  }, [sessionId, players, session, gameSessionLoading, gameSessionError]);

  // Always call hooks in the same order
  useEffect(() => {
    console.log('📺 JumbotronDisplay: loadGameData effect triggered');
    loadGameData();
    
    if (!isValidSession(sessionId)) {
      console.log('Invalid session detected, clearing data');
      clearAllSessionData();
      return;
    }
  }, [sessionId, isValidSession, clearAllSessionData]);

  // Load custom questions and sponsors
  useEffect(() => {
    console.log('📺 JumbotronDisplay: loadCustomQuestions effect triggered for sessionId:', sessionId);
    if (sessionId) {
      loadCustomQuestions();
      loadCustomSponsorsData();
    }
  }, [sessionId]);

  // Handle question shuffling for display
  useEffect(() => {
    if (session?.current_phase === 'question' && session?.current_question_options_shuffled) {
      const currentQuestions = getCurrentQuestions();
      const currentQuestion = currentQuestions[session.current_question];
      
      if (currentQuestion && currentQuestion.options && Array.isArray(currentQuestion.options)) {
        const questionId = currentQuestion.id || `jumbotron-${session.current_question}-${currentQuestion.prompt}`;
        const shuffled = session.current_question_options_shuffled;
        
        // ✅ FIXED: Prevent unnecessary updates if shuffled data hasn't changed
        if (shuffledHostQuestionData && 
            shuffledHostQuestionData.questionId === questionId &&
            JSON.stringify(shuffledHostQuestionData.shuffledOptions) === JSON.stringify(shuffled)) {
          console.log('📺 Jumbotron: Shuffled options unchanged, skipping update');
          return;
        }
        
        console.log('📺 Jumbotron: Setting new shuffled options for question:', questionId);
        
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
        
        console.log('✅ Jumbotron: Shuffled data updated:', {
          questionId,
          shuffledOptions: shuffled,
          newCorrectIndex
        });
      }
    } else {
      // Only clear if we currently have shuffled data
      if (shuffledHostQuestionData) {
        setShuffledHostQuestionData(null);
        console.log('🔀 Jumbotron: Cleared shuffled data (not in question phase or no options)');
      }
    }
  }, [session?.current_phase, session?.current_question, session?.current_question_options_shuffled, shuffledHostQuestionData]);

  // Load question results when entering results phase
  useEffect(() => {
    if (session?.current_phase === 'results' && session?.current_question !== undefined && getQuestionResults) {
      console.log('📺 Jumbotron: Loading results for question:', session.current_question);
      
      const loadResults = async () => {
        try {
          const results = await getQuestionResults(session.current_question);
          setJumbotronQuestionResults(results);
          console.log('✅ Jumbotron: Results loaded:', results);
        } catch (error) {
          console.error('❌ Jumbotron: Failed to load results:', error);
          setJumbotronQuestionResults(null);
        }
      };
      
      loadResults();
    } else {
      // Clear results when not in results phase
      if (jumbotronQuestionResults) {
        setJumbotronQuestionResults(null);
        console.log('🔀 Jumbotron: Cleared question results (not in results phase)');
      }
    }
  }, [session?.current_phase, session?.current_question, getQuestionResults, jumbotronQuestionResults]);

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
      }
      
      setGameData(data);
    } catch (error) {
      console.error('Failed to load game data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomQuestions = async () => {
    if (!sessionId) return;
    
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

      setCustomQuestions(data || []);
    } catch (error) {
      console.error('❌ Error loading custom questions:', error);
    }
  };

  const loadCustomSponsorsData = async () => {
    if (!sessionId || !loadCustomSponsors) return;
    
    try {
      const sponsors = await loadCustomSponsors();
      setCustomSponsors(sponsors || []);
    } catch (error) {
      console.error('❌ Error loading custom sponsors:', error);
    }
  };

  const getCurrentQuestions = () => {
    if (customQuestions.length > 0) {
      return customQuestions.map((q, index) => ({
        type: 'multiple_choice' as const,
        id: q.id || `custom-${index}`,
        prompt: q.prompt,
        options: [q.correct_answer, ...q.wrong_answers],
        correct_index: 0,
        timer: 15,
        image_url: q.image_url,
        feedback: {
          correct: { text: `Correct! You got that one right!` },
          wrong: { text: `Wrong! The correct answer was: ${q.correct_answer}` }
        }
      }));
    }
    return (gameData?.questions || []).map((q, index) => ({
      ...q,
      id: q.id || `default-${index}`
    }));
  };

  const handleNextSponsor = () => {
    setCurrentSponsorIndex(prev => prev + 1);
  };

  // Combine loading states
  const isLoading = loading || gameSessionLoading;
  
  // Combine error states
  const combinedError = gameSessionError;

  if (isLoading || !gameData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
        <div className="text-white text-2xl font-bold animate-pulse">
          Loading the show... 🎪
        </div>
      </div>
    );
  }

  if (combinedError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 to-purple-600 flex items-center justify-center p-8">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-3xl font-bold mb-4">Connection Error</h1>
          <p className="text-xl mb-4">{combinedError}</p>
          
          {/* Network troubleshooting info */}
          {combinedError.includes('Failed to fetch') || combinedError.includes('Network connection') ? (
            <div className="mb-6 bg-red-500/20 rounded-lg p-4 border border-red-400/50 max-w-md mx-auto">
              <h3 className="text-lg font-bold mb-2">Network Issue Detected</h3>
              <div className="text-sm text-red-200 text-left space-y-1">
                <p>• Check your internet connection</p>
                <p>• Verify Supabase project is active</p>
                <p>• Ensure no firewall is blocking the connection</p>
                <p>• Try refreshing the page</p>
              </div>
            </div>
          ) : null}
          
          {/* Connection Status */}
          <div className="mb-4 flex items-center justify-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              isConnected && isHealthy ? 'bg-green-400 animate-pulse' : 
              fallbackPolling ? 'bg-yellow-400 animate-pulse' : 
              'bg-red-400'
            }`}></div>
            <span className={`text-sm ${
              isConnected && isHealthy ? 'text-green-400' : 
              fallbackPolling ? 'text-yellow-400' : 
              'text-red-400'
            }`}>
              {isConnected && isHealthy ? 'Live Connection' : 
               fallbackPolling ? 'Backup Mode Active' : 
               'Connection Lost'}
            </span>
          </div>
          
          <button 
            onClick={() => window.location.reload()} 
            className="bg-white text-red-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors"
          >
            Refresh Display
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-8">
        <div className="text-center text-white">
          <div className="text-6xl mb-4 animate-pulse">🔄</div>
          <h1 className="text-3xl font-bold mb-4">Waiting for Game...</h1>
          <p className="text-xl mb-2">Connecting to session</p>
          <p className="text-lg text-gray-300">Please wait...</p>
          
          {/* Connection Status */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              isConnected && isHealthy ? 'bg-green-400 animate-pulse' : 
              fallbackPolling ? 'bg-yellow-400 animate-pulse' : 
              'bg-red-400'
            }`}></div>
            <span className={`text-sm ${
              isConnected && isHealthy ? 'text-green-400' : 
              fallbackPolling ? 'text-yellow-400' : 
              'text-red-400'
            }`}>
              {isConnected && isHealthy ? 'Live Connection' : 
               fallbackPolling ? 'Backup Mode' : 
               'Connecting...'}
            </span>
          </div>
        </div>
      </div>
    );
  }



  console.log('📺 JumbotronDisplay rendering with phase:', session?.current_phase);
  
  return (
    <div className="font-sans">
      <GamePhaseRenderer
        currentPhase={session.current_phase as any}
        gameData={gameData}
        selectedIntroText={selectedIntroText}
        sessionId={sessionId!}
        players={players}
        currentQuestionIndex={session.current_question}
        questionResults={jumbotronQuestionResults}
        shuffledHostQuestionData={shuffledHostQuestionData}
        showPoints={true}
        customQuestions={customQuestions}
        customSponsors={customSponsors}
        numSponsorBreaks={session?.num_sponsor_breaks || 0}
        showQuestionCreator={false}
        showCsvUpload={false}
        isJumbotron={true} // This is the key prop that makes it a display-only view
        onStartQuiz={() => {}} // No-op functions for jumbotron
        onStartGameWithCustomQuestions={() => {}}
        onStartGame={() => {}}
        onRestartGame={() => {}}
        onNextPhase={() => {}}
        onTogglePoints={() => {}}
        onOpenQuestionCreator={() => {}}
        onCloseQuestionCreator={() => {}}
        onQuestionAdded={() => {}}
        onOpenCsvUpload={() => {}}
        onCloseCsvUpload={() => {}}
        onCsvQuestionsUploaded={() => {}}
        onQuestionsChanged={() => {}}
        onAddSponsor={async () => {}}
        onDeleteSponsor={async () => {}}
        onUpdateSponsorBreaks={async () => {}}
        onSponsorsChanged={() => {}}
        getCurrentQuestions={getCurrentQuestions}
        getAllStreaks={() => []}
        currentSponsorIndex={currentSponsorIndex}
        onNextSponsor={handleNextSponsor}
        getQuestionResults={getQuestionResults}
      />
    </div>
  );
};