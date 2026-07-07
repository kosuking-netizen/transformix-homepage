/**
 * generate-daily-html.js
 * 当日の記事データ（JSON）からdailyページ／index.htmlのHTMLを生成する。
 *
 * 背景: 従来はClaudeが当日ページの全HTML（ヘッダー・タブ・カード枠組みなど）を
 * 毎回フルテキストで書き起こしていたため出力トークンを大量に消費していた。
 * このスクリプトに「記事データ（タイトル・URL・要約など）」だけを渡せば、
 * 毎日共通の骨格（head/header/tabs/footer）はテンプレートとして自動生成する。
 * 日付一覧（#date-list等）は空のまま出力し、従来通り build-dates.js が一括同期する。
 *
 * 使い方:
 *   node generate-daily-html.js path/to/data.json
 *   → daily/{date}.html を生成
 *   node generate-daily-html.js path/to/data.json --index
 *   → daily/{date}.html と daily/index.html の両方を生成
 *
 * data.json の形式は同階層の generate-daily-html.schema.json と SKILL.md を参照。
 */

const fs = require('fs');
const path = require('path');

const DAILY_DIR = path.join(__dirname, 'daily');

const BADGE = {
  concept: { ja: '概論', en: 'Overview', cls: 'badge-concept' },
  case: { ja: '事例', en: 'Case Study', cls: 'badge-case' },
  person: { ja: '人物', en: 'Profile', cls: 'badge-person' },
};

const SECTION_META = {
  scm: { id: 'scm', cardClass: '' },
  ai: { id: 'ai', cardClass: ' card-ai' },
  football: { id: 'football', cardClass: ' card-football' },
  kyoto: { id: 'kyoto', cardClass: ' card-kyoto' },
};

function escAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escText(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderCard(article, cardClass) {
  const badge = BADGE[article.badge];
  if (!badge) throw new Error(`unknown badge type: ${article.badge}`);

  let titleHtml;
  if (article.lang === 'ja') {
    if (!article.titleEn) throw new Error(`titleEn required for ja article: ${article.title}`);
    if (!article.sourceEn) throw new Error(`sourceEn required for ja article: ${article.title}`);
    titleHtml = `<a href="${escAttr(article.url)}" target="_blank" rel="noopener noreferrer" data-ja="${escAttr(article.title)}" data-en="${escAttr(article.titleEn)}">${escText(article.title)}</a>`;
  } else {
    titleHtml = `<a href="${escAttr(article.url)}" target="_blank" rel="noopener noreferrer">${escText(article.title)}</a>`;
  }

  const sourceJa = article.lang === 'ja'
    ? `${article.source} / 日本語`
    : `${article.source} / 英語`;
  const sourceEn = article.lang === 'ja'
    ? `${article.sourceEn} / Japanese`
    : `${article.source} / English`;

  return `      <div class="card${cardClass}">
        <span class="badge ${badge.cls}" data-ja="${badge.ja}" data-en="${badge.en}">${badge.ja}</span>
        <h3>${titleHtml}</h3>
        <div class="card-source" data-ja="${escAttr(sourceJa)}" data-en="${escAttr(sourceEn)}">${escText(sourceJa)}</div>
        <div class="card-summary" data-ja="${escAttr(article.summaryJa)}" data-en="${escAttr(article.summaryEn)}">${escText(article.summaryJa)}</div>
      </div>`;
}

function renderSection(key, articles) {
  const meta = SECTION_META[key];
  const cards = articles.map(a => renderCard(a, meta.cardClass)).join('\n\n');
  return `    <div id="${meta.id}" class="section${key === 'scm' ? ' active' : ''}"><div class="cards">

${cards}

    </div></div>`;
}

function tabButton(key, label, isFirst) {
  const meta = SECTION_META[key];
  const tabClass = isFirst ? 'tab active' : `tab tab-${key === 'football' ? 'football' : key === 'kyoto' ? 'kyoto' : key}`;
  const onclick = `document.querySelectorAll('.section').forEach(function(s){s.classList.remove('active')});document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active')});document.getElementById('${meta.id}').classList.add('active');this.classList.add('active')`;
  return `      <button class="${tabClass}" onclick="${onclick.replace(/'/g, '&#39;')}" data-ja="${escAttr(label.ja)}" data-en="${escAttr(label.en)}">${escText(label.ja)}</button>`;
}

// --- メイン処理 ---

function main() {
  const dataPath = process.argv[2];
  const withIndex = process.argv.includes('--index');
  if (!dataPath) {
    console.error('使い方: node generate-daily-html.js path/to/data.json [--index]');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const { date, counts, sections } = data;
  const dateJa = `${date.slice(0, 4)}年${parseInt(date.slice(5, 7), 10)}月${parseInt(date.slice(8, 10), 10)}日`;

  // 各セクションを一度だけレンダリングして組み立て直す（buildPage内の二重処理を避ける）
  const sectionsHtml = ['scm', 'ai', 'football', 'kyoto'].map(key => renderSection(key, sections[key])).join('\n\n');
  const tabs = [
    tabButton('scm', { ja: `SCM（${counts.scm}）`, en: `SCM (${counts.scm})` }, true),
    tabButton('ai', { ja: `AI / DX（${counts.ai}）`, en: `AI / DX (${counts.ai})` }, false),
    tabButton('football', { ja: `Football（${counts.football}）`, en: `Football (${counts.football})` }, false),
    tabButton('kyoto', { ja: `東洋哲学（${counts.kyoto}）`, en: `E. Philosophy (${counts.kyoto})` }, false),
  ].join('\n');

  function render({ titleSuffix, descSuffix, ogPath, headerDateLine, dateListId }) {
    const langToggleOnclick = (lang) =>
      `var L=&#39;${lang}&#39;;document.querySelectorAll(&#39;[data-ja][data-en]&#39;).forEach(function(e){e.textContent=e.getAttribute(&#39;data-&#39;+L)});document.getElementById(&#39;btn-ja&#39;).classList.toggle(&#39;active&#39;,L===&#39;ja&#39;);document.getElementById(&#39;btn-en&#39;).classList.toggle(&#39;active&#39;,L===&#39;en&#39;);var b=document.getElementById(&#39;back-link&#39;);if(b)b.setAttribute(&#39;href&#39;,L===&#39;en&#39;?&#39;/en/&#39;:&#39;/&#39;)`;
    return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escText(titleSuffix)}</title>
<meta name="description" content="${escAttr(descSuffix)}">
<meta property="og:title" content="${escAttr(titleSuffix)}">
<meta property="og:description" content="${escAttr(descSuffix)}">
<meta property="og:type" content="article">
<meta property="og:url" content="https://transformix.jp/daily/${ogPath}">
<meta property="og:site_name" content="Transformix">
<meta name="twitter:card" content="summary">
<link rel="canonical" href="https://transformix.jp/daily/${ogPath}">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-KKLYW9GEBF"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-KKLYW9GEBF');
</script>
<link rel="stylesheet" href="/css/daily.css">
</head>
<body>
<header>
  <div class="header-inner">
    <div class="header-left">
      <a id="back-link" href="/" style="font-size:0.8rem;opacity:0.85;color:#fff;text-decoration:none;display:inline-flex;align-items:center;gap:0.3rem;margin-bottom:0.5rem;padding:0.25rem 0.6rem;border:1px solid rgba(255,255,255,0.4);border-radius:3px;" data-ja="← トップページへ" data-en="← Back to Top">← トップページへ</a>
      <h1><span data-ja="インサイト" data-en="Insights">インサイト</span></h1>
      <div style="font-size:0.78rem;opacity:0.7;margin-top:0.2rem;" data-ja="${escAttr(headerDateLine.ja)}" data-en="${escAttr(headerDateLine.en)}">${escText(headerDateLine.ja)}</div>
    </div>
    <div class="header-right">
      <div class="lang-toggle">
        <button id="btn-ja" class="active" onclick="${langToggleOnclick('ja')}">JP</button>
        <button id="btn-en" onclick="${langToggleOnclick('en')}">EN</button>
      </div>
    </div>
  </div>
</header>

<div class="layout">
  <aside class="sidebar">
    <div class="sidebar-title" data-ja="収集日一覧" data-en="Archive">収集日一覧</div>
    <ul class="date-list" id="date-list"></ul>
  </aside>

  <div class="main-content">
    <button class="archive-toggle" id="archive-toggle" onclick="document.getElementById(&#39;mobile-archive&#39;).classList.toggle(&#39;open&#39;)" data-ja="📅 過去の記事" data-en="📅 Past Articles">📅 過去の記事</button>
    <div class="mobile-archive" id="mobile-archive">
      <ul id="mobile-date-list"></ul>
    </div>
    <div class="tabs">
${tabs}
    </div>

${sectionsHtml}

  </div>
</div>

<footer>
  <div class="footer-inner">
    <p data-ja="© 2026 Transformix合同会社" data-en="© 2026 Transformix LLC">© 2026 Transformix合同会社</p>
    <p><a href="https://transformix.jp" data-ja="transformix.jp" data-en="transformix.jp">transformix.jp</a></p>
  </div>
</footer>

</body>
</html>
`;
  }

  const dailyHtml = render({
    titleSuffix: `Transformix Insights ${date} — SCM・AI/DX・Football記事まとめ`,
    descSuffix: `${dateJa}のSCM計画・AI/DX経営・Football×ビジネス・東洋哲学の注目記事をTransformixが厳選してまとめました。`,
    ogPath: `${date}.html`,
    headerDateLine: { ja: dateJa, en: date },
  });

  const outPath = path.join(DAILY_DIR, `${date}.html`);
  fs.writeFileSync(outPath, dailyHtml, 'utf8');
  console.log(`生成完了: ${outPath}`);

  if (withIndex) {
    const indexHtml = render({
      titleSuffix: 'Transformix Insights — SCM・AI/DX・Football・東洋哲学の最新記事',
      descSuffix: 'SCM計画・AI/DX経営・Football×ビジネス・東洋哲学の最新の注目記事をTransformixが厳選してまとめました。',
      ogPath: '',
      headerDateLine: { ja: `更新日：${dateJa}`, en: `Updated: ${date}` },
    });
    const indexPath = path.join(DAILY_DIR, 'index.html');
    fs.writeFileSync(indexPath, indexHtml, 'utf8');
    console.log(`生成完了: ${indexPath}`);
  }
}

main();
