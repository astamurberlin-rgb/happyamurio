"""Meal 29: счётчик добавки на одном телефоне, гость (решение Астамура 12.11.2026 01:48: «нажимаешь добавить счетчик
находишь добавку выбираешь в какое приложение еще подключить и везде должно быть»). Каталог БАДов — из ветки библиотек
этого репозитория. Meal 29.1: шаблон из поиска без покупки каталога ведёт на страницу каталога БАДов с «Купить». В Meal: «Новый счётчик» находит шаблон каталога «Рыбий жир» (после тестовой покупки) и свою добавку
«Витамин D3»; меры — капсулы, без граммов. Рыбий жир — 2 капсулы, связь с Day и Sport; витамин D — только Day.
Нажатия в Meal, Sport и Day: калории в «съедено» без удвоения, подписи порций без условных граммов, голодание прервано
рыбьим жиром, приём пищи не открыт. Журнал Meal: EPA и витамин D по нажатиям, своё вещество «Рыбий жир» — в «Созданные
мной», отчёт — строки добавок без массы. Продукт-добавка не виден в поиске еды и в «Моих продуктах». Состав в «Мои
добавки» исправили — счётчик после сохранения считает по новому, прежние порции не меняются. Прежний выпуск Meal 28 на том же
телефоне открывает эти порции без ошибок, а Meal 29 после него считает журнал так же. Только придуманные записи."""
from common import *

out, errors, requests, checks = {}, [], [], []


def check(title, ok):
    checks.append((title, bool(ok)))


DOC = """()=>{const o=JSON.parse(localStorage.getItem('happy-food-counters-v1:local')||'null');if(!o)return null;
 return {definitions:o.definitions.filter(d=>!d.deleted).map(d=>({title:d.title,fid:d.fid,q:d.q,u:d.u,g:d.g,portionText:d.portionText||null,k:d.food.k,rev:d.food.supplement?d.food.supplement.revision:null,
  massUnknown:d.food.supplement?d.food.supplement.massUnknown:null,targets:d.targets})).sort((a,b)=>a.title.localeCompare(b.title)),live:o.events.filter(e=>!e.deleted).length}}"""
TODAY_ITEMS = """()=>(DB.days[curDate]&&DB.days[curDate].items||[]).map(x=>({fid:x.fid,q:x.q,u:x.u,g:x.g,tap:!!x.tap,label:amtShort(x),k:x.counterFood?x.counterFood.k:null,rev:x.counterFood&&x.counterFood.supplement?x.counterFood.supplement.revision:null}))"""
PLUS = '#sport-food-counters [data-action="food-plus"][data-shared="true"]'


def num(text):
    return float(str(text).replace(' ', '').replace(' ', '').replace(',', '.')) if text not in (None, '—') else None


with sync_playwright() as p:
    b = launch(p)
    ctx = b.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2, locale="ru-RU", timezone_id="Europe/Moscow")
    # гость ничего не должен спрашивать у сервера: любой запрос к нему записываем и отклоняем
    ctx.route(BACKEND + "/**", lambda route, request: (requests.append(request.method + ' ' + request.url[:120]), route.abort())[1])
    libraries(ctx)

    def page_of(name, path):
        page = ctx.new_page()
        page.on("pageerror", lambda e: errors.append(name + ": " + str(e)[:300]))
        page.goto(BASE + path)
        return page

    def seen(page):
        page.bring_to_front()
        page.evaluate("()=>document.dispatchEvent(new Event('visibilitychange'))")
        page.wait_for_timeout(900)

    def meal_open():
        meal = page_of("meal", MEAL + "index.html")
        ok = wait_for(meal, lambda: meal.evaluate("()=>typeof BLS_ST!=='undefined'&&BLS_ST==='ok'&&typeof MealSupplementsStore!=='undefined'&&MealSupplementsStore.ready()&&HappySupplementsLibrary.state==='ok'"), 30)
        meal.evaluate("()=>{go('day');renderDay()}")
        meal.wait_for_timeout(400)
        return meal, ok

    # ── 1. Meal: тестовая покупка каталога БАДов, своя добавка «Витамин D3» ──
    meal, ready = meal_open()
    check("Meal: каталог БАДов и документ добавок готовы", ready)
    # Meal 30 (Астамур 12.11 10:14–10:26): не купленный набор — как отключённый: в поиске его нет; купил — подключён
    row = '.sp-search-results [data-sp="search-template"][data-id="protein-whey-concentrate"]'

    def search_protein():
        meal.evaluate("()=>{go('day');renderDay()}")
        meal.wait_for_timeout(300)
        meal.locator('#mlSecs [data-sec="am"]').click()
        meal.wait_for_timeout(400)
        meal.fill("#mlFindQ", "протеин")
        meal.wait_for_timeout(700)
        return meal.locator(row).count()

    def find_protein():
        search_protein()
        return meal.locator(row).inner_text().replace('\n', ' · ')

    card_js = "()=>{const d=document.querySelector('.sp-dialog');return d?{text:d.innerText,buttons:[...d.querySelectorAll('[data-sp]')].map(b=>b.textContent.trim()),dose:!!document.getElementById('spDose')}:null}"
    out["rows_before_purchase"] = search_protein()
    check("Meal 30: без покупки шаблонов БАДов в поиске нет", out["rows_before_purchase"] == 0)
    meal.evaluate("()=>{go('day');renderDay()}")
    meal.wait_for_timeout(300)
    out["bought"] = meal.evaluate("()=>{HappyCollections.buy('SUPP');return {bought:HappyCollections.canUseSupplements(),on:MealSources.enabled(DB,'SUPP')}}")
    check("тестовая покупка: набор куплен и сразу подключён", out["bought"] == {"bought": True, "on": True})
    out["row_after_purchase"] = find_protein()
    check("после покупки строка поиска — «Шаблон · настроить по этикетке»", 'Шаблон · настроить по этикетке' in out["row_after_purchase"])
    meal.locator(row).click()
    meal.wait_for_timeout(400)
    out["card_after_purchase"] = meal.evaluate(card_js)
    check("карточка шаблона после покупки открывается", bool(out["card_after_purchase"]))
    meal.screenshot(path=SHOTS + "meal_supplement_counters-0-card.png")
    meal.click('.sp-dialog [data-sp="close"]')
    meal.wait_for_timeout(300)
    meal.evaluate("()=>{go('day');renderDay()}")
    meal.wait_for_timeout(300)
    out["own_variants"] = meal.evaluate("""async()=>{const M=HappySupplementsModel;const x=M.normalize({id:null,templateId:null,name:'Витамин D3 · 2000 МЕ',form:'',category:'vitamins',
      basis:{quantity:1,unit:'капсула',gramsPerUnit:null},components:[{id:'c1',name:'Витамин D3',unit:'МЕ',amount:2000,substanceId:'vD'}],measures:[],notes:'',source:'Этикетка пользователя',revision:0});
      x.id='d3-own';x.revision=1;x.updatedAt=new Date().toISOString();await MealSupplementsStore.write(d=>{d.variants=d.variants.concat(x)});return MealSupplementsStore.state().variants.map(v=>v.name)}""")

    # ── 2. «Новый счётчик»: шаблон каталога «Рыбий жир», 2 капсулы, связь с Day и Sport ──
    meal.evaluate("()=>editTap(-1)")
    meal.fill('#fcSearch', 'рыбий')
    meal.wait_for_selector('[data-fc="choose"][data-id^="supp-template:"]', timeout=15000)
    out["fish_result"] = meal.locator('[data-fc="choose"][data-id^="supp-template:"]').first.inner_text().replace('\n', ' · ')
    check("поиск счётчика находит шаблон каталога БАДов: 1 капсула — 10 ккал", 'Каталог БАДов' in out["fish_result"] and '1 капсула — 10 ккал' in out["fish_result"])
    meal.locator('[data-fc="choose"][data-id^="supp-template:"]').first.click()
    meal.wait_for_timeout(400)
    out["fish_preview_1"] = meal.inner_text('#fcPreview')
    meal.click('[data-fc="plus"]')
    meal.wait_for_timeout(200)
    out["fish_editor"] = meal.evaluate("()=>({preview:document.getElementById('fcPreview').textContent,grams:document.getElementById('fcQuantityGrams').textContent,unit:document.getElementById('fcQuantityUnit').textContent,chips:[...document.querySelectorAll('.fc-units [data-fc]')].map(b=>b.textContent),note:document.querySelector('#foodCounterEditor .happy-card .happy-note').textContent,title:document.getElementById('fcName').value})")
    check("редактор: 1 капсула → 2 капсулы, 20 ккал, без граммов, мера только «капсула»", out["fish_preview_1"] == '1 капсула · 10 ккал' and out["fish_editor"]["preview"] == '2 капсулы · 20 ккал' and out["fish_editor"]["grams"] == '' and out["fish_editor"]["unit"] == 'капсулы' and out["fish_editor"]["chips"] == ['капсула'])
    meal.screenshot(path=SHOTS + "meal_supplement_counters-1-editor.png")
    meal.check('#fcSync-day')
    meal.check('#fcSync-sport')
    meal.click('[data-fc="save"]')
    meal.wait_for_timeout(1800)
    out["after_fish"] = meal.evaluate("()=>({variants:MealSupplementsStore.state().variants.map(v=>[v.name,v.templateId||null,v.revision]),dialog:!document.getElementById('foodCounterEditor').hidden,error:(document.getElementById('fcError')||{}).textContent||''})")
    check("шаблон сохранился в «Мои добавки», окно закрылось", any(v[1] == 'fish-oil' for v in out["after_fish"]["variants"]) and not out["after_fish"]["dialog"])

    # ── 3. Своя добавка «Витамин D3» — только Day ──
    meal.evaluate("()=>editTap(-1)")
    meal.fill('#fcSearch', 'витамин d3')
    meal.wait_for_selector('[data-fc="choose"][data-id="supp:d3-own"]', timeout=15000)
    out["d3_result"] = meal.locator('[data-fc="choose"][data-id="supp:d3-own"]').inner_text().replace('\n', ' · ')
    out["d3_first"] = meal.locator('[data-fc="choose"]').first.get_attribute('data-id')
    check("своя добавка — первой в поиске счётчика, «Мои добавки», калорийность не указана", out["d3_first"] == 'supp:d3-own' and 'Мои добавки' in out["d3_result"] and 'калорийность не указана' in out["d3_result"])
    meal.locator('[data-fc="choose"][data-id="supp:d3-own"]').click()
    meal.wait_for_timeout(300)
    out["d3_preview"] = meal.inner_text('#fcPreview')
    meal.check('#fcSync-day')
    meal.click('[data-fc="save"]')
    meal.wait_for_timeout(1500)
    out["doc_after_create"] = meal.evaluate(DOC)
    defs = out["doc_after_create"]["definitions"] if out["doc_after_create"] else []
    fish = next((d for d in defs if d["title"] == 'Рыбий жир'), None)
    d3 = next((d for d in defs if d["title"].startswith('Витамин D3')), None)
    check("общие счётчики: рыбий жир — 2 капсулы, «2 капсулы» для Day и Sport, масса неизвестна", fish and fish["fid"].startswith('supp:') and [fish["q"], fish["u"], fish["g"], fish["portionText"], fish["massUnknown"], fish["k"]] == [2, 'капсула', 2, '2 капсулы', True, 1000] and fish["targets"] == {"day": True, "sport": True})
    check("витамин D — только Day, «1 капсула», калорий нет", d3 and [d3["q"], d3["u"], d3["portionText"], d3["k"]] == [1, 'капсула', '1 капсула', None] and d3["targets"] == {"day": True, "sport": False})
    out["library"] = meal.evaluate("()=>({inFoods:Object.keys(FOODS).filter(id=>id.indexOf('supp:')===0).length,inList:LIST.filter(f=>f.supplement).length,search:searchLib('рыбий').map(f=>f.id),taps:DB.taps.map(c=>c.t+' · '+portTxt(c))})")
    check("продукт-добавка в библиотеке есть, а в поиске еды — нет", out["library"]["inFoods"] == 2 and out["library"]["inList"] == 0 and not any(i.startswith('supp:') for i in out["library"]["search"]))
    check("кнопки счётчиков в Meal: «2 капсулы», «1 капсула»", 'Рыбий жир · 2 капсулы' in out["library"]["taps"] and 'Витамин D3 · 2000 МЕ · 1 капсула' in out["library"]["taps"])
    meal.evaluate("()=>go('settings')")
    meal.wait_for_timeout(500)
    out["own_products"] = meal.evaluate("()=>[(document.getElementById('setFoods')||{}).innerText||'',(document.getElementById('libraryOwnProducts')||{}).innerText||'']")
    check("в «Моих продуктах» добавок нет", not any('Рыбий' in t or 'Витамин' in t for t in out["own_products"]))
    meal.evaluate("()=>{go('day');renderDay()}")
    meal.wait_for_timeout(300)

    # ── 4. Нажатие в Meal: запись еды с продуктом-добавкой, голодание прервано, приём не открыт ──
    meal.evaluate("()=>tapAdd(DB.taps.find(c=>c.t==='Рыбий жир').k)")
    meal.wait_for_timeout(1200)
    out["meal_items_1"] = meal.evaluate(TODAY_ITEMS)
    out["meal_fast"] = meal.evaluate("()=>{const el=document.getElementById('mlFast');return el&&!el.hidden?el.textContent:null}")
    out["meal_eaten_1"] = er(meal, "съедено")["knob"]
    out["meal_link_1"] = meal.evaluate("()=>{const o=JSON.parse(localStorage.getItem('hd_link_meal_v1')||'null'),d=o&&o.days[todayISO()];return d?{k:d.k,food:d.food,secs:Object.keys(d.sec||{}).map(k=>[k,d.sec[k].food,d.sec[k].dr||0]),cs:d.cs?Object.keys(d.cs).length:0}:null}")
    out["meal_editor"] = meal.evaluate("()=>{const x=DB.days[curDate].items.find(i=>i.tap);const h=edHTML(x,'s');return {chips:(h.match(/data-u=\"[^\"]*\"/g)||[]).join(' '),grams:h.indexOf('mlInlineEq')>=0,own:h.indexOf('Своя мера')>=0}}")
    check("запись в дневнике: 2 капсулы, состав в самой записи", out["meal_items_1"] and out["meal_items_1"][0]["label"] == '2 капсулы' and out["meal_items_1"][0]["k"] == 1000 and out["meal_items_1"][0]["tap"])
    check("Meal 30: строки «Голодание прервано» нет (Астамур 12.11)", not out["meal_fast"])
    check("Meal: съедено 20", out["meal_eaten_1"] and out["meal_eaten_1"].split(' |')[0].strip() == '20')
    # Meal 30: рыбий жир больше 4 ккал сбрасывает окно голодания — для Day это начало приёма пищи
    check("сводка для Day: 20 ккал, приём пищи открыт (окно голодания), «напитков» нет", out["meal_link_1"] and round(out["meal_link_1"]["k"]) == 20 and out["meal_link_1"]["food"] is True and any(s[1] for s in out["meal_link_1"]["secs"]) and all(s[2] == 0 for s in out["meal_link_1"]["secs"]) and out["meal_link_1"]["cs"] == 1)
    check("правка записи: мера «капсула», без граммов и без «Своей меры»", out["meal_editor"] == {"chips": 'data-u="капсула"', "grams": False, "own": False})
    meal.close()

    # ── 5. Sport: подпись без граммов, нажатие — +20 ──
    sport = page_of("sport", SPORT + "index.html")
    sport.wait_for_timeout(5000)
    out["sport_rows"] = sport.evaluate("""()=>[...document.querySelectorAll('#sport-food-counters [data-action="food-plus"][data-shared="true"]')].map(b=>b.closest('.tpItem').innerText.replace(/\\n+/g,' | '))""")
    check("Sport: только рыбий жир, «2 капсулы» без граммов", len(out["sport_rows"]) == 1 and 'Рыбий жир' in out["sport_rows"][0] and '2 капсулы' in out["sport_rows"][0] and ' г' not in out["sport_rows"][0])
    out["sport_eaten_0"] = he(sport, "happy-energy", "съедено")["big"]
    sport.locator(PLUS).first.click()
    sport.wait_for_timeout(300)
    out["sport_eaten_1"] = he(sport, "happy-energy", "съедено")["big"]
    check("Sport: съедено 20 → 40", out["sport_eaten_0"] == '20' and out["sport_eaten_1"] == '40')
    sport.screenshot(path=SHOTS + "meal_supplement_counters-2-sport.png")

    # ── 6. Day: подписи, витамин D калорий не прибавляет, рыбий жир — +20 ──
    day = page_of("day", DAY + "index.html")
    day.wait_for_timeout(6000)
    out["day_taps"] = day.evaluate("()=>DB.taps.filter(c=>c.mealCounterId).map(c=>c.t+' · '+c.mealPortion).sort()")
    check("Day: «2 капсулы» и «1 капсула» без граммов", out["day_taps"] == sorted(['Рыбий жир · 2 капсулы', 'Витамин D3 · 2000 МЕ · 1 капсула']))
    day.evaluate("()=>SelfCare.open('activity')")
    day.wait_for_timeout(1200)
    out["day_eaten_0"] = he(day, "careEnergy", "съедено")["big"]
    day.evaluate("()=>{go('day')}")
    day.wait_for_timeout(400)
    day.evaluate("()=>tapAdd(DB.taps.find(c=>c.mealCounterId&&c.t.indexOf('Витамин')===0).k)")
    day.wait_for_timeout(500)
    day.evaluate("()=>SelfCare.open('activity')")
    day.wait_for_timeout(900)
    out["day_eaten_d3"] = he(day, "careEnergy", "съедено")["big"]
    day.evaluate("()=>{go('day')}")
    day.wait_for_timeout(400)
    day.evaluate("()=>tapAdd(DB.taps.find(c=>c.mealCounterId&&c.t==='Рыбий жир').k)")
    day.wait_for_timeout(500)
    day.evaluate("()=>SelfCare.open('activity')")
    day.wait_for_timeout(900)
    out["day_eaten_fish"] = he(day, "careEnergy", "съедено")["big"]
    day.screenshot(path=SHOTS + "meal_supplement_counters-3-day.png")
    check("Day: съедено 40; витамин D — 40; ещё рыбий жир — 60", [out["day_eaten_0"], out["day_eaten_d3"], out["day_eaten_fish"]] == ['40', '40', '60'])
    seen(sport)
    out["sport_eaten_2"] = he(sport, "happy-energy", "съедено")["big"]
    check("Sport после нажатий в Day: 60", out["sport_eaten_2"] == '60')
    out["doc_before_meal"] = sport.evaluate(DOC)

    # ── 7. Meal открыли: четыре записи, журнал, «Созданные мной», отчёт ──
    meal, _ = meal_open()
    wait_for(meal, lambda: len(meal.evaluate(TODAY_ITEMS)) == 4, 20)
    out["meal_items_2"] = meal.evaluate(TODAY_ITEMS)
    out["meal_eaten_2"] = er(meal, "съедено")["knob"]
    check("Meal: четыре записи со счётчиков (3 × рыбий жир, витамин D), съедено 60 — без удвоения", len(out["meal_items_2"]) == 4 and sorted(x["label"] for x in out["meal_items_2"]) == ['1 капсула', '2 капсулы', '2 капсулы', '2 капсулы'] and out["meal_eaten_2"].split(' |')[0].strip() == '60')
    out["journal"] = meal.evaluate("""()=>{const r={a:curDate,b:curDate},o=jrCompute(r),id=k=>Object.keys(JR_N).find(i=>JR_BLS[i]===k);
      const custom=HappySupplementNutrition.customTotals(r,HappySupplements.getEntries(r).concat(MealSupplementCounters.entries(r))).filter(g=>g.name==='Рыбий жир').map(g=>[g.value,g.unit,g.known]);
      return {epa:o.v[id('epa')],dha:o.v[id('dha')],vD:o.v[id('vD')],k:o.mac.k,sources:o.sources,noBls:o.noBls,supplements:o.supplementCount,custom:custom,html:HappySupplementNutrition.customGroupHTML(r,1).replace(/\\s/g,' ').indexOf('6 000 мг')>=0}}""")
    check("журнал: EPA 1080 мг, DHA 720 мг, витамин D 50 мкг, 60 ккал", out["journal"]["epa"] == 1080 and out["journal"]["dha"] == 720 and out["journal"]["vD"] == 50 and round(out["journal"]["k"]) == 60)
    check("журнал: источник — сохранённая этикетка добавок, «нет полного состава» не появляется", 'Добавки · сохранённая этикетка' in out["journal"]["sources"] and out["journal"]["noBls"] == 0 and out["journal"]["supplements"] == 4)
    check("«Созданные мной»: своё вещество «Рыбий жир» — 6000 мг за шесть капсул", out["journal"]["custom"] == [[6000, 'мг', 3]] and out["journal"]["html"])
    out["report"] = meal.evaluate("""()=>MealReport.records(DB,FOODS,{a:curDate,b:curDate},blsVal).map(r=>({kind:r.kind,name:r.name,grams:r.grams,quantity:r.quantity,unit:r.unit,epa:(r.components||[]).filter(c=>c.substanceId==='epa').map(c=>c.amount)[0]??null,kcal:r.values.kcal}))""")
    check("отчёт: четыре строки добавок без массы; EPA 360 мг на 2 капсулы", len(out["report"]) == 4 and all(r["kind"] == 'supplement' and r["grams"] is None for r in out["report"]) and sorted(r["epa"] for r in out["report"] if r["name"] == 'Рыбий жир') == [360, 360, 360])

    # ── 8. Состав в «Мои добавки» исправили: счётчик после сохранения считает по новому, прежние порции те же ──
    meal.evaluate("""async()=>{await MealSupplementsStore.write(d=>{const v=d.variants.find(v=>v.templateId==='fish-oil');v.components.find(c=>c.substanceId==='kcal').amount=12;v.revision=(v.revision||0)+1})}""")
    meal.wait_for_timeout(500)
    meal.evaluate("()=>editTap(DB.taps.findIndex(c=>c.t==='Рыбий жир'))")
    meal.wait_for_timeout(400)
    out["edit_note"] = meal.evaluate("()=>document.querySelector('#foodCounterEditor .happy-card .happy-note').textContent")
    check("редактор счётчика сообщает, что состав изменился", 'Состав этой добавки изменился' in out["edit_note"])
    meal.click('[data-fc="save"]')
    meal.wait_for_timeout(1500)
    out["doc_after_edit"] = meal.evaluate(DOC)
    fish2 = next((d for d in out["doc_after_edit"]["definitions"] if d["title"] == 'Рыбий жир'), None)
    out["food_rev"] = meal.evaluate("()=>{const f=FOODS[DB.taps.find(c=>c.t==='Рыбий жир').fid];return [f.k,f.supplement.revision]}")
    meal.evaluate("()=>tapAdd(DB.taps.find(c=>c.t==='Рыбий жир').k)")
    meal.wait_for_timeout(1200)
    out["meal_items_3"] = meal.evaluate(TODAY_ITEMS)
    out["meal_eaten_3"] = er(meal, "съедено")["knob"]
    check("после сохранения: 12 ккал на капсулу в описании и в библиотеке", fish2 and fish2["k"] == 1200 and fish2["rev"] == 2 and out["food_rev"] == [1200, 2])
    check("новое нажатие — 24 ккал, прежние порции не пересчитаны: 84", sorted(x["k"] for x in out["meal_items_3"] if x["fid"] == fish2["fid"]) == [1000, 1000, 1000, 1200] and out["meal_eaten_3"].split(' |')[0].strip() == '84')
    meal.close()
    seen(day)
    day.evaluate("()=>SelfCare.open('activity')")
    day.wait_for_timeout(900)
    out["day_eaten_final"] = he(day, "careEnergy", "съедено")["big"]
    check("Day в конце: 84", out["day_eaten_final"] == '84')

    # ── 9. Прежний выпуск Meal 28 на том же телефоне: открывается без ошибок, видит порции; Meal 29 после него — тот же журнал ──
    m28 = page_of("meal-28", "meal-28/index.html")
    m28.wait_for_timeout(6000)
    out["meal28"] = m28.evaluate("()=>({items:(DB.days[curDate]&&DB.days[curDate].items||[]).length,k:Math.round((DB.days[curDate].items||[]).reduce((a,x)=>{const f=MealProducts.forItem(x,FOODS,DB);return a+(f&&f.k?f.k*x.g/100:0)},0))})")
    check("Meal 28 открывает те же пять порций со счётчиков, 84 ккал", out["meal28"] == {"items": 5, "k": 84})
    m28.close()
    meal, _ = meal_open()
    out["journal_after_28"] = meal.evaluate("()=>{const o=jrCompute({a:curDate,b:curDate}),id=k=>Object.keys(JR_N).find(i=>JR_BLS[i]===k);return {epa:o.v[id('epa')],vD:o.v[id('vD')],k:Math.round(o.mac.k),inList:LIST.filter(f=>f.supplement).length}}")
    check("Meal 29 после Meal 28: EPA 1440 мг, витамин D 50 мкг, 84 ккал; добавки по-прежнему не в поиске еды", out["journal_after_28"] == {"epa": 1440, "vD": 50, "k": 84, "inList": 0})
    meal.close()

    out["server_requests_by_guest"] = requests
    out["errors"] = errors
    b.close()

check("гость ничего не спрашивал у сервера", out["server_requests_by_guest"] == [])
check("ошибок на страницах нет", out["errors"] == [])
sys.exit(finish("meal_supplement_counters", out, checks))
