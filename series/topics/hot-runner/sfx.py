import sys, json, numpy as np
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / 'audio'))
import synth as S
from synth import place, filt, noise, boom, whoosh, tink, thud, clunk, tick, beep, shimmer, pad, ss

TOPIC = str(HERE)
DUR = 209.05
S.set_duration(DUR)
N, SR = S.N, S.SR
t = np.arange(N) / SR
rng = np.random.default_rng(29)
sfx, music, amb = S.bus(), S.bus(), S.bus()
cuts = [4.0, 8.0, 11.6, 13.7, 21.1, 30.1, 37.9, 43.4, 52.5, 61.1, 65.6, 71.1, 78.5, 90.6, 101.0, 103.8, 112.2, 116.6, 120.6, 128.1, 135.4, 141.2, 145.2, 148.1,
        154.3, 161.2, 164.9, 168.7, 173.0, 179.8, 184.4, 189.3, 196.4, 200.9, 206.4]

def pulse(a, b, c, d, x):
    return ss(a, b, x) * (1 - ss(c, d, x))

def env(n, a, r):
    i = np.arange(n); return np.minimum(1, i / max(1, a * SR)) * np.minimum(1, (n - i) / max(1, r * SR))

def hiss(sec, lo=2500, hi=9000, decay=0.25):
    n = int(sec * SR); return filt(noise(sec), 'band', [lo, hi]) * np.minimum(1, np.arange(n) / (0.01 * SR)) * np.exp(-np.arange(n) / (decay * SR))

def crackle(sec, dens=0.985):
    n = int(sec * SR); return filt(noise(sec), 'band', [1500, 8000]) * (rng.random(n) > dens) * 3 * env(n, 0.05, 0.1)

# ---- ambience: moulding machine hum + hydraulic pump, softer in the macro / close-up passages
drone = filt(np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1), 'band', [45, 260])
pump = filt(np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1), 'band', [300, 1400]) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.31 * t))[:, None]
quiet = 1 - 0.6 * pulse(13.6, 14.2, 20.8, 21.3, t)
amb += drone * (0.2 * quiet)[:, None] + pump * (0.05 * quiet)[:, None]
hum = 0.5 * np.sin(2 * np.pi * 100 * t) + 0.2 * np.sin(2 * np.pi * 200 * t)
amb += np.stack([hum, hum], 1) * 0.008
# moulding cycles (hook + end): injection rush, mould open whirr, eject tick, clamp close thump
for c0, c1 in ((0.2, 13.6), (205.9, 209.0)):
    k = 0
    while c0 + 6 * k < c1:
        b = c0 + 6 * k
        n = int(1.2 * SR); place(sfx, filt(noise(1.2), 'band', [200, 1800]) * env(n, 0.1, 0.4), b + 0.15, 0.1)
        if b + 4.2 < c1: place(sfx, whoosh(0.7, 150, 900, 1.0, 1.0, (0.5, 0.5)), b + 4.2, 0.09)
        if b + 4.8 < c1: place(sfx, tick(0.03, 2200), b + 4.85, 0.12)
        if b + 5.4 < c1: place(sfx, thud(0.35, 70), b + 5.9, 0.22)
        k += 1

# ---- music: calm explainer bed → tension through the failures (beat under the warning signs) → resolve
place(music, pad(13.6, [55, 82.4, 110], 1.0, 2.5, 420), 0.0, 0.45)
place(music, pad(88.0, [55, 82.4, 110, 164.8], 2.0, 3.0, 800), 13.0, 0.34)
n = int((173.2 - 100.6) * SR); tt = np.arange(n) / SR
tens = np.zeros(n)
for f in (55, 58.3, 82.4, 87.3, 110, 116.5):
    tens += 2 * ((f * np.cumsum(1 + 0.04 * (tt / tt[-1]) ** 2) / SR + rng.random()) % 1.0) - 1
tens = filt(tens, 'low', 850) / 6 * np.minimum(1, tt / 1.5) * (0.45 + 0.55 * tt / tt[-1]) * np.minimum(1, (tt[-1] - tt) / 0.5)
place(music, tens, 100.6, 0.42)
for tp in np.arange(154.4, 172.8, 0.68):
    g = 0.2 + 0.25 * min(1, (tp - 154.4) / 6)
    place(music, thud(0.3, 62), float(tp), g); place(music, thud(0.25, 58), float(tp) + 0.16, g * 0.5)
place(music, pad(34.0, [65.4, 98, 130.8, 196], 2.0, 3.0, 1200), 172.8, 0.32)
place(music, pad(3.0, [110, 138.6, 164.8, 220, 277.2, 329.6], 0.8, 2.0, 2200, 0.004), 206.3, 0.42)
place(music, shimmer(2.6, (880, 1108.7, 1318.5, 1760), 2.0), 206.5, 0.14)

# ---- hits / transitions
place(sfx, boom(2.0, 100, 30), 11.6, 0.55)
place(sfx, shimmer(3.0, (659, 988, 1318, 1976), 1.4), 11.8, 0.07)
for tc in cuts:
    if tc in (11.6,): continue
    place(sfx, whoosh(0.42, 400, 2500, 1.0, 1.0, (0.7, 0.3)), tc - 0.28, 0.09, float(rng.uniform(-0.4, 0.4)))
for tc in (21.2, 101.05, 154.3, 173.05):
    place(sfx, whoosh(1.2, 300, 4200, 1.4, 1.0, (0.6, 0.4)), tc - 0.2, 0.16)
place(sfx, boom(1.4, 80, 35, 1.2), 101.05, 0.32)
# runner freezes / regrind: crunchy grinder
n = int(1.6 * SR); place(sfx, filt(noise(1.6), 'band', [300, 3000]) * (0.6 + 0.4 * (rng.random(n) > 0.7)) * env(n, 0.1, 0.4), 17.2, 0.07)
# melt flowing through the hot half: warm swell
n = int(9.0 * SR); place(amb, np.stack([filt(noise(9.0, 'pink'), 'band', [80, 600])] * 2, 1) * env(n, 1.5, 1.5)[:, None], 21.2, 0.12)
for tp in (44.6, 47.8):
    place(sfx, beep(1320, 0.08), tp, 0.04)
# valve pin: pneumatic click + hiss open and close
for tp in (66.2, 69.0):
    place(sfx, tick(0.04, 1500), tp, 0.2); place(sfx, hiss(0.35, 2500, 8000, 0.12), tp + 0.02, 0.1, 0.3)
# thermal growth: metal creaks / ticks as the manifold expands
for tp in np.sort(rng.uniform(85.2, 89.4, 9)):
    place(sfx, tink(float(rng.uniform(600, 900)), 0.5, 0.5), float(tp), 0.05)
place(sfx, clunk(0.3), 89.5, 0.16)
# heat-up time-lapse: rising tone + clock ticks
n = int(9.6 * SR); tt = np.arange(n) / SR
place(sfx, np.sin(2 * np.pi * np.cumsum(180 + 160 * (tt / tt[-1])) / SR) * env(n, 0.5, 0.5), 91.0, 0.012)
for tp in np.arange(91.0, 100.4, 0.35):
    place(sfx, tick(0.015, 3200), float(tp), 0.05)
# cold start leak: squelch, sizzle, wire crackle, alarms, strip-down clanks
place(sfx, hiss(2.6, 800, 5000, 1.0), 106.2, 0.14, -0.2)
n = int(3.0 * SR); place(sfx, filt(noise(3.0), 'band', [3000, 9000]) * (rng.random(n) > 0.9) * env(n, 0.2, 0.5), 107.0, 0.1)
place(sfx, crackle(2.2, 0.98), 114.0, 0.25, 0.3)
for k in range(3):
    place(sfx, beep(880, 0.16), 114.6 + k * 0.4, 0.06); place(sfx, beep(660, 0.16), 114.8 + k * 0.4, 0.06)
for tp in (117.0, 117.4, 117.9, 118.5):
    place(sfx, clunk(0.35), tp, 0.18, float(rng.uniform(-0.3, 0.3)))
# damp heater: crackle of moisture, then the short
n = int(3.0 * SR); place(sfx, filt(noise(3.0), 'band', [4000, 10000]) * (rng.random(n) > 0.97) * env(n, 0.5, 0.3), 121.6, 0.08)
place(sfx, filt(noise(0.18), 'band', [600, 8000]) * np.exp(-np.arange(int(0.18 * SR)) / (0.03 * SR)), 124.95, 0.5)
place(sfx, boom(0.9, 120, 40, 1.6), 124.97, 0.3)
place(sfx, crackle(1.2, 0.97), 125.0, 0.22)
for k in range(2):
    place(sfx, beep(880, 0.2), 126.0 + k * 0.5, 0.05)
# thermocouple slips: slide click, overheating sizzle and smoke hiss
place(sfx, tick(0.05, 900), 129.2, 0.16)
n = int(3.5 * SR); place(sfx, filt(noise(3.5), 'band', [2000, 7000]) * (0.5 + 0.5 * (rng.random(n) > 0.95)) * env(n, 1.0, 0.4), 131.2, 0.06)
place(sfx, beep(990, 0.12), 137.2, 0.05); place(sfx, beep(740, 0.18), 137.4, 0.05)
# gate faults: drool drip, frozen crack, valve pin drips
place(sfx, whoosh(0.6, 150, 900, 1.0, 1.0, (0.5, 0.5)), 141.6, 0.08)
for tp in (142.6, 143.4):
    place(sfx, tink(2400, 0.2, 0.6), tp, 0.05)
place(sfx, tick(0.03, 1800), 145.6, 0.18)
for tp in (151.6, 152.5, 153.4):
    place(sfx, tink(2200, 0.2, 0.6), tp, 0.05)
# warning list ticks
for tp in (154.6, 161.3, 165.0, 168.8):
    place(sfx, tink(1800, 0.35, 0.2), tp, 0.07)
# the fix: heaters on in order, soft-start hiss, meter clicks, label stickers, pin glint
for tp in (173.4, 175.6):
    place(sfx, tick(0.04, 1200), tp, 0.18); place(sfx, beep(990, 0.08), tp + 0.05, 0.04)
place(sfx, beep(1320, 0.1), 178.6, 0.05); place(sfx, beep(1760, 0.14), 178.75, 0.05)
n = int(3.6 * SR); place(sfx, filt(noise(3.6), 'band', [2500, 9000]) * env(n, 0.8, 0.8), 180.0, 0.05)
for k in range(5):
    place(sfx, tick(0.02, 2800), 190.2 + k * 1.05, 0.1); place(sfx, beep(1760, 0.06), 190.3 + k * 1.05, 0.03)
for k in range(5):
    place(sfx, filt(noise(0.08), 'band', [1000, 5000]) * np.exp(-np.arange(int(0.08 * SR)) / (0.02 * SR)), 196.9 + k * 0.22, 0.12)
place(sfx, shimmer(1.6, (1318, 1760, 2637), 0.8), 202.8, 0.07)
for tp in (173.2, 179.9, 184.5, 189.4, 196.5, 201.0):
    place(sfx, tink(2400, 0.3, 0.2), tp, 0.05)
for tp in (179.4, 183.9, 188.9, 195.9, 200.4, 205.8):
    place(sfx, tink(3200, 0.4, 0.2), tp, 0.07); place(sfx, tink(4100, 0.4, 0.2), tp + 0.07, 0.05)
# end
place(sfx, boom(2.6, 90, 28, 1.8), 206.45, 0.5)
place(sfx, shimmer(2.2, (880, 1318, 1760, 2637), 1.6), 206.7, 0.09)

S.finish(TOPIC, sfx, music, amb)
