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
        <div 
            className={clsx(
                "fixed right-4 top-24 z-40 transition-all duration-300 ease-in-out",
                isOpen ? "translate-x-0" : "translate-x-[calc(100%+20px)]"
            )}
        >
            <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl w-72 max-h-[calc(100vh-120px)] flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                        <List size={16} className="text-red-500" />
                        Contents ({totalTime})
                    </h3>
                    <div className="text-xs text-neutral-400">
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
                                onClick={() => setCurrentIndex(chapter.startIndex)}
                                className={clsx(
                                    "w-full text-left p-3 rounded-xl transition-all duration-200 group relative",
                                    isActive 
                                        ? "bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100" 
                                        : isPast
                                            ? "text-neutral-400 dark:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                            : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
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
                                
                                {/* Progress Bar for Chapter could go here if needed per chapter */}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "absolute top-6 -left-10 p-2 rounded-l-xl bg-white dark:bg-neutral-900 border-y border-l border-neutral-200 dark:border-neutral-800 shadow-md text-neutral-500 hover:text-red-500 transition-colors",
                    !isOpen && "translate-x-1" // Hint it's there
                )}
            >
                {isOpen ? <ChevronRight size={18} /> : <List size={18} />}
            </button>
        </div>
    );
};
