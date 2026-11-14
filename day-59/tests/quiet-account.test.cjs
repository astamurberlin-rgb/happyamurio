'use strict';
/* Принципы владельца, закреплённые проверкой (с Day 57.3): при открытии Day ничего не всплывает само, в «Аккаунте» нет
   служебных блоков, ссылки не ведут на тестовые сборки. Каждая из трёх вещей уже возвращалась после «исправлено».
   Day 59: вход общий, хранение и обмен — только через общий модуль. Проверка следит, чтобы убранное не вернулось:
   страж записи, ручное сохранение и восстановление, диагностика, резерв расхождений, гость, прежние ячейки. */
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const dir = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(dir, name), 'utf8');
const own = fs.readdirSync(dir).filter(name => /\.(js|mjs|html|css)$/.test(name) && !/^Happy-Day-\d+\.html$/.test(name) && name !== 'release-notes.js');
const page = read('index.html');
const between = (text, from, to) => { const a = text.indexOf(from), b = text.indexOf(to, a + from.length); assert.ok(a >= 0 && b > a, 'нет куска: ' + from); return text.slice(a, b); };

test('при открытии ничего не всплывает само: напоминания о копии нет, запуск не открывает окон', () => {
  assert.ok(!page.includes('bkNag'), 'напоминание о резервной копии убрано вместе с ручным сохранением');
  const init = between(page, '(async function init(){', '})();');
  assert.ok(!/confirmBox\(|showModal\(|alert\(|prompt\(/.test(init), 'запуск не открывает окон');
  assert.deepEqual([...init.matchAll(/toast(?:Long)?\(([^)]*)\)/g)].map(m => m[1]), ['DayBoot.error'], 'при запуске сообщение одно — и только если хранилище на устройстве не открылось');
  assert.ok(init.includes('if(RO) setTimeout(roWarn,1500);'), 'и подсказка открыть последнюю версию, если записи сделаны более новой');
});

test('в «Аккаунте» только общая карточка входа; служебных блоков и ручного сохранения нет нигде', () => {
  assert.ok(page.includes('<section class="happy-section" data-happy-section="account"><h2 class="happy-heading">Аккаунт</h2><div class="happy-card" id="happy-account"></div></section>'));
  assert.ok(page.includes("HappyAccountUI.render(box,accountOptions())"), 'карточку рисует общий файл shared/happy-account-ui.js');
  for (const gone of ['Сохранить в облако', 'Вернуть из облака', 'Вернуть дневник до загрузки', 'Резервная копия', 'резерв расхождений', 'Разные версии записей', 'Диагностика', 'Гость', 'Обновить связь', 'Прочитать облако', 'Прочитать из Sport', 'Загрузить дневник'])
    assert.ok(!page.includes(gone), 'убранное вернулось на страницу: ' + gone);
  for (const id of ['clBox', 'bkPrev', 'bkBack', 'backupAge', 'dayDeveloperSync', 'dayDeveloperSyncTools', 'day-auto-status']) assert.ok(!new RegExp('id="' + id + '"').test(page), 'прежний блок: ' + id);
  const developer = between(page, '<section class="happy-section" data-happy-section="developer" hidden>', '<section class="happy-section" data-happy-section="version">');
  assert.deepEqual([...developer.matchAll(/<div class="eyebrow"><span>([^<]+)</g)].map(m => m[1]), ['Выгрузка', 'Из трекеров', 'Доступ к модели'], 'в разделе для разработчика — выгрузка, файл трекера и ключ модели');
  assert.deepEqual([...developer.matchAll(/<button[^>]*>([^<]+)<\/button>/g)].map(m => m[1]), ['Выгрузить дневник', 'Выгрузить CSV', 'Данные из трекеров', 'Отключено', 'Скрыть раздел']);
  for (const id of ['expJson', 'expCsv', 'impJson', 'wipe']) assert.equal((page.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1, id);
});

test('без входа — предложение войти на экране дня; запись проверяет вход в одном месте', () => {
  assert.match(page, /<section class="card day-signin" id="daySignIn" hidden><h2>Войди, чтобы записывать<\/h2>/);
  assert.ok(page.includes("function paintSignIn(){\n  var box=document.getElementById('daySignIn'); if(box) box.hidden=DayData.signedIn();"));
  const guard = between(page, 'function writeGuard(){', '\n}');
  assert.ok(guard.includes('if(RO){ roWarn(); return true }') && guard.includes('if(!DayData.signedIn()){ askSignIn(); return true }'));
  assert.ok(between(page, 'function lockGuard(){', '\n}').includes('if(writeGuard())return true;'), 'закрытый день, вход и версия проверяются одной функцией');
  const persist = between(page, 'function persistNow(){', '\n}');
  assert.ok(persist.includes('return DayData.save(DB,CFG);') && persist.includes('if(!DayData.signedIn()){'), 'дневник пишется только через общий модуль и только после входа');
});

test('своего хранилища и своих запросов к серверу у Day нет: только общий вход и общий модуль', () => {
  const allowed = { 'arc-motion.js': 2, 'index.html': 3 };   // вид дуги и оформление — настройки устройства, не записи
  for (const name of own) {
    const text = read(name), storage = (text.match(/localStorage\./g) || []).length;
    assert.equal(storage, allowed[name] || 0, name + ': обращений к памяти браузера ' + storage);
    assert.ok(!/indexedDB|sessionStorage|document\.cookie/.test(text), name + ': своё хранилище');
    assert.ok(!/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/.test(text), name + ': свой запрос в сеть');
    /* адрес сервера на странице один — в правиле «куда странице можно ходить» (Content-Security-Policy) */
    assert.equal((text.match(/supabase\.co/g) || []).length, name === 'index.html' ? 1 : 0, name + ': адрес сервера вне общего модуля');
    assert.ok(!/app_sync|sb_publishable/.test(text), name + ': таблица или ключ сервера вне общего модуля');
  }
  assert.match(page, /async function rawGet\(k\)\{ try\{ return localStorage\.getItem\(k\) \}catch\(e\)\{ return null \} \}/);
  assert.ok(page.includes(`<meta http-equiv="Content-Security-Policy" content="form-action 'none'; connect-src 'self' https://geqziziycpclhnucnsyx.supabase.co">`), 'страница ходит только к себе и к серверу Happy');
  assert.ok(read('arc-motion.js').includes("const KEY='happy-day.arc-style.v1'"), 'вид дуги — простая настройка устройства');
});

test('убранное не вернулось: страж, прежние файлы обмена, гость и прежние ячейки', () => {
  for (const file of ['auth-read-only.js', 'day-test-create.js', 'day-diagnostic.js', 'day-passive-plan.js', 'snapshot-sync.js', 'day-auto-sync.js', 'day-journal-sync.js', 'day-account-profile.js', 'day-account-data.js', 'day-local-store.js',
    'day-sport-auth.mjs', 'day-sport-bootstrap.mjs', 'day-sport-lifecycle.js', 'day-sport-view.mjs', 'sport-journal-validator.mjs', 'sport-measurement-reader.mjs',
    'shared/profile-storage.js', 'shared/happy-ui.js', 'shared/happy-summaries.js', 'shared/food-counters.js', 'shared/measurements-host.js', 'shared/measurements-model.js', 'shared/imported-history.js'])
    assert.ok(!fs.existsSync(path.join(dir, file)), 'файл остался: ' + file);
  const names = /auth-read-only|HappyAuthReadOnly|day-test-create|day-diagnostic|snapshot-sync|day-auto-sync|day-journal-sync|day-account-profile|day-account-data|day-passive-plan|DayLocalStore|dayStorage|HappyProfile|HappySummaries|HappyFoodCounters|profile-storage|localOnlyOwner|owner:'local'|owner==='local'/;
  const cells = /hd_db_v1|hd_cloud_v1|hd_link_meal_v1|hd_link_sport_v1|hd_app_links_v1|happy-auth:|auth-readonly-|auth_readonly_|-prototype-|happy-food-counters-v1|happy-user:/;
  for (const name of own) {
    const text = read(name);
    assert.ok(!names.test(text), name + ': ' + (text.match(names) || [''])[0]);
    assert.ok(!cells.test(text), name + ': прежняя ячейка ' + (text.match(cells) || [''])[0]);
  }
  for (const old of ['journal', 'link', 'counters', 'supplements', 'measurements']) assert.ok(!require('../day-docs.js').OWN.includes(old));
});

test('ни одна ссылка не ведёт на тестовую сборку; соседние приложения открываются по текущим адресам', () => {
  for (const name of own) assert.doesNotMatch(read(name), /chatgpt\.site/, name);
  const ui = read('selfcare-ui.js'), apps = JSON.parse(fs.readFileSync(path.join(dir, '..', 'shared', 'apps.json'), 'utf8'));
  assert.match(ui, /class="btn solid care-external" href="'\+STRONG_URL\+'" data-happy-app="sport"/, '«Открыть Sport ↗» берёт текущий выпуск Sport из shared/apps.json');
  for (const app of ['meal', 'sport']) {
    const m = page.match(new RegExp('href="\\.\\./([a-z0-9-]+)/" data-happy-app="' + app + '" target="_blank"'));
    assert.ok(m && fs.existsSync(path.join(dir, '..', m[1], 'index.html')), 'запасной адрес ' + app + ' называет существующий выпуск');
  }
  assert.equal(apps.day.entry, path.basename(dir) + '/index.html');
});
