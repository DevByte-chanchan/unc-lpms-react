const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.toString());
  });

  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure() ? request.failure().errorText : '');
  });

  const routes = [
    '/',
    '/assignedtos',
    '/tos/BSCS221L',
    '/tos/BSCS223L',
    '/role/program-head/tos'
  ];

  for (const route of routes) {
    console.log(`\nVisiting http://localhost:5173${route}`);
    await page.goto(`http://localhost:5173${route}`, { waitUntil: 'networkidle0' }).catch(e => console.log('GOTO ERR:', e.message));
    // wait a bit for react renders
    await new Promise(r => setTimeout(r, 2000));
  }

  await browser.close();
  console.log('\nDone testing routes.');
})();