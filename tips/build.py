"""Assemble the «Советы» page: src/template.html + the data in src/*.json + the ring mark from src/mark.svg -> index.html.

Run from the repository root: python3 tips/build.py
Do not edit index.html by hand: change the files in src/, then build. The build is repeatable: the version and
the date the numbers were taken come from src/meta.json, not from the clock.
"""
import json
import re
import sys
from pathlib import Path

here = Path(__file__).parent
src = here / "src"


def read(name):
    return (src / name).read_text(encoding="utf-8")


def data(name):
    return json.loads(read(name))


def embed(value):
    # JSON inside a <script> block: keep "</" from ending the block.
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


meta = data("meta.json")
keep_m = ("model", "label", "short", "order", "usd", "cost")
keep_v = ("task", "model", "label", "level", "word", "take", "basis")
models = [{k: m[k] for k in keep_m} for m in data("models.json")]
verdicts = [{k: v[k] for k in keep_v} for v in data("verdicts.json")]

page = read("template.html")
for token, value in (
    ("__MARK__", read("mark.svg").strip()),
    ("__MODELS__", embed(models)),
    ("__VERDICTS__", embed(verdicts)),
    ("__USAGE__", embed(data("usage.json"))),
    ("__FAST__", embed(data("fast.json"))),
    ("__D3__", '<script src="./assets/d3.min.js?v=7.9.0"></script>'),
    ("__VERSION__", meta["version"]),
    ("__UPDATED__", meta["updated"]),
):
    page = page.replace(token, value)

left = sorted(set(re.findall(r"__[A-Z0-9]+__", page)))
if left:
    sys.exit("placeholders left: " + ", ".join(left))
(here / "index.html").write_text(page, encoding="utf-8")
print("built Советы", meta["version"], len(page.encode("utf-8")), "bytes")
