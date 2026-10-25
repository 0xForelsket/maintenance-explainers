import sys, json, numpy as np
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / 'audio'))
import synth as S
from synth import place, filt, noise, boom, whoosh, tink, thud, clunk, tick, beep, shimmer, pad, ss

TOPIC = str(HERE)
DUR = 217.6
S.set_duration(DUR)
N, SR = S.N, S.SR
t = np.arange(N) / SR
rng = np.random.default_rng(41)
sfx, music, amb = S.bus(), S.bus(), S.bus()
# shot changes, from the exported camera (blender/gen/camera.json), so the whooshes follow the director
cam = json.load(open(HERE / 'blender' / 'gen' / 'camera.json'))
cuts = [c / cam['fps'] for c in cam['cuts']]


def pulse(a, b, c, d, x):
    return ss(a, b, x) * (1 - ss(c, d, x))


def win(a, b, x):
    return ((x >= a) & (x < b)).astype(float)


def env(n, a, r):
    i = np.arange(n); return np.minimum(1, i / max(1, a * SR)) * np.minimum(1, (n - i) / max(1, r * SR))


def hiss(sec, lo=2500, hi=9000, decay=0.25):
    n = int(sec * SR); return filt(noise(sec), 'band', [lo, hi]) * np.minimum(1, np.arange(n) / (0.01 * SR)) * np.exp(-np.arange(n) / (decay * SR))


def steady_hiss(sec, lo, hi, a=0.05, r=0.2):
    n = int(sec * SR); return filt(noise(sec), 'band', [lo, hi]) * env(n, a, r)


def drips(sec, rate=0.996, lo=300, hi=2200):
    n = int(sec * SR); return filt(noise(sec), 'band', [lo, hi]) * (rng.random(n) > rate) * 5 * env(n, 0.1, 0.3)


# ---- machine state (mirrors story.js)
toolroom = win(178.3, 205.35, t)
press = 1 - toolroom
water = 1 - ss(200.0, 200.9, t) * (1 - ss(205.3, 205.35, t))
flowA = 1 - 0.65 * ss(120.3, 121.3, t) * (1 - ss(187.5, 188.3, t))

# ---- ambience: hydraulic pump hum and fan on the press, water through the mould, a quieter toolroom
ph = 2 * np.pi * np.cumsum(np.full(N, 50.0)) / SR
hum = 0.5 * np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph + 0.4) + 0.06 * np.sin(6 * ph)
amb += np.stack([hum, hum], 1) * (0.028 * press)[:, None]
pump = filt(np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1), 'band', [80, 900])
amb += pump * (0.06 * press * (0.85 + 0.15 * np.sin(2 * np.pi * 0.6 * t)))[:, None]
wflow = filt(np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1), 'band', [400, 4000])
amb += wflow * (0.028 * water * (0.6 + 0.4 * flowA))[:, None]
room = filt(np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1), 'band', [60, 500])
amb += room * (0.05 * toolroom)[:, None]

# ---- music: calm explainer bed → tension through the failures (a beat under the warning signs) → resolve
place(music, pad(14.6, [55, 82.4, 110], 1.0, 2.5, 420), 0.0, 0.45)
place(music, pad(85.0, [55, 82.4, 110, 164.8], 2.0, 3.0, 800), 14.1, 0.34)
n = int((167.2 - 98.6) * SR); tt = np.arange(n) / SR
tens = np.zeros(n)
for f in (55, 58.3, 82.4, 87.3, 110, 116.5):
    tens += 2 * ((f * np.cumsum(1 + 0.04 * (tt / tt[-1]) ** 2) / SR + rng.random()) % 1.0) - 1
tens = filt(tens, 'low', 850) / 6 * np.minimum(1, tt / 1.5) * (0.45 + 0.55 * tt / tt[-1]) * np.minimum(1, (tt[-1] - tt) / 0.5)
place(music, tens, 98.6, 0.42)
for tp in np.arange(153.1, 166.9, 0.68):
    g = 0.2 + 0.25 * min(1, (tp - 153.1) / 6)
    place(music, thud(0.3, 62), float(tp), g); place(music, thud(0.25, 58), float(tp) + 0.16, g * 0.5)
place(music, pad(47.8, [65.4, 98, 130.8, 196], 2.0, 3.0, 1200), 167.0, 0.32)
place(music, pad(3.2, [110, 138.6, 164.8, 220, 277.2, 329.6], 0.8, 1.8, 2200, 0.004), 214.3, 0.42)
place(music, shimmer(2.6, (880, 1108.7, 1318.5, 1760), 1.8), 214.5, 0.14)

# ---- hits / transitions
place(sfx, boom(2.0, 100, 30), 11.35, 0.55)
place(sfx, shimmer(2.6, (659, 988, 1318, 1976), 1.4), 11.55, 0.07)
for tc in cuts:
    if abs(tc - 11.35) < 0.05 or abs(tc - 214.3) < 0.05:
        continue
    place(sfx, whoosh(0.42, 400, 2500, 1.0, 1.0, (0.7, 0.3)), tc - 0.28, 0.08, float(rng.uniform(-0.4, 0.4)))
for tc in (14.3, 98.9, 152.95, 167.05):
    place(sfx, whoosh(1.2, 300, 4200, 1.4, 1.0, (0.6, 0.4)), tc - 0.2, 0.16)
place(sfx, boom(1.4, 80, 35, 1.2), 99.0, 0.32)
place(sfx, whoosh(2.2, 250, 3500, 1.2, 1.0, (0.5, 0.5)), 9.3, 0.1)                                  # the section opens

# ---- how it works
place(sfx, whoosh(2.0, 150, 900, 1.0, 1.0, (0.5, 0.5)), 28.9, 0.08)                                 # halves part
place(sfx, whoosh(3.5, 120, 700, 1.0, 1.0, (0.3, 0.7)), 37.3, 0.07)                                 # guided close
place(sfx, clunk(0.45), 41.25, 0.22); place(sfx, thud(0.4, 70), 41.27, 0.2)                          # steel faces touch
n = int(1.2 * SR); tt = np.arange(n) / SR
place(sfx, filt(noise(1.2), 'low', 180) * np.minimum(1, tt / 0.3) * np.exp(-np.maximum(0, tt - 0.5) / 0.3), 42.3, 0.25)   # clamp builds
place(sfx, whoosh(1.0, 200, 1800, 1.4, 1.0, (0.3, 0.7)), 43.9, 0.12)                                # injection
n = int(14.0 * SR); place(sfx, filt(noise(14.0, 'pink'), 'band', [150, 900]) * env(n, 0.5, 1.5), 44.0, 0.05)  # melt pushing
place(sfx, steady_hiss(10.5, 3500, 11000, 0.8, 0.8), 49.6, 0.03, 0.2)                               # air out of the vents
place(sfx, tick(0.05, 900), 60.5, 0.12)                                                              # melt freezes off in the vent
n = int(4.0 * SR); place(sfx, np.stack([filt(noise(4.0, 'pink'), 'band', [500, 3000])] * 2, 1) * env(n, 0.6, 1.2)[:, None], 61.9, 0.06)   # water
place(sfx, tick(0.04, 1500), 66.2, 0.1); place(sfx, tick(0.04, 1300), 67.5, 0.08)
place(sfx, clunk(0.4), 74.0, 0.2); place(sfx, whoosh(3.6, 120, 900, 1.0, 1.0, (0.4, 0.6)), 74.0, 0.1)   # mould opens
place(sfx, tick(0.05, 1100), 76.9, 0.12); place(sfx, hiss(0.3, 800, 3000, 0.1), 77.0, 0.06)          # sprue pulled out
place(sfx, whoosh(2.7, 150, 1200, 1.0, 1.0, (0.5, 0.5)), 83.3, 0.08)                                # ejector forward
for k in range(4):
    place(sfx, tick(0.03, 2000 + 300 * k), 85.6 + 0.08 * k, 0.07)                                   # parts break free
for k, tp in enumerate((87.2, 87.45, 87.6, 87.8)):
    place(sfx, tink(1500 + 250 * k, 0.4, 0.6), tp, 0.07, float(rng.uniform(-0.5, 0.5)))             # parts drop clear
place(sfx, whoosh(1.7, 150, 900, 1.0, 1.0, (0.5, 0.5)), 89.6, 0.07); place(sfx, clunk(0.3), 91.3, 0.15)   # springs return the plates
place(sfx, whoosh(1.7, 120, 800, 1.0, 1.0, (0.4, 0.6)), 91.9, 0.08); place(sfx, clunk(0.45), 93.6, 0.22)
for c in (94.0, 96.5):                                                                               # fast production cycles
    place(sfx, whoosh(0.35, 300, 2200, 1.4, 1.0, (0.3, 0.7)), c, 0.08)
    place(sfx, clunk(0.3), c + 1.3, 0.12); place(sfx, tick(0.04, 1800), c + 1.75, 0.08)
    for k in range(3):
        place(sfx, tink(1700 + 300 * k, 0.3, 0.6), c + 2.0 + 0.07 * k, 0.05)
    place(sfx, clunk(0.35), c + 2.5, 0.15)
for k in range(18):
    place(sfx, tick(0.02, 2600), 99.25 + k * 0.13, 0.05)                                             # counter time-lapse

# ---- what goes wrong
n = int(2.4 * SR); place(sfx, filt(noise(2.4), 'band', [200, 900]) * env(n, 0.5, 0.6), 102.0, 0.06)        # residue builds
place(sfx, whoosh(0.8, 300, 2500, 1.4, 1.0, (0.3, 0.7)), 104.6, 0.1)
n = int(3.0 * SR); tt = np.arange(n) / SR
place(sfx, filt(noise(3.0), 'band', [2000, 9000]) * (tt / 3.0) ** 2, 105.3, 0.08)                   # air squeezed, rising
place(sfx, boom(0.8, 160, 60, 2.0), 108.25, 0.3); place(sfx, hiss(0.6, 3000, 11000, 0.2), 108.27, 0.12)   # dieselling pop
n = int(1.5 * SR); place(sfx, filt(noise(1.5), 'band', [1500, 6000]) * (rng.random(n) > 0.97) * 2 * env(n, 0.1, 0.8), 108.5, 0.06)   # sizzle
place(sfx, whoosh(0.8, 300, 2500, 1.4, 1.0, (0.3, 0.7)), 112.05, 0.1)
n = int(2.2 * SR); tt = np.arange(n) / SR
place(sfx, filt(noise(2.2), 'band', [300, 1200]) * np.exp(-tt / 0.8), 112.8, 0.08)                   # melt stalls
place(sfx, beep(660, 0.25), 116.1, 0.04)
n = int(2.0 * SR); place(sfx, filt(noise(2.0), 'band', [100, 600]) * env(n, 0.6, 0.6), 117.5, 0.08)          # scale grows
for k in range(3):
    place(sfx, beep(880, 0.12), 123.9 + k * 0.35, 0.035)
n = int(2.0 * SR); tt = np.arange(n) / SR                                                             # worn pillar: a dry scrape
place(sfx, filt(noise(2.0), 'band', [1500, 5000]) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * tt)) * env(n, 0.3, 0.5), 126.4, 0.05)
place(sfx, clunk(0.35), 128.4, 0.12)
place(sfx, whoosh(0.6, 300, 2500, 1.4, 1.0, (0.3, 0.7)), 130.95, 0.1)
n = int(1.4 * SR); place(sfx, filt(noise(1.4), 'band', [600, 2400]) * env(n, 0.2, 0.6), 131.8, 0.07)       # flash squeezes out
n = int(1.0 * SR); tt = np.arange(n) / SR                                                             # galled pin squeal
place(sfx, np.sin(2 * np.pi * np.cumsum(1250 + 180 * np.sin(2 * np.pi * 7 * tt)) / SR) * env(n, 0.05, 0.3) * 0.6, 135.0, 0.05)
place(sfx, tink(3100, 0.5, 1.4), 135.9, 0.14); place(sfx, tick(0.04, 4000), 135.9, 0.16)              # snap
place(sfx, clunk(0.3), 136.6, 0.12)
place(sfx, drips(2.4, 0.997), 142.8, 0.07, 0.3)                                                       # water creeping out
place(sfx, drips(3.5, 0.998, 200, 1500), 148.8, 0.05, -0.2)                                           # condensation
n = int(1.6 * SR); place(sfx, filt(noise(1.6), 'low', 300) * env(n, 0.6, 0.8), 151.3, 0.06)
# warning list ticks; noisy ejection
for tp in (153.2, 156.8, 158.5, 160.05, 161.9, 164.45):
    place(sfx, tink(1800, 0.35, 0.2), tp, 0.07)
n = int(1.2 * SR); tt = np.arange(n) / SR
place(sfx, np.sin(2 * np.pi * np.cumsum(1100 + 200 * np.sin(2 * np.pi * 6 * tt)) / SR) * env(n, 0.05, 0.3) * 0.5, 157.6, 0.04)
place(sfx, clunk(0.3), 158.6, 0.14); place(sfx, clunk(0.25), 158.85, 0.1)

# ---- the fix
for k in range(10):
    place(sfx, tick(0.02, 2800), 167.4 + k * 0.32, 0.05)                                             # counter
n = int(1.4 * SR); place(sfx, filt(noise(1.4), 'band', [1500, 7000]) * env(n, 0.2, 0.5), 173.4, 0.06)       # vents wiped
place(sfx, tink(2600, 0.3, 0.3), 175.5, 0.05)
n = int(1.0 * SR); place(sfx, filt(noise(1.0), 'band', [300, 1500]) * env(n, 0.3, 0.4), 176.7, 0.05)        # grease
for tp, g in ((179.9, 0.16), (180.5, 0.14), (181.1, 0.12)):
    place(sfx, clunk(0.35), tp, g, float(rng.uniform(-0.3, 0.3)))                                  # ejector half opened up
n = int(1.0 * SR); place(sfx, filt(noise(1.0), 'band', [2000, 8000]) * env(n, 0.2, 0.4), 182.2, 0.05)       # pins cleaned
place(sfx, tink(2200, 0.4, 0.5), 183.0, 0.08)                                                         # new pin
for k in range(3):
    place(sfx, tink(900 + 150 * k, 0.3, 0.2), 184.3 + 0.12 * k, 0.05)                               # springs
for k in range(3):
    place(sfx, beep(1300 + 120 * k, 0.07), 185.6 + 0.14 * k, 0.04)                                  # vent gauge
n = int(1.6 * SR); place(sfx, np.stack([filt(noise(1.6, 'pink'), 'band', [300, 3000])] * 2, 1) * env(n, 0.4, 0.6)[:, None], 187.1, 0.09)   # descale flush
place(sfx, whoosh(1.0, 200, 2000, 1.2, 1.0, (0.4, 0.6)), 187.6, 0.08)
place(sfx, tick(0.03, 1700), 189.95, 0.1); place(sfx, tick(0.03, 1900), 190.1, 0.08)                  # O-rings in
for tp, g in ((192.4, 0.16), (192.9, 0.14), (193.4, 0.14), (196.9, 0.14), (197.5, 0.14), (198.1, 0.16)):
    place(sfx, clunk(0.4), tp, g, float(rng.uniform(-0.4, 0.4)))                                   # strip-down and rebuild
place(sfx, hiss(1.6, 1200, 9000, 0.9), 199.55, 0.14, -0.2)                                            # blown dry
place(sfx, drips(1.2, 0.99), 199.8, 0.06, 0.3)
n = int(1.4 * SR); place(sfx, filt(noise(1.4), 'band', [3000, 10000]) * env(n, 0.1, 0.4), 201.9, 0.07)      # rust preventive
place(sfx, whoosh(1.0, 120, 900, 1.0, 1.0, (0.4, 0.6)), 203.4, 0.08); place(sfx, clunk(0.45), 204.4, 0.2)   # closed
for tp in (167.1, 171.2, 178.35, 186.65, 191.15, 198.7, 205.45):
    place(sfx, tink(2400, 0.3, 0.2), tp, 0.05)
for tp in (170.4, 177.9, 186.1, 190.6, 198.2, 204.7, 213.6):
    place(sfx, tink(3200, 0.4, 0.2), tp, 0.07); place(sfx, tink(4100, 0.4, 0.2), tp + 0.07, 0.05)
# end
place(sfx, boom(2.4, 90, 28, 1.8), 214.35, 0.5)
place(sfx, shimmer(2.0, (880, 1318, 1760, 2637), 1.5), 214.55, 0.09)

S.finish(TOPIC, sfx, music, amb)
