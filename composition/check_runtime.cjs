const puppeteer = require('puppeteer');
(async () => {
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    page.on('pageerror', err => console.log('PAGE_ERROR:', err.toString()));
    page.on('console', msg => {
      if(msg.type() === 'error') console.log('CONSOLE_ERROR:', msg.text());
    });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 5000 });
    await browser.close();
  } catch (e) {
    console.log('SCRIPT_ERROR:', e);
  }
  process.exit(0);
})();
