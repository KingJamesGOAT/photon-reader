import React, { useState } from 'react';
import { useStore, RecentFile } from '@/store/useStore';
import { X, FileText, Trash2, Folder as FolderIcon, FolderOpen, ChevronRight, ChevronDown, Plus, Search } from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const FileItem = ({ 
    file, 
    currentFileId, 
    loadRecentFile, 
    onClose, 
    deleteFile 
}: { 
    file: RecentFile;
    currentFileId: string | null;
    loadRecentFile: (file: RecentFile) => void;
    onClose: () => void;
    deleteFile: (id: string) => void;
}) => (
    <div className={clsx(
        "w-full flex items-center gap-1 p-2 rounded-xl transition-all duration-200 group relative",
        currentFileId === file.id 
            ? "bg-brand-50 dark:bg-brand-900/20 ring-1 ring-brand-200 dark:ring-brand-900" 
            : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
    )}>
        <div 
            onClick={() => {
                loadRecentFile(file);
                onClose();
            }}
            className="flex-1 flex items-start gap-3 cursor-pointer min-w-0"
        >
            <div className={clsx(
                "mt-0.5 p-1.5 rounded-lg",
                currentFileId === file.id ? "bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400"
            )}>
                <FileText size={16} />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className={clsx(
                    "font-medium text-sm truncate pr-6", // Add padding for delete button
                    currentFileId === file.id ? "text-brand-900 dark:text-brand-100" : "text-neutral-900 dark:text-white"
                )}>
                    {file.name}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                        <div className="h-1 flex-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-brand-500 rounded-full"
                            style={{ width: `${(file.progress / file.wordCount) * 100}%` }}
                        />
                        </div>
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 whitespace-nowrap">
                        {Math.round((file.progress / file.wordCount) * 100)}%
                        </span>
                </div>
            </div>
        </div>
        
        <button 
            onClick={(e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this file?')) {
                    deleteFile(file.id);
                }
            }}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-brand-100 dark:hover:bg-brand-900/50 text-neutral-400 hover:text-brand-500 transition-all"
            title="Delete file"
        >
            <Trash2 size={16} />
        </button>
    </div>
);

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
    const { recentFiles, folders, createFolder, deleteFolder, deleteFile, loadRecentFile, currentFileId } = useStore();
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = useState('');

    const toggleFolder = (folderId: string) => {
        setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
    };

    const handleCreateFolder = () => {
        if (!newFolderName.trim()) return;
        createFolder(newFolderName);
        setNewFolderName('');
        setIsCreatingFolder(false);
    };

    // Filter files for root (no folder) and for specific folders
    const rootFiles = recentFiles.filter(f => !f.folderId);
    
    const getFolderFiles = (folderId: string) => recentFiles.filter(f => f.folderId === folderId);

    // Search Logic
    const filteredFiles = searchQuery 
        ? recentFiles.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : [];

    return (
        <div className={clsx(
            "fixed inset-y-0 left-0 z-[60] w-80 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-r border-neutral-200 dark:border-neutral-800 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col",
            isOpen ? "translate-x-0" : "-translate-x-full"
        )}>
            <div className="p-4 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800">
                <h2 className="font-semibold text-lg dark:text-white flex items-center gap-2">
                    <img src="/favicon.png" alt="PhotonReader" className="w-5 h-5 rounded-full" />
                    Library
                </h2>
                <button 
                    onClick={onClose}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors text-neutral-500 dark:text-neutral-400"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Search Bar */}
            <div className="px-4 pt-4 pb-2">
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input 
                        type="text"
                        placeholder="Search PDF..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-100 dark:bg-neutral-900 border-none rounded-xl focus:ring-2 focus:ring-brand-500/50 outline-none transition-all"
                    />
                    {searchQuery && (
                         <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                
                {searchQuery ? (
                    /* Search Results */
                    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                         <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider px-1 mb-2">
                            Search Results ({filteredFiles.length})
                        </h3>
                        {filteredFiles.map(file => (
                             <FileItem 
                                key={file.id} 
                                file={file} 
                                currentFileId={currentFileId}
                                loadRecentFile={loadRecentFile}
                                onClose={onClose}
                                deleteFile={deleteFile}
                            />
                        ))}
                         {filteredFiles.length === 0 && (
                            <p className="text-sm text-neutral-400 text-center py-8 flex flex-col items-center gap-2">
                                <Search size={24} className="opacity-20" />
                                No matching files found
                            </p>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Folders Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                    Folders
                                </h3>
                                <button 
                                    onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                                    className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-500 hover:text-brand-500 transition-colors"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>

                            {isCreatingFolder && (
                                <div className="flex gap-2 mb-2 animate-in slide-in-from-top-2">
                                    <input 
                                        type="text" 
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        placeholder="Name..."
                                        className="flex-1 px-2 py-1 text-sm bg-neutral-100 dark:bg-neutral-800 rounded border-none focus:ring-1 focus:ring-brand-500 outline-none"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                                    />
                                    <button 
                                        onClick={handleCreateFolder}
                                        disabled={!newFolderName}
                                        className="p-1.5 bg-brand-500 text-white rounded hover:bg-brand-600 disabled:opacity-50"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            )}

                            <div className="space-y-1">
                                {folders.map(folder => (
                                    <div key={folder.id} className="space-y-1 mt-2">
                                        <div className="group flex items-center gap-1 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer select-none text-sm text-neutral-700 dark:text-neutral-200 transition-colors">
                                            <button 
                                                onClick={() => toggleFolder(folder.id)}
                                                className="p-0.5 hover:text-brand-500"
                                            >
                                                {expandedFolders[folder.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            </button>
                                            
                                            <div 
                                                className="flex-1 flex items-center gap-2"
                                                onClick={() => toggleFolder(folder.id)}
                                            >
                                                {expandedFolders[folder.id] ? <FolderOpen size={16} className="text-brand-500" /> : <FolderIcon size={16} className="text-neutral-400" />}
                                                <span className="font-medium">{folder.name}</span>
                                                <span className="ml-auto text-xs text-neutral-400">{getFolderFiles(folder.id).length}</span>
                                            </div>

                                            <button 
                                                onClick={() => deleteFolder(folder.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-brand-500 transition-opacity"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        {expandedFolders[folder.id] && (
                                            <div className="pl-4 space-y-1 border-l border-neutral-200 dark:border-neutral-800 ml-4">
                                                {getFolderFiles(folder.id).map(file => (
                                                    <FileItem 
                                                        key={file.id} 
                                                        file={file} 
                                                        currentFileId={currentFileId}
                                                        loadRecentFile={loadRecentFile}
                                                        onClose={onClose}
                                                        deleteFile={deleteFile}
                                                    />
                                                ))}
                                                {getFolderFiles(folder.id).length === 0 && (
                                                    <p className="px-3 py-2 text-xs text-neutral-400 italic">Empty folder</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Root Files Section */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider px-1">
                                Unsorted
                            </h3>
                            <div className="space-y-2">
                                {rootFiles.map(file => (
                                    <FileItem 
                                        key={file.id} 
                                        file={file} 
                                        currentFileId={currentFileId}
                                        loadRecentFile={loadRecentFile}
                                        onClose={onClose}
                                        deleteFile={deleteFile}
                                    />
                                ))}
                                {rootFiles.length === 0 && (
                                    <p className="text-sm text-neutral-400 text-center py-4">No sorting files</p>
                                )}
                            </div>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
};
