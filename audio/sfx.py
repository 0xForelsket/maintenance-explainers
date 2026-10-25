"""Sound design + mix for the Y-strainer video. Everything is synthesised (no samples)."""
import json, numpy as np, soundfile as sf, pyloudnorm as pyln
from scipy import signal

SR = 48000
DUR = 50.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
t_all = np.arange(N) / SR


def bus():
    return np.zeros((N, 2))


def place(b, x, t0, gain=1.0, pan=0.0):
    """add mono or stereo clip x at time t0"""
    i = int(t0 * SR)
    if i >= N:
        return
    if x.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        x = np.stack([x * l * 1.414, x * r * 1.414], 1)
    n = min(len(x), N - i)
    b[i:i + n] += gain * x[:n]


def sos(kind, f, order=2):
    return signal.butter(order, f, kind, fs=SR, output='sos')


def filt(x, kind, f, order=2):
    return signal.sosfilt(sos(kind, f, order), x, axis=0)


def env_adsr(n, a, d, s_level, r, total):
    e = np.zeros(n)
    A, D, R = int(a * SR), int(d * SR), int(r * SR)
    S = max(0, int(total * SR) - A - D)
    seg = np.concatenate([np.linspace(0, 1, A, endpoint=False), np.linspace(1, s_level, D, endpoint=False), np.full(S, s_level), np.linspace(s_level, 0, R)])
    e[:min(n, len(seg))] = seg[:n]
    return e


def svf_sweep(x, f0, f1, q=2.0, curve=1.0):
    """state-variable band-pass with exponential sweep f0->f1"""
    n = len(x)
    u = np.linspace(0, 1, n) ** curve
    fc = f0 * (f1 / f0) ** u
    g = np.tan(np.pi * np.minimum(fc, SR * 0.45) / SR)
    k = 1.0 / q
    ic1 = ic2 = 0.0
    out = np.zeros(n)
    for i in range(n):
        gi = g[i]
        a1 = 1 / (1 + gi * (gi + k))
        v3 = x[i] - ic2
        v1 = a1 * ic1 + gi * a1 * v3
        v2 = ic2 + gi * v1
        ic1 = 2 * v1 - ic1
        ic2 = 2 * v2 - ic2
        out[i] = v1
    return out


def noise(sec, color='white'):
    n = int(sec * SR)
    w = rng.standard_normal(n)
    if color == 'brown':
        w = np.cumsum(w)
        w = filt(w, 'high', 20)
        w /= np.abs(w).max() + 1e-9
    elif color == 'pink':
        b, a = [0.049922035, -0.095993537, 0.050612699, -0.004408786], [1, -2.494956002, 2.017265875, -0.522189400]
        w = signal.lfilter(b, a, w)
        w /= np.abs(w).max() + 1e-9
    return w


# ---------------------------------------------------------------- elements
def boom(sec=2.2, f0=95, f1=32, drive=1.6):
    n = int(sec * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 7)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 2.2)
    x = np.tanh(x * drive) / np.tanh(drive)
    click = filt(noise(0.03), 'band', [80, 900]) * np.exp(-np.arange(int(0.03 * SR)) / (0.006 * SR))
    x[:len(click)] += 0.6 * click
    return x


def whoosh(sec=0.6, f0=300, f1=4000, q=1.4, curve=1.0, shape=(0.7, 0.3)):
    n = int(sec * SR)
    x = svf_sweep(noise(sec, 'pink'), f0, f1, q, curve)
    a, r = shape
    e = np.concatenate([np.linspace(0, 1, int(n * a)) ** 2, np.linspace(1, 0, n - int(n * a)) ** 1.5])
    return x * e / (np.abs(x).max() + 1e-9)


def tink(base=1900, sec=0.6, bright=1.0):
    n = int(sec * SR); t = np.arange(n) / SR
    ratios = [1.0, 2.32, 3.71, 5.04, 6.63]
    x = sum(np.sin(2 * np.pi * base * r * t + rng.random() * 6) * np.exp(-t * (7 + 9 * r)) * (0.9 / (1 + 0.6 * i)) for i, r in enumerate(ratios))
    clickn = int(0.006 * SR)
    x[:clickn] += bright * filt(noise(0.006), 'high', 3000) * np.linspace(1, 0, clickn)
    return x / np.abs(x).max()


def thud(sec=0.35, f=110):
    n = int(sec * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (f * (1 + 0.8 * np.exp(-t * 40))) * t) * np.exp(-t * 14)
    x += 0.5 * filt(noise(sec), 'low', 900) * np.exp(-t * 30)
    return x / np.abs(x).max()


def clunk(sec=0.45):
    x = thud(sec, 140) * 0.8
    m = tink(820, sec, 0.4) * 0.35
    k = filt(noise(sec), 'band', [400, 2500]) * np.exp(-np.arange(int(sec * SR)) / (0.012 * SR))
    return x + m + 0.5 * k


def tick(sec=0.05, f=3200):
    n = int(sec * SR)
    x = filt(noise(sec), 'band', [f * 0.6, f * 1.4]) * np.exp(-np.arange(n) / (0.004 * SR))
    return x / np.abs(x).max()


def beep(f=880, sec=0.16):
    n = int(sec * SR); t = np.arange(n) / SR
    e = np.minimum(1, t / 0.01) * np.minimum(1, (sec - t) / 0.03)
    return (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)) * e


def shimmer(sec=3.0, freqs=(880, 1320, 1760, 2640), decay=1.2):
    n = int(sec * SR); t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * t + rng.random() * 6) * (0.6 + 0.4 * np.sin(2 * np.pi * (0.7 + i * 0.37) * t)) for i, f in enumerate(freqs))
    e = (1 - np.exp(-t * 12)) * np.exp(-t / decay)
    return x * e / len(freqs)


def pad(sec, freqs, attack=1.5, release=2.0, cutoff=1200, detune=0.006):
    n = int(sec * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for f in freqs:
        for d in (-detune, 0, detune):
            ph = (f * (1 + d) * t + rng.random()) % 1.0
            x += 2 * ph - 1
    x = filt(x, 'low', cutoff, 2)
    e = np.minimum(1, t / attack) * np.minimum(1, (sec - t) / release)
    return x * e / (len(freqs) * 3)


def reverb_ir(sec=2.4, decay=1.6, seed=3):
    r = np.random.default_rng(seed)
    n = int(sec * SR)
    ir = r.standard_normal((n, 2)) * np.exp(-np.arange(n) / (SR * decay / 6.9))[:, None]
    ir = filt(ir, 'low', 6000)
    ir[:int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))[:, None]
    return ir / np.sqrt((ir ** 2).sum(0))


def ss(a, b, x):
    u = np.clip((x - a) / (b - a), 0, 1)
    return u * u * (3 - 2 * u)


# ---------------------------------------------------------------- timeline (mirrors web/timeline.js)
def clog_at(t):
    c = np.zeros_like(t)
    c = np.where(t > 19.6, 0.12 * np.clip((t - 19.6) / (25.8 - 19.6), 0, 1), c)
    c = np.where(t > 25.8, 0.12 + 0.6 * ss(25.8, 28.4, t), c)
    c = np.where(t > 28.4, 0.72 + 0.28 * ss(28.4, 34.0, t), c)
    c = np.where(t > 38.75, 1 - 0.96 * ss(38.75, 42.2, t), c)
    return c


valve = ss(38.3, 38.85, t_all) * (1 - ss(44.0, 44.6, t_all))
flow = 1 - 0.78 * clog_at(t_all) ** 1.25

sfx, music, amb = bus(), bus(), bus()

# ---- ambience: water in pipe
brown = np.stack([noise(DUR, 'brown'), noise(DUR, 'brown')], 1)
hiss = np.stack([noise(DUR, 'pink'), noise(DUR, 'pink')], 1)
rumble = filt(brown, 'low', 380) * 1.0
wash = filt(hiss, 'band', [700, 3800]) * 0.35
lfo = 1 + 0.25 * np.sin(2 * np.pi * 0.31 * t_all) * np.sin(2 * np.pi * 0.13 * t_all + 1)
inside = (ss(0, 0.8, t_all) * (1 - ss(4.3, 4.6, t_all)))
muffled = ss(4.5, 4.7, t_all) * (1 - ss(9.2, 10.6, t_all))
section = ss(9.2, 10.8, t_all)
flow_lvl = flow * section
amb += (rumble * (0.9 * inside + 0.18 * muffled + 0.32 * flow_lvl)[:, None] + wash * (0.9 * inside + 0.02 * muffled + 0.55 * flow_lvl)[:, None]) * lfo[:, None]
# downstream starving: thin, hollow flow
amb *= (1 - 0.35 * ss(33.4, 34.5, t_all) * (1 - ss(36.8, 37.0, t_all)))[:, None]
# blowdown spray (high-pressure hiss + roar)
spray = filt(np.stack([noise(DUR, 'white'), noise(DUR, 'white')], 1), 'band', [1200, 9000]) * 0.5 + filt(brown, 'band', [60, 500]) * 0.9
spray_env = (ss(38.55, 39.1, t_all) * (1 - ss(43.4, 44.4, t_all))) * (0.55 + 0.45 * np.exp(-np.maximum(0, t_all - 39.05) / 1.6))
amb += spray * spray_env[:, None] * 0.55

# ---- music: drone + tension + resolve
def drone_layer(t0, t1, freqs, gain, cutoff=600, attack=2.0, release=2.5):
    x = pad(t1 - t0, freqs, attack, release, cutoff)
    place(music, x, t0, gain)

drone_layer(0.0, 9.0, [55, 82.4, 110], 0.55, 420, 1.2, 1.5)
drone_layer(4.5, 19.5, [55, 82.4, 110, 164.8], 0.42, 700, 1.0, 2.0)
drone_layer(19.0, 28.6, [49, 73.4, 98, 146.8], 0.45, 650, 1.5, 1.5)
# tension: rising detuned cluster 28.4 -> 38.9
n = int((39.2 - 28.3) * SR); tt = np.arange(n) / SR
rise = 1 + 0.06 * (tt / tt[-1]) ** 2
tens = np.zeros(n)
for f in (55, 58.3, 82.4, 87.3, 110, 116.5):
    tens += 2 * ((f * np.cumsum(rise) / SR + rng.random()) % 1.0) - 1
tens = filt(tens, 'low', 900) / 6
tens *= np.minimum(1, tt / 1.2) * (0.55 + 0.45 * tt / tt[-1]) * np.minimum(1, (tt[-1] - tt) / 0.25)
place(music, tens, 28.3, 0.55)
# heartbeat pulse during warning
for k, tp in enumerate(np.arange(29.0, 38.6, 0.62 - 0.0)):
    g = 0.25 + 0.5 * min(1, (tp - 29) / 6)
    place(music, thud(0.3, 62), tp, g)
    place(music, thud(0.25, 58), tp + 0.16, g * 0.55)
# warning beeps (downstream starving)
for k, tp in enumerate(np.arange(33.5, 36.7, 0.8)):
    place(sfx, beep(880), tp, 0.07, pan=0.3)
    place(sfx, beep(660), tp + 0.2, 0.07, pan=0.3)
# resolve chord at "Flow restored"
place(music, pad(6.2, [110, 138.6, 164.8, 220, 277.2, 329.6], 0.9, 2.8, 2200, 0.004), 43.9, 0.5)
place(music, shimmer(5.0, (880, 1108.7, 1318.5, 1760), 2.0), 44.2, 0.2)
# outro bed
place(music, pad(5.2, [55, 82.4, 110, 164.8, 220], 1.0, 2.6, 900), 45.8, 0.45)

# ---- hits / sfx
place(sfx, whoosh(0.5, 200, 3000, 1.2, 1.0, (0.85, 0.15)), 4.1, 0.45)
place(sfx, boom(2.0, 100, 30), 4.5, 0.7)
place(sfx, shimmer(3.0, (659, 988, 1318, 1976), 1.4), 4.7, 0.1)
place(sfx, boom(2.2, 85, 28, 2.0), 6.5, 0.6)
place(sfx, whoosh(1.2, 2500, 400, 1.2, 0.8, (0.2, 0.8)), 6.5, 0.2)
place(sfx, shimmer(3.2, (1318, 1760, 2637, 3520), 1.6), 6.85, 0.14)
# section slice: metallic shing sweep + ring
place(sfx, whoosh(1.7, 600, 9000, 3.0, 1.2, (0.75, 0.25)), 9.1, 0.4, pan=-0.2)
place(sfx, tink(2600, 1.6, 0.2) * np.linspace(1, 0.5, int(1.6 * SR)), 10.6, 0.16, pan=0.25)
place(sfx, boom(1.5, 70, 35, 1.2), 10.65, 0.35)
# cuts
for tc, g in [(8.78, 0.18), (11.1, 0.16), (15.45, 0.2), (17.12, 0.15), (19.95, 0.18), (25.85, 0.2), (31.95, 0.15), (33.45, 0.15), (36.85, 0.18), (44.05, 0.15)]:
    place(sfx, whoosh(0.45, 400, 2500, 1.0, 1.0, (0.7, 0.3)), tc - 0.3, g, pan=float(rng.uniform(-0.4, 0.4)))
# impacts on the screen
for tp, g, base, pan in [(17.45, 0.85, 2100, -0.2), (17.95, 0.6, 2500, 0.2), (18.45, 0.45, 3100, 0.0)]:
    place(sfx, tink(base, 0.7), tp, g * 0.6, pan)
    place(sfx, thud(0.3, 95), tp, g * 0.8, pan)
place(sfx, boom(1.0, 80, 40, 1.4), 17.45, 0.5)
# debris slides into the pocket
for tp in (20.2, 20.55, 20.9):
    x = filt(noise(1.2), 'band', [500, 3000]) * np.hanning(int(1.2 * SR)) * (0.6 + 0.4 * np.sign(np.sin(np.arange(int(1.2 * SR)) / SR * 2 * np.pi * 23)))
    place(sfx, x / np.abs(x).max(), tp, 0.07, pan=0.3)
# small tinks of regular debris arriving (and many in the time-lapse)
for d_t in np.sort(np.concatenate([np.linspace(14.5, 25.5, 9), 25.9 + 2.4 * rng.random(26), 28.5 + 4.5 * rng.random(8)])):
    place(sfx, tink(float(rng.uniform(2400, 4200)), 0.35, 0.6), float(d_t), float(rng.uniform(0.04, 0.09)), pan=float(rng.uniform(-0.6, 0.6)))
# time-lapse ticks + riser
for k in range(12):
    place(sfx, tick(), 26.0 + k * (2.3 / 11), 0.28, pan=0.0)
place(sfx, whoosh(2.5, 200, 2500, 2.0, 1.4, (0.95, 0.05)), 25.9, 0.18)
place(sfx, boom(1.6, 80, 35, 1.2), 28.42, 0.5)
# valve: lever clunks
place(sfx, clunk(0.5), 38.28, 0.55, 0.3)
place(sfx, clunk(0.5), 38.86, 0.8, 0.3)
# blast
place(sfx, boom(3.0, 110, 28, 2.2), 39.02, 1.0)
place(sfx, whoosh(1.4, 300, 6000, 0.9, 0.6, (0.08, 0.92)), 39.0, 0.5)
place(sfx, boom(2.0, 90, 30, 1.8), 39.32, 0.5)
# debris hitting the drain grate
for d_t in 39.3 + 2.6 * rng.random(34) ** 1.6:
    place(sfx, tink(float(rng.uniform(1400, 3400)), 0.3, 0.8), float(d_t), float(rng.uniform(0.05, 0.12)), pan=float(rng.uniform(0.0, 0.7)))
# valve close + restore
place(sfx, clunk(0.5), 44.0, 0.45, 0.3)
place(sfx, clunk(0.5), 44.58, 0.6, 0.3)
# end card hits
place(sfx, boom(2.6, 90, 28, 1.8), 46.12, 0.6)
place(sfx, shimmer(3.5, (880, 1318, 1760, 2637), 1.8), 46.4, 0.12)
place(sfx, shimmer(2.5, (1318, 1760, 2637), 1.2), 47.3, 0.06)
place(sfx, whoosh(1.6, 3000, 300, 1.0, 0.8, (0.15, 0.85)), 46.2, 0.18)

# ---- voice + ducking
voice, vsr = sf.read('audio/voice_robot.wav')
assert vsr == SR
voice = voice[:N] if len(voice) >= N else np.pad(voice, (0, N - len(voice)))
venv = np.abs(signal.hilbert(voice))
venv = filt(venv, 'low', 6)
duck = 1 - 0.7 * np.clip(venv / (np.percentile(venv, 97) + 1e-9), 0, 1)
voice_st = np.stack([voice, voice], 1)

ir = reverb_ir()
def with_verb(b, wet):
    w = np.stack([signal.fftconvolve(b[:, c], ir[:, c])[:N] for c in range(2)], 1)
    return b + wet * w

music = with_verb(music, 0.35)
sfx = with_verb(sfx, 0.22)
amb = with_verb(amb, 0.12)

fx_mix = (music * 0.42 + sfx * 0.7 + amb * 0.3) * duck[:, None]
mix = fx_mix + voice_st * 1.75
# fades
mix *= np.minimum(1, t_all / 0.25)[:, None] * (1 - ss(49.2, 49.95, t_all))[:, None]

meter = pyln.Meter(SR)
loud = meter.integrated_loudness(mix)
mix *= 10 ** ((-13.2 - loud) / 20)
# soft limiter
peak = np.abs(mix).max()
mix = np.tanh(mix / 0.95) * 0.95
mix *= 0.89 / max(0.89, np.abs(mix).max())
print('loudness before', round(loud, 1), 'after', round(meter.integrated_loudness(mix), 1), 'peak', round(np.abs(mix).max(), 3))
sf.write('audio/mix.wav', mix.astype(np.float32), SR)
# stems for reference
vfin = voice_st * 1.75 * 10 ** ((-13.2 - loud) / 20)
np.save('audio/_v.npy', vfin[:,0])
sf.write('audio/fx_only.wav', (fx_mix / (np.abs(fx_mix).max() + 1e-9) * 0.8).astype(np.float32), SR)
