/* UI builders: control panel and result tables */
window.TF = window.TF || {};

TF.UI = (function () {
  const esc = TF.esc, fmt = TF.fmt;
  const idOf = key => 'f-' + key.replace(/\./g, '-');

  function fieldHTML(f) {
    const id = idOf(f.key);
    const unit = f.unit ? ' <span class="u">' + esc(f.unit) + '</span>' : '';
    const note = f.note ? '<p class="note">' + esc(f.note) + '</p>' : '';
    if (f.type === 'check') {
      return '<div class="field chk" data-key="' + f.key + '"><label><input type="checkbox" id="' + id + '"> ' + esc(f.label) + '</label>' + note + '</div>';
    }
    let input;
    if (f.type === 'range') {
      input = '<input type="range" id="' + id + '" min="' + f.min + '" max="' + f.max + '" step="' + f.step + '">';
    } else if (f.type === 'number') {
      input = '<input type="number" inputmode="decimal" id="' + id + '" min="' + f.min + '" max="' + f.max + '" step="' + f.step + '">';
    } else {
      const opts = f.type === 'size' ? TF.SIZES.map(s => [s, s.replace('x', ' × ')]) : f.options;
      input = '<select id="' + id + '">' + opts.map(o => '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>').join('') + '</select>';
    }
    const out = f.type === 'range' ? '<output for="' + id + '" id="' + id + '-o"></output>' : unit;
    const cls = f.type === 'size' ? 'field size' : 'field';
    return '<div class="' + cls + '" data-key="' + f.key + '"><label for="' + id + '"><span>' + esc(f.label) + '</span>' + out + '</label>' + input + note + '</div>';
  }

  function buildControls(root, onChange) {
    root.innerHTML = TF.CONTROLS.map((g, i) =>
      '<details class="grp"' + (i < 3 ? ' open' : '') + '><summary>' + esc(g.group) + '</summary>' +
      '<div class="' + (g.group === 'Timber sizes' ? 'sizegrid' : 'fields') + '">' + g.fields.map(fieldHTML).join('') + '</div></details>'
    ).join('');
    for (const g of TF.CONTROLS) for (const f of g.fields) {
      const el = document.getElementById(idOf(f.key));
      const ev = f.type === 'range' ? 'input' : 'change';
      el.addEventListener(ev, () => {
        let val;
        if (f.type === 'check') val = el.checked;
        else if (f.type === 'range' || f.type === 'number') {
          val = parseFloat(el.value);
          if (!isFinite(val)) return;
          val = Math.max(f.min, Math.min(f.max, val));
        } else val = el.value;
        onChange(f.key, val, ev === 'input');
      });
      if (f.type === 'range') el.addEventListener('change', () => onChange(f.key, parseFloat(el.value), false));
    }
  }

  function rangeText(f, val) {
    if (f.unit === 'ft') return TF.ftIn(val);
    if (f.unit === 'in') return val + '″';
    if (f.unit === '/12') return val + '/12';
    return String(val);
  }

  function syncControls(s) {
    for (const g of TF.CONTROLS) for (const f of g.fields) {
      const el = document.getElementById(idOf(f.key));
      if (!el) continue;
      const val = TF.getKey(s, f.key);
      if (f.type === 'check') el.checked = !!val;
      else if (document.activeElement !== el || f.type === 'range') el.value = val;
      if (f.type === 'range') document.getElementById(idOf(f.key) + '-o').textContent = rangeText(f, val);
      const wrap = el.closest('.field');
      let show = f.show ? f.show(s) : true;
      if (f.key === 'truss' && s.stories === '1.5') el.disabled = true; else el.disabled = false;
      if (f.key === 'sections') { el.max = s.bays; }
      wrap.hidden = !show;
    }
  }

  function summary(s, F, sch) {
    const a = sch.areas;
    const story = { '1': 'single story', '1.5': '1½ story cape', '2': 'two story' }[s.stories];
    const cards = [
      ['Living area', fmt(a.total) + ' ft²', F.cape ? fmt(a.secondTall) + ' ft² upstairs at 7′+ headroom' : F.two ? fmt(a.first) + ' ft² per floor' : 'one floor'],
      ['Timber', fmt(sch.totalBF) + ' BF', sch.pieces + ' pieces'],
      ['Frame weight', fmt(sch.totalLb / 2000, 1) + ' tons', 'green ' + TF.SPECIES[s.species].name.toLowerCase()],
      ['Timber cost', '$' + fmt(sch.cost), '$' + s.priceBF.toFixed(2) + ' per BF'],
      ['Joints', fmt(sch.totalJoints), fmt(sch.totalPegs) + ' pegs'],
      ['Ridge height', TF.ftIn(a.ridgeHeight), 'above sill top'],
      ['Wall area', fmt(a.wallNet) + ' ft²', 'net of ' + fmt(a.openings) + ' ft² openings'],
      ['Roof area', fmt(a.roofArea) + ' ft²', 'with overhangs']
    ];
    const head = TF.ftIn(s.width) + ' × ' + TF.ftIn(s.length) + ' · ' + story + ' · ' + F.bents.length + ' bents in ' + F.sections.length + (F.sections.length > 1 ? ' frames' : ' frame');
    const html = cards.map(c => '<div class="stat"><span>' + esc(c[0]) + '</span><b>' + esc(c[1]) + '</b><small>' + esc(c[2]) + '</small></div>').join('');
    return { head, html };
  }

  function timberTable(sch, s) {
    const rows = sch.timber.map(g =>
      '<tr' + (g.long ? ' class="long"' : '') + '><td>' + esc(TF.KINDS[g.kind].label) + '</td><td class="sz">' + esc(g.size.replace('x', ' × ')) +
      '</td><td class="n">' + g.stock + '′</td><td class="n">' + g.qty + '</td><td class="n">' + fmt(g.bf) +
      '</td><td class="n">' + fmt(g.each) + '</td><td class="n">' + fmt(g.lb) + '</td></tr>').join('');
    const longNote = sch.longCount ? '<p class="note warn">' + sch.longCount + ' piece' + (sch.longCount > 1 ? 's are' : ' is') +
      ' longer than your ' + s.maxStock + '′ log limit (red). Add bays, add frames, or raise the limit.</p>' : '';
    return '<div class="scroll"><table class="stack"><thead><tr><th>Member</th><th>Size</th><th class="n">Length</th><th class="n">Qty</th><th class="n">BF</th><th class="n">Each lb</th><th class="n">Total lb</th></tr></thead><tbody>' +
      rows + '</tbody><tfoot><tr><td>Total</td><td></td><td></td><td class="n">' + sch.pieces + '</td><td class="n">' + fmt(sch.totalBF) +
      '</td><td></td><td class="n">' + fmt(sch.totalLb) + '</td></tr></tfoot></table></div>' + longNote +
      '<p class="note">Lengths are centerline plus trim, rounded up to the next foot. Heaviest piece: ' +
      esc(TF.KINDS[sch.heaviest.kind].label.toLowerCase()) + ' ' + esc(sch.heaviest.size) + ' × ' + sch.heaviest.stock + '′, about ' + fmt(sch.heaviest.lb) + ' lb green.</p>';
  }

  function joineryTable(sch) {
    const rows = sch.joints.map(j => '<tr><td><b>' + esc(j.name) + '</b><div class="jd">' + esc(j.detail) + '</div></td><td class="n">' + fmt(j.count) +
      '</td><td class="n">' + fmt(j.pegs) + '</td></tr>').join('');
    return '<div class="scroll"><table><thead><tr><th>Joint</th><th class="n">Count</th><th class="n">Pegs</th></tr></thead><tbody>' + rows +
      '</tbody><tfoot><tr><td>Total</td><td class="n">' + fmt(sch.totalJoints) + '</td><td class="n">' + fmt(sch.totalPegs) + '</td></tr></tfoot></table></div>' +
      '<p class="note">Square rule layout: every joint is laid out from the reference faces — outside wall faces for posts, plates and girts, top faces for floor beams and joists.</p>';
  }

  function checksTable(chk) {
    const label = { ok: 'OK', tight: 'Tight', over: 'Undersized' };
    const rows = chk.rows.map(r => {
      const pct = Math.round(r.ratio * 100);
      return '<tr class="' + r.status + '"><td><b>' + esc(r.name) + '</b><div class="jd">' + esc(r.note) + '</div></td><td class="sz">' + esc(r.size.replace('x', ' × ')) +
        '</td><td class="n">' + TF.ftIn(r.span) + '</td><td class="n">' + fmt(r.wT) + '</td><td class="use"><div class="meter"><i style="width:' + Math.min(100, pct) +
        '%"></i></div><span>' + pct + '% · ' + r.gov + '</span></td><td><span class="pill">' + label[r.status] + '</span></td></tr>';
    }).join('');
    return '<div class="scroll"><table class="stack"><thead><tr><th>Member</th><th>Size</th><th class="n">Span</th><th class="n">Load plf</th><th>Capacity used</th><th>Result</th></tr></thead><tbody>' +
      rows + '</tbody></table></div>' +
      '<p class="note">Simple-span bending, shear and deflection using approximate No.1 values for ' + esc(chk.species.name.toLowerCase()) +
      ' (Fb ' + fmt(chk.species.Fb) + ' psi). Wall posts carry roughly ' + fmt(chk.postLoad) + ' lb each. Joinery, rafter thrust, wind and connections are not checked — have an engineer review the frame before you apply for a permit.</p>';
  }

  function timberCSV(sch) {
    const lines = [['Member', 'Size', 'Length ft', 'Qty', 'BF', 'Each lb', 'Total lb']];
    for (const g of sch.timber) lines.push([TF.KINDS[g.kind].label, g.size, g.stock, g.qty, g.bf.toFixed(1), g.each.toFixed(0), g.lb.toFixed(0)]);
    return lines.map(r => r.join(',')).join('\n');
  }

  return { buildControls, syncControls, summary, timberTable, joineryTable, checksTable, timberCSV };
})();
