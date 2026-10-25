"""Shared synthesis toolkit for the maintenance series (no samples)."""
import json, numpy as np, soundfile as sf, pyloudnorm as pyln
from scipy import signal

SR = 48000
DUR = 50.0
N = int(SR * DUR)

def set_duration(d):
    global DUR, N, t_all
    DUR = d; N = int(SR * d); t_all = np.arange(N) / SR
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



def ss(a, b, x):
    u = np.clip((x - a) / (b - a), 0, 1)
    return u * u * (3 - 2 * u)


def finish(topic_dir, sfx, music, amb, voice_gain=1.75, target=-13.2):
    """reverb sends, duck under the robot voice, loudness-normalise, write mix.wav"""
    voice, vsr = sf.read(f'{topic_dir}/voice.wav')
    assert vsr == SR
    n = len(sfx)
    voice = voice[:n] if len(voice) >= n else np.pad(voice, (0, n - len(voice)))
    venv = np.abs(signal.hilbert(voice))
    venv = filt(venv, 'low', 6)
    duck = 1 - 0.7 * np.clip(venv / (np.percentile(venv, 97) + 1e-9), 0, 1)
    vst = np.stack([voice, voice], 1)
    ir = reverb_ir()
    def verb(b, wet):
        w = np.stack([signal.fftconvolve(b[:, c], ir[:, c])[:n] for c in range(2)], 1)
        return b + wet * w
    fx = (verb(music, 0.35) * 0.42 + verb(sfx, 0.22) * 0.7 + verb(amb, 0.12) * 0.3) * duck[:, None]
    mixd = fx + vst * voice_gain
    tt = np.arange(n) / SR
    mixd *= np.minimum(1, tt / 0.25)[:, None] * (1 - ss(n / SR - 0.8, n / SR - 0.05, tt))[:, None]
    meter = pyln.Meter(SR)
    loud = meter.integrated_loudness(mixd)
    mixd *= 10 ** ((target - loud) / 20)
    mixd = np.tanh(mixd / 0.95) * 0.95
    mixd *= 0.89 / max(0.89, np.abs(mixd).max())
    print('loudness', round(meter.integrated_loudness(mixd), 1), 'peak', round(np.abs(mixd).max(), 3))
    sf.write(f'{topic_dir}/mix.wav', mixd.astype(np.float32), SR)
