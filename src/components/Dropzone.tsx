import React, { useRef, useState } from 'react';
import { Upload, FileUp } from 'lucide-react';
import { extractTextFromPDF } from '@/lib/pdf-utils';
import { useStore } from '@/store/useStore';
import { clsx } from 'clsx';

export const Dropzone = () => {
    const { setContent } = useStore();
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        if (file.type !== 'application/pdf') {
            alert('Please upload a PDF file');
            return;
        }

        setIsLoading(true);
        try {
            const text = await extractTextFromPDF(file);
            setContent(text, file.name);
        } catch (error) {
            console.error('Extraction failed', error);
            alert('Failed to extract text from PDF');
        } finally {
            setIsLoading(false);
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
        <div 
            onClick={() => inputRef.current?.click()}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={clsx(
                "relative group cursor-pointer overflow-hidden rounded-2xl transition-all duration-300",
                "bg-white/50 backdrop-blur-sm border border-neutral-200/50 dark:!bg-transparent dark:!backdrop-blur-none dark:border-white/20",
                "hover:bg-white/80 dark:hover:bg-neutral-900 hover:border-red-500/30 dark:hover:border-red-500/50 hover:shadow-lg dark:hover:shadow-none",
                isDragging ? "ring-2 ring-red-500 bg-red-50/50 dark:bg-red-900/20" : ""
            )}
        >
            <input 
                type="file" 
                ref={inputRef} 
                className="hidden" 
                accept=".pdf" 
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            
            <div className="px-8 py-10 flex flex-col items-center justify-center text-center gap-3">
                {isLoading ? (
                     <div className="flex items-center gap-2 text-red-500 animate-pulse">
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span className="font-medium">Processing...</span>
                     </div>
                ) : (
                    <>
                        <div className="p-3 bg-neutral-100 dark:bg-transparent dark:border dark:border-white/20 rounded-full text-neutral-500 dark:text-white group-hover:text-red-500 group-hover:scale-110 transition-all duration-300">
                            <FileUp size={24} />
                        </div>
                        <div className="space-y-1">
                            <p className="font-semibold text-neutral-700 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                                Click or drop PDF here
                            </p>
                            <p className="text-xs text-neutral-400 dark:text-white">
                                Supports PDF files up to 10MB
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
