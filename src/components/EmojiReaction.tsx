import React, { useState, useEffect } from 'react';

interface EmojiReactionProps {
  isCorrect: boolean;
  playerName: string;
  className?: string;
}

export const EmojiReaction: React.FC<EmojiReactionProps> = ({ 
  isCorrect, 
  playerName, 
  className = '' 
}) => {
  const [currentEmoji, setCurrentEmoji] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  const correctEmojis = ['😎', '🎉', '🔥', '💪', '⭐', '🏆', '👏', '🎯'];
  const wrongEmojis = ['😅', '🤦‍♂️', '😬', '🙈', '💀', '😵', '🤷‍♂️', '😭'];

  useEffect(() => {
    const emojis = isCorrect ? correctEmojis : wrongEmojis;
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    setCurrentEmoji(randomEmoji);
    
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 2000);
    
    return () => clearTimeout(timer);
  }, [isCorrect, playerName]);

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div 
        className={`text-4xl transition-all duration-500 ${
          isAnimating 
            ? 'animate-bounce scale-125 rotate-12' 
            : 'scale-100 rotate-0'
        }`}
      >
        {currentEmoji}
      </div>
    </div>
  );
};