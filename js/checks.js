/* Rough sizing checks: simple-span bending, shear and deflection under uniform load.
   A screening tool for choosing sizes, not engineering — joinery, axial thrust and connections are not checked. */
window.TF = window.TF || {};

TF.checks = function (s, F) {
  const sp = TF.SPECIES[s.species] || TF.SPECIES.ewp;
  const out = [];
  const W = s.width, p = s.pitch / 12;
  const slope = Math.sqrt(1 + p * p);

  /* span ft, wT total plf, wL live plf, defl limit L/x */
  function beam(name, sizeKey, span, wT, wL, limit, note) {
    const { b, d } = TF.sizeIn(s.sizes[sizeKey]);
    const S = (b * d * d) / 6, I = (b * d * d * d) / 12, A = b * d;
    const M = (wT * span * span / 8) * 12;             // in-lb
    const fb = M / S;
    const V = wT * span / 2;
    const fv = 1.5 * V / A;
    const Lin = span * 12;
    const defl = (5 * (wL / 12) * Math.pow(Lin, 4)) / (384 * sp.E * I);
    const allow = Lin / limit;
    const ratio = Math.max(fb / sp.Fb, fv / sp.Fv, defl / allow);
    const gov = ratio === fb / sp.Fb ? 'bending' : ratio === fv / sp.Fv ? 'shear' : 'deflection';
    out.push({ name, size: s.sizes[sizeKey], span, wT, fb, Fb: sp.Fb, defl, allow, limit, ratio, gov, note,
      status: ratio <= 0.85 ? 'ok' : ratio <= 1 ? 'tight' : 'over' });
  }

  const nIn = F.iposts.length;
  const beamSpan = W / (nIn + 1);
  const bay = F.bayLen;

  if (!F.one) {
    const trib = s.joistSpacing / 12;
    beam('Floor joists', 'joist', bay, (s.floorLive + s.deadFloor) * trib, s.floorLive * trib, 360,
      'Span one bay; tributary ' + s.joistSpacing + '″');
    beam('Floor beams (interior bents)', 'floorbeam', beamSpan, (s.floorLive + s.deadFloor) * bay, s.floorLive * bay, 360,
      nIn ? 'Clear span between posts' : 'Full bent span');
  }
  if (F.one || F.two) {
    beam('Tie beams (interior bents)', 'tie', beamSpan, (s.atticLive + 10) * bay, s.atticLive * bay, 240,
      'Attic/ceiling load plus 10 psf dead');
  }

  const roofT = s.snow + s.deadRoof;
  let rSpan = W / 2;
  if (F.truss === 'king') rSpan = W / 4;
  if (F.truss === 'queen') rSpan = W / 3;
  if (s.roof === 'purlin') {
    const trib = (W / 2) / (s.purlinsPerSide + 1);
    beam('Purlins', 'purlin', bay, roofT * trib, s.snow * trib, 180,
      'Load on horizontal projection; tributary ' + TF.ftIn(trib));
    beam('Principal rafters', 'rafter', rSpan, roofT * bay, s.snow * bay, 180,
      'Bay of roof treated as uniform; horizontal span ' + TF.ftIn(rSpan));
  } else {
    beam('Common rafters', 'crafter', W / 2, roofT * 2, s.snow * 2, 180, '24″ spacing, plate to ridge');
    beam('Ridge beam', 'ridge', bay, roofT * (W / 2), s.snow * (W / 2), 240,
      'Structural ridge carries half of each rafter');
    beam('Plates', 'plate', bay - 2 * s.braceLeg, roofT * (W / 4 + s.overhangEave), s.snow * (W / 4 + s.overhangEave), 240,
      'Between brace feet');
    beam('Principal rafters', 'rafter', rSpan, roofT * 2, s.snow * 2, 180, 'Bent rafter at common spacing');
  }

  /* Approximate wall-post load (roof + floor) for reference */
  const roofLoad = roofT * (W / 2 + s.overhangEave) * bay;
  const floorLoad = F.one ? 0 : (s.floorLive + s.deadFloor) * (beamSpan / 2) * bay;
  const postLoad = roofLoad + floorLoad;

  return { rows: out, postLoad, species: sp };
};
