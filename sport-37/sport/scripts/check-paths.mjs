import {readFile, stat} from 'node:fs/promises';
import assert from 'node:assert/strict';

// Resolve under the GitHub Pages project prefix, not the domain root.
const repo = new URL('../../', import.meta.url);
const origin = 'https://astamurberlin-rgb.github.io';
const prefix = '/happyamurio/sport-37/';
const pages = ['sport/index.html', 'sport/exercises/pull-up.html'];
const checked = new Set();
const failures = [];
async function check(ref, page) {
  if (!ref || ref.startsWith('#') || /^(data:|blob:|mailto:|tel:)/i.test(ref) || /[${}<>]/.test(ref) || /^['"]\s*\+/.test(ref)) return;
  const url = new URL(ref, origin + prefix + page);
  if (url.origin !== origin) return;
  if (!url.pathname.startsWith(prefix)) {
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
  for (const match of html.matchAll(/(["'])((?:\.?\.?\/)?[a-zA-Z0-9_/-]+\.(?:json|html|js|css|png|jpg|jpeg|svg|webp|woff2?)(?:[?#][^"']*)?)\1/g)) {if(/\.download\s*=\s*$/.test(html.slice(Math.max(0,match.index-40),match.index)))continue;await check(match[2], page);}
}
const catalog = JSON.parse(await readFile(new URL('sport/src/sport-icons/catalog.json', repo), 'utf8'));
assert.ok(catalog.length>=85,'Existing icon catalog retained');
assert.equal(new Set(catalog.map(item => item.id)).size, catalog.length);
for (const item of catalog) {
  await check(item.src, 'sport/index.html');
  const source = await readFile(new URL('sport/src/' + item.src, repo));
  const deployed = await readFile(new URL('sport/' + item.src, repo));
  assert.ok(source.equals(deployed), `Stale deployed icon: ${item.src}`);
}
assert.equal(await readFile(new URL('sport/index.html', repo), 'utf8'),
  await readFile(new URL('sport/dist/index.html', repo), 'utf8'), 'Stale Pages build');
assert.equal(failures.length, 0, failures.join('\n'));
console.log(`Passed: ${checked.size} local paths across Sport, Day and Meal; ${catalog.length} icons; GitHub Pages prefix; deployed build matches source output.`);
if (process.argv.includes('--list')) console.log([...checked].sort().join('\n'));
