import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { IloAttachment } from '../models/index.js';
import { lockGuard } from '../middleware/lockGuard.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.txt'];

const upload = multer({ 
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ALLOWED_EXTENSIONS.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, DOCX, Spreadsheets (XLSX, CSV), Images, and Text files are allowed'));
        }
    }
});

const handleUpload = (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message || 'File upload failed' });
        }
        next();
    });
};

router.post('/:code/:period/attachments', lockGuard, handleUpload, async (req, res) => {
    try {
        const { code, period } = req.params;
        const { iloId, type } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const attachment = await IloAttachment.create({
            courseCode: code,
            examPeriod: period,
            iloId: parseInt(iloId, 10),
            filename: req.file.originalname,
            filepath: req.file.filename,
            type: type || 'objective',
            size: req.file.size
        });

        res.json(attachment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:code/:period/attachments', async (req, res) => {
    try {
        const { code, period } = req.params;
        const attachments = await IloAttachment.findAll({
            where: { courseCode: code, examPeriod: period }
        });
        res.json(attachments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Replace the file of an existing attachment in place. The attachment id (and therefore
// every point row linked to it via attachmentId) is preserved.
router.put('/:code/:period/attachments/:id', lockGuard, handleUpload, async (req, res) => {
    const newFilename = req.file ? req.file.filename : null;
    const discardNewFile = () => {
        if (newFilename) {
            const p = path.join(uploadDir, newFilename);
            if (fs.existsSync(p)) fs.unlinkSync(p);
        }
    };
    try {
        const { id, code, period } = req.params;
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const attachment = await IloAttachment.findOne({
            where: { id, courseCode: code, examPeriod: period }
        });
        if (!attachment) {
            discardNewFile();
            return res.status(404).json({ error: 'Attachment not found' });
        }

        const oldFilepath = attachment.filepath;
        attachment.filename = req.file.originalname;
        attachment.filepath = req.file.filename;
        attachment.size = req.file.size;
        await attachment.save();

        // Remove the previous file from disk only after the DB update succeeded
        const oldPath = path.join(uploadDir, oldFilepath);
        if (oldFilepath && oldFilepath !== req.file.filename && fs.existsSync(oldPath)) {
            try {
                fs.unlinkSync(oldPath);
            } catch {
                // Ignore if previous file is locked or already removed
            }
        }

        res.json(attachment);
    } catch (err) {
        discardNewFile();
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:code/:period/attachments/:id', lockGuard, async (req, res) => {
    try {
        const { id, code, period } = req.params;
        const attachment = await IloAttachment.findOne({
            where: { id, courseCode: code, examPeriod: period }
        });
        if (attachment) {
            const filePath = path.join(uploadDir, attachment.filepath);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            await attachment.destroy();
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/download/:filename', async (req, res) => {
    const filePath = path.join(uploadDir, req.params.filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    // Determine the original human filename (e.g. "Prelim_Exam.docx")
    let originalName = req.query.name;
    if (!originalName) {
        try {
            const att = await IloAttachment.findOne({ where: { filepath: req.params.filename } });
            if (att?.filename) originalName = att.filename;
        } catch {
            // fallback to disk filename
        }
    }
    if (!originalName) originalName = req.params.filename;

    const ext = path.extname(req.params.filename).toLowerCase();
    if (req.query.inline === '1') {
        if (ext === '.pdf') res.setHeader('Content-Type', 'application/pdf');
        else if (ext === '.docx' || ext === '.doc') res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        else if (ext === '.xlsx') res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        else if (ext === '.xls') res.setHeader('Content-Type', 'application/vnd.ms-excel');
        else if (ext === '.csv') res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        else if (ext === '.png') res.setHeader('Content-Type', 'image/png');
        else if (ext === '.jpg' || ext === '.jpeg') res.setHeader('Content-Type', 'image/jpeg');
        else if (ext === '.webp') res.setHeader('Content-Type', 'image/webp');
        else if (ext === '.gif') res.setHeader('Content-Type', 'image/gif');
        else if (ext === '.svg') res.setHeader('Content-Type', 'image/svg+xml');
        else if (ext === '.txt') res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(originalName)}"`);
        fs.createReadStream(filePath).pipe(res);
    } else {
        // Downloads the actual, raw uploaded file with its original filename
        res.download(filePath, originalName);
    }
});

export default router;
