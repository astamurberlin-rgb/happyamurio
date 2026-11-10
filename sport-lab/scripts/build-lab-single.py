#!/usr/bin/env python3
"""Lab 10.11.2026 · Packs the lab copy (../sport-lab-dist/, built by build-lab.mjs) into ONE html file that opens by
double click or as an attachment: pictures become data: URIs, the exercise page travels inside the file and is shown
as an inline document. Nothing here is used by a release build.

Usage: python3 -I scripts/build-lab-single.py   →   ../sport-lab-dist/Happy-Sport-Lab.html
"""
import base64, io, json, re, sys
from pathlib import Path
from PIL import Image

dist = Path(__file__).resolve().parents[2] / 'sport-lab-dist'
html = (dist / 'index.html').read_text(encoding='utf-8')

def once(text, old, new):
    assert text.count(old) == 1, (old[:70], text.count(old))
    return text.replace(old, new)

def data_uri(path: Path, box=None):
    raw = path.read_bytes()
    kind = {'.png': 'png', '.webp': 'webp', '.jpg': 'jpeg'}[path.suffix]
    if box:
        image = Image.open(io.BytesIO(raw)).convert('RGBA')
        image.thumbnail((box, box), Image.LANCZOS)
        out = io.BytesIO(); image.save(out, 'PNG', optimize=True); raw, kind = out.getvalue(), 'png'
    return 'data:image/' + kind + ';base64,' + base64.b64encode(raw).decode()

# 1. Sport icons: shown at 64 css px at most, so 160 px is enough for a lab copy.
icons = 0
def icon(match):
    global icons; icons += 1
    return '"src":"' + data_uri(dist / 'assets' / 'sport-icons' / 'v1' / match.group(1), 160) + '"'
html = re.sub(r'"src":"\./assets/sport-icons/v1/([a-z]+/[A-Za-z0-9_.-]+\.png)"', icon, html)
assert icons >= 90, icons
html = once(html, "if(item)return item.src+'?v=36.3';", "if(item)return item.src;")

# 2. Exercise pictures (covers and phase frames), when the media library has any.
seed = re.search(r'(<script id="seed-data" type="application/json">)(.*?)(</script>)', html, flags=re.S)
data = json.loads(seed.group(2).replace('<\\/', '</'))
media_root = dist / 'assets' / 'exercise-media' / 'v1'
frames_by_path = {}
for item in data['exerciseMedia']['items'].values():
    if item.get('cover'): item['cover'] = data_uri(media_root / item['cover'], 160)
    for key, path in (item.get('frames') or {}).items():
        frames_by_path[path] = data_uri(media_root / path); item['frames'][key] = frames_by_path[path]
data['exerciseMedia']['base'] = ''
html = html[:seed.start(2)] + json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + html[seed.end(2):]

# 3. No separate files: drop links to the icon files and the install manifest.
html = re.sub(r'<link rel="(?:icon|apple-touch-icon|manifest)"[^>]*>', '', html)

# 4. Exercise pages travel inside the file; an inline document replaces the framed address.
pages = ''
for page in sorted((dist / 'exercises').glob('*.html')):
    text = page.read_text(encoding='utf-8')
    for path, uri in frames_by_path.items(): text = text.replace('"../assets/exercise-media/v1/' + path + '"', '"' + uri + '"')
    assert '../assets/exercise-media/' not in text
    pages += '<script type="text/plain" id="happy-exercise-page-' + page.stem + '">' + text.replace('</script', '<\\/script') + '</script>\n'
hook = r"""<script>(function(){
function mount(frame){
  if(frame.dataset.happyInline)return;
  var m=/(?:^|\/)exercises\/([a-z0-9-]+)\.html\?(.*)$/.exec(frame.getAttribute('src')||'');if(!m)return;
  var store=document.getElementById('happy-exercise-page-'+m[1]);if(!store)return;
  frame.dataset.happyInline='1';frame.removeAttribute('src');
  var close='<'+'/script';
  frame.srcdoc=store.textContent.replace(/<\\\/script/g,close).replace('<meta charset="utf-8">','<meta charset="utf-8"><script>window.HAPPY_PAGE_QUERY='+JSON.stringify(m[2])+close+'>');
}
function scan(node){if(node.nodeType!==1)return;if(node.matches('iframe.exercise-frame'))mount(node);node.querySelectorAll('iframe.exercise-frame').forEach(mount)}
new MutationObserver(function(list){list.forEach(function(r){r.addedNodes.forEach(scan)})}).observe(document.documentElement,{childList:true,subtree:true});
})();</script>
"""
cut = html.rindex('</body>')
html = html[:cut] + pages + hook + html[cut:]
assert './assets/' not in html.replace('"/happyamurio/assets/exercise-library/v1/"', ''), 'a relative library address is left in the file'

out = dist / 'Happy-Sport-Lab.html'
out.write_text(html, encoding='utf-8')
print('Single-file lab copy:', out, round(out.stat().st_size / 1e6, 2), 'MB;', icons, 'icons inlined')
