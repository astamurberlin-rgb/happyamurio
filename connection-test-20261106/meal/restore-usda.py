"""Восстановить два JSON-файла USDA из проверенного снимка Happy Meal."""

import gzip
import hashlib
import os
from pathlib import Path
from tempfile import TemporaryDirectory


ROOT = Path(__file__).resolve().parent
FILES = (
    ROOT / "meal-data" / "usda-sr-legacy.json",
    ROOT / "dist" / "meal-data" / "usda-sr-legacy.json",
)
JSON_BYTES = 15922487
JSON_SHA256 = "2fb25ebb266524ab4a1b564097ca54a5f56ecca29306a5667908b4abb7be2201"
GZIP_SHA256 = "5f67c1d39b62a0c8402944e8f6307ba14b888e0c7ce027234cd73ac14ae60417"


def matches_original(data):
    return len(data) == JSON_BYTES and hashlib.sha256(data).hexdigest() == JSON_SHA256


def load_payload():
    first, second = [path.with_suffix(".json.gz") for path in FILES]
    compressed = first.read_bytes()
    if hashlib.sha256(compressed).hexdigest() != GZIP_SHA256:
        raise ValueError(f"Неверная контрольная сумма архива {first}")
    if second.read_bytes() != compressed:
        raise ValueError(f"Содержимое архива {second} отличается от проверенного архива {first}")
    data = gzip.decompress(compressed)
    if not matches_original(data):
        raise ValueError("Размер или SHA-256 распакованного JSON отличается от исходного")
    return data


def already_restored(path):
    if path.is_symlink():
        raise ValueError(f"По пути {path} находится символическая ссылка")
    if not path.exists():
        return False
    if not path.is_file() or path.stat().st_size != JSON_BYTES or not matches_original(path.read_bytes()):
        raise ValueError(f"По пути {path} уже есть другой файл. Сохраните его отдельно и повторите команду.")
    return True


def restore():
    data = load_payload()
    missing = [path for path in FILES if not already_restored(path)]
    for path in missing:
        with TemporaryDirectory(dir=path.parent) as folder:
            temp = Path(folder) / "usda.json"
            temp.write_bytes(data)
            try:
                os.link(temp, path)
            except FileExistsError:
                if not already_restored(path):
                    raise
    for path in FILES:
        if not already_restored(path):
            raise ValueError(f"Отсутствует восстановленный файл {path}")
        print(f"OK  {path.relative_to(ROOT)}  ({JSON_BYTES} байт)")
    print(f"SHA-256  {JSON_SHA256}")


if __name__ == "__main__":
    try:
        restore()
    except (OSError, ValueError, EOFError) as error:
        raise SystemExit(f"Восстановление остановлено. {error}") from None
