'use strict';

// HTML -> PDF with headless Chrome (puppeteer): the exports' pages come out as real lines and text, sharp and
// small, the same from every browser (the browser-side download only had page pictures).
//
// The HTML is the signed-in user's own export page, but it is still untrusted input to a browser running on the
// server, so: no request leaves the page (only data: URLs load, so images must be embedded), its scripts run (the
// coverage pages are laid out by one) with no network and no file access, one page renders at a time, and a
// render that takes too long is stopped.
//
// LPMS_CHROME_PATH: a Chrome / Chromium to use instead of puppeteer's own download (the Docker image sets it).

const RENDER_TIMEOUT_MS = 60_000;
let browserPromise = null;
let queue = Promise.resolve();

const browser = () => {
    if (!browserPromise) {
        const puppeteer = require('puppeteer');
        browserPromise = puppeteer.launch({
            headless: 'shell',
            executablePath: process.env.LPMS_CHROME_PATH || undefined,
            args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
        }).then((b) => {
            b.on('disconnected', () => { browserPromise = null; });
            return b;
        }).catch((err) => { browserPromise = null; throw err; });
    }
    return browserPromise;
};

const render = async (html) => {
    const page = await (await browser()).newPage();
    try {
        await page.setRequestInterception(true);
        page.on('request', (req) => (req.url().startsWith('data:') ? req.continue() : req.abort()));
        page.setDefaultTimeout(RENDER_TIMEOUT_MS);
        await page.setContent(html, { waitUntil: 'load', timeout: RENDER_TIMEOUT_MS });
        // the coverage pages re-pack themselves after load (REPAG_SCRIPT in client/src/utils/syllabusPdfHtml.js)
        await new Promise((resolve) => setTimeout(resolve, 300));
        return await page.pdf({ preferCSSPageSize: true, printBackground: true, timeout: RENDER_TIMEOUT_MS });
    } finally {
        await page.close().catch(() => {});
    }
};

// One render at a time; a failed one does not block the next.
const htmlToPdf = (html) => {
    const run = queue.then(() => render(html));
    queue = run.catch(() => {});
    return run;
};

const closeBrowser = async () => {
    if (!browserPromise) return;
    const b = await browserPromise.catch(() => null);
    browserPromise = null;
    if (b) await b.close().catch(() => {});
};

module.exports = { htmlToPdf, closeBrowser };
