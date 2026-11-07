"""Package the complete Day UI as one file without external UI dependencies."""
from pathlib import Path
import base64
import html
import mimetypes
import re

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT
ORIGIN = 'https://astamurberlin-rgb.github.io/happyamurio/day-52'
OUT = DIST / 'day-52' / 'Happy-Day-52.html'
dependencies = set()

def data_url(data, mime):
    return 'data:' + mime + ';base64,' + base64.b64encode(data).decode()

def resolve(ref, parent):
    p = (parent / ref.split('?')[0].split('#')[0]).resolve()
    if not p.is_relative_to(DIST) or not p.is_file():
        raise ValueError('Unresolved bundled asset: ' + str(p))
    dependencies.add(p)
    return p

def resource(ref, parent):
    p = resolve(ref, parent)
    return data_url(p.read_bytes(), mimetypes.guess_type(p.name)[0] or 'application/octet-stream')

def css(text, parent):
    def repl(m):
        ref = m.group(1).strip().strip('\"\'')
        if ref.startswith(('data:', '#', 'http:', 'https:')):
            return m.group(0)
        return 'url("' + resource(ref, parent) + '")'
    return re.sub(r'url\(([^)]+)\)', repl, text)

module_cache = {}
def module(p):
    if p in module_cache:
        return module_cache[p]
    dependencies.add(p)
    text = re.sub(r"(from\s+)(['\"])(\.[^'\"]+)\2", lambda m: m.group(1) + "'" + module(resolve(m.group(3), p.parent)) + "'", p.read_text())
    result = data_url(text.encode(), 'text/javascript')
    module_cache[p] = result
    return result

def package(p):
    text = p.read_text()
    def script(m):
        attrs = m.group(1)
        match = re.search(r'\bsrc="([^"]+)"', attrs)
        if not match:
            return m.group(0)
        src = resolve(match.group(1), p.parent)
        url = module(src) if 'type="module"' in attrs else data_url(src.read_bytes(), 'text/javascript')
        return '<script' + attrs[:match.start(1)] + url + attrs[match.end(1):] + '>' + m.group(2) + '</script>'
    text = re.sub(r'<script\b([^>]*)>(.*?)</script>', script, text, flags=re.S)
    def link(m):
        tag = m.group(0)
        ref = re.search(r'href="([^"]+)"', tag)
        if not ref:
            return tag
        if 'rel="manifest"' in tag:
            return ''  # A downloaded document has no installable URL scope.
        if 'rel="stylesheet"' in tag:
            src = resolve(ref.group(1), p.parent)
            return '<style>' + css(src.read_text(), src.parent) + '</style>'
        return tag[:ref.start(1)] + resource(ref.group(1), p.parent) + tag[ref.end(1):]
    text = re.sub(r'<link\b[^>]*>', link, text)
    # Inline styles in Day contain no relative resources; process them too.
    text = re.sub(r'<style([^>]*)>(.*?)</style>', lambda m: '<style' + m.group(1) + '>' + css(m.group(2), p.parent) + '</style>', text, flags=re.S)
    return text

text = package(DIST / 'day-52/index.html')
studio = package(DIST / 'day-52/arc-studio/index.html')
studio = studio.replace('href="../"', 'href="#" data-close-studio')
studio += '<script>document.addEventListener("click",function(e){if(e.target.closest("[data-close-studio]")){e.preventDefault();parent.postMessage("happy-day-close-studio","*")}})</script>'
text = text.replace('href="./arc-studio/"', 'href="#arc-studio" data-open-studio')
text = text.replace('href="../Happy-Day-52.html"', 'href="' + ORIGIN + '/Happy-Day-52.html"')
overlay = '''
<dialog id="standalone-studio" style="position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;border:0;padding:0;background:#101e2c">
<iframe title="Студия дуг" style="border:0;width:100%;height:100%" id="standalone-studio-frame"></iframe></dialog>
<script>
(function(){
const dialog=document.getElementById('standalone-studio'),frame=document.getElementById('standalone-studio-frame');
document.addEventListener('click',function(e){if(!e.target.closest('[data-open-studio]'))return;e.preventDefault();
if(!frame.srcdoc)frame.srcdoc=new TextDecoder().decode(Uint8Array.from(atob('STUDIO_BASE64'),c=>c.charCodeAt(0)));dialog.showModal();});
window.addEventListener('message',function(e){if(e.source===frame.contentWindow&&e.data==='happy-day-close-studio'){dialog.close();window.dispatchEvent(new Event('focus'));}});
})();
</script>
'''.replace('STUDIO_BASE64', base64.b64encode(studio.encode()).decode())
text = text.replace('</body>', overlay + '</body>')
OUT.write_text(text)
print(f'Built {OUT.name}: {OUT.stat().st_size:,} bytes, {len(dependencies)} embedded source assets')
