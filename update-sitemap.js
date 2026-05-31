/**
 * update-sitemap.js
 * dailyフォルダのHTMLファイルを自動検出してsitemap.xmlを更新する
 * 使い方: node update-sitemap.js
 */

const fs = require('fs');
const path = require('path');

const SITE_ROOT = 'https://transformix.jp';
const DAILY_DIR = path.join(__dirname, 'daily');

// 固定ページ
const staticPages = [
  { loc: '/', changefreq: 'monthly', priority: '1.0' },
  { loc: '/en/', changefreq: 'monthly', priority: '0.9' },
  { loc: '/daily/', changefreq: 'daily', priority: '0.7' },
  { loc: '/privacy.html', changefreq: 'yearly', priority: '0.3' },
  { loc: '/en/privacy.html', changefreq: 'yearly', priority: '0.3' },
  { loc: '/tokushoho.html', changefreq: 'yearly', priority: '0.3' },
];

// daily/ 配下の記事を日付から自動取得
const dailyFiles = fs.readdirSync(DAILY_DIR)
  .filter(f => /^\d{4}-\d{2}-\d{2}\.html$/.test(f))
  .sort();

const dailyPages = dailyFiles.map(f => {
  const date = f.replace('.html', '');
  return {
    loc: `/daily/${f}`,
    lastmod: date,
    changefreq: 'never',
    priority: '0.6',
  };
});

// XML生成
const toUrl = (page) => {
  const lastmod = page.lastmod ? `\n    <lastmod>${page.lastmod}</lastmod>` : '';
  return `  <url>
    <loc>${SITE_ROOT}${page.loc}</loc>${lastmod}
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
};

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticPages, ...dailyPages].map(toUrl).join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), xml);
console.log(`✅ sitemap.xml を更新しました（${dailyPages.length}件の記事）`);
