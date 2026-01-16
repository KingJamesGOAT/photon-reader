import React from 'react';
import { useRSVP } from '@/hooks/useRSVP';
import { clsx } from 'clsx';
import { useStore } from '@/store/useStore';

export const Redicle = () => {
  const { isBlocked, playAudio } = useRSVP();
  const { content, currentIndex, wpm } = useStore();

  const currentWord = content[currentIndex] || '';

  // Optimal Recognition Point (ORP)
  const orpIndex = Math.floor((currentWord.length - 1) / 2);

  const leftPart = currentWord.slice(0, orpIndex);
  const pivotChar = currentWord[orpIndex];
  const rightPart = currentWord.slice(orpIndex + 1);

  // Sentence Progress Logic
  const getSentenceProgress = () => {
    if (!content.length) return 0;
    
    // Find start (look back for punctuation)
    let start = currentIndex;
    while (start > 0 && !/[.?!]/.test(content[start - 1])) {
        start--;
    }

    // Find end (look forward for punctuation)
    let end = currentIndex;
    while (end < content.length - 1 && !/[.?!]/.test(content[end])) {
        end++;
    }

    const total = end - start + 1;
    const current = currentIndex - start + 1;
    
    return Math.min(100, Math.max(0, (current / total) * 100));
  };

  const sentenceProgress = getSentenceProgress();

  return (
    <div className="relative flex flex-col items-center justify-center h-64 w-full max-w-3xl mx-auto mb-8">
        
        {/* Playback Blocked Overlay */}
        {isBlocked && (
            <div 
                className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm cursor-pointer"
                onClick={() => playAudio()}
            >
                <div className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold shadow-lg animate-pulse">
                    Tap to Enable Audio
                </div>
            </div>
        )}

        {/* Spritz-style Guide Container */}
        {/* Uses border-foreground to automatically switch Black/White based on theme */}
        <div className={clsx(
            "relative w-full h-[220px] flex items-center justify-center py-8",
            "border-y-2 border-foreground transition-colors duration-300"
        )}>
            
            {/* Top Vertical Marker */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-[40px] md:h-[20px] bg-foreground transition-colors duration-300" />
            
            {/* Bottom Vertical Marker */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[2px] h-[40px] md:h-[20px] bg-foreground transition-colors duration-300" />

            {/* Word Display */}
            <div className="flex text-5xl sm:text-7xl md:text-8xl font-sans tracking-normal relative z-20 select-none w-full px-4 leading-none">
                {/* Left side: forced to 50% width to push pivot to center */}
                <div className="flex-1 flex justify-end overflow-visible whitespace-nowrap">
                    <span className="text-foreground transition-colors duration-300">
                        {leftPart}
                    </span>
                </div>
                
                {/* Pivot character: exactly in the middle */}
                <div className="flex-none flex justify-center min-w-[0.7ch] sm:min-w-[0.9ch]">
                    <span className="text-brand-600 font-bold transition-colors duration-300">
                        {pivotChar}
                    </span>
                </div>
                
                {/* Right side: flex-1 to balance the left side */}
                <div className="flex-1 flex justify-start overflow-visible whitespace-nowrap">
                    <span className="text-foreground transition-colors duration-300">
                        {rightPart}
                    </span>
                </div>
            </div>

            {/* Sentence Progress Bar (Responsive Sizing) */}
            <div className="absolute top-2/3 left-1/2 -translate-x-1/2 rounded-full overflow-hidden mt-8 md:mt-12 w-24 md:w-64 h-1 md:h-1.5 bg-neutral-200 dark:bg-neutral-800 opacity-80">
                <div 
                    className="h-full bg-brand-500 transition-all duration-300 ease-out"
                    style={{ width: `${sentenceProgress}%` }}
                />
            </div>

            {/* WPM Indicator */}
            <div className="absolute -bottom-6 right-0 text-xs font-mono text-muted-foreground opacity-60">
               {wpm} wpm
            </div>
        </div>
    </div>
  );
};
