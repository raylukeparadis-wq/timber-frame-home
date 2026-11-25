/* Frame generator: turns a design state into a list of members (centerline boxes).
   x runs along the length (0 → L), y across the width (0 = south wall, W = north wall), z up from sill top. */
window.TF = window.TF || {};

TF.buildFrame = function (s) {
  const G = TF.G, v = G.v;
  const IN = n => n / 12;
  const sz = k => TF.sizeIn(s.sizes[k]);
  const W = s.width, L = s.length, p = s.pitch / 12;
  const theta = Math.atan(p);
  const one = s.stories === '1', cape = s.stories === '1.5', two = s.stories === '2';
  const topZ = one ? s.h1 : cape ? s.h1 + s.knee : s.h1 + s.h2;
  const floorZ = s.h1;
  const rise = (W / 2) * p;
  const apexZ = topZ + rise;
  const raf = sz('rafter');
  const rOff = IN(raf.d / 2) / Math.cos(theta);   // rafter centerline above the plate's outer top corner
  const leg = s.braceLeg;
  const post = sz('post');
  const pb = IN(post.b), pd = IN(post.d);
  const warnings = [];
  const M = [];

  let truss = s.truss;
  if (cape && truss !== 'collar') { truss = 'collar'; warnings.push('A 1½ story cape has no tie beam at the plate, so the bents use a collar tie.'); }

  function add(kind, p1, p2, extra) {
    const key = TF.KINDS[kind].size;
    const d = sz(key);
    M.push(Object.assign({ kind, p1, p2, b: d.b, d: d.d, size: s.sizes[key] }, extra || {}));
  }
  const rafterZ = y => topZ + rOff + Math.min(y, W - y) * p;   // rafter centerline height at y

  /* ---- Sections and bents ---- */
  const bays = Math.max(1, s.bays);
  const secs = Math.max(1, Math.min(s.sections, bays));
  const bayLen = L / bays;
  const sections = [];
  const bents = [];
  let bayStart = 0;
  for (let i = 0; i < secs; i++) {
    const count = Math.floor(bays / secs) + (i < bays % secs ? 1 : 0);
    const xs = bayStart * bayLen, xe = (bayStart + count) * bayLen;
    const sec = { idx: i, xs, xe, bents: [] };
    for (let k = 0; k <= count; k++) {
      let x = (bayStart + k) * bayLen;
      if (k === 0) x = xs + pd / 2;
      if (k === count) x = xe - pd / 2;
      const kind = k === 0 ? 'start' : k === count ? 'end' : 'mid';
      const b = { x, sec: i, pos: kind, idx: bents.length };
      b.outer = (i === 0 && k === 0) || (i === secs - 1 && k === count);
      b.label = 'Bent ' + (bents.length + 1) + (b.outer ? ' (end wall)' : kind === 'mid' ? '' : ' (back-to-back)');
      bents.push(b); sec.bents.push(b);
    }
    sections.push(sec);
    bayStart += count;
  }
  const bayList = [];
  for (const sec of sections) for (let k = 0; k < sec.bents.length - 1; k++) {
    bayList.push({ sec: sec.idx, x0: sec.bents[k].x, x1: sec.bents[k + 1].x, a: sec.bents[k], b: sec.bents[k + 1] });
  }

  /* Plates and sills run continuous through a section unless longer than the sawable log */
  function longSpans(sec) {
    if (sec.xe - sec.xs <= s.maxStock) return [[sec.xs, sec.xe]];
    const out = [], bx = sec.bents.map(b => b.x);
    for (let k = 0; k < bx.length - 1; k++) out.push([k === 0 ? sec.xs : bx[k], k === bx.length - 2 ? sec.xe : bx[k + 1]]);
    return out;
  }

  const yS = pb / 2, yN = W - pb / 2;
  const iposts = s.interiorPosts === 'center' ? [W / 2] : s.interiorPosts === 'thirds' ? [W / 3, 2 * W / 3] : [];
  const lowBeam = one ? 'tie' : 'floorbeam';
  const lowBeamTop = one ? topZ : floorZ;
  const lowBeamD = IN(sz(lowBeam).d);
  const tieD = IN(sz('tie').d);

  /* ---- Bents ---- */
  for (const bt of bents) {
    const x = bt.x, tag = { bent: bt.idx };
    add('post', v(x, yS, 0), v(x, yS, topZ), Object.assign({ wall: 'S' }, tag));
    add('post', v(x, yN, 0), v(x, yN, topZ), Object.assign({ wall: 'N' }, tag));

    const zLow = lowBeamTop - lowBeamD / 2;
    // Floor beams too long for the log limit break over the interior posts; tie beams stay whole (they carry tension)
    if (lowBeam === 'floorbeam' && W > s.maxStock && iposts.length) {
      const ys = [0].concat(iposts, [W]);
      for (let k = 0; k < ys.length - 1; k++) add(lowBeam, v(x, ys[k], zLow), v(x, ys[k + 1], zLow), Object.assign({ split: true }, tag));
    } else add(lowBeam, v(x, 0, zLow), v(x, W, zLow), tag);
    for (const y of iposts) add('ipost', v(x, y, 0), v(x, y, lowBeamTop - lowBeamD), tag);
    if (two) add('tie', v(x, 0, topZ - tieD / 2), v(x, W, topZ - tieD / 2), tag);

    // Bent-plane knee braces into the lower beam (and the top tie on two-story houses)
    const braceBeams = [lowBeamTop - lowBeamD];
    if (two) braceBeams.push(topZ - tieD);
    for (const zb of braceBeams) {
      const zBase = zb - leg;
      if (zBase < 2) continue;
      add('brace', v(x, yS + pb / 2, zBase), v(x, yS + pb / 2 + leg, zb), tag);
      add('brace', v(x, yN - pb / 2, zBase), v(x, yN - pb / 2 - leg, zb), tag);
      if (zb === lowBeamTop - lowBeamD) for (const y of iposts) {
        add('brace', v(x, y - pb / 2, zBase), v(x, y - pb / 2 - leg, zb), tag);
        add('brace', v(x, y + pb / 2, zBase), v(x, y + pb / 2 + leg, zb), tag);
      }
    }

    // Principal rafters
    add('rafter', v(x, 0, topZ + rOff), v(x, W / 2, apexZ + rOff), tag);
    add('rafter', v(x, W, topZ + rOff), v(x, W / 2, apexZ + rOff), tag);

    if (truss === 'collar') {
      const zc = topZ + rOff + rise * 0.6;
      const yc = (zc - topZ - rOff) / p;
      add('collar', v(x, yc, zc), v(x, W - yc, zc), tag);
    } else if (truss === 'king') {
      add('king', v(x, W / 2, topZ), v(x, W / 2, apexZ + rOff), tag);
      const zs = topZ + Math.min(rise * 0.25, 2);
      add('strut', v(x, W / 2, zs), v(x, W / 4, rafterZ(W / 4)), tag);
      add('strut', v(x, W / 2, zs), v(x, 3 * W / 4, rafterZ(3 * W / 4)), tag);
    } else if (truss === 'queen') {
      const zq = rafterZ(W / 3);
      add('queen', v(x, W / 3, topZ), v(x, W / 3, zq), tag);
      add('queen', v(x, 2 * W / 3, topZ), v(x, 2 * W / 3, zq), tag);
      const zs = zq - IN(raf.d) - IN(sz('collar').d) / 2;
      add('strain', v(x, W / 3, zs), v(x, 2 * W / 3, zs), tag);
    }
  }

  /* ---- Longitudinal members ---- */
  const plate = sz('plate'), cg = sz('cgirt'), gt = sz('girt'), sl = sz('sill');
  for (const sec of sections) {
    for (const side of ['S', 'N']) {
      const ywall = side === 'S' ? yS : yN;
      const yPlate = side === 'S' ? IN(plate.b) / 2 : W - IN(plate.b) / 2;
      const zPlate = topZ - IN(plate.d) / 2;
      for (const [x0, x1] of longSpans(sec)) add('plate', v(x0, yPlate, zPlate), v(x1, yPlate, zPlate), { wall: side, sec: sec.idx });
      if (s.sill) {
        const ySill = side === 'S' ? IN(sl.b) / 2 : W - IN(sl.b) / 2;
        for (const [x0, x1] of longSpans(sec)) add('sill', v(x0, ySill, -IN(sl.d) / 2), v(x1, ySill, -IN(sl.d) / 2), { wall: side, sec: sec.idx });
      }
      // Wall braces post → plate (and post → connecting girt), inside each bay only
      const braceTo = [topZ - IN(plate.d)];
      if (!one) braceTo.push(floorZ - IN(cg.d));
      for (let k = 0; k < sec.bents.length; k++) {
        const bt = sec.bents[k];
        const dirs = k === 0 ? [1] : k === sec.bents.length - 1 ? [-1] : [1, -1];
        for (const zb of braceTo) {
          const zBase = zb - leg;
          const floorBelow = zb > floorZ && !one ? floorZ : 0;
          if (zBase < floorBelow + 1.5) continue;
          for (const dir of dirs) {
            const xa = bt.x + dir * pd / 2;
            add('brace', v(xa, ywall, zBase), v(xa + dir * leg, ywall, zb), { wall: side, sec: sec.idx });
          }
        }
      }
    }
  }

  // Per-bay members: connecting girts, wall girts, joists, purlins, ridge, common rafters
  const sideGirtZ = [];
  if (s.wallGirts) {
    sideGirtZ.push(((one ? topZ - IN(plate.d) : floorZ - IN(cg.d))) / 2);
    if (two) sideGirtZ.push((floorZ + topZ - IN(plate.d)) / 2);
  }
  for (const bay of bayList) {
    const { x0, x1 } = bay;
    for (const side of ['S', 'N']) {
      const ywall = side === 'S' ? IN(cg.b) / 2 : W - IN(cg.b) / 2;
      if (!one) add('cgirt', v(x0, ywall, floorZ - IN(cg.d) / 2), v(x1, ywall, floorZ - IN(cg.d) / 2), { wall: side, sec: bay.sec });
      const yg = side === 'S' ? IN(gt.b) / 2 : W - IN(gt.b) / 2;
      for (const z of sideGirtZ) add('girt', v(x0, yg, z), v(x1, yg, z), { wall: side, sec: bay.sec });
    }
    if (!one) {
      const sp = s.joistSpacing / 12, jd = IN(sz('joist').d);
      for (let y = sp; y < W - 0.4; y += sp) {
        if (iposts.some(q => Math.abs(q - y) < 0.2)) continue;
        add('joist', v(x0, y, floorZ - jd / 2), v(x1, y, floorZ - jd / 2), { sec: bay.sec });
      }
    }
    const rg = sz('ridge');
    add('ridge', v(x0, W / 2, apexZ + rOff + IN(raf.d - rg.d) / 2), v(x1, W / 2, apexZ + rOff + IN(raf.d - rg.d) / 2), { sec: bay.sec });
    if (s.roof === 'purlin') {
      const pu = sz('purlin');
      const n = s.purlinsPerSide;
      for (let k = 1; k <= n; k++) {
        const yy = (k / (n + 1)) * (W / 2);
        for (const y of [yy, W - yy]) {
          const z = rafterZ(y) + IN(raf.d - pu.d) / 2;
          add('purlin', v(x0, y, z), v(x1, y, z), { sec: bay.sec });
        }
      }
    } else {
      const cr = sz('crafter');
      const cOff = IN(cr.d / 2) / Math.cos(theta);
      const sp = 2, oh = s.overhangEave;
      const n = Math.max(1, Math.round((x1 - x0) / sp));
      for (let k = 1; k < n; k++) {
        const x = x0 + (k * (x1 - x0)) / n;
        add('crafter', v(x, -oh, topZ + cOff - oh * p), v(x, W / 2, apexZ + cOff), { sec: bay.sec });
        add('crafter', v(x, W + oh, topZ + cOff - oh * p), v(x, W / 2, apexZ + cOff), { sec: bay.sec });
      }
    }
  }

  // End-wall girts and end sills on the two outer bents
  const outer = bents.filter(b => b.outer);
  for (const bt of outer) {
    const ends = [0].concat(iposts, [W]);
    const z1 = one ? (topZ - tieD) / 2 : (floorZ - lowBeamD) / 2;
    const zs = s.wallGirts ? [z1] : [];
    if (two && s.wallGirts) zs.push((floorZ + topZ - tieD) / 2);
    for (const z of zs) for (let k = 0; k < ends.length - 1; k++) {
      add('girt', v(bt.x, ends[k] + (k === 0 ? pb / 2 : 0), z), v(bt.x, ends[k + 1] - (k === ends.length - 2 ? pb / 2 : 0), z), { bent: bt.idx, wall: bt.pos === 'start' ? 'W' : 'E' });
    }
    if (s.sill) {
      const xs = bt.pos === 'start' ? IN(sl.b) / 2 : L - IN(sl.b) / 2;
      const ys = W > s.maxStock && iposts.length ? [0].concat(iposts, [W]) : [0, W];
      for (let k = 0; k < ys.length - 1; k++) add('sill', v(xs, ys[k], -IN(sl.d) / 2), v(xs, ys[k + 1], -IN(sl.d) / 2), { wall: bt.pos === 'start' ? 'W' : 'E' });
    }
  }

  // Bay-length and stock warnings
  if (bayLen > 16) warnings.push('Bays are ' + TF.ftIn(bayLen) + ' long — plates, girts and joists get heavy past about 16′.');
  if (one && W > 28 && !iposts.length && truss === 'collar') warnings.push('A wide single story with only a collar tie and no interior posts relies on the tie beam alone — check it.');

  // Roof planes (sheathing outline) for drawing
  const tTop = IN(raf.d) / Math.cos(theta);
  const eZ = topZ + tTop - s.overhangEave * p, rZ = apexZ + tTop;
  const gx0 = -s.overhangGable, gx1 = L + s.overhangGable, oe = s.overhangEave;
  const roof = [
    [v(gx0, -oe, eZ), v(gx1, -oe, eZ), v(gx1, W / 2, rZ), v(gx0, W / 2, rZ)],
    [v(gx0, W + oe, eZ), v(gx1, W + oe, eZ), v(gx1, W / 2, rZ), v(gx0, W / 2, rZ)]
  ];

  return { members: M, bents, bays: bayList, sections, topZ, floorZ, apexZ, rise, ridgeTop: rZ, eaveZ: eZ,
    truss, warnings, roof, iposts, W, L, bayLen, one, cape, two };
};
