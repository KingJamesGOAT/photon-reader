import React, { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { useRSVP } from "@/hooks/useRSVP";
import { Play, Pause, RotateCcw, RotateCw } from "lucide-react";

export const ControlBar = () => {
  const { isPlaying, setIsPlaying, wpm, setWpm, currentFileId, reset } = useStore();
  const { progress } = useRSVP();
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const showControls = currentFileId && currentFileId !== 'demo';

  const handleSeek = (seconds: number) => {
      const wordsToSeek = Math.ceil((wpm / 60) * Math.abs(seconds));
      const { currentIndex, content, setCurrentIndex } = useStore.getState();
      
      if (seconds < 0) {
        setCurrentIndex(Math.max(0, currentIndex - wordsToSeek));
        setFeedback(`-${Math.abs(seconds)}s`);
      } else {
        setCurrentIndex(Math.min(content.length - 1, currentIndex + wordsToSeek));
        setFeedback(`+${Math.abs(seconds)}s`);
      }
  };

  return (
    <div className="w-full max-w-2xl p-6 rounded-2xl shadow-xl transition-all duration-300 backdrop-blur-sm border bg-[var(--glass-bg)] border-[var(--glass-border)] dark:shadow-none relative">
      
      {/* Visual Feedback Overlay */}
      {feedback && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-1 rounded-full text-sm font-medium animate-in fade-in zoom-in duration-200">
              {feedback}
          </div>
      )}

      {/* Progress Bar */}
      <div className="group w-full h-1.5 bg-neutral-200/50 dark:bg-neutral-800 rounded-full overflow-hidden mb-6 cursor-pointer">
        <div
          className="h-full bg-red-500 rounded-full transition-all ease-linear group-hover:h-full"
          style={{
            width: `${progress}%`,
            transitionDuration: `${isPlaying ? 60000 / wpm : 300}ms`
          }}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-4 order-2 sm:order-1">
          
          {showControls && (
            <button
                onClick={() => handleSeek(-10)}
                className="p-2 sm:p-3 text-muted-foreground hover:text-foreground dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all"
                title="Rewind 10s"
            >
                <RotateCcw size={18} /> 
            </button>
          )}

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="group relative flex items-center justify-center p-3 sm:p-4 bg-foreground text-background rounded-full hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {isPlaying ? (
              <Pause size={20} className="fill-current" />
            ) : (
              <Play size={20} className="fill-current ml-0.5" />
            )}
          </button>

          {!showControls && (
             <button
                onClick={reset}
                className="p-2 sm:p-3 text-muted-foreground hover:text-foreground dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all"
                title="Restart"
              >
                <RotateCcw size={18} />
              </button>
          )}

          {showControls && (
            <button
                onClick={() => handleSeek(10)}
                className="p-2 sm:p-3 text-muted-foreground hover:text-foreground dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all"
                title="Forward 10s"
            >
                <RotateCw size={18} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 sm:gap-6 flex-1 justify-center sm:justify-end w-full sm:w-auto order-1 sm:order-2">
          <span className="font-mono text-xs font-medium text-muted-foreground dark:text-white w-14 sm:w-16 text-right tabular-nums tracking-wider uppercase shrink-0">
            {wpm}{" "}
            <span className="inline text-[10px] text-neutral-400 dark:text-neutral-500">
              WPM
            </span>
          </span>
          <div className="relative flex-1 sm:flex-none w-full sm:w-48 flex items-center">
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
