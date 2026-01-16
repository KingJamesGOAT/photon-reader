import { useState, useRef, useEffect, useCallback } from 'react';

export interface EdgeTTSState {
    audioUrl: string | null;
    isLoading: boolean;
    error: string | null;
    play: () => void;
    pause: () => void;
    stop: () => void;
    seek: (time: number) => void;
    fetchAudio: (text: string, rate?: number) => Promise<boolean>;
    audioElement: HTMLAudioElement | null;
    currentTime: number;
    duration: number;
    isBlocked: boolean;
}

export const useEdgeTTS = (): EdgeTTSState => {
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isBlocked, setIsBlocked] = useState(false);
    
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
        if (!text.trim()) return false;

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
                // Convert Base64 to Blob
                const binaryString = window.atob(data.audio);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: 'audio/mp3' });
                const url = URL.createObjectURL(blob);

                setAudioUrl(url);
                if (audioRef.current) {
                    audioRef.current.src = url;
                    audioRef.current.load();
                }
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
            setError(errorMessage);
            console.error("EdgeTTS Error:", errorMessage);
            return false;
        } finally {
            setIsLoading(false);
        }
        return true;
    }, []);

    const play = useCallback(() => {
        console.log("EdgeTTS: play called", audioRef.current);
        if (audioRef.current) {
             const promise = audioRef.current.play();
             if (promise !== undefined) {
                 promise.catch(error => {
                     console.error("EdgeTTS: play error", error);
                     if (error.name === 'NotAllowedError') {
                         setIsBlocked(true);
                     }
                 });
                 // If promise doesn't reject immediately, we might be good.
                 // But we can reset blocked state if it resolves?
                 promise.then(() => {
                     setIsBlocked(false);
                 });
             }
        }
    }, []);

    const pause = useCallback(() => {
        console.log("EdgeTTS: pause called");
        audioRef.current?.pause();
    }, []);

    const stop = useCallback(() => {
        console.log("EdgeTTS: stop called");
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
        duration,
        isBlocked
    };
};
