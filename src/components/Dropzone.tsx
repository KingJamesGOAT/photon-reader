import React, { useRef, useState } from 'react';
import { FileUp } from 'lucide-react';
import { extractTextFromFile, ProcessedText } from '@/lib/file-utils';
import { useStore } from '@/store/useStore';
import { clsx } from 'clsx';
import { SaveFileModal } from './SaveFileModal';

export const Dropzone = () => {
    const { setContent } = useStore();
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [pendingFile, setPendingFile] = useState<{ file: File, data: ProcessedText } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        // Basic type validation
        const isValidType = file.type === 'application/pdf' || file.type === 'text/plain' || file.name.endsWith('.pdf') || file.name.endsWith('.txt');

        if (!isValidType) {
            alert('Please upload a PDF or TXT file');
            return;
        }

        setIsLoading(true);
        try {
            const data = await extractTextFromFile(file);
            // Open Modal
            setPendingFile({ file, data });
        } catch (error) {
            console.error('Extraction failed', error);
            alert('Failed to extract text from file');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = (fileName: string, folderId?: string) => {
        if (pendingFile) {
            setContent(pendingFile.data, fileName, folderId);
            setPendingFile(null);
        }
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = () => {
        setIsDragging(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <>
            {/* Save Modal */}
            {pendingFile && (
                <SaveFileModal 
                    file={pendingFile.file} 
                    onSave={handleSave} 
                    onCancel={() => setPendingFile(null)} 
                />
            )}

            <div 
                onClick={() => inputRef.current?.click()}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={clsx(
                    "relative group cursor-pointer overflow-hidden rounded-2xl transition-all duration-300 shadow-xl dark:shadow-none",
                    "bg-[var(--glass-bg)] backdrop-blur-sm border border-[var(--glass-border)]",
                    "hover:bg-white/80 dark:hover:bg-neutral-900 hover:border-brand-500/30 dark:hover:border-brand-500/50 hover:shadow-2xl dark:hover:shadow-none",
                    isDragging ? "ring-2 ring-brand-500 bg-brand-50/50 dark:bg-brand-900/20" : ""
                )}
            >
                <input 
                    type="file" 
                    ref={inputRef} 
                    className="hidden" 
                    accept=".pdf,.txt" 
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                
                <div className="px-8 py-10 flex flex-col items-center justify-center text-center gap-3">
                    {isLoading ? (
                         <div className="flex items-center gap-2 text-brand-500 animate-pulse">
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span className="font-medium">Processing...</span>
                         </div>
                    ) : (
                        <>
                            <div className="p-3 bg-neutral-100 dark:bg-transparent dark:border dark:border-white/20 rounded-full text-neutral-500 dark:text-white group-hover:text-brand-500 group-hover:scale-110 transition-all duration-300">
                                <FileUp size={24} />
                            </div>
                            <div className="space-y-1">
                                <p className="font-semibold text-neutral-700 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                    Click or drop PDF / TXT
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};
