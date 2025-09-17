import React, { useEffect, useState } from 'react';
import { MultipleChoiceQuestion, TrickQuestion, Player } from '../../types/game';
import { AnimatedText } from '../AnimatedText';
import { SlideTransition } from '../SlideTransition';
import { Timer } from '../Timer';
import { PlayerList } from '../PlayerList';
import { AdminControls } from '../AdminControls';
import { AudioControls } from '../AudioControls';
import { useAudio } from '../../hooks/useAudio';

interface MultiplayerQuestionSlideProps {
  question: MultipleChoiceQuestion | TrickQuestion;
  shuffledOptions: string[];
  shuffledCorrectAnswerIndex: number;
  players: Player[];
  onTimeUp: () => void;
  onNextQuestion?: () => void;
  onRestartGame?: () => void;
  currentQuestion: number;
  totalQuestions: number;
  isHost?: boolean;
  // ✅ NEW: Points display control
  showPoints?: boolean;
  onTogglePoints?: () => void;
  streakTracker?: {
    getAllStreaks?: () => Array<{ playerId: string; currentStreak: number; maxStreak: number }>;
  };
  isJumbotron?: boolean;
  // ✅ NEW: Connection status
  isConnected?: boolean;
  isHealthy?: boolean;
  fallbackPolling?: boolean;
  reconnectAttempts?: number;
}

export const MultiplayerQuestionSlide: React.FC<MultiplayerQuestionSlideProps> = ({ 
  question, 
  shuffledOptions,
  shuffledCorrectAnswerIndex,
  players = [], 
  onTimeUp,
  onNextQuestion,
  onRestartGame,
  currentQuestion,
  totalQuestions,
  isHost = false,
  showPoints = true,
  onTogglePoints,
  streakTracker,
  isJumbotron = false,
  isConnected = true,
  isHealthy = true,
  fallbackPolling = false,
  reconnectAttempts = 0
}) => {
  const [showQuestion, setShowQuestion] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [hasPlayedQuestionAudio, setHasPlayedQuestionAudio] = useState(false);
  const [audioComplete, setAudioComplete] = useState(false);
  
  const { 
    playAudio, 
    replayAudio, 
    toggleMute, 
    changeVolume, 
    isPlaying, 
    volume 
  } = useAudio();

  // Guard clause for missing question data or shuffled options
  if (!question || !shuffledOptions || !Array.isArray(shuffledOptions) || shuffledOptions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-6xl mb-4 animate-pulse">⏳</div>
          <h1 className="text-3xl font-bold mb-4">Loading Question...</h1>
          <p className="text-xl">Preparing question {currentQuestion + 1} of {totalQuestions}</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    setShowQuestion(true);
    
    if (!hasPlayedQuestionAudio && question.prompt && !isJumbotron) {
      playAudio(question.prompt, {
        priority: true,
        onComplete: () => {
          setAudioComplete(true);
          // Start timer and show options after audio completes
          setTimeout(() => {
            setShowOptions(true);
            setTimerActive(true);
          }, 1000);
        }
      });
      setHasPlayedQuestionAudio(true);
    } else if (!hasPlayedQuestionAudio && question.prompt && isJumbotron) {
      // ✅ FIXED: Enable question audio on jumbotron
      console.log('📺 Jumbotron: Playing question audio:', question.prompt.substring(0, 50));
      playAudio(question.prompt, {
        priority: true,
        onComplete: () => {
          console.log('✅ Jumbotron: Question audio completed');
          setAudioComplete(true);
          // Start timer and show options after audio completes
          setTimeout(() => {
            setShowOptions(true);
            setTimerActive(true);
          }, 1000);
        },
        onError: (error) => {
          console.error('❌ Jumbotron: Question audio error:', error);
          // Show content even if audio fails
          setAudioComplete(true);
          setTimeout(() => {
            setShowOptions(true);
            setTimerActive(true);
          }, 1000);
        }
      });
      setHasPlayedQuestionAudio(true);
    } else {
      // When no audio, show content immediately
      setAudioComplete(true);
      setTimeout(() => {
        setShowOptions(true);
        setTimerActive(true);
      }, 1000);
    }
  }, [question, hasPlayedQuestionAudio, playAudio]);

  const handleTimeUp = () => {
    setTimerActive(false);
    onTimeUp();
  };

  const handleForceNext = () => {
    setTimerActive(false);
    onNextQuestion?.();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex flex-col items-center justify-center p-8 text-white relative overflow-hidden">
      {/* Dynamic background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 text-6xl opacity-20 animate-pulse">🤔</div>
        <div className="absolute bottom-20 right-10 text-6xl opacity-20 animate-bounce">❓</div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-9xl opacity-10 animate-spin">⏰</div>
      </div>

      <div className="max-w-7xl w-full z-10">
        <div className={isJumbotron ? "max-w-5xl mx-auto" : "grid grid-cols-1 lg:grid-cols-4 gap-8"}>
          <div className={isJumbotron ? "" : "lg:col-span-3"}>
            {/* Question Header */}
            <div className="text-center mb-6">
              <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-white/30 mb-4">
                <h2 className="text-xl font-bold text-yellow-400">
                  Question {currentQuestion + 1} of {totalQuestions}
                </h2>
              </div>
              
              {/* Audio Controls - Only show for presenter */}
              {!isJumbotron && (
                <div className="flex justify-center mb-4">
                  <AudioControls
                    isPlaying={isPlaying}
                    onVolumeToggle={toggleMute}
                    onReplay={replayAudio}
                    volume={volume}
                    onVolumeChange={changeVolume}
                  />
                </div>
              )}
            </div>

            <SlideTransition isVisible={showQuestion} direction="slide" className="text-center mb-8">
              <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-8 border border-white/30">
                <AnimatedText 
                  text={question.prompt || 'Loading question...'}
                  className={isJumbotron ? "text-3xl md:text-4xl font-bold leading-relaxed" : "text-2xl md:text-3xl font-bold leading-relaxed"}
                  delay={500}
                  speed={50}
                />
                
                {/* ✅ NEW: Display question image if available */}
                {question.image_url && (
                  <div className="mt-6 mb-6">
                    <img 
                      src={question.image_url} 
                      alt="Question illustration"
                      className={isJumbotron ? "max-w-full h-auto max-h-80 object-contain mx-auto rounded-lg shadow-lg border-2 border-white/20" : "max-w-full h-auto max-h-64 object-contain mx-auto rounded-lg shadow-lg border-2 border-white/20"}
                      onError={(e) => {
                        console.error('Failed to load question image:', question.image_url);
                        // Hide the image if it fails to load
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </SlideTransition>

            {/* Audio Status - Only show for presenter */}
            {!audioComplete && !isJumbotron && (
              <div className="text-center mb-6">
                <div className="bg-yellow-500/20 rounded-lg p-3 border border-yellow-400/50">
                  <p className="text-yellow-300 text-sm">
                    🔊 Listen to the question being read aloud...
                  </p>
                </div>
              </div>
            )}

            <SlideTransition isVisible={showOptions} direction="bounce" className={isJumbotron ? "grid grid-cols-1 md:grid-cols-2 gap-8 mb-8" : "grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"}>
              {shuffledOptions.map((option, index) => (
                <div
                  key={index}
                  className={isJumbotron ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-8 px-10 rounded-lg border-2 border-white/20 shadow-lg text-xl" : "bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-6 px-8 rounded-lg border-2 border-white/20 shadow-lg"}
                >
                  <span className={isJumbotron ? "text-2xl font-bold mr-6" : "text-lg font-bold mr-4"}>{String.fromCharCode(65 + index)}.</span>
                  {option}
                </div>
              ))}
            </SlideTransition>

            {showOptions && question.timer && (
              <SlideTransition isVisible={showOptions} direction="bounce" className="text-center">
                <Timer 
                  duration={question.timer}
                  onTimeUp={handleTimeUp}
                  isActive={timerActive && audioComplete}
                  className={isJumbotron ? "max-w-lg mx-auto" : "max-w-md mx-auto"}
                />
                
                {!audioComplete && !isJumbotron && (
                  <p className="text-yellow-300 text-sm mt-2">
                    Timer will start after audio completes
                  </p>
                )}
              </SlideTransition>
            )}
          </div>

          {/* Sidebar - Only show for presenter */}
          {!isJumbotron && (
            <div className="lg:col-span-1 space-y-6">
              <PlayerList 
                players={players || []} 
                showPoints={showPoints}
                currentPhase="question"
                streakTracker={streakTracker}
                isConnected={isConnected}
                isHealthy={isHealthy}
                fallbackPolling={fallbackPolling}
                reconnectAttempts={reconnectAttempts}
              />
              
              {isHost && (
                <AdminControls
                  onNextQuestion={handleForceNext}
                  onRestartGame={onRestartGame}
                  playerCount={players?.length || 0}
                  currentPhase="question"
                  currentQuestion={currentQuestion}
                  totalQuestions={totalQuestions}
                  showPoints={showPoints}
                  onTogglePoints={onTogglePoints}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};