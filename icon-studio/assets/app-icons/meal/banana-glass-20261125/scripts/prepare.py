#!/usr/bin/env python3
"""Шаг 1. Из картинки Астамура достаём фон без силуэта и чистую маску силуэта.

Запуск: python3 -I prepare.py <картинка> <папка для результата>
Результат: bg_814.npy (фон, float 0..1), mask_814.npy (покрытие силуэтом 0..1), картинки для проверки.

Квадрат иконки на картинке: x 37..850, y 193..1006 (814 x 814). Справа картинка обрезана
на 10 px — эта полоса достраивается моделью фона. Силуэт внизу уходит за край иконки.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

sys.path.insert(0, '/home/claude/work/scripts')
from maskutil import extend_down, row_spans

SRC, OUT = sys.argv[1], sys.argv[2].rstrip('/') + '/'
X0, Y0, N = 37, 193, 814


def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


im = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32) / 255
need = X0 + N - im.shape[1]                              # сколько столбцов не хватает справа
if need > 0:
    im = np.concatenate([im, np.repeat(im[:, -1:, :], need, axis=1)], axis=1)
sq = im[Y0:Y0 + N, X0:X0 + N]

# --- поле вокруг иконки: серо-синий цвет, связанный с краем квадрата (а не случайные пиксели на кромке силуэта)
outer_col = np.array([0x5e, 0x81, 0xa2], np.float32) / 255
near_outer = np.sqrt(((sq - outer_col) ** 2).sum(-1)) < 30 / 255
lab, n = ndi.label(near_outer)
border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
is_outer = np.isin(lab, border[border > 0])
is_outer[:, N - need:] = False
interior = ~is_outer

# --- грубая маска чёрного (для выбора «чистых» пикселей фона)
V = sq.max(-1)
rough = (V < 0.42) & interior
known = ~ndi.binary_dilation(rough, iterations=8) & ndi.binary_erosion(interior, iterations=9, border_value=1)
known[:, N - need - 3:] = False
EDGE = 11                                                # у прямых краёв иконки пиксели смешаны с полем
known[:EDGE, :] = False
known[N - EDGE:, :] = False
known[:, :EDGE] = False

# --- фон: гладкая модель (многочлен 4-й степени) + сглаженная поправка по видимым пикселям
yy, xx = np.mgrid[0:N, 0:N].astype(np.float32) / (N - 1.0) * 2 - 1
DEG = 4
terms = [(i, j) for i in range(DEG + 1) for j in range(DEG + 1 - i)]
A = np.stack([xx[known] ** i * yy[known] ** j for i, j in terms], -1).astype(np.float64)
coef = np.linalg.solve(A.T @ A + 1e-3 * len(A) * np.eye(len(terms)), A.T @ sq[known].astype(np.float64))
fit = np.zeros((N, N, 3), np.float64)
for k, (i, j) in enumerate(terms):
    fit += (xx ** i * yy ** j)[..., None] * coef[k]
fit = fit.astype(np.float32)
res = sq - fit
# поправка там, где фон не виден: берём значение ближайшего видимого пикселя и сглаживаем тем сильнее,
# чем дальше от видимого (у самой границы поправка непрерывна, под силуэтом — плавная)
dist, (iy, ix) = ndi.distance_transform_edt(~known, return_indices=True)
nn = res[iy, ix]
levels = [(4.0, 0.0), (10.0, 6.0), (28.0, 22.0), (80.0, 70.0)]       # (сглаживание, с какого расстояния)
sm = [np.stack([ndi.gaussian_filter(nn[..., c], s, mode='nearest') for c in range(3)], -1) for s, _ in levels]
corr = sm[0]
for k in range(1, len(levels)):
    w = sstep(levels[k][1] * 0.5, levels[k][1] * 1.5, dist)[..., None]
    corr = corr * (1 - w) + sm[k] * w
bg = np.clip(fit + corr, 0, 1).astype(np.float32)
d = (bg - sq)[known]
print('фон: отличие от картинки на видимых пикселях, СКО', np.sqrt((d ** 2).mean(0)).round(4))

# --- маска: пиксель = (1 - a) * фон + a * чёрный  ->  a = 1 - <c, B> / <B, B>
a = 1.0 - (sq * bg).sum(-1) / np.maximum((bg * bg).sum(-1), 1e-6)
a = np.clip(a, 0, 1)
# убираем шум JPEG на ровных местах, не трогая сам край
a = np.clip((a - 0.04) / (0.96 - 0.04), 0, 1)
safe = ndi.binary_erosion(interior, iterations=8, border_value=1)
safe[N - 12:, 150:650] = True                            # нижний прямой край: силуэт доходит до него
safe[:, N - need - 1:] = False                           # достроенная полоса справа: силуэта там нет
a[~safe] = 0
a[:EDGE + 1, :] = 0                                      # у краёв квадрата силуэта нет (кроме низа)
a[:, :EDGE + 1] = 0
a[:, N - EDGE - 1:] = 0
CUT = N - 5                                              # внизу силуэт уходит за край; последние строки смешаны с полем —
a = extend_down(a, CUT, N - CUT)                         # продолжаем края с их наклоном
print('низ силуэта: отрезки в строке %d: %s' % (CUT - 1, [(round(l, 1), round(r, 1)) for l, r in row_spans(a[CUT - 1])]))
np.save(OUT + 'mask_814.npy', a.astype(np.float32))
np.save(OUT + 'bg_814.npy', bg)
Image.fromarray((a * 255 + 0.5).astype(np.uint8)).save(OUT + 'mask_814.png')
Image.fromarray((bg * 255 + 0.5).astype(np.uint8)).save(OUT + 'bg_814.png')

# --- проверки
lab2, n2 = ndi.label(a > 0.5)
sizes = ndi.sum(a > 0.5, lab2, range(1, n2 + 1))
print('маска: доля площади %.3f, кусков %d, размеры кусков %s' % ((a > 0.5).mean(), n2, sorted(map(int, sizes), reverse=True)[:6]))
labh, nh = ndi.label(a < 0.5)
hs = ndi.sum(a < 0.5, labh, range(1, nh + 1))
print('пустых областей (фон + дырки): %d, размеры %s' % (nh, sorted(map(int, hs), reverse=True)[:6]))
haze = a[(a > 0) & (a < 0.5) & ~ndi.binary_dilation(a > 0.5, iterations=4)]
print('дымка вдали от края: пикселей', haze.size, 'макс', float(haze.max()) if haze.size else 0)
ys, xs = np.where(a > 0.5)
print('рамка силуэта: x %d..%d, y %d..%d (из %d)' % (xs.min(), xs.max(), ys.min(), ys.max(), N))
recon = bg * (1 - a[..., None])
sheet = np.concatenate([sq, recon, np.clip(0.5 + (recon - sq) * 4, 0, 1)], axis=1)
Image.fromarray((sheet * 255 + 0.5).astype(np.uint8)).save(OUT + 'prepare_check.png')
