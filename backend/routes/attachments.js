import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { IloAttachment } from '../models/index.js';
import { lockGuard } from '../middleware/lockGuard.js';

const router = Router();

const uploadDir = path.join(process.cwd(), 'uploads');
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
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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
        res.download(filePath);
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

export default router;
