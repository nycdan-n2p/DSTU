import React, { useEffect, useState } from 'react';
import { Player, GroupFeedback } from '../../types/game';
import { AnimatedText } from '../AnimatedText';
import { SlideTransition } from '../SlideTransition';
import { GameButton } from '../GameButton';
import { AdminControls } from '../AdminControls';
import { AudioControls } from '../AudioControls';
import { EmojiReaction } from '../EmojiReaction';
import { StreakDisplay } from '../StreakDisplay';
import { Trophy, X, Zap, Turtle, Plus } from 'lucide-react';
import { useAudio } from '../../hooks/useAudio';

// ✅ FIXED: Pure function to generate snarky comment - moved outside component to prevent re-generation
const generateSnarkyComment = (
  correctPlayers: any[],
  wrongPlayers: any[],
  fastestPlayer: any,
  slowestPlayer: any
): { comment: string; target: { name: string; isCorrect: boolean } | null } => {
  const totalPlayers = (correctPlayers?.length || 0) + (wrongPlayers?.length || 0);
  const correctCount = correctPlayers?.length || 0;
  const wrongCount = wrongPlayers?.length || 0;
  const correctPercentage = totalPlayers > 0 ? Math.round((correctCount / totalPlayers) * 100) : 0;
  
  let comment = '';
  let target = null;
  
  // Analyze performance and generate contextual comments
  if (totalPlayers === 0) {
    comment = "Well, this is awkward... nobody answered!";
  } else if (correctCount === 0) {
    // Everyone got it wrong
    const harshComments = [
      "Wow! A perfect score... of ZERO correct answers! 🎯",
      "Congratulations! You've all failed spectacularly together! 👏",
      "I've seen better performance from a broken calculator! 🧮",
      "Did everyone close their eyes and click randomly? 🙈",
      "This is why we can't have nice things, people! 🤦‍♂️",
      "I'm starting to think you're all doing this on purpose! 😤",
      "Even a coin flip would have better odds than this! 🪙"
    ];
    comment = harshComments[Math.floor(Math.random() * harshComments.length)];
  } else if (wrongCount === 0) {
    // Everyone got it right
    const tooEasyComments = [
      "Well, that was disappointingly easy! Time to turn up the heat! 🔥",
      "Did someone leak the answers? This is suspiciously perfect! 🕵️",
      "Guess I need to make these questions harder! You're all too smart! 🧠",
      "Either you're all geniuses or I'm going soft! 🤔",
      "100% correct? Time to separate the wheat from the chaff! 🌾",
      "Looks like someone's been studying! Show-offs! 📚",
      "Perfect scores all around? I'm clearly not trying hard enough! 💪"
    ];
    comment = tooEasyComments[Math.floor(Math.random() * tooEasyComments.length)];
  } else if (correctPercentage >= 80) {
    // Most got it right
    const mostCorrectComments = [
      `${correctPercentage}% got it right! Not bad, but we still have some stragglers! 🐌`,
      `Looks like ${wrongCount} of you were taking a little nap! 😴`,
      `${wrongCount} people clearly weren't paying attention! 👀`,
      `We've got ${correctCount} winners and ${wrongCount} people who need more coffee! ☕`,
      `${correctPercentage}% success rate! The other ${100-correctPercentage}% can try harder! 💪`,
      `Most of you nailed it! But ${wrongCount} of you... well, better luck next time! 🍀`
    ];
    comment = mostCorrectComments[Math.floor(Math.random() * mostCorrectComments.length)];
  } else if (correctPercentage >= 60) {
    // About half and half
    const mixedComments = [
      `Split decision! ${correctCount} got it, ${wrongCount} didn't. Perfectly balanced! ⚖️`,
      `We're divided! Half of you are awake, half are... somewhere else! 🌙`,
      `${correctPercentage}% vs ${100-correctPercentage}%! It's like a civil war in here! ⚔️`,
      `Mixed results! Some of you are sharp, others... not so much! 🔪`,
      `Half right, half wrong! At least you're consistent in your inconsistency! 🎭`,
      `${correctCount} heroes, ${wrongCount} zeros! Which side are you on? 🦸‍♂️`
    ];
    comment = mixedComments[Math.floor(Math.random() * mixedComments.length)];
  } else if (correctPercentage >= 30) {
    // Most got it wrong
    const mostWrongComments = [
      `Only ${correctCount} out of ${totalPlayers}? Seems like most of you were sleeping! 😴`,
      `${correctPercentage}% correct? I've seen better odds at a casino! 🎰`,
      `${wrongCount} people got it wrong! Did you all study from the same wrong textbook? 📖`,
      `Only ${correctCount} people paying attention today! The rest are in dreamland! 💭`,
      `${correctPercentage}% success rate? Time for a group study session! 📚`,
      `${wrongCount} wrong answers! I'm starting to question my teaching methods! 🤔`
    ];
    comment = mostWrongComments[Math.floor(Math.random() * mostWrongComments.length)];
  } else {
    // Very few got it right
    const fewCorrectComments = [
      `Only ${correctCount} got it right? This question was clearly too advanced! 🎓`,
      `${correctPercentage}% correct? I think I broke everyone's brains! 🧠💥`,
      `${correctCount} survivors out of ${totalPlayers}! The rest are casualties of war! ⚰️`,
      `Barely anyone got this! Either I'm evil or you all need more practice! 😈`,
      `${correctCount} correct answers? I'm impressed anyone got it at all! 👏`,
      `This question separated the pros from the... well, everyone else! 🏆`
    ];
    comment = fewCorrectComments[Math.floor(Math.random() * fewCorrectComments.length)];
  }
  
  // Add specific player callouts for extra spice
  if (fastestPlayer?.name && correctPlayers?.some(p => p.player_id === fastestPlayer.player_id)) {
    const speedComments = [
      ` Look at ${fastestPlayer.name} - lightning fingers and a working brain! ⚡`,
      ` ${fastestPlayer.name} had their finger on the trigger! Quick AND correct! 🎯`,
      ` ${fastestPlayer.name} came out swinging! Speed demon alert! 🏃‍♂️`,
      ` ${fastestPlayer.name} didn't even break a sweat! Show-off! 💪`,
      ` ${fastestPlayer.name} was ready for this one! Someone's been practicing! 🎮`
    ];
    if (Math.random() > 0.4) { // 60% chance to add speed comment
      comment += speedComments[Math.floor(Math.random() * speedComments.length)];
      target = { name: fastestPlayer.name, isCorrect: true };
    }
  } else if (slowestPlayer?.name && wrongPlayers?.some(p => p.player_id === slowestPlayer.player_id)) {
    const slowComments = [
      ` ${slowestPlayer.name} took so long I aged three years... and still got it wrong! ⏰`,
      ` ${slowestPlayer.name} was really thinking hard about that wrong answer! 🤔`,
      ` ${slowestPlayer.name} took their sweet time to be completely wrong! 🐌`,
      ` While ${slowestPlayer.name} was pondering, the rest of us moved on with our lives! ⏳`,
      ` ${slowestPlayer.name} really committed to that wrong choice! Dedication! 🎭`
    ];
    if (Math.random() > 0.5) { // 50% chance to add slow comment
      comment += slowComments[Math.floor(Math.random() * slowComments.length)];
      target = { name: slowestPlayer.name, isCorrect: false };
    }
  } else if (correctPlayers?.length > 0 && Math.random() > 0.6) {
    // Random correct player callout
    const randomCorrect = correctPlayers[Math.floor(Math.random() * correctPlayers.length)];
    const correctCallouts = [
      ` ${randomCorrect.name} is on fire today! 🔥`,
      ` ${randomCorrect.name} came to play! 🎮`,
      ` ${randomCorrect.name} is showing everyone how it's done! 👑`,
      ` ${randomCorrect.name} brought their A-game! 💯`,
      ` ${randomCorrect.name} is making this look easy! 😎`
    ];
    comment += correctCallouts[Math.floor(Math.random() * correctCallouts.length)];
    target = { name: randomCorrect.name, isCorrect: true };
  } else if (wrongPlayers?.length > 0 && Math.random() > 0.7) {
    // Random wrong player callout
    const randomWrong = wrongPlayers[Math.floor(Math.random() * wrongPlayers.length)];
    const wrongCallouts = [
      ` ${randomWrong.name} swung and missed! ⚾`,
      ` ${randomWrong.name} was so close... to being completely wrong! 🎯`,
      ` ${randomWrong.name} chose... poorly! 🏺`,
      ` ${randomWrong.name} went with their gut... their gut lied! 🤥`,
      ` ${randomWrong.name} rolled the dice and lost! 🎲`
    ];
    comment += wrongCallouts[Math.floor(Math.random() * wrongCallouts.length)];
    target = { name: randomWrong.name, isCorrect: false };
  }
  
  return { comment, target };
};

interface ResultsSlideProps {
  correctPlayers: any[];
  wrongPlayers: any[];
  fastestPlayer: any;
  slowestPlayer: any;
  currentQuestion: number;
  totalQuestions: number;
  onNext: () => void;
  onRestartGame: () => void;
  isHost: boolean;
  showPoints: boolean;
  onTogglePoints: () => void;
  streakTracker?: any;
  isJumbotron?: boolean;
}

export const ResultsSlide: React.FC<ResultsSlideProps> = ({
  correctPlayers,
  wrongPlayers,
  fastestPlayer,
  slowestPlayer,
  currentQuestion,
  totalQuestions,
  onNext,
  onRestartGame,
  isHost,
  showPoints,
  onTogglePoints,
  streakTracker,
  isJumbotron = false
}) => {
  const [showResults, setShowResults] = useState(false);
  const [showSnarkyComment, setShowSnarkyComment] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);
  const [snarkyComment, setSnarkyComment] = useState('');
  const [commentTarget, setCommentTarget] = useState<{ name: string; isCorrect: boolean } | null>(null);
  
  const { playAudio, isPlaying, toggleMute, replayAudio, volume, changeVolume, clearQueue } = useAudio();

  useEffect(() => {
    // Show results immediately
    setShowResults(true);
    
    // Generate and show snarky comment after a delay
    setTimeout(() => {
      const { comment, target } = generateSnarkyComment(
        correctPlayers,
        wrongPlayers,
        fastestPlayer,
        slowestPlayer
      );
      setSnarkyComment(comment);
      setCommentTarget(target);
      setShowSnarkyComment(true);
    }, 1500);
  }, []);

  useEffect(() => {
    if (showSnarkyComment && snarkyComment) {
      playAudio(snarkyComment, {
        onComplete: () => {
          setTimeout(() => {
            setShowNextButton(true);
          }, 1000);
        }
      });
    } else {
      // For jumbotron, show next button immediately
      setTimeout(() => {
        setShowNextButton(true);
      }, 3000);
    }
  }, [showSnarkyComment, snarkyComment, playAudio]);

  // ✅ FIXED: Helper function to get points earned for display
  const getPointsEarned = (player: any) => {
    // Check if points_earned is available from the database
    if (player.points_earned !== undefined) {
      return player.points_earned;
    }
    
    // Legacy fallback for pointsEarned (client-side calculated)
    if (player.pointsEarned !== undefined) {
      return player.pointsEarned;
    }
    
    // Final fallback calculation if needed
    if (player.response_time && player.is_correct) {
      const basePoints = 1000;
      const timePenalty = Math.floor(player.response_time / 1000) * 10;
      return Math.max(200, basePoints - timePenalty);
    }
    
    return 0;
  };

  // ✅ NEW: Get streak data for a player
  const getPlayerStreak = (playerId: string) => {
    return streakTracker?.getAllStreaks?.()?.find(s => s.playerId === playerId);
  };

  const handleNext = () => {
    clearQueue();
    onNext();
  };

  const handleSkipAudio = () => {
    clearQueue();
    setShowNextButton(true);
  };

  // ✅ DEBUG: Log the data structure we're receiving
  console.log('📊 ResultsSlide received data:', {
    correctPlayers: correctPlayers?.map(p => ({ name: p.name, score: p.score, pointsEarned: p.pointsEarned })),
    wrongPlayers: wrongPlayers?.map(p => ({ name: p.name, score: p.score })),
    fastestPlayer: fastestPlayer ? { name: fastestPlayer.name, responseTime: fastestPlayer.response_time } : null,
    slowestPlayer: slowestPlayer ? { name: slowestPlayer.name, responseTime: slowestPlayer.response_time } : null
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-blue-600 to-purple-600 flex flex-col items-center justify-center p-8 text-white relative overflow-hidden">
      {/* Celebration background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 text-8xl opacity-30 animate-bounce">🎉</div>
        <div className="absolute top-20 right-20 text-6xl opacity-40 animate-spin">⭐</div>
        <div className="absolute bottom-10 left-20 text-7xl opacity-30 animate-pulse">🏆</div>
        <div className="absolute bottom-20 right-10 text-5xl opacity-40 animate-bounce">🎊</div>
      </div>

      <div className="max-w-7xl w-full z-10">
        <div className={isJumbotron ? "max-w-6xl mx-auto" : "grid grid-cols-1 lg:grid-cols-4 gap-8"}>
          <div className={isJumbotron ? "" : "lg:col-span-3"}>
            <SlideTransition isVisible={showResults} direction="bounce" className="text-center mb-8">
              <h1 className={isJumbotron ? "text-6xl md:text-8xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500" : "text-5xl md:text-7xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500"}>
                RESULTS! 📊
              </h1>
              <p className="text-xl text-gray-300">
                Question {currentQuestion + 1} of {totalQuestions}
              </p>
            </SlideTransition>

            {/* Audio Controls - Only show for presenter */}
            {!isJumbotron && (
              <div className="flex justify-center mb-6">
                <AudioControls
                  isPlaying={isPlaying}
                  onVolumeToggle={toggleMute}
                  onReplay={replayAudio}
                  volume={volume}
                  onVolumeChange={changeVolume}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Correct Players */}
              <SlideTransition isVisible={showResults} direction="slide" className="bg-green-500/20 backdrop-blur-sm rounded-2xl p-6 border border-green-400/50">
                <div className="flex items-center gap-3 mb-4">
                  <Trophy className="w-8 h-8 text-green-400" />
                  <h2 className="text-2xl font-bold text-green-400">Correct ({correctPlayers?.length || 0})</h2>
                </div>
                <div className="space-y-3">
                  {correctPlayers?.length > 0 ? (
                    correctPlayers.map(player => {
                      const pointsEarned = getPointsEarned(player);
                      const streakData = getPlayerStreak(player.player_id || player.id);
                      return (
                        <div key={player.player_id || player.id} className="flex items-center justify-between bg-green-400/20 p-3 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">{player.name || 'Unknown Player'}</span>
                            {/* ✅ NEW: Show streak */}
                            {streakData && (
                              <StreakDisplay
                                currentStreak={streakData.currentStreak}
                                maxStreak={streakData.maxStreak}
                                size="small"
                              />
                            )}
                            {/* ✅ NEW: Show points earned if enabled */}
                            {showPoints && pointsEarned > 0 && (
                              <div className="flex items-center gap-1 bg-green-600/30 px-2 py-1 rounded-full">
                                <Plus className="w-3 h-3 text-green-300" />
                                <span className="text-sm font-bold text-green-300">{pointsEarned}</span>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            {showPoints ? (
                              <span className="text-green-400 font-bold">{player.score || 0} pts</span>
                            ) : (
                              <span className="text-green-400 font-bold">✓</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-300 text-center py-4">Nobody got it right... yikes! 😬</p>
                  )}
                </div>
              </SlideTransition>

              {/* Wrong Players */}
              <SlideTransition isVisible={showResults} direction="slide" className="bg-red-500/20 backdrop-blur-sm rounded-2xl p-6 border border-red-400/50">
                <div className="flex items-center gap-3 mb-4">
                  <X className="w-8 h-8 text-red-400" />
                  <h2 className="text-2xl font-bold text-red-400">Wrong ({wrongPlayers?.length || 0})</h2>
                </div>
                <div className="space-y-3">
                  {wrongPlayers?.length > 0 ? (
                    wrongPlayers.map(player => {
                      const streakData = getPlayerStreak(player.player_id || player.id);
                      return (
                        <div key={player.player_id || player.id} className="flex items-center justify-between bg-red-400/20 p-3 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">{player.name || 'Unknown Player'}</span>
                            {/* ✅ NEW: Show streak (will show max streak since current is 0) */}
                            {streakData && streakData.maxStreak > 0 && (
                              <StreakDisplay
                                currentStreak={streakData.currentStreak}
                                maxStreak={streakData.maxStreak}
                                size="small"
                              />
                            )}
                            {/* Show +0 pts for wrong answers if points enabled */}
                            {showPoints && (
                              <div className="flex items-center gap-1 bg-red-600/30 px-2 py-1 rounded-full">
                                <Plus className="w-3 h-3 text-red-300" />
                                <span className="text-sm font-bold text-red-300">0</span>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            {showPoints ? (
                              <span className="text-red-400 font-bold">{player.score || 0} pts</span>
                            ) : (
                              <span className="text-red-400 font-bold">✗</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-300 text-center py-4">Everyone got it right! Shocking! 🎉</p>
                  )}
                </div>
              </SlideTransition>
            </div>

            {/* Speed Awards */}
            {(fastestPlayer || slowestPlayer) && (
              <SlideTransition isVisible={showResults} direction="bounce" className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {fastestPlayer && (
                  <div className="bg-yellow-500/20 backdrop-blur-sm rounded-2xl p-6 border border-yellow-400/50">
                    <div className="flex items-center gap-3 mb-4">
                      <Zap className="w-8 h-8 text-yellow-400" />
                      <h3 className="text-xl font-bold text-yellow-400">Fastest Finger</h3>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{fastestPlayer.name || 'Unknown Player'}</p>
                      <p className="text-yellow-400">Lightning quick! ⚡</p>
                      {/* Show response time if available */}
                      {fastestPlayer.response_time && (
                        <p className="text-sm text-yellow-300 mt-1">
                          {Math.round(fastestPlayer.response_time / 1000 * 10) / 10}s response time
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {slowestPlayer && slowestPlayer.player_id !== fastestPlayer?.player_id && (
                  <div className="bg-orange-500/20 backdrop-blur-sm rounded-2xl p-6 border border-orange-400/50">
                    <div className="flex items-center gap-3 mb-4">
                      <Turtle className="w-8 h-8 text-orange-400" />
                      <h3 className="text-xl font-bold text-orange-400">Slowest Responder</h3>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{slowestPlayer.name || 'Unknown Player'}</p>
                      <p className="text-orange-400">Taking their time! 🐢</p>
                      {/* Show response time if available */}
                      {slowestPlayer.response_time && (
                        <p className="text-sm text-orange-300 mt-1">
                          {Math.round(slowestPlayer.response_time / 1000 * 10) / 10}s response time
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </SlideTransition>
            )}

            {/* Single Snarky Comment with Animated Reaction */}
            {showSnarkyComment && snarkyComment && (
              <SlideTransition isVisible={true} direction="bounce" className="text-center mb-8">
                <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-8 border-2 border-white/40">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <div className="text-6xl">🎭</div>
                    {/* ✅ NEW: Animated emoji reaction */}
                    {commentTarget && (
                      <EmojiReaction
                        isCorrect={commentTarget.isCorrect}
                        playerName={commentTarget.name}
                      />
                    )}
                  </div>
                  <AnimatedText 
                    text={snarkyComment}
                    className={isJumbotron ? "text-2xl md:text-3xl leading-relaxed font-bold" : "text-xl md:text-2xl leading-relaxed font-bold"}
                    delay={200}
                    speed={40}
                  />
                  
                  {/* Skip Audio Button - Only show for presenter */}
                  {isPlaying && !isJumbotron && (
                    <div className="mt-4">
                      <GameButton
                        onClick={handleSkipAudio}
                        variant="primary"
                        className="text-sm"
                      >
                        Skip Audio →
                      </GameButton>
                    </div>
                  )}
                </div>
              </SlideTransition>
            )}

            {/* Next Button - Only show for presenter */}
            {showNextButton && !isJumbotron && (
              <SlideTransition isVisible={showNextButton} direction="bounce" className="text-center">
                <GameButton onClick={handleNext} variant="next" className="text-xl">
                  {currentQuestion + 1 >= totalQuestions ? 'Final Results! →' : 'Next Question! →'}
                </GameButton>
              </SlideTransition>
            )}
          </div>

          {/* Sidebar - Only show for presenter */}
          {!isJumbotron && (
            <div className="lg:col-span-1">
              {isHost && (
                <AdminControls
                  onNextQuestion={handleNext}
                  onRestartGame={onRestartGame}
                  playerCount={(correctPlayers?.length || 0) + (wrongPlayers?.length || 0)}
                  currentPhase="results"
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