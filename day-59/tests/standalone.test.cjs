'use strict';
/* Day одним файлом (Happy-Day-NN.html): тот же Day, все файлы страницы встроены. Собирает его
   scripts/build-day-standalone.py; проверка следит, что встроено ровно то, что лежит в папке выпуска, — общий вход,
   общий модуль хранения и документы Day в том числе, — и что наружу файл ничего не подгружает. */
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const dir = path.join(__dirname, '..'), release = path.basename(dir), version = release.split('-')[1];
const html = fs.readFileSync(path.join(dir, 'Happy-Day-' + version + '.html'), 'utf8');
const page = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');

test('версия та же, что у страницы; все скрипты и стили встроены', () => {
  assert.ok(html.includes('data-app-version="' + version + '"'));
  const sources = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(m => m[1]);
  assert.ok(sources.length > 10); for (const src of sources) assert.ok(src.startsWith('data:text/javascript;base64,'), 'скрипт не встроен: ' + src.slice(0, 60));
  assert.ok(!/<link[^>]*rel="stylesheet"/.test(html), 'стили встроены'); assert.ok(!/<link[^>]*rel="manifest"/.test(html), 'у файла нет адреса для установки');
  assert.equal(sources.length, [...page.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].length, 'скриптов столько же, сколько у страницы');
});

test('встроенные файлы — те же байты, что в папке выпуска', () => {
  const embedded = new Set([...html.matchAll(/<script\b[^>]*\bsrc="data:text\/javascript;base64,([^"]+)"/g)].map(m => Buffer.from(m[1], 'base64').toString()));
  const files = [...page.matchAll(/<script\b[^>]*\bsrc="([^"?]+)/g)].map(m => m[1]);
  for (const need of ['./shared/happy-account.js', './shared/happy-store.js', './shared/happy-account-ui.js', './day-docs.js', './day-data.js']) assert.ok(files.includes(need), 'страница подключает ' + need);
  for (const file of files) assert.ok(embedded.has(fs.readFileSync(path.join(dir, file), 'utf8')), 'встроен другой текст: ' + file);
});

test('инлайновый код страницы в файле тот же', () => {
  const inline = text => [...text.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim());
  assert.deepEqual(inline(html), inline(page));
});
