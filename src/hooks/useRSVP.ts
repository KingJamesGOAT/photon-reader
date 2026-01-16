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

  // Last auto-updated index (to detect manual seeks)
  const lastAutoIndexRef = useRef<number>(-1);

  // Main RSVP Loop (Timer or Audio)
  useEffect(() => {
    if (!isPlaying) {
        if (timerRef.current) clearTimeout(timerRef.current);
        window.speechSynthesis.cancel();
        audioRangeRef.current = null;
        lastAutoIndexRef.current = -1;
        return;
    }

    if (content.length === 0 || currentIndex >= content.length) {
        return;
    }

    // AUDIO MODE
    // STRICT LIMIT: If WPM > 450, Audio is FORCED OFF even if enabled.
    if (isAudioEnabled && wpm <= 450) {
        if (timerRef.current) clearTimeout(timerRef.current);

        // MANUAL SEEK DETECTION:
        // If we are already speaking, and the current index matches our last "auto" update,
        // it means this Effect run was triggered by our own onboundary event. WE MUST IGNORE IT.
        if (window.speechSynthesis.speaking && audioRangeRef.current) {
             // If currentIndex matches the last auto-set index, it's an auto-advance. DO NOT RESTART.
             if (currentIndex === lastAutoIndexRef.current) {
                 return;
             }
             // If currentIndex is different, it means the user MANUALLY sought to a new spot.
             // We fall through to restart audio.
        }
        
        window.speechSynthesis.cancel();
        
        // Full Continuous Text Strategy
        const remainingContent = content.slice(currentIndex);
        const text = remainingContent.join(" ");
        
        if (!text.trim()) return;

        const utterance = new SpeechSynthesisUtterance(text);
        if (voiceRef.current) utterance.voice = voiceRef.current;
        
        // Rate mapping
        const baseRate = wpm / 150; 
        const rate = Math.min(Math.max(baseRate, 0.1), 10);
        utterance.rate = rate;

        const startOffset = currentIndex;
        // Range covers until the end of the content
        audioRangeRef.current = { start: startOffset, end: content.length };
        // Reset auto index for new stream
        lastAutoIndexRef.current = startOffset; 

        utterance.onboundary = (event) => {
            const charIndex = event.charIndex;
            const wordsSoFar = text.slice(0, charIndex + 1).trim().split(/\s+/).length - 1;
            const nextIndex = startOffset + wordsSoFar;

            if (nextIndex < content.length && nextIndex !== currentIndex) {
                // MARK THIS AS AN AUTO UPDATE before calling set state
                lastAutoIndexRef.current = nextIndex;
                useStore.getState().setCurrentIndex(nextIndex);
            }
        };

        utterance.onend = () => {
             // Natural end of speech
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
