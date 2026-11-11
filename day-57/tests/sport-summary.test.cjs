'use strict';
/* Update 57.4 · Тренировки Happy Sport приходят в Day сами (сводка Sport), виджет энергии открывается на «баланс»,
   выбор вида нажатием не запоминается, цели Meal доходят до кольца. Настоящий код selfcare-core.js, блок загрузки
   сводки из selfcare-ui.js и shared/happy-summaries.js; хранилище и облако — заглушки, записи придуманные. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const C = require('../selfcare-core.js');
const S = require('../shared/happy-summaries.js');
const DATE = '2026-11-11', A = '00000000-0000-4000-8000-00000000000a';
const db = () => ({days: {}, sections: [], metrics: []});
const w = (id, start, duration, extra = {}) => ({id, title: 'Тренировка ' + id, kind: 'gym', start, end: '', duration, energyKcal: null, rev: 1000, ...extra});
const plain = value => JSON.parse(JSON.stringify(value));

test('the energy widget starts on «баланс»; the old tap-driven field is not a setting any more', () => {
  assert.deepEqual(C.init(db(), DATE).activitySettings, {start: 'balance', scale: 3000});
  const legacy = db(); legacy.selfCare = {activitySettings: {mode: 'spent', scale: 2500}};
  assert.deepEqual(C.init(legacy, DATE).activitySettings, {start: 'balance', scale: 2500, mode: 'spent'}, 'a stored «mode» stays in the record and is ignored');
  const chosen = db(); chosen.selfCare = {activitySettings: {start: 'eat', scale: 3000}};
  assert.equal(C.init(chosen, DATE).activitySettings.start, 'eat', 'an explicit «Начальный режим» is kept');
  const broken = db(); broken.selfCare = {activitySettings: {start: 'что-то', scale: 3000}};
  assert.equal(C.init(broken, DATE).activitySettings.start, 'balance');
});

test('workouts of the Sport summary join the day once: by id, otherwise by start minute and duration', () => {
  const c = C.init(db(), DATE);
  assert.equal(C.activity(c, DATE).connected, false);
  assert.deepEqual(plain(C.activity(c, DATE, [])), {plans: [], workouts: [], goal: 0, minutes: 0, connected: true}, 'a summary without workouts today: connected, 0 minutes');
  c.strong = {updatedAt: 1, plans: [], workouts: [{id: 'a', title: 'Из снимка', start: DATE + 'T10:00', end: DATE + 'T10:30', duration: 1800, energyKcal: 150, templateId: 't', plannedStart: null}]};
  const extra = [{id: 'a', title: 'Из сводки', start: DATE + 'T10:00:07', duration: 1800}, {id: 'другой-id', start: DATE + 'T10:00:40', duration: 1803}, {id: 'c', title: 'Вечер', start: DATE + 'T19:00:00', end: DATE + 'T19:10:00', duration: 600, energyKcal: 50}, {id: 'вчера', start: '2026-11-10T19:00', duration: 600}, {id: '', start: DATE + 'T20:00', duration: 60}, {id: 'плохая', start: DATE + 'T21:00', duration: NaN}, null];
  const day = C.activity(c, DATE, extra);
  assert.deepEqual(day.workouts.map(x => [x.id, x.title]), [['a', 'Из снимка'], ['c', 'Вечер']], 'the snapshot record wins; only the new workout is added');
  assert.equal(day.minutes, 40);assert.equal(day.workouts[1].energyKcal, 50);assert.equal(day.workouts[1].templateId, null);
  assert.equal(c.strong.workouts.length, 1, 'the stored snapshot is not changed');
  assert.equal(C.activity(c, DATE).workouts.length, 1, 'without a summary nothing changes');
});

test('the interface hooks the summary in through HappyCare.sportDay; a failing hook does not break the day', () => {
  const c = C.init(db(), DATE);
  try {
    C.sportDay = date => date === DATE ? [{id: 'x', title: 'Сводка', start: DATE + 'T08:00:00', duration: 900}] : [];
    assert.equal(C.activity(c, DATE).minutes, 15);assert.equal(C.activity(c, '2026-11-10').connected, true);
    assert.equal(C.activity(c, DATE, []).minutes, 0, 'an explicit list takes precedence over the hook');
    C.sportDay = () => { throw Error('сводка повреждена'); };
    assert.deepEqual(plain(C.activity(c, DATE)), {plans: [], workouts: [], goal: 0, minutes: 0, connected: false});
  } finally { C.sportDay = null; }
});

// The loader lives inside the interface module; run exactly that block with the real core and the real shared parser.
function loader({owner = A, signedIn = owner !== 'local'} = {}) {
  const ui = read('selfcare-ui.js');
  const from = ui.indexOf('const S=root.HappySummaries||null'), to = ui.indexOf('function sportRepaint(){');
  assert.ok(from > 0 && to > from, 'the summary loader block is found');
  const store = new Map(), cloud = {at: null, doc: null, atCalls: 0, getCalls: 0, hold: null, guardFails: false};
  const key = k => owner === 'local' ? k : 'happy-user:' + encodeURIComponent(owner) + ':' + k;
  // The loader sets HappyCare.sportDay on the module object itself — that is the object activity() consults.
  C.sportDay = null;const core = C;
  const sandbox = {console, JSON, Number, Object, Array, Promise, Error, HappySummaries: S, HappyProfile: {owner, key}, signedIn, failStore: false,
    localStorage: {getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => { if (sandbox.failStore) throw Error('quota'); store.set(k, String(v)); }}};
  sandbox.root = sandbox;sandbox.C = core;
  sandbox.clOn = () => sandbox.signedIn;
  sandbox.clMealReadReady = async () => () => { if (cloud.guardFails) throw Error('Контекст чтения сводки изменился'); };
  sandbox.clAt = async (app, kind, guard) => { assert.deepEqual([app, kind], ['sport', 'link']);assert.equal(typeof guard, 'function');cloud.atCalls++;if (cloud.hold) await cloud.hold('at');return cloud.at; };
  sandbox.clGet = async (app, kind, guard) => { assert.deepEqual([app, kind], ['sport', 'link']);assert.equal(typeof guard, 'function');cloud.getCalls++;if (cloud.hold) await cloud.hold('get');return cloud.doc === null ? null : plain(cloud.doc); };
  vm.createContext(sandbox);
  vm.runInContext(ui.slice(from, to) + ';globalThis.api={sportRead,sportCloud,summary:()=>sportSummary};', sandbox);
  return {sandbox, store, cloud, core, key: key('hd_link_sport_v1'), read: () => sandbox.api.sportRead(), cloudRead: () => sandbox.api.sportCloud(), summary: () => sandbox.api.summary()};
}
const doc = (at, records, extra = {}) => ({v: 1, app: 'sport', at, owner: A, records, ...extra});

test('the summary on the device: the own one is shown, another account, a guest copy and broken text are not', t => {
  t.after(() => { C.sportDay = null; });
  const e = loader(), c = C.init(db(), DATE);
  assert.equal(e.read(), true);assert.equal(e.core.sportDay, null, 'no summary: the hook is off, the day looks as before');
  e.store.set(e.key, JSON.stringify(doc(2000, [w('a', DATE + 'T10:00:00', 1800), w('b', '2026-11-10T09:00', 600), {id: 'x', deleted: true, rev: 5}])));
  assert.equal(e.read(), true);assert.equal(e.read(), false, 'unchanged text is not parsed again');
  assert.equal(e.core.activity(c, DATE).minutes, 30);assert.equal(e.core.activity(c, '2026-11-10').minutes, 10);assert.equal(e.core.activity(c, '2026-11-09').connected, true);
  e.store.set(e.key, JSON.stringify(doc(3000, [w('a', DATE + 'T10:00', 600)], {owner: 'someone-else'})));
  assert.equal(e.read(), true);assert.equal(e.core.sportDay, null, 'a summary of another account switches the hook off');
  for (const bad of ['не json', '{"v":2,"at":1,"records":[]}', '[]']) { e.store.set(e.key, bad);e.read();assert.equal(e.core.sportDay, null, bad); }
  const guest = loader({owner: 'local'});
  guest.store.set('hd_link_sport_v1', JSON.stringify({...doc(2000, [w('a', DATE + 'T10:00', 600)]), owner: 'local'}));guest.read();
  assert.equal(guest.core.activity(c, DATE).minutes, 10);
  guest.store.set('hd_link_sport_v1', JSON.stringify(doc(2100, [w('a', DATE + 'T10:00', 600)])));guest.read();assert.equal(guest.core.sportDay, null, 'a guest does not see an account summary');
});

test('the cloud row sport/link: only when signed in, the time first, a newer summary only, a copy in the account area', async t => {
  t.after(() => { C.sportDay = null; });
  const c = C.init(db(), DATE);
  const guest = loader({owner: 'local'});guest.cloud.at = 9000;guest.cloud.doc = doc(9000, []);
  assert.equal(await guest.cloudRead(), false);assert.equal(guest.cloud.atCalls + guest.cloud.getCalls, 0);
  const e = loader();e.read();
  assert.equal(await e.cloudRead(), false);assert.deepEqual([e.cloud.atCalls, e.cloud.getCalls], [1, 0]);
  e.cloud.at = 5000;e.cloud.doc = {v: 1, at: 4321, records: [w('a', DATE + 'T10:00:00', 1800)]};
  assert.equal(await e.cloudRead(), true);assert.equal(e.core.activity(c, DATE).minutes, 30);
  const stored = JSON.parse(e.store.get(e.key));assert.equal(stored.owner, A);assert.equal(stored.at, 5000);
  assert.equal(e.read(), false, 'the copy just written is not read back as a change');
  assert.equal(await e.cloudRead(), false);assert.deepEqual([e.cloud.atCalls, e.cloud.getCalls], [3, 1], 'the same row: only its time is asked');
  e.cloud.at = 6000;e.cloud.doc = doc(6000, [], {owner: 'someone-else'});assert.equal(await e.cloudRead(), false);assert.equal(e.core.activity(c, DATE).minutes, 30);
  e.cloud.at = 6500;e.cloud.doc = {v: 2, at: 6500, records: []};assert.equal(await e.cloudRead(), false);
  e.cloud.at = 7000;e.cloud.doc = doc(7000, [w('a', DATE + 'T10:00:00', 1800), w('c', DATE + 'T19:00:00', 600)]);
  e.cloud.guardFails = true;assert.equal(await e.cloudRead(), false, 'the sign-in changed: the answer is dropped quietly');e.cloud.guardFails = false;
  e.cloud.hold = async step => { if (step === 'get') e.sandbox.HappyProfile = {owner: 'someone-else', key: k => k}; };
  assert.equal(await e.cloudRead(), false);e.sandbox.HappyProfile = {owner: A, key: k => 'happy-user:' + encodeURIComponent(A) + ':' + k};assert.equal(e.core.activity(c, DATE).minutes, 30);
  e.cloud.hold = async () => { throw Error('Нет связи с сервером'); };assert.equal(await e.cloudRead(), false);
  e.cloud.hold = null;e.sandbox.failStore = true;assert.equal(await e.cloudRead(), true, 'the copy could not be stored: shown from memory');assert.equal(e.core.activity(c, DATE).minutes, 40);
  e.sandbox.failStore = false;e.cloud.at = 8000;assert.deepEqual(await Promise.all([e.cloudRead(), e.cloudRead()]), [true, false], 'one request at a time');
});

test('the chosen view is not written to the diary; the setting names the starting view', () => {
  const ui = read('selfcare-ui.js');
  assert.ok(ui.includes("if(b.hasAttribute('data-energy-cycle')){const modes=['spent','balance','eat'];energyMode=modes[(modes.indexOf(energyMode||data().activitySettings.start)+1)%3];paintEnergy();return;}"), 'a tap changes the view in memory only');
  assert.ok(!/activitySettings\.mode/.test(ui), 'the old field is not read or written by the interface');
  assert.ok(ui.includes("HappyDayEnergy.render(activityFacts(),energyMode||data().activitySettings.start,data().activitySettings.scale)"));
  assert.ok(ui.includes('<select id="careEnergyMode" name="start">'));
  assert.ok(ui.includes("data().activitySettings={start:['spent','eat','balance'].includes(v.start)?v.start:'balance',scale:+v.scale};"));
  assert.ok(!/sportSummary[^;]*save\(|rawSet\(SPORT_KEY/.test(ui), 'the summary is never saved into the Day journal');
});

test('the page loads the shared parser, passes Meal goals to the ring and links a workout to the current Sport', () => {
  const page = read('index.html');
  const shared = page.indexOf('<script src="./shared/happy-summaries.js?v='), ui = page.indexOf('<script src="./selfcare-ui.js?v=');
  assert.ok(shared > 0 && shared < ui, 'happy-summaries.js is loaded before the interface module');
  assert.ok(!/href="[^"]*sport-3\d\//.test(page) && !page.includes("'../sport-38/"), 'no link names an old Sport release');
  assert.ok(page.includes(`href="'+escH(sportWorkoutHref(w.strongId))+'"`));
  const fn = page.slice(page.indexOf('function mealGoals(o){'), page.indexOf('/* сводка из Meal → копия в DB'));
  const mealGoals = vm.runInNewContext(fn + ';mealGoals');
  assert.deepEqual(plain(mealGoals({goals: {k: 2200, p: 120.5, f: 0, c: -5, fib: '30', x: 9}})), {k: 2200, p: 120.5});
  for (const none of [null, {}, {goals: null}, {goals: [1, 2]}, {goals: 'x'}]) assert.deepEqual(plain(mealGoals(none)), {});
  assert.equal((page.match(/goals:mealGoals\(o\)/g) || []).length, 2, 'both the device copy and the cloud copy carry the goals');
  const hrefCode = page.slice(page.indexOf('function sportWorkoutHref(id){'), page.indexOf('function woOf(d){')) + ";sportWorkoutHref('local-1 2')";
  assert.equal(vm.runInNewContext("var HappyLinks={base:'/happyamurio/'},window={HappyLinks:HappyLinks},SPORT_DIR='sport-40';" + hrefCode), '/happyamurio/sport-40/?workout=local-1%202');
  assert.equal(vm.runInNewContext("var window={},SPORT_DIR='sport-41';" + hrefCode), '../sport-41/?workout=local-1%202', 'without the links module the address stays relative');
  assert.match(page, /var SPORT_DIR='sport-\d+';/);
});
