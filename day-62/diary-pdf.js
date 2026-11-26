/* File export for the prototype. Use the system print view for native text printing.
   Draw on the device so Cyrillic, emoji, and mixed scripts keep their system fonts. */
window.HappyDiaryPDF = (() => {
  'use strict';
  let loading;
  function library() {
    if(window.PDFLib)return Promise.resolve(window.PDFLib);
    if(!loading)loading=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='./diary-vendor/pdf-lib.min.js';
      script.onload=()=>resolve(window.PDFLib);
      script.onerror=()=>{loading=null;script.remove();reject(new Error('Не удалось загрузить модуль PDF'));};
      document.head.append(script);
    });
    return loading;
  }
  async function create(articles) {
    const {PDFDocument}=await library();
    const pdf=await PDFDocument.create();pdf.setTitle('Дневник Happy Day');
    const W=595,H=842,M=44,space=W-2*M;
    const canvas=document.createElement('canvas');canvas.width=W*2;canvas.height=H*2;
    const ctx=canvas.getContext('2d');ctx.scale(2,2);
    let y;
    function reset(){ctx.fillStyle='white';ctx.fillRect(0,0,W,H);ctx.textBaseline='top';y=M;}
    async function flush(){
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      const img=await pdf.embedPng(await blob.arrayBuffer());
      pdf.addPage([W,H]).drawImage(img,{x:0,y:0,width:W,height:H});reset();
    }
    async function room(height){if(y+height>H-M)await flush();}
    const bodyStyle={size:13,bold:false,italic:false,underline:false,strike:false};
    function proseRuns(node){
      const runs=[];
      function boundary(force=false){
        if(force||(runs.length&&runs.at(-1)!==null))runs.push(null);
      }
      function visit(node,style){
        if(node.nodeType===3){
          if(node.data)runs.push({text:node.data,style});
          return;
        }
        const tag=node.tagName;
        if(tag==='BR'){boundary(true);return;}
        const block=['P','DIV','H3','LI','BLOCKQUOTE','UL','OL'].includes(tag);
        if(block)boundary();
        const next={...style};
        if(tag==='H3'){next.size=16;next.bold=true;}
        if(tag==='B'||tag==='STRONG')next.bold=true;
        if(tag==='I'||tag==='EM')next.italic=true;
        if(tag==='U')next.underline=true;
        if(tag==='S'||tag==='STRIKE')next.strike=true;
        if(tag==='LI'){
          const parent=node.parentElement;
          let marker='• ';
          if(parent.tagName==='OL')marker=(Array.from(parent.children).indexOf(node)+1)+'. ';
          else if(node.hasAttribute('data-jd-check'))marker=node.dataset.jdCheck==='true'?'☑ ':'○ ';
          runs.push({text:marker,style:next});
        }
        for(const child of node.childNodes)visit(child,next);
        if(block)boundary();
      }
      for(const child of node.childNodes)visit(child,bodyStyle);
      if(runs.at(-1)===null)runs.pop();
      return runs;
    }
    async function writeRuns(runs){
      if(!runs.length)return;
      let line=[],width=0,spaceBefore=false;
      function font(s){return (s.italic?'italic ':'')+(s.bold?'600 ':'400 ')+s.size+'px -apple-system, BlinkMacSystemFont, Arial, sans-serif';}
      function measure(text,style){ctx.font=font(style);return ctx.measureText(text).width;}
      function append(text,style,w){line.push({text,style,w});width+=w;}
      async function drawLine(){
        const size=line.reduce((max,run)=>Math.max(max,run.style.size),bodyStyle.size);
        const height=size*1.45;
        await room(height);
        ctx.fillStyle='#202020';
        let x=M;
        for(const run of line){
          const top=y+size-run.style.size;
          ctx.font=font(run.style);ctx.fillText(run.text,x,top);
          if(run.style.underline)ctx.fillRect(x,top+run.style.size+1,run.w,1);
          if(run.style.strike)ctx.fillRect(x,top+run.style.size*.56,run.w,1);
          x+=run.w;
        }
        line=[];width=0;spaceBefore=false;y+=height;
      }
      for(const run of runs){
        if(!run){await drawLine();continue;}
        for(const token of run.text.match(/\r\n|[\r\n]|[^\S\r\n]+|\S+/gu)||[]){
          if(/[\r\n]/.test(token)){await drawLine();continue;}
          if(/^\s/u.test(token)){spaceBefore=true;continue;}
          const w=measure(token,run.style);
          const gap=spaceBefore&&line.length?measure(' ',run.style):0;
          if(line.length&&width+gap+w>space)await drawLine();
          else if(gap)append(' ',run.style,gap);
          spaceBefore=false;
          if(w<=space){append(token,run.style,w);continue;}
          for(const letter of token){
            const charWidth=measure(letter,run.style);
            if(line.length&&width+charWidth>space)await drawLine();
            append(letter,run.style,charWidth);
          }
        }
      }
      if(line.length)await drawLine();
      y+=7;
    }
    function write(text,size=13,bold=false){
      return writeRuns(text?[{text,style:{...bodyStyle,size,bold}}]:[]);
    }
    async function placeMedia(container){
      if(!container)return;
      for(const child of container.children){
        const img=child.querySelector('img');
        if(img){
          await img.decode();
          const ratio=Math.min(space/img.naturalWidth,260/img.naturalHeight,1);
          const w=img.naturalWidth*ratio,h=img.naturalHeight*ratio;
          await room(h+12);ctx.drawImage(img,M,y,w,h);y+=h+12;
        }else{await write(child.textContent,11);}
      }
    }
    async function placeBody(container){
      const flow=container.querySelector(':scope > .jd-body-flow');
      if(flow){
        for(const part of flow.children){
          if(part.matches('.jd-prose-read'))await writeRuns(proseRuns(part));
          else if(part.matches('.jd-flow-media'))await placeMedia(part);
        }
      }else{
        await write(container.querySelector(':scope > p')?.textContent);
        await placeMedia(container.querySelector(':scope > .jd-media'));
      }
    }
    reset();
    for(const article of articles){
      await write(article.querySelector('.jd-print-date').textContent,11);
      await write(article.querySelector(':scope > h2')?.textContent,20,true);
      await placeBody(article);
      for(const add of article.querySelectorAll('.jd-addition')){
        await write(add.querySelector('small').textContent,11,true);
        await placeBody(add);
      }
      await flush();
    }
    return new Blob([await pdf.save()],{type:'application/pdf'});
  }
  return {create};
})();
