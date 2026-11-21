# Карта приложений Happy

Сайт публикуется из ветки `main` репозитория `astamurberlin-rgb/happyamurio`.

## Приложения

| Приложение | Открыть | Папка |
| --- | --- | --- |
| Happy Day | https://astamurberlin-rgb.github.io/happyamurio/day-60/ | `day-60/` |
| Happy Meal | https://astamurberlin-rgb.github.io/happyamurio/meal-33/ | `meal-33/` |
| Happy Sport | https://astamurberlin-rgb.github.io/happyamurio/sport-44/ | `sport-44/`, исходники — `sport-44/sport/src/` |

Точный номер версии виден внизу настроек приложения. Служебно он записан в `shared/apps.json`: по этому файлу приложения находят друг друга, а проверки узнают, что проверять.

Прежние версии оставлены, чтобы было куда вернуться и для второй иконки:

| Приложение | Открыть |
| --- | --- |
| Happy Day 59 | https://astamurberlin-rgb.github.io/happyamurio/day-59/ |
| Happy Meal 32 | https://astamurberlin-rgb.github.io/happyamurio/meal-32/ |
| Happy Sport 43 | https://astamurberlin-rgb.github.io/happyamurio/sport-43/ |

Они хранят записи через тот же общий модуль, что и текущие. Если устройство какого-то документа с тех пор изменилось, прежняя версия этот документ не откроет и предложит открыть последнюю. Более старые папки убраны с сайта 20.11.2026 по слову Астамура; вернуть их можно из истории Git.

Старые адреса `day/`, `meal/`, `sport/`, `happyday-v50_1.html` и `happyday-meal-v22.html` сами открывают текущий выпуск.

## Остальные страницы

| Страница | Версия | Открыть | Папка |
| --- | --- | --- | --- |
| Happy Notes — дневники и заметки | 2.1.1 | https://astamurberlin-rgb.github.io/happyamurio/files-2/ | `files-2/` |
| Файлы — прежний просмотр тех же документов | 1.7 | https://astamurberlin-rgb.github.io/happyamurio/files/ | `files/` |
| Color Studio — палитры трёх приложений | 12.11 | https://astamurberlin-rgb.github.io/happyamurio/prototypes/studio.html | `prototypes/` |
| Icon Studio — иконки | 2.18 | https://astamurberlin-rgb.github.io/happyamurio/icon-studio/ | `icon-studio/` |
| Студия дуг — дуга кольца энергии Day | 1.2 | https://astamurberlin-rgb.github.io/happyamurio/prototypes/arc-studio/ | `prototypes/arc-studio/` |
| Советы — какую модель ИИ брать под задачу | 1.0 | https://astamurberlin-rgb.github.io/happyamurio/tips/ | `tips/` |

Ключ доступа к Happy Notes и «Файлам» живёт только в ссылке и в браузере устройства. В репозиторий он не попадает.

Icon Studio собирается в Sites у ChatGPT. При переносе оттуда сохранить файл `icon-studio/happy-studio-account.js` и его подключение в `index.html`: это вход в аккаунт Happy, общий с Color Studio.

## Где что лежит

| Папка или файл | Что там |
| --- | --- |
| `shared/` | Общие части трёх приложений и карта `apps.json`. |
| `scripts/` | Общие проверки и команды сборки. В `scripts/README.md` — справочник исполнителя: проверки, сборка, что где лежит в каждом приложении и что не править руками. |
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

— Claude · последняя правка 21.11.2026 15:32
