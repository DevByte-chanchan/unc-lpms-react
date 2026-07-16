import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const PW = 936, PH = 612;
const LM = 50, RM = 40, TM = 42, BM = 36;
const BODY_W = PW - LM - RM;

/* ── column boundaries (pts from left) ── */
const COL = {
  num:   { x: LM,        w: 35 },
  state: { x: LM + 35,   w: 185 },
  ilo:   { x: LM + 220,  w: 225 },
  tool:  { x: LM + 445,  w: 175 },
  target:{ x: LM + 620,  w: BODY_W - 570 },
};

/* ── helper: draw text with word-wrap (manual) ── */
function wrapText(drawFn, text, x, y, maxW, size, font) {
  if (!text) return;
  const words = String(text).split(/\s+/);
  let line = '', lineY = y, lineH = size * 1.25;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (font.widthOfTextAtSize(test, size) > maxW && line) {
      drawFn(line, x, lineY, size, font);
      lineY -= lineH;
      line = w;
    } else {
      line = test;
    }
  }
  if (line) drawFn(line, x, lineY, size, font);
}

export async function generateCoaepPdf(raw) {
  const defaults = {
    performanceTarget: 'At least 90% of enrolled students with a rating of at least 60% of the total score',
    reminders: 'This template should be accomplished for each course handled by the faculty.',
    notes: 'Course Outcomes and ILOs must be SMART; Each CO should be granularized into an introductory, enabling and demonstrative ILO; ILOs should NOT be teaching learning activities; Sample Performance target:  At least 70% of students with 60% proficiency or score 12 out of 20.',
    effectivityDate: '06/01/2024', revisionNo: '0', pageNo: '1 of Y',
  };
  const data = { ...defaults, ...raw };
  const doc = await PDFDocument.create();
  const page = doc.addPage([PW, PH]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const GRAY = rgb(0, 0, 0);
  const WHITE = rgb(1, 1, 1);

  /* draw helper */
  const txt = (s, x, y, sz, f, opts = {}) => {
    if (!s) return;
    const fn = f || font;
    const c = opts.color || GRAY;
    if (opts.maxW) {
      wrapText(
        (line, lx, ly) => page.drawText(line, { x: lx, y: ly, size: sz, font: fn, color: c }),
        s, x, y, opts.maxW, sz, fn,
      );
    } else {
      page.drawText(String(s), { x, y, size: sz, font: fn, color: c });
    }
  };

  const line = (x1, y1, x2, y2) => {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.5, color: GRAY });
  };
  const rect = (x, y, w, h) => {
    page.drawRectangle({ x, y, width: w, height: h, borderColor: GRAY, borderWidth: 0.5, color: WHITE });
  };

  /* ════════ HEADER ════════ */
  let y = PH - TM;

  /* logo area + Doc. Control on right */
  txt('UNIVERSITY OF NUEVA CACERES', LM + 130, y - 2, 11, bold);
  txt('Doc. Control No.:', PW - RM - 200, y - 2, 8, bold);
  txt('UNC-FM-VPAA-02', PW - RM - 145, y - 14, 8, null);

  y -= 20;
  txt('COURSE ASSESSMENT & EVALUATION PLAN', LM + 85, y - 2, 14, bold);
  y -= 18;
  txt('Form', LM + 85, y - 2, 10, null);
  y -= 16;
  txt('Office of the Vice President for Academic Affairs', LM + 85, y - 2, 10, bold);

  y -= 10;
  /* bottom-border line under header */
  line(LM, y, PW - RM, y);
  y -= 8;

  /* ════════ METADATA ════════ */
  txt('Name of Faculty:', LM, y - 2, 9, bold);
  txt(data.header?.facultyName || '', LM + 95, y - 2, 9, null, { maxW: 250 });
  txt('School Year', PW - RM - 160, y - 2, 9, bold);
  txt(data.header?.schoolYear || '', PW - RM - 85, y - 2, 9, null, { maxW: 80 });

  y -= 16;
  txt('Course:', LM, y - 2, 9, bold);
  txt(data.header?.course || '', LM + 50, y - 2, 9, null, { maxW: 300 });
  txt('Semester', PW - RM - 170, y - 2, 9, bold);
  txt(data.header?.semester || '', PW - RM - 100, y - 2, 9, null, { maxW: 95 });

  y -= 12;
  line(LM, y, PW - RM, y);
  y -= 10;

  /* ════════ TABLE HEADER ════════ */
  /* draw header background */
  const drawCell = (x, w, h, label) => {
    rect(x, y, w, h);
    txt(label, x + 4, y + 4, 9, bold, { maxW: w - 8 });
  };

  const TH = 22; // header height
  drawCell(COL.num.x, COL.num.w, TH, 'CO #');
  drawCell(COL.state.x, COL.state.w, TH, 'Course Outcome Statement');
  drawCell(COL.ilo.x, COL.ilo.w, TH, 'Intended Learning Outcome');
  drawCell(COL.tool.x, COL.tool.w, TH, 'Assessment Tool');
  drawCell(COL.target.x, COL.target.w, TH, 'Performance Target');
  y -= TH;

  /* ════════ TABLE BODY ════════ */
  const COLS = [COL.num, COL.state, COL.ilo, COL.tool, COL.target];
  const RH = 26; // row height

  const cos = (data.cos && data.cos.length > 0) ? data.cos : [];

  cos.forEach((co, ci) => {
    const ilos = (co.ilos && co.ilos.length > 0) ? co.ilos : [{ outcome: '', assessmentTool: '' }];
    ilos.forEach((ilo, ii) => {
      const ry = y - (ii * RH);
      // draw row cells
      COLS.forEach((c) => {
        rect(c.x, ry, c.w, RH);
      });

      // content
      if (ii === 0) {
        txt(co.number, COL.num.x + 6, ry + 6, 10, bold);
        txt(co.statement, COL.state.x + 4, ry + 6, 8, null, { maxW: COL.state.w - 8 });
      }
      txt(ilo.outcome || '', COL.ilo.x + 4, ry + 6, 8, null, { maxW: COL.ilo.w - 8 });
      txt(ilo.assessmentTool || '', COL.tool.x + 4, ry + 6, 8, null, { maxW: COL.tool.w - 8 });
      txt(data.performanceTarget || '', COL.target.x + 4, ry + 6, 8, null, { maxW: COL.target.w - 8 });
    });
    y -= ilos.length * RH;
  });

  /* ════════ FOOTER ════════ */
  y -= 8;
  line(LM, y, PW - RM, y);
  y -= 8;

  txt('Prepared by:', LM, y - 2, 9, bold);
  txt(data.preparedBy || '', LM + 68, y - 2, 9, null, { maxW: 250 });
  txt('Approved by:', LM + 380, y - 2, 9, bold);
  txt(data.approvedBy || '', LM + 455, y - 2, 9, null, { maxW: 380 });

  y -= 16;
  txt('Date Submitted:', LM, y - 2, 9, bold);
  txt(data.dateSubmitted || '', LM + 90, y - 2, 9, null, { maxW: 200 });
  txt('Date:', LM + 380, y - 2, 9, bold);
  txt(data.approvalDate || '', LM + 415, y - 2, 9, null, { maxW: 400 });

  y -= 16;
  txt('Reminders:', LM, y - 2, 8, bold);
  txt(data.reminders || '', LM + 62, y - 2, 8, null, { maxW: 800 });

  y -= 14;
  txt(data.notes || '', LM + 4, y - 2, 7, null, { maxW: 840 });

  y -= 14;
  txt(`Effectivity Date: ${data.effectivityDate || ''}    Revision No.: ${data.revisionNo || '0'}    Page No.: ${data.pageNo || '1 of Y'}`,
      LM, y - 2, 8, null, { maxW: 840 });

  const pdfBytes = await doc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}
