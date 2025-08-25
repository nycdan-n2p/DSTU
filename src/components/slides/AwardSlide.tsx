import React, { useEffect, useState } from 'react';
import { Award } from '../../types/game';
import { AnimatedText } from '../AnimatedText';
import { SlideTransition } from '../SlideTransition';
import { GameButton } from '../GameButton';
import { useAudio } from '../../hooks/useAudio';

interface AwardSlideProps {
  award: Award;
  onRestart: () => void;
  isJumbotron?: boolean;
}

export const AwardSlide: React.FC<AwardSlideProps> = ({ award, onRestart, isJumbotron = false }) => {
  const [showContent, setShowContent] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const { playAudio } = useAudio();

  useEffect(() => {
    setShowContent(true);
    // Play the award description as speech (only for presenter)
    if (!isJumbotron) {
      playAudio(award.description);
    }
    
    const timer = setTimeout(() => {
      setShowButton(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [award.description, playAudio, isJumbotron]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex flex-col items-center justify-center p-8 text-white relative overflow-hidden">
      {/* Celebration background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 text-8xl opacity-30 animate-bounce">🏆</div>
        <div className="absolute top-20 right-20 text-6xl opacity-40 animate-spin">⭐</div>
        <div className="absolute bottom-10 left-20 text-7xl opacity-30 animate-pulse">🎉</div>
        <div className="absolute bottom-20 right-10 text-5xl opacity-40 animate-bounce">🎊</div>
        <div className="absolute top-1/2 left-1/4 text-4xl opacity-20 animate-ping">✨</div>
        <div className="absolute top-1/3 right-1/3 text-4xl opacity-20 animate-pulse">🌟</div>
      </div>

      <SlideTransition isVisible={showContent} direction="bounce" className={isJumbotron ? "text-center z-10 max-w-6xl" : "text-center z-10 max-w-5xl"}>
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-3xl mb-8 transform -rotate-1 shadow-2xl border-4 border-yellow-400">
          <h1 className={isJumbotron ? "text-6xl md:text-8xl font-black uppercase tracking-wider mb-4" : "text-5xl md:text-7xl font-black uppercase tracking-wider mb-4"}>
            🏆 CONGRATULATIONS! 🏆
          </h1>
          <h2 className={isJumbotron ? "text-4xl md:text-5xl font-bold text-yellow-300" : "text-3xl md:text-4xl font-bold text-yellow-300"}>
            {award.title}
          </h2>
        </div>

        <div className="bg-black/50 backdrop-blur-sm rounded-3xl p-10 border-4 border-white/30 shadow-2xl">
          <div className="text-8xl mb-6 animate-bounce">🎭</div>
          <AnimatedText 
            text={award.description}
            className={isJumbotron ? "text-2xl md:text-3xl leading-relaxed font-bold" : "text-xl md:text-2xl leading-relaxed font-bold"}
            delay={1000}
            speed={50}
          />
        </div>
      </SlideTransition>

      {/* Restart Button - Only show for presenter */}
      {!isJumbotron && (
        <SlideTransition isVisible={showButton} direction="bounce" className="mt-12 z-10">
          <div className="flex flex-col md:flex-row gap-6">
            <GameButton onClick={onRestart} variant="primary" className="text-xl">
              Play Again (Glutton for Punishment?) 🔄
            </GameButton>
          </div>
        </SlideTransition>
      )}
    </div>
  );
};