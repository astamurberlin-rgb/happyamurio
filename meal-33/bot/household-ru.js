/* Happy Meal · единый словарь бытовой речи. Данные (обычный JSON) в обёртке JS: приложение читает файл сразу и без сети.
   Правят здесь; бот (bot-speech.js), лента мер и будущая модель берут слова и веса отсюда. Основа — исследование Михалыча (ChatGPT) 0.2.0,
   дополнено исследованием Claude и решениями Астамура 17.11.2026. — Claude · 17.11.2026 */
window.HappyMealSpeechData={
 "schema_version": 1,
 "dictionary_version": "0.3.0",
 "locale": "ru",
 "status": "connected",
 "updated_on": "2026-11-17",
 "description_ru": "Единый словарь бытовой речи Happy Meal: названия продуктов, выражения, меры, части, основания решений и контрольные примеры. С Meal 33.9 бот записи еды читает этот файл (meal-33/bot-speech.js). Файл — данные в обёртке JS, чтобы приложение читало его сразу и без сети; внутри обычный JSON.",
 "approval": {
  "implementation_requires_user_yes": true,
  "site_release_requires_user_vypuskay": true,
  "scope_note_ru": "17.11.2026 19:07 Астамур разрешил подключить словарь и менять поведение бота (решения D13–D19). Выпуск сайта — отдельным словом «выпускай»."
 },
 "baseline": {
  "app_version": "Meal 33.9",
  "research_app_version": "Meal 33.7",
  "research_app_commit": "414c0161ac984263b0d99f171401a6a002fb6dfe",
  "research_libraries_commit": "8f5b421eb5af9d3fc2bb8451b0ff9a81eba6b421"
 },
 "normalization": {
  "unicode": "NFC",
  "lowercase_for_matching": true,
  "ё_equals_е_for_matching": true,
  "retain_original_utterance": true,
  "phrase_match": "longest_first_whole_tokens",
  "do_not_delete_words_before_semantic_parse": true
 },
 "sources": [
  {
   "id": "S01",
   "title": "Дневник: разные ложки масла",
   "url": "https://health-diet.ru/people/user/942532/blog/446865/",
   "published_or_version": "2026-06-26",
   "kind": "дневник и обсуждение",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Надёжно как пример речи; взвешивания сообщены самими авторами, не проверены независимо."
  },
  {
   "id": "S02",
   "title": "Дневник: проверка количества на глаз",
   "url": "https://health-diet.ru/people/user/1086735/blog/425001/",
   "published_or_version": "2025-11-05",
   "kind": "дневник",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Речь — прямое свидетельство; вес — неподтверждённый личный замер."
  },
  {
   "id": "S03",
   "title": "Домашний рецепт с фаршем",
   "url": "https://forum.say7.info/topic14477.html",
   "published_or_version": "2009-05-08",
   "kind": "кулинарный форум",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Прямой пример бытового рецепта; веса луковицы не измерены."
  },
  {
   "id": "S04",
   "title": "Панчо: неполный стакан",
   "url": "https://forum.say7.info/topic1346.html",
   "published_or_version": "2007; дополнения 2009",
   "kind": "рецепт и отзывы",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Хорошее свидетельство формулировки и необходимости уточнения; универсального веса нет."
  },
  {
   "id": "S05",
   "title": "Салат с фенхелем",
   "url": "https://forum.say7.info/topic101689.html",
   "published_or_version": "2022-03-23",
   "kind": "кулинарный форум",
   "access": "поисковый текст страницы",
   "checked_on": "2026-11-17",
   "reliability": "Пример речи подтверждён индексом; полное открытие страницы было нестабильно."
  },
  {
   "id": "S06",
   "title": "Чай с мятой",
   "url": "https://forum.say7.info/topic67521.html",
   "published_or_version": "2013",
   "kind": "кулинарный форум",
   "access": "поисковый текст страницы",
   "checked_on": "2026-11-17",
   "reliability": "Языковой пример; источник не используется для лечебных или весовых утверждений."
  },
  {
   "id": "S07",
   "title": "Домашнее приготовление в казане",
   "url": "https://forum.say7.info/topic36183.html",
   "published_or_version": "2010",
   "kind": "кулинарный форум",
   "access": "поисковый текст страницы",
   "checked_on": "2026-11-17",
   "reliability": "Речь подтверждена индексом; страница открывалась с ошибкой кодировки. Не источник граммов порции."
  },
  {
   "id": "S08",
   "title": "Обсуждение рецепта, пропорции",
   "url": "https://forum.say7.info/topic49285-25.html",
   "published_or_version": "дата обсуждения на странице",
   "kind": "отзывы к рецепту",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Пример разговора; частный пересчёт нельзя переносить на любой продукт."
  },
  {
   "id": "S09",
   "title": "Суп: головка, полголовки, пучок",
   "url": "https://forum.say7.info/topic49647.html",
   "published_or_version": "2011",
   "kind": "кулинарный форум",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Прямая речь; пол и возраст аудитории по профилю не устанавливаем."
  },
  {
   "id": "S10",
   "title": "Арбузный сироп: неуверенное количество",
   "url": "https://forum.say7.info/topic68572.html",
   "published_or_version": "2013-08",
   "kind": "кулинарный форум",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Речь надёжна как наблюдение; спорные числа не принимаются за весовые нормы."
  },
  {
   "id": "S11",
   "title": "Рецепт: ложечка и горка",
   "url": "https://forum.say7.info/topic12674.html",
   "published_or_version": "2009-03-12",
   "kind": "кулинарный форум",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Прямой пример; коэффициента горки нет."
  },
  {
   "id": "S12",
   "title": "Рецепт с сыром",
   "url": "https://forum.say7.info/topic90938.html",
   "published_or_version": "дата на странице",
   "kind": "кулинарный форум",
   "access": "поисковый текст страницы",
   "checked_on": "2026-11-17",
   "reliability": "Надёжно для факта написания; предполагаемое исправление требует осторожности."
  },
  {
   "id": "S13",
   "title": "Дневник: кусочек хлеба",
   "url": "https://health-diet.ru/people/user/1249240/blog/456078/",
   "published_or_version": "2026-10-28",
   "kind": "дневник и обсуждение",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Речь — прямое свидетельство; 30–35 г относятся к конкретному хлебу автора."
  },
  {
   "id": "S14",
   "title": "Дневник: хлеб и разговорное написание",
   "url": "https://health-diet.ru/people/user/1170647/blog/451368/",
   "published_or_version": "2026",
   "kind": "дневник",
   "access": "поисковый текст страницы",
   "checked_on": "2026-11-17",
   "reliability": "Языковой пример; происхождение ошибки неизвестно."
  },
  {
   "id": "S15",
   "title": "Дневник: сокращения на ходу",
   "url": "https://health-diet.ru/people/user/291117/blog/446838/",
   "published_or_version": "2026",
   "kind": "дневник",
   "access": "поисковый текст страницы",
   "checked_on": "2026-11-17",
   "reliability": "Прямая письменная речь; не выдаём её за расшифровку аудио."
  },
  {
   "id": "S16",
   "title": "Разговор о пироге и крупе",
   "url": "https://forum.say7.info/topic102393-20625.html",
   "published_or_version": "2026-02",
   "kind": "кулинарное обсуждение",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Прямое речевое свидетельство; пол/возраст не используются для правил."
  },
  {
   "id": "S17",
   "title": "Пожелание голосовой записи дневника",
   "url": "https://health-diet.ru/people/user/1/blog/231020/",
   "published_or_version": "2020-06",
   "kind": "обсуждение функций дневника",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Не аудиозапись и не расшифровка; реальную частоту голосовых ошибок не подтверждает."
  },
  {
   "id": "S18",
   "title": "Ошибка пользователя: штуки и граммы",
   "url": "https://health-diet.ru/people/user/298122/blog/179003/",
   "published_or_version": "дата на странице",
   "kind": "дневник",
   "access": "поисковый текст страницы",
   "checked_on": "2026-11-17",
   "reliability": "Личный рассказ; нельзя определить, где именно произошла ошибка приложения."
  },
  {
   "id": "S19",
   "title": "Бабушкина каша",
   "url": "https://domashnierecepty.info/novosti/kasha-pshennaya-v-russkoy-pechi-kasha-pshennaya-iz-russkoy-pechki-babushkina-kasha",
   "published_or_version": "2019-10-29",
   "kind": "перепечатка домашнего рецепта",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Вторичный источник, ниже надёжность происхождения; полезен как бытовая формулировка."
  },
  {
   "id": "S20",
   "title": "USDA FoodData Central: исходные порции",
   "url": "https://fdc.nal.usda.gov/download-datasets/",
   "published_or_version": "SR Legacy, апрель 2018",
   "kind": "официальная база",
   "access": "страница и сохранённые строки данных",
   "checked_on": "2026-11-17",
   "reliability": "Высокая для справочного веса указанной порции; не измерение конкретной луковицы или домашней ложки."
  },
  {
   "id": "S21",
   "title": "King Arthur: таблица весов",
   "url": "https://www.kingarthurbaking.com/learn/ingredient-weight-chart",
   "published_or_version": "проверено 2026-11-17",
   "kind": "справочник производителя для выпечки",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Практический первичный справочник; только указанные продукты и способ отмеривания, не универсальный закон."
  },
  {
   "id": "S22",
   "title": "USDA: перевод объёмов",
   "url": "https://foodbuyingguide.fns.usda.gov/Content/TablesFBG/Table9_FBG_A_Guide_to_Metric_Conversions.pdf",
   "published_or_version": "проверено 2026-11-17",
   "kind": "официальный справочник",
   "access": "PDF",
   "checked_on": "2026-11-17",
   "reliability": "Высокая для системы мер. Не приравнивать всякую бытовую чашку к американской мере."
  },
  {
   "id": "S23",
   "title": "Оренбургский ЦСМ: гранёный стакан",
   "url": "https://orencsm.ru/about/info/news/252134/",
   "published_or_version": "2024-09-11",
   "kind": "центр стандартизации и метрологии",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая для описанной модели; не доказательство вместимости любого стакана пользователя."
  },
  {
   "id": "S24",
   "title": "King Arthur: определение щепотки в рецепте",
   "url": "https://www.kingarthurbaking.com/recipes/tortillas-de-maiz-corn-tortillas-recipe",
   "published_or_version": "проверено 2026-11-17",
   "kind": "рецепт производителя",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Условие конкретного рецепта, не исследование массы щепотки пальцами у населения."
  },
  {
   "id": "S25",
   "title": "Жменя: словарное значение",
   "url": "https://ru.wiktionary.org/wiki/жменя",
   "published_or_version": "проверено 2026-11-17",
   "kind": "редактируемый словарь",
   "access": "страница/поисковый текст",
   "checked_on": "2026-11-17",
   "reliability": "Вспомогательный словарь, подтверждён примерами S05–S06. Точный регион говорящего не выводим."
  },
  {
   "id": "S26",
   "title": "Грамота: приблизительное «порядка»",
   "url": "https://gramota.ru/spravka/vopros/281475",
   "published_or_version": "вопрос №281475",
   "kind": "языковая справка",
   "access": "поисковый текст страницы",
   "checked_on": "2026-11-17",
   "reliability": "Надёжно для значения, не для размера числового отклонения."
  },
  {
   "id": "S27",
   "title": "Рецепт: чуток чеснока",
   "url": "https://forum.say7.info/topic17157.html",
   "published_or_version": "дата на странице",
   "kind": "кулинарный форум",
   "access": "поисковый текст страницы",
   "checked_on": "2026-11-17",
   "reliability": "Языковое свидетельство; граммы отсутствуют."
  },
  {
   "id": "S28",
   "title": "Рецепт: слегка относится к нагреву",
   "url": "https://forum.say7.info/topic63435.html",
   "published_or_version": "дата на странице",
   "kind": "кулинарный форум",
   "access": "поисковый текст страницы",
   "checked_on": "2026-11-17",
   "reliability": "Надёжный контрпример для безусловного перевода «слегка» в граммы."
  },
  {
   "id": "BRIEF",
   "title": "Задание Астамура, 17.11.2026",
   "url": null,
   "kind": "исходные требования",
   "access": "текст задания",
   "reliability": "Кандидат в словарь; сам по себе не свидетельство частотности речи."
  },
  {
   "id": "DESIGN",
   "title": "Предложенное правило по итогам исследования",
   "url": null,
   "kind": "проектное решение",
   "access": "этот отчёт",
   "reliability": "Не измеренная норма; требует согласования до подключения."
  },
  {
   "id": "LEGACY",
   "title": "Текущий бот Meal 33.7",
   "url": "https://github.com/astamurberlin-rgb/happyamurio/blob/414c0161ac984263b0d99f171401a6a002fb6dfe/meal-33/bot.js",
   "kind": "существующее поведение",
   "access": "исходники и запуск",
   "reliability": "Подтверждает действие программы, не правильность массы."
  },
  {
   "id": "S29",
   "title": "Активный словарь русского языка РАН, курица 1.2",
   "url": "https://ruslang.ru/sites/default/files/2024-12/ASRYa-4-2.pdf",
   "kind": "академический словарь",
   "access": "полный текст",
   "reliability": "Кулинарное значение курицы; курятина, курочка; формы куриный. Значение, не вес.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S30",
   "title": "Грамота, индейка и индюшка",
   "url": "https://gramota.ru/poisk?mode=slovari&query=%D0%B8%D0%BD%D0%B4%D0%B5%D0%B9%D0%BA%D0%B0",
   "kind": "академический словарь",
   "access": "поисковый текст; прямое открытие 403",
   "reliability": "Индейка, индюшка, индюшатина в пищевом значении; не определяет часть туши.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S31",
   "title": "Грамота, варёный",
   "url": "https://gramota.ru/meta/varenyy",
   "kind": "академический словарь",
   "access": "поисковый текст; прямое открытие 403",
   "reliability": "Варёный и отварной как способ приготовления.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S32",
   "title": "Грамота, помидор",
   "url": "https://gramota.ru/poisk?mode=slovari&query=%D0%BF%D0%BE%D0%BC%D0%B8%D0%B4%D0%BE%D1%80%D0%BE%D0%B2&simple=0",
   "kind": "академический словарь",
   "access": "поисковый текст; прямое открытие 403",
   "reliability": "Помидор, томат, помидорчик в значении плода; не паста и не сок.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S33",
   "title": "Грамота, морковка",
   "url": "https://gramota.ru/meta/morkovka",
   "kind": "академический словарь",
   "access": "поисковый текст статьи",
   "reliability": "Морковь и отдельный корнеплод; размер не задан.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S34",
   "title": "Грамота, бурак",
   "url": "https://gramota.ru/poisk?mode=slovari&query=%D0%B1%D1%83%D1%80%D0%B1%D0%B0%D0%BA",
   "kind": "академический словарь",
   "access": "полный текст словарного результата",
   "reliability": "Народно-разговорное название свёклы; также значение тары. Нужен контекст еды.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S35",
   "title": "Грамота, синенький",
   "url": "https://gramota.ru/poisk?mode=slovari&query=%D0%A1%D0%B8%D0%BD%D0%B5%D1%83%D1%86%D0%BA%D0%B8%D0%B9&simple=0",
   "kind": "академический словарь",
   "access": "поисковый текст; прямое открытие 403",
   "reliability": "Синенькие во множественном числе — разговорное название баклажанов. Не любая синяя еда.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S36",
   "title": "Грамота, кочан",
   "url": "https://gramota.ru/poisk?mode=slovari&query=%D0%9A%D0%BE%D1%87%D0%B0%D0%BD&simple=0",
   "kind": "академический словарь",
   "access": "полный текст",
   "reliability": "Кочан, головка капусты, вилок; также разговорный початок кукурузы. Массы нет.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S37",
   "title": "FineCooking, соус паста из укропа",
   "url": "https://finecooking.ru/recipe/sous-pasta-iz-ukropa-s-chesnokom-na-zimu?comment=34484",
   "kind": "авторский рецепт",
   "access": "полный текст, шаг 2",
   "reliability": "Автор отделяет веточки с листочками от стеблей и допускает молодые нежные стебли. Пример речи, не единый размер веточки.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S38",
   "title": "Гастроном, укроп с солью на зиму",
   "url": "https://www.gastronom.ru/recipe/17719/ukrop-na-zimu",
   "kind": "рецепт редакции",
   "access": "полный текст, шаги 1–4",
   "reliability": "Отдельно названы пучки, веточки и грубые концы стеблей. Количество в рецепте не вес одного пучка.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S39",
   "title": "University of Wisconsin Extension, Dill",
   "url": "https://hort.extension.wisc.edu/articles/dill-anethum-graveolens/",
   "kind": "университетская публикация",
   "access": "полный текст",
   "reliability": "Листья, стебли, соцветия и семена — разные части. Нет массы русской веточки.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S40",
   "title": "University of Maryland Extension, Cilantro Coriander",
   "url": "https://extension.umd.edu/resource/cilantrocoriander",
   "kind": "университетская публикация",
   "access": "полный текст",
   "reliability": "У одного растения употребляют листья и семена. Их различение подтверждено; частоту русских названий источник не исследует.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S41",
   "title": "Грамота, овсянка",
   "url": "https://gramota.ru/poisk?dicts%5B%5D=42&mode=slovari&query=%D0%BE%D0%B2%D1%81%D1%8F%D0%BD%D0%BA%D0%B0",
   "kind": "академический словарь",
   "access": "поисковый текст; прямое открытие 403",
   "reliability": "Овсянка может обозначать крупу или кашу.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S42",
   "title": "Грамота, филе",
   "url": "https://gramota.ru/poisk?dicts%5B0%5D=42&mode=slovari&query=%D1%83%D0%B3%D0%BB%D0%B5&simple=0",
   "kind": "академический словарь",
   "access": "поисковый текст статьи; прямое открытие 403",
   "reliability": "Бескостный кусок; не автоматически грудка, определённый вид животного или способ приготовления.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S43",
   "title": "Грамота, картошка и отварить",
   "url": "https://gramota.ru/poisk?mode=spravka&page=3&query=%D0%BA%D0%B0%D1%80%D1%82%D0%BE%D1%88%D0%BA%D0%B0+%D0%BA%D0%B0%D1%81%D1%82%D1%80%D1%8E%D0%BB%D1%8F&simple=0",
   "kind": "справочная служба",
   "access": "полный текст, ответы 322040 и 200091",
   "reliability": "Картошка и картофель называют один объект; отварить и сварить — синонимы.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S44",
   "title": "Апресян и соавторы, О компьютерном учебнике лексики русского языка",
   "url": "https://rjano.ruslang.ru/sites/default/files/journals/2007/2007-2.pdf",
   "kind": "лингвистическая статья Института русского языка РАН",
   "access": "полный текст, печатная страница 87",
   "reliability": "Связь животного и названия мяса: говядина, свинина, баранина, телятина, утятина, гусятина, оленина, лососина. Это языковые связи, не эквивалентность пищевых карточек.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "C01",
   "title": "ВкусВилл: сколько сахара в стакане и муки в ложке",
   "url": "https://vkusvill.ru/media/journal/skolko-sakhara-v-stakane-i-muki-v-stolovoy-lozhke.html",
   "kind": "журнал магазина, бренд-шеф",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Средняя: взвешивали сами, одним стаканом и одной ложкой."
  },
  {
   "id": "C02",
   "title": "Т—Ж: сколько граммов в гранёном стакане",
   "url": "https://t-j.ru/list/grammy-v-stakane/",
   "kind": "журнал, собственные замеры",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Средняя: собственное взвешивание."
  },
  {
   "id": "C03",
   "title": "Т—Ж: сколько граммов в чайной и столовой ложке",
   "url": "https://t-j.ru/grammy-v-lozhke/",
   "kind": "журнал, собственные замеры",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Средняя: живые ложки меньше табличных."
  },
  {
   "id": "C04",
   "title": "ВкусВилл: Укроп, 50 г (пучок)",
   "url": "https://vkusvill.ru/goods/ukrop-50-g-15194.html",
   "kind": "карточка товара",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая для фасовки магазина: пучок укропа продаётся по 50 г."
  },
  {
   "id": "C05",
   "title": "NIAAA: What Is A Standard Drink?",
   "url": "https://www.niaaa.nih.gov/alcohols-effects-health/what-standard-drink",
   "kind": "государственный институт США",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая: 12 унций пива, 5 унций вина, 1,5 унции крепкого — одна стандартная порция США."
  },
  {
   "id": "C06",
   "title": "USDA SR Legacy: меры продуктов в каталоге Happy Meal",
   "url": "https://fdc.nal.usda.gov/download-datasets/",
   "kind": "официальная база, строки порций из каталога meal-libraries",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая для американской меры; русская веточка или кусок могут отличаться."
  },
  {
   "id": "C07",
   "title": "А. Патаки: выражение приблизительности в русском языке",
   "url": "https://core.ac.uk/download/147049553.pdf",
   "kind": "лингвистическая работа",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая для списка слов, не для чисел."
  },
  {
   "id": "C08",
   "title": "В. И. Подлесская: самоисправления говорящего, «Диалог-2014»",
   "url": "https://www.dialog-21.ru/digests/dialog2014/materials/pdf/PodlesskayaVI.pdf",
   "kind": "лингвистическая статья",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая: поправка заменяет последнее сказанное того же вида."
  },
  {
   "id": "C09",
   "title": "Sushi University: How is Shari’s weight decided?",
   "url": "https://sushiuniversity.jp/sushiblog/?p=7447",
   "kind": "блог школы суши",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Средняя: единого стандарта нет; сегодня 10–15 г риса на штуку в Токио, 15–20 г в регионах."
  },
  {
   "id": "C10",
   "title": "RecipeTin Japan: salmon nigiri",
   "url": "https://japan.recipetineats.com/seared-salmon-nigiri-aburi-salmon/",
   "kind": "рецепт",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Средняя: около 15 г риса и 15–18 г рыбы на штуку."
  },
  {
   "id": "C11",
   "title": "MAFF Japan: Onigiri (Rice Balls)",
   "url": "https://www.maff.go.jp/e/policies/market/japan-cuisine/japan/7/index.html",
   "kind": "министерство сельского хозяйства Японии, рецепт",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая для рецепта: 100 г варёного риса на одну порцию онигири; начинка сверх того."
  },
  {
   "id": "C12",
   "title": "The Japan Forum Newsletter no. 9",
   "url": "https://www.tjf.or.jp/newsletter/pdf_en/Nl09_ADIL.pdf",
   "kind": "образовательное издание",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Средняя: порция риса в обычной японской пиале — около 150 г."
  },
  {
   "id": "C13",
   "title": "Recommendation of Serving Size… Community Child Centers in Korea",
   "url": "https://search.bvsalud.org/gim/resource/en/wpr-23675",
   "kind": "корейское исследование порций",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Средняя: средняя порция риса 190 г, суп и рагу 210 г; для детских центров, взрослая порция в ресторанах 180–290 г."
  },
  {
   "id": "C14",
   "title": "One portion size of foods frequently consumed by Korean adults",
   "url": "https://search.bvsalud.org/gim/resource/en/wpr-95248",
   "kind": "корейское исследование порций, Nutr Res Pract 2010",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая: порция кимчи из пекинской капусты — 40 г."
  },
  {
   "id": "J01",
   "title": "NIBIOHN: таблица весов для национального обследования питания Японии",
   "url": "https://www.nibn.go.jp/eiken/chosa/pdf/jyuryomeyasuhyo2009_2013ver.pdf",
   "kind": "государственный институт здоровья и питания Японии",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая: пиала мисо-супа — 150 мл супа и около 50 г начинки; пиала риса 160 мл — 140 г."
  },
  {
   "id": "J02",
   "title": "Eatreat: веса продуктов (овощи, соя, рыба, крупы)",
   "url": "https://www.eat-treat.jp/columns/1268",
   "kind": "таблицы японских диетологов",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Средняя: тофу 300 г, натто 50 г, кусочек сашими 15 г, удон 1 порция 200 г, имбирь 15 г, чеснок 10 г."
  },
  {
   "id": "J03",
   "title": "Хиросима: таблица мер",
   "url": "https://www.city.hiroshima.lg.jp/_res/projects/default_project/_page_/001/007/300/122404.pdf",
   "kind": "городская таблица мер",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая: столовая ложка соевого соуса, мисо, соли — 18 г."
  },
  {
   "id": "J04",
   "title": "Киото и Минздрав Японии: напитки",
   "url": "https://kyo-kenko.city.kyoto.lg.jp/assets/file/alcohol_calibration_scale.pdf",
   "kind": "городская таблица",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая: сакэ 1 гō 180 мл, чашечка о-тёко 30 мл."
  },
  {
   "id": "J05",
   "title": "Ajinomoto, калорийные таблицы: соба и лапша",
   "url": "https://www.ajinomoto.co.jp/company/jp/rd/miraikondate/column/article_060/",
   "kind": "производитель",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Средняя: соба варёная 180–250 г; лапша для рамена варёная 230 г."
  },
  {
   "id": "K01",
   "title": "Национальное обследование питания Кореи 2010: порции взрослых",
   "url": "https://db.koreascholar.com/Article/Detail/243457",
   "kind": "научная статья",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая: рамён 500 мл, суп 250 мл, кимчи-ччигэ 200 мл."
  },
  {
   "id": "K02",
   "title": "Корея: стандартная миска риса и рис «Хэтбан» 210 г",
   "url": "https://news.bizwatch.co.kr/article/consumer/2021/08/20/0023",
   "kind": "деловая пресса",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая: миска риса 210 г."
  },
  {
   "id": "K03",
   "title": "LG: меры корейских рецептов",
   "url": "https://www.lge.co.kr/story/storyRecipeDetail",
   "kind": "производитель",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Средняя: зубчик чеснока 5 г, кусочек имбиря 5 г, бумажный стаканчик 180 мл."
  },
  {
   "id": "K04",
   "title": "Соджу 360 мл; макколли 200 мл",
   "url": "https://news.bizwatch.co.kr/article/consumer/2025/08/26/0036",
   "kind": "деловая пресса",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая: бутылка соджу 360 мл."
  },
  {
   "id": "R01",
   "title": "Wikipedia: Pelmeni",
   "url": "https://en.wikipedia.org/wiki/Pelmeni",
   "kind": "энциклопедия",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Низкая: фабричные пельмени — около 15 г за штуку; домашние мельче."
  },
  {
   "id": "ASTAMUR",
   "title": "Решения Астамура 17.11.2026 19:07",
   "url": null,
   "kind": "решение владельца",
   "access": "чат Claude",
   "reliability": "Решение, а не замер: числа — соглашение проекта."
  },
  {
   "id": "ESTIMATE",
   "title": "Рабочая оценка Claude",
   "url": null,
   "kind": "оценка без источника",
   "access": "—",
   "reliability": "Низкая: число выбрано, чтобы бот не спрашивал; запись помечается «≈», своя мера человека важнее."
  }
 ],
 "fillers_and_operators": [
  {
   "id": "filler_plain",
   "forms": [
    "ну",
    "вот",
    "короче",
    "значит",
    "это самое",
    "сейчас скажу",
    "как бы",
    "как его",
    "в общем",
    "слушай",
    "смотри",
    "ладно",
    "ээ",
    "эээ",
    "э-э",
    "м-м",
    "мм",
    "подожди",
    "секунду",
    "что там еще",
    "дальше",
    "вес после очистки",
    "после очистки",
    "без скорлупы",
    "на сковороду",
    "на сковородку",
    "в сковороду",
    "на сковороде",
    "это вес",
    "взвесил",
    "взвесила",
    "уже очищенный",
    "уже очищенная",
    "это уже",
    "ну и",
    "короче говоря",
    "это самое",
    "так вот",
    "в смысле",
    "собственно",
    "кстати"
   ],
   "meaning_ru": "Разговорная вставка; удалять только после распознавания еды, времени, команд и связей.",
   "action": "ignore_if_discourse",
   "source_ids": [
    "S04",
    "S09",
    "BRIEF",
    "C07"
   ],
   "scope": "whole_phrase_or_token",
   "never_substring": true,
   "bot": "drop"
  },
  {
   "id": "filler_conditional",
   "forms": [
    "так",
    "типа",
    "а",
    "ой"
   ],
   "meaning_ru": "Может быть вставкой, сравнением или началом исправления.",
   "action": "context_first",
   "source_ids": [
    "BRIEF",
    "S10"
   ],
   "ignore_only_after": "corrections_and_food_identity"
  },
  {
   "id": "addition",
   "forms": [
    "ещё",
    "еще",
    "плюс",
    "добавь"
   ],
   "meaning_ru": "Ещё одна порция или ингредиент; не удалять до привязки к записи.",
   "action": "add_or_extend",
   "source_ids": [
    "S15",
    "BRIEF"
   ]
  },
  {
   "id": "correction",
   "forms": [
    "нет",
    "то есть",
    "ой нет",
    "вернее",
    "точнее"
   ],
   "meaning_ru": "Заменить сказанное или уточнить равнозначное описание.",
   "action": "resolve_correction",
   "source_ids": [
    "S16",
    "BRIEF"
   ],
   "must_resolve_before_commit": true
  },
  {
   "id": "protected",
   "forms": [
    "без",
    "не",
    "из них",
    "в том числе",
    "осталось",
    "вчера",
    "сейчас",
    "блин"
   ],
   "meaning_ru": "Отрицание, часть целого, остаток, время или название еды; это не общий мусор.",
   "action": "protect",
   "source_ids": [
    "S15",
    "BRIEF"
   ]
  },
  {
   "id": "weighing_words",
   "bot": "drop",
   "forms": [
    "взвесил",
    "взвесила",
    "взвешивал",
    "взвешивала",
    "получилось",
    "получилась",
    "получился",
    "получились",
    "вышло",
    "вышла",
    "вышел",
    "на весах"
   ],
   "meaning_ru": "«Взвесил», «получилось» — так человек говорит, когда записывает еду с весов: слова пропускаются, на сырое и готовое не влияют. Решение Астамура 18.11.2026 00:51.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "takeaway_words",
   "bot": "drop",
   "forms": [
    "с собой",
    "на вынос",
    "навынос"
   ],
   "meaning_ru": "Где еда куплена или съедена — к составу не относится.",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "id": "intake_verbs",
   "bot": "drop",
   "forms": [
    "съел",
    "съела",
    "съели",
    "выпил",
    "выпила",
    "выпили",
    "поел",
    "поела",
    "слопал",
    "слопала",
    "умял",
    "умяла",
    "скушал",
    "скушала",
    "покушал",
    "покушала",
    "добавил",
    "добавила",
    "положил",
    "положила",
    "налил",
    "налила",
    "запил",
    "запила",
    "закусил",
    "закусила",
    "взял",
    "взяла"
   ],
   "meaning_ru": "Глагол действия: еды не называет, количество не меняет.",
   "action": "ignore",
   "source_ids": [
    "S16",
    "S17",
    "DESIGN"
   ]
  },
  {
   "id": "adding_verbs",
   "bot": "split",
   "forms": [
    "посыпал",
    "посыпала",
    "заправил",
    "заправила",
    "намазал",
    "намазала",
    "полил",
    "полила",
    "сверху"
   ],
   "meaning_ru": "Глагол добавления: дальше назван ещё один продукт («салат заправил маслом» — салат и масло), а не часть названия.",
   "action": "split_into_separate_food",
   "source_ids": [
    "S12",
    "S03",
    "DESIGN"
   ]
  },
  {
   "id": "correction_inline",
   "bot": "correction",
   "forms": [
    "вернее",
    "точнее",
    "то есть",
    "хотя нет",
    "а нет",
    "ой нет",
    "или нет",
    "тьфу",
    "я хотел сказать",
    "я хотела сказать",
    "имею в виду"
   ],
   "meaning_ru": "Поправка внутри фразы: новое заменяет последнее сказанное того же вида — число, меру или продукт. Не складывать.",
   "action": "replace_last_same_kind",
   "source_ids": [
    "C08",
    "S16",
    "ASTAMUR"
   ]
  }
 ],
 "approximation": [
  {
   "id": "approx_number",
   "forms": [
    "около",
    "где-то",
    "где то",
    "примерно",
    "приблизительно",
    "порядка",
    "в районе",
    "что-то около",
    "что то около",
    "этак",
    "навскидку",
    "грубо",
    "кажется",
    "наверное",
    "вроде",
    "почти",
    "без малого",
    "с лишним",
    "с небольшим",
    "с хвостиком",
    "с копейками",
    "где-нибудь",
    "не больше",
    "не меньше",
    "плюс-минус",
    "плюс минус",
    "что-то вроде",
    "что то вроде",
    "с чем-то",
    "с чем то",
    "чуть больше",
    "чуть меньше",
    "немного больше",
    "немного меньше",
    "типа"
   ],
   "meaning_ru": "Число известно приблизительно: число не меняется, запись получает «≈». Бот не переспрашивает (D13).",
   "action": "use_number_mark_estimate",
   "source_ids": [
    "S02",
    "S10",
    "S11",
    "S26",
    "BRIEF",
    "C07",
    "ASTAMUR"
   ],
   "interval": null,
   "bot": "approx"
  },
  {
   "id": "approx_reversed",
   "forms": [
    "грамм 200",
    "грамм сто пятьдесят",
    "килограмма два"
   ],
   "meaning_ru": "Мера стоит перед числом; порядок слов часто передаёт приблизительность.",
   "action": "parse_reversed_measure_number",
   "source_ids": [
    "S03",
    "S07",
    "BRIEF"
   ],
   "interval": null
  },
  {
   "id": "approx_similarity",
   "forms": [
    "что-то вроде",
    "что то вроде",
    "типа"
   ],
   "meaning_ru": "Похожий продукт или блюдо, а не обязательно неточный вес.",
   "action": "clarify_food_if_similarity",
   "source_ids": [
    "BRIEF"
   ],
   "superseded_by": "approx_number / ranges (D13): бот записывает число с «≈» и не спрашивает."
  },
  {
   "id": "approx_remainder",
   "forms": [
    "с чем-то",
    "с чем то"
   ],
   "meaning_ru": "Известна основная часть числа, остаток не назван.",
   "action": "ask_accept_approx_base",
   "source_ids": [
    "S10",
    "BRIEF"
   ],
   "multiplier": null,
   "superseded_by": "approx_number / ranges (D13): бот записывает число с «≈» и не спрашивает."
  },
  {
   "id": "approx_range",
   "forms": [
    "плюс-минус",
    "плюс минус",
    "±",
    "от",
    "до"
   ],
   "meaning_ru": "Явно заданный диапазон или отклонение хранится вместе с центральным значением.",
   "action": "parse_explicit_range",
   "source_ids": [
    "S07",
    "BRIEF"
   ],
   "superseded_by": "approx_number / ranges (D13): бот записывает число с «≈» и не спрашивает."
  },
  {
   "id": "approx_more_less",
   "forms": [
    "чуть больше",
    "чуть меньше",
    "немного больше",
    "немного меньше"
   ],
   "meaning_ru": "Направление изменения известно, величина нет.",
   "action": "ask_or_offer_base_estimate",
   "source_ids": [
    "BRIEF"
   ],
   "multiplier": null,
   "superseded_by": "approx_number / ranges (D13): бот записывает число с «≈» и не спрашивает."
  },
  {
   "id": "approx_incomplete",
   "forms": [
    "неполный",
    "неполная",
    "неполное",
    "неполную",
    "неполного"
   ],
   "meaning_ru": "Неполная мера: записывается 0,8 меры с «≈», без вопроса (D13). Число 0,8 — рабочая оценка.",
   "action": "multiply_and_mark_estimate",
   "source_ids": [
    "S04",
    "S11",
    "ASTAMUR",
    "ESTIMATE"
   ],
   "multiplier": null,
   "bot": "factor",
   "factor": 0.8
  },
  {
   "id": "level",
   "forms": [
    "без горки",
    "вровень",
    "ровная",
    "без верха",
    "до краев",
    "до края",
    "полный",
    "полная",
    "полную",
    "граненый",
    "граненого"
   ],
   "meaning_ru": "Обычное наполнение: мера как есть. Стакан — 250 мл (D14).",
   "action": "use_level_measure",
   "source_ids": [
    "S11",
    "BRIEF"
   ],
   "bot": "drop"
  },
  {
   "id": "heaped",
   "forms": [
    "с горкой",
    "с верхом"
   ],
   "meaning_ru": "С горкой: полторы меры с «≈», без вопроса (D13). Число 1,5 — рабочая оценка; своя мера человека важнее.",
   "action": "multiply_and_mark_estimate",
   "source_ids": [
    "S11",
    "ASTAMUR",
    "ESTIMATE"
   ],
   "multiplier": null,
   "bot": "factor",
   "factor": 1.5
  },
  {
   "id": "rim",
   "forms": [
    "до ободка",
    "до каемки",
    "по ободок"
   ],
   "bot": "factor",
   "factor": 0.8,
   "meaning_ru": "Гранёный стакан до ободка — 200 мл из 250.",
   "action": "multiply",
   "source_ids": [
    "S23"
   ]
  }
 ],
 "qualitative_amounts": [
  {
   "id": "vague_eye",
   "forms": [
    "на глаз",
    "на глазок",
    "по вкусу",
    "сколько не жалко",
    "как обычно",
    "сколько-то",
    "сколько то",
    "несколько"
   ],
   "meaning_ru": "Человек не измерял или выбирал по вкусу; числа нет.",
   "action": "usual_measure_times_factor_mark_estimate",
   "source_ids": [
    "S02",
    "S08",
    "S19",
    "BRIEF",
    "ASTAMUR"
   ],
   "grams": null,
   "bot": "vague",
   "factor": 1
  },
  {
   "id": "vague_small",
   "forms": [
    "немного",
    "чуть-чуть",
    "чуть чуть",
    "чуток",
    "чучуть",
    "малость",
    "мало",
    "немножко",
    "чуть",
    "чуточку",
    "самую малость",
    "символически",
    "капельку",
    "каплю"
   ],
   "meaning_ru": "Малое относительно ситуации количество.",
   "action": "usual_measure_times_factor_mark_estimate",
   "source_ids": [
    "S09",
    "S27",
    "BRIEF",
    "ASTAMUR"
   ],
   "grams": null,
   "bot": "vague",
   "factor": 0.5
  },
  {
   "id": "vague_large",
   "forms": [
    "щедро",
    "много",
    "полно",
    "побольше",
    "от души",
    "хорошо так",
    "прилично",
    "сколько не жалко"
   ],
   "meaning_ru": "Большое относительно ситуации количество.",
   "action": "usual_measure_times_factor_mark_estimate",
   "source_ids": [
    "S12",
    "BRIEF",
    "ASTAMUR"
   ],
   "grams": null,
   "bot": "vague",
   "factor": 1.5
  },
  {
   "id": "vague_drop",
   "forms": [
    "капля",
    "капелька"
   ],
   "meaning_ru": "Может быть буквальной каплей либо образом небольшого налитого количества.",
   "action": "usual_measure_times_factor_mark_estimate",
   "source_ids": [
    "S01",
    "BRIEF",
    "ASTAMUR"
   ],
   "grams": null,
   "bot": "vague",
   "factor": 0.5
  },
  {
   "id": "vague_slight",
   "forms": [
    "слегка"
   ],
   "meaning_ru": "Может описывать действие: прогрел, посолил, смазал.",
   "action": "usual_measure_times_factor_mark_estimate",
   "source_ids": [
    "S28",
    "BRIEF",
    "ASTAMUR"
   ],
   "grams": null,
   "bot": "vague",
   "factor": 0.5
  }
 ],
 "measures": [
  {
   "id": "head",
   "forms": [
    "головка",
    "головки",
    "головку",
    "головок",
    "головкой",
    "головке"
   ],
   "meaning_ru": "Лук и чеснок имеют разные массы.",
   "action": "food_specific_weight",
   "source_ids": [
    "S03",
    "S09"
   ],
   "default_grams": 45,
   "unit": "головка",
   "general": 45,
   "status": "connected"
  },
  {
   "id": "clove",
   "forms": [
    "зубчик",
    "зубчика",
    "зубчиков",
    "зубочек",
    "зубок",
    "зубка",
    "зубец",
    "зубца",
    "зубчики",
    "зубчиком"
   ],
   "meaning_ru": "Только зубчик чеснока; не головка.",
   "action": "food_specific_weight",
   "source_ids": [
    "S03",
    "S20"
   ],
   "default_grams": 3,
   "unit": "зубчик",
   "general": 3,
   "status": "connected"
  },
  {
   "id": "bunch",
   "forms": [
    "пучок",
    "пучка",
    "пучков",
    "пучочек",
    "пучочка",
    "пучком",
    "пучки"
   ],
   "meaning_ru": "Пучок зелени — 50 г (решение Астамура, D15; магазинная фасовка укропа 50 г).",
   "action": "personal_weight_or_ask",
   "source_ids": [
    "S09",
    "BRIEF",
    "C04",
    "ASTAMUR"
   ],
   "default_grams": 50,
   "unit": "пучок",
   "general": 50,
   "status": "connected"
  },
  {
   "id": "sprig",
   "forms": [
    "веточка",
    "веточки",
    "веточек",
    "ветка",
    "ветки",
    "ветку",
    "веток",
    "веточку",
    "веточкой"
   ],
   "meaning_ru": "Веточка зелени. Общий вес 1 г (петрушка по USDA: 10 веточек = 10 г); у кинзы 2 г, у укропа 1 г — рабочая оценка: у USDA мелкая веточка укропа 0,2 г.",
   "action": "personal_weight_or_ask",
   "source_ids": [
    "BRIEF",
    "S37",
    "S38",
    "C06",
    "ASTAMUR"
   ],
   "default_grams": 1,
   "unit": "веточка",
   "general": 1,
   "status": "connected"
  },
  {
   "id": "pinch",
   "forms": [
    "щепотка",
    "щепотки",
    "щепоток",
    "щепоть",
    "щепоточка",
    "щепоточки",
    "щепотку",
    "щепоткой",
    "щепоточку"
   ],
   "meaning_ru": "Пальцевая мера; помол и пальцы меняют вес.",
   "action": "offer_explicit_estimate_or_ask",
   "source_ids": [
    "S24",
    "BRIEF"
   ],
   "default_grams": 0.5,
   "unit": "щепотка",
   "general": 0.5,
   "status": "connected"
  },
  {
   "id": "knife_tip",
   "forms": [
    "на кончике ножа",
    "кончик ножа"
   ],
   "meaning_ru": "Нет универсального объёма или массы.",
   "action": "ask_or_offer_explicit_estimate",
   "source_ids": [
    "S12",
    "BRIEF"
   ],
   "default_grams": 0.3,
   "unit": "кончик ножа",
   "general": 0.3,
   "token": "кончикножа",
   "status": "connected"
  },
  {
   "id": "handful",
   "forms": [
    "горсть",
    "горсти",
    "горстей",
    "жменя",
    "жмени",
    "жмень",
    "горсточка",
    "горсточку",
    "горсточки",
    "жменю",
    "горстью"
   ],
   "meaning_ru": "Рука и содержимое меняют массу; листья не равны орехам.",
   "action": "personal_weight_or_offer_food_specific_estimate",
   "source_ids": [
    "S05",
    "S06",
    "S25"
   ],
   "default_grams": 30,
   "unit": "горсть",
   "general": 30,
   "status": "connected"
  },
  {
   "id": "spoon",
   "forms": [
    "ложка",
    "ложки",
    "ложек",
    "ложечка",
    "ложечки",
    "ложку",
    "ложкой",
    "ложками"
   ],
   "meaning_ru": "Без уточнения тип ложки неизвестен.",
   "action": "ask_spoon_kind",
   "source_ids": [
    "BRIEF"
   ],
   "default_grams": 15,
   "unit": "ст. л.",
   "general": 15,
   "status": "connected"
  },
  {
   "id": "tablespoon",
   "forms": [
    "столовая ложка",
    "столовые ложки",
    "столовых ложек",
    "столовой ложки",
    "ст. л.",
    "ст л",
    "ст.л.",
    "стл",
    "столовую ложку",
    "столовой ложкой",
    "большая ложка",
    "большую ложку"
   ],
   "meaning_ru": "Справочная мерная ложка; бытовая может отличаться.",
   "action": "food_specific_weight",
   "source_ids": [
    "S01",
    "S20",
    "S22"
   ],
   "default_grams": 15,
   "unit": "ст. л.",
   "general": 15,
   "status": "connected"
  },
  {
   "id": "teaspoon",
   "forms": [
    "чайная ложка",
    "чайные ложки",
    "чайных ложек",
    "чайной ложки",
    "чайная ложечка",
    "ч. л.",
    "ч л",
    "ч.л.",
    "чл",
    "ложечка",
    "ложечки",
    "ложечку",
    "ложечек",
    "чайную ложку",
    "чайной ложкой",
    "чайную ложечку",
    "чайных ложки"
   ],
   "meaning_ru": "Чайная ложечка не означает половину чайной ложки.",
   "action": "food_specific_weight",
   "source_ids": [
    "S11",
    "S20",
    "S22"
   ],
   "default_grams": 5,
   "unit": "ч. л.",
   "general": 5,
   "status": "connected"
  },
  {
   "id": "dessertspoon",
   "forms": [
    "десертная ложка",
    "десертные ложки",
    "десертных ложек",
    "десертную ложку",
    "десертной ложки",
    "десертной ложкой"
   ],
   "meaning_ru": "Предлагаемое соглашение: две мерные чайные ложки. Домашнюю можно запомнить отдельно.",
   "action": "derived_two_teaspoons_or_personal",
   "source_ids": [
    "BRIEF",
    "DESIGN"
   ],
   "default_grams": 10,
   "unit": "дес. л.",
   "general": 10,
   "token": "десложка",
   "status": "connected"
  },
  {
   "id": "glass",
   "forms": [
    "стакан",
    "стакана",
    "стаканов",
    "стаканом",
    "стаканы",
    "стаканами"
   ],
   "meaning_ru": "Решение Астамура (D14): стакан 250 мл, чашка 200 мл, кружка 300 мл, без переспрашивания. Названный объём («пол-литровая кружка») важнее.",
   "action": "personal_volume_or_ask",
   "source_ids": [
    "S04",
    "BRIEF",
    "ASTAMUR"
   ],
   "default_grams": 250,
   "unit": "стакан",
   "general": 250,
   "status": "connected"
  },
  {
   "id": "faceted_glass",
   "forms": [
    "гранёный стакан",
    "граненый стакан"
   ],
   "meaning_ru": "Для классической модели важен уровень наполнения.",
   "action": "choose_fill_line",
   "source_ids": [
    "S23"
   ],
   "default_grams": 250,
   "unit": "стакан",
   "general": 250,
   "status": "connected"
  },
  {
   "id": "mug",
   "forms": [
    "кружка",
    "кружки",
    "кружек",
    "кружечка",
    "кружку",
    "кружкой",
    "кружечку",
    "кружечки"
   ],
   "meaning_ru": "Решение Астамура (D14): стакан 250 мл, чашка 200 мл, кружка 300 мл, без переспрашивания. Названный объём («пол-литровая кружка») важнее.",
   "action": "personal_volume_or_ask",
   "source_ids": [
    "BRIEF",
    "ASTAMUR"
   ],
   "default_grams": 300,
   "unit": "кружка",
   "general": 300,
   "status": "connected"
  },
  {
   "id": "cup",
   "forms": [
    "чашка",
    "чашки",
    "чашек",
    "чашечка",
    "чашку",
    "чашкой",
    "чашечку",
    "чашечки"
   ],
   "meaning_ru": "Решение Астамура (D14): стакан 250 мл, чашка 200 мл, кружка 300 мл, без переспрашивания. Названный объём («пол-литровая кружка») важнее.",
   "action": "personal_volume_or_ask",
   "source_ids": [
    "S22",
    "BRIEF",
    "ASTAMUR"
   ],
   "default_grams": 200,
   "unit": "чашка",
   "general": 200,
   "status": "connected"
  },
  {
   "id": "piala",
   "forms": [
    "пиала",
    "пиалы",
    "пиал",
    "пиалу",
    "пиалка",
    "пиалку",
    "пиалки"
   ],
   "meaning_ru": "Отдельный сосуд, не универсальная тарелка 300 г.",
   "action": "personal_volume_or_ask",
   "source_ids": [
    "BRIEF"
   ],
   "default_grams": 250,
   "unit": "пиала",
   "general": 250,
   "status": "connected"
  },
  {
   "id": "plate",
   "forms": [
    "тарелка",
    "тарелки",
    "тарелок",
    "тарелочка",
    "тарелку",
    "тарелкой",
    "тарелочку",
    "тарелочки",
    "миска",
    "миску",
    "миски",
    "мисок",
    "мисочка",
    "мисочку"
   ],
   "meaning_ru": "Масса зависит от еды, посуды и наполнения.",
   "action": "personal_food_portion_or_ask",
   "source_ids": [
    "BRIEF"
   ],
   "default_grams": 300,
   "unit": "тарелка",
   "general": 300,
   "status": "connected"
  },
  {
   "id": "deep_plate",
   "forms": [
    "глубокая тарелка",
    "глубокие тарелки",
    "глубокую тарелку",
    "глубокой тарелки"
   ],
   "meaning_ru": "Форма посуды, не точный объём.",
   "action": "personal_food_portion_or_ask",
   "source_ids": [
    "BRIEF"
   ],
   "default_grams": 300,
   "unit": "тарелка",
   "general": 300,
   "status": "connected"
  },
  {
   "id": "shallow_plate",
   "forms": [
    "мелкая тарелка",
    "мелкие тарелки",
    "мелкую тарелку",
    "мелкой тарелки"
   ],
   "meaning_ru": "Мелкая здесь означает неглубокая, не обязательно маленькая.",
   "action": "personal_food_portion_or_ask",
   "source_ids": [
    "BRIEF"
   ],
   "default_grams": 300,
   "unit": "тарелка",
   "general": 300,
   "status": "connected"
  },
  {
   "id": "ladle",
   "forms": [
    "половник",
    "половника",
    "половников",
    "поварёшка",
    "поварешка",
    "черпак",
    "половником",
    "половники",
    "поварешку",
    "поварешки",
    "черпака",
    "черпаков"
   ],
   "meaning_ru": "Нужен объём конкретного половника; синонимы поварёшка/черпак пока кандидаты.",
   "action": "personal_volume_or_ask",
   "source_ids": [
    "BRIEF",
    "DESIGN"
   ],
   "default_grams": 125,
   "unit": "половник",
   "general": 125,
   "status": "connected"
  },
  {
   "id": "slice",
   "forms": [
    "ломтик",
    "ломтика",
    "ломтиков",
    "ломтичек",
    "ломтики",
    "ломтиком",
    "ломоть",
    "ломтя",
    "ломтей",
    "кружок",
    "кружочек",
    "кружочка",
    "кружочков",
    "слайс",
    "слайса",
    "слайсов"
   ],
   "meaning_ru": "Вес зависит от продукта, толщины и размера.",
   "action": "personal_or_food_specific_weight",
   "source_ids": [
    "S13",
    "S27",
    "BRIEF"
   ],
   "default_grams": 30,
   "unit": "ломтик",
   "general": 30,
   "status": "connected"
  },
  {
   "id": "piece",
   "forms": [
    "кусок",
    "куска",
    "кусков",
    "кусочек",
    "кусочка",
    "кусочков",
    "куски",
    "куском",
    "кусочки",
    "кусочком"
   ],
   "meaning_ru": "Кусок: у хлеба, сыра и колбасы — ломтик; у остального вес по продукту (food_measures) с «≈». Нет веса — спросить один раз и запомнить своей мерой.",
   "action": "personal_or_food_specific_weight",
   "source_ids": [
    "S13",
    "S16"
   ],
   "default_grams": null,
   "unit": "кусок",
   "no_general": "ask_once",
   "status": "connected"
  },
  {
   "id": "wedge",
   "forms": [
    "долька",
    "дольки",
    "долек",
    "дольку",
    "долькой"
   ],
   "meaning_ru": "Чеснок: зубчик; фрукт: часть; шоколад: сегмент плитки.",
   "action": "food_specific_equivalence_or_ask",
   "source_ids": [
    "S20",
    "BRIEF"
   ],
   "default_grams": 10,
   "unit": "долька",
   "general": 10,
   "status": "connected"
  },
  {
   "id": "ring",
   "forms": [
    "кольцо",
    "кольца",
    "колец",
    "колечко",
    "колечка",
    "колечек"
   ],
   "meaning_ru": "Лук, кальмар и ананас требуют разных весов; сок несовместим с кольцом.",
   "action": "food_specific_weight_or_ask",
   "source_ids": [
    "S20",
    "BRIEF"
   ],
   "default_grams": null,
   "unit": "кольцо",
   "no_general": "ask_once",
   "status": "connected"
  },
  {
   "id": "can",
   "forms": [
    "банка",
    "банки",
    "банок",
    "баночка",
    "банку",
    "баночку",
    "баночки",
    "баночек"
   ],
   "meaning_ru": "Размер упаковки и масса без жидкости важнее названия тары.",
   "action": "use_label_net_or_drained_weight",
   "source_ids": [
    "S10",
    "BRIEF"
   ],
   "default_grams": null,
   "unit": "банка",
   "no_general": "ask_once",
   "status": "connected"
  },
  {
   "id": "pack",
   "forms": [
    "пачка",
    "пачки",
    "пачек",
    "пачку",
    "пачечка",
    "пачечку"
   ],
   "meaning_ru": "Упаковка не имеет универсального веса.",
   "action": "use_label_weight_or_ask",
   "source_ids": [
    "S08",
    "S19",
    "BRIEF"
   ],
   "default_grams": null,
   "unit": "пачка",
   "no_general": "ask_once",
   "status": "connected"
  },
  {
   "id": "package",
   "forms": [
    "упаковка",
    "упаковки",
    "упаковок",
    "упаковку",
    "пакет",
    "пакета",
    "пакетов",
    "коробка",
    "коробку",
    "коробки"
   ],
   "meaning_ru": "Упаковка не имеет универсального веса.",
   "action": "use_label_weight_or_ask",
   "source_ids": [
    "BRIEF"
   ],
   "default_grams": null,
   "unit": "упаковка",
   "no_general": "ask_once",
   "status": "connected"
  },
  {
   "id": "bottle",
   "forms": [
    "бутылка",
    "бутылки",
    "бутылок",
    "бутылочка",
    "бутылку",
    "бутылочку",
    "бутылочки"
   ],
   "meaning_ru": "Сначала объём конкретной бутылки.",
   "action": "use_label_volume_or_ask",
   "source_ids": [
    "BRIEF"
   ],
   "default_grams": null,
   "unit": "бутылка",
   "no_general": "ask_once",
   "status": "connected"
  },
  {
   "id": "unit",
   "forms": [
    "штука",
    "штуки",
    "штук",
    "шт.",
    "шт",
    "штучка",
    "штучки",
    "одна штучка",
    "штуку",
    "штучку",
    "штучек",
    "штука́"
   ],
   "meaning_ru": "Целый предмет с весом конкретного продукта.",
   "action": "personal_or_food_specific_weight",
   "source_ids": [
    "S18",
    "BRIEF"
   ],
   "default_grams": null,
   "unit": "шт",
   "no_general": "product",
   "status": "connected"
  },
  {
   "id": "cabbage_head",
   "forms": [
    "кочан",
    "кочана",
    "кочанов",
    "качан",
    "качана",
    "вилок",
    "вилка",
    "вилков",
    "кочанчик",
    "вилочек",
    "кочаном"
   ],
   "meaning_ru": "Капуста: кочан, вилок, головка; «качан» — входное написание из примера пользователя. Вид капусты сохраняется.",
   "food_scope": "cabbage",
   "source_ids": [
    "S36",
    "BRIEF"
   ],
   "note_ru": "Не смешивать со столовой вилкой и початком кукурузы.",
   "action": "food_and_part_specific_personal_or_reference_weight_otherwise_ask",
   "default_grams": null,
   "status": "connected",
   "unit": "кочан",
   "no_general": "ask_once"
  },
  {
   "id": "corn_cob",
   "forms": [
    "початок",
    "початка",
    "початков",
    "початком"
   ],
   "meaning_ru": "Кукуруза: початок; разговорный кочан только при названной кукурузе.",
   "food_scope": "corn",
   "source_ids": [
    "S36"
   ],
   "note_ru": "Не переносить массу капусты и не считать стержень съеденными зёрнами.",
   "action": "food_and_part_specific_personal_or_reference_weight_otherwise_ask",
   "default_grams": 90,
   "status": "connected",
   "unit": "початок",
   "general": 90
  },
  {
   "id": "stem",
   "forms": [
    "стебель",
    "стебля",
    "стеблей",
    "стебелёк",
    "стебелек",
    "стебелька",
    "стебли",
    "стеблем"
   ],
   "meaning_ru": "Стебель растения; в бытовой речи может подразумеваться вместе с зеленью.",
   "food_scope": "plant_specific",
   "source_ids": [
    "S37",
    "S38",
    "S39",
    "BRIEF"
   ],
   "note_ru": "Укроп, петрушка и сельдерей требуют своих мер и съедаемых частей.",
   "action": "food_and_part_specific_personal_or_reference_weight_otherwise_ask",
   "default_grams": null,
   "status": "connected",
   "unit": "стебель",
   "no_general": "ask_once"
  },
  {
   "id": "leaf",
   "forms": [
    "лист",
    "листа",
    "листьев",
    "листик",
    "листика",
    "листиков",
    "листья",
    "листочек",
    "листочка",
    "листочков",
    "листочки",
    "листики"
   ],
   "meaning_ru": "Лист конкретного растения; не веточка и не кочан.",
   "food_scope": "plant_specific",
   "source_ids": [
    "S37",
    "S38",
    "DESIGN"
   ],
   "note_ru": "Вес листа капусты не переносится на базилик или салат.",
   "action": "food_and_part_specific_personal_or_reference_weight_otherwise_ask",
   "default_grams": 0.5,
   "status": "connected",
   "unit": "лист",
   "general": 0.5
  },
  {
   "id": "floret",
   "forms": [
    "соцветие",
    "соцветия",
    "соцветий"
   ],
   "meaning_ru": "Отдельное соцветие брокколи или цветной капусты.",
   "food_scope": "broccoli_or_cauliflower",
   "source_ids": [
    "DESIGN"
   ],
   "note_ru": "Предложение по аналогии; подтверждённого веса в этом расширении нет.",
   "action": "food_and_part_specific_personal_or_reference_weight_otherwise_ask",
   "default_grams": null,
   "status": "connected",
   "unit": "соцветие",
   "no_general": "ask_once"
  },
  {
   "id": "onion_feather",
   "forms": [
    "перо",
    "пера",
    "перьев",
    "пёрышко",
    "перышко",
    "пёрышка",
    "перышка",
    "перья",
    "перышек"
   ],
   "meaning_ru": "Перо зелёного лука; не луковица.",
   "food_scope": "green_onion",
   "source_ids": [
    "DESIGN"
   ],
   "note_ru": "Предложение по аналогии; не назначать вес целого лука.",
   "action": "food_and_part_specific_personal_or_reference_weight_otherwise_ask",
   "default_grams": 5,
   "status": "connected",
   "unit": "перо",
   "general": 5
  },
  {
   "id": "pod",
   "forms": [
    "стручок",
    "стручка",
    "стручков",
    "стручки",
    "стручком"
   ],
   "meaning_ru": "Стручок фасоли, гороха или перца; съедаемая оболочка зависит от продукта.",
   "food_scope": "plant_specific",
   "source_ids": [
    "DESIGN"
   ],
   "note_ru": "Стручковая фасоль и только горошины не одно и то же.",
   "action": "food_and_part_specific_personal_or_reference_weight_otherwise_ask",
   "default_grams": null,
   "status": "connected",
   "unit": "стручок",
   "no_general": "ask_once"
  },
  {
   "id": "wine_glass",
   "unit": "бокал",
   "general": 150,
   "forms": [
    "бокал",
    "бокала",
    "бокалов",
    "бокальчик",
    "бокалом",
    "фужер",
    "фужера",
    "фужеров"
   ],
   "meaning_ru": "Бокал: вино и игристое 150 мл, пиво 500 мл, коктейль 200 мл — см. food_measures.",
   "source_ids": [
    "C05",
    "C06",
    "ASTAMUR"
   ],
   "action": "food_specific_weight",
   "default_grams": 150,
   "status": "connected"
  },
  {
   "id": "shot_glass",
   "unit": "рюмка",
   "general": 50,
   "forms": [
    "рюмка",
    "рюмки",
    "рюмку",
    "рюмок",
    "рюмочка",
    "рюмочку",
    "стопка",
    "стопки",
    "стопку",
    "стопок",
    "стопочка",
    "стопочку",
    "стопарик"
   ],
   "meaning_ru": "Рюмка, стопка крепкого — 50 мл (в США стандартная порция 44 мл).",
   "source_ids": [
    "C05",
    "ESTIMATE"
   ],
   "action": "food_specific_weight",
   "default_grams": 50,
   "status": "connected"
  },
  {
   "id": "shot",
   "unit": "шот",
   "general": 30,
   "forms": [
    "шот",
    "шота",
    "шотов",
    "шоты"
   ],
   "meaning_ru": "Шот эспрессо — 30 мл.",
   "source_ids": [
    "LEGACY"
   ],
   "action": "food_specific_weight",
   "default_grams": 30,
   "status": "connected"
  },
  {
   "id": "cube",
   "unit": "кубик",
   "no_general": "ask_once",
   "forms": [
    "кубик",
    "кубика",
    "кубиков",
    "кубики"
   ],
   "meaning_ru": "Кубик: сахар-рафинад 5 г (оценка; у USDA мелкий американский кубик 2,3 г).",
   "source_ids": [
    "C06",
    "ESTIMATE"
   ],
   "action": "food_specific_weight",
   "default_grams": null,
   "status": "connected"
  },
  {
   "id": "bar",
   "unit": "плитка",
   "no_general": "ask_once",
   "forms": [
    "плитка",
    "плитки",
    "плитку",
    "плиток"
   ],
   "meaning_ru": "Плитка шоколада — 100 г (оценка по обычной фасовке).",
   "source_ids": [
    "ESTIMATE"
   ],
   "action": "food_specific_weight",
   "default_grams": null,
   "status": "connected"
  },
  {
   "id": "scoop",
   "unit": "мерка",
   "general": 30,
   "forms": [
    "мерка",
    "мерки",
    "мерку",
    "мерок",
    "скуп",
    "скупа",
    "скупов",
    "мерная ложка",
    "мерную ложку",
    "мерные ложки"
   ],
   "meaning_ru": "Мерка протеина — 30 г.",
   "source_ids": [
    "LEGACY"
   ],
   "action": "food_specific_weight",
   "default_grams": 30,
   "status": "connected"
  },
  {
   "id": "serving",
   "unit": "порция",
   "no_general": "ask_once",
   "forms": [
    "порция",
    "порции",
    "порцию",
    "порций",
    "порцией",
    "порцайка"
   ],
   "meaning_ru": "Порция: только своя или из каталога блюда; иначе спросить один раз и запомнить.",
   "source_ids": [
    "ASTAMUR"
   ],
   "action": "food_specific_weight",
   "default_grams": null,
   "status": "connected"
  },
  {
   "id": "small_cup",
   "unit": "стаканчик",
   "no_general": "ask_once",
   "forms": [
    "стаканчик",
    "стаканчика",
    "стаканчиков",
    "стаканчике"
   ],
   "meaning_ru": "Стаканчик — упаковка: йогурт 125 г, мороженое 70 г (оценки); иначе спросить один раз и запомнить.",
   "source_ids": [
    "ESTIMATE"
   ],
   "action": "food_specific_weight",
   "default_grams": null,
   "status": "connected"
  },
  {
   "id": "teabag",
   "unit": "чашка",
   "forms": [
    "пакетик",
    "пакетика",
    "пакетиков"
   ],
   "only_for": "^(ча[йяюе]|кофе|какао)",
   "meaning_ru": "Пакетик чая — одна чашка.",
   "source_ids": [
    "ESTIMATE"
   ],
   "action": "food_specific_weight",
   "default_grams": null,
   "status": "connected"
  }
 ],
 "diminutives_and_food_aliases": [
  {
   "id": "alias_bread",
   "forms": [
    "хлебушек",
    "хлебушка",
    "хлебушку"
   ],
   "meaning_ru": "Хлеб; вес не уменьшается.",
   "action": "alias_food",
   "source_ids": [
    "S13",
    "S14"
   ],
   "canonical": "хлеб",
   "weight_multiplier": 1,
   "search_as": "хлеб",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_potato",
   "forms": [
    "картошка",
    "картошки",
    "картошку",
    "картошечка",
    "картошечки",
    "картошечку",
    "картошек",
    "картоха",
    "картохи",
    "картоху"
   ],
   "meaning_ru": "Картофель; учитывать способ приготовления.",
   "action": "alias_food",
   "source_ids": [
    "BRIEF",
    "S43"
   ],
   "canonical": "картофель",
   "weight_multiplier": 1,
   "protected_longer_phrases": [
    "пирожное картошка"
   ],
   "scope": "картофель, за пределами самостоятельных названий блюд",
   "search_as": "картофель",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_cucumber",
   "forms": [
    "огурчик",
    "огурчика",
    "огурчики",
    "огурчиков",
    "огурчик",
    "огурчиком"
   ],
   "meaning_ru": "Огурец; уменьшительность не задаёт размер.",
   "action": "alias_food",
   "source_ids": [
    "BRIEF"
   ],
   "canonical": "огурец",
   "weight_multiplier": 1,
   "search_as": "огурец",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_soup",
   "forms": [
    "супчик",
    "супчика",
    "супчику"
   ],
   "meaning_ru": "Суп; рецепт всё ещё может быть неизвестен.",
   "action": "alias_food",
   "source_ids": [
    "S15",
    "BRIEF"
   ],
   "canonical": "суп",
   "weight_multiplier": 1,
   "search_as": "суп",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_garlic",
   "forms": [
    "чесночок",
    "чесночка",
    "чесночку"
   ],
   "meaning_ru": "Чеснок.",
   "action": "alias_food",
   "source_ids": [
    "S03"
   ],
   "canonical": "чеснок",
   "weight_multiplier": 1,
   "search_as": "чеснок",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_mince",
   "forms": [
    "фаршик",
    "фаршика",
    "фаршику"
   ],
   "meaning_ru": "Фарш; вид мяса отдельно.",
   "action": "alias_food",
   "source_ids": [
    "S03"
   ],
   "canonical": "фарш",
   "weight_multiplier": 1,
   "search_as": "фарш",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_sausage_ambiguous",
   "forms": [
    "колбаски"
   ],
   "meaning_ru": "Во множественном числе — отдельные колбаски; в единственном («колбаска») — колбаса.",
   "action": "clarify_food_or_offer_close_with_state",
   "source_ids": [
    "BRIEF"
   ],
   "canonical": null
  },
  {
   "id": "alias_oil_ambiguous",
   "forms": [
    "маслице",
    "маслица",
    "масличко"
   ],
   "meaning_ru": "Вид масла не следует из уменьшительности.",
   "action": "clarify_oil_kind",
   "source_ids": [
    "BRIEF"
   ],
   "canonical": null,
   "superseded_by": "alias_butter"
  },
  {
   "id": "protected_food_names",
   "forms": [
    "сырок",
    "сырки",
    "сливки",
    "маслёнок",
    "масленок",
    "творожок",
    "блинчики",
    "пирожок",
    "булочка",
    "батончик",
    "шоколадка",
    "палочки",
    "трубочка",
    "сосиска",
    "селедка",
    "маточное молочко",
    "сгущенное молоко"
   ],
   "meaning_ru": "Самостоятельные названия, не обрезать до сыр/слива/масло.",
   "action": "protect_food_identity",
   "source_ids": [
    "DESIGN"
   ]
  },
  {
   "id": "alias_chicken",
   "forms": [
    "курятина",
    "курятины",
    "курятину",
    "курица",
    "курицы",
    "курицу",
    "курочка",
    "курочки",
    "курочку",
    "куриное мясо"
   ],
   "canonical": "мясо курицы",
   "canonical_food_key": "chicken_meat",
   "source_ids": [
    "S29"
   ],
   "meaning_ru": "Часть, кожа, кости, приготовление и возраст отдельно.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "мясо курицы",
   "bot": "alias"
  },
  {
   "id": "alias_turkey",
   "forms": [
    "индюшатина",
    "индюшатины",
    "индюшатину",
    "индейка",
    "индейки",
    "индейку",
    "индюшка",
    "индюшки",
    "индюшку",
    "мясо индейки",
    "мясо индюшки",
    "индюшиное мясо",
    "индюшачье мясо",
    "индюшиного мяса"
   ],
   "canonical": "мясо индейки",
   "canonical_food_key": "turkey_meat",
   "source_ids": [
    "S30",
    "S44",
    "BRIEF"
   ],
   "meaning_ru": "Название птицы и мяса объединяются в пищевом контексте; филе и часть не теряются.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "мясо индейки",
   "bot": "alias"
  },
  {
   "id": "alias_beef",
   "forms": [
    "говядина",
    "говядины",
    "говядину",
    "говяжье мясо",
    "мясо говядины"
   ],
   "canonical": "говядина",
   "canonical_food_key": "beef_meat",
   "source_ids": [
    "S44",
    "BRIEF"
   ],
   "meaning_ru": "Не объединять с телятиной, печенью, жиром, бульоном или смешанным фаршем.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "говядина",
   "bot": "alias"
  },
  {
   "id": "alias_pork",
   "forms": [
    "свинина",
    "свинины",
    "свинину",
    "свиное мясо"
   ],
   "canonical": "свинина",
   "canonical_food_key": "pork_meat",
   "source_ids": [
    "S44"
   ],
   "meaning_ru": "Сало и бекон не заменяются общим мясом.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "свинина",
   "bot": "alias"
  },
  {
   "id": "alias_lamb",
   "forms": [
    "баранина",
    "баранины",
    "баранину",
    "баранье мясо",
    "мясо барана"
   ],
   "canonical": "баранина",
   "canonical_food_key": "sheep_meat",
   "source_ids": [
    "S44"
   ],
   "meaning_ru": "Сохранять указание на ягнёнка; возраст и часть не додумывать.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "баранина",
   "bot": "alias"
  },
  {
   "id": "alias_veal",
   "forms": [
    "телятина",
    "телятины",
    "телятину",
    "мясо телёнка",
    "мясо теленка"
   ],
   "canonical": "телятина",
   "canonical_food_key": "veal_meat",
   "source_ids": [
    "S44"
   ],
   "meaning_ru": "Возрастное название сохраняется; не подменять обычной говядиной.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "телятина",
   "bot": "alias"
  },
  {
   "id": "alias_duck",
   "forms": [
    "утятина",
    "утятины",
    "утятину",
    "утка",
    "утки",
    "утку",
    "утиное мясо",
    "мясо утки"
   ],
   "canonical": "мясо утки",
   "canonical_food_key": "duck_meat",
   "source_ids": [
    "S44"
   ],
   "meaning_ru": "Состояние, кожа, кости и часть отдельно.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "мясо утки",
   "bot": "alias"
  },
  {
   "id": "alias_goose",
   "forms": [
    "гусятина",
    "гусятины",
    "гусятину",
    "гусь",
    "гуся",
    "гусиное мясо",
    "мясо гуся"
   ],
   "canonical": "мясо гуся",
   "canonical_food_key": "goose_meat",
   "source_ids": [
    "S44"
   ],
   "meaning_ru": "Не переносить массу целой птицы на названное количество мяса.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "мясо гуся",
   "bot": "alias"
  },
  {
   "id": "alias_venison",
   "forms": [
    "оленина",
    "оленины",
    "оленину",
    "мясо оленя"
   ],
   "canonical": "оленина",
   "canonical_food_key": "venison",
   "source_ids": [
    "S44"
   ],
   "meaning_ru": "Часть и приготовление отдельно.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "оленина",
   "bot": "alias"
  },
  {
   "id": "alias_salmon_flesh",
   "forms": [
    "лососина",
    "лососины",
    "лососину",
    "мясо лосося",
    "лосось",
    "лосося"
   ],
   "canonical": "мясо лосося",
   "canonical_food_key": "salmon_unspecified",
   "source_ids": [
    "S44"
   ],
   "meaning_ru": "Вид рыбы не уточнён; не выбирать сёмгу или горбушу только по этому слову.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "лосось",
   "bot": "alias"
  },
  {
   "id": "alias_tomato",
   "forms": [
    "томат",
    "томаты",
    "томата",
    "томатов",
    "помидор",
    "помидоры",
    "помидора",
    "помидоров",
    "помидорчик",
    "помидорчика",
    "помидорка",
    "помидорку",
    "помидорки",
    "помидорок",
    "помидорчики"
   ],
   "canonical": "помидор",
   "canonical_food_key": "tomato_fruit",
   "source_ids": [
    "S32"
   ],
   "meaning_ru": "Плод; сок, паста, соус, вяленые и маринованные варианты сохраняют свои признаки.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "protected_longer_phrases": [
    "томатная паста",
    "томатный сок",
    "томатный соус"
   ],
   "search_as": "помидор",
   "bot": "alias"
  },
  {
   "id": "alias_carrot",
   "forms": [
    "морковка",
    "морковки",
    "морковку",
    "морковок",
    "морковь",
    "моркови",
    "морковочка",
    "морковочку"
   ],
   "canonical": "морковь",
   "canonical_food_key": "carrot_root",
   "source_ids": [
    "S33"
   ],
   "meaning_ru": "Название продукта или корнеплода; морковка не обязана быть маленькой.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "морковь",
   "bot": "alias"
  },
  {
   "id": "alias_beet",
   "forms": [
    "бурак",
    "бурака",
    "бураки",
    "бураков",
    "свёкла",
    "свекла",
    "свёклы",
    "свеклы",
    "свёклу",
    "свеклу"
   ],
   "canonical": "свёкла",
   "canonical_food_key": "beet_root",
   "source_ids": [
    "S34"
   ],
   "meaning_ru": "Разговорное пищевое значение; корнеплод не равен ботве.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "свекла",
   "bot": "alias"
  },
  {
   "id": "alias_eggplant",
   "forms": [
    "синенькие",
    "синеньких",
    "баклажан",
    "баклажана",
    "баклажаны",
    "баклажанов"
   ],
   "canonical": "баклажан",
   "canonical_food_key": "eggplant",
   "source_ids": [
    "S35"
   ],
   "meaning_ru": "Синенькие — самостоятельное название баклажанов; прилагательное при другом продукте не заменять.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "баклажан",
   "bot": "alias"
  },
  {
   "id": "alias_dill_greens",
   "forms": [
    "зелень укропа",
    "укропная зелень",
    "листочки укропа",
    "листья укропа"
   ],
   "canonical": "зелень укропа",
   "canonical_food_key": "dill_foliage",
   "source_ids": [
    "S37",
    "S38",
    "S39"
   ],
   "meaning_ru": "Листовая часть; семена, зонтики и отдельные стебли не объединяются с ней.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "укроп",
   "bot": "alias"
  },
  {
   "id": "alias_cilantro_greens",
   "forms": [
    "зелень кинзы",
    "зелень кориандра",
    "листья кориандра",
    "листья кинзы",
    "кинза",
    "кинзы",
    "кинзу",
    "кинза свежая",
    "свежая кинза",
    "кинзы свежей",
    "свежей кинзы",
    "кинзу свежую",
    "зелень кориандра свежая",
    "кинзой"
   ],
   "canonical": "кинза зелень",
   "canonical_food_key": "coriander_foliage",
   "source_ids": [
    "S40",
    "DESIGN"
   ],
   "meaning_ru": "Рабочее кулинарное сопоставление зелени; кориандр без признаков оставляет выбор зелень/семена.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "botanical_distinction_supported_ru_mapping_proposed",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "exclude_longer_phrases": [
    "семена кинзы",
    "семена кориандра"
   ],
   "search_as": "листья кориандра",
   "bot": "alias"
  },
  {
   "id": "alias_oatmeal_ambiguous",
   "forms": [
    "овсянка",
    "овсянки",
    "овсянку"
   ],
   "canonical": "овсянка",
   "canonical_food_key": null,
   "source_ids": [
    "S41"
   ],
   "meaning_ru": "Крупа или готовая каша; количество 60 г само по себе не доказывает сухое состояние.",
   "action": "resolve_state_or_ask",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "not_connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "candidate_food_keys": [
    "oat_grain_or_flakes",
    "oat_porridge"
   ],
   "short_question_ru": "Это сухая овсянка или готовая каша?"
  },
  {
   "id": "alias_coriander_seed_ground",
   "forms": [
    "кориандр молотый",
    "молотый кориандр",
    "семена кориандра молотые"
   ],
   "canonical": "кориандр семена молотые",
   "canonical_food_key": "coriander_seed_ground",
   "meaning_ru": "Кулинарное название пряности; не зелень.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "source_ids": [
    "S40",
    "DESIGN"
   ],
   "evidence_status": "botanical_distinction_supported_ru_mapping_proposed",
   "implementation_status": "connected",
   "scope": "кулинарный контекст пряности",
   "search_as": "кориандр семена",
   "bot": "alias"
  },
  {
   "id": "alias_coriander_ambiguous",
   "forms": [
    "кориандр",
    "кориандра"
   ],
   "canonical": null,
   "canonical_food_key": null,
   "candidate_food_keys": [
    "coriander_foliage",
    "coriander_seed"
   ],
   "meaning_ru": "Без названия части и контекста не выбирать между зеленью и семенами.",
   "action": "resolve_part_or_ask",
   "short_question_ru": "Это зелень или семена кориандра?",
   "source_ids": [
    "S40",
    "DESIGN"
   ],
   "evidence_status": "botanical_distinction_supported_ru_mapping_proposed",
   "implementation_status": "not_connected",
   "scope": "самостоятельное название; длинная фраза зелень/семена/молотый имеет приоритет"
  },
  {
   "id": "alias_udon",
   "bot": "alias",
   "forms": [
    "удон",
    "удона",
    "удону",
    "удоном",
    "удоне"
   ],
   "search_as": "лапша удон варёная",
   "meaning_ru": "Японская лапша: в базе MEXT названия начинаются со слова «Лапша».",
   "source_ids": [
    "J02"
   ]
  },
  {
   "id": "alias_soba",
   "bot": "alias",
   "forms": [
    "соба",
    "собы",
    "собу",
    "собой",
    "лапша соба"
   ],
   "search_as": "лапша соба варёная",
   "meaning_ru": "Японская лапша: в базе MEXT названия начинаются со слова «Лапша».",
   "source_ids": [
    "J02"
   ]
  },
  {
   "id": "alias_somen",
   "bot": "alias",
   "forms": [
    "сомэн",
    "сомэна",
    "сомен",
    "сомена"
   ],
   "search_as": "лапша сомэн",
   "meaning_ru": "Японская лапша: в базе MEXT названия начинаются со слова «Лапша».",
   "source_ids": [
    "J02"
   ]
  },
  {
   "id": "alias_bliny",
   "bot": "alias",
   "forms": [
    "блин",
    "блина",
    "блинов",
    "блинчик",
    "блинчика",
    "блинчики",
    "блинчиков"
   ],
   "search_as": "блины",
   "meaning_ru": "Один блин — те же блины.",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "id": "alias_cream_sauce",
   "bot": "alias",
   "forms": [
    "сливочный соус",
    "сливочного соуса",
    "сливочном соусе",
    "сливочным соусом",
    "соус сливочный"
   ],
   "search_as": "соус белый основа со сливками",
   "meaning_ru": "Простой сливочный соус в основной базе — «Соус белый (основа) со сливками».",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "id": "alias_herring",
   "bot": "alias",
   "forms": [
    "селедка",
    "селедки",
    "селедку",
    "селедкой",
    "селедочка",
    "селедочку",
    "селедочки"
   ],
   "search_as": "сельдь",
   "meaning_ru": "Селёдка — сельдь.",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "id": "alias_syrniki",
   "bot": "alias",
   "forms": [
    "сырник",
    "сырника",
    "сырники",
    "сырников",
    "сырниками"
   ],
   "search_as": "оладьи творожные",
   "meaning_ru": "Сырники в основной базе называются «Оладьи творожные, жареные».",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "id": "alias_egg",
   "forms": [
    "яичко",
    "яичка",
    "яички",
    "яичек",
    "яйки"
   ],
   "canonical": "яйцо",
   "search_as": "яйцо",
   "bot": "alias",
   "meaning_ru": "Яйцо; вес не уменьшается.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_sourcream",
   "forms": [
    "сметанка",
    "сметанки",
    "сметанку",
    "сметанкой"
   ],
   "canonical": "сметана",
   "search_as": "сметана",
   "bot": "alias",
   "meaning_ru": "Сметана.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_tea",
   "forms": [
    "чаек",
    "чайку",
    "чайка",
    "чайком"
   ],
   "canonical": "чай",
   "search_as": "чай",
   "bot": "alias",
   "meaning_ru": "Чай.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_coffee",
   "forms": [
    "кофеек",
    "кофейку",
    "кофейка",
    "кофейком"
   ],
   "canonical": "кофе",
   "search_as": "кофе",
   "bot": "alias",
   "meaning_ru": "Кофе.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_milk",
   "forms": [
    "молочко",
    "молочка",
    "молочком"
   ],
   "canonical": "молоко",
   "search_as": "молоко",
   "bot": "alias",
   "meaning_ru": "Молоко; «маточное молочко» — отдельный продукт.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_apple",
   "forms": [
    "яблочко",
    "яблочка",
    "яблочки",
    "яблочек"
   ],
   "canonical": "яблоко",
   "search_as": "яблоко",
   "bot": "alias",
   "meaning_ru": "Яблоко.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_banana",
   "forms": [
    "бананчик",
    "бананчика",
    "бананчики",
    "бананчиков"
   ],
   "canonical": "банан",
   "search_as": "банан",
   "bot": "alias",
   "meaning_ru": "Банан.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_butter",
   "forms": [
    "маслице",
    "маслица",
    "масличко",
    "маслицем"
   ],
   "canonical": "масло",
   "search_as": "масло",
   "bot": "alias",
   "meaning_ru": "Масло; вид масла отдельно.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_meat",
   "forms": [
    "мяско",
    "мяска",
    "мясца",
    "мясцо"
   ],
   "canonical": "мясо",
   "search_as": "мясо",
   "bot": "alias",
   "meaning_ru": "Мясо.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_water",
   "forms": [
    "водичка",
    "водички",
    "водичку",
    "водичкой"
   ],
   "canonical": "вода",
   "search_as": "вода",
   "bot": "alias",
   "meaning_ru": "Вода.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_salad",
   "forms": [
    "салатик",
    "салатика",
    "салатику",
    "салатиком"
   ],
   "canonical": "салат",
   "search_as": "салат",
   "bot": "alias",
   "meaning_ru": "Салат.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_porridge",
   "forms": [
    "кашка",
    "кашки",
    "кашку",
    "кашкой"
   ],
   "canonical": "каша",
   "search_as": "каша",
   "bot": "alias",
   "meaning_ru": "Каша.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_onion",
   "forms": [
    "лучок",
    "лучка",
    "лучку",
    "лучком"
   ],
   "canonical": "лук",
   "search_as": "лук",
   "bot": "alias",
   "meaning_ru": "Лук.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_onion_bulb",
   "forms": [
    "луковица",
    "луковицу",
    "луковицы",
    "луковиц",
    "луковка",
    "луковку",
    "головка лука",
    "головки лука",
    "головку лука",
    "головок лука",
    "головка репчатого лука",
    "головки репчатого лука",
    "головку репчатого лука"
   ],
   "canonical": "шт лук репчатый",
   "search_as": "шт лук репчатый",
   "bot": "alias",
   "meaning_ru": "Луковица и «головка лука» — штука репчатого лука, а не головка чеснока.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "S03",
    "S09",
    "S20"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_potato_piece",
   "forms": [
    "картофелина",
    "картофелину",
    "картофелины",
    "картофелин",
    "картошина",
    "картошину"
   ],
   "canonical": "шт картофель",
   "search_as": "шт картофель",
   "bot": "alias",
   "meaning_ru": "Картофелина — штука картофеля.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_dill",
   "forms": [
    "укропчик",
    "укропчика",
    "укропчиком"
   ],
   "canonical": "укроп",
   "search_as": "укроп",
   "bot": "alias",
   "meaning_ru": "Укроп.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_sugar",
   "forms": [
    "сахарок",
    "сахарку",
    "сахарка",
    "сахарком",
    "сахара",
    "сахару",
    "сахаром"
   ],
   "canonical": "сахар",
   "search_as": "сахар",
   "bot": "alias",
   "meaning_ru": "Сахар: по слову в начальной форме база находит обычный белый сахар, а не ванильный.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "LEGACY"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_kefir",
   "forms": [
    "кефирчик",
    "кефирчика",
    "кефирчику"
   ],
   "canonical": "кефир",
   "search_as": "кефир",
   "bot": "alias",
   "meaning_ru": "Кефир.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_yogurt",
   "forms": [
    "йогуртик",
    "йогуртика",
    "йогуртом"
   ],
   "canonical": "йогурт",
   "search_as": "йогурт",
   "bot": "alias",
   "meaning_ru": "Йогурт.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_cake",
   "forms": [
    "тортик",
    "тортика",
    "тортику"
   ],
   "canonical": "торт",
   "search_as": "торт",
   "bot": "alias",
   "meaning_ru": "Торт.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_pelmeni",
   "forms": [
    "пельмешки",
    "пельмешек",
    "пельмешков",
    "пельмешка"
   ],
   "canonical": "пельмени",
   "search_as": "пельмени",
   "bot": "alias",
   "meaning_ru": "Пельмени.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_pasta",
   "forms": [
    "макарошки",
    "макарошек",
    "макароны",
    "макарон"
   ],
   "canonical": "макароны",
   "search_as": "макароны",
   "bot": "alias",
   "meaning_ru": "Макароны.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_cutlet",
   "forms": [
    "котлетка",
    "котлетку",
    "котлетки",
    "котлеток"
   ],
   "canonical": "котлета",
   "search_as": "котлета",
   "bot": "alias",
   "meaning_ru": "Котлета.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_sausage",
   "forms": [
    "колбаска",
    "колбаску",
    "колбаской"
   ],
   "canonical": "колбаса",
   "search_as": "колбаса",
   "bot": "alias",
   "meaning_ru": "В единственном числе — колбаса; «колбаски» во множественном остаются отдельным продуктом.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_salt_verb",
   "forms": [
    "посолил",
    "посолила",
    "подсолил",
    "подсолила",
    "солил",
    "солила"
   ],
   "canonical": "соль",
   "search_as": "соль",
   "bot": "alias",
   "meaning_ru": "Действие названо вместо продукта: это соль.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_beef_adj",
   "forms": [
    "говяжье мясо",
    "говяжьего мяса",
    "мясо говядины"
   ],
   "canonical": "говядина",
   "search_as": "говядина",
   "bot": "alias",
   "meaning_ru": "Говядина.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "S44"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_pork_adj",
   "forms": [
    "свиное мясо",
    "свиного мяса"
   ],
   "canonical": "свинина",
   "search_as": "свинина",
   "bot": "alias",
   "meaning_ru": "Свинина.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "S44"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_turkey_fillet",
   "forms": [
    "индюшиное филе",
    "индюшиного филе",
    "индюшачье филе",
    "филе индюшки",
    "филе индейки"
   ],
   "canonical": "мясо индейки",
   "search_as": "мясо индейки",
   "bot": "alias",
   "meaning_ru": "Филе индейки без названной части — мясо индейки; грудкой не объявляется.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "S30",
    "S42"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_fillet_breast",
   "forms": [
    "филе грудки"
   ],
   "canonical": "грудка",
   "search_as": "грудка",
   "bot": "alias",
   "meaning_ru": "Филе грудки — грудка; вид птицы сохраняется.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "S42"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_fillet_thigh",
   "forms": [
    "филе бедра"
   ],
   "canonical": "бедро",
   "search_as": "бедро",
   "bot": "alias",
   "meaning_ru": "Филе бедра — бедро, не грудка.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "S42"
   ],
   "implementation_status": "connected"
  }
 ],
 "numbers": {
  "cardinals": {
   "ноль": 0,
   "нуль": 0,
   "один": 1,
   "одна": 1,
   "одно": 1,
   "одну": 1,
   "два": 2,
   "две": 2,
   "три": 3,
   "четыре": 4,
   "пять": 5,
   "шесть": 6,
   "семь": 7,
   "восемь": 8,
   "девять": 9,
   "десять": 10,
   "одиннадцать": 11,
   "двенадцать": 12,
   "тринадцать": 13,
   "четырнадцать": 14,
   "пятнадцать": 15,
   "шестнадцать": 16,
   "семнадцать": 17,
   "восемнадцать": 18,
   "девятнадцать": 19,
   "двадцать": 20,
   "тридцать": 30,
   "сорок": 40,
   "пятьдесят": 50,
   "шестьдесят": 60,
   "семьдесят": 70,
   "восемьдесят": 80,
   "девяносто": 90,
   "сто": 100,
   "двести": 200,
   "триста": 300,
   "четыреста": 400,
   "пятьсот": 500,
   "шестьсот": 600,
   "семьсот": 700,
   "восемьсот": 800,
   "девятьсот": 900,
   "шестьюдесятью": 60,
   "полтораста": 150,
   "пару": 2,
   "пара": 2,
   "парочка": 2,
   "парочку": 2,
   "десяток": 10,
   "полдесятка": 5,
   "дюжина": 12,
   "дюжину": 12,
   "полдюжины": 6,
   "двух": 2,
   "трех": 3,
   "четырех": 4,
   "пяти": 5,
   "двумя": 2,
   "тремя": 3,
   "четырьмя": 4,
   "пятью": 5,
   "одного": 1,
   "одной": 1
  },
  "scales": {
   "тысяча": 1000,
   "тысячи": 1000,
   "тысяч": 1000
  },
  "fractions": {
   "полтора": 1.5,
   "полторы": 1.5,
   "половина": 0.5,
   "половинку": 0.5,
   "половинка": 0.5,
   "четверть": 0.25,
   "пол": 0.5,
   "треть": 0.3333333333333333,
   "половины": 0.5,
   "половинки": 0.5,
   "четвертинка": 0.25,
   "четвертинку": 0.25
  },
  "fused_fraction_examples": [
   "полголовки",
   "полпучка",
   "полбанки",
   "полпачки",
   "полбутылки",
   "пол-литра",
   "поллитра",
   "пол литра",
   "полкочана",
   "полкачана",
   "полвилка",
   "полветочки"
  ],
  "non_number_prefix_exceptions": [
   "полба",
   "полдник",
   "полынь"
  ],
  "colloquial_candidates": {
   "стописят": 150
  },
  "unit_aliases": {
   "г": [
    "г",
    "гр",
    "г.",
    "гр.",
    "грамм",
    "грамма",
    "граммов"
   ],
   "кг": [
    "кг",
    "килограмм",
    "килограмма",
    "килограммов"
   ],
   "мл": [
    "мл",
    "миллилитр",
    "миллилитра",
    "миллилитров"
   ],
   "л": [
    "л",
    "литр",
    "литра",
    "литров"
   ]
  },
  "compose": "Складывать и умножать числовые части по смыслу. Не склеивать строками. Исправление заменяет число вместе с единицей.",
  "source_ids": [
   "S07",
   "S10",
   "S14",
   "BRIEF"
  ],
  "pair": "пара = 2 только для счётных предметов; парочка может быть приблизительной, пара ложек требует типа ложки",
  "decimal": "Понимать 1,5; 1.5; полтора. Тире между двумя числами может быть диапазоном.",
  "protect": [
   "жирность 5%",
   "время 10:30",
   "дата",
   "на четверых",
   "на 100 г на этикетке"
  ],
  "fraction_phrases": {
   "три четверти": 0.75,
   "две трети": 0.67,
   "с половиной": "+0.5",
   "с четвертью": "+0.25"
  },
  "half_prefix_exact": [
   "полба",
   "полбы",
   "полбу",
   "полбой",
   "полбе",
   "полдник",
   "полдника",
   "полынь",
   "половник",
   "половника",
   "половников",
   "половником",
   "полдень",
   "полночь",
   "полчаса",
   "полкило",
   "полно",
   "полтора",
   "полторы",
   "полтораста"
  ],
  "half_prefix_stems": [
   "полент",
   "половин",
   "полн",
   "полезн",
   "полив",
   "полос",
   "полу",
   "поль",
   "полож",
   "полил",
   "поля",
   "поле",
   "полт",
   "поли",
   "полюс",
   "полендв",
   "полов"
  ],
  "bot": "numbers"
 },
 "sizes": {
  "small": [
   "маленький",
   "маленькая",
   "маленькое",
   "небольшой",
   "небольшая"
  ],
  "medium": [
   "средний",
   "средняя",
   "среднее"
  ],
  "large": [
   "большой",
   "большая",
   "большое",
   "крупный",
   "крупная"
  ],
  "contextual": [
   "мелкий",
   "мелкая",
   "тонкий",
   "тонкая",
   "толстый",
   "толстая"
  ],
  "global_multipliers": null,
  "source_ids": [
   "S03",
   "S11",
   "S20",
   "BRIEF"
  ],
  "say_as": {
   "маленький": [
    "мелкий",
    "мелкая",
    "мелкое",
    "мелкую",
    "мелкого",
    "некрупный",
    "некрупная",
    "некрупное",
    "крошечный",
    "крошечная",
    "крохотный",
    "крохотная"
   ],
   "большой": [
    "огромный",
    "огромная",
    "огромное",
    "огромную",
    "огромного",
    "здоровый",
    "здоровая",
    "здоровое",
    "здоровенный",
    "здоровенная",
    "гигантский",
    "гигантская"
   ]
  },
  "bot": "say_as"
 },
 "volume_references": [
  {
   "id": "faceted_rim",
   "measure": "faceted_glass",
   "condition": "классический стакан, до ободка/каёмки",
   "ml": 200,
   "source_ids": [
    "S23"
   ]
  },
  {
   "id": "faceted_full",
   "measure": "faceted_glass",
   "condition": "классический стакан, до краёв",
   "ml": 250,
   "source_ids": [
    "S23"
   ]
  },
  {
   "id": "us_teaspoon",
   "measure": "US_teaspoon",
   "ml": 4.93,
   "source_ids": [
    "S22"
   ],
   "use": "reference_not_every_home_spoon"
  },
  {
   "id": "us_tablespoon",
   "measure": "US_tablespoon",
   "ml": 14.79,
   "source_ids": [
    "S22"
   ],
   "use": "reference_not_every_home_spoon"
  },
  {
   "id": "us_cup",
   "measure": "US_cup",
   "ml": 236,
   "source_ids": [
    "S22"
   ],
   "use": "rounded_reference_not_every_home_cup"
  }
 ],
 "food_weights": [
  {
   "id": "onion_small",
   "food_key": "onion_raw_edible",
   "measure": "head",
   "grams": 70,
   "estimated_for_user": true,
   "source_ids": [
    "S20"
   ],
   "fdc_id": 170000,
   "portion_row_id": "85862",
   "size": "small",
   "state": "сырой, съедобная часть",
   "use": "reference_default_with_visible_estimate"
  },
  {
   "id": "onion_medium",
   "food_key": "onion_raw_edible",
   "measure": "head",
   "grams": 110,
   "estimated_for_user": true,
   "source_ids": [
    "S20"
   ],
   "fdc_id": 170000,
   "portion_row_id": "85860",
   "size": "medium",
   "state": "сырой, съедобная часть",
   "use": "reference_default_with_visible_estimate"
  },
  {
   "id": "onion_large",
   "food_key": "onion_raw_edible",
   "measure": "head",
   "grams": 150,
   "estimated_for_user": true,
   "source_ids": [
    "S20"
   ],
   "fdc_id": 170000,
   "portion_row_id": "85858",
   "size": "large",
   "state": "сырой, съедобная часть",
   "use": "reference_default_with_visible_estimate"
  },
  {
   "id": "onion_rings",
   "food_key": "onion_raw_edible",
   "measure": "ring",
   "grams": 6,
   "estimated_for_user": true,
   "source_ids": [
    "S20"
   ],
   "fdc_id": 170000,
   "portion_row_id": "85864",
   "derivation": "60 г / 10 колец",
   "use": "offer_only_thickness_unknown"
  },
  {
   "id": "garlic_clove",
   "food_key": "garlic_raw_edible",
   "measure": "clove",
   "grams": 3,
   "estimated_for_user": true,
   "source_ids": [
    "S20"
   ],
   "fdc_id": 169230,
   "portion_row_id": "84480",
   "use": "reference_default_with_visible_estimate"
  },
  {
   "id": "garlic_wedge",
   "food_key": "garlic_raw_edible",
   "measure": "wedge",
   "grams": 3,
   "estimated_for_user": true,
   "source_ids": [
    "S20"
   ],
   "fdc_id": 169230,
   "portion_row_id": "84480",
   "derivation": "Долька чеснока трактуется как зубчик",
   "use": "reference_default_with_visible_estimate"
  },
  {
   "id": "olive_tablespoon",
   "food_key": "olive_oil",
   "measure": "tablespoon",
   "grams": 13.5,
   "estimated_for_user": true,
   "source_ids": [
    "S20"
   ],
   "fdc_id": 171413,
   "portion_row_id": "88667",
   "fill": "level",
   "use": "reference_default_with_visible_estimate"
  },
  {
   "id": "olive_teaspoon",
   "food_key": "olive_oil",
   "measure": "teaspoon",
   "grams": 4.5,
   "estimated_for_user": true,
   "source_ids": [
    "S20"
   ],
   "fdc_id": 171413,
   "portion_row_id": "88669",
   "fill": "level",
   "use": "reference_default_with_visible_estimate"
  },
  {
   "id": "olive_dessertspoon",
   "food_key": "olive_oil",
   "measure": "dessertspoon",
   "grams": 9,
   "estimated_for_user": true,
   "source_ids": [
    "S20",
    "DESIGN"
   ],
   "fdc_id": 171413,
   "derivation": "2 × 4,5 г; предложенное соглашение о размере десертной ложки",
   "use": "offer_only_until_agreed"
  },
  {
   "id": "sugar_teaspoon",
   "food_key": "granulated_sugar",
   "measure": "teaspoon",
   "grams": 4.2,
   "estimated_for_user": true,
   "source_ids": [
    "S20"
   ],
   "fdc_id": 169655,
   "portion_row_id": "85287",
   "fill": "level",
   "use": "reference_default_with_visible_estimate"
  },
  {
   "id": "salt_teaspoon",
   "food_key": "fine_table_salt",
   "measure": "teaspoon",
   "grams": 6,
   "estimated_for_user": true,
   "source_ids": [
    "S20"
   ],
   "fdc_id": 173468,
   "portion_row_id": "92594",
   "fill": "level",
   "use": "reference_default_with_visible_estimate"
  },
  {
   "id": "salt_tablespoon",
   "food_key": "fine_table_salt",
   "measure": "tablespoon",
   "grams": 18,
   "estimated_for_user": true,
   "source_ids": [
    "S20"
   ],
   "fdc_id": 173468,
   "portion_row_id": "92595",
   "fill": "level",
   "use": "reference_default_with_visible_estimate"
  },
  {
   "id": "salt_pinch_candidate",
   "food_key": "fine_table_salt",
   "measure": "pinch",
   "grams": 0.5,
   "estimated_for_user": true,
   "source_ids": [
    "LEGACY",
    "DESIGN"
   ],
   "derivation": "Существующее предложение бота; не измеренная универсальная щепотка",
   "use": "offer_only_not_auto"
  },
  {
   "id": "salt_recipe_pinch",
   "food_key": "fine_table_salt",
   "measure": "pinch",
   "grams": 0.375,
   "estimated_for_user": true,
   "source_ids": [
    "S20",
    "S24"
   ],
   "derivation": "6 г × 1/16 чайной ложки по соглашению конкретного рецепта",
   "use": "only_when_recipe_defines_pinch"
  },
  {
   "id": "honey_tablespoon",
   "food_key": "honey",
   "measure": "tablespoon",
   "grams": 21,
   "estimated_for_user": true,
   "source_ids": [
    "S21"
   ],
   "fill": "level",
   "use": "reference_default_with_visible_estimate"
  },
  {
   "id": "walnut_handful_candidate",
   "food_key": "walnut_kernels",
   "measure": "handful",
   "grams": 30,
   "estimated_for_user": true,
   "source_ids": [
    "DESIGN"
   ],
   "derivation": "Удобный вариант кнопки для оценки, не измерение горсти и не универсальная норма",
   "use": "offer_only_not_auto"
  }
 ],
 "food_binding_contract": {
  "meaning": "food_key — смысловой ключ, не поиск по подстроке; привязка к проверенным продуктам приложения потребуется при подключении",
  "direct_fdc_ids": "Использовать указанные номера USDA для этой же еды и состояния. Для BLS/другой базы сначала подтвердить эквивалентность.",
  "must_preserve": [
   "raw_or_cooked",
   "edible_basis",
   "drained_or_total",
   "whole_or_chopped",
   "oil_kind",
   "salt_grind",
   "species",
   "cut_or_plant_part",
   "skin_and_bone",
   "stem_and_leaves",
   "before_or_after_removal",
   "age_class_if_explicit"
  ]
 },
 "quantity_priority": [
  "explicit_mass_or_volume",
  "named_container_volume",
  "explicit_fraction_of_known_package",
  "personal_food_specific_measure",
  "product_measure",
  "food_group_measure",
  "general_measure",
  "ask_once_and_remember"
 ],
 "quantity_rules": {
  "explicit_mass_overrides_piece_count": true,
  "ml_is_not_g": true,
  "unknown_density": "Сохранить объём; использовать проверенную меру этого продукта или спросить вес. Не считать любой продукт водой.",
  "unknown_default_grams": "Спросить один раз и запомнить своей мерой продукта.",
  "range": "Сохранять исходные границы, если названы. Не изобретать доверительные интервалы.",
  "personal_measures": "Хранить отдельно в личных данных пользователя; не добавлять частные граммы и записи в общий репозиторий.",
  "ordinary_portion": "Решение D13: обычная мера записывается сразу с «≈»; вопрос — только если у продукта нет никакой меры."
 },
 "compound_and_intent_rules": [
  {
   "id": "included",
   "forms": [
    "из них",
    "в том числе"
   ],
   "action": "components_inside_total_no_double_count",
   "source_ids": [
    "BRIEF"
   ]
  },
  {
   "id": "extra",
   "forms": [
    "плюс",
    "ещё",
    "добавил отдельно"
   ],
   "action": "additional_quantity",
   "source_ids": [
    "S15",
    "BRIEF"
   ]
  },
  {
   "id": "with",
   "forms": [
    "с",
    "со",
    "там",
    "заправил",
    "посыпал"
   ],
   "action": "relate_ingredient_to_parent_then_clarify_amount_or_inclusion",
   "source_ids": [
    "S03",
    "S09",
    "S12",
    "BRIEF"
   ]
  },
  {
   "id": "recipe",
   "forms": [
    "готовлю",
    "приготовил на",
    "на четверых",
    "на всю кастрюлю",
    "рецепт",
    "рецепта",
    "на три дня",
    "на два дня",
    "на неделю",
    "заготовил",
    "заготовила",
    "наготовил",
    "наготовила",
    "варю",
    "готовил на",
    "готовила на",
    "приготовила на",
    "сварил на",
    "сварила на",
    "на двоих",
    "на троих",
    "на пятерых",
    "на шестерых",
    "на всю семью",
    "на семью",
    "на всех",
    "кастрюлю",
    "кастрюля"
   ],
   "action": "detect_recipe_do_not_assume_all_eaten",
   "source_ids": [
    "S07",
    "S09",
    "BRIEF",
    "ASTAMUR"
   ],
   "bot": "recipe",
   "reply_ru": "Похоже, это готовка на несколько человек или рецепт, а не то, что ты съел. В дневник не записал. Скажи, сколько съел ты."
  },
  {
   "id": "intake",
   "forms": [
    "съел",
    "съела",
    "выпил",
    "выпила",
    "запиши"
   ],
   "action": "record_intake_after_quantity_resolution",
   "source_ids": [
    "S16",
    "S17",
    "BRIEF"
   ]
  },
  {
   "id": "exclusion",
   "forms": [
    "без",
    "б/",
    "не ел",
    "не ела"
   ],
   "action": "exclude_named_component_preserve_scope",
   "source_ids": [
    "S15",
    "BRIEF"
   ]
  },
  {
   "id": "refuse",
   "forms": [
    "без жидкости",
    "без скорлупы",
    "без костей",
    "осталось",
    "выбросил"
   ],
   "action": "resolve_edible_mass_no_double_subtraction",
   "source_ids": [
    "BRIEF"
   ]
  }
 ],
 "short_questions": {
  "oil": "Примерно сколько масла: чайная ложка, столовая или свой вес?",
  "cheese": "Сыра примерно сколько — граммов или ломтиков?",
  "package": "Сколько граммов в целой упаковке?",
  "bottle": "Какой объём у целой бутылки?",
  "unknown_spoon": "Чайная или столовая ложка?",
  "inclusion": "Сметана входит в эти 300 г или добавлена сверху?",
  "recipe": "Это рецепт или твоя съеденная порция?",
  "glass": "Стакан 200 или 250 мл? Можно свой объём."
 },
 "maintenance": [
  "Новая фраза → запись/уточнение в этом словаре с источником либо пометкой «пример пользователя» → проверочная фраза → при необходимости изменение разбора.",
  "Не дублировать эти списки вручную в bot.js, описании экрана и запросе Gemini.",
  "Словарное пополнение уже поддержанного вида не требует новой ветки условий в коде; новый способ разбора всё ещё может потребовать код.",
  "Личные дневники и персональные веса не входят в общий словарь.",
  "Продолжать этот же каталог, не создавать новый отчёт или список задач.",
  "Для записи словаря указывать устойчивый id, формы, смысл, контекст, действие, исключения, source_ids, подтверждение и статус подключения. Для веса обязательны продукт, мера, часть/состояние, граммы и основание.",
  "Контрольный пример содержит исходную фразу и ожидаемый смысл; фактический ответ хранить отдельно с версией приложения, баз и способом проверки. Не подменять ожидание фактом.",
  "Уточнение пользователя сохранять как пример; личный смысл неоднозначного слова не делать автоматически общим.",
  "Изменяя решение, обновлять ту же строку, причину и дату. Не оставлять противоположные действующие инструкции.",
  "К синониму добавлять положительную проверку и пример, который нельзя объединять: курятина/куриная печень, томат/томатная паста, веточка/стебель.",
  "Перед будущим внедрением сверить актуальные AGENTS.md, ветки Meal и карточку Бот Happy. Ветка исследования основана на 33.7; это не утверждение о текущем опубликованном выпуске.",
  "С Meal 33.9: бот читает формы и числа прямо из этого файла (поля bot, unit, general, factor, search_as, food_measures, usual_measures, named_volumes). Новое слово уже поддержанного вида — правка только здесь."
 ],
 "gemini_stage_2": {
  "same_dictionary_version_required": true,
  "use_only_after_rules_cannot_resolve": true,
  "input": "Тот же файл либо автоматически выбранная релевантная часть, с версией.",
  "output": "Название, мера, число, приблизительность, связи частей, необходимость вопроса; без выдуманных граммов.",
  "validation": "Результат проходит те же проверки единиц, источников и двойного счёта; модель не пишет дневник напрямую.",
  "shared_semantics_ru": "Брать значения, исключения и признаки из этого файла; неизвестный вес не генерировать. Сохранение проходит общие проверки."
 },
 "acceptance_contract": {
  "retain_existing_143": true,
  "new_cases_count": 90,
  "must_test": [
   "correction_replaces_number_and_unit",
   "explicit_grams_override_piece",
   "measure_food_compatibility",
   "recipe_not_intake",
   "no_duplicate_composite",
   "unknown_measure_not_missing_food",
   "same_data_offline_and_gemini",
   "synonym_preserves_part_and_cooking",
   "protected_compound_food_name",
   "regional_alias_requires_food_context",
   "stem_and_sprig_not_interchangeable",
   "edible_weight_not_subtracted_twice",
   "unclear_raw_or_cooked_is_not_guessed"
  ],
  "not_yet_integrated_into_test_suite": false,
  "extension_cases_count": 40,
  "extension_cases_ids": "N01–N40",
  "extension_cases_run_status": "not_run",
  "count_note": "С Meal 33.9 фразы двух исследований входят в рабочую проверку scripts/browser/meal_bot_scenarios.py (группы «Сл», «Мх», «Н»)."
 },
 "developer_screen_copy_ru": "Бот понимает разные названия одной еды: «курица» и «курятина», «индейка» и «индюшатина». Приготовление, часть и уточнения вроде «без кожи» сохраняются. Меры зависят от продукта; личные меры важнее справочных. Если смысла или количества недостаточно, бот коротко уточняет.",
 "catalog": {
  "page_url": "https://chatgpt.com/space/page_8247bc3043a08191be8308faeb719e1c",
  "scope": "Речь и поведение бота Happy Meal; не общий реестр задач Happy.",
  "canonical_dictionary_path": "meal-33/bot/household-ru.js",
  "data_status": "connected",
  "new_research_scope": "Синонимы, формы названий, части растений и мяса. 16 новых внешних источников; не исследование частот или аудиозаписей."
 },
 "food_modifier_aliases": [
  {
   "id": "turkey_species",
   "forms": [
    "индюшиное",
    "индюшиный",
    "индюшиная",
    "индюшачье",
    "индюшачий",
    "индюшиные",
    "индюшиного",
    "индейки",
    "индюшки"
   ],
   "assign": {
    "species": "turkey"
   },
   "allowed_head_nouns": [
    "мясо",
    "филе",
    "грудка",
    "бедро",
    "голень",
    "печень",
    "сердце",
    "крыло"
   ],
   "meaning_ru": "Добавляет вид птицы к названной части; не заменяет часть общим мясом.",
   "source_ids": [
    "S30",
    "BRIEF"
   ],
   "status": "proposed"
  },
  {
   "id": "chicken_species",
   "forms": [
    "куриное",
    "куриный",
    "куриная",
    "куриные",
    "куриного",
    "курицы"
   ],
   "assign": {
    "species": "chicken"
   },
   "allowed_head_nouns": [
    "мясо",
    "филе",
    "грудка",
    "бедро",
    "голень",
    "печень",
    "сердце",
    "крыло"
   ],
   "meaning_ru": "Куриная печень остаётся печенью. Куриные яйца — самостоятельный продукт.",
   "source_ids": [
    "S29",
    "DESIGN"
   ],
   "status": "proposed"
  },
  {
   "id": "boiled",
   "forms": [
    "варёный",
    "вареный",
    "варёная",
    "вареная",
    "варёное",
    "вареное",
    "варёные",
    "вареные",
    "отварной",
    "отварная",
    "отварное",
    "отварные",
    "отварного",
    "варёного",
    "вареного"
   ],
   "assign": {
    "cooking": "boiled"
   },
   "meaning_ru": "Один способ приготовления, если это свободный признак продукта.",
   "protect": [
    "варёная колбаса",
    "вареная колбаса",
    "варёная сгущёнка",
    "вареная сгущенка",
    "варёно-копчёный",
    "варено-копченый"
   ],
   "source_ids": [
    "S31",
    "S43",
    "DESIGN"
   ],
   "status": "proposed"
  }
 ],
 "semantic_model": {
  "status": "proposed_not_implemented",
  "fields_ru": {
   "food": "Продукт и семейство",
   "species": "Животное или растение",
   "part": "Филе, бедро, листья, стебли",
   "cooking": "Приготовление",
   "condition": "Сухой/свежий/замороженный, измельчённый/целый, с жидкостью/без",
   "included_excluded": "С кожей/без, с костями/без, со стеблями/без",
   "amount": "Число, единица, размер, доля",
   "weight_basis": "До или после удаления части",
   "certainty": "Точный вес, справочная оценка, неопределённость"
  },
  "rules_ru": [
   "Синоним выбирает смысл, но не объединяет карточки разных пищевых баз и не пересчитывает старый дневник.",
   "Сначала сохраняются целое название, отрицания, исправления, части и связи. Затем применяются формы и синонимы.",
   "Длинное подходящее название разбирается раньше короткого. Пирожное картошка не становится картофелем; куриная печень — мышечным мясом.",
   "Окончания и порядок слов не меняют явные признаки. Список форм проекта пока не охватывает все падежи.",
   "Филе — бескостный кусок, но не автоматически грудка и не отсутствие кожи. Сохранять вид, часть и приготовление.",
   "Не выбирать сырой/готовый продукт, вид рыбы или точную часть только по похожему имени. Нет подходящей карточки — явно предложить замену или уточнить.",
   "Личный смысл неоднозначного выражения не превращается в общее правило."
  ],
  "source_ids": [
   "S29",
   "S30",
   "S36",
   "S37",
   "S40",
   "S41",
   "S42",
   "S44",
   "DESIGN"
  ]
 },
 "part_qualifiers": [
  {
   "id": "without_stem",
   "forms": [
    "без стебля",
    "без стеблей",
    "без стебельков"
   ],
   "meaning_ru": "Исключить названные стебли из съеденной части; не вычитать неизвестный вес. Бот: слова пропускаются, вес не вычитается — человек назвал уже съеденное (D06).",
   "source_ids": [
    "S37",
    "S38"
   ],
   "default_removed_grams": null,
   "bot": "drop"
  },
  {
   "id": "with_stem",
   "forms": [
    "со стеблем",
    "со стеблями",
    "вместе со стеблем"
   ],
   "meaning_ru": "Часть включена; «с ножкой» требует связи с продуктом. Бот: слова пропускаются, вес не вычитается — человек назвал уже съеденное (D06).",
   "source_ids": [
    "S37",
    "BRIEF"
   ],
   "default_removed_grams": null,
   "bot": "drop"
  },
  {
   "id": "without_leg_contextual",
   "forms": [
    "без ножки",
    "без ножек"
   ],
   "meaning_ru": "У зелени вероятно без жёсткого стебля, у гриба без ножки; у птицы другая часть. Если смысл неясен — спросить. Бот: слова пропускаются, вес не вычитается — человек назвал уже съеденное (D06).",
   "source_ids": [
    "BRIEF",
    "DESIGN"
   ],
   "default_removed_grams": null,
   "status": "contextual_proposal",
   "never_global_alias_to": "без стебля",
   "bot": "drop"
  },
  {
   "id": "without_core",
   "forms": [
    "без кочерыжки",
    "кочерыжку убрал",
    "без сердцевины"
   ],
   "meaning_ru": "Удалена часть конкретного растения; точный вычет только по известной массе. Бот: слова пропускаются, вес не вычитается — человек назвал уже съеденное (D06).",
   "source_ids": [
    "DESIGN"
   ],
   "default_removed_grams": null,
   "bot": "drop"
  },
  {
   "id": "without_skin",
   "forms": [
    "без кожи",
    "без шкурки",
    "без кожуры",
    "очищенный",
    "очищенная"
   ],
   "meaning_ru": "Сохранять, что очищено; «очищенный» не означает автоматически без костей или без семян.",
   "source_ids": [
    "S29",
    "DESIGN"
   ],
   "default_removed_grams": null
  },
  {
   "id": "without_bone_or_pit",
   "forms": [
    "без костей",
    "без кости",
    "без косточки",
    "без косточек"
   ],
   "meaning_ru": "Кость мяса и косточка плода различаются по продукту; вес не угадывать.",
   "source_ids": [
    "S29",
    "DESIGN"
   ],
   "default_removed_grams": null
  },
  {
   "id": "with_leg_contextual",
   "forms": [
    "с ножкой",
    "с ножками"
   ],
   "meaning_ru": "Часть включена; определять её только по продукту: гриб, зелень или птица. Не заменять глобально на стебель. Бот: слова пропускаются, вес не вычитается — человек назвал уже съеденное (D06).",
   "source_ids": [
    "BRIEF",
    "DESIGN"
   ],
   "default_removed_grams": null,
   "status": "contextual_proposal",
   "bot": "drop"
  },
  {
   "id": "edible_only_words",
   "bot": "drop",
   "forms": [
    "без кожуры",
    "без шкурки",
    "без косточки",
    "без косточек",
    "без сердцевины",
    "без хвостика",
    "без хвостиков",
    "без семян",
    "вес шляпок",
    "это вес шляпок",
    "уже без",
    "вес очищенного",
    "уже очищенный"
   ],
   "meaning_ru": "Человек назвал вес съедобной части: слова пропускаются, ничего не вычитается.",
   "source_ids": [
    "DESIGN",
    "ASTAMUR"
   ],
   "default_removed_grams": null
  }
 ],
 "user_utterance_examples": [
  {
   "id": "user_dill_stem_20261117",
   "text": "стебель укропа (это с ножкой)",
   "meaning_ru": "Пояснение пользователя для проектирования. Не установлена универсальная трактовка и не создана личная настройка.",
   "source_ids": [
    "BRIEF"
   ],
   "global_rule": false
  },
  {
   "id": "user_kachan_20261117",
   "text": "качан капусты",
   "meaning_ru": "Входной вариант «качан» в контексте капусты распознаётся как кочан; исходный текст сохраняется.",
   "source_ids": [
    "BRIEF",
    "S36"
   ],
   "status": "proposed"
  }
 ],
 "edible_weight_rules": [
  {
   "id": "final_weight",
   "rule_ru": "Граммы уже относятся к очищенной съедобной части — записать один раз. «Укроп 15 г, это уже без ножек» = 15 г.",
   "source_ids": [
    "DESIGN"
   ]
  },
  {
   "id": "known_subtraction",
   "rule_ru": "Взвешено до очистки и отдельно назван вес удалённого — вычесть один раз в одинаковом состоянии. 20 г со стеблями минус 5 г выброшенных = 15 г.",
   "source_ids": [
    "DESIGN"
   ]
  },
  {
   "id": "unknown_subtraction",
   "rule_ru": "Вес до очистки, удалённая масса неизвестна — спросить вес после очистки или предложить подходящую явную оценку. Нет постоянного процента для всех ножек.",
   "source_ids": [
    "DESIGN"
   ]
  },
  {
   "id": "cooked_weight",
   "rule_ru": "Не вычитать сырой остаток из готовой массы и не переводить сырой вес в готовый без подходящего выхода приготовления.",
   "source_ids": [
    "DESIGN"
   ]
  },
  {
   "id": "used_not_eaten",
   "rule_ru": "Зелень, положенная в бульон и вынутая, не равна съеденным стеблям. Не добавлять всю исходную массу в дневник отдельной едой.",
   "source_ids": [
    "S38",
    "DESIGN"
   ]
  }
 ],
 "decision_catalog": [
  {
   "id": "D01",
   "decision_ru": "Один словарь и одна закрытая страница для решений, выводов и инструкций.",
   "status": "user_requested",
   "basis": "Прямое поручение 17.11.2026",
   "implementation": "Каталог; подключение не выполнено.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D02",
   "decision_ru": "Заполнители удаляются после распознавания команд; ещё, нет, без, из них сохраняют смысл.",
   "status": "approved_connected",
   "basis": "Первое исследование",
   "implementation": "Подключено в Meal 33.9 (ветка задачи; на сайте — после «выпускай»).",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D03",
   "decision_ru": "Явный вес порции важнее куска, штуки или доли. Личная подходящая мера важнее справочной.",
   "status": "approved_connected",
   "basis": "Первое исследование, S01, S20",
   "implementation": "Подключено в Meal 33.9 (ветка задачи; на сайте — после «выпускай»).",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D04",
   "decision_ru": "Другие названия объединяют смысл, а часть, приготовление и съедобный состав сохраняются.",
   "status": "approved_connected",
   "basis": "Уточнения про курятину, индейку и филе",
   "implementation": "Подключено в Meal 33.9 (ветка задачи; на сайте — после «выпускай»).",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D05",
   "decision_ru": "Кочан, стебель, веточка и ножка требуют продукта и съедаемой части; общих граммов нет. Изменено 17.11.2026 (D15): веса назначаются — общий или по продукту, с «≈»; вопрос только когда совсем не за что зацепиться.",
   "status": "changed_by_user",
   "basis": "S36–S39, примеры пользователя",
   "implementation": "Веса в food_measures; подключено в Meal 33.9.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D06",
   "decision_ru": "Без ножки и без кожи не означают вычесть постоянный вес; важно до или после очистки. Изменено 17.11.2026 (D15): веса назначаются — общий или по продукту, с «≈»; вопрос только когда совсем не за что зацепиться.",
   "status": "changed_by_user",
   "basis": "S37, S38, вывод исследования",
   "implementation": "Веса в food_measures; подключено в Meal 33.9.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D07",
   "decision_ru": "Различать овсянку сухую/готовую, зелень кориандра/семена, филе грудки/бедра.",
   "status": "approved_connected",
   "basis": "S40–S42, примеры пользователя",
   "implementation": "Подключено в Meal 33.9 (ветка задачи; на сайте — после «выпускай»).",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D08",
   "decision_ru": "Новая фраза сначала дополняет словарь и проверочный пример, затем при необходимости разбор.",
   "status": "user_requested",
   "basis": "Первоначальное задание",
   "implementation": "Инструкция сохранена; автоматизация не подключена.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D09",
   "decision_ru": "Будущий ИИ получает ту же версию словаря; вручную переписанных списков не заводить.",
   "status": "user_requested",
   "basis": "Первоначальное задание, этап 2",
   "implementation": "Gemini не подключён.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D10",
   "decision_ru": "Значение слова, предложенное поведение и реально проверенное поведение указывать отдельно.",
   "status": "catalog_convention",
   "basis": "Не выдавать исследовательский пример за работающую функцию",
   "implementation": "Применено к каталогу.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D11",
   "decision_ru": "Задачи и статус работы остаются в карточке Бот Happy; каталог хранит знания.",
   "status": "user_requested",
   "basis": "Правила проекта",
   "implementation": "Нового списка задач нет.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D12",
   "decision_ru": "Каталог не выпускает сайт и не разрешает менять поведение бота.",
   "status": "user_requested",
   "basis": "Код после отдельного согласия, сайт после выпускай",
   "implementation": "Рабочие файлы приложения не изменены.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D13",
   "decision_ru": "Не обременять вопросами без крайней необходимости. Количество без числа, приблизительность, диапазон, «с горкой» записываются сразу с «≈»; спрашивать — только когда совсем не за что зацепиться.",
   "status": "user_decided",
   "basis": "Астамур 17.11.2026 19:07: «Михалыч перестраховщик»",
   "implementation": "Meal 33.9: approximation, qualitative_amounts, ranges.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D14",
   "decision_ru": "Стакан 250 мл, чашка 200 мл, кружка 300 мл — без переспрашивания. Названный объём посуды («пол-литровая кружка», «двухлитровая бутылка») важнее меры.",
   "status": "user_decided",
   "basis": "Астамур 17.11.2026 19:07",
   "implementation": "Meal 33.9: measures, named_volumes.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D15",
   "decision_ru": "Пучок зелени 50 г. Веточке, листу и другим частям вес назначается: общий или по продукту.",
   "status": "user_decided",
   "basis": "Астамур 17.11.2026 19:07",
   "implementation": "Meal 33.9: food_measures.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D16",
   "decision_ru": "Своя мера человека главнее любой справочной: если человек создал «тарелку 500 г» у супа, «тарелка супа» — 500 г. То же для своих порций и рецептов: своё — первым.",
   "status": "user_decided",
   "basis": "Астамур 17.11.2026 19:07",
   "implementation": "Meal 33.9: порядок веса — своя мера → мера продукта → мера группы продуктов → общий вес меры → вопрос один раз с запоминанием.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D17",
   "decision_ru": "Традиционные порции напитков (утверждены Астамуром 17.11.2026 20:23): бокал вина и игристого 150 мл, рюмка крепкого 50 мл, бокал и кружка пива 500 мл, банка 330 мл, бутылка вина 750 мл, коктейль 200 мл.",
   "status": "user_decided",
   "basis": "Поручение Астамура 17.11.2026 19:07 разобраться с традиционными порциями; числа — NIAAA и рабочие оценки",
   "implementation": "Meal 33.9: food_measures. Утверждено.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D20",
   "decision_ru": "Порции напитков из D17 утверждены. Кусок: если у продукта есть своя мера «кусок» (в базе или созданная человеком), берётся она; общие 100 г — только когда её нет.",
   "status": "user_decided",
   "basis": "Астамур 17.11.2026 20:23",
   "implementation": "Meal 33.9.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D21",
   "decision_ru": "Просто «сыр» — последний записанный сыр, иначе гауда (не фета). Просто «сок» — последний записанный, иначе вопрос; сок киви по умолчанию не берётся.",
   "status": "user_decided",
   "basis": "Астамур 17.11.2026 20:23",
   "implementation": "Meal 33.9: generic_defaults.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D22",
   "decision_ru": "Японские порции — для японских блюд и продуктов японской базы, корейские — для корейских; для остального наши общие меры. Виски — 50 мл, как утверждено. Просто «кимчи» — обычный кимчи из пекинской капусты. Бутерброд с сыром — 50 г хлеба и 25 г сыра, если в базе нет такого блюда.",
   "status": "user_decided",
   "basis": "Астамур 17.11.2026 21:00 и 21:39",
   "implementation": "Meal 33.9: food_measures с полем src, generic_defaults, composite_dishes.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D23",
   "decision_ru": "Блюда нет в базе — бот не спрашивает «что именно?», а предлагает записать части по отдельности; свои граммы человека запоминаются. Общее правило для любого «А с Б». Привычные порции: сначала то, что использует сам человек, потом привычный вариант, потом вопрос с вариантами.",
   "status": "user_decided",
   "basis": "Астамур 17.11.2026 21:56 и 22:08",
   "implementation": "Meal 33.9: composite_rule_ru, habit_rule_ru, generic_defaults, usual_measures.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D24",
   "decision_ru": "Сырое или готовое: назвал или взвесил — сырое; сказал «съел» — мясо, птица, картофель готовые. Овощи, фрукты, зелень без слов о способе — сырые. «N штук» считается только у продукта с названным словом в самом названии; тарелка, стакан и упаковка штукой не считаются. Веса штук (сырник, блин, пирожок…) утверждены. Выученные порции каждого человека должны храниться на сервере в его аккаунте — перенос позже, перед ним уточнить.",
   "status": "user_decided",
   "basis": "Астамур 17.11.2026 23:02 и 23:11",
   "implementation": "Meal 33.9: eaten_context; bot.js pieceUnit, coreHas, eatenSwap.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D25",
   "decision_ru": "Аккаунт — одного человека: в дневник идёт только то, что съел он сам. Готовка, рецепт, взвешивание продуктов для готовки (килограмм и больше без слова «съел»), порции мужа и детей, уроненное — болтовня, в дневник не идёт. «Не доел, половину оставил» — пишется съеденная часть. «Это не считай» — пропускается. Рецепты голосом и несколько едоков не усложнять: возможно, это отдать модели (Gemini).",
   "status": "user_decided",
   "basis": "Астамур 18.11.2026 00:36",
   "implementation": "Meal 33.9: bot.js RECIP, SUBJ, OWNW, NOTEATEN, takeLeft, NOCOUNT; словарь — формы recipe.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D26",
   "decision_ru": "«Взвесил» и «получилось» — обычные слова при записи еды с весов: не исключать и не считать признаком сырого или готовки. Цепочку «взвесил продукты → получилось блюдо → съел столько-то → остальное на завтра» с расчётом веса блюда и порции правилами не решать: вероятно, отдавать подключённой языковой модели.",
   "status": "user_decided",
   "basis": "Астамур 18.11.2026 00:51",
   "implementation": "Meal 33.9: слова пропускаются (weighing_words); расчёт цепочки не делается.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D18",
   "decision_ru": "Чем больше способов понять человека, тем лучше: новые слова и обороты добавляются в словарь, а не в код.",
   "status": "user_decided",
   "basis": "Астамур 17.11.2026 19:07",
   "implementation": "Meal 33.9: bot-speech.js читает формы из этого файла.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D19",
   "decision_ru": "Каждая версия приложения выходит со своим словарём; будущая модель (Gemini) получает этот же файл.",
   "status": "user_decided",
   "basis": "D09 + подключение 17.11.2026",
   "implementation": "Файл meal-33/bot/household-ru.js.",
   "updated_on": "2026-11-17"
  }
 ],
 "control_examples": [
  {
   "id": "N01",
   "phrase": "Курятина отварная 180 г",
   "expected_ru": "Мясо курицы, варёное, 180 г; часть и кожа не выдумываются.",
   "rule_id": "alias_chicken",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N02",
   "phrase": "Курица варёная 180 г",
   "expected_ru": "Тот же смысл, что у N01; вес 180 г.",
   "rule_id": "alias_chicken",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N03",
   "phrase": "Индюшатина отварная 150 г",
   "expected_ru": "Мясо индейки, варёное, 150 г.",
   "rule_id": "alias_turkey",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N04",
   "phrase": "Индюшка отварная 150 г",
   "expected_ru": "Тот же смысл, что у N03.",
   "rule_id": "alias_turkey",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N05",
   "phrase": "Индейка варёная 150 г",
   "expected_ru": "Тот же смысл, что у N03.",
   "rule_id": "alias_turkey",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N06",
   "phrase": "Индюшиное филе отварное 150 г",
   "expected_ru": "Филе индейки, варёное, 150 г; часть не объявляется грудкой.",
   "rule_id": "turkey_species",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N07",
   "phrase": "Отварное филе индейки 150 г",
   "expected_ru": "Тот же смысл, что у N06, независимо от порядка слов.",
   "rule_id": "turkey_species",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N08",
   "phrase": "Филе бедра индейки отварное 150 г",
   "expected_ru": "Сохранить бедро; не заменить грудкой.",
   "rule_id": "turkey_species",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N09",
   "phrase": "Филе грудки индейки отварное 150 г",
   "expected_ru": "Сохранить грудку; отличать от N08.",
   "rule_id": "turkey_species",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N10",
   "phrase": "Куриная печень жареная 100 г",
   "expected_ru": "Печень курицы, жареная, 100 г; не общее куриное мясо.",
   "rule_id": "chicken_species",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N11",
   "phrase": "Говяжье мясо отварное 120 г",
   "expected_ru": "Говядина, варёная, 120 г; не телятина.",
   "rule_id": "alias_beef",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N12",
   "phrase": "Свиное мясо варёное 120 г",
   "expected_ru": "Свинина, варёная, 120 г; не сало.",
   "rule_id": "alias_pork",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N13",
   "phrase": "Утятина запечённая 140 г",
   "expected_ru": "Мясо утки, запечённое, 140 г; кожу не додумывать.",
   "rule_id": "alias_duck",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N14",
   "phrase": "Гусятина варёная 140 г",
   "expected_ru": "Мясо гуся, варёное, 140 г.",
   "rule_id": "alias_goose",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N15",
   "phrase": "Телятина варёная 150 г",
   "expected_ru": "Сохранить телятину, не заменить обычной говядиной.",
   "rule_id": "alias_veal",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N16",
   "phrase": "Лососина солёная 80 г",
   "expected_ru": "Лосось, солёный, 80 г; точный вид не выдумывать.",
   "rule_id": "alias_salmon_flesh",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N17",
   "phrase": "Томат свежий 120 г",
   "expected_ru": "Помидор свежий, 120 г; не паста.",
   "rule_id": "alias_tomato",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N18",
   "phrase": "Помидорчик свежий 120 г",
   "expected_ru": "Тот же смысл и вес, что у N17; уменьшительность не уменьшает граммы.",
   "rule_id": "alias_tomato",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N19",
   "phrase": "Картошечка отварная 200 г",
   "expected_ru": "Картофель варёный, 200 г; не пирожное.",
   "rule_id": "alias_potato",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N20",
   "phrase": "Морковка сырая 70 г",
   "expected_ru": "Морковь сырая, 70 г; не обязательно маленькая.",
   "rule_id": "alias_carrot",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N21",
   "phrase": "Бурак отварной 90 г",
   "expected_ru": "Свёкла варёная, 90 г.",
   "rule_id": "alias_beet",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N22",
   "phrase": "Синенькие запечённые 150 г",
   "expected_ru": "Баклажаны запечённые, 150 г; масло не выдумывать.",
   "rule_id": "alias_eggplant",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N23",
   "phrase": "Овсянка 60 г",
   "expected_ru": "Уточнить: сухая или готовая, если нет однозначного контекста.",
   "rule_id": "alias_oatmeal_ambiguous",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N24",
   "phrase": "Овсянка сухая 60 г",
   "expected_ru": "Сохранить сухое состояние и 60 г; при необходимости уточнить крупу/хлопья.",
   "rule_id": "alias_oatmeal_ambiguous",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N25",
   "phrase": "Овсянка на воде готовая 200 г",
   "expected_ru": "Готовая каша на воде, 200 г; не сухие хлопья.",
   "rule_id": "alias_oatmeal_ambiguous",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N26",
   "phrase": "Кинза свежая 5 г",
   "expected_ru": "Свежая зелень, 5 г; не семена.",
   "rule_id": "alias_cilantro_greens",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N27",
   "phrase": "Зелень кориандра свежая 5 г",
   "expected_ru": "Тот же смысл, что у N26.",
   "rule_id": "alias_cilantro_greens",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N28",
   "phrase": "Кориандр молотый 2 г",
   "expected_ru": "Кулинарная пряность, молотые семена, 2 г; не зелень. Правило требует проверки на базе.",
   "rule_id": "alias_coriander_seed_ground",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N29",
   "phrase": "Кориандр 2 г",
   "expected_ru": "При отсутствии контекста спросить: зелень или семена? Количество уже известно.",
   "rule_id": "alias_coriander_ambiguous",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N30",
   "phrase": "Полкачана капусты",
   "expected_ru": "Половина кочана; вид и вес не выдумывать. Сохранить исходное написание.",
   "rule_id": "cabbage_head",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N31",
   "phrase": "Полвилка краснокочанной капусты без кочерыжки, вес после очистки 400 г",
   "expected_ru": "400 г уже названной очищенной порции; не делить повторно на два.",
   "rule_id": "cabbage_head",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N32",
   "phrase": "Кочан кукурузы отварной",
   "expected_ru": "Початок кукурузы, не капуста; съедобный вес требует подходящей меры или уточнения.",
   "rule_id": "corn_cob",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N33",
   "phrase": "Две веточки укропа без ножек",
   "expected_ru": "Зелень двух веточек с указанным исключением; не целые растения. Без подходящей меры уточнить вес.",
   "rule_id": "sprig",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N34",
   "phrase": "Стебель укропа",
   "expected_ru": "Сохранить неоднозначность: только стебель или со всей зеленью? Вес не выдумывать.",
   "rule_id": "stem",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N35",
   "phrase": "Укроп 5 г без стеблей, взвесил уже очищенный",
   "expected_ru": "5 г; ничего повторно не вычитать.",
   "rule_id": "without_stem",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N36",
   "phrase": "Взвесил укроп 20 г со стеблями, стебли 5 г выбросил",
   "expected_ru": "15 г съедобной части при одинаковом состоянии взвешивания.",
   "rule_id": "without_stem",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N37",
   "phrase": "Укроп 15 г, это уже без ножек",
   "expected_ru": "15 г; не вычитать стебли повторно.",
   "rule_id": "without_leg_contextual",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N38",
   "phrase": "Шампиньоны без ножек 60 г, это вес шляпок",
   "expected_ru": "60 г шляпок, не минус неизвестный процент и не стебли зелени.",
   "rule_id": "without_leg_contextual",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N39",
   "phrase": "Цветная капуста, три соцветия",
   "expected_ru": "Сохранить цветную капусту и меру соцветия; не три кочана. Вес по продукту или вопрос.",
   "rule_id": "floret",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  },
  {
   "id": "N40",
   "phrase": "Зелёный лук, три пера",
   "expected_ru": "Мера пера, не три репчатые луковицы; подходящая мера или вопрос.",
   "rule_id": "onion_feather",
   "origin": "authored_research_case",
   "run_status": "not_run",
   "actual": null
  }
 ],
 "generic_defaults": [
  {
   "id": "cheese",
   "said": "^сыр(а|у|ом|е|ы|ов)?$",
   "history": "^(сыр(?! ?творож|ок|ник)|гауда|сулугуни|моцарелл|пармезан|чеддер|эмментал|брынз|фет|адыгейск|российск|маасдам|эдам|камамбер|тильзит|чечил|халуми)",
   "default_search": "сыр гауда",
   "rule_ru": "Просто «сыр»: тот сыр, который человек записывал последним; если сыра ещё не было — гауда. Не фета. Решение Астамура 17.11.2026 20:23.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "juice",
   "said": "^сок(а|у|ом|и)?$",
   "history": "^(сок[ ,]|[а-я-]+ сок($|[ ,]))",
   "ask": true,
   "first_search": "сок апельсиновый",
   "rule_ru": "Просто «сок»: тот сок, который человек записывал последним; если сока ещё не было — вопрос «какой?», первым в кнопках апельсиновый. Сок киви по умолчанию не берётся. Решение Астамура 17.11.2026 20:23.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "kimchi",
   "said": "^кимчи$",
   "history": "^кимчи",
   "default_search": "кимчи пэчхукимчи из пекинской капусты",
   "rule_ru": "Просто «кимчи»: тот кимчи, который человек записывал последним; иначе обычный кимчи из пекинской капусты (пэчхукимчи). Решение Астамура 17.11.2026 21:39.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "ramen",
   "said": "^рам[её]н(а|у|ом|е|ы)?$",
   "history": "^рам[её]н(?!.*(до приготов|сух|только лапша))",
   "ask": true,
   "first_search": "рамен сёю с курицей",
   "rule_ru": "Просто «рамен»: тот, что человек записывал последним; иначе вопрос «какой?» — ресторанный японский или корейский быстрого приготовления. Порция: японский 600 г, корейский готовый 500 мл.",
   "source_ids": [
    "J05",
    "K01"
   ]
  },
  {
   "id": "rice",
   "said": "^рис(а|у|ом|е)?$",
   "history": "^рис(?!ов)",
   "default_search": "рис варёный",
   "rule_ru": "Общее слово: последний записанный такой продукт, иначе привычный вариант. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "id": "buckwheat",
   "said": "^гречк(а|и|у|ой|е)$",
   "history": "^(гречк|каша гречн)",
   "default_search": "гречка варёная",
   "rule_ru": "Общее слово: последний записанный такой продукт, иначе привычный вариант. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "id": "butter",
   "said": "^масл(о|а|у|ом|е)$",
   "history": "^масло",
   "default_search": "масло сливочное",
   "rule_ru": "Общее слово: последний записанный такой продукт, иначе привычный вариант. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "id": "sausage",
   "said": "^колбас(а|ы|у|ой|е)$",
   "history": "^колбас",
   "default_search": "колбаса варёная",
   "rule_ru": "Общее слово: последний записанный такой продукт, иначе привычный вариант. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "id": "wine",
   "said": "^вин(о|а|у|ом|е)$",
   "history": "^вино(?!град)",
   "default_search": "вино красное сухое",
   "rule_ru": "Общее слово: последний записанный такой продукт, иначе привычный вариант. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "id": "beer",
   "said": "^пив(о|а|у|ом|е)$",
   "history": "^пиво",
   "default_search": "пиво светлое",
   "rule_ru": "Общее слово: последний записанный такой продукт, иначе привычный вариант. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "id": "oatmeal",
   "said": "^овсянк(а|и|у|ой|е)$",
   "history": "^(овсян|каша овсян|крупа овсян)",
   "default_search": "овсяные хлопья варёные",
   "rule_ru": "Общее слово: последний записанный такой продукт, иначе привычный вариант. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "id": "nuts",
   "said": "^орех(и|ов|ами|ах)$",
   "history": "^(орех|грецк|миндал|фундук|кешью|фисташ|арахис)",
   "default_search": "орехи грецкие",
   "rule_ru": "Общее слово: последний записанный такой продукт, иначе привычный вариант. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "id": "puree",
   "said": "^пюре$",
   "history": "^пюре",
   "default_search": "пюре картофельное",
   "rule_ru": "Общее слово: последний записанный такой продукт, иначе привычный вариант. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "id": "cutlet",
   "said": "^котлет(а|ы|у|ой|ами|ка|ки|ку|ок)?$",
   "history": "^котлет",
   "default_search": "котлета говядина свинина духовке",
   "rule_ru": "Общее слово: последний записанный такой продукт, иначе привычный вариант. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "id": "wieners",
   "said": "^(сосиск(а|и|у|ой|ами)?|сосисок)$",
   "history": "^сосиск",
   "default_search": "сосиски венские",
   "rule_ru": "Общее слово: последний записанный такой продукт, иначе привычный вариант. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "id": "mushrooms",
   "said": "^гриб(ы|ов|ами|ах)$",
   "history": "^(гриб|шампиньон|вешенк|лисичк|опят)",
   "default_search": "шампиньоны",
   "rule_ru": "Общее слово: последний записанный такой продукт, иначе привычный вариант. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "id": "meat",
   "said": "^мяс(о|а|у|ом|е)$",
   "history": "^(мясо|говядин|свинин|баранин|телятин|куриц|индейк)",
   "ask": true,
   "ask_options": [
    "мясо курицы",
    "говядина",
    "свинина"
   ],
   "rule_ru": "Общее слово: последний записанный такой продукт; иначе вопрос «какое?» с привычными вариантами в кнопках. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "fish",
   "said": "^рыб(а|ы|у|ой|е)$",
   "history": "^(рыба|лосос|семг|форел|треск|минтай|скумбри|сельд|горбуш|судак|карп|тунец|хек|окун)",
   "ask": true,
   "ask_options": [
    "лосось",
    "треска",
    "скумбрия"
   ],
   "rule_ru": "Общее слово: последний записанный такой продукт; иначе вопрос «какое?» с привычными вариантами в кнопках. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR"
   ]
  }
 ],
 "composite_rule_ru": "Блюдо «А с Б» (решения Астамура 17.11.2026 21:56 и 22:08): есть такое блюдо в базе или у человека — берётся оно. Нет — бот предлагает записать части по отдельности обычными порциями; «да» — записывает так, свои граммы — как сказал человек. Ответ запоминается: в следующий раз блюдо пишется так же без вопроса, с «≈». Вес в конце («творог с изюмом 220 г») — вес всего блюда, делится в той же пропорции; вес в начале («200 г гречки с маслом») — вес первого продукта. «Пирог с капустой», «суп с лапшой» не делятся: это вид блюда. «Бутерброд с …» — 50 г хлеба и то, что на нём. «Котлеты в сливочном соусе», «курица в сметане» — так же: блюдо и соус отдельно, соус — 30 г (две столовые ложки). Решение Астамура 18.11.2026 00:55.",
 "habit_rule_ru": "Количество не названо (решение Астамура 17.11.2026 22:08): 1) своя мера человека; 2) его привычная порция — сколько он сам называл в последних пяти записях этого продукта (чаще всего, при равенстве — последнее); 3) обычная мера из словаря; 4) мера продукта. Запись получает «≈» и кнопки «Меньше» и «Больше».",
 "known_missing": [
  {
   "id": "pelmeni",
   "said": "^пельмен",
   "unless_in_base": "^пельмени(?!, с картоф)",
   "rule_ru": "Обычных пельменей в базе нет (есть американские вареники с картошкой, японские гёдза и немецкий суп с маульташен). Пока их не добавят или человек не создаст свои, бот отвечает «в базе нет» и заносит в список недостающего. Появятся — правило отключится само.",
   "source_ids": [
    "ASTAMUR"
   ]
  }
 ],
 "eaten_context": {
  "rule_ru": "Способ приготовления не назван — порядок тот же, что везде. 1) Как человек сам называл этот продукт в последний раз: вчера «жареная курица» — сегодня «курица» тоже жареная; называл сырой — сырая. 2) Сказано «съел», «поел» — готовое: мясо, птица и картофель варёные (свинина — запечённая без масла), рыба и грибы жареные, яйцо варёное; сырое остаётся в кнопках замены. 3) Просто назвал («курица 200 г», «на обед курица 200 г») — сырое. Слово «взвесил» ничего не меняет: так человек говорит почти всегда. Овощи, фрукты, зелень без слов о способе — сырые. Сказано «сырое» или «до готовки» — сырое. Решения Астамура 17.11.2026 23:11 и 23:41.",
  "verbs": [
   "съел",
   "съела",
   "съели",
   "поел",
   "поела",
   "поели",
   "ел",
   "ела",
   "ели",
   "доел",
   "доела",
   "скушал",
   "скушала",
   "покушал",
   "покушала",
   "слопал",
   "слопала",
   "умял",
   "умяла",
   "закусил",
   "закусила",
   "перекусил",
   "перекусила",
   "пообедал",
   "пообедала",
   "позавтракал",
   "позавтракала",
   "поужинал",
   "поужинала",
   "обедал",
   "обедала",
   "ужинал",
   "ужинала",
   "завтракал",
   "завтракала"
  ],
  "meal_verbs": [
   "перекусил",
   "перекусила",
   "пообедал",
   "пообедала",
   "позавтракал",
   "позавтракала",
   "поужинал",
   "поужинала",
   "обедал",
   "обедала",
   "ужинал",
   "ужинала",
   "завтракал",
   "завтракала"
  ],
  "raw_words": [
   "сырой",
   "сырая",
   "сырое",
   "сырую",
   "сырого",
   "сырые",
   "сырых",
   "в сыром виде",
   "до готовки",
   "до варки",
   "до жарки",
   "сырьем"
  ],
  "weigh_words": [
   "до готовки",
   "до варки",
   "до жарки",
   "в сыром виде"
  ],
  "cooked_for": [
   {
    "raw": "^мясо курицы.*сыр",
    "search": "мясо курицы вареное"
   },
   {
    "raw": "^мясо индейки.*сыр",
    "search": "мясо индейки вареное"
   },
   {
    "raw": "^мясо утки.*сыр",
    "search": "мясо утки вареное"
   },
   {
    "raw": "^мясо гуся.*сыр",
    "search": "мясо гуся вареное"
   },
   {
    "raw": "^мясо перепелки.*сыр",
    "search": "мясо перепелки тушеное"
   },
   {
    "raw": "^говядина.*сыр",
    "search": "говядина для варки огузок вареная"
   },
   {
    "raw": "^свинина.*сыр",
    "search": "свинина для жаркого огузок жаренная в духовке"
   },
   {
    "raw": "^баранина.*сыр",
    "search": "лопатка баранья вареная"
   },
   {
    "raw": "^телятина.*сыр",
    "search": "лопатка телячья вареная"
   },
   {
    "raw": "^картофель.*сыр",
    "search": "картофель вареный"
   },
   {
    "raw": "^котлета [а-я ]+, сырая$",
    "add": "духовке"
   },
   {
    "raw": "^яйцо куриное$",
    "search": "яйцо куриное вареное"
   },
   {
    "raw": "^(лосось|форель|треска|минтай|судак|карп|хек|окунь|щука|камбала|горбуша|палтус|тунец|кета|кижуч|сибас|дорадо|пикша|сайда|сом|налим)( [а-я]+)?(, сыр[а-я]*)?$",
    "add": "жареный"
   },
   {
    "raw": "^(шампиньоны|вешенки|лисички|опята|белые грибы|грибы [а-я]+), сыр",
    "add": "жареные"
   }
  ],
  "source_ids": [
   "ASTAMUR"
  ]
 },
 "composite_part_as": [
  {
   "said": "сливочн[а-я]* соус[а-я]*",
   "search": "соус белый основа сливками"
  },
  {
   "said": "сметанн[а-я]* соус[а-я]*",
   "search": "сметана"
  }
 ],
 "composite_dishes": [
  {
   "id": "cheese_sandwich",
   "said": "бутерброд(?:а|ов|ы)?\\s+с\\s+сыром",
   "dish_in_base": "^(бутерброд|сэндвич|сендвич) с сыр",
   "parts": [
    {
     "search": "хлеб",
     "g": 50
    },
    {
     "search": "сыр",
     "g": 25
    }
   ],
   "rule_ru": "Бутерброд с сыром — 50 г хлеба и 25 г сыра (сыр — последний записанный, иначе гауда). Если в базе появится «Бутерброд с сыром» или «Сэндвич с сыром», берётся он. Решение Астамура 17.11.2026 21:39.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "curd_raisins",
   "mode": "offer",
   "name_ru": "Творога с изюмом",
   "said": "творог(?:а|у|ом)?\\s+с\\s+изюм(?:ом)?",
   "dish_in_base": "^творог.*изюм",
   "parts": [
    {
     "search": "творог",
     "g": 200
    },
    {
     "search": "изюм",
     "g": 20
    }
   ],
   "rule_ru": "Творога с изюмом в базе нет: бот не спрашивает «что именно?», а предлагает записать по отдельности — творог 200 г и изюм 20 г; «да» — записывает так, свои граммы — как сказал человек. Решение Астамура 17.11.2026 21:56.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  }
 ],
 "ranges": {
  "rule_ru": "Диапазон («180–200 г», «от 150 до 200», «два-три», «два или три») — берётся середина, запись получает «≈». Края не складываются.",
  "source_ids": [
   "ASTAMUR"
  ],
  "bot": "midpoint"
 },
 "qualitative_rule_ru": "Решение Астамура 17.11.2026 (D13): количество без числа записывается сразу с «≈»: «немного» — половина обычной меры продукта, «на глаз», «по вкусу» — одна мера, «щедро», «много» — полторы. Обычная мера: своя мера человека, иначе мера продукта, иначе мера из usual_measures. Нет ни одной — тогда короткий вопрос.",
 "usual_measures": [
  {
   "match": "^(вино(?!град)|шампанск|игрист|просекко|пиво|сидр)",
   "unit": "бокал"
  },
  {
   "match": "^йогурт",
   "unit": "стаканчик"
  },
  {
   "match": "^(творог(?!.*(сырок|масса))|каша|пюре картоф|омлет)",
   "unit": "порция"
  },
  {
   "match": "^(рис|гречк|макарон|спагетти|лапша|булгур|кускус|перлов|пшен|киноа|чечевиц|фасоль|нут|горох|картофел|крупа|овсян|хлопья).*(варен|отварн|приготовл)",
   "unit": "порция"
  },
  {
   "match": "^масло сливоч",
   "unit": "порция"
  },
  {
   "match": "^(мясо|куриц|курин|говядин|свинин|баранин|телятин|индейк|утк|гус|рыба|лосос|семг|форел|треск|минтай|шашлык|стейк)",
   "unit": "кусок"
  },
  {
   "match": "^котлет",
   "unit": "шт"
  },
  {
   "match": "^лимон",
   "unit": "долька"
  },
  {
   "match": "^соус(?! соев)",
   "unit": "порция"
  },
  {
   "match": "^(оладьи|сырник|блин|драник|пельмен|вареник|голубц|тефтел|фрикадел|наггетс|сосиск|сардельк|печенье)",
   "unit": "порция"
  },
  {
   "match": "^(пирожок|пирожки|пончик|круассан|булочк|пряник|конфет|вафл)",
   "unit": "шт"
  },
  {
   "match": "^(гриб|шампиньон|вешенк|лисичк|опят)",
   "unit": "порция"
  },
  {
   "match": "^(соль|перец (черн|бел|душист|красн|молот)|специ|приправ|корица|паприка|куркума|карри|мускат|тмин|зира|хмели|ванил)",
   "unit": "щепотка"
  },
  {
   "match": "^(сахар|мед($|[ ,])|варень|джем|повидл|сгущен)",
   "unit": "ч. л."
  },
  {
   "match": "^(масло|сметан|майонез|кетчуп|соус|горчиц|аджик|ткемали|сливк|йогурт|творог|каша|пюре|икра|паштет|хумус)",
   "unit": "ст. л."
  },
  {
   "match": "^(сыр(?! творож)|моцарелл|пармезан|сулугун|брынз|фет|колбас|ветчин|салями|бекон|сервелат|хлеб|батон|багет|лаваш)",
   "unit": "ломтик"
  },
  {
   "match": "^(орех|миндал|фисташ|фундук|кешью|арахис|семечк|изюм|курага|сухофрукт|чипс|грецк)",
   "unit": "горсть"
  },
  {
   "match": "^(укроп|петрушк|кинза|базилик|мята|зелень|розмарин|тимьян|руккол)",
   "unit": "веточка"
  },
  {
   "match": "^(суп|бульон|борщ|щи|солянк|окрошк|уха)",
   "unit": "тарелка"
  },
  {
   "match": "^онигири",
   "unit": "шт"
  },
  {
   "match": "^кимчи",
   "unit": "порция"
  },
  {
   "match": "^мисо-? ?суп",
   "unit": "пиала"
  },
  {
   "match": "^мисо(?!-? ?суп)",
   "unit": "ч. л."
  },
  {
   "match": "^тофу",
   "unit": "упаковка"
  },
  {
   "match": "^лапша.*(удон|соба).*(варен|приготовл)",
   "unit": "порция"
  },
  {
   "match": "^натто",
   "unit": "упаковка"
  },
  {
   "match": "^(рамен|рамён)(?! быстрого.*сух| с приправой, до)",
   "unit": "порция"
  },
  {
   "match": "^(соджу|сак[еэ](?!касу))",
   "unit": "рюмка"
  },
  {
   "match": "^(суши|нигири|ролл)",
   "unit": "шт"
  }
 ],
 "food_measures": [
  {
   "match": "^(мука)",
   "unit": "стакан",
   "g": 160,
   "source_ids": [
    "C01"
   ]
  },
  {
   "match": "^(сахар)",
   "unit": "стакан",
   "g": 200,
   "source_ids": [
    "C01",
    "C06"
   ]
  },
  {
   "match": "^(овсян|хлопья овсян|геркулес)(?!.*(варен|каша|готов))",
   "unit": "стакан",
   "g": 100,
   "source_ids": [
    "C02",
    "C06"
   ]
  },
  {
   "match": "^(клубник|земляник|малин|черник|голубик|ежевик|смородин|крыжовн|вишн|черешн|виноград|клюкв|брусник|шелковиц)(?!.*(сироп|сок|варень|джем|сушен|компот))",
   "unit": "стакан",
   "g": 150,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^(клубник|земляник|малин|черник|голубик|ежевик|смородин|крыжовн|вишн|черешн|виноград|клюкв|брусник|шелковиц)(?!.*(сироп|сок|варень|джем|сушен|компот))",
   "unit": "горсть",
   "g": 50,
   "source_ids": [
    "LEGACY",
    "ESTIMATE"
   ]
  },
  {
   "match": "^сахар",
   "unit": "ч. л.",
   "g": 5,
   "source_ids": [
    "C06",
    "LEGACY"
   ]
  },
  {
   "match": "^(мед($|[ ,]))",
   "unit": "дес. л.",
   "g": 14,
   "source_ids": [
    "S21",
    "DESIGN"
   ]
  },
  {
   "match": "^масло (олив|растит|подсолн|рапс|льнян|кокос)",
   "unit": "дес. л.",
   "g": 9,
   "source_ids": [
    "S20",
    "DESIGN"
   ]
  },
  {
   "match": "^чеснок",
   "unit": "зубчик",
   "g": 3,
   "source_ids": [
    "S20"
   ]
  },
  {
   "match": "^чеснок",
   "unit": "долька",
   "g": 3,
   "source_ids": [
    "S20"
   ]
  },
  {
   "match": "^лук(?! зелен|-порей| порей|-шалот)",
   "unit": "кольцо",
   "g": 6,
   "source_ids": [
    "S20"
   ]
  },
  {
   "match": "^перец (сладк|болгар)",
   "unit": "кольцо",
   "g": 10,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^лук зелен",
   "unit": "перо",
   "g": 5,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^лук зелен",
   "unit": "пучок",
   "g": 50,
   "source_ids": [
    "LEGACY"
   ]
  },
  {
   "match": "^(кинза|кориандр.*(зелен|лист))",
   "unit": "веточка",
   "g": 2,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^(укроп|петрушк|розмарин|тимьян|мята|базилик)",
   "unit": "веточка",
   "g": 1,
   "source_ids": [
    "C06",
    "ESTIMATE"
   ]
  },
  {
   "match": "^(укроп|петрушк|кинза|базилик|мята|зелень)",
   "unit": "стебель",
   "g": 1,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^сельдере",
   "unit": "стебель",
   "g": 40,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^базилик",
   "unit": "лист",
   "g": 0.5,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^мята",
   "unit": "лист",
   "g": 0.1,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^руккол",
   "unit": "лист",
   "g": 2,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^шпинат",
   "unit": "лист",
   "g": 10,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^салат(?!.*(греческ|оливье|цезар|винегрет|из |с ))",
   "unit": "лист",
   "g": 8,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^капуста(?!.*(цветн|брокколи|морск|квашен|брюссел))",
   "unit": "лист",
   "g": 23,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^лавров",
   "unit": "лист",
   "g": 0.2,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^капуста(?!.*(цветн|брокколи|морск|квашен|брюссел|краснокоч))",
   "unit": "кочан",
   "g": 900,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^капуста краснокоч|^капуста, красн",
   "unit": "кочан",
   "g": 840,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^капуста цветн",
   "unit": "кочан",
   "g": 590,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^капуста цветн",
   "unit": "соцветие",
   "g": 13,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^брокколи",
   "unit": "соцветие",
   "g": 13,
   "source_ids": [
    "C06",
    "ESTIMATE"
   ]
  },
  {
   "match": "^кукуруз",
   "unit": "кочан",
   "g": 90,
   "source_ids": [
    "S36",
    "C06"
   ]
  },
  {
   "match": "^фасоль (стручк|зелен)",
   "unit": "стручок",
   "g": 6,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^горох.*(струч|зелен)",
   "unit": "стручок",
   "g": 3.4,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^сахар",
   "unit": "кусок",
   "g": 5,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^сахар",
   "unit": "кубик",
   "g": 5,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^масло сливоч",
   "unit": "кусок",
   "g": 10,
   "source_ids": [
    "C06",
    "ESTIMATE"
   ]
  },
  {
   "match": "^(торт|пирог|пирожн|чизкейк|кекс|бисквит|шарлотк|рулет)",
   "unit": "кусок",
   "g": 100,
   "source_ids": [
    "C06",
    "ESTIMATE"
   ]
  },
  {
   "match": "^пицц",
   "unit": "кусок",
   "g": 100,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(куриц|курин|говядин|свинин|баранин|телятин|индейк|утк|гус|мясо|рыба|лосос|семг|форел|треск|котлет|шашлык|стейк)",
   "unit": "кусок",
   "g": 100,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^шоколад",
   "unit": "плитка",
   "g": 100,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(рис|гречк|макарон|спагетти|лапша|булгур|кускус|перлов|пшен|киноа|чечевиц|фасоль|нут|горох|картофел|крупа|овсян|хлопья).*(варен|отварн|приготовл)",
   "unit": "порция",
   "g": 200,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(каша|пюре картоф)",
   "unit": "порция",
   "g": 200,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^творог(?!.*(сырок|масса))",
   "unit": "порция",
   "g": 200,
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "match": "^омлет",
   "unit": "порция",
   "g": 150,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^масло сливоч",
   "unit": "порция",
   "g": 10,
   "source_ids": [
    "C06",
    "ESTIMATE"
   ]
  },
  {
   "match": "^котлет",
   "unit": "шт",
   "g": 80,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^лимон",
   "unit": "долька",
   "g": 8,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^соус(?! соев)",
   "unit": "порция",
   "g": 30,
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "match": "^(гриб|шампиньон|вешенк|лисичк|опят)",
   "unit": "порция",
   "g": 100,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(оладьи творож|сырник)",
   "unit": "шт",
   "g": 50,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(оладьи творож|сырник)",
   "unit": "порция",
   "g": 150,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^оладьи(?! творож)",
   "unit": "шт",
   "g": 35,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^оладьи(?! творож)",
   "unit": "порция",
   "g": 150,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^блин",
   "unit": "шт",
   "g": 50,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^блин",
   "unit": "порция",
   "g": 150,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^драник",
   "unit": "шт",
   "g": 45,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^драник",
   "unit": "порция",
   "g": 150,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^пельмен",
   "unit": "шт",
   "g": 12,
   "source_ids": [
    "ESTIMATE",
    "R01"
   ]
  },
  {
   "match": "^пельмен",
   "unit": "порция",
   "g": 200,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(пирожок|пирожки)",
   "unit": "шт",
   "g": 75,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^сосиск",
   "unit": "шт",
   "g": 50,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^сосиск",
   "unit": "порция",
   "g": 100,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^сардельк",
   "unit": "шт",
   "g": 100,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^сардельк",
   "unit": "порция",
   "g": 100,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^голубц",
   "unit": "шт",
   "g": 150,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^голубц",
   "unit": "порция",
   "g": 300,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^тефтел",
   "unit": "шт",
   "g": 50,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^тефтел",
   "unit": "порция",
   "g": 150,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^фрикадел",
   "unit": "шт",
   "g": 20,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^фрикадел",
   "unit": "порция",
   "g": 100,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^наггетс",
   "unit": "шт",
   "g": 20,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^наггетс",
   "unit": "порция",
   "g": 120,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(пончик|круассан|булочк)",
   "unit": "шт",
   "g": 60,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^пряник",
   "unit": "шт",
   "g": 35,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(печенье|конфет|вафл)",
   "unit": "шт",
   "g": 12,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^печенье",
   "unit": "порция",
   "g": 30,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(суши нигири|нигири)",
   "unit": "шт",
   "g": 35,
   "source_ids": [
    "C09",
    "C10"
   ]
  },
  {
   "match": "^(суши маки|маки|ролл)",
   "unit": "шт",
   "g": 20,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^онигири",
   "unit": "шт",
   "g": 110,
   "source_ids": [
    "C11"
   ]
  },
  {
   "match": "^рис(?!.*(сух|сыр|мука|лапш|бумаг|уксус|отруб))",
   "unit": "пиала",
   "g": 150,
   "source_ids": [
    "C12"
   ]
  },
  {
   "match": "^рис(?!.*(сух|сыр|мука|лапш|бумаг|уксус|отруб))",
   "unit": "порция",
   "g": 200,
   "source_ids": [
    "C13"
   ]
  },
  {
   "match": "^кимчи",
   "unit": "порция",
   "g": 40,
   "source_ids": [
    "C14"
   ]
  },
  {
   "match": "^мисо-? ?суп",
   "unit": "пиала",
   "g": 200,
   "source_ids": [
    "J01"
   ]
  },
  {
   "match": "^мисо-? ?суп",
   "unit": "тарелка",
   "g": 200,
   "source_ids": [
    "J01"
   ]
  },
  {
   "match": "^мисо(?!-? ?суп)",
   "unit": "ст. л.",
   "g": 18,
   "source_ids": [
    "J03"
   ]
  },
  {
   "match": "^мисо(?!-? ?суп)",
   "unit": "ч. л.",
   "g": 6,
   "source_ids": [
    "J03"
   ]
  },
  {
   "match": "^(соус соев|соевый соус)",
   "unit": "ст. л.",
   "g": 18,
   "source_ids": [
    "J03"
   ]
  },
  {
   "match": "^(соус соев|соевый соус)",
   "unit": "ч. л.",
   "g": 6,
   "source_ids": [
    "J03"
   ]
  },
  {
   "match": "^рамен быстрого.*готов",
   "unit": "тарелка",
   "g": 500,
   "source_ids": [
    "K01",
    "ESTIMATE"
   ]
  },
  {
   "match": "^рамен быстрого.*готов",
   "unit": "порция",
   "g": 500,
   "source_ids": [
    "K01",
    "ESTIMATE"
   ]
  },
  {
   "match": "^рамен(?! быстрого|, лапша|, только| с приправой)",
   "unit": "тарелка",
   "g": 600,
   "source_ids": [
    "J05",
    "ESTIMATE"
   ]
  },
  {
   "match": "^рамен(?! быстрого|, лапша|, только| с приправой)",
   "unit": "порция",
   "g": 600,
   "source_ids": [
    "J05",
    "ESTIMATE"
   ]
  },
  {
   "match": "^лапша для рамена, варен",
   "unit": "порция",
   "g": 230,
   "source_ids": [
    "J05"
   ]
  },
  {
   "match": "^лапша.*(удон|соба).*(варен|приготовл)",
   "unit": "порция",
   "g": 200,
   "source_ids": [
    "J02",
    "J05"
   ]
  },
  {
   "match": "^лапша.*(удон|соба).*(варен|приготовл)",
   "unit": "тарелка",
   "g": 200,
   "source_ids": [
    "J02",
    "J05"
   ]
  },
  {
   "match": "^лапша сомэн.*суш",
   "unit": "порция",
   "g": 100,
   "source_ids": [
    "J02"
   ]
  },
  {
   "match": "^сашими",
   "unit": "шт",
   "g": 15,
   "source_ids": [
    "J02"
   ]
  },
  {
   "match": "^сашими",
   "unit": "кусок",
   "g": 15,
   "source_ids": [
    "J02"
   ]
  },
  {
   "match": "^натто",
   "unit": "упаковка",
   "g": 50,
   "source_ids": [
    "J02"
   ]
  },
  {
   "match": "^натто",
   "unit": "пачка",
   "g": 50,
   "source_ids": [
    "J02"
   ]
  },
  {
   "match": "^тофу",
   "unit": "упаковка",
   "g": 300,
   "source_ids": [
    "J02"
   ]
  },
  {
   "match": "^тофу",
   "unit": "пачка",
   "g": 300,
   "source_ids": [
    "J02"
   ]
  },
  {
   "match": "^сак[еэ](?!касу)",
   "unit": "чашка",
   "g": 30,
   "source_ids": [
    "J04"
   ]
  },
  {
   "match": "^сак[еэ](?!касу)",
   "unit": "бокал",
   "g": 120,
   "source_ids": [
    "J04"
   ]
  },
  {
   "match": "^сак[еэ](?!касу)",
   "unit": "бутылка",
   "g": 720,
   "source_ids": [
    "J04"
   ]
  },
  {
   "match": "^рис.*варен",
   "src": "MEXT",
   "unit": "тарелка",
   "g": 250,
   "source_ids": [
    "J01"
   ]
  },
  {
   "match": "^чеснок",
   "src": "MEXT",
   "unit": "зубчик",
   "g": 10,
   "source_ids": [
    "J02"
   ]
  },
  {
   "match": "^имбир",
   "src": "MEXT",
   "unit": "кусок",
   "g": 15,
   "source_ids": [
    "J02"
   ]
  },
  {
   "match": "^рамен, лапша с бульоном",
   "unit": "тарелка",
   "g": 500,
   "source_ids": [
    "K01"
   ]
  },
  {
   "match": "^рамен, лапша с бульоном",
   "unit": "порция",
   "g": 500,
   "source_ids": [
    "K01"
   ]
  },
  {
   "match": "^рамен с приправой, до приготов",
   "unit": "пачка",
   "g": 120,
   "source_ids": [
    "K01"
   ]
  },
  {
   "match": "^рамен с приправой, до приготов",
   "unit": "упаковка",
   "g": 120,
   "source_ids": [
    "K01"
   ]
  },
  {
   "match": "^рамен с приправой, до приготов",
   "unit": "порция",
   "g": 120,
   "source_ids": [
    "K01"
   ]
  },
  {
   "match": "^(кимчи-?ччиг|ччиг)",
   "unit": "тарелка",
   "g": 200,
   "source_ids": [
    "K01"
   ]
  },
  {
   "match": "^(кимчи-?ччиг|ччиг)",
   "unit": "порция",
   "g": 200,
   "source_ids": [
    "K01"
   ]
  },
  {
   "match": "^рис.*приготовл",
   "src": "KFCT",
   "unit": "тарелка",
   "g": 210,
   "source_ids": [
    "K02"
   ]
  },
  {
   "match": "^рис.*приготовл",
   "src": "KFCT",
   "unit": "порция",
   "g": 210,
   "source_ids": [
    "K02"
   ]
  },
  {
   "match": "^суп",
   "src": "KFCT",
   "unit": "тарелка",
   "g": 250,
   "source_ids": [
    "K01"
   ]
  },
  {
   "match": "^чеснок",
   "src": "KFCT",
   "unit": "зубчик",
   "g": 5,
   "source_ids": [
    "K03"
   ]
  },
  {
   "match": "^имбир",
   "src": "KFCT",
   "unit": "кусок",
   "g": 5,
   "source_ids": [
    "K03"
   ]
  },
  {
   "match": "^соджу",
   "unit": "бутылка",
   "g": 360,
   "source_ids": [
    "K04"
   ]
  },
  {
   "match": "^макколли",
   "unit": "чашка",
   "g": 200,
   "source_ids": [
    "K04"
   ]
  },
  {
   "match": "^макколли",
   "unit": "бокал",
   "g": 200,
   "source_ids": [
    "K04"
   ]
  },
  {
   "match": "^сыр(?! ?творож|ок|ник)",
   "unit": "ломтик",
   "g": 20,
   "source_ids": [
    "LEGACY"
   ]
  },
  {
   "match": "^йогурт",
   "unit": "стаканчик",
   "g": 125,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(морожен|пломбир)",
   "unit": "стаканчик",
   "g": 70,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(вино(?!град)|шампанск|игрист|просекко|глинтвейн|вермут)",
   "unit": "бокал",
   "g": 150,
   "source_ids": [
    "C05",
    "C06"
   ]
  },
  {
   "match": "^(вино(?!град)|шампанск|игрист|просекко)",
   "unit": "стакан",
   "g": 150,
   "source_ids": [
    "C05"
   ]
  },
  {
   "match": "^(вино(?!град)|шампанск|игрист|просекко)",
   "unit": "бутылка",
   "g": 750,
   "source_ids": [
    "C05"
   ]
  },
  {
   "match": "^(пиво|сидр|квас)",
   "unit": "бокал",
   "g": 500,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(пиво|сидр|квас)",
   "unit": "кружка",
   "g": 500,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(пиво|сидр|квас)",
   "unit": "бутылка",
   "g": 500,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(пиво|сидр|кола|лимонад|газиров|энергет|тоник|спрайт|фанта|напиток)",
   "unit": "банка",
   "g": 330,
   "source_ids": [
    "C05",
    "ESTIMATE"
   ]
  },
  {
   "match": "^(виски|коньяк|бренди|ром($|[ ,])|джин|текила|водка|самогон|чача|граппа|ликер|настойк)",
   "unit": "рюмка",
   "g": 50,
   "source_ids": [
    "C05",
    "ESTIMATE"
   ]
  },
  {
   "match": "^(виски|коньяк|бренди|ром($|[ ,])|джин|текила|ликер)",
   "unit": "бокал",
   "g": 50,
   "source_ids": [
    "C05",
    "ESTIMATE"
   ]
  },
  {
   "match": "^(виски|коньяк|бренди|ром($|[ ,])|джин|текила)",
   "unit": "стакан",
   "g": 50,
   "source_ids": [
    "C05",
    "ESTIMATE"
   ]
  },
  {
   "match": "^(коктейль|мохито|негрони|маргарит|апероль|спритц)",
   "unit": "бокал",
   "g": 200,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(вода|минерал)",
   "unit": "бутылка",
   "g": 500,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(суп|бульон|борщ|щи|солянк|окрошк|уха|компот|кисель)",
   "unit": "половник",
   "g": 125,
   "source_ids": [
    "ESTIMATE"
   ]
  }
 ],
 "named_volumes": {
  "rule_ru": "Человек назвал объём посуды — берётся он, а не общий вес меры (D14): «пол-литровая кружка» — 500 мл, «двухлитровая бутылка» — 2 л, «банка 0,33» — 330 мл.",
  "adjectives": {
   "бумажн": 180,
   "пол-литров": 500,
   "поллитров": 500,
   "полулитров": 500,
   "литров": 1000,
   "полуторалитров": 1500,
   "двухлитров": 2000,
   "трехлитров": 3000,
   "пятилитров": 5000
  },
  "containers": [
   "кружк",
   "банк",
   "бутылк",
   "бутыл",
   "баллон",
   "бокал",
   "стакан",
   "пакет",
   "баклажк",
   "бутылочк",
   "баночк",
   "чашк"
  ],
  "spoken_decimals": {
   "ноль пять": 500,
   "ноль три": 300,
   "ноль тридцать три": 330,
   "ноль семь": 700,
   "ноль двадцать пять": 250,
   "ноль семьдесят пять": 750,
   "ноль четыре": 400,
   "ноль два": 200
  },
  "source_ids": [
   "ASTAMUR"
  ]
 },
 "alias_skip_after_stems": [
  "филе",
  "бедр",
  "грудк",
  "крыл",
  "голен",
  "печен",
  "сердц",
  "желуд",
  "шея",
  "шейк",
  "окороч",
  "ножк",
  "бульон",
  "суп",
  "фарш",
  "котлет",
  "мясо",
  "мяса",
  "кусочк",
  "паштет",
  "рулет",
  "шашлык",
  "плов",
  "салат",
  "икра",
  "стейк",
  "яйц"
 ],
 "alias_skip_after": [
  "с",
  "со",
  "из",
  "без",
  "на",
  "в",
  "во",
  "для",
  "от",
  "под",
  "к"
 ],
 "protected_phrases": [
  "мясо курицы",
  "мясо индейки",
  "мясо утки",
  "мясо гуся",
  "мясо индюшки",
  "листья кориандра",
  "листья кинзы",
  "пирожное картошка",
  "томатная паста",
  "томатный сок",
  "томатный соус",
  "томатное пюре",
  "маточное молочко",
  "тысяча островов",
  "четыре сыра",
  "три сыра",
  "семь злаков",
  "пять злаков",
  "восемь злаков",
  "варено-копчен",
  "вареная колбаса",
  "вареная сгущенка",
  "куриное яйцо",
  "куриные яйца",
  "утиное яйцо",
  "птичье молоко",
  "кокосовое молочко",
  "семена кинзы",
  "семена кориандра",
  "семена укропа",
  "гусиная печень",
  "утиная грудка",
  "морковь по-корейски"
 ],
 "unit_forms": {
  "кружка": [
   "кружка",
   "кружки",
   "кружек"
  ],
  "стаканчик": [
   "стаканчик",
   "стаканчика",
   "стаканчиков"
  ],
  "пиала": [
   "пиала",
   "пиалы",
   "пиал"
  ],
  "половник": [
   "половник",
   "половника",
   "половников"
  ],
  "бокал": [
   "бокал",
   "бокала",
   "бокалов"
  ],
  "рюмка": [
   "рюмка",
   "рюмки",
   "рюмок"
  ],
  "дес. л.": [
   "дес. л.",
   "дес. л.",
   "дес. л."
  ],
  "кусок": [
   "кусок",
   "куска",
   "кусков"
  ],
  "кольцо": [
   "кольцо",
   "кольца",
   "колец"
  ],
  "банка": [
   "банка",
   "банки",
   "банок"
  ],
  "пачка": [
   "пачка",
   "пачки",
   "пачек"
  ],
  "упаковка": [
   "упаковка",
   "упаковки",
   "упаковок"
  ],
  "бутылка": [
   "бутылка",
   "бутылки",
   "бутылок"
  ],
  "кочан": [
   "кочан",
   "кочана",
   "кочанов"
  ],
  "стебель": [
   "стебель",
   "стебля",
   "стеблей"
  ],
  "соцветие": [
   "соцветие",
   "соцветия",
   "соцветий"
  ],
  "перо": [
   "перо",
   "пера",
   "перьев"
  ],
  "стручок": [
   "стручок",
   "стручка",
   "стручков"
  ],
  "кубик": [
   "кубик",
   "кубика",
   "кубиков"
  ],
  "плитка": [
   "плитка",
   "плитки",
   "плиток"
  ],
  "порция": [
   "порция",
   "порции",
   "порций"
  ],
  "шот": [
   "шот",
   "шота",
   "шотов"
  ]
 }
};
