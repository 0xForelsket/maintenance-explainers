import sys, json, numpy as np
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / 'audio'))
import synth as S
from synth import place, filt, noise, boom, whoosh, tink, thud, clunk, tick, beep, shimmer, pad, ss

TOPIC = str(HERE)
DUR = 198.65
S.set_duration(DUR)
N, SR = S.N, S.SR
t = np.arange(N) / SR
rng = np.random.default_rng(31)
sfx, music, amb = S.bus(), S.bus(), S.bus()
cuts = [7.6, 13.0, 15.3, 21.5, 28.4, 38.2, 46.6, 50.4, 54.5, 58.6, 63.0, 71.4, 79.3, 89.7, 95.2, 103.6, 107.1, 111.6, 116.3, 121.5, 130.0, 134.0,
        138.0, 141.0, 145.5, 150.0, 154.7, 158.3, 160.3, 163.8, 168.7, 171.6, 174.8, 178.6, 184.6, 190.9, 195.8]

def pulse(a, b, c, d, x):
    return ss(a, b, x) * (1 - ss(c, d, x))

def env(n, a, r):
    i = np.arange(n); return np.minimum(1, i / max(1, a * SR)) * np.minimum(1, (n - i) / max(1, r * SR))

def hiss(sec, lo=2500, hi=9000, decay=0.25):
    n = int(sec * SR); return filt(noise(sec), 'band', [lo, hi]) * np.minimum(1, np.arange(n) / (0.01 * SR)) * np.exp(-np.arange(n) / (decay * SR))

def crackle(sec, dens=0.985, lo=1500, hi=8000):
    n = int(sec * SR); return filt(noise(sec), 'band', [lo, hi]) * (rng.random(n) > dens) * 3 * env(n, 0.05, 0.1)

# ---- machine state (mirrors story.js): compressor + fans stop on the HP trip and after the evaporator splits
def stopped(a, b, spin=1.2):
    return ss(a, a + spin, t) * (1 - ss(b - 0.05, b + 0.6, t))
run = 1 - np.maximum(stopped(117.4, 121.4), stopped(143.8, 145.0, 0.6))
foul = ss(107.4, 115.2, t) * (1 - ss(170.0, 172.6, t))
spray = pulse(169.0, 169.4, 172.4, 172.8, t)
air = run * (1 - 0.45 * foul) * (1 - 0.6 * spray)
macro = pulse(28.4, 29.0, 37.8, 38.4, t) + pulse(121.5, 122.1, 129.6, 130.2, t)   # plate-exchanger close-ups: quieter
quiet = 1 - 0.5 * np.minimum(1, macro)

# ---- ambience: condenser fans (broadband air + blade pass), scroll compressor hum, water pump
fanN = filt(np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1), 'band', [120, 2400])
blade = 0.75 + 0.25 * np.sin(2 * np.pi * 23 * t * (0.4 + 0.6 * air))
amb += fanN * (0.12 * air * blade * quiet)[:, None]
ph = 2 * np.pi * np.cumsum(50 * (0.3 + 0.7 * run)) / SR
hum = 0.5 * np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph + 0.4) + 0.05 * np.sin(7 * ph)
hum = hum * run * (1 + 0.25 * foul)
amb += np.stack([hum, hum], 1) * (0.035 * quiet)[:, None]
whine = filt(noise(DUR), 'band', [1800, 2300]) * run
amb += np.stack([whine, whine], 1) * (0.012 * quiet)[:, None]
pumpN = filt(np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1), 'band', [60, 400])
amb += pumpN * (0.12 * quiet)[:, None]
# hook: outdoor cooling tower (spray rain) before the chiller is introduced
rain = filt(np.stack([noise(13.2), noise(13.2)], 1), 'band', [1200, 7000]) * env(int(13.2 * SR), 1.0, 1.4)[:, None]
place(amb, rain, 0.0, 0.07)

# ---- music: calm explainer bed → tension through the failures (beat under the warning signs) → resolve
place(music, pad(13.4, [49, 73.4, 98], 1.0, 2.5, 420), 0.0, 0.45)
place(music, pad(90.0, [49, 73.4, 98, 146.8], 2.0, 3.0, 800), 13.0, 0.34)
n = int((164.0 - 103.4) * SR); tt = np.arange(n) / SR
tens = np.zeros(n)
for f in (49, 51.9, 73.4, 77.8, 98, 103.8):
    tens += 2 * ((f * np.cumsum(1 + 0.04 * (tt / tt[-1]) ** 2) / SR + rng.random()) % 1.0) - 1
tens = filt(tens, 'low', 850) / 6 * np.minimum(1, tt / 1.5) * (0.45 + 0.55 * tt / tt[-1]) * np.minimum(1, (tt[-1] - tt) / 0.5)
place(music, tens, 103.4, 0.42)
for tp in np.arange(145.6, 163.6, 0.68):
    g = 0.2 + 0.25 * min(1, (tp - 145.6) / 6)
    place(music, thud(0.3, 62), float(tp), g); place(music, thud(0.25, 58), float(tp) + 0.16, g * 0.5)
place(music, pad(33.0, [58.3, 87.3, 116.5, 174.6], 2.0, 3.0, 1200), 163.7, 0.32)
place(music, pad(2.8, [98, 123.5, 146.8, 196, 246.9, 293.7], 0.8, 2.0, 2200, 0.004), 195.85, 0.42)
place(music, shimmer(2.4, (784, 987.8, 1174.7, 1568), 2.0), 196.0, 0.14)

# ---- hits / transitions
place(sfx, boom(2.0, 100, 30), 13.05, 0.55)
place(sfx, shimmer(3.0, (587, 880, 1175, 1760), 1.4), 13.25, 0.07)
for tc in cuts:
    if tc in (13.0, 195.8): continue
    place(sfx, whoosh(0.42, 400, 2500, 1.0, 1.0, (0.7, 0.3)), tc - 0.28, 0.09, float(rng.uniform(-0.4, 0.4)))
for tc in (15.3, 103.6, 145.5, 163.8):
    place(sfx, whoosh(1.2, 300, 4200, 1.4, 1.0, (0.6, 0.4)), tc - 0.2, 0.16)
place(sfx, boom(1.4, 80, 35, 1.2), 103.65, 0.32)
# evaporator: water rush, then boiling refrigerant fizz
n = int(8.0 * SR); place(sfx, np.stack([filt(noise(8.0, 'pink'), 'band', [150, 900])] * 2, 1) * env(n, 1.0, 1.5)[:, None], 29.0, 0.1)
n = int(6.0 * SR); place(sfx, filt(noise(6.0), 'band', [3000, 9000]) * (0.4 + 0.6 * (rng.random(n) > 0.9)) * env(n, 1.0, 1.0), 39.0, 0.035)
# compressor: start-up thunk and rising hum
place(sfx, clunk(0.35), 46.9, 0.15)
n = int(3.0 * SR); tt = np.arange(n) / SR
place(sfx, np.sin(2 * np.pi * np.cumsum(60 + 40 * (tt / tt[-1]) ** 0.5) / SR) * env(n, 0.2, 1.2), 47.0, 0.05)
# condenser fans spin up
place(sfx, whoosh(2.0, 200, 1800, 1.2, 0.7, (0.6, 0.4)), 54.7, 0.12)
# expansion valve: pressure drop hiss
n = int(3.0 * SR); place(sfx, filt(noise(3.0), 'band', [4000, 11000]) * env(n, 0.3, 1.0), 63.6, 0.05, 0.3)
# gauges: needle ticks; power bill climbing
for tp in (79.8, 80.4, 81.0):
    place(sfx, tick(0.02, 2600), tp, 0.1)
for k in range(5):
    place(sfx, beep(990 + 110 * k, 0.07), 90.6 + k * 0.45, 0.035)
# fouling: dust swirl, fins clogging (soft crunch)
place(sfx, whoosh(2.5, 150, 1200, 1.0, 1.0, (0.4, 0.6)), 107.3, 0.1)
n = int(2.2 * SR); place(sfx, filt(noise(2.2), 'band', [300, 3000]) * (0.6 + 0.4 * (rng.random(n) > 0.7)) * env(n, 0.3, 0.6), 109.4, 0.05)
# HP trip: relay clunk, wind-down, alarm
place(sfx, clunk(0.4), 117.4, 0.24); place(sfx, tick(0.04, 1400), 117.42, 0.2)
n = int(2.4 * SR); tt = np.arange(n) / SR
place(sfx, np.sin(2 * np.pi * np.cumsum(110 * np.exp(-tt / 0.8)) / SR) * env(n, 0.01, 1.4), 117.45, 0.08)
for k in range(4):
    place(sfx, beep(880, 0.16), 117.9 + k * 0.45, 0.06); place(sfx, beep(660, 0.16), 118.1 + k * 0.45, 0.06)
place(sfx, clunk(0.3), 121.4, 0.14)
# scale: gritty water side
n = int(3.0 * SR); place(sfx, filt(noise(3.0), 'band', [500, 3500]) * (rng.random(n) > 0.93) * 2 * env(n, 0.5, 0.8), 122.4, 0.08)
# leak: thin hiss + sight-glass bubble blips
place(sfx, hiss(3.0, 5000, 12000, 1.6), 130.5, 0.05, 0.4)
for tp in np.sort(rng.uniform(131.2, 137.4, 12)):
    place(sfx, tink(float(rng.uniform(1400, 2200)), 0.12, 0.5), float(tp), 0.025)
# low flow: pump strain, ice crackle, the split
n = int(2.6 * SR); tt = np.arange(n) / SR
place(sfx, filt(noise(2.6), 'band', [200, 900]) * (0.7 + 0.3 * np.sin(2 * np.pi * 3 * tt)) * env(n, 0.4, 0.6), 138.5, 0.07)
place(sfx, crackle(3.0, 0.992, 2000, 9000), 140.8, 0.16)
place(sfx, filt(noise(0.2), 'band', [400, 8000]) * np.exp(-np.arange(int(0.2 * SR)) / (0.035 * SR)), 143.62, 0.55)
place(sfx, boom(1.2, 110, 40, 1.6), 143.64, 0.3)
place(sfx, crackle(1.0, 0.97), 143.7, 0.2)
for k in range(3):
    place(sfx, beep(990, 0.18), 144.0 + k * 0.4, 0.05)
# warning list ticks
for tp in (145.8, 150.1, 154.9, 158.5):
    place(sfx, tink(1800, 0.35, 0.2), tp, 0.07)
# the fix: shift log ticks, coil spray, strainer basket, glints, leak detector, flow switch test
for k in range(4):
    place(sfx, tick(0.02, 2800), 165.2 + k * 0.6, 0.08)
n = int(3.6 * SR); place(sfx, filt(noise(3.6), 'band', [2500, 9000]) * env(n, 0.4, 0.5), 169.1, 0.08, -0.2)
place(sfx, clunk(0.3), 175.1, 0.16); place(sfx, tink(2600, 0.3, 0.4), 175.4, 0.05); place(sfx, clunk(0.25), 177.7, 0.14)
for tp in (179.3, 181.0, 182.6):
    place(sfx, tink(3200, 0.4, 0.2), tp, 0.05)
tp = 185.4
while tp < 189.2:
    place(sfx, beep(1200, 0.04), tp, 0.03); tp += 0.42 - 0.3 * (tp - 185.4) / 3.8
for k in range(6):
    place(sfx, beep(1800, 0.05), 189.3 + k * 0.1, 0.045)
place(sfx, tick(0.04, 1600), 191.7, 0.18); place(sfx, beep(1320, 0.1), 192.0, 0.05); place(sfx, beep(1760, 0.14), 192.15, 0.05)
for tp in (164.0, 168.9, 175.0, 178.8, 184.9, 191.1):
    place(sfx, tink(2400, 0.3, 0.2), tp, 0.05)
for tp in (168.3, 174.3, 178.2, 184.2, 190.4, 195.0):
    place(sfx, tink(3200, 0.4, 0.2), tp, 0.07); place(sfx, tink(4100, 0.4, 0.2), tp + 0.07, 0.05)
# end
place(sfx, boom(2.6, 90, 28, 1.8), 195.9, 0.5)
place(sfx, shimmer(2.2, (880, 1318, 1760, 2637), 1.6), 196.1, 0.09)

S.finish(TOPIC, sfx, music, amb)
