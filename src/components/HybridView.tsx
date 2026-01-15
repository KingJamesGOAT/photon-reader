import React, { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { clsx } from 'clsx';

export const HybridView = () => {
    const { content, currentIndex, setCurrentIndex, isFullScreen } = useStore();
    const containerRef = useRef<HTMLDivElement>(null);

    // Context Window: Show ~25 words before and after
    const start = Math.max(0, currentIndex - 25);
    const end = Math.min(content.length, currentIndex + 35);
    const visibleWords = content.slice(start, end);

    // Auto-scroll to keep current word in view
    useEffect(() => {
        if (containerRef.current) {
            const activeElement = containerRef.current.querySelector('[data-active="true"]');
            if (activeElement) {
                activeElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }
        }
    }, [currentIndex]);

    if (isFullScreen) return null;

    return (
        <div 
            className={clsx(
                "w-full max-w-2xl mt-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-black/20 backdrop-blur-sm overflow-hidden transition-all duration-500",
                "h-32 md:h-auto md:max-h-60" // Mobile: Fixed small height. Desktop: Taller max height.
            )}
        >
            <div 
                ref={containerRef}
                className="h-full overflow-y-auto p-4 md:p-6 text-center space-x-1.5 md:space-x-2 leading-relaxed touch-pan-y"
            >
                {visibleWords.map((word, i) => {
                    const globalIndex = start + i;
                    const isActive = globalIndex === currentIndex;
                    const isPast = globalIndex < currentIndex;

                    return (
                        <span
                            key={`${globalIndex}-${word}`}
                            data-active={isActive}
                            onClick={() => setCurrentIndex(globalIndex)}
                            className={clsx(
                                "inline-block cursor-pointer transition-colors duration-200 text-sm md:text-lg rounded px-0.5",
                                isActive 
                                    ? "bg-brand-500 text-white font-medium scale-110 shadow-sm" 
                                    : isPast 
                                        ? "text-neutral-400 dark:text-neutral-500" 
                                        : "text-neutral-700 dark:text-neutral-300 hover:text-brand-500"
                            )}
                        >
                            {word}
                        </span>
                    );
                })}
            </div>
            
            {/* Fade Gradients for visual polish */}
            <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-white/80 dark:from-black/80 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-white/80 dark:from-black/80 to-transparent pointer-events-none" />
        </div>
    );
};
