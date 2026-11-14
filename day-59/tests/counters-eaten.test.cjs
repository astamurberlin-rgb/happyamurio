'use strict';
/* Update 57.5 · Порции со счётчиков попадают в «съедено» кольца энергии сразу, не дожидаясь, пока день пересчитает
   Happy Meal. Настоящий код: mealFood и mealChanged из selfcare-ui.js, mealDay, mealGoals, mealLinkCopy и syncMeal
   из index.html, shared/happy-summaries.js. Хранилище — заглушка, записи придуманные. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const ui = read('selfcare-ui.js'), page = read('index.html'), countersJs = read('counters.js');
const summaries = read('shared/happy-summaries.js');
const DATE = '2026-11-11';
const plain = value => JSON.parse(JSON.stringify(value));
const cut = (text, from, to) => { const a = text.indexOf(from), b = text.indexOf(to, a + from.length); assert.ok(a >= 0 && b > a, 'block found: ' + from); return text.slice(a, b); };

const MANDARIN = {id: 'f-mandarin', n: 'Мандарин, сырой', k: 53, p: 0.8, f: 0.3, c: 11.5, counterValues: {kcal: 53, prot: 0.8, fat: 0.3, carb: 11.5, fib: 1.8}};
const serving = (id, extra = {}) => ({id, cid: 'c2', date: DATE, rev: 1, writer: 'w', item: {fid: 'f-mandarin', q: 1, u: 'шт', g: 88, t: '16:50', sec: 'dn', counterFood: MANDARIN}, ...extra});
const book = events => ({v: 1, definitions: [], events});

// mealDay and the summary copy come from the page; mealFood and mealChanged from the interface module.
function world(db) {
  const c = vm.createContext({console, JSON, Object, Array, Number, Math, isFinite});
  c.window = c;
  vm.runInContext(summaries, c);
  c.DB = db;
  c.painted = 0;
  vm.runInContext(`var S=HappySummaries,ready=true,screenOn=true;
    function block(){return {classList:{contains:function(name){return name==='on'&&screenOn}}}}
    function paintEnergy(){painted++}
    ` + cut(page, 'function mealDay(d){', '/* \'ate\'') + cut(page, 'function mealGoals(o){', '/* сводка из Meal → копия в DB') +
    cut(ui, 'function mealFood(date){', 'function activityFacts(){'), c);
  return {c, run: code => vm.runInContext(code, c)};
}

test('no Meal summary: unknown, a dash — counters alone are not shown as the day total', () => {
  const w = world({mealCounters: book([serving('serving:a')])});
  assert.equal(w.run(`mealFood('${DATE}')`), null);
});

test('a summary from an older Meal (no mark) is shown as it is', () => {
  const day = {food: true, k: 148.5, p: 14.5, f: 9.9, c: 0.3, sec: {am: {food: true, n: 1}}, ev: []};
  const w = world({mealLink: {v: 1, at: 1000, secs: [], days: {[DATE]: day}, goals: {}}, mealCounters: book([serving('serving:a')])});
  assert.deepEqual(plain(w.run(`mealFood('${DATE}')`)), day);
  assert.equal(w.run("mealFood('2026-11-10')"), null, 'a day Meal knows nothing about stays unknown');
});

test('a marked summary: servings Meal has not counted are added; counted ones are not added twice', () => {
  const day = {food: true, k: 195.1, p: 15.2, f: 10.2, c: 10.4, fib: 1.6, sec: {am: {food: true, n: 1}}, ev: [], cs: {'serving:a': [46.64, 0.7, 0.26, 10.12, 1.58]}};
  const db = {mealLink: {v: 1, at: 2000, counters: 1, secs: [], days: {[DATE]: day}, goals: {k: 2200}}, mealCounters: book([serving('serving:a')])};
  const w = world(db);
  assert.deepEqual(plain(w.run(`mealFood('${DATE}')`)), day, 'Meal has counted everything: its numbers, its other fields');
  db.mealCounters = book([serving('serving:a'), serving('serving:b')]);
  const more = plain(w.run(`mealFood('${DATE}')`));
  assert.equal(more.k, 241.7);assert.equal(more.p, 15.9);assert.equal(more.fib, 3.2);
  assert.deepEqual(more.sec, day.sec, 'the meal sections of the day are kept');
  db.mealCounters = book([{id: 'serving:a', cid: 'c2', date: DATE, rev: 2, writer: 'w', deleted: true}]);
  assert.equal(w.run(`mealFood('${DATE}').k`), 148.5, '«−» after the summary takes Meal\'s value away');
  assert.equal(day.k, 195.1, 'the stored summary is not changed');
});

test('a marked summary without this day: servings alone make the day; nothing at all stays a dash', () => {
  const db = {mealLink: {v: 1, at: 2000, counters: 1, secs: [], days: {}, goals: {}}, mealCounters: book([])};
  const w = world(db);
  assert.equal(w.run(`mealFood('${DATE}')`), null, 'no food and no servings: unknown, not zero');
  db.mealCounters = book([serving('serving:a'), serving('serving:b'), serving('serving:y', {date: '2026-11-10'})]);
  assert.deepEqual(plain(w.run(`mealFood('${DATE}')`)), {k: 93.3, p: 1.4, f: 0.5, c: 20.2, fib: 3.2});
  assert.equal(w.run("mealFood('2026-11-10').k"), 46.6);
  db.mealCounters = undefined;
  assert.equal(w.run(`mealFood('${DATE}')`), null, 'no counters document: the summary alone decides');
  db.mealCounters = {events: 'не список'};
  assert.equal(w.run(`mealFood('${DATE}')`), null);
});

test('the open Activity screen is repainted when the summary or the counters change — and only then', () => {
  const w = world({});
  w.run('mealChanged()');assert.equal(w.c.painted, 1);
  w.run('screenOn=false;mealChanged()');assert.equal(w.c.painted, 1, 'another screen is open: nothing to repaint');
  w.run('screenOn=true;ready=false;mealChanged()');assert.equal(w.c.painted, 1, 'the module has not started yet');
  w.run('ready=true;paintEnergy=function(){throw Error("сбой отрисовки")};mealChanged()');   // must not throw
  assert.ok(ui.includes('root.SelfCare={sportPoll,mealChanged,'), 'the hook is published for the page and the counters');
  assert.ok(page.includes('try{ if(window.SelfCare&&SelfCare.mealChanged) SelfCare.mealChanged() }catch(e){}'), 'a fresh Meal summary repaints the ring');
  assert.ok(countersJs.includes('try{if(root.SelfCare&&root.SelfCare.mealChanged)root.SelfCare.mealChanged()}catch(e){}'), 'a counter tap, here or from another device, repaints the ring');
  assert.ok(ui.includes('food=mealFood(curDate);'), 'the ring takes «съедено» through mealFood');
});

// The copy of the summary in Day's own store: the mark travels with it, and a copy saved by 57.4 (no mark) is renewed.
function store(link, stored) {
  const saved = [];
  const c = vm.createContext({console, JSON, Object, Array, Number, isFinite, Promise});
  c.window = c;
  c.DB = {mealLink: link};
  c.rawGet = async () => stored === null ? null : typeof stored === 'string' ? stored : JSON.stringify(stored);
  c.save = () => { saved.push(plain(c.DB.mealLink)); };
  vm.runInContext("var MEAL_KEY='hd_link_meal_v1',MEAL_SEEN=false;" + cut(page, 'function mealGoals(o){', 'function paintMealSet(){'), c);
  return {c, saved, sync: () => vm.runInContext('syncMeal()', c)};
}
const summary = (at, extra = {}) => ({v: 1, app: 'meal', at, secs: [{k: 'am', t: 'Завтрак'}], days: {[DATE]: {food: true, k: 100, p: 1, f: 1, c: 1, cs: {'serving:a': [46.64, 0.7, 0.26, 10.12, 1.58]}}}, goals: {k: 2200, x: 5}, nutrition: {большое: 'поле'}, ...extra});

test('the copy keeps the mark and the list of counted servings; the bulky part is not copied', async () => {
  const s = store(undefined, summary(5000, {counters: 1}));
  assert.equal(await s.sync(), true);
  assert.deepEqual(s.saved[0], {v: 1, at: 5000, secs: [{k: 'am', t: 'Завтрак'}], days: summary(5000).days, goals: {k: 2200}, src: 'local', counters: 1});
  const old = store(undefined, summary(5000));
  assert.equal(await old.sync(), true);assert.equal('counters' in old.saved[0], false, 'an older Meal: no mark is invented');
  const odd = store(undefined, summary(5000, {counters: true}));
  await odd.sync();assert.equal('counters' in odd.saved[0], false, 'only the exact mark counts');
  // the records Meal has settled itself travel with the mark; anything that is not a short id is dropped
  const settled = store(undefined, summary(5000, {counters: 1, skipped: ['serving:ghost', 7, '', null, 'д'.repeat(201), 'serving:kept']}));
  await settled.sync();assert.deepEqual(settled.saved[0].skipped, ['serving:ghost', 'serving:kept']);
  const loose = store(undefined, summary(5000, {skipped: ['serving:ghost']}));
  await loose.sync();assert.equal('skipped' in loose.saved[0], false, 'without the mark the list means nothing');
});

test('a record Meal has settled itself is neither added nor taken away', () => {
  const day = {food: true, k: 148.5, p: 14.5, f: 9.9, c: 0.3};
  const db = {mealLink: {v: 1, at: 2000, counters: 1, skipped: ['serving:ghost', 'serving:kept'], secs: [], days: {[DATE]: day}, goals: {}},
    mealCounters: book([serving('serving:ghost'), {id: 'serving:kept', cid: 'c2', date: DATE, rev: 2, writer: 'w', deleted: true}])};
  const w = world(db);
  assert.deepEqual(plain(w.run(`mealFood('${DATE}')`)), day, 'Meal knows both records: its total stands');
  db.mealCounters = book([serving('serving:ghost'), serving('serving:new')]);
  assert.equal(w.run(`mealFood('${DATE}').k`), 195.1, 'a new tap is still added');
});

test('same summary, but the copy has no mark (saved by Day 57.4): it is taken again; otherwise newer wins as before', async () => {
  const stale = {v: 1, at: 5000, secs: [], days: summary(5000).days, goals: {}, src: 'local'};
  const renew = store(plain(stale), summary(5000, {counters: 1}));
  assert.equal(await renew.sync(), true);assert.equal(renew.c.DB.mealLink.counters, 1);
  const same = store({...plain(stale), counters: 1}, summary(5000, {counters: 1}));
  assert.equal(await same.sync(), false, 'the copy already has the mark: nothing to do');assert.equal(same.saved.length, 0);
  const unmarked = store(plain(stale), summary(5000));
  assert.equal(await unmarked.sync(), false, 'the summary itself has no mark: the copy is as good');
  const older = store({...plain(stale), at: 6000, src: 'cloud'}, summary(5000, {counters: 1}));
  assert.equal(await older.sync(), false, 'a newer copy from the cloud is not replaced by an older local summary');assert.equal(older.c.DB.mealLink.src, 'cloud');
  const newer = store({...plain(stale), counters: 1}, summary(7000));
  assert.equal(await newer.sync(), true);assert.equal(newer.c.DB.mealLink.at, 7000);assert.equal('counters' in newer.c.DB.mealLink, false, 'a newer summary replaces the copy whole');
  for (const bad of [null, 'не json', {v: 2, at: 9000, days: {}}, {v: 1, at: 9000}]) {
    const b = store(plain(stale), bad);assert.equal(await b.sync(), false);assert.equal(b.c.DB.mealLink.at, 5000);
  }
  assert.ok(page.includes("DB.mealLink=mealLinkCopy(o,'cloud');"), 'the copy from the cloud is made the same way');
});
