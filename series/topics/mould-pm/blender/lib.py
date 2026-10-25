"""Helpers for building explainer scenes in Blender from code: solids (bmesh), applied booleans, a small node-math
builder that works in shader and geometry-node trees, and keyframing from the exported state/camera columns."""
import math
import bpy
import bmesh
from mathutils import Vector, Matrix

TAU = math.tau


# ---------------------------------------------------------------- collections / objects
def coll(name, parent=None):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    p = parent or bpy.context.scene.collection
    if c.name not in [x.name for x in p.children]:
        p.children.link(c)
    return c


def obj_from_bm(name, bm, col, mat=None, smooth=35):
    me = bpy.data.meshes.new(name)
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    if mat:
        me.materials.append(mat)
    if smooth:
        me.shade_smooth()
        me.set_sharp_from_angle(angle=math.radians(smooth))
    return ob


def bm_transform(bm, M):
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)


def axis_matrix(p0, p1):
    """Matrix taking local +Z (0..1) onto the segment p0→p1 (scaled along Z by its length)."""
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    L = d.length
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    return Matrix.Translation(p0) @ q.to_matrix().to_4x4() @ Matrix.Diagonal((1, 1, L, 1))


def bm_cyl(p0, p1, r, segs=48, r1=None, cap=True):
    """Closed cylinder (or cone when r1 is given) from p0 to p1."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=segs, radius1=r, radius2=r if r1 is None else r1, depth=1.0)
    bm_transform(bm, Matrix.Translation((0, 0, 0.5)))
    bm_transform(bm, axis_matrix(p0, p1))
    return bm


def bm_box(x0, x1, y0, y1, z0, z1, bevel=0.0, segs=2):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bm_transform(bm, Matrix.Translation(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)) @ Matrix.Diagonal((x1 - x0, y1 - y0, z1 - z0, 1)))
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=bm.edges[:] + bm.verts[:], offset=bevel, segments=segs, profile=0.5, affect='EDGES', clamp_overlap=True)
    return bm


def bm_tube(p0, p1, rin, rout, segs=48):
    """Closed thick-walled tube p0→p1 (annular end caps)."""
    return bm_sweep([p0, p1], rout, rin, segs)


def bm_torus(center, axis, R, r, seg=64, rseg=16):
    bm = bmesh.new()
    verts = []
    for i in range(seg):
        a = TAU * i / seg
        ring = []
        for j in range(rseg):
            b = TAU * j / rseg
            ring.append(bm.verts.new(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b))))
        verts.append(ring)
    for i in range(seg):
        for j in range(rseg):
            bm.faces.new((verts[i][j], verts[(i + 1) % seg][j], verts[(i + 1) % seg][(j + 1) % rseg], verts[i][(j + 1) % rseg]))
    q = Vector((0, 0, 1)).rotation_difference(Vector(axis).normalized())
    bm_transform(bm, Matrix.Translation(Vector(center)) @ q.to_matrix().to_4x4())
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def bm_sphere(center, r, seg=32, rings=16, scale=(1, 1, 1)):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
    bm_transform(bm, Matrix.Translation(Vector(center)) @ Matrix.Diagonal((*scale, 1)))
    return bm


def rounded_path(pts, bend=0.2, seg=10):
    """Dense points along a polyline whose corners are rounded with quadratic Béziers (like pipeSolid in look.js)."""
    P = [Vector(p) for p in pts]
    out = [P[0].copy()]
    prev = P[0].copy()
    for i in range(1, len(P)):
        a, b = P[i - 1], P[i]
        if i == len(P) - 1:
            n = max(2, int((b - prev).length / 0.08))
            out += [prev.lerp(b, k / n) for k in range(1, n + 1)]
            break
        c = P[i + 1]
        d1, d2 = b - a, c - b
        r = min(bend, d1.length * 0.45, d2.length * 0.45)
        p1, p2 = b - d1.normalized() * r, b + d2.normalized() * r
        n = max(1, int((p1 - prev).length / 0.08))
        out += [prev.lerp(p1, k / n) for k in range(1, n + 1)]
        for k in range(1, seg + 1):
            u = k / seg
            out.append((1 - u) ** 2 * p1 + 2 * (1 - u) * u * b + u * u * p2)
        prev = p2
    return out


def bm_sweep(pts, rout, rin=0.0, segs=16):
    """Closed tube (solid when rin == 0, hollow otherwise) swept along dense points with rotation-minimising frames."""
    P = [Vector(p) for p in pts]
    T = []
    for i in range(len(P)):
        a, b = P[max(0, i - 1)], P[min(len(P) - 1, i + 1)]
        T.append((b - a).normalized())
    ref = Vector((0, 0, 1)) if abs(T[0].z) < 0.9 else Vector((1, 0, 0))
    nrm = (ref - T[0] * ref.dot(T[0])).normalized()
    bm = bmesh.new()
    rings_o, rings_i = [], []
    for i, p in enumerate(P):
        t = T[i]
        nrm = (nrm - t * nrm.dot(t)).normalized()
        bi = t.cross(nrm)
        ro = [bm.verts.new(p + (nrm * math.cos(TAU * k / segs) + bi * math.sin(TAU * k / segs)) * rout) for k in range(segs)]
        rings_o.append(ro)
        if rin > 0:
            rings_i.append([bm.verts.new(p + (nrm * math.cos(TAU * k / segs) + bi * math.sin(TAU * k / segs)) * rin) for k in range(segs)])
    for i in range(len(P) - 1):
        for k in range(segs):
            k2 = (k + 1) % segs
            bm.faces.new((rings_o[i][k], rings_o[i + 1][k], rings_o[i + 1][k2], rings_o[i][k2]))
            if rin > 0:
                bm.faces.new((rings_i[i][k], rings_i[i][k2], rings_i[i + 1][k2], rings_i[i + 1][k]))
    if rin > 0:
        for ri, j in ((0, 0), (len(P) - 1, 1)):
            for k in range(segs):
                k2 = (k + 1) % segs
                q = (rings_o[ri][k], rings_o[ri][k2], rings_i[ri][k2], rings_i[ri][k])
                bm.faces.new(q if j == 0 else q[::-1])
    else:
        bm.faces.new(rings_o[0][::-1])
        bm.faces.new(rings_o[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def bm_merge(*bms):
    out = bmesh.new()
    for b in bms:
        me = bpy.data.meshes.new('_m')
        b.to_mesh(me)
        b.free()
        out.from_mesh(me)
        bpy.data.meshes.remove(me)
    return out


def temp_obj(bm, name='_cut'):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def manifold(me):
    bm = bmesh.new()
    bm.from_mesh(me)
    ok = len(bm.edges) > 0 and all(e.is_manifold for e in bm.edges)
    bm.free()
    return ok


def bool_apply(ob, cutters, op='DIFFERENCE', solver=None, keep=False):
    """Apply a boolean of ob with one or more cutter objects (they are joined into one operand) and bake the result.
    Uses the fast Manifold solver when every input is a closed manifold, Exact otherwise."""
    if not cutters:
        return ob
    # one modifier per cutter: a single operand made of overlapping solids is not a valid volume for the
    # Manifold solver (it leaves sliver faces inside the result, which show up when the section cuts them)
    base_ok = manifold(ob.data)
    mods = []
    for c in cutters:
        md = ob.modifiers.new('bool', 'BOOLEAN')
        md.operation = op
        md.object = c
        md.solver = solver or ('MANIFOLD' if base_ok and manifold(c.data) else 'EXACT')
        if md.solver == 'EXACT':
            md.use_self = True
            md.use_hole_tolerant = True
        mods.append(md)
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev)
    for md in mods:
        ob.modifiers.remove(md)
    old = ob.data
    mats = list(old.materials)
    ob.data = me
    me.materials.clear()
    for m in mats:
        me.materials.append(m)
    bpy.data.meshes.remove(old)
    if not keep:
        for c in cutters:
            cm = c.data
            bpy.data.objects.remove(c)
            if cm.users == 0:
                bpy.data.meshes.remove(cm)
    return ob


def cutters_from(bms):
    return [temp_obj(b) for b in bms]


# ---------------------------------------------------------------- node-math builder (shader + geometry trees)
class N:
    """Wraps an output socket so node math can be written as Python expressions."""
    def __init__(self, nb, sock):
        self.nb, self.s = nb, sock

    def _b(self, op, o, swap=False):
        a, b = (o, self) if swap else (self, o)
        return self.nb.math(op, a, b)

    def __add__(self, o): return self._b('ADD', o)
    def __radd__(self, o): return self._b('ADD', o, True)
    def __sub__(self, o): return self._b('SUBTRACT', o)
    def __rsub__(self, o): return self._b('SUBTRACT', o, True)
    def __mul__(self, o): return self._b('MULTIPLY', o)
    def __rmul__(self, o): return self._b('MULTIPLY', o, True)
    def __truediv__(self, o): return self._b('DIVIDE', o)
    def __rtruediv__(self, o): return self._b('DIVIDE', o, True)
    def __neg__(self): return self.nb.math('MULTIPLY', self, -1.0)
    def __pow__(self, o): return self._b('POWER', o)
    def __gt__(self, o): return self._b('GREATER_THAN', o)
    def __lt__(self, o): return self._b('LESS_THAN', o)


class NB:
    """Node builder for one tree. Values can be floats, sockets or N wrappers."""
    def __init__(self, tree):
        self.t = tree
        self.n = 0

    def node(self, kind, **props):
        nd = self.t.nodes.new(kind)
        for k, v in props.items():
            setattr(nd, k, v)
        nd.location = (300 * (self.n % 12), -220 * (self.n // 12))
        self.n += 1
        return nd

    def put(self, val, inp):
        if isinstance(val, N):
            self.t.links.new(val.s, inp)
        elif isinstance(val, bpy.types.NodeSocket):
            self.t.links.new(val, inp)
        elif val is not None:
            inp.default_value = val

    def math(self, op, a, b=None, c=None, clamp=False):
        nd = self.node('ShaderNodeMath', operation=op, use_clamp=clamp)
        for i, v in enumerate((a, b, c)):
            if v is not None:
                self.put(v, nd.inputs[i])
        return N(self, nd.outputs[0])

    def vmath(self, op, a, b=None, c=None, out=0):
        nd = self.node('ShaderNodeVectorMath', operation=op)
        for i, v in enumerate((a, b, c)):
            if v is not None:
                self.put(v, nd.inputs[i])
        return N(self, nd.outputs[out])

    def sep(self, v):
        nd = self.node('ShaderNodeSeparateXYZ')
        self.put(v, nd.inputs[0])
        return N(self, nd.outputs[0]), N(self, nd.outputs[1]), N(self, nd.outputs[2])

    def comb(self, x, y, z):
        nd = self.node('ShaderNodeCombineXYZ')
        for i, v in enumerate((x, y, z)):
            self.put(v, nd.inputs[i])
        return N(self, nd.outputs[0])

    def smooth(self, a, b, x):
        """smoothstep(a, b, x) via Map Range."""
        nd = self.node('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP', clamp=True)
        self.put(x, nd.inputs['Value']); self.put(a, nd.inputs['From Min']); self.put(b, nd.inputs['From Max'])
        nd.inputs['To Min'].default_value = 0.0
        nd.inputs['To Max'].default_value = 1.0
        return N(self, nd.outputs[0])

    def remap(self, x, a, b, c=0.0, d=1.0, clamp=True):
        nd = self.node('ShaderNodeMapRange', clamp=clamp)
        self.put(x, nd.inputs['Value']); self.put(a, nd.inputs['From Min']); self.put(b, nd.inputs['From Max'])
        self.put(c, nd.inputs['To Min']); self.put(d, nd.inputs['To Max'])
        return N(self, nd.outputs[0])

    def mix(self, f, a, b, kind='FLOAT', blend='MIX'):
        nd = self.node('ShaderNodeMix', data_type=kind, blend_type=blend)
        idx = {'FLOAT': (2, 3, 0), 'VECTOR': (4, 5, 1), 'RGBA': (6, 7, 2)}[kind]
        self.put(f, nd.inputs[0])
        self.put(a, nd.inputs[idx[0]]); self.put(b, nd.inputs[idx[1]])
        return N(self, nd.outputs[idx[2]])

    def clamp01(self, x):
        return self.math('MAXIMUM', self.math('MINIMUM', x, 1.0), 0.0)

    def abs(self, x): return self.math('ABSOLUTE', x)
    def sqrt(self, x): return self.math('SQRT', x)
    def mn(self, a, b): return self.math('MINIMUM', a, b)
    def mx(self, a, b): return self.math('MAXIMUM', a, b)
    def sign(self, x): return self.math('SIGN', x)
    def fract(self, x): return self.math('FRACT', x)
    def exp(self, x): return self.math('EXPONENT', x)
    def step(self, edge, x): return self.math('GREATER_THAN', x, edge)
    def sel(self, c, a, b):
        """c ? a : b for 0/1 conditions (float)."""
        return self.mix(c, b, a)

    def length(self, v): return self.vmath('LENGTH', v, out=1)

    def attr(self, name):
        """Scene custom property (shader trees): Attribute node, View Layer type."""
        nd = self.node('ShaderNodeAttribute', attribute_type='VIEW_LAYER', attribute_name=name)
        return N(self, nd.outputs['Fac'])

    def value(self, v):
        nd = self.node('ShaderNodeValue')
        nd.outputs[0].default_value = v
        return N(self, nd.outputs[0])


def rgb(h):
    """sRGB hex → linear RGBA."""
    def lin(c):
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (lin((h >> 16) & 255), lin((h >> 8) & 255), lin(h & 255), 1.0)


# ---------------------------------------------------------------- keyframes from exported columns
def decimate(vals, eps=1e-7):
    """Indices of keys to keep: drops only the inner points of exactly linear (incl. constant) runs."""
    import numpy as np
    v = np.asarray(vals, dtype=float)
    n = len(v)
    if n <= 2:
        return list(range(n))
    d2 = np.abs(v[2:] - 2 * v[1:-1] + v[:-2]) > eps
    return [0] + (np.nonzero(d2)[0] + 1).tolist() + [n - 1]


def set_fcurve(id_data, path, index, vals, cuts=(), const=False, eps=1e-5, frame0=0):
    """Write one fcurve for vals (one value per frame). At camera cuts the new value starts half a frame early
    (CONSTANT hold before it), so motion blur never smears a jump across a cut."""
    ad = id_data.animation_data or id_data.animation_data_create()
    if ad.action is None:
        ad.action = bpy.data.actions.new(id_data.name + 'Action')
    act = ad.action
    fc = _new_fcurve(act, id_data, path, max(0, index))
    if len(fc.keyframe_points):
        fc.keyframe_points.clear()
    n = len(vals)
    cutset = set(c for c in cuts if 0 < c < n and abs(vals[c] - vals[c - 1]) > eps)
    idx = set(decimate(vals, eps))
    for c in cutset:
        idx.add(c - 1); idx.add(c)
        if c + 1 < n:
            idx.add(c + 1)
    keys = []
    for i in sorted(idx):
        if i in cutset:
            keys.append((i - 0.5, vals[i], 'LINEAR'))
        mode = 'CONSTANT' if const or (i + 1) in cutset else 'LINEAR'
        keys.append((i, vals[i], mode))
    fc.keyframe_points.add(len(keys))
    co = []
    for f, v, _ in keys:
        co += [f + frame0, v]
    fc.keyframe_points.foreach_set('co', co)
    interp = {'CONSTANT': 0, 'LINEAR': 1}
    fc.keyframe_points.foreach_set('interpolation', [interp[m] for _, _, m in keys])
    fc.update()
    return fc


def _new_fcurve(act, id_data, path, index):
    """Get or create the fcurve (layered actions in Blender 4.4+/5.x)."""
    if hasattr(act, 'fcurve_ensure_for_datablock'):
        return act.fcurve_ensure_for_datablock(id_data, path, index=index)
    return act.fcurves.find(path, index=index) or act.fcurves.new(path, index=index)
