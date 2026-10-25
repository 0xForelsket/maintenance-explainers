"""Generate the narration with Kokoro TTS, robotize it, and compute line/word timings.
usage: python3 audio/voice.py topics/<name>"""
import sys, os
import json, re, numpy as np, soundfile as sf, librosa
from scipy import signal
from kokoro_onnx import Kokoro

# narrator defaults: George (UK male), natural, no robot effect. A topic can override with voice.json,
# e.g. {"voice": "bf_emma", "lang": "en-gb", "robot": false, "speed": 1.0, "align": true} (the first six videos,
# re-voiced onto their existing timelines; the original robot voice was am_michael, en-us, robot, speed 0.98).
VOICE = "bm_george"
LANG = "en-gb"
ROBOT = False
SPEED = 1.03
SR = 24000
OUT_SR = 48000
LEAD_IN = 0.45  # silence before the first line

TOPIC = sys.argv[1]
ALIGN = False   # "align": true re-voices a finished video: each line is fitted to the existing timeline.json
if os.path.exists(f"{TOPIC}/voice.json"):
    _cfg = json.load(open(f"{TOPIC}/voice.json"))
    VOICE, LANG, ROBOT, SPEED = _cfg.get("voice", VOICE), _cfg.get("lang", LANG), _cfg.get("robot", ROBOT), _cfg.get("speed", SPEED)
    ALIGN = _cfg.get("align", False)
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


def stretch_to(y, n):
    """WSOLA time-stretch y to exactly n samples (pitch unchanged)."""
    from audiotsm import wsola
    from audiotsm.io.array import ArrayReader, ArrayWriter
    if n <= 0:
        return np.zeros(0)
    if len(y) < 2048 or abs(len(y) - n) < 0.004 * SR:
        out = y
    else:
        w = ArrayWriter(1)
        wsola(1, speed=len(y) / n).run(ArrayReader(y[np.newaxis, :].astype(np.float32)), w)
        out = w.data[0].astype(np.float64)
    return out[:n] if len(out) >= n else np.pad(out, (0, n - len(out)))


def phrases(words):
    """[(first_word, last_word, start, end)] split where the timing leaves a pause between words."""
    out, a = [], 0
    for i in range(len(words)):
        if i == len(words) - 1 or words[i + 1]["s"] - words[i]["e"] > 0.02:
            out.append((a, i, words[a]["s"], words[i]["e"]))
            a = i + 1
    return out


def align_to_timeline():
    """Fit a new voice into a finished video: every line keeps its start/end, and its phrases land on the
    old phrase timings, so the burned-in captions and every cue stay in sync without re-rendering."""
    old = json.load(open(f"{TOPIC}/timeline.json"))
    script = {l["id"]: l for l in lines}
    dry = np.zeros(int(old["total"] * SR) + SR)
    for ol in old["lines"]:
        text = script[ol["id"]]["text"]
        target = ol["end"] - ol["start"]
        sp = SPEED
        for _ in range(2):   # pick a speaking rate that lands near the slot, then stretch the rest
            y, sr = k.create(text, voice=VOICE, speed=sp, lang=LANG)
            y, _ = librosa.effects.trim(y, top_db=42, frame_length=512, hop_length=128)
            sp = float(np.clip(sp * (len(y) / sr) / target, 0.8, 1.3))
        y = y.astype(np.float64)
        ow, nw = ol["words"], time_words(ol["text"], y, sr)
        op, np_ = phrases(ow), phrases(nw)
        line = np.zeros(int(round(target * SR)))
        ratios = []
        fits = len(op) == len(np_) and all(a[:2] == b[:2] for a, b in zip(op, np_))
        if fits:   # only stretch phrase-by-phrase when no phrase has to change speed audibly
            r = [(ne - ns) / max(1e-3, oe - os_) for (_, _, os_, oe), (_, _, ns, ne) in zip(op, np_)]
            fits = 0.87 <= min(r) and max(r) <= 1.15
        if fits:
            for (_, _, os_, oe), (_, _, ns, ne) in zip(op, np_):
                seg = y[int(ns * SR):int(ne * SR)]
                n = int(round((oe - os_) * SR)); i = int(round((os_ - ol["start"]) * SR))
                ratios.append(len(seg) / max(1, n))
                part = stretch_to(seg, n)
                line[i:i + len(part)] = part[: max(0, len(line) - i)]
            mode = "phrases"
        else:
            ratios.append(len(y) / len(line)); line = stretch_to(y, len(line)); mode = "whole line"
        i = int(round(ol["start"] * SR)); dry[i:i + len(line)] += line
        print(f'{ol["id"]:>2} speed {sp:.2f} {mode:<10} stretch {min(ratios):.2f}-{max(ratios):.2f}  {ol["text"][:60]}')
    out = reverb(robotize(dry, SR), SR) if ROBOT else reverb(dry, SR, wet=0.08)
    out = librosa.resample(out, orig_sr=SR, target_sr=OUT_SR)
    out = out / (np.abs(out).max() + 1e-9) * 0.89
    sf.write(f"{TOPIC}/voice.wav", out.astype(np.float32), OUT_SR)
    print("aligned to existing timeline, total", old["total"])


if ALIGN:
    align_to_timeline()
    sys.exit(0)

segs, timeline, cursor = [], [], LEAD_IN
for ln in lines:
    y, sr = k.create(ln["text"], voice=VOICE, speed=SPEED, lang=LANG)
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


robo = reverb(robotize(dry, sr), sr) if ROBOT else reverb(dry, sr, wet=0.08)
robo = librosa.resample(robo, orig_sr=sr, target_sr=OUT_SR)
robo = robo / (np.abs(robo).max() + 1e-9) * 0.89
sf.write(f"{TOPIC}/voice.wav", robo.astype(np.float32), OUT_SR)
json.dump({"total": round(total, 3), "lines": timeline}, open(f"{TOPIC}/timeline.json", "w"), indent=1)
for l in timeline:
    print(f'{l["id"]:>2} {l["start"]:6.2f}-{l["end"]:6.2f}  {l["text"]}')
print("total", round(total, 2))
