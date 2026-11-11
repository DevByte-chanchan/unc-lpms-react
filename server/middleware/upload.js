/**
 * Multer upload middleware.
 *
 * Files land in server/uploads/ with a timestamped filename so two
 * users uploading the same workbook name don't collide. The
 * controller is responsible for removing the file once it has been
 * parsed (see safeUnlink in utils/excelParser.js).
 */
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${ts}-${safe}`);
  },
});

const ALLOWED = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel',                                         // .xls
  'text/csv',
  'application/csv',
  'application/octet-stream', // some browsers send this for .xlsx
]);

export const uploadExcel = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.csv'].includes(ext) || ALLOWED.has(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error(`Unsupported file type: ${file.originalname}`));
  },
});

/**
 * PDF uploads (University VMGO). Same temp directory and 10 MB cap as
 * uploadExcel. The filter only sees the name and declared type — the
 * `%PDF-` magic bytes are checked by assertPdfMagic once the file is on
 * disk, since a renamed file passes both of these.
 */
export const uploadPdf = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf' && ['application/pdf', 'application/octet-stream'].includes(file.mimetype)) {
      return cb(null, true);
    }
    const err = new Error(`Only PDF files are accepted: ${file.originalname}`);
    err.status = 400;
    cb(err);
  },
});

/**
 * Course Offerings upload: one spreadsheet, OR the registrar's Program of Study
 * PDFs (usually two: 1st–2nd Year and 3rd–4th Year). Field name `file`, up to 4.
 * uploadCourses sorts out which path a request takes; a PDF's `%PDF-` magic is
 * checked there once it is on disk.
 */
export const uploadCourseFiles = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 4 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.csv', '.pdf'].includes(ext) || ALLOWED.has(file.mimetype) || file.mimetype === 'application/pdf') {
      return cb(null, true);
    }
    const err = new Error(`Unsupported file type: ${file.originalname}`);
    err.status = 400;
    cb(err);
  },
}).array('file', 4);

/**
 * One spreadsheet OR one PDF (the registrar's Subject Offerings in either
 * form), field `file`. The PDF's `%PDF-` magic is checked once it is on disk.
 */
export const uploadSheetOrPdf = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.csv', '.pdf'].includes(ext) || ALLOWED.has(file.mimetype) || file.mimetype === 'application/pdf') {
      return cb(null, true);
    }
    const err = new Error(`Unsupported file type: ${file.originalname}`);
    err.status = 400;
    cb(err);
  },
});

/** True when the file on disk starts with the PDF signature `%PDF-`. */
export function hasPdfMagic(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(5);
    fs.readSync(fd, buf, 0, 5, 0);
    return buf.toString('latin1') === '%PDF-';
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * School calendar (VPAA): one picture (PNG, JPG, WEBP) or PDF, field `file`.
 * The name only lets it through; the first bytes decide what it is
 * (services/schoolCalendars.js), so a renamed file is refused there.
 */
export const CALENDAR_TYPES_MESSAGE = 'Upload a PNG, JPG or WEBP picture, or a PDF, of the school calendar.';
export const uploadCalendar = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.webp', '.pdf'].includes(ext)) return cb(null, true);
    const err = new Error(CALENDAR_TYPES_MESSAGE);
    err.status = 400;
    return cb(err);
  },
}).single('file');
