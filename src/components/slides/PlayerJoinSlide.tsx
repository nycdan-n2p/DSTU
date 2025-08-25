import React, { useState } from 'react';
import { GameButton } from '../GameButton';
import { SlideTransition } from '../SlideTransition';
import { Users, Gamepad2, Smartphone } from 'lucide-react';

interface PlayerJoinSlideProps {
  onJoin: (name: string) => void;
  loading?: boolean;
  error?: string;
}

export const PlayerJoinSlide: React.FC<PlayerJoinSlideProps> = ({ onJoin, loading, error }) => {
  const [playerName, setPlayerName] = useState('');
  const [showForm, setShowForm] = useState(false);

  React.useEffect(() => {
    setTimeout(() => setShowForm(true), 500);
    
    // Log mobile detection info
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInApp = window.navigator.standalone;
    
    console.log('📱 Mobile Detection:', {
      userAgent: navigator.userAgent,
      isMobile,
      isStandalone,
      isInApp,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      screen: `${screen.width}x${screen.height}`,
      url: window.location.href
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      console.log('🎮 Submitting player name:', playerName.trim());
      onJoin(playerName.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-600 via-blue-600 to-purple-600 flex flex-col items-center justify-center p-4 text-white relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 text-8xl opacity-20 animate-bounce">🎮</div>
        <div className="absolute bottom-20 right-20 text-8xl opacity-20 animate-pulse">🎯</div>
        <div className="absolute top-1/2 left-1/4 text-6xl opacity-30 animate-spin">⭐</div>
      </div>

      <div className="max-w-md w-full z-10">
        <SlideTransition isVisible={showForm} direction="bounce" className="text-center">
          <div className="bg-black/40 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-white/30 shadow-2xl">
            <div className="mb-6 md:mb-8">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-3 md:p-4 rounded-full">
                  <Gamepad2 className="w-8 h-8 md:w-12 md:h-12 text-white" />
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500">
                Join the Game!
              </h1>
              <p className="text-base md:text-lg text-gray-300">
                Enter your name to start playing
              </p>
              
              {/* Mobile-specific instructions */}
              <div className="mt-4 bg-blue-500/20 rounded-lg p-3 border border-blue-400/50">
                <div className="flex items-center gap-2 justify-center mb-2">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-blue-400">Mobile Player</span>
                </div>
                <p className="text-xs text-blue-300">
                  You're joining from your phone! Perfect for playing along.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
              <div>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Your first name"
                  className="w-full px-4 py-3 md:py-4 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-base md:text-lg"
                  maxLength={20}
                  required
                  disabled={loading}
                  autoFocus
                  autoComplete="given-name"
                />
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-3">
                  <p className="text-red-300 text-sm">{error}</p>
                  <p className="text-red-200 text-xs mt-1">
                    Try refreshing the page or check your connection
                  </p>
                </div>
              )}

              <GameButton
                onClick={() => {}}
                variant="primary"
                disabled={!playerName.trim() || loading}
                className="w-full text-base md:text-lg py-4"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Joining Game...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Users className="w-5 h-5" />
                    Join Game
                  </div>
                )}
              </GameButton>
            </form>
            
            {/* Debug info for mobile */}
            {import.meta.env.DEV && (
              <div className="mt-4 bg-gray-800/50 rounded-lg p-3 text-xs">
                <p className="text-gray-400 mb-1">Debug Info:</p>
                <p className="text-white">URL: {window.location.href}</p>
                <p className="text-white">User Agent: {navigator.userAgent.substring(0, 50)}...</p>
                <p className="text-white">Viewport: {window.innerWidth}x{window.innerHeight}</p>
              </div>
            )}
          </div>
        </SlideTransition>
      </div>
    </div>
  );
};