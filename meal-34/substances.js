/* H068. Canonical Meal nutrient identifiers/units. No inferred label quantities. */
(function(root){'use strict';
const fields=[
  {
    "key": "kcal",
    "title": "Калории",
    "unit": "ккал",
    "group": "main"
  },
  {
    "key": "prot",
    "title": "Белки",
    "unit": "г",
    "group": "main"
  },
  {
    "key": "fat",
    "title": "Жиры",
    "unit": "г",
    "group": "main"
  },
  {
    "key": "carb",
    "title": "Углеводы",
    "unit": "г",
    "group": "main"
  },
  {
    "key": "fib",
    "title": "Клетчатка",
    "unit": "г",
    "group": "carb"
  },
  {
    "key": "water",
    "title": "Вода",
    "unit": "г",
    "group": "etc"
  },
  {
    "key": "alc",
    "title": "Алкоголь",
    "unit": "г",
    "group": "etc"
  },
  {
    "key": "salt",
    "title": "Соль",
    "unit": "г",
    "group": "min"
  },
  {
    "key": "vA",
    "title": "Витамин A",
    "unit": "мкг",
    "group": "vit"
  },
  {
    "key": "vD",
    "title": "Витамин D",
    "unit": "мкг",
    "group": "vit"
  },
  {
    "key": "vE",
    "title": "Витамин E",
    "unit": "мг",
    "group": "vit"
  },
  {
    "key": "vK",
    "title": "Витамин K",
    "unit": "мкг",
    "group": "vit"
  },
  {
    "key": "b1",
    "title": "B1 — тиамин",
    "unit": "мг",
    "group": "vit"
  },
  {
    "key": "b2",
    "title": "B2 — рибофлавин",
    "unit": "мг",
    "group": "vit"
  },
  {
    "key": "b3",
    "title": "B3 — ниацин",
    "unit": "мг",
    "group": "vit"
  },
  {
    "key": "b5",
    "title": "B5 — пантотеновая кислота",
    "unit": "мг",
    "group": "vit"
  },
  {
    "key": "b6",
    "title": "Витамин B6",
    "unit": "мг",
    "group": "vit"
  },
  {
    "key": "b7",
    "title": "B7 — биотин",
    "unit": "мкг",
    "group": "vit"
  },
  {
    "key": "b9",
    "title": "B9 — фолат",
    "unit": "мкг",
    "group": "vit"
  },
  {
    "key": "b12",
    "title": "Витамин B12",
    "unit": "мкг",
    "group": "vit"
  },
  {
    "key": "vC",
    "title": "Витамин C",
    "unit": "мг",
    "group": "vit"
  },
  {
    "key": "ca",
    "title": "Кальций",
    "unit": "мг",
    "group": "min"
  },
  {
    "key": "p",
    "title": "Фосфор",
    "unit": "мг",
    "group": "min"
  },
  {
    "key": "mg",
    "title": "Магний",
    "unit": "мг",
    "group": "min"
  },
  {
    "key": "k",
    "title": "Калий",
    "unit": "мг",
    "group": "min"
  },
  {
    "key": "na",
    "title": "Натрий",
    "unit": "мг",
    "group": "min"
  },
  {
    "key": "cl",
    "title": "Хлорид",
    "unit": "мг",
    "group": "min"
  },
  {
    "key": "fe",
    "title": "Железо",
    "unit": "мг",
    "group": "min"
  },
  {
    "key": "zn",
    "title": "Цинк",
    "unit": "мг",
    "group": "min"
  },
  {
    "key": "cu",
    "title": "Медь",
    "unit": "мг",
    "group": "min"
  },
  {
    "key": "mn",
    "title": "Марганец",
    "unit": "мг",
    "group": "min"
  },
  {
    "key": "fl",
    "title": "Фтор",
    "unit": "мг",
    "group": "min"
  },
  {
    "key": "i",
    "title": "Йод",
    "unit": "мкг",
    "group": "min"
  },
  {
    "key": "mo",
    "title": "Молибден",
    "unit": "мкг",
    "group": "min"
  },
  {
    "key": "cr",
    "title": "Хром",
    "unit": "мкг",
    "group": "min"
  },
  {
    "key": "his",
    "title": "Гистидин",
    "unit": "г",
    "group": "aa"
  },
  {
    "key": "ile",
    "title": "Изолейцин",
    "unit": "г",
    "group": "aa"
  },
  {
    "key": "leu",
    "title": "Лейцин",
    "unit": "г",
    "group": "aa"
  },
  {
    "key": "lys",
    "title": "Лизин",
    "unit": "г",
    "group": "aa"
  },
  {
    "key": "met_",
    "title": "Метионин",
    "unit": "г",
    "group": "aa"
  },
  {
    "key": "cys_",
    "title": "Цистеин",
    "unit": "г",
    "group": "aa"
  },
  {
    "key": "phe_",
    "title": "Фенилаланин",
    "unit": "г",
    "group": "aa"
  },
  {
    "key": "tyr_",
    "title": "Тирозин",
    "unit": "г",
    "group": "aa"
  },
  {
    "key": "thr",
    "title": "Треонин",
    "unit": "г",
    "group": "aa"
  },
  {
    "key": "trp",
    "title": "Триптофан",
    "unit": "г",
    "group": "aa"
  },
  {
    "key": "val",
    "title": "Валин",
    "unit": "г",
    "group": "aa"
  },
  {
    "key": "ala",
    "title": "Аланин",
    "unit": "г",
    "group": "aa"
  },
  {
    "key": "arg",
    "title": "Аргинин",
    "unit": "г",
    "group": "aa"
  },
  {
    "key": "asp",
    "title": "Аспарагиновая кислота",
    "unit": "г",
    "group": "aa"
  },
  {
    "key": "glu",
    "title": "Глутаминовая кислота",
    "unit": "г",
    "group": "aa"
  },
  {
    "key": "gly",
    "title": "Глицин",
    "unit": "г",
    "group": "aa"
  },
  {
    "key": "pro",
    "title": "Пролин",
    "unit": "г",
    "group": "aa"
  },
  {
    "key": "ser",
    "title": "Серин",
    "unit": "г",
    "group": "aa"
  },
  {
    "key": "sfa",
    "title": "Насыщенные жирные кислоты",
    "unit": "г",
    "group": "fat"
  },
  {
    "key": "mufa",
    "title": "Мононенасыщенные жирные кислоты",
    "unit": "г",
    "group": "fat"
  },
  {
    "key": "pufa",
    "title": "Полиненасыщенные жирные кислоты",
    "unit": "г",
    "group": "fat"
  },
  {
    "key": "n3",
    "title": "Омега-3, всего",
    "unit": "г",
    "group": "fat"
  },
  {
    "key": "n6",
    "title": "Омега-6, всего",
    "unit": "г",
    "group": "fat"
  },
  {
    "key": "la",
    "title": "Линолевая кислота (омега-6)",
    "unit": "г",
    "group": "fat"
  },
  {
    "key": "ala3",
    "title": "Альфа-линоленовая кислота (омега-3)",
    "unit": "г",
    "group": "fat"
  },
  {
    "key": "epa",
    "title": "ЭПК (EPA)",
    "unit": "мг",
    "group": "fat"
  },
  {
    "key": "dpa",
    "title": "ДПК (DPA)",
    "unit": "мг",
    "group": "fat"
  },
  {
    "key": "dha",
    "title": "ДГК (DHA)",
    "unit": "мг",
    "group": "fat"
  },
  {
    "key": "chol",
    "title": "Холестерин",
    "unit": "мг",
    "group": "fat"
  },
  {
    "key": "sug",
    "title": "Сахара, всего",
    "unit": "г",
    "group": "carb"
  },
  {
    "key": "suc",
    "title": "Сахароза",
    "unit": "г",
    "group": "carb"
  },
  {
    "key": "lac",
    "title": "Лактоза",
    "unit": "г",
    "group": "carb"
  },
  {
    "key": "fru",
    "title": "Фруктоза",
    "unit": "г",
    "group": "carb"
  },
  {
    "key": "glc",
    "title": "Глюкоза",
    "unit": "г",
    "group": "carb"
  },
  {
    "key": "gal",
    "title": "Галактоза",
    "unit": "г",
    "group": "carb"
  },
  {
    "key": "mal",
    "title": "Мальтоза",
    "unit": "г",
    "group": "carb"
  },
  {
    "key": "sta",
    "title": "Крахмал",
    "unit": "г",
    "group": "carb"
  },
  {
    "key": "fbs",
    "title": "Клетчатка растворимая",
    "unit": "г",
    "group": "carb"
  },
  {
    "key": "fbi",
    "title": "Клетчатка нерастворимая",
    "unit": "г",
    "group": "carb"
  },
  {
    "key": "bcar",
    "title": "Бета-каротин",
    "unit": "мг",
    "group": "phy"
  },
  {
    "key": "carx",
    "title": "Каротиноиды, кроме бета-каротина",
    "unit": "мг",
    "group": "phy"
  },
  {
    "key": "cho",
    "title": "Холин",
    "unit": "мг",
    "group": "vit"
  },
  {
    "key": "se",
    "title": "Селен",
    "unit": "мкг",
    "group": "min"
  },
  {
    "key": "trans",
    "title": "Трансжиры",
    "unit": "г",
    "group": "fat"
  },
  {
    "key": "lyc",
    "title": "Ликопин",
    "unit": "мг",
    "group": "phy"
  },
  {
    "key": "lut",
    "title": "Лютеин + зеаксантин",
    "unit": "мг",
    "group": "phy"
  },
  {
    "key": "flav",
    "title": "Флавоноиды",
    "unit": "мг",
    "group": "phy"
  },
  {
    "key": "anth",
    "title": "Антоцианы",
    "unit": "мг",
    "group": "phy"
  },
  {
    "key": "cat",
    "title": "Катехины",
    "unit": "мг",
    "group": "phy"
  },
  {
    "key": "que",
    "title": "Кверцетин",
    "unit": "мг",
    "group": "phy"
  },
  {
    "key": "isof",
    "title": "Изофлавоны",
    "unit": "мг",
    "group": "phy"
  },
  {
    "key": "phst",
    "title": "Фитостерины",
    "unit": "мг",
    "group": "phy"
  },
  {
    "key": "caf",
    "title": "Кофеин",
    "unit": "мг",
    "group": "etc"
  },
  {
    "key": "cre",
    "title": "Креатин",
    "unit": "г",
    "group": "etc"
  },
  {
    "key": "theo",
    "title": "Теобромин",
    "unit": "мг",
    "group": "etc"
  },
  {
    "key": "pur",
    "title": "Пурины",
    "unit": "мг",
    "group": "etc"
  }
];
const groups={main:'Калории и БЖУ',vit:'Витамины',min:'Минералы',aa:'Аминокислоты',fat:'Липиды и жирные кислоты',carb:'Углеводы и клетчатка',phy:'Каротиноиды',etc:'Другие вещества'};
const aliases={se:['selenium','селен элементарный'],cre:['creatine'],caf:['caffeine'],cho:['choline'],mg:['магний','magnesium','элементарный магний'],fat:['липиды','жиры','fat'],epa:['EPA','ЭПК','эйкозапентаеновая кислота','омега 3'],dha:['DHA','ДГК','докозагексаеновая кислота','омега 3'],dpa:['DPA','ДПК','омега 3'],n3:['omega 3','омега 3','омега-3 всего'],n6:['omega 6','омега 6'],prot:['протеин','белок','protein'],kcal:['энергия','калорийность'],vD:['витамин d3','витамин d2','холекальциферол','эргокальциферол'],vK:['витамин k2','витамин k1','менахинон'],vC:['аскорбиновая кислота'],b12:['цианокобаламин','метилкобаламин'],zn:['zinc','цинк элементарный'],ca:['calcium','кальций элементарный'],fe:['iron','железо элементарное'],leu:['leucine','лейцин','bcaa'],ile:['isoleucine','изолейцин','bcaa'],val:['valine','валин','bcaa']};
const byKey=Object.fromEntries(fields.map(x=>[x.key,x]));
const norm=s=>String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]+/g,' ').trim();
const weight={'г':1,'мг':.001,'мкг':.000001};
function get(key){return byKey[key]||null;}
function units(key){const x=get(key);return x&&weight[x.unit]?['г','мг','мкг'].concat(key==='vD'?['МЕ']:[]):x?[x.unit]:[];}
function convert(amount,from,key){const x=get(key);if(!x)return null;if(amount===null||amount===undefined||amount==='')return null;if(typeof amount!=='number'||!Number.isFinite(amount)||amount<0)return null;if(from===x.unit)return amount;if(weight[from]&&weight[x.unit])return amount*weight[from]/weight[x.unit];if(key==='vD'&&from==='МЕ')return amount*.025;return null;}
function exact(q){const n=norm(q);return fields.find(x=>[x.title,x.key,...(aliases[x.key]||[])].some(a=>norm(a)===n))||null;}
function search(q,limit=30){const tokens=norm(q).split(' ').filter(Boolean);return fields.filter(x=>{const hay=norm(x.title+' '+x.key+' '+groups[x.group]+' '+(aliases[x.key]||[]).join(' '));return tokens.every(t=>hay.includes(t));}).slice(0,limit);}
function values(components){const values={},statuses={},unmapped=[],issues=[],seen=new Set();for(const c of components||[]){const x=get(c.substanceId);if(!x){unmapped.push(c);continue;}if(seen.has(x.key)){values[x.key]=null;statuses[x.key]='conflict';issues.push('Повтор вещества: '+x.title);continue;}seen.add(x.key);const v=convert(c.amount,c.unit,x.key);values[x.key]=v;statuses[x.key]=v===null?'missing':'value';if(c.amount!==null&&c.amount!==undefined&&c.amount!==''&&v===null)issues.push('Не удалось пересчитать '+x.title+' из '+c.unit);}
return {values,statuses,unmapped,issues};}
const api={fields,groups,get,units,convert,search,exact,values,norm};root.HappySubstances=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
