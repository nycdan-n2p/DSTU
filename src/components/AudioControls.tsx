import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, RotateCcw, Play, Pause } from 'lucide-react';

interface AudioControlsProps {
  isPlaying: boolean;
  onVolumeToggle: () => void;
  onReplay: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  className?: string;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  isPlaying,
  onVolumeToggle,
  onReplay,
  volume,
  onVolumeChange,
  className = ''
}) => {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Audio Status Indicator */}
      <div className="flex items-center gap-2">
        {isPlaying ? (
          <div className="flex items-center gap-2 text-green-400">
            <Play className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-medium">Playing</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-400">
            <Pause className="w-4 h-4" />
            <span className="text-sm">Ready</span>
          </div>
        )}
      </div>

      {/* Volume Control */}
      <div className="relative">
        <button
          onClick={() => setShowVolumeSlider(!showVolumeSlider)}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          title="Volume Control"
        >
          {volume === 0 ? (
            <VolumeX className="w-5 h-5 text-gray-400" />
          ) : (
            <Volume2 className="w-5 h-5 text-white" />
          )}
        </button>

        {showVolumeSlider && (
          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-white/20">
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-gray-300">Volume</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs text-white">{Math.round(volume * 100)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Replay Button */}
      <button
        onClick={onReplay}
        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        title="Replay Audio"
        disabled={isPlaying}
      >
        <RotateCcw className={`w-5 h-5 ${isPlaying ? 'text-gray-500' : 'text-white'}`} />
      </button>

      {/* Mute Toggle */}
      <button
        onClick={onVolumeToggle}
        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        title={volume === 0 ? 'Unmute' : 'Mute'}
      >
        {volume === 0 ? (
          <VolumeX className="w-5 h-5 text-red-400" />
        ) : (
          <Volume2 className="w-5 h-5 text-green-400" />
        )}
      </button>
    </div>
  );
};