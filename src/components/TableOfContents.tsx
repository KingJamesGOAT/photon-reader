import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { ChevronRight, Clock, List } from 'lucide-react';
import { clsx } from 'clsx';

export const TableOfContents = () => {
    const { chapters, currentIndex, setCurrentIndex, wpm, content } = useStore();
    const [isOpen, setIsOpen] = useState(true);

    if (!chapters || chapters.length === 0) return null;

    // Helper to format time
    const formatTime = (words: number) => {
        const minutes = Math.ceil(words / wpm);
        if (minutes < 1) return '< 1 min';
        if (minutes > 60) {
            const hrs = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${hrs}h ${mins}m`;
        }
        return `${minutes} min`;
    };

    const totalWords = chapters.reduce((acc, curr) => acc + curr.wordCount, 0);
    const totalTime = formatTime(totalWords);

    // Find current chapter
    const currentChapterIndex = chapters.findIndex((chapter, i) => {
        const nextChapter = chapters[i + 1];
        const end = nextChapter ? nextChapter.startIndex : content.length;
        return currentIndex >= chapter.startIndex && currentIndex < end;
    });

    return (

        <>
            {/* Drawer Container */}
            <div 
                className={clsx(
                    "fixed transition-all duration-300 ease-in-out z-40",
                    // Mobile: Centered bottom-sheet style or full screen
                    "inset-x-4 bottom-4 md:inset-auto md:right-4 md:top-24",
                    isOpen 
                        ? "translate-y-0 opacity-100" 
                        : "translate-y-full opacity-0 md:translate-y-0 md:translate-x-[calc(100%+20px)] md:opacity-0 pointer-events-none md:pointer-events-auto"
                )}
            >
                <div className={clsx(
                    "bg-white/95 dark:bg-black/90 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all",
                    "w-full md:w-72 max-h-[60vh] md:max-h-[calc(100vh-120px)]"
                )}>
                    
                    {/* Header */}
                    <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                            <List size={16} className="text-red-500" />
                            Contents ({totalTime})
                        </h3>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="md:hidden p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full"
                        >
                            <ChevronRight size={18} className="rotate-90" />
                        </button>
                        <div className="hidden md:block text-xs text-neutral-400">
                            {chapters.length} Section{chapters.length !== 1 ? 's' : ''}
                        </div>
                    </div>

                    {/* List */}
                    <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {chapters.map((chapter, i) => {
                            const isActive = i === currentChapterIndex;
                            const isPast = i < currentChapterIndex;
                            
                            return (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setCurrentIndex(chapter.startIndex);
                                        if (window.innerWidth < 768) setIsOpen(false);
                                    }}
                                    className={clsx(
                                        "w-full text-left p-3 rounded-xl transition-all duration-200 group relative",
                                        isActive 
                                            ? "bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100" 
                                            : isPast
                                                ? "text-neutral-500 dark:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                                : "text-foreground dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                    )}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={clsx(
                                            "text-sm font-medium line-clamp-2",
                                            isActive && "font-bold"
                                        )}>
                                            {chapter.title}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <div className="flex items-center gap-1 text-[10px] opacity-70">
                                            <Clock size={10} />
                                            {formatTime(chapter.wordCount)}
                                        </div>
                                        {isActive && (
                                            <div className="text-[10px] text-red-500 font-medium ml-auto animate-pulse">
                                                Reading...
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Toggle Button - Only Desktop */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={clsx(
                        "hidden md:block absolute top-6 -left-10 p-2 rounded-l-xl bg-white dark:bg-neutral-900 border-y border-l border-neutral-200 dark:border-neutral-800 shadow-md text-neutral-500 hover:text-red-500 transition-colors",
                        !isOpen && "translate-x-1"
                    )}
                >
                    {isOpen ? <ChevronRight size={18} /> : <List size={18} />}
                </button>
            </div>

            {/* Mobile Toggle Trigger (Floating Action Button style for TOC) */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="md:hidden fixed bottom-6 right-6 z-30 p-4 rounded-full bg-red-500 text-white shadow-xl flex items-center justify-center animate-in zoom-in duration-300 active:scale-95 transition-transform"
                    aria-label="Open Contents"
                >
                    <List size={24} />
                </button>
            )}
        </>
    );
};
