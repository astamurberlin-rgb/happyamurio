'use strict';
/* Update 57.3 · Принципы владельца, закреплённые проверкой: при открытии Day ничего не всплывает само, в «Аккаунте» нет
   служебных блоков, ссылки не ведут на тестовые сборки. Каждая из трёх вещей уже возвращалась после «исправлено». */
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('the backup reminder is never called: the account diary is saved to the cloud by itself', () => {
  const page = read('index.html');
  assert.ok(page.includes('async function bkNag('), 'the function stays for the developer section history');
  // Any call form: bkNag(), setTimeout(bkNag, …), addEventListener(…, bkNag)
  const calls = [...page.matchAll(/bkNag/g)].map(m => page.slice(Math.max(0, m.index - 24), m.index + 12));
  const real = calls.filter(c => !/async function bkNag/.test(c) && !/\(bkNag\)\s*не вызывается/.test(c) && !/Update 53|57\.3/.test(c));
  assert.deepEqual(real.filter(c => /setTimeout\(bkNag|bkNag\(\)|,\s*bkNag\b/.test(c)), [], 'no call of bkNag is left');
});

test('service blocks are created in the developer section, not in the account', () => {
  const sync = read('day-journal-sync.js'), data = read('day-account-data.js');
  assert.ok(sync.includes('developer().append(box);developer().append(tools);'), 'guest-records card goes to the developer section');
  assert.ok(!sync.includes('section.append(box)'), 'guest-records card is not appended to the account');
  assert.match(data, /\(doc\.getElementById\('dayDeveloperSyncTools'\)\|\|section\)\.append\(panel\)/, '«Разные версии записей» goes to the developer section');
  assert.ok(read('index.html').includes('<div id="dayDeveloperSyncTools"></div>'), 'the developer container exists in the page');
});

test('no link of the app leads to a test build', () => {
  for (const name of ['index.html', 'selfcare-ui.js', 'selfcare-core.js', 'day-journal-sync.js', 'counters.js']) {
    assert.doesNotMatch(read(name), /chatgpt\.site/, name + ' has no test-site address');
  }
  const ui = read('selfcare-ui.js');
  assert.match(ui, /class="btn solid care-external" href="'\+STRONG_URL\+'" data-happy-app="sport"/, '«Открыть Sport ↗» takes the current Sport release from shared/apps.json');
  assert.match(ui, /const STRONG_URL='https:\/\/astamurberlin-rgb\.github\.io\/happyamurio\/sport-\d+\/'/, 'the fallback address is a published Sport release');
});
