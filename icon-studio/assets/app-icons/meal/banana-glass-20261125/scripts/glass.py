#!/usr/bin/env python3
"""Шаг 2. Белое матовое стекло с небольшой толщиной из силуэта (имитация вида, не материал Apple).

Запуск: python3 -I glass.py <папка с mask_814.npy и bg_814.npy> [имена вариантов...]
Результат: glass-<вариант>-1024.png — квадрат 1024 без скругления (углы режет система).

Все размеры в параметрах — в пикселях готовой иконки 1024. Считаем на 2048, маску — на 4096.
Свет идёт из левого верхнего угла. Кромка яркая на гранях к свету и гаснет к правому нижнему углу.
"""
import sys
import numpy as np
from PIL import Image
import cv2
from scipy import ndimage as ndi

sys.path.insert(0, '/home/claude/work/scripts')
from maskutil import extend_down

D = sys.argv[1].rstrip('/') + '/'
N = 1024
SS = 2                    # расчёт на 2048
MS = 2                    # маска и расстояния ещё вдвое крупнее (4096)
PAD, PADB = 64, 176       # поля вокруг холста (в px 1024); снизу больше: силуэт уходит за край

P0 = dict(
    light=38.0,           # откуда свет: градусы от вертикали в сторону левого края
    smooth=0.9,           # сглаживание контура, в пикселях исходной картинки
    # тело стекла
    white=(0.965, 0.972, 0.980),   # белый «матовой» поверхности (чуть ниже чистого белого, чтобы кромка читалась)
    op_top=0.955, op_bot=0.80,     # плотность белого: со стороны света и с дальней стороны
    frost=22.0,           # размытие фона под стеклом
    # кромка
    rim_w=3.4,            # ширина светлой кромки
    rim_soft=0.5,         # запас мягкости на внутренней границе
    rim_flat=0.45,        # доля ширины, где кромка держит полную яркость
    rim_gamma=1.0,
    rim_lit=1.0,          # яркость на гранях к свету
    rim_dark=0.0,         # яркость на гранях от света
    rim_lo=0.18, rim_hi=0.86, rim_pow=1.25,   # как быстро кромка гаснет при повороте грани от света
    edge_zone=6.0, edge_clear=0.90,           # у светлой кромки стекло чуть прозрачнее
    dark_w=2.0, dark_k=0.36,                  # тонкая тёмная линия на гранях от света
    # тени на фоне (толщина пластины)
    tight_off=3.0, tight_sig=2.0, tight_k=0.62,
    soft_off=13.0, soft_sig=13.0, soft_k=0.40,
    shade=(0.20, 0.30, 0.46),                 # во что уходит фон в тени (цветная, не чёрная)
)

VARIANTS = {
    '1': dict(label='тоньше', over=dict(rim_w=2.4, edge_zone=4.5, dark_w=1.4,
                                         tight_off=1.7, tight_sig=1.3, tight_k=0.56,
                                         soft_off=7.5, soft_sig=8.5, soft_k=0.34)),
    '2': dict(label='средняя', over=dict()),
    # прижата к фону: тень короткая и плотная, без далёкого мягкого ореола
    'A': dict(label='прижата', over=dict(tight_off=1.6, tight_sig=1.5, tight_k=0.55,
                                          soft_off=3.2, soft_sig=3.6, soft_k=0.26)),
    'B': dict(label='вплотную', over=dict(tight_off=1.1, tight_sig=1.2, tight_k=0.50,
                                           soft_off=1.8, soft_sig=2.2, soft_k=0.16)),
    '3': dict(label='толще', over=dict(rim_w=4.8, edge_zone=8.5, dark_w=2.8,
                                        tight_off=4.8, tight_sig=2.8, tight_k=0.66,
                                        soft_off=20.0, soft_sig=18.0, soft_k=0.44)),
}


def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def blur(a, sig):
    if sig <= 0:
        return a
    return cv2.GaussianBlur(a, (0, 0), sigmaX=float(sig), sigmaY=float(sig), borderType=cv2.BORDER_REPLICATE)


def load_fields(smooth):
    """Знаковое расстояние до контура (в px рабочего холста 2048, плюс снаружи) и фон."""
    m = np.load(D + 'mask_814.npy')
    big = N * SS * MS
    m = cv2.resize(m, (big, big), interpolation=cv2.INTER_CUBIC)
    p, pb = PAD * SS * MS, PADB * SS * MS
    m = np.pad(m, ((p, 0), (p, p)), mode='constant')
    m = extend_down(m, m.shape[0], pb, look=int(14 * big / 814.0))         # вниз силуэт продолжается с тем же наклоном краёв
    m = blur(m, smooth * big / 814.0)
    inside = m > 0.5
    d_in = ndi.distance_transform_edt(inside).astype(np.float32)
    d_out = ndi.distance_transform_edt(~inside).astype(np.float32)
    sd = np.where(inside, -(d_in - 0.5), d_out - 0.5)
    h, w = sd.shape
    sd = cv2.resize(sd, (w // MS, h // MS), interpolation=cv2.INTER_AREA) / MS
    sd = blur(sd, 0.6)
    bg = np.load(D + 'bg_814.npy')
    bg = cv2.resize(bg, (N * SS, N * SS), interpolation=cv2.INTER_CUBIC)
    q, qb = PAD * SS, PADB * SS
    bg = np.pad(bg, ((q, qb), (q, q), (0, 0)), mode='edge')
    return sd.astype(np.float32), np.clip(bg, 0, 1).astype(np.float32)


def render(P, sd, bg):
    H, W = sd.shape
    cov = np.clip(0.5 - sd, 0, 1)                       # покрытие стеклом, со сглаженным краем
    din = np.clip(-sd / SS, 0, None)                    # расстояние внутрь от края, px 1024

    # наружная нормаль контура и её поворот к свету
    s2 = blur(sd, 1.6 * SS)
    gy, gx = np.gradient(s2)
    g = np.sqrt(gx * gx + gy * gy) + 1e-6
    a = np.deg2rad(P['light'])
    lx, ly = -np.sin(a), -np.cos(a)                     # направление на свет (y вниз)
    facing = (gx * lx + gy * ly) / g                    # +1: грань смотрит на свет
    sdir = sstep(P['rim_lo'], P['rim_hi'], (facing + 1) * 0.5) ** P['rim_pow']

    # --- тени на фоне: тонкая у самого края + мягкая; смещены от света
    def cast(off, sig):
        sh = ndi.shift(cov, (-ly * off * SS, -lx * off * SS), order=1, mode='nearest')
        return blur(sh, sig * SS)
    sh = 1 - (1 - P['tight_k'] * cast(P['tight_off'], P['tight_sig'])) * (1 - P['soft_k'] * cast(P['soft_off'], P['soft_sig']))
    shade = np.array(P['shade'], np.float32)
    under = bg * (1 - sh[..., None]) + bg * shade * sh[..., None]

    # --- тело: белая матовая поверхность, сквозь неё чуть виден размытый фон
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    cx, cy = (PAD + N / 2) * SS, (PAD + N / 2) * SS
    s = ((xx - cx) * (-lx) + (yy - cy) * (-ly)) / (N * SS) + 0.5      # 0 у света, 1 на дальней стороне
    op = P['op_top'] + (P['op_bot'] - P['op_top']) * sstep(0.12, 0.92, s)
    ec = 1.0 - (1.0 - P['edge_clear']) * sdir
    op = op * (ec + (1 - ec) * sstep(0, 1, din / P['edge_zone']))
    bgf = blur(bg, P['frost'] * SS)
    white = np.array(P['white'], np.float32)
    col = bgf * (1 - op[..., None]) + white * op[..., None]

    # --- тонкая тёмная линия на гранях от света
    dk = P['dark_k'] * np.exp(-(din / P['dark_w']) ** 2) * (1 - sdir)
    col = col * (1 - dk[..., None]) + (bgf * 0.55 + 0.25) * dk[..., None]

    # --- светлая кромка: ярче всего у самого края, внутрь сходит на нет за свою ширину (узко, без «размазанности»)
    rim = (1 - sstep(P['rim_w'] * P['rim_flat'], P['rim_w'] + P['rim_soft'], din)) ** P['rim_gamma']
    rim = rim * (P['rim_dark'] + (P['rim_lit'] - P['rim_dark']) * sdir)
    col = col + (1 - col) * rim[..., None]

    out = under * (1 - cov[..., None]) + col * cov[..., None]
    q = PAD * SS
    out = out[q:q + N * SS, q:q + N * SS]
    out = cv2.resize(out, (N, N), interpolation=cv2.INTER_AREA)
    rng = np.random.default_rng(7)
    out = np.clip(out * 255 + rng.uniform(-0.5, 0.5, out.shape), 0, 255)
    return (out + 0.5).astype(np.uint8)


def main():
    names = sys.argv[2:] or list(VARIANTS)
    cache = {}
    for name in names:
        P = dict(P0, **VARIANTS[name]['over'])
        if P['smooth'] not in cache:
            cache[P['smooth']] = load_fields(P['smooth'])
        sd, bg = cache[P['smooth']]
        img = render(P, sd, bg)
        Image.fromarray(img).save(D + 'glass-%s-1024.png' % name)
        print('вариант', name, VARIANTS[name]['label'], img.shape)


if __name__ == '__main__':
    main()
