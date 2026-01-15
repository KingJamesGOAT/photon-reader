"use client";

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Redicle } from '@/components/Redicle';
import { ControlBar } from '@/components/ControlBar';
import { Dropzone } from '@/components/Dropzone';
import { Sidebar } from '@/components/Sidebar';
import { TableOfContents } from '@/components/TableOfContents';
import { FullScreenOverlay } from '@/components/FullScreenOverlay';
import { Moon, Sun, Menu, Palette, Check } from 'lucide-react';
import { clsx } from 'clsx';

export default function Home() {
  const { theme, toggleTheme, restoreSession, goHome, colorTheme, setColorTheme } = useStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <main className={clsx(
        "flex min-h-screen flex-col items-center justify-center relative overflow-x-hidden transition-colors duration-500",
        "bg-background text-foreground"
    )}>
      
      {/* Background Gradients */}
      {/* Background Gradients Removed for clean look */}

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <TableOfContents />
      <FullScreenOverlay />

      {/* Floating Header */}
      <nav className="fixed top-0 inset-x-0 z-30 h-16 md:h-20 flex items-center justify-between px-6 md:px-8 bg-transparent">
        <div className="flex items-center gap-4">
            <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -ml-2 rounded-lg hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors"
                aria-label="Open Library"
            >
                <Menu size={24} className="text-foreground" />
            </button>

            <button onClick={goHome} className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
                <span className="font-bold tracking-tight text-xl">PhotonReader</span>
            </button>
        </div>
        <div className="flex items-center gap-2">
            {/* Color Picker */}
            <div className="relative">
                <button 
                    onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                    className="p-2 rounded-full hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                    <Palette size={20} className="text-foreground opacity-80" />
                </button>

                {isColorPickerOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsColorPickerOpen(false)} />
                        <div className="absolute top-full right-0 mt-4 p-2 bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl flex flex-col gap-1 min-w-[160px] z-50 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200">
                            {[
                                { id: 'red', label: 'Classic Red', color: 'bg-red-500' },
                                { id: 'blue', label: 'Focus Blue', color: 'bg-blue-500' },
                                { id: 'green', label: 'Calm Green', color: 'bg-emerald-500' }
                            ].map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => {
                                        setColorTheme(option.id as 'red' | 'blue' | 'green');
                                        setIsColorPickerOpen(false);
                                    }}
                                    className={clsx(
                                        "flex items-center gap-3 p-2 rounded-xl transition-all text-sm font-medium",
                                        colorTheme === option.id 
                                            ? "bg-neutral-100 dark:bg-neutral-800 text-foreground" 
                                            : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-foreground"
                                    )}
                                >
                                    <div className={clsx("w-3 h-3 rounded-full shadow-sm", option.color)} />
                                    {option.label}
                                    {colorTheme === option.id && <Check size={14} className="ml-auto opacity-50" />}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <button 
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors"
                aria-label="Toggle Theme"
            >
                {theme === 'dark' ? <Sun size={20} className="text-white" /> : <Moon size={20} />}
            </button>
        </div>
      </nav>

      {/* Main Content: Centered Reader + Dropzone */}
      <div className="w-full max-w-5xl flex flex-col items-center gap-12 px-6 fade-in mt-12">
        
        {/* Active Reader */}
        <div className="w-full flex flex-col items-center gap-8 transform scale-105 md:scale-110 transition-transform">
            <Redicle />
            <ControlBar />
        </div>

        {/* Minimal Dropzone */}
        <div className="w-full max-w-xl">
             <Dropzone />
        </div>

      </div>
      
    </main>
  );
}
