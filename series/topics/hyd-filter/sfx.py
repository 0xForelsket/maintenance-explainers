import sys, numpy as np
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / 'audio'))
import synth as S
from synth import place, filt, noise, boom, whoosh, tink, thud, clunk, tick, beep, shimmer, pad, ss

TOPIC = str(HERE)
DUR = 71.17
S.set_duration(DUR)
N, SR = S.N, S.SR
t = np.arange(N) / SR
rng = np.random.default_rng(33)
sfx, music, amb = S.bus(), S.bus(), S.bus()
cuts = [3.95, 6.45, 12.4, 15.45, 21.0, 25.5, 29.2, 33.4, 37.6, 40.2, 43.0, 44.6, 46.4, 49.5, 51.5, 54.6, 59.8, 61.75, 64.45, 67.5]

def pulse(a, b, c, d, x):
    return ss(a, b, x) * (1 - ss(c, d, x))

# ---- power unit: motor hum + gear-pump whine, spins down for the element change and back up
run = 1 - pulse(54.7, 55.4, 58.9, 59.6, t)
macro = pulse(43.0, 43.05, 46.35, 46.4, t) + pulse(51.5, 51.55, 54.55, 54.6, t) + pulse(64.45, 64.5, 67.45, 67.5, t)
speed = 0.25 + 0.75 * run
ph = 2 * np.pi * np.cumsum(speed) / SR
hum = (np.sin(ph * 100) * 0.5 + np.sin(ph * 200) * 0.25 + np.sin(ph * 300) * 0.12)
whine = np.sin(ph * 740) * 0.5 + np.sin(ph * 1480) * 0.18
noisy = pulse(49.5, 49.7, 51.3, 51.5, t)
lvl = (0.55 + 0.45 * run) * (1 - 0.7 * macro)
amb += (hum * 0.05 * lvl)[:, None] + (whine * (0.012 + 0.03 * noisy) * run * (1 - 0.8 * macro))[:, None]
flow = filt(np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1), 'band', [70, 700])
mod = 0.75 + 0.25 * np.sin(2 * np.pi * 0.31 * t)
amb += flow * (0.3 * run * mod * (1 - 0.6 * macro))[:, None]
# cavitation rattle on the noisy pump
crack = filt(np.stack([noise(DUR), noise(DUR)], 1), 'band', [900, 5000]) * (rng.random((N, 1)) > 0.985)
amb += crack * (1.3 * noisy)[:, None]
for tp in np.arange(49.6, 51.4, 0.19):
    place(sfx, thud(0.12, 140), float(tp), 0.18, -0.3)

# ---- hook: glints of dirt in the valve
for tp in np.sort(rng.uniform(0.5, 3.8, 14)):
    place(sfx, tink(float(rng.uniform(3500, 6500)), 0.25, 0.5), float(tp), float(rng.uniform(0.02, 0.05)), float(rng.uniform(-0.6, 0.6)))
place(music, pad(5.0, [55, 82.4, 110], 0.8, 2.0, 380), 0.0, 0.5)

# ---- actuators clunking in the wide shot
for k, phs in enumerate((0.0, 0.33, 0.66)):
    for n in range(10):
        for frac in (0.05, 0.55):
            tp = (n + frac - phs) / 0.32
            if 6.6 < tp < 12.3:
                place(sfx, clunk(0.35), tp + 0.3, 0.16, -0.3 + 0.3 * k)

# ---- music
place(music, pad(31.5, [55, 82.4, 110, 164.8], 1.5, 2.5, 800), 6.2, 0.4)
n = int((54.6 - 37.4) * SR); tt = np.arange(n) / SR
tens = np.zeros(n)
for f in (55, 58.3, 82.4, 87.3, 110, 116.5):
    tens += 2 * ((f * np.cumsum(1 + 0.05 * (tt / tt[-1]) ** 2) / SR + rng.random()) % 1.0) - 1
tens = filt(tens, 'low', 900) / 6 * np.minimum(1, tt / 1.2) * (0.5 + 0.5 * tt / tt[-1]) * np.minimum(1, (tt[-1] - tt) / 0.4)
place(music, tens, 37.4, 0.5)
for tp in np.arange(46.5, 54.4, 0.66):
    g = 0.22 + 0.3 * min(1, (tp - 46.5) / 4)
    place(music, thud(0.3, 62), tp, g); place(music, thud(0.25, 58), tp + 0.16, g * 0.5)
for tp in np.arange(47.6, 49.4, 0.8):
    place(sfx, beep(880), tp, 0.05, 0.3); place(sfx, beep(660), tp + 0.2, 0.05, 0.3)
place(music, pad(13.5, [65.4, 98, 130.8, 196], 1.2, 2.0, 1200), 54.6, 0.34)
place(music, pad(5.0, [110, 138.6, 164.8, 220, 277.2, 329.6], 0.8, 2.8, 2200, 0.004), 66.9, 0.45)
place(music, shimmer(4.0, (880, 1108.7, 1318.5, 1760), 2.0), 67.1, 0.16)

# ---- hits / transitions
place(sfx, boom(2.0, 100, 30), 3.9, 0.6)
place(sfx, shimmer(3.0, (659, 988, 1318, 1976), 1.4), 4.1, 0.08)
place(sfx, whoosh(1.5, 600, 9000, 3.0, 1.2, (0.75, 0.25)), 6.4, 0.3, -0.2)
for tc in cuts:
    if tc in (3.95, 6.45): continue
    place(sfx, whoosh(0.45, 400, 2500, 1.0, 1.0, (0.7, 0.3)), tc - 0.3, 0.13, float(rng.uniform(-0.4, 0.4)))
# slice reveal through the element
place(sfx, whoosh(1.6, 300, 5000, 2.0, 1.0, (0.6, 0.4)), 15.8, 0.22)
place(sfx, shimmer(2.0, (1318, 1760, 2637), 1.0), 17.0, 0.05)
# time-lapse: ticks speeding up, rising tone
tk = 33.6
while tk < 37.5:
    place(sfx, tick(0.03, 3000), tk, 0.1); tk += 0.32 - 0.24 * (tk - 33.6) / 3.9
n = int(4.0 * SR); tt = np.arange(n) / SR
rise = np.sin(2 * np.pi * np.cumsum(300 + 500 * (tt / tt[-1]) ** 2) / SR) * np.minimum(1, tt / 0.4) * np.minimum(1, (tt[-1] - tt) / 0.2)
place(sfx, rise, 33.6, 0.025)
# bypass cracks open: spring + metallic knock + surge
place(sfx, boom(1.4, 80, 35, 1.2), 37.6, 0.35)
place(sfx, clunk(0.5), 37.95, 0.45); place(sfx, tink(1500, 1.2, 0.5), 37.95, 0.14)
place(sfx, whoosh(2.4, 200, 1600, 0.9, 1.0, (0.3, 0.7)), 38.1, 0.3)
# pump wear: grinding + crackle
n = int(1.6 * SR)
grind = filt(noise(1.6), 'band', [400, 3000]) * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * np.arange(n) / SR)) * np.minimum(1, np.arange(n) / (0.1 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.1 * SR))
place(sfx, grind / np.abs(grind).max(), 43.0, 0.18, 0.1)
for tp in np.sort(rng.uniform(43.1, 44.5, 22)):
    place(sfx, tick(0.015, float(rng.uniform(4000, 7000))), float(tp), 0.12, float(rng.uniform(-0.5, 0.5)))
# valve jams: slide, hard stop, solenoid buzzing against it
place(sfx, whoosh(0.4, 500, 1500, 1.0, 1.0, (0.5, 0.5)), 44.7, 0.12)
place(sfx, clunk(0.5), 45.05, 0.5); place(sfx, tink(1100, 0.8, 0.5), 45.05, 0.15)
n = int(1.25 * SR); tt = np.arange(n) / SR
buzz = (np.sign(np.sin(2 * np.pi * 100 * tt)) * 0.5 + filt(noise(1.25), 'band', [2000, 6000]) * 0.3) * np.minimum(1, tt / 0.05) * np.minimum(1, (tt[-1] - tt) / 0.1)
place(sfx, filt(buzz, 'low', 3000), 45.1, 0.05)
# sample bottle clinks
place(sfx, tink(2900, 0.6, 0.6), 51.65, 0.12); place(sfx, tink(3900, 0.5, 0.5), 51.7, 0.06)
place(sfx, tink(2900, 0.6, 0.6), 64.6, 0.12); place(sfx, tink(3900, 0.5, 0.5), 64.65, 0.06)
# element change: bolts, lid, element out/in, lid back
for k in range(8):
    place(sfx, tick(0.03, 3600), 55.15 + k * 0.06, 0.1)
place(sfx, whoosh(0.8, 300, 1400, 0.9, 1.0, (0.5, 0.5)), 55.35, 0.18)
place(sfx, whoosh(1.0, 250, 1600, 0.9, 1.0, (0.5, 0.5)), 56.0, 0.22, 0.2)
place(sfx, whoosh(1.0, 1600, 250, 0.9, 1.0, (0.5, 0.5)), 57.1, 0.2, 0.2)
place(sfx, thud(0.3, 120), 58.05, 0.35)
place(sfx, clunk(0.45), 58.85, 0.4)
for k in range(8):
    place(sfx, tick(0.03, 3600), 58.95 + k * 0.06, 0.1)
# never run in the red: alarm pips
for tp in np.arange(59.95, 61.6, 0.42):
    place(sfx, beep(990, 0.12), tp, 0.05, 0.2)
place(sfx, shimmer(2.0, (1318, 1760, 2637), 1.0), 62.0, 0.07)

# ---- checklist
for tp in (48.3, 49.9, 51.0):
    place(sfx, tink(1800, 0.35, 0.2), tp, 0.07)
for tp in (54.9, 60.0, 61.9, 64.6):
    place(sfx, tink(2400, 0.3, 0.2), tp, 0.06)
for tp in (59.5, 61.5, 64.2, 66.8):
    place(sfx, tink(3200, 0.4, 0.2), tp, 0.08); place(sfx, tink(4100, 0.4, 0.2), tp + 0.07, 0.06)
# end
place(sfx, boom(2.6, 90, 28, 1.8), 67.45, 0.55)
place(sfx, shimmer(3.5, (880, 1318, 1760, 2637), 1.8), 67.7, 0.1)

S.finish(TOPIC, sfx, music, amb)
