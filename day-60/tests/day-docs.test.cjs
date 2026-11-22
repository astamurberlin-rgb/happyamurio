'use strict';
/* Day 59 · раскладка дневника на документы общего модуля (day-docs.js) и обратно.
   Что смотрит: дневник собирается обратно без потерь; всё, что человек записывает отдельным действием, — отдельная
   запись; правки с двух устройств сводятся по записям так же, как их сводит общий модуль (у одной записи остаётся
   поздняя, разные остаются обе, удалённое не возвращается); пример владельца из Day 57.6 про одну шкалу на двух
   устройствах; чужое и служебное в документы Day не попадает; названия документов не совпадают со старыми строками
   облака. Настоящий код day-docs.js и selfcare-core.js; хранилище — простая модель «запись → последняя правка»
   (сам модуль проверяют scripts/check-happy-store.mjs и сценарий day_store). Записи придуманные. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const D = require('../day-docs.js');
const C = require('../selfcare-core.js');

const plain = x => JSON.parse(JSON.stringify(x));
const at = (t, ms) => ({ t, ms });
const visit = id => ({ id, at: {}, tags: {} });
const DATE = '2026-11-14';
const blank = () => ({ cp: {}, tags: {}, train: null, screen: {}, note: '', num: {} });
const defaults = () => ({
  sections: [{ k: 'wake', t: 'Утро', scales: ['energy'], tags: [] }, { k: 'am', t: 'Завтрак', scales: ['energy'], tags: [] }],
  metrics: [{ k: 'energy', t: 'Энергия' }, { k: 'mood', t: 'Настроение' }], tags: ['Умывание'],
  counters: [{ k: 'work', t: 'Работа', max: 10 }], taps: [{ k: 'coffee', t: 'Шот кофе', step: 1 }], tagIc: {}, days: {}
});
/* дневник → записи документов: {документ: [{id, value}]} */
function docsOf(state) {
  D.ensureIds(state.db);
  const out = {};
  for (const [name, map] of D.project(state)) out[name] = [...map].map(([id, value]) => ({ id, value: plain(value) }));
  return out;
}
const ids = (docs, name) => docs[name].map(r => r.id).sort();

/* Устройство: настоящий day-data.js (чтение, запись только изменившегося, места в списках) поверх хранилища-модели.
   Модель хранилища: у записи остаётся правка с большим временем; удаление — тоже правка. Как в общем модуле. */
const dayData = fs.readFileSync(path.join(__dirname, '..', 'day-data.js'), 'utf8');
async function device(cloud, base) {
  const local = new Map();   // «документ\nномер записи» → {rev, value} или {rev, deleted}
  const store = { closed: false, status: () => ({ state: 'cloud', detail: '', newer: [] }), onClose() {}, onStatus() {},
    doc: name => ({
      all: () => [...local].filter(([key, r]) => key.startsWith(name + '\n') && !r.deleted).map(([key, r]) => ({ id: key.slice(name.length + 1), value: plain(r.value) })),
      putMany: async list => { for (const x of list) local.set(name + '\n' + x.id, x.deleted ? { rev: ++cloud.clock, deleted: true } : { rev: ++cloud.clock, value: plain(x.value) }); },
      subscribe() {}
    }) };
  const one = { FORMAT: 1 }, spy = { compared: 0 }, model = globalThis.HappyStore.model;
  const context = vm.createContext({ console, setTimeout, clearTimeout, DayDocs: D, HappyFood: one, HappyAppLinks: one, HappySportSummary: one, HappyMeasurements: one,
    HappyAccount: { create: () => ({ load: async () => {}, finishGoogle: async () => null, current: () => ({ uid: 'u-1' }), onChange() {} }) },
    HappyStore: { model: { ...model, stable: x => { spy.compared++; return model.stable(x); } }, open: async () => store }, HappyPerson: { FORMAT: 1, statusText: () => '' }, location: { reload() {} } });
  vm.runInContext(dayData, context); await context.DayBoot.ready;
  const dev = { cloud, local, state: null, spy,
    load() { dev.state = context.DayData.load(plain(base)); },
    save() { assert.equal(context.DayData.save(dev.state.db, dev.state.cfg), true); },
    /* правки из облака легли в хранилище устройства, но экран их ещё не подхватил */
    pull() { for (const [key, r] of cloud.records) { const here = local.get(key); if (!here || r.rev > here.rev) local.set(key, r); } },
    /* обмен с облаком в обе стороны и сборка дневника заново — как adoptRemote */
    sync() { for (const [key, r] of local) { const there = cloud.records.get(key); if (!there || r.rev > there.rev) cloud.records.set(key, r); } dev.pull(); dev.load(); },
    day(date = DATE) { return dev.state.db.days[date] || (dev.state.db.days[date] = blank()); } };
  dev.load();
  return dev;
}
async function pair(base = defaults()) { const cloud = { records: new Map(), clock: 0 }; return [await device(cloud, base), await device(cloud, base), cloud]; }

/* Дневник со всеми видами записей. */
function fullDiary() {
  const db = defaults();
  db.taps.push({ k: 'meal-c1', t: 'Творог', step: 1, mealCounterId: 'c1', mealPortion: '1 порция' });   // счётчик еды — принадлежит Meal
  db.nowCfg = { sc: ['energy'], tags: ['Прогулка'] }; db.tagFix = true;
  db.mealLink = { v: 1, days: {} }; db.mealCounters = { v: 1 }; db.fmt = 56; db.accountConflicts = [1]; db.importedHistory = { a: 1 };
  db.days[DATE] = {
    cp: {
      wake: { time: '08:00', energy: 5, mood: 3, at: { energy: at('08:00', 1000), mood: at('12:10', 5000) }, log: [{ id: 'v2:mood', k: 'mood', v: 6, t: '08:00', ms: 1000 }],
        tags: { 'Умывание': true, 'Зарядка': true }, tagAt: { 'Умывание': '08:01', 'Зарядка': '08:20' }, note: 'Выспался', tm: 'm', t0: '08:05' },
      am: {}
    },
    tags: {}, train: null, screen: {}, note: 'Заметка дня', num: {},
    taps: { coffee: [{ t: '08:10', n: 1 }, { t: '12:00', n: 1 }], 'meal-c1': [{ t: '09:00', n: 1, counterEventId: 'day-1' }] },
    cnt: { work: 150 }, cntLog: { work: [{ id: 'r1', m: 90, s: '09:00', e: '10:30' }, { id: 'r2', m: 60, s: null, e: null }] },
    now: [{ t: '11:45', k: 'energy', n: 'Энергия', v: 2, w: 'средне' }, { t: '11:46', g: 'Прогулка' }],
    mind: { sec: 100, n: 2, ss: [['08:12', 95], ['09:00', 5]] },
    care: { checkins: [{ id: 'c1', time: '10:00', values: { energy: .5 } }], events: [], practices: [{ id: 'p1', time: '07:00', minutes: 10, name: 'Дыхание' }] },
    locked: true, sleep: { src: 'health', b: '00:30', w: '08:00' }, mindx: [{ s: '08:12', sec: 600, src: 'Дневник' }]
  };
  db.days['2026-11-13'] = blank();                                         // день только посмотрели — записей нет
  db.days['2019-05-01'] = { ...blank(), cp: { am: { time: '09:00', energy: 3 } } };   // год вне списка — документ days_old
  db.selfCare = {
    version: 2, settings: { order: ['mind', 'mood'] }, schedule: [{ id: 's1', time: '07:00', minutes: 10, days: [1, 2] }], books: [{ id: 'personal', name: 'Личный дневник' }],
    entries: [{ id: 'e1', bookId: 'personal', title: 'Первая', date: DATE, time: '21:00', text: 'Текст', additions: [], createdAt: 1 },
      { id: 'e2', bookId: 'personal', title: 'Старая', date: '2019-05-01', time: '21:00', text: 'Т', additions: [], createdAt: 2 }],
    planHistory: [{ from: '2026-11-01', goals: {}, schedule: [] }], goals: { mindManual: null }, strong: { plans: [], workouts: [] }
  };
  return { db, cfg: { weight: 80, kcal: null, prot: 1.6 } };
}

test('названия документов: новые, годятся для облака, со старыми строками не совпадают', () => {
  for (const name of D.OWN) assert.match(name, /^[a-z][a-z0-9_]{0,31}$/, name);
  for (const old of ['journal', 'link', 'counters', 'supplements', 'measurements']) assert.ok(!D.OWN.includes(old), 'старое название: ' + old);
  assert.equal(new Set(D.OWN).size, D.OWN.length);
  assert.deepEqual(D.OWN.filter(n => !D.NAMES.includes(n)), ['foodtaps', 'pairs'], 'документы витрины раскладывают их общие файлы');
  assert.equal(D.yearDoc('days', '2026-11-14'), 'days_2026'); assert.equal(D.yearDoc('days', '1999-01-01'), 'days_old'); assert.equal(D.yearDoc('mind', '2040-01-01'), 'mind_old');
  assert.equal(D.FORMAT, 1);
});

test('дневник со всеми видами записей собирается обратно без потерь', () => {
  const state = fullDiary(), docs = docsOf(state), back = D.build(docs, defaults());
  const expected = plain(state.db);
  delete expected.days['2026-11-13'];                                   // пустой день не хранится
  for (const k of ['mealLink', 'mealCounters', 'fmt', 'accountConflicts', 'importedHistory']) delete expected[k];   // чужое и служебное прежних выпусков
  delete expected.selfCare.strong;                                       // снимок журнала Sport больше не хранится
  expected.taps = expected.taps.filter(c => !c.mealCounterId);           // счётчик еды принадлежит Meal
  delete expected.days[DATE].taps['meal-c1'];                            // его нажатия лежат в документе foodtaps
  delete expected.days[DATE].cp.am;                                      // пустой раздел не хранится
  assert.deepEqual(plain(back.db), expected);
  assert.deepEqual(back.cfg, { weight: 80, kcal: null, prot: 1.6 });
  assert.deepEqual(Object.keys(back.db.days[DATE].cp.wake.tags), ['Умывание', 'Зарядка'], 'порядок тегов сохраняется');
  // повторная раскладка даёт те же записи: после перезагрузки в облако ничего не уходит
  const again = docsOf({ db: back.db, cfg: back.cfg });
  for (const name of D.NAMES) assert.deepEqual(new Map(again[name].map(r => [r.id, JSON.stringify(r.value)])), new Map(docs[name].map(r => [r.id, JSON.stringify(r.value)])), name);
  // normalize — тот же дневник одним вызовом
  assert.deepEqual(plain(D.normalize(fullDiary(), defaults()).db.days[DATE].cp), plain(back.db.days[DATE].cp));
});

test('каждое действие человека — своя запись, по документам своего года', () => {
  const docs = docsOf(fullDiary()), day = ids(docs, 'days_2026');
  const has = id => assert.ok(day.includes(JSON.stringify(id)), JSON.stringify(id) + ' нет среди ' + day.join(' '));
  has(['cp', DATE, 'wake']);
  has(['m', DATE, 'wake', 'energy', '1000']); has(['m', DATE, 'wake', 'mood', '5000']); has(['m', DATE, 'wake', 'mood', '1000']);
  has(['t', DATE, 'wake', 'Умывание']); has(['t', DATE, 'wake', 'Зарядка']);
  has(['cnt', DATE, 'work']); has(['log', DATE, 'work', 'r1']); has(['log', DATE, 'work', 'r2']);
  has(['care', DATE, 'checkins', 'c1']); has(['care', DATE, 'practices', 'p1']);
  has(['f', DATE, 'note']); has(['f', DATE, 'locked']); has(['f', DATE, 'sleep']); has(['f', DATE, 'mindx']);
  has(['entry', 'e1']);
  assert.equal(day.filter(id => id.startsWith('["tap"')).length, 2, 'два своих нажатия — две записи; нажатие счётчика еды сюда не попадает');
  assert.equal(day.filter(id => id.startsWith('["now"')).length, 2);
  assert.ok(!day.some(id => id.includes('meal-c1')), 'счётчик еды и его нажатия — не в документах Day');
  assert.deepEqual(ids(docs, 'days_old'), [JSON.stringify(['cp', '2019-05-01', 'am']), JSON.stringify(['entry', 'e2']), JSON.stringify(['m', '2019-05-01', 'am', 'energy', '0'])].sort());
  assert.equal(docs.mind_2026.length, 2, 'заход во время в Day — отдельная запись в своём документе');
  assert.deepEqual(docs.prefs, [{ id: '["goals"]', value: { weight: 80, kcal: null, prot: 1.6 } }]);
  assert.deepEqual(docs.setup.find(r => r.id === '["taps"]').value, { t: 'list' });
  assert.ok(docs.setup.some(r => r.id === JSON.stringify(['taps', 'coffee'])) && !docs.setup.some(r => r.id.includes('meal-c1')));
  assert.ok(docs.setup.some(r => r.id === JSON.stringify(['sections', 'wake'])), 'раздел дня — своя запись');
  assert.ok(docs.care.some(r => r.id === JSON.stringify(['i', 'schedule', 's1'])) && docs.care.some(r => r.id === JSON.stringify(['v', 'settings'])));
  assert.ok(!docs.care.some(r => r.id.includes('strong') || r.id.includes('entries')));
  for (const name of D.NAMES) for (const r of docs[name]) assert.ok(r.id.length <= 200, 'номер записи длиннее предела модуля: ' + r.id);
});

test('номер записи помещается в предел модуля и при самых длинных названиях', () => {
  const long = 'я'.repeat(60), quoted = '"'.repeat(30), db = defaults(), d = db.days[DATE] = blank();
  d.cp[long] = { time: '09:00', [long]: 5, at: { [long]: at('09:00', 8640000000000000) }, tags: { [long]: true }, tagAt: { [long]: '09:00' } };
  d.cp.am = { time: '09:00', tags: { [quoted]: true } };
  d.taps = { [long]: [{ t: '08:10', n: 1, id: long }] }; d.cntLog = { [long]: [{ id: long, m: 1, s: null, e: null }] }; d.cnt = { [long]: 1 };
  d.care = { checkins: [{ id: long, time: '10:00' }], events: [], practices: [] };
  db.sections.push({ k: long, t: 'Длинный' }); db.selfCare = { entries: [{ id: long, date: DATE, text: 'т' }], schedule: [{ id: long }] };
  const docs = docsOf({ db, cfg: {} });
  for (const name of D.NAMES) for (const r of docs[name]) assert.ok(r.id.length <= 200, r.id.length + ' знаков: ' + r.id);
  assert.deepEqual(plain(D.build(docs, defaults()).db.days[DATE]), plain(db.days[DATE]));
  // название длиннее 60 знаков частью номера не становится: раздел с таким тегом хранится одной записью целиком
  const over = defaults(), tag = 'т'.repeat(61); over.days[DATE] = { ...blank(), cp: { am: { time: '09:00', mood: 2, at: { mood: at('09:00', 5) }, tags: { [tag]: true } } } };
  const whole = docsOf({ db: over, cfg: {} }).days_2026;
  assert.deepEqual(whole.map(r => r.id), [JSON.stringify(['cp', DATE, 'am'])]); assert.ok('w' in whole[0].value);
  assert.deepEqual(plain(D.build({ days_2026: whole }, defaults()).db.days[DATE].cp), plain(over.days[DATE].cp));
});

test('раздел непривычного вида хранится одной записью целиком и возвращается как был', () => {
  const odd = [
    { time: '13:00', tags: { x: false } },                                              // тег со значением «нет»
    { time: '13:00', tags: {} },                                                        // пустой список тегов
    { time: '13:00', mood: 4, at: { energy: at('13:00', 5) } },                         // время у шкалы без значения
    { time: '13:00', mood: 4, at: { mood: { t: '13:00', ms: 5, extra: 1 } } },          // лишнее поле у времени
    { time: '13:00', mood: 4, at: { mood: at('13:00', 1.5) } },                         // дробные миллисекунды
    { time: '13:00', mood: 4, log: [{ id: 'a', k: 'mood', v: 1, t: '', ms: 0 }, { id: 'b', k: 'mood', v: 2, t: '', ms: 0 }] },   // две отметки одной шкалы с одним временем
    { time: '13:00', mood: 4, at: { mood: at('13:00', 7) }, log: [{ id: 'a', k: 'mood', v: 1, t: '', ms: 7 }] },               // отметка журнала с тем же временем, что действующая
    { time: '13:00', log: [{ id: 'a', k: 'mood', v: 1, t: '' }] },                      // строка журнала без времени
    { time: '13:00', log: [] }, { time: '13:00', tagAt: { x: '13:00' } }, { time: '13:00', tags: { x: true }, tagAt: { x: 5 } }
  ];
  odd.forEach((section, i) => {
    const db = defaults(); db.days[DATE] = { ...blank(), cp: { am: section } };
    const docs = docsOf({ db, cfg: {} });
    assert.deepEqual(docs.days_2026.map(r => r.id), [JSON.stringify(['cp', DATE, 'am'])], 'вид ' + i + ': одна запись');
    assert.deepEqual(plain(D.build(docs, defaults()).db.days[DATE].cp.am), plain(section), 'вид ' + i);
  });
  // привычный раздел без шкал: только начало и заметка — одна запись, по частям
  const db = defaults(); db.days[DATE] = { ...blank(), cp: { am: { time: '13:00', note: 'Только заметка', unknown: { a: 1 }, mood: null } } };
  const docs = docsOf({ db, cfg: {} });
  assert.deepEqual(docs.days_2026, [{ id: JSON.stringify(['cp', DATE, 'am']), value: { b: { time: '13:00', note: 'Только заметка', unknown: { a: 1 }, mood: null } } }]);
  assert.deepEqual(plain(D.build(docs, defaults()).db.days[DATE].cp.am), plain(db.days[DATE].cp.am));
});

test('записи не того вида в хранилище пропускаются по одной и не ломают дневник', () => {
  const docs = docsOf(fullDiary()), clean = D.build(plain(docs), defaults());
  docs.days_2026.push({ id: 'не json', value: 1 }, { id: '["cp"]', value: {} }, { id: JSON.stringify(['cp', DATE, '__proto__']), value: { b: { time: '1' } } },
    { id: JSON.stringify(['m', DATE, 'wake', 'mood', '12.5']), value: { v: 1, c: 1 } }, { id: JSON.stringify(['m', DATE, 'wake', 'mood', '-1']), value: { v: 1, c: 1 } },
    { id: JSON.stringify(['m', DATE, 'wake', 'time', '9']), value: { v: 1, c: 1 } }, { id: JSON.stringify(['m', DATE, 'wake', 'mood', '9']), value: { v: 'x', c: 1 } },
    { id: JSON.stringify(['m', '2025-01-01', 'wake', 'mood', '9']), value: { v: 1, c: 1 } },   // день другого года в документе этого года
    { id: JSON.stringify(['cnt', DATE, 'work2']), value: 'много' }, { id: JSON.stringify(['f', DATE, 'cp']), value: { am: { mood: 9 } } }, { id: JSON.stringify(['tap', DATE, 'coffee', 'x']), value: 5 },
    { id: JSON.stringify(['entry', 'e9']), value: { i: 0, v: { id: 'другой' } } }, { id: '[1,2]', value: 1 });
  docs.mind_2026.push({ id: JSON.stringify([DATE, 'bad']), value: ['08:00', 'долго'] }, { id: JSON.stringify(['2025-01-01', 's']), value: ['08:00', 5] });
  docs.setup.push({ id: JSON.stringify(['x', 'days']), value: { leak: 1 } }, { id: JSON.stringify(['x', 'mealLink']), value: { leak: 1 } });
  const back = D.build(docs, defaults());
  assert.deepEqual(plain(back.db), plain(clean.db));
  assert.equal(Object.getPrototypeOf(back.db.days[DATE].cp), Object.prototype);
  assert.deepEqual(D.build({}, defaults()).db, { ...defaults(), days: {} }, 'пустое хранилище — дневник по умолчанию');
  assert.deepEqual(D.build(null, defaults()).cfg, { weight: null, kcal: null, prot: null });
});

test('ensureIds: у нажатий, отметок «Сейчас», строк времени и заходов появляется свой номер; повторы разводятся', () => {
  const db = defaults(); db.days[DATE] = { ...blank(), taps: { coffee: [{ t: '08:00', n: 1 }, { t: '08:01', n: 1, id: 'same' }, { t: '08:02', n: 1, id: 'same' }] },
    now: [{ t: '09:00', g: 'a' }], cntLog: { work: [{ m: 5, s: null, e: null }] }, mind: { sec: 5, n: 1, ss: [['08:00', 5]] } };
  D.ensureIds(db);
  const taps = db.days[DATE].taps.coffee.map(x => x.id);
  assert.equal(new Set(taps).size, 3); assert.equal(taps[1], 'same'); assert.ok(taps.every(x => typeof x === 'string' && x));
  assert.ok(db.days[DATE].now[0].id && db.days[DATE].cntLog.work[0].id); assert.equal(db.days[DATE].mind.ss[0].length, 3);
  const before = JSON.stringify(db); D.ensureIds(db); assert.equal(JSON.stringify(db), before, 'готовые номера не меняются');
});

/* ── Два устройства ── */

test('пример владельца (Day 57.6): 6 в 9:00 на обоих; телефон 7 в 9:30, компьютер 5 в 9:40 — в разделе 5, в журнале 6 и 7 по одному разу', async () => {
  const [phone, computer] = await pair();
  phone.day().cp.am = C.editSection(null, {}, { mood: 6, tags: {} }, visit('v0'), at('09:00', 1000)); phone.save(); phone.sync(); computer.sync();
  assert.deepEqual(plain(computer.day().cp.am), { time: '09:00', mood: 6, at: { mood: at('09:00', 1000) } });
  const edit = (device, value, id, now) => { const stored = device.day().cp.am, base = plain(stored); device.day().cp.am = C.editSection(stored, base, { ...plain(stored), mood: value }, visit(id), now); device.save(); };
  edit(phone, 7, 'vp', at('09:30', 3000)); edit(computer, 5, 'vc', at('09:40', 4000));
  for (const order of [[phone, computer], [computer, phone]]) {
    order[0].sync(); order[1].sync(); order[0].sync();
    for (const device of order) {
      const am = device.day().cp.am;
      assert.equal(am.mood, 5); assert.deepEqual(am.at.mood, at('09:40', 4000)); assert.equal(am.time, '09:00');
      assert.deepEqual(am.log.map(x => [x.v, x.t]).sort(), [[6, '09:00'], [7, '09:30']]);
    }
  }
  // повторный обмен и запись ничего не прибавляют
  for (let i = 0; i < 3; i++) { phone.save(); phone.sync(); computer.save(); computer.sync(); }
  assert.equal(phone.day().cp.am.log.length, 2); assert.deepEqual(plain(phone.day().cp.am), plain(computer.day().cp.am));
  // следующая правка на телефоне идёт от сведённого раздела: 5 уходит в журнал один раз
  edit(phone, 2, 'vq', at('10:00', 9000)); phone.sync(); computer.sync();
  assert.equal(computer.day().cp.am.mood, 2); assert.deepEqual(computer.day().cp.am.log.map(x => x.v).sort(), [5, 6, 7]);
});

test('позже поставленное побеждает и тогда, когда записано раньше: решает время отметки, а не порядок обмена', async () => {
  const [phone, computer] = await pair();
  // компьютер записал свою правку (9:40) первым, телефон свою (9:30) — вторым; в облако телефон пришёл последним
  computer.day().cp.am = C.editSection(null, {}, { mood: 5, tags: {} }, visit('vc'), at('09:40', 4000)); computer.save();
  phone.day().cp.am = C.editSection(null, {}, { mood: 7, tags: {} }, visit('vp'), at('09:30', 3000)); phone.save();
  computer.sync(); phone.sync(); computer.sync();
  for (const device of [phone, computer]) { assert.equal(device.day().cp.am.mood, 5); assert.deepEqual(device.day().cp.am.log.map(x => [x.v, x.t]), [[7, '09:30']]); }
});

test('разные шкалы и теги одного раздела с двух устройств остаются обе; снятый тег не возвращается', async () => {
  const [phone, computer] = await pair();
  phone.day().cp.am = C.editSection(null, {}, { mood: 6, tags: { a: true } }, visit('v0'), at('09:00', 1000)); phone.save(); phone.sync(); computer.sync();
  const change = (device, patch, id, now) => { const stored = device.day().cp.am, base = plain(stored); device.day().cp.am = C.editSection(stored, base, { ...plain(stored), ...patch(plain(stored)) }, visit(id), now); device.save(); };
  change(phone, s => ({ energy: 3, tags: { ...s.tags, b: true } }), 'vp', at('09:30', 3000));
  change(computer, s => ({ calm: 2, tags: { a: false, c: true }, note: 'С компьютера' }), 'vc', at('09:40', 4000));
  phone.sync(); computer.sync(); phone.sync();
  for (const device of [phone, computer]) {
    const am = device.day().cp.am;
    assert.equal(am.mood, 6); assert.equal(am.energy, 3); assert.equal(am.calm, 2); assert.equal(am.note, 'С компьютера');
    assert.deepEqual(Object.keys(am.tags).sort(), ['b', 'c'], 'тег a снят на компьютере и не вернулся');
    assert.deepEqual(am.tagAt, { b: '09:30', c: '09:40' }); assert.ok(!am.log);
  }
});

test('правка другого устройства, пришедшая во время захода в раздел, не затирается', async () => {
  const [phone, computer] = await pair();
  phone.day().cp.am = C.editSection(null, {}, { mood: 6, energy: 2, tags: {} }, visit('v0'), at('09:00', 1000)); phone.save(); phone.sync(); computer.sync();
  // телефон открыл раздел (запомнил, каким он был) и ещё не сохранил; компьютер тем временем поменял энергию
  const stored = phone.day().cp.am, base = plain(stored), v = visit('vp');
  const c = computer.day().cp.am; computer.day().cp.am = C.editSection(c, plain(c), { ...plain(c), energy: 4 }, visit('vc'), at('10:00', 5000)); computer.save(); computer.sync();
  // правка компьютера уже лежит в хранилище телефона, но экран телефона её ещё не подхватил (раздел открыт)
  phone.pull();
  phone.day().cp.am = C.editSection(stored, base, { ...plain(stored), mood: 5 }, v, at('10:30', 6000)); phone.save(); phone.sync(); computer.sync();
  for (const device of [phone, computer]) { const am = device.day().cp.am; assert.equal(am.energy, 4, 'энергия с компьютера'); assert.equal(am.mood, 5, 'настроение с телефона'); assert.deepEqual(am.at.energy, at('10:00', 5000)); }
});

test('раздел стёрли на одном устройстве, а на другом в это время поставили тег — тег остаётся с началом раздела', async () => {
  const [phone, computer] = await pair();
  phone.day().cp.am = C.editSection(null, {}, { mood: 6, tags: {} }, visit('v0'), at('09:00', 1000)); phone.save(); phone.sync(); computer.sync();
  delete phone.day().cp.am; phone.save();
  const c = computer.day().cp.am; computer.day().cp.am = C.editSection(c, plain(c), { ...plain(c), tags: { 'Прогулка': true } }, visit('vc'), at('11:15', 5000)); computer.save();
  phone.sync(); computer.sync(); phone.sync();
  for (const device of [phone, computer]) assert.deepEqual(plain(device.day().cp.am), { tags: { 'Прогулка': true }, tagAt: { 'Прогулка': '11:15' }, time: '11:15' });
});

test('нажатия одного счётчика, заходы во время в Day и записи дневника с двух устройств складываются; удалённое не возвращается', async () => {
  const [phone, computer] = await pair();
  phone.day().taps = { coffee: [{ t: '08:10', n: 1 }] }; phone.day().mind = { sec: 60, n: 1, ss: [['08:00', 60]] };
  phone.state.db.selfCare = { entries: [{ id: 'e1', date: DATE, time: '08:00', text: 'С телефона' }] }; phone.save();
  computer.day().taps = { coffee: [{ t: '08:20', n: 1 }, { t: '08:30', n: 1 }] }; computer.day().mind = { sec: 30, n: 1, ss: [['08:05', 30]] };
  computer.state.db.selfCare = { entries: [{ id: 'e2', date: DATE, time: '09:00', text: 'С компьютера' }] }; computer.save();
  phone.sync(); computer.sync(); phone.sync();
  for (const device of [phone, computer]) {
    assert.deepEqual(device.day().taps.coffee.map(x => x.t).sort(), ['08:10', '08:20', '08:30']);
    assert.deepEqual(plain(device.day().mind).ss.map(s => s.slice(0, 2)), [['08:00', 60], ['08:05', 30]]); assert.equal(device.day().mind.sec, 90); assert.equal(device.day().mind.n, 2);
    assert.deepEqual(device.state.db.selfCare.entries.map(e => e.id).sort(), ['e1', 'e2']);
  }
  // телефон убрал одно нажатие, компьютер в это время добавил ещё одно
  phone.day().taps.coffee = phone.day().taps.coffee.filter(x => x.t !== '08:20'); phone.save();
  computer.day().taps.coffee.push({ t: '08:40', n: 1 }); computer.save();
  computer.sync(); phone.sync(); computer.sync();
  for (const device of [phone, computer]) assert.deepEqual(device.day().taps.coffee.map(x => x.t).sort(), ['08:10', '08:30', '08:40']);
});

test('одна и та же запись с двух устройств: остаётся поздняя правка; разные разделы настроек остаются оба', async () => {
  const [phone, computer] = await pair();
  phone.day().note = 'Заметка с телефона'; phone.save();
  computer.day().note = 'Заметка с компьютера, позже'; computer.save();
  phone.state.db.sections.push({ k: 'custom', t: 'Свой раздел с телефона' }); phone.state.cfg.weight = 80; phone.save();
  computer.state.db.sections.find(s => s.k === 'am').t = 'Поздний завтрак'; computer.state.db.counters.push({ k: 'read', t: 'Чтение' }); computer.save();
  phone.sync(); computer.sync(); phone.sync();
  for (const device of [phone, computer]) {
    assert.equal(device.day().note, 'Заметка с компьютера, позже');
    assert.deepEqual(device.state.db.sections.map(s => s.k).sort(), ['am', 'custom', 'wake']);
    assert.equal(device.state.db.sections.find(s => s.k === 'am').t, 'Поздний завтрак');
    assert.deepEqual(device.state.db.counters.map(c => c.k).sort(), ['read', 'work']); assert.equal(device.state.cfg.weight, 80);
  }
});

test('после записи в хранилище уходит только то, что изменилось', async () => {
  const [phone, , cloud] = await pair(); Object.assign(phone.state, fullDiary()); phone.save(); phone.sync();
  const before = cloud.clock; phone.save(); assert.equal(cloud.clock, before, 'без правок ничего не пишется');
  phone.day().taps.coffee.push({ t: '13:00', n: 1 }); phone.save(); assert.equal(cloud.clock, before + 1, 'новое нажатие — одна запись');
  phone.day().cp.wake.tags['Прогулка'] = true; phone.day().cp.wake.tagAt['Прогулка'] = '13:05'; phone.save(); assert.equal(cloud.clock, before + 2, 'новый тег — одна запись');
  phone.day().note = 'Другая заметка'; phone.save(); assert.equal(cloud.clock, before + 3);
  // удаление и вставка не переписывают соседей по списку: место записи остаётся за ней
  phone.day().taps.coffee.shift(); phone.save(); assert.equal(cloud.clock, before + 4, 'убрали первое нажатие из трёх — одна запись, а не три');
  phone.state.db.sections.unshift({ k: 'first', t: 'Раньше утра' }); phone.save(); assert.equal(cloud.clock, before + 5, 'новый раздел в начало списка — одна запись');
  phone.state.db.sections.push(phone.state.db.sections.shift()); phone.save(); assert.equal(cloud.clock, before + 6, 'раздел переставили в конец — переписан он один');
  phone.sync(); assert.deepEqual(phone.state.db.sections.map(s => s.k), ['wake', 'am', 'first']);
  assert.deepEqual(phone.day().taps.coffee.map(x => x.t), ['12:00', '13:00']);
});

test('запись после правки стоит столько, сколько весит изменённый день, а не вся история', async () => {
  const [phone, , cloud] = await pair();
  for (let n = 1; n <= 28; n++) {
    const date = '2026-10-' + String(n).padStart(2, '0'), d = phone.day(date);
    d.cp.am = C.editSection(null, {}, { mood: n % 7, energy: 2, tags: { 'Умывание': true } }, visit('v' + n), at('09:00', 1000 + n));
    d.taps = { coffee: [{ t: '08:10', n: 1 }, { t: '12:00', n: 1 }] }; d.note = 'Заметка ' + n; d.sleep = { b: '00:30', w: '08:00' }; d.mind = { sec: 60, n: 1, ss: [['08:00', 60]] };
  }
  phone.save(); phone.sync();
  const total = cloud.clock; assert.ok(total > 28 * 8, 'записей много: ' + total);
  // без правок: ни одной записи и ни одного сравнения записей дней
  phone.spy.compared = 0; phone.save(); phone.save();   // первая запись после сборки из хранилища раскладывает всё, вторая — уже нет
  phone.spy.compared = 0; phone.save();
  assert.equal(cloud.clock, total); assert.ok(phone.spy.compared < 40, 'сравнивались только настройки, а не дни: ' + phone.spy.compared);
  // правка одного дня: сравниваются записи только этого дня
  phone.spy.compared = 0; phone.day('2026-10-14').note = 'Другая заметка'; phone.save();
  assert.equal(cloud.clock, total + 1); assert.ok(phone.spy.compared < 60, 'сравнивался один день: ' + phone.spy.compared);
  // правка вложенного значения на месте (тот же объект в памяти) замечена
  phone.day('2026-10-03').sleep.w = '08:30'; phone.save(); assert.equal(cloud.clock, total + 2);
  phone.day('2026-10-03').taps.coffee[0].t = '08:15'; phone.save(); assert.equal(cloud.clock, total + 3);
  // день убрали из дневника — его записи удалены; вернули — записаны снова
  const kept = plain(phone.day('2026-10-20')), records = [...phone.local.keys()].filter(k => k.includes('2026-10-20')).length;
  delete phone.state.db.days['2026-10-20']; phone.save(); assert.equal(cloud.clock, total + 3 + records);
  phone.state.db.days['2026-10-20'] = kept; phone.save(); phone.sync();
  assert.deepEqual(plain(phone.day('2026-10-20')), kept); assert.equal(phone.day('2026-10-03').sleep.w, '08:30'); assert.equal(phone.day('2026-10-14').note, 'Другая заметка');
});

test('места записей, поменянные другим устройством, не возвращаются обратно при следующей записи', async () => {
  const [phone, , cloud] = await pair();
  phone.day().taps = { coffee: [{ t: '08:10', n: 1 }, { t: '09:10', n: 1 }, { t: '10:10', n: 1 }] }; phone.save(); phone.sync(); phone.save();
  // другое устройство перенумеровало тот же список (порядок прежний, числа другие)
  let n = 0;
  for (const [key, r] of [...cloud.records]) if (key.includes('"tap"') && !r.deleted) cloud.records.set(key, { rev: ++cloud.clock, value: { ...plain(r.value), i: 10 + (n++) } });
  assert.equal(n, 3);
  phone.sync();
  const before = cloud.clock; phone.save(); phone.day().note = 'Правка после обмена'; phone.save();
  assert.equal(cloud.clock, before + 1, 'записана только заметка: места из хранилища приняты как есть');
  assert.deepEqual([...phone.local].filter(([key, r]) => key.includes('"tap"') && !r.deleted).map(([, r]) => r.value.i).sort(), [10, 11, 12]);
  assert.deepEqual(phone.day().taps.coffee.map(x => x.t), ['08:10', '09:10', '10:10']);
});

test('удаление записи списка на одном устройстве не затирает правку соседней записи на другом и не возвращает удалённое им', async () => {
  const [phone, computer] = await pair();
  phone.day().care = { checkins: [1, 2, 3, 4, 5].map(n => ({ id: 'c' + n, time: '0' + n + ':00', note: 'Запись ' + n })), events: [], practices: [] }; phone.save(); phone.sync(); computer.sync();
  // компьютер без связи: поправил четвёртую запись и удалил пятую
  computer.day().care.checkins[3].note = 'Поправлено на компьютере'; computer.day().care.checkins.pop(); computer.save();
  // телефон позже удалил первую — записи 2–5 сдвинулись в его списке
  phone.day().care.checkins.shift(); phone.save();
  phone.sync(); computer.sync(); phone.sync();
  for (const device of [phone, computer]) {
    assert.deepEqual(device.day().care.checkins.map(x => x.id), ['c2', 'c3', 'c4'], 'пятая не вернулась, первая удалена');
    assert.equal(device.day().care.checkins[2].note, 'Поправлено на компьютере');
  }
});
