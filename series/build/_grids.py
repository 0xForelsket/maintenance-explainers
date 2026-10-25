import sys, glob
from PIL import Image, ImageDraw
d = sys.argv[1]; per = int(sys.argv[2]) if len(sys.argv) > 2 else 8
fs = sorted(glob.glob(d + '/t_*.jpg'), key=lambda f: float(f.split('t_')[-1][:-4]))
W, H = 768, 432
for g in range(0, len(fs), per):
    chunk = fs[g:g + per]; rows = (len(chunk) + 1) // 2
    out = Image.new('RGB', (W * 2, H * rows))
    for i, f in enumerate(chunk):
        im = Image.open(f).resize((W, H)); ImageDraw.Draw(im).text((8, 8), f.split('t_')[-1][:-4], fill=(255, 255, 0)); out.paste(im, ((i % 2) * W, (i // 2) * H))
    out.save(f'{d}/g{g // per}.jpg', quality=82)
print(len(fs))
