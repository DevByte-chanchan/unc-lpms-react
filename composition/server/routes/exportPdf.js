const express = require('express');
const router = express.Router();

// Renders the syllabus HTML to a crisp, vector PDF (long-bond landscape, 330×216mm)
// that matches the on-screen layout and the official template.
//
// Puppeteer is loaded lazily so this route never prevents the server from starting
// when puppeteer/Chrome isn't installed. In that case it returns 501 and the client
// automatically falls back to its in-browser generator.
router.post('/export-pdf', async (req, res) => {
  const { html } = req.body || {};
  if (!html) {
    return res.status(400).json({ error: 'Missing html in request body' });
  }

  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (e) {
    return res.status(501).json({ error: 'puppeteer not installed (run: cd server && npm install puppeteer)' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 20000 });
    const pdf = await page.pdf({
      width: '330mm',
      height: '216mm',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      landscape: false,
      preferCSSPageSize: true,
    });
    await browser.close();
    browser = null;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="syllabus.pdf"',
      'Content-Length': pdf.length,
    });
    res.send(pdf);
  } catch (err) {
    if (browser) { try { await browser.close(); } catch { /* noop */ } }
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'PDF generation failed: ' + (err.message || err) });
  }
});

module.exports = router;
