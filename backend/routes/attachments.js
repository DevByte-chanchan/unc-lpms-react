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

const upload = multer({ 
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.pdf' || ext === '.docx') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and DOCX files are allowed'));
        }
    }
});

router.post('/:code/:period/attachments', lockGuard, upload.single('file'), async (req, res) => {
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
router.put('/:code/:period/attachments/:id', lockGuard, upload.single('file'), async (req, res) => {
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
        if (oldFilepath !== req.file.filename && fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
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

router.get('/download/:filename', (req, res) => {
    const filePath = path.join(uploadDir, req.params.filename);
    if (fs.existsSync(filePath)) {
        if (req.query.inline === '1' && path.extname(req.params.filename).toLowerCase() === '.pdf') {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline');
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.download(filePath);
        }
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

export default router;
