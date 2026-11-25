/* Сборка общих значений Happy из дизайн-системы: design-system/tokens.json → shared/happy-colors.css.
   Запуск из корня: node scripts/build-tokens.mjs          — пишет файл;
                    node scripts/build-tokens.mjs --check  — только сверяет (выход 1, если файл устарел).
   Дальше, как для любого общего файла: node scripts/sync-shared.mjs, node scripts/sync-shared-ui.mjs,
   сборка Sport, python3 -I scripts/build-day-standalone.py. Всё это делает scripts/build-styles.sh.
   Каждый токен становится CSS-переменной:
   - цвета с именами из кода (happy-…, hs-…) — под своим именем; по приложению — в блоке приложения;
   - остальные цвета и все размеры, скругления, отступы, тени, размытие, движение, шрифты — --happy-<имя>.
   Блок «из Color Studio» сохраняет прежний вид (метки начала и конца, :root = Day, у Meal и Sport только отличия):
   его читает prototypes/studio.html. — Claude · 25.11.2026 */
import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const OUT='shared/happy-colors.css',APPS=['day','meal','sport'];
const tokens=JSON.parse(await readFile(new URL('design-system/tokens.json',root),'utf8'));

// Запись значений — как в коде до сборки: #fff вместо #ffffff, .72 вместо 0.72.
const css=v=>String(v).replace(/#ffffff\b/gi,'#fff').replace(/(^|[^\d.])0\.(\d)/g,'$1.$2');
const perApp=v=>v&&typeof v==='object';
const valueFor=(v,app)=>perApp(v)?v[app]:v;
const line=(name,value)=>`  --${name}:${css(value)};`;
const block=(selector,lines)=>lines.length?`${selector}{\n${lines.join('\n')}\n}`:'';
const appSel=app=>`:root[data-happy-appearance-app="${app}"]`;
const codeName=n=>/^(happy|hs)-/.test(n);
const varName=n=>codeName(n)?n:'happy-'+n;

const colors=tokens.color.tokens;
const studio=colors.filter(t=>codeName(t.name)&&t.group!=='meaning');
const meaning=colors.filter(t=>t.group==='meaning');
const other=colors.filter(t=>!codeName(t.name));
for(const t of meaning)if(perApp(t.value))throw Error('Цвет смысла один для всех приложений: '+t.name);

// happy-…: :root — значение Day, Meal и Sport — только где отличаются. hs-…: у каждого приложения своё.
const happy=studio.filter(t=>t.name.startsWith('happy-')),hs=studio.filter(t=>t.name.startsWith('hs-'));
const rootHappy=happy.filter(t=>valueFor(t.value,'day')!==undefined).map(t=>line(t.name,valueFor(t.value,'day')));
const appHappy=app=>happy.filter(t=>perApp(t.value)&&t.value[app]!==undefined&&css(t.value[app])!==css(t.value.day)).map(t=>line(t.name,t.value[app]));
const appHs=app=>hs.filter(t=>valueFor(t.value,app)!==undefined).map(t=>line(t.name,valueFor(t.value,app)));

const otherRoot=other.filter(t=>!perApp(t.value)).map(t=>line(varName(t.name),t.value));
const otherApp=app=>other.filter(t=>perApp(t.value)&&t.value[app]!==undefined).map(t=>line(varName(t.name),t.value[app]));

const groups=[['radius','скругления'],['spacing','отступы'],['size','размеры'],['shadow','тени'],['blur','размытие'],['duration','движение']];
const measures=groups.map(([key,title])=>`  /* ${title} */\n`+tokens[key].tokens.map(t=>line(varName(t.name),t.value)).join('\n'));
const type=[line('happy-font-sans',tokens.type.families.sans)];
for(const g of tokens.type.groups)for(const s of g.styles){
  const n='happy-type-'+s.name;
  type.push(line(n+'-size',s.fontSize),line(n+'-weight',s.fontWeight),line(n+'-line',s.lineHeight));
  if(s.letterSpacing!==undefined)type.push(line(n+'-tracking',s.letterSpacing));
}

const out=[
`/* Happy — общие цвета и размеры трёх приложений (✱ design tokens).
   ФАЙЛ СОБРАН ИЗ design-system/tokens.json командой node scripts/build-tokens.mjs. Руками не править: править tokens.json.
   Цвета и размеры в стилях приложений и общих экранов берутся отсюда по имени, а не вписываются числом.
   Блок «из Color Studio» — палитра каждого приложения: значения как в Color Studio.
   Тема (Настроить тему) подменяет эти же имена на цвета темы: shared/happy-appearance.js, функция skin().
   Белый и чёрный в тенях и масках остаются числом: от темы они не зависят. */`,
'/* ── из Color Studio: палитра приложения ── */',
block(':root',rootHappy),
...APPS.filter(a=>a!=='day').map(a=>block(appSel(a),appHappy(a))),
'/* Общие экраны (вход, профиль, листы — shared/happy-screens.css): цвета каждого приложения. */',
...APPS.map(a=>block(appSel(a),appHs(a))),
'/* ── конец блока из Color Studio ── */',
'',
'/* Цвета смысла: одинаковые в трёх приложениях, тема их не меняет. */',
block(':root',meaning.map(t=>line(t.name,t.value))),
'',
'/* Остальные цвета дизайн-системы. */',
block(':root',otherRoot),
...APPS.map(a=>block(appSel(a),otherApp(a))),
'',
'/* Размеры, скругления, отступы, тени, размытие, движение и шрифты. */',
block(':root',[...measures,'  /* шрифты */',...type]),
].filter(x=>x!=='').join('\n').replace(/\n(\/\* (Цвета смысла|Остальные|Размеры))/g,'\n\n$1')+'\n';

// Общие стили берут значения по имени без запасного числа: каждое имя обязано быть в собранном файле.
const defined=new Set([...out.matchAll(/--([\w-]+):/g)].map(m=>m[1]));
for(const file of ['shared/happy-design.css','shared/happy-screens.css']){
  const text=await readFile(new URL(file,root),'utf8');
  const missing=[...new Set([...text.matchAll(/var\(--(happy-[\w-]+)\)/g)].map(m=>m[1]))].filter(n=>!defined.has(n));
  if(missing.length){console.error(file+': нет в tokens.json: '+missing.join(', '));process.exit(1);}
}

const path=new URL(OUT,root);
let current='';try{current=await readFile(path,'utf8');}catch{}
if(process.argv.includes('--check')){
  if(current!==out){console.error(OUT+' не совпадает с design-system/tokens.json. Запусти: sh scripts/build-styles.sh');process.exit(1);}
  console.log(OUT+' совпадает с tokens.json.');
}else if(current===out)console.log(OUT+': без изменений.');
else{await writeFile(path,out);console.log('Собрано: '+OUT+' ← design-system/tokens.json');}
