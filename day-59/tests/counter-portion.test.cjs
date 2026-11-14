'use strict';
/* Update 57.7 · подпись порции счётчика из Happy Meal. Meal 29 пишет в описание счётчика добавки portionText —
   «2 капсулы» без условных граммов (вес капсулы обычно неизвестен; в Meal грамм у такой добавки условный).
   У продуктов и у описаний из прежних Meal подписи нет — как раньше, «q u · g г». Настоящий код counters.js. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '..', 'counters.js'), 'utf8');
const cut = (text, from, to) => { const a = text.indexOf(from), b = text.indexOf(to, a + from.length); assert.ok(a >= 0 && b > a, 'block found: ' + from); return text.slice(a, b); };
const c = vm.createContext({});
vm.runInContext(cut(source, 'function portionText(d){', 'function apply(doc){'), c);

test('a supplement counter from Meal 29: the label Meal wrote, without nominal grams', () => {
  assert.equal(c.portion({q: 2, u: 'капсула', g: 2, portionText: '2 капсулы'}), '2 капсулы');
  assert.equal(c.portion({q: 1, u: 'мерная ложка', g: 30, portionText: '1 мерная ложка · 30 г'}), '1 мерная ложка · 30 г');
  assert.equal(c.portionText({q: 2, u: 'капсула', g: 2, portionText: ' 2 капсулы '}), '2 капсулы', 'spaces around are dropped');
});

test('foods and definitions from older Meal: as before', () => {
  assert.equal(c.portion({q: 1, u: 'шт', g: 88}), '1 шт · 88 г');
  assert.equal(c.portion({q: 1, u: 'шт', g: 88, portionText: ''}), '1 шт · 88 г', 'an empty label is ignored');
  assert.equal(c.portion({q: 1, u: 'шт', g: 88, portionText: 7}), '1 шт · 88 г', 'only text counts');
  assert.equal(c.portion({q: 1, u: 'шт', g: 88, portionText: 'д'.repeat(81)}), '1 шт · 88 г', 'an overlong label is ignored');
});

test('the counter row and the tap message use the label', () => {
  assert.ok(source.includes('mealPortion:portion(d)'), 'counter row');
  assert.ok(source.includes("root.toast(d.title+' +'+(portionText(d)||d.q+' '+d.u)+' · Happy Meal')"), 'tap message');
});
