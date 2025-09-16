import React, { useEffect, useState } from 'react';
import { Sponsor } from '../../types/game';
import { AnimatedText } from '../AnimatedText';
import { SlideTransition } from '../SlideTransition';
import { GameButton } from '../GameButton';
import { useAudio } from '../../hooks/useAudio';

interface SponsorSlideProps {
  sponsor: Sponsor;
  onNext: () => void;
  isJumbotron?: boolean;
}

export const SponsorSlide: React.FC<SponsorSlideProps> = ({ sponsor, onNext, isJumbotron = false }) => {
  const [showContent, setShowContent] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const { playAudio } = useAudio();

  useEffect(() => {
    setShowContent(true);
    // Play the sponsor text as speech
    playAudio(sponsor.text);
    
    const timer = setTimeout(() => {
      setShowButton(true);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 flex flex-col items-center justify-center p-8 text-white relative overflow-hidden">
      {/* Sponsor-style flashy background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-yellow-400/10 to-red-400/10 animate-pulse"></div>
        <div className="absolute top-10 right-10 text-8xl opacity-20 animate-spin">💰</div>
        <div className="absolute bottom-10 left-10 text-8xl opacity-20 animate-bounce">📺</div>
      </div>

      <SlideTransition isVisible={showContent} direction="slide" className={isJumbotron ? "text-center z-10 max-w-6xl" : "text-center z-10 max-w-5xl"}>
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black p-4 rounded-2xl mb-8 transform rotate-1 shadow-2xl">
          <h2 className={isJumbotron ? "text-5xl md:text-7xl font-black uppercase tracking-wider" : "text-4xl md:text-6xl font-black uppercase tracking-wider"}>
            🎪 SPONSOR BREAK! 🎪
          </h2>
        </div>

        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-8 border border-white/30 shadow-2xl">
          {/* ✅ NEW: Display sponsor image if available */}
          {sponsor.image_url && (
            <div className="mb-6">
              <img 
                src={sponsor.image_url} 
                alt="Sponsor image"
                className={isJumbotron ? "max-w-full h-auto max-h-80 object-contain mx-auto rounded-lg shadow-lg border-2 border-white/20" : "max-w-full h-auto max-h-64 object-contain mx-auto rounded-lg shadow-lg border-2 border-white/20"}
                onError={(e) => {
                  console.error('Failed to load sponsor image:', sponsor.image_url);
                  // Hide the image if it fails to load
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          <AnimatedText 
            text={sponsor.text}
            className={isJumbotron ? "text-2xl md:text-3xl leading-relaxed font-bold" : "text-xl md:text-2xl leading-relaxed font-bold"}
            delay={500}
            speed={40}
          />
        </div>
      </SlideTransition>

      {/* Next Button - Only show for presenter */}
      {!isJumbotron && (
        <SlideTransition isVisible={showButton} direction="bounce" className="mt-12 z-10">
          <GameButton onClick={onNext} variant="next">
            Back to the Chaos! →
          </GameButton>
        </SlideTransition>
      )}
    </div>
  );
};