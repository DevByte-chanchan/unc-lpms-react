// pdf.js, loaded on first use (keeps it out of the main bundle), with its worker
// set up the Vite way. Every viewer goes through loadPdfjs().
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

let pending = null;

export const loadPdfjs = () => {
  if (!pending) {
    pending = import('pdfjs-dist')
      .then((pdfjs) => {
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        return pdfjs;
      })
      .catch((err) => { pending = null; throw err; });
  }
  return pending;
};

// pdf.js page units are 1/72 in; CSS pixels are 1/96 in. Zoom 100 % = real size.
export const CSS_UNITS = 96 / 72;
