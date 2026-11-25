"""Общие мелочи для маски силуэта."""
import numpy as np


def row_spans(row, thr=0.5):
    """Отрезки строки, где покрытие выше порога; границы с точностью до доли пикселя (в координатах центров + 0.5)."""
    on = row > thr
    if not on.any():
        return []
    d = np.diff(on.astype(np.int8))
    starts = list(np.where(d == 1)[0] + 1)
    ends = list(np.where(d == -1)[0] + 1)
    if on[0]:
        starts = [0] + starts
    if on[-1]:
        ends = ends + [len(row)]
    out = []
    for s, e in zip(starts, ends):
        if s > 0:                                   # левая граница между пикселями s-1 и s
            a, b = row[s - 1], row[s]
            xl = (s - 1) + 0.5 + (thr - a) / max(b - a, 1e-6)
        else:
            xl = 0.0
        if e < len(row):                            # правая граница между пикселями e-1 и e
            a, b = row[e - 1], row[e]
            xr = (e - 1) + 0.5 + (a - thr) / max(a - b, 1e-6)
        else:
            xr = float(len(row))
        out.append((xl, xr))
    return out


def extend_down(m, start, n_rows, look=14, max_slope=1.5):
    """Продолжить силуэт вниз от строки start-1 на n_rows строк, сохраняя наклон его краёв.

    m — маска (H x W, 0..1). Возвращает массив (start + n_rows) x W.
    """
    H, W = m.shape
    y0 = start - 1
    y1 = max(y0 - look, 0)
    s0, s1 = row_spans(m[y0]), row_spans(m[y1])
    if len(s0) == len(s1) and y0 > y1:
        slopes = [(float(np.clip((a0 - a1) / (y0 - y1), -max_slope, max_slope)),
                   float(np.clip((b0 - b1) / (y0 - y1), -max_slope, max_slope)))
                  for (a0, b0), (a1, b1) in zip(s0, s1)]
    else:
        slopes = [(0.0, 0.0)] * len(s0)
    x = np.arange(W, dtype=np.float32) + 0.5
    rows = np.zeros((n_rows, W), np.float32)
    for j in range(n_rows):
        dy = j + 1
        r = np.zeros(W, np.float32)
        for (xl, xr), (sl, sr) in zip(s0, slopes):
            a, b = xl + sl * dy, xr + sr * dy
            if b <= a:
                continue
            r = np.maximum(r, np.clip(x - a + 0.5, 0, 1) * np.clip(b - x + 0.5, 0, 1))
        rows[j] = r
    return np.concatenate([m[:start], rows], axis=0)
