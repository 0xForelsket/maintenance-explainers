"""Mould PM episode — builds the Blender scene from scratch and keyframes it from blender/gen/{state,camera}.json.

usage (from the repo root):
  node series/build/blender-export.mjs mould-pm          # (run from series/) state.json + camera.json
  blender -b --factory-startup -P series/topics/mould-pm/blender/build_scene.py -- [--out PATH.blend] [--noanim]

Blender coordinates: X = mould axis (fixed half at -X), Z = up, Y = depth (the camera side is -Y). The story and
director use three.js coordinates (Y up): three (x, y, z) ↔ Blender (x, -z, y), see B3() / T3().
Units: 1 = 100 mm. The section plane is Y = cutY; the cutters remove everything at Y < cutY.
"""
import bpy, bmesh, math, json, os, sys, random
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lib
from lib import NB, N, rgb, bm_box, bm_cyl, bm_tube, bm_torus, bm_sphere, bm_merge, temp_obj, bool_apply, obj_from_bm, coll, TAU

TOPIC = os.path.dirname(HERE)
GEN = os.path.join(HERE, 'gen')
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ARG = {argv[i][2:]: (argv[i + 1] if i + 1 < len(argv) and not argv[i + 1].startswith('--') else '1') for i in range(len(argv)) if argv[i].startswith('--')}
OUT = ARG.get('out', os.path.join(HERE, 'mould-pm.blend'))


def B3(p):
    """three.js (x, y, z) → Blender (x, -z, y)"""
    return Vector((p[0], -p[2], p[1]))


def T3(v):
    """Blender (x, y, z) → three.js (x, z, -y)"""
    return [round(v[0], 5), round(v[2], 5), round(-v[1], 5)]


# ---------------------------------------------------------------- dimensions (Blender coords, units of 100 mm)
CAV = {'T': (0.0, 1.05), 'B': (0.0, -1.05), 'F': (-1.05, 0.0), 'K': (1.05, 0.0)}   # (Y, Z) of each cavity
DIRS = {'T': (0.0, 1.0), 'B': (0.0, -1.0), 'F': (-1.0, 0.0), 'K': (1.0, 0.0)}
R_INS, R_FL, R_OUT, R_IN = 0.38, 0.31, 0.25, 0.215                                 # insert, flange, cup outside/inside (3.5 mm wall)
X_FL, X_BASE, X_CORE = -0.03, -0.25, -0.215
PLATE = 1.8                                                                        # A/B/support plates ±1.8 in Y, Z
CLAMP_Z = 2.2                                                                      # clamp plates ±2.2 in Z
XA_CH, XB_CH, CH_R = -0.36, 0.24, 0.05                                             # cooling drillings
PILLARS = [(sy * 1.45, sz * 1.45) for sy in (-1, 1) for sz in (-1, 1)]
RETURNS = [(sy * 1.3, sz * 1.15) for sy in (-1, 1) for sz in (-1, 1)]
PIN_R, PIN_RAD = 0.022, 0.28


def at(c, along, side=0.0):
    """point on the parting plane: `along` from the mould centre in the direction of cavity c, `side` across it"""
    dy, dz = DIRS[c]
    return (dy * along - dz * side, dz * along + dy * side)


def pins_of(c):
    cy, cz = CAV[c]
    return [(cy + PIN_RAD * dy, cz + PIN_RAD * dz) for dy, dz in ((0, 1), (0, -1), (1, 0), (-1, 0))]


# ---------------------------------------------------------------- scene reset
bpy.ops.wm.read_factory_settings(use_empty=True)
SC = bpy.context.scene
SC.name = 'mould-pm'
COL = {k: coll(k) for k in ('mould', 'machine', 'shot', 'flow', 'cut', 'rigs', 'stage', 'extras')}
CUT_OBJS = []          # (object, cutter key)
MACHINE = []           # objects hidden in the toolroom shots
ANCHORS = {}


def anchor(name, p_blender, rig):
    ANCHORS[name] = {'p': T3(p_blender), 'rig': rig}


# ---------------------------------------------------------------- rigs (empties keyed from rigOffset())
RIGS = {}
for r in ('fixed', 'a', 'ains', 'b', 'bins', 'support', 'spacer', 'ejector', 'pin1', 'mcp', 'platen', 'rod'):
    e = bpy.data.objects.new('Rig_' + r, None)
    e.empty_display_size = 0.2
    COL['rigs'].objects.link(e)
    RIGS[r] = e


def put(ob, rig=None, cut='orange', machine=False):
    if rig:
        ob.parent = RIGS[rig]
    if cut:
        CUT_OBJS.append((ob, cut))
    if machine:
        MACHINE.append(ob)
    return ob


# ================================================================ materials
def new_mat(name):
    m = bpy.data.materials.new(name)
    if m.node_tree is None:
        m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    return m, NB(nt), out


def principled(nb):
    p = nb.node('ShaderNodeBsdfPrincipled')
    return p


def obj_coords(nb):
    tc = nb.node('ShaderNodeTexCoord')
    return N(nb, tc.outputs['Object'])


def world_pos(nb):
    g = nb.node('ShaderNodeNewGeometry')
    return N(nb, g.outputs['Position'])


def noise(nb, vec, scale, detail=2.0, rough=0.5, out='Fac'):
    n = nb.node('ShaderNodeTexNoise')
    nb.put(vec, n.inputs['Vector'])
    n.inputs['Scale'].default_value = scale
    n.inputs['Detail'].default_value = detail
    n.inputs['Roughness'].default_value = rough
    return N(nb, n.outputs[out])


def bump(nb, height, strength, dist=0.002):
    b = nb.node('ShaderNodeBump')
    b.inputs['Strength'].default_value = strength
    b.inputs['Distance'].default_value = dist
    nb.put(height, b.inputs['Height'])
    return N(nb, b.outputs['Normal'])


def thermal_ramp(nb, T):
    """dark blue → blue → green → yellow → red (same ramp as the three.js mould)"""
    r = nb.node('ShaderNodeValToRGB')
    cr = r.color_ramp
    stops = [(0.0, (0.05, 0.08, 0.42)), (0.25, (0.0, 0.5, 0.95)), (0.5, (0.1, 0.85, 0.45)), (0.75, (1.0, 0.85, 0.1)), (1.0, (1.0, 0.22, 0.04))]
    cr.elements[0].position, cr.elements[0].color = stops[0][0], (*stops[0][1], 1)
    cr.elements[1].position, cr.elements[1].color = stops[-1][0], (*stops[-1][1], 1)
    for pos, c in stops[1:-1]:
        e = cr.elements.new(pos)
        e.color = (*c, 1)
    nb.put(T, r.inputs['Fac'])
    return N(nb, r.outputs['Color'])


def finish(m, nb, out, p, alpha_clip=False):
    nb.put(p.outputs['BSDF'], out.inputs['Surface'])
    return m


def steel_mat(name, base, rough, metal=1.0, mottle=0.12, grain=0.04, weather=True, extra=None):
    """Machined / ground tool steel with optional rust, condensation, rust-preventive film and thermal darkening."""
    m, nb, out = new_mat(name)
    p = principled(nb)
    oc = obj_coords(nb)
    mot = noise(nb, oc, 2.5, 3)
    col = nb.mix(nb.remap(mot, 0.35, 0.65), (base[0] * (1 - mottle), base[1] * (1 - mottle), base[2] * (1 - mottle), 1), base, 'RGBA')
    rgh = nb.remap(noise(nb, oc, 40, 2), 0.3, 0.7, rough * 0.85, rough * 1.15)
    met = metal
    nrm = bump(nb, noise(nb, oc, 260, 2), grain)
    if weather:
        rust, cond, prot, therm = nb.attr('rust'), nb.attr('condense'), nb.attr('protect'), nb.attr('thermal')
        rm = nb.smooth(0.52, 0.62, noise(nb, oc, 5, 4) + 0.3 * noise(nb, oc, 28, 2)) * rust
        rcol = nb.mix(noise(nb, oc, 60, 3), rgb(0x3a1606), rgb(0x8a3a10), 'RGBA')
        col = nb.mix(rm, col, rcol, 'RGBA')
        met = nb.mix(rm, metal, 0.05)
        rgh = nb.mix(rm, rgh, 0.85)
        wet = cond * nb.smooth(0.25, 0.6, noise(nb, oc, 9, 3))
        rgh = rgh * (1 - 0.55 * wet)
        col = nb.mix(wet * 0.25, col, (0, 0, 0, 1), 'RGBA')
        rgh = rgh * (1 - 0.35 * prot)
        col = nb.mix(prot * 0.18, col, rgb(0x8a6a2a), 'RGBA')
        col = nb.mix(therm * 0.92, col, (0, 0, 0, 1), 'RGBA')
    if extra:
        col, rgh, met, emis = extra(nb, oc, col, rgh, met)
        if emis is not None:
            nb.put(emis, p.inputs['Emission Color'])
            p.inputs['Emission Strength'].default_value = 1.0
    nb.put(col, p.inputs['Base Color']); nb.put(rgh, p.inputs['Roughness']); nb.put(met, p.inputs['Metallic']); nb.put(nrm, p.inputs['Normal'])
    return finish(m, nb, out, p)


def simple_mat(name, base, rough=0.5, metal=0.0, coat=0.0, emis=None, estr=0.0, sss=0.0, alpha=None):
    m, nb, out = new_mat(name)
    p = principled(nb)
    p.inputs['Base Color'].default_value = base
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    p.inputs['Coat Weight'].default_value = coat
    if emis:
        p.inputs['Emission Color'].default_value = emis
        p.inputs['Emission Strength'].default_value = estr
    if sss:
        p.inputs['Subsurface Weight'].default_value = sss
    if alpha is not None:
        p.inputs['Alpha'].default_value = alpha
    return finish(m, nb, out, p)


def emission_mat(name, color, strength, attr_col=None):
    """glowing streak material; optional blend to white air when `blow` > 0"""
    m, nb, out = new_mat(name)
    e = nb.node('ShaderNodeEmission')
    c = color
    if attr_col:
        c = nb.mix(nb.attr(attr_col), color, (1.0, 1.0, 1.0, 1.0), 'RGBA')
    nb.put(c, e.inputs['Color'])
    e.inputs['Strength'].default_value = strength
    nb.put(e.outputs[0], out.inputs['Surface'])
    return m


def hatch(nb, wp, sign=1.0, period=0.05):
    x, y, z = nb.sep(wp)
    u = nb.fract((x + z * sign) / period)
    return nb.smooth(0.78, 0.82, u) * (1 - nb.smooth(0.96, 0.995, u))


THERMAL_IMG = {}


def cap_mat(name, base, sign=1.0, thermal=True, metal=0.0, rough=0.55, glow=0.12):
    """Section cut face: flat colour with world-space hatching (engineering-drawing style); thermal view on top."""
    m, nb, out = new_mat(name)
    p = principled(nb)
    wp = world_pos(nb)
    h = hatch(nb, wp, sign)
    col = nb.mix(h, base, (base[0] * 0.55, base[1] * 0.55, base[2] * 0.55, 1), 'RGBA')
    emis = nb.mix(h, (base[0] * glow, base[1] * glow, base[2] * glow, 1), (0, 0, 0, 1), 'RGBA')
    if thermal:
        x, y, z = nb.sep(wp)
        uv = nb.comb(nb.remap(x, -1.3, 2.3), nb.remap(z, -2.3, 2.3), 0.0)
        ok, sc = nb.node('ShaderNodeTexImage'), nb.node('ShaderNodeTexImage')
        ok.image, sc.image = THERMAL_IMG['ok'], THERMAL_IMG['scaled']
        ok.extension = sc.extension = 'EXTEND'
        nb.put(uv, ok.inputs['Vector']); nb.put(uv, sc.inputs['Vector'])
        T = nb.mix(nb.attr('thermalScaled'), N(nb, ok.outputs['Color']), N(nb, sc.outputs['Color']), 'RGBA')
        x2, _, _ = nb.sep(T)
        tc = thermal_ramp(nb, nb.remap(x2, 0.12, 0.72))
        th = nb.attr('thermal')
        col = nb.mix(th, col, (0, 0, 0, 1), 'RGBA')
        emis = nb.mix(th, emis, nb.mix(h, tc, nb.mix(1.0, tc, tc, 'RGBA', 'MULTIPLY'), 'RGBA'), 'RGBA')
    nb.put(col, p.inputs['Base Color']); nb.put(emis, p.inputs['Emission Color'])
    p.inputs['Emission Strength'].default_value = 1.0
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    return finish(m, nb, out, p)


def fill_dist(nb, P):
    """Distance along the melt flow (sprue → runner → gate → cavity) for a point in shot/mould coordinates.
    Returns (d, isTop) where isTop marks the top cavity, whose front can lag (short shot / burn)."""
    x, y, z = nb.sep(P)
    r = nb.sqrt(y * y + z * z)
    d_sprue = x + 1.015
    d_slug = 1.015 + nb.mx(x, 0.0)
    d_run = 1.015 + r
    ay, az = nb.abs(y), nb.abs(z)
    isz = az > ay
    gy = nb.sel(isz, 0.0, 0.745 * nb.sign(y))
    gz = nb.sel(isz, 0.745 * nb.sign(z), 0.0)
    dx, dy, dz = x + 0.01, y - gy, z - gz
    d_cav = 1.76 + nb.sqrt(dx * dx + dy * dy + dz * dz)
    in_sprue = (r < 0.13) * (x < -0.005)
    in_slug = (r < 0.07) * (1 - in_sprue)
    in_run = (r < 0.745) * (1 - in_sprue) * (1 - in_slug)
    d = nb.sel(in_sprue, d_sprue, nb.sel(in_slug, d_slug, nb.sel(in_run, d_run, d_cav)))
    is_top = isz * (z > 0.0) * (r > 0.745)
    return d, is_top


def shot_mat(name, cap=False):
    """The moulded shot: visible behind the melt front, glowing while hot, with burn / drag marks and thermal view."""
    m, nb, out = new_mat(name)
    p = principled(nb)
    oc = obj_coords(nb)
    d, top = fill_dist(nb, oc)
    fill, ftop, heat = nb.attr('fill'), nb.attr('fillTop'), nb.attr('heat')
    F = nb.sel(top, ftop, fill)
    vis = d < F + 0.0005
    near = nb.exp(nb.mn(d - F, 0.0) / 0.035)                         # 1 at the front, falls off behind it
    ivory = rgb(0xd9cfb6)
    col = ivory
    # burn mark: the last bit of the top cavity to fill, scorched by the dieselling air
    x, y, z = nb.sep(oc)
    burn = nb.attr('burn') * top * nb.smooth(-0.06, -0.01, d - ftop) * nb.smooth(0.35, 0.65, noise(nb, oc, 30, 3) + 0.3)
    col = nb.mix(burn, col, rgb(0x1a0d06), 'RGBA')
    # drag marks: scuffs along the ejection direction on the front cavity's wall
    front = (nb.abs(y) > nb.abs(z)) * (y < 0.0) * (nb.sqrt(y * y + z * z) > 0.745)
    streak = noise(nb, nb.comb(x * 0.6, y * 70, z * 70), 1.0, 2)
    drag = nb.attr('drag') * front * nb.smooth(0.56, 0.66, streak)
    col = nb.mix(drag, col, rgb(0xf4efe6), 'RGBA')
    rgh = nb.mix(drag, 0.38, 0.8)
    # hot melt: dark molten body with an orange glow, brightest at the front
    glow = heat * (0.55 + 2.8 * near)
    col = nb.mix(nb.clamp01(heat * 1.4), col, rgb(0x5a1c06), 'RGBA')
    ecol = (1.0, 0.33, 0.05, 1.0)
    th = nb.attr('thermal')
    tc = thermal_ramp(nb, 0.25 + 0.7 * heat)
    ecol = nb.mix(th, ecol, tc, 'RGBA')
    estr = nb.mix(th, glow * 3.0, 1.1)
    if cap:
        wp = world_pos(nb)
        h = hatch(nb, wp, 1.0, 0.04)
        col = nb.mix(h * 0.35, col, (0, 0, 0, 1), 'RGBA')
    nb.put(col, p.inputs['Base Color']); nb.put(rgh, p.inputs['Roughness'])
    nb.put(ecol, p.inputs['Emission Color']); nb.put(estr, p.inputs['Emission Strength'])
    p.inputs['Subsurface Weight'].default_value = 0.15
    nb.put(vis, p.inputs['Alpha'])
    m.surface_render_method = 'DITHERED'
    m.use_transparent_shadow = True
    return finish(m, nb, out, p)


def flash_mat(name, key):
    """thin fins at the parting line, growing outward from the flange edge with the scene value `key`"""
    m, nb, out = new_mat(name)
    p = principled(nb)
    oc = obj_coords(nb)
    x, y, z = nb.sep(oc)
    r = nb.sqrt(y * y + z * z)
    ang = noise(nb, nb.comb(y * 6, z * 6, 0.0), 2.0, 2)
    lim = 0.306 + nb.attr(key) * (0.012 + 0.035 * ang)
    nb.put(r < lim, p.inputs['Alpha'])
    p.inputs['Base Color'].default_value = rgb(0xe3dac4)
    p.inputs['Roughness'].default_value = 0.35
    p.inputs['Subsurface Weight'].default_value = 0.3
    m.surface_render_method = 'DITHERED'
    return finish(m, nb, out, p)


def water_mat(name, cap=False):
    m, nb, out = new_mat(name)
    p = principled(nb)
    p.inputs['Base Color'].default_value = rgb(0x0b5f8a)
    p.inputs['Roughness'].default_value = 0.05
    p.inputs['Emission Color'].default_value = rgb(0x0a4f7a)
    p.inputs['Emission Strength'].default_value = 0.5 if cap else 0.3
    a = nb.attr('waterOn') * (0.38 if cap else 0.28)
    nb.put(a, p.inputs['Alpha'])
    m.surface_render_method = 'BLENDED'
    m.use_transparent_shadow = True
    return finish(m, nb, out, p)


def build_materials():
    M = {}
    M['plate'] = steel_mat('PlateSteel', rgb(0x9aa1a8), 0.3)
    M['clamp'] = steel_mat('ClampSteel', rgb(0x3b3f44), 0.42, mottle=0.18)
    M['support'] = steel_mat('SupportSteel', rgb(0x80878e), 0.36)

    def insert_extra(key):
        def f(nb, oc, col, rgh, met):
            hi = nb.attr(key)
            return col, rgh, met, nb.mix(hi, (0, 0, 0, 1), (0.25, 0.85, 1.0, 1), 'RGBA')
        return f
    M['insert'] = steel_mat('InsertSteel', rgb(0xb4bac0), 0.16)
    M['core'] = steel_mat('CoreSteel', rgb(0xc2c8ce), 0.07, extra=insert_extra('hiCore'))

    def cavity_extra(nb, oc, col, rgh, met):
        po = nb.attr('plateout') * nb.smooth(0.3, 0.7, noise(nb, oc, 7, 4) + 0.15)
        col = nb.mix(po * 0.85, col, rgb(0xb3a68a), 'RGBA')
        rgh = nb.mix(po, rgh, 0.42)
        met = nb.mix(po, met, 0.3)
        return col, rgh, met, nb.mix(nb.attr('hiCavity'), (0, 0, 0, 1), (0.25, 0.85, 1.0, 1), 'RGBA')
    M['cavity'] = steel_mat('CavityPolished', rgb(0xd0d5da), 0.035, grain=0.0, extra=cavity_extra)

    def pin_extra(gall_key=None, grease=False):
        def f(nb, oc, col, rgh, met):
            lube = nb.attr('lube') if not grease else nb.attr('grease')
            rgh = rgh * (1 - 0.6 * lube)
            col = nb.mix(lube * 0.25, col, rgb(0xa07020), 'RGBA')
            if gall_key:
                x, y, z = nb.sep(oc)
                sc = noise(nb, nb.comb(x * 3, y * 90, z * 90), 1.0, 3)
                g = nb.attr('gall') * nb.smooth(0.5, 0.62, sc)
                col = nb.mix(g, col, rgb(0x5a3010), 'RGBA')
                rgh = nb.mix(g, rgh, 0.7)
            if grease:
                w = nb.attr('pillarWear')
                x, y, z = nb.sep(oc)
                sc = noise(nb, nb.comb(x * 2, y * 80, z * 80), 1.0, 3)
                g = w * nb.smooth(0.52, 0.6, sc)
                col = nb.mix(g, col, rgb(0x4a3a2a), 'RGBA')
                rgh = nb.mix(g, rgh, 0.65)
            return col, rgh, met, None
        return f
    M['pin'] = steel_mat('PinSteel', rgb(0xc7ccd2), 0.14, weather=False, extra=pin_extra())
    M['pin1'] = steel_mat('PinGalled', rgb(0xc7ccd2), 0.14, weather=False, extra=pin_extra('gall'))
    M['pillar'] = steel_mat('PillarSteel', rgb(0xd5d9de), 0.1, weather=False, extra=pin_extra(grease=True))
    M['bush'] = steel_mat('BushBronze', rgb(0x9c7a46), 0.28, weather=False)

    def spring_extra(nb, oc, col, rgh, met):
        return col, rgh, met, nb.mix(nb.attr('springHi'), (0, 0, 0, 1), (0.3, 1.0, 0.6, 1), 'RGBA')
    M['spring'] = steel_mat('SpringSteel', rgb(0x3a4a5a), 0.3, weather=False, extra=spring_extra)
    M['brass'] = simple_mat('Brass', rgb(0xc89b52), 0.28, 1.0)
    M['oring'] = None
    m, nb, out = new_mat('ORing')
    p = principled(nb)
    oc = obj_coords(nb)
    o = nb.attr('oring')
    col = nb.mix(o, rgb(0x141516), rgb(0x3a2a1c), 'RGBA')
    crack = nb.smooth(0.6, 0.66, noise(nb, oc, 120, 3)) * o
    col = nb.mix(crack, col, rgb(0x0a0705), 'RGBA')
    col = nb.mix(nb.attr('newOring'), col, rgb(0x0f3a22), 'RGBA')
    nb.put(col, p.inputs['Base Color']); nb.put(nb.mix(o, 0.45, 0.85), p.inputs['Roughness'])
    nb.put(bump(nb, crack, 0.6), p.inputs['Normal'])
    M['oring'] = finish(m, nb, out, p)
    M['hoseBlue'] = simple_mat('HoseBlue', rgb(0x1f4f9a), 0.45, coat=0.3)
    M['hoseRed'] = simple_mat('HoseRed', rgb(0xa82a22), 0.45, coat=0.3)
    M['paint'] = simple_mat('MachinePaint', rgb(0x23303d), 0.38, 0.0, coat=0.5)
    M['paintDark'] = simple_mat('MachineDark', rgb(0x14181d), 0.5, 0.2)
    M['chrome'] = simple_mat('Chrome', rgb(0xe8ecf0), 0.06, 1.0)
    M['heater'] = simple_mat('HeaterBand', rgb(0x8f8a84), 0.35, 1.0)
    M['floor'] = simple_mat('Floor', rgb(0x0d0f12), 0.32, 0.0)
    M['plinth'] = simple_mat('Plinth', rgb(0x111418), 0.3, 0.4, coat=0.4)
    M['alu'] = simple_mat('Aluminium', rgb(0xb9bec4), 0.32, 1.0)
    M['ink'] = simple_mat('Ink', rgb(0x101214), 0.5)
    M['digits'] = simple_mat('Digits', rgb(0xf2f2f2), 0.4, emis=(1, 1, 1, 1), estr=0.6)
    M['ventdirt'] = simple_mat('VentResidue', rgb(0x3d2a17), 0.85)
    M['crust'] = steel_mat('Scale', rgb(0xc9b48a), 0.95, metal=0.0, mottle=0.35, grain=0.3, weather=False)
    M['droplet'] = simple_mat('Droplet', rgb(0x9fb4c4), 0.03, 0.0, coat=1.0)        # glossy beads: read as water against the dark steel
    M['dent'] = simple_mat('Dent', rgb(0x24272b), 0.55, 0.8)
    M['airglow'] = None
    m, nb, out = new_mat('AirPocket')
    e = nb.node('ShaderNodeEmission')
    a, dz = nb.attr('airGlow'), nb.attr('diesel')
    nb.put(nb.mix(nb.clamp01(a * 1.3 + dz), (0.9, 0.95, 1.0, 1), (1.0, 0.45, 0.08, 1), 'RGBA'), e.inputs['Color'])
    nb.put(a * 3 + dz * 9, e.inputs['Strength'])
    nb.put(e.outputs[0], out.inputs['Surface'])
    M['airglow'] = m
    M['spray'] = simple_mat('Spray', (0.9, 0.92, 0.94, 1), 0.45, alpha=0.3)
    M['spray'].surface_render_method = 'BLENDED'
    M['shot'] = shot_mat('Shot')
    M['flashT'] = M['flashB'] = simple_mat('FlashFin', rgb(0xe3dac4), 0.35, sss=0.3)
    M['water'] = water_mat('Water')
    M['meltcore'] = simple_mat('MeltCore', rgb(0x5a1c06), 0.4, emis=(1.0, 0.33, 0.05, 1), estr=2.2)
    # flow streaks (emissive)
    M['sWater'] = emission_mat('StreakWater', (0.25, 0.85, 1.0, 1), 9.0, attr_col='blow')
    M['sMelt'] = emission_mat('StreakMelt', (1.0, 0.55, 0.15, 1), 14.0)
    M['sAir'] = emission_mat('StreakAir', (0.92, 0.96, 1.0, 1), 8.0)
    M['sSeep'] = emission_mat('StreakSeep', (0.3, 0.8, 1.0, 1), 6.0)
    # cut caps
    M['capOrange'] = cap_mat('CapOrange', rgb(0xa44c26), 1.0)
    M['capInsert'] = cap_mat('CapInsert', rgb(0xb5582c), -1.0)
    M['capSteel'] = cap_mat('CapSteel', rgb(0x9aa3ad), 1.0, glow=0.06)
    M['capDark'] = cap_mat('CapDark', rgb(0x3b4148), 1.0, thermal=False, glow=0.05)
    M['capBrass'] = cap_mat('CapBrass', rgb(0xc8a060), 1.0, thermal=False)
    M['capRubber'] = cap_mat('CapRubber', rgb(0x1c1d20), 1.0, thermal=False, glow=0.0)
    M['capCrust'] = cap_mat('CapCrust', rgb(0xcdb78c), -1.0, thermal=False)
    M['capPlastic'] = shot_mat('ShotCap', cap=True)
    M['capWater'] = water_mat('WaterCap', cap=True)
    M['capMelt'] = cap_mat('CapMelt', rgb(0xff7a2a), 1.0, thermal=False, glow=0.9)
    M['capDirt'] = cap_mat('CapDirt', rgb(0x4a3018), 1.0, thermal=False, glow=0.05)
    return M


# ---------------------------------------------------------------- thermal maps of the section (numpy relaxation)
def thermal_maps():
    """Steady temperature of the section plane: hot parts, cold water channels, steel conducts, air holds ambient.
    'scaled' insulates the top A circuit (scale) → a hot spot around the top cavity."""
    import numpy as np
    W, H = 360, 460                                      # x -1.3..2.3, z -2.3..2.3 at 0.01
    xs = np.linspace(-1.3, 2.3, W)[None, :]
    zs = np.linspace(-2.3, 2.3, H)[:, None]
    steel = ((xs > -1.05) & (xs < 0.9) & (np.abs(zs) < 1.8)) | ((xs > -1.05) & (xs < -0.7) & (np.abs(zs) < 2.2))
    steel |= (xs > 0.9) & (xs < 1.8) & (np.abs(zs) > 1.4) & (np.abs(zs) < 1.8)
    steel |= (xs > 1.8) & (xs < 2.15) & (np.abs(zs) < 2.2)
    part = np.zeros((H, W), bool)
    for cz in (1.05, -1.05):
        dz = np.abs(zs - cz)
        cup = ((xs > X_BASE) & (xs < X_FL) & (dz < R_OUT)) | ((xs > X_FL) & (xs < 0.0) & (dz < R_FL))
        core = (xs > X_CORE) & (dz < R_IN)
        part |= cup & ~core
    part |= (np.abs(zs) < 0.035) & (np.abs(xs) < 0.035) | ((np.abs(zs) < 0.04) & (xs > -1.0) & (xs < 0))

    def chan(x0, z0, z1, r=0.05):
        return (np.abs(xs - x0) < r) & (zs > min(z0, z1)) & (zs < max(z0, z1))
    maps = {}
    for key, kA in (('ok', 1.0), ('scaled', 0.25)):
        T = np.full((H, W), 0.18)
        cold = np.zeros((H, W)); wc = np.zeros((H, W), bool)
        for sgn in (1, -1):
            for x0, kk in ((-0.36, kA if sgn > 0 else 1.0), (0.24, 1.0)):
                m = chan(x0, sgn * 0.52, sgn * 1.8) | ((np.abs(xs - x0) < 0.045) & (np.abs(zs - sgn * 1.405) < 0.03)) | ((np.abs(xs - x0) < 0.045) & (np.abs(zs - sgn * 0.695) < 0.03))
                wc |= m
                cold[m] = 0.08 + (1 - kk) * 0.55
        for _ in range(2500):
            Tn = 0.25 * (np.roll(T, 1, 0) + np.roll(T, -1, 0) + np.roll(T, 1, 1) + np.roll(T, -1, 1))
            T = np.where(steel, Tn, 0.16)
            T[part] = 0.95
            T[wc] = cold[wc]
        T = np.clip(T, 0, 1)
        # written to gen/ as 16-bit PNGs and loaded back (generated images do not survive a save reliably)
        rgba = np.zeros((H, W, 4), np.float32)
        rgba[..., 0] = rgba[..., 1] = rgba[..., 2] = T
        rgba[..., 3] = 1
        tmp = bpy.data.images.new('_thermal_' + key, W, H, float_buffer=True)
        tmp.pixels.foreach_set(rgba.ravel())
        path = os.path.join(GEN, 'thermal_%s.png' % key)
        os.makedirs(GEN, exist_ok=True)
        tmp.filepath_raw = path
        tmp.file_format = 'PNG'
        SC.render.image_settings.color_depth = '16'
        tmp.save()
        bpy.data.images.remove(tmp)
        img = bpy.data.images.load(path)
        img.name = 'thermal_' + key
        img.colorspace_settings.name = 'Non-Color'
        maps[key] = img
        print('thermal', key, 'min %.2f max %.2f mean %.2f' % (T.min(), T.max(), T.mean()))
    return maps


THERMAL_IMG.update(thermal_maps())
M = build_materials()


# ================================================================ geometry
def solid(name, bm, mat, col='mould', rig=None, cut='orange', smooth=35, machine=False):
    ob = obj_from_bm(name, bm, COL[col], mat, smooth)
    return put(ob, rig, cut, machine)


def cx(x0, x1, y, z, r, segs=48, r1=None):
    return bm_cyl((x0, y, z), (x1, y, z), r, segs, r1)


def cz(z0, z1, x, y, r, segs=32):
    return bm_cyl((x, y, z0), (x, y, z1), r, segs)


def cy(y0, y1, x, z, r, segs=32):
    return bm_cyl((x, y0, z), (x, y1, z), r, segs)


def ring_x(x0, x1, y, z, rin, rout, segs=64):
    return bm_tube((x0, y, z), (x1, y, z), rin, rout, segs)


def _bake(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    me = ob.data
    bpy.data.objects.remove(ob)
    bpy.data.meshes.remove(me)
    return bm


def subtract(bm_base, cutter_bms):
    ob = temp_obj(bm_base, '_w')
    bool_apply(ob, [temp_obj(b) for b in cutter_bms], 'DIFFERENCE')
    return _bake(ob)


def union(bms):
    ob = temp_obj(bms[0], '_u')
    if len(bms) > 1:
        bool_apply(ob, [temp_obj(b) for b in bms[1:]], 'UNION')
    return _bake(ob)


def intersect(bm_a, bm_b):
    ob = temp_obj(bm_a, '_i')
    bool_apply(ob, [temp_obj(bm_b)], 'INTERSECT')
    return _bake(ob)


def strip_along(y0, z0, y1, z1, xa, xb, w):
    """box on the parting plane from (y0,z0) to (y1,z1), width w across, x from xa to xb"""
    d = Vector((0, y1 - y0, z1 - z0))
    n = Vector((0, d.z, -d.y)).normalized() * w       # right-handed (positive determinant): faces stay outward
    bm = bm_box(xa, xb, -0.5, 0.5, 0, 1)
    lib.bm_transform(bm, Matrix(((1, 0, 0, 0), (0, n.y, d.y, y0), (0, n.z, d.z, z0), (0, 0, 0, 1))))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def drills(xc):
    """cooling drillings of one plate: the in-plane U circuits above and below the sprue (down the section plane,
    across, back up behind it) and the short front/back drillings of the out-of-plane cavities"""
    out = []
    for s in (1, -1):
        out.append(cz(s * 0.52, s * (PLATE + 0.05), xc, 0.0, CH_R))
        out.append(cy(-0.0001, PLATE + 0.05, xc, s * 0.52, CH_R))
        out.append(cz(s * 0.47, s * (PLATE + 0.05), xc, 0.5, CH_R))
        out.append(bm_sphere((xc, 0.0, s * 0.52), CH_R, 24, 12))
    for sy in (-1, 1):
        for zz in (0.2, -0.2):
            out.append(cy(sy * 1.3, sy * (PLATE + 0.05), xc, zz, CH_R))
    return out


def ports(xc):
    """(point on the face, outward normal, in/out) for every water connection of a plate"""
    P = []
    for s in (1, -1):
        P.append(((xc, 0.0, s * PLATE), (0, 0, s), 'in'))
        P.append(((xc, 0.5, s * PLATE), (0, 0, s), 'out'))
    for sy in (-1, 1):
        P.append(((xc, sy * PLATE, 0.2), (0, sy, 0), 'in'))
        P.append(((xc, sy * PLATE, -0.2), (0, sy, 0), 'out'))
    return P


def vent_cutters():
    """vent land (1.2 mm deep, drawn ~40× real) then a relief channel to the plate edge, ground into the A face:
    one at each cavity's last-to-fill edge (opposite the gate) and one each side"""
    out = []
    ext = PLATE + 0.05
    for c, (cyy, czz) in CAV.items():
        dy, dz = DIRS[c]
        for side in (0.0, 1.0, -1.0):
            if side == 0.0:
                uy, uz = dy, dz
            else:
                uy, uz = -dz * side, dy * side
            y0, z0 = cyy + uy * (R_FL - 0.02), czz + uz * (R_FL - 0.02)
            y1, z1 = cyy + uy * (R_FL + 0.05), czz + uz * (R_FL + 0.05)
            k = min(((ext - abs(y1)) / abs(uy)) if uy else 99, ((ext - abs(z1)) / abs(uz)) if uz else 99)
            y2, z2 = y1 + uy * k, z1 + uz * k
            out.append(strip_along(y0, z0, y1, z1, -0.012, 0.002, 0.05))
            out.append(strip_along(y1, z1, y2, z2, -0.035, 0.002, 0.07))
    return out


def gate_cutters():
    out = []
    for c in CAV:
        (y0, z0), (y1, z1) = at(c, 0.64), at(c, 1.05 - R_FL + 0.02)
        out.append(strip_along(y0, z0, y1, z1, -0.018, 0.001, 0.05))
    return out


def runner_cutters(r=0.035):
    out = []
    for c in CAV:
        y, z = at(c, 0.66)
        out.append(bm_cyl((0, 0, 0), (0, y, z), r, 24))
        out.append(bm_sphere((0, y, z), r, 24, 12))
    return out


# ---------------------------------------------------------------- fixed half
def build_fixed():
    bm = bm_box(-1.05, -0.70, -PLATE, PLATE, -CLAMP_Z, CLAMP_Z, 0.012)
    cuts = [cx(-1.06, -0.85, 0, 0, 0.212, 64), cx(-0.9, -0.69, 0, 0, 0.122, 48)]
    for zz in (1.62, -1.62):
        cuts += [cx(-1.06, -0.93, 0, zz, 0.095, 32), cx(-0.94, -0.69, 0, zz, 0.062, 24)]
    solid('ClampPlateFixed', subtract(bm, cuts), M['clamp'], rig='fixed', cut='orange')
    for zz in (1.62, -1.62):
        hb = subtract(union([cx(-1.04, -0.93, 0, zz, 0.09, 32), cx(-0.93, -0.5, 0, zz, 0.06, 24)]), [cx(-1.05, -1.0, 0, zz, 0.035, 6)])
        solid('BoltFixed%+.0f' % zz, hb, M['pin'], rig='fixed', cut='steel')
    ring = subtract(ring_x(-1.20, -1.05, 0, 0, 0.22, 0.5, 96), [cx(-1.21, -1.04, 0, sz * 0.38, 0.05, 24) for sz in (1, -1)])
    solid('LocatingRing', ring, M['plate'], rig='fixed', cut='steel')
    for sz in (1, -1):
        solid('RingScrew%+d' % sz, subtract(cx(-1.2, -1.08, 0, sz * 0.38, 0.045, 24), [cx(-1.21, -1.17, 0, sz * 0.38, 0.022, 6)]), M['pin'], rig='fixed', cut='steel')
    head = union([cx(-1.05, -0.85, 0, 0, 0.21, 64), cx(-0.85, 0.0, 0, 0, 0.12, 64)])
    sprue = cx(-1.07, 0.002, 0, 0, 0.02, 32, r1=0.0452)
    seat = bm_sphere((-1.205, 0, 0), 0.19, 48, 24)
    solid('SprueBushing', subtract(head, [sprue, seat]), M['insert'], rig='fixed', cut='steel')
    anchor('locRing', (-1.13, 0, 0.4), 'fixed')
    anchor('bushing', (-0.45, 0, 0.12), 'fixed')


def build_a():
    bm = bm_box(-0.70, 0.0, -PLATE, PLATE, -PLATE, PLATE, 0.012)
    cuts = [cx(-0.56, 0.01, cyy, czz, R_INS + 0.002, 96) for cyy, czz in CAV.values()]
    cuts += [cx(-0.71, 0.01, 0, 0, 0.122, 48)]
    for py, pz in PILLARS:
        cuts += [cx(-0.71, 0.01, py, pz, 0.122, 48), cx(-0.71, -0.615, py, pz, 0.168, 48)]
    for zz in (1.62, -1.62):
        cuts.append(cx(-0.71, -0.48, 0, zz, 0.062, 24))
    cuts += drills(XA_CH) + runner_cutters() + gate_cutters() + vent_cutters()
    solid('PlateA', subtract(bm, cuts), M['plate'], rig='a', cut='orange')
    plugs = [cy(PLATE - 0.1, PLATE, XA_CH, s * 0.52, CH_R + 0.001, 32) for s in (1, -1)]
    solid('PlugsA', bm_merge(*plugs), M['brass'], rig='a', cut='brass')
    for c, (cyy, czz) in CAV.items():
        ins = cx(-0.55, 0.0, cyy, czz, R_INS, 96)
        cav = union([cx(X_BASE, 0.01, cyy, czz, R_OUT, 96), cx(X_FL, 0.01, cyy, czz, R_FL, 96)])
        groove = ring_x(-0.40, -0.32, cyy, czz, 0.33, 0.40, 96)
        og = [ring_x(x0, x0 + 0.032, cyy, czz, 0.352, 0.40, 96) for x0 in (-0.48, -0.272)]
        bm = subtract(ins, [cav, groove] + og + gate_cutters() + vent_cutters())
        ob = solid('InsertA_' + c, bm, M['insert'], rig='ains', cut='insert')
        ob.data.materials.append(M['cavity'])
        for f in ob.data.polygons:
            ctr = f.center
            r = math.hypot(ctr.y - cyy, ctr.z - czz)
            if r < R_FL + 0.004 and X_BASE - 0.003 < ctr.x < -0.0005:
                f.material_index = 1
        for x0 in (-0.464, -0.256):
            solid('ORingA_%s%+.2f' % (c, x0), bm_torus((x0, cyy, czz), (1, 0, 0), 0.366, 0.0158, 96, 16), M['oring'], rig='ains', cut='rubber')
    anchor('cavPlate', (-0.45, 0, 1.55), 'a'); anchor('cavSurf', (-0.25, 0, 1.12), 'ains')
    anchor('cavBot', (-0.14, 0, -1.05), 'ains'); anchor('partingTop', (0.0, 0, 1.62), 'a')
    anchor('airTop', (-0.12, 0, 1.25), 'ains'); anchor('frontTop', (-0.2, 0, 1.0), 'ains')
    anchor('ventTop', (-0.003, 0, 1.43), 'a'); anchor('ventOut', (-0.012, 0, 1.72), 'a'); anchor('ventLand', (-0.003, 0, 1.385), 'ains')
    anchor('chanA', (XA_CH, 0, 1.62), 'a'); anchor('fitA', (XA_CH, 0, 2.0), 'a'); anchor('oringA', (-0.256, 0, 1.416), 'ains')
    anchor('plateout', (-0.15, -0.12, 1.15), 'ains'); anchor('drops', (0.0, 0.1, 1.45), 'a'); anchor('hotSpot', (-0.2, 0, 1.3), 'a')
    anchor('seep', (-0.12, 0.0, 1.432), 'ains'); anchor('damage', (0.0, 0.0, 1.39), 'a'); anchor('ventFace', (0.0, -0.55, 1.05), 'a')
    anchor('partingFace', (0.0, -0.6, 0.45), 'a'); anchor('mouldFront', (-0.35, -PLATE, 0.2), 'a'); anchor('fixedHalf', (-0.6, 0, 1.9), 'a')


def build_pillars():
    for py, pz in PILLARS:
        tag = '%s%s' % ('K' if py > 0 else 'F', 'T' if pz > 0 else 'B')
        bm = union([cx(-0.70, -0.62, py, pz, 0.165, 48), cx(-0.62, 0.44, py, pz, 0.12, 48), cx(0.44, 0.5, py, pz, 0.12, 48, r1=0.09)])
        ob = solid('Pillar_' + tag, bm, M['pillar'], rig='a', cut='steel')
        bo = solid('Bush_' + tag, ring_x(0.0, 0.55, py, pz, 0.122, 0.17, 64), M['bush'], rig='b', cut='steel')
        if py > 0 and pz > 0:   # the pair the pillar section shows: worn variants swap in with pillarWear
            ob.name, bo.name = 'PillarGood', 'BushGood'
            wbm = union([cx(-0.70, -0.62, py, pz, 0.165, 48), cx(-0.62, 0.44, py, pz, 0.108, 48), cx(0.44, 0.5, py, pz, 0.108, 48, r1=0.085)])
            solid('PillarWorn', wbm, M['pillar'], rig='a', cut='steel')
            hole = bm_cyl((-0.01, py, pz), (0.56, py, pz), 0.122, 64)
            lib.bm_transform(hole, Matrix.Translation((0, py, pz)) @ Matrix.Diagonal((1, 1, 1.18, 1)) @ Matrix.Translation((0, -py, -pz)))
            solid('BushWorn', subtract(bm_cyl((0.0, py, pz), (0.55, py, pz), 0.17, 64), [hole]), M['bush'], rig='b', cut='steel')
    anchor('pillar', (0.3, 1.45, 1.45), 'a'); anchor('bush', (0.35, 1.45, 1.63), 'b'); anchor('pillarTop', (0.3, -1.45, 1.45), 'a')
    anchor('partingPillar', (0.0, 1.45, 1.62), 'a')


# ---------------------------------------------------------------- moving half
def build_b():
    bm = bm_box(0.0, 0.55, -PLATE, PLATE, -PLATE, PLATE, 0.012)
    cuts = [cx(-0.01, 0.45, cyy, czz, R_INS + 0.002, 96) for cyy, czz in CAV.values()]
    for c in CAV:
        cuts += [cx(0.44, 0.56, py, pz, PIN_R + 0.003, 24) for py, pz in pins_of(c)]
    for py, pz in RETURNS:
        cuts.append(cx(-0.01, 0.56, py, pz, 0.065, 32))
    for py, pz in PILLARS:
        cuts.append(cx(-0.01, 0.56, py, pz, 0.172, 48))
    cuts += [cx(0.07, 0.56, 0, 0, 0.037, 32), cx(-0.01, 0.0801, 0, 0, 0.04, 32, r1=0.0505)]
    cuts += drills(XB_CH) + runner_cutters()
    solid('PlateB', subtract(bm, cuts), M['plate'], rig='b', cut='orange')
    solid('PlugsB', bm_merge(*[cy(PLATE - 0.1, PLATE, XB_CH, s * 0.52, CH_R + 0.001, 32) for s in (1, -1)]), M['brass'], rig='b', cut='brass')
    for c, (cyy, czz) in CAV.items():
        ins = union([cx(0.0, 0.45, cyy, czz, R_INS, 96), cx(X_CORE, 0.001, cyy, czz, R_IN, 96)])
        groove = ring_x(0.20, 0.28, cyy, czz, 0.33, 0.40, 96)
        og = [ring_x(x0, x0 + 0.032, cyy, czz, 0.352, 0.40, 96) for x0 in (0.112, 0.336)]
        holes = [cx(-0.3, 0.46, py, pz, PIN_R + 0.003, 24) for py, pz in pins_of(c)]
        ob = solid('InsertB_' + c, subtract(ins, [groove] + og + holes), M['insert'], rig='bins', cut='insert')
        ob.data.materials.append(M['core'])
        for f in ob.data.polygons:
            if f.center.x < -0.0008:
                f.material_index = 1
        for x0 in (0.128, 0.352):
            solid('ORingB_%s%+.2f' % (c, x0), bm_torus((x0, cyy, czz), (1, 0, 0), 0.366, 0.0158, 96, 16), M['oring'], rig='bins', cut='rubber')
    anchor('corePlate', (0.3, 0, 1.55), 'b'); anchor('coreSurf', (-0.2, 0, 1.05), 'bins'); anchor('chanB', (XB_CH, 0, 1.62), 'b')
    anchor('condense', (0.0, 0.6, -0.5), 'b'); anchor('rust', (-0.15, -0.15, 1.05), 'bins'); anchor('stripTop', (0.3, 0, 1.95), 'b')


def build_support_spacers():
    bm = bm_box(0.55, 0.90, -PLATE, PLATE, -PLATE, PLATE, 0.012)
    cuts = []
    for c in CAV:
        cuts += [cx(0.54, 0.91, py, pz, PIN_R + 0.003, 24) for py, pz in pins_of(c)]
    for py, pz in RETURNS:
        cuts += [cx(0.54, 0.91, py, pz, 0.065, 32), cx(0.80, 0.91, py, pz, 0.125, 48)]
    cuts.append(cx(0.54, 0.91, 0, 0, 0.037, 32))
    solid('SupportPlate', subtract(bm, cuts), M['support'], rig='support', cut='orange')
    for s in (1, -1):
        sb = bm_box(0.90, 1.80, -PLATE, PLATE, min(s * 1.4, s * PLATE), max(s * 1.4, s * PLATE), 0.012)
        solid('SpacerBlock%+d' % s, subtract(sb, [cx(0.89, 1.81, 0, s * 1.6, 0.062, 24)]), M['clamp'], rig='spacer', cut='orange')
    anchor('spacer', (1.35, 0, 1.6), 'spacer')


def build_ejector():
    ret = bm_box(1.40, 1.55, -1.6, 1.6, -1.32, 1.32, 0.008)
    cuts = []
    for c in CAV:
        for py, pz in pins_of(c):
            cuts += [cx(1.39, 1.56, py, pz, PIN_R + 0.003, 24), cx(1.515, 1.56, py, pz, 0.05, 32)]
    for py, pz in RETURNS:
        cuts += [cx(1.39, 1.56, py, pz, 0.062, 32), cx(1.505, 1.56, py, pz, 0.095, 48)]
    cuts += [cx(1.39, 1.56, 0, 0, 0.037, 32), cx(1.515, 1.56, 0, 0, 0.06, 32)]
    solid('RetainerPlate', subtract(ret, cuts), M['support'], rig='ejector', cut='orange')
    solid('EjectorPlate', bm_box(1.55, 1.75, -1.6, 1.6, -1.32, 1.32, 0.008), M['support'], rig='ejector', cut='orange')
    pins = []
    for c in CAV:
        for py, pz in pins_of(c):
            if c == 'T' and abs(py) < 1e-6 and (abs(pz - 1.33) < 1e-6 or abs(pz - 0.77) < 1e-6):
                continue
            pins.append(union([cx(0.0, 1.52, py, pz, PIN_R, 24), cx(1.52, 1.55, py, pz, 0.045, 32)]))
    solid('EjectorPins', bm_merge(*pins), M['pin'], rig='ejector', cut='steel')
    solid('PinP1', union([cx(0.0, 1.52, 0, 1.33, PIN_R, 24), cx(1.52, 1.55, 0, 1.33, 0.045, 32)]), M['pin1'], rig='pin1', cut='steel')
    solid('PinP2', union([cx(0.0, 1.52, 0, 0.77, PIN_R, 24), cx(1.52, 1.55, 0, 0.77, 0.045, 32)]), M['pin'], rig='ejector', cut='steel')
    solid('PinP2Broken', union([cx(0.34, 1.52, 0, 0.77, PIN_R, 24), cx(1.52, 1.55, 0, 0.77, 0.045, 32)]), M['pin'], rig='ejector', cut='steel')
    solid('SpruePuller', union([cx(0.08, 1.52, 0, 0, 0.035, 32), cx(1.52, 1.55, 0, 0, 0.055, 32)]), M['pin'], rig='ejector', cut='steel')
    rp = [union([cx(0.0, 1.51, py, pz, 0.06, 32), cx(1.51, 1.55, py, pz, 0.09, 48)]) for py, pz in RETURNS]
    solid('ReturnPins', bm_merge(*rp), M['pin'], rig='ejector', cut='steel')
    # die springs round the return pins: origin at the retainer face, the coil runs back 0.6 to its seat; scaled in X
    for py, pz in RETURNS:
        turns, n = 7.0, 7 * 24
        pts = [(-0.6 * (i / n), 0.1 * math.cos(TAU * turns * i / n), 0.1 * math.sin(TAU * turns * i / n)) for i in range(n + 1)]
        ob = obj_from_bm('Spring_%s%s' % ('K' if py > 0 else 'F', 'T' if pz > 0 else 'B'), lib.bm_sweep(pts, 0.017, 0.0, 10), COL['mould'], M['spring'], 50)
        ob.location = (1.40, py, pz)
        put(ob, 'ejector', 'steel')
        ob['spring'] = 1
    stops = [cx(1.75, 1.80, py, pz, 0.07, 32) for py in (-1.1, 0.0, 1.1) for pz in (-0.95, 0.95)]
    solid('StopButtons', bm_merge(*stops), M['pin'], rig='mcp', cut='steel')
    anchor('puller', (0.3, 0, 0.0), 'ejector'); anchor('ejPlates', (1.57, 0, 0.6), 'ejector')
    anchor('pinTop', (0.6, 0, 1.33), 'pin1'); anchor('pinBroken', (0.6, 0, 0.77), 'ejector')
    anchor('retPin', (1.15, 1.3, 1.15), 'ejector'); anchor('spring', (1.1, 1.3, 1.27), 'ejector')


def build_mcp():
    bm = bm_box(1.80, 2.15, -PLATE, PLATE, -CLAMP_Z, CLAMP_Z, 0.012)
    cuts = [cx(1.79, 2.16, 0, 0, 0.2, 48)]
    for zz in (1.6, -1.6):
        cuts += [cx(1.99, 2.16, 0, zz, 0.095, 32), cx(1.79, 2.0, 0, zz, 0.062, 24)]
    solid('ClampPlateMoving', subtract(bm, cuts), M['clamp'], rig='mcp', cut='orange')
    for zz in (1.6, -1.6):
        hb = subtract(union([cx(2.0, 2.14, 0, zz, 0.09, 32), cx(1.2, 2.0, 0, zz, 0.06, 24)]), [cx(2.1, 2.15, 0, zz, 0.035, 6)])
        solid('BoltMoving%+.0f' % zz, hb, M['pin'], rig='mcp', cut='steel')


# ---------------------------------------------------------------- water: fittings, hoses, water in the channels, scale
def hose_path(p, n, kind, xc):
    p, n = Vector(p), Vector(n)
    tip = p + n * 0.22
    if abs(n.z) > 0.5:                      # top / bottom ports: up (down) and away behind the machine
        s = n.z
        y_end = 3.4 if kind == 'in' else 3.0
        return [tip, tip + n * 0.28, Vector((xc, p.y + 0.9, s * 2.78)), Vector((xc, 2.0 + p.y, s * 3.08)), Vector((xc, y_end, s * 3.3))]
    s = n.y                                 # front / back ports: out, sideways, then up (in) or down (out)
    dx = 0.5 if xc > 0 else -0.5
    zz = 2.7 if kind == 'in' else -2.75
    return [tip, tip + n * 0.12, Vector((xc + dx, s * 2.1, p.z + (0.15 if kind == 'in' else -0.15))), Vector((xc + dx, s * 2.1, zz)), Vector((xc + dx, s * 1.2, zz * 1.18))]


def build_water(xc, rig, rig_ins, tag):
    fit_bms, hoses_in, hoses_out = [], [], []
    for p, n, kind in [q for q in ports(xc) if abs(q[1][2]) > 0.5]:
        p, n = Vector(p), Vector(n)
        f = union([bm_cyl(p - n * 0.005, p + n * 0.075, 0.075, 6), bm_cyl(p + n * 0.07, p + n * 0.23, 0.045, 24), bm_cyl(p + n * 0.15, p + n * 0.19, 0.052, 24)])
        fit_bms.append(subtract(f, [bm_cyl(p - n * 0.01, p + n * 0.24, 0.028, 24)]))
        hb = lib.bm_sweep(lib.rounded_path(hose_path(p, n, kind, xc), 0.28), 0.055, 0.034, 20)
        (hoses_in if kind == 'in' else hoses_out).append(hb)
    solid('Fittings' + tag, bm_merge(*fit_bms), M['brass'], rig=rig, cut='brass')
    solid('HosesIn' + tag, bm_merge(*hoses_in), M['hoseBlue'], rig=rig, cut='rubber', smooth=60)
    solid('HosesOut' + tag, bm_merge(*hoses_out), M['hoseRed'], rig=rig, cut='rubber', smooth=60)
    # water in the in-plane U circuits — translucent, cut by the section
    wr = CH_R - 0.003
    parts = []
    for s in (1, -1):
        parts += [cz(s * 0.52, s * (PLATE + 0.2), xc, 0.0, wr), cy(0.0, 0.5, xc, s * 0.52, wr), cz(s * 0.475, s * (PLATE + 0.2), xc, 0.5, wr),
                  bm_sphere((xc, 0.0, s * 0.52), wr, 24, 12), bm_sphere((xc, 0.5, s * 0.52), wr, 24, 12)]
    ins_cut = [cx(-0.6, 0.5, CAV[c][0], CAV[c][1], R_INS + 0.0005, 96) for c in ('T', 'B')]
    solid('Water' + tag, subtract(union(parts), ins_cut), M['water'], col='flow', rig=rig, cut='water', smooth=60)
    gx0, gx1 = (-0.40, -0.32) if xc < 0 else (0.20, 0.28)
    rings = [ring_x(gx0 + 0.004, gx1 - 0.004, CAV[c][0], CAV[c][1], 0.334, R_INS - 0.002, 96) for c in ('T', 'B')]
    solid('WaterGroove' + tag, bm_merge(*rings), M['water'], col='flow', rig=rig_ins, cut='water', smooth=60)


def build_scale():
    """scale + rust crust in the top A circuit: 4 nested layers revealed one by one"""
    out = []
    radii = [(0.0432, 0.0496), (0.0364, 0.0432), (0.0302, 0.0364), (0.025, 0.0302)]
    gx0, gx1 = -0.40, -0.32
    for k, (ri, ro) in enumerate(radii):
        segs = [bm_tube((XA_CH, 0.0, 1.425), (XA_CH, 0.0, PLATE + 0.005), ri, ro, 40), bm_tube((XA_CH, 0.0, 0.52), (XA_CH, 0.0, 0.672), ri, ro, 40)]
        ob = solid('Scale%d' % k, bm_merge(*segs), M['crust'], rig='a', cut='crust', smooth=50)
        gr = [ring_x(gx0 + 0.001, gx1 - 0.001, 0.0, 1.05, 0.331 + 0.006 * k, 0.337 + 0.006 * k, 96),
              ring_x(gx0 + 0.001, gx1 - 0.001, 0.0, 1.05, R_INS - 0.007 - 0.006 * k, R_INS - 0.001 - 0.006 * k, 96)]
        og = solid('ScaleGroove%d' % k, bm_merge(*gr), M['crust'], rig='ains', cut='crust', smooth=50)
        out.append((k, ob, og))
    return out


# ---------------------------------------------------------------- the shot: sprue + cold slug + runners + gates + 4 cups
def build_shot():
    parts = [cx(-1.015, 0.0, 0, 0, 0.02, 32, r1=0.045), cx(-0.002, 0.08, 0, 0, 0.0398, 32, r1=0.0503)]
    parts += runner_cutters(0.0348)
    for c, (cyy, czz) in CAV.items():
        (y0, z0), (y1, z1) = at(c, 0.645), at(c, 1.05 - R_FL + 0.012)
        parts.append(strip_along(y0, z0, y1, z1, -0.0175, 0.0, 0.049))
        cup = subtract(union([cx(X_FL, 0.0, cyy, czz, R_FL, 96), cx(X_BASE, X_FL + 0.001, cyy, czz, R_OUT, 96)]), [cx(X_CORE, 0.01, cyy, czz, R_IN, 96)])
        parts.append(cup)
    shot = obj_from_bm('Shot', union(parts), COL['shot'], M['shot'], 40)
    put(shot, None, 'plastic')
    for c in ('T', 'B'):
        cyy, czz = CAV[c]
        ob = obj_from_bm('Flash_' + c, ring_x(-0.007, 0.0, 0, 0, 0.296, 0.40, 96), COL['shot'], M['flash' + c], 0)
        ob.parent = shot
        ob.location = (0, cyy, czz)
        put(ob, None, 'flash' + c)
    ap = obj_from_bm('AirPocket', bm_sphere((0, 0, 0), 0.016, 24, 12, (1.2, 1.0, 1.0)), COL['shot'], M['airglow'], 0)
    ap.location = (-0.02, 0.0, 1.335)
    for name, p in (('shotFlash', (-0.015, 0, -1.36)), ('shotBurn', (-0.06, 0, 1.30)), ('shotShort', (-0.2, 0.05, 1.22)), ('shotDrag', (-0.14, -1.30, 0.0)),
                    ('shotTopTable', (-0.25, 0, 1.05)), ('partTop', (-0.13, 0, 1.30)), ('partDrop', (-0.1, 0, -1.05)), ('runner', (0.0, 0, 0.42)),
                    ('sprue', (-0.6, 0, 0)), ('gateTop', (-0.01, 0, 0.70)), ('slug', (0.04, 0, 0)), ('burnTop', (-0.05, 0, 1.31)),
                    ('shortTop', (-0.2, 0, 1.2)), ('flashTop', (-0.002, 0, 1.37))):
        anchor(name, p, 'shot')
    anchor('airPocket', (-0.02, 0, 1.335), '')
    return shot, ap


def build_details():
    # vent residue: grows into the vents of every cavity (scaled in X from the parting face)
    dirt = []
    for c in CAV:
        (y0, z0), (y1, z1) = at(c, 1.05 + R_FL - 0.01), at(c, 1.05 + R_FL + 0.25)
        dirt.append(strip_along(y0, z0, y1, z1, -0.0115, 0.0, 0.046))
    solid('VentResidue', bm_merge(*dirt), M['ventdirt'], rig='a', cut='dirt', smooth=0)
    # water drops at the parting line round the top insert (leaking O-ring)
    drops = []
    for i, a in enumerate((62, 70, 78, 86)):
        r = R_INS + 0.012
        drops.append(bm_sphere((0.006, r * math.cos(math.radians(a)), 1.05 + r * math.sin(math.radians(a))), 0.016 + 0.004 * (i % 3), 20, 10, (0.45, 1.0, 1.25)))
    d = obj_from_bm('LeakDrops', bm_merge(*drops), COL['extras'], M['droplet'], 60)
    put(d, 'a', 'water')
    # parting-line damage: dents at the top cavity's flange edge
    dents = [bm_sphere((0.0, 0.338 * math.cos(math.radians(a)), 1.05 + 0.338 * math.sin(math.radians(a))), 0.014, 16, 8, (0.35, 1.3, 1.0)) for a in (78, 96, 109)]
    dd = obj_from_bm('Dents', bm_merge(*dents), COL['extras'], M['dent'], 0)
    put(dd, 'ains', 'dark')
    # shot counter on the A plate's operator face, and the tool nameplate
    cnt = obj_from_bm('ShotCounter', bm_merge(bm_box(-0.48, -0.06, -PLATE - 0.15, -PLATE, -1.38, -1.02, 0.012), cx(-0.06, 0.02, -PLATE - 0.08, -1.12, 0.022, 16)), COL['mould'], M['paintDark'], 30)
    put(cnt, 'a', None)
    cnt['frontface'] = 1           # on the cut-away operator face: hidden in section views rather than cut
    rivets = [bm_sphere((x, -PLATE - 0.012, z), 0.012, 12, 6, (1, 0.5, 1)) for x in (-0.6, -0.1) for z in (0.64, 1.06)]
    np_ = obj_from_bm('Nameplate', bm_merge(bm_box(-0.62, -0.08, -PLATE - 0.012, -PLATE, 0.62, 1.08, 0.004), *rivets), COL['mould'], M['alu'], 30)
    put(np_, 'a', 'steel')
    lines = [('TOOL No. MP-0417', 0.040, 1.0), ('4 CAVITIES · CUP 50 MM', 0.030, 0.93), ('CUSTOMER-OWNED TOOL', 0.030, 0.84),
             ('NO MODIFICATIONS', 0.030, 0.76), ('WITHOUT OWNER APPROVAL', 0.030, 0.70)]
    for i, (txt, size, z) in enumerate(lines):
        cu = bpy.data.curves.new('NP%d' % i, 'FONT')
        cu.body, cu.size, cu.align_x, cu.extrude = txt, size, 'CENTER', 0.0015
        cu.materials.append(M['ink'])
        t = bpy.data.objects.new('_txt', cu)
        COL['mould'].objects.link(t)
        t.location = (-0.35, -PLATE - 0.0135, z)
        t.rotation_euler = (math.radians(90), 0, 0)
        # bake the text to a mesh so the section cut can remove it with the plate face
        dg = bpy.context.evaluated_depsgraph_get()
        me = bpy.data.meshes.new_from_object(t.evaluated_get(dg))
        me.transform(t.matrix_world)
        bpy.data.objects.remove(t)
        mo = bpy.data.objects.new('NPText%d' % i, me)
        COL['mould'].objects.link(mo)
        put(mo, 'a', None)
        mo['frontface'] = 1
    anchor('counter', (-0.25, -PLATE - 0.15, -1.2), 'a'); anchor('nameplate', (-0.35, -PLATE - 0.012, 0.85), 'a')
    return cnt


# ---------------------------------------------------------------- the machine
def build_machine():
    TB = [(sy * 2.45, sz * 2.45) for sy in (-1, 1) for sz in (-1, 1)]
    fp = subtract(bm_box(-1.85, -1.05, -3.0, 3.0, -3.0, 3.0, 0.035), [cx(-1.9, -1.0, 0, 0, 0.505, 96)] + [cx(-1.9, -1.0, y, z, 0.235, 48) for y, z in TB])
    solid('FixedPlaten', fp, M['paint'], col='machine', cut='dark', machine=True)
    mp = subtract(bm_box(2.15, 2.95, -3.0, 3.0, -3.0, 3.0, 0.035), [cx(2.1, 3.0, 0, 0, 0.2, 48)] + [cx(2.1, 3.0, y, z, 0.25, 48) for y, z in TB])
    solid('MovingPlaten', mp, M['paint'], col='machine', rig='platen', cut='dark', machine=True)
    solid('Ram', cx(2.95, 6.5, 0, 0, 0.6, 96), M['chrome'], col='machine', rig='platen', cut='dark', machine=True)
    rp = subtract(bm_box(6.0, 6.8, -3.0, 3.0, -3.0, 3.0, 0.035), [cx(5.9, 6.9, 0, 0, 0.62, 96)] + [cx(5.9, 6.9, y, z, 0.235, 48) for y, z in TB])
    solid('RearPlaten', rp, M['paint'], col='machine', cut='dark', machine=True)
    solid('ClampCylinder', cx(6.8, 8.6, 0, 0, 1.0, 96), M['paint'], col='machine', cut='dark', machine=True)
    solid('TieBars', bm_merge(*[cx(-2.3, 7.25, y, z, 0.22, 64) for y, z in TB]), M['chrome'], col='machine', cut='dark', machine=True)
    solid('TieBarNuts', bm_merge(*[cx(x0, x0 + 0.32, y, z, 0.38, 6) for y, z in TB for x0 in (-2.17, 6.8)]), M['paintDark'], col='machine', cut='dark', machine=True)
    solid('MachineBase', bm_box(-7.6, 8.8, -2.7, 2.7, -4.5, -3.0, 0.05), M['paint'], col='machine', cut='dark', machine=True)
    # injection unit: barrel with heater bands, nozzle, carriage and hopper; melt glowing in the bore
    barrel = subtract(union([cx(-7.0, -2.75, 0, 0, 0.38, 64), cx(-2.75, -2.45, 0, 0, 0.45, 64)]), [cx(-7.1, -2.4, 0, 0, 0.1, 48)])
    solid('Barrel', barrel, M['paintDark'], col='machine', cut='dark', machine=True)
    bands = [ring_x(x0, x0 + 0.3, 0, 0, 0.379, 0.45, 64) for x0 in [-2.75 - 0.45 * (k + 1) for k in range(8)]]
    solid('HeaterBands', bm_merge(*bands), M['heater'], col='machine', cut='steel', machine=True)
    nozzle = intersect(union([cx(-2.45, -1.2, 0, 0, 0.1, 48), bm_sphere((-1.19, 0, 0), 0.17, 48, 24)]), cx(-2.5, -0.9, 0, 0, 0.1001, 48))
    solid('Nozzle', subtract(nozzle, [cx(-2.5, -0.9, 0, 0, 0.015, 24)]), M['heater'], col='machine', cut='steel', machine=True)
    solid('NozzleBand', ring_x(-2.2, -1.5, 0, 0, 0.1, 0.155, 48), M['heater'], col='machine', cut='steel', machine=True)
    solid('MeltCore', union([cx(-7.0, -2.44, 0, 0, 0.099, 48), cx(-2.46, -1.025, 0, 0, 0.0145, 24)]), M['meltcore'], col='machine', cut='melt', machine=True)
    solid('Carriage', bm_box(-6.6, -3.1, -0.7, 0.7, -3.0, -0.46, 0.03), M['paint'], col='machine', cut='dark', machine=True)
    hopper = union([bm_cyl((-6.4, 0, 0.38), (-6.4, 0, 0.9), 0.16, 32), bm_cyl((-6.4, 0, 0.9), (-6.4, 0, 1.9), 0.18, 48, r1=0.6), bm_cyl((-6.4, 0, 1.9), (-6.4, 0, 2.5), 0.6, 48)])
    solid('Hopper', hopper, M['paint'], col='machine', cut='dark', machine=True)
    # mould clamps, top and bottom of both clamp plates
    for side, x_face, x_dir, rig in ((-1, -0.70, 1, None), (1, 1.80, -1, 'platen')):
        clamps = []
        for sz in (1, -1):
            for yy in (-0.9, 0.9):
                x0, x1 = (x_face, x_face + 0.15) if x_dir > 0 else (x_face - 0.15, x_face)
                clamps.append(bm_box(x0, x1, yy - 0.12, yy + 0.12, min(sz * 1.95, sz * 2.75), max(sz * 1.95, sz * 2.75), 0.012))
                hx0, hx1 = (-1.05, x0) if x_dir > 0 else (x1, 2.15)
                clamps.append(bm_box(hx0, hx1, yy - 0.12, yy + 0.12, min(sz * 2.55, sz * 2.75), max(sz * 2.55, sz * 2.75), 0.01))
                bx = x1 + 0.1 if x_dir > 0 else x0 - 0.1
                clamps.append(cx(min(bx, x_face), max(bx, x_face), yy, sz * 2.36, 0.06, 24))
                clamps.append(cx(min(bx, bx - 0.08 * x_dir), max(bx, bx - 0.08 * x_dir), yy, sz * 2.36, 0.1, 6))
        solid('MouldClamps%+d' % side, bm_merge(*clamps), M['paintDark'], col='machine', rig=rig, cut='dark', machine=True)
    solid('KnockoutRod', cx(1.75, 3.6, 0, 0, 0.08, 32), M['pin'], col='machine', rig='rod', cut='steel', machine=True)
    anchor('fixedPlaten', (-1.45, 0, 2.7), ''); anchor('movingPlaten', (2.55, 0, 2.7), 'platen'); anchor('nozzle', (-1.6, 0, 0.1), '')
    anchor('koRod', (2.4, 0, 0.0), 'rod')


def build_stage():
    solid('Floor', bm_box(-40, 40, -40, 40, -4.52, -4.5), M['floor'], col='stage', cut=None, smooth=0)
    tb = subtract(bm_cyl((0, -7.0, -4.5), (0, -7.0, -2.6), 1.6, 128), [bm_cyl((0, -7.0, -2.75), (0, -7.0, -2.55), 0.065, 32)])
    solid('Plinth', tb, M['plinth'], col='stage', cut=None)


print('building geometry…')
build_fixed(); build_a(); build_pillars(); build_b(); build_support_spacers(); build_ejector(); build_mcp()
build_water(XA_CH, 'a', 'ains', 'A'); build_water(XB_CH, 'b', 'bins', 'B')
SCALE_OBJS = build_scale()
SHOT, AIRPOCKET = build_shot()
COUNTER = build_details()
build_machine(); build_stage()
print('geometry done:', len(bpy.data.objects), 'objects')
if ARG.get('geo'):
    bpy.ops.wm.save_as_mainfile(filepath=OUT)
    sys.exit(0)


# ================================================================ section cut: one cutter per cap material, all on CutRig
CUT_RIG = bpy.data.objects.new('CutRig', None)
COL['cut'].objects.link(CUT_RIG)
CAP = {'orange': 'capOrange', 'insert': 'capInsert', 'steel': 'capSteel', 'dark': 'capDark', 'brass': 'capBrass', 'rubber': 'capRubber',
       'crust': 'capCrust', 'plastic': 'capPlastic', 'water': 'capWater', 'melt': 'capMelt', 'dirt': 'capDirt', 'flashT': 'flashT', 'flashB': 'flashB'}
CUTTERS = {}
for key, mk in CAP.items():
    ob = obj_from_bm('Cutter_' + key, bm_box(-40, 40, -80, 0.0, -40, 40), COL['cut'], M[mk], 0)
    ob.parent = CUT_RIG
    ob.hide_render = True
    ob.display_type = 'WIRE'
    CUTTERS[key] = ob
def is_manifold(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    ok = all(e.is_manifold for e in bm.edges)
    bm.free()
    return ok


for ob, key in CUT_OBJS:
    md = ob.modifiers.new('Section', 'BOOLEAN')
    md.operation, md.object, md.material_mode = 'DIFFERENCE', CUTTERS[key], 'TRANSFER'
    if is_manifold(ob):
        md.solver = 'MANIFOLD'          # fast enough to re-cut every frame
    else:
        md.solver = 'EXACT'
        md.use_hole_tolerant = True
        print('exact solver for', ob.name)


# ================================================================ geometry nodes
def gn_tree(name, inputs, outputs=(('Geometry', 'NodeSocketGeometry'),)):
    ng = bpy.data.node_groups.new(name, 'GeometryNodeTree')
    for nm, typ in outputs:
        ng.interface.new_socket(nm, in_out='OUTPUT', socket_type=typ)
    for nm, typ, dflt in inputs:
        s = ng.interface.new_socket(nm, in_out='INPUT', socket_type=typ)
        if dflt is not None:
            s.default_value = dflt
    nb = NB(ng)
    return ng, nb, nb.node('NodeGroupInput'), nb.node('NodeGroupOutput')


def set_menu(sock, value):
    """menu sockets take an item identifier whose case varies between nodes"""
    for cand in (value, value.upper(), value.title(), value.lower(), value.replace(' ', '_').upper()):
        try:
            sock.default_value = cand
            return
        except Exception:
            pass
    print('menu value not found', sock.name, value)


def socket_ids(ng):
    return {it.name: it.identifier for it in ng.interface.items_tree if getattr(it, 'in_out', None) == 'INPUT'}


def set_in(md, name, value):
    """set a geometry-nodes modifier input by its interface name (Blender 5.x: md.properties.inputs.<id>.value)"""
    getattr(md.properties.inputs, socket_ids(md.node_group)[name]).value = value


def in_path(md, name):
    return 'modifiers["%s"].properties.inputs.%s.value' % (md.name, socket_ids(md.node_group)[name])


def rnd(nb, idx, seed, off):
    r = nb.node('FunctionNodeRandomValue', data_type='FLOAT')
    nb.put(idx, r.inputs['ID'])
    nb.put(nb.math('ADD', seed, float(off)), r.inputs['Seed'])
    return N(nb, r.outputs['Value'])


def flow_group():
    """Glowing streaks riding along path curves. Each streak sits at fract(phase + clock·speed / length) along its
    spline, so the motion is a pure function of an integrated flow clock: never jumps, never runs backwards.
    Streaks in front of the section plane are dropped; mode 1 keeps melt behind the front, mode 2 air ahead of it."""
    ng, nb, gi, go = gn_tree('Flow', [('Geometry', 'NodeSocketGeometry', None), ('Curves', 'NodeSocketObject', None), ('Count', 'NodeSocketInt', 200),
                                       ('Clock', 'NodeSocketFloat', 0.0), ('Speed', 'NodeSocketFloat', 1.0), ('Radius', 'NodeSocketFloat', 0.006),
                                       ('Length', 'NodeSocketFloat', 0.05), ('Visible', 'NodeSocketFloat', 1.0), ('CutY', 'NodeSocketFloat', -60.0),
                                       ('Material', 'NodeSocketMaterial', None), ('Seed', 'NodeSocketInt', 0), ('Mode', 'NodeSocketInt', 0),
                                       ('Front', 'NodeSocketFloat', 0.0), ('FrontTop', 'NodeSocketFloat', 0.0)])
    G = lambda n: N(nb, gi.outputs[n])
    oi = nb.node('GeometryNodeObjectInfo', transform_space='RELATIVE')
    nb.put(gi.outputs['Curves'], oi.inputs['Object'])
    curves = oi.outputs['Geometry']
    dsz = nb.node('GeometryNodeAttributeDomainSize', component='CURVE')
    nb.put(curves, dsz.inputs[0])
    nspl = N(nb, dsz.outputs['Spline Count'])
    pts = nb.node('GeometryNodePoints')
    nb.put(gi.outputs['Count'], pts.inputs['Count'])
    idx = N(nb, nb.node('GeometryNodeInputIndex').outputs[0])
    seed = G('Seed')
    k = nb.math('FLOORED_MODULO', idx, nb.mx(nspl, 1.0))
    sl = nb.node('GeometryNodeSplineLength')
    si = nb.node('GeometryNodeSampleIndex', data_type='FLOAT', domain='CURVE')
    nb.put(curves, si.inputs['Geometry']); nb.put(sl.outputs['Length'], si.inputs['Value']); nb.put(k, si.inputs['Index'])
    L = nb.mx(N(nb, si.outputs[0]), 0.01)
    sp = 0.85 + 0.3 * rnd(nb, idx, seed, 11)
    f = nb.fract(rnd(nb, idx, seed, 7) + G('Clock') * G('Speed') * sp / L)
    sc = nb.node('GeometryNodeSampleCurve', mode='FACTOR', use_all_curves=False)
    nb.put(curves, sc.inputs['Curves']); nb.put(f, sc.inputs['Factor']); nb.put(k, sc.inputs['Curve Index'])
    pos, tan = N(nb, sc.outputs['Position']), N(nb, sc.outputs['Tangent'])
    _, py, _ = nb.sep(pos)
    d, top = fill_dist(nb, pos)
    F = nb.sel(top, G('FrontTop'), G('Front'))
    mode = G('Mode')
    m1, m2 = nb.math('COMPARE', mode, 1.0, 0.1), nb.math('COMPARE', mode, 2.0, 0.1)
    gate = (1 - m1 - m2) + m1 * (d < F - 0.004) + m2 * (d > F + 0.015)
    keep = (rnd(nb, idx, seed, 3) < G('Visible')) * gate * (py > G('CutY') - 0.006)
    w = nb.smooth(0.0, 0.04, f) * (1 - nb.smooth(0.96, 1.0, f))
    setp = nb.node('GeometryNodeSetPosition')
    nb.put(pts.outputs['Points'], setp.inputs['Geometry']); nb.put(pos, setp.inputs['Position'])
    geo = setp.outputs['Geometry']
    for nm, val, typ in (('tan', tan, 'FLOAT_VECTOR'), ('w', w, 'FLOAT'), ('keep', keep, 'FLOAT')):
        st = nb.node('GeometryNodeStoreNamedAttribute', data_type=typ, domain='POINT')
        nb.put(geo, st.inputs['Geometry']); st.inputs['Name'].default_value = nm; nb.put(val, st.inputs['Value'])
        geo = st.outputs['Geometry']
    def named(nm, typ):
        a = nb.node('GeometryNodeInputNamedAttribute', data_type=typ)
        a.inputs['Name'].default_value = nm
        return N(nb, a.outputs['Attribute'])
    dl = nb.node('GeometryNodeDeleteGeometry', domain='POINT')
    nb.put(geo, dl.inputs['Geometry']); nb.put(named('keep', 'FLOAT') < 0.5, dl.inputs['Selection'])
    cyl = nb.node('GeometryNodeMeshCylinder')
    cyl.inputs['Vertices'].default_value = 8
    cyl.inputs['Radius'].default_value = 1.0
    cyl.inputs['Depth'].default_value = 1.0
    sm = nb.node('GeometryNodeSetMaterial')
    nb.put(cyl.outputs['Mesh'], sm.inputs['Geometry']); nb.put(gi.outputs['Material'], sm.inputs['Material'])
    al = nb.node('FunctionNodeAlignRotationToVector', axis='Z')
    nb.put(named('tan', 'FLOAT_VECTOR'), al.inputs['Vector'])
    ww = named('w', 'FLOAT')
    rr = G('Radius') * (0.55 + 0.45 * ww)
    iop = nb.node('GeometryNodeInstanceOnPoints')
    nb.put(dl.outputs['Geometry'], iop.inputs['Points']); nb.put(sm.outputs['Geometry'], iop.inputs['Instance'])
    nb.put(al.outputs['Rotation'], iop.inputs['Rotation']); nb.put(nb.comb(rr, rr, G('Length') * ww), iop.inputs['Scale'])
    rl = nb.node('GeometryNodeRealizeInstances')
    nb.put(iop.outputs['Instances'], rl.inputs['Geometry'])
    nb.put(rl.outputs['Geometry'], go.inputs['Geometry'])
    return ng


def droplet_group():
    """condensation: droplets on the parting faces, appearing in a stable random order as `Amount` rises"""
    ng, nb, gi, go = gn_tree('Droplets', [('Geometry', 'NodeSocketGeometry', None), ('Targets', 'NodeSocketCollection', None), ('Amount', 'NodeSocketFloat', 0.0),
                                           ('Material', 'NodeSocketMaterial', None)])
    ci = nb.node('GeometryNodeCollectionInfo', transform_space='RELATIVE')
    nb.put(gi.outputs['Targets'], ci.inputs['Collection'])
    rl = nb.node('GeometryNodeRealizeInstances')
    nb.put(ci.outputs['Instances'], rl.inputs['Geometry'])
    nrm = N(nb, nb.node('GeometryNodeInputNormal').outputs[0])
    nx, _, _ = nb.sep(nrm)
    dp = nb.node('GeometryNodeDistributePointsOnFaces', distribute_method='RANDOM')
    nb.put(rl.outputs['Geometry'], dp.inputs['Mesh']); nb.put(nb.abs(nx) > 0.85, dp.inputs['Selection'])
    dp.inputs['Density'].default_value = 900.0
    idx = N(nb, nb.node('GeometryNodeInputIndex').outputs[0])
    r1, r2 = rnd(nb, idx, 0, 1), rnd(nb, idx, 0, 2)
    geo = dp.outputs['Points']
    for nm, val in (('r1', r1), ('r2', r2)):
        st = nb.node('GeometryNodeStoreNamedAttribute', data_type='FLOAT', domain='POINT')
        nb.put(geo, st.inputs['Geometry']); st.inputs['Name'].default_value = nm; nb.put(val, st.inputs['Value'])
        geo = st.outputs['Geometry']
    dl = nb.node('GeometryNodeDeleteGeometry', domain='POINT')
    nb.put(geo, dl.inputs['Geometry']); nb.put(r1 > N(nb, gi.outputs['Amount']), dl.inputs['Selection'])
    ico = nb.node('GeometryNodeMeshIcoSphere')
    ico.inputs['Radius'].default_value = 1.0
    ico.inputs['Subdivisions'].default_value = 2
    sm = nb.node('GeometryNodeSetMaterial')
    nb.put(ico.outputs['Mesh'], sm.inputs['Geometry']); nb.put(gi.outputs['Material'], sm.inputs['Material'])
    a = nb.node('GeometryNodeInputNamedAttribute', data_type='FLOAT'); a.inputs['Name'].default_value = 'r2'
    r = (0.004 + 0.009 * N(nb, a.outputs['Attribute'])) * nb.smooth(0.0, 0.4, N(nb, gi.outputs['Amount']))
    iop = nb.node('GeometryNodeInstanceOnPoints')
    nb.put(dl.outputs['Geometry'], iop.inputs['Points']); nb.put(sm.outputs['Geometry'], iop.inputs['Instance'])
    nb.put(dp.outputs['Rotation'], iop.inputs['Rotation']); nb.put(nb.comb(r, r, r * 0.45), iop.inputs['Scale'])
    nb.put(iop.outputs['Instances'], go.inputs['Geometry'])
    return ng


def counter_group():
    """the mechanical shot counter's digits (white on black), from an animated value"""
    ng, nb, gi, go = gn_tree('CounterDigits', [('Geometry', 'NodeSocketGeometry', None), ('Value', 'NodeSocketFloat', 0.0), ('Material', 'NodeSocketMaterial', None)])
    vs = nb.node('FunctionNodeValueToString')
    nb.put(gi.outputs['Value'], vs.inputs['Value']); vs.inputs['Decimals'].default_value = 0
    if 'Padding' in vs.inputs:
        vs.inputs['Padding'].default_value = 7
    s2c = nb.node('GeometryNodeStringToCurves')
    nb.put(vs.outputs['String'], s2c.inputs['String']); s2c.inputs['Size'].default_value = 0.075
    set_menu(s2c.inputs['Align X'], 'Center')
    rl = nb.node('GeometryNodeRealizeInstances'); nb.put(s2c.outputs['Curve Instances'], rl.inputs['Geometry'])
    fc = nb.node('GeometryNodeFillCurve'); nb.put(rl.outputs['Geometry'], fc.inputs['Curve'])
    tr = nb.node('GeometryNodeTransform')
    nb.put(fc.outputs['Mesh'], tr.inputs['Geometry'])
    tr.inputs['Translation'].default_value = (-0.27, -PLATE - 0.152, -1.225)
    tr.inputs['Rotation'].default_value = (math.radians(90), 0, 0)
    sm = nb.node('GeometryNodeSetMaterial'); nb.put(tr.outputs['Geometry'], sm.inputs['Geometry']); nb.put(gi.outputs['Material'], sm.inputs['Material'])
    j = nb.node('GeometryNodeJoinGeometry')
    nb.put(sm.outputs['Geometry'], j.inputs[0]); nb.put(gi.outputs['Geometry'], j.inputs[0])
    nb.put(j.outputs[0], go.inputs['Geometry'])
    return ng


SPRAY_O = (0.62, -1.25, 1.1)


def spray_group():
    """rust-preventive mist from a can in front of the open mould, sweeping across the parting faces"""
    ng, nb, gi, go = gn_tree('Spray', [('Geometry', 'NodeSocketGeometry', None), ('Amount', 'NodeSocketFloat', 0.0), ('Clock', 'NodeSocketFloat', 0.0),
                                        ('Material', 'NodeSocketMaterial', None)])
    pts = nb.node('GeometryNodePoints'); pts.inputs['Count'].default_value = 2600
    idx = N(nb, nb.node('GeometryNodeInputIndex').outputs[0])
    u = nb.fract(rnd(nb, idx, 0, 1) + N(nb, gi.outputs['Clock']) * 0.9)
    O = SPRAY_O
    tx = 0.01 + 0.0 * u
    ty = -1.2 + 2.4 * rnd(nb, idx, 0, 2)
    tz = -1.1 + 2.5 * rnd(nb, idx, 0, 3)
    px = O[0] + (tx - O[0]) * u + 0.03 * rnd(nb, idx, 0, 4)
    py = O[1] + (ty - O[1]) * u
    pz = O[2] + (tz - O[2]) * u
    setp = nb.node('GeometryNodeSetPosition')
    nb.put(pts.outputs['Points'], setp.inputs['Geometry']); nb.put(nb.comb(px, py, pz), setp.inputs['Position'])
    dl = nb.node('GeometryNodeDeleteGeometry', domain='POINT')
    nb.put(setp.outputs['Geometry'], dl.inputs['Geometry']); nb.put(rnd(nb, idx, 0, 5) > N(nb, gi.outputs['Amount']), dl.inputs['Selection'])
    ico = nb.node('GeometryNodeMeshIcoSphere'); ico.inputs['Radius'].default_value = 1.0; ico.inputs['Subdivisions'].default_value = 1
    sm = nb.node('GeometryNodeSetMaterial'); nb.put(ico.outputs['Mesh'], sm.inputs['Geometry']); nb.put(gi.outputs['Material'], sm.inputs['Material'])
    s = 0.004 + 0.014 * u
    iop = nb.node('GeometryNodeInstanceOnPoints')
    nb.put(dl.outputs['Geometry'], iop.inputs['Points']); nb.put(sm.outputs['Geometry'], iop.inputs['Instance']); nb.put(nb.comb(s, s, s), iop.inputs['Scale'])
    nb.put(iop.outputs['Instances'], go.inputs['Geometry'])
    return ng


def fin_group():
    """flash fins: the outer edge of a thin ring at the parting line grows outward (ragged) with Amount;
    at 0 it hides under the flange. Runs before the section cut, so the fin is cut like everything else."""
    ng, nb, gi, go = gn_tree('FinGrow', [('Geometry', 'NodeSocketGeometry', None), ('Amount', 'NodeSocketFloat', 0.0)])
    pos = N(nb, nb.node('GeometryNodeInputPosition').outputs[0])
    x, y, z = nb.sep(pos)
    r = nb.sqrt(y * y + z * z)
    ang = nb.math('ARCTAN2', z, y)
    tex = nb.node('ShaderNodeTexNoise')
    tex.inputs['Scale'].default_value = 1.6
    tex.inputs['Detail'].default_value = 3.0
    nb.put(nb.comb(nb.math('COSINE', ang) * 3.0, nb.math('SINE', ang) * 3.0, 0.0), tex.inputs['Vector'])
    rn = 0.300 + N(nb, gi.outputs['Amount']) * (0.01 + 0.05 * N(nb, tex.outputs['Fac']))
    k = rn / nb.mx(r, 1e-4)
    sp = nb.node('GeometryNodeSetPosition')
    nb.put(gi.outputs['Geometry'], sp.inputs['Geometry']); nb.put(r > 0.35, sp.inputs['Selection'])
    nb.put(nb.comb(x, y * k, z * k), sp.inputs['Position'])
    nb.put(sp.outputs['Geometry'], go.inputs['Geometry'])
    return ng


def curve_obj(name, splines):
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    for pts in splines:
        sp = cu.splines.new('POLY')
        sp.points.add(len(pts) - 1)
        for p, q in zip(sp.points, pts):
            p.co = (q[0], q[1], q[2], 1.0)
    ob = bpy.data.objects.new(name, cu)
    COL['flow'].objects.link(ob)
    ob.hide_render = True
    ob.hide_viewport = True
    return ob


def ring_pts(x, cyy, czz, r, a0, a1, n=24):
    return [(x, cyy + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)), czz + r * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


def water_paths(xc, s, R):
    out = []
    for _ in range(10):
        xj, yo = R.uniform(-0.022, 0.022), R.uniform(0.008, 0.03)
        x = xc + xj
        a0, a1 = (90, -90) if s > 0 else (-90, 90)
        pts = [(x, yo, s * 2.3), (x, yo, s * 1.44)] + ring_pts(x, 0.0, s * 1.05, 0.355, a0, a1)[1:-1] + [(x, yo, s * 0.67), (x, yo, s * 0.52), (x, 0.5, s * 0.52), (x, 0.5, s * 1.8), (x, 0.5, s * 2.3)]
        out.append(lib.rounded_path(pts, 0.04, 6))
    return out


def cavity_u(s, y, xs=0.0):
    """centre line of the cup wall in the section (near wall → base → far wall → far flange) for cavity T (s=1) / B (s=-1)"""
    return [(-0.012, y, s * 0.762), (-0.045, y, s * 0.8175), (-0.2325 + xs, y, s * 0.84), (-0.2325 + xs, y, s * 1.26), (-0.045, y, s * 1.2825), (-0.015, y, s * 1.335)]


def build_flows():
    R = random.Random(5)
    fg = flow_group()
    F = {}

    def flow(name, splines, mat, count, speed, radius, length, mode=0, seed=0, rig=None):
        co = curve_obj('Path_' + name, splines)
        me = bpy.data.meshes.new(name)
        ob = bpy.data.objects.new(name, me)
        COL['flow'].objects.link(ob)
        if rig:     # streaks and their paths ride with the plate (both children of the same rig → relative = identity)
            ob.parent = co.parent = RIGS[rig]
        md = ob.modifiers.new('Flow', 'NODES')
        md.node_group = fg
        for k_, v in (('Curves', co), ('Count', count), ('Speed', speed), ('Radius', radius), ('Length', length), ('Material', mat), ('Mode', mode), ('Seed', seed)):
            set_in(md, k_, v)
        F[name] = (ob, md)
        return ob
    flow('FlowWaterAup', water_paths(XA_CH, 1, R), M['sWater'], 220, 0.55, 0.0065, 0.055, seed=1, rig='a')
    flow('FlowWaterA', water_paths(XA_CH, -1, R), M['sWater'], 220, 0.55, 0.0065, 0.055, seed=2, rig='a')
    flow('FlowWaterB', water_paths(XB_CH, 1, R) + water_paths(XB_CH, -1, R), M['sWater'], 420, 0.55, 0.0065, 0.055, seed=8, rig='b')
    melt = []
    for s in (1, -1):
        for _ in range(8):
            y = -R.uniform(0.002, 0.004)
            j = R.uniform(-0.008, 0.008)
            melt.append(lib.rounded_path([(-2.3, y, j * 0.5), (-1.03, y, j * 0.5), (-0.004, y, j), (0.0, y, s * 0.62 + j), (-0.009, y, s * 0.70)] + cavity_u(s, y), 0.03, 5))
    flow('FlowMelt', melt, M['sMelt'], 360, 1.0, 0.0055, 0.035, mode=1, seed=3)
    air, vent = [], []
    for s in (1, -1):
        for _ in range(8):
            y = R.uniform(0.004, 0.02)
            air.append(lib.rounded_path(cavity_u(s, y, R.uniform(0.0, 0.006)), 0.02, 4))
            vent.append(lib.rounded_path([(-0.015, y, s * 1.335), (-0.006, y, s * 1.37), (-0.006, y, s * 1.40), (-0.017, y, s * 1.44), (-0.017, y, s * 1.8), (-0.03, y, s * 2.0), (-0.1, y, s * 2.4)], 0.02, 4))
    flow('FlowAir', air, M['sAir'], 180, 0.25, 0.0035, 0.03, mode=2, seed=4, rig='ains')
    flow('FlowAirVent', vent, M['sAir'], 120, 0.3, 0.003, 0.04, seed=5, rig='a')
    seep = []
    for _ in range(6):
        y = R.uniform(0.004, 0.03)
        seep.append(lib.rounded_path([(-0.25, y, 1.431), (-0.12, y, 1.431), (-0.006, y, 1.431), (0.004, y, 1.445), (0.006, y + 0.02, 1.49)], 0.01, 4))
    flow('FlowSeep', seep, M['sSeep'], 40, 0.12, 0.004, 0.03, seed=6, rig='ains')
    # condensation, counter digits, spray
    tgt = bpy.data.collections.new('CondenseTargets')
    for n in ('PlateA', 'PlateB', 'InsertA_T', 'InsertA_B', 'InsertA_F', 'InsertA_K', 'InsertB_T', 'InsertB_B', 'InsertB_F', 'InsertB_K'):
        tgt.objects.link(bpy.data.objects[n])
    dg = droplet_group()
    dob = bpy.data.objects.new('Condensation', bpy.data.meshes.new('Condensation'))
    COL['extras'].objects.link(dob)
    md = dob.modifiers.new('Droplets', 'NODES'); md.node_group = dg
    set_in(md, 'Targets', tgt); set_in(md, 'Material', M['droplet'])
    F['Condensation'] = (dob, md)
    cg = counter_group()
    md = COUNTER.modifiers.new('Digits', 'NODES'); md.node_group = cg
    COUNTER.modifiers.move(len(COUNTER.modifiers) - 1, 0)
    set_in(md, 'Material', M['digits'])
    F['Counter'] = (COUNTER, md)
    fg2 = fin_group()
    for c in ('T', 'B'):
        ob = bpy.data.objects['Flash_' + c]
        md = ob.modifiers.new('Grow', 'NODES'); md.node_group = fg2
        ob.modifiers.move(len(ob.modifiers) - 1, 0)
        F['Fin' + c] = (ob, md)
    sg = spray_group()
    sob = bpy.data.objects.new('Spray', bpy.data.meshes.new('Spray'))
    COL['extras'].objects.link(sob)
    md = sob.modifiers.new('Spray', 'NODES'); md.node_group = sg
    set_in(md, 'Material', M['spray'])
    F['Spray'] = (sob, md)
    return F


FLOWS = build_flows()


# ================================================================ lights, world, camera, render settings, compositor
def area(name, loc, target, energy, size, color=(1, 1, 1), size_y=None):
    ld = bpy.data.lights.new(name, 'AREA')
    ld.energy, ld.color = energy, color
    ld.shape = 'RECTANGLE'
    ld.size, ld.size_y = size, size_y or size
    ob = bpy.data.objects.new(name, ld)
    COL['stage'].objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return ob


KEY_W = 4200
LIGHTS = {
    'key': area('Key', (-6.5, -9.0, 9.0), (0.3, 0, 0), KEY_W, 5.0, (1.0, 0.93, 0.85), 3.0),
    'rim': area('Rim', (7.5, 9.0, 5.0), (0.5, 0, 0), 4500, 4.0, (0.55, 0.75, 1.0)),
    'rim2': area('Rim2', (-8.0, 7.0, -1.0), (0, 0, 0), 1600, 4.0, (0.6, 0.72, 1.0)),
    'fill': area('Fill', (0.5, -15.0, 1.0), (0.3, 0, 0), 900, 10.0, (0.78, 0.84, 0.95), 5.0),
    'top': area('Top', (0.3, -1.5, 7.0), (0.3, 0, 0), 900, 3.0, (1.0, 0.96, 0.9)),
}
GAP = [area('GapA', (0.85, -2.7, 1.7), (0.0, -0.2, 0.6), 0.0, 1.6, (1.0, 0.97, 0.92)),
       area('GapB', (0.35, -2.7, 1.7), (1.25, -0.2, 0.3), 0.0, 1.6, (0.9, 0.95, 1.0))]
can_dir = (Vector((0.0, 0.0, 0.2)) - Vector(SPRAY_O)).normalized()
can = union([bm_cyl(Vector(SPRAY_O) - can_dir * 0.32, Vector(SPRAY_O) - can_dir * 0.06, 0.055, 32),
             bm_cyl(Vector(SPRAY_O) - can_dir * 0.06, Vector(SPRAY_O), 0.03, 24)])
SPRAYCAN = obj_from_bm('SprayCan', can, COL['extras'], M['hoseRed'], 40)
sd = bpy.data.lights.new('PlinthSpot', 'SPOT')
sd.energy, sd.spot_size, sd.spot_blend, sd.color, sd.shadow_soft_size = 900, math.radians(55), 0.6, (1.0, 0.95, 0.88), 0.4
sp = bpy.data.objects.new('PlinthSpot', sd); COL['stage'].objects.link(sp)
sp.location = (1.2, -8.6, 1.4)
sp.rotation_euler = (Vector((0, -7.0, -2.6)) - sp.location).to_track_quat('-Z', 'Y').to_euler()
dl = bpy.data.lights.new('DieselLight', 'POINT')
dl.energy, dl.color, dl.shadow_soft_size = 0.0, (1.0, 0.55, 0.15), 0.01
DIESEL = bpy.data.objects.new('DieselLight', dl); COL['stage'].objects.link(DIESEL)
DIESEL.location = (-0.05, -0.06, 1.335)

world = bpy.data.worlds.new('Studio')
SC.world = world
wt = world.node_tree
for n in list(wt.nodes):
    wt.nodes.remove(n)
wb = NB(wt)
wo = wb.node('ShaderNodeOutputWorld')
dirv = N(wb, wb.node('ShaderNodeTexCoord').outputs['Generated'])
dirn = wb.vmath('NORMALIZE', dirv)
dx_, dy_, dz_ = wb.sep(dirn)
base = wb.mix(wb.smooth(-0.3, 0.6, dz_), (0.002, 0.0026, 0.0035, 1), (0.012, 0.016, 0.022, 1), 'RGBA')
boxes = 0.0
for d, cosa, s in (((-0.45, -0.55, 0.7), 0.93, 3.0), ((0.75, 0.55, 0.35), 0.95, 2.2), ((0.0, -0.9, 0.42), 0.97, 1.4), ((-0.7, 0.6, 0.3), 0.96, 1.2)):
    dv = Vector(d).normalized()
    dot = dx_ * dv.x + dy_ * dv.y + dz_ * dv.z
    boxes = boxes + s * wb.smooth(cosa, cosa + 0.012, dot)
lp = wb.node('ShaderNodeLightPath')
refl = 1 - N(wb, lp.outputs['Is Camera Ray'])
bgc = wb.vmath('ADD', base, wb.comb(boxes * refl * 0.95, boxes * refl, boxes * refl * 1.05))
bg = wb.node('ShaderNodeBackground')
wb.put(bgc, bg.inputs['Color']); bg.inputs['Strength'].default_value = 1.0
wb.put(bg.outputs[0], wo.inputs['Surface'])

camd = bpy.data.cameras.new('Cam')
camd.sensor_fit, camd.sensor_height, camd.sensor_width = 'VERTICAL', 24.0, 36.0
camd.clip_start, camd.clip_end = 0.01, 300.0
camd.dof.use_dof = True
camd.dof.aperture_fstop = 3.2
CAM = bpy.data.objects.new('Cam', camd)
COL['stage'].objects.link(CAM)
SC.camera = CAM

R = SC.render
R.engine = 'BLENDER_EEVEE'
R.resolution_x, R.resolution_y, R.resolution_percentage = 1920, 1080, 100
R.fps = 24
R.use_motion_blur = True
R.motion_blur_shutter = 0.35
R.film_transparent = False
R.image_settings.file_format = 'JPEG'
R.image_settings.quality = 92
R.use_overwrite = False
R.use_placeholder = True
EE = SC.eevee
EE.taa_render_samples = int(ARG.get('samples', 10))
R.resolution_percentage = int(ARG.get('scale', 75))      # 3D at 1440×810, upscaled under the 1080p overlay
EE.use_shadows = True
EE.shadow_ray_count = 1
EE.shadow_step_count = 6
EE.use_raytracing = True
try:
    EE.ray_tracing_method = 'SCREEN'
    EE.ray_tracing_options.resolution_scale = '2'
except Exception as e:
    print('raytrace opts', e)
EE.motion_blur_steps = 1
try:
    SC.view_settings.view_transform = 'AgX'
    SC.view_settings.look = 'AgX - Punchy'
except Exception as e:
    print('look', e)
SC.view_settings.exposure = 0.0

# compositor: bloom, a touch of lens dispersion, exposure, warning tint, vignette, flash, fade
cg = bpy.data.node_groups.new('Grade', 'CompositorNodeTree')
cg.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
SC.compositing_node_group = cg
cb = NB(cg)
rl = cb.node('CompositorNodeRLayers')
gl = cb.node('CompositorNodeGlare')
set_menu(gl.inputs['Type'], 'Bloom'); set_menu(gl.inputs['Quality'], 'High')
gl.inputs['Threshold'].default_value = 0.9
gl.inputs['Strength'].default_value = 0.55
gl.inputs['Size'].default_value = 0.6
cb.put(rl.outputs['Image'], gl.inputs['Image'])
ld = cb.node('CompositorNodeLensdist')
ld.inputs['Dispersion'].default_value = 0.012
cb.put(gl.outputs['Image'], ld.inputs['Image'])
ex = cb.node('CompositorNodeExposure')
cb.put(ld.outputs['Image'], ex.inputs['Image'])
warn_mul = cb.mix(1.0, N(cb, ex.outputs['Image']), (1.22, 0.8, 0.74, 1), 'RGBA', 'MULTIPLY')
warn = cb.mix(0.0, N(cb, ex.outputs['Image']), warn_mul, 'RGBA')
em = cb.node('CompositorNodeEllipseMask')
em.inputs['Size'].default_value = (1.05, 0.95)
em.inputs['Position'].default_value = (0.5, 0.5)
bl = cb.node('CompositorNodeBlur')
bl.inputs['Size'].default_value = (420, 420)
cb.put(em.outputs['Mask'], bl.inputs['Image'])
vig = cb.mix(N(cb, bl.outputs['Image']), (0.32, 0.32, 0.32, 1), (1, 1, 1, 1), 'RGBA')
vigd = cb.mix(1.0, warn, vig, 'RGBA', 'MULTIPLY')
flash = cb.mix(0.0, vigd, (1, 1, 1, 1), 'RGBA', 'ADD')
fade = cb.mix(0.0, flash, (0, 0, 0, 1), 'RGBA')
go_ = cb.node('NodeGroupOutput')
cb.put(fade, go_.inputs[0])
COMP = {'exposure': ex, 'warn': warn.s.node, 'flash': flash.s.node, 'fade': fade.s.node}


# ================================================================ animation from the exported state and camera
def load(name):
    with open(os.path.join(GEN, name)) as f:
        return json.load(f)


def animate():
    from lib import set_fcurve
    st, cam = load('state.json'), load('camera.json')
    C, N_ = st['cols'], st['frames']
    cuts = cam['cuts']
    SC.frame_start, SC.frame_end = 0, N_ - 1
    col = lambda k: C[k]
    # rigs
    for r, e in RIGS.items():
        xs, ys, zs = col(f'rig_{r}_x'), col(f'rig_{r}_y'), col(f'rig_{r}_z')
        set_fcurve(e, 'location', 0, xs, cuts)
        set_fcurve(e, 'location', 1, [-v for v in zs], cuts)
        set_fcurve(e, 'location', 2, ys, cuts)
    # the shot
    set_fcurve(SHOT, 'location', 0, col('shot_x'), cuts)
    set_fcurve(SHOT, 'location', 1, [-v for v in col('shot_z')], cuts)
    set_fcurve(SHOT, 'location', 2, col('shot_y'), cuts)
    SHOT.rotation_mode = 'XYZ'
    set_fcurve(SHOT, 'rotation_euler', 0, col('shot_spin'), cuts)
    set_fcurve(SHOT, 'rotation_euler', 1, [-v for v in col('shot_tilt')], cuts)
    hide = lambda ob, vals: set_fcurve(ob, 'hide_render', -1, [1.0 if v else 0.0 for v in vals], cuts, const=True)
    hide(SHOT, [v < 0.5 for v in col('shotVis')])
    for ch in SHOT.children:
        hide(ch, [v < 0.5 for v in col('shotVis')])
    hide(AIRPOCKET, [a < 0.004 and d < 0.004 for a, d in zip(col('airGlow'), col('diesel'))])
    # section cut: cutter plane at three z = cutZ + 2.7·(1 − cut); off when cut = 0
    cy_ = [-(z + 2.7 * (1 - c)) if c > 0.001 else -60.0 for c, z in zip(col('cut'), col('cutZ'))]
    set_fcurve(CUT_RIG, 'location', 1, cy_, cuts)
    # scene properties read by the materials (Attribute node, View Layer)
    for k_ in ('fill', 'fillTop', 'heat', 'burn', 'drag', 'flashTop', 'flashBot', 'airGlow', 'diesel', 'gall', 'lube', 'ventDirt', 'scale', 'oring', 'leak', 'drops',
               'plateout', 'damage', 'pillarWear', 'grease', 'cold', 'condense', 'rust', 'spray', 'protect', 'hiCavity', 'hiCore', 'waterOn', 'blow',
               'thermal', 'thermalScaled', 'newOring', 'springHi'):
        SC[k_] = 0.0
        set_fcurve(SC, f'["{k_}"]', -1, col(k_), cuts)
    # geometry-node inputs
    def gn(name, key, vals):
        ob, md = FLOWS[name]
        set_in(md, key, float(vals[0]))
        set_fcurve(ob, in_path(md, key), -1, vals, cuts)
    on = [1.0 if c > 0.001 else 0.0 for c in col('cut')]
    for nm in ('FlowWaterAup', 'FlowWaterA', 'FlowWaterB', 'FlowMelt', 'FlowAir', 'FlowAirVent', 'FlowSeep'):
        gn(nm, 'CutY', cy_)
    gn('FlowWaterAup', 'Clock', col('clock_waterA')); gn('FlowWaterAup', 'Visible', on)
    for nm in ('FlowWaterA', 'FlowWaterB'):
        gn(nm, 'Clock', col('clock_water')); gn(nm, 'Visible', on)
    gn('FlowMelt', 'Clock', col('clock_melt')); gn('FlowMelt', 'Visible', [o * v for o, v in zip(on, col('meltVis'))])
    gn('FlowMelt', 'Front', col('fill')); gn('FlowMelt', 'FrontTop', col('fillTop'))
    gn('FlowAir', 'Clock', col('clock_air')); gn('FlowAir', 'Visible', [o * v for o, v in zip(on, col('airVis'))])
    gn('FlowAir', 'Front', col('fill')); gn('FlowAir', 'FrontTop', col('fillTop'))
    gn('FlowAirVent', 'Clock', col('clock_air')); gn('FlowAirVent', 'Visible', [o * v * w for o, v, w in zip(on, col('airVis'), col('ventOpen'))])
    gn('FlowSeep', 'Clock', col('clock_seep')); gn('FlowSeep', 'Visible', [o * min(1.0, v * 3) for o, v in zip(on, col('leak'))])
    gn('Condensation', 'Amount', col('condense'))
    gn('Counter', 'Value', col('shots'))
    gn('Spray', 'Amount', col('spray')); gn('Spray', 'Clock', col('clock_idle'))
    gn('FinT', 'Amount', col('flashTop')); gn('FinB', 'Amount', col('flashBot'))
    # visibility swaps and scaled details
    obj = bpy.data.objects
    hide(obj['PinP2'], [v > 0.5 for v in col('broken')]); hide(obj['PinP2Broken'], [v < 0.5 for v in col('broken')])
    hide(obj['PillarGood'], [v > 0.5 for v in col('pillarWear')]); hide(obj['PillarWorn'], [v < 0.5 for v in col('pillarWear')])
    hide(obj['BushGood'], [v > 0.5 for v in col('pillarWear')]); hide(obj['BushWorn'], [v < 0.5 for v in col('pillarWear')])
    hide(obj['LeakDrops'], [v < 0.35 for v in col('drops')]); hide(obj['Dents'], [v < 0.5 for v in col('damage')])
    for k_, a, g in SCALE_OBJS:
        th = (k_ + 0.5) / 4.6
        hide(a, [v < th for v in col('scale')]); hide(g, [v < th for v in col('scale')])
    set_fcurve(obj['VentResidue'], 'scale', 0, [max(0.002, v) for v in col('ventDirt')], cuts)
    for ob in obj:
        if ob.get('spring'):
            set_fcurve(ob, 'scale', 0, [v / 0.6 for v in col('springLen')], cuts)
    for ob in MACHINE:
        hide(ob, [v < 0.5 for v in col('machine')])
    for ob in obj:
        if ob.get('frontface'):
            hide(ob, [c > 0.001 for c in col('cut')])
    hide(FLOWS['Condensation'][0], [v < 0.001 for v in col('condense')])
    hide(FLOWS['Spray'][0], [v < 0.001 for v in col('spray')])
    SPRAYCAN.hide_render = True          # the rust preventive reads better as the sheen on the steel
    gap = [1.0 if (o > 0.5 and c < 0.001) else 0.0 for o, c in zip(col('open'), col('cut'))]
    for g in GAP:
        set_fcurve(g.data, 'energy', -1, [380 * v for v in gap], cuts)
    hide(FLOWS['FlowSeep'][0], [v < 0.001 for v in col('leak')])
    hide(FLOWS['FlowMelt'][0], [v < 0.5 or c < 0.001 for v, c in zip(col('meltVis'), col('cut'))])
    hide(FLOWS['FlowAir'][0], [v < 0.5 or c < 0.001 for v, c in zip(col('airVis'), col('cut'))])
    hide(FLOWS['FlowAirVent'][0], [v < 0.5 or c < 0.001 for v, c in zip(col('airVis'), col('cut'))])
    # lights: the idle, chilled mould goes cold and blue; the dieselling air flashes
    key = LIGHTS['key'].data
    set_fcurve(key, 'energy', -1, [KEY_W * (1 - 0.45 * c) for c in col('cold')], cuts)
    for i, (w, c) in enumerate(zip((1.0, 0.93, 0.85), (0.62, 0.78, 1.0))):
        set_fcurve(key, 'color', i, [w + (c - w) * v for v in col('cold')], cuts)
    set_fcurve(DIESEL.data, 'energy', -1, [4 * a + 45 * d for a, d in zip(col('airGlow'), col('diesel'))], cuts)
    # compositor
    set_fcurve(cg, 'nodes["%s"].inputs[1].default_value' % COMP['exposure'].name, -1, [math.log2(max(1e-3, v)) for v in col('g_exposure')], cuts)
    set_fcurve(cg, 'nodes["%s"].inputs[0].default_value' % COMP['warn'].name, -1, [0.6 * v for v in col('g_warn')], cuts)
    set_fcurve(cg, 'nodes["%s"].inputs[0].default_value' % COMP['flash'].name, -1, col('g_flash'), cuts)
    set_fcurve(cg, 'nodes["%s"].inputs[0].default_value' % COMP['fade'].name, -1, [1 - v for v in col('g_fade')], cuts)
    # camera: three.js position / target / fov / roll / view shift → Blender
    locs, rots, lens, shx, foc = [], [], [], [], []
    prev = None
    for i in range(cam['frames']):
        p, t = B3(cam['pos'][i]), B3(cam['tgt'][i])
        roll = cam['roll'][i]
        up = Vector((math.sin(roll), 0.0, math.cos(roll)))
        fwd = (t - p).normalized()
        right = fwd.cross(up).normalized()
        cup = right.cross(fwd)
        Rm = Matrix((right, cup, -fwd)).transposed()
        e = Rm.to_euler('XYZ', prev) if prev else Rm.to_euler('XYZ')
        prev = e
        locs.append(p); rots.append(e)
        lens.append(12.0 / math.tan(math.radians(cam['fov'][i]) / 2))
        # three.js setViewOffset shifts by shift·width; Blender's shift_x with a vertical sensor fit is in image heights
        shx.append(-cam['shift'][i] * 1920 / 1080)
        foc.append((t - p).length)
    for k_ in range(3):
        set_fcurve(CAM, 'location', k_, [v[k_] for v in locs], cuts)
        set_fcurve(CAM, 'rotation_euler', k_, [v[k_] for v in rots], cuts)
    set_fcurve(camd, 'lens', -1, lens, cuts)
    set_fcurve(camd, 'shift_x', -1, shx, cuts)
    set_fcurve(camd, 'dof.focus_distance', -1, foc, cuts)
    print('animated', N_, 'frames,', len(cuts), 'cuts')


if not ARG.get('noanim') and os.path.exists(os.path.join(GEN, 'state.json')):
    animate()

with open(os.path.join(TOPIC, 'anchors.json'), 'w') as f:
    json.dump(dict(sorted(ANCHORS.items())), f, indent=1)
R.filepath = ARG.get('frames', os.path.join(os.path.dirname(os.path.dirname(TOPIC)), 'frames', 'mould-pm-3d', 'f_#####'))
bpy.ops.wm.save_as_mainfile(filepath=OUT, compress=True)
print('saved', OUT)
