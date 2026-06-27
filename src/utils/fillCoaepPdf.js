import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Coordinates (pts) measured from bottom-left, page = 936 x 612 pts
const Y0 = 612; // top of page
const L = 52;   // left margin approx

// Y positions for each text field
const POS = {
  facultyName:     { x: L + 90, y: Y0 - 97 },
  schoolYear:      { x: 600,    y: Y0 - 97 },
  course:          { x: L + 58, y: Y0 - 113 },
  semester:        { x: 620,    y: Y0 - 113 },

  // Table header
  // CO number
  coNum_X: L + 8,
  // Course Outcome Statement
  coStatement_X: L + 36,
  coStatement_W: 170,
  // ILO
  ilo_X: L + 225,
  ilo_W: 205,
  // Assessment Tool
  assessment_X: L + 445,
  assessment_W: 165,
  // Performance Target
  target_X: L + 625,
  target_W: 200,

  // Row Y positions (CO rows, each row ~28 pts apart)
  rowStartY: Y0 - 152,
  rowH: 28,

  // Footer
  preparedBy:      { x: L + 78, y: 92 },
  dateSubmitted:   { x: L + 98, y: 76 },
  approvedBy:      { x: 490,    y: 92 },
  approvalDate:    { x: 510,    y: 76 },
  reminders:       { x: L + 70, y: 52 },
  notes:           { x: L + 4,  y: 32 },
};

export async function fillCoaepPdf(data) {
  const response = await fetch('/coaep-template.pdf');
  const templateBuf = await response.arrayBuffer();
  const pdfDoc = await PDFDocument.load(templateBuf);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pages = pdfDoc.getPages();
  const page = pages[0];
  const { width, height } = page.getSize();

  const draw = (x, y, text, opts = {}) => {
    const f = opts.bold ? boldFont : font;
    const size = opts.size || 10;
    const color = opts.color || rgb(0, 0, 0);
    page.drawText(String(text || ''), {
      x, y, size, font: f, color,
      maxWidth: opts.maxWidth || 500,
    });
  };

  // === Header fields ===
  draw(POS.facultyName.x, POS.facultyName.y, data.header.facultyName, { size: 11 });
  draw(POS.schoolYear.x, POS.schoolYear.y, data.header.schoolYear, { size: 11 });
  draw(POS.course.x, POS.course.y, data.header.course, { size: 11 });
  draw(POS.semester.x, POS.semester.y, data.header.semester, { size: 11 });

  // === Table Body ===
  const cos = (data.cos && data.cos.length > 0) ? data.cos : [];

  cos.forEach((co, coIdx) => {
    const baseY = POS.rowStartY - (coIdx * POS.rowH * 3);
    const ilos = co.ilos && co.ilos.length > 0 ? co.ilos : [{ outcome: '', assessmentTool: '' }];

    ilos.forEach((ilo, iloIdx) => {
      const y = baseY - (iloIdx * POS.rowH);

      // CO number (first row only)
      if (iloIdx === 0) {
        draw(POS.coNum_X, y + 6, co.number, { bold: true, size: 11 });
      }

      // ILO outcome
      draw(POS.ilo_X, y + 6, ilo.outcome || '', { size: 9, maxWidth: POS.ilo_W });

      // Assessment tool
      draw(POS.assessment_X, y + 6, ilo.assessmentTool || '', { size: 9, maxWidth: POS.assessment_W });

      // Performance Target (first row of each CO)
      if (iloIdx === 0) {
        draw(POS.target_X, y + 6, data.performanceTarget || '', { size: 9, maxWidth: POS.target_W });
      }

      // Course Outcome Statement (first row only, spans 3 ilo rows)
      if (iloIdx === 0) {
        draw(POS.coStatement_X, y + 6, co.statement || '', { size: 9, maxWidth: POS.coStatement_W });
      }
    });
  });

  // === Footer ===
  draw(POS.preparedBy.x, POS.preparedBy.y, data.preparedBy || '', { size: 11 });
  draw(POS.dateSubmitted.x, POS.dateSubmitted.y, data.dateSubmitted || '_______________', { size: 11 });
  draw(POS.approvedBy.x, POS.approvedBy.y, data.approvedBy || '', { size: 11 });
  draw(POS.approvalDate.x, POS.approvalDate.y, data.approvalDate || '', { size: 11 });
  draw(POS.reminders.x, POS.reminders.y, data.reminders || '', { size: 9 });
  draw(POS.notes.x, POS.notes.y, data.notes || '', { size: 8, maxWidth: 850 });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}
