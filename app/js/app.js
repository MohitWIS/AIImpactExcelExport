/* =====================================================================
   app.js : bootstrap – Zoho Creator SDK detection, record fetch (v2 with
   cursor pagination, v1 fallback), demo fallback, filters, tabs, theme,
   CSV export and rendering orchestration.
   ===================================================================== */
(function () {
  const C = AIKPI.CONFIG, UI = AIKPI.UI, CM = AIKPI.Compute, SECTIONS = AIKPI.SECTIONS;
  const $ = s => document.querySelector(s);
  const h = UI.h;

  const state = {
    mode: 'loading',           // loading | live | demo
    error: null,
    raw: [], rows: [],
    filters: { sector: 'All', stake: 'All', range: 'all' },
    thresholds: Object.assign({}, C.thresholds),
    tab: 'overview',
    app: '', report: C.reportLinkName,
    demoSeed: 20261022
  };

  /* ---------------- theme ---------------- */
  function initTheme() {
    let t = null;
    try { t = localStorage.getItem('aikpi-theme'); } catch (e) { /* ignore */ }
    if (!t) t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    applyTheme(t, false);
  }
  function applyTheme(t, animate) {
    const html = document.documentElement;
    if (animate) { html.classList.add('theming'); setTimeout(() => html.classList.remove('theming'), 500); }
    html.setAttribute('data-theme', t);
    try { localStorage.setItem('aikpi-theme', t); } catch (e) { /* ignore */ }
    const b = $('#themeBtn'); if (b) { b.innerHTML = UI.icon(t === 'dark' ? 'sun' : 'moon', 18); b.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'); b.title = b.getAttribute('aria-label'); }
  }

  /* ---------------- Zoho SDK layer ---------------- */
  const withTimeout = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error((label || 'Request') + ' timed out after ' + Math.round(ms / 1000) + 's')), ms))]);
  const SDK = {
    // The SDK only works when the widget is embedded in a Creator page (an iframe).
    present() { return typeof ZOHO !== 'undefined' && ZOHO && ZOHO.CREATOR && window.self !== window.top; },
    async init() {
      if (ZOHO.CREATOR.init) { try { await withTimeout(ZOHO.CREATOR.init(), 8000, 'SDK init'); } catch (e) { /* v2 does not need init */ } }
    },
    async initParams() { try { return (ZOHO.CREATOR.UTIL && ZOHO.CREATOR.UTIL.getInitParams) ? (await withTimeout(ZOHO.CREATOR.UTIL.getInitParams(), 6000, 'getInitParams')) || {} : {}; } catch (e) { return {}; } },
    async widgetParams() { try { return (ZOHO.CREATOR.UTIL && ZOHO.CREATOR.UTIL.getWidgetParams) ? (await withTimeout(ZOHO.CREATOR.UTIL.getWidgetParams(), 6000, 'getWidgetParams')) || {} : {}; } catch (e) { return {}; } },
    isNoData(e) { const s = JSON.stringify(e || {}); return (e && (e.code === 3100 || e.code === '3100')) || /3100|no data|No records/i.test(s + (e && e.message || '')); },
    // Fetch every page of the report with one v2 field configuration.
    async fetchPagesV2(app, report, fieldCfg, onProgress) {
      let all = [], cursor = null, guard = 0;
      do {
        const cfg = Object.assign({ report_name: report, max_records: C.maxRecords }, fieldCfg);
        if (app) cfg.app_name = app;
        if (cursor) cfg.record_cursor = cursor;
        let resp;
        try { resp = await withTimeout(ZOHO.CREATOR.DATA.getRecords(cfg), 60000, 'getRecords'); }
        catch (e) { if (this.isNoData(e)) break; throw e; }
        if (resp && resp.code && resp.code !== 3000 && !resp.data) { if (resp.code === 3100) break; throw new Error(resp.message || ('API code ' + resp.code)); }
        const data = (resp && resp.data) || [];
        all = all.concat(data);
        if (onProgress) onProgress('Loaded ' + all.length + ' records (' + (fieldCfg.field_config || 'quick_view') + ')…');
        cursor = resp && (resp.record_cursor || resp.recordCursor || (resp.headers && (resp.headers.record_cursor || resp.headers['record-cursor']))) || null;
        if (data.length < C.maxRecords) cursor = null;
      } while (cursor && ++guard < 100);
      return all;
    },
    async fetchPagesV1(app, report, onProgress) {
      let all = [], page = 1;
      for (;;) {
        const cfg = { reportName: report, page, pageSize: C.v1PageSize };
        if (app) cfg.appName = app;
        let resp;
        try { resp = await withTimeout(ZOHO.CREATOR.API.getAllRecords(cfg), 60000, 'getAllRecords'); }
        catch (e) { if (this.isNoData(e)) break; throw e; }
        const data = (resp && resp.data) || [];
        all = all.concat(data);
        if (onProgress) onProgress('Loaded ' + all.length + ' records…');
        if (data.length < C.v1PageSize || ++page > 200) break;
      }
      return all;
    },
    // Fetch one record's detail-view fields (used when list calls omit subform data).
    async fetchOne(app, report, id) {
      if (ZOHO.CREATOR.DATA && ZOHO.CREATOR.DATA.getRecordById) {
        const cfg = { report_name: report, id: String(id), field_config: 'all' };
        if (app) cfg.app_name = app;
        const resp = await withTimeout(ZOHO.CREATOR.DATA.getRecordById(cfg), 30000, 'getRecordById');
        return resp && resp.data ? resp.data : null;
      }
      if (ZOHO.CREATOR.API && ZOHO.CREATOR.API.getRecordById) {
        const cfg = { reportName: report, id: String(id) };
        if (app) cfg.appName = app;
        const resp = await withTimeout(ZOHO.CREATOR.API.getRecordById(cfg), 30000, 'getRecordById');
        return resp && resp.data ? resp.data : null;
      }
      return null;
    },
    async hydrateByRecord(app, report, records, onProgress) {
      const limit = Math.min(records.length, C.maxDetailFetches || 400);
      const out = records.slice(); let next = 0, done = 0, failed = 0;
      const worker = async () => {
        while (next < limit) {
          const i = next++;
          const id = records[i] && (records[i].ID || records[i].id);
          if (id) {
            try { const d = await this.fetchOne(app, report, id); if (d) out[i] = Object.assign({}, records[i], d); else failed++; }
            catch (e) { failed++; }
          }
          done++;
          if (onProgress) onProgress('Loading record details… ' + done + ' / ' + limit);
        }
      };
      await Promise.all(Array.from({ length: 5 }, worker));
      return { records: out, failed, limit };
    },
    // Cascade of strategies until grid (subform) rows are present in the data.
    async fetchAll(app, report, onProgress) {
      const diag = { attempts: [], strategy: null, records: 0, coverage: null, sdk: null };
      const expected = AIKPI.SUBFORM_KEYS.map(k => AIKPI.F[k]);
      const accept = (records, label) => {
        const cov = subformCoverage(records, expected);
        diag.attempts.push(Object.assign({ strategy: label, records: records.length }, cov));
        return cov;
      };
      let records = [];
      if (ZOHO.CREATOR.DATA && ZOHO.CREATOR.DATA.getRecords) {
        diag.sdk = 'v2';
        const strategies = [
          { label: 'all', cfg: { field_config: 'all' } },
          { label: 'detail_view', cfg: { field_config: 'detail_view' } },
          { label: 'custom', cfg: { field_config: 'custom', fields: AIKPI.ALL_FIELDS.join(',') } }
        ];
        for (const s of strategies) {
          try {
            const r = await this.fetchPagesV2(app, report, s.cfg, onProgress);
            const cov = accept(r, s.label);
            if (r.length > records.length || (r.length === records.length && cov.withRows > 0)) records = r;
            if (r.length === 0) break;                  // report is empty – nothing more to try
            if (cov.withRows > 0) { diag.strategy = s.label; break; }
          } catch (e) {
            diag.attempts.push({ strategy: s.label, error: (e && e.message) || String(e) });
            if (s.label === 'all' && records.length === 0) { if (/timed out|permission|access|not found|invalid/i.test(String(e && e.message))) throw e; }
          }
        }
      } else if (ZOHO.CREATOR.API && ZOHO.CREATOR.API.getAllRecords) {
        diag.sdk = 'v1';
        records = await this.fetchPagesV1(app, report, onProgress);
        const cov = accept(records, 'v1 getAllRecords');
        if (cov.withRows > 0) diag.strategy = 'v1 getAllRecords';
      } else {
        throw new Error('Zoho Creator JS SDK is loaded but exposes no record API (expected ZOHO.CREATOR.DATA.getRecords or ZOHO.CREATOR.API.getAllRecords).');
      }
      // Last resort: pull each record's detail view individually.
      if (records.length && !diag.strategy) {
        try {
          const h = await this.hydrateByRecord(app, report, records, onProgress);
          const cov = accept(h.records, 'getRecordById × ' + h.limit + (h.failed ? ' (' + h.failed + ' failed)' : ''));
          if (cov.withRows > 0) { diag.strategy = 'getRecordById'; records = h.records; }
        } catch (e) { diag.attempts.push({ strategy: 'getRecordById', error: (e && e.message) || String(e) }); }
      }
      diag.records = records.length;
      diag.coverage = subformCoverage(records, expected);
      if (records.length) {
        const r0 = records[0];
        diag.sampleKeys = Object.keys(r0);
        diag.missingKeys = AIKPI.ALL_FIELDS.filter(k => !(k in r0));
        const sf = r0[AIKPI.F.b13];
        diag.sampleSubform = { key: AIKPI.F.b13, type: Array.isArray(sf) ? 'array[' + sf.length + ']' : typeof sf, sample: JSON.stringify(sf == null ? null : (Array.isArray(sf) ? sf.slice(0, 2) : sf)).slice(0, 400) };
        console.log('[AI KPI widget] first record', r0);
      }
      console.log('[AI KPI widget] fetch diagnostics', diag);
      return { records, diag };
    }
  };
  function subformCoverage(records, expectedKeys) {
    let withKey = 0, withRows = 0;
    records.forEach(r => {
      if (expectedKeys.some(k => k in r)) withKey++;
      if (expectedKeys.some(k => Array.isArray(r[k]) ? r[k].length > 0 : (typeof r[k] === 'string' && r[k].trim().startsWith('[') && r[k].length > 2))) withRows++;
    });
    return { withKey, withRows };
  }

  /* ---------------- data loading ---------------- */
  async function load() {
    setStatus(null);
    state.mode = 'loading';
    renderSkeleton();
    if (SDK.present()) {
      try {
        await SDK.init();
        const [ip, wp] = await Promise.all([SDK.initParams(), SDK.widgetParams()]);
        state.app = C.appLinkName || wp.appName || wp.app_name || ip.appLinkName || ip.app_name || '';
        const primary = wp.reportName || wp.report_name || C.reportLinkName;
        const candidates = [primary].concat((C.reportFallbacks || []).filter(n => n !== primary));
        const note = msg => { const el = $('#loadNote'); if (el) el.textContent = msg; };
        let res = null, lastErr = null, tried = [];
        for (const name of candidates) {
          tried.push(name);
          try {
            const r = await SDK.fetchAll(state.app, name, note);
            const allErrored = r.records.length === 0 && r.diag.attempts.length > 0 && r.diag.attempts.every(a => a.error);
            if (allErrored) { lastErr = new Error(r.diag.attempts[0].error); continue; }
            res = r; state.report = name; break;
          } catch (e) { lastErr = e; }
        }
        if (!res) { state.report = tried.join(' / '); throw lastErr || new Error('No report could be read'); }
        res.diag.reportsTried = tried;
        state.raw = res.records; state.diag = res.diag; state.mode = 'live'; state.error = null;
      } catch (e) {
        console.error('[AI KPI widget] fetch failed', e);
        state.error = (e && (e.message || e.description)) || (typeof e === 'string' ? e : JSON.stringify(e));
        if (C.demoWhenOffline) { state.raw = AIKPI.Demo.make(state.demoSeed, C.demoRespondents); state.mode = 'demo'; }
        else { state.raw = []; state.mode = 'live'; }
      }
    } else {
      state.raw = C.demoWhenOffline ? AIKPI.Demo.make(state.demoSeed, C.demoRespondents) : [];
      state.mode = 'demo';
    }
    state.rows = CM.normalize(state.raw);
    buildSectorFilter();
    renderAll();
  }

  /* ---------------- status / header ---------------- */
  function setStatus(node) { const s = $('#status'); s.innerHTML = ''; if (node) s.appendChild(node); }
  function renderHeaderMeta(res) {
    const badges = $('#badges'); badges.innerHTML = '';
    if (state.mode === 'demo') badges.appendChild(h('span', { class: 'badge demo' }, h('i', { class: 'dot' }), 'Demo data · open inside Zoho Creator for live records'));
    if (state.error) badges.appendChild(h('span', { class: 'badge err', title: state.error }, h('i', { class: 'dot' }), 'Fetch failed – showing sample data'));
    badges.appendChild(h('span', { class: 'badge', text: 'Updated ' + new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) }));
    const big = $('#heroN'); big.dataset.countup = res.n; big.dataset.fmt = 'int'; big.dataset.done = '0'; big.textContent = '0'; UI.countUp(big);
    const chips = $('#chips'); chips.innerHTML = '';
    [['SSC', res.nSSC], ['Industry', res.nIndustry], ['Financier', res.nFinancier], ['Other', res.nOther]].forEach(([l, v]) => {
      const c = h('div', { class: 'chip', 'data-k': l }, h('div', { class: 'v', 'data-countup': v, 'data-fmt': 'int', text: '0' }), h('div', { class: 'l', text: l }));
      chips.appendChild(c); UI.countUp(c.querySelector('.v'));
    });
    if (state.error) setStatus(h('div', { class: 'alert err' }, h('span', { html: UI.icon('info', 16) }), h('div', null, h('b', { text: 'Could not load records from Zoho Creator. ' }), 'The dashboard is showing sample data. Error: ', h('code', { text: state.error }), h('div', { style: { marginTop: '4px', fontSize: '12px', color: 'var(--ink-2)' }, text: `App: ${state.app || '(current)'} · Report: ${state.report}. Check the report link name, that the widget user has access to the report, and that the Creator JS SDK script is reachable.` }))));
    else if (state.mode === 'live' && !state.rows.length) setStatus(h('div', { class: 'alert warn' }, h('span', { html: UI.icon('info', 16) }), h('div', null, h('b', { text: 'No submissions yet. ' }), 'KPIs will populate as soon as responses are recorded in ', h('code', { text: state.report }), '.')));
    else if (state.mode === 'live' && state.diag) renderDiag(state.diag);
  }
  // Live-mode data diagnostics: shows whether grid (subform) rows arrived and how.
  function renderDiag(d) {
    const cov = d.coverage || { withKey: 0, withRows: 0 };
    const ok = cov.withRows > 0;
    const summary = ok
      ? `${d.records} records loaded · grid rows present in ${cov.withRows} · fetched with ${d.strategy || 'quick view'}`
      : `${d.records} records loaded, but none contain grid (subform) rows – section B to H charts will be empty`;
    const det = h('details', { class: 'diag' + (ok ? '' : ' bad') });
    det.appendChild(h('summary', null, h('span', { html: UI.icon(ok ? 'check' : 'info', 14) }), h('span', { text: summary }), h('span', { class: 'diag-more', text: 'details' })));
    const body = h('div', { class: 'diag-b' });
    body.appendChild(h('div', null, h('b', { text: 'Attempts: ' }), d.attempts.map(a => `${a.strategy}: ${a.error ? 'error – ' + a.error : a.records + ' records, ' + a.withRows + ' with grid rows'}`).join('  ·  ')));
    if (d.sampleSubform) body.appendChild(h('div', null, h('b', { text: 'B.1.3 grid in first record: ' }), h('code', { text: d.sampleSubform.type + ' ' + d.sampleSubform.sample })));
    if (d.missingKeys && d.missingKeys.length) body.appendChild(h('div', null, h('b', { text: `Fields absent from the first record (${d.missingKeys.length}): ` }), h('code', { text: d.missingKeys.slice(0, 40).join(', ') + (d.missingKeys.length > 40 ? ' …' : '') })));
    if (d.sampleKeys) body.appendChild(h('div', null, h('b', { text: 'Fields present: ' }), h('code', { text: d.sampleKeys.slice(0, 60).join(', ') + (d.sampleKeys.length > 60 ? ' …' : '') })));
    const copy = h('button', { class: 'tbtn', type: 'button', html: UI.icon('download', 14) + 'Copy diagnostics' });
    copy.addEventListener('click', () => { const txt = JSON.stringify({ app: state.app, report: state.report, diag: d }, null, 2); if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => { copy.textContent = 'Copied'; }); else console.log(txt); });
    body.appendChild(copy);
    det.appendChild(body);
    setStatus(det);
  }

  /* ---------------- filters ---------------- */
  function buildSectorFilter() {
    const sel = $('#sector'); const cur = state.filters.sector;
    sel.innerHTML = '';
    sel.appendChild(h('option', { value: 'All', text: `All sectors (${state.rows.length})` }));
    CM.sectors(state.rows).forEach(s => sel.appendChild(h('option', { value: s.name, text: `${s.name} (${s.n})` })));
    sel.value = [...sel.options].some(o => o.value === cur) ? cur : 'All';
    state.filters.sector = sel.value;
  }
  function initFilters() {
    $('#sector').addEventListener('change', e => { state.filters.sector = e.target.value; renderAll(); });
    $('#range').addEventListener('change', e => { state.filters.range = e.target.value; renderAll(); });
    const seg = $('#stake');
    seg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { state.filters.stake = b.dataset.v; moveSeg(); renderAll(); }));
    moveSeg();
    $('#themeBtn').addEventListener('click', () => applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true));
    $('#refreshBtn').addEventListener('click', async () => { const b = $('#refreshBtn'); b.classList.add('spin'); if (state.mode === 'demo') state.demoSeed += 1; await load(); b.classList.remove('spin'); });
    $('#exportBtn').addEventListener('click', exportCSV);
    $('#fxBtn').hidden = !C.showHeadlineKPIs;
    $('#fxBtn').addEventListener('click', () => {
      const on = document.body.classList.toggle('fx-all');
      $('#fxBtn').setAttribute('aria-pressed', String(on)); $('#fxBtn').classList.toggle('on', on);
      document.querySelectorAll('.tile').forEach(t => t.classList.toggle('show-fx', on));
    });
    window.addEventListener('resize', () => { moveSeg(); moveTabInd(); });
  }
  function moveSeg() {
    const seg = $('#stake'); const ind = seg.querySelector('.seg-ind');
    seg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.v === state.filters.stake));
    const act = seg.querySelector('button.active'); if (!act) return;
    ind.style.left = act.offsetLeft + 'px'; ind.style.width = act.offsetWidth + 'px';
  }

  /* ---------------- tabs ---------------- */
  function initTabs(counts) {
    const tabs = $('#tabs'); tabs.innerHTML = '';
    SECTIONS.forEach(s => {
      const b = h('button', { class: 'tab' + (state.tab === s.key ? ' active' : ''), type: 'button', 'data-k': s.key, role: 'tab', 'aria-selected': String(state.tab === s.key) });
      b.innerHTML = UI.icon(s.icon, 16) + `<span>${s.label}</span>` + (counts && counts[s.key] ? `<span class="cnt">${counts[s.key]}</span>` : '');
      b.addEventListener('click', () => selectTab(s.key));
      tabs.appendChild(b);
    });
    tabs.appendChild(h('div', { class: 'tab-ind' }));
    requestAnimationFrame(moveTabInd);
  }
  function selectTab(key) {
    state.tab = key;
    document.body.dataset.section = key;
    document.querySelectorAll('.tab').forEach(t => { const on = t.dataset.k === key; t.classList.toggle('active', on); t.setAttribute('aria-selected', String(on)); });
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.dataset.panel === key));
    moveTabInd();
    const panel = document.querySelector('.panel.active');
    if (panel) { UI.observe(panel); if (window.scrollY > 260) window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }
  function moveTabInd() {
    const act = document.querySelector('.tab.active'); const ind = document.querySelector('.tab-ind'); if (!act || !ind) return;
    ind.style.left = act.offsetLeft + 'px'; ind.style.width = act.offsetWidth + 'px';
    ind.style.setProperty('--accent', getComputedStyle(act).getPropertyValue('--accent') || 'var(--teal-500)');
  }
  // pointer-following glow on tiles, cards and area cards
  function initGlow() {
    document.addEventListener('pointermove', e => {
      const el = e.target.closest && e.target.closest('.glow');
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    }, { passive: true });
  }

  /* ---------------- rendering ---------------- */
  let lastResult = null;
  function renderSkeleton() {
    const main = $('#main'); main.innerHTML = '';
    const w = h('div', { class: 'loading-wrap' });
    w.appendChild(h('div', { class: 'skel', style: { minHeight: '200px' } }));
    const row = h('div', { class: 'row' }); for (let i = 0; i < 8; i++) row.appendChild(h('div', { class: 'skel' })); w.appendChild(row);
    w.appendChild(h('div', { class: 'n-note', id: 'loadNote', text: SDK.present() ? 'Connecting to Zoho Creator…' : 'Preparing sample data…' }));
    main.appendChild(w);
  }
  function renderAll() {
    const sl = CM.slice(state.rows, state.filters);
    const res = CM.computeKPIs(sl, state.thresholds);
    const charts = CM.computeCharts(sl);
    lastResult = res;
    renderHeaderMeta(res);
    const counts = { AD: res.list.filter(k => k.g === 'AD').length, WF: res.list.filter(k => k.g === 'WF').length, TN: res.list.filter(k => k.g === 'TN').length + 1, FN: res.list.filter(k => k.g === 'FN').length };
    initTabs(counts);
    const main = $('#main'); main.innerHTML = '';
    SECTIONS.forEach(sec => {
      const panel = h('section', { class: 'panel' + (state.tab === sec.key ? ' active' : ''), 'data-panel': sec.key, role: 'tabpanel' });
      if (sec.key === 'overview') renderOverview(panel, res, charts); else renderSection(panel, sec, res, charts[sec.key] || []);
      main.appendChild(panel);
    });
    if (!sl.length) {
      const p = document.querySelector('.panel.active');
      p.insertBefore(h('div', { class: 'card', style: { marginBottom: '14px' } }, h('div', { class: 'empty' }, h('b', { text: 'No respondents match the current filters' }), 'Try widening the sector, stakeholder or date filter.')), p.firstChild);
    }
    if (document.body.classList.contains('fx-all')) document.querySelectorAll('.tile').forEach(t => t.classList.add('show-fx'));
    UI.observe(main);
    requestAnimationFrame(moveTabInd);
  }

  function renderOverview(panel, res, charts) {
    panel.appendChild(h('div', { class: 'sec-head' }, h('h2', { text: 'Overview' }), h('p', { text: `${res.n} respondent${res.n === 1 ? '' : 's'} in the current slice · ${state.filters.sector === 'All' ? 'all sectors' : state.filters.sector} · ${state.filters.stake === 'All' ? 'all stakeholders' : state.filters.stake}` })));
    panel.appendChild(UI.scorecard(res, onThreshold, 0));
    if (C.showHeadlineKPIs) {
      panel.appendChild(h('div', { class: 'sec-sub' }, h('h3', { text: 'Headline KPIs' })));
      const tiles = h('div', { class: 'tiles' });
      ['AD-01', 'AD-09', 'AD-06', 'WF-01', 'WF-11', 'WF-13', 'TN-10', 'TN-14', 'TN-24', 'FN-01', 'FN-03', 'FN-05'].forEach((id, i) => { if (res.kpis[id]) tiles.appendChild(UI.tile(res.kpis[id], i)); });
      panel.appendChild(tiles);
    }
    panel.appendChild(h('div', { class: 'sec-sub' }, h('h3', { text: 'Objective areas' })));
    const areas = h('div', { class: 'ov-areas' });
    SECTIONS.filter(s => s.key !== 'overview').forEach((s, i) => {
      const ks = res.list.filter(k => k.g === s.key && k.hero);
      areas.appendChild(UI.areaCard(s, ks, () => selectTab(s.key), i));
    });
    panel.appendChild(areas);
  }

  function renderSection(panel, sec, res, chartSpecs) {
    panel.appendChild(h('div', { class: 'sec-head' }, h('h2', { text: sec.label }), h('p', { text: sec.blurb })));
    if (sec.key === 'TN') {
      panel.appendChild(UI.scorecard(res, onThreshold, 0));
    }
    if (C.showHeadlineKPIs) {
      panel.appendChild(h('div', { class: 'sec-sub' }, h('h3', { text: 'Headline KPIs' })));
      const tiles = h('div', { class: 'tiles' });
      res.list.filter(k => k.g === sec.key && !k.test).forEach((k, i) => tiles.appendChild(UI.tile(k, i)));
      panel.appendChild(tiles);
    }
    panel.appendChild(h('div', { class: 'sec-sub' }, h('h3', { text: 'Breakdowns' })));
    const cards = h('div', { class: 'cards' });
    chartSpecs.forEach((spec, i) => cards.appendChild(UI.card(spec, i)));
    panel.appendChild(cards);
  }

  function onThreshold(key, value) {
    state.thresholds[key] = value;
    // re-render only the scorecards, in place
    const sl = CM.slice(state.rows, state.filters);
    const res = CM.computeKPIs(sl, state.thresholds);
    lastResult = res;
    document.querySelectorAll('.score').forEach(old => { const nu = UI.scorecard(res, onThreshold, 0); old.replaceWith(nu); nu.classList.add('in'); nu.querySelectorAll('[data-countup]').forEach(n => UI.countUp(n)); });
  }

  /* ---------------- CSV export ---------------- */
  function exportCSV() {
    if (!lastResult) return;
    const esc = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const rows = [['KPI ID', 'Objective area', 'KPI', 'Value', 'Formatted', 'Unit', 'Base (n)', 'Respondent base', 'Source question(s)', 'Definition', 'Formula', 'Calculation', 'Sector filter', 'Stakeholder filter', 'Date range', 'Data mode']];
    const areaName = g => (SECTIONS.find(s => s.key === g) || {}).label || g;
    lastResult.list.concat([lastResult.kpis['TN-06']]).forEach(k => rows.push([k.id, areaName(k.g), k.label, k.value == null ? '' : (Math.round(k.value * 1000) / 1000), UI.fmt(k.value, k.fmt), UI.unitOf(k) || k.fmt, k.n, k.base, k.src, k.desc, k.formula || '', k.worked ? k.worked + ' = ' + UI.fmt(k.value, k.fmt) : '', state.filters.sector, state.filters.stake, state.filters.range, state.mode]));
    lastResult.tests.forEach(t => rows.push([t.id + '-threshold', 'Training Needs', t.label + ' — pass threshold', t.threshold, '', '', '', '', t.src, 'Result: ' + (t.pass === null ? 'no data' : (t.pass ? 'PASS' : 'FAIL')), 'Pass if value ≥ threshold', '', state.filters.sector, state.filters.stake, state.filters.range, state.mode]));
    const csv = '﻿' + rows.map(r => r.map(esc).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `AI_Skilling_KPIs_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------------- boot ---------------- */
  function boot() {
    // deep-link support: ?theme=dark and #tab=TN
    try {
      const q = new URLSearchParams(location.search);
      if (q.get('theme') === 'dark' || q.get('theme') === 'light') { try { localStorage.setItem('aikpi-theme', q.get('theme')); } catch (e) { /* ignore */ } }
      const m = (location.hash || '').match(/tab=(overview|AD|WF|TN|FN)/);
      if (m) state.tab = m[1];
      if (q.get('fx') === '1') { document.body.classList.add('fx-all'); const b = $('#fxBtn'); if (b) { b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); } }
      if (q.get('anim') === '0') { document.documentElement.classList.add('no-anim'); UI.noAnim = true; }
    } catch (e) { /* ignore */ }
    initTheme();
    initFilters();
    initGlow();
    initTabs(null);
    document.body.dataset.section = state.tab;
    load();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  AIKPI.app = { state, reload: load, render: renderAll };
})();
