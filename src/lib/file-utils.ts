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
    // Strategy: Visual TOC -> Page Map
    // 1. We tokenize the full text to get a word count map.
    // 2. We search for a "Contents" page early in the document.
    // 3. We parse "Chapter Title ... PageNum" lines.
    // 4. We map PageNum to the actual word index from the fullText.
    
    // Note: To map PageNum -> WordIndex accurately, we really need the per-page word counts.
    // BUT this function `detectChapters` only receives `fullText`. 
    // This is a limitation. Ideally, it should receive the `pageTextData` from `extractTextFromPDF`.
    // However, for now, we will use a "Text Search" fallback for page numbers if valid, 
    // OR we relies on the fact that `extractTextFromPDF` actually has the data and SHOULD handle this logic.
    
    // REFACTOR: `detectChapters` should mainly be for TXT files or fallback.
    // The robust PDF logic should live in `extractTextFromPDF`.
    
    // However, since I am editing `detectChapters` which is called by `extractTextFromPDF`'s fallback...
    // I will implement the *Text-Based* Visual TOC here (searching for text titles),
    // AND I will add the *Page-Based* Visual TOC inside `extractTextFromPDF` directly.
    
    // So here, I will just keep a robust text-scanning heuristic for now.
    
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
      
      // 3. Visual TOC Strategy (Page Map)
      // If Native Outline failed, try to find a visual "Table of Contents" and map Page Numbers
      if (chapters.length === 0) {
          console.log("No Native Outline, attempting Visual TOC scan...");
          
          // Scan first 10 pages for "Contents" header
          const maxPagesToScan = Math.min(10, pageTextData.length);
          let tocPageIndex = -1;
          
          for (let i = 0; i < maxPagesToScan; i++) {
              if (/(?:^|\n)\s*(?:Table of Contents|Contents|Index|Sommaire|Inhalt)\s*(?:\n|$)/i.test(pageTextData[i].text)) {
                  tocPageIndex = i;
                  break;
              }
          }

          if (tocPageIndex !== -1) {
              console.log("Found Visual TOC on page", tocPageIndex + 1);
              const tocPageText = pageTextData[tocPageIndex].text;
              const tocLines = tocPageText.split('\n');

              for (const line of tocLines) {
                 // Aggressive Regex to capture:
                 // 1. "Chapter 1 ...... 5"
                 // 2. "I ......... 5" (Short Roman)
                 // 3. "1 ......... 5" (Short Numeric)
                 // 4. "Part I ..... 10"
                 // 5. "1. Introduction ... 5"
                 
                 // Analysis:
                 // Group 1: Title (The part before the dots/space/number)
                 // Group 2: The Number at the end
                 
                 // We relax the {3,} limit to allow short chapters like "I", "II", "1".
                 // BUT we must be careful. "The ... 5" is bad. "1 ... 5" is good.
                 
                 // This regex allows:
                 // - Starts with alphanumeric
                 // - Can be short (1 char) IF it matches Roman/Numeric patterns
                 // - Or longer (3+ chars) for standard titles
                 
                 const match = line.match(/^((?:[A-Z0-9]+)|(?:.{2,}))(?:\s|\.)+(\d+)$/i);
                 
                 if (match) {
                     const rawTitle = match[1].replace(/[.]{3,}/g, '').trim();
                     const pageNum = parseInt(match[2]);
                     
                     // Filter Check: Title shouldn't be too weird
                     // If it's very short (<3 chars), strict check: must be Number or Roman
                     const isShort = rawTitle.length < 3;
                     const isNumeric = /^\d+$/.test(rawTitle);
                     const isRoman = /^[IVXLCDM]+$/i.test(rawTitle);
                     
                     if (isShort && !isNumeric && !isRoman) {
                         continue; // Skip "The" or "Of" etc
                     }

                     if (!isNaN(pageNum) && pageNum > 0 && pageNum <= pageTextData.length) {
                         // Map Page Number to Word Index
                         const targetPageIndex = pageNum - 1;
                         
                         // Validation: Chapter shouldn't start BEFORE the TOC
                         if (targetPageIndex <= tocPageIndex) continue;

                         // Calculate cumulative word count up to this page
                         let startIndex = 0;
                         for (let p = 0; p < targetPageIndex; p++) {
                             startIndex += pageTextData[p].wordCount;
                         }

                         // Avoid duplicates (if same page, maybe keep first or longest title?)
                         // We'll filter later
                         
                         chapters.push({
                             title: rawTitle,
                             startIndex: startIndex,
                             wordCount: 0 // Will calc later
                         });
                     }
                 }
              }
              
              // Sort and clean
              chapters.sort((a, b) => a.startIndex - b.startIndex);
              // Filter duplicates: keep the one with the longer title if start index is same?
              // Or just uniq
              chapters = chapters.filter((c, index, self) => 
                index === 0 || c.startIndex > self[index - 1].startIndex
              );
              
              // Post-calc word counts
              if (chapters.length > 0) {
                   for (let i = 0; i < chapters.length; i++) {
                      const current = chapters[i];
                      const next = chapters[i + 1];
                      if (next) {
                          current.wordCount = next.startIndex - current.startIndex;
                      } else {
                          current.wordCount = totalWordCount - current.startIndex;
                      }
                  }
                  
                  // Ensure start
                  if (chapters.length > 0 && chapters[0].startIndex > 0) {
                        chapters.unshift({
                            title: 'Front Matter',
                            startIndex: 0,
                            wordCount: chapters[0].startIndex
                        });
                  }
              }
          }
      }

      // 4. Fallback if no outline or visual TOC found
      if (chapters.length === 0) {
          console.log("No PDF Outline or Visual TOC, using text heuristic detection");
          const heuristicResult = detectChapters(fullRawTextForFallback);
          chapters = heuristicResult.chapters;
      }

      // 5. Construct Final Data
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
