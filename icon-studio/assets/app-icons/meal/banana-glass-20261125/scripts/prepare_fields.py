#!/usr/bin/env python3
"""Поля mask_814.npy и bg_814.npy для glass.py из материалов Icon Studio (Day и Sport).

python3 -I prepare_fields.py layers <фон png 1024> <силуэт png с прозрачностью 1024> <папка>
    — когда в Icon Studio лежат два слоя (Sport): маска = прозрачность слоя силуэта, фон = слой фона.
python3 -I prepare_fields.py flat <плоская картинка: чёрный силуэт на градиенте> <папка>
    — когда слоёв нет (Day, версия 4): фон вне силуэта берётся из картинки как есть,
      под силуэтом достраивается гладкой моделью; маска — доля чёрного в пикселе.
Фон и силуэт не меняются: это те же пиксели, пересчитанные в размер 814.
— Claude · 25.11.2026
"""
import sys
import numpy as np
from PIL import Image
import cv2
from scipy import ndimage as ndi

N = 814
mode, OUT = sys.argv[1], sys.argv[-1].rstrip('/') + '/'


def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def to814(a):
    return cv2.resize(a, (N, N), interpolation=cv2.INTER_AREA)


if mode == 'layers':
    bg = np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(np.float32) / 255
    fg = np.asarray(Image.open(sys.argv[3]).convert('RGBA')).astype(np.float32) / 255
    a = to814(fg[..., 3])
    bg = to814(bg)
else:
    sq = np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(np.float32) / 255
    S = sq.shape[0]
    V = sq.max(-1)
    rough = V < 0.42
    known = ~ndi.binary_dilation(rough, iterations=8)
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32) / (S - 1.0) * 2 - 1
    DEG = 4
    terms = [(i, j) for i in range(DEG + 1) for j in range(DEG + 1 - i)]
    A = np.stack([xx[known] ** i * yy[known] ** j for i, j in terms], -1).astype(np.float64)
    coef = np.linalg.solve(A.T @ A + 1e-3 * len(A) * np.eye(len(terms)), A.T @ sq[known].astype(np.float64))
    fit = np.zeros((S, S, 3), np.float64)
    for k, (i, j) in enumerate(terms):
        fit += (xx ** i * yy ** j)[..., None] * coef[k]
    fit = fit.astype(np.float32)
    res = sq - fit
    dist, (iy, ix) = ndi.distance_transform_edt(~known, return_indices=True)
    nn = res[iy, ix]
    k = S / 814.0
    levels = [(4.0 * k, 0.0), (10.0 * k, 6.0 * k), (28.0 * k, 22.0 * k), (80.0 * k, 70.0 * k)]
    sm = [np.stack([ndi.gaussian_filter(nn[..., c], s, mode='nearest') for c in range(3)], -1) for s, _ in levels]
    corr = sm[0]
    for q in range(1, len(levels)):
        w = sstep(levels[q][1] * 0.5, levels[q][1] * 1.5, dist)[..., None]
        corr = corr * (1 - w) + sm[q] * w
    model = np.clip(fit + corr, 0, 1)
    w = sstep(0, 3.0 * k, dist)[..., None]                 # вне силуэта — пиксели картинки как есть
    bgf = sq * (1 - w) + model * w
    a = 1.0 - (sq * bgf).sum(-1) / np.maximum((bgf * bgf).sum(-1), 1e-6)
    a = np.clip((np.clip(a, 0, 1) - 0.04) / (0.96 - 0.04), 0, 1)
    a[known] = 0
    print('фон: модель против картинки на видимых пикселях, СКО', np.sqrt(((model - sq)[known] ** 2).mean(0)).round(4))
    a, bg = to814(a), to814(bgf)

a = np.clip(a, 0, 1).astype(np.float32)
bg = np.clip(bg, 0, 1).astype(np.float32)
np.save(OUT + 'mask_814.npy', a)
np.save(OUT + 'bg_814.npy', bg)
Image.fromarray((a * 255 + 0.5).astype(np.uint8)).save(OUT + 'mask_814.png')
Image.fromarray((bg * 255 + 0.5).astype(np.uint8)).save(OUT + 'bg_814.png')
lab, n = ndi.label(a > 0.5)
sizes = sorted(map(int, ndi.sum(a > 0.5, lab, range(1, n + 1))), reverse=True)
labh, nh = ndi.label(a < 0.5)
hs = sorted(map(int, ndi.sum(a < 0.5, labh, range(1, nh + 1))), reverse=True)
print('маска: доля %.3f, кусков %d %s; пустых областей %d %s' % ((a > 0.5).mean(), n, sizes[:6], nh, hs[:8]))
print('низ: покрытие в последней строке', float(a[-1].max()))
