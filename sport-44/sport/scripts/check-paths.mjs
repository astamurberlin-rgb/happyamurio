import {readFile, stat} from 'node:fs/promises';
import assert from 'node:assert/strict';

// Resolve under the GitHub Pages project prefix, not the domain root.
const repo = new URL('../../', import.meta.url);
const origin = 'https://astamurberlin-rgb.github.io';
const prefix = '/happyamurio/sport-44/';
const pages = ['index.html', 'exercises/pull-up.html'];
const checked = new Set();
const failures = [];
async function check(ref, page) {
  if (!ref || ref.startsWith('#') || /^(data:|blob:|mailto:|tel:)/i.test(ref) || /[${}<>]/.test(ref) || /^['"]\s*\+/.test(ref)) return;
  const url = new URL(ref, origin + prefix + page);
  if (url.origin !== origin) return;
  if (!url.pathname.startsWith(prefix)) {
    // Update 38.1: shared immutable asset libraries live at the repository root.
    if(url.pathname.startsWith('/happyamurio/assets/')){const rel='../'+decodeURIComponent(url.pathname.slice('/happyamurio/'.length));if(checked.has(rel))return;checked.add(rel);try{assert.ok((await stat(new URL(rel,repo))).isFile())}catch{failures.push(`${page}: missing library file ${ref}`)}return;}
    // Кнопки соседей ведут на постоянные адреса Day и Meal в корне сайта (16.11.2026): номера их выпусков в странице нет.
    const hubs={'/happyamurio/day/':'../day/index.html','/happyamurio/meal/':'../meal/index.html'};
    if(hubs[url.pathname]){try{assert.ok((await stat(new URL(hubs[url.pathname],repo))).isFile())}catch{failures.push(`${page}: linked app page missing: ${ref}`)}return;}
    failures.push(`${page}: path escapes project prefix: ${ref}`); return;
  }
  const relative = decodeURIComponent(url.pathname.slice(prefix.length));
  if (checked.has(relative)) return;
  checked.add(relative);
  try {
    const info = await stat(new URL(relative, repo));
    assert.ok(info.isFile() || (await stat(new URL((relative ? relative.replace(/\/?$/, '/') : '') + 'index.html', repo))).isFile());
  } catch { failures.push(`${page}: missing ${relative}`); }
}
for (const page of pages) {
  const html = await readFile(new URL(page, repo), 'utf8');
  // Covers rendered attributes, template-generated links, catalog images and
  // relative URL literals used by fetch/iframes in these self-contained apps.
  for (const match of html.matchAll(/(?:src|href)\s*=\s*(["'])(.*?)\1/g)) await check(match[2], page);
  for (const match of html.matchAll(/(["'])((?:\.?\.?\/)?[a-zA-Z0-9_/-]+\.(?:json|html|js|css|png|jpg|jpeg|svg|webp|woff2?)(?:[?#][^"']*)?)\1/g)) {if(/\.download\s*=\s*$/.test(html.slice(Math.max(0,match.index-40),match.index)))continue;
    // Update 38.5: a literal glued to a base with «+» (shared/happy-links.js: BASE+'shared/apps.json') is resolved at run time against /happyamurio/, not against this page.
    if(/\+\s*$/.test(html.slice(Math.max(0,match.index-3),match.index)))continue;
    await check(match[2], page);}
}
const library='/happyamurio/assets/sport-icons/v1/';
const catalog = JSON.parse(await readFile(new URL('../assets/sport-icons/v1/catalog.json', repo), 'utf8'));
assert.ok(catalog.length>=85,'Existing icon catalog retained');
assert.equal(new Set(catalog.map(item => item.id)).size, catalog.length);
const built = await readFile(new URL('index.html', repo), 'utf8');
for (const item of catalog) {
  assert.ok(!item.src.startsWith('/')&&!item.src.includes('..'),'library-relative src: '+item.src);
  await check(library + item.src, 'index.html');
  assert.ok(built.includes(JSON.stringify(library + item.src)), `Built page misses library icon: ${item.src}`);
}
assert.ok(!built.includes('"sport-icons/'), 'No release-local icon paths remain');
// Страницы в папке выпуска — это то, что сборка даёт из исходников сейчас: руками не правлены и не устарели.
const {files} = await import('./build.mjs');
for (const [path, text] of files) {
  let onDisk = null; try { onDisk = await readFile(new URL(path, repo), 'utf8'); } catch {}
  assert.ok(onDisk === text, 'Страница не совпадает со сборкой: ' + path + ' — запустить node ' + prefix.split('/')[2] + '/sport/scripts/build.mjs');
}
// Номера выпусков Day и Meal в страницу не вшиты: их выпуск не требует пересборки Sport.
assert.doesNotMatch(built, /\/happyamurio\/(day|meal)-\d/, 'В странице Sport нет адресов Day и Meal с номером выпуска');
assert.equal(failures.length, 0, failures.join('\n'));
console.log(`Passed: ${checked.size} local paths across Sport, Day and Meal; ${catalog.length} icons from the shared library; GitHub Pages prefix; release pages match the build; no Day/Meal release numbers inside.`);
if (process.argv.includes('--list')) console.log([...checked].sort().join('\n'));
