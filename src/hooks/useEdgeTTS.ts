import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '@/store/useStore';

// ... (imports)

export interface WordMark {
    word: string;
    start: number;
    end: number;
}

export interface EdgeTTSState {
    audioUrl: string | null;
    marks: WordMark[];
    isLoading: boolean;
    error: string | null;
    play: () => void;
    pause: () => void;
    stop: () => void;
    seek: (time: number) => void;
    fetchAudio: (text: string) => Promise<boolean>;
    reset: () => void;
    setRate: (rate: number) => void;
    audioElement: HTMLAudioElement | null;
    currentTime: number;
    duration: number;
    isBlocked: boolean;
}

export const useEdgeTTS = (): EdgeTTSState => {
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [marks, setMarks] = useState<WordMark[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isBlocked, setIsBlocked] = useState(false);
    
    // Use Singleton Audio from Store
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Get Singleton
            const el = useStore.getState().getAudioElement();
            if (el) {
                audioRef.current = el;
                
                // Add Listeners
                const updateTime = () => setCurrentTime(el.currentTime || 0);
                const updateDuration = () => setDuration(el.duration || 0);

                el.addEventListener('timeupdate', updateTime);
                el.addEventListener('loadedmetadata', updateDuration);

                // Cleanup listeners only (DO NOT PAUSE/DESTROY GLOBAL AUDIO)
                return () => {
                    el.removeEventListener('timeupdate', updateTime);
                    el.removeEventListener('loadedmetadata', updateDuration);
                }
            }
        }
    }, []);

    // New: Explicit Reset to clear stale audio
    const reset = useCallback(() => {
        setAudioUrl(null);
        setMarks([]);
        setError(null);
        setIsLoading(false);
        if (audioRef.current) {
             audioRef.current.pause();
             audioRef.current.removeAttribute('src'); // Helper
             audioRef.current.src = "";
             audioRef.current.load();
        }
    }, []);

    // Modified: No 'rate' param needed for fetch
    const fetchAudio = useCallback(async (text: string) => {
        if (!text.trim()) return false;

        // Reset before fetching new
        reset(); 

        setIsLoading(true);
        setError(null);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout (Vercel Cold Starts)

        try {
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }), // No rate
                signal: controller.signal
            });

            if (!response.ok) {
                 const errorText = await response.text();
                 throw new Error(`Server returned ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            if (data.audio) {
                // Decode Audio
                const binaryString = window.atob(data.audio);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                
                const blob = new Blob([bytes], { type: 'audio/mpeg' }); // Correct MIME
                const url = URL.createObjectURL(blob);

                setAudioUrl(url);
                if (data.marks) {
                    setMarks(data.marks);
                } else {
                    console.warn("TTS: Audio received but no marks found.");
                    setMarks([]); // Ensure it's empty, not undefined
                }

                if (audioRef.current) {
                    audioRef.current.src = url;
                    audioRef.current.load();
                }
            }
        } catch (err: unknown) {
            let errorMessage = 'An unexpected error occurred';
            if (err instanceof Error) {
                if (err.name === 'AbortError') {
                    errorMessage = 'TTS Timeout';
                } else {
                    errorMessage = err.message;
                }
            } else if (typeof err === 'string') {
                errorMessage = err;
            }
            
            setError(errorMessage);
            console.error("TTS Critical Failure:", errorMessage);
            // console.warn("Disabling audio due to error."); // Removed this line as per instruction
            return false;
        } finally {
            clearTimeout(timeoutId);
            setIsLoading(false);
        }
        return true;
    }, [reset]);

    const play = useCallback(() => {
        if (audioRef.current) {
             audioRef.current.play().catch(e => {
                 if (e.name === 'NotAllowedError') setIsBlocked(true);
             }).then(() => setIsBlocked(false));
        }
    }, []);

    const pause = useCallback(() => audioRef.current?.pause(), []);
    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    }, []);
    const seek = useCallback((time: number) => {
        if (audioRef.current) audioRef.current.currentTime = time;
    }, []);
    
    // New: Control Playback Rate (Speed)
    const setRate = useCallback((rate: number) => {
        if (audioRef.current) {
            // Clamp between 0.5 and 2.0 (browsers vary, but safe range)
            audioRef.current.playbackRate = Math.max(0.5, Math.min(rate, 2.5));
        }
    }, []);

    return {
        fetchAudio, play, pause, stop, seek, reset, setRate,
        audioElement: audioRef.current,
        isLoading, error, audioUrl, marks,
        currentTime, duration, isBlocked
    };
};
