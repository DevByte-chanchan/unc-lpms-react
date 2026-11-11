'use strict';

// POST /api/export/pdf   body: the export page's HTML (text/html, images embedded as data: URLs)
//                        answers the PDF (utils/pdfRenderer.js). Any signed-in user: it renders the page they send.
const express = require('express');
const router = express.Router();
const { htmlToPdf } = require('../utils/pdfRenderer');

router.post('/pdf', express.text({ type: () => true, limit: '15mb' }), async (req, res) => {
    const html = typeof req.body === 'string' ? req.body : '';
    if (!/^\s*<!doctype html|^\s*<html/i.test(html)) return res.status(400).json({ error: 'Send the export page as HTML.' });
    try {
        const pdf = await htmlToPdf(html);
        res.set('Content-Type', 'application/pdf');
        return res.send(Buffer.from(pdf));
    } catch (err) {
        console.error('PDF export failed:', err && err.message);
        return res.status(503).json({ error: 'The PDF could not be made on the server.' });
    }
});

module.exports = router;
