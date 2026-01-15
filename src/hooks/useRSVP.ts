import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';

export const useRSVP = () => {
  const { 
    content, 
    wpm, 
    isPlaying, 
    currentIndex, 
    setCurrentIndex, 
    setIsPlaying 
  } = useStore();
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const getDelayForWord = (word: string, baseInterval: number) => {
    let multiplier = 1.0;
    
    // Punctuation multipliers
    if (/[.?!:]/.test(word)) {
      multiplier = 1.5; // End of sentence / major pause
    } else if (/[,;—\-]/.test(word)) {
      multiplier = 1.2; // Clause break
    }
    
    // Long word penalty
    if (word.length > 10) {
      multiplier *= 1.1;
    }
    
    return baseInterval * multiplier;
  };

  useEffect(() => {
    if (isPlaying && content.length > 0 && currentIndex < content.length) {
      const baseInterval = 60000 / wpm;
      const currentWord = content[currentIndex] || '';
      const delay = getDelayForWord(currentWord, baseInterval);
      
      timerRef.current = setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
      }, delay);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isPlaying, wpm, content, currentIndex, setCurrentIndex]);

  // Stop when we reach the end
  // Handle end of content (Loop with Delay)
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (currentIndex >= content.length && isPlaying) {
      // Pause immediately at the end
      setIsPlaying(false);
      
      // Clear any existing timeout just in case
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);

      // Wait shortly then restart
      restartTimeoutRef.current = setTimeout(() => {
          setCurrentIndex(0);
          setIsPlaying(true);
      }, 1000); // 1 second pause
    }
  }, [currentIndex, content.length, isPlaying, setIsPlaying, setCurrentIndex]);

  // Cleanup restart timeout on unmount
  useEffect(() => {
      return () => {
          if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      };
  }, []);

  return {
    currentWord: content[currentIndex] || '',
    progress: content.length > 0 ? (currentIndex / content.length) * 100 : 0,
    wpm
  };
};
