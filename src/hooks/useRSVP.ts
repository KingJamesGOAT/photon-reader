import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { useEdgeTTS } from './useEdgeTTS';

const CHUNK_SIZE = 50;

export const useRSVP = (isDriver: boolean = true) => {
  const { 
    content, wpm, isPlaying, currentIndex, setCurrentIndex, setIsPlaying, isAudioEnabled
  } = useStore();
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Destructure 'marks' from our new hook
  // IMPORTANT: useEdgeTTS has its own internal state. 
  // If isDriver is false, we technically don't need audio state, but we return 'progress' which relies on currentIndex.
  // We can just call useEdgeTTS() anyway, but its logic (audio listeners) are low cost.
  // The crucial part is NOT calling 'play', 'pause', 'fetchAudio' from the non-driver instance.
  const { fetchAudio, play, pause, stop, currentTime, duration, isLoading, audioUrl, marks, audioElement, isBlocked } = useEdgeTTS();
  
  const audioStartedRef = useRef(false);
  const audioOffsetRef = useRef(0); // Where the current chunk starts in the full text

  // Support logic
  // Timer ref manages both standard and fallback timing
  // --------------------------------------------------------


  // --------------------------------------------------------
  // SEPARATED LOGIC: Fetch vs Sync vs Timer
  // --------------------------------------------------------

  // 1. AUDIO FETCHING LOGIC
  // Triggers only when index changes or audio is enabled/disabled
  useEffect(() => {
    if (!isDriver) return;
    if (!isPlaying || currentIndex >= content.length) return;

    if (isAudioEnabled) {
        if (!audioStartedRef.current && !isLoading) {
            audioOffsetRef.current = currentIndex;
            const text = content.slice(currentIndex, currentIndex + CHUNK_SIZE).join(" ");
            const ratePercent = ((wpm / 150) - 1) * 100;
            
            console.log(`[RSVP] Fetching audio chunk starting at index ${currentIndex}`);
            
            fetchAudio(text, ratePercent).then((success) => {
                if (success) {
                    audioStartedRef.current = true;
                    play(); 
                } else {
                    console.warn("[RSVP] Audio fetch failed. Disabling audio mode.");
                    useStore.getState().toggleAudio();
                }
            });
        } 
        else if (audioStartedRef.current && audioElement?.paused && !isLoading) {
            play();
        }
    }
  }, [isDriver, isPlaying, currentIndex, isAudioEnabled, isLoading, content, wpm, fetchAudio, play, audioElement]);


  // 2. SYNC LOGIC (High Frequency)
  // Triggers on 'currentTime' update. Responsible for MOVING index based on audio.
  useEffect(() => {
      if (!isDriver || !isPlaying || !isAudioEnabled) return;
      
      const isAudioActive = audioElement && !audioElement.paused && !audioElement.ended && audioElement.readyState > 2;
      
      if (isAudioActive) {
          let relativeIndex = -1;
          if (marks.length > 0) {
              for (let i = 0; i < marks.length; i++) {
                  if (currentTime >= marks[i].start) relativeIndex = i;
                  else break;
              }
          } else if (duration > 0) {
              const chunkWordCount = Math.min(CHUNK_SIZE, content.length - audioOffsetRef.current);
              relativeIndex = Math.floor((currentTime / duration) * chunkWordCount);
          }

          if (relativeIndex !== -1) {
              const absoluteIndex = audioOffsetRef.current + relativeIndex;
              // Guard: Only update if changed and valid
              if (absoluteIndex !== currentIndex && absoluteIndex < content.length && absoluteIndex >= 0) {
                   setCurrentIndex(absoluteIndex);
              }
          }
      }
  }, [isDriver, isPlaying, isAudioEnabled, currentTime, marks, duration, audioElement, currentIndex, content.length, setCurrentIndex]);


  // 3. FAIL-SAFE / TIMER LOGIC
  // Triggers on index change or loading state. Responsible for ADVANCING if audio fails/stalls.
  useEffect(() => {
    if (!isDriver) return;
    
    // Clear existing timer on any relevant change
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!isPlaying || currentIndex >= content.length) {
        if (isAudioEnabled) pause();
        return;
    }

    const isAudioActive = audioElement && !audioElement.paused && !audioElement.ended && audioElement.readyState > 2;

    // Calculate Delay
    const baseInterval = 60000 / wpm;
    const currentWord = content[currentIndex] || '';
    let delay = baseInterval;
    if (/[.?!]/.test(currentWord)) delay *= 1.5;
    else if (currentWord.length > 10) delay *= 1.1;

    // If Audio Mode is ON but Audio is NOT playing (Loading, Blocked, or Error)
    if (isAudioEnabled && !isAudioActive) {
         const isLoadingBuffer = isLoading ? 3000 : 0; 
         
         timerRef.current = setTimeout(() => {
             console.log("[RSVP] Fail-Safe Timer Tick.");
             // Guard: Don't advance past end
             if (currentIndex + 1 < content.length) {
                 setCurrentIndex(currentIndex + 1);
             } else {
                 setIsPlaying(false);
             }
         }, delay + isLoadingBuffer);
    } 
    // If Audio Mode is OFF (Standard RSVP)
    else if (!isAudioEnabled) {
        if (audioUrl) pause();
        
        timerRef.current = setTimeout(() => {
            if (currentIndex + 1 < content.length) {
                setCurrentIndex(currentIndex + 1);
            } else {
                setIsPlaying(false);
            }
        }, delay);
    }

    return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isDriver, isPlaying, currentIndex, isAudioEnabled, isLoading, wpm, content, audioElement, audioUrl, setIsPlaying, setCurrentIndex, pause]);

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
