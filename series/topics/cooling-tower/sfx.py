import sys, json, numpy as np
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / 'audio'))
import synth as S
from synth import place, filt, noise, boom, whoosh, tink, thud, clunk, tick, beep, shimmer, pad, ss

TOPIC = str(HERE)
DUR = 71.6
S.set_duration(DUR)
N, SR = S.N, S.SR
t = np.arange(N) / SR
rng = np.random.default_rng(11)
sfx, music, amb = S.bus(), S.bus(), S.bus()
shots = [0, 4.55, 6.65, 9.85, 13.85, 15.95, 17.9, 19.85, 24.4, 29.2, 34.35, 37.7, 43.1, 48.3, 54.65, 58.05, 61.0, 65.35, 68.05]
mould = lambda x: ((x < 4.55) | ((x >= 37.7) & (x < 48.3)) | ((x >= 65.35) & (x < 68.05))).astype(float)

# ---- ambience
pinkL, pinkR = noise(DUR, 'pink'), noise(DUR, 'pink')
rainS = np.stack([filt(pinkL, 'band', [900, 6500]), filt(pinkR, 'band', [900, 6500])], 1)
brown = np.stack([noise(DUR, 'brown'), noise(DUR, 'brown')], 1)
rumble = filt(brown, 'low', 300)
# fan: low drone with blade-pass flutter
fanF = 46.0
fan = (np.sin(2 * np.pi * fanF * t) + 0.5 * np.sin(2 * np.pi * 2 * fanF * t + 1)) * (0.75 + 0.25 * np.sin(2 * np.pi * 6 * t))
fan = filt(fan, 'low', 400)
m = mould(t)
tower = 1 - m
amb += rainS * (0.55 * tower)[:, None]
amb += rumble * (0.35 * tower + 0.5 * m)[:, None]
amb += np.stack([fan, fan], 1) * (0.25 * tower)[:, None]
# mould: machine hum + flowing water in the channel
hum = filt(np.sin(2 * np.pi * 100 * t) + 0.4 * np.sin(2 * np.pi * 200 * t) + 0.2 * np.sin(2 * np.pi * 300 * t), 'low', 600)
flow = filt(np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1), 'band', [200, 1400])
amb += np.stack([hum, hum], 1) * (0.06 * m)[:, None] + flow * (0.35 * m)[:, None]

# ---- music
place(music, pad(10.0, [55, 82.4, 110], 1.2, 2.0, 420), 0.0, 0.5)
place(music, pad(19.0, [55, 82.4, 110, 164.8], 1.5, 2.5, 800), 6.4, 0.42)
place(music, pad(14.0, [49, 73.4, 98, 146.8], 1.5, 2.0, 650), 24.2, 0.45)
# tension from scale/heat to warning
n = int((54.8 - 37.5) * SR); tt = np.arange(n) / SR
tens = np.zeros(n)
for f in (55, 58.3, 82.4, 87.3, 110, 116.5):
    tens += 2 * ((f * np.cumsum(1 + 0.05 * (tt / tt[-1]) ** 2) / SR + rng.random()) % 1.0) - 1
tens = filt(tens, 'low', 900) / 6 * np.minimum(1, tt / 1.5) * (0.5 + 0.5 * tt / tt[-1]) * np.minimum(1, (tt[-1] - tt) / 0.4)
place(music, tens, 37.5, 0.5)
for tp in np.arange(43.4, 54.4, 0.66):
    g = 0.22 + 0.4 * min(1, (tp - 43.4) / 6)
    place(music, thud(0.3, 62), tp, g); place(music, thud(0.25, 58), tp + 0.16, g * 0.5)
for tp in np.arange(49.9, 54.3, 0.8):
    place(sfx, beep(880), tp, 0.06, 0.3); place(sfx, beep(660), tp + 0.2, 0.06, 0.3)
# the fix: steady, hopeful bed + resolve at "channels clear"
place(music, pad(11.5, [65.4, 98, 130.8, 196], 1.2, 2.0, 1200), 54.6, 0.38)
place(music, pad(7.0, [110, 138.6, 164.8, 220, 277.2, 329.6], 0.8, 3.0, 2200, 0.004), 66.4, 0.48)
place(music, shimmer(5.0, (880, 1108.7, 1318.5, 1760), 2.0), 66.6, 0.18)
place(music, pad(4.5, [55, 82.4, 110, 164.8, 220], 1.0, 2.4, 900), 67.4, 0.42)

# ---- hits
place(sfx, boom(2.0, 100, 30), 4.5, 0.65)
place(sfx, whoosh(1.2, 2500, 400, 1.2, 0.8, (0.2, 0.8)), 4.55, 0.18)
place(sfx, shimmer(3.0, (659, 988, 1318, 1976), 1.4), 4.8, 0.08)
place(sfx, whoosh(1.9, 600, 9000, 3.0, 1.2, (0.75, 0.25)), 6.8, 0.38, -0.2)
place(sfx, tink(2600, 1.6, 0.2) * np.linspace(1, 0.5, int(1.6 * SR)), 8.55, 0.12, 0.25)
for tc in shots[1:]:
    if tc in (4.55, 6.65): continue
    place(sfx, whoosh(0.45, 400, 2500, 1.0, 1.0, (0.7, 0.3)), tc - 0.3, 0.14, float(rng.uniform(-0.4, 0.4)))
# spray hiss swell when we first see the nozzles
place(amb, whoosh(3.5, 1500, 5000, 0.8, 1.0, (0.3, 0.7)) * 0.6, 10.0, 0.25)
# time-lapse ticks + riser
for k in range(12):
    place(sfx, tick(), 34.5 + k * (2.9 / 11), 0.26)
place(sfx, whoosh(3.0, 200, 2500, 2.0, 1.4, (0.95, 0.05)), 34.4, 0.16)
# scale crystallising: fine granular crackle
cr = np.zeros(int(8.0 * SR))
for _ in range(900):
    i = int(rng.random() ** 0.8 * (len(cr) - 2000))
    cr[i:i + 600] += tick(600 / SR, rng.uniform(4000, 9000)) * rng.uniform(0.2, 1.0)
place(sfx, cr / np.abs(cr).max(), 38.8, 0.12)
place(sfx, boom(1.6, 80, 35, 1.2), 43.15, 0.4)
# bleed valve + float valve + dosing pulses + filter + descale fizz
place(sfx, clunk(0.5), 54.9, 0.5, -0.3)
place(sfx, clunk(0.5), 57.65, 0.35, -0.3)
place(amb, filt(noise(3.0, 'pink'), 'band', [600, 3000]) * np.hanning(int(3.0 * SR)) * 0.8, 55.0, 0.35, -0.3)
place(sfx, tink(1500, 0.4, 0.4), 55.45, 0.12, -0.2)
for k in range(8):
    place(sfx, thud(0.18, 180), 58.4 + k * 0.33, 0.18, -0.4)
    place(sfx, tick(0.04, 2400), 58.4 + k * 0.33, 0.1, -0.4)
place(amb, filt(noise(3.6, 'pink'), 'band', [300, 1800]) * np.hanning(int(3.6 * SR)), 61.3, 0.35, 0.4)
fz = filt(noise(2.2), 'band', [2500, 9000]) * np.hanning(int(2.2 * SR)) * (0.6 + 0.4 * np.sign(np.sin(np.arange(int(2.2 * SR)) / SR * 2 * np.pi * 31)))
place(sfx, fz / np.abs(fz).max(), 65.6, 0.14)
# checklist ticks
for tp in (49.9, 52.7):
    place(sfx, tink(1800, 0.35, 0.2), tp, 0.08)
for tp in (54.95, 58.1, 61.14, 65.6):
    place(sfx, tink(2400, 0.3, 0.2), tp, 0.07)
for tp in (57.9, 60.9, 64.9, 67.3):
    place(sfx, tink(3200, 0.4, 0.2), tp, 0.09); place(sfx, tink(4100, 0.4, 0.2), tp + 0.07, 0.07)
# end
place(sfx, boom(2.6, 90, 28, 1.8), 68.0, 0.55)
place(sfx, shimmer(3.5, (880, 1318, 1760, 2637), 1.8), 68.3, 0.1)
place(sfx, whoosh(1.6, 3000, 300, 1.0, 0.8, (0.15, 0.85)), 67.9, 0.16)

S.finish(TOPIC, sfx, music, amb)
