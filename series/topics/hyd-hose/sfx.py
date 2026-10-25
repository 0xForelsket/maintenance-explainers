import sys, numpy as np
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / 'audio'))
import synth as S
from synth import place, filt, noise, boom, whoosh, tink, thud, clunk, tick, beep, shimmer, pad, ss

TOPIC = str(HERE)
DUR = 67.56
S.set_duration(DUR)
N, SR = S.N, S.SR
t = np.arange(N) / SR
rng = np.random.default_rng(55)
sfx, music, amb = S.bus(), S.bus(), S.bus()
cuts = [5.15, 7.2, 9.3, 13.6, 17.15, 19.4, 21.6, 23.6, 28.2, 31.4, 35.6, 38.35, 39.65, 41.0, 42.75, 45.0, 46.1, 47.1, 48.95, 51.3, 54.7, 56.85, 58.95, 60.45, 61.9, 64.25]

def pulse(a, b, c, d, x):
    return ss(a, b, x) * (1 - ss(c, d, x))

# ---- ambience: hydraulic power unit hum + oil rush; silent-ish once depressurised
press = 1 - ss(59.2, 60.4, t) * (1 - ss(63.6, 64.2, t))
drone = filt(np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1), 'band', [60, 500])
hum = np.sin(2 * np.pi * 100 * t) * 0.5 + np.sin(2 * np.pi * 740 * t) * 0.04
amb += drone * (0.12 + 0.2 * press)[:, None] + (hum * 0.035 * press)[:, None]
# carriage strokes in the machine shots
for n in range(40):
    for frac in (0.0, 0.5):
        tp = (n + frac) / 0.18 if (n + frac) / 0.18 < 23.6 else 23.6 + ((n + frac) - 23.6 * 0.18) / 0.32
        if (5.2 < tp < 13.6) or (23.6 < tp < 28.2) or (48.95 < tp < 51.3) or tp > 64.3:
            place(sfx, clunk(0.35), tp + 0.05, 0.14, 0.3)
            place(sfx, whoosh(0.6, 200, 900, 0.8, 1.0, (0.5, 0.5)), tp + 0.1, 0.06, 0.3)

# ---- jets: a hissing high-pressure jet (hook, spray, cardboard)
jet = pulse(0.0, 0.05, 5.0, 5.1, t) + pulse(39.7, 39.8, 40.8, 40.95, t) + pulse(51.6, 51.8, 54.5, 54.7, t)
hiss = filt(np.stack([noise(DUR), noise(DUR)], 1), 'band', [2500, 11000])
amb += hiss * (0.22 * jet)[:, None]
# cardboard getting hit: a dull spattering
spat = filt(np.stack([noise(DUR), noise(DUR)], 1), 'band', [300, 2000])
amb += spat * (0.12 * pulse(51.9, 52.1, 54.5, 54.7, t))[:, None]

# ---- music
place(music, pad(7.0, [55, 82.4, 110], 0.8, 2.0, 380), 0.0, 0.5)
place(music, pad(21.0, [55, 82.4, 110, 164.8], 1.5, 2.5, 800), 7.0, 0.4)
n = int((48.95 - 27.8) * SR); tt = np.arange(n) / SR
tens = np.zeros(n)
for f in (55, 58.3, 82.4, 87.3, 110, 116.5):
    tens += 2 * ((f * np.cumsum(1 + 0.05 * (tt / tt[-1]) ** 2) / SR + rng.random()) % 1.0) - 1
tens = filt(tens, 'low', 900) / 6 * np.minimum(1, tt / 1.2) * (0.5 + 0.5 * tt / tt[-1]) * np.minimum(1, (tt[-1] - tt) / 0.4)
place(music, tens, 27.8, 0.5)
for tp in np.arange(42.8, 48.8, 0.66):
    g = 0.22 + 0.3 * min(1, (tp - 42.8) / 4)
    place(music, thud(0.3, 62), tp, g); place(music, thud(0.25, 58), tp + 0.16, g * 0.5)
place(music, pad(15.5, [65.4, 98, 130.8, 196], 1.2, 2.0, 1200), 48.9, 0.34)
place(music, pad(4.5, [110, 138.6, 164.8, 220, 277.2, 329.6], 0.8, 2.8, 2200, 0.004), 63.6, 0.45)
place(music, shimmer(3.5, (880, 1108.7, 1318.5, 1760), 2.0), 63.8, 0.16)

# ---- hits / transitions
place(sfx, boom(2.0, 100, 30), 7.15, 0.6)
place(sfx, shimmer(3.0, (659, 988, 1318, 1976), 1.4), 7.4, 0.08)
place(sfx, whoosh(1.5, 600, 9000, 3.0, 1.2, (0.75, 0.25)), 9.2, 0.3, -0.2)
for tc in cuts:
    if tc in (7.2, 9.3): continue
    place(sfx, whoosh(0.4, 400, 2500, 1.0, 1.0, (0.7, 0.3)), tc - 0.28, 0.11, float(rng.uniform(-0.4, 0.4)))
# layers revealed
for tp in (13.9, 17.4, 19.6, 21.8):
    place(sfx, tink(1500, 0.5, 0.4), tp, 0.07)
place(sfx, clunk(0.4), 22.0, 0.3)
# pressure spikes: thumps synced to the sparkline peaks
for tp in (24.9, 25.9, 26.9, 27.8):
    place(sfx, thud(0.3, 70), tp, 0.4); place(sfx, boom(0.8, 90, 40, 1.0), tp, 0.15)
# fatigue: ticking counter
tk = 28.6
while tk < 31.3:
    place(sfx, tick(0.02, 3200), tk, 0.08); tk += 0.22 - 0.16 * (tk - 28.6) / 2.7
# rubbing: scraping
n = int(3.0 * SR); tt = np.arange(n) / SR
scrape = filt(noise(3.0), 'band', [800, 4000]) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * tt)) * np.minimum(1, tt / 0.2) * np.minimum(1, (tt[-1] - tt) / 0.3)
place(sfx, scrape / np.abs(scrape).max(), 31.5, 0.16, -0.2)
place(sfx, tink(2400, 0.6, 1.0), 34.62, 0.25); place(sfx, tink(5200, 0.4, 0.8), 34.64, 0.12)   # strand snaps
place(sfx, boom(1.4, 80, 35, 1.2), 28.2, 0.3)
# tight bend creak
n = int(1.6 * SR); tt = np.arange(n) / SR
creak = filt(np.sign(np.sin(2 * np.pi * np.cumsum(40 + 25 * np.sin(2 * np.pi * 1.3 * tt)) / SR)) * 0.5, 'band', [200, 1500]) * np.minimum(1, tt / 0.2) * np.minimum(1, (tt[-1] - tt) / 0.3)
place(sfx, creak, 36.0, 0.08)
# weep drips
for tp in np.arange(38.6, 39.6, 0.33):
    place(sfx, tink(1700, 0.25, 0.3), float(tp), 0.08)
for tp in np.arange(47.4, 48.8, 0.4):
    place(sfx, tink(1700, 0.25, 0.3), float(tp), 0.06)
# burst
place(sfx, boom(2.4, 110, 30, 2.0), 41.42, 0.75)
place(sfx, filt(noise(1.4), 'band', [500, 9000]) * np.exp(-np.arange(int(1.4 * SR)) / (0.35 * SR)), 41.42, 0.6)
place(sfx, clunk(0.5), 41.45, 0.4)
# fix: guard slides on, bend straightens, depressurise, lever + padlock, swap
place(sfx, whoosh(1.2, 300, 1500, 0.9, 1.0, (0.5, 0.5)), 55.0, 0.18)
place(sfx, whoosh(1.2, 300, 1200, 0.9, 1.0, (0.5, 0.5)), 57.1, 0.14)
n = int(1.3 * SR); tt = np.arange(n) / SR
place(sfx, filt(noise(1.3), 'band', [1500, 8000]) * np.exp(-tt / 0.5), 59.25, 0.3)
place(sfx, clunk(0.5), 60.6, 0.45)
place(sfx, tick(0.05, 2600), 61.3, 0.4); place(sfx, tink(2200, 0.4, 0.5), 61.33, 0.12)
place(sfx, shimmer(1.6, (1318, 1760, 2637), 0.8), 61.95, 0.1)

# ---- checklist
for tp in (43.6, 45.1, 46.2, 47.2):
    place(sfx, tink(1800, 0.35, 0.2), tp, 0.07)
for tp in (49.1, 51.4, 54.8, 59.0):
    place(sfx, tink(2400, 0.3, 0.2), tp, 0.06)
for tp in (51.1, 54.4, 58.7, 63.4):
    place(sfx, tink(3200, 0.4, 0.2), tp, 0.08); place(sfx, tink(4100, 0.4, 0.2), tp + 0.07, 0.06)
# end
place(sfx, boom(2.6, 90, 28, 1.8), 64.2, 0.55)
place(sfx, shimmer(3.0, (880, 1318, 1760, 2637), 1.8), 64.45, 0.1)

S.finish(TOPIC, sfx, music, amb)
