# Happy Sport · Update 44.1

Адрес: https://astamurberlin-rgb.github.io/happyamurio/sport-44/

Sport собирается из исходников. Файл `index.html` в этой папке — результат сборки, руками его не править.

## Сборка и проверка

Команды запускаются из корня репозитория.

1. `node sport-44/sport/scripts/build.mjs` — собрать. Одна команда: склеивает `sport/src/` и пишет сразу сюда — `index.html`, `exercises/`, `app-icons/`, `manifest.webmanifest`. Промежуточных копий нет.
2. `npm --prefix sport-44/sport run check` — проверки. Они читают собранное из этой папки и сверяют, что страницы совпадают со сборкой из исходников.
3. Сценарии в браузере: `scripts/browser/run.sh sport_store sport_workout sport_families account_screens`.

Сборка встраивает в страницу:

- справочник упражнений из `assets/exercise-library/v1/`;
- список картинок занятий из `assets/sport-icons/v1/` и картинок вариантов из `assets/exercise-media/v1/`;
- общие файлы из папки `shared/` этого выпуска.

Адреса Day и Meal в страницу не вшиты: кнопки «Happy Day» и «Happy Meal» ведут на постоянные адреса `/happyamurio/day/` и `/happyamurio/meal/`, а при открытых настройках `shared/happy-links.js` подставляет папку текущего выпуска из `shared/apps.json`. После выпуска Day или Meal пересобирать Sport не нужно.

Списка файлов с контрольными суммами (`SOURCE-PROVENANCE.json`) у Sport больше нет: то же хранит Git.

## Что где лежит

| Где | Что |
| --- | --- |
| `sport/src/app.js`, `app.template.html` | Основа приложения и шаблон страницы. |
| `sport/src/sport-boot.js` | Запуск: вход Sport (`shared/happy-account.js`, у каждого приложения свой), общий модуль хранения (`shared/happy-store.js`), затем приложение. |
| `sport/src/sport-account.js` | Часть запуска: первый экран и вход (`shared/happy-welcome.js`) появляются сразу, пока открывается хранилище; профиль и цели Sport (`shared/happy-person.js`, `happy-goals.js`). Цели Sport — `state.sportGoals` (версии цели веса по датам и фокус тренировок) в документе `prefs`. |
| `sport/src/sport-docs.js` | Как дневник раскладывается на документы модуля и собирается обратно. Документы витрины (замеры, плановые занятия, свитчи связи) раскладывают их общие файлы из `shared/`. |
| `sport/src/sport-data.js`, `sport-signin.js` | Запись изменённого, приём правок с других вкладок и устройств, верх и низ настроек (`shared/happy-person.js`), без входа — предложение войти и лист «Войдите в аккаунт». |
| `sport/src/app-links.js`, `food-counters.js`, `energy-widget.js` | Свитчи связи, свои счётчики Sport и нажатия за день с правкой времени, кольцо энергии. |
| `sport/src/exercise-….js`, `set-….js`, `rest-pill.js`, `free-timer.js`, `timer-action-wheel.js`, `workout-….js` | Тренировка: упражнения, подходы, таймеры, перерывы. |
| `sport/src/library-v2.js`, `catalog-groups.js`, `exercise-families.js`, `sport-icons.js` | Библиотека упражнений: группы, варианты, картинки. |
| `sport/src/planning.js`, `schedule-model.js`, `schedule-calendar.js`, `plan-fact.js`, `template-picker.js` | Расписание, файл для календаря, «План / Факт». |
| `sport/src/measurements-screen.js`, `measurements-screen.css` | Замеры тела: подключение общего экрана `shared/happy-measurements.js` (один для Day, Meal и Sport). Сам экран, печать и CSV — в общем файле. |
| `sport/src/data-transfer.js`, `strong-native-….js` | Выгрузка дневника файлом, добавление истории Strong. |
| `sport/src/settings-layout.js`, `audit-simplify.js`, `refinements.js` | Настройки и навигация. |
| `sport/src/template-editor.js`, `set-line.js`, `sport-journal.js` (и `.css`) | Слои 43.3 поверх прежних, по порядку сборки: редактор тренировки (✓ вверху, удаления свайпом); подход одной строкой, один перерыв на упражнение, ▶ в строке у упражнений на время; лист занятия («Перенести», «Отменить»), пометки «Пропущено» и «Перенесено», лента журнала с приёмами пищи из витрины Meal. |
| `sport/src/release-notes.js` | История обновлений внизу настроек. |
| `sport/data/` | Виды занятий и рекомендованные шаблоны тренировок. |
| `sport/scripts/` | Сборка `build.mjs` и проверки `check-….mjs`. |
| `shared/` | Копии общих файлов. |
| `prototypes/happy-icon-studio-manifest.json` | Список иконок Icon Studio для проверки иконок. Страницы-заглушки `day/`, `meal/`, `prototypes/` убраны 16.11.2026. |

## Осторожно

- Записи читать и писать только через общий модуль: в приложении — `persist()` (он пишет изменённое через `sport-data.js`). Своего хранилища Sport не заводит.
- Без входа записи не принимаются. Первый вход без сети невозможен.
- Список (тренировки, свои упражнения, шаблоны) хранится по записям с местом. Место даёт `HappyStore.model.place` в `sport-docs.js`: оно не меняется, когда рядом добавили или удалили запись. Порядковый номер местом не делать.
- Замеры тела, профиль, плановые занятия и свитчи связи — документы витрины: их читают Day и Meal. Формат каждого пишет только его общий файл в `shared/`; менять устройство записей — по правилу номера формата (правила проекта, раздел 3).
- Картинки и справочник в `assets/…/v1/` не менять. Изменённый набор кладётся в новую папку `v2/`.

— Claude · 14.11.2026, Update 44 — 16.11.2026; сборка одной командой и чистка проверок — 16.11.2026
