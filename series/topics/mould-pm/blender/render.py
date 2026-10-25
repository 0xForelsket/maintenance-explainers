"""Render frames of the built scene, skipping any that already exist (resumable), and log seconds per frame.

usage: blender -b series/topics/mould-pm/blender/mould-pm.blend -P series/topics/mould-pm/blender/render.py --
         --out DIR (--frames 10,200,1234 | --from A --to B [--step S]) [--scale 100] [--samples N] [--ext jpg]
"""
import bpy, os, sys, time

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
A = {argv[i][2:]: argv[i + 1] for i in range(0, len(argv) - 1) if argv[i].startswith('--')}
sc = bpy.context.scene
out = os.path.abspath(A['out'])
os.makedirs(out, exist_ok=True)
if 'frames' in A:
    frames = [int(f) for f in A['frames'].split(',')]
else:
    frames = list(range(int(A['from']), int(A['to']) + 1, int(A.get('step', 1))))
sc.render.resolution_percentage = int(A.get('scale', 100))
if 'samples' in A:
    sc.eevee.taa_render_samples = int(A['samples'])
sc.render.image_settings.file_format = 'JPEG'
sc.render.image_settings.quality = 92
todo = [f for f in frames if not os.path.exists(os.path.join(out, 'f_%05d.jpg' % f))]
print('render', len(todo), 'of', len(frames), 'frames →', out, flush=True)
t0 = time.time()
for i, f in enumerate(todo):
    t1 = time.time()
    sc.frame_set(f)
    sc.render.filepath = os.path.join(out, 'f_%05d.jpg' % f)
    bpy.ops.render.render(write_still=True)
    print('frame %d %.2fs (%d/%d, avg %.2fs)' % (f, time.time() - t1, i + 1, len(todo), (time.time() - t0) / (i + 1)), flush=True)
print('done', len(todo), 'frames in %.0fs' % (time.time() - t0), flush=True)
