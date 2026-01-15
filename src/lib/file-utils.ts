// We use dynamic import for pdfjs-dist to avoid "DOMMatrix is not defined" error during Next.js SSR
// as pdfjs-dist (modern build) relies on browser APIs at the top level.
import { Chapter } from '@/store/useStore';

export interface ProcessedText {
    words: string[];
    chapters: Chapter[];
    rawText: string;
}

// ---------------------------
// Text Processing & Cleaning
// ---------------------------
// const cleanText = (text: string): string => {
//    return text
//        // Fix hyphenated words broken by newlines (e.g. "exam-\nple" -> "example")
//        .replace(/(\w)-\s*\n\s*(\w)/g, '$1$2')
//        // Remove multiple spaces/newlines with single space
//        .replace(/\s+/g, ' ')
//        // Remove distinct noise (single chars that aren't common words)
//        // Kept: a, I, A (and single digits if needed, but risky)
//        .replace(/(^|\s)([^aAI\d\W])(\s|$)/g, ' ')
//        .trim();
// };

const detectChapters = (fullText: string): { words: string[], chapters: Chapter[] } => {
    const words = fullText.split(/\s+/).filter(w => w.length > 0);
    const countWords = (str: string) => str.split(/\s+/).filter(w => w.length > 0).length;

    // Advanced strategy:
    // 1. Look for a "Table of Contents" section
    // 2. Extract potential chapter titles from it
    // 3. Find where those titles appear in the body text

    const tocHeaderRegex = /(?:^|\n)\s*(?:Table of Contents|Contents|Index|Sommaire)\s*(?:\n|$)/i;
    const tocMatch = fullText.match(tocHeaderRegex);

    const extractedChapters: { title: string, index: number }[] = [];

    if (tocMatch && tocMatch.index !== undefined) {
        // Look at the next 15000 characters for TOC entries (handles larger PDFs)
        const tocStartIndex = tocMatch.index + tocMatch[0].length;
        const potentialTocSection = fullText.substring(tocStartIndex, tocStartIndex + 15000); 
        const lines = potentialTocSection.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        const candidateTitles = [];
        for (const line of lines) {
            // Stop if we hit a very long paragraph (likely end of TOC)
            if (line.split(/\s+/).length > 25) break;
            
            // Heuristic cleanup: remove trailing page numbers and the dots often used (e.g. "Chapter 1.......10")
            const titleClean = line
                .replace(/[.\s\-_]*\d+$/, '') // Remove page number
                .replace(/[.]{3,}/g, '')      // Remove long dot strings
                .trim();

            // Support for sub-chapters: check for numbering (e.g. 1.1, A., I.b)
            if (titleClean.length > 2 && titleClean.length < 120) {
                candidateTitles.push(titleClean);
            }
        }

        // Search for these titles in the fullText (starting shortly after TOC)
        const searchStartIndex = tocMatch.index; 
        let lastFoundIndex = searchStartIndex;

        candidateTitles.forEach(title => {
            const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Relaxed regex: allow common title format and don't strictly require start/end of line
            // to catch headers that might have extra styling artifacts in the PDF stream
            const titleRegex = new RegExp(`(?:^|\\n)\\s*${escapedTitle}\\s*(?:\\n|[:.-]|$)`, 'i');
            
            const subset = fullText.substring(lastFoundIndex);
            const match = subset.match(titleRegex);

            if (match && match.index !== undefined) {
                const actualIndex = lastFoundIndex + match.index;
                extractedChapters.push({ title, index: actualIndex });
                lastFoundIndex = actualIndex + match[0].length;
            }
        });
    }

    // fallback: if TOC extraction yielded nothing or very few, use regex
    if (extractedChapters.length < 2) {
        // Explicit Chapter/Book/Section headers
        const chapterRegex = /(?:^|\n)\s*(?:Chapter|Part|Book|Section|Chapitre)\s+(?:(?:\d+)|(?:[IVXLCDM]+)|(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten))\s*[:.-]*\s*(?:[^\n]{0,100})(?:\n|$)/gi;
        const matches = [...fullText.matchAll(chapterRegex)];
        
        matches.forEach(m => {
            if (m.index !== undefined) {
               extractedChapters.push({ title: m[0].trim().replace(/\s+/g, ' '), index: m.index });
            }
        });

        // Numerical headers like "1. Introduction" or "1.1 Subtitle"
        if (extractedChapters.length < 2) {
            const numericRegex = /(?:^|\n)\s*(\d+(?:\.\d+)*)\.?\s+([A-Z][^\n]{3,60})(?:\n|$)/g;
            const numMatches = [...fullText.matchAll(numericRegex)];
            numMatches.forEach(m => {
                if (m.index !== undefined) {
                    extractedChapters.push({ title: `${m[1]} ${m[2]}`, index: m.index });
                }
            });
        }
    }

    // Default if still nothing
    if (extractedChapters.length === 0) {
        return { 
            words, 
            chapters: [{ title: 'Full Text', startIndex: 0, wordCount: words.length }] 
        };
    }

    // Sort chapters by index just in case
    extractedChapters.sort((a, b) => a.index - b.index);

    // Convert character indices to word indices
    // This is expensive: we have to partial count words up to each index.
    // Optimization: Calculate cumulatively.

    const finalChapters: Chapter[] = [];
    let currentWordCountTotal = 0;

    // We assume the first chapter starts... somewhere.
    // What about text BEFORE the first detected chapter? (Intro)
    if (extractedChapters[0].index > 0) {
        const preText = fullText.substring(0, extractedChapters[0].index);
        const preWords = countWords(preText);
        if (preWords > 0) {
            finalChapters.push({
                title: 'Start',
                startIndex: 0,
                wordCount: preWords
            });
            currentWordCountTotal += preWords;
        }
    }

    extractedChapters.forEach((chapter, i) => {
        const nextChapter = extractedChapters[i + 1];
        const endCharIndex = nextChapter ? nextChapter.index : fullText.length;
        
        const sectionText = fullText.substring(chapter.index, endCharIndex);
        const sectionWords = countWords(sectionText);
        
        if (sectionWords > 0) {
            finalChapters.push({
                title: chapter.title.length > 40 ? chapter.title.substring(0, 40) + "..." : chapter.title,
                startIndex: currentWordCountTotal,
                wordCount: sectionWords
            });
            currentWordCountTotal += sectionWords;
        }
    });

    return { words, chapters: finalChapters };
};

const processText = (rawText: string): ProcessedText => {
    // 1. First Pass: Basic Cleaning (Text Only)
    // We do NOT collapse spaces yet because we need structure for regex detection
    const cleaned = rawText
        .replace(/(\w)-\s*\n\s*(\w)/g, '$1$2'); // Fix hyphens
        
    // 2. Identify Chapters & Build Word List
    const { words, chapters } = detectChapters(cleaned);
    
    return {
        words,
        chapters,
        rawText
    };
};

// ---------------------------
// Extractors
// ---------------------------

export const extractTextFromTXT = async (file: File): Promise<ProcessedText> => {
    const text = await file.text();
    return processText(text);
};

export const extractTextFromFile = async (file: File): Promise<ProcessedText> => {
    if (file.type === 'application/pdf') {
        const text = await extractTextFromPDF(file);
        return processText(text);
    } else if (file.type === 'text/plain') {
        return extractTextFromTXT(file);
    } else {
        throw new Error('Unsupported file type');
    }
};

export const extractTextFromPDF = async (file: File): Promise<string> => {
  return new Promise(async (resolve) => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      
      if (typeof window !== 'undefined') {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      }

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // PDF text items often have x/y coordinates. 
        // We join with newline to preserve paragraph structure potential for detection
        const pageText = textContent.items
          // @ts-expect-error item type mismatch in lib
          .map((item) => item.str)
          .join('\n'); // Changing to \n to help detection
        
        fullText += pageText + '\n\n';
      }
      
      resolve(fullText);
    } catch (error) {
        // Fallback or empty
        console.error(error);
        resolve("");
    }
  });
};
