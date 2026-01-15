'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';

export const ThemeProvider = () => {
    const { theme } = useStore();

    useEffect(() => {
        const root = window.document.documentElement;
        
        // Remove both potentials to be clean
        root.classList.remove('light', 'dark');

        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.add('light'); // Optional, but helps if using .light selectors
        }
        
    }, [theme]);

    return null; // Logic only, no UI
};
