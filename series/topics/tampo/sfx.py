import sys, numpy as np
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / 'audio'))
import synth as S
from synth import place, filt, noise, boom, whoosh, tink, thud, clunk, tick, beep, shimmer, pad, ss

TOPIC = str(HERE)
DUR = 80.64
S.set_duration(DUR)
N, SR = S.N, S.SR
t = np.arange(N) / SR
rng = np.random.default_rng(97)
sfx, music, amb = S.bus(), S.bus(), S.bus()
cuts = [2.3, 4.7, 6.6, 10.4, 12.2, 14.1, 17.0, 19.3, 22.7, 24.7, 26.7, 29.4, 31.8, 37.0, 39.6, 41.3, 43.2, 45.0, 46.7, 48.5, 50.2, 52.5, 55.0, 57.9,
        59.8, 62.3, 64.4, 66.4, 68.9, 70.5, 72.6, 74.4, 75.9, 78.1]

def env(n, a, r):
    i = np.arange(n); return np.minimum(1, i / max(1, a * SR)) * np.minimum(1, (n - i) / max(1, r * SR))

def hiss(sec, lo=2500, hi=9000, decay=0.25):
    n = int(sec * SR); return filt(noise(sec), 'band', [lo, hi]) * np.minimum(1, np.arange(n) / (0.01 * SR)) * np.exp(-np.arange(n) / (decay * SR))

def scrape(sec, lo=600, hi=4000, rough=0.0):
    n = int(sec * SR); x = filt(noise(sec), 'band', [lo, hi]) * (0.7 + 0.3 * np.sin(2 * np.pi * 9 * np.arange(n) / SR))
    if rough: x = x * (1 + rough * (rng.random(n) > 0.985) * 6)
    return x * env(n, 0.08, 0.12)

def peel(sec, dens=0.97):
    n = int(sec * SR); return filt(noise(sec), 'band', [1200, 8000]) * (rng.random(n) > dens) * 3 * env(n, 0.05, 0.1)

# ---- ambience: quiet workshop hum, distant compressor
drone = filt(np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1), 'band', [50, 300])
room = filt(np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1), 'band', [300, 2500])
on = 1 - ss(2.2, 2.4, t) * (1 - ss(4.6, 4.8, t))
amb += drone * (0.18 * on)[:, None] + room * (0.05 * on)[:, None]
for k in range(4):
    a = 9 + k * 19
    n = int(2.5 * SR); place(amb, filt(noise(2.5, 'pink'), 'band', [80, 400]) * env(n, 0.6, 0.8), a, 0.08)

# ---- music
place(music, pad(6.6, [55, 82.4, 110], 1.0, 2.0, 420), 0.0, 0.5)
place(music, pad(30.7, [55, 82.4, 110, 164.8], 1.5, 2.5, 800), 6.4, 0.38)
n = int((62.3 - 36.8) * SR); tt = np.arange(n) / SR
tens = np.zeros(n)
for f in (55, 58.3, 82.4, 87.3, 110, 116.5):
    tens += 2 * ((f * np.cumsum(1 + 0.05 * (tt / tt[-1]) ** 2) / SR + rng.random()) % 1.0) - 1
tens = filt(tens, 'low', 900) / 6 * np.minimum(1, tt / 1.2) * (0.5 + 0.5 * tt / tt[-1]) * np.minimum(1, (tt[-1] - tt) / 0.4)
place(music, tens, 36.8, 0.48)
for tp in np.arange(55.1, 62.1, 0.66):
    g = 0.22 + 0.3 * min(1, (tp - 55.1) / 4)
    place(music, thud(0.3, 62), tp, g); place(music, thud(0.25, 58), tp + 0.16, g * 0.5)
place(music, pad(16.2, [65.4, 98, 130.8, 196], 1.2, 2.0, 1200), 62.2, 0.34)
place(music, pad(2.6, [110, 138.6, 164.8, 220, 277.2, 329.6], 0.8, 2.0, 2200, 0.004), 77.9, 0.45)
place(music, shimmer(2.6, (880, 1108.7, 1318.5, 1760), 2.0), 78.1, 0.16)

# ---- hits / transitions
place(sfx, boom(2.0, 100, 30), 6.65, 0.6)
place(sfx, shimmer(3.0, (659, 988, 1318, 1976), 1.4), 6.85, 0.08)
place(sfx, whoosh(1.5, 600, 9000, 3.0, 1.2, (0.75, 0.25)), 10.3, 0.3, -0.2)
for tc in cuts:
    if tc in (6.6, 10.4): continue
    place(sfx, whoosh(0.42, 400, 2500, 1.0, 1.0, (0.7, 0.3)), tc - 0.28, 0.11, float(rng.uniform(-0.4, 0.4)))
place(sfx, whoosh(1.2, 300, 4200, 1.4, 1.0, (0.6, 0.4)), 10.5, 0.16)
place(sfx, shimmer(1.4, (1318, 1760, 2637), 0.9), 0.6, 0.05)
# ---- machine: cup slides (scrape), pad strokes (pneumatic hiss + soft squish), shuttle
for a, b, r in ((14.4, 15.6, 0), (16.1, 17.4, 0), (26.9, 28.2, 0), (46.9, 48.1, 0.6)):
    place(sfx, scrape(b - a, 500, 3500, r), a, 0.09 if not r else 0.12, -0.3)
for tp in (23.55, 28.35, 62.75):
    place(sfx, hiss(0.5, 2500, 9000, 0.18), tp, 0.14, 0.1)
for tp in (24.75, 32.55, 43.55, 63.55):
    place(sfx, hiss(0.6, 2000, 8000, 0.22), tp, 0.16, 0.1)
for tp in (24.25, 28.95, 63.25):
    place(sfx, filt(thud(0.35, 90), 'low', 600), tp, 0.28)
for a in (26.9, 34.6):
    place(sfx, whoosh(1.2, 200, 1400, 1.0, 1.0, (0.5, 0.5)), a, 0.1, 0.2)
    place(sfx, clunk(0.3), a + 1.25, 0.12)
# rig: blade wipe, solvent hiss, sticky lift
place(sfx, scrape(1.6, 800, 5000), 17.2, 0.12)
n = int(3.2 * SR); place(sfx, filt(noise(3.2), 'band', [3000, 10000]) * env(n, 0.8, 0.8), 19.4, 0.05)
for tp in np.arange(19.8, 22.4, 0.5):
    place(sfx, tink(2600 + 600 * rng.random(), 0.25, 0.3), float(tp), 0.025)
place(sfx, peel(0.8), 25.3, 0.12)
place(sfx, peel(0.7, 0.975), 32.6, 0.1)
place(sfx, shimmer(1.6, (1318, 1760, 2637), 0.9), 35.8, 0.06)
place(sfx, boom(1.4, 80, 35, 1.2), 37.0, 0.35)
# failures: lint ticks, thick ink sticky lift, haze scrape (above), oil slick shimmer, fail stingers
for tp in np.sort(rng.uniform(39.8, 41.0, 8)):
    place(sfx, tick(0.015, float(rng.uniform(3000, 5000))), float(tp), 0.04)
place(sfx, peel(0.8, 0.96), 43.6, 0.14)
n = int(1.6 * SR); tt = np.arange(n) / SR
place(sfx, np.sin(2 * np.pi * np.cumsum(700 - 250 * tt / tt[-1]) / SR) * env(n, 0.3, 0.3), 45.1, 0.015)
place(sfx, filt(noise(1.8), 'band', [2000, 6000]) * env(int(1.8 * SR), 0.5, 0.6) * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * np.arange(int(1.8 * SR)) / SR)), 50.5, 0.04)
for tp in (42.0, 45.6, 49.2, 53.2):
    n = int(0.5 * SR); place(sfx, np.sin(2 * np.pi * 220 * np.arange(n) / SR) * np.exp(-np.arange(n) / (0.15 * SR)) * 0.6, tp, 0.05)
# tape test: lay + tear (fail), cloth wipe, tape test pass
place(sfx, thud(0.2, 160), 59.85, 0.1)
place(sfx, peel(0.9, 0.955), 60.5, 0.2, 0.2)
place(sfx, whoosh(1.0, 400, 2400, 1.0, 1.0, (0.5, 0.5)), 74.6, 0.12)
place(sfx, scrape(1.0, 300, 1800), 74.6, 0.06)
place(sfx, thud(0.2, 160), 75.95, 0.1)
place(sfx, peel(0.9, 0.965), 76.7, 0.16, 0.2)
place(sfx, shimmer(1.4, (1318, 1760, 2637), 0.8), 77.6, 0.07)
# fix: tape dab, new pad, viscosity trickle, seal click, inspection, screws
for tp in np.sort(rng.uniform(63.6, 63.9, 6)):
    place(sfx, tick(0.012, float(rng.uniform(3000, 6000))), float(tp), 0.04)
place(sfx, shimmer(1.6, (1318, 1760, 2637, 3520), 0.8), 65.35, 0.08)
n = int(1.9 * SR); trick = filt(noise(1.9), 'band', [700, 3000]) * (0.6 + 0.4 * np.sin(2 * np.pi * 13 * np.arange(n) / SR)) * env(n, 0.2, 0.3)
place(sfx, trick, 66.7, 0.07, -0.3)
for tp in np.arange(66.8, 68.5, 0.37):
    place(sfx, tink(900 + 300 * rng.random(), 0.2, 0.4), float(tp), 0.03, -0.3)
place(sfx, beep(1320, 0.12), 68.55, 0.05)
place(sfx, tick(0.04, 1600), 69.3, 0.2); place(sfx, tick(0.03, 2400), 69.36, 0.12)
place(sfx, shimmer(1.6, (1568, 2093, 2637), 1.0), 70.8, 0.05)
for k in range(9):
    place(sfx, tick(0.02, 2800), 72.85 + k * 0.12, 0.12)
place(sfx, clunk(0.25), 73.95, 0.14)
# ---- checklist
for tp in (56.26, 58.0, 60.6):
    place(sfx, tink(1800, 0.35, 0.2), tp, 0.07)
for tp in (62.65, 66.5, 70.5, 74.5):
    place(sfx, tink(2400, 0.3, 0.2), tp, 0.06)
for tp in (66.0, 70.0, 74.1, 77.7):
    place(sfx, tink(3200, 0.4, 0.2), tp, 0.08); place(sfx, tink(4100, 0.4, 0.2), tp + 0.07, 0.06)
# end
place(sfx, boom(2.6, 90, 28, 1.8), 78.15, 0.55)
place(sfx, shimmer(2.2, (880, 1318, 1760, 2637), 1.6), 78.4, 0.1)

S.finish(TOPIC, sfx, music, amb)
