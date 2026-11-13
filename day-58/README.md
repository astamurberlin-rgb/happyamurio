# Happy Day · Update 58

Адрес: https://astamurberlin-rgb.github.io/happyamurio/day-58/

Страница — `index.html`. Тот же Day одним файлом для скачивания — `Happy-Day-58.html`.

## Что где лежит

| Файлы | Что делают |
| --- | --- |
| `index.html` | Экраны и основная логика дня. |
| `selfcare-core.js`, `selfcare-ui.js`, `selfcare.css`, `section-wheel.css` | Разделы «Осознанность», «Отметить самочувствие», «Дневник», «Активность». |
| `energy-widget.js`, `energy-widget.css` | Кольцо энергии. |
| `arc-motion.js`, `arc-home.js`, `arc-motion.css` | Движение дуги кольца на главном экране. |
| `counters.js` | Счётчики продуктов. |
| `app-links.js` | Свитчи связи с Meal и Sport. |
| `day-local-store.js` | Хранилище журнала на устройстве, `dayStorage`. |
| `day-journal-sync.js`, `day-auto-sync.js`, `day-account-profile.js`, `day-account-data.js`, `snapshot-sync.js`, `day-passive-plan.js` | Обмен журнала с облаком и сведение правок с двух устройств. |
| `day-test-create.js` | Сохранение журнала в облако и возврат из него по кнопке. |
| `auth-read-only.js` | Граница запросов к серверу. Подключается первым. |
| `day-diagnostic.js` | Сравнение журнала на устройстве и в облаке для раздела «Для разработчика». |
| `day-sport-….mjs`, `day-sport-lifecycle.js`, `day-sport-view.css`, `sport-journal-validator.mjs`, `sport-measurement-reader.mjs` | Чтение замеров тела из облачной копии Sport на экране замеров. |
| `release-notes.js` | История обновлений внизу настроек. |
| `shared/` | Копии общих файлов из корневой папки `shared/`. |
| `tests/` | Тесты. |
| `SOURCE-PROVENANCE.json` | Список файлов выпуска с контрольными суммами. |

## Что не править руками

- Форму аккаунта внутри `index.html`, блок `happy-shared-ui`. Её встраивает команда `node scripts/sync-shared-ui.mjs`.
- Файлы в `shared/`. Они меняются в корневой папке `shared/` и копируются командой `node scripts/sync-shared.mjs`.
- `Happy-Day-58.html`. Его собирает команда ниже.

## После правки

Команды запускаются из корня репозитория.

1. `node --test day-58/tests/*.test.cjs` — тесты.
2. `python3 scripts/build-day-standalone.py day-58` — пересобрать Day одним файлом.
3. `git add -A`, затем `python3 scripts/refresh-provenance.py day-58` — обновить контрольные суммы.

— Claude · 13.11.2026
