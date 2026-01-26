import { useState, useRef, useEffect, useCallback } from 'react';

export interface WordMark {
    word: string;
    start: number;
    end: number;
}

export interface EdgeTTSState {
    audioUrl: string | null;
    marks: WordMark[]; // New state for timestamps
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
    const [marks, setMarks] = useState<WordMark[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isBlocked, setIsBlocked] = useState(false);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            audioRef.current = new Audio();
            audioRef.current.ontimeupdate = () => setCurrentTime(audioRef.current?.currentTime || 0);
            audioRef.current.onloadedmetadata = () => setDuration(audioRef.current?.duration || 0);
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
                // Decode Audio
                const binaryString = window.atob(data.audio);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                
                const blob = new Blob([bytes], { type: 'audio/mpeg' }); // Correct MIME
                const url = URL.createObjectURL(blob);

                setAudioUrl(url);
                if (data.marks) setMarks(data.marks); // Store the timestamps

                if (audioRef.current) {
                    audioRef.current.src = url;
                    audioRef.current.load();
                }
            }
        } catch (err: any) {
            setError(err.message);
            console.error("TTS Error:", err.message);
            return false;
        } finally {
            setIsLoading(false);
        }
        return true;
    }, []);

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

    return {
        fetchAudio, play, pause, stop, seek,
        audioElement: audioRef.current,
        isLoading, error, audioUrl, marks,
        currentTime, duration, isBlocked
    };
};
