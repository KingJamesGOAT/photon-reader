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
            if (currentIndex >= start && currentIndex < end) {
                return;
            }
        }
        
        window.speechSynthesis.cancel();
        
        // Full Continuous Text Strategy
        // We speak from currentIndex to the end of the content (or chapter limit if we had chapters, but 'content' is the source of truth here)
        // Taking a slice from currentIndex to end
        const remainingContent = content.slice(currentIndex);
        const text = remainingContent.join(" ");
        
        if (!text.trim()) return;

        const utterance = new SpeechSynthesisUtterance(text);
        if (voiceRef.current) utterance.voice = voiceRef.current;
        
        // Rate mapping
        // 1.0 rate ~ 150-160 WPM
        const baseRate = wpm / 150; 
        const rate = Math.min(Math.max(baseRate, 0.1), 10);
        utterance.rate = rate;

        const startOffset = currentIndex;
        // Range covers until the end of the content
        audioRangeRef.current = { start: startOffset, end: content.length };

        utterance.onboundary = (event) => {
            const charIndex = event.charIndex;
            // Reconstruct word index relative to the start of this utterance
            // Count spaces to find word count
            const wordsSoFar = text.slice(0, charIndex + 1).trim().split(/\s+/).length - 1;
            const nextIndex = startOffset + wordsSoFar;

            if (nextIndex < content.length) {
                setCurrentIndex(nextIndex);
            }
        };

        utterance.onend = () => {
             // Natural end of speech
             // We do nothing specific here, the 'end of content' effect will catch if we hit the limit
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
