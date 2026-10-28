/* Local nutrition exports. No diary records are uploaded by this module. */
(function(root){
  'use strict';
  // Units in meal-data/bls40.json (some BLS units were converted when that file was built).
  var CATALOG=[
    ['kcal','Калории','ккал','main'],['prot','Белки','г','main'],['fat','Жиры','г','main'],['carb','Углеводы','г','main'],
    ['fib','Клетчатка','г','carb'],['water','Вода','г','etc'],['alc','Алкоголь','г','etc'],['salt','Соль','г','min'],
    ['vA','Витамин A','мкг','vit'],['vD','Витамин D','мкг','vit'],['vE','Витамин E','мг','vit'],['vK','Витамин K','мкг','vit'],
    ['b1','B1 — тиамин','мг','vit'],['b2','B2 — рибофлавин','мг','vit'],['b3','B3 — ниацин','мг','vit'],['b5','B5 — пантотеновая кислота','мг','vit'],['b6','Витамин B6','мг','vit'],['b7','B7 — биотин','мкг','vit'],['b9','B9 — фолат','мкг','vit'],['b12','Витамин B12','мкг','vit'],['vC','Витамин C','мг','vit'],
    ['ca','Кальций','мг','min'],['p','Фосфор','мг','min'],['mg','Магний','мг','min'],['k','Калий','мг','min'],['na','Натрий','мг','min'],['cl','Хлорид','мг','min'],['fe','Железо','мг','min'],['zn','Цинк','мг','min'],['cu','Медь','мг','min'],['mn','Марганец','мг','min'],['fl','Фтор','мг','min'],['i','Йод','мкг','min'],['mo','Молибден','мкг','min'],['cr','Хром','мкг','min'],
    ['his','Гистидин','г','aa'],['ile','Изолейцин','г','aa'],['leu','Лейцин','г','aa'],['lys','Лизин','г','aa'],['met_','Метионин','г','aa'],['cys_','Цистеин','г','aa'],['phe_','Фенилаланин','г','aa'],['tyr_','Тирозин','г','aa'],['thr','Треонин','г','aa'],['trp','Триптофан','г','aa'],['val','Валин','г','aa'],['ala','Аланин','г','aa'],['arg','Аргинин','г','aa'],['asp','Аспарагиновая кислота','г','aa'],['glu','Глутаминовая кислота','г','aa'],['gly','Глицин','г','aa'],['pro','Пролин','г','aa'],['ser','Серин','г','aa'],
    ['sfa','Насыщенные жирные кислоты','г','fat'],['mufa','Мононенасыщенные жирные кислоты','г','fat'],['pufa','Полиненасыщенные жирные кислоты','г','fat'],['n3','Омега-3, всего','г','fat'],['n6','Омега-6, всего','г','fat'],['la','Линолевая кислота (омега-6)','г','fat'],['ala3','Альфа-линоленовая кислота (омега-3)','г','fat'],['epa','ЭПК (EPA)','мг','fat'],['dpa','ДПК (DPA)','мг','fat'],['dha','ДГК (DHA)','мг','fat'],['chol','Холестерин','мг','fat'],
    ['sug','Сахара, всего','г','carb'],['suc','Сахароза','г','carb'],['lac','Лактоза','г','carb'],['fru','Фруктоза','г','carb'],['glc','Глюкоза','г','carb'],['gal','Галактоза','г','carb'],['mal','Мальтоза','г','carb'],['sta','Крахмал','г','carb'],['fbs','Клетчатка растворимая','г','carb'],['fbi','Клетчатка нерастворимая','г','carb'],['bcar','Бета-каротин','мг','phy'],['carx','Каротиноиды, кроме бета-каротина','мг','phy']
  ];
  var GROUPS=[['vit','Витамины'],['min','Минералы'],['aa','Аминокислоты'],['fat','Жирные кислоты и холестерин'],['carb','Сахара, крахмал и клетчатка'],['phy','Каротиноиды'],['etc','Вода и алкоголь']];
  function finite(x){return typeof x==='number'&&Number.isFinite(x)?x:null}
  function fields(keys){
    var out=CATALOG.map(function(x){return {key:x[0],title:x[1],unit:x[2],group:x[3]}}),known={};
    out.forEach(function(x){known[x.key]=1});
    (keys||[]).forEach(function(k){if(!known[k])out.push({key:k,title:k,unit:'ед. базы',group:'etc'})});
    return out;
  }
  function validDate(s){var d=new Date(s+'T12:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s}
  function copyRange(r){return {a:r.a,b:r.b}}
  function calendarDays(month,today){
    if(!/^\d{4}-\d{2}$/.test(month)||!validDate(month+'-01'))throw new Error('Неверный месяц');
    var first=new Date(month+'-01T12:00:00Z'),offset=(first.getUTCDay()+6)%7,count=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate(),days=[];
    for(var i=0;i<offset;i++)days.push(null);
    for(var day=1;day<=count;day++){var iso=month+'-'+String(day).padStart(2,'0');days.push({date:iso,day:day,disabled:iso>today})}
    while(days.length%7)days.push(null);return days;
  }
  function pickDate(r,date,edge){
    if(!validDate(date))throw new Error('Неверная дата');
    if(edge==='a')return {a:date,b:r.b<date?date:r.b,edge:'b'};
    return date<r.a?{a:date,b:r.a,edge:'b'}:{a:r.a,b:date,edge:'b'};
  }
  function records(db,foods,range,readValue,keys){
    if(!validDate(range.a)||!validDate(range.b)||range.a>range.b)throw new Error('Проверь начало и конец периода');
    var fs=fields(keys),names={},out=[],macro={kcal:'k',prot:'p',fat:'f',carb:'c'};
    (db.sections||[]).forEach(function(s){names[s.k]=s.t});
    Object.keys(db.days||{}).filter(function(d){return d>=range.a&&d<=range.b}).sort().forEach(function(d){
      ((db.days[d]||{}).items||[]).forEach(function(item,index){
        var food=foods[item.fid],grams=finite(item.g),values={};
        fs.forEach(function(f){
          var v=null;
          if(food){v=macro[f.key]?finite(food[macro[f.key]]):food.b?finite(readValue(food.b,f.key)):null}
          values[f.key]=v==null||grams==null?null:v*grams/100;
        });
        out.push({date:d,section:names[item.sec]||item.sec||'Без раздела',sectionKey:item.sec||'',id:item.id||'',foodId:item.fid||'',name:food?food.n:(item.name||item.fid||'Неизвестный продукт'),grams:grams,quantity:finite(item.q),unit:item.u||'',time:/^([01]\d|2[0-3]):[0-5]\d$/.test(item.t||'')?item.t:'',manual:!!item.tm,source:food?(food.src||''):'нет данных',nutrientSource:food&&food.b?(String(food.b).charAt(0)==='Z'?'Happy Meal · Кавказская кухня':'BLS 4.0'):'нет данных',code:food&&food.b||'',values:values,index:index});
      });
    });
    return out.sort(function(a,b){return a.date.localeCompare(b.date)||(a.time||'99:99').localeCompare(b.time||'99:99')||a.index-b.index});
  }
  function aggregate(rows,fs){
    var out={};fs.forEach(function(f){var sum=0,known=0;rows.forEach(function(r){var n=finite(r.values[f.key]);if(n!=null){sum+=n;known++}});out[f.key]={value:known?sum:null,known:known,total:rows.length}});return out;
  }
  function csvCell(value){
    if(value==null)return '';
    var s=typeof value==='number'?String(Math.round(value*1e6)/1e6).replace('.',','):String(value);
    if(typeof value!=='number'&&/^[\s]*[=+@\-]/.test(s))s="'"+s;
    return /[;"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
  }
  function csv(rows,fs){
    var columns=['Дата','Приём пищи','Продукт','Масса, г','Количество','Мера','Время','Время вручную','Источник калорий и БЖУ','Источник остальных нутриентов','Код состава','ID записи','ID продукта'].concat(fs.map(function(f){return f.title+', '+f.unit+' ['+f.key+']'}));
    return '\uFEFF'+[columns.map(csvCell).join(';')].concat(rows.map(function(r){return [r.date,r.section,r.name,r.grams,r.quantity,r.unit,r.time,r.manual?'да':'нет',r.source,r.nutrientSource,r.code,r.id,r.foodId].concat(fs.map(function(f){return r.values[f.key]})).map(csvCell).join(';')})).join('\r\n')+'\r\n';
  }
  function wrap(text,max){
    var out=[],line='';String(text).split(/\s+/).forEach(function(word){
      while(word.length>max){if(line){out.push(line);line=''}out.push(word.slice(0,max));word=word.slice(max)}
      if(line.length+word.length+1>max){out.push(line);line=word}else line+=(line?' ':'')+word;
    });if(line)out.push(line);return out.length?out:[''];
  }
  function reportPages(rows,fs,options){
    var pages=[[]],y=270,totals=aggregate(rows,fs),days=new Set(rows.map(function(r){return r.date})).size;
    function add(block,height){
      if(y+height+(block.kind==='heading'?140:0)>1560){pages.push([]);y=270;
        if(block.kind==='food'){add({kind:'heading',title:block.row.date+' · '+block.row.section+' (продолжение)'},82)}
        else if(block.kind==='nutrient'){var group=GROUPS.filter(function(g){return g[0]===block.field.group})[0];add({kind:'heading',title:(group?group[1]:'Состав')+' (продолжение)'},82)}
      }
      block.y=y;block.h=height;pages[pages.length-1].push(block);y+=height;
    }
    if(options.widget)add({kind:'widget'},700);
    if(options.summary)add({kind:'summary',totals:totals,days:days,count:rows.length,energy:options.energy,macros:options.macros},options.macros?286:200);
    if(options.foods){
      var last='';rows.forEach(function(r){
        var title=r.date+' · '+r.section;if(title!==last){add({kind:'heading',title:title},82);last=title}
        var lines=wrap(r.name,55);add({kind:'food',row:r,lines:lines,energy:options.energy,macros:options.macros,time:options.time},lines.length*35+74+(options.macros?38:0));
      });
    }
    GROUPS.forEach(function(g){if(!options.groups[g[0]])return;var list=fs.filter(function(f){return f.group===g[0]});
      add({kind:'heading',title:g[1]+' · итоги за период'},82);
      list.forEach(function(f){var lines=wrap(f.title,42);add({kind:'nutrient',field:f,lines:lines,total:totals[f.key]},Math.max(62,lines.length*32+20))});
    });
    return pages;
  }
  // Small image-based PDF writer: one A4 page per JPEG; byte offsets use the actual buffers.
  function pdf(jpegs,width,height){
    var parts=[],offsets=[0],length=0,encoder=new TextEncoder();
    function put(value){var b=typeof value==='string'?encoder.encode(value):value;parts.push(b);length+=b.byteLength}
    function object(id,body){offsets[id]=length;put(id+' 0 obj\n');put(body);put('\nendobj\n')}
    put('%PDF-1.4\n');object(1,'<< /Type /Catalog /Pages 2 0 R >>');
    object(2,'<< /Type /Pages /Count '+jpegs.length+' /Kids ['+jpegs.map(function(_,i){return (3+i*3)+' 0 R'}).join(' ')+'] >>');
    jpegs.forEach(function(bytes,i){var page=3+i*3,image=page+1,stream=page+2;
      object(page,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 '+image+' 0 R >> >> /Contents '+stream+' 0 R >>');
      offsets[image]=length;put(image+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+width+' /Height '+height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+bytes.byteLength+' >>\nstream\n');put(bytes);put('\nendstream\nendobj\n');
      var commands='q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n';object(stream,'<< /Length '+encoder.encode(commands).length+' >>\nstream\n'+commands+'endstream');
    });
    var xref=length;put('xref\n0 '+offsets.length+'\n0000000000 65535 f \n');for(var i=1;i<offsets.length;i++)put(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
    put('trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');return new Blob(parts,{type:'application/pdf'});
  }
  var model={fields:fields,records:records,aggregate:aggregate,csv:csv,wrap:wrap,reportPages:reportPages,pdf:pdf,groups:GROUPS,copyRange:copyRange,calendarDays:calendarDays,pickDate:pickDate};
  root.MealReport=model;
  if(!root.document)return;

  var doc=root.document,state={pages:[],urls:[],pdf:null,index:0,job:0,prior:null,range:null,options:null,files:{},outside:[]},overlay=null;
  function el(id){return doc.getElementById(id)}
  function escape(s){return root.escH(String(s))}
  function fmt(n){return n==null?'—':new Intl.NumberFormat('ru-RU',{maximumFractionDigits:3}).format(n)}
  function status(text){el('mrStatus').textContent=text}
  function currentRows(range){return records(root.DB,root.FOODS,range,root.blsVal,root.BLS&&root.BLS.keys)}
  function currentFields(){return fields(root.BLS&&root.BLS.keys)}
  function range(){return copyRange(state.range||root.jrRange())}
  function selected(){var o={groups:{}};['widget','summary','foods','time','energy','macros'].forEach(function(k){o[k]=el('mr-'+k).checked});GROUPS.forEach(function(g){o.groups[g[0]]=el('mr-'+g[0]).checked});return o}
  function fileLink(id,name,blob){if(state.files[id])URL.revokeObjectURL(state.files[id]);state.files[id]=null;var a=el(id);a.removeAttribute('href');a.removeAttribute('download');a.setAttribute('aria-disabled','true');if(!blob)return;var url=URL.createObjectURL(id==='mrPdf'?new Blob([blob],{type:'application/octet-stream'}):blob);state.files[id]=url;a.href=url;if(id!=='mrPdfView')a.download=name;a.removeAttribute('aria-disabled')}
  function clearOutput(){state.job++;state.pages=[];state.pdf=null;state.urls.forEach(URL.revokeObjectURL);state.urls=[];['mrPdf','mrPdfView','mrPng'].forEach(function(id){fileLink(id,'',null)});el('mrPreview').hidden=true;el('mrActions').hidden=true;el('mrPageImage').removeAttribute('src');el('mrPrintPages').replaceChildren()}
  function ensure(){
    if(overlay)return;
    overlay=doc.createElement('section');overlay.id='mealReport';overlay.className='meal-report';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','mrTitle');
    overlay.innerHTML='<div class="mr-shell"><header class="mr-head"><div><small>Happy Meal</small><h1 id="mrTitle">Отчёт о питании</h1></div><button class="happy-button" id="mrClose">Закрыть</button></header>'+
      '<div id="mrConfig"><p class="mr-fixed-period" id="mrPeriod"></p>'+
      '<section class="happy-card"><h2>Включить в отчёт</h2><div class="mr-checks">'+[['widget','Виджет как в журнале',true],['summary','Итоги за период',true],['foods','Продукты и граммовки',true],['time','Время записей',true],['energy','Калории',true],['macros','Белки, жиры, углеводы',true]].map(function(x){return '<label><input id="mr-'+x[0]+'" type="checkbox"'+(x[2]?' checked':'')+'>'+x[1]+'</label>'}).join('')+'</div><div class="mr-nutrients"><h3>Нутриенты</h3><label><input id="mrAllNutrients" type="checkbox">Выбрать все нутриенты</label><div class="mr-checks">'+GROUPS.map(function(g){return '<label><input id="mr-'+g[0]+'" type="checkbox">'+g[1]+'</label>'}).join('')+'</div></div></section>'+
      '<p class="happy-note">В отчёт и печать попадут только отмеченные данные за период журнала. Изменить период можно в журнале. Файлы формируются на устройстве.</p>'+
      '<div class="happy-actions"><button class="happy-button primary" id="mrBuild">Подготовить отчёт</button></div></div>'+
      '<p class="happy-note" role="status" id="mrStatus"></p><section id="mrPreview" hidden><div class="mr-page-nav"><button class="happy-button" id="mrPrev" aria-label="Предыдущая страница">←</button><span id="mrPageCount"></span><button class="happy-button" id="mrNext" aria-label="Следующая страница">→</button></div><img id="mrPageImage" alt="Предпросмотр отчёта о питании"></section>'+
      '<div id="mrActions" class="happy-actions" hidden><a class="happy-button primary" id="mrPdf">Сохранить PDF</a><a class="happy-button" id="mrPdfView" target="_blank" rel="noopener">Открыть PDF</a><a class="happy-button" id="mrPng" aria-disabled="true">PNG этой страницы</a><button class="happy-button" id="mrPrint">Печать</button><button class="happy-button" id="mrShare">Отправить PDF</button></div></div>';
    doc.body.appendChild(overlay);var print=doc.createElement('div');print.id='mrPrintPages';doc.body.appendChild(print);
    el('mrClose').onclick=close;
    el('mrAllNutrients').onchange=function(){var checked=this.checked;GROUPS.forEach(function(g){el('mr-'+g[0]).checked=checked});clearOutput();status('')};
    overlay.addEventListener('change',function(e){if(e.target.id==='mrAllNutrients')return;clearOutput();status('');var n=GROUPS.filter(function(g){return el('mr-'+g[0]).checked}).length;el('mrAllNutrients').checked=n===GROUPS.length;el('mrAllNutrients').indeterminate=n>0&&n<GROUPS.length});
    overlay.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();close()}else if(e.key==='Tab'){var nodes=Array.from(overlay.querySelectorAll('button,input,a[href]')).filter(function(x){return !x.disabled&&x.getClientRects().length}),first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&doc.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&doc.activeElement===last){e.preventDefault();first.focus()}}});
    el('mrBuild').onclick=build;
    el('mrPrev').onclick=function(){showPage(state.index-1)};el('mrNext').onclick=function(){showPage(state.index+1)};
    el('mrShare').onclick=sharePdf;el('mrPrint').onclick=printReport;
  }
  function open(mode){if(!doc.querySelector('[data-screen="journal"].on'))root.go('journal');doc.dispatchEvent(new Event('happy-show-journal'));state.widgetReady=root.mealWidgetImage();ensure();state.mode=mode==='print'?'print':'report';state.prior=doc.activeElement;clearOutput();state.range=copyRange(root.jrRange());el('mrTitle').textContent=state.mode==='print'?'Печать отчёта':'Отчёт о питании';el('mrBuild').textContent=state.mode==='print'?'Печатать выбранные данные':'Подготовить отчёт';el('mrPeriod').textContent='Период журнала: '+root.jrRangeTxt(state.range);status('');overlay.hidden=false;state.outside=Array.from(doc.body.children).filter(function(n){return n!==overlay&&n.id!=='mrPrintPages'}).map(function(n){var was=n.inert;n.inert=true;return [n,was]});doc.body.classList.add('meal-report-open');el('mrClose').focus()}
  function close(){clearOutput();overlay.hidden=true;state.outside.forEach(function(x){x[0].inert=x[1]});state.outside=[];doc.body.classList.remove('meal-report-open');if(state.prior&&doc.contains(state.prior))state.prior.focus()}
  function stem(){var r=state.range||range();return 'happy-meal-'+r.a+(r.a===r.b?'':'_'+r.b)}
  async function prepareJournalCsv(){
    var job=state.csvJob=(state.csvJob||0)+1,r=copyRange(root.jrRange());fileLink('mealCsvExport','',null);
    function say(text){el('mealExportStatus').textContent=text}
    try{
      var tries=0;while(root.BLS_ST==='loading'||root.BLS_ST==='idle'){if(job!==state.csvJob)return;if(tries++>100)throw new Error('База состава ещё загружается. Повтори выбор периода через несколько секунд.');say('Загружается база состава для CSV…');await new Promise(function(resolve){setTimeout(resolve,100)})}
      if(job!==state.csvJob)return;var rows=currentRows(r);if(!rows.length){say('За выбранный период нет записей для CSV');return}var fs=currentFields(),link=el('mealCsvExport');fileLink('mealCsvExport','happy-meal-'+r.a+'_'+r.b+'.csv',new Blob([csv(rows,fs)],{type:'text/csv;charset=utf-8'}));link.dataset.from=r.a;link.dataset.to=r.b;link.title='Все продукты и нутриенты: '+root.jrRangeTxt(r);say('CSV за выбранный период: '+rows.length+' записей. Пустая ячейка — нет данных.'+(root.BLS_ST!=='ok'?' База недоступна: только сохранённые калории и БЖУ.':''));
    }catch(e){if(job===state.csvJob)say(e.message)}
  }
  var W=1240,H=1754;
  function roundRect(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
  function renderPage(blocks,index,count,r){
    var cv=doc.createElement('canvas');cv.width=W;cv.height=H;var c=cv.getContext('2d');
    c.fillStyle='#fbf7f6';c.fillRect(0,0,W,H);
    function text(value,x,y,size,weight,color,align){c.font=(weight||500)+' '+size+'px system-ui,-apple-system,"Segoe UI",sans-serif';c.fillStyle=color||'#382b35';c.textAlign=align||'left';c.fillText(String(value),x,y)}
    function card(y,h,color){roundRect(c,64,y,1112,h,22);c.fillStyle=color||'#fff';c.fill()}
    var g=c.createLinearGradient(0,0,W,220);g.addColorStop(0,'#702c4d');g.addColorStop(1,'#ad4a6a');c.fillStyle=g;c.fillRect(0,0,W,222);
    text('HAPPY MEAL',72,65,25,700,'#f3dce5');text('Питание',72,130,52,750,'#fff');
    text(r.a===r.b?r.a:r.a+' — '+r.b,72,183,28,500,'#fff');
    text('ЛИЧНЫЙ ОТЧЁТ',W-72,65,22,600,'#f3dce5','right');
    blocks.forEach(function(b){var y=b.y;
      if(b.kind==='widget'){if(state.widgetImage){var im=state.widgetImage,ww=1050,hh=ww*im.height/im.width;if(hh>650){hh=650;ww=hh*im.width/im.height}c.drawImage(im,(W-ww)/2,y+15,ww,hh)}return}
      if(b.kind==='heading'){text(b.title,76,y+52,29,700,'#77334f');return}
      if(b.kind==='summary'){
        card(y,b.h-16,'#eee3e8');text('ИТОГИ ЗА ПЕРИОД',92,y+46,22,700,'#77334f');
        var kcal=b.totals.kcal;
        text(b.energy?fmt(kcal.value)+' ккал':b.count+' записей',92,y+116,52,750);text(b.days+' дн. с записями · '+b.count+' продуктов и порций',92,y+157,24,500,'#6b5a66');
        if(b.macros){[['prot','Белки'],['fat','Жиры'],['carb','Углеводы']].forEach(function(x,i){var t=b.totals[x[0]],xx=92+i*350;text(x[1],xx,y+210,24,500,'#6b5a66');text(fmt(t.value)+' г'+(t.known<t.total?' *':''),xx,y+250,31,700)})}
        return;
      }
      if(b.kind==='food'){
        card(y,b.h-8);b.lines.forEach(function(line,i){text(line,92,y+39+i*35,29,650)});
        var yy=y+b.lines.length*35+36,row=b.row,meta=(b.time?(row.time||'время не указано')+' · ':'')+fmt(row.grams)+' г';
        text(meta,92,yy,25,500,'#756573');if(b.energy)text(fmt(row.values.kcal)+' ккал',1146,yy,26,700,'#77334f','right');
        if(b.macros)text('Б '+fmt(row.values.prot)+' г    Ж '+fmt(row.values.fat)+' г    У '+fmt(row.values.carb)+' г',92,yy+37,24,500,'#756573');return;
      }
      if(b.kind==='nutrient'){
        card(y,b.h-4);b.lines.forEach(function(line,i){text(line,92,y+36+i*32,25,500)});
        text(fmt(b.total.value)+' '+b.field.unit,1040,y+37,27,650,'#382b35','right');
        text(b.total.known+'/'+b.total.total,1146,y+37,21,500,b.total.known<b.total.total?'#a05b36':'#84727e','right');
      }
    });
    c.fillStyle='#d9ccd2';c.fillRect(72,1596,W-144,2);
    text('Итоги за период, не среднее за день. — нет данных; 1/3 — состав известен у 1 из 3 записей.',72,1636,20,500,'#796674');
    text('Частичные суммы могут быть неполными. BLS 4.0 · Max Rubner-Institut (2025); Happy Meal.',72,1667,20,500,'#796674');
    text('Happy Meal',72,1710,20,600,'#77334f');text((index+1)+' / '+count,W-72,1710,20,600,'#77334f','right');return cv;
  }
  function canvasBlob(cv,type,quality){return new Promise(function(resolve,reject){cv.toBlob(function(blob){blob?resolve(blob):reject(new Error('Не удалось собрать изображение'))},type,quality)})}
  async function build(){
    clearOutput();var job=state.job;el('mrBuild').disabled=true;
    try{
      var r=range(),rows=currentRows(r),o=selected();if(!rows.length)throw new Error('За этот период нет записей. Пример из журнала не выгружается.');
      if(!o.widget&&!o.summary&&!o.foods&&!GROUPS.some(function(g){return o.groups[g[0]]}))throw new Error('Отметь итоги, продукты или группу нутриентов');
      if(root.BLS_ST!=='ok'&&GROUPS.some(function(g){return o.groups[g[0]]}))throw new Error('Дождись загрузки базы состава для отчёта с нутриентами');
      state.widgetImage=o.widget?await state.widgetReady:null;if(o.widget&&!state.widgetImage)throw new Error('Не удалось подготовить виджет. Открой журнал и повтори.');if(job!==state.job)return;var pages=reportPages(rows,currentFields(),o),images=[];state.range=r;state.options=o;
      for(var i=0;i<pages.length;i++){
        if(job!==state.job)return;status('Готовлю страницу '+(i+1)+' из '+pages.length+'…');
        var cv=renderPage(pages[i],i,pages.length,r),blob=await canvasBlob(cv,'image/jpeg',.93),bytes=new Uint8Array(await blob.arrayBuffer());cv.width=0;cv.height=0;
        if(job!==state.job)return;images.push(bytes);state.urls.push(URL.createObjectURL(blob));await new Promise(function(resolve){setTimeout(resolve,0)});
      }
      if(job!==state.job)return;state.pages=pages;state.pdf=pdf(images,W,H);fileLink('mrPdf',stem()+'.pdf',state.pdf);fileLink('mrPdfView','',state.pdf);showPage(0);el('mrActions').hidden=false;el('mrShare').hidden=!navigator.share;status('Отчёт готов. '+pages.length+' стр. PNG сохраняет открытую страницу, PDF — весь отчёт.');if(state.mode==='print')await printReport();
    }catch(e){if(job===state.job)status(e.message||'Не удалось подготовить отчёт')}finally{el('mrBuild').disabled=false}
  }
  function showPage(index){if(!state.pages.length)return;state.index=Math.max(0,Math.min(index,state.pages.length-1));el('mrPageImage').src=state.urls[state.index];el('mrPageImage').alt='Отчёт о питании, страница '+(state.index+1)+' из '+state.pages.length;el('mrPageCount').textContent=(state.index+1)+' / '+state.pages.length;el('mrPrev').disabled=state.index===0;el('mrNext').disabled=state.index===state.pages.length-1;el('mrPreview').hidden=false;preparePng()}
  async function preparePng(){var job=state.job,index=state.index;fileLink('mrPng','',null);try{if(!state.pages.length)return;var cv=renderPage(state.pages[index],index,state.pages.length,state.range),blob=await canvasBlob(cv,'image/png');cv.width=0;cv.height=0;if(job===state.job&&index===state.index)fileLink('mrPng',stem()+'-page-'+(index+1)+'.png',blob)}catch(e){if(job===state.job)status(e.message)}}
  function sharePdf(){
    if(!state.pdf)return;var file=new File([state.pdf],stem()+'.pdf',{type:'application/pdf'});
    if(!navigator.share||!navigator.canShare||!navigator.canShare({files:[file]})){status('Отправка файлов здесь недоступна. Сохрани PDF и отправь его из «Файлов».');return}
    navigator.share({files:[file],title:'Happy Meal — отчёт о питании'}).then(function(){status('Отчёт передан выбранному приложению')},function(e){if(e.name!=='AbortError')status('Не удалось открыть отправку. Можно сохранить PDF и отправить его из «Файлов».')});
  }
  async function printReport(){
    if(!state.pages.length)return;var container=el('mrPrintPages');container.replaceChildren();
    try{await Promise.all(state.urls.map(function(url){return new Promise(function(resolve,reject){var img=new Image();img.onload=resolve;img.onerror=reject;img.src=url;container.appendChild(img)})}));root.print()}catch(e){status('Не удалось подготовить печать. Сохрани PDF и распечатай его.')}
  }
  doc.getElementById('mealReportOpen').addEventListener('click',open);
  doc.getElementById('mealReportShare').addEventListener('click',open);
  doc.getElementById('mealReportPrint').addEventListener('click',function(){open('print')});
  model.refreshJournalCsv=prepareJournalCsv;
  if(doc.querySelector('[data-screen="journal"].on'))prepareJournalCsv();
  var settings=doc.getElementById('mealReportSettings');if(settings)settings.addEventListener('click',open);
})(typeof globalThis!=='undefined'?globalThis:this);
