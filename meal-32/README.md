# Happy Meal · Update 31.1

Адрес: https://astamurberlin-rgb.github.io/happyamurio/meal-31/

Страница — `index.html`.

## Что где лежит

| Файлы | Что делают |
| --- | --- |
| `index.html` | Экраны и основная логика: дневник, журнал, поиск, настройки. |
| `journal-model.js`, `journal-sync.js`, `local-store.js` | Журнал: сведение правок, обмен с облаком, хранилище на устройстве. |
| `backup-model.js` | «Выгрузить дневник» и «Загрузить дневник». |
| `food-libraries.js`, `catalog.js`, `usda.js`, `uzbek.js`, `desserts.js` | Каталоги продуктов. |
| `sources.js`, `search-names.js`, `portions.js` | Поиск: выбор каталогов, русские названия, бытовые меры. |
| `catalog-offline.js`, `sw.js` | Работа без интернета: скачанные каталоги и копия файлов выпуска на устройстве. |
| `collections.js`, `catalog-preview.js`, `collections.css`, `catalog.css` | «Сборники»: магазин каталогов и личные разделы. |
| `user-products.js`, `user-products.css` | «Мои продукты»: свой продукт и рецепт. |
| `supplements….js`, `supplement-nutrition.js`, `substances.js`, `supplements.css` | БАДы: каталог, «Мои добавки», запись приёма. |
| `counters.js`, `supplement-counters.js` | Счётчики продуктов и добавок. |
| `controls.js` | Календарь и карточка продукта. |
| `report.js`, `report.css`, `widget-image.js` | Отчёты и выгрузки: CSV, PDF, картинка виджета. |
| `account-ui.js` | Форма аккаунта. |
| `app-links.js` | Свитчи связи с Day и Sport. |
| `release-notes.js`, `release-notes.css` | История обновлений внизу настроек. |
| `shared/` | Копии общих файлов из корневой папки `shared/`. |
| `sport/` | Встроенный старый Sport 36. Через него открывается вкладка «Замеры тела». |
| `meal-img/`, `images/`, `app-icons/` | Картинки. |
| `checks/` | Проверки. |
| `SOURCE-PROVENANCE.json` | Список файлов выпуска с контрольными суммами. |

## Каталоги продуктов

Каталогов в этой папке нет. Они лежат в ветке `meal-libraries` и обновляются отдельно от приложения. Meal читает их список при запуске и проверяет размер и контрольную сумму каждого файла. Обновление каталога не пересчитывает уже записанную еду.

## Что не править руками

- Форму аккаунта внутри `index.html`, блок `happy-shared-ui`. Её встраивает команда `node scripts/sync-shared-ui.mjs`.
- Файлы в `shared/`. Они меняются в корневой папке `shared/` и копируются командой `node scripts/sync-shared.mjs`.
- Папку `sport/`.

## Осторожно

- `journal-sync.js`, `journal-model.js`, `local-store.js` и функцию `save()` менять только вместе с проверкой `node meal-31/checks/check-journal-speed.mjs`.
- Новые данные в облаке заводить отдельным документом, как сделано для БАДов. Новый вид записи в журнале прежние версии Meal отвергают.
- `sw.js` обслуживает только эту папку. Картинки выпуска он отдаёт из копии на устройстве. Поэтому при выпуске в нём меняется номер версии: по нему копия собирается заново.

## После правки

Команды запускаются из корня репозитория.

1. Проверки по одной: `node meal-31/checks/имя`. Проверке «Сборников» нужен коммит каталогов, на котором собран выпуск: `HAPPY_LIBRARIES_REF=4261588 node meal-31/checks/check-shop.mjs`.
2. `git add -A`, затем `python3 scripts/refresh-provenance.py meal-31` — обновить контрольные суммы.

— Claude · 13.11.2026
