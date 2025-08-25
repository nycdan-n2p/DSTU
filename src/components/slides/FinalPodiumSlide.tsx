import React, { useEffect, useState } from 'react';
import { Player } from '../../types/game';
import { SlideTransition } from '../SlideTransition';
import { GameButton } from '../GameButton';
import { StreakDisplay } from '../StreakDisplay';
import { Trophy, Medal, Award, Crown, Zap, Target } from 'lucide-react';
import { useAudio } from '../../hooks/useAudio';

interface FinalPodiumSlideProps {
  players: Player[];
  onRestart: () => void;
  streakTracker?: {
    getAllStreaks?: () => Array<{ playerId: string; currentStreak: number; maxStreak: number }>;
  };
  isJumbotron?: boolean;
}

export const FinalPodiumSlide: React.FC<FinalPodiumSlideProps> = ({ 
  players, 
  onRestart,
  streakTracker,
  isJumbotron = false
}) => {
  const [showPodium, setShowPodium] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSpecialAwards, setShowSpecialAwards] = useState(false);
  const [showRestartButton, setShowRestartButton] = useState(false);
  
  const { playAudio } = useAudio();

  // Sort players by score for podium
  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
  const topThree = sortedPlayers.slice(0, 3);
  const restOfPlayers = sortedPlayers.slice(3);

  // ✅ NEW: Enhanced special awards with streak data
  const getSpecialAwards = () => {
    if (players.length < 2) return [];
    
    const awards = [];
    const allStreaks = streakTracker?.getAllStreaks?.() || [];
    
    // Highest single score
    const highestScore = Math.max(...players.map(p => p.score || 0));
    const topScorer = players.find(p => p.score === highestScore);
    if (topScorer) {
      awards.push({
        title: "🏆 Quiz Champion",
        winner: topScorer.name,
        description: `${highestScore} points total`
      });
    }

    // ✅ NEW: Best streak award
    const bestStreak = allStreaks.reduce((max, current) => 
      current.maxStreak > max.maxStreak ? current : max, 
      { maxStreak: 0, playerId: '' }
    );
    
    if (bestStreak.maxStreak > 1) {
      const streakPlayer = players.find(p => p.id === bestStreak.playerId);
      if (streakPlayer) {
        awards.push({
          title: "🔥 Streak Master",
          winner: streakPlayer.name,
          description: `${bestStreak.maxStreak} correct in a row`
        });
      }
    }

    // ✅ NEW: Current hot streak
    const currentHotStreak = allStreaks.find(s => s.currentStreak >= 3);
    if (currentHotStreak) {
      const hotPlayer = players.find(p => p.id === currentHotStreak.playerId);
      if (hotPlayer) {
        awards.push({
          title: "⚡ On Fire",
          winner: hotPlayer.name,
          description: `${currentHotStreak.currentStreak} streak active`
        });
      }
    }

    // Speed demon (if we have top scorer)
    if (players.length >= 2) {
      awards.push({
        title: "⚡ Speed Demon",
        winner: topThree[0]?.name || "Unknown", 
        description: "Lightning-fast responses"
      });
    }

    return awards.slice(0, 3); // Limit to 3 awards
  };

  const specialAwards = getSpecialAwards();

  // ✅ NEW: Get streak data for a player
  const getPlayerStreak = (playerId: string) => {
    return streakTracker?.getAllStreaks?.()?.find(s => s.playerId === playerId);
  };

  useEffect(() => {
    // Staggered animations
    setTimeout(() => setShowPodium(true), 500);
    setTimeout(() => setShowLeaderboard(true), 2000);
    setTimeout(() => setShowSpecialAwards(true), 3500);
    setTimeout(() => setShowRestartButton(true), 5000);
  }, []);

  // ✅ FIXED: Separate useEffect for victory audio with proper dependencies
  useEffect(() => {
    if (topThree.length > 0 && !isJumbotron) {
      const victoryText = `Congratulations to our winner, ${topThree[0]?.name}! What an incredible performance with ${topThree[0]?.score} points!`;
      
      setTimeout(() => {
        playAudio(victoryText, { 
          priority: true,
          onComplete: () => {
            console.log('✅ Victory audio completed');
          },
          onError: (error) => {
            console.error('❌ Victory audio error:', error);
          }
        });
      }, 1000);
    }
  }, [topThree[0]?.name, topThree[0]?.score, playAudio, isJumbotron]); // ✅ Only depend on winner's name and score

  const getPodiumHeight = (position: number) => {
    switch (position) {
      case 0: return 'h-32'; // 1st place - tallest
      case 1: return 'h-24'; // 2nd place - medium
      case 2: return 'h-16'; // 3rd place - shortest
      default: return 'h-16';
    }
  };

  const getPodiumColor = (position: number) => {
    switch (position) {
      case 0: return 'bg-gradient-to-t from-yellow-600 to-yellow-400 border-yellow-300'; // Gold
      case 1: return 'bg-gradient-to-t from-gray-500 to-gray-300 border-gray-200'; // Silver
      case 2: return 'bg-gradient-to-t from-orange-600 to-orange-400 border-orange-300'; // Bronze
      default: return 'bg-gradient-to-t from-gray-600 to-gray-400 border-gray-300';
    }
  };

  const getTrophyIcon = (position: number) => {
    switch (position) {
      case 0: return <Crown className="w-8 h-8 text-yellow-300" />;
      case 1: return <Medal className="w-7 h-7 text-gray-200" />;
      case 2: return <Award className="w-6 h-6 text-orange-300" />;
      default: return <Trophy className="w-5 h-5 text-gray-300" />;
    }
  };

  const getPositionLabel = (position: number) => {
    switch (position) {
      case 0: return '🥇 1ST';
      case 1: return '🥈 2ND';
      case 2: return '🥉 3RD';
      default: return `#${position + 1}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col items-center justify-center p-8 text-white relative overflow-hidden">
      {/* Celebration background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 text-8xl opacity-30 animate-bounce">🎉</div>
        <div className="absolute top-20 right-20 text-6xl opacity-40 animate-spin">⭐</div>
        <div className="absolute bottom-10 left-20 text-7xl opacity-30 animate-pulse">🏆</div>
        <div className="absolute bottom-20 right-10 text-5xl opacity-40 animate-bounce">🎊</div>
        <div className="absolute top-1/2 left-1/4 text-4xl opacity-20 animate-ping">✨</div>
        <div className="absolute top-1/3 right-1/3 text-4xl opacity-20 animate-pulse">🌟</div>
      </div>

      <div className="max-w-7xl w-full z-10">
        {/* Title */}
        <SlideTransition isVisible={showPodium} direction="bounce" className="text-center mb-12">
          <h1 className={isJumbotron ? "text-7xl md:text-9xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 animate-pulse" : "text-6xl md:text-8xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 animate-pulse"}>
            🏆 FINAL RESULTS! 🏆
          </h1>
          <p className={isJumbotron ? "text-3xl md:text-4xl text-yellow-300 font-bold" : "text-2xl md:text-3xl text-yellow-300 font-bold"}>
            The Ultimate Quiz Champions!
          </p>
        </SlideTransition>

        <div className={isJumbotron ? "max-w-6xl mx-auto" : "grid grid-cols-1 lg:grid-cols-4 gap-8"}>
          {/* Main Podium */}
          <div className={isJumbotron ? "" : "lg:col-span-3"}>
            <SlideTransition isVisible={showPodium} direction="bounce" className="mb-8">
              <div className="flex items-end justify-center gap-8 mb-8">
                {/* Arrange podium: 2nd, 1st, 3rd */}
                {topThree.length >= 2 && (
                  <div className="flex flex-col items-center">
                    {/* 2nd Place */}
                    <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 mb-4 border-2 border-gray-400 transform hover:scale-105 transition-all">
                      <div className="text-center">
                        <div className="text-4xl mb-2">🥈</div>
                        <h3 className="text-xl font-bold text-gray-200 mb-1">{topThree[1]?.name}</h3>
                        <p className="text-2xl font-black text-gray-300">{topThree[1]?.score || 0}</p>
                        <p className="text-sm text-gray-400">points</p>
                        {/* ✅ NEW: Show streak for podium players */}
                        {(() => {
                          const streakData = getPlayerStreak(topThree[1]?.id);
                          return streakData && (streakData.currentStreak > 0 || streakData.maxStreak > 1) ? (
                            <div className="mt-2">
                              <StreakDisplay
                                currentStreak={streakData.currentStreak}
                                maxStreak={streakData.maxStreak}
                                size="small"
                              />
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    <div className={`w-24 ${getPodiumHeight(1)} ${getPodiumColor(1)} border-4 rounded-t-lg flex items-center justify-center`}>
                      <span className="text-black font-bold text-lg">2ND</span>
                    </div>
                  </div>
                )}

                {/* 1st Place - Center and Tallest */}
                {topThree.length >= 1 && (
                  <div className="flex flex-col items-center">
                    <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 mb-4 border-4 border-yellow-400 transform hover:scale-105 transition-all shadow-2xl">
                      <div className="text-center">
                        <div className="text-6xl mb-3 animate-bounce">👑</div>
                        <h3 className="text-2xl font-bold text-yellow-300 mb-2">{topThree[0]?.name}</h3>
                        <p className="text-4xl font-black text-yellow-400">{topThree[0]?.score || 0}</p>
                        <p className="text-lg text-yellow-200">points</p>
                        <div className="mt-2 text-yellow-300 font-bold">CHAMPION!</div>
                        {/* ✅ NEW: Show streak for winner */}
                        {(() => {
                          const streakData = getPlayerStreak(topThree[0]?.id);
                          return streakData && (streakData.currentStreak > 0 || streakData.maxStreak > 1) ? (
                            <div className="mt-2">
                              <StreakDisplay
                                currentStreak={streakData.currentStreak}
                                maxStreak={streakData.maxStreak}
                                size="medium"
                              />
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    <div className={`w-32 ${getPodiumHeight(0)} ${getPodiumColor(0)} border-4 rounded-t-lg flex items-center justify-center shadow-lg`}>
                      <span className="text-black font-bold text-xl">1ST</span>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {topThree.length >= 3 && (
                  <div className="flex flex-col items-center">
                    <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 mb-4 border-2 border-orange-400 transform hover:scale-105 transition-all">
                      <div className="text-center">
                        <div className="text-4xl mb-2">🥉</div>
                        <h3 className="text-xl font-bold text-orange-200 mb-1">{topThree[2]?.name}</h3>
                        <p className="text-2xl font-black text-orange-300">{topThree[2]?.score || 0}</p>
                        <p className="text-sm text-orange-400">points</p>
                        {/* ✅ NEW: Show streak for 3rd place */}
                        {(() => {
                          const streakData = getPlayerStreak(topThree[2]?.id);
                          return streakData && (streakData.currentStreak > 0 || streakData.maxStreak > 1) ? (
                            <div className="mt-2">
                              <StreakDisplay
                                currentStreak={streakData.currentStreak}
                                maxStreak={streakData.maxStreak}
                                size="small"
                              />
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    <div className={`w-24 ${getPodiumHeight(2)} ${getPodiumColor(2)} border-4 rounded-t-lg flex items-center justify-center`}>
                      <span className="text-black font-bold text-lg">3RD</span>
                    </div>
                  </div>
                )}
              </div>
            </SlideTransition>

            {/* Special Awards */}
            {specialAwards.length > 0 && (
              <SlideTransition isVisible={showSpecialAwards} direction="slide" className="mb-8">
                <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
                  <h2 className="text-3xl font-bold text-center mb-6 text-yellow-400">🌟 Special Awards 🌟</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {specialAwards.map((award, index) => (
                      <div key={index} className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-400/50">
                        <div className="text-center">
                          <div className="text-2xl mb-2">{award.title.split(' ')[0]}</div>
                          <h4 className="font-bold text-lg text-purple-300 mb-1">{award.title.substring(2)}</h4>
                          <p className="text-xl font-bold text-white">{award.winner}</p>
                          <p className="text-sm text-purple-200">{award.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </SlideTransition>
            )}
          </div>

          {/* Side Leaderboard */}

          {!isJumbotron && (
            <div className="lg:col-span-1">
              <SlideTransition isVisible={showLeaderboard} direction="slide">
                <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
                  <h3 className="text-2xl font-bold text-center mb-6 text-white flex items-center justify-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-400" />
                    Final Standings
                  </h3>
                  
                  <div className="space-y-3">
                    {sortedPlayers.map((player, index) => {
                      const streakData = getPlayerStreak(player.id);
                      return (
                        <div 
                          key={player.id}
                          className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 ${
                            index < 3 
                              ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/50' 
                              : 'bg-white/10 border border-white/20'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0 ? 'bg-yellow-400 text-black' :
                              index === 1 ? 'bg-gray-400 text-black' :
                              index === 2 ? 'bg-orange-400 text-black' :
                              'bg-white/20 text-white'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <span className="font-semibold text-white text-sm">{player.name}</span>
                              <div className="flex items-center gap-2">
                                {index < 3 && (
                                  <div className="text-xs text-yellow-300">
                                    {getPositionLabel(index)}
                                  </div>
                                )}
                                {/* ✅ NEW: Show streak in leaderboard */}
                                {streakData && (streakData.currentStreak > 0 || streakData.maxStreak > 1) && (
                                  <StreakDisplay
                                    currentStreak={streakData.currentStreak}
                                    maxStreak={streakData.maxStreak}
                                    size="small"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-lg font-bold text-white">{player.score || 0}</div>
                            <div className="text-xs text-gray-300">pts</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Game Stats */}
                  <div className="mt-6 pt-4 border-t border-white/20">
                    <div className="text-center">
                      <div className="text-sm text-gray-300 mb-2">Game Statistics</div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="bg-white/10 rounded p-2">
                          <div className="font-bold text-white">{players.length}</div>
                          <div className="text-gray-300">Players</div>
                        </div>
                        <div className="bg-white/10 rounded p-2">
                          <div className="font-bold text-white">{Math.max(...players.map(p => p.score || 0))}</div>
                          <div className="text-gray-300">Top Score</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </SlideTransition>
            </div>
          )}
        </div>

        {/* Restart Button */}
        {!isJumbotron && (
          <SlideTransition isVisible={showRestartButton} direction="bounce" className="text-center mt-8">
            <GameButton onClick={onRestart} variant="primary" className="text-xl px-8 py-4">
              🎮 Play Another Round!
            </GameButton>
          </SlideTransition>
        )}
      </div>
    </div>
  );
};