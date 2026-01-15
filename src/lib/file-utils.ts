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

export const detectChapters = (fullText: string): { words: string[], chapters: Chapter[] } => {
    // Strategy: Fallback Text Heuristic
    // Used when Font Analysis fails (e.g. simple text file or uniform font PDF)
    
    // REFACTOR: This is the fallback "Text Scan" method.
    
    const words = processedToWords(fullText);
    const chapters: { title: string, index: number }[] = [];
    
    // 1. Explicit Headers (Chapter 1, 1. Introduction)
    const chapterRegex = /(?:^|\n)\s*(?:Chapter|Part|Book|Section|Chapitre)\s+(?:(?:\d+)|(?:[IVXLCDM]+)|(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten))\s*[:.-]*\s*(?:[^\n]{0,100})(?:\n|$)/gi;
    const matches = [...fullText.matchAll(chapterRegex)];
    matches.forEach(m => {
        if (m.index !== undefined) chapters.push({ title: m[0].trim().replace(/\s+/g, ' '), index: m.index });
    });

    if (chapters.length < 2) {
         // Numbered Headers (1. Introduction) - Strict start of line
        const numericRegex = /(?:^|\n)\s*(\d+(?:\.\d+)*)\.?\s+([A-Z][^\n]{3,60})(?:\n|$)/g;
        const numMatches = [...fullText.matchAll(numericRegex)];
        numMatches.forEach(m => {
             if (m.index !== undefined) chapters.push({ title: `${m[1]} ${m[2]}`, index: m.index });
        });
    }

    if (chapters.length === 0) {
        return { words, chapters: [{ title: 'Full Text', startIndex: 0, wordCount: words.length }] };
    }

    chapters.sort((a, b) => a.index - b.index);

    const uniqueChapters = chapters.filter((c, i) => {
        if (i === 0) return true;
        return c.index - chapters[i-1].index > 100; 
    });

    const finalChapters: Chapter[] = [];
    let currentWordTotal = 0;
    
    if (uniqueChapters.length > 0 && uniqueChapters[0].index > 0) {
        const preText = fullText.substring(0, uniqueChapters[0].index);
        const preWords = processedToWords(cleanText(preText)).length;
        if (preWords > 0) {
            finalChapters.push({ title: 'Front Matter', startIndex: 0, wordCount: preWords });
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

    return { words, chapters: finalChapters };
};

// ---------------------------
// Extractors
// ---------------------------

export const extractTextFromTXT = async (file: File): Promise<ProcessedText> => {
    const text = await file.text();
    const cleaned = cleanText(text);
    const words = processedToWords(cleaned);
    const { chapters } = detectChapters(text); // Use raw text for detection structure
    
    // Fix up chapter word counts/indices based on cleaned words
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
      
      // Data containers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let globalItems: any[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allPageItems: { items: any[], text: string }[] = [];
      let fullRawTextForFallback = '';
      
      // ---------------------------------------------------------
      // PASS 1: Extract All Items & Text
      // ---------------------------------------------------------
      for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const items = textContent.items as any[];
          
          globalItems = globalItems.concat(items);
          
          const pageRawText = items.map(item => item.str).join(' ');
          const pageCleanedText = cleanText(pageRawText);
          
          allPageItems.push({
              items,
              text: pageCleanedText
          });
          
          fullRawTextForFallback += pageRawText + '\n\n';
      }

      // ---------------------------------------------------------
      // PASS 2: Font Statistics (Find Body Text Size)
      // ---------------------------------------------------------
      const heightCounts: Record<number, number> = {};
      globalItems.forEach(item => {
           // item.transform[0] is usually font size (if unrotated)
           // Round to 2 decimals to group effectively
           const h = Math.round(item.transform[0] * 100) / 100;
           if (h > 0) heightCounts[h] = (heightCounts[h] || 0) + 1;
      });
      
      let bodyHeight = 0;
      let maxCount = 0;
      for (const hStr in heightCounts) {
          const count = heightCounts[hStr];
          if (count > maxCount) {
              maxCount = count;
              bodyHeight = parseFloat(hStr);
          }
      }
      
      console.log(`[PDF Analysis] Body Font Size: ${bodyHeight}. Threshold for Header: ${bodyHeight * 1.15}`);

      // ---------------------------------------------------------
      // PASS 3: Detect Headers & Build Chapters
      // ---------------------------------------------------------
      const detectedChapters: Chapter[] = [];
      let currentWordTotal = 0;
      
      // Threshold: Text significantly larger than body is a header
      // e.g., 15% larger
      const isHeader = (h: number) => h > bodyHeight * 1.15;

      for (const pageData of allPageItems) {
          const pageWords = processedToWords(pageData.text);
          const pageTotalWords = pageWords.length;
          
          // Scan items on this page
          for (let i = 0; i < pageData.items.length; i++) {
              const item = pageData.items[i];
              const h = Math.round(item.transform[0] * 100) / 100;
              
              if (isHeader(h) && item.str.trim().length > 1) { // Ignore single stray chars
                   const title = item.str.trim();
                   
                   // Check if we should merge with previous chapter (if it was very recent/consecutive)
                   const prevChapter = detectedChapters[detectedChapters.length - 1];
                   
                   // Heuristic: If previous chapter has same start index (same page, near same spot?) 
                   // OR if we just added it?
                   
                   // Simplifying: 
                   // To find the exact word index of THIS item is hard because `cleanText` shifts everything.
                   // Approximation: 
                   // Calculate words in the text BEFORE this item on this page.
                   const rawTextBefore = pageData.items.slice(0, i).map(it => it.str).join(' ');
                   const wordsBefore = processedToWords(cleanText(rawTextBefore)).length;
                   
                   const startIndex = currentWordTotal + wordsBefore;

                   // Validation: Don't add if very close to previous (likely multi-line title)
                   if (prevChapter && startIndex - prevChapter.startIndex < 20) {
                        // Merge title
                        prevChapter.title += ' ' + title;
                   } else {
                       // New Chapter
                       detectedChapters.push({
                           title: title,
                           startIndex: startIndex,
                           wordCount: 0 
                       });
                   }
              }
          }
          
          currentWordTotal += pageTotalWords;
      }

      // ---------------------------------------------------------
      // PASS 4: Post-Process & Fallback
      // ---------------------------------------------------------
      
      let finalChapters = detectedChapters;

      // Filter: Clean up titles
      finalChapters = finalChapters.map(c => ({
          ...c,
          title: c.title.replace(/\s+/g, ' ').trim()
      }));

      // Filter: Remove "Chapter" if it's just the word alone? No, "Chapter 1" logic handles merged.

      // FALLBACK: If we didn't find reasonable chapters (e.g. font size is uniform), use Text Heuristic
      if (finalChapters.length < 2) {
          console.warn("[PDF Analysis] Semantic Font Analysis found too few chapters. Falling back to Text Heuristic.");
          const fallbackResult = detectChapters(fullRawTextForFallback);
          finalChapters = fallbackResult.chapters;
      } else {
           // Calculate Word Counts for Font-based chapters
           for (let i = 0; i < finalChapters.length; i++) {
              const current = finalChapters[i];
              const next = finalChapters[i + 1];
              if (next) {
                  current.wordCount = next.startIndex - current.startIndex;
              } else {
                  current.wordCount = currentWordTotal - current.startIndex;
              }
          }
          // Ensure first chapter starts at 0 or add Intro
          if (finalChapters.length > 0 && finalChapters[0].startIndex > 50) {
               finalChapters.unshift({
                   title: 'Start',
                   startIndex: 0,
                   wordCount: finalChapters[0].startIndex
               });
          } else if (finalChapters.length > 0 && finalChapters[0].startIndex > 0) {
              // Just snap to 0 if close
              finalChapters[0].startIndex = 0;
              finalChapters[0].wordCount += finalChapters[0].startIndex; 
          }
      }
      
      console.log(`[PDF Analysis] Final Chapters: ${finalChapters.length}`);

      const allWords = allPageItems.flatMap(p => processedToWords(p.text));

      resolve({
          words: allWords,
          chapters: finalChapters,
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
