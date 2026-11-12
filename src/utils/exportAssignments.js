// Course Assignment > Download: the final list as Excel (made by the server)
// or as a PDF in the UNC form layout (made here, like the TOS export:
// HTML → off-screen page → html2canvas → jsPDF, utils/pdfExport.js).
// Both come from GET /course-offering-assignments/export, so they agree.
import { CourseOfferingAssignmentsAPI } from '../services/api.js';
import { buildAssignmentsPdfHtml } from './assignmentsPdfHtml.js';
import { getSealDataUrl } from './sealDataUrl.js';
import { renderDocumentToPdf, saveBytes } from './pdfExport.js';

function saveBlob(blob, fileName) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10000);
}

/** Course-Assignments_<PROGRAM>_<Term>.xlsx */
export async function downloadAssignmentsXlsx(periodId, programId) {
  const { blob, fileName } = await CourseOfferingAssignmentsAPI.exportXlsx(periodId, programId);
  saveBlob(blob, fileName || 'Course-Assignments.xlsx');
}

/** Course-Assignments_<PROGRAM>_<Term>.pdf */
export async function downloadAssignmentsPdf(periodId, programId) {
  const [data, logo] = await Promise.all([
    CourseOfferingAssignmentsAPI.exportRows(periodId, programId),
    getSealDataUrl(),
  ]);
  const url = URL.createObjectURL(new Blob([buildAssignmentsPdfHtml(data, logo)], { type: 'text/html;charset=utf-8' }));
  try {
    const { bytes } = await renderDocumentToPdf(url);
    saveBytes(bytes, (data.file_base || 'Course-Assignments') + '.pdf');
  } finally {
    URL.revokeObjectURL(url);
  }
}
