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

  // Track audio state to prevent re-renders loops
  const audioRangeRef = useRef<{ start: number, end: number } | null>(null);

  // Load voices
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  useEffect(() => {
    const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        // Priority: Google US English -> Microsoft David -> Male -> Default
        voiceRef.current = voices.find(v => v.name.includes("Google US English")) ||
                           voices.find(v => v.name.includes("Microsoft David")) ||
                           voices.find(v => v.name.includes("Male")) ||
                           voices[0] || null;
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // Main RSVP Loop (Timer or Audio)
  useEffect(() => {
    if (!isPlaying) {
        if (timerRef.current) clearTimeout(timerRef.current);
        window.speechSynthesis.cancel();
        audioRangeRef.current = null;
        return;
    }

    if (content.length === 0 || currentIndex >= content.length) {
        return;
    }

    // AUDIO MODE
    if (isAudioEnabled) {
        if (timerRef.current) clearTimeout(timerRef.current);

        // ROBUST SYNC CHECK:
        // If we are already speaking, and the current index is within the active range, DO NOT RESTART.
        if (window.speechSynthesis.speaking && audioRangeRef.current) {
            const { start, end } = audioRangeRef.current;
            // If current index is sequential or within accepted window, we trust the engine.
            if (currentIndex >= start && currentIndex < end) {
                // We are good, let it play.
                return;
            }
        }
        
        // If we got here, we need to start/restart speech (seek happened or chunk ended)
        window.speechSynthesis.cancel();
        
        const CHUNK_SIZE = 50;
        const chunk = content.slice(currentIndex, currentIndex + CHUNK_SIZE);
        const text = chunk.join(" "); // Standard join
        
        if (!text.trim()) return;

        const utterance = new SpeechSynthesisUtterance(text);
        if (voiceRef.current) utterance.voice = voiceRef.current;
        
        // Rate mapping (experimental but standard)
        // 1.0 rate ~ 150-160 WPM
        const baseRate = wpm / 150; 
        const rate = Math.min(Math.max(baseRate, 0.1), 10);
        utterance.rate = rate;

        const startOffset = currentIndex;
        audioRangeRef.current = { start: startOffset, end: startOffset + CHUNK_SIZE };

        utterance.onboundary = (event) => {
            // Reconstruct word index from char index
            const charIndex = event.charIndex;
            // Count spaces before charIndex to estimate word count
            // Note: This relies on single space join. Punctuation might affect it slightly but robust enough.
            const wordsSoFar = text.slice(0, charIndex + 1).trim().split(/\s+/).length - 1;
            const nextIndex = startOffset + wordsSoFar;

            if (nextIndex < content.length) {
                // We use the function form of setState to avoid stale closures if possible,
                // BUT we are in an event handler. store.getState() access might be safer if outside component?
                // interacting with store hook directly is fine.
                // We update the store. The store update triggers re-render.
                // The re-render triggers this effect.
                // The effect sees we are in range -> Returns Early! -> No Loop!
                setCurrentIndex(nextIndex);
            }
        };

        utterance.onend = () => {
            // When chunk ends, if we are still playing, move to next chunk
            const nextChunkStart = startOffset + CHUNK_SIZE;
            if (isPlaying && nextChunkStart < content.length) {
                 // We push the index forward. This changes state -> Effect runs.
                 // Effect sees currentIndex (new) is >= audioRangeRef.current.end (old).
                 // So it fails the "Range Check" and RESTARTS speech. Correct!
                 setCurrentIndex(nextChunkStart); 
            }
        };

        utterance.onerror = (e) => {
            console.error("TTS Error", e);
            audioRangeRef.current = null;
        };

        window.speechSynthesis.speak(utterance);
    } 
    // TIMER MODE (Standard)
    else {
        window.speechSynthesis.cancel();
        audioRangeRef.current = null;
        
        const baseInterval = 60000 / wpm;
        const currentWord = content[currentIndex] || '';
        const delay = getDelayForWord(currentWord, baseInterval);
        
        timerRef.current = setTimeout(() => {
            setCurrentIndex(currentIndex + 1);
        }, delay);
    }

    return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        // We do NOT cancel speech on cleanup to allow "state update" re-renders to persist audio
        // But if dependencies change (isPlaying, wpm), we DO cancel at start of next run.
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
