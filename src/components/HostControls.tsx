import React from 'react';
import { SkipForward, RotateCcw, Users, Settings, Play, Pause, Eye, EyeOff } from 'lucide-react';
import { GameButton } from './GameButton';

interface HostControlsProps {
  onNextQuestion?: () => void;
  onRestartGame?: () => void;
  onForceStart?: () => void;
  playerCount: number;
  currentPhase: string;
  currentQuestion: number;
  totalQuestions: number;
  className?: string;
  // ✅ NEW: Points display toggle
  showPoints?: boolean;
  onTogglePoints?: () => void;
}

export const AdminControls: React.FC<HostControlsProps> = ({
  onNextQuestion,
  onRestartGame,
  onForceStart,
  playerCount,
  currentPhase,
  currentQuestion,
  totalQuestions,
  className = '',
  showPoints = true,
  onTogglePoints
}) => {
  return (
    <div className={`bg-black/50 backdrop-blur-sm rounded-2xl p-4 border border-white/30 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <Settings className="w-5 h-5 text-yellow-400" />
        <h3 className="text-lg font-bold text-white">Host Controls</h3>
      </div>

      {/* Game Status */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div className="bg-white/10 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-gray-300">Players</span>
          </div>
          <div className="text-xl font-bold text-white">{playerCount}</div>
        </div>
        
        <div className="bg-white/10 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Play className="w-4 h-4 text-green-400" />
            <span className="text-gray-300">Progress</span>
          </div>
          <div className="text-xl font-bold text-white">
            {currentQuestion + 1}/{totalQuestions}
          </div>
        </div>
      </div>

      {/* Phase Indicator */}
      <div className="mb-4">
        <div className="bg-white/10 rounded-lg p-3">
          <div className="text-sm text-gray-300 mb-1">Current Phase</div>
          <div className="text-lg font-bold text-white capitalize">
            {currentPhase.replace('_', ' ')}
          </div>
        </div>
      </div>

      {/* ✅ NEW: Display Options */}
      <div className="mb-4">
        <div className="bg-white/10 rounded-lg p-3">
          <div className="text-sm text-gray-300 mb-2">Display Options</div>
          <button
            onClick={onTogglePoints}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors w-full ${
              showPoints 
                ? 'bg-green-500/20 border border-green-400/50 text-green-300' 
                : 'bg-gray-500/20 border border-gray-400/50 text-gray-300'
            }`}
          >
            {showPoints ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span className="text-sm font-medium">
              {showPoints ? 'Show Points' : 'Hide Points'}
            </span>
          </button>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="space-y-3">
        {currentPhase === 'waiting' && (
          <GameButton
            onClick={onForceStart || (() => {})}
            variant="primary"
            className="w-full"
            disabled={playerCount === 0}
          >
            <div className="flex items-center justify-center gap-2">
              <Play className="w-4 h-4" />
              Force Start Game
            </div>
          </GameButton>
        )}

        {(currentPhase === 'results' || currentPhase === 'question') && onNextQuestion && (
          <GameButton
            onClick={onNextQuestion}
            variant="next"
            className="w-full"
          >
            <div className="flex items-center justify-center gap-2">
              <SkipForward className="w-4 h-4" />
              Next Question
            </div>
          </GameButton>
        )}

        <GameButton
          onClick={onRestartGame || (() => {})}
          variant="primary"
          className="w-full bg-red-500 hover:bg-red-600"
        >
          <div className="flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Restart Game
          </div>
        </GameButton>
      </div>

      {/* Debug Info */}
      {import.meta.env.DEV && (
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="text-xs text-gray-400">
            <p>Phase: {currentPhase}</p>
            <p>Question: {currentQuestion}</p>
            <p>Players: {playerCount}</p>
            <p>Show Points: {showPoints ? 'Yes' : 'No'}</p>
          </div>
        </div>
      )}
    </div>
  );
};