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
const cleanText = (text: string): string => {
   return text
       // 1. Fix broken hyphenated words across lines (e.g. "exam-\nple" -> "example")
       .replace(/(\w)-\s*\n\s*(\w)/g, '$1$2')
       
       // 2. Remove "Leader Dots" common in TOCs (e.g. "Chapter 1 ................ 5")
       .replace(/\.{3,}/g, ' ')
       
       // 3. Remove Page Numbers usually appearing at end of lines or alone
       // Matches " 123" at end of line or standalone
       .replace(/\s+\d+\s*$/gm, ' ') 
       
       // 4. Normalize whitespace: varying spaces/tabs/newlines -> single space (structure is already captured)
       // We convert newlines to spaces for the *reading flow*, but we might kept them for detection previously.
       // For the final word stream, we want continuous text.
       .replace(/\s+/g, ' ')
       
       // 5. Remove strange/garbage symbols (very aggressive cleaning)
       // Keep: Letters, Numbers, Punctuation (.,!?:;"'()-), Currency, basic math
       // Remove: Control chars, weird unicode artifacts
       // This regex keeps standard text characters.
       .replace(/[^\w\s.,!?:;"'()\-\u2010-\u2019\u00C0-\u017F0-9$%]/g, ' ')
       
       .trim();
};

const processedToWords = (cleanedText: string): string[] => {
    return cleanedText.split(/\s+/).filter(w => w.length > 0);
};

export const detectChapters = (fullText: string): Chapter[] => {
    // Fallback Heuristic Strategy (Used if PDF has no Outline)
    // Same logic as before but refined.
    
    const chapters: { title: string, index: number }[] = [];
    
    // 1. Explicit Headers
    const chapterRegex = /(?:^|\n)\s*(?:Chapter|Part|Book|Section|Chapitre)\s+(?:(?:\d+)|(?:[IVXLCDM]+)|(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten))\s*[:.-]*\s*(?:[^\n]{0,100})(?:\n|$)/gi;
    const matches = [...fullText.matchAll(chapterRegex)];
    matches.forEach(m => {
        if (m.index !== undefined) chapters.push({ title: m[0].trim().replace(/\s+/g, ' '), index: m.index });
    });

    if (chapters.length < 2) {
        // 2. Numeric Headers (1. Introduction)
        const numericRegex = /(?:^|\n)\s*(\d+(?:\.\d+)*)\.?\s+([A-Z][^\n]{3,60})(?:\n|$)/g;
        const numMatches = [...fullText.matchAll(numericRegex)];
        numMatches.forEach(m => {
             if (m.index !== undefined) chapters.push({ title: `${m[1]} ${m[2]}`, index: m.index });
        });
    }

    // Default
    if (chapters.length === 0) {
        return [{ title: 'Full Text', startIndex: 0, wordCount: 0 }];
    }

    chapters.sort((a, b) => a.index - b.index);

    // Filter duplicates or very close chapters
    const uniqueChapters = chapters.filter((c, i) => {
        if (i === 0) return true;
        return c.index - chapters[i-1].index > 50; // Min distance
    });

    // Map to word indices
    const finalChapters: Chapter[] = [];
    let currentWordTotal = 0;
    
    // Prefix
    if (uniqueChapters[0].index > 0) {
        const preText = fullText.substring(0, uniqueChapters[0].index);
        const preWords = processedToWords(cleanText(preText)).length;
        if (preWords > 0) {
            finalChapters.push({ title: 'Start', startIndex: 0, wordCount: preWords });
            currentWordTotal += preWords;
        }
    }

    uniqueChapters.forEach((c, i) => {
        const next = uniqueChapters[i+1];
        const end = next ? next.index : fullText.length;
        const textSection = fullText.substring(c.index, end);
        const wordCount = processedToWords(cleanText(textSection)).length;
        
        if (wordCount > 0) {
            finalChapters.push({
                title: c.title.length > 50 ? c.title.substring(0, 50) + "..." : c.title,
                startIndex: currentWordTotal,
                wordCount
            });
            currentWordTotal += wordCount;
        }
    });

    return finalChapters;
};

// ---------------------------
// Extractors
// ---------------------------

export const extractTextFromTXT = async (file: File): Promise<ProcessedText> => {
    const text = await file.text();
    const cleaned = cleanText(text);
    const words = processedToWords(cleaned);
    const chapters = detectChapters(text); // Use raw text for detection structure
    
    // Fix up chapter word counts/indices based on cleaned words
    // For TXT, accurate mapping is hard without keeping offsets. 
    // We'll trust the fallback heuristic which recalculates based on clean text.
    
    return {
        words,
        chapters,
        rawText: text
    };
};

export const extractTextFromPDF = async (file: File): Promise<ProcessedText> => {
  return new Promise(async (resolve, reject) => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      
      if (typeof window !== 'undefined') {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      }

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      let fullRawTextForFallback = '';
      const pageTextData: { pageIndex: number, text: string, wordCount: number }[] = [];
      let totalWordCount = 0;

      // 1. Extract Text Per Page
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Improve text join: add space between items to avoid "hello(world)"
        const pageRawText = textContent.items
          // @ts-expect-error item type mismatch
          .map((item) => item.str)
          .join(' '); 
        
        const pageCleanedText = cleanText(pageRawText);
        const pageWords = processedToWords(pageCleanedText);
        
        pageTextData.push({
            pageIndex: i, // 1-based
            text: pageCleanedText,
            wordCount: pageWords.length
        });
        
        totalWordCount += pageWords.length;
        fullRawTextForFallback += pageRawText + '\n\n';
      }

      // 2. Try to get Native Outline
      const outline = await pdf.getOutline();
      let chapters: Chapter[] = [];

          if (outline && outline.length > 0) {
          console.log("PDF Outline Found:", outline);
          
          // Helper to flatten outline and map to word index
          // Outline items have { title, dest }
          // We need to resolve 'dest' to a page number.
          
          for (const item of outline) {
              let targetPageIndex = -1; // 1-based
              
              try {
                  if (typeof item.dest === 'string') {
                      const dest = await pdf.getDestination(item.dest);
                      if (dest) {
                          const ref = dest[0]; // Ref object
                          const pageIndex = await pdf.getPageIndex(ref);
                          targetPageIndex = pageIndex + 1;
                      }
                  } else if (Array.isArray(item.dest)) {
                       const ref = item.dest[0];
                       const pageIndex = await pdf.getPageIndex(ref);
                       targetPageIndex = pageIndex + 1;
                  }
              } catch {
                  console.warn("Could not resolve outline destination", item);
              }

              if (targetPageIndex > 0) {
                  // Calculate start index based on cumulative word counts of previous pages
                  // pageTextData is 0-indexed array, representing pages 1..N
                  let startIndex = 0;
                  for (let p = 0; p < targetPageIndex - 1; p++) {
                      startIndex += pageTextData[p].wordCount;
                  }
                  
                  chapters.push({
                      title: item.title,
                      startIndex: startIndex,
                      // We'll calculate wordCount relative to next chapter later
                      wordCount: 0 
                  });
              }
          }
          
          // Post-process chapters to set lengths
          chapters.sort((a, b) => a.startIndex - b.startIndex);
          // Filter duplicates (some PDFs have multiple bookmarks to same page)
          chapters = chapters.filter((c, index, self) => 
            index === 0 || c.startIndex > self[index - 1].startIndex
          );

          // Calculate word counts
          for (let i = 0; i < chapters.length; i++) {
              const current = chapters[i];
              const next = chapters[i + 1];
              if (next) {
                  current.wordCount = next.startIndex - current.startIndex;
              } else {
                  current.wordCount = totalWordCount - current.startIndex;
              }
          }
          
          // Ensure first chapter starts at 0 or add Intro
          if (chapters.length > 0 && chapters[0].startIndex > 0) {
              chapters.unshift({
                  title: 'Introduction',
                  startIndex: 0,
                  wordCount: chapters[0].startIndex
              });
          }
           
      } 
      
      // 3. Fallback if no outline or empty
      if (chapters.length === 0) {
          console.log("No PDF Outline, using heuristic detection");
          chapters = detectChapters(fullRawTextForFallback);
      }

      // 4. Construct Final Data
      const allWords = pageTextData.flatMap(p => processedToWords(p.text));
      
      resolve({
          words: allWords,
          chapters: chapters,
          rawText: fullRawTextForFallback
      });

    } catch (error) {
        console.error("PDF Extraction Error", error);
        reject(error);
    }
  });
};

export const extractTextFromFile = async (file: File): Promise<ProcessedText> => {
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        return extractTextFromPDF(file);
    } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        return extractTextFromTXT(file);
    } else {
        throw new Error('Unsupported file type');
    }
};
