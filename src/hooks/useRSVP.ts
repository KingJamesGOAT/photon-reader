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
  const { fetchAudio, play, pause, stop, currentTime, isLoading, audioUrl, marks, audioElement, isBlocked } = useEdgeTTS();
  
  const audioStartedRef = useRef(false);
  const audioOffsetRef = useRef(0); // Where the current chunk starts in the full text

  // --------------------------------------------------------
  // SYNC LOGIC: Map Audio Time -> Word Index
  // --------------------------------------------------------
  useEffect(() => {
    if (isAudioEnabled && isPlaying && marks.length > 0) {
        // Find the word that corresponds to the current audio time
        // We look for a mark where: start <= currentTime < end
        // Note: The 'marks' array corresponds to the *chunk* text, not the whole book.
        const activeMarkIndex = marks.findIndex(m => currentTime >= m.start && currentTime < m.end);

        if (activeMarkIndex !== -1) {
            // The absolute index is the chunk start + the index within the chunk
            const absoluteIndex = audioOffsetRef.current + activeMarkIndex;
            
            if (absoluteIndex !== currentIndex && absoluteIndex < content.length) {
                setCurrentIndex(absoluteIndex);
            }
        }
    }
  }, [currentTime, marks, isAudioEnabled, isPlaying, audioOffsetRef, currentIndex, setCurrentIndex]);


  // --------------------------------------------------------
  // MAIN CONTROL LOOP
  // --------------------------------------------------------
  useEffect(() => {
    if (!isPlaying) {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (isAudioEnabled) pause(); 
        return;
    }

    if (content.length === 0 || currentIndex >= content.length) return;

    // AUDIO MODE
    if (isAudioEnabled) {
        if (timerRef.current) clearTimeout(timerRef.current);
        
        // RESUME
        if (audioUrl && !audioStartedRef.current) {
             play();
             audioStartedRef.current = true;
             return;
        }

        // FETCH NEW CHUNK
        if (!audioStartedRef.current && !isLoading) {
            audioOffsetRef.current = currentIndex;
            const text = content.slice(currentIndex, currentIndex + CHUNK_SIZE).join(" ");
            const ratePercent = ((wpm / 150) - 1) * 100; // Calibrate 150 as base WPM
            
            fetchAudio(text, ratePercent).then((success) => {
                if (success) {
                    audioStartedRef.current = true;
                    play();
                }
            });
        }
        else if (audioStartedRef.current && audioElement?.paused && !isLoading) {
             play();
        }

    } 
    // TIMER MODE (Fallback)
    else {
        if (audioUrl) pause();

        const baseInterval = 60000 / wpm;
        const currentWord = content[currentIndex] || '';
        // Simple delay logic for timer mode
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
  }, [isPlaying, wpm, content, currentIndex, isAudioEnabled, audioUrl, isLoading, fetchAudio, play, pause, audioElement, setCurrentIndex]);

  // Handle End of Audio Chunk
  useEffect(() => {
      const handleEnded = () => {
          if (!isPlaying) return;
          const nextChunkStart = audioOffsetRef.current + CHUNK_SIZE;
          if (nextChunkStart < content.length) {
              setCurrentIndex(nextChunkStart);
              audioStartedRef.current = false; // Triggers new fetch
          } else {
              setIsPlaying(false);
              stop();
              setCurrentIndex(0);
          }
      };

      if (audioElement) audioElement.addEventListener('ended', handleEnded);
      return () => audioElement?.removeEventListener('ended', handleEnded);
  }, [audioElement, content.length, isPlaying, setIsPlaying, setCurrentIndex, stop]);

  return {
    progress: content.length > 0 ? (currentIndex / content.length) * 100 : 0,
    isBlocked,
    playAudio: play
  };
};
