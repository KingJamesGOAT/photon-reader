import React from 'react';
import { X, BookOpen, Clock, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore, RecentFile } from '@/store/useStore';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
    const { recentFiles, loadRecentFile } = useStore();

    const handleFileClick = (file: RecentFile) => {
        loadRecentFile(file);
        onClose();
    };

    return (
        <div className={clsx(
            "fixed inset-y-0 left-0 z-50 w-80 glass border-r border-neutral-200/50 dark:border-neutral-800/50 shadow-2xl transform transition-transform duration-300 ease-in-out",
            isOpen ? "translate-x-0" : "-translate-x-full"
        )}>
            <div className="flex items-center justify-between p-6 border-b border-neutral-200/50 dark:border-neutral-800/50">
                <h2 className="text-xl font-bold flex items-center gap-2 tracking-tight">
                    <BookOpen size={24} className="text-red-500" />
                    Library
                </h2>
                <button 
                    onClick={onClose}
                    className="p-2 text-neutral-500 hover:text-foreground dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-all"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="p-6 h-[calc(100vh-80px)] overflow-y-auto flex flex-col">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">
                    Recent
                </h3>
                
                {recentFiles.length === 0 ? (
                    <div className="bg-neutral-50/50 dark:bg-neutral-900/50 border border-neutral-200/50 dark:border-neutral-800/50 rounded-xl p-8 text-center text-sm text-neutral-500 flex flex-col items-center gap-2">
                        <Clock size={32} className="opacity-20 mb-2" />
                        <p>No recent files</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {recentFiles.map((file) => {
                            const progressPercent = file.wordCount > 0 ? Math.round((file.progress / file.wordCount) * 100) : 0;
                            
                            return (
                                <button
                                    key={file.id}
                                    onClick={() => handleFileClick(file)}
                                    className="w-full text-left p-4 rounded-xl hover:bg-neutral-100/80 dark:hover:bg-neutral-800/50 border border-transparent hover:border-neutral-200/50 dark:hover:border-neutral-700/50 transition-all group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-red-500/10 text-red-500 rounded-lg group-hover:scale-110 transition-transform">
                                            <FileText size={16} />
                                        </div>
                                        <div className="overflow-hidden flex-1">
                                            <div className="font-medium truncate text-sm mb-1">{file.name}</div>
                                            <div className="text-xs text-neutral-400 flex items-center justify-between gap-2 mb-2">
                                                <span>{new Date(file.timestamp).toLocaleDateString()}</span>
                                                <span>{progressPercent}% read</span>
                                            </div>
                                            {/* Mini Progress Bar */}
                                            <div className="h-1 w-full bg-neutral-200 dark:bg-neutral-700/50 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-red-500/50 rounded-full"
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="mt-auto pt-6 border-t border-neutral-200/50 dark:border-neutral-800/50">
                     <div className="text-xs text-neutral-400 space-y-2">
                        <p className="font-medium text-foreground">Privacy Note</p>
                        <p>Files are processed locally and stored in your browser. No data is sent to any server.</p>
                     </div>
                </div>
            </div>
        </div>
    );
};
