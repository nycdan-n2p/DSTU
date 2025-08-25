import React from 'react';
import { Player } from '../types/game';
import { Users, Trophy, Clock, CheckCircle, Circle, RefreshCw } from 'lucide-react';
import { StreakDisplay } from './StreakDisplay';
import { ConnectionStatus } from './ConnectionStatus';

interface PlayerListProps {
  players: Player[];
  className?: string;
  showPoints?: boolean;
  currentPhase?: string; // ✅ NEW: To show submission status during question phase
  streakTracker?: {
    getPlayerStreak?: (playerId: string) => { currentStreak: number; maxStreak: number } | null;
  };
  // ✅ NEW: Connection status props
  isConnected?: boolean;
  isHealthy?: boolean;
  fallbackPolling?: boolean;
  reconnectAttempts?: number;
  // ✅ NEW: Manual refresh function
  onRefreshPlayers?: () => void;
}

export const PlayerList: React.FC<PlayerListProps> = ({ 
  players = [], 
  className = '',
  showPoints = true,
  currentPhase = 'waiting',
  streakTracker,
  isConnected = true,
  isHealthy = true,
  fallbackPolling = false,
  reconnectAttempts = 0,
  onRefreshPlayers
}) => {
  // Guard clause and safe array operations
  if (!Array.isArray(players)) {
    return (
      <div className={`bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/30 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-6 h-6 text-yellow-400" />
          <h3 className="text-xl font-bold text-white">Players (0)</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-300 text-lg">Loading players...</p>
        </div>
      </div>
    );
  }

  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div className={`bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/30 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <Users className="w-6 h-6 text-yellow-400" />
        <h3 className="text-xl font-bold text-white">
          Players ({players.length})
        </h3>
        {!showPoints && (
          <div className="bg-gray-500/20 px-2 py-1 rounded text-xs text-gray-300">
            Points Hidden
          </div>
        )}
        {/* ✅ NEW: Show submission status during question phase */}
        {currentPhase === 'question' && (
          <div className="bg-blue-500/20 px-2 py-1 rounded text-xs text-blue-300">
            Answering...
          </div>
        )}
        {/* ✅ NEW: Refresh button for manual player list updates */}
        {onRefreshPlayers && (
          <button
            onClick={onRefreshPlayers}
            className="ml-auto p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="Refresh player list"
          >
            <RefreshCw className="w-4 h-4 text-white" />
          </button>
        )}
      </div>
      
      {players.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-300 text-lg">Waiting for players to join...</p>
          <p className="text-gray-400 text-sm mt-2">Share the QR code to get started!</p>
          <div className="mt-4 animate-pulse">
            <div className="text-4xl">📱</div>
            <p className="text-xs text-gray-500 mt-2">Scan the QR code with your phone</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedPlayers.map((player, index) => {
            // Guard against missing player data
            if (!player || !player.id) {
              return null;
            }
            
            // ✅ NEW: Get streak data if available
            const streakData = streakTracker?.getPlayerStreak?.(player.id);
            
            // ✅ NEW: Check submission status for current question
            const hasSubmitted = (player as any).has_submitted || false;
            
            return (
              <div 
                key={player.id}
                className={`flex items-center justify-between p-4 rounded-lg transition-all duration-300 ${
                  index === 0 ? 'bg-yellow-500/20 border border-yellow-400/50 shadow-lg' :
                  index === 1 ? 'bg-gray-400/20 border border-gray-400/50' :
                  index === 2 ? 'bg-orange-500/20 border border-orange-400/50' :
                  'bg-white/10 border border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-yellow-400 text-black' :
                    index === 1 ? 'bg-gray-400 text-black' :
                    index === 2 ? 'bg-orange-400 text-black' :
                    'bg-white/20 text-white'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-lg">{player.name || 'Unknown Player'}</span>
                      {index === 0 && <Trophy className="w-5 h-5 text-yellow-400 animate-bounce" />}
                      {/* ✅ NEW: Show submission status during question phase */}
                      {currentPhase === 'question' && (
                        <div className="flex items-center gap-1">
                          {hasSubmitted ? (
                            <CheckCircle className="w-4 h-4 text-green-400" title="Answer submitted" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-400 animate-pulse" title="Waiting for answer" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-300">
                      {player.joined_at ? (
                        `Joined ${new Date(player.joined_at).toLocaleTimeString()}`
                      ) : (
                        'Recently joined'
                      )}
                      {/* ✅ NEW: Show submission status text during question phase */}
                      {currentPhase === 'question' && (
                        <span className={`px-2 py-1 rounded text-xs ${
                          hasSubmitted 
                            ? 'bg-green-500/20 text-green-300' 
                            : 'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {hasSubmitted ? 'Answered' : 'Thinking...'}
                        </span>
                      )}
                      {/* ✅ NEW: Show streak if available */}
                      {streakData && (
                        <StreakDisplay
                          currentStreak={streakData.currentStreak}
                          maxStreak={streakData.maxStreak}
                          size="small"
                        />
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    {showPoints ? (
                      <>
                        <div className="text-xl font-bold text-white">{player.score || 0}</div>
                        <div className="text-xs text-gray-300">points</div>
                      </>
                    ) : (
                      <div className="text-lg font-bold text-gray-400">•••</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {players.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="flex items-center justify-center">
            <ConnectionStatus
              isConnected={isConnected}
              isHealthy={isHealthy}
              fallbackPolling={fallbackPolling}
              reconnectAttempts={reconnectAttempts}
              size="small"
            />
          </div>
          {/* ✅ NEW: Show submission summary during question phase */}
          {currentPhase === 'question' && players.length > 0 && (
            <div className="mt-2 text-center">
              <div className="text-xs text-gray-400">
                {players.filter(p => (p as any).has_submitted).length} of {players.length} answered
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};