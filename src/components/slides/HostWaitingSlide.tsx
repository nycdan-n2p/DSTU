// HostWaitingSlide.tsx
import React, { useEffect, useState } from 'react';
import { GameIntro, Player } from '../../types/game';
import { AnimatedText } from '../AnimatedText';
import { SlideTransition } from '../SlideTransition';
import { GameButton } from '../GameButton';
import { QRCodeDisplay } from '../QRCodeDisplay';
import { PlayerList } from '../PlayerList';
import { AdminControls } from '../AdminControls';
import { AudioControls } from '../AudioControls';
import { useAudio } from '../../hooks/useAudio';

interface HostWaitingSlideProps {
  intro: GameIntro;
  sessionId: string;
  players: Player[];
  onStartGame: () => void;
  onRestartGame: () => void;
  totalQuestions: number;
  // ✅ NEW: Points display control
  showPoints?: boolean;
  onTogglePoints?: () => void;
  isJumbotron?: boolean;
  // ✅ NEW: Connection status
  isConnected?: boolean;
  isHealthy?: boolean;
  fallbackPolling?: boolean;
  reconnectAttempts?: number;
  // ✅ NEW: Manual refresh function
  onRefreshPlayers?: () => void;
}

export const HostWaitingSlide: React.FC<HostWaitingSlideProps> = ({ 
  intro, 
  sessionId, 
  players = [], 
  onStartGame,
  onRestartGame,
  totalQuestions,
  showPoints = true,
  onTogglePoints,
  isJumbotron = false,
  isConnected = true,
  isHealthy = true,
  fallbackPolling = false,
  reconnectAttempts = 0,
  onRefreshPlayers
}) => {
  const [showContent, setShowContent] = useState(false);
  const [showStartButton, setShowStartButton] = useState(false);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);
  
  const { 
    playAudio, 
    replayAudio, 
    toggleMute, 
    changeVolume, 
    isPlaying, 
    volume 
  } = useAudio();

  useEffect(() => {
    setShowContent(true);
    
    if (!hasPlayedAudio && intro?.text) {
      playAudio(intro.text);
      setHasPlayedAudio(true);
    }
    
    const timer = setTimeout(() => {
      setShowStartButton(true);
    }, 3000);

    return () => clearTimeout(timer);

  const joinUrl = `${window.location.origin}/join/${sessionId}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 flex flex-col items-center justify-center p-8 text-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-yellow-400/20 rounded-full animate-bounce"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-green-400/20 rounded-full animate-pulse"></div>
        <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-white/10 rounded-full animate-ping"></div>
      </div>

      <div className="max-w-7xl w-full z-10">
        <SlideTransition isVisible={showContent} direction="bounce" className="text-center mb-8">
          <h1 className="text-6xl md:text-8xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500 drop-shadow-2xl animate-pulse">
            {intro?.title || 'net2phone "Don\'t Screw This Up"'}
          </h1>
          
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-yellow-300 drop-shadow-lg">
            {intro?.subtitle || 'The ultimate workplace challenge quiz!'}
          </h2>

          <div className="max-w-4xl mx-auto bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-white/20 mb-8">
            <AnimatedText 
              text={intro?.text || 'Welcome to the quiz!'}
              className="text-lg md:text-xl leading-relaxed"
              delay={1000}
              speed={30}
            />
          </div>

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
        </SlideTransition>

        {isJumbotron ? (
          /* Jumbotron Layout - Clean and Simple */
          <div className="text-center">
            <div className="max-w-2xl mx-auto">
              <QRCodeDisplay sessionId={sessionId} />
              
              {/* Player count for jumbotron */}
              <div className="mt-8 bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
                <h3 className="text-3xl font-bold text-yellow-400 mb-4">
                  {players?.length || 0} Player{(players?.length || 0) !== 1 ? 's' : ''} Joined
                </h3>
                
                {(!players || players.length === 0) && (
                  <div className="text-center">
                    <div className="animate-bounce mb-4">
                      <div className="text-6xl">📱</div>
                    </div>
                    <p className="text-xl text-gray-300 mb-2">Scan the QR code to join!</p>
                    <p className="text-lg text-gray-400">Waiting for players...</p>
                  </div>
                )}
                
                {players && players.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                    {players.slice(0, 12).map((player, index) => (
                      <div key={player.id} className="bg-white/10 rounded-lg p-3 border border-white/20">
                        <div className="text-lg font-bold text-white">{player.name}</div>
                        <div className="text-sm text-gray-300">Ready to play!</div>
                      </div>
                    ))}
                    {players.length > 12 && (
                      <div className="bg-white/10 rounded-lg p-3 border border-white/20 flex items-center justify-center">
                        <div className="text-lg font-bold text-gray-300">+{players.length - 12} more</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Presenter Layout - Full Controls */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
            <div className="lg:col-span-1">
              <div className="relative">
                <QRCodeDisplay sessionId={sessionId} />
                {/* Session ID display */}
                <div className="mt-4 text-center">
                  <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                    <p className="text-sm text-gray-300 mb-1">Session ID:</p>
                    <p className="text-lg font-mono font-bold text-yellow-400">{sessionId.slice(-8).toUpperCase()}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-2">
              <PlayerList 
                players={players} 
                showPoints={showPoints}
                currentPhase="waiting"
                isConnected={isConnected}
                isHealthy={isHealthy}
                fallbackPolling={fallbackPolling}
                reconnectAttempts={reconnectAttempts}
                onRefreshPlayers={onRefreshPlayers}
              />
              
              {/* Instructions for joining */}
              {(!players || players.length === 0) && (
                <div className="mt-6 text-center">
                  <div className="bg-black/30 rounded-lg p-4 border border-white/20">
                    <p className="text-yellow-400 font-bold mb-2">📱 How to Join:</p>
                    <ol className="text-left text-sm text-gray-300 space-y-1">
                      <li>1. Open your phone camera</li>
                      <li>2. Point it at the QR code above</li>
                      <li>3. Tap the notification to open the link</li>
                      <li>4. Enter your name and join!</li>
                    </ol>
                    <p className="text-gray-400 text-xs mt-2">Or visit: {joinUrl}</p>
                  </div>
                </div>
              )}
              
              {/* Game Mode Indicator */}
              <div className="mt-6 text-center">
                <div className="bg-purple-500/20 rounded-lg p-4 border border-purple-400/50">
                  <p className="text-purple-300 font-bold mb-2">🎮 Game Mode</p>
                  <p className="text-purple-200 text-sm">
                    Playing with custom questions
                  </p>
                  <p className="text-purple-400 text-xs mt-1">
                    {totalQuestions} questions ready
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <AdminControls
                onForceStart={onStartGame}
                onRestartGame={onRestartGame}
                playerCount={players?.length || 0}
                currentPhase="waiting"
                currentQuestion={0}
                totalQuestions={totalQuestions}
                showPoints={showPoints}
                onTogglePoints={onTogglePoints}
              />
            </div>
          </div>
        )}

        {/* Start Button - Only show for presenter */}
        {!isJumbotron && (
          <SlideTransition isVisible={showStartButton} direction="bounce" className="text-center">
            <div className="space-y-4">
              <GameButton 
                onClick={onStartGame} 
                variant="primary" 
                className="text-xl"
                disabled={!players || players.length === 0}
              >
                {(!players || players.length === 0) ? 'Waiting for Players...' : `Start the Chaos! (${players.length} players)`}
              </GameButton>
              
              {(!players || players.length === 0) && (
                <div className="animate-bounce">
                  <div className="text-4xl">📱</div>
                  <p className="text-sm text-gray-400 mt-2">Scan with your phone camera</p>
                </div>
              )}
            </div>
          </SlideTransition>
        )}
      </div>
    </div>
  );
};