import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { useEdgeTTS } from './useEdgeTTS';

const CHUNK_SIZE = 50;

export const useRSVP = () => {
  const { 
    content, wpm, isPlaying, currentIndex, setCurrentIndex, setIsPlaying, isAudioEnabled
  } = useStore();
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Destructure 'marks' from our new hook
  const { fetchAudio, play, pause, stop, currentTime, duration, isLoading, audioUrl, marks, audioElement, isBlocked } = useEdgeTTS();
  
  const audioStartedRef = useRef(false);
  const audioOffsetRef = useRef(0); // Where the current chunk starts in the full text

  // Support logic
  // Timer ref manages both standard and fallback timing
  // --------------------------------------------------------


  // --------------------------------------------------------
  // HYBRID SYNC: Audio + Interpolation + Fallback Timer
  // --------------------------------------------------------
  useEffect(() => {
    // 1. If not playing, or at end, do nothing
    if (!isPlaying || currentIndex >= content.length) {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (isAudioEnabled) pause();
        return;
    }

    // 2. AUDIO MODE LOGIC
    if (isAudioEnabled) {
        // A. Chunk Loading / Fetching
        if (!audioStartedRef.current && !isLoading) {
            audioOffsetRef.current = currentIndex; // Anchor point
            const text = content.slice(currentIndex, currentIndex + CHUNK_SIZE).join(" ");
            
            // Adjust rate: 150wpm = 0%. Range usually -50% to +100%
            const ratePercent = ((wpm / 150) - 1) * 100; 
            
            console.log(`[RSVP] Fetching audio chunk starting at index ${currentIndex}`);
            
            fetchAudio(text, ratePercent).then((success) => {
                if (success) {
                    audioStartedRef.current = true;
                    // Try to play - logic handled by audioStartedRef check
                    play(); 
                } else {
                    console.warn("[RSVP] Audio fetch failed. Disabling audio mode.");
                    // CRITICAL FIX: Explicitly disable audio to prevent infinite retry loop
                    // We must access the store's toggle mechanism or setter
                    useStore.getState().toggleAudio();
                }
            });
        }
        else if (audioStartedRef.current && audioElement?.paused && !isLoading) {
            // Attempt to resume if paused
             play();
        }

        // B. SYNC & FAIL-SAFE LOGIC
        // Regardless of audio state, we run a "Hybrid Tick"
        // If audio is playing fine, it drives. If it halts, the timer drives.
        
        if (timerRef.current) clearTimeout(timerRef.current);

        // -- Strategy: Check if Audio is actually driving --
        const isAudioActuallyPlaying = audioElement && !audioElement.paused && !audioElement.ended && audioElement.readyState > 2;

        if (isAudioActuallyPlaying) {
             // >>> AUDIO DRIVEN <<<
             // 1. Interpolation / Marks Logic matches current time to index
             let relativeIndex = -1;

             if (marks.length > 0) {
                 // "Sticky" Mark Search
                 for (let i = 0; i < marks.length; i++) {
                     if (currentTime >= marks[i].start) {
                         relativeIndex = i;
                     } else { break; }
                 }
             } else if (duration > 0) {
                 // Interpolation Fallback (No marks)
                 const chunkWordCount = Math.min(CHUNK_SIZE, content.length - audioOffsetRef.current);
                 relativeIndex = Math.floor((currentTime / duration) * chunkWordCount);
             }

             if (relativeIndex !== -1) {
                 const absoluteIndex = audioOffsetRef.current + relativeIndex;
                 if (absoluteIndex !== currentIndex && absoluteIndex < content.length) {
                      setCurrentIndex(absoluteIndex);
                 }
             }
        } else {
             // >>> TIMER DRIVEN (Fail-Safe) <<<
             // If audio is loading, blocked, or just silent, we WAIT a bit, then force move.
             
             // Wait longer if loading (give it a chance)
             const isLoadingBuffer = isLoading ? 3000 : 0; 
             // Standard delay based on WPM
             const baseInterval = (60000 / wpm);
             const currentWord = content[currentIndex] || '';
             let delay = baseInterval;
             if (/[.?!]/.test(currentWord)) delay *= 1.5;
             else if (currentWord.length > 10) delay *= 1.1;

             // If we've been stuck for (delay + buffer), force move
             timerRef.current = setTimeout(() => {
                 console.log("[RSVP] Fail-Safe Timer Tick. Audio stuck or loading.");
                 setCurrentIndex(currentIndex + 1);
             }, delay + isLoadingBuffer);
        }

    } 
    // 3. STANDARD TIMER MODE (Audio Disabled)
    else {
        if (audioUrl) pause();

        const baseInterval = 60000 / wpm;
        const currentWord = content[currentIndex] || '';
        let delay = baseInterval;
        if (/[.?!]/.test(currentWord)) delay *= 1.5;
        else if (currentWord.length > 10) delay *= 1.1;

        timerRef.current = setTimeout(() => {
            setCurrentIndex(currentIndex + 1);
        }, delay);
    }

    return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, wpm, content, currentIndex, isAudioEnabled, audioUrl, isLoading, fetchAudio, play, pause, audioElement, setCurrentIndex, marks, currentTime, duration]);

  // Handle End of Audio Chunk
  useEffect(() => {
    // ... (This part is mostly fine, but we ensure it works with the hybrid approach)
      const handleEnded = () => {
          if (!isPlaying) return;
          console.log("[RSVP] Audio chunk ended.");
          const nextChunkStart = audioOffsetRef.current + CHUNK_SIZE;
          if (nextChunkStart < content.length) {
              // Ensure we don't jump back if fail-safe timer pushed us ahead
              const targetIndex = Math.max(currentIndex, nextChunkStart); 
              setCurrentIndex(targetIndex);
              audioStartedRef.current = false; // Triggers new fetch
          } else {
              setIsPlaying(false);
              stop();
              setCurrentIndex(0);
          }
      };

      if (audioElement) audioElement.addEventListener('ended', handleEnded);
      return () => audioElement?.removeEventListener('ended', handleEnded);
  }, [audioElement, content.length, isPlaying, setIsPlaying, setCurrentIndex, stop, currentIndex]);

  return {
    progress: content.length > 0 ? (currentIndex / content.length) * 100 : 0,
    isBlocked,
    playAudio: play
  };
};
