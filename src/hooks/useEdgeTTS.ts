import { useState, useRef, useEffect, useCallback } from 'react';

export interface EdgeTTSState {
    audioUrl: string | null;
    isLoading: boolean;
    error: string | null;
    play: () => void;
    pause: () => void;
    stop: () => void;
    seek: (time: number) => void;
    fetchAudio: (text: string, rate?: number) => Promise<void>;
    audioElement: HTMLAudioElement | null;
    currentTime: number;
    duration: number;
}

export const useEdgeTTS = (): EdgeTTSState => {
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize audio object once
    useEffect(() => {
        if (typeof window !== 'undefined') {
            audioRef.current = new Audio();
            audioRef.current.ontimeupdate = () => {
                setCurrentTime(audioRef.current?.currentTime || 0);
            };
            audioRef.current.onloadedmetadata = () => {
                setDuration(audioRef.current?.duration || 0);
            };
            audioRef.current.onended = () => {
                // handle end
            };
        }
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
            }
        };
    }, []);

    const fetchAudio = useCallback(async (text: string, rate: number = 0) => {
        if (!text.trim()) return;

        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    text, 
                    rate: Math.max(Math.min(rate, 100), -50) // Clamp rate roughly
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            if (data.audio) {
                const url = `data:audio/mp3;base64,${data.audio}`;
                setAudioUrl(url);
                if (audioRef.current) {
                    audioRef.current.src = url;
                    audioRef.current.load();
                }
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
            setError(errorMessage);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const play = useCallback(() => audioRef.current?.play(), []);
    const pause = useCallback(() => audioRef.current?.pause(), []);
    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    }, []);
    
    // Seek
    const seek = useCallback((time: number) => {
        if (audioRef.current) audioRef.current.currentTime = time;
    }, []);

    return {
        fetchAudio,
        play,
        pause,
        stop,
        seek,
        audioElement: audioRef.current,
        isLoading,
        error,
        audioUrl,
        currentTime,
        duration
    };
};
