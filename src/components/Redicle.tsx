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
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-[20px] bg-foreground transition-colors duration-300" />
            
            {/* Bottom Vertical Marker */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[2px] h-[20px] bg-foreground transition-colors duration-300" />

            {/* Word Display */}
            {/* Uses text-foreground for automatic Black/White switching */}
            <div className="flex items-baseline text-5xl sm:text-7xl md:text-8xl font-sans tracking-tight relative z-20 select-none max-w-full px-4 leading-none">
                <span className="text-foreground text-right w-[6ch] sm:w-[10ch] overflow-visible whitespace-nowrap">
                    {leftPart}
                </span>
                <span className="text-primary-600 font-bold mx-[0.5px] inline-block">
                    {pivotChar}
                </span>
                <span className="text-foreground text-left w-[6ch] sm:w-[10ch] overflow-visible whitespace-nowrap">
                    {rightPart}
                </span>
            </div>

            {/* WPM Indicator */}
            <div className="absolute bottom-2 right-4 text-xs font-mono text-muted-foreground opacity-50">
               {useRSVP().wpm} wpm
            </div>
        </div>
    </div>
  );
};
