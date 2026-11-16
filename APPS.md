# Карта приложений Happy

Сайт публикуется из ветки `main` репозитория `astamurberlin-rgb/happyamurio`.

## Приложения

| Приложение | Открыть | Папка |
| --- | --- | --- |
| Happy Day | https://astamurberlin-rgb.github.io/happyamurio/day-60/ | `day-60/` |
| Happy Meal | https://astamurberlin-rgb.github.io/happyamurio/meal-33/ | `meal-33/` |
| Happy Sport | https://astamurberlin-rgb.github.io/happyamurio/sport-44/ | `sport-44/`, исходники — `sport-44/sport/src/` |

Точный номер версии виден внизу настроек приложения. Служебно он записан в `shared/apps.json`: по этому файлу приложения находят друг друга, а проверки узнают, что проверять.

Предыдущие выпуски оставлены, чтобы было куда вернуться:

| Приложение | Открыть |
| --- | --- |
| Happy Day | https://astamurberlin-rgb.github.io/happyamurio/day-58/ |
| Happy Meal | https://astamurberlin-rgb.github.io/happyamurio/meal-31/ |
| Happy Sport | https://astamurberlin-rgb.github.io/happyamurio/sport-42/ |

Day 59, Meal 32 и Sport 43 хранят записи через общий модуль. Day 58 и Meal 31 и более ранние новых записей не откроют: у них свой прежний дневник. Sport 42 открывает те же записи, что и Sport 43.

Старые адреса `day/`, `meal/`, `sport/`, `happyday-v50_1.html` и `happyday-meal-v22.html` сами открывают текущий выпуск.

## Остальные страницы

| Страница | Версия | Открыть | Папка |
| --- | --- | --- | --- |
| Happy Notes — дневники и заметки | 2.1.1 | https://astamurberlin-rgb.github.io/happyamurio/files-2/ | `files-2/` |
| Файлы — прежний просмотр тех же документов | 1.7 | https://astamurberlin-rgb.github.io/happyamurio/files/ | `files/` |
| Color Studio — палитры трёх приложений | 12.8 | https://astamurberlin-rgb.github.io/happyamurio/prototypes/studio.html | `prototypes/` |
| Icon Studio — иконки | 2.18 | https://astamurberlin-rgb.github.io/happyamurio/icon-studio/ | `icon-studio/` |
| Студия дуг — дуга кольца энергии Day | 1.2 | https://astamurberlin-rgb.github.io/happyamurio/prototypes/arc-studio/ | `prototypes/arc-studio/` |

Ключ доступа к Happy Notes и «Файлам» живёт только в ссылке и в браузере устройства. В репозиторий он не попадает.

Icon Studio собирается в Sites у ChatGPT. При переносе оттуда сохранить файл `icon-studio/happy-studio-account.js` и его подключение в `index.html`: это вход в аккаунт Happy, общий с Color Studio.

## Где что лежит

| Папка или файл | Что там |
| --- | --- |
| `shared/` | Общие части трёх приложений и карта `apps.json`. |
| `scripts/` | Общие проверки и команды сборки. |
| `scripts/browser/` | Сценарии, которые проходят приложения в браузере. |
| `assets/sport-icons/v1/` | Картинки занятий Sport. |
| `assets/exercise-library/v1/` | Справочник упражнений, оборудования и групп мышц Sport. |
| `assets/exercise-media/v1/` | Картинки вариантов упражнений Sport. |
| `meal-img/` | Картинки еды для «Сборников» Meal. |
| `meal-data/` | Справочники продуктов для Color Studio и проверок. |
| ветка `meal-libraries` | Каталоги продуктов Meal: BLS, USDA, узбекская кухня, десерты, БАДы и другие. Приложение читает их по списку `manifest.json` из этой ветки. |
| `supabase/` | Серверная часть Happy Notes и обмена студий. |
| `prototypes/` | Студии и отдельные прототипы. |
| `CHANGELOG.md` | Что и когда выпущено. |
| `DATA-STORAGE.md` | Где хранятся записи пользователей. |
| `AGENTS.md` | Правила для исполнителей. |

В корне лежат четыре страницы, которые к трём приложениям не относятся: `signal-v3.html` и три редактора `ornament_facade_editor_….html`.

— Claude · 13.11.2026, выпуски Day, Meal и Sport обновлены 14.11.2026
