# Happy Sport · Update 42

Адрес: https://astamurberlin-rgb.github.io/happyamurio/sport-42/

Sport собирается из исходников. Файл `index.html` в этой папке — результат сборки, руками его не править.

## Сборка и проверка

Команды запускаются из корня репозитория.

1. `node sport-42/scripts/build-release.mjs` — собрать страницу из `sport/src/`.
2. `npm --prefix sport-42/sport run check` — проверки.
3. `git add -A`, затем `node sport-42/scripts/write-provenance.mjs` и `node sport-42/scripts/verify-release.mjs` — обновить и сверить контрольные суммы.

На свежей копии репозитория сначала сборка, потом проверки: промежуточные файлы сборки в Git не хранятся.

Сборка встраивает в страницу:

- справочник упражнений из `assets/exercise-library/v1/`;
- список картинок занятий из `assets/sport-icons/v1/` и картинок вариантов из `assets/exercise-media/v1/`;
- общие файлы из корневой папки `shared/`;
- адреса текущих Day и Meal из `shared/apps.json`.

После выпуска Day или Meal сборка меняет `index.html`, потому что адреса соседей стали другими. Если выпуск Sport не планировался, вернуть файл: `git checkout -- sport-42/index.html`.

## Что где лежит

| Где | Что |
| --- | --- |
| `sport/src/app.js`, `app.template.html` | Основа приложения и шаблон страницы. |
| `sport/src/sport-boot.js` | Запуск: общий вход (`shared/happy-account.js`), общий модуль хранения (`shared/happy-store.js`), затем приложение. |
| `sport/src/sport-docs.js` | Как дневник раскладывается на документы модуля и собирается обратно. |
| `sport/src/sport-data.js`, `sport-signin.js` | Запись изменённого, приём правок с других вкладок и устройств, карточка входа, без входа — предложение войти. |
| `sport/src/app-links.js`, `food-counters.js`, `energy-widget.js` | Свитчи связи, свои счётчики Sport, кольцо энергии. |
| `sport/src/exercise-….js`, `set-….js`, `rest-pill.js`, `free-timer.js`, `timer-action-wheel.js`, `workout-….js` | Тренировка: упражнения, подходы, таймеры, перерывы. |
| `sport/src/library-v2.js`, `catalog-groups.js`, `exercise-families.js`, `sport-icons.js` | Библиотека упражнений: группы, варианты, картинки. |
| `sport/src/planning.js`, `schedule-model.js`, `schedule-calendar.js`, `plan-fact.js`, `template-picker.js` | Расписание, файл для календаря, «План / Факт». |
| `sport/src/measurements-v2.js`, `measurements-export.js` | Замеры тела, печать и CSV. |
| `sport/src/data-transfer.js`, `strong-native-….js` | Выгрузка дневника файлом, добавление истории Strong. |
| `sport/src/settings-layout.js`, `audit-simplify.js`, `refinements.js` | Настройки и навигация. |
| `sport/src/release-notes.js` | История обновлений внизу настроек. |
| `sport/data/` | Виды занятий и рекомендованные шаблоны тренировок. |
| `sport/scripts/` | Сборка страницы и проверки `check-….mjs`. |
| `scripts/` | Сборка выпуска и контрольные суммы. |
| `shared/` | Копии общих файлов. |
| `day/`, `meal/`, `prototypes/` | Страницы-заглушки. Их создаёт сборка, приложение на них не ссылается. |
| `SOURCE-PROVENANCE.json` | Список файлов выпуска с контрольными суммами. |

## Осторожно

- Записи читать и писать только через общий модуль: в приложении — `persist()` (он пишет изменённое через `sport-data.js`). Своего хранилища Sport не заводит.
- Без входа записи не принимаются. Первый вход без сети невозможен.
- Картинки и справочник в `assets/…/v1/` не менять. Изменённый набор кладётся в новую папку `v2/`.

— Claude · 14.11.2026
