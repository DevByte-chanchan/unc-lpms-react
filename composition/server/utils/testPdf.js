'use strict';

// Tests only: a small real PDF with text where you put it, so an upload check that reads the PDF (utils/documentScan.js)
// can be tested without fixture files. pages: [[[x, y, 'text'], ...], ...] in points from the bottom-left of an A4 page.
// Plain ASCII text, Helvetica 10.

const escape = (s) => String(s).replace(/[\\()]/g, (c) => `\\${c}`);

const textPdf = (pages) => {
    const objects = [];
    const add = (body) => { objects.push(body); return objects.length; };
    const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const pagesId = objects.length + 1 + pages.length * 2;
    const kids = pages.map((items) => {
        // One text piece per word, as real PDFs have (the reader takes a page of very few pieces for a scan).
        const words = items.flatMap(([x, y, text]) => {
            let at = x;
            return String(text).split(/\s+/).filter(Boolean).map((word) => { const piece = [at, y, word]; at += (word.length + 1) * 5.5; return piece; });
        });
        const stream = words.map(([x, y, word]) => `BT /F1 10 Tf ${x} ${y} Td (${escape(word)}) Tj ET`).join('\n');
        const content = add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
        return add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R >>`);
    });
    add(`<< /Type /Pages /Kids [${kids.map(k => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`);
    const catalog = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

    let out = '%PDF-1.4\n';
    const offsets = objects.map((body, i) => { const at = Buffer.byteLength(out); out += `${i + 1} 0 obj\n${body}\nendobj\n`; return at; });
    const xref = Buffer.byteLength(out);
    out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
    out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(out, 'latin1');
};

module.exports = { textPdf };
