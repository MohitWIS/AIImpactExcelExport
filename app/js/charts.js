/* =====================================================================
   charts.js : DOM components – stat tiles, scorecard, chart cards
   (bars / stacked / diverging / rank / table / kv), legends, tooltips,
   table twins, reveal + count-up animations. Pure DOM, no libraries.
   ===================================================================== */
(function () {
  const U = {};

  /* ---------------- tiny DOM helper ---------------- */
  function h(tag, attrs, ...children) {
    const ns = tag === 'svg' || tag === 'circle' || tag === 'path' || tag === 'line' || tag === 'rect' || tag === 'g';
    const el = ns ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(k => {
      const v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.setAttribute('class', v);
      else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(p => { if (p.startsWith('--')) el.style.setProperty(p, v[p]); else el.style[p] = v[p]; });
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v; // only used with trusted icon markup
      else el.setAttribute(k, v === true ? '' : v);
    });
    children.flat(Infinity).forEach(c => { if (c == null || c === false) return; el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c); });
    return el;
  }
  U.h = h;

  /* ---------------- icons (trusted inline SVG) ---------------- */
  const P = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 14v3M12 9v8M17 5v12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    minus: '<path d="M5 12h14"/>'
  };
  U.icon = (name, size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size || 16}" height="${size || 16}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
  U.iconEl = (name, size) => { const s = h('span', { html: U.icon(name, size), style: { display: 'inline-flex' } }); return s; };

  /* ---------------- number formatting ---------------- */
  const nf0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const nf2 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  function compact(v) {
    const a = Math.abs(v);
    if (a >= 1e7) return (v / 1e7).toFixed(a >= 1e8 ? 0 : 1) + ' Cr';
    if (a >= 1e5) return (v / 1e5).toFixed(a >= 1e6 ? 0 : 1) + ' L';
    if (a >= 1e3) return (v / 1e3).toFixed(a >= 1e4 ? 0 : 1) + 'K';
    return nf0.format(v);
  }
  function inr(v) {
    const a = Math.abs(v);
    if (a >= 1e7) return '₹' + (v / 1e7).toFixed(2).replace(/\.?0+$/, '') + ' Cr';
    if (a >= 1e5) return '₹' + (v / 1e5).toFixed(2).replace(/\.?0+$/, '') + ' L';
    return '₹' + nf0.format(Math.round(v));
  }
  const sign = v => v > 0 ? '+' : (v < 0 ? '−' : '');
  U.fmt = function (v, f, opts) {
    opts = opts || {};
    if (v == null || isNaN(v)) return '—';
    switch (f) {
      case 'pct': return (Math.abs(v) >= 100 ? nf0.format(v) : nf1.format(v)) + (opts.bare ? '' : '%');
      case 'signedPct': return sign(v) + nf1.format(Math.abs(v)) + (opts.bare ? '' : '%');
      case 'score': return nf2.format(v);
      case 'score2': return nf2.format(v);
      case 'index': return sign(v) + nf2.format(Math.abs(v));
      case 'num1': return nf1.format(v);
      case 'num2': return nf2.format(v);
      case 'int': return nf0.format(Math.round(v));
      case 'count': return Math.abs(v) >= 1e4 ? compact(v) : nf0.format(Math.round(v));
      case 'hrs': return (Math.abs(v) >= 1e4 ? compact(v) : nf0.format(Math.round(v))) + (opts.bare ? '' : ' hrs');
      case 'inr': return inr(v);
      default: return nf1.format(v);
    }
  };
  U.unitOf = (k) => {
    switch (k.fmt) {
      case 'pct': case 'signedPct': return '%';
      case 'score': return k.max ? '/ ' + k.max : '';
      case 'score2': return '/ 1';
      case 'index': return 'index';
      case 'hrs': return 'hrs';
      default: return k.suffix ? k.suffix.trim() : '';
    }
  };

  /* ---------------- tooltip ---------------- */
  let tipEl = null;
  const tip = {
    el() { if (!tipEl) { tipEl = document.getElementById('tip') || document.body.appendChild(h('div', { class: 'tip', id: 'tip' })); } return tipEl; },
    show(node, x, y) {
      const t = this.el(); t.innerHTML = ''; t.appendChild(node); t.classList.add('show'); this.move(x, y);
    },
    move(x, y) {
      const t = this.el(); const r = t.getBoundingClientRect();
      let left = x + 14, top = y + 14;
      if (left + r.width > window.innerWidth - 8) left = x - r.width - 14;
      if (top + r.height > window.innerHeight - 8) top = y - r.height - 14;
      t.style.left = Math.max(8, left) + 'px'; t.style.top = Math.max(8, top) + 'px';
    },
    hide() { if (tipEl) tipEl.classList.remove('show'); }
  };
  U.tip = tip;
  function bindTip(el, build) {
    const show = e => { tip.show(build(), e.clientX, e.clientY); };
    el.addEventListener('pointerenter', show);
    el.addEventListener('pointermove', e => tip.move(e.clientX, e.clientY));
    el.addEventListener('pointerleave', () => tip.hide());
    el.addEventListener('focus', () => { const r = el.getBoundingClientRect(); tip.show(build(), r.left + r.width / 2, r.top); });
    el.addEventListener('blur', () => tip.hide());
    el.setAttribute('tabindex', '0');
  }
  function tipNode(title, rows) {
    return h('div', null, h('b', { text: title }), rows.filter(Boolean).map(r => h('div', { class: 'row' }, r.color ? h('i', { style: { background: r.color } }) : null, h('span', { text: r.value }), h('em', { text: r.label }))));
  }

  /* ---------------- reveal + count-up ---------------- */
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let io = null;
  function ensureIO() {
    if (io || !('IntersectionObserver' in window)) return io;
    io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { activate(en.target); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    return io;
  }
  function activate(el) {
    el.classList.add('in');
    el.querySelectorAll('[data-countup]').forEach(n => countUp(n));
    if (el.hasAttribute('data-countup')) countUp(el);
  }
  U.observe = function (root) {
    const nodes = (root || document).querySelectorAll('.reveal:not(.in)');
    const obs = U.noAnim ? null : ensureIO();
    nodes.forEach(n => { if (obs) obs.observe(n); else activate(n); });
  };
  function countUp(el) {
    if (el.dataset.done === '1') return;
    el.dataset.done = '1';
    const to = parseFloat(el.dataset.countup); const f = el.dataset.fmt || 'int'; const bare = el.dataset.bare === '1';
    if (isNaN(to) || reduceMotion || U.noAnim) { el.textContent = U.fmt(to, f, { bare }); return; }
    const dur = 1100 + Math.min(600, Math.abs(to) * 2);
    const t0 = performance.now();
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = U.fmt(to * e, f, { bare });
      if (p < 1) requestAnimationFrame(step); else el.textContent = U.fmt(to, f, { bare });
    };
    requestAnimationFrame(step);
  }
  U.countUp = countUp;

  /* ---------------- KPI tile ---------------- */
  const GROUP_ACCENT = { AD: 'var(--s1)', WF: 'var(--s7)', TN: 'var(--s3)', FN: 'var(--s2)' };
  U.groupAccent = g => GROUP_ACCENT[g] || 'var(--s1)';

  U.tile = function (k, idx, opts) {
    opts = opts || {};
    const accent = (k.fmt === 'index' || k.fmt === 'signedPct') && k.value != null && k.value < 0 ? 'var(--neg)' : U.groupAccent(k.g);
    const el = h('div', { class: 'tile glow reveal' + (opts.hero ? ' hero' : ''), style: { '--i': idx || 0, '--accent': accent }, role: 'group', 'aria-label': k.label });
    el.appendChild(h('div', { class: 'k-id', text: k.id }));
    const fxBtn = h('button', { class: 'k-fx-btn', type: 'button', text: 'ƒx', title: 'Show formula', 'aria-label': 'Show formula for ' + k.label, 'aria-expanded': 'false' });
    fxBtn.addEventListener('click', e => { e.stopPropagation(); const on = el.classList.toggle('show-fx'); fxBtn.setAttribute('aria-expanded', String(on)); tip.hide(); });
    el.appendChild(h('div', { class: 'k-src' }, h('span', { text: k.src }), fxBtn));
    el.appendChild(h('div', { class: 'k-label', text: k.label }));
    const val = h('div', { class: 'k-value' + (k.value == null ? ' na' : '') });
    if (k.value == null) val.appendChild(h('span', { text: 'No data' }));
    else {
      const bare = /pct|hrs/.test(k.fmt);
      val.appendChild(h('span', { 'data-countup': k.value, 'data-fmt': k.fmt, 'data-bare': bare ? '1' : '0', text: U.fmt(0, k.fmt, { bare }) }));
      const unit = U.unitOf(k);
      if (unit) val.appendChild(h('span', { class: 'unit', text: unit }));
    }
    el.appendChild(val);
    // viz
    if (k.value != null) {
      if (k.fmt === 'pct' || k.fmt === 'signedPct' || k.fmt === 'score2') {
        const p = Math.max(0, Math.min(1, k.fmt === 'score2' ? k.value : Math.abs(k.value) / 100));
        el.appendChild(h('div', { class: 'k-viz' }, ring(p)));
      } else if (k.fmt === 'index') {
        el.appendChild(h('div', { class: 'k-viz' }, indexBar(k.value)));
      } else if (k.fmt === 'score' && k.max) {
        const m = h('div', { class: 'meter', style: { '--p': Math.max(0, Math.min(1, k.value / k.max)) } }, h('i'));
        el.appendChild(m);
      }
    }
    const foot = h('div', { class: 'k-foot' }, h('span', { class: 'base', text: k.base === 'Non-SSC' ? 'Non-SSC base' : (k.base === 'All' ? 'All respondents' : k.base) }), h('span', { text: 'n = ' + nf0.format(k.n || 0) }));
    el.appendChild(foot);
    const fx = h('div', { class: 'k-formula' }, h('div', { class: 'f-l', text: 'Formula' }), h('div', { class: 'f-t', text: k.formula || k.desc }));
    if (k.worked) fx.appendChild(h('div', { class: 'f-w' }, h('span', { text: k.worked }), h('b', { text: ' = ' + U.fmt(k.value, k.fmt) + (k.suffix || '') })));
    else if (k.value == null) fx.appendChild(h('div', { class: 'f-w', text: 'No responses in this slice' }));
    el.appendChild(fx);
    bindTip(el, () => tipNode(k.id + ' · ' + k.label, [{ value: k.value == null ? 'No data' : U.fmt(k.value, k.fmt) + (k.suffix || ''), label: 'value' }, { value: nf0.format(k.n || 0), label: 'observations (n)' }, { value: k.formula || k.desc, label: '' }, k.worked ? { value: k.worked + ' = ' + U.fmt(k.value, k.fmt), label: '' } : null]));
    return el;
  };
  function ring(p) {
    const svg = h('svg', { class: 'ring', viewBox: '0 0 58 58', style: { '--p': p } });
    svg.appendChild(h('circle', { class: 'trk', cx: 29, cy: 29, r: 24 }));
    svg.appendChild(h('circle', { class: 'val', cx: 29, cy: 29, r: 24 }));
    return svg;
  }
  function indexBar(v) {
    const svg = h('svg', { class: 'idx', viewBox: '0 0 92 26' });
    svg.appendChild(h('line', { class: 'axis', x1: 2, y1: 13, x2: 90, y2: 13 }));
    const w = Math.min(44, Math.abs(v) * 44);
    svg.appendChild(h('rect', { class: 'bar', x: v >= 0 ? 46 : 46 - w, y: 6, width: w, height: 14, rx: 3, fill: v >= 0 ? 'var(--pos)' : 'var(--neg)' }));
    svg.appendChild(h('line', { class: 'zero', x1: 46, y1: 2, x2: 46, y2: 24 }));
    return svg;
  }

  /* ---------------- scorecard ---------------- */
  U.scorecard = function (res, onThreshold, idx) {
    const el = h('div', { class: 'score reveal', style: { '--i': idx || 0 } });
    // dial: 5 arc segments
    const dial = h('div', { class: 'score-dial' + (res.evaluated && res.passed === res.evaluated ? ' all' : '') });
    const svg = h('svg', { viewBox: '0 0 200 200' });
    svg.innerHTML = '<defs><linearGradient id="dialGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#20b99f"/><stop offset=".55" stop-color="#2a78d6"/><stop offset="1" stop-color="#6250d6"/></linearGradient></defs>';
    const r = 86, cx = 100, cy = 100, segs = 5, gapDeg = 6, span = (360 - segs * gapDeg) / segs;
    const len = (span / 360) * 2 * Math.PI * r;
    res.tests.forEach((t, i) => {
      const a0 = -90 + i * (span + gapDeg), a1 = a0 + span;
      const p0 = polar(cx, cy, r, a0), p1 = polar(cx, cy, r, a1);
      const d = `M ${p0.x} ${p0.y} A ${r} ${r} 0 0 1 ${p1.x} ${p1.y}`;
      svg.appendChild(h('path', { class: 'seg', d }));
      if (t.pass) svg.appendChild(h('path', { class: 'seg on anim', d, style: { '--i': i, '--len': len.toFixed(1) } }));
    });
    dial.appendChild(svg);
    const n = h('div', { class: 'n' }, h('span', { 'data-countup': res.passed, 'data-fmt': 'int', text: '0' }), h('small', { text: ' / ' + res.evaluated }));
    dial.appendChild(h('div', { class: 'mid' }, h('div', null, n, h('div', { class: 'l', text: 'tests passed' }))));
    el.appendChild(dial);
    const list = h('div', { class: 'score-list' });
    list.appendChild(h('div', { class: 'score-head' }, h('h3', { text: 'Demand-test scorecard' }), h('span', { text: 'Does the evidence justify a national AI skilling intervention in this slice? Thresholds are editable.' })));
    res.tests.forEach((t, i) => {
      const isScore = t.fmt === 'score2';
      const p = t.value == null ? 0 : (isScore ? t.value : t.value / 100);
      const TEST_COLORS = ['var(--s1)', 'var(--s3)', 'var(--s7)', 'var(--s2)', 'var(--teal-500)'];
      const row = h('div', { class: 'test', style: { '--i': i, '--tc': TEST_COLORS[i % TEST_COLORS.length] } });
      row.appendChild(h('div', { class: 't-ic', text: t.test <= 4 ? 'T' + t.test : 'G' }));
      row.appendChild(h('div', { class: 't-l' }, t.label.replace(/^Test \d — /, '').replace('Training-demand gate', 'Training-demand gate'), h('small', { text: t.desc })));
      row.appendChild(h('div', { class: 't-v', text: U.fmt(t.value, t.fmt) }));
      const pill = t.pass === null ? h('span', { class: 'pill na', text: 'No data' })
        : h('span', { class: 'pill ' + (t.pass ? 'pass' : 'fail'), style: { '--i': i }, html: U.icon(t.pass ? 'check' : 'x', 12) + (t.pass ? 'Pass' : 'Fail') });
      row.appendChild(pill);
      const input = h('input', { type: 'number', step: isScore ? '0.05' : '1', min: 0, max: isScore ? 1 : 100, value: t.threshold, 'aria-label': 'Pass threshold for ' + t.label });
      input.addEventListener('change', () => { const v = parseFloat(input.value); if (!isNaN(v) && onThreshold) onThreshold(t.id.replace('-', ''), v); });
      row.appendChild(h('div', { class: 't-th' }, h('span', { text: 'threshold ≥' }), input, h('span', { text: isScore ? '' : '%' })));
      const bar = h('div', { class: 't-bar', style: { '--p': Math.min(1, p), '--i': i } }, h('i'), h('span', { class: 'th', style: { '--t': Math.min(1, isScore ? t.threshold : t.threshold / 100) }, title: 'threshold' }));
      row.appendChild(bar);
      bindTip(row, () => tipNode(t.label, [{ value: U.fmt(t.value, t.fmt), label: 'value' }, { value: isScore ? t.threshold : t.threshold + '%', label: 'pass threshold' }, { value: nf0.format(t.n), label: 'observations (n)' }, { value: t.base, label: 'respondent base' }]));
      list.appendChild(row);
    });
    el.appendChild(list);
    return el;
  };
  function polar(cx, cy, r, deg) { const a = deg * Math.PI / 180; return { x: +(cx + r * Math.cos(a)).toFixed(2), y: +(cy + r * Math.sin(a)).toFixed(2) }; }

  /* ---------------- chart card ---------------- */
  U.card = function (spec, idx) {
    const d = spec.data || {};
    const el = h('div', { class: 'card glow reveal' + (spec.wide || (spec.type === 'stack' && d.items && d.items.length > 5) || (spec.type === 'rank' && d.items && d.items.length > 8) ? ' wide' : ''), style: { '--i': idx || 0 } });
    const head = h('div', { class: 'card-h' }, h('div', null, h('h3', { text: spec.title }), spec.sub ? h('p', { text: spec.sub }) : null));
    const tools = h('div', { class: 'card-tools' });
    head.appendChild(tools);
    el.appendChild(head);
    const body = h('div', { class: 'card-b' });
    el.appendChild(body);

    const n = d.n != null ? d.n : (d.items ? Math.max.apply(null, [0].concat(d.items.map(i => i.n || 0))) : 0);
    const empty = d.error || !d.items && !d.rows || (d.items && !d.items.some(i => (i.count || 0) > 0 || (i.n || 0) > 0 || (i.value || 0) > 0)) || (d.rows && !d.rows.some(r => Object.keys(r).some(k => k !== 'label' && r[k] != null && r[k] !== 0)));
    if (empty) {
      body.appendChild(h('div', { class: 'empty' }, h('b', { text: d.error ? 'Could not compute this chart' : 'No responses in this slice' }), d.error ? h('code', { text: d.error }) : 'Adjust the filters or wait for more submissions.'));
      return el;
    }
    const chartView = h('div', { class: 'view active' });
    const tableView = h('div', { class: 'view' });
    body.appendChild(chartView); body.appendChild(tableView);

    let twin;
    switch (spec.type) {
      case 'bars': twin = renderBars(chartView, spec, d); break;
      case 'stack': twin = renderStack(chartView, spec, d); break;
      case 'rank': twin = renderRank(chartView, spec, d); break;
      case 'table': twin = renderTable(chartView, spec, d); break;
      case 'kv': twin = renderKV(chartView, spec, d); break;
      default: twin = null;
    }
    if (twin) {
      tableView.appendChild(twin);
      const bChart = h('button', { class: 'tbtn active', type: 'button', html: U.icon('chart', 14) + 'Chart', 'aria-pressed': 'true' });
      const bTable = h('button', { class: 'tbtn', type: 'button', html: U.icon('table', 14) + 'Table', 'aria-pressed': 'false' });
      const sw = (showTable) => {
        chartView.classList.toggle('active', !showTable); tableView.classList.toggle('active', showTable);
        bChart.classList.toggle('active', !showTable); bTable.classList.toggle('active', showTable);
        bChart.setAttribute('aria-pressed', String(!showTable)); bTable.setAttribute('aria-pressed', String(showTable));
      };
      bChart.addEventListener('click', () => sw(false)); bTable.addEventListener('click', () => sw(true));
      tools.appendChild(bChart); tools.appendChild(bTable);
    }
    if (n) el.appendChild(h('div', { class: 'n-note', text: `n = ${nf0.format(n)} ${spec.nLabel || (spec.type === 'bars' && d.countLabel ? d.countLabel : 'answered')}` }));
    return el;
  };

  /* ----- bars (single series) ----- */
  function renderBars(root, spec, d) {
    const items = d.items;
    const max = Math.max.apply(null, items.map(i => i.value || 0)) || 1;
    const list = h('div', { class: 'bars' });
    items.forEach((it, i) => {
      const row = h('div', { class: 'brow', style: { '--i': i } });
      row.appendChild(h('div', { class: 'bl', text: it.label, title: it.label }));
      row.appendChild(h('div', { class: 'btrack' }, h('div', { class: 'bfill', style: { '--w': ((it.value || 0) / max * 100).toFixed(2) } })));
      const v = h('div', { class: 'bv' }, U.fmt(it.value, 'pct'), h('small', { text: it.count != null ? nf0.format(it.count) : '' }));
      row.appendChild(v);
      bindTip(row, () => tipNode(it.label, [{ value: U.fmt(it.value, 'pct'), label: 'share', color: 'var(--s1)' }, { value: nf0.format(it.count || 0), label: d.countLabel || 'count' }, it.n != null ? { value: nf0.format(it.n), label: 'answered for this item' } : null].concat((spec.extraCols || []).map(c => ({ value: nf0.format(it[c.key] || 0), label: c.label })))));
      list.appendChild(row);
    });
    root.appendChild(list);
    if (d.footer && d.footer.length) root.appendChild(h('div', { class: 'foot' }, d.footer.map(f => h('span', null, f.label + ': ', h('b', { text: U.fmt(f.value, f.fmt === 'ratioPct' ? 'pct' : f.fmt) }), f.n != null ? h('span', { text: ` (n = ${nf0.format(f.n)})`, style: { color: 'var(--ink-3)' } }) : null))));
    const cols = [{ key: 'label', label: 'Option' }, { key: 'count', label: d.countLabel ? cap(d.countLabel) : 'Count', fmt: 'int' }].concat(spec.extraCols || []).concat([{ key: 'value', label: '%', fmt: 'pct' }]);
    return table(cols, items);
  }
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  /* ----- stacked / diverging ----- */
  const ORD = ['var(--ord-1)', 'var(--ord-2)', 'var(--ord-3)'];
  const ORD_LIGHT = [false, true, true];
  const CAT = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)'];
  function renderStack(root, spec, d) {
    const cats = d.cats, items = d.items;
    const mode = spec.mode || 'ordinal';
    let colors, light;
    if (mode === 'diverging') { colors = ['var(--pos)', 'var(--neg)', 'var(--neutral)']; light = [false, false, true]; }
    else if (mode === 'ordinalRev') { colors = ORD.slice().reverse(); light = ORD_LIGHT.slice().reverse(); }
    else if (mode === 'categorical') { colors = CAT; light = CAT.map(() => false); }
    else { colors = cats.length === 2 ? ['var(--ord-1)', 'var(--ord-3)'] : ORD; light = cats.length === 2 ? [false, true] : ORD_LIGHT; }
    const legend = h('div', { class: 'legend' }, cats.map((c, i) => h('span', null, h('i', { class: 'sw', style: { background: colors[i % colors.length], border: light[i % light.length] ? '1px solid var(--baseline)' : 'none' } }), c.label)));
    root.appendChild(legend);
    const list = h('div', { class: 'stack' });
    const maxTotal = spec.absolute ? Math.max.apply(null, items.map(it => cats.reduce((s, c) => s + (it.counts[c.key] || 0), 0))) || 1 : null;
    // diverging scale: largest side across items maps to 50%
    let divScale = 1;
    if (mode === 'diverging') {
      const sides = items.filter(it => it.n).map(it => { const neu = (it.counts[cats[2].key] || 0) / it.n / 2; return Math.max((it.counts[cats[0].key] || 0) / it.n + neu, (it.counts[cats[1].key] || 0) / it.n + neu); });
      const m = Math.max.apply(null, [0.01].concat(sides)); divScale = 0.5 / m;
    }
    items.forEach((it, i) => {
      const row = h('div', { class: 'srow', style: { '--i': i } });
      row.appendChild(h('div', { class: 'sl', text: it.label, title: it.label }));
      const track = h('div', { class: 'strack' + (mode === 'diverging' ? ' div' : '') });
      if (!it.n) { track.appendChild(h('span', { class: 'n-note', text: 'no responses' })); }
      else if (mode === 'diverging') {
        const neuHalf = (it.counts[cats[2].key] || 0) / it.n / 2;
        const pos = (it.counts[cats[0].key] || 0) / it.n, neg = (it.counts[cats[1].key] || 0) / it.n;
        const left = h('div', { class: 'half l', style: { width: ((neg + neuHalf) * divScale * 100).toFixed(2) + '%' } });
        const right = h('div', { class: 'half r', style: { width: ((pos + neuHalf) * divScale * 100).toFixed(2) + '%' } });
        const segW = (frac, tot) => tot ? (frac / tot * 100).toFixed(2) + '%' : '0%';
        if (neuHalf) left.appendChild(seg(cats[2], it.counts[cats[2].key] / 2, it.n, segW(neuHalf, neg + neuHalf), colors[2], true, 0, i, true));
        if (neg) left.appendChild(seg(cats[1], it.counts[cats[1].key], it.n, segW(neg, neg + neuHalf), colors[1], false, 1, i));
        if (neuHalf) right.appendChild(seg(cats[2], it.counts[cats[2].key] / 2, it.n, segW(neuHalf, pos + neuHalf), colors[2], true, 0, i, true));
        if (pos) right.appendChild(seg(cats[0], it.counts[cats[0].key], it.n, segW(pos, pos + neuHalf), colors[0], false, 1, i));
        track.appendChild(left); track.appendChild(right);
      } else {
        const total = spec.absolute ? maxTotal : cats.reduce((s, c) => s + (it.counts[c.key] || 0), 0) || 1;
        cats.forEach((c, j) => {
          const v = it.counts[c.key] || 0; if (!v) return;
          track.appendChild(seg(c, v, it.n, (v / total * 100).toFixed(2) + '%', colors[j % colors.length], light[j % light.length], j, i));
        });
      }
      row.appendChild(track);
      let right;
      if (spec.showNet && it.net != null) right = h('span', { class: 'net ' + (it.net > 0.0001 ? 'up' : (it.net < -0.0001 ? 'dn' : '')), text: U.fmt(it.net, 'index') });
      else if (spec.showScore && it.net != null) right = h('span', { class: 'net', text: U.fmt(it.net, 'score2') });
      else if (it.note) right = h('span', { class: 'net', text: it.note });
      else right = h('span', { class: 'sv' }, h('small', { text: 'n ' }), nf0.format(it.n));
      row.appendChild(h('div', { class: 'sv' }, right));
      list.appendChild(row);
    });
    root.appendChild(list);
    const cols = [{ key: 'label', label: 'Item' }].concat(cats.map(c => ({ key: 'c_' + c.key, label: c.label, fmt: 'int' }))).concat([{ key: 'n', label: 'Answered (n)', fmt: 'int' }]);
    if (spec.showNet) cols.push({ key: 'net', label: 'Net index (−1..+1)', fmt: 'index' });
    if (spec.showScore) cols.push({ key: 'net', label: 'Score (0–1)', fmt: 'score2' });
    if (items.some(it => it.note)) cols.push({ key: 'note', label: 'Most-cited' });
    const rows = items.map(it => { const r = { label: it.label, n: it.n, net: it.net, note: it.note }; cats.forEach(c => { r['c_' + c.key] = it.counts[c.key] || 0; }); return r; });
    return table(cols, rows);
  }
  function seg(cat, count, n, width, color, isLight, j, i, isHalf) {
    const s = h('div', { class: 'sseg' + (isLight ? ' light' : ''), style: { width, background: color, '--i': i, '--j': j } });
    const pctv = n ? count / n * 100 : 0;
    const w = parseFloat(width);
    if (!isHalf && w >= 16) s.appendChild(h('span', { text: Math.round(pctv) + '%' }));
    bindTip(s, () => tipNode(cat.label, [{ value: U.fmt(isHalf ? pctv * 2 : pctv, 'pct'), label: 'share of answered', color }, { value: nf0.format(isHalf ? count * 2 : count), label: 'count' }, { value: nf0.format(n), label: 'answered (n)' }]));
    return s;
  }

  /* ----- rank ----- */
  function renderRank(root, spec, d) {
    const items = d.items.filter(i => i.n > 0);
    const maxRank = spec.maxRank || 10;
    const list = h('div', { class: 'bars ranked' });
    items.forEach((it, i) => {
      const row = h('div', { class: 'brow', style: { '--i': i } });
      row.appendChild(h('div', { class: 'bl', text: it.label, title: it.label, 'data-rank': it.order }));
      // bar length encodes "strength" = inverted mean rank
      const strength = Math.max(0, (maxRank - it.meanRank) / (maxRank - 1)) * 100;
      row.appendChild(h('div', { class: 'btrack' }, h('div', { class: 'bfill', style: { '--w': strength.toFixed(2) } })));
      row.appendChild(h('div', { class: 'bv' }, 'mean ' + U.fmt(it.meanRank, 'num1'), h('small', { text: U.fmt(it.top3, 'pct') + ' top-3' })));
      bindTip(row, () => tipNode(it.label, [{ value: U.fmt(it.meanRank, 'num1'), label: 'mean rank (1 = most important)', color: 'var(--s1)' }, { value: U.fmt(it.top3, 'pct'), label: 'ranked in top 3' }, { value: nf0.format(it.n), label: 'times ranked' }, { value: '#' + it.order, label: 'order' }]));
      list.appendChild(row);
    });
    root.appendChild(list);
    root.appendChild(h('div', { class: 'foot' }, h('span', { text: 'Bar length = inverted mean rank (longer = ranked more important). Order #1 = lowest mean rank.' })));
    return table([{ key: 'order', label: '#', fmt: 'int' }, { key: 'label', label: 'Item' }, { key: 'n', label: 'Times ranked', fmt: 'int' }, { key: 'meanRank', label: 'Mean rank', fmt: 'num2' }, { key: 'top3', label: '% top 3', fmt: 'pct' }], d.items);
  }

  /* ----- table / kv ----- */
  function renderTable(root, spec, d) {
    const max = Math.max.apply(null, [0].concat(d.rows.map(r => r.bar || 0))) || 1;
    const t = table(d.columns, d.rows, r => r.bar != null ? (r.bar / max * 100) : null);
    root.appendChild(t);
    return null; // the chart *is* the table
  }
  function renderKV(root, spec, d) {
    const kv = h('div', { class: 'kv' });
    d.rows.forEach(r => kv.appendChild(h('div', { class: 'kvr' }, h('span', { class: 'l', text: r.label }), h('span', { class: 'v' }, h('span', { 'data-countup': r.value == null ? '' : r.value, 'data-fmt': r.fmt, text: r.value == null ? '—' : U.fmt(0, r.fmt) }), r.n != null ? h('small', { text: 'n = ' + nf0.format(r.n) }) : null))));
    root.appendChild(kv);
    return null;
  }
  function table(cols, rows, barFn) {
    const t = h('table', { class: 'tbl' });
    t.appendChild(h('thead', null, h('tr', null, cols.map(c => h('th', { class: c.fmt ? 'num' : '', text: c.label })))));
    const tb = h('tbody');
    rows.forEach((r, i) => {
      tb.appendChild(h('tr', null, cols.map((c, ci) => {
        const v = r[c.key];
        const td = h('td', { class: c.fmt ? 'num' : '', text: c.fmt ? U.fmt(v, c.fmt) : (v == null ? '' : String(v)) });
        if (ci === 0 && barFn) { const w = barFn(r); if (w != null) td.appendChild(h('i', { class: 'mini', style: { '--w': w.toFixed(2), '--i': i } })); }
        return td;
      })));
    });
    t.appendChild(tb);
    return h('div', { class: 'tbl-wrap' }, t);
  }
  U.table = table;

  /* ---------------- overview area card ---------------- */
  U.areaCard = function (sec, kpis, onOpen, idx) {
    const el = h('button', { class: 'area glow reveal', type: 'button', style: { '--i': idx || 0, '--accent': U.groupAccent(sec.key) }, onclick: onOpen });
    el.appendChild(h('div', { class: 'a-h' }, h('span', { class: 'a-ic', html: U.icon(sec.icon, 18) }), h('div', null, h('h3', { text: sec.label }), h('div', { class: 'a-sub', text: kpis.length + ' headline KPIs' }))));
    const list = h('div', { class: 'a-kpis' });
    kpis.slice(0, 4).forEach(k => list.appendChild(h('div', { class: 'a-k' }, h('span', { text: k.label }), h('b', { text: k.value == null ? '—' : U.fmt(k.value, k.fmt) }))));
    el.appendChild(list);
    el.appendChild(h('span', { class: 'a-more', html: 'Open section ' + U.icon('arrow', 14) }));
    return el;
  };

  AIKPI.UI = U;
})();
