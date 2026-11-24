"""Вливает карточки жарки в справочник cooking. argv: base.json fry-cards.json out.json [version]
tip — после последней прежней tip; cook — перед прежними cook (общие слова вроде «картош» иначе перехватят «какое масло…»).
Повтор id/источника — ошибка, если содержимое разное."""
import json, sys
base, fry = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
have = {c["id"] for c in base["cards"]}
src = {s["id"]: s for s in base["sources"]}
for s in fry["sources"]:
    if s["id"] in src and src[s["id"]] != s: sys.exit("источник с тем же id, но другой: " + s["id"])
    src[s["id"]] = s
new = [c for c in fry["cards"] if c["id"] not in have]
tips = [c for c in new if c["kind"] == "tip"]; cooks = [c for c in new if c["kind"] == "cook"]
cards = base["cards"]
last_tip = max([i for i, c in enumerate(cards) if c["kind"] == "tip"], default=-1)
cards = cards[:last_tip + 1] + tips + cards[last_tip + 1:]
first_cook = next((i for i, c in enumerate(cards) if c["kind"] == "cook"), len(cards))
cards = cards[:first_cook] + cooks + cards[first_cook:]
base["cards"] = cards; base["sources"] = list(src.values())
if len(sys.argv) > 4: base["version"] = sys.argv[4]
json.dump(base, open(sys.argv[3], "w"), ensure_ascii=False, separators=(",", ":"))
print(len(cards), "карточек, добавлено", len(new))
