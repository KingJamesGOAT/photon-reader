import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { X, FolderPlus } from 'lucide-react';

interface SaveFileModalProps {
    file: File;
    onSave: (fileName: string, folderId?: string) => void;
    onCancel: () => void;
}

export const SaveFileModal = ({ file, onSave, onCancel }: SaveFileModalProps) => {
    const { folders, createFolder } = useStore();
    const [fileName, setFileName] = useState(file.name.replace(/\.[^/.]+$/, "")); // Remove extension
    const [selectedFolderId, setSelectedFolderId] = useState<string>('');
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    const handleCreateFolder = () => {
        if (!newFolderName.trim()) return;
        createFolder(newFolderName);
        setNewFolderName('');
        setIsCreatingFolder(false);
    };

    const handleSave = () => {
        onSave(fileName, selectedFolderId || undefined);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                        Import File
                    </h2>
                    <button 
                        onClick={onCancel}
                        className="p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    
                    {/* File Name Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            File Name
                        </label>
                        <input 
                            type="text" 
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            className="w-full px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border-none rounded-lg text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                            placeholder="Enter file name"
                            autoFocus
                        />
                    </div>

                    {/* Folder Selection */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                Save to Folder
                            </label>
                            <button 
                                onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                                className="text-xs font-medium text-red-600 hover:text-red-500 dark:text-red-400 flex items-center gap-1"
                            >
                                <FolderPlus size={14} />
                                New Folder
                            </button>
                        </div>
                        
                        {isCreatingFolder && (
                            <div className="flex gap-2 animate-in slide-in-from-top-2 duration-200">
                                <input 
                                    type="text" 
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder="Folder Name"
                                    className="flex-1 px-3 py-1.5 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg outline-none focus:border-red-500"
                                />
                                <button 
                                    onClick={handleCreateFolder}
                                    disabled={!newFolderName.trim()}
                                    className="px-3 py-1.5 text-xs font-bold bg-neutral-900 dark:bg-white text-white dark:text-black rounded-lg disabled:opacity-50"
                                >
                                    Add
                                </button>
                            </div>
                        )}

                        <select 
                            value={selectedFolderId}
                            onChange={(e) => setSelectedFolderId(e.target.value)}
                            className="w-full px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border-none rounded-lg text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-all appearance-none cursor-pointer"
                        >
                            <option value="">No Folder (Root)</option>
                            {folders.map(folder => (
                                <option key={folder.id} value={folder.id}>
                                    {folder.name}
                                </option>
                            ))}
                        </select>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 bg-neutral-50 dark:bg-neutral-950 flex justify-end gap-3 border-t border-neutral-200 dark:border-neutral-800">
                    <button 
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-6 py-2 text-sm font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-lg hover:shadow-red-500/20 transition-all"
                    >
                        Save & Open
                    </button>
                </div>

            </div>
        </div>
    );
};
