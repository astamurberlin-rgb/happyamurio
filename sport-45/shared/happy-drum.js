/* Барабан Happy — колёса с крупными цифрами, как время на iPhone. Один кусок на Day и Sport (AGENTS.md, раздел 4).
   Решения Астамура 21.11.2026 (макет «Day · Осознанность» в Claude Design):
   — время и длительность в одном виде 00:00: часы и минуты (длительность бывает больше часа);
   — видно три строки: выбранная посередине, по одной сверху и снизу — мельче и бледнее;
   — выбранная строка лежит на светлой полосе без рамки, как в iPhone; у каждого барабана своя полоса;
   — барабаны стоят в две колонки, подпись — над своим барабаном; длительность всегда справа,
     и если барабан один, он тоже в правой колонке.
   Колесо крутится пальцем с разгоном (родная прокрутка с защёлкой на строке), нажатие на строку — выбрать её,
   стрелки вверх-вниз — на шаг.

   HappyFields.drum(host,{groups:[{label,cols:[{name,label,options:[{v,t}],value}|{sep:':'}]}],onChange(vals)})
   → {get(name), set(name,v)}. Готовые колёса: HappyFields.drumTimeCols('08:30') → h, m; HappyFields.drumDurationCols(75) → dh, dm. Day подключает рядом shared/happy-fields.js (поля), Sport — только этот файл.
   — Claude · 21.11.2026 */
(function(root){
 'use strict';
 if(!root.document)return;
 const ROW=44,VIEW=3*ROW;
 const escH=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 function drum(host,o){
  const vals={},cols=[],groups=o.groups.length===1?[null,o.groups[0]]:o.groups;
  host.classList.add('hf-drum');
  host.innerHTML=groups.map(g=>!g?'<div class="hf-drum-cell" aria-hidden="true"></div>':
   '<div class="hf-drum-cell"><span class="hf-drum-cap" aria-hidden="true">'+escH(g.label||'')+'</span>'+
   '<div class="hf-drum-group"><div class="hf-drum-band" aria-hidden="true"></div>'+g.cols.map(c=>
    c.sep?'<span class="hf-drum-sep" aria-hidden="true">'+escH(c.sep)+'</span>':
    '<div class="hf-drum-col" role="listbox" tabindex="0" aria-label="'+escH(c.label||'')+'" data-name="'+escH(c.name)+'">'+
     '<div class="hf-drum-pad"></div>'+c.options.map((x,i)=>'<div class="hf-drum-item" role="option" data-i="'+i+'">'+escH(x.t)+'</div>').join('')+'<div class="hf-drum-pad"></div></div>'
   ).join('')+'</div></div>').join('');
  o.groups.forEach(g=>g.cols.forEach(c=>{if(!c.options)return;const el=host.querySelector('[data-name="'+c.name+'"]');
   const at=Math.max(0,c.options.findIndex(x=>String(x.v)===String(c.value)));vals[c.name]=c.options[at].v;cols.push({c,el,at,frame:0,timer:0});}));
  /* соседние строки мельче и бледнее — по расстоянию до середины */
  function paint(k){const mid=k.el.scrollTop+VIEW/2;
   k.el.querySelectorAll('.hf-drum-item').forEach((n,i)=>{const d=Math.abs(ROW+i*ROW+ROW/2-mid)/ROW;
    n.style.transform='scale('+(1-Math.min(d,1.5)*.17).toFixed(3)+')';n.style.opacity=String(Math.max(.2,1-Math.min(d,2)*.4).toFixed(2));
    const on=d<.5;n.classList.toggle('hf-on',on);n.setAttribute('aria-selected',String(on));});}
  function settle(k){const i=Math.max(0,Math.min(k.c.options.length-1,Math.round(k.el.scrollTop/ROW)));
   if(Math.abs(k.el.scrollTop-i*ROW)>1)k.el.scrollTo({top:i*ROW,behavior:'smooth'});
   if(i!==k.at){k.at=i;vals[k.c.name]=k.c.options[i].v;if(o.onChange)o.onChange(Object.assign({},vals));}}
  cols.forEach(k=>{
   k.el.scrollTop=k.at*ROW;paint(k);
   k.el.addEventListener('scroll',()=>{if(!k.frame)k.frame=requestAnimationFrame(()=>{k.frame=0;paint(k)});clearTimeout(k.timer);k.timer=setTimeout(()=>settle(k),110);},{passive:true});
   k.el.addEventListener('click',e=>{const n=e.target.closest('.hf-drum-item');if(n)k.el.scrollTo({top:+n.dataset.i*ROW,behavior:'smooth'});});
   k.el.addEventListener('keydown',e=>{if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;e.preventDefault();k.el.scrollBy({top:e.key==='ArrowDown'?ROW:-ROW,behavior:'smooth'});});
  });
  /* лист открывается с анимацией: место колёс ставится ещё раз, когда разметка уже на экране */
  requestAnimationFrame(()=>cols.forEach(k=>{k.el.scrollTop=k.at*ROW;paint(k);}));
  return {get:name=>vals[name],set(name,v){const k=cols.find(x=>x.c.name===name);if(!k)return;const i=k.c.options.findIndex(x=>String(x.v)===String(v));if(i<0)return;k.at=i;vals[name]=k.c.options[i].v;k.el.scrollTop=i*ROW;paint(k);}};
 }
 /* готовые колёса: время 00:00 и длительность 00:00 (часы и минуты; длительность в минутах) */
 const pad2=n=>String(n).padStart(2,'0'),HOURS=Array.from({length:24},(_,i)=>({v:i,t:pad2(i)})),MINS=Array.from({length:60},(_,i)=>({v:i,t:pad2(i)}));
 const drumTimeCols=t=>[{name:'h',label:'Часы',options:HOURS,value:+String(t||'00:00').slice(0,2)},{sep:':'},{name:'m',label:'Минуты',options:MINS,value:+String(t||'00:00').slice(3,5)}];
 const drumDurationCols=min=>{const m=Math.max(0,Math.round(Number(min)||0));return [{name:'dh',label:'Часы длительности',options:HOURS,value:Math.min(23,Math.floor(m/60))},{sep:':'},{name:'dm',label:'Минуты длительности',options:MINS,value:m%60}];};
 root.HappyFields=Object.assign(root.HappyFields||{},{drum,drumTimeCols,drumDurationCols});
})(globalThis);
