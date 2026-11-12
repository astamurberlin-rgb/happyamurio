import { marked } from 'marked';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
export { marked, DOMPurify };
const converter = new TurndownService({ headingStyle:'atx', codeBlockStyle:'fenced', bulletListMarker:'-' });
converter.use(gfm);
converter.keep(['small', 'sub', 'sup', 'details', 'summary']);
converter.addRule('imagePlaceholder',{
  filter:node=>node.nodeName==='A'&&node.hasAttribute('data-notes-image'),
  replacement:(_,node)=>'!['+(node.getAttribute('title')||'').replace(/([\[\]])/g,'\\$1')+'](<'+(node.getAttribute('data-notes-image')||'').replace(/>/g,'%3E')+'>)'
});
export function cleanHtml(html) {
  const clean=DOMPurify.sanitize(html, {
    ALLOWED_TAGS:['p','br','div','h1','h2','h3','h4','h5','h6','strong','b','em','i','u','s','del','ul','ol','li','blockquote','pre','code','a','img','hr','table','thead','tbody','tr','th','td','small','sub','sup','details','summary'],
    ALLOWED_ATTR:['href','title','start','colspan','rowspan','src','alt','data-notes-image'], ALLOW_DATA_ATTR:false
  });
  // A template is inert: image resources are never requested while editing/exporting.
  const template=document.createElement('template');template.innerHTML=clean;
  for(const img of template.content.querySelectorAll('img')) {
    const a=document.createElement('a'),src=img.getAttribute('src')||'',alt=img.getAttribute('alt')||'';
    a.setAttribute('data-notes-image',src);a.setAttribute('title',alt);a.textContent='Изображение: '+(alt||src||'без подписи');
    if(/^https?:\/\//i.test(src))a.href=src;img.replaceWith(a);
  }
  return template.innerHTML;
}
export function markdownHtml(content) { return cleanHtml(marked.parse(content, {gfm:true, breaks:true})); }
export function htmlMarkdown(html) { return converter.turndown(cleanHtml(html)); }
export function plainText(content) {
  const div = document.createElement('div'); div.innerHTML = markdownHtml(content);
  return div.textContent;
}
