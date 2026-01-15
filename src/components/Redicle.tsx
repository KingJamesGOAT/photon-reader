import React from 'react';
import { useRSVP } from '@/hooks/useRSVP';
import { clsx } from 'clsx';

export const Redicle = () => {
  const { currentWord } = useRSVP();

  // Optimal Recognition Point (ORP)
  const orpIndex = Math.floor((currentWord.length - 1) / 2);

  const leftPart = currentWord.slice(0, orpIndex);
  const pivotChar = currentWord[orpIndex];
  const rightPart = currentWord.slice(orpIndex + 1);

  return (
    <div className="relative flex flex-col items-center justify-center h-64 w-full max-w-3xl mx-auto mb-8">
        
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
            <div className="flex text-5xl sm:text-7xl md:text-8xl font-sans tracking-tight relative z-20 select-none w-full px-4 leading-none">
                {/* Left side: forced to 50% width to push pivot to center */}
                <div className="flex-1 flex justify-end overflow-visible whitespace-nowrap">
                    <span className="text-foreground transition-colors duration-300">
                        {leftPart}
                    </span>
                </div>
                
                {/* Pivot character: exactly in the middle */}
                <div className="flex-none flex justify-center w-[0.6ch] sm:w-[0.8ch]">
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

            {/* WPM Indicator */}
            <div className="absolute bottom-2 right-4 text-xs font-mono text-muted-foreground opacity-50">
               {useRSVP().wpm} wpm
            </div>
        </div>
    </div>
  );
};
