import { useCallback, useRef, useState, useEffect } from 'react';

export const useAudio = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const currentTextRef = useRef<string>('');
  const audioQueueRef = useRef<string[]>([]);
  const timeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);

  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Clear timeout helper
  const clearCurrentTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout.bind(window)(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // ✅ ENHANCED: Immediate stop function for transitions
  const stopCurrentAudio = useCallback(() => {
    console.log('🔇 Stopping current audio immediately');
    
    // Clear any pending timeouts
    clearCurrentTimeout();
    
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
      } catch (error) {
        console.warn('Error stopping audio:', error);
      }
      audioRef.current = null;
    }
    
    isPlayingRef.current = false;
    if (isMountedRef.current) {
      setIsPlaying(false);
    }
    
    // Clear any queued audio
    audioQueueRef.current = [];
    currentTextRef.current = '';
  }, [clearCurrentTimeout]);

  const playAudio = useCallback(async (textContent: string, options: { 
    priority?: boolean;
    onComplete?: () => void;
    onError?: (error: Error) => void;
  } = {}) => {
    const { priority = false, onComplete, onError } = options;

    if (!isMountedRef.current) {
      console.log('🔇 Component unmounted, skipping audio');
      onComplete?.();
      return;
    }

    // If priority, stop current audio and clear queue
    if (priority) {
      stopCurrentAudio();
      audioQueueRef.current = [];
    }

    // If audio is playing and not priority, queue it
    if (isPlayingRef.current && !priority) {
      audioQueueRef.current.push(textContent);
      console.log('🎵 Audio queued:', textContent.substring(0, 50));
      return;
    }

    // Check if muted or volume is 0
    if (isMuted || volume === 0) {
      console.log('🔇 Audio muted, skipping playback');
      onComplete?.();
      return;
    }

    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
    const voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID;

    if (!apiKey || !voiceId) {
      console.warn('🔇 ElevenLabs API key or Voice ID not configured');
      onComplete?.();
      return;
    }

    console.log(`🔊 Generating speech for: ${textContent.substring(0, 50)}...`);
    
    try {
      if (!isMountedRef.current) return;

      isPlayingRef.current = true;
      if (isMountedRef.current) {
        setIsPlaying(true);
      }
      currentTextRef.current = textContent;

      // Call ElevenLabs API to generate speech
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text: textContent,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.8,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      if (!isMountedRef.current) return;

      // Convert response to audio blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create and play audio
      audioRef.current = new Audio(audioUrl);
      audioRef.current.volume = volume;
      
      return new Promise<void>((resolve, reject) => {
        if (!audioRef.current || !isMountedRef.current) {
          resolve();
          return;
        }

        audioRef.current.onended = () => {
          console.log(`✅ Finished playing audio`);
          URL.revokeObjectURL(audioUrl);
          isPlayingRef.current = false;
          
          if (isMountedRef.current) {
            setIsPlaying(false);
          }
          
          // Play next in queue with proper timeout handling
          if (audioQueueRef.current.length > 0 && isMountedRef.current) {
            const nextText = audioQueueRef.current.shift()!;
            timeoutRef.current = window.setTimeout.bind(window)(() => {
              if (isMountedRef.current) {
                playAudio(nextText);
              }
            }, 500);
          }
          
          onComplete?.();
          resolve();
        };
        
        audioRef.current.onerror = (error) => {
          console.error('Audio playback error:', error);
          URL.revokeObjectURL(audioUrl);
          isPlayingRef.current = false;
          
          if (isMountedRef.current) {
            setIsPlaying(false);
          }
          
          const err = new Error('Audio playback failed');
          onError?.(err);
          reject(err);
        };
        
        audioRef.current.play().catch((error) => {
          console.error('Audio play failed:', error);
          isPlayingRef.current = false;
          
          if (isMountedRef.current) {
            setIsPlaying(false);
          }
          
          const err = new Error('Audio play failed');
          onError?.(err);
          reject(err);
        });
      });
      
    } catch (error) {
      console.error('ElevenLabs API error:', error);
      isPlayingRef.current = false;
      
      if (isMountedRef.current) {
        setIsPlaying(false);
      }
      
      const err = error instanceof Error ? error : new Error('Audio generation failed');
      onError?.(err);
      // Continue without audio
      onComplete?.();
      return Promise.resolve();
    }
  }, [volume, isMuted, stopCurrentAudio]);

  const replayAudio = useCallback(() => {
    if (currentTextRef.current && !isPlayingRef.current && isMountedRef.current) {
      playAudio(currentTextRef.current, { priority: true });
    }
  }, [playAudio]);

  const toggleMute = useCallback(() => {
    if (!isMountedRef.current) return;
    
    setIsMuted(prev => !prev);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? volume : 0;
    }
  }, [isMuted, volume]);

  const changeVolume = useCallback((newVolume: number) => {
    if (!isMountedRef.current) return;
    
    setVolume(newVolume);
    if (audioRef.current && !isMuted) {
      audioRef.current.volume = newVolume;
    }
  }, [isMuted]);

  const clearQueue = useCallback(() => {
    console.log('🧹 Clearing audio queue and stopping current audio');
    audioQueueRef.current = [];
    stopCurrentAudio();
  }, [stopCurrentAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearCurrentTimeout();
      stopCurrentAudio();
    };
  }, [clearCurrentTimeout, stopCurrentAudio]);

  return { 
    playAudio, 
    stopAudio: stopCurrentAudio, 
    replayAudio,
    toggleMute,
    changeVolume,
    clearQueue,
    isPlaying,
    volume: isMuted ? 0 : volume,
    isMuted
  };
};