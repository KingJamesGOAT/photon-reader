import React from 'react';
import { useStore } from '@/store/useStore';
import { useRSVP } from '@/hooks/useRSVP';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';

export const ControlBar = () => {
    const { isPlaying, setIsPlaying, wpm, setWpm, reset } = useStore();
    const { progress } = useRSVP();

    return (
        <div className="w-full max-w-2xl p-6 rounded-2xl shadow-xl transition-all duration-300 bg-white/50 backdrop-blur-sm border border-neutral-200/50 dark:!bg-transparent dark:!backdrop-blur-none dark:border-white/20 dark:shadow-none">
            {/* Progress Bar */}
            <div className="group w-full h-1.5 bg-neutral-200/50 dark:bg-white/20 rounded-full overflow-hidden mb-6 cursor-pointer">
                <div 
                    className="h-full bg-red-500 rounded-full transition-all duration-300 ease-out group-hover:h-full"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="group relative flex items-center justify-center p-4 bg-foreground text-background rounded-full hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                        {isPlaying ? 
                            <Pause size={20} className="fill-current" /> : 
                            <Play size={20} className="fill-current ml-0.5" />
                        }
                    </button>
                    <button
                        onClick={reset}
                        className="p-3 text-muted-foreground hover:text-foreground dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all"
                    >
                        <RotateCcw size={18} />
                    </button>
                </div>

                <div className="flex items-center gap-6 flex-1 justify-end">
                    <span className="font-mono text-xs font-medium text-muted-foreground dark:text-white w-16 text-right tabular-nums tracking-wider uppercase">
                        {wpm} <span className="text-[10px] text-neutral-400 dark:text-white">WPM</span>
                    </span>
                    <div className="relative w-48 flex items-center">
                        <input 
                            type="range" 
                            min="100" 
                            max="1000" 
                            step="25"
                            value={wpm}
                            onChange={(e) => setWpm(Number(e.target.value))}
                            className="w-full h-1.5 bg-neutral-200 dark:bg-white/20 rounded-lg appearance-none cursor-pointer accent-red-500 hover:accent-red-400 transition-all"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
