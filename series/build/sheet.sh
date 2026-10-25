#!/bin/bash
# build/sheet.sh <topic> <outdir> <times> [cols] [shell]  — render stills + contact sheet
cd "$(dirname "$0")/.."
rm -rf $2 && nice -n 5 node build/render.mjs --topic $1 --times $3 --out $2 --scale 0.4 --shell ${5:-video} 2>&1 | grep -iE "error|done|fail" | head -20
python3 - "$2" "${4:-8}" <<'PY'
import sys, glob
from PIL import Image, ImageDraw
d, cols = sys.argv[1], int(sys.argv[2])
fs = sorted(glob.glob(d + '/t_*.jpg'), key=lambda f: float(f.split('t_')[-1][:-4]))
w, h = (243, 432) if Image.open(fs[0]).width < Image.open(fs[0]).height else (384, 216); rows = (len(fs) + cols - 1) // cols
out = Image.new('RGB', (w * cols, h * rows))
for i, f in enumerate(fs):
    im = Image.open(f).resize((w, h)); ImageDraw.Draw(im).text((6, 6), f.split('t_')[-1][:-4], fill=(255, 255, 0)); out.paste(im, ((i % cols) * w, (i // cols) * h))
out.save(d + '/sheet.jpg', quality=80)
PY
