import sys, numpy as np
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / 'audio'))
import synth as S
from synth import place, filt, noise, boom, whoosh, tink, thud, clunk, tick, beep, shimmer, pad, ss

TOPIC = str(HERE)
DUR = 74.2
S.set_duration(DUR)
N, SR = S.N, S.SR
t = np.arange(N) / SR
rng = np.random.default_rng(12)
sfx, music, amb = S.bus(), S.bus(), S.bus()
cuts = [5.75, 8.25, 15.45, 18.75, 22.4, 26.3, 28.7, 32.7, 35.6, 39.2, 44.6, 49.3, 52.9, 54.5, 56.5, 61.3, 63.5, 66.6, 68.75, 70.6]

# ---- ambience: rushing compressed air, louder inside the pipe at the start
hissN = np.stack([noise(DUR), noise(DUR)], 1)
airHiss = filt(hissN, 'band', [1800, 9000])
rush = filt(np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1), 'band', [150, 1500])
inside = 1 - ss(5.5, 5.9, t)
press = 1 - ss(67.6, 68.8, t) * (1 - ss(72.0, 72.6, t))
amb += airHiss * (0.10 + 0.25 * inside)[:, None] * press[:, None] + rush * (0.25 + 0.55 * inside)[:, None] * press[:, None]
# droplets pinging the pipe in the hook
for tp in np.sort(rng.uniform(0.6, 5.4, 26)):
    place(sfx, tink(float(rng.uniform(2600, 5200)), 0.2, 0.4), float(tp), float(rng.uniform(0.03, 0.07)), float(rng.uniform(-0.6, 0.6)))

# ---- music
place(music, pad(9.0, [55, 82.4, 110], 1.2, 2.0, 420), 0.0, 0.5)
place(music, pad(28.0, [55, 82.4, 110, 164.8], 1.5, 2.5, 800), 7.8, 0.4)
n = int((49.6 - 35.4) * SR); tt = np.arange(n) / SR
tens = np.zeros(n)
for f in (55, 58.3, 82.4, 87.3, 110, 116.5):
    tens += 2 * ((f * np.cumsum(1 + 0.05 * (tt / tt[-1]) ** 2) / SR + rng.random()) % 1.0) - 1
tens = filt(tens, 'low', 900) / 6 * np.minimum(1, tt / 1.2) * (0.5 + 0.5 * tt / tt[-1]) * np.minimum(1, (tt[-1] - tt) / 0.4)
place(music, tens, 35.4, 0.5)
for tp in np.arange(39.4, 56.2, 0.66):
    g = 0.2 + 0.35 * min(1, (tp - 39.4) / 6)
    place(music, thud(0.3, 62), tp, g); place(music, thud(0.25, 58), tp + 0.16, g * 0.5)
for tp in np.arange(50.4, 56.0, 0.8):
    place(sfx, beep(880), tp, 0.05, 0.3); place(sfx, beep(660), tp + 0.2, 0.05, 0.3)
place(music, pad(14.5, [65.4, 98, 130.8, 196], 1.2, 2.0, 1200), 56.4, 0.36)
place(music, pad(6.0, [110, 138.6, 164.8, 220, 277.2, 329.6], 0.8, 2.8, 2200, 0.004), 68.6, 0.45)
place(music, shimmer(5.0, (880, 1108.7, 1318.5, 1760), 2.0), 68.8, 0.16)

# ---- hits
place(sfx, boom(2.0, 100, 30), 5.7, 0.6)
place(sfx, shimmer(3.0, (659, 988, 1318, 1976), 1.4), 6.0, 0.08)
place(sfx, whoosh(1.5, 600, 9000, 3.0, 1.2, (0.75, 0.25)), 8.3, 0.34, -0.2)
for tc in cuts:
    if tc in (5.75, 8.25): continue
    place(sfx, whoosh(0.45, 400, 2500, 1.0, 1.0, (0.7, 0.3)), tc - 0.3, 0.13, float(rng.uniform(-0.4, 0.4)))
# swirl in the deflector
place(amb, whoosh(3.2, 500, 3500, 1.2, 1.0, (0.4, 0.6)), 15.5, 0.3)
# droplets hitting the bowl wall
for tp in np.sort(rng.uniform(18.9, 22.2, 18)):
    place(sfx, tink(float(rng.uniform(1800, 3200)), 0.25, 0.3), float(tp), float(rng.uniform(0.03, 0.06)), float(rng.uniform(-0.5, 0.5)))
# float drain dumps (working) and the test-button spit
def pssht(sec=0.6):
    x = filt(noise(sec), 'band', [900, 7000]) * np.exp(-np.arange(int(sec * SR)) / (0.18 * SR))
    return x / np.abs(x).max()
for tp in (31.95, 36.15):
    place(sfx, pssht(0.7), tp, 0.3, 0.1); place(sfx, thud(0.2, 160), tp, 0.18)
place(sfx, tick(0.05, 2500), 59.4, 0.3)
place(sfx, pssht(1.1), 59.5, 0.42, 0.1)
# cylinder strokes downstream (only while we can see/hear them)
for k in range(200):
    for frac in (0.0, 0.5):
        tp = (k + frac) / 0.55
        if 41.5 < tp < 44.6 or 52.9 < tp < 54.5:
            place(sfx, clunk(0.3), tp, 0.25, 0.5)
            place(sfx, pssht(0.4) * (1.5 if tp > 52.9 else 1.0), tp + 0.05, 0.2, 0.6)
# clogging: rising whine
n = int(4.4 * SR); tt = np.arange(n) / SR
wh = np.sin(2 * np.pi * np.cumsum(900 + 700 * tt / tt[-1]) / SR) * np.minimum(1, tt / 0.5) * np.minimum(1, (tt[-1] - tt) / 0.3)
place(sfx, wh, 44.8, 0.035)
place(sfx, boom(1.4, 80, 35, 1.2), 44.6, 0.35)
# sludge clearing, element change
place(sfx, whoosh(1.4, 300, 1500, 0.8, 1.0, (0.5, 0.5)), 61.6, 0.2)
place(sfx, clunk(0.4), 64.0, 0.3); place(sfx, clunk(0.4), 65.3, 0.3)
# shut-off valve, depressurise hiss, bowl twist ratchet
place(sfx, clunk(0.5), 67.3, 0.45, -0.4)
place(sfx, filt(noise(1.4), 'band', [1500, 8000]) * np.exp(-np.arange(int(1.4 * SR)) / (0.5 * SR)), 67.6, 0.35, 0.1)
for k in range(9):
    place(sfx, tick(0.03, 3600), 68.95 + k * 0.11, 0.12)
# checklist
for tp in (50.4, 53.05, 54.6):
    place(sfx, tink(1800, 0.35, 0.2), tp, 0.07)
for tp in (57.3, 58.8, 61.5, 63.6, 66.8):
    place(sfx, tink(2400, 0.3, 0.2), tp, 0.06)
for tp in (58.6, 60.9, 63.2, 66.2, 68.7):
    place(sfx, tink(3200, 0.4, 0.2), tp, 0.08); place(sfx, tink(4100, 0.4, 0.2), tp + 0.07, 0.06)
# end
place(sfx, boom(2.6, 90, 28, 1.8), 70.55, 0.55)
place(sfx, shimmer(3.5, (880, 1318, 1760, 2637), 1.8), 70.8, 0.1)

S.finish(TOPIC, sfx, music, amb)
