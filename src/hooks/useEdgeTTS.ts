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
                const dur = audioRef.current?.duration || 0;
                console.log("EdgeTTS: Metadata loaded. Duration:", dur);
                // Avoid Infinity if metadata is weird
                setDuration(Number.isFinite(dur) ? dur : 0);
            };

            audioRef.current.onerror = (e) => {
                console.error("EdgeTTS: Audio Element Error", e, audioRef.current?.error);
                setError("Audio playback failed to load.");
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
                    rate: Math.max(Math.min(rate, 100), -50)
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            if (data.audio) {
                const binaryString = window.atob(data.audio);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                
                // FIX: Use correct MIME type for MP3
                const blob = new Blob([bytes], { type: 'audio/mpeg' });
                const url = URL.createObjectURL(blob);

                console.log("EdgeTTS: Audio URL created", url);
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
        if (audioRef.current) {
             const promise = audioRef.current.play();
             if (promise !== undefined) {
                 promise.catch(error => {
                     console.error("EdgeTTS: Play blocked or failed", error);
                     if (error.name === 'NotAllowedError') {
                         setIsBlocked(true);
                     }
                 });
                 promise.then(() => {
                     setIsBlocked(false);
                 });
             }
        }
    }, []);

    const pause = useCallback(() => {
        audioRef.current?.pause();
    }, []);

    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    }, []);
    
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
