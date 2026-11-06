# Uzbek repertoire × existing public catalog

Working tree inspected during test7 preparation; canonical HM-UZ names may differ from published test6. No repo or user-data writes.

## Findings
- Checked 15558 JSON food records, 56 BASE entries, 9 HM-JP definitions, and 20 collection recipes.
- 60 final research repertoire rows. Classification counts: {'exact_own_estimate': 2, 'missing': 41, 'related_not_equivalent': 13, 'existing_shared_food': 3, 'existing_neighbor_variant': 1}.
- No named samsa/samosa/somsa, manty, lagman or shurpa in the checked arrays. Caucasian khinkali/kurze and German dumplings are not equivalent.
- Four native BLS plovs remain present: bls:X890662, bls:X890733, bls:Y560723, bls:X890632. No relabeling or deletion suggested.
- USDA rice-pilaf mix usda:168951 is dry/unprepared; usda:168952 is prepared with margarine. Neither is an Uzbek plov.
- Nutrient-slot coverage is a raw record count, not validation of nutrient semantics, cooking retention or complete canonical coverage. Missing values are not zero.
- Compote in BLS may be a thick fruit dessert; do not treat it as an Uzbek fruit drink.
- Existing KAV dolma contains pork and beef; it is not a suitable equivalent for an unspecified Uzbek dolma.

## Matrix — final research repertoire (60 rows)

| # | Requested identity | Classification | Existing candidate(s) |
|---|---|---|---|
| 1 | Плов / ош / palov — баранина | exact_own_estimate | hmuz:plov-mutton — Плов узбекский с бараниной |
| 2 | Плов с говядиной | exact_own_estimate | hmuz:plov-beef — Плов узбекский с говядиной |
| 3 | Праздничный плов / тўй оши | missing |  |
| 4 | Шурпа / шўрва — кайнатма | related_not_equivalent | bls:ZMAM03 — Бозбаш — суп из баранины с нутом |
| 5 | Мастава | missing |  |
| 6 | Машхурда / moshxo‘rda | missing |  |
| 7 | Мампар | missing |  |
| 8 | Угра-ош / куриный суп с домашней лапшой | related_not_equivalent | bls:X452263 — Суп с яичной лапшой и курицей |
| 9 | Чалоп / chalop / chalob | missing |  |
| 10 | Лагман / чузма лагман | missing |  |
| 11 | Ковурма лагман / каурма, жареный лагман | missing |  |
| 12 | Манты мясные | related_not_equivalent | bls:ZMDG02 — Курзе с мясом — варёные; bls:ZG02 — Хинкали с бараниной и говядиной — варёные |
| 13 | Манты с тыквой | missing |  |
| 14 | Ханум с картофелем | missing |  |
| 15 | Ханум с мясной начинкой | missing |  |
| 16 | Чучвара в бульоне | missing |  |
| 17 | Чучвара жареная | missing |  |
| 18 | Тухум-барак | missing |  |
| 19 | Шивит оши | missing |  |
| 20 | Димлама / дымляма | missing |  |
| 21 | Машкичири / мошкичири | missing |  |
| 22 | Казан-кабоб / qozon kabob | missing |  |
| 23 | Шашлык кусковой — баранина | related_not_equivalent | bls:Y436232 — Шашлык из ягнятины с овощами на гриле; bls:ZG11 — Мцвади из баранины — шашлык из корейки |
| 24 | Шашлык кусковой — говядина | related_not_equivalent | bls:Y143132 — Шашлык говяжий на гриле |
| 25 | Кийма-кабоб / рубленый шашлык / люля | missing |  |
| 26 | Тандыр-кабоб / тандыр-гушт | missing |  |
| 27 | Нарын / норин | missing |  |
| 28 | Нухат-шурак / нохат шурак | missing |  |
| 29 | Хасып / хасип | missing |  |
| 30 | Долма в виноградных листьях, узбекская версия | related_not_equivalent | bls:ZMAM01 — Толма — в виноградных листьях, свинина и говядина |
| 31 | Самса / сомса мясная | missing |  |
| 32 | Самса с тыквой | missing |  |
| 33 | Самса с картофелем | missing |  |
| 34 | Кок-сомса / самса с зеленью | missing |  |
| 35 | Самса с курицей | missing |  |
| 36 | Гумма | missing |  |
| 37 | Оби-нон / простая тандырная лепёшка, с кунжутом | related_not_equivalent | bls:B782100 — Лепёшка пшеничная; usda:171845 — Bread, naan, plain, commercially prepared, refrigerated |
| 38 | Патыр / патир-нон | missing |  |
| 39 | Катлама / qatlama | missing |  |
| 40 | Ачичук / аччик-чучук; шакароб как поисковый вариант | related_not_equivalent | bls:X255010 — Салат из помидоров с уксусной заправкой; bls:ZG21 — Грузинский салат — помидоры, огурцы, ореховая заправка |
| 41 | Салат редька+гранат / анор ва турп | related_not_equivalent | bls:X2A1090 — Салат из редьки с уксусной заправкой |
| 42 | Салат редис+яйцо | missing |  |
| 43 | Салат капуста+сладкий перец | related_not_equivalent | bls:X238310 — Салат из сырой белокочанной капусты с уксусной заправкой |
| 44 | Сузьма / сузма / чакка | missing |  |
| 45 | Катык / qatiq | missing |  |
| 46 | Каймак / qaymoq | missing |  |
| 47 | Айран | existing_shared_food | bls:M2S8300 — Айран (йогуртовый напиток), солёный |
| 48 | Чай зелёный и чёрный, без добавок | existing_shared_food | bls:N610100 — Чай зелёный (напиток); bls:N630000 — Чай чёрный (напиток) |
| 49 | Компот фруктовый | related_not_equivalent | bls:Y8A3030 — Компот из сухофруктов, загущённый крахмалом |
| 50 | Сумаляк / sumalak | missing |  |
| 51 | Нишалда / нишолда | missing |  |
| 52 | Халва / холва | missing |  |
| 53 | Нават / новвот | missing |  |
| 54 | Плов с курицей | related_not_equivalent | bls:Y560723 — Плов с тушёным куриным филе и соусом |
| 55 | Хашлама | existing_neighbor_variant | bls:ZMAM02 — Хашлама — говядина в пиве с овощами |
| 56 | Пахлава / baklava | existing_shared_food | bls:D702000 — Пахлава |
| 57 | Кукси | missing |  |
| 58 | Окрошка | missing |  |
| 59 | Шаурма / донер | related_not_equivalent | bls:Y921062 — Донер-кебаб с мясом гриль (телятина, говядина), овощами и соусом; bls:Y921162 — Донер-кебаб с мясом птицы гриль, овощами и соусом |
| 60 | Чак-чак | missing |  |

## Limits
Only public checked-in catalog assets were inspected. No personal recipes, diary, local storage, authentication or remote database were accessed. Recipe source research remains separate in evidence.md. Generic raw ingredients are not counted as existing prepared dishes. Shapes are not weights, and cuisine names are not permission to merge materially different recipes.
