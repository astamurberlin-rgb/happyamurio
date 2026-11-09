# Happy Day · Update 54

Отдельный выпуск Happy Day, собранный из `day-53/` (53.2, main `c7075e4`). Публичная метка — **Happy Day · Update 54**.

- Приложение: https://astamurberlin-rgb.github.io/happyamurio/day-54/
- Самостоятельный HTML: [Happy-Day-54.html](Happy-Day-54.html).

Что нового в 54: настройки по единой структуре Happy (`AGENTS.md`): Аккаунт → Приложение (оформление, настройки «Сейчас», разделы дня, счётчики, теги с временем, пороги, связь с питанием; блок самочувствия `careSettings` вставляется перед скрытым якорем `#daySectionSettingsHeading`) → Данные (резервная копия, CSV, данные из трекеров) → Связанные приложения → скрытый «Для разработчика» (блок «Доступ к модели»; долгое нажатие на строку версии, `shared/happy-settings-developer.js`) → история обновлений и версия. Разметка экрана настроек переставлена, id и обработчики прежние; кнопка «Выбрать оформление» встаёт в слот `data-happy-appearance-slot` под «Оформление», как в Sport (правка `entry()` во встроенном `happy-appearance-module`). Кнопки резервной копии — «Выгрузить дневник» / «Загрузить дневник» / «Вернуть дневник до загрузки». Кнопки «Happy Meal» / «Happy Sport» помечены `data-happy-app` и получают адреса текущих выпусков из `shared/apps.json` при открытии (`shared/happy-links.js`), статический href (`meal-26/`, `sport-38/`) — запасной. Личность входа пока по токену, как в 53 — Day 55 вместе с тестами входа.

Прежний README выпуска 53 — ниже без изменений (пути `day-53` в нём относятся к тому выпуску).

— Claude · 09.11.2026 16:56

---

# Happy Day · Update 53.2

Отдельный выпуск Happy Day, собранный из `day-52/` (main `7ca5f3c`) по аудиту 09.11.2026. Публичная метка — **Happy Day · Update 53.2** (53.1 — ссылка «Happy Meal» на `meal-24/`; 53.2 от 09.11.2026 — кнопки «Happy Meal» / «Happy Sport» ведут на `meal-25/` и `sport-38/` и открывают новое окно).

- Приложение: https://astamurberlin-rgb.github.io/happyamurio/day-53/
- Самостоятельный HTML: [Happy-Day-53.html](Happy-Day-53.html).
- Исходник: `day-52/` (Update 52), код дневника, аккаунтов и синхронизации не менялся.

Что нового в 53: вход Day хранится в собственной ячейке `happy-auth:day` (раньше — `hd_cloud_v1`, общая с Meal на одном origin: обновление токена в одном приложении выглядело сменой аккаунта в другом); прежний вход копируется в новую ячейку при первом открытии, старая ячейка не трогается. Кнопки «Happy Meal» и «Happy Sport» ведут на `meal-25/` (53.2; 53.1 — `meal-24/`, 53 — `meal-23/`) и `sport-38/`, открываются в новом окне. Ежедневное напоминание о JSON-копии отключено. «Студия дуг» вынесена в `prototypes/arc-studio/`. История обновлений и строка версии — через общий модуль `shared/release-notes.js` (автор и время записи).

## Разработка

Точка входа — `day-53/index.html`. Зависимости закреплены в `day-53/shared/` (общие модули копируются из корневого `shared/`; эталон `food-counters.js` — Day 52).

Из корня репозитория:

```sh
node scripts/sync-shared-ui.mjs
python3 scripts/build-day-standalone.py day-53
node --test day-53/tests/*.test.cjs
node scripts/check-layout.mjs
node scripts/check-shared-ui.mjs
node scripts/check-food-counters.mjs
```

`SOURCE-PROVENANCE.json` фиксирует исходный коммит и контрольные суммы файлов выпуска.

— Claude · 09.11.2026 12:32
