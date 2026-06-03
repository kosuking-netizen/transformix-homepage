const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });

  // 日本語版
  const filePathJa = 'file:///' + path.resolve('ogp-design.html').split('\\').join('/');
  await page.goto(filePathJa, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'ogp.png', type: 'png' });
  console.log('ogp.png done');

  // 英語版
  const filePathEn = 'file:///' + path.resolve('ogp-en-design.html').split('\\').join('/');
  await page.goto(filePathEn, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'ogp-en.png', type: 'png' });
  console.log('ogp-en.png done');

  await browser.close();
})();
