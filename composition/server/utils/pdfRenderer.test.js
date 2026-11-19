'use strict';

// The PDF export renders HTML a user sent in the server's headless Chrome. Nothing in that page may reach the network:
// not an image, fetch, WebSocket (request interception does not see those) or a pop-up window. (node run-tests.js)
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { htmlToPdf, closeBrowser, withCsp } = require('./pdfRenderer');

test('the Content-Security-Policy goes in first, whatever shape the page has', () => {
    assert.match(withCsp('<!doctype html><html><head><title>x</title></head><body></body></html>'), /<head><meta http-equiv="Content-Security-Policy"/);
    assert.match(withCsp('<html><body>x</body></html>'), /^<html><head><meta http-equiv="Content-Security-Policy"[^>]*><\/head><body>/);
    assert.match(withCsp('<!DOCTYPE html><p>x</p>'), /^<!DOCTYPE html><meta http-equiv="Content-Security-Policy"/);
});

test('an export page cannot reach the network, by fetch, image, WebSocket or pop-up', { timeout: 90_000 }, async (t) => {
    const hits = [];
    const server = http.createServer((req, res) => { hits.push(req.url); res.end('ok'); });
    server.on('upgrade', (req, socket) => { hits.push(`ws ${req.url}`); socket.destroy(); });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const at = `127.0.0.1:${server.address().port}`;
    t.after(async () => { server.close(); await closeBrowser(); });

    const page = `<!doctype html><html><head><title>t</title></head><body>
        <p>Export</p><img src="http://${at}/img">
        <script>
            fetch('http://${at}/fetch').catch(() => {});
            try { new WebSocket('ws://${at}/ws'); } catch (e) {}
            try { window.open('http://${at}/popup'); } catch (e) {}
        </script></body></html>`;
    let pdf;
    try {
        pdf = Buffer.from(await htmlToPdf(page));
    } catch (error) {
        // No Chrome on this machine (LPMS_CHROME_PATH / puppeteer's download): nothing to check here.
        t.skip(`no headless Chrome: ${error.message}`);
        return;
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
    assert.equal(pdf.subarray(0, 4).toString(), '%PDF', 'the PDF is still made');
    assert.deepEqual(hits, [], 'nothing reached the network');
});
