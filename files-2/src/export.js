import { Document, Paragraph, TextRun, Packer, Table, TableRow, TableCell, WidthType, ExternalHyperlink, LevelFormat, AlignmentType } from 'docx';
import htmlToPdfmake from 'html-to-pdfmake';
import { markdownHtml } from './format.js';
import { safeFilename } from './core.js';

function inline(node, style = {}) {
  if (node.nodeType === 3) return [new TextRun({text:node.textContent, ...style})];
  if (node.nodeType !== 1) return [];
  const tag = node.tagName.toLowerCase();
  if (tag === 'br') return [new TextRun({break:1})];
  const next = {...style};
  if (['strong','b'].includes(tag)) next.bold = true;
  if (['em','i'].includes(tag)) next.italics = true;
  if (['del','s'].includes(tag)) next.strike = true;
  if (tag === 'small') { next.size = 18; next.color = '666666'; }
  if (tag === 'code') next.font = 'Courier New';
  const children = [...node.childNodes].flatMap(child => inline(child,next));
  const link = node.getAttribute('href');
  if (tag === 'a' && /^https?:\/\//i.test(link || '')) return [new ExternalHyperlink({children, link})];
  return children;
}
function docxBlocks(container, numbering, depth = 0) {
  const out = [];
  for (const node of container.childNodes) {
    if (node.nodeType === 3) { if (node.textContent.trim()) out.push(new Paragraph({children:inline(node)})); continue; }
    if (node.nodeType !== 1) continue;
    const tag = node.tagName.toLowerCase();
    if (tag === 'table') {
      const rows = [...node.querySelectorAll('tr')];
      const cols = Math.max(1, ...rows.map(r=>r.children.length));
      out.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:rows.map(row=>new TableRow({children:[...row.children].map(cell=>new TableCell({
        width:{size:100/cols,type:WidthType.PERCENTAGE},children:[new Paragraph({children:[...cell.childNodes].flatMap(n=>inline(n,{bold:cell.tagName==='TH'}))})]
      }))}))}));
    } else if (tag === 'ul' || tag === 'ol') {
      const reference = `list-${numbering.length}`;
      if (tag === 'ol') numbering.push({reference,levels:[{level:0,format:LevelFormat.DECIMAL,text:'%1.',start:Number(node.getAttribute('start'))||1,alignment:AlignmentType.START,style:{paragraph:{indent:{left:360*(depth+1),hanging:260}}}}]});
      for (const li of node.children) {
        const direct = [...li.childNodes].filter(n=>!['UL','OL'].includes(n.tagName));
        out.push(new Paragraph({children:direct.flatMap(n=>inline(n)),...(tag==='ol'?{numbering:{reference,level:0}}:{bullet:{level:Math.min(depth,8)}})}));
        for (const child of li.children) if (['UL','OL'].includes(child.tagName)) {
          const holder = document.createElement('div'); holder.append(child.cloneNode(true));
          out.push(...docxBlocks(holder,numbering,depth+1));
        }
      }
    } else if (['div','details','blockquote'].includes(tag)) {
      out.push(...docxBlocks(node,numbering,depth));
    } else if (tag === 'hr') out.push(new Paragraph({text:'— — —'}));
    else {
      const heading = /^h[1-6]$/.test(tag) ? `Heading${tag[1]}` : undefined;
      out.push(new Paragraph({children:[...node.childNodes].flatMap(n=>inline(n)),heading,spacing:{after:140},keepNext:!!heading}));
    }
  }
  return out;
}
let pdfReady;
function loadScript(src) {
  return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>{s.remove();reject(new Error('Не удалось загрузить модуль PDF. Попробуй ещё раз.'));};document.head.append(s);});
}
async function getPdfmake() {
  if (!pdfReady) pdfReady = (async()=>{
    await loadScript(new URL('./pdfmake.min.js',import.meta.url).href);
    await loadScript(new URL('./vfs_fonts.js',import.meta.url).href);
    return window.pdfMake;
  })().catch(e=>{pdfReady=null;throw e;});
  return pdfReady;
}
export async function exportFile(doc, format, metadata) {
  if (format === 'md') return new File([`<!-- happy-notes ${JSON.stringify(metadata)} -->\n\n`,doc.content],safeFilename(doc.title,'md'),{type:'text/markdown;charset=utf-8'});
  const html = markdownHtml(doc.content);
  if (format === 'docx') {
    const host = document.createElement('div'); host.innerHTML = html;
    const numbering = []; const children = docxBlocks(host,numbering);
    const file = new Document({creator:'Happy Notes',title:doc.title,description:'HappyNotes:'+JSON.stringify(metadata),
      styles:{default:{document:{run:{font:'Arial',size:22},paragraph:{spacing:{after:140}}}}},
      numbering:{config:numbering}, sections:[{properties:{page:{margin:{top:960,bottom:960,left:960,right:960}}},children}]});
    const blob = await Packer.toBlob(file);
    return new File([blob],safeFilename(doc.title,'docx'),{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  }
  const pdfMake = await getPdfmake();
  const content = htmlToPdfmake(html,{window,defaultStyles:{h1:{fontSize:21,margin:[0,10,0,12]},h2:{fontSize:16,margin:[0,15,0,8]},h3:{fontSize:13,margin:[0,12,0,6]},p:{margin:[0,0,0,8]},table:{margin:[0,5,0,10]},th:{bold:true,fillColor:'#F1EEFA'}}});
  const fitTables = nodes => { for (const n of Array.isArray(nodes)?nodes:[nodes]) { if (!n || typeof n!=='object') continue;
    if (n.table) { const count = n.table.body[0]?.length||1; n.table.widths=Array(count).fill('*'); n.fontSize=count>5?7:9; }
    if(n.stack)fitTables(n.stack); if(n.table)for(const r of n.table.body)fitTables(r);
  }}; fitTables(content);
  const blob = await pdfMake.createPdf({info:{title:doc.title,author:'Happy Notes'},pageSize:'A4',pageMargins:[40,44,40,44],
    defaultStyle:{font:'Roboto',fontSize:11,lineHeight:1.25,color:'#252235'},content,
    footer:(current,total)=>({text:`Happy Notes · ${current} / ${total}`,fontSize:8,color:'#777777',alignment:'center',margin:[0,14,0,0]})
  }).getBlob();
  return new File([blob],safeFilename(doc.title,'pdf'),{type:'application/pdf'});
}
