/* 2D drawings: bent elevation, side wall elevation and floor framing plan, with dimensions */
window.TF = window.TF || {};

TF.View2D = function (svg) {
  const G = TF.G;
  const ROOFK = ['rafter', 'crafter', 'ridge', 'purlin', 'collar', 'king', 'queen', 'strain', 'strut'];
  let F = null, mode = 'bent', bentIdx = 0, hidden = new Set(), showRoof = true, hiKind = null;
  let base = null, vb = null, key = '';

  const projs = {
    bent: P => [P.y, -P.z],
    side: P => [P.x, -P.z],
    plan: P => [P.x, -P.y]
  };

  function polyOf(m, pr) {
    return G.hull(G.corners(m).map(pr)).map(q => q[0].toFixed(3) + ',' + q[1].toFixed(3)).join(' ');
  }

  function pickMembers() {
    let list = F.members.filter(m => !hidden.has(m.kind));
    if (mode === 'bent') {
      const bx = F.bents[bentIdx] ? F.bents[bentIdx].x : 0;
      const own = list.filter(m => m.bent === bentIdx);
      // Longitudinal members passing through or ending at this bent, seen in section
      const cut = list.filter(m => m.bent === undefined && m.kind !== 'brace' && m.kind !== 'crafter' &&
        Math.min(m.p1.x, m.p2.x) - 0.05 <= bx && Math.max(m.p1.x, m.p2.x) + 0.05 >= bx);
      list = own.concat(cut);
    } else if (mode === 'side') {
      list = list.filter(m => G.centroid(m).y <= F.W / 2 + 0.01 && m.kind !== 'joist');
      list.sort((a, b) => G.centroid(b).y - G.centroid(a).y);
    } else {
      list = list.filter(m => !ROOFK.includes(m.kind) && !(F.two && m.kind === 'tie') && !(F.cape && m.kind === 'plate'));
      const top = k => (k === 'post' || k === 'ipost') ? 1 : 0;
      list.sort((a, b) => top(a.kind) - top(b.kind) || G.centroid(a).z - G.centroid(b).z || (a.kind === 'joist' ? -1 : 1));
    }
    return list;
  }

  function render() {
    if (!F) return;
    const pr = projs[mode];
    const list = pickMembers();
    const pxW = svg.clientWidth || 800;
    const W = F.W, L = F.L;
    // world extents for this view
    let ext;
    if (mode === 'bent') ext = { x0: -3.5, x1: W + 4.5, y0: -F.ridgeTop - 2, y1: 5 };
    else if (mode === 'side') ext = { x0: -3.5, x1: L + 4.5, y0: -F.ridgeTop - 2, y1: 5.5 };
    else ext = { x0: -3.5, x1: L + 4.5, y0: -W - 5.5, y1: 4.5 };
    const k = mode + '|' + W + '|' + L + '|' + F.ridgeTop.toFixed(2);
    base = { x: ext.x0, y: ext.y0, w: ext.x1 - ext.x0, h: ext.y1 - ext.y0 };
    if (k !== key || !vb) { vb = Object.assign({}, base); key = k; }
    svg.setAttribute('viewBox', vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const pxH = svg.clientHeight || 500;
    const ftPerPx = Math.max(vb.w / pxW, vb.h / pxH);
    const fs = 12.5 * ftPerPx, sw = ftPerPx;

    const out = [];
    out.push('<style>.mem{stroke:var(--ink);stroke-width:' + (0.8 * sw) + ';stroke-linejoin:round}.mem.long{stroke:var(--t-long);stroke-width:' + (2.2 * sw) + '}' +
      '.dim{stroke:var(--muted);stroke-width:' + sw + ';fill:none}.dt{font:500 ' + fs + 'px var(--f-body);fill:var(--muted)}' +
      '.lbl{font:600 ' + (fs * 1.25) + 'px var(--f-head);fill:var(--ink)}.ghost{fill:none;stroke:var(--muted);stroke-width:' + sw + ';stroke-dasharray:' + 4 * sw + ' ' + 3 * sw + '}' +
      '.gnd{stroke:var(--muted);stroke-width:' + 1.5 * sw + '}</style>');

    // context: ground and roof outline
    if (mode !== 'plan') {
      const span = mode === 'bent' ? [-2.5, W + 2.5] : [-2.5, L + 2.5];
      const sillB = F.members.find(m => m.kind === 'sill');
      const gz = sillB ? sillB.d / 12 : 0;
      out.push('<line class="gnd" x1="' + span[0] + '" y1="' + gz + '" x2="' + span[1] + '" y2="' + gz + '"/>');
      if (showRoof) {
        const oe = F.s.overhangEave, og = F.s.overhangGable;
        if (mode === 'bent') out.push('<polyline class="ghost" points="' + (-oe) + ',' + (-F.eaveZ) + ' ' + W / 2 + ',' + (-F.ridgeTop) + ' ' + (W + oe) + ',' + (-F.eaveZ) + '"/>');
        else out.push('<rect class="ghost" x="' + (-og) + '" y="' + (-F.ridgeTop) + '" width="' + (L + 2 * og) + '" height="' + (F.ridgeTop - F.eaveZ) + '"/>');
      }
    } else if (showRoof) {
      const oe = F.s.overhangEave, og = F.s.overhangGable;
      out.push('<rect class="ghost" x="' + (-og) + '" y="' + (-W - oe) + '" width="' + (L + 2 * og) + '" height="' + (W + 2 * oe) + '"/>');
      out.push('<line class="ghost" x1="' + (-og) + '" y1="' + (-W / 2) + '" x2="' + (L + og) + '" y2="' + (-W / 2) + '"/>');
    }

    for (const m of list) {
      const dim = hiKind && hiKind !== m.kind ? ' opacity="0.2"' : '';
      out.push('<polygon class="mem' + (m.long ? ' long' : '') + '" fill="var(' + TF.KINDS[m.kind].color + ')"' + dim +
        ' points="' + polyOf(m, pr) + '"><title>' + TF.esc(TF.KINDS[m.kind].label + ' ' + m.size + ' · ' + TF.ftIn(m.len || 0) +
        (m.long ? ' · longer than your log limit' : '')) + '</title></polygon>');
    }

    // dimensions
    const dimH = (x0, x1, y, label) => {
      const t = 5 * sw;
      out.push('<path class="dim" d="M' + x0 + ' ' + y + 'H' + x1 + 'M' + x0 + ' ' + (y - t) + 'v' + 2 * t + 'M' + x1 + ' ' + (y - t) + 'v' + 2 * t + '"/>');
      if (Math.abs(x1 - x0) > fs * 2.2) out.push('<text class="dt" text-anchor="middle" x="' + (x0 + x1) / 2 + '" y="' + (y - 3 * sw) + '">' + label + '</text>');
    };
    const dimV = (y0, y1, x, label, right) => {
      const t = 5 * sw;
      out.push('<path class="dim" d="M' + x + ' ' + y0 + 'V' + y1 + 'M' + (x - t) + ' ' + y0 + 'h' + 2 * t + 'M' + (x - t) + ' ' + y1 + 'h' + 2 * t + '"/>');
      const ty = (y0 + y1) / 2, tx = x + (right ? 4 : -4) * sw;
      out.push('<text class="dt" text-anchor="middle" transform="translate(' + tx + ' ' + ty + ') rotate(-90)">' + label + '</text>');
    };

    if (mode === 'bent') {
      const bt = F.bents[bentIdx];
      dimH(0, W, 2.2, TF.ftIn(W));
      if (F.iposts.length) {
        const xs = [0].concat(F.iposts, [W]);
        for (let i = 0; i < xs.length - 1; i++) dimH(xs[i], xs[i + 1], 1.1, TF.ftIn(xs[i + 1] - xs[i]));
      }
      dimV(0, -F.topZ, -1.6, TF.ftIn(F.topZ) + ' to plate');
      if (!F.one) dimV(0, -F.floorZ, -0.6, TF.ftIn(F.floorZ));
      dimV(0, -F.ridgeTop, W + 2.4, TF.ftIn(F.ridgeTop) + ' to ridge', true);
      out.push('<text class="lbl" x="0" y="' + (-F.ridgeTop - 0.6) + '">' + TF.esc(bt ? bt.label : '') + '</text>');
      out.push('<text class="dt" x="' + (W * 0.75 + 1.1) + '" y="' + (-(F.topZ + F.rise / 2) + 1.2) + '">' + F.s.pitch + '/12</text>');
    } else if (mode === 'side') {
      for (const b of F.bays) dimH(b.x0, b.x1, 1.4, TF.ftIn(b.x1 - b.x0));
      dimH(0, L, 2.8, TF.ftIn(L));
      dimV(0, -F.topZ, -1.6, TF.ftIn(F.topZ));
      dimV(0, -F.ridgeTop, L + 2.4, TF.ftIn(F.ridgeTop), true);
      out.push('<text class="lbl" x="0" y="' + (-F.ridgeTop - 0.6) + '">South wall, looking north</text>');
    } else {
      for (const b of F.bays) dimH(b.x0, b.x1, -W - 1.4, TF.ftIn(b.x1 - b.x0));
      dimH(0, L, -W - 2.8, TF.ftIn(L));
      dimV(0, -W, -1.6, TF.ftIn(W));
      const groups = [];
      for (const b of F.bents) {
        const g = groups[groups.length - 1];
        if (g && b.x - g.x < 1.5) { g.t += '·' + (b.idx + 1); g.x = (g.x + b.x) / 2; } else groups.push({ x: b.x, t: String(b.idx + 1) });
      }
      for (const g of groups) out.push('<text class="dt" text-anchor="middle" x="' + g.x + '" y="1.7">' + g.t + '</text>');
      out.push('<text class="lbl" x="0" y="' + (-W - 4.2) + '">' + (F.one ? 'Frame plan' : 'Floor framing plan') + ' — south wall at the bottom, bent numbers below it</text>');
    }
    svg.innerHTML = out.join('');
  }

  /* ---- Pan and zoom ---- */
  let drag = null;
  svg.addEventListener('pointerdown', e => { svg.setPointerCapture(e.pointerId); drag = [e.clientX, e.clientY]; });
  svg.addEventListener('pointermove', e => {
    if (!drag || !vb) return;
    const k = Math.max(vb.w / svg.clientWidth, vb.h / svg.clientHeight);
    vb.x -= (e.clientX - drag[0]) * k; vb.y -= (e.clientY - drag[1]) * k;
    drag = [e.clientX, e.clientY];
    svg.setAttribute('viewBox', vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h);
  });
  svg.addEventListener('pointerup', () => { drag = null; });
  svg.addEventListener('pointercancel', () => { drag = null; });
  function zoom(k) {
    if (!vb) return;
    const cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2;
    vb.w = Math.max(3, Math.min(base.w * 3, vb.w / k)); vb.h = vb.w * base.h / base.w;
    vb.x = cx - vb.w / 2; vb.y = cy - vb.h / 2;
    render();
  }
  svg.addEventListener('wheel', e => { e.preventDefault(); zoom(Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  const named = new ResizeObserver(() => { if (svg.style.display !== 'none') render(); });
  named.observe(svg);

  return {
    set(frame, opts) {
      F = frame; mode = opts.mode; bentIdx = Math.min(opts.bent || 0, frame.bents.length - 1);
      hidden = opts.hidden; showRoof = opts.roof; hiKind = opts.hi || null;
      render();
    },
    zoom,
    reset() { vb = null; render(); },
    svgText() { return svg.outerHTML; }
  };
};
