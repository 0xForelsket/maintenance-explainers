import sys, numpy as np
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / 'audio'))
import synth as S
from synth import place, filt, noise, boom, whoosh, tink, thud, clunk, tick, beep, shimmer, pad, ss

TOPIC = str(HERE)
DUR = 82.32
S.set_duration(DUR)
N, SR = S.N, S.SR
t = np.arange(N) / SR
rng = np.random.default_rng(83)
sfx, music, amb = S.bus(), S.bus(), S.bus()
cuts = [2.9, 5.3, 7.4, 10.3, 13.5, 16.4, 20.1, 24.1, 27.5, 33.4, 38.1, 41.0, 44.1, 48.4, 51.0, 54.1, 58.3, 61.0, 62.3, 65.9, 68.5, 70.6, 74.1, 76.0, 77.6, 79.75]

def pulse(a, b, c, d, x):
    return ss(a, b, x) * (1 - ss(c, d, x))

# ---- ambience: blower hum + air rush through the loop (chokes as the filter clogs)
airflow = 1 - 0.55 * ss(41.0, 43.6, t) * (1 - ss(67.0, 67.6, t))
drone = filt(np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1), 'band', [60, 420])
rush = filt(np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1), 'band', [500, 3800]) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.23 * t))[:, None]
choke = filt(np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1), 'band', [300, 1200])
on = 1 - pulse(0.0, 0.1, 5.2, 5.4, t)                       # hook rig: quiet room
amb += drone * (0.2 * on)[:, None] + rush * (0.1 * airflow * on)[:, None] + choke * (0.08 * (1 - airflow) / 0.55 * on)[:, None]
hum = np.sin(2 * np.pi * 100 * t) * 0.5 + np.sin(2 * np.pi * 200 * t) * 0.2
amb += np.stack([hum, hum], 1) * (0.012 * on)[:, None]
# hook: soft humid room air
amb += filt(np.stack([noise(DUR), noise(DUR)], 1), 'band', [800, 5000]) * (0.05 * pulse(0.0, 0.6, 2.7, 2.9, t))[:, None]

# ---- music
place(music, pad(7.4, [55, 82.4, 110], 1.0, 2.0, 420), 0.0, 0.5)
place(music, pad(31.2, [55, 82.4, 110, 164.8], 1.5, 2.5, 800), 7.2, 0.38)
n = int((65.9 - 37.9) * SR); tt = np.arange(n) / SR
tens = np.zeros(n)
for f in (55, 58.3, 82.4, 87.3, 110, 116.5):
    tens += 2 * ((f * np.cumsum(1 + 0.05 * (tt / tt[-1]) ** 2) / SR + rng.random()) % 1.0) - 1
tens = filt(tens, 'low', 900) / 6 * np.minimum(1, tt / 1.2) * (0.5 + 0.5 * tt / tt[-1]) * np.minimum(1, (tt[-1] - tt) / 0.4)
place(music, tens, 37.9, 0.48)
for tp in np.arange(58.4, 65.7, 0.66):
    g = 0.22 + 0.3 * min(1, (tp - 58.4) / 4)
    place(music, thud(0.3, 62), tp, g); place(music, thud(0.25, 58), tp + 0.16, g * 0.5)
place(music, pad(14.2, [65.4, 98, 130.8, 196], 1.2, 2.0, 1200), 65.8, 0.34)
place(music, pad(3.0, [110, 138.6, 164.8, 220, 277.2, 329.6], 0.8, 2.2, 2200, 0.004), 79.3, 0.45)
place(music, shimmer(3.0, (880, 1108.7, 1318.5, 1760), 2.0), 79.5, 0.16)

# ---- hits / transitions
place(sfx, boom(2.0, 100, 30), 7.4, 0.6)
place(sfx, shimmer(3.0, (659, 988, 1318, 1976), 1.4), 7.6, 0.08)
place(sfx, whoosh(1.5, 600, 9000, 3.0, 1.2, (0.75, 0.25)), 10.2, 0.3, -0.2)
for tc in cuts:
    if tc in (7.4, 10.3): continue
    place(sfx, whoosh(0.42, 400, 2500, 1.0, 1.0, (0.7, 0.3)), tc - 0.28, 0.11, float(rng.uniform(-0.4, 0.4)))
place(sfx, whoosh(1.2, 300, 4200, 1.4, 1.0, (0.6, 0.4)), 10.4, 0.16)
# hook: moisture "soaking in" tinks, defects reveal
for tp in (1.1, 1.6, 2.1, 2.5):
    place(sfx, tink(1400 + 200 * rng.random(), 0.35, 0.3), tp, 0.05)
place(sfx, filt(noise(0.25), 'band', [1500, 7000]) * np.exp(-np.arange(int(0.25 * SR)) / (0.04 * SR)), 3.5, 0.12)
# hot air into the bed: soft rising sweep; moisture leaving
place(sfx, whoosh(2.2, 200, 2600, 1.2, 1.0, (0.4, 0.6)), 13.7, 0.12)
for tp in np.arange(17.0, 19.8, 0.45):
    place(sfx, tink(2200 + 400 * rng.random(), 0.3, 0.3), float(tp), 0.035)
# tower swap: pneumatic valve clunk + hiss
place(sfx, clunk(0.4), 32.55, 0.32)
n = int(0.7 * SR); place(sfx, filt(noise(0.7), 'band', [2500, 9000]) * np.minimum(1, np.arange(n) / (0.02 * SR)) * np.exp(-np.arange(n) / (0.22 * SR)), 32.6, 0.18, -0.2)
place(sfx, beep(1320, 0.1), 33.9, 0.05); place(sfx, beep(1760, 0.14), 34.05, 0.05)
place(sfx, boom(1.4, 80, 35, 1.2), 38.1, 0.35)
# filter clogs: blower note sags
n = int(3.0 * SR); tt = np.arange(n) / SR
place(sfx, np.sin(2 * np.pi * np.cumsum(420 - 160 * ss(0, 2.6, tt)) / SR) * np.minimum(1, tt / 0.4) * np.minimum(1, (tt[-1] - tt) / 0.3), 41.0, 0.02)
# heater fails: electrical pop, then the dew point climbs
place(sfx, filt(noise(0.12), 'band', [800, 6000]) * np.exp(-np.arange(int(0.12 * SR)) / (0.02 * SR)), 44.25, 0.35, -0.3)
place(sfx, thud(0.3, 70), 44.27, 0.25)
n = int(2.4 * SR); tt = np.arange(n) / SR
place(sfx, np.sin(2 * np.pi * np.cumsum(300 + 400 * (tt / tt[-1]) ** 2) / SR) * np.minimum(1, tt / 0.3) * np.minimum(1, (tt[-1] - tt) / 0.2), 45.8, 0.024)
# leak: thin whistle/hiss sucked in at the joint
n = int(2.5 * SR); tt = np.arange(n) / SR
hiss = filt(noise(2.5), 'band', [3000, 8000]) * (0.7 + 0.3 * np.sin(2 * np.pi * 5 * tt)) + 0.15 * np.sin(2 * np.pi * 2900 * tt)
place(sfx, hiss * np.minimum(1, tt / 0.3) * np.minimum(1, (tt[-1] - tt) / 0.3), 48.5, 0.06, 0.25)
# low hopper: pellets trickling down
for tp in np.sort(rng.uniform(51.2, 53.6, 90)):
    place(sfx, tick(0.012, float(rng.uniform(2200, 5200))), float(tp), float(rng.uniform(0.02, 0.06)), float(rng.uniform(-0.5, 0.5)))
# defects: brittle snap
place(sfx, filt(noise(0.18), 'band', [1200, 9000]) * np.exp(-np.arange(int(0.18 * SR)) / (0.025 * SR)), 56.6, 0.4, 0.2)
place(sfx, tick(0.03, 1800), 56.62, 0.2)
# ---- fix: filter out + air-gun blast, dew point recovers, refill, clamp, fresh desiccant
place(sfx, whoosh(0.6, 300, 1500, 1.0, 1.0, (0.5, 0.5)), 66.3, 0.16)
n = int(0.8 * SR); place(sfx, filt(noise(0.8), 'band', [1500, 9000]) * np.minimum(1, np.arange(n) / (0.03 * SR)) * np.exp(-np.arange(n) / (0.35 * SR)), 66.95, 0.3, 0.2)
place(sfx, whoosh(0.6, 1500, 300, 1.0, 1.0, (0.5, 0.5)), 67.9, 0.14)
place(sfx, beep(990, 0.1), 70.1, 0.05); place(sfx, beep(1320, 0.18), 70.25, 0.05)
for tp in np.sort(rng.uniform(74.4, 75.9, 140)):
    place(sfx, tick(0.012, float(rng.uniform(1800, 4800))), float(tp), float(rng.uniform(0.02, 0.06)), float(rng.uniform(-0.5, 0.5)))
for k in range(6):
    place(sfx, tick(0.025, 2600), 76.25 + k * 0.11, 0.14)
place(sfx, clunk(0.25), 76.95, 0.18)
for tp in np.sort(rng.uniform(77.8, 79.2, 160)):
    place(sfx, tick(0.01, float(rng.uniform(3500, 7000))), float(tp), float(rng.uniform(0.015, 0.045)), float(rng.uniform(-0.5, 0.5)))
place(sfx, shimmer(1.6, (1318, 1760, 2637), 0.8), 78.9, 0.08)
# ---- checklist
for tp in (59.9, 61.15, 62.45):
    place(sfx, tink(1800, 0.35, 0.2), tp, 0.07)
for tp in (66.3, 68.6, 70.6, 74.2):
    place(sfx, tink(2400, 0.3, 0.2), tp, 0.06)
for tp in (67.8, 70.3, 73.9, 79.2):
    place(sfx, tink(3200, 0.4, 0.2), tp, 0.08); place(sfx, tink(4100, 0.4, 0.2), tp + 0.07, 0.06)
# end
place(sfx, boom(2.6, 90, 28, 1.8), 79.7, 0.55)
place(sfx, shimmer(2.4, (880, 1318, 1760, 2637), 1.6), 79.95, 0.1)

S.finish(TOPIC, sfx, music, amb)
