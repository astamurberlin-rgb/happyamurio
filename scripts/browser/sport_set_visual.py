"""Сверка строки последнего подхода и кнопки под ней с принятым видом Sport."""
from math import ceil, floor
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageOps


REFERENCE = Path(__file__).with_name("baselines") / "sport-set.png"


def capture(page, row, button, path):
    button.scroll_into_view_if_needed()
    page.evaluate("document.fonts.ready")
    boxes = [row.bounding_box(), button.bounding_box()]
    if not all(boxes):
        raise AssertionError("Не видны строка подхода и кнопка «＋ Подход»")
    left = floor(min(b["x"] for b in boxes))
    top = floor(min(b["y"] for b in boxes))
    right = ceil(max(b["x"] + b["width"] for b in boxes))
    bottom = ceil(max(b["y"] + b["height"] for b in boxes))
    page.screenshot(path=path, animations="disabled", caret="hide",
                    clip={"x": left, "y": top, "width": right - left, "height": bottom - top})


def compare(reference, current, report_path):
    size = (max(reference.width, current.width), max(reference.height, current.height))
    # Чёрная маска внутри общей части, белая там, где один снимок шире или выше другого.
    mask = Image.new("L", size)
    mask.paste(255, (0, 0, *reference.size))
    mask.paste(255, (0, 0, *current.size))
    overlap = (0, 0, min(reference.width, current.width), min(reference.height, current.height))
    red, green, blue = ImageChops.difference(reference.crop(overlap), current.crop(overlap)).split()
    difference = ImageChops.lighter(red, ImageChops.lighter(green, blue))
    mask.paste(difference.point(lambda value: 255 if value else 0), (0, 0))
    changed = mask.histogram()[255]

    highlight = Image.new("RGB", size, "white")
    highlight.paste(ImageOps.grayscale(current).convert("RGB"))
    highlight.paste((255, 38, 106), mask=mask)
    panels = [("Было", reference), ("Стало", current),
              ("Разница" if changed else "Разница · совпадает", highlight)]
    font = ImageFont.truetype("LiberationSans-Regular.ttf", 25)
    pad, label = 20, 43
    report = Image.new("RGB", (size[0] + 2 * pad, pad + len(panels) * (label + size[1] + pad)), "white")
    draw = ImageDraw.Draw(report)
    y = pad
    for caption, picture in panels:
        draw.text((pad, y), caption, font=font, fill="#1b2130")
        report.paste(picture, (pad, y + label))
        y += label + size[1] + pad
    report.save(report_path)
    return changed


def check_set_picture(page, row, button, output):
    output = Path(output)
    actual = output / "sport-set-current.png"
    capture(page, row, button, actual)

    if not REFERENCE.is_file():
        return {"matches": False, "message": "Эталон отсутствует. Снимок сохранён в sport-set-current.png."}
    with Image.open(REFERENCE) as expected, Image.open(actual) as current:
        changed = compare(expected.convert("RGB"), current.convert("RGB"), output / "sport-set-report.png")
    return {"matches": changed == 0, "pixels": changed,
            "message": f"Строка подхода и «＋ Подход»: изменено пикселей — {changed}"}
