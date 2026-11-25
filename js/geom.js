/* Geometry helpers: vectors, member boxes, 2D hulls. Units are feet; x = length, y = width, z = up. */
window.TF = window.TF || {};

TF.G = (function () {
  const v = (x, y, z) => ({ x, y, z });
  const add = (a, b) => v(a.x + b.x, a.y + b.y, a.z + b.z);
  const sub = (a, b) => v(a.x - b.x, a.y - b.y, a.z - b.z);
  const mul = (a, k) => v(a.x * k, a.y * k, a.z * k);
  const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  const cross = (a, b) => v(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
  const len = a => Math.hypot(a.x, a.y, a.z);
  const norm = a => { const l = len(a) || 1; return mul(a, 1 / l); };
  const dist = (a, b) => len(sub(a, b));

  /* Cross-section axes for a member: w = width direction (b), h = depth direction (d).
     Vertical members: width along y, depth along x.
     Others: width is horizontal and square to the axis, depth is perpendicular to both. */
  function axes(m) {
    const ax = norm(sub(m.p2, m.p1));
    let w, h;
    if (Math.abs(ax.z) > 0.98) {
      w = v(0, 1, 0); h = v(1, 0, 0);
    } else {
      w = norm(cross(v(0, 0, 1), ax));
      h = norm(cross(ax, w));
      if (h.z < 0) h = mul(h, -1);
    }
    return { ax, w, h };
  }

  /* Eight corners of a member box */
  function corners(m) {
    const { w, h } = axes(m);
    const hb = m.b / 24, hd = m.d / 24; // inches to half-feet
    const out = [];
    for (const p of [m.p1, m.p2]) {
      for (const [sw, sh] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        out.push(add(p, add(mul(w, sw * hb), mul(h, sh * hd))));
      }
    }
    return out;
  }

  /* Faces as corner index quads (outward winding not required — painter's sort) */
  const FACES = [
    [0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]
  ];

  /* Convex hull, monotone chain, of [x, y] points */
  function hull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (p.length < 3) return p;
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) {
      while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
      lo.push(q);
    }
    for (let i = p.length - 1; i >= 0; i--) {
      const q = p[i];
      while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
      up.push(q);
    }
    up.pop(); lo.pop();
    return lo.concat(up);
  }

  function centroid(m) { return mul(add(m.p1, m.p2), 0.5); }

  function bounds(members) {
    const b = { x0: Infinity, y0: Infinity, z0: Infinity, x1: -Infinity, y1: -Infinity, z1: -Infinity };
    for (const m of members) for (const c of corners(m)) {
      b.x0 = Math.min(b.x0, c.x); b.x1 = Math.max(b.x1, c.x);
      b.y0 = Math.min(b.y0, c.y); b.y1 = Math.max(b.y1, c.y);
      b.z0 = Math.min(b.z0, c.z); b.z1 = Math.max(b.z1, c.z);
    }
    return b;
  }

  return { v, add, sub, mul, dot, cross, len, norm, dist, axes, corners, FACES, hull, centroid, bounds };
})();
