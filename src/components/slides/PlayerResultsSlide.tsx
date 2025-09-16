import React, { useEffect, useState } from 'react';
import { GameData } from '../../types/game';
import { AnimatedText } from '../AnimatedText';
import { SlideTransition } from '../SlideTransition';
import { GameButton } from '../GameButton';
import { Trophy, X, Zap, Turtle, Plus } from 'lucide-react';
import { useAudio } from '../../hooks/useAudio';

interface PlayerResultsSlideProps {
  sessionId: string;
  questionIndex: number;
  playerId: string;
  playerName: string;
  gameData: GameData;
  getQuestionResults: (questionIndex: number) => Promise<any>;
}

export const PlayerResultsSlide: React.FC<PlayerResultsSlideProps> = ({
  sessionId,
  questionIndex,
  playerId,
  playerName,
  gameData,
  getQuestionResults
}) => {
  const [results, setResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [playerResult, setPlayerResult] = useState<'correct' | 'wrong' | null>(null);
  const [isPlayerFastest, setIsPlayerFastest] = useState(false);
  const [isPlayerSlowest, setIsPlayerSlowest] = useState(false);
  const [snarkyComment, setSnarkyComment] = useState<string>('');
  const [showComment, setShowComment] = useState(false);
  const [showPlayCommentButton, setShowPlayCommentButton] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number>(0);
  
  const { playAudio, isPlaying } = useAudio();

  // Guard clause for missing data
  if (!gameData || !gameData.group_feedback) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-8">
        <div className="text-center text-white">
          <div className="text-6xl mb-4 animate-pulse">📊</div>
          <h1 className="text-3xl font-bold mb-4">Loading Results...</h1>
          <p className="text-lg text-gray-300">Calculating scores...</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadResults();
  }, [questionIndex]);

  const loadResults = async () => {
    try {
      const questionResults = await getQuestionResults(questionIndex);
      if (!questionResults) {
        console.error('No results returned');
        return;
      }
      
      setResults(questionResults);
      
      // Determine player's result with null checks
      const playerCorrect = questionResults.correct?.find((a: any) => a?.players?.id === playerId);
      const playerWrong = questionResults.wrong?.find((a: any) => a?.players?.id === playerId);
      
      if (playerCorrect) {
        setPlayerResult('correct');
        // ✅ FIXED: Get points earned from database or fallback to client calculation
        setPointsEarned(playerCorrect.points_earned || playerCorrect.pointsEarned || 0);
      } else if (playerWrong) {
        setPlayerResult('wrong');
        setPointsEarned(0); // Wrong answers get 0 points
      }
      
      // Check if player was fastest/slowest with null checks
      const playerIsFastest = questionResults.fastest?.players?.id === playerId;
      const playerIsSlowest = questionResults.slowest?.players?.id === playerId;
      setIsPlayerFastest(playerIsFastest);
      setIsPlayerSlowest(playerIsSlowest);
      
      // Generate single snarky comment for this player
      generateSnarkyComment(playerCorrect ? 'correct' : 'wrong', playerIsFastest, playerIsSlowest);
      
      setShowResults(true);
      
      // Show comment after results
      setTimeout(() => {
        setShowComment(true);
      }, 2000);
      
    } catch (error) {
      console.error('Failed to load results:', error);
    }
  };

  const generateSnarkyComment = (result: 'correct' | 'wrong', fastest: boolean, slowest: boolean) => {
    const { group_feedback } = gameData;
    if (!group_feedback || !group_feedback.correct || !group_feedback.wrong) {
      setSnarkyComment('Well, that was interesting!');
      return;
    }
    
    let comment = '';
    
    if (result === 'correct' && group_feedback.correct.length > 0) {
      const template = group_feedback.correct[Math.floor(Math.random() * group_feedback.correct.length)];
      comment = template?.replace('[name]', playerName) || 'Good job!';
    } else if (result === 'wrong' && group_feedback.wrong.length > 0) {
      const template = group_feedback.wrong[Math.floor(Math.random() * group_feedback.wrong.length)];
      comment = template?.replace('[name]', playerName) || 'Better luck next time!';
    }
    
    // Add special comments for speed
    if (fastest && group_feedback.fastest?.length > 0) {
      const fastestTemplate = group_feedback.fastest[Math.floor(Math.random() * group_feedback.fastest.length)];
      if (fastestTemplate) {
        comment += ' ' + fastestTemplate.replace('[name]', playerName);
      }
    } else if (slowest && group_feedback.slowest?.length > 0) {
      const slowestTemplate = group_feedback.slowest[Math.floor(Math.random() * group_feedback.slowest.length)];
      if (slowestTemplate) {
        comment += ' ' + slowestTemplate.replace('[name]', playerName);
      }
    }
    
    setSnarkyComment(comment || 'That was... something!');
    
    // Show play button instead of auto-playing audio
    if (comment) {
      setShowPlayCommentButton(true);
    }
  };

  const handlePlayComment = () => {
    if (snarkyComment && !isPlaying) {
      playAudio(snarkyComment, {
        priority: true,
        onComplete: () => {
          console.log('✅ Player results audio completed successfully');
          setShowPlayCommentButton(false);
        },
        onError: (error) => {
          console.error('❌ Player results audio error:', error);
          console.log('🔊 Audio error details:', {
            comment: snarkyComment.substring(0, 50),
            userAgent: navigator.userAgent,
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            timestamp: new Date().toISOString()
          });
          setShowPlayCommentButton(false);
        }
      });
    }
  };

  if (!results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-8">
        <div className="text-center text-white">
          <div className="text-6xl mb-4 animate-pulse">📊</div>
          <h1 className="text-3xl font-bold mb-4">Loading Results...</h1>
          <p className="text-lg text-gray-300">Calculating scores...</p>
        </div>
      </div>
    );
  }

  const correctCount = results.correct?.length || 0;
  const wrongCount = results.wrong?.length || 0;
  const totalPlayers = correctCount + wrongCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-blue-600 to-purple-600 flex flex-col items-center justify-center p-4 text-white relative overflow-hidden">
      {/* Celebration background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 text-8xl opacity-30 animate-bounce">🎉</div>
        <div className="absolute top-20 right-20 text-6xl opacity-40 animate-spin">⭐</div>
        <div className="absolute bottom-10 left-20 text-7xl opacity-30 animate-pulse">🏆</div>
        <div className="absolute bottom-20 right-10 text-5xl opacity-40 animate-bounce">🎊</div>
      </div>

      <div className="max-w-2xl w-full z-10">
        <SlideTransition isVisible={showResults} direction="bounce" className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500">
            RESULTS! 📊
          </h1>
          
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/30 mb-6">
            <h2 className="text-2xl font-bold mb-4">Question {questionIndex + 1} Results</h2>
            
            {/* Player's Result */}
            <div className={`p-6 rounded-xl mb-6 ${
              playerResult === 'correct' 
                ? 'bg-green-500/30 border-2 border-green-400' 
                : 'bg-red-500/30 border-2 border-red-400'
            }`}>
              <div className="flex items-center justify-center gap-3 mb-3">
                {playerResult === 'correct' ? (
                  <Trophy className="w-8 h-8 text-green-400" />
                ) : (
                  <X className="w-8 h-8 text-red-400" />
                )}
                <h3 className="text-2xl font-bold">
                  {playerResult === 'correct' ? 'CORRECT!' : 'WRONG!'}
                </h3>
              </div>
              
              {/* ✅ NEW: Show points earned prominently */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className={`flex items-center gap-1 px-4 py-2 rounded-full ${
                  playerResult === 'correct' 
                    ? 'bg-green-600/40 border border-green-400' 
                    : 'bg-red-600/40 border border-red-400'
                }`}>
                  <Plus className={`w-5 h-5 ${
                    playerResult === 'correct' ? 'text-green-300' : 'text-red-300'
                  }`} />
                  <span className={`text-xl font-bold ${
                    playerResult === 'correct' ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {pointsEarned} pts
                  </span>
                </div>
              </div>
              
              <p className="text-lg">
                {playerResult === 'correct' 
                  ? `Great job! You earned ${pointsEarned} points!` 
                  : 'Better luck next time!'}
              </p>

              {/* ✅ NEW: Show the correct answer */}
              {gameData.questions?.[questionIndex] && (
                <div className="mt-4 bg-white/10 rounded-lg p-4 border border-white/30">
                  <h4 className="text-lg font-bold text-yellow-400 mb-2">Correct Answer:</h4>
                  {(() => {
                    const currentQuestion = gameData.questions[questionIndex];
                    if (currentQuestion.type === 'multiple_choice') {
                      if (currentQuestion.correct_index === -1) {
                        // Trick question - all answers are correct
                        return (
                          <p className="text-white">
                            <span className="font-bold text-yellow-300">Trick Question!</span> All answers were correct!
                          </p>
                        );
                      } else {
                        // Regular question with one correct answer
                        const correctOption = currentQuestion.options[currentQuestion.correct_index];
                        return (
                          <p className="text-white">
                            <span className="font-bold text-yellow-300">
                              {String.fromCharCode(65 + currentQuestion.correct_index)}.
                            </span> {correctOption}
                          </p>
                        );
                      }
                    }
                    return <p className="text-gray-300">Answer not available</p>;
                  })()}
                </div>
              )}
            </div>

            {/* Speed Awards */}
            {(isPlayerFastest || isPlayerSlowest) && (
              <div className="grid grid-cols-1 gap-4 mb-6">
                {isPlayerFastest && (
                  <div className="bg-yellow-500/20 backdrop-blur-sm rounded-xl p-4 border border-yellow-400/50">
                    <div className="flex items-center justify-center gap-3">
                      <Zap className="w-6 h-6 text-yellow-400" />
                      <h3 className="text-xl font-bold text-yellow-400">Fastest Finger!</h3>
                    </div>
                    <p className="text-center text-yellow-300">Lightning quick! ⚡</p>
                  </div>
                )}
                
                {isPlayerSlowest && (
                  <div className="bg-orange-500/20 backdrop-blur-sm rounded-xl p-4 border border-orange-400/50">
                    <div className="flex items-center justify-center gap-3">
                      <Turtle className="w-6 h-6 text-orange-400" />
                      <h3 className="text-xl font-bold text-orange-400">Slowest Responder</h3>
                    </div>
                    <p className="text-center text-orange-300">Taking your time! 🐢</p>
                  </div>
                )}
              </div>
            )}

            {/* Overall Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-500/20 rounded-lg p-4 border border-green-400/50">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{correctCount}</div>
                  <div className="text-sm text-green-300">Got it right</div>
                </div>
              </div>
              
              <div className="bg-red-500/20 rounded-lg p-4 border border-red-400/50">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">{wrongCount}</div>
                  <div className="text-sm text-red-300">Got it wrong</div>
                </div>
              </div>
            </div>
          </div>
        </SlideTransition>

        {/* Snarky Comment */}
        {showComment && snarkyComment && (
          <SlideTransition isVisible={true} direction="bounce" className="text-center">
            <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-6 border-2 border-white/40">
              <div className="text-4xl mb-4">🎭</div>
              <AnimatedText 
                text={snarkyComment}
                className="text-lg md:text-xl leading-relaxed font-bold"
                delay={200}
                speed={40}
              />
              
              {/* Play Comment Button */}
              {showPlayCommentButton && (
                <div className="mt-4">
                  <GameButton
                    onClick={handlePlayComment}
                    variant="primary"
                    disabled={isPlaying}
                    className="bg-purple-500 hover:bg-purple-600"
                  >
                    {isPlaying ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Playing...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        🔊 Hear the Comment
                      </div>
                    )}
                  </GameButton>
                </div>
              )}
            </div>
          </SlideTransition>
        )}

        {/* Waiting message */}
        <div className="text-center mt-8">
          <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-400/50">
            <p className="text-blue-300 text-lg">
              Waiting for the host to continue...
            </p>
            <div className="mt-2 animate-pulse text-2xl">⏳</div>
          </div>
        </div>
      </div>
    </div>
  );
};