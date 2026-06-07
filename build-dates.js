/**
 * build-dates.js
 * 日付一覧（アーカイブ）を全 daily ページに「静的HTML」で同期する。
 *
 * 背景: Cloudflare Rocket Loader が <script> を無効化するため、日付一覧は
 * JavaScript ではなく静的HTMLで各ページに直接埋め込む方針。新しい記事を
 * 追加したら、全ページの一覧にもその日付を反映しないと「過去記事に飛べない」
 * 状態になる。このスクリプトが全ページの #date-list / #mobile-date-list を
 * 正しい一覧に再生成し、各ページは自分の日付（index は最新日）を today 表示にする。
 *
 * 使い方: node build-dates.js
 * （今日のページ {YYYY-MM-DD}.html を作成・保存した後に実行する）
 */

const fs = require('fs');
const path = require('path');

const DAILY_DIR = path.join(__dirname, 'daily');

// 1) daily/ 配下の日付ページを新しい順に取得
const dates = fs.readdirSync(DAILY_DIR)
  .filter(f => /^\d{4}-\d{2}-\d{2}\.html$/.test(f))
  .map(f => f.replace('.html', ''))
  .sort()
  .reverse(); // 新しい順

if (dates.length === 0) {
  console.error('日付ページが見つかりません。');
  process.exit(1);
}
const newest = dates[0];

// 2) 指定 active 日付で <li> 群を生成
function buildList(active) {
  return dates.map(d => {
    const cls = d === active ? ' class="today"' : '';
    return `<li><a href="/daily/${d}.html"${cls}>${d}</a></li>`;
  }).join('');
}

// 3) 各 HTML の #date-list / #mobile-date-list を置換
const listRe = /(<ul class="date-list" id="date-list">)[\s\S]*?(<\/ul>)/;
const mobileRe = /(<ul id="mobile-date-list">)[\s\S]*?(<\/ul>)/;

let changed = 0;
const files = fs.readdirSync(DAILY_DIR).filter(f => f.endsWith('.html'));
for (const f of files) {
  const fp = path.join(DAILY_DIR, f);
  let html = fs.readFileSync(fp, 'utf8');
  const before = html;

  // index.html は最新日を today、記事ページは自分の日付を today
  const active = (f === 'index.html') ? newest : f.replace('.html', '');
  const lis = buildList(active);

  if (listRe.test(html)) html = html.replace(listRe, `$1${lis}$2`);
  if (mobileRe.test(html)) html = html.replace(mobileRe, `$1${lis}$2`);

  // index.html の更新日表記も最新日に揃える
  if (f === 'index.html') {
    const [y, m, d] = newest.split('-');
    const ja = `更新日：${y}年${Number(m)}月${Number(d)}日`;
    const en = `Updated: ${newest}`;
    html = html.replace(/data-ja="更新日：[^"]*" data-en="Updated: [0-9-]*">[^<]*/,
      `data-ja="${ja}" data-en="${en}">${ja}`);
  }

  if (html !== before) {
    fs.writeFileSync(fp, html);
    changed++;
  }
}

console.log(`✅ 日付一覧を同期しました（対象 ${dates.length} 日 / 更新 ${changed} ファイル / 最新 ${newest}）`);
