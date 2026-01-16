import React, { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { clsx } from 'clsx';

export const HybridView = () => {
    const { content, currentIndex, setCurrentIndex, isFullScreen } = useStore();
    const containerRef = useRef<HTMLDivElement>(null);

    // Static Paging Logic
    const [wordsPerPage, setWordsPerPage] = React.useState(50);

    React.useEffect(() => {
        const handleResize = () => {
             // Mobile: 25 words to prevent scrolling and overflow
             // Desktop: 50 words
             setWordsPerPage(window.innerWidth < 768 ? 25 : 50);
        };
        
        handleResize(); // Init
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const pageIndex = Math.floor(currentIndex / wordsPerPage);
    const start = pageIndex * wordsPerPage;
    const end = Math.min(content.length, start + wordsPerPage);
    const visibleWords = content.slice(start, end);

    // Auto-scroll to top when page changes
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
    }, [pageIndex]);

    if (isFullScreen) return null;

    return (
        <div 
            className={clsx(
                "w-full max-w-2xl mt-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-black/20 backdrop-blur-sm overflow-hidden transition-all duration-500",
                "h-auto md:max-h-60" 
            )}
        >
            <div 
                ref={containerRef}
                className="h-full overflow-hidden p-4 md:p-6 text-center space-x-1.5 md:space-x-2 leading-relaxed touch-pan-x select-none"
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
