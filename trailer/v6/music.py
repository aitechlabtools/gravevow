# Banda sonora original del tráiler v6 (la del v4, sintetizada, sin muestras externas). 120 bpm, sincronizada con los cortes.
import os
OUTDIR = os.environ.get('TRAILER_OUT', '/tmp/claude-0/t6/out6')
import json, numpy as np, wave
from scipy.signal import lfilter, butter
SR = 48000
c = json.load(open(OUTDIR + '/cuts.json')); cuts = c['cuts']; T = c['total']; texts = c['texts']
n = int(SR * T); t = np.arange(n) / SR
L = np.zeros(n); R = np.zeros(n)
rng = np.random.default_rng(11)
BEAT = 0.5

def lp(x, f): b, a = butter(2, f / (SR / 2)); return lfilter(b, a, x)
def hp(x, f): b, a = butter(2, f / (SR / 2), 'high'); return lfilter(b, a, x)
def add(sig, at, gain=1.0, pan=0.0):
    i0 = int(at * SR)
    if i0 >= n: return
    seg = sig[: n - i0] * gain
    L[i0:i0 + len(seg)] += seg * (1 - pan) ; R[i0:i0 + len(seg)] += seg * (1 + pan)
def tt(d): return np.arange(int(d * SR)) / SR

# Instrumentos
def boom(g=1.0, d=1.6):  # tambor grave cinematográfico
    x = tt(d); f = 34 + 70 * np.exp(-x * 9)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 2.6)
    s += lp(rng.standard_normal(len(x)), 900) * np.exp(-x * 30) * 0.5
    return np.tanh(s * 1.6) * g
def kick(g=1.0):
    x = tt(0.35); f = 45 + 110 * np.exp(-x * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 11) * g
def snare(g=1.0):
    x = tt(0.3); nz = hp(rng.standard_normal(len(x)), 1500) * np.exp(-x * 16)
    return (nz * 0.7 + np.sin(2 * np.pi * 190 * x) * np.exp(-x * 25) * 0.5) * g
def tick(g=1.0):
    x = tt(0.06); return hp(rng.standard_normal(len(x)), 6000) * np.exp(-x * 80) * g
def clang(g=1.0):  # acero contra acero
    x = tt(1.2); s = np.zeros(len(x))
    for f, a, dcy in [(523, 1, 5), (1187, .7, 7), (1847, .5, 9), (2613, .35, 11), (3407, .25, 14)]:
        s += np.sin(2 * np.pi * f * x + rng.random() * 6) * a * np.exp(-x * dcy)
    s += hp(rng.standard_normal(len(x)), 3000) * np.exp(-x * 60) * 0.8
    return s * 0.35 * g
def whoosh(d=0.6, g=1.0):
    x = tt(d); env = np.sin(np.pi * x / d) ** 2
    nz = rng.standard_normal(len(x)); sweep = lp(nz, 2500) * env
    return sweep * g * 0.5
def riser(d, g=1.0):
    x = tt(d); nz = hp(rng.standard_normal(len(x)), 400) * (x / d) ** 2
    tone = np.sin(2 * np.pi * np.cumsum(110 + 330 * (x / d) ** 2) / SR) * (x / d) ** 2 * 0.3
    return (nz * 0.3 + tone) * g
def saw(f, d, g=1.0):
    x = tt(d); ph = (f * x) % 1.0; s = (2 * ph - 1)
    s = lp(s, 1400) * np.minimum(1, x / 0.01) * np.exp(-x * 5)
    return s * g

# ── Todo se coloca según el guion (cuts.json): secciones por rótulo, golpes reales del combate y destello del portal ──
S = {name: (a, b) for name, a, b in texts}
def sec(name): a, b = S[name]; return a - 0.15, b + 0.05
hits = c.get('hits', []); marks = c.get('marks', [])
portal = next((m['t'] for m in marks if m['what'] == 'portal'), sec('sal')[1] - 0.3)
fin = sec('final')[0]
notes = [110, 110, 130.81, 110, 164.81, 110, 146.83, 130.81]

# Dron grave en La que crece hasta el portal
sw = np.clip(t / max(1, portal), 0, 1) ** 1.2 * 0.75 + 0.25
drone = np.sin(2 * np.pi * 55 * t) + 0.5 * np.sin(2 * np.pi * 82.41 * t + 0.3) + 0.3 * np.sin(2 * np.pi * 110.3 * t)
drone *= sw * 0.16 * (0.85 + 0.15 * np.sin(2 * np.pi * 0.5 * t)) * (t < portal + 0.2)
L += drone; R += drone * 0.96
pad = lp(rng.standard_normal(n), 300) * 0.05 * sw * (t < portal)
L += pad; R += pad[::-1]

def ostinato(a, b, up=1.0, g=0.14, step=BEAT / 2):
    for i, k in enumerate(np.arange(a, b, step)): add(saw(notes[i % 8] * up, step * 0.95, g), k, pan=0.2 * ((i % 2) * 2 - 1))
def drums(a, b, kg=0.8, sg=0.4, ticks=True):
    for i, k in enumerate(np.arange(a, b, BEAT)):
        add(kick(kg), k)
        if i % 2 == 1 and sg: add(snare(sg), k)
    if ticks:
        for k in np.arange(a + 0.25, b, BEAT): add(tick(0.2), k, pan=0.4)

# 1 · ¿Te atreves a bajar?: latido
a, b = sec('oro')
for k in np.arange(a + 0.4, b, 1.0): add(kick(0.8), k); add(kick(0.5), k + 0.22)
add(riser(1.0, 0.5), b - 1.0)
# 2 · El descenso: pulso con ostinato y un golpe en cada escenario
a, _ = sec('mazmorra'); _, b = sec('infierno')
ostinato(a, b); drums(a, b, 0.75, 0)
for ct in cuts:
    if a <= ct < b - 0.1: add(boom(0.45, 0.9), ct)
# 4 · Combate: batería a tope y un golpe en cada impacto real (tuyo: acero; suyo: golpe grave)
a, b = sec('combate')
drums(a, b, 0.95, 0.5)
for i, k in enumerate(np.arange(a, b, BEAT / 4)): add(tick(0.12), k, pan=-0.4)
ostinato(a, b, 1.0, 0.12, BEAT / 4)
for h in hits:
    if h['who'] == 'foe': add(clang(1.0 if h.get('crit') else 0.8), h['t'], pan=0.2); add(boom(0.45, 0.7), h['t'])
    else: add(boom(1.0, 0.9), h['t']); add(snare(0.9), h['t'], pan=-0.2)
# 5 · Botín e Intendencia: marcha que sube en cada bloque
for name, up in [('equipo', 1.0), ('intendencia', 1.335)]:
    a, b = sec(name); ostinato(a, b, up, 0.13); drums(a, b, 0.8, 0.35); add(boom(0.6, 1.0), a + 0.15)
# 6 · ¿Aliado… o traidor?: cae el ritmo, latido que se acelera y golpes de acero en la traición
a, _ = sec('aliado'); _, b = sec('traidor'); tr = sec('traidor')[0] + 0.15
for k in np.arange(a, tr, 0.5): add(kick(0.6), k)
add(boom(1.2), tr); add(clang(1.1), tr); add(clang(0.9), tr + 1.1, pan=-0.2)
for k in np.arange(tr, b, 0.25): add(kick(0.45), k)
# 7 · Sal con vida: subida hasta el destello del portal (sonido de extracción justo en el destello)
a, _ = sec('sal')
add(riser(max(0.5, portal - a), 1.0), a)
for k in np.arange(a, portal, BEAT / 2): add(kick(0.3 + 0.5 * (k - a) / max(0.5, portal - a)), k)
add(boom(2.0, 2.2), portal); add(clang(0.8), portal); add(whoosh(1.2, 1.0), portal - 0.1)
# Silbido al aparecer cada rótulo
for name, a2, b2 in texts:
    if name not in ('final', 'oro'): add(whoosh(0.5, 0.8), max(0, a2 - 0.3), pan=0.3)
# 8 · Logo: gran golpe y acorde de La menor que se apaga
add(boom(2.2, 3.0), fin); add(clang(0.7), fin)
chord = np.zeros(n)
for f, g in [(55, 1), (110, 0.8), (130.81, 0.6), (164.81, 0.55), (220, 0.35), (261.6, 0.2)]:
    chord += np.sin(2 * np.pi * f * t + 0.3 * np.sin(2 * np.pi * 4.5 * t)) * g
ce = np.clip((t - fin) / 0.04, 0, 1) * np.exp(-np.maximum(t - fin, 0) / 2.4) * (t >= fin)
L += chord * ce * 0.14; R += chord * ce * 0.13
# Fundidos y normalización con limitador suave
fade = np.clip((T - t) / 0.8, 0, 1) * np.clip(t / 0.05, 0, 1); L *= fade; R *= fade
m = max(np.abs(L).max(), np.abs(R).max()); L = np.tanh(L / m * 1.6) / np.tanh(1.6) * 0.93; R = np.tanh(R / m * 1.6) / np.tanh(1.6) * 0.93
data = (np.stack([L, R], 1) * 32767).astype('<i2')
with wave.open(OUTDIR + '/music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data.tobytes())
print('música', T, 's · golpes', len(hits), '· portal en', portal)
