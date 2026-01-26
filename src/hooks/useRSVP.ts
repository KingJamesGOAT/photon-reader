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
        // Only run sync if we have a valid duration > 0
        if (duration > 0 && audioElement && !audioElement.paused) {
             const remainingText = content.slice(audioOffsetRef.current, audioOffsetRef.current + CHUNK_SIZE);
             const wordCount = remainingText.length;
             const wordsPerSecond = wordCount / duration;
             
             // currentTime is time within the CHUNK
             const relativeIndex = Math.floor(currentTime * wordsPerSecond);
             const nextIndex = audioOffsetRef.current + relativeIndex;
             
             // Ensure valid numbers before updating state
             if (!isNaN(nextIndex) && nextIndex !== currentIndex && nextIndex < content.length && relativeIndex < wordCount) {
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
            
            const text = content.slice(currentIndex, currentIndex + CHUNK_SIZE).join(" ");
            
            // Edge TTS: 0% = default. +100% = 2x.
            // Default is usually ~150 WPM.
            const ratePercent = ((wpm / 150) - 1) * 100;
            
            fetchAudio(text, ratePercent).then((success) => {
                if (success) {
                    audioStartedRef.current = true;
                    // Try to play; if blocked, the logs in useEdgeTTS will show it.
                    play(); 
                } else {
                    console.error("RSVP: Audio fetch failed");
                }
            });
        }
        else if (audioStartedRef.current && audioElement?.paused && !isLoading) {
             play();
        }

    } 
    // TIMER MODE
    else {
        if (audioUrl) pause(); 

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

  // Handle Audio End (Next Chunk)
  useEffect(() => {
      const handleEnded = () => {
          if (!isPlaying) return;
          
          const nextChunkStart = audioOffsetRef.current + CHUNK_SIZE;
          if (nextChunkStart < content.length) {
              console.log("RSVP: Chunk ended, advancing to", nextChunkStart);
              setCurrentIndex(nextChunkStart);
              audioStartedRef.current = false; // Trigger new fetch
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
  useEffect(() => {
      if (audioStartedRef.current && isPlaying) {
          const chunkEnd = audioOffsetRef.current + CHUNK_SIZE;
          if (currentIndex < audioOffsetRef.current || currentIndex >= chunkEnd) {
             console.log("RSVP: Seek detected outside chunk, resetting audio");
             audioStartedRef.current = false;
             stop();
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
