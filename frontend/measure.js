const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    const widths = [320, 360, 375, 390, 430];
    for (const w of widths) {
      await page.setViewport({ width: w, height: 800 });
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 30000 }).catch(e => {
        console.error('Goto failed for', w, e.message);
      });
      
      const res = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const sw = document.documentElement.scrollWidth;
        const bw = document.body.scrollWidth;
        
        const allElements = document.querySelectorAll('*');
        const offenders = [];
        allElements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.right > vw + 1) {
            offenders.push({
              tag: el.tagName,
              className: el.className ? (typeof el.className === 'string' ? el.className.substring(0, 100) : '') : '',
              right: Math.round(rect.right),
              width: Math.round(rect.width)
            });
          }
        });
        
        return { vw, sw, bw, isOverflowing: sw > vw, offenders };
      });
      console.log(`\n--- Width: ${w} ---`);
      console.log(`Viewport: ${res.vw}, ScrollWidth: ${res.sw}`);
      if (res.isOverflowing) {
        console.log('Offenders:', res.offenders);
      } else {
        console.log('No overflow.');
      }
    }
    
    await browser.close();
  } catch (err) {
    console.error('Puppeteer script error:', err);
  }
})();
