import React, { useEffect, useState } from 'react';
import { GameIntro } from '../../types/game';
import { AnimatedText } from '../AnimatedText';
import { SlideTransition } from '../SlideTransition';
import { GameButton } from '../GameButton';

interface WelcomeSlideProps {
  intro: GameIntro;
  onStartQuiz: () => void;
}

export const WelcomeSlide: React.FC<WelcomeSlideProps> = ({ 
  intro, 
  onStartQuiz
}) => {
  const [showContent, setShowContent] = useState(false);
  const [showStartButton, setShowStartButton] = useState(false);

  useEffect(() => {
    setShowContent(true);
    
    const timer = setTimeout(() => {
      setShowStartButton(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleStartQuiz = () => {
    onStartQuiz();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 flex flex-col items-center justify-center p-8 text-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-yellow-400/20 rounded-full animate-bounce"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-green-400/20 rounded-full animate-pulse"></div>
        <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-white/10 rounded-full animate-ping"></div>
      </div>

      <div className="max-w-4xl w-full z-10">
        <SlideTransition isVisible={showContent} direction="bounce" className="text-center mb-8">
          <h1 className="text-6xl md:text-8xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500 drop-shadow-2xl animate-pulse">
            {intro.title}
          </h1>
          
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-yellow-300 drop-shadow-lg">
            {intro.subtitle}
          </h2>

          <div className="max-w-3xl mx-auto bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-white/20 mb-8">
            <AnimatedText 
              text={intro.text}
              className="text-lg md:text-xl leading-relaxed"
              delay={1000}
              speed={30}
            />
          </div>
        </SlideTransition>

        {/* Start Button */}
        <SlideTransition isVisible={showStartButton} direction="bounce" className="text-center">
          <GameButton 
            onClick={handleStartQuiz}
            variant="primary" 
            className="text-2xl px-12 py-6"
          >
            🎮 Start Quiz Experience!
          </GameButton>
        </SlideTransition>
      </div>
    </div>
  );
};