import * as XLSX from 'xlsx';
import { API_BASE } from './api.js';
import { actingRole } from './session.js';
import { getStoredToken } from '../../../shared/api.js';

const authHeaders = (extra = {}) => {
  const role = actingRole();
  const token = getStoredToken();
  return {
    ...(role ? { 'X-LPMS-Role': role } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
};

function triggerBlobDownload(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10000);
}

// Client-side Excel template/COAEP builder using xlsx so Template & Export Excel buttons work cleanly without extra server routes.
function buildClientWorkbook(path, body) {
  const wb = XLSX.utils.book_new();
  if (path.includes('/template/coaep')) {
    const rows = [
      ['CO #', 'Course Outcome Description', 'ILO / Intended Learning Outcome', 'Assessment Task', 'Prelim %', 'Midterm %', 'Semi-Final %', 'Final %'],
      ['CO1', 'Sample Course Outcome 1', 'Sample ILO 1.1', 'Quiz / Lab Exercise', 25, 0, 0, 0],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'COAEP');
  } else if (path.includes('/template/co-po')) {
    const rows = [
      ['CO #', 'Course Outcome Description', 'PO1', 'PO2', 'PO3', 'PO4', 'PO5'],
      ['CO1', 'Sample Course Outcome 1', 'I', 'E', '', '', ''],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'CO-PO Alignment');
  } else if (path.includes('/template/po-peo')) {
    const rows = [
      ['PO #', 'Program Outcome Statement', 'Aligned PEOs (comma-separated)', 'Aligned Graduate Attributes (comma-separated)'],
      ['PO1', 'Sample Program Outcome 1', '1,2', '1,3'],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'PO-PEO Alignment');
  } else if (path.includes('/export/coaep') && body?.record) {
    const rec = body.record;
    const rows = [
      ['Course Code', rec.courseCode || ''],
      ['Course Title', rec.courseName || ''],
      ['Document Control No.', rec.docControlNo || ''],
      [],
      ['Course Outcome', 'ILO', 'Assessment Task', 'Target / Criteria'],
    ];
    (rec.courseOutcomes || rec.cos || []).forEach((co, idx) => {
      const ilos = co.ilos || co.outcomes || [];
      if (!ilos.length) {
        rows.push([`CO${idx + 1}: ${co.description || co.statement || ''}`, '', '', '']);
      } else {
        ilos.forEach((ilo) => {
          rows.push([
            `CO${idx + 1}: ${co.description || co.statement || ''}`,
            ilo.statement || ilo.description || '',
            ilo.assessment || ilo.assessmentTask || '',
            ilo.target || ilo.criteria || '',
          ]);
        });
      }
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'COAEP');
  } else {
    return null;
  }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export const downloadFromApi = async (path, name, body) => {
  const clientBlob = buildClientWorkbook(path, body);
  if (clientBlob) {
    triggerBlobDownload(clientBlob, name);
    return;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
    headers: authHeaders(body ? { 'Content-Type': 'application/json' } : {}),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  triggerBlobDownload(await res.blob(), name);
};

export const openCourseDocument = async (pcId, kind, doc) => {
  const res = await fetch(`${API_BASE}/api/course-documents?pc_offering_id=${encodeURIComponent(pcId)}&kind=${encodeURIComponent(kind)}`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const payload = await res.json();
  const first = (payload?.documents || [])[0];
  if (!first) throw new Error('Document not found');
  const content = first.parsed ? JSON.stringify(first.parsed, null, 2) : (first.parsed_json || '');
  const blob = new Blob([content], { type: 'application/json' });
  triggerBlobDownload(blob, doc?.fileName || first.file_name || `${kind}_${pcId}.json`);
};
