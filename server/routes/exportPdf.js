const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');

router.post('/export-pdf', async (req, res) => {
  try {
    const { html } = req.body;
    if (!html) {
      return res.status(400).json({ error: 'Missing html in request body' });
    }
    console.log('PDF export: received', html.length, 'bytes of HTML');

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    console.log('PDF export: browser launched');

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });
    console.log('PDF export: content set');

    const pdf = await page.pdf({
      format: undefined,
      width: '330mm',
      height: '216mm',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      landscape: false,
      pageRanges: '',
    });

    await browser.close();
    console.log('PDF export: generated', pdf.length, 'bytes');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="syllabus.pdf"',
      'Content-Length': pdf.length,
    });
    res.send(pdf);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'PDF generation failed: ' + (err.message || err) });
  }
});

module.exports = router;
