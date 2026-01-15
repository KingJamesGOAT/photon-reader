'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';

export const ThemeProvider = () => {
    const { theme, colorTheme } = useStore();

    useEffect(() => {
        const root = window.document.documentElement;
        
        // Remove both potentials to be clean
        root.classList.remove('light', 'dark');
        // Remove color themes
        root.classList.remove('theme-blue', 'theme-green');

        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.add('light'); // Optional, but helps if using .light selectors
        }

        if (colorTheme === 'blue') {
            root.classList.add('theme-blue');
        } else if (colorTheme === 'green') {
            root.classList.add('theme-green');
        }
        
    }, [theme, colorTheme]);

    return null; // Logic only, no UI
};
