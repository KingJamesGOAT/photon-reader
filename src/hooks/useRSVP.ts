import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { useEdgeTTS } from './useEdgeTTS';

const CHUNK_SIZE = 50;

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
  const { fetchAudio, play, pause, stop, currentTime, duration, isLoading, audioUrl, audioElement, isBlocked } = useEdgeTTS();
  const audioStartedRef = useRef(false);
  const audioOffsetRef = useRef(0);

// ... (omitted lines)



  const getDelayForWord = (word: string, baseInterval: number) => {
    let multiplier = 1.0;
    if (/[.?!:]/.test(word)) multiplier = 1.5;
    else if (/[,;—\-]/.test(word)) multiplier = 1.2;
    if (word.length > 10) multiplier *= 1.1;
    return baseInterval * multiplier;
  };

  // Sync Visuals to Audio Time (The Karaoke Pattern)
  useEffect(() => {
    if (isAudioEnabled && isPlaying && audioUrl && !isLoading) {
        // ... (sync logic)
        if (duration > 0 && audioElement && !audioElement.paused) {
             // Calculate visual index based on CHUNK PROGRESS
             // The chunk text is content.slice(audioOffsetRef.current, audioOffsetRef.current + CHUNK_SIZE)
             const remainingText = content.slice(audioOffsetRef.current, audioOffsetRef.current + CHUNK_SIZE);
             const wordCount = remainingText.length;
             const wordsPerSecond = wordCount / duration;
             
             // currentTime is time within the CHUNK
             const relativeIndex = Math.floor(currentTime * wordsPerSecond);
             const nextIndex = audioOffsetRef.current + relativeIndex;
             
             // Ensure we don't go past the chunk boundary visually just in case
             if (nextIndex !== currentIndex && nextIndex < content.length && relativeIndex < wordCount) {
                 setCurrentIndex(nextIndex);
             }
        }
    }
  }, [currentTime, duration, isAudioEnabled, isPlaying, audioUrl, content, audioOffsetRef, currentIndex, setCurrentIndex, audioElement, isLoading]);


  // Main Control Loop
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
        
        // If we have audio and are just paused, resume
        if (audioUrl && !audioStartedRef.current) {
             play();
             audioStartedRef.current = true;
             return;
        }

        // If we need new audio (seeked or fresh start or next chunk)
        if (!audioStartedRef.current && !isLoading) {
            audioOffsetRef.current = currentIndex;
            
            // Chunking: Only fetch CHUNK_SIZE words
            const text = content.slice(currentIndex, currentIndex + CHUNK_SIZE).join(" ");
            
            // Edge TTS: 0% = default. +100% = 2x.
            // Default is usually ~150 WPM.
            const ratePercent = ((wpm / 150) - 1) * 100;
            
            fetchAudio(text, ratePercent).then((success) => {
                if (success) {
                    audioStartedRef.current = true;
                    play();
                } else {
                    console.error("RSVP: Audio fetch failed");
                    // Potentially pause or show error?
                }
            });
        }
        else if (audioStartedRef.current && audioElement?.paused && !isLoading) {
             play();
        }

    } 
    // TIMER MODE
    else {
        if (audioUrl) pause(); // Ensure audio stops if we switch mode

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
  }, [isPlaying, wpm, content, currentIndex, isAudioEnabled, audioUrl, isLoading, fetchAudio, play, pause, audioElement, setCurrentIndex]);

  // Handle Seek Reset
  // If currentIndex changes significantly without audio driving it, we must reset audio?
  // This is tricky. Let's rely on the store action 'seekByTime' or 'update' to reset 'audioUrl' maybe?
  // Or: compare currentIndex with expected range.
  // For now, let's just make sure unmount stops it.

  // Handle end
  // Handle Audio End (Next Chunk)
  useEffect(() => {
      const handleEnded = () => {
          if (!isPlaying) return;
          
          const nextChunkStart = audioOffsetRef.current + CHUNK_SIZE;
          if (nextChunkStart < content.length) {
              console.log("RSVP: Chunk ended, advancing to", nextChunkStart);
              setCurrentIndex(nextChunkStart);
              audioStartedRef.current = false; // Trigger new fetch
              // Note: We don't call stop() here because we want to seamlessly transition if possible
              // but we need to reset audioUrl to null so effect runs? 
              // Actually, fetchAudio will set new URL.
          } else {
              console.log("RSVP: Finished all content");
              setIsPlaying(false);
              audioStartedRef.current = false;
              stop();
              setCurrentIndex(0);
          }
      };

      if (audioElement) {
          audioElement.addEventListener('ended', handleEnded);
      }
      return () => {
          if (audioElement) {
              audioElement.removeEventListener('ended', handleEnded);
          }
      };
  }, [audioElement, content.length, isPlaying, setIsPlaying, setCurrentIndex, stop]);

  // Handle Seek (Invalidate current chunk)
  // If currentIndex moves OUTSIDE the current audio chunk window by user action
  // (We check audioStartedRef to avoid invalidating during auto-advance or playback)
  useEffect(() => {
      if (audioStartedRef.current && isPlaying) {
          const chunkEnd = audioOffsetRef.current + CHUNK_SIZE;
          if (currentIndex < audioOffsetRef.current || currentIndex >= chunkEnd) {
             console.log("RSVP: Seek detected outside chunk, resetting audio");
             audioStartedRef.current = false;
             stop();
             // The main effect will see !audioStartedRef and fetch new chunk
          }
      }
  }, [currentIndex, isPlaying, stop]);

  // Cleanup
  useEffect(() => {
      return () => {
          if (timerRef.current) clearTimeout(timerRef.current);
          stop();
      };
  }, [stop]);

  return {
    progress: content.length > 0 ? (currentIndex / content.length) * 100 : 0,
    isBlocked,
    playAudio: play
  };
};


