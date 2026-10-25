"""Storyboard stills for a Blender-rendered topic: 3D frames (Blender) + overlay PNGs (Edge) composited at 1080p,
plus a contact sheet.  usage (from series/):
  python build/blender-stills.py mould-pm test/mould-pm-sb 2.6,18.5,51.5 [--scale 75] [--samples 10] [--cols 4]
"""
import os, subprocess, sys
from PIL import Image, ImageDraw

topic, outdir, times = sys.argv[1], os.path.abspath(sys.argv[2]), sys.argv[3]
opt = {sys.argv[i][2:]: sys.argv[i + 1] for i in range(4, len(sys.argv) - 1) if sys.argv[i].startswith('--')}
FPS = 24
BLENDER = os.environ.get('BLENDER', r'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe')
frames = [round(float(t) * FPS) for t in times.split(',')]
d3, dov = os.path.join(outdir, '3d'), os.path.join(outdir, 'ov')
os.makedirs(d3, exist_ok=True)
blend = os.path.join('topics', topic, 'blender', topic + '.blend')
subprocess.run([BLENDER, '-b', blend, '-P', os.path.join('topics', topic, 'blender', 'render.py'), '--', '--out', d3,
                '--frames', ','.join(map(str, frames)), '--scale', opt.get('scale', '75'), '--samples', opt.get('samples', '10')], check=True)
subprocess.run(['node', 'build/overlay.mjs', '--topic', topic, '--out', dov, '--times', ','.join('%.4f' % (n / FPS) for n in frames)], check=True)
tiles = []
for n in frames:
    bg = Image.open(os.path.join(d3, 'f_%05d.jpg' % n)).convert('RGB').resize((1920, 1080), Image.LANCZOS)
    ov = Image.open(os.path.join(dov, 't_%.2f.png' % (n / FPS))).convert('RGBA')
    im = bg.convert('RGBA')
    im.alpha_composite(ov)
    im = im.convert('RGB')
    im.save(os.path.join(outdir, 's_%05d.jpg' % n), quality=90)
    tiles.append((n, im))
cols = int(opt.get('cols', 4))
w, h = 480, 270
rows = (len(tiles) + cols - 1) // cols
sheet = Image.new('RGB', (w * cols, h * rows))
for i, (n, im) in enumerate(tiles):
    t = im.resize((w, h), Image.LANCZOS)
    ImageDraw.Draw(t).text((6, 4), '%.1f s' % (n / FPS), fill=(255, 255, 0))
    sheet.paste(t, ((i % cols) * w, (i // cols) * h))
sheet.save(os.path.join(outdir, 'sheet.jpg'), quality=88)
print('stills + sheet in', outdir)
