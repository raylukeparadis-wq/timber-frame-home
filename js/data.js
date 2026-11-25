/* Timber frame home designer — reference data, defaults and control definitions */
window.TF = window.TF || {};

/* Approximate No.1 timber values (Fb, E in psi) and green weight (lb/ft³).
   Verify against the NDS supplement and your grader before relying on them. */
TF.SPECIES = {
  ewp: { name: 'Eastern white pine', Fb: 875,  E: 1100000, Fv: 125, pcf: 36 },
  hem: { name: 'Eastern hemlock',    Fb: 1050, E: 1200000, Fv: 140, pcf: 50 },
  dfl: { name: 'Douglas fir-larch',  Fb: 1350, E: 1600000, Fv: 170, pcf: 38 },
  wo:  { name: 'White oak',          Fb: 1150, E: 1000000, Fv: 155, pcf: 62 },
  ro:  { name: 'Red oak',            Fb: 1150, E: 1100000, Fv: 155, pcf: 63 },
  spf: { name: 'Spruce-pine-fir',    Fb: 950,  E: 1200000, Fv: 125, pcf: 32 }
};

TF.SIZES = ['4x6', '4x8', '6x6', '6x8', '6x10', '8x8', '8x10', '8x12', '10x10', '10x12'];

/* Member kinds: label, legend colour variable, size key */
TF.KINDS = {
  sill:    { label: 'Sill',             color: '--t-sill',    size: 'sill' },
  post:    { label: 'Post',             color: '--t-post',    size: 'post' },
  ipost:   { label: 'Interior post',    color: '--t-ipost',   size: 'post' },
  floorbeam:{ label: 'Floor beam',      color: '--t-beam',    size: 'floorbeam' },
  tie:     { label: 'Tie beam',         color: '--t-tie',     size: 'tie' },
  plate:   { label: 'Plate',            color: '--t-plate',   size: 'plate' },
  cgirt:   { label: 'Connecting girt',  color: '--t-cgirt',   size: 'cgirt' },
  girt:    { label: 'Wall girt',        color: '--t-girt',    size: 'girt' },
  joist:   { label: 'Floor joist',      color: '--t-joist',   size: 'joist' },
  rafter:  { label: 'Principal rafter', color: '--t-rafter',  size: 'rafter' },
  crafter: { label: 'Common rafter',    color: '--t-crafter', size: 'crafter' },
  ridge:   { label: 'Ridge',            color: '--t-ridge',   size: 'ridge' },
  purlin:  { label: 'Purlin',           color: '--t-purlin',  size: 'purlin' },
  collar:  { label: 'Collar tie',       color: '--t-collar',  size: 'collar' },
  king:    { label: 'King post',        color: '--t-king',    size: 'king' },
  queen:   { label: 'Queen post',       color: '--t-queen',   size: 'king' },
  strain:  { label: 'Straining beam',   color: '--t-collar',  size: 'collar' },
  strut:   { label: 'Strut',            color: '--t-strut',   size: 'strut' },
  brace:   { label: 'Knee brace',       color: '--t-brace',   size: 'brace' }
};

TF.DEFAULTS = {
  name: 'Timber frame home',
  width: 24, length: 36, bays: 4, sections: 2,
  stories: '1.5', h1: 9, h2: 8, knee: 4,
  pitch: 12, truss: 'collar', roof: 'purlin', purlinsPerSide: 2,
  overhangEave: 1.5, overhangGable: 1,
  interiorPosts: 'center', braceLeg: 3, sill: true, wallGirts: true, joistSpacing: 24,
  sizes: {
    sill: '8x8', post: '8x8', floorbeam: '8x10', tie: '8x10', plate: '8x8',
    cgirt: '6x8', girt: '6x6', joist: '4x8', rafter: '8x10', crafter: '4x8',
    ridge: '6x8', purlin: '6x8', collar: '6x8', king: '8x8', strut: '6x6', brace: '4x6'
  },
  species: 'ewp', snow: 40, floorLive: 40, atticLive: 20, deadFloor: 15, deadRoof: 15,
  maxStock: 16, priceBF: 2.5, pegsPerFt: 0,
  windows: 14, windowArea: 15, doors: 3, doorArea: 21
};

/* Control panel definition. key may be dotted (sizes.post). show(state) hides a field. */
TF.CONTROLS = [
  { group: 'Footprint', fields: [
    { key: 'width', label: 'Width (bent span)', type: 'range', min: 14, max: 40, step: 1, unit: 'ft' },
    { key: 'length', label: 'Length', type: 'range', min: 16, max: 72, step: 1, unit: 'ft' },
    { key: 'bays', label: 'Bays', type: 'range', min: 1, max: 8, step: 1 },
    { key: 'sections', label: 'Separate frames (back-to-back bents)', type: 'range', min: 1, max: 4, step: 1,
      note: 'Splits the house into frames joined by doubled bents, so no member runs the full length.' }
  ]},
  { group: 'Stories', fields: [
    { key: 'stories', label: 'House type', type: 'select', options: [
      ['1', 'Single story (tie at plate)'], ['1.5', '1½ story cape (knee wall)'], ['2', 'Two story']] },
    { key: 'h1', label: 'First-floor post height', type: 'range', min: 7, max: 12, step: 0.5, unit: 'ft' },
    { key: 'h2', label: 'Second-floor wall height', type: 'range', min: 6, max: 10, step: 0.5, unit: 'ft',
      show: s => s.stories === '2' },
    { key: 'knee', label: 'Knee wall height', type: 'range', min: 2, max: 6, step: 0.5, unit: 'ft',
      show: s => s.stories === '1.5' }
  ]},
  { group: 'Roof', fields: [
    { key: 'pitch', label: 'Pitch (rise per 12)', type: 'range', min: 4, max: 16, step: 1, unit: '/12' },
    { key: 'truss', label: 'Bent roof truss', type: 'select', options: [
      ['collar', 'Principal rafters + collar tie'], ['king', 'King post + struts'], ['queen', 'Queen posts + straining beam']] },
    { key: 'roof', label: 'Roof framing between bents', type: 'select', options: [
      ['purlin', 'Purlins on principal rafters'], ['common', 'Common rafters on plate + ridge']] },
    { key: 'purlinsPerSide', label: 'Purlins per side', type: 'range', min: 1, max: 4, step: 1,
      show: s => s.roof === 'purlin' },
    { key: 'overhangEave', label: 'Eave overhang', type: 'range', min: 0, max: 3, step: 0.25, unit: 'ft' },
    { key: 'overhangGable', label: 'Gable overhang', type: 'range', min: 0, max: 3, step: 0.25, unit: 'ft' }
  ]},
  { group: 'Framing', fields: [
    { key: 'interiorPosts', label: 'Interior posts in each bent', type: 'select', options: [
      ['none', 'None (clear span)'], ['center', 'One, at center'], ['thirds', 'Two, at thirds']] },
    { key: 'braceLeg', label: 'Knee brace leg (45°)', type: 'range', min: 2, max: 4, step: 0.25, unit: 'ft' },
    { key: 'joistSpacing', label: 'Floor joist spacing', type: 'range', min: 16, max: 36, step: 2, unit: 'in',
      show: s => s.stories !== '1' },
    { key: 'sill', label: 'Timber sills on foundation', type: 'check' },
    { key: 'wallGirts', label: 'Mid-height wall girts', type: 'check' }
  ]},
  { group: 'Timber sizes', fields: [
    { key: 'species', label: 'Species', type: 'select', options: Object.entries(TF.SPECIES).map(([k, v]) => [k, v.name]) },
    { key: 'sizes.post', label: 'Posts', type: 'size' },
    { key: 'sizes.floorbeam', label: 'Floor beams', type: 'size', show: s => s.stories !== '1' },
    { key: 'sizes.tie', label: 'Tie beams', type: 'size', show: s => s.stories !== '1.5' },
    { key: 'sizes.plate', label: 'Plates', type: 'size' },
    { key: 'sizes.cgirt', label: 'Connecting girts', type: 'size', show: s => s.stories !== '1' },
    { key: 'sizes.girt', label: 'Wall girts', type: 'size', show: s => s.wallGirts },
    { key: 'sizes.joist', label: 'Floor joists', type: 'size', show: s => s.stories !== '1' },
    { key: 'sizes.rafter', label: 'Principal rafters', type: 'size' },
    { key: 'sizes.crafter', label: 'Common rafters', type: 'size', show: s => s.roof === 'common' },
    { key: 'sizes.purlin', label: 'Purlins', type: 'size', show: s => s.roof === 'purlin' },
    { key: 'sizes.ridge', label: 'Ridge', type: 'size' },
    { key: 'sizes.collar', label: 'Collar / straining beam', type: 'size', show: s => s.truss !== 'king' },
    { key: 'sizes.king', label: 'King / queen posts', type: 'size', show: s => s.truss !== 'collar' },
    { key: 'sizes.strut', label: 'Struts', type: 'size', show: s => s.truss === 'king' },
    { key: 'sizes.brace', label: 'Knee braces', type: 'size' },
    { key: 'sizes.sill', label: 'Sills', type: 'size', show: s => s.sill }
  ]},
  { group: 'Loads (confirm with your building department)', fields: [
    { key: 'snow', label: 'Roof snow load', type: 'number', min: 0, max: 120, step: 5, unit: 'psf' },
    { key: 'floorLive', label: 'Floor live load', type: 'number', min: 20, max: 100, step: 5, unit: 'psf' },
    { key: 'atticLive', label: 'Attic / ceiling live load', type: 'number', min: 0, max: 40, step: 5, unit: 'psf',
      show: s => s.stories === '1' },
    { key: 'deadFloor', label: 'Floor dead load', type: 'number', min: 5, max: 40, step: 1, unit: 'psf' },
    { key: 'deadRoof', label: 'Roof dead load', type: 'number', min: 5, max: 40, step: 1, unit: 'psf' }
  ]},
  { group: 'Sawmill and cost', fields: [
    { key: 'maxStock', label: 'Longest log you can saw', type: 'range', min: 8, max: 32, step: 1, unit: 'ft',
      note: 'Pieces longer than this are flagged red in the timber list.' },
    { key: 'priceBF', label: 'Timber price', type: 'number', min: 0, max: 20, step: 0.05, unit: '$/BF' }
  ]},
  { group: 'Openings (for enclosure estimate)', fields: [
    { key: 'windows', label: 'Windows', type: 'number', min: 0, max: 60, step: 1 },
    { key: 'windowArea', label: 'Average window size', type: 'number', min: 2, max: 60, step: 1, unit: 'ft²' },
    { key: 'doors', label: 'Exterior doors', type: 'number', min: 0, max: 10, step: 1 },
    { key: 'doorArea', label: 'Average door size', type: 'number', min: 15, max: 60, step: 1, unit: 'ft²' }
  ]}
];

TF.sizeIn = function (s) {
  const [b, d] = String(s).split('x').map(Number);
  return { b: b || 6, d: d || 6 };
};

TF.clone = o => JSON.parse(JSON.stringify(o));

TF.getKey = function (obj, key) {
  return key.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
};

TF.setKey = function (obj, key, val) {
  const parts = key.split('.');
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]] = o[parts[i]] || {};
  o[parts[parts.length - 1]] = val;
};

/* Merge a loaded design over the defaults so older files keep working */
TF.normalize = function (src) {
  const s = TF.clone(TF.DEFAULTS);
  if (src && typeof src === 'object') {
    for (const k of Object.keys(s)) {
      if (k === 'sizes') continue;
      if (src[k] !== undefined && typeof src[k] === typeof s[k]) s[k] = src[k];
    }
    if (src.sizes) for (const k of Object.keys(s.sizes)) {
      if (TF.SIZES.includes(src.sizes[k])) s.sizes[k] = src.sizes[k];
    }
  }
  s.bays = Math.max(1, Math.round(s.bays));
  s.sections = Math.max(1, Math.min(s.bays, Math.round(s.sections)));
  if (s.stories === '1.5' && s.truss !== 'collar') s.truss = 'collar';
  return s;
};

/* Feet to 12′-6″ style */
TF.ftIn = function (ft) {
  const neg = ft < 0; ft = Math.abs(ft);
  let f = Math.floor(ft), i = Math.round((ft - f) * 12 * 4) / 4;
  if (i >= 12) { f += 1; i = 0; }
  const inch = i ? (Number.isInteger(i) ? i : i.toFixed(2).replace(/0$/, '')) + '″' : '';
  return (neg ? '−' : '') + f + '′' + (inch ? '-' + inch : '');
};

TF.fmt = (n, d = 0) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

TF.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
