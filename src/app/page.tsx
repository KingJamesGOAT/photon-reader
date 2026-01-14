"use client";

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Redicle } from '@/components/Redicle';
import { ControlBar } from '@/components/ControlBar';
import { Dropzone } from '@/components/Dropzone';
import { Sidebar } from '@/components/Sidebar';
import { Moon, Sun, Menu, Zap } from 'lucide-react';
import { clsx } from 'clsx';

export default function Home() {
  const { theme, toggleTheme } = useStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Apply theme to body
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <main className={clsx(
        "flex min-h-screen flex-col items-center justify-center relative overflow-x-hidden transition-colors duration-500",
        theme === 'dark' ? "bg-background text-foreground" : "bg-neutral-50 text-neutral-900"
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

      {/* Floating Header */}
      <nav className="fixed top-0 inset-x-0 z-30 h-16 flex items-center justify-between px-6 md:px-8 bg-transparent">
        <div className="flex items-center gap-4">
            <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -ml-2 rounded-lg hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors"
                aria-label="Open Library"
            >
                <Menu size={24} className="dark:text-white" />
            </button>
            <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
                <span className="font-bold tracking-tight text-lg">PhotonReader</span>
            </div>
        </div>
        <button 
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors"
            aria-label="Toggle Theme"
        >
            {theme === 'dark' ? <Sun size={24} className="text-white" /> : <Moon size={24} />}
        </button>
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
