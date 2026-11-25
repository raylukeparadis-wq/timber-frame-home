/* 3D view: painter's-algorithm box renderer on a canvas, orbit by drag, zoom by wheel or pinch */
window.TF = window.TF || {};

TF.View3D = function (canvas) {
  const G = TF.G;
  const ctx = canvas.getContext('2d');
  const st = { yaw: -0.65, pitch: 0.42, zoom: 1, panX: 0, panY: 0 };
  let F = null, hidden = new Set(), showRoof = false, colors = {}, queued = false, hiKind = null;
  const LIGHT = G.norm(G.v(0.45, -0.6, 0.75));

  /* Resolve a CSS variable (including light-dark()) to [r, g, b, a] through a probe element */
  let probe = null;
  function resolve(name) {
    if (!probe) { probe = document.createElement('span'); probe.style.display = 'none'; document.body.appendChild(probe); }
    probe.style.color = 'var(' + name + ')';
    const m = getComputedStyle(probe).color.match(/[\d.]+/g) || [136, 136, 136];
    return [+m[0], +m[1], +m[2], m[3] == null ? 1 : +m[3]];
  }
  function readColors() {
    for (const k of Object.keys(TF.KINDS)) colors[k] = resolve(TF.KINDS[k].color);
    colors.roof = resolve('--s-roof');
    colors.ground = resolve('--ground');
    const e = resolve('--edge');
    colors.line = 'rgba(' + e[0] + ',' + e[1] + ',' + e[2] + ',' + e[3] + ')';
  }
  const rgb = (c, k, a) => 'rgba(' + Math.round(c[0] * k) + ',' + Math.round(c[1] * k) + ',' + Math.round(c[2] * k) + ',' + (a == null ? 1 : a) + ')';

  function camera() {
    const r = canvas.getBoundingClientRect();
    const B = { x0: -1, y0: -1, z0: -1, x1: F.L + 1, y1: F.W + 1, z1: F.ridgeTop + 1 };
    const c = G.v((B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2, (B.z0 + B.z1) / 2.4);
    const size = Math.hypot(B.x1 - B.x0, B.y1 - B.y0, B.z1 - B.z0);
    const scale = (Math.min(r.width, r.height * 1.4) / size) * 0.95 * st.zoom;
    return { c, D: size * 2.6, scale, cx: r.width / 2 + st.panX, cy: r.height / 2 + st.panY + r.height * 0.04 };
  }
  function project(P, cam) {
    const x = P.x - cam.c.x, y = P.y - cam.c.y, z = P.z - cam.c.z;
    const cy = Math.cos(st.yaw), sy = Math.sin(st.yaw);
    const x1 = x * cy - y * sy, y1 = x * sy + y * cy;
    const cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
    const up = z * cp + y1 * sp;
    const depth = y1 * cp - z * sp;
    const f = cam.D / (cam.D + depth);
    return [cam.cx + x1 * f * cam.scale, cam.cy - up * f * cam.scale, depth];
  }

  function draw() {
    queued = false;
    if (!F) return;
    const dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    if (canvas.width !== Math.round(r.width * dpr) || canvas.height !== Math.round(r.height * dpr)) {
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);
    const cam = camera();
    const polys = [];

    // Foundation slab
    const g0 = -1.2, gp = [G.v(-0.3, -0.3, g0), G.v(F.L + 0.3, -0.3, g0), G.v(F.L + 0.3, F.W + 0.3, g0), G.v(-0.3, F.W + 0.3, g0)];
    const gpp = gp.map(q => project(q, cam));
    ctx.fillStyle = rgb(colors.ground, 1);
    ctx.beginPath(); gpp.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fill();

    for (const m of F.members) {
      if (hidden.has(m.kind)) continue;
      const cs = G.corners(m);
      const pp = cs.map(q => project(q, cam));
      const col = colors[m.kind] || [136, 136, 136];
      const dim = hiKind && hiKind !== m.kind;
      for (const f of G.FACES) {
        const a = cs[f[0]], b = cs[f[1]], c = cs[f[2]];
        const n = G.norm(G.cross(G.sub(b, a), G.sub(c, a)));
        const shade = 0.55 + 0.45 * Math.abs(G.dot(n, LIGHT));
        const depth = (pp[f[0]][2] + pp[f[1]][2] + pp[f[2]][2] + pp[f[3]][2]) / 4;
        polys.push({ pts: f.map(i => pp[i]), depth, fill: rgb(col, shade, dim ? 0.18 : 1), stroke: !dim, long: m.long });
      }
    }
    if (showRoof) for (const pl of F.roof) {
      const pp = pl.map(q => project(q, cam));
      const depth = pp.reduce((a, q) => a + q[2], 0) / pp.length;
      polys.push({ pts: pp, depth: depth - 0.5, fill: rgb(colors.roof, 1, 0.82), stroke: true });
    }
    polys.sort((a, b) => b.depth - a.depth);
    ctx.lineJoin = 'round';
    for (const p of polys) {
      ctx.beginPath();
      p.pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
      ctx.closePath();
      ctx.fillStyle = p.fill; ctx.fill();
      if (p.stroke) { ctx.strokeStyle = colors.line; ctx.lineWidth = 0.6; ctx.stroke(); }
    }
  }
  function redraw() { if (!queued) { queued = true; requestAnimationFrame(draw); } }

  /* ---- Interaction ---- */
  const ptrs = new Map();
  let last = null, pinch0 = null, zoom0 = 1;
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    last = [e.clientX, e.clientY];
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); zoom0 = st.zoom; }
  });
  canvas.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 2 && pinch0) {
      const [a, b] = [...ptrs.values()];
      st.zoom = Math.max(0.3, Math.min(6, zoom0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch0));
    } else if (ptrs.size === 1 && last) {
      const dx = e.clientX - last[0], dy = e.clientY - last[1];
      if (e.shiftKey || e.buttons === 4 || e.buttons === 2) { st.panX += dx; st.panY += dy; }
      else {
        st.yaw += dx * 0.008;
        st.pitch = Math.max(-0.1, Math.min(1.5, st.pitch + dy * 0.006));
      }
    }
    last = [e.clientX, e.clientY];
    redraw();
  });
  const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = null; last = null; };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    st.zoom = Math.max(0.3, Math.min(6, st.zoom * Math.exp(-e.deltaY * 0.0015)));
    redraw();
  }, { passive: false });
  canvas.addEventListener('keydown', e => {
    const k = { ArrowLeft: [-0.1, 0], ArrowRight: [0.1, 0], ArrowUp: [0, -0.08], ArrowDown: [0, 0.08] }[e.key];
    if (!k) return;
    e.preventDefault();
    st.yaw += k[0]; st.pitch = Math.max(-0.1, Math.min(1.5, st.pitch + k[1])); redraw();
  });
  const named = new ResizeObserver(redraw);
  named.observe(canvas);
  const themeWatch = new MutationObserver(() => { readColors(); redraw(); });
  themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (window.matchMedia)window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readColors(); redraw(); });

  return {
    set(frame, hid, roof, hi) { F = frame; hidden = hid; showRoof = roof; hiKind = hi || null; readColors(); redraw(); },
    zoom(k) { st.zoom = Math.max(0.3, Math.min(6, st.zoom * k)); redraw(); },
    reset() { Object.assign(st, { yaw: -0.65, pitch: 0.42, zoom: 1, panX: 0, panY: 0 }); redraw(); },
    preset(yaw, pitch) { st.yaw = yaw; st.pitch = pitch; redraw(); },
    refresh() { readColors(); redraw(); }
  };
};
