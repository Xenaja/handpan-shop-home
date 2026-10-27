"""Центральные линии колец знака U-GENE: из залитых полос — тонкие контуры для обводки (stroke).
Запуск: python -I scripts/logo-lines.py ../../logo/svg/U-GENE-icon.svg public/img/lines"""
import math, re, sys

src, out = sys.argv[1], sys.argv[2]
d = re.findall(r'<path[^>]*d="([^"]+)"', open(src, encoding='utf-8').read())[0]
subs = re.findall(r'M[^M]*', d)

def sample(p, step=0.25):
    toks = re.findall(r'[MCLZ]|-?\d+\.?\d*', p)
    pts, i, cur, start, cmd = [], 0, None, None, None
    while i < len(toks):
        t = toks[i]
        if t in 'MCLZ': cmd = t; i += 1
        if cmd == 'M':
            cur = start = (float(toks[i]), float(toks[i+1])); i += 2; pts.append(cur); cmd = 'L'
        elif cmd == 'L':
            if i < len(toks) and toks[i] not in 'MCLZ':
                nxt = (float(toks[i]), float(toks[i+1])); i += 2
                n = max(1, int(math.dist(cur, nxt) / step))
                pts += [(cur[0] + (nxt[0]-cur[0])*k/n, cur[1] + (nxt[1]-cur[1])*k/n) for k in range(1, n+1)]; cur = nxt
        elif cmd == 'C':
            if i < len(toks) and toks[i] not in 'MCLZ':
                c = [float(x) for x in toks[i:i+6]]; i += 6
                p0, p1, p2, p3 = cur, (c[0], c[1]), (c[2], c[3]), (c[4], c[5])
                L = math.dist(p0, p1) + math.dist(p1, p2) + math.dist(p2, p3)
                n = max(2, int(L / step))
                for k in range(1, n+1):
                    t_ = k / n; a = (1-t_)**3; b = 3*(1-t_)**2*t_; e = 3*(1-t_)*t_**2; f = t_**3
                    pts.append((a*p0[0]+b*p1[0]+e*p2[0]+f*p3[0], a*p0[1]+b*p1[1]+e*p2[1]+f*p3[1]))
                cur = p3
        elif cmd == 'Z':
            cur = start
    return pts

def resample(pts, n, closed):
    seg = [0.0]
    P = pts + ([pts[0]] if closed else [])
    for a, b in zip(P, P[1:]): seg.append(seg[-1] + math.dist(a, b))
    L, res, j = seg[-1], [], 0
    for k in range(n):
        s = L * k / (n if closed else n - 1)
        while j < len(seg) - 2 and seg[j+1] < s: j += 1
        t = (s - seg[j]) / max(1e-9, seg[j+1] - seg[j])
        res.append((P[j][0] + (P[j+1][0]-P[j][0])*t, P[j][1] + (P[j+1][1]-P[j][1])*t))
    return res

def smooth(pts, r, closed):
    n = len(pts); out = []
    for i in range(n):
        idx = [(i+k) % n if closed else min(n-1, max(0, i+k)) for k in range(-r, r+1)]
        out.append((sum(pts[j][0] for j in idx)/len(idx), sum(pts[j][1] for j in idx)/len(idx)))
    if not closed: out[0], out[-1] = pts[0], pts[-1]
    return out

def to_path(pts, closed):
    # Catmull-Rom → кубические Безье
    n = len(pts); P = lambda i: pts[i % n] if closed else pts[min(n-1, max(0, i))]
    s = f'M{pts[0][0]:.2f} {pts[0][1]:.2f}'
    for i in range(n if closed else n-1):
        p0, p1, p2, p3 = P(i-1), P(i), P(i+1), P(i+2)
        c1 = (p1[0] + (p2[0]-p0[0])/6, p1[1] + (p2[1]-p0[1])/6)
        c2 = (p2[0] - (p3[0]-p1[0])/6, p2[1] - (p3[1]-p1[1])/6)
        s += f'C{c1[0]:.2f} {c1[1]:.2f} {c2[0]:.2f} {c2[1]:.2f} {p2[0]:.2f} {p2[1]:.2f}'
    return s + ('Z' if closed else '')

def centre_closed(outer, inner):
    o = resample(sample(outer), 900, True); inn = resample(sample(inner), 900, True)
    return [((p[0]+q[0])/2, (p[1]+q[1])/2) for p in o for q in [min(inn, key=lambda q: math.dist(p, q))]]

def centre_band(p):
    # полоса с разрывом: контур идёт по внешнему краю, огибает торец и возвращается по внутреннему
    P = resample(sample(p), 1600, True); n = len(P)
    step = sum(math.dist(P[i], P[(i+1) % n]) for i in range(n)) / n
    K = max(6, int(4 * 2.8 / step))   # не ближе нескольких толщин полосы по контуру
    opp = []
    for i, a in enumerate(P):
        best = min((j for j in range(n) if min(abs(i-j), n-abs(i-j)) > K), key=lambda j: math.dist(a, P[j]))  # ближайшая точка другого края
        opp.append(best)
    # торцы — где «противоположная» точка ближе всего по индексу
    gap = [min(abs(i-opp[i]), n-abs(i-opp[i])) for i in range(n)]
    c1 = min(range(n), key=lambda i: gap[i])
    c2 = min((i for i in range(n) if min(abs(i-c1), n-abs(i-c1)) > n//4), key=lambda i: gap[i])
    a, b = sorted((c1, c2))
    arc = list(range(a, b+1)) if b - a <= n - (b - a) else list(range(b, n)) + list(range(0, a+1))
    # у торцов «противоположная» точка лежит на самом торце — такие точки отбрасываем по ширине полосы
    w = sorted(math.dist(P[i], P[opp[i]]) for i in arc)[len(arc)//2]
    arc = [i for i in arc if math.dist(P[i], P[opp[i]]) < w * 1.25]
    return [((P[i][0]+P[opp[i]][0])/2, (P[i][1]+P[opp[i]][1])/2) for i in arc]

def dot(*parts):
    pts = [q for p in parts for q in sample(p)]; xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return ((min(xs)+max(xs))/2, (min(ys)+max(ys))/2, (max(xs)-min(xs)+max(ys)-min(ys))/4)

def write(name, path, dots, closed):
    pts = [tuple(map(float, m)) for m in re.findall(r'(-?\d+\.?\d*) (-?\d+\.?\d*)', path)] + [(x, y) for x, y, _ in dots]
    pad = 6
    x0 = min(p[0] for p in pts) - pad; y0 = min(p[1] for p in pts) - pad
    w = max(p[0] for p in pts) + pad - x0; h = max(p[1] for p in pts) + pad - y0
    # толщина линии и точки не масштабируются вместе с картинкой: 1,5 px и 4–10 px при любом размере
    ns = 'stroke="#000" stroke-linecap="round" vector-effect="non-scaling-stroke"'
    circ = ''.join(f'<path d="M{x:.2f} {y:.2f}h0" {ns} stroke-width="{round(1.0 * r)}"/>' for x, y, r in dots)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0:.1f} {y0:.1f} {w:.1f} {h:.1f}" fill="none">'
           f'<path d="{path}" {ns} stroke-width="1.5"/>{circ}</svg>\n')
    open(f'{out}/{name}.svg', 'w', encoding='utf-8').write(svg)

inner = smooth(resample(centre_closed(subs[1], subs[0]), 140, True), 2, True)
write('line-inner', to_path(inner, True), [dot(subs[11])], True)
mid = smooth(resample(centre_band(subs[2]), 160, False), 3, False)
write('line-middle', to_path(mid, False), [dot(subs[7], subs[8], subs[9])], False)
outer = smooth(resample(centre_band(subs[3]), 200, False), 3, False)
write('line-outer', to_path(outer, False), [dot(subs[4], subs[5], subs[6]), dot(subs[10])], False)
print('ok')
