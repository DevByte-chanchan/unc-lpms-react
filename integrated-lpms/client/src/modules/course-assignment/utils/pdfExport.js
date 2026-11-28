// Download PDF for generated documents (ported from the v2 PDFViewerModal's handleExportPDF).
//
// The document is laid out in an off-screen iframe at the preview's width, its
// measuring script is allowed to finish, then every `.page` becomes exactly one
// 330 × 216 mm PDF page (html2canvas at scale 3, lossless PNG — sharp text, no
// blank or extra pages). Attached PDFs (`appendix_pdfs`) are added after the
// generated pages with pdf-lib. The libraries load only when someone downloads.

export const PAGE_W = 1247; // 330 mm at 96 dpi — the preview iframe's width
const PW = 330;
const PH = 216;

const waitFor = (test, ms) => new Promise((resolve) => {
  const start = Date.now();
  const tick = () => (test() || Date.now() - start > ms ? resolve() : setTimeout(tick, 50));
  tick();
});

async function withLaidOutDocument(url, fn) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.title = 'PDF export';
  // Off screen but rendered (not visibility:hidden — html2canvas would draw nothing).
  frame.style.cssText = `position:fixed; left:-${PAGE_W + 4000}px; top:0; width:${PAGE_W}px; height:900px; border:0; pointer-events:none;`;
  const loaded = new Promise((resolve, reject) => {
    frame.onload = resolve;
    frame.onerror = () => reject(new Error('Could not load the document.'));
  });
  frame.src = url;
  document.body.appendChild(frame);
  try {
    await loaded;
    const doc = frame.contentDocument;
    if (!doc) throw new Error('The document could not be read.');
    await waitFor(() => doc.body && doc.body.getAttribute('data-paginated') === '1', 4000);
    if (doc.fonts && doc.fonts.ready) await doc.fonts.ready;
    return await fn(doc);
  } finally {
    frame.remove();
  }
}

export async function renderDocumentToPdf(url) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')]);
  return withLaidOutDocument(url, async (doc) => {
    const pages = Array.from(doc.querySelectorAll('.page'));
    if (!pages.length) throw new Error('The document has no pages.');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [PW, PH], compress: true });
    for (let i = 0; i < pages.length; i++) {
      const el = pages[i];
      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      });
      if (i > 0) pdf.addPage([PW, PH], 'landscape');
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, PW, PH, undefined, 'FAST');
    }
    return { bytes: pdf.output('arraybuffer'), pageCount: pages.length };
  });
}

export async function appendPdfs(baseBytes, urls) {
  if (!urls || !urls.length) return baseBytes;
  const { PDFDocument } = await import('pdf-lib');
  const out = await PDFDocument.load(baseBytes);
  for (const url of urls) {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('An attached PDF could not be loaded (' + res.status + ').');
    const src = await PDFDocument.load(await res.arrayBuffer(), { ignoreEncryption: true });
    const copied = await out.copyPages(src, src.getPageIndices());
    copied.forEach((p) => out.addPage(p));
  }
  return out.save();
}

export function saveBytes(bytes, fileName) {
  const href = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10000);
}

/** One document of the viewer → a downloaded PDF named by its file_name. */
export async function downloadDocumentPdf(docEntry) {
  const { bytes } = await renderDocumentToPdf(docEntry.file_url);
  const joined = await appendPdfs(bytes, docEntry.appendix_pdfs);
  saveBytes(joined, docEntry.file_name || 'document.pdf');
}
