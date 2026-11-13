# Happy Sport · Update 41

Адрес: https://astamurberlin-rgb.github.io/happyamurio/sport-41/

Sport собирается из исходников. Файл `index.html` в этой папке — результат сборки, руками его не править.

## Сборка и проверка

Команды запускаются из корня репозитория.

1. `node sport-41/scripts/build-release.mjs` — собрать страницу из `sport/src/`.
2. `npm --prefix sport-41/sport run check` — проверки.
3. `git add -A`, затем `node sport-41/scripts/write-provenance.mjs` и `node sport-41/scripts/verify-release.mjs` — обновить и сверить контрольные суммы.

На свежей копии репозитория сначала сборка, потом проверки: промежуточные файлы сборки в Git не хранятся.

Сборка встраивает в страницу:

- справочник упражнений из `assets/exercise-library/v1/`;
- список картинок занятий из `assets/sport-icons/v1/` и картинок вариантов из `assets/exercise-media/v1/`;
- общие файлы из корневой папки `shared/`;
- адреса текущих Day и Meal из `shared/apps.json`.

После выпуска Day или Meal сборка меняет `index.html`, потому что адреса соседей стали другими. Если выпуск Sport не планировался, вернуть файл: `git checkout -- sport-41/index.html`.

## Что где лежит

| Где | Что |
| --- | --- |
| `sport/src/app.js`, `app.template.html` | Основа приложения и шаблон страницы. |
| `sport/src/local-store.js`, `profile-store.js`, `profile-lock.js`, `live-tabs.js` | Журнал на устройстве, `sportStorage`. Вкладки принимают записи друг друга. |
| `sport/src/journal-cloud.js`, `automatic-sync….js`, `controlled-….js`, `recovery-vault.js` | Обмен журнала с облаком и резерв на случай расхождения. |
| `sport/src/readonly-guard.js`, `readonly-auth.js`, `readonly-ui.js`, `happy-auth.js` | Вход и граница запросов к серверу. |
| `sport/src/summary-exchange.js`, `sport-link.js`, `app-links.js`, `food-counters.js`, `energy-widget.js` | Обмен с Day и Meal: сводка тренировок, свитчи связи, счётчики, кольцо энергии. |
| `sport/src/exercise-….js`, `set-….js`, `rest-pill.js`, `free-timer.js`, `timer-action-wheel.js`, `workout-….js` | Тренировка: упражнения, подходы, таймеры, перерывы. |
| `sport/src/library-v2.js`, `catalog-groups.js`, `exercise-families.js`, `sport-icons.js` | Библиотека упражнений: группы, варианты, картинки. |
| `sport/src/planning.js`, `schedule-model.js`, `schedule-calendar.js`, `plan-fact.js`, `template-picker.js` | Расписание, файл для календаря, «План / Факт». |
| `sport/src/measurements-v2.js`, `measurements-shared.js` | Замеры тела. |
| `sport/src/data-transfer.js`, `strong-native-….js` | Выгрузка и загрузка журнала, перенос из Strong. |
| `sport/src/settings-layout.js`, `audit-simplify.js`, `refinements.js` | Настройки и навигация. |
| `sport/src/release-notes.js` | История обновлений внизу настроек. |
| `sport/data/` | Виды занятий и рекомендованные шаблоны тренировок. |
| `sport/scripts/` | Сборка страницы и проверки `check-….mjs`. |
| `scripts/` | Сборка выпуска и контрольные суммы. |
| `shared/` | Копии общих файлов. |
| `day/`, `meal/`, `prototypes/` | Страницы-заглушки. Их создаёт сборка, приложение на них не ссылается. |
| `SOURCE-PROVENANCE.json` | Список файлов выпуска с контрольными суммами. |

## Осторожно

- Журнал читать и писать только через `sportStorage`.
- Запись в облако идёт только через `readonly-guard.js`. Сейчас он пропускает журнал, счётчики продуктов, сводку тренировок, регистрацию и смену имени. Новый вид записи добавляется туда же и со своей проверкой.
- Картинки и справочник в `assets/…/v1/` не менять. Изменённый набор кладётся в новую папку `v2/`.

— Claude · 13.11.2026
