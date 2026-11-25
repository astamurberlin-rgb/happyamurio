#!/usr/bin/env python3
"""Вспомогательное: маска формы иконки iOS и уменьшенные превью.
python3 -I preview.py mask <png 1024> <выход png> <размер>   — иконка в скруглённой форме, прозрачные углы
"""
import sys
import numpy as np
from PIL import Image
import cv2


def squircle(n, ss=4, power=5.0):
    """Форма иконки iOS для превью: суперэллипс (как у значков iPhone), сглаженный край."""
    m = n * ss
    c = (np.arange(m, dtype=np.float32) + 0.5) / m * 2 - 1
    x, y = np.meshgrid(np.abs(c), np.abs(c))
    a = ((x ** power + y ** power) <= 1.0).astype(np.float32)
    return cv2.resize(a, (n, n), interpolation=cv2.INTER_AREA)


def masked(path, size):
    im = Image.open(path).convert('RGB')
    if im.size[0] != size:
        im = im.resize((size, size), Image.LANCZOS)
    a = (squircle(size) * 255 + 0.5).astype(np.uint8)
    out = im.convert('RGBA')
    out.putalpha(Image.fromarray(a))
    return out


if __name__ == '__main__':
    if sys.argv[1] == 'mask':
        masked(sys.argv[2], int(sys.argv[4])).save(sys.argv[3])
        print(sys.argv[3])
