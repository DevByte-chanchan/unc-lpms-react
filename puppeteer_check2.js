import puppeteer from 'puppeteer';

(async () => {
    console.log("Starting full Puppeteer check...");
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
            console.log(`CONSOLE [${msg.type().toUpperCase()}]: ${msg.text()}`);
        }
    });
    page.on('pageerror', error => console.log(`PAGE_ERROR: ${error.message}`));
    page.on('requestfailed', request => console.log(`REQUEST_FAILED: ${request.url()} - ${request.failure()?.errorText}`));
    page.on('response', response => {
        if (!response.ok() && response.request().resourceType() === 'fetch' && response.status() !== 304) {
            console.log(`RESPONSE_ERROR: ${response.status()} ${response.url()}`);
        }
    });

    const runRoute = async (url, label) => {
        console.log(`\n--- ${label} (${url}) ---`);
        try {
            await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });
            await new Promise(r => setTimeout(r, 2000));
            const text = await page.evaluate(() => document.body.innerText);
            console.log(text.substring(0, 1000) + (text.length > 1000 ? '\n[...truncated]' : ''));
        } catch (e) {
            console.log(`ERROR: ${e.message}`);
        }
    };

    await runRoute('http://localhost:5173/assignedtos', 'Instructor Course List');
    await runRoute('http://localhost:5173/role/program-head/tos', 'Program Head Course List');
    await runRoute('http://localhost:5173/tos/BSCS111L', 'TOS Summary (Instructor)');
    
    // Simulate clicking Midterm and Finals dropdowns if needed, or just loading the URL is enough because we set default in states.
    // The problem is React Router passes states for these. Without state, it might fall back. Let's see what the default loads.

    await browser.close();
    console.log("Puppeteer check finished.");
})();
