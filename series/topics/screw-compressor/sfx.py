import sys, json, numpy as np
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / 'audio'))
import synth as S
from synth import place, filt, noise, boom, whoosh, tink, thud, clunk, tick, beep, shimmer, pad, ss

TOPIC = str(HERE)
DUR = 193.66
S.set_duration(DUR)
N, SR = S.N, S.SR
t = np.arange(N) / SR
rng = np.random.default_rng(37)
sfx, music, amb = S.bus(), S.bus(), S.bus()
cuts = [8.5, 12.95, 15.75, 22.85, 30.8, 36.6, 45.4, 51.1, 60.2, 65.9, 73.3, 80.9, 90.2, 97.8, 106.85, 109.05, 113.45, 116.0, 119.45, 122.4, 129.15,
        134.65, 142.45, 146.75, 150.85, 155.55, 159.85, 163.55, 168.45, 174.05, 178.35, 182.25, 185.15, 188.05, 191.15]

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

# ---- machine state (mirrors story.js)
spin = 1 - ss(118.75, 119.25, t) * win(0, 119.45, t)
load = 1 - pulse(179.8, 180.4, 182.0, 182.6, t)
rig = np.minimum(1, win(36.6, 45.4, t) + win(51.1, 60.2, t) + win(119.45, 122.4, t))
net = np.minimum(1, win(134.65, 142.45, t) + win(185.15, 188.05, t))
here = (1 - 0.45 * rig) * (1 - 0.8 * net)
coolDirt = ss(113.6, 115.4, t) * (1 - ss(174.6, 177.2, t))

# ---- ambience: motor hum, rotor whine (lobe passing ≈ 200 Hz), air rush, cooling fan; plant ambience on the network shots
ph = 2 * np.pi * np.cumsum(50 * (0.15 + 0.85 * spin)) / SR
hum = 0.5 * np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph + 0.4)
amb += np.stack([hum, hum], 1) * (0.03 * spin * here)[:, None]
pw = 2 * np.pi * np.cumsum(200 * (0.2 + 0.8 * spin) * (1 + 0.004 * np.sin(2 * np.pi * 0.7 * t))) / SR
whine = (0.6 * np.sin(pw) + 0.3 * np.sin(2 * pw + 0.3) + 0.15 * np.sin(3 * pw + 1.1)) * (0.8 + 0.2 * filt(noise(DUR), 'low', 8) * 20)
amb += np.stack([whine, whine * 0.9], 1) * (0.012 * spin * (0.45 + 0.55 * load) * here)[:, None]
rush = filt(np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1), 'band', [250, 3500])
amb += rush * (0.07 * spin * (0.4 + 0.6 * load) * here)[:, None]
fanN = filt(np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1), 'band', [90, 1600])
amb += fanN * (0.1 * spin * (1 - 0.3 * coolDirt) * here * (0.75 + 0.25 * np.sin(2 * np.pi * 19 * t)))[:, None]
plant = filt(np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1), 'band', [60, 700])
amb += plant * (0.08 * net)[:, None]

# ---- music: calm explainer bed → tension through the failures (beat under the warning signs) → resolve
place(music, pad(13.3, [55, 82.4, 110], 1.0, 2.5, 420), 0.0, 0.45)
place(music, pad(94.6, [55, 82.4, 110, 164.8], 2.0, 3.0, 800), 12.9, 0.34)
n = int((160.0 - 106.6) * SR); tt = np.arange(n) / SR
tens = np.zeros(n)
for f in (55, 58.3, 82.4, 87.3, 110, 116.5):
    tens += 2 * ((f * np.cumsum(1 + 0.04 * (tt / tt[-1]) ** 2) / SR + rng.random()) % 1.0) - 1
tens = filt(tens, 'low', 850) / 6 * np.minimum(1, tt / 1.5) * (0.45 + 0.55 * tt / tt[-1]) * np.minimum(1, (tt[-1] - tt) / 0.5)
place(music, tens, 106.6, 0.42)
for tp in np.arange(142.6, 159.6, 0.68):
    g = 0.2 + 0.25 * min(1, (tp - 142.6) / 6)
    place(music, thud(0.3, 62), float(tp), g); place(music, thud(0.25, 58), float(tp) + 0.16, g * 0.5)
place(music, pad(31.6, [65.4, 98, 130.8, 196], 2.0, 3.0, 1200), 159.8, 0.32)
place(music, pad(2.5, [110, 138.6, 164.8, 220, 277.2, 329.6], 0.8, 1.8, 2200, 0.004), 191.15, 0.42)
place(music, shimmer(2.3, (880, 1108.7, 1318.5, 1760), 1.8), 191.3, 0.14)

# ---- hits / transitions
place(sfx, boom(2.0, 100, 30), 12.95, 0.55)
place(sfx, shimmer(2.6, (659, 988, 1318, 1976), 1.4), 13.15, 0.07)
for tc in cuts:
    if tc in (12.95, 191.15): continue
    place(sfx, whoosh(0.42, 400, 2500, 1.0, 1.0, (0.7, 0.3)), tc - 0.28, 0.09, float(rng.uniform(-0.4, 0.4)))
for tc in (15.75, 106.85, 142.45, 159.85):
    place(sfx, whoosh(1.2, 300, 4200, 1.4, 1.0, (0.6, 0.4)), tc - 0.2, 0.16)
place(sfx, boom(1.4, 80, 35, 1.2), 106.9, 0.32)
# how it works: intake, pockets, heat, oil, separator, valves, drain
place(sfx, whoosh(2.4, 200, 2200, 1.2, 1.0, (0.4, 0.6)), 31.2, 0.12, -0.3)                      # air drawn in
for tp in (38.9, 40.0, 41.2):
    place(sfx, tick(0.03, 1800), tp, 0.06)
place(sfx, whoosh(0.9, 600, 5000, 1.6, 1.0, (0.3, 0.7)), 41.9, 0.12, 0.3)                       # opens to outlet
n = int(3.2 * SR); place(sfx, filt(noise(3.2), 'band', [2500, 9000]) * env(n, 0.6, 0.8), 47.8, 0.05)   # dry heat sizzle
n = int(4.0 * SR); place(sfx, np.stack([filt(noise(4.0, 'pink'), 'band', [300, 1800])] * 2, 1) * env(n, 0.6, 1.5)[:, None], 51.3, 0.12)   # oil spray
place(sfx, whoosh(3.0, 120, 900, 1.0, 1.0, (0.5, 0.5)), 66.1, 0.12)                             # swirl in the tank
n = int(2.4 * SR); place(sfx, filt(noise(2.4), 'band', [150, 700]) * (rng.random(n) > 0.995) * 6 * env(n, 0.2, 0.4), 68.8, 0.08)   # drips into the sump
place(sfx, tick(0.04, 1300), 73.7, 0.18); place(sfx, hiss(0.4, 2000, 7000, 0.15), 73.72, 0.06)   # MPV
place(sfx, tick(0.03, 2200), 83.5, 0.1)                                                          # thermostat
for tp in (94.2, 151.6, 161.9):                                                                  # drain: solenoid + spit
    place(sfx, tick(0.04, 1100), tp, 0.18); place(sfx, hiss(1.2, 800, 6000, 0.5), tp + 0.03, 0.12, 0.4)
    n = int(1.0 * SR); place(sfx, filt(noise(1.0), 'band', [300, 2000]) * (rng.random(n) > 0.99) * 4 * env(n, 0.05, 0.3), tp + 0.1, 0.08, 0.4)
for k in range(5):
    place(sfx, beep(990 + 110 * k, 0.07), 102.6 + k * 0.45, 0.035)
# failures: clogged filter (strained intake), coolers + trip, varnish, separator, thermostat, leaks
n = int(3.5 * SR); tt = np.arange(n) / SR
place(sfx, filt(noise(3.5), 'band', [500, 2500]) * (0.7 + 0.3 * np.sin(2 * np.pi * 5 * tt)) * env(n, 0.5, 0.8), 110.0, 0.06, -0.3)
for k in range(3):
    place(sfx, beep(880, 0.14), 116.6 + k * 0.7, 0.04)
place(sfx, clunk(0.4), 118.75, 0.26); place(sfx, tick(0.04, 1400), 118.77, 0.2)
n = int(1.2 * SR); tt = np.arange(n) / SR
place(sfx, np.sin(2 * np.pi * np.cumsum(200 * np.exp(-tt / 0.35)) / SR) * env(n, 0.01, 0.8), 118.8, 0.06)
for k in range(3):
    place(sfx, beep(880, 0.12), 118.85 + k * 0.2, 0.06)
n = int(2.0 * SR); place(sfx, filt(noise(2.0), 'band', [80, 400]) * env(n, 0.5, 0.8), 120.2, 0.08)          # varnish: low grind
place(sfx, hiss(2.0, 3000, 10000, 1.0), 124.0, 0.04, 0.3)                                        # carry-over mist
place(sfx, tick(0.05, 900), 129.6, 0.16)
n = int(1.6 * SR); place(sfx, filt(noise(1.6), 'band', [200, 1200]) * (rng.random(n) > 0.993) * 5 * env(n, 0.1, 0.3), 131.4, 0.08)   # water drops
n = int(1.2 * SR); place(sfx, filt(noise(1.2), 'band', [3000, 9000]) * (0.5 + 0.5 * (rng.random(n) > 0.96)) * env(n, 0.3, 0.3), 133.4, 0.06)   # cooking sizzle
for a, f0, f1, pan in ((135.0, 4000, 11000, -0.4), (135.7, 5000, 12000, 0.3), (136.4, 3000, 9000, 0.6)):  # leak hisses
    place(sfx, steady_hiss(142.4 - a, f0, f1, 0.3, 0.3), a, 0.045, pan)
# warning list ticks
for tp in (142.6, 146.9, 151.0, 155.7):
    place(sfx, tink(1800, 0.35, 0.2), tp, 0.07)
# the fix
for k in range(5):
    place(sfx, tick(0.02, 2800), 160.4 + k * 0.5, 0.08)
for tp, g in ((164.0, 0.14), (164.6, 0.1), (165.5, 0.16), (165.8, 0.12), (166.4, 0.1), (167.2, 0.14)):
    place(sfx, clunk(0.3), tp, g, float(rng.uniform(-0.3, 0.3)))
n = int(1.4 * SR); tt = np.arange(n) / SR
place(sfx, filt(noise(1.4), 'band', [120, 500]) * (0.5 + 0.5 * np.sin(2 * np.pi * 6 * tt) ** 8) * env(n, 0.1, 0.3), 168.7, 0.14)   # oil glugs
place(sfx, clunk(0.35), 170.1, 0.16); place(sfx, tink(2600, 0.3, 0.4), 170.5, 0.05); place(sfx, clunk(0.3), 171.5, 0.16)
n = int(3.0 * SR); place(sfx, filt(noise(3.0), 'band', [2500, 9000]) * env(n, 0.4, 0.5), 174.3, 0.08, 0.3)
place(sfx, whoosh(1.0, 200, 1500, 1.0, 1.0, (0.5, 0.5)), 175.4, 0.1)
place(sfx, tick(0.04, 1500), 179.9, 0.2); place(sfx, hiss(2.0, 1500, 8000, 0.9), 180.0, 0.14, -0.3)   # unload + blowdown
place(sfx, tick(0.04, 1500), 182.1, 0.18); place(sfx, clunk(0.25), 182.15, 0.1)                       # reload
place(sfx, tink(3200, 0.4, 0.2), 182.9, 0.06)
place(sfx, steady_hiss(1.8, 4000, 11000, 0.2, 0.15), 185.2, 0.05, -0.2)
n = int(1.5 * SR); place(sfx, filt(noise(1.5), 'band', [1500, 6000]) * (rng.random(n) > 0.9) * 2 * env(n, 0.2, 0.2), 185.5, 0.07)   # detector crackle
place(sfx, beep(1500, 0.08), 186.6, 0.05); place(sfx, beep(1500, 0.08), 186.75, 0.05)
for k in range(4):
    place(sfx, beep(1200 - 60 * k, 0.05), 188.4 + k * 0.32, 0.04)
for tp in (159.95, 163.7, 168.5, 174.1, 178.4, 185.2):
    place(sfx, tink(2400, 0.3, 0.2), tp, 0.05)
for tp in (163.2, 167.9, 173.7, 177.9, 184.5, 190.4):
    place(sfx, tink(3200, 0.4, 0.2), tp, 0.07); place(sfx, tink(4100, 0.4, 0.2), tp + 0.07, 0.05)
# end
place(sfx, boom(2.4, 90, 28, 1.8), 191.2, 0.5)
place(sfx, shimmer(2.0, (880, 1318, 1760, 2637), 1.5), 191.4, 0.09)

S.finish(TOPIC, sfx, music, amb)
