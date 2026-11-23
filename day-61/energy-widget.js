/* Shared energy widget. Renderer derived from the supplied variant 6. */
(function(){
const meal=false;let mode='spent';
var SWEEP=296,KR=92,uid=0,S={scale:3000,bal:false,knob:mode};
/* цвета кольца и строк по теме (shared/happy-energy-ring.js): у темы свой набор — берём его, нет — исходные цвета */
function pal(){return typeof HappyEnergyRing!=='undefined'?HappyEnergyRing.palette():null}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}function n(v){return Math.round(v*100)/100}
const config0={map:'scale',blend:'normal',top:'spent',nest:false,glass:false,eat:{c0:'#00FFFF',cm:'#7C5AFF',c1:'#FDA6FF',mw:30,s0:59,s1:77,a0:57,a1:75},spent:{c0:'#FDA6FF',cm:'#7C5AFF',c1:'#00FFFF',mw:30,s0:17,s1:45,a0:64,a1:89}};
let config=config0;
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
  function rgba(hex, a) { var c = hexRgb(hex); return 'rgba(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ',' + n(a) + ')'; }
  function barCss(L) {
    var st = [], i, t;
    for (i = 0; i <= 8; i++) { t = i / 8; st.push(rgba(colAt(L, t), Math.max(0.04, alphaAt(L, t))) + ' ' + n(t * 100) + '%'); }
    return 'linear-gradient(90deg,' + st.join(',') + ')';
  }

  /* ── кольцо ── */
  // дуга по центру трубки; длина и начало — в градусах, переводятся в пиксели (без pathLength — его не везде понимают)
  function arc(r, w, deg, stroke, start, attrs, cap) {
    if (deg <= 0) return '';
    var k = 2 * Math.PI * r / 360, circ = 2 * Math.PI * r;
    return '<circle cx="120" cy="120" r="' + r + '" fill="none" stroke="' + stroke + '" stroke-width="' + w +
      '" stroke-linecap="' + (cap || 'round') + '" stroke-dasharray="' + n(Math.max(0.01, deg * k)) + ' ' + n(circ) + '"' +
      (start ? ' stroke-dashoffset="' + n(-start * k) + '"' : '') + (attrs ? ' ' + attrs : '') + '/>';
  }
  /* 23.11.2026 (Астамур: «всё должно быть на одинаковых движках», на конце дуги был виден кружок): дуга — одна линия на холсте,
     общий движок shared/happy-energy-ring.js (как дуги Day «Сейчас»). Цвет и прозрачность по месту на дуге — прежние (colAt, alphaAt);
     круглые концы рисует сам холст продолжением того же градиента, отдельных кружков одного цвета больше нет. До 23.11 — конический
     градиент CSS и кружки-концы (Day 58, Sport 41), ещё раньше — отрезки SVG под маской. */
  function layer(Pp, L, len, w, other) {
    if (len <= 0.05) return '';
    // по балансу: до конца другой дуги — цвет начала; за ним переход к цвету конца, полный — у конца кольца
    function tOf(x) {
      if (Pp.map === 'scale') return x / SWEEP;
      if (Pp.map === 'balance') return x <= other ? 0 : (SWEEP - other < 0.5 ? 1 : (x - other) / (SWEEP - other));
      return x / len;
    }
    var step = 1.5, cnt = Math.max(1, Math.ceil(len / step)), pts = [], i, t;
    var ramp = L.a0 < 100 || L.a1 < 100;
    for (i = 0; i <= cnt; i++) { t = Math.min(len, i * step); pts.push({ t: t, c: colAt(L, tOf(t)), a: ramp ? alphaAt(L, t / len) : 1 }); }
    var style = Pp.blend && Pp.blend !== 'normal' ? ' style="mix-blend-mode:' + Pp.blend + '"' : '';
    return '<div class="he-layer"' + style + '>' + HappyEnergyRing.arcHTML(pts, w) + '</div>';
  }
  function signed(d) { d = Math.round(d); return d > 0 ? '+' + d : d < 0 ? '−' + (-d) : '0'; }
  function ringSvg(Pp, eaten, spent, step, label) {
    var de = clamp(eaten / S.scale, 0, 1) * SWEEP, ds = clamp(spent / S.scale, 0, 1) * SWEEP;
    var order = Pp.top === 'eat' ? ['spent', 'eat'] : ['eat', 'spent'];   // снизу вверх
    var body = '';
    if (!S.bal) order = [S.knob];   // одна дуга своего приложения
    order.forEach(function (key, i) {
      body += layer(Pp, Pp[key], key === 'eat' ? de : ds, i === 1 && Pp.nest ? 8 : 16, key === 'eat' ? ds : de);
    });
    var big = S.bal ? signed(eaten - spent) : String(Math.round(S.knob === 'eat' ? eaten : spent));
    // кнопка в центре — объёмная стеклянная, как в Happy Meal (HTML поверх SVG)
    // крупное кольцо обрезано по видимой дуге: x 20…220, y 20…206 (низ — круглые концы дуги)
    var vb = step > 2 ? [-16, -16, 272, 272] : [20, 20, 200, 186];
    function pc(v, of) { return (v / of * 100).toFixed(2) + '%'; }
    var kpos = 'left:' + pc(50 - vb[0], vb[2]) + ';top:' + pc(50 - vb[1], vb[3]) + ';width:' + pc(140, vb[2]) + ';height:' + pc(140, vb[3]);
    var apos = 'left:' + pc(20 - vb[0], vb[2]) + ';top:' + pc(20 - vb[1], vb[3]) + ';width:' + pc(200, vb[2]) + ';height:' + pc(200, vb[3]);
    var cap = S.bal ? 'баланс' : (S.knob === 'eat' ? 'съедено' : 'потрачено');
    var knob = '<div class="he-knob' + (big.length >= 5 ? ' long' : '') + '" style="' + kpos + '"><b>' + big + '</b><small>' + cap + '</small></div>';
    return '<svg viewBox="' + vb.join(' ') + '"' + (label ? ' role="img" aria-label="' + label + '"' : ' aria-hidden="true"') + '>' +
      '<g transform="rotate(122 120 120)">' + arc(KR, 16, SWEEP, 'none', 0, 'style="stroke:' + (S.trk || 'var(--trk)') + '"') + '</g></svg>' +
      (body ? '<div class="he-arcs" aria-hidden="true" style="' + apos + '">' + body + '</div>' : '') + knob;
  }


function number(v){return v==null?'—':Math.round(v).toLocaleString('ru-RU')}
const hues0={pink:350,violet:305,blue:262,teal:180};
const BARS0={hues:hues0,chroma:.12,dot:.8,from:.86,to:.72,over:.56,track:22};let bars=BARS0;
function metricRow(color,name,value,unit,goal,progress){const B=bars,h=B.hues[color],tone=(l)=>lchHex(l,B.chroma,h*Math.PI/180);const valid=Number.isFinite(value),g=Number(goal)>0?Number(goal):null;const ratio=valid&&g?Math.max(0,value/g):null;const label=valid?number(value)+(g?'/'+number(g):'')+(unit?' '+unit:''):'—';return `<div class="he-metric"><i class="he-dot" style="background:${tone(B.dot)}"></i><span>${name}</span><b>${label}</b><span class="he-bar"${B===BARS0?'':` style="background:rgba(255,255,255,${B.track/100})"`}><i style="width:${ratio==null?0:Math.min(1,ratio)*100}%;background:linear-gradient(90deg,${tone(B.from)},${tone(B.to-(B.to-B.over)*clamp(((ratio||0)-.85)/.35,0,1))})"></i></span></div>`}
function widget(f,selectedMode,scale){mode=selectedMode||'spent';S.scale=scale||3000;const g=f.food?.g||{};{const P=pal();config=P?Object.assign({},config0,{eat:P.eat,spent:P.spent}):config0;bars=P?P.bars:BARS0;S.trk=P?'rgba(255,255,255,'+P.track/100+')':''}S.bal=mode==='balance';S.knob=mode==='balance'?(meal?'eat':'spent'):mode;const missing=mode==='balance'?(f.eaten==null||f.spent==null):f[mode==='eat'?'eaten':'spent']==null;let svg=ringSvg(config,f.eaten||0,f.spent||0,1.5,'Кольцо энергии');if(missing)svg=svg.replace(/<b>[^<]*<\/b>/,'<b>—</b>');let rows='';if(mode==='eat')rows=metricRow('pink','Белки',f.food?.p,'г',g.p)+metricRow('violet','Жиры',f.food?.f,'г',g.f)+metricRow('blue','Углеводы',f.food?.c,'г',g.c)+metricRow('teal','Клетчатка',f.food?.fib,'г',g.fib);else if(mode==='spent')rows=metricRow('violet','Покой',f.rest,'ккал')+metricRow('pink','Тренировки',f.training,'ккал')+metricRow('blue','Шаги',f.steps,'')+metricRow('teal','Время',f.minutes,'мин');else{const d=f.eaten!=null&&f.spent!=null?f.eaten-f.spent:null;rows=metricRow('teal',d!=null&&d>0?'Сжечь':'Запас',d==null?null:Math.abs(d),'ккал')+metricRow('blue','Шаги до цели',null,'')+metricRow('violet','Ходьба',null,'мин')+metricRow('pink','Белка до цели',Number(g.p)>0&&f.food?.p!=null?Math.max(0,Number(g.p)-f.food.p):null,'г')}
return '<div class="he-layout"><div class="he-plate">'+svg+'<button type="button" class="he-center" data-energy-cycle aria-label="Сменить режим энергии. Сейчас: '+(mode==='eat'?'съедено':mode==='spent'?'потрачено':'баланс')+'"></button></div><div class="he-info">'+rows+'</div></div>'}

window.HappyDayEnergy={render:widget};
// тема сменилась — кольцо перерисовывается в новых цветах (selfcare-ui.js перерисует, если раздел «Активность» открыт)
if(typeof HappyEnergyRing!=='undefined')HappyEnergyRing.onTheme(()=>{try{window.SelfCare&&SelfCare.mealChanged&&SelfCare.mealChanged()}catch(e){}});
})();
