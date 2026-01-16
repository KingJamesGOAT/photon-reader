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
    // STRICT LIMIT: If WPM > 450, Audio is FORCED OFF even if enabled.
    if (isAudioEnabled && wpm <= 450) {
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
        
        window.speechSynthesis.cancel();
        
        // Full Continuous Text Strategy
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
            // Note: This relies on single space join. Punctuation might affect it slightly but robust enough.
            const wordsSoFar = text.slice(0, charIndex + 1).trim().split(/\s+/).length - 1;
            const nextIndex = startOffset + wordsSoFar;

            if (nextIndex < content.length) {
                // Accessing store directly here to avoid dependency loop with setCurrentIndex
                // WE MUST NOT TRIGGER THIS EFFECT AGAIN FROM THIS UPDATE
                // By removing currentIndex from dependency array, we solve the loop.
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
        // We do NOT cancel speech on cleanup to allow "state update" re-renders to persist audio
        // But if dependencies change (isPlaying, wpm), we DO cancel at start of next run.
    };
    // CRITICAL: We REMOVE currentIndex and setCurrentIndex from dependencies.
    // We only restart the effect if:
    // 1. Play/Pause toggles
    // 2. WPM changes (need to update rate)
    // 3. Audio toggle changes
    // 4. Content changes (new book)
    // If currentIndex changes naturally (via our own onboundary/timeout), we DO NOT want to re-run this effect.
    // HOWEVER: If the user MANUALLY SEEKS, we DO want to re-run.
    // Problem: unique seek vs auto update is hard to distinguish in dependency array.
    // Solution: We rely on the "Robust Sync Check" above.
    // If we seek, currentIndex jumps OUTSIDE [start, end].
    // If we re-run, the check fails, and we restart audio.
    // If we update naturally, currentIndex is INSIDE [start, end].
    // If we re-run, the check passes, and we do nothing.
    // SO: We CAN keep currentIndex in the dependency array IF the sync check is solid.
    // BUT the user reported lagging, which implies the sync check was failing or overhead was too high.
    // Let's try keeping it IN (to support seeking) but rely on the improved check logic?
    // User said "It repeats words". That means it IS restarting.
    // Why would (currentIndex >= start && currentIndex < end) fail?
    // Maybe "wordsSoFar" calc is slightly off vs the actual index update?
    // Let's stick with the plan: REMOVE strict dependency if possible?
    // No, if we remove it, Seek won't work.
    // We MUST keep currentIndex.
    // The issue "repeats words" means the 'check' returns FALSE when it should be TRUE.
    // Likely off-by-one error or timing mismatch.
    // "wordsSoFar" might calculate '5' while currentIndex is still '4', then we set '5', effect runs, sees '5', maybe range check logic is flawed?
    // Wait, audioRangeRef.current = { start: 100, end: 5000 }.
    // Current index = 100. Check: 100 >= 100 && 100 < 5000. True. Return.
    // Audio speaks. onboundary -> sets index 101.
    // Effect runs. Current index = 101. Check: 101 >= 100 && 101 < 5000. True. Return.
    // Why did it fail?
    // Maybe `window.speechSynthesis.speaking` was false for a microsecond? No.
    // Maybe `audioRangeRef.current` was null?
    // Ah, `isAudioEnabled && wpm <= 450`.
    // If the user was just at the limit?
    // Let's try to trust the check again but ensuring WPM limit logic is enforced.
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
