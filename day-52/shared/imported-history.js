/* Read-only source history: daily summaries must not become invented food nutrients. */
(function(root){
  'use strict';
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function value(v){return v==null||String(v).trim()===''?'—':esc(v)}
  function meal(history,date){
    var n=history&&history.nutrition;if(!n)return '';
    var daily=Array.isArray(n.daily)?n.daily:[],rows=Array.isArray(n.servings)?n.servings:[];
    var d=daily.find(x=>x.Date===date),foods=rows.filter(x=>x.Day===date);
    if(!d&&!foods.length)return '';
    var html='<article class="happy-card" style="margin:16px 0"><h2 class="happy-heading">Из Cronometer · '+esc(date)+'</h2>';
    html+='<p class="happy-note">История из файла. Показана отдельно от записей Happy Meal и не прибавляется к ним повторно.</p>';
    if(d){
      html+='<p style="line-height:1.7"><b>'+value(d['Energy (kcal)'])+' ккал</b><br>Белки '+value(d['Protein (g)'])+' г · Жиры '+value(d['Fat (g)'])+' г · Углеводы '+value(d['Carbs (g)'])+' г</p>';
      html+='<details><summary>Все показатели дня</summary><table style="width:100%;font-size:13px;border-collapse:collapse"><tbody>';
      Object.keys(d).filter(k=>k!=='Date'&&k!=='Completed').forEach(k=>{html+='<tr><th style="text-align:left;font-weight:500;padding:6px 8px 6px 0">'+esc(k)+'</th><td style="text-align:right">'+value(d[k])+'</td></tr>'});
      html+='</tbody></table></details>';
    }
    if(foods.length){html+='<details style="margin-top:12px"><summary>Записи питания · '+foods.length+'</summary><ul style="padding-left:20px;line-height:1.6">';
      foods.forEach(x=>{html+='<li><b>'+esc(x['Food Name'])+'</b><br>'+esc(x.Amount)+' · '+esc(x.Group)+(x.Time?' · '+esc(x.Time):'')+'</li>'});
      html+='</ul><p class="happy-note">В исходном списке нет нутриентов отдельных порций. Пустые значения означают отсутствие данных.</p></details>';
    }
    return html+'</article>';
  }
  root.HappyHistory={meal:meal};
})(globalThis);
