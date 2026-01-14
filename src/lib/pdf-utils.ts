// We use dynamic import for pdfjs-dist to avoid "DOMMatrix is not defined" error during Next.js SSR
// as pdfjs-dist (modern build) relies on browser APIs at the top level.

export const extractTextFromPDF = async (file: File): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Dynamic import
      const pdfjsLib = await import('pdfjs-dist');
      
      // Initialize worker
      // We set specific worker source for browser environment
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
        const pageText = textContent.items
          // @ts-ignore
          .map((item) => item.str)
          .join(' ');
        fullText += pageText + ' ';
      }
      
      resolve(fullText.trim());
    } catch (error) {
      reject(error);
    }
  });
};
