/* Timber list, joinery schedule, enclosure and cost summary */
window.TF = window.TF || {};

TF.schedule = function (s, F) {
  const G = TF.G;
  const sp = TF.SPECIES[s.species] || TF.SPECIES.ewp;
  const order = ['sill', 'post', 'ipost', 'floorbeam', 'tie', 'plate', 'cgirt', 'girt', 'joist',
    'rafter', 'crafter', 'ridge', 'purlin', 'collar', 'king', 'queen', 'strain', 'strut', 'brace'];

  /* ---- Timber list ---- */
  const groups = {};
  let totalBF = 0, totalLb = 0, pieces = 0, longest = null, heaviest = null, longCount = 0;
  for (const m of F.members) {
    const len = G.dist(m.p1, m.p2);
    const stock = Math.ceil(len + 0.25);           // round up to the next foot with trim allowance
    const bf = (m.b * m.d * stock) / 12;
    const lb = (bf / 12) * sp.pcf;
    m.len = len; m.stock = stock; m.long = stock > s.maxStock;
    const key = m.kind + '|' + m.size + '|' + stock;
    const g = groups[key] || (groups[key] = { kind: m.kind, size: m.size, stock, qty: 0, bf: 0, lb: 0, each: lb, long: m.long });
    g.qty++; g.bf += bf; g.lb += lb;
    totalBF += bf; totalLb += lb; pieces++;
    if (m.long) longCount++;
    if (!longest || stock > longest.stock) longest = { kind: m.kind, size: m.size, stock };
    if (!heaviest || lb > heaviest.lb) heaviest = { kind: m.kind, size: m.size, stock, lb };
  }
  const timber = Object.values(groups).sort((a, b) =>
    order.indexOf(a.kind) - order.indexOf(b.kind) || a.size.localeCompare(b.size) || b.stock - a.stock);

  /* ---- Joinery ---- */
  const J = {};
  const addJ = (name, detail, count, pegs) => {
    if (count <= 0) return;
    const j = J[name] || (J[name] = { name, detail, count: 0, pegs: 0 });
    j.count += count; j.pegs += count * pegs;
  };
  const n = k => F.members.filter(m => m.kind === k).length;
  const secs = F.sections.length;
  const wallPosts = n('post');

  if (s.sill) addJ('Post into sill', 'Stub tenon into sill mortise, laid out from the outside reference face', wallPosts, 1);
  else addJ('Post on foundation', 'Steel pin or standoff base — no tenon', wallPosts, 0);
  if (F.one || F.two) addJ('Tying joint', 'Post tenon into plate; tie beam lapped over the plate and tenoned into the post', wallPosts, 3);
  else addJ('Post into plate', 'Post top tenon into plate mortise (knee wall)', wallPosts, 2);
  if (!F.one) {
    addJ('Floor beam into post', 'Housed mortise and tenon, beam top flush with floor', F.bents.length * 2, 2);
    addJ('Floor beam splice over interior post', 'Beam ends meet over the interior post: tenoned into the post head or lapped on a bolster', n('floorbeam') - F.bents.length, 2);
  }
  addJ('Interior post into beam', 'Post top tenon into beam soffit; base pinned to a pier', n('ipost'), 2);

  const platePieces = n('plate');
  addJ('Plate splice', 'Bladed scarf over a post (pieces longer than your log limit are split here)', platePieces - 2 * secs, 2);
  addJ('Back-to-back bents', 'Adjacent bent posts through-bolted or splined together, frames otherwise independent', (secs - 1) * (2 + F.iposts.length), 0);
  addJ('Connecting girt into post', 'Mortise and tenon, girt top flush with floor, outside face is reference', n('cgirt') * 2, 2);
  addJ('Wall girt into post', 'Drop-in or standard mortise and tenon, outside face is reference', n('girt') * 2, 1);
  addJ('Joist into floor beam', 'Housed dovetail drop-in pocket, top flush', n('joist') * 2, 0);
  addJ('Rafter foot', (F.one || F.two) ? 'Birdsmouth on the plate, tenoned into the tie beam' : 'Birdsmouth seat on the plate, pegged', n('rafter'), 1);
  addJ('Rafter peak', 'Tongue and fork (open bridle) at the ridge', n('rafter') / 2, 1);
  addJ('Ridge into peak', 'Housed into the rafter peak', n('ridge') * 2, 1);
  addJ('Purlin into rafter', 'Housed mortise and tenon into the principal rafter', n('purlin') * 2, 1);
  addJ('Common rafter seat', 'Birdsmouth on plate, structural screws or spikes', n('crafter'), 0);
  addJ('Common rafter at ridge', 'Lapped over the ridge, screwed', n('crafter') / 2, 0);
  addJ('Collar tie into rafter', 'Half-dovetail lap', n('collar') * 2, 1);
  addJ('King post', 'Tenon into tie at the foot, housed under the rafter peak at the head', n('king') * 2, 2);
  addJ('Strut', 'Stub tenon into king post, birdsmouth under the rafter', n('strut') * 2, 0);
  addJ('Queen post', 'Tenon into tie at the foot, housed under the rafter at the head', n('queen') * 2, 2);
  addJ('Straining beam into queen post', 'Mortise and tenon', n('strain') * 2, 2);
  addJ('Knee brace', 'Housed mortise and tenon at both ends, 45°', n('brace') * 2, 1);
  if (s.sill) {
    addJ('Sill corner', 'Half-lap, pegged', 4, 1);
    addJ('Sill splice', 'Half-lap over a pier', n('sill') - 4, 1);
  }
  const joints = Object.values(J);
  const totalJoints = joints.reduce((a, j) => a + j.count, 0);
  const totalPegs = joints.reduce((a, j) => a + j.pegs, 0);

  /* ---- Areas ---- */
  const W = s.width, L = s.length, p = s.pitch / 12;
  const first = W * L;
  let second = 0, secondTall = 0;
  if (F.two) { second = W * L; secondTall = W * L; }
  else if (F.cape) {
    const d5 = Math.max(0, (5 - s.knee) / p), d7 = Math.max(0, (7 - s.knee) / p);
    second = Math.max(0, W - 2 * d5) * L;      // floor with at least 5′ of headroom
    secondTall = Math.max(0, W - 2 * d7) * L;  // floor with at least 7′
  }
  const wallH = F.topZ;
  const gable = 2 * (W * F.rise / 2);
  const wallGross = 2 * (W + L) * wallH + gable;
  const openings = s.windows * s.windowArea + s.doors * s.doorArea;
  const theta = Math.atan(p);
  const roofArea = 2 * (L + 2 * s.overhangGable) * ((W / 2 + s.overhangEave) / Math.cos(theta));

  const cost = totalBF * s.priceBF;
  const areas = {
    first, second, secondTall, total: first + second,
    wallGross, openings, wallNet: Math.max(0, wallGross - openings), roofArea,
    ridgeHeight: F.ridgeTop
  };

  return { timber, joints, totalJoints, totalPegs, totalBF, totalLb, pieces, longest, heaviest, longCount, cost, areas };
};
