/* App glue: state, undo, views, legend, file handling */
{
  const LS = 'tf-home-design-v1';
  const $ = id => document.getElementById(id);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
  };

  const PRESETS = {
    cape: { label: '24×36 cape', s: { width: 24, length: 36, bays: 4, sections: 2, stories: '1.5', h1: 9, knee: 4, pitch: 12, interiorPosts: 'center', roof: 'purlin', truss: 'collar' } },
    colonial: { label: '26×40 two story', s: { width: 26, length: 40, bays: 4, sections: 2, stories: '2', h1: 9, h2: 8, pitch: 10, interiorPosts: 'center', roof: 'common', truss: 'king' } },
    ranch: { label: '28×48 single story', s: { width: 28, length: 48, bays: 6, sections: 3, stories: '1', h1: 9, pitch: 8, interiorPosts: 'none', roof: 'purlin', truss: 'queen', purlinsPerSide: 2 } },
    cabin: { label: '20×24 cabin', s: { width: 20, length: 24, bays: 2, sections: 1, stories: '1.5', h1: 8.5, knee: 3, pitch: 12, interiorPosts: 'none', roof: 'purlin', truss: 'collar', purlinsPerSide: 1 } }
  };

  let state;
  try { state = TF.normalize(JSON.parse(store.get(LS) || 'null')); } catch (e) { state = TF.normalize(null); }
  const undo = [], redo = [];
  let view = store.get(LS + '-view') || '3d';
  let bent = 1;
  const hidden = new Set();
  let showRoof = false;
  let F, sch, chk;

  const v3 = TF.View3D($('c3d'));
  const v2 = TF.View2D($('svg2d'));

  function commit(mutator) {
    undo.push(JSON.stringify(state));
    if (undo.length > 80) undo.shift();
    redo.length = 0;
    mutator();
    state = TF.normalize(state);
    update();
  }

  function onChange(key, val, live) {
    // A slider drag records one undo step: the first input event commits, later ones update in place
    if (onChange.pending) {
      TF.setKey(state, key, val); state = TF.normalize(state); update();
      if (!live) onChange.pending = false;
      return;
    }
    commit(() => TF.setKey(state, key, val));
    if (live) onChange.pending = true;
  }

  function renderViews() {
    const is3d = view === '3d';
    $('c3d').style.display = is3d ? 'block' : 'none';
    $('svg2d').style.display = is3d ? 'none' : 'block';
    $('bentpick').hidden = view !== 'bent';
    document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.view === view));
    if (is3d) v3.set(F, hidden, showRoof);
    else v2.set(F, { mode: view, bent, hidden, roof: true });
    $('hint').textContent = is3d ? 'Drag to orbit · shift-drag to pan · scroll or pinch to zoom' : 'Drag to pan · scroll to zoom · hover a member for its size';
  }

  function renderLegend() {
    const kinds = [...new Set(F.members.map(m => m.kind))];
    const btns = kinds.map(k => '<button type="button" data-k="' + k + '" aria-pressed="' + !hidden.has(k) + '"><i style="background:var(' + TF.KINDS[k].color + ')"></i>' + TF.esc(TF.KINDS[k].label) + '</button>');
    btns.push('<button type="button" data-k="__roof" aria-pressed="' + showRoof + '"><i style="background:var(--s-roof)"></i>Roof sheathing</button>');
    $('legend').innerHTML = '<span class="lhint">Show or hide:</span>' + btns.join('');
  }

  function update() {
    F = TF.buildFrame(state);
    F.s = state;
    sch = TF.schedule(state, F);
    chk = TF.checks(state, F);
    TF.UI.syncControls(state);
    const sm = TF.UI.summary(state, F, sch);
    $('summary').textContent = sm.head;
    $('stats').innerHTML = sm.html;
    $('timber').innerHTML = TF.UI.timberTable(sch, state);
    $('joinery').innerHTML = TF.UI.joineryTable(sch);
    $('checks').innerHTML = TF.UI.checksTable(chk);
    const over = chk.rows.filter(r => r.status === 'over').length;
    $('checkcount').textContent = over ? over + ' undersized' : 'all within limits';
    $('checkcount').className = over ? 'badge bad' : 'badge good';
    const warns = F.warnings.slice();
    if (sch.longCount) warns.push(sch.longCount + ' pieces are longer than your ' + state.maxStock + '′ log limit.');
    if (over) warns.push(over + ' member group' + (over > 1 ? 's are' : ' is') + ' undersized — see the sizing checks.');
    $('alerts').innerHTML = warns.map(w => '<li>' + TF.esc(w) + '</li>').join('');
    $('alerts').hidden = !warns.length;
    $('bentpick').innerHTML = F.bents.map(b => '<option value="' + b.idx + '">' + TF.esc(b.label) + '</option>').join('');
    bent = Math.min(bent, F.bents.length - 1);
    $('bentpick').value = bent;
    $('name').value = state.name;
    $('undo').disabled = !undo.length;
    $('redo').disabled = !redo.length;
    renderLegend();
    renderViews();
    store.set(LS, JSON.stringify(state));
  }

  /* ---- Events ---- */
  TF.UI.buildControls($('controls'), onChange);

  $('tabs').addEventListener('click', e => {
    const b = e.target.closest('button[data-view]');
    if (!b) return;
    view = b.dataset.view; store.set(LS + '-view', view); renderViews();
  });
  $('bentpick').addEventListener('change', e => { bent = +e.target.value; renderViews(); });
  $('legend').addEventListener('click', e => {
    const b = e.target.closest('button[data-k]');
    if (!b) return;
    const k = b.dataset.k;
    if (k === '__roof') showRoof = !showRoof;
    else if (hidden.has(k)) hidden.delete(k); else hidden.add(k);
    renderLegend(); renderViews();
  });
  $('zin').addEventListener('click', () => view === '3d' ? v3.zoom(1.25) : v2.zoom(1.25));
  $('zout').addEventListener('click', () => view === '3d' ? v3.zoom(0.8) : v2.zoom(0.8));
  $('zreset').addEventListener('click', () => view === '3d' ? v3.reset() : v2.reset());

  $('undo').addEventListener('click', () => {
    if (!undo.length) return;
    redo.push(JSON.stringify(state)); state = TF.normalize(JSON.parse(undo.pop())); update();
  });
  $('redo').addEventListener('click', () => {
    if (!redo.length) return;
    undo.push(JSON.stringify(state)); state = TF.normalize(JSON.parse(redo.pop())); update();
  });
  document.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || e.target.matches('input[type=text],textarea')) return;
    if (e.key.toLowerCase() === 'z') { e.preventDefault(); (e.shiftKey ? $('redo') : $('undo')).click(); }
  });
  $('name').addEventListener('change', e => commit(() => { state.name = e.target.value.slice(0, 80) || 'Timber frame home'; }));

  $('presets').innerHTML = Object.entries(PRESETS).map(([k, p]) => '<button type="button" data-p="' + k + '">' + TF.esc(p.label) + '</button>').join('') +
    '<button type="button" data-p="__reset">Defaults</button>';
  $('presets').addEventListener('click', e => {
    const b = e.target.closest('button[data-p]');
    if (!b) return;
    commit(() => {
      const keep = { name: state.name, species: state.species, maxStock: state.maxStock, priceBF: state.priceBF, snow: state.snow };
      state = TF.clone(TF.DEFAULTS);
      if (b.dataset.p !== '__reset') Object.assign(state, PRESETS[b.dataset.p].s, keep);
    });
  });

  /* Design file: copy, paste, open */
  function flash(msg) { $('filemsg').textContent = msg; clearTimeout(flash.t); flash.t = setTimeout(() => { $('filemsg').textContent = ''; }, 4000); }
  async function copyText(text, what) {
    try { await navigator.clipboard.writeText(text); flash(what + ' copied.'); }
    catch (e) { $('designtext').value = text; $('designbox').open = true; flash('Clipboard blocked — the text is in the box below.'); }
  }
  $('copydesign').addEventListener('click', () => copyText(JSON.stringify(state, null, 2), 'Design'));
  $('copycsv').addEventListener('click', () => copyText(TF.UI.timberCSV(sch), 'Timber list (CSV)'));
  $('applydesign').addEventListener('click', () => {
    try {
      const obj = JSON.parse($('designtext').value);
      commit(() => { state = obj; });
      flash('Design loaded.');
    } catch (e) { flash('That text is not a valid design file.'); }
  });
  $('openfile').addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { const obj = JSON.parse(r.result); commit(() => { state = obj; }); flash('Opened ' + f.name + '.'); }
      catch (err) { flash('Could not read ' + f.name + '.'); }
      e.target.value = '';
    };
    r.readAsText(f);
  });

  update();
}
