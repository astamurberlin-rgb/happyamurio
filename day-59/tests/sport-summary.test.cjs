'use strict';
/* Day 59 · Тренировки и плановые занятия Happy Sport приходят в Day сами — из витрины Sport в общем модуле хранения
   (документы sport/summary и sport/plans, формат — shared/happy-sport-summary.js). В дневник Day они не записываются.
   Пока связь с Sport выключена, начатое после выключения не показывается. Виджет энергии открывается на «баланс»,
   выбор вида нажатием не запоминается. Настоящий код selfcare-core.js, блок чтения витрины из selfcare-ui.js,
   свитчи связи из app-links.js, shared/happy-sport-summary.js и shared/happy-app-links.js; хранилище — заглушка,
   записи придуманные. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const C = require('../selfcare-core.js');
const S = require('../shared/happy-sport-summary.js');
const L = require('../shared/happy-app-links.js');
const DATE = '2026-11-11';
const db = () => ({ days: {}, sections: [], metrics: [] });
const plain = value => JSON.parse(JSON.stringify(value));
const workout = (id, start, duration, extra = {}) => ({ id, value: { title: 'Тренировка ' + id, kind: 'gym', start, end: '', duration, energyKcal: null, ...extra } });
const plan = (id, start, minutes, extra = {}) => ({ id, value: { title: 'План ' + id, start, minutes, note: '', status: 'planned', ...extra } });

test('виджет энергии открывается на «баланс»; прежнее поле с выбором нажатием — не настройка', () => {
  assert.deepEqual(C.init(db(), DATE).activitySettings, { start: 'balance', scale: 3000 });
  const legacy = db(); legacy.selfCare = { activitySettings: { mode: 'spent', scale: 2500 } };
  assert.deepEqual(C.init(legacy, DATE).activitySettings, { start: 'balance', scale: 2500, mode: 'spent' });
  const chosen = db(); chosen.selfCare = { activitySettings: { start: 'eat', scale: 3000 } };
  assert.equal(C.init(chosen, DATE).activitySettings.start, 'eat');
  const broken = db(); broken.selfCare = { activitySettings: { start: 'что-то', scale: 3000 } };
  assert.equal(C.init(broken, DATE).activitySettings.start, 'balance');
});

test('день собирается из того, что даёт витрина Sport: тренировки дня, плановые занятия, минуты и цель', t => {
  t.after(() => { C.sportDay = null; C.sportPlans = null; });
  const c = C.init(db(), DATE);
  assert.deepEqual(plain(C.activity(c, DATE)), { plans: [], workouts: [], goal: 0, minutes: 0, connected: false }, 'без входа сводки нет: день не связан');
  C.sportDay = date => date === DATE ? [{ id: 'b', title: 'Вечер', start: DATE + 'T19:00', end: DATE + 'T19:10', duration: 600, energyKcal: 50 }, { id: 'a', title: '', start: DATE + 'T10:00:07', duration: 1800 },
    { id: 'вчера', start: '2026-11-10T19:00', duration: 600 }, { id: '', start: DATE + 'T20:00', duration: 60 }, { id: 'плохая', start: DATE + 'T21:00', duration: -5 }, null, 'строка'] : [];
  C.sportPlans = date => date === DATE ? [{ id: 'p1', title: 'Зал по плану', start: DATE + 'T18:00', minutes: 60, note: 'Ноги', status: 'planned' }, { id: 'p0', start: DATE + 'T07:00', minutes: 0 }, { id: 'p2', start: '2026-11-12T07:00', minutes: 30 }] : [];
  const day = C.activity(c, DATE);
  assert.deepEqual(day.workouts.map(x => [x.id, x.title, x.energyKcal]), [['a', 'Тренировка', null], ['b', 'Вечер', 50]], 'по времени начала; чужой день и негодные записи пропущены');
  assert.equal(day.minutes, 40); assert.equal(day.connected, true);
  assert.deepEqual(plain(day.plans), [{ id: 'p1', title: 'Зал по плану', start: DATE + 'T18:00', minutes: 60, note: 'Ноги', status: 'planned' }]); assert.equal(day.goal, 60);
  assert.deepEqual(plain(C.activity(c, '2026-11-10')), { plans: [], workouts: [], goal: 0, minutes: 0, connected: true }, 'день без тренировок: связан, 0 минут');
  assert.ok(!('strong' in c), 'снимок журнала Sport в дневнике Day больше не заводится');
  C.sportDay = () => { throw Error('сводка повреждена'); };
  assert.deepEqual(plain(C.activity(c, DATE)).workouts, [], 'сбой чтения не ломает день');
});

/* Блок чтения витрины живёт в модуле интерфейса; запускается ровно он — с настоящим ядром и настоящими общими файлами. */
function loader({ signedIn = true, pairs = [] } = {}) {
  const ui = read('selfcare-ui.js');
  const from = ui.indexOf('const SS=root.HappySportSummary||null;'), to = ui.indexOf('const h=v=>String(v??');
  assert.ok(from > 0 && to > from, 'блок чтения витрины Sport найден');
  const docs = { summary: [], plans: [], pairs }, subs = { summary: [], plans: [] }, painted = [];
  const store = { neighbor: (app, name) => { assert.equal(app, 'sport'); assert.ok(name === 'summary' || name === 'plans', 'Day читает у Sport только витрину: ' + name); return { all: () => plain(docs[name]), subscribe: fn => subs[name].push(fn) }; },
    doc: name => { assert.equal(name, 'pairs'); return { newer: false, all: () => plain(docs.pairs), subscribe() {} }; } };
  C.sportDay = null; C.sportPlans = null;
  const sandbox = { console, JSON, Object, Array, Number, HappySportSummary: S, HappyAppLinks: L, DayData: { signedIn: () => signedIn, store }, ready: false,
    document: { addEventListener() {}, querySelectorAll: () => [] }, renderDay: () => painted.push('day'), renderNow() {}, renderActivity() {}, block: () => null };
  sandbox.root = sandbox; sandbox.C = C;
  vm.createContext(sandbox);
  vm.runInContext(read('app-links.js'), sandbox);   // настоящие свитчи связи Day
  assert.equal(typeof sandbox.DayAppLinks.sportOn, 'function');
  vm.runInContext(ui.slice(from, to) + ';globalThis.api={sportApply,sportChanged,sportStart,days:()=>sportDays};', sandbox);
  return { sandbox, docs, subs, painted, api: sandbox.api };
}

test('после запуска Day читает витрину Sport и перерисовывается при каждой её правке', t => {
  t.after(() => { C.sportDay = null; C.sportPlans = null; });
  const e = loader(), c = C.init(db(), DATE);
  e.docs.summary = [workout('a', DATE + 'T10:00:00', 1800), workout('b', '2026-11-10T09:00', 600, { energyKcal: 120 }), { id: 'x', value: { start: 'вчера', duration: 5 } }, { id: 'y', value: null }];
  e.docs.plans = [plan('p1', DATE + 'T18:00', 45), plan('p2', DATE + 'T20:00', 30, { status: 'skipped' }), plan('p3', '2026-11-12T08:00', 20, { status: 'completed' })];
  e.api.sportStart();
  assert.equal(e.subs.summary.length, 1); assert.equal(e.subs.plans.length, 1);
  assert.equal(C.activity(c, DATE).minutes, 30); assert.equal(C.activity(c, '2026-11-10').minutes, 10); assert.equal(C.activity(c, '2026-11-10').workouts[0].energyKcal, 120);
  assert.equal(C.activity(c, '2026-11-09').connected, true);
  assert.deepEqual(plain(C.activity(c, DATE).plans.map(p => p.id)), ['p1'], 'пропущенное занятие в план дня не входит'); assert.equal(C.activity(c, DATE).goal, 45);
  assert.deepEqual(plain(C.activity(c, '2026-11-12').plans.map(p => [p.id, p.status])), [['p3', 'completed']]);
  assert.deepEqual(plain(e.api.days()).sort(), ['2026-11-10', DATE]);
  // Sport записал ещё одну тренировку: витрина изменилась — подписка перерисовала день
  e.docs.summary.push(workout('c', DATE + 'T19:00:00', 600)); e.subs.summary[0]();
  assert.equal(C.activity(c, DATE).minutes, 40); assert.deepEqual(e.painted, ['day']);
  // тренировку удалили в Sport — из дня она ушла
  e.docs.summary = e.docs.summary.filter(r => r.id !== 'a'); e.subs.summary[0]();
  assert.deepEqual(plain(C.activity(c, DATE).workouts.map(w => w.id)), ['c']);
});

test('без входа витрина не читается: день не связан и подписок нет', t => {
  t.after(() => { C.sportDay = null; C.sportPlans = null; });
  const e = loader({ signedIn: false }), c = C.init(db(), DATE);
  e.docs.summary = [workout('a', DATE + 'T10:00', 600)]; e.api.sportStart();
  assert.equal(C.sportDay, null); assert.equal(C.activity(c, DATE).connected, false); assert.equal(e.subs.summary.length, 0); assert.deepEqual(plain(e.api.days()), []);
});

test('связь с Sport выключена: начатое после выключения не показывается, прежнее остаётся; включили — показывается всё', t => {
  t.after(() => { C.sportDay = null; C.sportPlans = null; });
  const off = new Date(2026, 10, 11, 12, 0).getTime();   // выключили 11 ноября в 12:00 по местному времени
  const e = loader({ pairs: [{ id: 'day|sport', value: { on: false, at: off, by: 'day' } }, { id: 'day|meal', value: { on: false, at: 1, by: 'meal' } }] }), c = C.init(db(), DATE);
  e.docs.summary = [workout('утро', DATE + 'T10:00', 1800), workout('вечер', DATE + 'T19:00', 600), workout('завтра', '2026-11-12T10:00', 900)];
  e.docs.plans = [plan('до', DATE + 'T09:00', 30), plan('после', DATE + 'T20:00', 40)];
  e.api.sportStart();
  assert.deepEqual(plain(C.activity(c, DATE).workouts.map(w => w.id)), ['утро']); assert.deepEqual(plain(C.activity(c, '2026-11-12').workouts), []);
  assert.deepEqual(plain(C.activity(c, DATE).plans.map(p => p.id)), ['до']);
  e.docs.pairs[0] = { id: 'day|sport', value: { on: true, at: off + 3600000, by: 'sport' } }; e.api.sportChanged();   // включили в Sport — запись пары одна на три приложения
  assert.deepEqual(plain(C.activity(c, DATE).workouts.map(w => w.id)), ['утро', 'вечер']); assert.equal(C.activity(c, '2026-11-12').minutes, 15);
  assert.deepEqual(plain(C.activity(c, DATE).plans.map(p => p.id)), ['до', 'после']);
});

test('выбранный вид кольца в дневник не пишется; тренировки и замеры Sport в дневнике Day не хранятся', () => {
  const ui = read('selfcare-ui.js'), core = read('selfcare-core.js'), docs = read('day-docs.js');
  assert.ok(ui.includes("if(b.hasAttribute('data-energy-cycle')){const modes=['spent','balance','eat'];energyMode=modes[(modes.indexOf(energyMode||data().activitySettings.start)+1)%3];paintEnergy();return;}"), 'нажатие меняет вид только в памяти');
  assert.ok(!/activitySettings\.mode/.test(ui));
  assert.ok(ui.includes('<select id="careEnergyMode" name="start">'));
  assert.ok(!/strongSnapshot|c\.strong\b|data\(\)\.strong\b/.test(ui + core), 'снимок журнала Sport убран');
  assert.ok(!/hd_link_sport_v1|HappySummaries|clGet\(|clAt\(/.test(ui + core), 'прежней сводки и прямых запросов к облаку нет');
  assert.match(docs, /CARE_SKIP=new Set\(\['entries','strong'\]\)/, 'прежний снимок в документы не попадает');
});

test('страница подключает общие файлы витрины до интерфейса и ведёт на текущий Sport', () => {
  const page = read('index.html'), ui = read('selfcare-ui.js');
  const order = ['./shared/happy-account.js', './shared/happy-store.js', './shared/happy-sport-summary.js', './day-docs.js', './day-data.js', './selfcare-core.js', './selfcare-ui.js'].map(src => page.indexOf('<script src="' + src + '?v='));
  assert.ok(order.every(i => i > 0), 'все файлы подключены: ' + order.join());
  assert.deepEqual(order.slice().sort((a, b) => a - b), order, 'общий вход и модуль — раньше документов Day, они — раньше интерфейса');
  assert.ok(!page.includes('happy-summaries.js') && !page.includes('day-sport-bootstrap') && !page.includes('measurements-host'), 'прежний разбор сводок и прежняя вкладка замеров не подключены');
  const apps = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'shared', 'apps.json'), 'utf8')), sport = apps.sport.entry.split('/')[0];
  assert.ok(page.includes("var SPORT_DIR='" + sport + "';"), 'запасной адрес записи в Sport — текущий выпуск');
  assert.ok(page.includes('href="../' + sport + '/" data-happy-app="sport"'));
  assert.ok(ui.includes("const STRONG_URL='https://astamurberlin-rgb.github.io/happyamurio/" + sport + "/';"));
  assert.ok(page.includes(`href="'+escH(sportWorkoutHref(w.strongId))+'"`));
  const hrefCode = page.slice(page.indexOf('function sportWorkoutHref(id){'), page.indexOf('function woOf(d){')) + ";sportWorkoutHref('local-1 2')";
  assert.equal(vm.runInNewContext("var HappyLinks={base:'/happyamurio/'},window={HappyLinks:HappyLinks},SPORT_DIR='sport-43';" + hrefCode), '/happyamurio/sport-43/?workout=local-1%202');
  assert.equal(vm.runInNewContext("var window={},SPORT_DIR='sport-43';" + hrefCode), '../sport-43/?workout=local-1%202');
});
