import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { detectChapters } from "@/lib/file-utils";

const DEFAULT_CONTENT_TEXT =
  "Welcome to PhotonReader. This is a live demo of Rapid Serial Visual Presentation. By displaying words one at a time, we eliminate eye movement, allowing you to read at double or triple your normal speed. Upload your own PDF below to get started.";
const DEFAULT_CONTENT = DEFAULT_CONTENT_TEXT.split(" ");
const DEFAULT_CHAPTERS = [
  { title: "Start", startIndex: 0, wordCount: DEFAULT_CONTENT.length },
];

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

export // Define types for content and chapters
// ... (imports)

// Audio Singleton (outside store to avoid serialization issues)
let globalAudioElement: HTMLAudioElement | null = null;

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
  isFullScreen: boolean;
  currentIndex: number;
  theme: "light" | "dark";
  colorTheme: "red" | "blue" | "green";
  recentFiles: RecentFile[];
  folders: Folder[];
  chapters: Chapter[];
  feedback: string | null;
  isAudioEnabled: boolean;

  // Actions
  setFeedback: (feedback: string | null) => void;
  setIsFullScreen: (isFull: boolean) => void;
  createFolder: (name: string) => void;
  deleteFolder: (id: string) => void;
  deleteFile: (id: string) => void;
  setContent: (
    text: string | { words: string[]; chapters: Chapter[] },
    fileName?: string,
    folderId?: string
  ) => void;
  setWpm: (wpm: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentIndex: (index: number) => void;
  toggleTheme: () => void;
  setColorTheme: (theme: "red" | "blue" | "green") => void;
  reset: () => void;
  loadRecentFile: (file: RecentFile) => void;
  updateRecentFileProgress: (id: string, index: number) => void;
  moveFile: (fileId: string, folderId?: string) => void;
  goHome: () => void;
  restoreSession: () => void;
  togglePlaySmart: () => void;
  seekByTime: (seconds: number) => void;
  toggleAudio: () => void;
  getAudioElement: () => HTMLAudioElement | null;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      content:
        "Welcome to PhotonReader. This is a live demo of Rapid Serial Visual Presentation. By displaying words one at a time, we eliminate eye movement, allowing you to read at double or triple your normal speed. Upload your own PDF below to get started.".split(
          " "
        ),
      currentFileId: "demo",
      wpm: 250,
      isPlaying: false,
      currentIndex: 0,
      theme: "light",
      colorTheme: "red",
      recentFiles: [],
      folders: [],
      chapters: [],
      isFullScreen: false,
      feedback: null,
      isAudioEnabled: false,

      setFeedback: (feedback) => {
        set({ feedback });
        if (feedback) {
          setTimeout(() => set({ feedback: null }), 1000);
        }
      },
      setIsFullScreen: (isFullScreen) => set({ isFullScreen }),
      createFolder: (name) =>
        set((state) => ({
          folders: [
            ...state.folders,
            { id: Date.now().toString(), name, createdAt: Date.now() },
          ],
        })),

      deleteFolder: (id) =>
        set((state) => ({
          folders: state.folders.filter((f) => f.id !== id),
          // Move files in deleted folder to root (remove folderId)
          recentFiles: state.recentFiles.map((f) =>
            f.folderId === id ? { ...f, folderId: undefined } : f
          ),
        })),

      deleteFile: (id) =>
        set((state) => ({
          recentFiles: state.recentFiles.filter((f) => f.id !== id),
          // If deleting current file, switch to home
          currentFileId:
            state.currentFileId === id ? "demo" : state.currentFileId,
          content: state.currentFileId === id ? DEFAULT_CONTENT : state.content,
          chapters:
            state.currentFileId === id ? DEFAULT_CHAPTERS : state.chapters,
        })),

      setContent: (
        input,
        fileName = "Untitled Document",
        folderId?: string
      ) => {
        let words: string[] = [];
        let chapters: Chapter[] = [];
        let fullText = "";

        if (typeof input === "string") {
          words = input.split(/\s+/).filter((word) => word.length > 0);
          fullText = input;
          chapters = [
            { title: "Chapter 1", startIndex: 0, wordCount: words.length },
          ];
        } else {
          words = input.words;
          chapters = input.chapters;
          fullText = words.join(" "); // Reconstruct approximation if needed
        }

        const id = Date.now().toString();

        // Create recent file entry
        const newFile: RecentFile = {
          id,
          name: fileName,
          timestamp: Date.now(),
          wordCount: words.length,
          snippet: words.slice(0, 20).join(" "),
          fullText,
          chapters, // CRITICAL: Store the detected chapters!
          progress: 0,
          folderId, // Store the folder association
        };

        set((state) => {
          // Add to start, remove duplicates by name, limit to 5
          const otherFiles = state.recentFiles.filter(
            (f) => f.name !== fileName
          );
          return {
            content: words,
            chapters,
            currentFileId: id,
            currentIndex: 0,
            isPlaying: false,
            recentFiles: [newFile, ...otherFiles].slice(0, 5),
          };
        });
      },

      getAudioElement: () => {
         if (typeof window === 'undefined') return null;
         if (!globalAudioElement) {
             globalAudioElement = new Audio();
         }
         return globalAudioElement;
      },

      setWpm: (wpm) => {
          const { isAudioEnabled } = get();
          // User Request: Cap audio speed at 250 WPM
          const limit = isAudioEnabled ? 250 : 1000; 
          set({ wpm: Math.min(wpm, limit) });
      },

      setIsPlaying: (isPlaying) => set({ isPlaying }),

      setCurrentIndex: (index) => {
        set({ currentIndex: index });
        // Auto-update progress for the current file if it exists
        const { currentFileId } = get();
        if (currentFileId) {
          get().updateRecentFileProgress(currentFileId, index);
        }
      },

      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
      setColorTheme: (theme) => set({ colorTheme: theme }),
      reset: () => set({ currentIndex: 0, isPlaying: true }),

      loadRecentFile: (file) => {
        if (file.fullText) {
          // 1. Prioritize stored chapters if they exist (Robust PDF ones)
          // 2. Fallback to detection only if missing
          const { words } = detectChapters(file.fullText);
          const chapters =
            file.chapters || detectChapters(file.fullText).chapters;

          set({
            content: words,
            chapters,
            currentFileId: file.id,
            currentIndex: file.progress || 0,
            isPlaying: false,
          });
        }
      },

      updateRecentFileProgress: (id, index) =>
        set((state) => ({
          recentFiles: state.recentFiles.map((f) =>
            f.id === id ? { ...f, progress: index, timestamp: Date.now() } : f
          ),
        })),

      moveFile: (fileId, folderId) =>
        set((state) => ({
          recentFiles: state.recentFiles.map((f) =>
            f.id === fileId ? { ...f, folderId } : f
          ),
        })),

      goHome: () =>
        set({
          content: DEFAULT_CONTENT,
          chapters: DEFAULT_CHAPTERS,
          currentFileId: "demo",
          currentIndex: 0,
          isPlaying: false,
        }),

      togglePlaySmart: () => {
        const { isPlaying, currentIndex } = get();
        if (isPlaying) {
          // Just pause
          set({ isPlaying: false });
        } else {
          // Rewind 10 words (smart forgiveness) and play
          const newIndex = Math.max(0, currentIndex - 10);
          set({ currentIndex: newIndex, isPlaying: true });
        }
      },

      toggleAudio: () => set((state) => {
          const nextState = !state.isAudioEnabled;
          let nextWpm = state.wpm;
          
          // Clamp WPM if turning audio ON
          if (nextState && nextWpm > 250) {
              nextWpm = 250;
          }

          return { 
              isAudioEnabled: nextState,
              wpm: nextWpm 
          };
      }),

      seekByTime: (seconds) => {
        const { wpm, currentIndex, content } = get();
        const wordsToSeek = Math.ceil((wpm / 60) * Math.abs(seconds));
        const newIndex =
          seconds < 0
            ? Math.max(0, currentIndex - wordsToSeek)
            : Math.min(content.length - 1, currentIndex + wordsToSeek);

        set({ currentIndex: newIndex });
        get().setFeedback(seconds > 0 ? `+${seconds}s` : `${seconds}s`);

        // Auto-update recent file progress
        const { currentFileId } = get();
        if (currentFileId) {
          get().updateRecentFileProgress(currentFileId, newIndex);
        }
      },

      restoreSession: () => {
        const { currentFileId, recentFiles } = get();
        if (currentFileId && currentFileId !== "demo") {
          const file = recentFiles.find((f) => f.id === currentFileId);
          if (file && file.fullText) {
            const words = file.fullText
              .split(/\s+/)
              .filter((w) => w.length > 0);
            const chapters = file.chapters || [
              { title: "Chapter 1", startIndex: 0, wordCount: words.length },
            ];
            set({
              content: words,
              chapters: chapters,
              isPlaying: false,
            });
          }
        }
      },
    }),
    {
      name: "photon-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        colorTheme: state.colorTheme,
        wpm: state.wpm,
        recentFiles: state.recentFiles,
        folders: state.folders,
        currentFileId: state.currentFileId,
        currentIndex: state.currentIndex,
        isAudioEnabled: state.isAudioEnabled,
      }),
    }
  )
);
