import {readFile, stat} from 'node:fs/promises';
import assert from 'node:assert/strict';

// Resolve under the GitHub Pages project prefix, not the domain root.
const repo = new URL('../../', import.meta.url);
const origin = 'https://astamurberlin-rgb.github.io';
const prefix = '/happyamurio/sport-41/';
const pages = ['sport/index.html', 'sport/exercises/pull-up.html'];
const checked = new Set();
const failures = [];
async function check(ref, page) {
  if (!ref || ref.startsWith('#') || /^(data:|blob:|mailto:|tel:)/i.test(ref) || /[${}<>]/.test(ref) || /^['"]\s*\+/.test(ref)) return;
  const url = new URL(ref, origin + prefix + page);
  if (url.origin !== origin) return;
  if (!url.pathname.startsWith(prefix)) {
    // Update 38.1: shared immutable asset libraries live at the repository root.
    if(url.pathname.startsWith('/happyamurio/assets/')){const rel='../'+decodeURIComponent(url.pathname.slice('/happyamurio/'.length));if(checked.has(rel))return;checked.add(rel);try{assert.ok((await stat(new URL(rel,repo))).isFile())}catch{failures.push(`${page}: missing library file ${ref}`)}return;}
    // Update 38: linked apps open the published sibling releases on the same origin.
    // Update 38.4: the linked releases are the current Day/Meal entries from shared/apps.json (filled at build time).
    const apps=JSON.parse(await readFile(new URL('../shared/apps.json',repo),'utf8')),siblings={};for(const app of ['day','meal']){const dir=apps[app].entry.split('/')[0];siblings['/happyamurio/'+dir+'/']='../'+dir+'/index.html';}
    if(siblings[url.pathname]){try{assert.ok((await stat(new URL(siblings[url.pathname],repo))).isFile())}catch{failures.push(`${page}: linked release missing: ${ref}`)}return;}
    if(['/day/','/meal/','/prototypes/happy-icon-studio.html'].includes(url.pathname))return;
    failures.push(`${page}: path escapes project prefix: ${ref}`); return;
  }
  const relative = decodeURIComponent(url.pathname.slice(prefix.length));
  if(['day/','meal/','prototypes/happy-icon-studio.html'].includes(relative))return;
  if (checked.has(relative)) return;
  checked.add(relative);
  try {
    const info = await stat(new URL(relative, repo));
    assert.ok(info.isFile() || (await stat(new URL(relative.replace(/\/?$/, '/') + 'index.html', repo))).isFile());
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
const built = await readFile(new URL('sport/index.html', repo), 'utf8');
for (const item of catalog) {
  assert.ok(!item.src.startsWith('/')&&!item.src.includes('..'),'library-relative src: '+item.src);
  await check(library + item.src, 'sport/index.html');
  assert.ok(built.includes(JSON.stringify(library + item.src)), `Built page misses library icon: ${item.src}`);
}
assert.ok(!built.includes('"sport-icons/'), 'No release-local icon paths remain');
assert.equal(await readFile(new URL('sport/index.html', repo), 'utf8'),
  await readFile(new URL('sport/dist/index.html', repo), 'utf8'), 'Stale Pages build');
assert.equal(failures.length, 0, failures.join('\n'));
console.log(`Passed: ${checked.size} local paths across Sport, Day and Meal; ${catalog.length} icons from the shared library; GitHub Pages prefix; deployed build matches source output.`);
if (process.argv.includes('--list')) console.log([...checked].sort().join('\n'));
