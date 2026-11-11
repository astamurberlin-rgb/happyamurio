"""Один телефон: Sport, Meal и Day в одном браузере под одним аккаунтом (поддельный сервер). Приложения не должны
перезаписывать сводку тренировок друг у друга по кругу и качать её лишний раз."""
from common import *

out={};errors=[]
HOOK="""(()=>{const key='happy-user:'+encodeURIComponent('%s')+':hd_link_sport_v1';const orig=Storage.prototype.setItem;window.__sportKeyWrites=[];Storage.prototype.setItem=function(k,v){if(k===key)window.__sportKeyWrites.push({at:Date.now(),len:String(v).length});return orig.apply(this,arguments)}})()"""%UID
with sync_playwright() as p:
    b=launch(p)
    ctx=b.new_context(viewport={"width":393,"height":852},device_scale_factor=2,locale="ru-RU",timezone_id="Europe/Moscow")
    ctx.route(BACKEND+"/**",lambda r,q:handle(r,q,'phone'))
    ctx.add_init_script(HOOK)
    def page_of(name,path):
        page=ctx.new_page();page.on("pageerror",lambda e:errors.append(name+": "+str(e)[:300]));page.goto(BASE+path);return page
    sport=page_of("sport","sport-40/index.html");sport.wait_for_timeout(4500)
    sport.query_selector_all(".tab")[-1].click();sport.wait_for_timeout(800)
    sport.fill('#happy-account input[type="email"]',EMAIL);sport.fill('#happy-account input[name="password"]',PW);sport.click('#happy-account [data-happy="in"]');sport.wait_for_timeout(9000)
    sport.evaluate("""()=>{const d=selectedDate;state.workouts.push({id:'local-phone-1',timeZone:'Europe/Moscow',title:'Проверка',kind:'gym',icon:null,start:d+'T10:00:00',end:d+'T10:30:00',duration:1800,notes:'',source:'Моя запись',demo:false,exercises:[],warnings:[]});persist();render()}""")
    out["summary_uploaded"]=bool(wait_for(sport,lambda:(UID,"sport","link") in rows,40))
    meal=page_of("meal","meal-28/index.html");meal.wait_for_timeout(5000)
    meal.evaluate("()=>go('settings')");meal.wait_for_timeout(700);meal.fill("#clEmail",EMAIL);meal.fill("#clPw",PW);meal.click('#clBox [data-cl="in"]');meal.wait_for_timeout(11000)
    meal.evaluate("()=>go('day')");meal.wait_for_timeout(600)
    out["meal_spent"]=er(meal,"потрачено")["rows"][-1]
    meal.evaluate("()=>{day(curDate).items.push({id:'i'+HappyFoodCounters.id(),sec:'am',fid:'egg',q:2,u:'шт',g:110,t:nowHM()});save();renderDay()}");meal.wait_for_timeout(1500)
    day=page_of("day","day-57/index.html");day.wait_for_timeout(5500)
    day.evaluate("()=>go('settings')");day.wait_for_timeout(900);day.fill("#clBox #clEmail",EMAIL);day.fill("#clBox #clPw",PW);day.click('#clBox [data-cl="in"]');day.wait_for_timeout(12000)
    day.evaluate("()=>SelfCare.open('activity')");day.wait_for_timeout(2500)
    out["day_spent"]=he(day,"careEnergy","потрачено")["rows"][-1];out["day_eaten"]=he(day,"careEnergy","съедено")["big"]
    # походить между приложениями: каждое «стало видимым» несколько раз, Sport сохраняет журнал
    mark=len(log)
    for i in range(4):
        for pg in (sport,meal,day):
            pg.bring_to_front();pg.evaluate("()=>document.dispatchEvent(new Event('visibilitychange'))");pg.wait_for_timeout(1800)
        sport.evaluate("()=>{persist()}")
    sport.wait_for_timeout(6000)
    out["sport_eaten"]=he(sport,"happy-energy","съедено")["big"]
    key_writes={}
    for name,pg in (("sport",sport),("meal",meal),("day",day)):
        key_writes[name]=pg.evaluate("()=>window.__sportKeyWrites.length")
    out["writes_of_summary_key_per_page"]=key_writes
    tail=log[mark:]
    out["after_settling"]={"sport_link_full_reads":len([r for r in tail if r["method"]=="GET" and "kind=eq.link" in r["query"] and "app=eq.sport" in r["query"] and "select=v" in r["query"]]),
      "sport_link_time_reads":len([r for r in tail if r["method"]=="GET" and "app=eq.sport&kind=eq.link" in r["query"] and r["query"].startswith("select=at")]),
      "sport_link_writes":len([r for r in tail if r["method"] in("POST","PATCH") and r.get("kind")=="sport/link"]),
      "meal_link_full_reads":len([r for r in tail if r["method"]=="GET" and "app=eq.meal&kind=eq.link" in r["query"] and "select=v" in r["query"]])}
    out["total_sport_link_writes"]=len([r for r in log if r["method"] in("POST","PATCH") and r.get("kind")=="sport/link"])
    out["local_copy"]=sport.evaluate("()=>{const o=JSON.parse(localStorage.getItem(sportLinkKey()));return {owner:o.owner===SportProfiles.owner,records:o.records.filter(r=>!r.deleted).length}}")
    out["errors"]=errors
    b.close()
settled = out["after_settling"]
checks = [
 ("Sport записал сводку тренировок в облако", out["summary_uploaded"]),
 ("Meal показывает время тренировки", "Время, мин 30" in out["meal_spent"]),
 ("Day показывает время тренировки и съеденное из Meal", "Время: 30 мин" in out["day_spent"] and out["day_eaten"] == "149"),
 ("Sport показывает съеденное из Meal", out["sport_eaten"] == "149"),
 ("после хождения между приложениями сводку никто не скачивал заново и не переписывал", settled["sport_link_full_reads"] == 0 and settled["sport_link_writes"] == 0 and settled["meal_link_full_reads"] == 0),
 ("сводка тренировок записана в облако один раз", out["total_sport_link_writes"] == 1),
 ("на устройстве лежит сводка своего аккаунта с одной тренировкой", out["local_copy"] == {"owner": True, "records": 1}),
 ("ошибок на страницах нет", out["errors"] == []),
]
sys.exit(finish("summaries_one_phone", out, checks))
