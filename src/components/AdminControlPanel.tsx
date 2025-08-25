import React, { useState } from 'react';
import { Player, GameSession } from '../types/game';
import { 
  Play, 
  SkipForward, 
  Users, 
  Eye, 
  EyeOff, 
  RefreshCw,
  ArrowLeft,
  LogOut,
  Monitor,
  Settings,
  Trash2
} from 'lucide-react';
import { ConnectionStatus } from './ConnectionStatus';
import { PlayerList } from './PlayerList';

interface AdminControlPanelProps {
  session: GameSession | null;
  players: Player[];
  currentPhase: string;
  currentQuestionIndex: number;
  gameData: any;
  customQuestions: any[];
  showPoints: boolean;
  jumbotronWindow: Window | null;
  // Connection status
  isConnected?: boolean;
  isHealthy?: boolean;
  fallbackPolling?: boolean;
  reconnectAttempts?: number;
  // Actions
  onStartGame: () => void;
  onNextPhase: () => void;
  onTogglePoints: () => void;
  onRefreshPlayers: () => void;
  onClearAllPlayers?: () => void;
  onOpenJumbotron: () => void;
  onBackToDashboard?: () => void;
  onSignOut: () => void;
}

export const AdminControlPanel: React.FC<AdminControlPanelProps> = ({
  session,
  players,
  currentPhase,
  currentQuestionIndex,
  gameData,
  customQuestions,
  showPoints,
  jumbotronWindow,
  isConnected = true,
  isHealthy = true,
  fallbackPolling = false,
  reconnectAttempts = 0,
  onStartGame,
  onNextPhase,
  onTogglePoints,
  onRefreshPlayers,
  onClearAllPlayers,
  onOpenJumbotron,
  onBackToDashboard,
  onSignOut
}) => {
  const [showPreview, setShowPreview] = useState(true);

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
    return (gameData?.questions || []).map((q: any, index: number) => ({
      ...q,
      id: q.id || `default-${index}`
    }));
  };

  const questions = getCurrentQuestions();
  const currentQuestion = questions[currentQuestionIndex];
  const nextQuestion = questions[currentQuestionIndex + 1];

  const getPhaseDisplay = (phase: string) => {
    switch (phase) {
      case 'welcome': return '🎪 Welcome';
      case 'waiting': return '⏳ Waiting for Players';
      case 'question_setup': return '⚙️ Setting up Questions';
      case 'sponsor1': return '📺 Sponsor Break 1';
      case 'question': return '❓ Question Time';
      case 'results': return '📊 Results';
      case 'sponsor2': return '📺 Sponsor Break 2';
      case 'podium': return '🏆 Podium';
      case 'final': return '🎉 Final Results';
      default: return phase;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/30 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">🎮 Admin Control Panel</h1>
              <div className="flex items-center gap-4">
                <div className="text-lg text-gray-300">
                  Session: <span className="text-white font-mono">{session?.id || 'Not Created'}</span>
                </div>
                <div className="text-lg text-gray-300">
                  Phase: <span className="text-yellow-400">{getPhaseDisplay(currentPhase)}</span>
                </div>
                <div className="text-lg text-gray-300">
                  Question: <span className="text-blue-400">{currentQuestionIndex + 1}/{questions.length}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ConnectionStatus
                isConnected={isConnected}
                isHealthy={isHealthy}
                fallbackPolling={fallbackPolling}
                reconnectAttempts={reconnectAttempts}
                size="large"
              />
              {onBackToDashboard && (
                <button
                  onClick={onBackToDashboard}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Dashboard
                </button>
              )}
              <button
                onClick={onSignOut}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Game Controls */}
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
              <h3 className="text-xl font-bold text-white mb-4">🎮 Game Controls</h3>
              <div className="space-y-3">
                {currentPhase === 'welcome' && (
                  <>
                    <div className="text-sm text-gray-300 mb-3">
                      "Open the jumbotron first, then start the game"
                    </div>
                    {/* Quick Open Jumbotron CTA when not opened yet */}
                    {(!jumbotronWindow || jumbotronWindow.closed) && (
                      <button
                        onClick={onOpenJumbotron}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-semibold transition-colors"
                      >
                        <Monitor className="w-5 h-5" />
                        Open Jumbotron
                      </button>
                    )}
                    <button
                      onClick={onStartGame}
                      disabled={!jumbotronWindow || jumbotronWindow.closed}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-semibold transition-colors ${
                        !jumbotronWindow || jumbotronWindow.closed
                          ? 'bg-green-600/40 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                      title={!jumbotronWindow || jumbotronWindow.closed ? 'Open the jumbotron first' : 'Show QR code for players to join'}
                    >
                      <Play className="w-5 h-5" />
                      Show QR Code
                    </button>
                  </>
                )}
                
                {currentPhase === 'waiting' && (
                  <>
                    <div className="text-sm text-gray-300 mb-3">
                      {players.length === 0 ? (
                        "Players can now scan the QR code to join!"
                      ) : (
                        `${players.length} player${players.length === 1 ? '' : 's'} joined. Ready to start the chaos?`
                      )}
                    </div>
                    <button
                      onClick={onNextPhase}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition-colors"
                    >
                      <Play className="w-5 h-5" />
                      Start the Chaos!
                    </button>
                  </>
                )}
                {currentPhase !== 'waiting' && currentPhase !== 'welcome' && currentPhase !== 'final' && (
                  <button
                    onClick={onNextPhase}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors"
                  >
                    <SkipForward className="w-5 h-5" />
                    Next Phase
                  </button>
                )}
                <button
                  onClick={onTogglePoints}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors ${
                    showPoints 
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                      : 'bg-gray-600 hover:bg-gray-700 text-white'
                  }`}
                >
                  {showPoints ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  {showPoints ? 'Hide Points' : 'Show Points'}
                </button>
                
                {/* Clear Stale Players Button */}
                {onClearAllPlayers && players.length > 0 && (currentPhase === 'waiting' || currentPhase === 'welcome') && (
                  <button
                    onClick={onClearAllPlayers}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                    Clear Old Players
                  </button>
                )}
              </div>
            </div>

            {/* Jumbotron Control */}
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
              <h3 className="text-xl font-bold text-white mb-4">📺 Jumbotron Display</h3>
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${jumbotronWindow && !jumbotronWindow.closed ? 'bg-green-500/20 border border-green-400' : 'bg-red-500/20 border border-red-400'}`}>
                  <div className="flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-white" />
                    <span className="text-white font-semibold">
                      {jumbotronWindow && !jumbotronWindow.closed ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onOpenJumbotron}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-semibold transition-colors"
                >
                  <Monitor className="w-5 h-5" />
                  {jumbotronWindow && !jumbotronWindow.closed ? 'Focus Jumbotron' : 'Open Jumbotron'}
                </button>
              </div>
            </div>
          </div>

          {/* Middle Column - Current Question */}
          <div className="lg:col-span-1">
            {showPreview && currentQuestion && (
              <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">📋 Current Question</h3>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-white" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="text-sm text-gray-400">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </div>
                  <div className="text-lg text-white font-semibold">
                    {currentQuestion.prompt}
                  </div>
                  {currentQuestion.image_url && (
                    <img 
                      src={currentQuestion.image_url} 
                      alt="Question" 
                      className="w-full rounded-lg max-h-40 object-cover"
                    />
                  )}
                  <div className="space-y-2">
                    <div className="text-sm text-gray-400">Answer Options:</div>
                    {currentQuestion.options?.map((option: string, index: number) => (
                      <div 
                        key={index}
                        className={`p-2 rounded text-sm ${
                          index === currentQuestion.correct_index 
                            ? 'bg-green-500/20 text-green-400 border border-green-400' 
                            : 'bg-gray-500/20 text-gray-300'
                        }`}
                      >
                        {String.fromCharCode(65 + index)}. {option}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Next Question Preview */}
            {showPreview && nextQuestion && (
              <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/30 mt-6">
                <h3 className="text-xl font-bold text-white mb-4">👀 Next Question</h3>
                <div className="space-y-4">
                  <div className="text-sm text-gray-400">
                    Question {currentQuestionIndex + 2} of {questions.length}
                  </div>
                  <div className="text-lg text-white font-semibold">
                    {nextQuestion.prompt}
                  </div>
                  {nextQuestion.image_url && (
                    <img 
                      src={nextQuestion.image_url} 
                      alt="Next Question" 
                      className="w-full rounded-lg max-h-32 object-cover opacity-75"
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Players */}
          <div className="lg:col-span-1">
            <PlayerList 
              players={players} 
              showPoints={showPoints}
              currentPhase={currentPhase}
              isConnected={isConnected}
              isHealthy={isHealthy}
              fallbackPolling={fallbackPolling}
              reconnectAttempts={reconnectAttempts}
              onRefreshPlayers={onRefreshPlayers}
            />
          </div>
        </div>
      </div>
    </div>
  );
};