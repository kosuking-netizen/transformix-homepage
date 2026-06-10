/**
 * fix-og-tags.js
 * OGタグが未設定の古いdaily記事にOGタグを追加する
 */

const fs = require('fs');
const path = require('path');

const DAILY_DIR = path.join(__dirname, 'daily');
const SITE_ROOT = 'https://transformix.jp';

const files = fs.readdirSync(DAILY_DIR)
  .filter(f => /^\d{4}-\d{2}-\d{2}\.html$/.test(f));

let fixed = 0;

files.forEach(f => {
  const filePath = path.join(DAILY_DIR, f);
  let html = fs.readFileSync(filePath, 'utf8');
  const date = f.replace('.html', '');
  const url = `${SITE_ROOT}/daily/${f}`;

  // すでにog:urlがあればスキップ
  if (html.includes('og:url')) return;

  const ogTags = `<meta property="og:title" content="${getTitle(html)}">
<meta property="og:description" content="${getDesc(html)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="Transformix">
<meta property="og:image" content="https://transformix.jp/ogp.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://transformix.jp/ogp.png">
<link rel="canonical" href="${url}">`;

  // <title>タグの直後に挿入
  html = html.replace(/(<title>[^<]*<\/title>)/, `$1\n${ogTags}`);
  fs.writeFileSync(filePath, html);
  fixed++;
  console.log(`✅ ${f}`);
});

console.log(`\n${fixed}件を更新しました`);

function getTitle(html) {
  const m = html.match(/<title>([^<]*)<\/title>/);
  return m ? m[1].replace(/"/g, '&quot;') : 'Transformix Insights';
}

function getDesc(html) {
  const m = html.match(/<meta name="description" content="([^"]*)"/);
  return m ? m[1] : 'Transformixが厳選したSCM・AI/DX・Football・東洋哲学の注目記事まとめ。';
}
