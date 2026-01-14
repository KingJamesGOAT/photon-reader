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

  useEffect(() => {
    if (isPlaying && content.length > 0) {
      const intervalMs = 60000 / wpm; // Simple constant speed for now
      
      timerRef.current = setInterval(() => {
        setCurrentIndex(currentIndex + 1);
      }, intervalMs);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, wpm, content.length, currentIndex, setCurrentIndex]);

  // Stop when we reach the end
  // Handle end of content (Stop or Loop)
  useEffect(() => {
    if (currentIndex >= content.length && isPlaying) {
      const { currentFileId } = useStore.getState();
      
      if (currentFileId === 'demo') {
           // Auto-Loop for Demo
           setCurrentIndex(0);
      } else {
           // Stop for regular files
           setIsPlaying(false);
           setCurrentIndex(content.length - 1); 
      }
    }
  }, [currentIndex, content.length, isPlaying, setIsPlaying, setCurrentIndex]);

  return {
    currentWord: content[currentIndex] || '',
    progress: content.length > 0 ? (currentIndex / content.length) * 100 : 0
  };
};
