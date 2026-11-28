import { API_BASE } from './api.js';
import { actingRole } from './session.js';
import { getStoredToken } from '../../../shared/api.js';

const pdfLib = () => import('pdf-lib');

export const fetchFrontPages = async (programId) => {
  if (!programId) return null;
  const role = actingRole();
  const token = getStoredToken();
  const headers = {
    ...(role ? { 'X-LPMS-Role': role } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_BASE}/api/programs/${encodeURIComponent(programId)}/front-page`, {
    credentials: 'include',
    headers,
  });
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Could not load the program's front pages (HTTP ${res.status}).`);
  return res.arrayBuffer();
};

export const countPdfPages = async (bytes) => {
  const { PDFDocument } = await pdfLib();
  return (await PDFDocument.load(bytes)).getPageCount();
};

export const joinPdfs = async (...parts) => {
  const { PDFDocument } = await pdfLib();
  const out = await PDFDocument.create();
  for (const bytes of parts) {
    const doc = await PDFDocument.load(bytes);
    for (const page of await out.copyPages(doc, doc.getPageIndices())) out.addPage(page);
  }
  return out.save();
};
