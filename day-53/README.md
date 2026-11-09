# Happy Day · Update 53

Отдельный выпуск Happy Day, собранный из `day-52/` (main `7ca5f3c`) по аудиту 09.11.2026. Публичная метка — **Happy Day · Update 53**.

- Приложение: https://astamurberlin-rgb.github.io/happyamurio/day-53/
- Самостоятельный HTML: [Happy-Day-53.html](Happy-Day-53.html).
- Исходник: `day-52/` (Update 52), код дневника, аккаунтов и синхронизации не менялся.

Что нового в 53: вход Day хранится в собственной ячейке `happy-auth:day` (раньше — `hd_cloud_v1`, общая с Meal на одном origin: обновление токена в одном приложении выглядело сменой аккаунта в другом); прежний вход копируется в новую ячейку при первом открытии, старая ячейка не трогается. Кнопки «Happy Meal» и «Happy Sport» ведут на `meal-23/` и `sport-38/`. Ежедневное напоминание о JSON-копии отключено. «Студия дуг» вынесена в `prototypes/arc-studio/`. История обновлений и строка версии — через общий модуль `shared/release-notes.js` (автор и время записи).

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
