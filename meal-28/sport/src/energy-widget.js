/* Shared energy widget. Renderer derived from the supplied variant 6. */
(function(){
const meal=typeof SEED==='undefined';let mode=meal?'eat':'spent';
var SWEEP=296,KR=92,uid=0,S={scale:3000,bal:false,knob:mode};
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}function n(v){return Math.round(v*100)/100}
const config={map:'scale',blend:'normal',top:'spent',nest:false,glass:false,eat:{c0:'#00FFFF',cm:'#7C5AFF',c1:'#FDA6FF',mw:30,s0:59,s1:77,a0:57,a1:75},spent:{c0:'#FDA6FF',cm:'#7C5AFF',c1:'#00FFFF',mw:30,s0:17,s1:45,a0:64,a1:89}};
  function hexRgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16) / 255; }); }
  function toLin(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function toGam(c) { return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; }
  function lch(hex) {
    var c = hexRgb(hex), r = toLin(c[0]), g = toLin(c[1]), b = toLin(c[2]);
    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    var L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
    var A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
    var B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
    return { L: L, C: Math.sqrt(A * A + B * B), h: Math.atan2(B, A) };
  }
  function labLin(L, a, b) {
    var l = L + 0.3963377774 * a + 0.2158037573 * b, m = L - 0.1055613458 * a - 0.0638541728 * b, s = L - 0.0894841775 * a - 1.2914855480 * b;
    l = l * l * l; m = m * m * m; s = s * s * s;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
           -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
           -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
  }
  function lchHex(L, C, h) {
    var lin, i = 0;
    while (true) {   // вне sRGB — убавляем насыщенность, пока цвет не поместится
      lin = labLin(L, C * Math.cos(h), C * Math.sin(h));
      if (i++ > 14 || lin.every(function (v) { return v >= -0.001 && v <= 1.001; })) break;
      C *= 0.9;
    }
    return '#' + lin.map(function (v) { return ('0' + Math.round(clamp(toGam(clamp(v, 0, 1)), 0, 1) * 255).toString(16)).slice(-2); }).join('').toUpperCase();
  }
  var LUTS = {};
  function lut(c0, c1) {
    var key = c0 + c1;
    if (LUTS[key]) return LUTS[key];
    var out = [], A = lch(c0), B = lch(c1), h0 = A.h, h1 = B.h, i, t, dh;
    if (A.C < 0.03) h0 = h1;
    if (B.C < 0.03) h1 = h0;
    dh = h1 - h0;
    while (dh > Math.PI) dh -= 2 * Math.PI;
    while (dh < -Math.PI) dh += 2 * Math.PI;
    for (i = 0; i <= 64; i++) {
      t = i / 64;
      out.push(c0 === c1 ? c0 : lchHex(A.L + (B.L - A.L) * t, A.C + (B.C - A.C) * t, h0 + dh * t));
    }
    out[0] = c0; out[64] = c1;
    return (LUTS[key] = out);
  }
  // переход идёт только между s0 и s1 (% длины): до s0 — цвет начала, после s1 — цвет конца
  function colAt(L, t) {
    var a = (L.s0 || 0) / 100, b = (L.s1 == null ? 100 : L.s1) / 100;
    t = b > a ? (t - a) / (b - a) : (t >= a ? 1 : 0);
    t = clamp(t, 0, 1);
    if (!L.cm) return lut(L.c0, L.c1)[Math.round(t * 64)];
    // три цвета: начало → середина → конец, каждая половина — свой переход
    var h = clamp((L.mw == null ? 30 : L.mw) / 200, 0, 0.45);   // середина держится полосой шириной mw %
    if (t < 0.5 - h) return lut(L.c0, L.cm)[Math.round(t / (0.5 - h) * 64)];
    if (t > 0.5 + h) return lut(L.cm, L.c1)[Math.round((t - 0.5 - h) / (0.5 - h) * 64)];
    return L.cm;
  }
  function alphaAt(L, t) { return clamp((L.a0 + (L.a1 - L.a0) * clamp(t, 0, 1)) / 100, 0, 1); }
  function grey(a) { var v = ('0' + Math.round(a * 255).toString(16)).slice(-2); return '#' + v + v + v; }
  function rgba(hex, a) { var c = hexRgb(hex); return 'rgba(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ',' + n(a) + ')'; }
  function barCss(L) {
    var st = [], i, t;
    for (i = 0; i <= 8; i++) { t = i / 8; st.push(rgba(colAt(L, t), Math.max(0.04, alphaAt(L, t))) + ' ' + n(t * 100) + '%'); }
    return 'linear-gradient(90deg,' + st.join(',') + ')';
  }

  /* ── кольцо ── */
  var uid = 0;
  // дуга по центру трубки; длина и начало — в градусах, переводятся в пиксели (без pathLength — его не везде понимают)
  function arc(r, w, deg, stroke, start, attrs, cap) {
    if (deg <= 0) return '';
    var k = 2 * Math.PI * r / 360, circ = 2 * Math.PI * r;
    return '<circle cx="120" cy="120" r="' + r + '" fill="none" stroke="' + stroke + '" stroke-width="' + w +
      '" stroke-linecap="' + (cap || 'round') + '" stroke-dasharray="' + n(Math.max(0.01, deg * k)) + ' ' + n(circ) + '"' +
      (start ? ' stroke-dashoffset="' + n(-start * k) + '"' : '') + (attrs ? ' ' + attrs : '') + '/>';
  }
  // стекло: светлая косая полоса (угол 49°, как в «Палетках») и тонкая кромка по контуру
  function glassDefs(id) {
    var p = 0.66, w = 0.70, s = 0.5, ang = 49;
    function st(o, c, a) { return '<stop offset="' + n(clamp(o, 0, 1)) + '" stop-color="' + c + '" stop-opacity="' + n(clamp(a, 0, 1)) + '"/>'; }
    return '<linearGradient id="' + id + 'sh" gradientUnits="userSpaceOnUse" x1="0" y1="120" x2="240" y2="120" gradientTransform="rotate(' + (ang - 122) + ' 120 120)">' +
      st(0, '#fff', 0) + st(p - w / 2, '#fff', 0) + st(p - w / 4, '#fff', s * 0.55) + st(p, '#fff', s) + st(p + w / 4, '#fff', s * 0.55) + st(1, '#fff', 0) + '</linearGradient>' +
      '<linearGradient id="' + id + 'rm" gradientUnits="userSpaceOnUse" x1="30" y1="20" x2="210" y2="230" gradientTransform="rotate(-122 120 120)">' +
      st(0, '#fff', 0.5) + st(0.5, '#fff', 0.1) + st(1, '#1a0a5a', 0.42) + '</linearGradient>';
  }
  function glassArc(c, w, len) {
    var mid = c.id + 'm' + (c.k++);
    c.defs += '<mask id="' + mid + '" maskUnits="userSpaceOnUse" x="-20" y="-20" width="280" height="280">' +
      arc(KR, w, len, '#fff', 0) + arc(KR, Math.max(1, w - 3), len, '#000', 0) + '</mask>';
    return arc(KR, w, len, 'url(#' + c.id + 'rm)', 0, 'mask="url(#' + mid + ')"') + arc(KR, w, len, 'url(#' + c.id + 'sh)', 0);
  }
  // слой: дуга из коротких отрезков, у каждого свой цвет; прозрачность — маской того же рисунка
  function layer(c, Pp, L, len, w, other) {
    if (len <= 0.05) return { g: '', glass: '' };
    var cnt = Math.max(1, Math.ceil(len / c.step)), sl = len / cnt, i, a, ext, mid, segs = '', msk = '';
    var ramp = L.a0 < 100 || L.a1 < 100;
    // по балансу: до конца другой дуги — цвет начала; за ним переход к цвету конца, полный — у конца кольца
    function tOf(x) {
      if (Pp.map === 'scale') return x / SWEEP;
      if (Pp.map === 'balance') return x <= other ? 0 : (SWEEP - other < 0.5 ? 1 : (x - other) / (SWEEP - other));
      return x / len;
    }
    for (i = 0; i < cnt; i++) {
      a = i * sl; ext = Math.min(sl + 0.8, len - a); mid = a + sl / 2;   // заход на соседа прячет швы
      segs += arc(KR, w, ext, colAt(L, tOf(mid)), a, '', 'butt');
      if (ramp) msk += arc(KR, w, ext, grey(alphaAt(L, mid / len)), a, '', 'butt');
    }
    segs += arc(KR, w, 0.01, colAt(L, tOf(0)), 0) + arc(KR, w, 0.01, colAt(L, tOf(len)), len);   // круглые концы
    var mAttr = '';
    if (ramp) {
      msk += arc(KR, w, 0.01, grey(alphaAt(L, 0)), 0) + arc(KR, w, 0.01, grey(alphaAt(L, 1)), len);
      var id = c.id + 'a' + (c.k++);
      c.defs += '<mask id="' + id + '" maskUnits="userSpaceOnUse" x="-20" y="-20" width="280" height="280">' + msk + '</mask>';
      mAttr = ' mask="url(#' + id + ')"';
    }
    return {
      g: '<g style="mix-blend-mode:' + Pp.blend + '"' + mAttr + '>' + segs + '</g>',
      glass: Pp.glass ? '<g' + mAttr + '>' + glassArc(c, w, len) + '</g>' : ''
    };
  }
  function signed(d) { d = Math.round(d); return d > 0 ? '+' + d : d < 0 ? '−' + (-d) : '0'; }
  function ringSvg(Pp, eaten, spent, step, label) {
    var c = { id: 'q' + (uid++), defs: '', k: 0, step: step };
    if (Pp.glass) c.defs += glassDefs(c.id);
    var de = clamp(eaten / S.scale, 0, 1) * SWEEP, ds = clamp(spent / S.scale, 0, 1) * SWEEP;
    var order = Pp.top === 'eat' ? ['spent', 'eat'] : ['eat', 'spent'];   // снизу вверх
    var body = '', gl = '';
    if (!S.bal) order = [S.knob];   // одна дуга своего приложения
    order.forEach(function (key, i) {
      var r = layer(c, Pp, Pp[key], key === 'eat' ? de : ds, i === 1 && Pp.nest ? 8 : 16, key === 'eat' ? ds : de);
      body += r.g; gl += r.glass;
    });
    var ring = arc(KR, 16, SWEEP, 'none', 0, 'style="stroke:var(--trk)"') + '<g style="isolation:isolate">' + body + '</g>' + gl;
    var big = S.bal ? signed(eaten - spent) : String(Math.round(S.knob === 'eat' ? eaten : spent));
    // кнопка в центре — объёмная стеклянная, как в Happy Meal (HTML поверх SVG)
    // крупное кольцо обрезано по видимой дуге: x 20…220, y 20…206 (низ — круглые концы дуги)
    var vb = c.step > 2 ? [-16, -16, 272, 272] : [20, 20, 200, 186];
    function pc(v, of) { return (v / of * 100).toFixed(2) + '%'; }
    var kpos = 'left:' + pc(50 - vb[0], vb[2]) + ';top:' + pc(50 - vb[1], vb[3]) + ';width:' + pc(140, vb[2]) + ';height:' + pc(140, vb[3]);
    var cap = S.bal ? 'баланс' : (S.knob === 'eat' ? 'съедено' : 'потрачено');
    var knob = '<div class="he-knob' + (big.length >= 5 ? ' long' : '') + '" style="' + kpos + '"><b>' + big + '</b><small>' + cap + '</small></div>';
    return '<svg viewBox="' + vb.join(' ') + '"' + (label ? ' role="img" aria-label="' + label + '"' : ' aria-hidden="true"') + '><defs>' + c.defs + '</defs>' +
      '<g transform="rotate(122 120 120)">' + ring + '</g></svg>' + knob;
  }


const owner=()=>typeof CL!=='undefined'&&CL.s?CL.s.uid:'local';
const sharedKey=()=> 'happy-energy-meal-v1:'+owner();
let remoteMeal=null;
function date(){return meal?curDate:selectedDate}
function mealCache(){try{const o=JSON.parse(localStorage.getItem(sharedKey()));return o?.owner===owner()&&o.v===1&&o.days?o:null}catch{return null}}
function nutrition(){if(meal){const d=day(curDate),tot=sumOf(d.items);return {...tot,g:DB.goals||{},recorded:d.items.length>0}}const local=mealCache(),remote=remoteMeal?.owner===owner()?remoteMeal:null;const o=!local?remote:!remote||Number(local.at)>=Number(remote.at)?local:remote;return o?{k:0,p:0,f:0,c:0,...o.days[date()],g:o.goals||{}}:null}
function mealPayload(o){return JSON.stringify({v:o.v,secs:o.secs,days:o.days,goals:o.goals||{}})}
function enrichedMealSummary(original){const sum=original();sum.owner=owner();sum.goals={...(DB.goals||{})};for(const d of new Set([...Object.keys(DB.days||{}),curDate]))if(!sum.days[d])sum.days[d]={k:0,p:0,f:0,c:0};const previous=mealCache();sum.at=previous&&mealPayload(previous)===mealPayload(sum)?previous.at:Math.max(Date.now(),Number(previous?.at||0)+1);return sum}
function acceptMeal(o,uid){if(owner()!==uid||o?.v!==1||!o.days)return;const local=mealCache();if(local&&Number(local.at)>Number(o.at||0))return;remoteMeal={...o,owner:uid};localStorage.setItem(sharedKey(),JSON.stringify(remoteMeal))}
function facts(){const food=nutrition();let workouts=[];if(!meal)workouts=state.workouts.filter(w=>!w.demo&&w.start?.slice(0,10)===date());else try{const o=JSON.parse(localStorage.getItem('hd_link_sport_v1'));if(o?.owner===owner())workouts=(o.records||[]).filter(w=>!w.deleted&&w.start?.slice(0,10)===date())}catch{}return {food,eaten:food?food.k:null,spent:null,rest:null,training:workouts.length&&workouts.every(w=>Number.isFinite(w.energyKcal))?workouts.reduce((n,w)=>n+w.energyKcal,0):null,minutes:workouts.reduce((n,w)=>n+Math.max(0,w.duration||0)/60,0),steps:null}}
function number(v){return v==null?'—':Math.round(v).toLocaleString('ru-RU')}
const hues={pink:350,violet:305,blue:262,teal:180};
function metricRow(color,name,value,unit,goal,progress){const h=hues[color],tone=(l)=>lchHex(l,.12,h*Math.PI/180);const valid=Number.isFinite(value),g=Number(goal)>0?Number(goal):null;const ratio=valid&&g?Math.max(0,value/g):null;const label=valid?number(value)+(g?'/'+number(g):'')+(unit?' '+unit:''):'—';return `<div class="he-metric"><i class="he-dot" style="background:${tone(.8)}"></i><span>${name}</span><b>${label}</b><span class="he-bar"><i style="width:${ratio==null?0:Math.min(1,ratio)*100}%;background:linear-gradient(90deg,${tone(.86)},${tone(.72-.16*clamp(((ratio||0)-.85)/.35,0,1))})"></i></span></div>`}
function widget(){const f=facts(),g=f.food?.g||{};S.bal=mode==='balance';S.knob=mode==='balance'?(meal?'eat':'spent'):mode;const missing=mode==='balance'?(f.eaten==null||f.spent==null):f[mode==='eat'?'eaten':'spent']==null;let svg=ringSvg(config,f.eaten||0,f.spent||0,1.5,'Кольцо энергии');if(missing)svg=svg.replace(/<b>[^<]*<\/b>/,'<b>—</b>');let rows='';if(mode==='eat')rows=metricRow('pink','Белки',f.food?.p,'г',g.p)+metricRow('violet','Жиры',f.food?.f,'г',g.f)+metricRow('blue','Углеводы',f.food?.c,'г',g.c)+metricRow('teal','Клетчатка',f.food?.fib,'г',g.fib);else if(mode==='spent')rows=metricRow('violet','Покой',f.rest,'ккал')+metricRow('pink','Тренировки',f.training,'ккал')+metricRow('blue','Шаги',f.steps,'')+metricRow('teal','Время',f.minutes,'мин');else{const d=f.eaten!=null&&f.spent!=null?f.eaten-f.spent:null;rows=metricRow('teal',d!=null&&d>0?'Сжечь':'Запас',d==null?null:Math.abs(d),'ккал')+metricRow('blue','Шаги до цели',null,'')+metricRow('violet','Ходьба',null,'мин')+metricRow('pink','Белка до цели',Number(g.p)>0&&f.food?.p!=null?Math.max(0,Number(g.p)-f.food.p):null,'г')}
return '<div class="he-layout"><div class="he-plate">'+svg+'<button type="button" class="he-center" data-energy-cycle aria-label="Сменить режим энергии. Сейчас: '+(mode==='eat'?'съедено':mode==='spent'?'потрачено':'баланс')+'"></button></div><div class="he-info">'+rows+'</div></div>'}
function paint(){const el=document.getElementById(meal?'mlKb':'happy-energy');if(el){el.classList.add('happy-energy');el.innerHTML=widget()}}
function publishMeal(){if(!meal)return;try{const sum=linkSummary();localStorage.setItem(sharedKey(),JSON.stringify(sum))}catch{}}
async function refresh(){if(meal){publishMeal();paint();return}if(typeof clOn==='function'&&clOn()&&CL.ck){try{const uid=owner(),o=await clGet('meal','link');acceptMeal(o,uid)}catch{}}paint()}
if(meal){const originalSummary=linkSummary;linkSummary=function(){return enrichedMealSummary(originalSummary)}}
if(meal){const original=renderDay;renderDay=function(){const r=original.apply(this,arguments);publishMeal();paint();return r};}else{const original=renderDiary;renderDiary=function(){const root=document.createElement('div');root.innerHTML=original();const old=root.querySelector('.energy');if(old)old.outerHTML='<section class="card happy-energy" id="happy-energy">'+widget()+'</section>';return root.innerHTML};render()}
document.addEventListener('click',e=>{if(e.target.closest('[data-energy-cycle]')){const modes=meal?['eat','balance','spent']:['spent','balance','eat'];mode=modes[(modes.indexOf(mode)+1)%3];paint()}});
window.addEventListener('storage',()=>{remoteMeal=null;paint()});window.addEventListener('pageshow',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});setInterval(()=>{if(!document.hidden)refresh()},30000);refresh();
})();
