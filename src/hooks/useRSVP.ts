import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { useEdgeTTS } from './useEdgeTTS';

const CHUNK_SIZE = 60; // Drastically reduced to 60 to prevent EdgeTTS Timeouts completely.

export const useRSVP = (isDriver: boolean = true) => {
  const content = useStore(state => state.content);
  const wpm = useStore(state => state.wpm);
  const isPlaying = useStore(state => state.isPlaying);
  const currentIndex = useStore(state => state.currentIndex);
  const setCurrentIndex = useStore(state => state.setCurrentIndex);
  const setIsPlaying = useStore(state => state.setIsPlaying);
  const isAudioEnabled = useStore(state => state.isAudioEnabled);
  const currentFileId = useStore(state => state.currentFileId); 
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { fetchAudio, play, pause, stop, currentTime, duration, isLoading, marks, audioElement, isBlocked, reset, setRate } = useEdgeTTS();
  
  const audioStartedRef = useRef(false);
  const audioOffsetRef = useRef(0); 

  // 1. RESET LOGIC: Force cleanup on file/content change
  useEffect(() => {
      if (!isDriver) return;
      audioStartedRef.current = false;
      audioOffsetRef.current = useStore.getState().currentIndex; 
      reset(); 
  }, [currentFileId, content, reset, isDriver]); 

  // 2. RATE SYNC: Keep playback rate tied to WPM
  useEffect(() => {
      if (isAudioEnabled) {
          const playbackRate = wpm / 150; 
          setRate(playbackRate);
      }
  }, [wpm, isAudioEnabled, setRate]);

  // 3. AUDIO FETCHING & LIFECYCLE
  useEffect(() => {
    if (!isDriver) return;
    if (!isPlaying || currentIndex >= content.length) {
        if (isAudioEnabled && !isLoading) {
             pause(); // Just pause if we stop manually
        }
        return;
    }

    if (isAudioEnabled) {
        // A. Start New Chunk if needed
        if (!audioStartedRef.current && !isLoading) {
            audioOffsetRef.current = currentIndex;
            
            // Calculate chunk
            const rawText = content.slice(currentIndex, currentIndex + CHUNK_SIZE).join(" ");
            
            // Remove punctuation to prevent TTS from pausing (Constant Speed)
            const text = rawText.replace(/[.?!,;:]/g, " ");
            
            console.log(`[RSVP] Fetching chunk: Index ${currentIndex} to ${currentIndex + CHUNK_SIZE}`);
            
            fetchAudio(text).then((success) => {
                if (success) {
                    audioStartedRef.current = true;
                    play(); 
                } else {
                    console.warn("[RSVP] Audio fetch failed. Disabling audio.");
                    useStore.getState().toggleAudio();
                }
            });
        } 
        // B. Resume existing audio if paused (and we are in "playing" state)
        else if (audioStartedRef.current && audioElement?.paused && !isLoading && !audioElement.ended) {
            play();
        }
    }
  }, [isDriver, isPlaying, currentIndex, isAudioEnabled, isLoading, content, fetchAudio, play, pause, audioElement]);


  // 4. SYNC LOGIC (AUDIO DRIVER)
  // This replaces the timer when audio is active.
  useEffect(() => {
      if (!isDriver || !isPlaying || !isAudioEnabled) return;

      // If we are loading audio, we basically wait. 
      // The UI should show a spinner based on `isLoading`.
      if (isLoading) return;

      const isAudioActive = audioElement && !audioElement.paused && !audioElement.ended && audioElement.readyState > 2;
      
      if (isAudioActive) {
          let relativeIndex = -1;
          
          // A. Precise Mark Sync
          if (marks.length > 0) {
              // OPTIMIZATION: Binary search or just findLastIndex could be better for huge arrays, 
              // but for 250 items, simple loop is fine.
              // We want the LAST mark that is <= currentTime
              for (let i = 0; i < marks.length; i++) {
                 if (currentTime >= marks[i].start) {
                     relativeIndex = i;
                 } else {
                     break; // Optimization: marks are ordered
                 }
              }
          } 
          // B. Duration Fallback (if marks missing)
          else if (duration > 0) {
              const chunkWordCount = Math.min(CHUNK_SIZE, content.length - audioOffsetRef.current);
              relativeIndex = Math.floor((currentTime / duration) * chunkWordCount);
          }

          if (relativeIndex !== -1) {
              const absoluteIndex = audioOffsetRef.current + relativeIndex;
              const storeIndex = useStore.getState().currentIndex; // Read fresh
              
              // Only update if changed and valid
              if (absoluteIndex !== storeIndex && absoluteIndex < content.length) {
                   setCurrentIndex(absoluteIndex);
              }
          }
      }
  }, [isDriver, isPlaying, isAudioEnabled, currentTime, marks, duration, audioElement, content.length, setCurrentIndex, isLoading]);


  // 5. TIMER LOGIC (SILENT DRIVER)
  useEffect(() => {
    if (!isDriver) return;
    
    // cleanup
    if (timerRef.current) clearTimeout(timerRef.current);

    // If AUDIO is enabled, the timer is DISABLED completely. 
    // Audio events drive progress.
    if (isAudioEnabled) {
        return; 
    }

    if (!isPlaying || currentIndex >= content.length) return;

    // Constant Speed Logic (User Request)
    const delay = 60000 / wpm;

    timerRef.current = setTimeout(() => {
        if (currentIndex + 1 < content.length) {
            setCurrentIndex(currentIndex + 1);
        } else {
            setIsPlaying(false);
        }
    }, delay);

    return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isDriver, isPlaying, currentIndex, isAudioEnabled, wpm, content, setCurrentIndex, setIsPlaying]);

  // 6. AUDIO CHAINING (Chunk bridging)
  useEffect(() => {
      const handleEnded = () => {
          if (!isPlaying || !isAudioEnabled) return;
          
          console.log("[RSVP] Audio chunk ended. Preparing next...");
          
          // Calculate where the next chunk SHOULD start
          const nextChunkStart = audioOffsetRef.current + CHUNK_SIZE; // e.g. 0 + 250 = 250
          
          if (nextChunkStart < content.length) {
              // Move index to start of next chunk (ensure we don't drift)
              setCurrentIndex(nextChunkStart);
              
              // Reset trigger for the main fetch effect
              audioStartedRef.current = false; 
              // Note: changing currentIndex and audioStartedRef.current=false will trigger dependency in effect #3
          } else {
              // End of Content
              console.log("[RSVP] End of content reached.");
              setIsPlaying(false);
              stop();
              setCurrentIndex(0); // Optional: reset to start? Or stay at end? User preference usually stay or reset.
          }
      };

      if (audioElement) {
          audioElement.addEventListener('ended', handleEnded);
      }
      return () => {
          audioElement?.removeEventListener('ended', handleEnded);
      };
  }, [audioElement, isPlaying, isAudioEnabled, content.length, setCurrentIndex, setIsPlaying, stop]);

  return {
    progress: content.length > 0 ? (currentIndex / content.length) * 100 : 0,
    isBlocked,
    playAudio: play,
    isLoading // Export loading state for UI
  };
};
