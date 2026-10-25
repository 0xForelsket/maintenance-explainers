"""Generate the narration with Kokoro TTS, robotize it, and compute line/word timings.
usage: python3 audio/voice.py topics/<name>"""
import sys, os
import json, re, numpy as np, soundfile as sf, librosa
from scipy import signal
from kokoro_onnx import Kokoro

VOICE = "am_michael"
SPEED = 0.98
SR = 24000
OUT_SR = 48000
LEAD_IN = 0.45  # silence before the first line

TOPIC = sys.argv[1]
M = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "models") + os.sep
k = Kokoro(M + "kokoro-v1.0.onnx", M + "voices-v1.0.bin")
lines = json.load(open(f"{TOPIC}/script.json"))


def syllables(word):
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return 1
    if w == "y":
        return 1
    groups = re.findall(r"[aeiouy]+", w)
    n = len(groups)
    if w.endswith("e") and n > 1 and not w.endswith(("le", "ee")):
        n -= 1
    return max(1, n)


def word_weights(words):
    return np.array([0.62 * syllables(w) + 0.05 * len(re.sub(r"\W", "", w)) + 0.25 for w in words])


def find_gaps(y, sr, min_len=0.09, thresh_db=-34):
    hop = int(0.01 * sr)
    rms = librosa.feature.rms(y=y, frame_length=hop * 3, hop_length=hop)[0]
    db = 20 * np.log10(rms / (rms.max() + 1e-9) + 1e-9)
    quiet = db < thresh_db
    gaps, start = [], None
    for i, q in enumerate(quiet):
        if q and start is None:
            start = i
        if (not q) and start is not None:
            if (i - start) * 0.01 >= min_len and start > 3:
                gaps.append((start * 0.01, i * 0.01))
            start = None
    return gaps


def time_words(text, y, sr):
    """Split words at punctuation-aligned audio gaps, then allocate time by weight."""
    words = text.split()
    dur = len(y) / sr
    gaps = find_gaps(y, sr)
    # word indices after which a pause is expected (punctuation)
    breaks = [i for i, w in enumerate(words[:-1]) if re.search(r"[,.;:!?]$", w)]
    # assign each expected break to the best gap, in order
    seg_bounds = []  # (word_end_index, gap_start, gap_end)
    used = 0
    w_all = word_weights(words)
    cum = np.cumsum(w_all) / w_all.sum()
    for b in breaks:
        expected_t = cum[b] * dur
        cands = [(abs((g[0] + g[1]) / 2 - expected_t), gi, g) for gi, g in enumerate(gaps) if gi >= used]
        if not cands:
            continue
        d, gi, g = min(cands)
        if d < 0.6:
            seg_bounds.append((b, g[0], g[1]))
            used = gi + 1
    # build segments
    timings = []
    start_word, t0 = 0, 0.0
    for (b, gs, ge) in seg_bounds + [(len(words) - 1, dur, dur)]:
        seg = words[start_word:b + 1]
        w = word_weights(seg)
        span = gs - t0
        acc = t0
        for word, wt in zip(seg, w):
            d = span * wt / w.sum()
            timings.append({"w": word, "s": round(acc, 3), "e": round(acc + d, 3)})
            acc += d
        start_word, t0 = b + 1, ge
    return timings


def robotize(y, sr):
    y = y.astype(np.float64)
    # deeper, slightly synthetic
    y1 = librosa.effects.pitch_shift(y, sr=sr, n_steps=-1.6)
    sub = librosa.effects.pitch_shift(y, sr=sr, n_steps=-12.0)
    x = y1 + 0.22 * sub
    t = np.arange(len(x)) / sr
    # ring modulation (metallic edge), mixed subtly
    rm = x * np.sin(2 * np.pi * 62.0 * t)
    x = 0.84 * x + 0.24 * rm
    # comb filter resonance (tin-can / robot body)
    d = int(sr * 0.0045)
    out = np.copy(x)
    for i in range(d, len(out)):
        out[i] = x[i] + 0.42 * out[i - d]
    x = 0.55 * x + 0.45 * out / 1.7
    # gentle bit/sample-rate reduction for a digital grain
    hold = 2
    x = np.repeat(x[::hold], hold)[: len(x)]
    q = 2 ** 11
    x = np.round(x * q) / q
    # EQ: high-pass, presence lift, tame fizz
    b, a = signal.butter(2, 85 / (sr / 2), "high")
    x = signal.lfilter(b, a, x)
    b, a = signal.butter(2, [2200 / (sr / 2), 4200 / (sr / 2)], "band")
    x = x + 0.35 * signal.lfilter(b, a, x)
    b, a = signal.butter(4, 9500 / (sr / 2), "low")
    x = signal.lfilter(b, a, x)
    return x


def reverb(x, sr, decay=0.55, wet=0.13, seed=3):
    rng = np.random.default_rng(seed)
    n = int(sr * decay * 2.2)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / (sr * decay / 6.9))
    b, a = signal.butter(2, 4500 / (sr / 2), "low")
    ir = signal.lfilter(b, a, ir)
    ir[: int(0.012 * sr)] = 0
    ir /= np.sqrt((ir ** 2).sum())
    wet_sig = signal.fftconvolve(x, ir)[: len(x)]
    return x + wet * wet_sig * 3.0


segs, timeline, cursor = [], [], LEAD_IN
for ln in lines:
    y, sr = k.create(ln["text"], voice=VOICE, speed=SPEED, lang="en-us")
    y, _ = librosa.effects.trim(y, top_db=42, frame_length=512, hop_length=128)
    dur = len(y) / sr
    words = time_words(ln.get("caption", ln["text"]), y, sr)
    for w in words:
        w["s"] = round(w["s"] + cursor, 3)
        w["e"] = round(w["e"] + cursor, 3)
    timeline.append({"id": ln["id"], "start": round(cursor, 3), "end": round(cursor + dur, 3),
                     "text": ln.get("caption", ln["text"]), "words": words})
    segs.append((cursor, y))
    cursor += dur + ln["pause"]

total = cursor + 0.2
dry = np.zeros(int(total * sr) + sr)
for start, y in segs:
    i = int(start * sr)
    dry[i:i + len(y)] += y


robo = robotize(dry, sr)
robo = reverb(robo, sr)
robo = librosa.resample(robo, orig_sr=sr, target_sr=OUT_SR)
robo = robo / (np.abs(robo).max() + 1e-9) * 0.89
sf.write(f"{TOPIC}/voice.wav", robo.astype(np.float32), OUT_SR)
json.dump({"total": round(total, 3), "lines": timeline}, open(f"{TOPIC}/timeline.json", "w"), indent=1)
for l in timeline:
    print(f'{l["id"]:>2} {l["start"]:6.2f}-{l["end"]:6.2f}  {l["text"]}')
print("total", round(total, 2))
