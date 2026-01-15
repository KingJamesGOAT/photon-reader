import React from 'react';
import { useStore } from '@/store/useStore';
import { useRSVP } from '@/hooks/useRSVP';
import { Redicle } from './Redicle';
import { Play, Pause, RotateCcw, RotateCw, Minimize2 } from 'lucide-react';


export const FullScreenOverlay = () => {
    const { isFullScreen, setIsFullScreen, isPlaying, wpm, currentFileId } = useStore();
    const { progress } = useRSVP();

    if (!isFullScreen) return null;

    const handleSeek = (seconds: number) => {
        const wordsToSeek = Math.ceil((wpm / 60) * Math.abs(seconds));
        const { currentIndex, content, setCurrentIndex, updateRecentFileProgress } = useStore.getState();
        
        const newIndex = seconds < 0 
            ? Math.max(0, currentIndex - wordsToSeek)
            : Math.min(content.length - 1, currentIndex + wordsToSeek);
            
        setCurrentIndex(newIndex);
        if (currentFileId) updateRecentFileProgress(currentFileId, newIndex);
    };

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
            
            {/* Close / Minimize Button */}
            <button 
                onClick={() => setIsFullScreen(false)}
                className="absolute top-4 right-4 md:top-8 md:right-8 p-2 md:p-3 rounded-full hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors z-50"
                aria-label="Exit Full Screen"
            >
                <Minimize2 size={24} className="md:w-8 md:h-8 text-foreground" />
            </button>

            {/* Immense Reader */}
            {/* Reduced max scale on mobile to prevent clipping */}
            <div className="w-full max-w-5xl px-1 md:px-4 transform scale-100 sm:scale-125 md:scale-150 transition-transform">
                <Redicle />
            </div>

            {/* Simplified Controls */}
            <div className="mt-24 flex flex-col items-center gap-8 w-full max-w-xl text-foreground">
                
                {/* Progress Bar */}
                <div className="w-full h-2 bg-neutral-200/50 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-brand-500 rounded-full transition-all ease-linear"
                        style={{
                            width: `${progress}%`,
                            transitionDuration: `${isPlaying ? 60000 / wpm : 300}ms`
                        }}
                    />
                </div>

                <div className="flex items-center gap-12">
                    <button
                        onClick={() => handleSeek(-10)}
                        className="p-6 text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all"
                    >
                        <RotateCcw size={40} />
                    </button>

                    <button
                        onClick={() => useStore.getState().togglePlaySmart()}
                        className="p-8 bg-foreground text-background rounded-full hover:scale-105 active:scale-95 transition-all shadow-2xl"
                    >
                        {isPlaying ? (
                            <Pause size={48} className="fill-current" />
                        ) : (
                            <Play size={48} className="fill-current ml-1" />
                        )}
                    </button>

                    <button
                        onClick={() => handleSeek(10)}
                        className="p-6 text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all"
                    >
                        <RotateCw size={40} />
                    </button>
                </div>

                <div className="font-mono text-xl opacity-50">
                    {wpm} WPM
                </div>
            </div>
        </div>
    );
};
