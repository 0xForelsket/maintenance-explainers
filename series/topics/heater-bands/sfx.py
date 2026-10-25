import sys, numpy as np
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / 'audio'))
import synth as S
from synth import place, filt, noise, boom, whoosh, tink, thud, clunk, tick, beep, shimmer, pad, ss

TOPIC = str(HERE)
DUR = 77.01
S.set_duration(DUR)
N, SR = S.N, S.SR
t = np.arange(N) / SR
rng = np.random.default_rng(44)
sfx, music, amb = S.bus(), S.bus(), S.bus()
cuts = [5.1, 6.5, 9.2, 13.8, 16.4, 20.0, 24.7, 29.4, 35.5, 38.6, 42.0, 44.6, 48.3, 52.9, 55.6, 57.9, 60.7, 63.6, 65.75, 67.75, 70.0, 73.6]

def pulse(a, b, c, d, x):
    return ss(a, b, x) * (1 - ss(c, d, x))

# ---- ambience: machine room drone, mains hum (off while isolated), contactor clicks as zones switch
pwr = 1 - pulse(61.3, 61.7, 65.6, 65.8, t) - pulse(67.6, 67.8, 69.9, 70.1, t)
drone = filt(np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1), 'band', [50, 380])
hum = np.sin(2 * np.pi * 100 * t) * 0.6 + np.sin(2 * np.pi * 200 * t) * 0.25 + np.sin(2 * np.pi * 300 * t) * 0.12
amb += drone * (0.22 + 0.12 * pwr)[:, None] + (hum * 0.04 * pwr)[:, None]
# screw turning (quiet grind), louder in the shear-heat shot
shear = pulse(29.4, 29.8, 35.2, 35.5, t)
grind = filt(np.stack([noise(DUR), noise(DUR)], 1), 'band', [220, 1400])
amb += grind * ((0.03 + 0.12 * shear) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.21 * t)))[:, None]
# contactor clicks for the controller switching zone 3 on/off (time-proportioned)
for k, d in enumerate((0.38, 0.45, 0.42, 0.4)):
    for n in range(int(DUR * 0.9) + 2):
        for edge in (0.0, d):
            tp = (n + edge - k * 0.37) / 0.9
            if 24.7 < tp < 29.4 and k == 2:
                place(sfx, tick(0.04, 1800 if edge == 0 else 1400), tp, 0.14, 0.2)
                place(sfx, thud(0.08, 180), tp, 0.08)

# ---- music
place(music, pad(6.6, [55, 82.4, 110], 1.0, 2.0, 420), 0.0, 0.5)
place(music, pad(29.5, [55, 82.4, 110, 164.8], 1.5, 2.5, 800), 6.3, 0.38)
n = int((60.7 - 35.3) * SR); tt = np.arange(n) / SR
tens = np.zeros(n)
for f in (55, 58.3, 82.4, 87.3, 110, 116.5):
    tens += 2 * ((f * np.cumsum(1 + 0.05 * (tt / tt[-1]) ** 2) / SR + rng.random()) % 1.0) - 1
tens = filt(tens, 'low', 900) / 6 * np.minimum(1, tt / 1.2) * (0.5 + 0.5 * tt / tt[-1]) * np.minimum(1, (tt[-1] - tt) / 0.4)
place(music, tens, 35.3, 0.5)
for tp in np.arange(53.0, 60.6, 0.66):
    g = 0.22 + 0.3 * min(1, (tp - 53.0) / 4)
    place(music, thud(0.3, 62), tp, g); place(music, thud(0.25, 58), tp + 0.16, g * 0.5)
for tp in np.arange(55.8, 57.8, 0.8):
    place(sfx, beep(880), tp, 0.05, 0.3); place(sfx, beep(660), tp + 0.2, 0.05, 0.3)
place(music, pad(13.5, [65.4, 98, 130.8, 196], 1.2, 2.0, 1200), 60.7, 0.34)
place(music, pad(5.0, [110, 138.6, 164.8, 220, 277.2, 329.6], 0.8, 2.8, 2200, 0.004), 73.0, 0.45)
place(music, shimmer(4.0, (880, 1108.7, 1318.5, 1760), 2.0), 73.2, 0.16)

# ---- hits / transitions
place(sfx, boom(2.0, 100, 30), 6.45, 0.6)
place(sfx, shimmer(3.0, (659, 988, 1318, 1976), 1.4), 6.7, 0.08)
place(sfx, whoosh(1.5, 600, 9000, 3.0, 1.2, (0.75, 0.25)), 9.1, 0.3, -0.2)
for tc in cuts:
    if tc in (6.5, 9.2): continue
    place(sfx, whoosh(0.45, 400, 2500, 1.0, 1.0, (0.7, 0.3)), tc - 0.3, 0.13, float(rng.uniform(-0.4, 0.4)))
# zones lighting up one by one
for k, tp in enumerate((10.4, 11.0, 11.6, 12.2)):
    place(sfx, tink(1200 + 300 * k, 0.5, 0.4), tp, 0.07)
# thermocouple: a rising electric whine as the junction warms
n = int(4.4 * SR); tt = np.arange(n) / SR
el = np.sin(2 * np.pi * np.cumsum(200 + 900 * (tt / tt[-1])) / SR) * np.minimum(1, tt / 0.5) * np.minimum(1, (tt[-1] - tt) / 0.3)
place(sfx, el, 20.2, 0.022)
for tp in np.arange(20.4, 24.4, 0.21):
    place(sfx, tick(0.012, 5200), float(tp), 0.04, 0.4)
# burn-out: crackle, pop, dead silence of the coil
crk = filt(noise(0.6), 'band', [1500, 7000]) * (rng.random(int(0.6 * SR)) > 0.97)
place(sfx, crk, 35.8, 0.6)
place(sfx, clunk(0.3), 36.3, 0.4); place(sfx, boom(1.2, 120, 40, 1.4), 36.3, 0.35)
place(sfx, filt(noise(0.25), 'band', [2000, 8000]) * np.exp(-np.arange(int(0.25 * SR)) / (0.05 * SR)), 36.3, 0.4)
# overheating loose band: rising sizzle, then it fails
n = int(2.4 * SR); tt = np.arange(n) / SR
siz = filt(noise(2.4), 'band', [3000, 9000]) * (tt / tt[-1]) * np.minimum(1, (tt[-1] - tt) / 0.1)
place(sfx, siz, 39.3, 0.12)
place(sfx, clunk(0.3), 41.6, 0.3); place(sfx, filt(noise(0.2), 'band', [2000, 8000]) * np.exp(-np.arange(int(0.2 * SR)) / (0.04 * SR)), 41.6, 0.3)
# arcing terminal
for tp in np.sort(rng.uniform(42.3, 44.4, 26)):
    x = filt(noise(0.05), 'band', [1500, 9000]) * np.exp(-np.arange(int(0.05 * SR)) / (0.01 * SR))
    place(sfx, x, float(tp), float(rng.uniform(0.15, 0.4)), 0.3)
n = int(2.1 * SR); tt = np.arange(n) / SR
place(sfx, np.sign(np.sin(2 * np.pi * 100 * tt)) * 0.3 * np.minimum(1, tt / 0.05) * np.minimum(1, (tt[-1] - tt) / 0.1), 42.3, 0.03, 0.3)
# thermocouple backs out: a little slide + downward tone as the reading drops
place(sfx, whoosh(0.6, 900, 300, 1.0, 1.0, (0.5, 0.5)), 44.8, 0.12)
n = int(1.8 * SR); tt = np.arange(n) / SR
place(sfx, np.sin(2 * np.pi * np.cumsum(700 - 300 * tt / tt[-1]) / SR) * np.minimum(1, tt / 0.2) * np.minimum(1, (tt[-1] - tt) / 0.2), 45.0, 0.03)
# runaway: rising tone
n = int(4.2 * SR); tt = np.arange(n) / SR
place(sfx, np.sin(2 * np.pi * np.cumsum(300 + 400 * (tt / tt[-1]) ** 2) / SR) * np.minimum(1, tt / 0.4) * np.minimum(1, (tt[-1] - tt) / 0.2), 48.5, 0.03)
place(sfx, boom(1.4, 80, 35, 1.2), 35.5, 0.35)
# lockout: heavy rotary switch, padlock snap, power-down
place(sfx, clunk(0.6), 61.5, 0.6); place(sfx, boom(1.0, 70, 30, 1.0), 61.5, 0.25)
n = int(1.2 * SR); tt = np.arange(n) / SR
place(sfx, np.sin(2 * np.pi * np.cumsum(100 * (1 - 0.7 * tt / tt[-1])) / SR) * (1 - tt / tt[-1]), 61.6, 0.06)
place(sfx, tick(0.05, 2600), 62.55, 0.4); place(sfx, tink(2200, 0.4, 0.5), 62.58, 0.12)
# meter beeps
place(sfx, beep(2000, 0.12), 64.2, 0.06); place(sfx, beep(2000, 0.12), 66.3, 0.06)
place(sfx, tick(0.05, 2000), 66.0, 0.25)
# band snaps tight, thermocouple clicks home
place(sfx, clunk(0.4), 68.4, 0.35); place(sfx, tink(2600, 0.4, 0.4), 68.8, 0.1)
place(sfx, tick(0.04, 3000), 71.1, 0.35); place(sfx, tink(3000, 0.4, 0.4), 71.15, 0.1)

# ---- checklist
for tp in (54.3, 55.9, 58.2):
    place(sfx, tink(1800, 0.35, 0.2), tp, 0.07)
for tp in (60.9, 63.7, 67.9, 70.2):
    place(sfx, tink(2400, 0.3, 0.2), tp, 0.06)
for tp in (63.4, 67.5, 69.9, 72.8):
    place(sfx, tink(3200, 0.4, 0.2), tp, 0.08); place(sfx, tink(4100, 0.4, 0.2), tp + 0.07, 0.06)
# end
place(sfx, boom(2.6, 90, 28, 1.8), 73.55, 0.55)
place(sfx, shimmer(3.5, (880, 1318, 1760, 2637), 1.8), 73.8, 0.1)

S.finish(TOPIC, sfx, music, amb)
