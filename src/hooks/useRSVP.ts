import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';

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
  const isEngineUpdating = useRef(false);
  const chunkOffsetRef = useRef(0);

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

  // Main RSVP Loop (Timer or Audio)
  useEffect(() => {
    // If update came from the audio engine itself, ignore it to prevent loop
    if (isEngineUpdating.current) {
        isEngineUpdating.current = false;
        return;
    }

    if (!isPlaying) {
        // Cancel any active speech or timers
        if (timerRef.current) clearTimeout(timerRef.current);
        window.speechSynthesis.cancel();
        return;
    }

    if (content.length === 0 || currentIndex >= content.length) {
        return; 
    }

    // AUDIO MODE
    if (isAudioEnabled) {
        if (timerRef.current) clearTimeout(timerRef.current);
        
        // Chunking Strategy: Speak next 50 words
        const CHUNK_SIZE = 50;
        const chunk = content.slice(currentIndex, currentIndex + CHUNK_SIZE);
        const text = chunk.join(" ");
        
        if (!text.trim()) return;

        // Cancel previous
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Rate: 1.0 is ~150-160 WPM depending on voice/browser
        // Clamp rate between 0.1 and 10 (browser limits)
        // Practical limit for understandability is usually ~4.0
        const rate = Math.min(Math.max(wpm / 150, 0.1), 10);
        utterance.rate = rate;

        chunkOffsetRef.current = currentIndex;

        utterance.onboundary = (event) => {
            // event.charIndex is index in 'text'
            // We need to find which word index this corresponds to
            const charIndex = event.charIndex;
            
            // Simple approximation: check which word includes this char index
            // Or reconstruct fast
            // Faster: split text up to charIndex by space to count words
            // Note: this assumes single spaces
            const wordsSoFar = text.slice(0, charIndex + 1).trim().split(/\s+/).length - 1;
            
            const nextIndex = chunkOffsetRef.current + wordsSoFar;

            if (nextIndex !== currentIndex && nextIndex < content.length) {
                isEngineUpdating.current = true;
                setCurrentIndex(nextIndex);
            }
        };

        utterance.onend = () => {
            // When chunk ends, if we are still playing and haven't finished book
            // Trigger next chunk
            // The natural flow is: onend -> nothing?
            // Wait, if audio ends, we must trigger next chunk.
            // Current index should be at end of chunk approx
            // We just ensure we move to exactly chunk end if not there
            const nextChunkStart = chunkOffsetRef.current + CHUNK_SIZE;
            if (isPlaying && nextChunkStart < content.length) {
                 isEngineUpdating.current = true; // Prevent flicker
                 setCurrentIndex(nextChunkStart); 
                 // Updating state will re-trigger useEffect -> next chunk
            } else if (nextChunkStart >= content.length) {
                // End of book logic handled by separate effect
            }
        };

        utterance.onerror = (e) => {
            console.error("TTS Error", e);
            // Fallback?
        };

        window.speechSynthesis.speak(utterance);
    } 
    // TIMER MODE (Standard)
    else {
        window.speechSynthesis.cancel();
        
        const baseInterval = 60000 / wpm;
        const currentWord = content[currentIndex] || '';
        const delay = getDelayForWord(currentWord, baseInterval);
        
        timerRef.current = setTimeout(() => {
            setCurrentIndex(currentIndex + 1);
        }, delay);
    }

    return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        // Only cancel speech on unmount or if mode changes drastically
        // We rely on the start of the effect to cancel previous speech
    };
  }, [isPlaying, wpm, content, currentIndex, setCurrentIndex, isAudioEnabled]);

  // Handle end of content (Loop with Delay)
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If we reached the end
    if (currentIndex >= content.length && isPlaying) {
      setIsPlaying(false);
      window.speechSynthesis.cancel();
      
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = setTimeout(() => {
          setCurrentIndex(0);
          setIsPlaying(true);
      }, 1000); 
    }
  }, [currentIndex, content.length, isPlaying, setIsPlaying, setCurrentIndex]);

  // Cleanup on unmount
  useEffect(() => {
      return () => {
          if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
          window.speechSynthesis.cancel();
      };
  }, []);

  return {
    currentWord: content[currentIndex] || '',
    progress: content.length > 0 ? (currentIndex / content.length) * 100 : 0,
    wpm
  };
};
