'use strict';
/* Подпись порции счётчика из Happy Meal (с Day 57.7). У добавки Meal пишет в описание счётчика portionText —
   «2 капсулы» без условных граммов (вес капсулы обычно неизвестен; в Meal грамм у такой добавки условный).
   У продуктов подписи нет — «q u · g г». Day 59: подпись считает общий файл витрины shared/happy-food.js,
   Day ставит её в строку счётчика и в сообщение о нажатии (counters.js). */
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../shared/happy-food.js');
const source = fs.readFileSync(path.join(__dirname, '..', 'counters.js'), 'utf8');

test('счётчик добавки: подпись, которую написал Meal, без условных граммов', () => {
  assert.equal(F.portion({ q: 2, u: 'капсула', g: 2, portionText: '2 капсулы' }), '2 капсулы');
  assert.equal(F.portion({ q: 1, u: 'мерная ложка', g: 30, portionText: '1 мерная ложка · 30 г' }), '1 мерная ложка · 30 г');
  assert.equal(F.portion({ q: 2, u: 'капсула', g: 2, portionText: ' 2 капсулы ' }), '2 капсулы', 'пробелы по краям убираются');
});

test('счётчик продукта: как раньше, количество, мера и вес', () => {
  assert.equal(F.portion({ q: 1, u: 'шт', g: 88 }), '1 шт · 88 г');
  assert.equal(F.portion({ q: 1, u: 'шт', g: 88, portionText: '' }), '1 шт · 88 г', 'пустая подпись не считается');
  assert.equal(F.portion({ q: 1, u: 'шт', g: 88, portionText: 7 }), '1 шт · 88 г', 'подпись — только текст');
  assert.equal(F.portion({ q: 1, u: 'шт', g: 88, portionText: 'д'.repeat(81) }), '1 шт · 88 г', 'слишком длинная подпись не считается');
});

test('строка счётчика и сообщение о нажатии берут эту подпись', () => {
  assert.ok(source.includes('mealPortion:F.portion(d)'), 'строка счётчика');
  assert.ok(source.includes("root.toast(d.title+' +'+short(d)+' · Happy Meal')"), 'сообщение о нажатии');
  // в сообщении у продукта — без веса: «+1 шт», у добавки — подпись Meal
  const short = new Function(source.match(/const short=d=>[^\n]+/)[0] + ';return short')();
  assert.equal(short({ q: 1, u: 'шт', g: 88 }), '1 шт'); assert.equal(short({ q: 2, u: 'капсула', g: 2, portionText: '2 капсулы' }), '2 капсулы');
});
