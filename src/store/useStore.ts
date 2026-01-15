import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const DEFAULT_CONTENT_TEXT = "Welcome to PhotonReader. This is a live demo of Rapid Serial Visual Presentation. By displaying words one at a time, we eliminate eye movement, allowing you to read at double or triple your normal speed. Upload your own PDF below to get started.";
const DEFAULT_CONTENT = DEFAULT_CONTENT_TEXT.split(" ");
const DEFAULT_CHAPTERS = [{ title: 'Start', startIndex: 0, wordCount: DEFAULT_CONTENT.length }];


export interface RecentFile {
  id: string;
  name: string;
  timestamp: number;
  wordCount: number;
  snippet: string; // First 20 words for preview
  fullText?: string;
  progress: number; // Index of the last read word
  folderId?: string; // Optional folder assignment
  chapters?: Chapter[];
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export interface Chapter {
  title: string;
  startIndex: number;
  wordCount: number;
}

interface AppState {
  content: string[]; // Current active content
  currentFileId: string | null; // ID of the currently open file to track progress
  wpm: number;
  isPlaying: boolean;
  currentIndex: number;
  theme: 'light' | 'dark';
  recentFiles: RecentFile[];
  folders: Folder[];
  chapters: Chapter[];
  isFullScreen: boolean;
  
  // Actions
  setIsFullScreen: (isFull: boolean) => void;
  createFolder: (name: string) => void;
  deleteFolder: (id: string) => void;
  deleteFile: (id: string) => void;
  setContent: (text: string | { words: string[], chapters: Chapter[] }, fileName?: string, folderId?: string) => void;
  setWpm: (wpm: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentIndex: (index: number) => void;
  toggleTheme: () => void;
  reset: () => void;
  loadRecentFile: (file: RecentFile) => void;
  updateRecentFileProgress: (id: string, index: number) => void;
  goHome: () => void;
  restoreSession: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      content: "Welcome to PhotonReader. This is a live demo of Rapid Serial Visual Presentation. By displaying words one at a time, we eliminate eye movement, allowing you to read at double or triple your normal speed. Upload your own PDF below to get started.".split(" "),
      currentFileId: "demo",
      wpm: 250,
      isPlaying: false,
      currentIndex: 0,
      theme: 'light',
      recentFiles: [],
      folders: [],
      chapters: [],
      isFullScreen: false,
      
      setIsFullScreen: (isFullScreen) => set({ isFullScreen }),
      createFolder: (name) => set((state) => ({
          folders: [...state.folders, { id: Date.now().toString(), name, createdAt: Date.now() }]
      })),

      deleteFolder: (id) => set((state) => ({
          folders: state.folders.filter(f => f.id !== id),
          // Move files in deleted folder to root (remove folderId)
          recentFiles: state.recentFiles.map(f => f.folderId === id ? { ...f, folderId: undefined } : f)
      })),

      deleteFile: (id) => set((state) => ({
          recentFiles: state.recentFiles.filter(f => f.id !== id),
          // If deleting current file, switch to home
          currentFileId: state.currentFileId === id ? 'demo' : state.currentFileId,
          content: state.currentFileId === id ? DEFAULT_CONTENT : state.content,
          chapters: state.currentFileId === id ? DEFAULT_CHAPTERS : state.chapters
      })),

      setContent: (input, fileName = 'Untitled Document', folderId?: string) => {
        let words: string[] = [];
        let chapters: Chapter[] = [];
        let fullText = '';

        if (typeof input === 'string') {
            words = input.split(/\s+/).filter(word => word.length > 0);
            fullText = input;
            chapters = [{ title: 'Chapter 1', startIndex: 0, wordCount: words.length }];
        } else {
            words = input.words;
            chapters = input.chapters;
            fullText = words.join(' '); // Reconstruct approximation if needed
        }

        const id = Date.now().toString();
        
        // Create recent file entry
        const newFile: RecentFile = {
            id,
            name: fileName,
            timestamp: Date.now(),
            wordCount: words.length,
            snippet: words.slice(0, 20).join(' '),
            fullText,
            progress: 0,
            folderId // Store the folder association
        };

        set((state) => {
            // Add to start, remove duplicates by name, limit to 5
            const otherFiles = state.recentFiles.filter(f => f.name !== fileName);
            return { 
                content: words, 
                chapters,
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
      reset: () => set({ currentIndex: 0, isPlaying: true }),
      
      loadRecentFile: (file) => {
          if (file.fullText) {
              const words = file.fullText.split(/\s+/).filter(word => word.length > 0);
              // Default if no chapters in stored file
              const chapters = file.chapters || [{ title: 'Chapter 1', startIndex: 0, wordCount: words.length }];
              
              set({ 
                  content: words, 
                  chapters,
                  currentFileId: file.id,
                  currentIndex: file.progress || 0, 
                  isPlaying: false 
              });
          }
      },

      updateRecentFileProgress: (id, index) => set((state) => ({
        recentFiles: state.recentFiles.map(f => 
            f.id === id ? { ...f, progress: index, timestamp: Date.now() } : f
        )
      })),

      goHome: () => set({
          content: DEFAULT_CONTENT,
          chapters: DEFAULT_CHAPTERS,
          currentFileId: 'demo',
          currentIndex: 0,
          isPlaying: false
      }),

      restoreSession: () => {
          const { currentFileId, recentFiles } = get();
          if (currentFileId && currentFileId !== 'demo') {
              const file = recentFiles.find(f => f.id === currentFileId);
              if (file && file.fullText) {
                  const words = file.fullText.split(/\s+/).filter(w => w.length > 0);
                  const chapters = file.chapters || [{ title: 'Chapter 1', startIndex: 0, wordCount: words.length }];
                  set({
                      content: words,
                      chapters: chapters,
                      isPlaying: false
                  });
              }
          }
      },
    }),
    {
      name: 'photon-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
          theme: state.theme,
          wpm: state.wpm,
          recentFiles: state.recentFiles,
          folders: state.folders,
          currentFileId: state.currentFileId,
          currentIndex: state.currentIndex
      }), 
    }
  )
);



