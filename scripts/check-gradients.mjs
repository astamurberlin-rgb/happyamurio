import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
const context=vm.createContext({Uint8ClampedArray});
vm.runInContext(read('shared/happy-gradients.js'),context);
const G=context.HappyGradients,plain=x=>JSON.parse(JSON.stringify(x));
const original=G.fromLegacy(G.blueHour.state),before=JSON.stringify(original);
const edited=G.copy(original);edited.stops[2].brightness=120;
const beforeColors=G.colors(original),afterColors=G.colors(edited);
assert.notEqual(afterColors[2].color,beforeColors[2].color);
for(const i of [0,1,3,4])assert.equal(afterColors[i].color,beforeColors[i].color);
assert.equal(JSON.stringify(original),before,'Editing a copied layer must not mutate the source preset');
assert.deepEqual(plain(G.normalize(JSON.parse(JSON.stringify(edited)))),plain(edited),'Settings survive JSON round trip');
assert.equal(G.adjust('#808080',50), '#404040');
assert.equal(G.adjust('#ff0000',100,100,120),'#00ff00');
assert.equal(G.adjust('#13579b',100,0).slice(1,3),G.adjust('#13579b',100,0).slice(3,5));
const monochrome=G.normalize({angle:180,stops:[{color:'#000000',position:0},{color:'#ffffff',position:100}]});
let pixels;
const ctx={canvas:{},createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:p=>pixels=p.data};
G.paint(ctx,monochrome,3,3);
assert.deepEqual([...pixels.slice(0,4)],[0,0,0,255]);
assert.deepEqual([...pixels.slice(16,20)],[128,128,128,255]);
assert.deepEqual([...pixels.slice(32,36)],[255,255,255,255]);
const glow=G.normalize({type:'solid',stops:[{color:'#000000'},{color:'#000000'}],glow:{enabled:true,color:'#ffffff',x:50,y:50,radius:25,strength:100}});
G.paint(ctx,glow,3,3);
assert.deepEqual([...pixels.slice(16,20)],[255,255,255,255]);
assert.deepEqual([...pixels.slice(0,4)],[0,0,0,255],'Point glow does not brighten the whole background');
const legacy=G.fromLegacy({base:['#111111','#222222','#333333','#444444','#555555'],brightness:80,saturationBoost:65,glows:[{color:'#abcdef',opacity:.3,x:20,y:30,w:60,h:40},{color:'#123456',opacity:.4,x:70,y:60,w:50,h:40}]});
assert.equal(legacy.glow.strength,30);assert.equal(legacy.extraGlow.strength,40);
assert.equal(legacy.brightness,80);assert.equal(legacy.saturation,65);
assert.deepEqual(plain(legacy.stops.map(s=>s.position)),[0,17,50,76,100]);
for(const type of ['linear','curved','radial','conic']){
 const model=G.normalize({...monochrome,type,angle:45});
 for(const x of [0,.5,1])for(const y of [0,.5,1])assert(G.sample(model,x,y)>=0&&G.sample(model,x,y)<=1);
 G.paint(ctx,model,4,4);assert([...pixels].every(Number.isFinite));
}
assert.notEqual(G.sample(G.normalize({...monochrome,type:'curved',bend:70}),0,0),G.sample(monochrome,0,0));
const invalid=G.normalize({angle:Infinity,stops:[{color:'url(javascript:bad)',position:-9},{color:'#ffffff',position:140}]});
assert(!G.css(invalid).includes('javascript'));assert.equal(invalid.stops[0].position,0);assert.equal(invalid.stops[1].position,100);
for(const file of ['prototypes/happy-family-color-studio-v12.html','prototypes/studio.html']){
 const html=read(file);assert(html.includes('data-app-version="'+JSON.parse(read('shared/apps.json')).colorStudio.version+'"'));
 for(const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new vm.Script(script[1],{filename:file});
 for(const module of ['happy-gradients.js','happy-gradient-editor.js','happy-gradient-editor.css'])assert(html.includes('../shared/'+module+'?v=1'));
}
assert(read('prototypes/studio.html').includes("STORAGE='happy-family-color-studio'"));
assert(read('prototypes/happy-family-color-studio-v12.html').includes("STORAGE='happy-family-color-studio-v11'"));
console.log('PASS: independent stops/layers, exact color transforms, gradient pixels, local glow, legacy settings, JSON round trip, input bounds, studio syntax and stable storage keys.');
