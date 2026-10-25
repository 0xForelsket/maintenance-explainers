import sys, numpy as np
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / 'audio'))
import synth as S
from synth import place, filt, noise, boom, whoosh, tink, thud, clunk, tick, beep, shimmer, pad, ss

TOPIC = str(HERE)
DUR = 87.46
S.set_duration(DUR)
N, SR = S.N, S.SR
t = np.arange(N) / SR
rng = np.random.default_rng(61)
sfx, music, amb = S.bus(), S.bus(), S.bus()
cuts = [5.32, 6.96, 10.15, 16.25, 24.0, 26.98, 29.39, 34.6, 39.54, 41.71, 46.31, 48.4, 50.6, 53.19, 55.0, 57.23, 60.2, 62.4, 64.96, 67.5, 70.36, 72.4, 74.6, 76.5, 78.5, 84.88]

def pulse(a, b, c, d, x):
    return ss(a, b, x) * (1 - ss(c, d, x))

# ---- ambience: plant drone, TCU pump whirr, water running through the hoses
drone = filt(np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1), 'band', [50, 380])
pump = np.sin(2 * np.pi * 148 * t) * 0.4 + np.sin(2 * np.pi * 296 * t) * 0.2 + np.sin(2 * np.pi * 50 * t) * 0.3
slow = 1 - 0.5 * ss(79.0, 84.0, t)
water = filt(np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1), 'band', [200, 1800]) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.37 * t))[:, None]
amb += drone * 0.22 + (pump * 0.03 * slow)[:, None] + water * (0.13 * slow)[:, None]
# tower water rushing in while the cooling valve is open (demo + stuck-open)
rush = filt(np.stack([noise(DUR), noise(DUR)], 1), 'band', [600, 5000])
amb += rush * (0.12 * (pulse(30.0, 30.15, 34.2, 34.4, t) + pulse(50.8, 51.0, 53.0, 53.2, t)))[:, None]

# ---- music
place(music, pad(7.0, [55, 82.4, 110], 1.0, 2.0, 420), 0.0, 0.5)
place(music, pad(32.5, [55, 82.4, 110, 164.8], 1.5, 2.5, 800), 6.8, 0.38)
n = int((65.0 - 39.3) * SR); tt = np.arange(n) / SR
tens = np.zeros(n)
for f in (55, 58.3, 82.4, 87.3, 110, 116.5):
    tens += 2 * ((f * np.cumsum(1 + 0.05 * (tt / tt[-1]) ** 2) / SR + rng.random()) % 1.0) - 1
tens = filt(tens, 'low', 900) / 6 * np.minimum(1, tt / 1.2) * (0.5 + 0.5 * tt / tt[-1]) * np.minimum(1, (tt[-1] - tt) / 0.4)
place(music, tens, 39.3, 0.48)
for tp in np.arange(57.3, 64.8, 0.66):
    g = 0.22 + 0.3 * min(1, (tp - 57.3) / 4)
    place(music, thud(0.3, 62), tp, g); place(music, thud(0.25, 58), tp + 0.16, g * 0.5)
place(music, pad(20.5, [65.4, 98, 130.8, 196], 1.2, 2.0, 1200), 64.9, 0.34)
place(music, pad(4.5, [110, 138.6, 164.8, 220, 277.2, 329.6], 0.8, 2.8, 2200, 0.004), 84.2, 0.45)
place(music, shimmer(3.5, (880, 1108.7, 1318.5, 1760), 2.0), 84.4, 0.16)

# ---- hits / transitions
place(sfx, boom(2.0, 100, 30), 6.92, 0.6)
place(sfx, shimmer(3.0, (659, 988, 1318, 1976), 1.4), 7.15, 0.08)
place(sfx, whoosh(1.5, 600, 9000, 3.0, 1.2, (0.75, 0.25)), 10.05, 0.3, -0.2)
for tc in cuts:
    if tc in (6.96, 10.15): continue
    place(sfx, whoosh(0.42, 400, 2500, 1.0, 1.0, (0.7, 0.3)), tc - 0.28, 0.11, float(rng.uniform(-0.4, 0.4)))
place(sfx, whoosh(1.2, 300, 4200, 1.4, 1.0, (0.6, 0.4)), 10.25, 0.16)                 # section opens
for tp in (11.0, 12.5, 13.8, 14.8):
    place(sfx, tink(1500, 0.4, 0.4), tp, 0.06)
# heater contactor + cooling solenoid in the control demo
def contactor(tp, g=0.3):
    place(sfx, tick(0.04, 1700), tp, g, 0.2); place(sfx, thud(0.1, 160), tp, g * 0.5)
contactor(27.05); contactor(29.2, 0.2)
n = int(2.2 * SR); place(sfx, filt(np.sign(np.sin(2 * np.pi * 100 * np.arange(n) / SR)) * 0.3, 'low', 2500) * np.minimum(1, np.arange(n) / (0.05 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.1 * SR)), 27.05, 0.02)
place(sfx, clunk(0.35), 30.0, 0.35, -0.2); place(sfx, clunk(0.3), 34.3, 0.22, -0.2)
# control steady: soft ticks while the trend holds
for tp in np.arange(35.0, 39.3, 0.5):
    place(sfx, tick(0.02, 3000), float(tp), 0.04)
place(sfx, boom(1.4, 80, 35, 1.2), 39.5, 0.35)
# minerals fizz, scale crackle, burn-out
fz = filt(noise(2.2), 'band', [3000, 9000]) * (rng.random(int(2.2 * SR)) > 0.92)
place(sfx, fz, 39.6, 0.12)
crk = filt(noise(3.4), 'band', [1500, 7000]) * (rng.random(int(3.4 * SR)) > 0.985) * np.linspace(0.3, 1, int(3.4 * SR))
place(sfx, crk, 41.9, 0.4)
place(sfx, filt(noise(0.25), 'band', [2000, 8000]) * np.exp(-np.arange(int(0.25 * SR)) / (0.05 * SR)), 45.3, 0.45)
place(sfx, clunk(0.3), 45.32, 0.35); place(sfx, boom(1.2, 120, 40, 1.4), 45.32, 0.3)
# stuck valve: coil buzzing against a jammed plunger; temperature running away, then dropping
n = int(2.0 * SR); tt = np.arange(n) / SR
place(sfx, filt(np.sign(np.sin(2 * np.pi * 100 * tt)) * 0.4 + filt(noise(2.0), 'band', [2000, 6000]) * 0.2, 'low', 3000) * np.minimum(1, tt / 0.05) * np.minimum(1, (tt[-1] - tt) / 0.1), 46.4, 0.06)
n = int(2.2 * SR); tt = np.arange(n) / SR
place(sfx, np.sin(2 * np.pi * np.cumsum(320 + 420 * (tt / tt[-1]) ** 2) / SR) * np.minimum(1, tt / 0.3) * np.minimum(1, (tt[-1] - tt) / 0.2), 48.4, 0.028)
place(sfx, np.sin(2 * np.pi * np.cumsum(620 - 360 * (tt / tt[-1])) / SR) * np.minimum(1, tt / 0.3) * np.minimum(1, (tt[-1] - tt) / 0.2), 50.7, 0.028)
# seal drips, steam from a cracked hose
for tp in np.arange(53.4, 55.0, 0.36):
    place(sfx, tink(1700, 0.25, 0.3), float(tp), 0.08)
n = int(2.2 * SR); place(sfx, filt(noise(2.2), 'band', [2500, 10000]) * np.minimum(1, np.arange(n) / (0.15 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.3 * SR)), 55.05, 0.16, 0.2)
# alarm
for tp in np.arange(60.35, 62.3, 0.4):
    place(sfx, beep(1320, 0.14), tp, 0.07); place(sfx, beep(990, 0.14), tp + 0.18, 0.06)
# fix: descaler fizz, flush, strainer, valve test, sweep, OT test, depressurise hiss
fz2 = filt(noise(2.4), 'band', [2500, 9000]) * (rng.random(int(2.4 * SR)) > 0.85) * np.linspace(1, 0.2, int(2.4 * SR))
place(sfx, fz2, 65.1, 0.16)
place(sfx, whoosh(2.4, 200, 2200, 0.8, 1.0, (0.3, 0.7)), 67.6, 0.25)
for k in range(6):
    place(sfx, tick(0.03, 3400), 70.4 + k * 0.07, 0.1)
place(sfx, whoosh(0.6, 400, 1600, 0.9, 1.0, (0.5, 0.5)), 70.9, 0.14)
place(sfx, whoosh(0.6, 1600, 400, 0.9, 1.0, (0.5, 0.5)), 71.95, 0.12)
for k, tp in enumerate(np.arange(72.45, 74.5, 0.5)):
    place(sfx, clunk(0.25), float(tp), 0.22 if k % 2 == 0 else 0.15, -0.2)
place(sfx, whoosh(1.8, 300, 2500, 1.0, 1.0, (0.4, 0.6)), 74.6, 0.12)
place(sfx, beep(880, 0.12), 76.75, 0.07); place(sfx, beep(1320, 0.2), 76.95, 0.07)
n = int(3.0 * SR); place(sfx, filt(noise(3.0), 'band', [1500, 8000]) * np.exp(-np.arange(n) / (1.1 * SR)), 80.5, 0.22, 0.1)

# ---- checklist
for tp in (58.4, 60.8, 61.9, 63.2):
    place(sfx, tink(1800, 0.35, 0.2), tp, 0.07)
for tp in (65.1, 70.4, 74.7, 78.6):
    place(sfx, tink(2400, 0.3, 0.2), tp, 0.06)
for tp in (70.0, 74.4, 78.3, 84.3):
    place(sfx, tink(3200, 0.4, 0.2), tp, 0.08); place(sfx, tink(4100, 0.4, 0.2), tp + 0.07, 0.06)
# end
place(sfx, boom(2.6, 90, 28, 1.8), 84.85, 0.55)
place(sfx, shimmer(2.6, (880, 1318, 1760, 2637), 1.6), 85.1, 0.1)

S.finish(TOPIC, sfx, music, amb)
