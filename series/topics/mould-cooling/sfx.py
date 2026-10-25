import sys, numpy as np
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / 'audio'))
import synth as S
from synth import place, filt, noise, boom, whoosh, tink, thud, clunk, tick, beep, shimmer, pad, ss

TOPIC = str(HERE)
DUR = 82.67
S.set_duration(DUR)
N, SR = S.N, S.SR
t = np.arange(N) / SR
rng = np.random.default_rng(71)
sfx, music, amb = S.bus(), S.bus(), S.bus()
cuts = [5.0, 7.8, 10.3, 14.7, 18.3, 22.5, 29.6, 35.8, 38.4, 43.3, 45.6, 48.0, 50.5, 52.6, 54.6, 57.6, 59.9, 61.7, 63.6, 66.1, 69.2, 74.7, 76.6, 78.0, 79.85]

def pulse(a, b, c, d, x):
    return ss(a, b, x) * (1 - ss(c, d, x))

# ---- ambience: machine hum, water running through the circuits; moulding cycle thumps (clamp + inject)
drone = filt(np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1), 'band', [50, 380])
water = filt(np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1), 'band', [250, 2200]) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.29 * t))[:, None]
amb += drone * 0.22 + water * 0.12
for k in range(17):
    tp = k * 5.0 + 0.02
    if tp < 63.6 and not (14.7 < tp < 35.8) and not (38.4 < tp < 48.0):
        place(sfx, thud(0.3, 75), tp, 0.18); place(sfx, filt(noise(0.4), 'band', [200, 1200]) * np.exp(-np.arange(int(0.4 * SR)) / (0.1 * SR)), tp + 0.05, 0.08)
# turbulence rig: rough swirling water vs smooth hush
amb += filt(np.stack([noise(DUR), noise(DUR)], 1), 'band', [400, 3500]) * (0.16 * pulse(22.6, 23.0, 29.3, 29.6, t) * (0.7 + 0.3 * np.sin(2 * np.pi * 7 * t)))[:, None]

# ---- music
place(music, pad(7.8, [55, 82.4, 110], 1.0, 2.0, 420), 0.0, 0.5)
place(music, pad(28.5, [55, 82.4, 110, 164.8], 1.5, 2.5, 800), 7.6, 0.38)
n = int((63.6 - 35.6) * SR); tt = np.arange(n) / SR
tens = np.zeros(n)
for f in (55, 58.3, 82.4, 87.3, 110, 116.5):
    tens += 2 * ((f * np.cumsum(1 + 0.05 * (tt / tt[-1]) ** 2) / SR + rng.random()) % 1.0) - 1
tens = filt(tens, 'low', 900) / 6 * np.minimum(1, tt / 1.2) * (0.5 + 0.5 * tt / tt[-1]) * np.minimum(1, (tt[-1] - tt) / 0.4)
place(music, tens, 35.6, 0.48)
for tp in np.arange(54.7, 63.4, 0.66):
    g = 0.22 + 0.3 * min(1, (tp - 54.7) / 4)
    place(music, thud(0.3, 62), tp, g); place(music, thud(0.25, 58), tp + 0.16, g * 0.5)
place(music, pad(16.5, [65.4, 98, 130.8, 196], 1.2, 2.0, 1200), 63.5, 0.34)
place(music, pad(4.5, [110, 138.6, 164.8, 220, 277.2, 329.6], 0.8, 2.8, 2200, 0.004), 79.2, 0.45)
place(music, shimmer(3.5, (880, 1108.7, 1318.5, 1760), 2.0), 79.4, 0.16)

# ---- hits / transitions
place(sfx, boom(2.0, 100, 30), 7.8, 0.6)
place(sfx, shimmer(3.0, (659, 988, 1318, 1976), 1.4), 8.0, 0.08)
place(sfx, whoosh(1.5, 600, 9000, 3.0, 1.2, (0.75, 0.25)), 10.2, 0.3, -0.2)
for tc in cuts:
    if tc in (7.8, 10.3): continue
    place(sfx, whoosh(0.42, 400, 2500, 1.0, 1.0, (0.7, 0.3)), tc - 0.28, 0.11, float(rng.uniform(-0.4, 0.4)))
place(sfx, whoosh(1.2, 300, 4200, 1.4, 1.0, (0.6, 0.4)), 10.4, 0.16)
for tp in (11.6, 12.6, 15.2, 16.2):
    place(sfx, tink(1500, 0.4, 0.4), tp, 0.06)
place(sfx, boom(1.4, 80, 35, 1.2), 35.8, 0.35)
# scale building: crackly crust, flow choking (falling tone)
crk = filt(noise(6.5), 'band', [1500, 7000]) * (rng.random(int(6.5 * SR)) > 0.99) * np.linspace(0.3, 1, int(6.5 * SR))
place(sfx, crk, 36.2, 0.3)
n = int(4.4 * SR); tt = np.arange(n) / SR
place(sfx, np.sin(2 * np.pi * np.cumsum(520 - 260 * (tt / tt[-1])) / SR) * np.minimum(1, tt / 0.4) * np.minimum(1, (tt[-1] - tt) / 0.3), 38.7, 0.025)
place(sfx, clunk(0.3), 44.0, 0.3)
for tp in np.arange(46.0, 48.0, 0.38):
    place(sfx, tink(1700, 0.25, 0.3), float(tp), 0.08)
n = int(2.2 * SR); tt = np.arange(n) / SR
place(sfx, np.sin(2 * np.pi * np.cumsum(320 + 420 * (tt / tt[-1]) ** 2) / SR) * np.minimum(1, tt / 0.3) * np.minimum(1, (tt[-1] - tt) / 0.2), 48.1, 0.026)
n = int(1.8 * SR); place(sfx, filt(np.sin(2 * np.pi * np.cumsum(60 + 25 * np.sin(2 * np.pi * 1.1 * np.arange(n) / SR)) / SR), 'band', [150, 900]) * np.minimum(1, np.arange(n) / (0.3 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.3 * SR)), 50.7, 0.1)
for tp in np.arange(52.8, 54.5, 0.42):
    place(sfx, tick(0.03, 2600), float(tp), 0.1)
# fix: treated water shimmer, flow meter ticks, flush stages, air blow, pressure test, O-ring, tags
place(sfx, shimmer(1.8, (1318, 1760, 2637), 1.0), 64.3, 0.06)
place(sfx, beep(1320, 0.1), 67.0, 0.05); place(sfx, beep(990, 0.18), 68.0, 0.05)
place(sfx, clunk(0.4), 69.3, 0.3)
fz = filt(noise(1.7), 'band', [2500, 9000]) * (rng.random(int(1.7 * SR)) > 0.85)
place(sfx, fz, 69.4, 0.16)
place(sfx, whoosh(1.0, 300, 1600, 0.9, 1.0, (0.5, 0.5)), 71.0, 0.16)
place(sfx, whoosh(1.2, 500, 2600, 0.9, 1.0, (0.5, 0.5)), 72.0, 0.16)
n = int(1.3 * SR); place(sfx, filt(noise(1.3), 'band', [1500, 9000]) * np.minimum(1, np.arange(n) / (0.05 * SR)) * np.exp(-np.arange(n) / (0.7 * SR)), 73.3, 0.3, 0.2)
place(sfx, tick(0.04, 2400), 74.95, 0.25)
for k in range(5):
    place(sfx, tick(0.02, 3000), 75.4 + k * 0.22, 0.05)
place(sfx, shimmer(1.6, (1318, 1760, 2637), 0.8), 76.8, 0.08)
for k, tp in enumerate((78.2, 78.35, 78.5, 78.65)):
    place(sfx, tink(2600 + 300 * k, 0.3, 0.3), tp, 0.06)
# ---- checklist
for tp in (55.6, 57.6, 59.9, 61.8):
    place(sfx, tink(1800, 0.35, 0.2), tp, 0.07)
for tp in (64.0, 66.2, 69.3, 74.8):
    place(sfx, tink(2400, 0.3, 0.2), tp, 0.06)
for tp in (65.9, 69.0, 74.5, 79.2):
    place(sfx, tink(3200, 0.4, 0.2), tp, 0.08); place(sfx, tink(4100, 0.4, 0.2), tp + 0.07, 0.06)
# end
place(sfx, boom(2.6, 90, 28, 1.8), 79.8, 0.55)
place(sfx, shimmer(2.6, (880, 1318, 1760, 2637), 1.6), 80.05, 0.1)

S.finish(TOPIC, sfx, music, amb)
