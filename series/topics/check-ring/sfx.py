import sys, numpy as np
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / 'audio'))
import synth as S
from synth import place, filt, noise, boom, whoosh, tink, thud, clunk, tick, beep, shimmer, pad, ss

TOPIC = str(HERE)
DUR = 71.16
S.set_duration(DUR)
N, SR = S.N, S.SR
t = np.arange(N) / SR
rng = np.random.default_rng(21)
sfx, music, amb = S.bus(), S.bus(), S.bus()
cuts = [5.15, 6.95, 11.4, 15.9, 19.6, 22.95, 27.0, 29.5, 32.9, 37.7, 43.0, 46.3, 52.9, 55.1, 62.85, 67.4]

def pulse(a, b, c, d, x):
    return ss(a, b, x) * (1 - ss(c, d, x))

# ---- machine ambience: hydraulic pump drone + mains hum from the heater bands
drone = filt(np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1), 'band', [60, 420])
hum = np.sin(2 * np.pi * 100 * t) * 0.6 + np.sin(2 * np.pi * 200 * t) * 0.25 + np.sin(2 * np.pi * 300 * t) * 0.1
amb += drone * 0.32 + (hum * 0.035)[:, None]

# ---- screw turning (recovery): grinding, granular rumble with a rotation wobble
rot = (0.6 * (1 - ss(6.8, 7.0, t)) + pulse(6.9, 7.3, 19.2, 19.5, t) + pulse(32.9, 33.2, 37.4, 37.7, t) + pulse(43.0, 43.2, 52.6, 52.9, t))
grind = filt(np.stack([noise(DUR), noise(DUR)], 1), 'band', [220, 1400])
wob = 0.7 + 0.3 * np.sin(2 * np.pi * 0.42 * t)
amb += grind * (0.16 * rot * wob)[:, None]
# pellets rattling into the throat
for tp in np.sort(rng.uniform(7.6, 11.3, 60)):
    place(sfx, tick(0.02, float(rng.uniform(2200, 4200))), float(tp), float(rng.uniform(0.02, 0.05)), float(rng.uniform(-0.7, -0.1)))

# ---- injection surges (hydraulic push) and mould fill hiss
def surge(sec, f0=70, f1=140):
    n = int(sec * SR); tt = np.arange(n) / SR
    x = filt(noise(sec, 'pink'), 'band', [f0, f1 * 4]) * np.minimum(1, tt / 0.15) * np.minimum(1, (tt[-1] - tt) / 0.4)
    return x / (np.abs(x).max() + 1e-9)
place(sfx, surge(2.0), 21.0, 0.55, 0.2)                 # S6 real-time push
place(sfx, surge(2.2, 60, 110), 27.0, 0.4, 0.3)          # S8 melt into the mould
place(sfx, filt(noise(2.4), 'band', [1200, 6000]) * np.minimum(1, np.arange(int(2.4 * SR)) / (0.3 * SR)) * np.exp(-np.arange(int(2.4 * SR)) / (1.6 * SR)), 27.1, 0.12, 0.5)
place(sfx, surge(4.8), 38.0, 0.5, 0.2)                   # worn-ring injection
# quick shots 43-52.9: one push per cycle
for k in range(6):
    tp = 43.0 + k * 1.65 + 0.5 * 1.65
    if tp < 52.6:
        place(sfx, surge(0.7), tp, 0.38, 0.25); place(sfx, thud(0.25, 70), tp, 0.25)

# ---- the ring slam (slow-motion replay in S7) — the hero sound
slam = 22.95 + (21.0 - 20.85) / 0.32
place(sfx, whoosh(0.9, 200, 1800, 1.2, 1.4, (0.85, 0.15)), slam - 0.8, 0.25)
place(sfx, clunk(0.6), slam, 0.7)
place(sfx, tink(1400, 1.6, 0.6), slam, 0.22)
place(sfx, boom(2.4, 85, 28, 1.6), slam, 0.55)
place(sfx, clunk(0.4), 21.05, 0.3, 0.1)                   # the real-time close in S6
# a gentle tick when the ring slides open in S5
place(sfx, tink(2600, 0.3, 0.3), 16.4, 0.08)

# ---- music
place(music, pad(7.2, [55, 82.4, 110], 1.0, 2.0, 420), 0.0, 0.5)
place(music, pad(27.0, [55, 82.4, 110, 164.8], 1.5, 2.5, 800), 6.6, 0.38)
n = int((52.9 - 37.4) * SR); tt = np.arange(n) / SR
tens = np.zeros(n)
for f in (55, 58.3, 82.4, 87.3, 110, 116.5):
    tens += 2 * ((f * np.cumsum(1 + 0.05 * (tt / tt[-1]) ** 2) / SR + rng.random()) % 1.0) - 1
tens = filt(tens, 'low', 900) / 6 * np.minimum(1, tt / 1.2) * (0.5 + 0.5 * tt / tt[-1]) * np.minimum(1, (tt[-1] - tt) / 0.4)
place(music, tens, 37.4, 0.5)
for tp in np.arange(46.4, 52.8, 0.66):
    g = 0.25 + 0.3 * min(1, (tp - 46.4) / 4)
    place(music, thud(0.3, 62), tp, g); place(music, thud(0.25, 58), tp + 0.16, g * 0.5)
for tp in np.arange(50.0, 52.6, 0.8):
    place(sfx, beep(880), tp, 0.05, 0.3); place(sfx, beep(660), tp + 0.2, 0.05, 0.3)
place(music, pad(14.5, [65.4, 98, 130.8, 196], 1.2, 2.0, 1200), 52.9, 0.34)
place(music, pad(5.0, [110, 138.6, 164.8, 220, 277.2, 329.6], 0.8, 2.8, 2200, 0.004), 66.6, 0.45)
place(music, shimmer(4.0, (880, 1108.7, 1318.5, 1760), 2.0), 66.8, 0.16)

# ---- hits / transitions
place(sfx, boom(2.0, 100, 30), 5.1, 0.6)
place(sfx, shimmer(3.0, (659, 988, 1318, 1976), 1.4), 5.3, 0.08)
place(sfx, whoosh(1.5, 600, 9000, 3.0, 1.2, (0.75, 0.25)), 6.9, 0.3, -0.2)
for tc in cuts:
    if tc in (5.15, 6.95, 22.95): continue
    place(sfx, whoosh(0.45, 400, 2500, 1.0, 1.0, (0.7, 0.3)), tc - 0.3, 0.13, float(rng.uniform(-0.4, 0.4)))
place(sfx, boom(1.4, 80, 35, 1.2), 37.7, 0.35)
# backflow: a low, wrong-sounding groan while melt slips back
n = int(4.0 * SR); tt = np.arange(n) / SR
groan = np.sin(2 * np.pi * np.cumsum(140 - 50 * tt / tt[-1]) / SR) * np.minimum(1, tt / 0.6) * np.minimum(1, (tt[-1] - tt) / 0.5)
place(sfx, filt(groan, 'low', 600), 38.4, 0.06)

# ---- creep test: clock ticks while pressure holds, rising tone as the screw creeps
for k, tp in enumerate(np.arange(55.6, 62.4, 0.5)):
    place(sfx, tick(0.04, 3000 if k % 2 == 0 else 2400), float(tp), 0.12)
n = int(3.8 * SR); tt = np.arange(n) / SR
creep = np.sin(2 * np.pi * np.cumsum(420 + 260 * tt / tt[-1]) / SR) * np.minimum(1, tt / 0.6) * np.minimum(1, (tt[-1] - tt) / 0.3)
place(sfx, creep, 58.7, 0.03)
place(sfx, surge(4.0, 55, 100), 58.6, 0.25, 0.2)

# ---- replace: nozzle off, screw out, swap, screw back
place(sfx, clunk(0.5), 62.95, 0.4, 0.4)
place(sfx, whoosh(1.4, 250, 1600, 0.9, 1.0, (0.5, 0.5)), 63.3, 0.25, 0.3)
place(sfx, clunk(0.45), 64.6, 0.35, 0.3)
for tp in (65.05, 65.55):
    place(sfx, tink(2200, 0.5, 0.6), tp, 0.14); place(sfx, tink(3100, 0.4, 0.4), tp + 0.05, 0.08)
place(sfx, whoosh(1.0, 1600, 250, 0.9, 1.0, (0.5, 0.5)), 66.0, 0.2, 0.3)
place(sfx, clunk(0.5), 67.0, 0.4, 0.3)

# ---- checklist ticks
for tp in (47.5, 50.05, 50.95):
    place(sfx, tink(1800, 0.35, 0.2), tp, 0.07)
for tp in (53.17, 55.18, 62.86):
    place(sfx, tink(2400, 0.3, 0.2), tp, 0.06)
for tp in (54.9, 62.3, 66.5):
    place(sfx, tink(3200, 0.4, 0.2), tp, 0.08); place(sfx, tink(4100, 0.4, 0.2), tp + 0.07, 0.06)
# end
place(sfx, boom(2.6, 90, 28, 1.8), 67.35, 0.55)
place(sfx, shimmer(3.5, (880, 1318, 1760, 2637), 1.8), 67.6, 0.1)

S.finish(TOPIC, sfx, music, amb)
