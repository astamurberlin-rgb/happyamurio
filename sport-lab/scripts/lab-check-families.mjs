/* Lab 10.11.2026 · Browser check of the pull-up family: one library card, five pills, the chosen pill is what gets
   added; neutral-pull-up is a card of its own; exercises without a picture show the placeholder. Needs Chrome and Playwright; serve the repository at /happyamurio/ and pass the address:
   node scripts/lab-check-families.mjs http://127.0.0.1:8765/happyamurio/sport-lab/ */
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(process.env.PLAYWRIGHT_ROOT || '/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
const logs = [];
page.on('pageerror', e => logs.push('pageerror: ' + String(e).slice(0, 300)));
await page.goto(process.argv[2] || 'http://127.0.0.1:8765/happyamurio/sport-lab/', { waitUntil: 'load' });
await page.waitForTimeout(1200);
const title = () => page.$eval('.exercise-context-title', e => e.textContent);
const lib = async q => { await page.getByText('Библиотека', { exact: true }).last().click(); await page.waitForTimeout(300); await page.fill('#library-search', q); await page.waitForTimeout(400);
  return page.$$eval('[data-action="exercise-detail"]', els => els.map(e => e.dataset.id + '|' + e.querySelector('h3').textContent)); };
// 1. search by variant words opens the family on that pill
let cards = await lib('обратным'); console.log('обратным →', cards.join(' ; ')); assert.deepEqual(cards, ['chin-up|Подтягивания']);
const neutral = ['neutral-pull-up|Подтягивание на параллельных рукоятях'];
for(const q of ['нейтральным', 'нейтральный', 'параллельных', 'параллельные рукояти']){ cards = await lib(q); console.log(q + ' →', cards.join(' ; ')); assert.deepEqual(cards, neutral); }
cards = await lib('широким'); console.log('широким →', cards.join(' ; ')); assert.deepEqual(cards, ['wide-pull-up|Подтягивания']);
cards = await lib('узким'); console.log('узким →', cards.join(' ; '));
// 1a. neutral-pull-up: its own card and page, no pills; «Добавить в тренировку» opens Add for it
cards = await lib('параллельных');
await page.click('[data-action="exercise-detail"]'); await page.waitForTimeout(1200);
assert.equal(await title(), 'Подтягивание на параллельных рукоятях');
let f = page.frames().find(x => /\/neutral-pull-up\.html/.test(x.url()));
assert.ok(f, 'neutral-pull-up page is framed');
assert.equal(await f.$eval('#variantBar', e => e.hidden), true);
assert.equal(await f.$eval('#variantsTitle', e => e.textContent), 'Хват и акцент');
console.log('neutral explain:', await f.$eval('#variantExplain', e => e.innerText.replace(/\n+/g,' | ')));
assert.match(await f.$eval('#variantExplain', e => e.innerText), /ладони друг к другу/);
await f.click('#addExercise'); await page.waitForTimeout(700);
assert.equal(await page.$eval('[data-exercise-context-tab="configure"]', e => e.getAttribute('aria-selected')), 'true');
assert.equal(await title(), 'Подтягивание на параллельных рукоятях');
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
// 1b. the family card: five pills
cards = await lib('широким');
assert.match(await page.$eval('[data-action="exercise-detail"] small', e => e.textContent), /^5 вариантов хвата · /);
await page.click('[data-action="exercise-detail"]'); await page.waitForTimeout(1200);
f = page.frames().find(x => /\/pull-up\.html/.test(x.url()));
const pills = await f.$$eval('.variantChip', els => els.map(e => e.textContent)); console.log('pills:', pills.join(' · '));
assert.deepEqual(pills, ['Прямой', 'Прямой широкий', 'Прямой узкий', 'Обратный', 'Обратный узкий']);
assert.equal(await f.$eval('[aria-pressed=true]', e => e.textContent), 'Прямой широкий');
// 2. choose another pill → title follows
await f.click('[data-variant="chin-up-narrow"]'); await page.waitForTimeout(300);
assert.equal(await title(), 'Подтягивание узким обратным хватом');
console.log('explain:', await f.$eval('#variantExplain', e => e.innerText.replace(/\n+/g,' | ')));
// 3. phases: tap phase 2 → caption
await f.click('.tip[data-phase="1"]'); await page.waitForTimeout(200);
assert.equal(await f.$eval('#phaseCaption', e => e.textContent), 'Подъём · выдох');
await f.click('.tip[data-phase="3"]'); assert.equal(await f.$eval('#phaseCaption', e => e.textContent), 'Вниз · вдох');
// 4. History tab is the variant's
await page.click('[data-exercise-context-tab="history"]'); await page.waitForTimeout(500);
assert.equal(await title(), 'Подтягивание узким обратным хватом');
assert.equal(await page.evaluate(() => exerciseContext.id), 'chin-up-narrow');
// back to instructions keeps the pill
await page.click('[data-exercise-context-tab="instructions"]'); await page.waitForTimeout(1000);
f = page.frames().find(x => /\/pull-up\.html/.test(x.url())); assert.equal(await f.$eval('[aria-pressed=true]', e => e.textContent), 'Обратный узкий');
// 5. «Добавить в тренировку» on the page → Add tab for the chosen pill → into «Турники»
await f.click('[data-variant="wide-pull-up"]'); await page.waitForTimeout(200);
await f.click('#addExercise'); await page.waitForTimeout(700);
assert.equal(await title(), 'Подтягивание широким хватом');
assert.equal(await page.$eval('[data-exercise-context-tab="configure"]', e => e.getAttribute('aria-selected')), 'true');
const options = await page.$$eval('select[name=addDestination] option', els => els.map(o => o.value + '=' + o.textContent)); console.log('куда:', options.join(' ; '));
const bars = options.find(o => /Турники/.test(o)).split('=')[0];
await page.selectOption('select[name=addDestination]', bars);
await page.click('button[name=saveMode][value=add]'); await page.waitForTimeout(600);
const tpl = await page.evaluate(() => { const t = templates().find(t => t.title === 'Турники'); return t.items.map(i => i[0] + ':' + (i[3]?.name || '')); });
console.log('Турники:', tpl.join(' ; ')); assert.ok(tpl.includes('wide-pull-up:Подтягивание широким хватом'));
// 6. add narrow overhand into a new current workout
cards = await lib('подтяг'); await page.click('[data-action="exercise-detail"][data-id="pull-up"]'); await page.waitForTimeout(1200);
f = page.frames().find(x => /\/pull-up\.html/.test(x.url())); await f.click('[data-variant="pull-up-narrow"]'); await f.click('#addExercise'); await page.waitForTimeout(600);
await page.click('button[name=saveMode][value=add]'); await page.waitForTimeout(800);
const active = await page.evaluate(() => state.active?.exercises.map(e => e.id + ':' + e.name));
console.log('текущая тренировка:', active); assert.deepEqual(active, ['pull-up-narrow:Подтягивание узким хватом']);
// 7. old duplicate ids are not offered but still resolve
assert.equal(await page.evaluate(() => exercise('pull-up-wide')?.id), 'pull-up-wide');
assert.equal(await page.evaluate(() => allExercises().filter(e => matches(e, 'широкий хват')).map(e => e.id).join()), 'wide-pull-up'); assert.equal(await page.evaluate(() => allExercises().filter(e => matches(e, 'узкий хват')).map(e => e.id).sort().join()), 'chin-up-narrow,pull-up-narrow');
// 8. library pictures: the pull-ups keep their own picture, the rest without a picture show the placeholder
const pics = await page.evaluate(() => Object.fromEntries(['pull-up','neutral-pull-up','weighted-pull-up','band-pull-up','barbell-back-squat','bodyweight-squat'].filter(id => exercise(id)).map(id => [id, exerciseSportIcon(exercise(id))])));
console.log('картинки:', JSON.stringify(pics));
for(const id of ['pull-up','neutral-pull-up','weighted-pull-up']) assert.notEqual(pics[id], 'media:placeholder', id);
for(const [id, v] of Object.entries(pics)) if(!['pull-up','neutral-pull-up','weighted-pull-up'].includes(id)) assert.equal(v, 'media:placeholder', id);
cards = await lib('присед');
const srcs = await page.$$eval('#library-results .sport-thumbnail img', els => els.map(e => e.getAttribute('src')));
assert.ok(srcs.length && srcs.every(s => /placeholder\.png$/.test(s)), 'squats show the placeholder');
assert.ok(await page.$eval('#library-results .sport-thumbnail img', e => e.complete && e.naturalWidth === 512), 'placeholder loads');
assert.deepEqual(logs, []);
console.log('ALL OK');
await browser.close();
