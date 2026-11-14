'use strict';
/* Day 59 · Счётчики еды из Happy Meal и «съедено» в кольце энергии — через общий модуль хранения.
   Счётчик принадлежит Meal: Day читает его из витрины meal/foods. Нажатие принадлежит Day: запись его документа
   foodtaps, Meal читает их оттуда. «Съедено» — итог дня из сводки Meal (meal/summary) плюс свои нажатия, которые
   Meal ещё не посчитал; посчитанное второй раз не прибавляется, снятое после сводки вычитается.
   Настоящий код: counters.js, mealFood и mealChanged из selfcare-ui.js, syncMeal и mealDay из index.html,
   shared/happy-food.js. Хранилище — заглушка с тем же видом записей, что отдаёт общий модуль; записи придуманные. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const F = require('../shared/happy-food.js');
const ui = read('selfcare-ui.js'), page = read('index.html'), countersJs = read('counters.js');
const DATE = '2026-11-11', PREV = '2026-11-10';
const plain = value => JSON.parse(JSON.stringify(value));
const cut = (text, from, to) => { const a = text.indexOf(from), b = text.indexOf(to, a + from.length); assert.ok(a >= 0 && b > a, 'нет куска: ' + from); return text.slice(a, b); };

const MANDARIN = { id: 'f-mandarin', n: 'Мандарин, сырой', k: 53, p: 0.8, f: 0.3, c: 11.5, counterValues: { kcal: 53, prot: 0.8, fat: 0.3, carb: 11.5, fib: 1.8 } };
const FEIJOA = { id: 'f-feijoa', n: 'Фейхоа, сырая', k: 55, p: 1, f: 0.6, c: 10.5, counterValues: { kcal: 55, prot: 1, fat: 0.6, carb: 10.5, fib: 6.4 } };
const counter = (id, title, g, food, targets = { day: true, sport: false }) => ({ id, value: { title, fid: food.id, q: 1, g, u: 'шт', food, targets } });
const C_MANDARIN = counter('c2', 'Мандарин', 88, MANDARIN), C_FEIJOA = counter('c1', 'Фейхоа', 42, FEIJOA);
const COUNTED = [46.64, 0.7, 0.26, 10.12, 1.58];   // что Meal посчитал за одну порцию мандарина

/* Day с хранилищем-заглушкой: документы meal/foods и meal/summary (пишет Meal), day/foodtaps (пишет Day). */
function world({ foods = [], summary = null, signedIn = true, linkOff = null } = {}) {
  const docs = { foods: plain(foods), summary: summary ? plain(summary) : [], foodtaps: [] }, subs = { foods: [], summary: [], foodtaps: [] }, log = { toasts: [], saves: 0, own: [], writes: [], painted: 0, repaints: 0 };
  let clock = 1000;
  const handle = (name, own) => {
    const h = { newer: false, all: () => plain(docs[name]).sort((a, b) => a.id < b.id ? -1 : 1), subscribe: fn => { subs[name].push(fn); return () => {}; } };
    if (own) {
      h.putMany = list => {
        for (const x of list) { docs[name] = docs[name].filter(r => r.id !== x.id); if (!x.deleted) docs[name].push({ id: x.id, value: plain(x.value), at: ++clock }); log.writes.push(x.deleted ? ['−', x.id] : ['+', x.id]); }
        return Promise.resolve();
      };
      h.put = (id, value) => h.putMany([{ id, value }]);
    }
    return h;
  };
  const store = { doc: name => { assert.equal(name, 'foodtaps', 'свой документ Day для еды один'); return handle(name, true); },
    neighbor: (app, name) => { assert.equal(app, 'meal'); assert.ok(name === 'foods' || name === 'summary', 'Day читает у Meal только витрину: ' + name); return handle(name, false); } };
  const listeners = [];
  const c = vm.createContext({ console, JSON, Object, Array, Number, Math, Promise, HappyFood: F, DATE,
    DayData: { signedIn: () => signedIn, store, report: e => { throw e; } },
    DB: { taps: [{ k: 'own', t: 'Своя привычка', step: 1 }], days: {} }, curDate: DATE, MEAL_SEEN: false, ready: true, screenOn: true,
    todayISO: () => DATE, nowHM: () => '16:50', toast: m => log.toasts.push(m), escH: String, lockGuard: () => false,
    save: () => { log.saves++; }, tapAdd: k => { log.own.push(k); }, tapsHTML: () => '<button data-k="meal-c2">Мандарин</button>', renderAll: () => { log.repaints++; }, renderTapSheet() {},
    document: { getElementById: id => { assert.equal(id, 'tapList'); return { addEventListener: (type, fn) => listeners.push(fn) }; } } });
  c.day = d => c.DB.days[d] || (c.DB.days[d] = { taps: {} }); c.tapDef = k => c.DB.taps.find(t => t.k === k);
  if (linkOff != null) c.DayAppLinks = { mealDayOn: date => date < linkOff, mealEventOn: (date, time, ms) => date < linkOff };
  vm.runInContext(`var root=globalThis;function block(){return {classList:{contains:function(name){return name==='on'&&screenOn}}}}
    function paintEnergy(){painted=(typeof painted==='number'?painted:0)+1}var painted=0;` +
    cut(page, 'var MEAL_SUMMARY=null;', 'function paintMealSet(){') + page.match(/function mealDay\(d\)\{[^\n]+\}/)[0] +
    cut(ui, 'function mealFood(date){', 'function activityFacts(){') + ';var SelfCare={mealChanged:function(){mealChanged()}};', c);
  vm.runInContext(countersJs, c);
  vm.runInContext('syncMeal();HappyDayCounters.init()', c);
  return { c, docs, subs, log, listeners, run: code => vm.runInContext(code, c),
    /* Meal записал свои документы (на этом же устройстве или после обмена): подписки сообщают Day */
    meal(name, records) { docs[name] = plain(records); if (name === 'summary') vm.runInContext('syncMeal()', c); subs[name].forEach(fn => fn({ origin: 'tab' })); },
    eaten: (date = DATE) => plain(vm.runInContext(`mealFood('${date}')`, c)) };
}
const day = (extra = {}) => ({ food: true, k: 148.5, p: 14.5, f: 9.9, c: 0.3, sec: { am: { food: true, n: 1 } }, ev: [], ...extra });
const summaryOf = (days, extra = []) => Object.keys(days).map(date => ({ id: date, value: days[date], at: 5000 })).concat([{ id: 'secs', value: [{ k: 'am', t: 'Завтрак' }], at: 5000 }], extra);

test('счётчик Meal показан в Day, только когда Meal назначил его в Day; свои счётчики Day не тронуты', () => {
  const w = world({ foods: [C_MANDARIN, counter('c3', 'Только Sport', 30, FEIJOA, { day: false, sport: true }), { id: 'bad', value: { title: 'Без продукта' } }] });
  assert.deepEqual(plain(w.c.DB.taps), [{ k: 'own', t: 'Своя привычка', step: 1 }, { k: 'meal-c2', t: 'Мандарин', step: 1, mealCounterId: 'c2', mealPortion: '1 шт · 88 г' }]);
  // Meal добавил счётчик и переименовал прежний — Day перерисовался сам
  w.meal('foods', [counter('c2', 'Мандарин марокканский', 88, MANDARIN), C_FEIJOA]);
  assert.deepEqual(plain(w.c.DB.taps.map(t => [t.k, t.t])), [['own', 'Своя привычка'], ['meal-c2', 'Мандарин марокканский'], ['meal-c1', 'Фейхоа']]); assert.ok(w.log.repaints > 0);
  // Meal выключил показ в Day — счётчик из Day ушёл
  w.meal('foods', [counter('c2', 'Мандарин', 88, MANDARIN, { day: false, sport: false }), C_FEIJOA]);
  assert.deepEqual(plain(w.c.DB.taps.map(t => t.k)), ['own', 'meal-c1']);
  assert.equal(w.log.writes.length, 0, 'счётчики Day не пишет: они принадлежат Meal');
});

test('нажатие — запись в документе нажатий Day: номер с названием приложения, продукт и порция внутри', () => {
  const w = world({ foods: [C_MANDARIN] });
  w.run("tapAdd('meal-c2')");
  assert.equal(w.docs.foodtaps.length, 1);
  const tap = w.docs.foodtaps[0];
  assert.match(tap.id, /^day-[0-9a-f-]{36}$/); assert.ok(Number.isSafeInteger(tap.value.at));
  assert.deepEqual({ ...tap.value, at: 0 }, { cid: 'c2', date: DATE, item: { fid: 'f-mandarin', q: 1, u: 'шт', g: 88, t: '16:50', sec: 'dn', counterFood: MANDARIN }, at: 0 });
  assert.deepEqual(plain(w.c.DB.days[DATE].taps['meal-c2']), [{ t: '16:50', n: 1, counterEventId: tap.id }], 'в дневнике — вид нажатия');
  assert.deepEqual(w.log.toasts, ['Мандарин +1 шт · Happy Meal']); assert.deepEqual(w.log.own, [], 'своё нажатие Day здесь не записывается');
  // свой счётчик Day идёт прежним путём
  w.run("tapAdd('own')"); assert.deepEqual(w.log.own, ['own']); assert.equal(w.docs.foodtaps.length, 1);
  // задним числом время нажатия неизвестно
  w.run("curDate='2026-11-10';tapAdd('meal-c2')");
  assert.equal(w.docs.foodtaps.find(r => r.value.date === PREV).value.item.t, null);
  assert.deepEqual(F.taps(w.docs.foodtaps).map(t => t.date), [DATE, PREV], 'записи читает общий файл витрины');
});

test('сняли нажатие или поправили время в Day — запись удалена или поправлена; чужие записи не трогаются', () => {
  const w = world({ foods: [C_MANDARIN, C_FEIJOA] });
  w.run("tapAdd('meal-c2');tapAdd('meal-c2');tapAdd('meal-c1')");
  const [first, second] = w.c.DB.days[DATE].taps['meal-c2'].map(x => x.counterEventId); w.log.writes.length = 0;
  w.run("DB.days[DATE].taps['meal-c2'][0].t='09:15';save()");
  assert.deepEqual(w.log.writes, [['+', first]]); assert.equal(w.docs.foodtaps.find(r => r.id === first).value.item.t, '09:15'); assert.equal(w.log.saves, 1);
  w.run("DB.days[DATE].taps['meal-c2'].pop();save()");
  assert.deepEqual(w.log.writes.slice(1), [['−', second]]); assert.deepEqual(w.docs.foodtaps.map(r => r.value.cid).sort(), ['c1', 'c2']);
  w.log.writes.length = 0; w.run('save();save()'); assert.deepEqual(w.log.writes, [], 'без правок ничего не пишется');
  // Meal убрал счётчик из Day: его нажатия остаются в документе как были
  w.meal('foods', [C_MANDARIN]); w.run('save()');
  assert.deepEqual(w.docs.foodtaps.map(r => r.value.cid).sort(), ['c1', 'c2']); assert.ok(!('meal-c1' in w.c.DB.days[DATE].taps));
  // вернул — нажатие снова видно
  w.meal('foods', [C_MANDARIN, C_FEIJOA]); assert.equal(w.c.DB.days[DATE].taps['meal-c1'].length, 1);
});

test('нажатие с другого устройства появляется само; название и удаление счётчика Meal в Day закрыты', () => {
  const w = world({ foods: [C_MANDARIN] });
  w.docs.foodtaps.push({ id: 'day-from-phone', value: F.tap({ id: 'c2', ...C_MANDARIN.value }, DATE, '08:00', 500), at: 2000 }); w.subs.foodtaps.forEach(fn => fn({ origin: 'cloud' }));
  assert.deepEqual(plain(w.c.DB.days[DATE].taps['meal-c2']), [{ t: '08:00', n: 1, counterEventId: 'day-from-phone' }]);
  assert.equal(w.listeners.length, 1);
  const click = attrs => { let stopped = false; w.listeners[0]({ target: { closest: () => ({ dataset: attrs }) }, stopImmediatePropagation: () => { stopped = true; } }); return stopped; };
  assert.equal(click({ ren: 't1' }), true); assert.equal(click({ del: 't1' }), true);
  assert.match(w.log.toasts[0], /настраиваются в Happy Meal/); assert.match(w.log.toasts[1], /убирается в Happy Meal/);
  assert.equal(click({ ren: 't0' }), false, 'свой счётчик Day переименовывается как раньше');
  assert.match(w.run("tapsHTML({})"), /Мандарин<small class="fc-day-portion">1 шт · 88 г · Meal<\/small>/);
});

test('без входа счётчиков Meal нет и нажатие ничего не записывает', () => {
  const w = world({ foods: [C_MANDARIN], signedIn: false });
  assert.deepEqual(plain(w.c.DB.taps.map(t => t.k)), ['own']); assert.equal(w.eaten(), null);
  w.c.DB.taps.push({ k: 'meal-c2', t: 'Мандарин', mealCounterId: 'c2' }); w.run("tapAdd('meal-c2')");
  assert.equal(w.docs.foodtaps.length, 0); assert.deepEqual(w.log.toasts, []);
});

test('«съедено»: сводки Meal нет и нажатий нет — неизвестно; своё нажатие попадает в кольцо сразу', () => {
  const w = world({ foods: [C_MANDARIN] });
  assert.equal(w.eaten(), null, 'нет ни сводки, ни нажатий: прочерк, а не ноль');
  w.run("tapAdd('meal-c2')");
  assert.deepEqual(w.eaten(), { k: 46.6, p: 0.7, f: 0.3, c: 10.1, fib: 1.6 });
  assert.equal(w.eaten(PREV), null, 'у каждого дня свои порции');
  assert.equal(w.c.painted, 1, 'открытый экран «Активность» пересчитан сразу');
});

test('«съедено»: порция, которую Meal посчитал, второй раз не прибавляется; непосчитанная прибавляется', () => {
  const w = world({ foods: [C_MANDARIN] });
  w.run("tapAdd('meal-c2')"); const a = w.docs.foodtaps[0].id;
  // Meal прочитал нажатие и включил его в итог дня
  w.meal('summary', summaryOf({ [DATE]: day({ k: 195.1, p: 15.2, f: 10.2, c: 10.4, fib: 1.6, cs: { [a]: COUNTED } }) }));
  assert.deepEqual(w.eaten(), day({ k: 195.1, p: 15.2, f: 10.2, c: 10.4, fib: 1.6, cs: { [a]: COUNTED } }), 'всё посчитано: числа Meal и остальные его поля');
  w.run("tapAdd('meal-c2')");
  const more = w.eaten();
  assert.equal(more.k, 241.7); assert.equal(more.p, 15.9); assert.equal(more.fib, 3.2); assert.deepEqual(more.sec, { am: { food: true, n: 1 } }, 'приёмы дня остаются');
  assert.equal(w.eaten(PREV), null, 'день, о котором Meal ничего не знает, остаётся неизвестным');
  assert.equal(w.docs.summary.find(r => r.id === DATE).value.k, 195.1, 'сама сводка не меняется');
});

test('«съедено»: «−» после сводки вычитает то, что посчитал Meal; перенос на другой день — тоже; итог не уходит в минус', () => {
  const w = world({ foods: [C_MANDARIN] });
  w.run("tapAdd('meal-c2');tapAdd('meal-c2')"); const [a, b] = w.docs.foodtaps.map(r => r.id);
  w.meal('summary', summaryOf({ [DATE]: day({ k: 241.8, p: 15.9, f: 10.4, c: 20.5, fib: 3.2, cs: { [a]: COUNTED, [b]: COUNTED } }) }));
  assert.equal(w.eaten().k, 241.8);
  w.run("DB.days[DATE].taps['meal-c2'].pop();save()");
  assert.deepEqual([w.eaten().k, w.eaten().fib], [195.2, 1.6], 'снятое нажатие вычитается по числам Meal');
  // оставшееся нажатие перенесли на вчера (запись та же, дата другая)
  const left = w.docs.foodtaps[0]; left.value.date = PREV; w.subs.foodtaps.forEach(fn => fn({ origin: 'cloud' }));
  assert.equal(w.eaten().k, 148.5, 'перенесённая порция уходит из этого дня'); assert.equal(w.eaten(PREV).k, 46.6, 'и появляется в новом');
  const less = world({ foods: [C_MANDARIN], summary: summaryOf({ [DATE]: { food: true, k: 10, p: 0, f: 0, c: 0, cs: { 'day-gone': COUNTED } } }) });
  assert.equal(less.eaten().k, 0);
});

test('«съедено»: чужие нажатия в сводке и записи, по которым Meal решил сам, Day не трогает', () => {
  const w = world({ foods: [C_MANDARIN] });
  w.run("tapAdd('meal-c2');tapAdd('meal-c2')"); const [ghost, fresh] = w.docs.foodtaps.map(r => r.id);
  // в cs — нажатие из Sport и из самого Meal: в документе Day их нет, и это не значит, что их сняли
  w.meal('summary', summaryOf({ [DATE]: day({ k: 241.8, cs: { 'sport-1': COUNTED, 'meal-1': COUNTED } }) }, [{ id: 'skipped', value: [ghost, 7, '', null], at: 5000 }]));
  assert.equal(w.eaten().k, 288.4, 'прибавлено только новое нажатие; названное в skipped Meal учитывает сам');
  w.run("DB.days[DATE].taps['meal-c2']=DB.days[DATE].taps['meal-c2'].filter(function(x){return x.counterEventId!=='" + fresh + "'});save()");
  assert.equal(w.eaten().k, 241.8);
});

test('связь с Meal выключена: за день без связи еды нет, нажатия не учитываются', () => {
  const w = world({ foods: [C_MANDARIN], summary: summaryOf({ [PREV]: day(), [DATE]: day({ k: 500 }) }), linkOff: DATE });
  assert.equal(w.eaten(PREV).k, 148.5, 'что было до выключения, остаётся');
  assert.equal(w.eaten(DATE), null);
  // кнопки счётчиков Meal при выключенной связи скрыты (tapsHTML на странице); запись, сделанная в это время, в дне не показана
  w.run("tapAdd('meal-c2')"); assert.equal(w.docs.foodtaps.length, 1);
  assert.equal(((w.c.DB.days[DATE] || {}).taps || {})['meal-c2'], undefined); assert.equal(w.eaten(DATE), null);
  assert.ok(page.includes("DB.taps.filter(function(c){ return !(c.mealCounterId&&typeof DayAppLinks!=='undefined'&&!DayAppLinks.on('meal')) })"), 'кнопки счётчиков Meal скрыты, пока связь выключена');
});

test('открытый экран «Активность» пересчитывается, когда меняется сводка или счётчики, — и только тогда', () => {
  const w = world({ foods: [C_MANDARIN] });
  w.run('mealChanged()'); assert.equal(w.c.painted, 1);
  w.run('screenOn=false;mealChanged()'); assert.equal(w.c.painted, 1, 'открыт другой экран');
  w.run('screenOn=true;ready=false;mealChanged()'); assert.equal(w.c.painted, 1, 'модуль ещё не запущен');
  w.run('ready=true;paintEnergy=function(){throw Error("сбой отрисовки")};mealChanged()');   // не должно бросать
  assert.ok(ui.includes('root.SelfCare={sportStart,sportChanged,sportDates(){return sportDays.slice();},mealChanged,'));
  assert.ok(page.includes('try{ if(window.SelfCare&&SelfCare.mealChanged) SelfCare.mealChanged() }catch(e){}'), 'свежая сводка Meal перерисовывает кольцо');
  assert.ok(ui.includes('food=mealFood(curDate);'), 'кольцо берёт «съедено» через mealFood');
  assert.ok(!/HappyFoodCounters|happy-food-counters-v1|DB\.mealCounters/.test(countersJs + ui + page), 'прежнего общего документа счётчиков в Day нет');
});
