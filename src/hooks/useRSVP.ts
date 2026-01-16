import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { useEdgeTTS } from './useEdgeTTS';

export const useRSVP = () => {
  const { 
    content, 
    wpm, 
    isPlaying, 
    currentIndex, 
    setCurrentIndex, 
    setIsPlaying,
    isAudioEnabled
  } = useStore();
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { fetchAudio, play, pause, stop, currentTime, duration, isLoading, audioUrl, audioElement } = useEdgeTTS();
  const audioStartedRef = useRef(false);
  const audioOffsetRef = useRef(0);

  const getDelayForWord = (word: string, baseInterval: number) => {
    let multiplier = 1.0;
    if (/[.?!:]/.test(word)) multiplier = 1.5;
    else if (/[,;—\-]/.test(word)) multiplier = 1.2;
    if (word.length > 10) multiplier *= 1.1;
    return baseInterval * multiplier;
  };

  // Sync Visuals to Audio Time (The Karaoke Pattern)
  useEffect(() => {
    if (isAudioEnabled && isPlaying && audioUrl && !isLoading) {
        // ... (sync logic)
        if (duration > 0 && audioElement && !audioElement.paused) {
             const remainingText = content.slice(audioOffsetRef.current);
             const wordCount = remainingText.length;
             const wordsPerSecond = wordCount / duration;
             
             const relativeIndex = Math.floor(currentTime * wordsPerSecond);
             const nextIndex = audioOffsetRef.current + relativeIndex;
             
             if (nextIndex !== currentIndex && nextIndex < content.length) {
                 setCurrentIndex(nextIndex);
             }
        }
    }
  }, [currentTime, duration, isAudioEnabled, isPlaying, audioUrl, content, audioOffsetRef, currentIndex, setCurrentIndex, audioElement, isLoading]);


  // Main Control Loop
  useEffect(() => {
    if (!isPlaying) {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (isAudioEnabled) pause(); 
        return;
    }

    if (content.length === 0 || currentIndex >= content.length) return;

    // AUDIO MODE
    if (isAudioEnabled) {
        if (timerRef.current) clearTimeout(timerRef.current);
        
        // If we have audio and are just paused, resume
        if (audioUrl && !audioStartedRef.current) {
             play();
             audioStartedRef.current = true;
             return;
        }

        // If we need new audio (seeked or fresh start)
        if (!audioStartedRef.current && !isLoading) {
            audioOffsetRef.current = currentIndex;
            const text = content.slice(currentIndex).join(" ");
            // Edge TTS: 0% = default. +100% = 2x.
            // Default is usually ~150 WPM.
            const ratePercent = ((wpm / 150) - 1) * 100;
            
            fetchAudio(text, ratePercent).then(() => {
                audioStartedRef.current = true;
                play();
            });
        }
        else if (audioStartedRef.current && audioElement?.paused && !isLoading) {
             play();
        }

    } 
    // TIMER MODE
    else {
        if (audioUrl) pause(); // Ensure audio stops if we switch mode

        const baseInterval = 60000 / wpm;
        const currentWord = content[currentIndex] || '';
        const delay = getDelayForWord(currentWord, baseInterval);
        
        timerRef.current = setTimeout(() => {
            setCurrentIndex(currentIndex + 1);
        }, delay);
    }

    return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, wpm, content, currentIndex, isAudioEnabled, audioUrl, isLoading, fetchAudio, play, pause, audioElement, setCurrentIndex]);

  // Handle Seek Reset
  // If currentIndex changes significantly without audio driving it, we must reset audio?
  // This is tricky. Let's rely on the store action 'seekByTime' or 'update' to reset 'audioUrl' maybe?
  // Or: compare currentIndex with expected range.
  // For now, let's just make sure unmount stops it.

  // Handle end
  useEffect(() => {
    if (currentIndex >= content.length && isPlaying) {
      setIsPlaying(false);
      audioStartedRef.current = false;
      stop(); // Stop audio
      
      if (timerRef.current) clearTimeout(timerRef.current);
      setTimeout(() => {
          setCurrentIndex(0);
          // Auto restart? maybe
          audioOffsetRef.current = 0;
          stop();
      }, 1000); 
    }
  }, [currentIndex, content.length, isPlaying, setIsPlaying, setCurrentIndex, stop]);

  // Cleanup
  useEffect(() => {
      return () => {
          if (timerRef.current) clearTimeout(timerRef.current);
          stop();
      };
  }, [stop]);

  return {
    progress: content.length > 0 ? (currentIndex / content.length) * 100 : 0,
  };
};


