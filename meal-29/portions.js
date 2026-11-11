/* Approximate edible household measures. Nutrient composition and recorded grams are never changed here.
   Sources and unrounded source rows: ../meal-data/portion-sources.json. */
(function(root){
'use strict';
var VERSION='2026-10-31.1';
var records=[
  {
    "id": "kiwi-gold",
    "title": "Киви золотой",
    "match": "^киви.*(золот|gold)",
    "kind": "fresh",
    "measures": {
      "маленький": 65,
      "шт": 81,
      "большой": 105
    },
    "fdc": [
      168211
    ],
    "note": "без кожуры",
    "estimate": "Маленький и большой — рабочие оценки вокруг справочного плода 81 г."
  },
  {
    "id": "kiwi",
    "title": "Киви зелёный",
    "match": "^киви",
    "kind": "fresh",
    "measures": {
      "маленький": 55,
      "шт": 69,
      "большой": 90
    },
    "fdc": [
      168153
    ],
    "note": "без кожуры",
    "estimate": "Маленький и большой — рабочие оценки вокруг справочного плода 69 г."
  },
  {
    "id": "banana",
    "title": "Банан",
    "match": "^банан",
    "kind": "fresh",
    "measures": {
      "маленький": 101,
      "шт": 118,
      "большой": 136
    },
    "fdc": [
      173944
    ],
    "note": "без кожуры",
    "estimate": ""
  },
  {
    "id": "apple",
    "title": "Яблоко",
    "match": "^яблок",
    "kind": "fresh",
    "measures": {
      "маленький": 149,
      "шт": 182,
      "большой": 223
    },
    "fdc": [
      171688
    ],
    "note": "без сердцевины",
    "estimate": ""
  },
  {
    "id": "pear",
    "title": "Груша",
    "match": "^груш",
    "kind": "fresh",
    "measures": {
      "маленький": 148,
      "шт": 178,
      "большой": 230
    },
    "fdc": [
      169118
    ],
    "note": "без сердцевины",
    "estimate": ""
  },
  {
    "id": "orange",
    "title": "Апельсин",
    "match": "^апельсин",
    "kind": "fresh",
    "measures": {
      "маленький": 96,
      "шт": 131,
      "большой": 184
    },
    "fdc": [
      169097
    ],
    "note": "без кожуры",
    "estimate": ""
  },
  {
    "id": "mandarin",
    "title": "Мандарин",
    "match": "^(мандарин|танжерин)",
    "kind": "fresh",
    "measures": {
      "маленький": 76,
      "шт": 88,
      "большой": 120
    },
    "fdc": [
      169105
    ],
    "note": "без кожуры",
    "estimate": ""
  },
  {
    "id": "grapefruit",
    "title": "Грейпфрут",
    "match": "^грейпфрут",
    "kind": "fresh",
    "measures": {
      "маленький": 200,
      "шт": 256,
      "большой": 332
    },
    "fdc": [
      173033
    ],
    "note": "без кожуры",
    "estimate": "Масса целого плода рассчитана из половины плода USDA."
  },
  {
    "id": "peach",
    "title": "Персик",
    "match": "^персик",
    "kind": "fresh",
    "measures": {
      "маленький": 130,
      "шт": 150,
      "большой": 175
    },
    "fdc": [
      169928
    ],
    "note": "без косточки",
    "estimate": ""
  },
  {
    "id": "nectarine",
    "title": "Нектарин",
    "match": "^нектарин",
    "kind": "fresh",
    "measures": {
      "маленький": 129,
      "шт": 142,
      "большой": 156
    },
    "fdc": [
      169914
    ],
    "note": "без косточки",
    "estimate": ""
  },
  {
    "id": "apricot",
    "title": "Абрикос",
    "match": "^абрикос",
    "kind": "fresh",
    "measures": {
      "маленький": 25,
      "шт": 35,
      "большой": 50
    },
    "fdc": [
      171697
    ],
    "note": "без косточки",
    "estimate": "Маленький и большой — рабочие оценки; справочная штука 35 г."
  },
  {
    "id": "plum",
    "title": "Слива",
    "match": "^слив(а|ы|у|е|ой)(?:[ ,]|$)",
    "kind": "fresh",
    "measures": {
      "маленький": 30,
      "шт": 50,
      "большой": 70
    },
    "fdc": [
      169949
    ],
    "note": "без косточки",
    "estimate": "Сохранены ориентиры для мелкой местной сливы; справочный плод USDA — 66 г. Нужна местная контрольная навеска."
  },
  {
    "id": "persimmon",
    "title": "Хурма",
    "match": "^хурм",
    "kind": "fresh",
    "measures": {
      "маленький": 120,
      "шт": 168,
      "большой": 220
    },
    "fdc": [
      169941
    ],
    "note": "без чашелистика",
    "estimate": "Маленькая и большая — рабочие оценки; справочный плод 168 г."
  },
  {
    "id": "avocado",
    "title": "Авокадо",
    "match": "^авокадо",
    "kind": "fresh",
    "measures": {
      "маленький": 120,
      "шт": 201,
      "большой": 250
    },
    "fdc": [
      171705
    ],
    "note": "без кожуры и косточки",
    "estimate": "Маленький и большой — рабочие оценки; средний — справочный плод без указания сорта."
  },
  {
    "id": "fig",
    "title": "Инжир",
    "match": "^инжир",
    "kind": "fresh",
    "measures": {
      "маленький": 40,
      "шт": 50,
      "большой": 64
    },
    "fdc": [
      173021
    ],
    "note": "без плодоножки",
    "estimate": ""
  },
  {
    "id": "feijoa",
    "title": "Фейхоа",
    "match": "^фейхоа",
    "kind": "fresh",
    "measures": {
      "маленький": 25,
      "шт": 42,
      "большой": 55
    },
    "fdc": [
      168176
    ],
    "note": "без кожуры",
    "estimate": "Маленький и большой — рабочие оценки; справочная мякоть одного плода 42 г."
  },
  {
    "id": "lemon",
    "title": "Лимон",
    "match": "^лимон",
    "kind": "fresh",
    "measures": {
      "шт": 58,
      "большой плод": 84
    },
    "fdc": [
      167746
    ],
    "note": "без кожуры",
    "estimate": ""
  },
  {
    "id": "lime",
    "title": "Лайм",
    "match": "^лайм",
    "kind": "fresh",
    "measures": {
      "шт": 67
    },
    "fdc": [
      168155
    ],
    "note": "съедобная часть",
    "estimate": ""
  },
  {
    "id": "loquat",
    "title": "Локва, японская мушмула",
    "match": "^(локва|мушмула япон)",
    "kind": "fresh",
    "measures": {
      "маленький": 13.6,
      "шт": 16,
      "большой": 20
    },
    "fdc": [
      169908
    ],
    "note": "без косточек",
    "estimate": ""
  },
  {
    "id": "mango",
    "title": "Манго",
    "match": "^манго",
    "kind": "fresh",
    "measures": {
      "шт": 336
    },
    "fdc": [
      169910
    ],
    "note": "без кожуры и косточки",
    "estimate": ""
  },
  {
    "id": "cherry-tomato",
    "title": "Помидор черри",
    "match": "^(томат|помидор).*черри",
    "kind": "fresh",
    "measures": {
      "шт": 17
    },
    "fdc": [
      170457
    ],
    "note": "",
    "estimate": ""
  },
  {
    "id": "tomato",
    "title": "Помидор",
    "match": "^(помидор|томат)",
    "kind": "fresh",
    "measures": {
      "маленький": 91,
      "шт": 123,
      "большой": 182
    },
    "fdc": [
      170457
    ],
    "note": "",
    "estimate": ""
  },
  {
    "id": "cucumber",
    "title": "Огурец",
    "match": "^огур(ец|цы)",
    "kind": "fresh",
    "measures": {
      "маленький": 80,
      "шт": 120,
      "большой": 200
    },
    "fdc": [
      168409
    ],
    "note": "без несъедобных концов",
    "estimate": "Рабочие размеры короткого огурца, сохранённые из Meal. USDA даёт длинный огурец 301 г; местные размеры нужно взвесить."
  },
  {
    "id": "carrot",
    "title": "Морковь",
    "match": "^морков",
    "kind": "fresh",
    "measures": {
      "маленький": 50,
      "шт": 61,
      "большой": 72
    },
    "fdc": [
      170393
    ],
    "note": "без ботвы",
    "estimate": ""
  },
  {
    "id": "onion",
    "title": "Лук репчатый",
    "match": "^лук(?:[ ,]+репчат|[ ,]+сыр|$)",
    "kind": "fresh",
    "measures": {
      "маленький": 70,
      "шт": 110,
      "большой": 150
    },
    "fdc": [
      170000
    ],
    "note": "без сухой шелухи",
    "estimate": ""
  },
  {
    "id": "pepper",
    "title": "Перец сладкий",
    "match": "^перец (сладк|болгар)",
    "kind": "fresh",
    "measures": {
      "маленький": 74,
      "шт": 119,
      "большой": 164
    },
    "fdc": [
      170108,
      170427
    ],
    "note": "без семян и плодоножки",
    "estimate": ""
  },
  {
    "id": "zucchini",
    "title": "Кабачок, цукини",
    "match": "^(кабач|цукини)",
    "kind": "fresh",
    "measures": {
      "маленький": 118,
      "шт": 196,
      "большой": 323
    },
    "fdc": [
      169291
    ],
    "note": "без плодоножки",
    "estimate": ""
  },
  {
    "id": "eggplant",
    "title": "Баклажан",
    "match": "^баклажан",
    "kind": "fresh",
    "measures": {
      "маленький": 250,
      "шт": 350,
      "большой": 450
    },
    "fdc": [
      169228
    ],
    "note": "без плодоножки",
    "estimate": "Рабочие размеры местных плодов, сохранённые из Meal. В USDA крупный плод с кожицей 548 г; нужна местная контрольная навеска."
  },
  {
    "id": "potato",
    "title": "Картофель сырой",
    "match": "^картофел",
    "kind": "fresh",
    "measures": {
      "маленький": 170,
      "шт": 213,
      "большой": 369
    },
    "fdc": [
      170026
    ],
    "note": "съедобная часть с кожицей",
    "estimate": ""
  },
  {
    "id": "potato-boiled",
    "title": "Картофель варёный",
    "match": "^картофел.*(?:варен|отвар)",
    "kind": "boiled-potato",
    "measures": {
      "шт": 136
    },
    "fdc": [
      170114
    ],
    "note": "готовая мякоть без кожуры",
    "estimate": ""
  },
  {
    "id": "beet",
    "title": "Свёкла",
    "match": "^свекл",
    "kind": "fresh",
    "measures": {
      "шт": 82
    },
    "fdc": [
      169145
    ],
    "note": "без ботвы",
    "estimate": ""
  },
  {
    "id": "radish",
    "title": "Редис",
    "match": "^редис",
    "kind": "fresh",
    "measures": {
      "маленький": 2,
      "шт": 4.5,
      "большой": 9
    },
    "fdc": [
      169276
    ],
    "note": "без ботвы",
    "estimate": "Справочные размеры мелкого круглого редиса; крупный местный лучше взвесить."
  },
  {
    "id": "mushroom",
    "title": "Шампиньон",
    "match": "^шампиньон",
    "kind": "fresh",
    "measures": {
      "маленький": 10,
      "шт": 18,
      "большой": 23
    },
    "fdc": [
      169251
    ],
    "note": "целый очищенный гриб",
    "estimate": ""
  },
  {
    "id": "garlic",
    "title": "Чеснок",
    "match": "^чеснок",
    "kind": "fresh",
    "measures": {
      "зубчик": 3
    },
    "fdc": [
      169230
    ],
    "note": "очищенный зубчик",
    "estimate": ""
  },
  {
    "id": "corn",
    "title": "Кукуруза сахарная",
    "match": "^кукуруза сахарн",
    "kind": "fresh",
    "measures": {
      "маленький початок": 73,
      "початок": 102,
      "большой початок": 143
    },
    "fdc": [
      169998
    ],
    "note": "только зёрна, без кочерыжки",
    "estimate": "",
    "default": "початок"
  },
  {
    "id": "strawberry",
    "title": "Клубника",
    "match": "^клубник",
    "kind": "berry",
    "measures": {
      "маленький": 7,
      "шт": 12,
      "большой": 18,
      "очень крупная ягода": 27
    },
    "fdc": [
      167762
    ],
    "note": "без плодоножек; ложки без горки",
    "estimate": "",
    "labels": {
      "маленький": "мелкая ягода",
      "шт": "средняя ягода",
      "большой": "крупная ягода"
    },
    "default": "г"
  },
  {
    "id": "raspberry",
    "title": "Малина",
    "match": "^малин",
    "kind": "berry",
    "measures": {
      "маленький": 2,
      "шт": 3,
      "большой": 4,
      "ст. л.": 7.7,
      "ч. л.": 2.6
    },
    "fdc": [
      167755
    ],
    "note": "без плодоножек; ложки без горки",
    "estimate": "Размеры 2/3/4 г — округлённые ориентиры по сортовым испытаниям; ложки рассчитаны из стакана USDA, 16 столовых / 48 чайных ложек.",
    "labels": {
      "маленький": "мелкая ягода",
      "шт": "средняя ягода",
      "большой": "крупная ягода"
    },
    "default": "г",
    "extraSources": [
      "raspberry-trial"
    ]
  },
  {
    "id": "blackberry",
    "title": "Ежевика",
    "match": "^ежевик",
    "kind": "berry",
    "measures": {
      "маленький": 4,
      "шт": 6,
      "большой": 8,
      "ст. л.": 9.0,
      "ч. л.": 3.0
    },
    "fdc": [
      173946
    ],
    "note": "без плодоножек; ложки без горки",
    "estimate": "Размеры 4/6/8 г — округлённые ориентиры по сортовым испытаниям; ложки рассчитаны из стакана USDA.",
    "labels": {
      "маленький": "мелкая ягода",
      "шт": "средняя ягода",
      "большой": "крупная ягода"
    },
    "default": "г",
    "extraSources": [
      "blackberry-trial"
    ]
  },
  {
    "id": "gooseberry",
    "title": "Крыжовник",
    "match": "^крыжовн",
    "kind": "berry",
    "measures": {
      "маленький": 3,
      "шт": 5,
      "большой": 7,
      "ст. л.": 9.4,
      "ч. л.": 3.1
    },
    "fdc": [
      173030
    ],
    "note": "без плодоножек; ложки без горки",
    "estimate": "Размеры 3/5/7 г — рабочие оценки с опорой на сорт Jeanne (около 5 г); ложки рассчитаны из стакана USDA. Размеры местных сортов уточнить.",
    "labels": {
      "маленький": "мелкая ягода",
      "шт": "средняя ягода",
      "большой": "крупная ягода"
    },
    "default": "г",
    "extraSources": [
      "gooseberry"
    ]
  },
  {
    "id": "blueberry",
    "title": "Голубика (однозначно названная)",
    "match": "^голубик",
    "kind": "berry",
    "measures": {
      "шт": 1.4,
      "крупная ягода": 2,
      "ст. л.": 9.2,
      "ч. л.": 3.1
    },
    "fdc": [
      171711
    ],
    "note": "без плодоножек; ложки без горки",
    "estimate": "Обычная ягода: 68/50 ≈ 1,4 г; крупная 2 г — ориентир по сортовым испытаниям. Ложки рассчитаны из стакана USDA.",
    "labels": {
      "маленький": "мелкая ягода",
      "шт": "средняя ягода",
      "большой": "крупная ягода"
    },
    "default": "г",
    "extraSources": [
      "blueberry-trial"
    ]
  },
  {
    "id": "currants",
    "title": "Смородина красная и белая",
    "match": "^смородина (красн|бел)",
    "kind": "berry",
    "measures": {
      "ст. л.": 7.0,
      "ч. л.": 2.3
    },
    "fdc": [
      173964
    ],
    "note": "без плодоножек; ложки без горки",
    "estimate": "Ложки рассчитаны из стакана USDA; вес веточки не назначен.",
    "labels": {
      "маленький": "мелкая ягода",
      "шт": "средняя ягода",
      "большой": "крупная ягода"
    },
    "default": "г"
  },
  {
    "id": "blackcurrant",
    "title": "Смородина чёрная",
    "match": "^смородина черн",
    "kind": "berry",
    "measures": {
      "ст. л.": 7.0,
      "ч. л.": 2.3
    },
    "fdc": [
      173963
    ],
    "note": "без плодоножек; ложки без горки",
    "estimate": "Ложки рассчитаны из стакана USDA; вес веточки не назначен.",
    "labels": {
      "маленький": "мелкая ягода",
      "шт": "средняя ягода",
      "большой": "крупная ягода"
    },
    "default": "г"
  },
  {
    "id": "grapes",
    "title": "Виноград",
    "match": "^виноград",
    "kind": "berry",
    "measures": {
      "шт": 4.9
    },
    "fdc": [
      174683
    ],
    "note": "без плодоножек; ложки без горки",
    "estimate": "Средняя ягода: 49 г / 10 ягод; без гребня.",
    "labels": {
      "маленький": "мелкая ягода",
      "шт": "средняя ягода",
      "большой": "крупная ягода"
    },
    "default": "г"
  },
  {
    "id": "cherry",
    "title": "Черешня",
    "match": "^черешн",
    "kind": "berry",
    "measures": {
      "шт": 8.2
    },
    "fdc": [
      171719
    ],
    "note": "без плодоножек; ложки без горки",
    "estimate": "Масса мякоти без косточки.",
    "labels": {
      "маленький": "мелкая ягода",
      "шт": "средняя ягода",
      "большой": "крупная ягода"
    },
    "default": "г"
  },
  {
    "id": "mulberry",
    "title": "Шелковица",
    "match": "^шелковиц",
    "kind": "berry",
    "measures": {
      "шт": 1.5,
      "ст. л.": 8.8,
      "ч. л.": 2.9
    },
    "fdc": [
      169913
    ],
    "note": "без плодоножек; ложки без горки",
    "estimate": "Средняя ягода: 15 г / 10; ложки рассчитаны из стакана USDA.",
    "labels": {
      "маленький": "мелкая ягода",
      "шт": "средняя ягода",
      "большой": "крупная ягода"
    },
    "default": "г"
  },
  {
    "id": "cranberry",
    "title": "Клюква",
    "match": "^клюкв",
    "kind": "berry",
    "measures": {
      "ст. л.": 6.2,
      "ч. л.": 2.1
    },
    "fdc": [
      171722
    ],
    "note": "без плодоножек; ложки без горки",
    "estimate": "Ложки рассчитаны из стакана цельных ягод USDA.",
    "labels": {
      "маленький": "мелкая ягода",
      "шт": "средняя ягода",
      "большой": "крупная ягода"
    },
    "default": "г"
  },
  {
    "id": "almond",
    "title": "Миндаль сладкий",
    "match": "^(миндаль(?!н)|миндал[ья] сладк)",
    "kind": "nut",
    "measures": {
      "шт": 1.2
    },
    "fdc": [
      170567
    ],
    "note": "ядра без скорлупы",
    "estimate": "Для цельного ядра; не для горького миндаля.",
    "labels": {
      "шт": "ядро"
    },
    "default": "г"
  },
  {
    "id": "walnut",
    "title": "Грецкий орех",
    "match": "^(грецк|орехи? грецк)",
    "kind": "nut",
    "measures": {
      "шт": 4,
      "половинка": 2
    },
    "fdc": [
      170187
    ],
    "note": "ядра без скорлупы",
    "estimate": "100 г / 50 половинок = 2 г; целое ядро = 4 г.",
    "labels": {
      "шт": "ядро"
    },
    "default": "г"
  },
  {
    "id": "hazelnut",
    "title": "Фундук",
    "match": "^фундук",
    "kind": "nut",
    "measures": {
      "шт": 1.4
    },
    "fdc": [
      170581
    ],
    "note": "ядра без скорлупы",
    "estimate": "14 г / 10 ядер.",
    "labels": {
      "шт": "ядро"
    },
    "default": "г"
  },
  {
    "id": "cashew",
    "title": "Кешью",
    "match": "^кешью",
    "kind": "nut",
    "measures": {
      "шт": 1.6
    },
    "fdc": [
      169422
    ],
    "note": "ядра без скорлупы",
    "estimate": "28,35 г / 18 ядер ≈ 1,6 г; ориентир для целых ядер.",
    "labels": {
      "шт": "ядро"
    },
    "default": "г"
  },
  {
    "id": "pistachio",
    "title": "Фисташка",
    "match": "^фисташ",
    "kind": "nut",
    "measures": {
      "шт": 0.7
    },
    "fdc": [
      170184
    ],
    "note": "ядра без скорлупы",
    "estimate": "",
    "labels": {
      "шт": "ядро"
    },
    "default": "г"
  },
  {
    "id": "peanut",
    "title": "Арахис",
    "match": "^арахис(?:[ ,]|$)",
    "kind": "nut",
    "measures": {
      "шт": 1
    },
    "fdc": [
      174262
    ],
    "note": "ядра без скорлупы",
    "estimate": "Одно ядро, не стручок; справочный вес обжаренного ядра.",
    "labels": {
      "шт": "ядро"
    },
    "default": "г"
  },
  {
    "id": "pecan",
    "title": "Пекан",
    "match": "^(пекан|орехи? пекан)",
    "kind": "nut",
    "measures": {
      "шт": 3,
      "половинка": 1.5
    },
    "fdc": [
      170182
    ],
    "note": "ядра без скорлупы",
    "estimate": "28,35 г / 19 половинок ≈ 1,5 г; целое ядро ≈ 3 г.",
    "labels": {
      "шт": "ядро"
    },
    "default": "г"
  },
  {
    "id": "macadamia",
    "title": "Макадамия",
    "match": "^макадам",
    "kind": "nut",
    "measures": {
      "шт": 2.6
    },
    "fdc": [
      170178
    ],
    "note": "ядра без скорлупы",
    "estimate": "28,35 г / 11 ядер ≈ 2,6 г; источник даёт 10–12 ядер в унции.",
    "labels": {
      "шт": "ядро"
    },
    "default": "г"
  },
  {
    "id": "brazil",
    "title": "Бразильский орех",
    "match": "^(бразильск|орехи? бразильск)",
    "kind": "nut",
    "measures": {
      "шт": 5
    },
    "fdc": [
      170569
    ],
    "note": "ядра без скорлупы",
    "estimate": "",
    "labels": {
      "шт": "ядро"
    },
    "default": "г"
  },
  {
    "id": "pine",
    "title": "Кедровый орех",
    "match": "^кедров",
    "kind": "nut",
    "measures": {
      "шт": 0.17,
      "10 ядер": 1.7
    },
    "fdc": [
      170591
    ],
    "note": "ядра без скорлупы",
    "estimate": "1,7 г / 10 ядер; масса округляется только после умножения на количество.",
    "labels": {
      "шт": "ядро"
    },
    "default": "г"
  },
  {
    "id": "egg-raw",
    "title": "Куриное яйцо сырое",
    "match": "^яйц[оа] курин",
    "kind": "egg-raw",
    "measures": {
      "маленький": 38,
      "шт": 44,
      "большой": 50
    },
    "fdc": [
      171287
    ],
    "note": "без скорлупы",
    "estimate": "",
    "labels": {
      "маленький": "маленькое яйцо",
      "шт": "среднее яйцо",
      "большой": "большое яйцо"
    }
  },
  {
    "id": "egg-cooked",
    "title": "Куриное яйцо варёное / пашот",
    "match": "^яйц[оа] курин",
    "kind": "egg-cooked",
    "measures": {
      "маленький": 38,
      "шт": 44,
      "большой": 50
    },
    "fdc": [
      173424,
      172186,
      171287
    ],
    "note": "без скорлупы",
    "estimate": "Большое готовое яйцо — 50 г; маленькое и среднее — оценка по съедобным массам сырого яйца.",
    "labels": {
      "маленький": "маленькое яйцо",
      "шт": "среднее яйцо",
      "большой": "большое яйцо"
    }
  },
  {
    "id": "egg-fried",
    "title": "Яичница-глазунья / жареное куриное яйцо",
    "match": "^(яйц[оа] курин|яичница[ -]глазунья)",
    "kind": "egg-fried",
    "measures": {
      "маленький": 35,
      "шт": 40,
      "большой": 46
    },
    "fdc": [
      173423
    ],
    "note": "масса готового яйца без скорлупы",
    "estimate": "Маленькое и среднее — меры USDA CSFII 1985–1986; большое 46 г подтверждено SR Legacy. Состав блюда уже учитывается выбранной карточкой.",
    "labels": {
      "маленький": "маленькое яйцо",
      "шт": "среднее яйцо",
      "большой": "большое яйцо"
    },
    "extraSources": [
      "fried-eggs"
    ]
  },
  {
    "id": "quail",
    "title": "Перепелиное яйцо",
    "match": "^яйц[оа] перепел",
    "kind": "egg-other",
    "measures": {
      "шт": 9
    },
    "fdc": [
      172191
    ],
    "note": "без скорлупы",
    "estimate": "Справочная масса сырого яйца; для варёного — приблизительный ориентир."
  },
  {
    "id": "duck",
    "title": "Утиное яйцо",
    "match": "^яйц[оа] утин",
    "kind": "egg-other",
    "measures": {
      "шт": 70
    },
    "fdc": [
      172189
    ],
    "note": "без скорлупы",
    "estimate": "Справочная масса сырого яйца; для варёного — приблизительный ориентир."
  },
  {
    "id": "goose",
    "title": "Гусиное яйцо",
    "match": "^яйц[оа] гусин",
    "kind": "egg-other",
    "measures": {
      "шт": 144
    },
    "fdc": [
      172190
    ],
    "note": "без скорлупы",
    "estimate": "Справочная масса сырого яйца; для варёного — приблизительный ориентир."
  },
  {
    "id": "turkey",
    "title": "Индюшиное яйцо",
    "match": "^яйц[оа] индюш",
    "kind": "egg-other",
    "measures": {
      "шт": 79
    },
    "fdc": [
      172192
    ],
    "note": "без скорлупы",
    "estimate": "Справочная масса сырого яйца; для варёного — приблизительный ориентир."
  }
];
records.forEach(function(r){r.test=new RegExp(r.match)});
var processed=/(сок|пюре|паст[аы]|сироп|консерв|компот|варень|джем|конфит|нектар|морс|суш[её]н|сухофрукт|заморож|морожен|жарен|жаренн|обжар|туш[её]н|вар[её]н|отвар|припущ|запеч|печ[её]н|гриль|маринов|сол[её]н|квашен|чипс|фри|крахмал|салат|соус|суп|начин|йогурт|сахар|масл|мук[аи])/;
var nutProcessed=/(паст|масло|напит|молоко|шоколад|сахар|м[её]д|глазур|смесь|мука|дробл|молот|толч|струж|крош|оболоч|горьк)/;
function name(f){return String(f&&f.names&&f.names.ru||f&&f.n||'').toLowerCase().replace(/ё/g,'е')}
function rawLike(f){
 var n=name(f);
 // Source preparation takes precedence over name prefixes (лимонная кислота, мангольд, кексы).
 if(f&&f.b&&!/^[FGK][A-Z0-9]*100$/.test(f.b))return false;
 if(f&&f.catalogSource==='MEXT'&&!/(^|[ ,])(сыр(ой|ая|ое|ые)|свеж)/.test(n))return false;
 return !processed.test(n.replace(/нектарин/g,'плод').replace(/сахарная/g,'сладкая'))&&!/(порошок|грил|на пару|приготов|изюм|чернослив|кислота|лимонад|кекс|торт|пирог|крем|сливк|фарш|бульон|протерт|плантан|наси)/.test(n);
}
function match(f){
 if(!f||f.src==='Мои'||f.recipe||f.catalogSource&&f.catalogSource!=='MEXT')return null;
 var n=name(f);
 if(/^мангольд/.test(n)||f.catalogSource==='MEXT'&&f.catalogCode==='07155')return null;
 for(var i=0;i<records.length;i++){
  var r=records[i];if(!r.test.test(n))continue;
  if(r.kind==='fresh'||r.kind==='berry'){if(!rawLike(f)||r.kind==='berry'&&/лесн/.test(n))continue}
  else if(r.kind==='nut'){if(nutProcessed.test(n))continue}
  else if(r.kind==='boiled-potato'){
   if(f.b&&!['K110132','X610042'].includes(f.b))continue;
   if(f.catalogSource==='MEXT'&&f.catalogCode!=='02019')continue;
   if(/(пюре|суп|салат|суш|масл|жир|молок|бульон|жарен|консерв|овощ|куриц)/.test(n))continue;
  }
  else if(r.kind.indexOf('egg-')===0){
   if(/(белок|желток|порош|суш|консерв|омлет|скр[эе]мбл|болтун|ветчин|бекон|сыр|гриб|овощ|томат)/.test(n.replace(/сыр(ое|ые|ой)/g,'')))continue;
   var fried=/(жарен|жаренн|яичница|глазун)/.test(n),cooked=/(варен|отвар|пашот)/.test(n);
   if(r.kind==='egg-fried'&&!fried||r.kind==='egg-raw'&&(fried||cooked||/запеч/.test(n))||r.kind==='egg-cooked'&&!cooked||r.kind==='egg-other'&&(fried||/запеч/.test(n)))continue;
  }
  return r;
 }
 return null;
}
function apply(f){
 var r=match(f);if(!r)return false;
 f.por=f.por||{};
 // Remove inferred legacy size slots before installing one consistent reference profile.
 ['маленький','шт','большой'].forEach(function(u){delete f.por[u]});
 if(r.kind==='berry')['горсть','стакан'].forEach(function(u){delete f.por[u]});
 // Standard reference profiles may be refreshed; personal DB.units are reapplied by porFix afterwards.
 Object.keys(r.measures).forEach(function(u){f.por[u]=r.measures[u]});
 f.portionProfile={version:VERSION,id:r.id,measures:Object.assign({},r.measures),labels:Object.assign({},r.labels||{}),note:r.note,estimate:r.estimate,fdc:r.fdc.slice(),extraSources:(r.extraSources||[]).slice()};
 if(r.note)f.porNote=r.note;
 if(r.kind==='berry')f.berry=1;
 if(r.default)f.defU=r.default;
 return true;
}
function label(f,u){return f&&f.portionProfile&&f.portionProfile.labels[u]||null}
function approximate(f,u){return !!(f&&f.portionProfile&&f.portionProfile.measures[u]&&!((f.own||{})[u]))}
function note(f){var p=f&&f.portionProfile;return p?'Примерные меры: '+(p.note||'съедобная часть')+'. Для точного веса выбери граммы или свою меру.':''}
root.MealPortions={version:VERSION,records:records,match:match,apply:apply,rawLike:rawLike,label:label,approximate:approximate,note:note};
})(typeof window!=='undefined'?window:globalThis);
