import puppeteer from 'puppeteer';

(async () => {
    console.log("Starting Puppeteer check...");
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
        if (!response.ok() && response.request().resourceType() === 'fetch') {
            console.log(`RESPONSE_ERROR: ${response.status()} ${response.url()}`);
        }
    });

    const routes = [
        'http://localhost:5173/', // Login / Dashboard? Wait, if no auth, just dashboard
        'http://localhost:5173/instructor',
        'http://localhost:5173/program-head',
        'http://localhost:5173/tos/BSCS314L',
        'http://localhost:5173/tos/BSCS111L'
    ];
    
    for (const url of routes) {
        console.log(`\nNavigating to ${url}...`);
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await new Promise(r => setTimeout(r, 2000)); 
            console.log(`Successfully rendered ${url}`);
        } catch (e) {
            console.log(`ERROR navigating to ${url}: ${e.message}`);
        }
    }
    await browser.close();
    console.log("Puppeteer check finished.");
})();