import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface RecentFile {
  id: string;
  name: string;
  timestamp: number;
  wordCount: number;
  snippet: string; // First 20 words for preview
  fullText?: string;
  progress: number; // Index of the last read word
}

interface AppState {
  content: string[]; // Current active content
  currentFileId: string | null; // ID of the currently open file to track progress
  wpm: number;
  isPlaying: boolean;
  currentIndex: number;
  theme: 'light' | 'dark';
  recentFiles: RecentFile[];
  
  // Actions
  setContent: (text: string, fileName?: string) => void;
  setWpm: (wpm: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentIndex: (index: number) => void;
  toggleTheme: () => void;
  reset: () => void;
  loadRecentFile: (file: RecentFile) => void;
  updateRecentFileProgress: (id: string, index: number) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      content: "Welcome to PhotonReader. This is a live demo of Rapid Serial Visual Presentation. By displaying words one at a time, we eliminate eye movement, allowing you to read at double or triple your normal speed. Upload your own PDF below to get started.".split(" "),
      currentFileId: "demo",
      wpm: 300,
      isPlaying: false,
      currentIndex: 0,
      theme: 'light',
      recentFiles: [],

      setContent: (text, fileName = 'Untitled Document') => {
        const words = text.split(/\s+/).filter(word => word.length > 0);
        const id = Date.now().toString();
        
        // Create recent file entry
        const newFile: RecentFile = {
            id,
            name: fileName,
            timestamp: Date.now(),
            wordCount: words.length,
            snippet: words.slice(0, 20).join(' '),
            fullText: text,
            progress: 0
        };

        set((state) => {
            // Add to start, remove duplicates by name, limit to 5
            const otherFiles = state.recentFiles.filter(f => f.name !== fileName);
            return { 
                content: words, 
                currentFileId: id,
                currentIndex: 0, 
                isPlaying: false,
                recentFiles: [newFile, ...otherFiles].slice(0, 5)
            };
        });
      },

      setWpm: (wpm) => set({ wpm }),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      
      setCurrentIndex: (index) => {
          set({ currentIndex: index });
          // Auto-update progress for the current file if it exists
          const { currentFileId } = get();
          if (currentFileId) {
             get().updateRecentFileProgress(currentFileId, index);
          }
      },

      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      reset: () => set({ currentIndex: 0, isPlaying: false }),
      
      loadRecentFile: (file) => {
          if (file.fullText) {
              const words = file.fullText.split(/\s+/).filter(word => word.length > 0);
              set({ 
                  content: words, 
                  currentFileId: file.id,
                  currentIndex: file.progress || 0, // Restore progress 
                  isPlaying: false 
              });
          }
      },

      updateRecentFileProgress: (id, index) => set((state) => ({
        recentFiles: state.recentFiles.map(f => 
            f.id === id ? { ...f, progress: index, timestamp: Date.now() } : f
        )
      })),
    }),
    {
      name: 'photon-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
          theme: state.theme,
          wpm: state.wpm,
          recentFiles: state.recentFiles 
      }), 
    }
  )
);
