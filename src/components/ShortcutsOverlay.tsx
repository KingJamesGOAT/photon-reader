import React, { useState, useEffect } from 'react';
import { HelpCircle, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Monitor, Play } from 'lucide-react';
import { clsx } from 'clsx';

export const ShortcutsOverlay = () => {
    const [isVisible, setIsVisible] = useState(false);

    // Toggle on '?' key press
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '?') {
                setIsVisible(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Don't show in Full Screen (or maybe we should? User said "F: Fullscreen" so maybe yes to help them exit)
    // Actually user request implies it's a helper availability. 
    // Let's keep it visible everywhere but maybe positioned differently if needed. 
    // Bottom right fixed is standard.

    return (
        <div 
            className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none"
        >
            {/* The Card */}
            <div 
                className={clsx(
                    "mb-4 glass-card p-4 rounded-xl shadow-2xl transition-all duration-300 origin-bottom-right pointer-events-auto border border-white/20 dark:border-white/10",
                    (isVisible) 
                        ? "opacity-100 scale-100 translate-y-0" 
                        : "opacity-0 scale-90 translate-y-4 pointer-events-none"
                )}
            >
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                    Keyboard Shortcuts
                </div>
                
                <div className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-3 text-sm">
                    {/* Play / Pause */}
                    <div className="flex items-center gap-2 text-foreground">
                        <span className="w-5 flex justify-center"><Play size={14} className="fill-current" /></span>
                        <span>Play / Pause</span>
                    </div>
                    <div className="flex gap-1">
                        <Kbd>Space</Kbd>
                    </div>

                    {/* Speed Control */}
                    <div className="flex items-center gap-2 text-foreground">
                        <span className="w-5 flex justify-center"><Monitor size={14} /></span>
                        <span>Speed (WPM)</span>
                    </div>
                    <div className="flex gap-1">
                        <Kbd><ArrowUp size={12} /></Kbd>
                        <Kbd><ArrowDown size={12} /></Kbd>
                    </div>

                    {/* Seek */}
                    <div className="flex items-center gap-2 text-foreground">
                        <span className="w-5 flex justify-center text-xs font-mono font-bold">10s</span>
                        <span>Skip 10s</span>
                    </div>
                    <div className="flex gap-1">
                        <Kbd><ArrowLeft size={12} /></Kbd>
                        <Kbd><ArrowRight size={12} /></Kbd>
                    </div>

                    {/* Full Screen */}
                    <div className="flex items-center gap-2 text-foreground">
                        <span className="w-5 flex justify-center"><Monitor size={14} /></span>
                        <span>Full Screen</span>
                    </div>
                    <div className="flex gap-1">
                        <Kbd>F</Kbd>
                    </div>
                </div>
            </div>

            {/* The Trigger Button */}
            <button
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
                onClick={() => setIsVisible(!isVisible)}
                className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors pointer-events-auto hover:scale-110 active:scale-95 shadow-lg"
                aria-label="Keyboard Shortcuts"
            >
                <HelpCircle size={20} />
            </button>
        </div>
    );
};

// Helper for Keycap styling
const Kbd = ({ children }: { children: React.ReactNode }) => (
    <div className="h-6 min-w-[24px] px-1.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center font-mono text-xs font-bold text-neutral-600 dark:text-neutral-300 shadow-sm">
        {children}
    </div>
);
