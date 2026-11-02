/* =====================================================================
   compute.js : record normalisation, slicing, KPI engine and chart
   datasets. Pure functions – no DOM access.
   ===================================================================== */
(function () {
  const F = AIKPI.F, OPT = AIKPI.OPT, MAP = AIKPI.MAP, ORG = AIKPI.ORG;

  /* ---------------- coercion helpers ---------------- */
  const str = v => {
    if (v == null) return '';
    if (Array.isArray(v)) return v.map(str).filter(Boolean).join(', ');
    if (typeof v === 'object') return str(v.display_value != null ? v.display_value : (v.value != null ? v.value : ''));
    return String(v).trim();
  };
  const num = v => {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? null : n;
  };
  const bool = v => v === true || v === 1 || v === '1' || (typeof v === 'string' && /^(true|yes|checked|on)$/i.test(v.trim()));
  const list = v => {
    if (v == null) return [];
    if (Array.isArray(v)) return v.map(str).filter(Boolean);
    if (typeof v === 'string') {
      const t = v.trim();
      if (!t) return [];
      if (t[0] === '[') { try { return list(JSON.parse(t)); } catch (e) { /* fall through */ } }
      return [t];
    }
    return [str(v)].filter(Boolean);
  };
  const subRows = v => {
    if (Array.isArray(v)) return v.filter(x => x && typeof x === 'object');
    if (typeof v === 'string' && v.trim()[0] === '[') { try { return subRows(JSON.parse(v)); } catch (e) { return []; } }
    return [];
  };
  const blank = v => v == null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);
  const NA_RE = /^\s*(na|n\/a|n\.a\.?|not applicable|none|nil|no|nothing|-|—)\s*\.?\s*$/i;
  const isNAText = v => blank(v) || NA_RE.test(String(v));

  const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  function parseDate(v) {
    if (!v) return null;
    if (v instanceof Date) return v;
    const s = String(v).trim();
    let m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
    if (m) return new Date(+m[3], MONTHS[m[2].toLowerCase()], +m[1]);
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function parseINR(s) {
    if (blank(s)) return null;
    const t = String(s).toLowerCase().replace(/,/g, '').replace(/₹|rs\.?|inr/g, ' ');
    const m = t.match(/(\d+(?:\.\d+)?)\s*(lakhs|lakh|lacs|lac|crores|crore|cr|thousand|million|mn|k|l)?\b/);
    if (!m) return null;
    let v = parseFloat(m[1]);
    const u = m[2] || '';
    if (/^(lakhs?|lacs?|l)$/.test(u)) v *= 1e5;
    else if (/^(crores?|cr)$/.test(u)) v *= 1e7;
    else if (/^(k|thousand)$/.test(u)) v *= 1e3;
    else if (/^(million|mn)$/.test(u)) v *= 1e6;
    return isFinite(v) && v > 0 ? v : null;
  }

  /* ---------------- normalisation ---------------- */
  function stakeOf(orgType) {
    if (orgType === ORG.SSC) return 'SSC';
    if (orgType === ORG.EMP) return 'Industry';
    if (orgType === ORG.PAY) return 'Financier';
    return 'Other';
  }

  const SUB_KEYS = ['b11', 'b12', 'b13', 'b21', 'b32', 'c11', 'c21', 'c31', 'c41', 'c42', 'c43', 'c44', 'c45', 'c46', 'd21', 'd31', 'e11', 'e21', 'e31', 'f12', 'f21', 'f31', 'g11a', 'g21', 'g31', 'h11a', 'h11b', 'h11c', 'h11d', 'h21', 'h31', 'h41', 'h61', 'h71'];
  const LIST_KEYS = ['segment', 'a2', 'd11', 'e23', 'e43', 'f11', 'h51', 'h55'];
  const TEXT_KEYS = ['sector', 'respondent', 'designation', 'organisation', 'orgType', 'employees', 'clusters', 'b31a', 'b31b', 'b31c', 'b31d', 'c12', 'e41a', 'e41b', 'e42', 'g32', 'h52', 'h53', 'h54', 'h56', 'email'];
  const NUM_KEYS = ['wfSenior', 'wfMid', 'wfEarly', 'wfEntry'];

  function normalize(records) {
    return (records || []).map((rec, i) => {
      const r = { _i: i, id: str(rec[F.id]) || String(i) };
      TEXT_KEYS.forEach(k => { r[k] = str(rec[F[k]]); });
      NUM_KEYS.forEach(k => { r[k] = num(rec[F[k]]); });
      LIST_KEYS.forEach(k => { r[k] = list(rec[F[k]]); });
      SUB_KEYS.forEach(k => { r[k] = subRows(rec[F[k]]).map(row => coerceRow(row)); });
      r.date = parseDate(rec[F.date]);
      r.sector = r.sector || 'Unspecified';
      r.stake = stakeOf(r.orgType);
      r.isSSC = r.stake === 'SSC';
      return r;
    });
  }

  const ROW_LIST_FIELDS = new Set(['Reason_select_all_that_apply', 'Who_Should_act', 'Who_is_best_placed_to_certify_these_skills', 'Who_ought_to_serve_them_in_your_view']);
  const ROW_BOOL_FIELDS = new Set(['Current_Use', 'Emerging', 'Not_Present', 'Increased', 'Decreased', 'No_change', 'Yes_fails_without_it', 'Partially', 'No_works_regardless', 'Could_work', 'Applies', 'Common', 'Sector_specific']);
  const ROW_NUM_FIELDS = new Set(['Number_of_workers', 'Indicative_duration_hours', 'Workable_batch_size']);
  function coerceRow(row) {
    const out = {};
    Object.keys(row).forEach(k => {
      const v = row[k];
      if (ROW_LIST_FIELDS.has(k)) out[k] = list(v);
      else if (ROW_BOOL_FIELDS.has(k)) out[k] = bool(v);
      else if (ROW_NUM_FIELDS.has(k)) out[k] = num(v);
      else out[k] = str(v);
    });
    return out;
  }

  /* ---------------- slicing ---------------- */
  function slice(rows, f) {
    f = f || {};
    const now = new Date();
    let from = null;
    if (f.range === '30') from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    else if (f.range === '90') from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
    else if (f.range === 'ytd') from = new Date(now.getFullYear(), 0, 1);
    return rows.filter(r => {
      if (f.sector && f.sector !== 'All' && r.sector !== f.sector) return false;
      if (f.stake && f.stake !== 'All' && r.stake !== f.stake) return false;
      if (from && (!r.date || r.date < from)) return false;
      return true;
    });
  }

  function sectors(rows) {
    const m = new Map();
    rows.forEach(r => m.set(r.sector, (m.get(r.sector) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(e => ({ name: e[0], n: e[1] }));
  }

  /* ---------------- aggregation helpers ---------------- */
  const sum = a => a.reduce((s, x) => s + x, 0);
  const mean = a => a.length ? sum(a) / a.length : null;
  const pct = (n, d) => d ? (n / d) * 100 : null;

  // share of rows satisfying pred  -> {value %, n}
  const nfW = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
  const wn = v => nfW.format(v);
  function share(rows, pred) { const k = rows.filter(pred).length; return { value: pct(k, rows.length), n: rows.length, worked: rows.length ? `${wn(k)} ÷ ${wn(rows.length)} × 100` : null }; }
  // mean of mapped numeric values (nulls ignored)
  function avg(rows, fn) { const v = rows.map(fn).filter(x => x != null && !isNaN(x)); return { value: mean(v), n: v.length, worked: v.length ? `${wn(sum(v))} ÷ ${wn(v.length)}` : null }; }
  function mapAvg(rows, field, map) { return avg(rows, r => map[r[field]] != null ? map[r[field]] : null); }
  function netIndex(rows, field, posVal, negVal) {
    const v = rows.filter(r => r[field]);
    if (!v.length) return { value: null, n: 0 };
    const p = v.filter(r => r[field] === posVal).length, q = v.filter(r => r[field] === negVal).length;
    return { value: (p - q) / v.length, n: v.length, worked: `(${wn(p)} − ${wn(q)}) ÷ ${wn(v.length)}` };
  }

  // distribution of a single-choice field over options
  function dist(values, options, opts) {
    opts = opts || {};
    const vals = values.filter(v => !blank(v));
    const known = new Set(options);
    const counts = {};
    options.forEach(o => { counts[o] = 0; });
    let other = 0;
    vals.forEach(v => { if (known.has(v)) counts[v]++; else other++; });
    const items = options.map(o => ({ label: o, count: counts[o], value: pct(counts[o], vals.length) }));
    if (other && opts.otherLabel !== false) items.push({ label: opts.otherLabel || 'Other', count: other, value: pct(other, vals.length) });
    return { items, n: vals.length };
  }

  // multi-select: share of respondents (who answered) selecting each option
  function multi(arrays, options) {
    const answered = arrays.filter(a => a && a.length);
    const items = options.map(o => {
      const c = answered.filter(a => a.includes(o)).length;
      return { label: o, count: c, value: pct(c, answered.length) };
    });
    // any unknown "other" free-text values
    const known = new Set(options);
    const other = answered.filter(a => a.some(x => !known.has(x))).length;
    if (other && !options.includes('Other')) items.push({ label: 'Other', count: other, value: pct(other, answered.length) });
    return { items, n: answered.length };
  }

  // ranked grid: times ranked, mean rank, % top-3
  function rankTable(rows, itemField, rankField, items) {
    const out = items.map(it => {
      const rs = rows.filter(r => r[itemField] === it && num(r[rankField]) != null && !/^na$/i.test(r[rankField]));
      const ranks = rs.map(r => num(r[rankField]));
      return { label: it, n: ranks.length, meanRank: mean(ranks), top3: pct(ranks.filter(x => x <= 3).length, ranks.length) };
    });
    const ranked = out.filter(x => x.n > 0).sort((a, b) => a.meanRank - b.meanRank);
    ranked.forEach((x, i) => { x.order = i + 1; });
    return { items: out.sort((a, b) => (a.order || 99) - (b.order || 99)) };
  }

  // stacked item table from checkbox columns (e.g. Increased/Decreased/No change)
  function stackFromBools(rows, itemField, items, cats, netPos, netNeg) {
    return items.map(it => {
      const rs = rows.filter(r => r[itemField] === it && cats.some(c => r[c.key]));
      const counts = {};
      cats.forEach(c => { counts[c.key] = rs.filter(r => r[c.key]).length; });
      const net = (netPos && rs.length) ? (counts[netPos] - counts[netNeg]) / rs.length : null;
      return { label: it, counts, n: rs.length, net };
    });
  }
  // stacked item table from a single-choice column per item
  function stackFromChoice(rows, itemField, items, field, cats, netPos, netNeg) {
    return items.map(it => {
      const rs = rows.filter(r => (itemField ? r[itemField] === it : true) && cats.some(c => r[field] === c.key));
      const counts = {};
      cats.forEach(c => { counts[c.key] = rs.filter(r => r[field] === c.key).length; });
      const net = (netPos && rs.length) ? (counts[netPos] - counts[netNeg]) / rs.length : null;
      return { label: it, counts, n: rs.length, net };
    });
  }
  const cats = (keys, labels) => keys.map((k, i) => ({ key: k, label: labels ? labels[i] : k }));

  /* ---------------- context ---------------- */
  function makeCtx(rows) {
    const nonSSC = rows.filter(r => !r.isSSC);
    const cache = {};
    const sub = (key, base) => {
      const ck = key + '|' + (base || 'all');
      if (cache[ck]) return cache[ck];
      const src = base === 'nonSSC' ? nonSSC : rows;
      const out = [];
      src.forEach(r => (r[key] || []).forEach(row => { out.push(Object.assign({ _r: r }, row)); }));
      cache[ck] = out;
      return out;
    };
    return { rows, nonSSC, sub, n: rows.length, nNonSSC: nonSSC.length };
  }

  const hasText = (row, f) => !blank(row[f]);
  const INC = v => /^Increased/.test(v || '');
  const DEC = v => /^Decreased/.test(v || '');
  const AI_ATTR = v => v === 'Mostly AI' || v === 'Partly AI';

  /* ---------------- KPI registry ---------------- */
  // fmt: pct | num1 | num2 | int | index | score | inr | hrs | count
  const KPIS = [
    // ---- AI ADOPTION ----
    { id: 'AD-01', g: 'AD', label: 'AI Presence Index', desc: "Share of locus ratings marked 'Current Use' (B.1.1, 4 loci)", src: 'B.1.1', base: 'All', fmt: 'pct', hero: true,
      calc: c => share(c.sub('b11').filter(r => r.Current_Use || r.Emerging || r.Not_Present), r => r.Current_Use) },
    { id: 'AD-02', g: 'AD', label: 'Expected importance of AI', desc: 'Mean rating of expected importance over the next few years (B.1.1, scale 1–5)', src: 'B.1.1', base: 'All', fmt: 'score', max: 5, hero: true,
      calc: c => avg(c.sub('b11'), r => num(r.Expected_Importance)) },
    { id: 'AD-03', g: 'AD', label: 'Workforce exposure', desc: 'Midpoint-weighted % of workforce affected at an average locus (B.1.1)', src: 'B.1.1', base: 'All', fmt: 'pct', hero: true,
      calc: c => mapAvg(c.sub('b11'), 'Workforce_Affected', MAP.wfAffected) },
    { id: 'AD-04', g: 'AD', label: 'Adoption depth', desc: 'AI systems in routine use listed per respondent (B.1.2)', src: 'B.1.2', base: 'All', fmt: 'num1', suffix: ' systems',
      calc: c => ({ value: c.n ? c.sub('b12').filter(r => hasText(r, 'AI_System')).length / c.n : null, n: c.n }) },
    { id: 'AD-05', g: 'AD', label: 'Firm-deployed share', desc: 'Share of listed systems deployed by the firm itself rather than used through a pre-installed system (B.1.2)', src: 'B.1.2', base: 'All', fmt: 'pct',
      calc: c => share(c.sub('b12').filter(r => hasText(r, 'AI_System') && r.Deployed_by_firm_or_used_through_a_pre_installed_system), r => r.Deployed_by_firm_or_used_through_a_pre_installed_system === 'Deployed by the firm') },
    { id: 'AD-06', g: 'AD', label: 'GenAI assistant task incidence', desc: 'Share of enterprise tasks for which a general-purpose AI assistant was used in the last 2 weeks (B.2.1)', src: 'B.2.1', base: 'Non-SSC', fmt: 'pct', hero: true,
      calc: c => share(c.sub('b21', 'nonSSC').filter(r => r.Used_In_Last_2_weeks === 'Yes' || r.Used_In_Last_2_weeks === 'No'), r => r.Used_In_Last_2_weeks === 'Yes') },
    { id: 'AD-07', g: 'AD', label: 'Shadow-AI share', desc: 'Share of assistant use paid for by the individual, not the firm (B.2.1)', src: 'B.2.1', base: 'Non-SSC', fmt: 'pct',
      calc: c => share(c.sub('b21', 'nonSSC').filter(r => r.Used_In_Last_2_weeks === 'Yes' && r.Paid_for_by_firm_or_individual_or_any_other_Be_specific), r => r.Paid_for_by_firm_or_individual_or_any_other_Be_specific === 'Individual') },
    { id: 'AD-08', g: 'AD', label: 'Firms adopting AI (weighted)', desc: 'Midpoint-weighted number of adopting firms / units (B.3.1a)', src: 'B.3.1(a)', base: 'All', fmt: 'int', suffix: ' firms',
      calc: c => mapAvg(c.rows, 'b31a', MAP.firmsAdopt) },
    { id: 'AD-09', g: 'AD', label: 'Workers using AI (weighted)', desc: 'Midpoint-weighted proportion of workers using AI (B.3.1b)', src: 'B.3.1(b)', base: 'All', fmt: 'pct', hero: true,
      calc: c => mapAvg(c.rows, 'b31b', MAP.workerProp) },
    { id: 'AD-10', g: 'AD', label: 'AI investment intensity', desc: 'Midpoint-weighted AI investment as % of revenue in the last 12 months (B.3.1c)', src: 'B.3.1(c)', base: 'All', fmt: 'pct', suffixLabel: 'of revenue',
      calc: c => mapAvg(c.rows, 'b31c', MAP.invest) },
    { id: 'AD-11', g: 'AD', label: 'Existing training coverage', desc: 'Midpoint-weighted % of employees given AI training in the last 12 months (B.3.1d)', src: 'B.3.1(d)', base: 'All', fmt: 'pct',
      calc: c => mapAvg(c.rows, 'b31d', MAP.trained) },
    { id: 'AD-12', g: 'AD', label: 'Abandonment rate', desc: 'Abandoned / rolled-back deployments per non-SSC respondent (B.3.2)', src: 'B.3.2', base: 'Non-SSC', fmt: 'num2', suffix: ' per resp.',
      calc: c => ({ value: c.nNonSSC ? c.sub('b32', 'nonSSC').filter(r => hasText(r, 'Name_of_the_AI_deployment')).length / c.nNonSSC : null, n: c.nNonSSC }) },
    { id: 'AD-13', g: 'AD', label: 'Skills-caused abandonment', desc: "Share of abandonments citing 'Lack of skilled operators' (B.3.2)", src: 'B.3.2', base: 'Non-SSC', fmt: 'pct',
      calc: c => share(c.sub('b32', 'nonSSC').filter(r => hasText(r, 'Name_of_the_AI_deployment')), r => (r.Reason_select_all_that_apply || []).includes('Lack of skilled operators')) },
    { id: 'AD-14', g: 'AD', label: 'Operator-shortage barrier rank', desc: "Mean rank of 'No one to operate or maintain it' among MSME barriers (D.2.1; 1 = biggest)", src: 'D.2.1', base: 'All', fmt: 'num1', suffix: ' / 7', lowerBetter: true,
      calc: c => avg(c.sub('d21').filter(r => r.Principal_barrier_for_MSMEs === 'No one to operate or maintain it'), r => num(r.Rank)) },
    { id: 'AD-15', g: 'AD', label: 'SSC-attributed barriers', desc: 'Share of respondents assigning at least one barrier to the SSC to act on (D.2.1)', src: 'D.2.1', base: 'All', fmt: 'pct',
      calc: c => { const ans = c.rows.filter(r => (r.d21 || []).some(x => num(x.Rank) != null || (x.Who_Should_act || []).length)); return share(ans, r => r.d21.some(x => (x.Who_Should_act || []).includes('SSC'))); } },

    // ---- WORKFORCE IMPACT ----
    { id: 'WF-01', g: 'WF', label: 'Net headcount change index', desc: 'Midpoint-weighted % headcount change in AI-exposed occupations, last 12 months (C.1.1)', src: 'C.1.1', base: 'Non-SSC', fmt: 'signedPct', hero: true,
      calc: c => mapAvg(c.sub('c11', 'nonSSC'), 'Headcount_change_last_12_months', MAP.headChange) },
    { id: 'WF-02', g: 'WF', label: 'AI-attributed displacement', desc: 'Share of systems with a headcount decrease attributed mostly / partly to AI (C.1.1)', src: 'C.1.1', base: 'Non-SSC', fmt: 'pct', hero: true,
      calc: c => share(c.sub('c11', 'nonSSC').filter(r => r.Headcount_change_last_12_months), r => DEC(r.Headcount_change_last_12_months) && AI_ATTR(r.Is_this_change_attributable_to_AI)) },
    { id: 'WF-03', g: 'WF', label: 'AI-attributed job creation', desc: 'Share of systems with a headcount increase attributed mostly / partly to AI (C.1.1)', src: 'C.1.1', base: 'Non-SSC', fmt: 'pct', hero: true,
      calc: c => share(c.sub('c11', 'nonSSC').filter(r => r.Headcount_change_last_12_months), r => INC(r.Headcount_change_last_12_months) && AI_ATTR(r.Is_this_change_attributable_to_AI)) },
    { id: 'WF-04', g: 'WF', label: 'Hiring-freeze incidence', desc: 'Share of non-SSC respondents naming occupations where recruiting stopped after AI (C.1.2)', src: 'C.1.2', base: 'Non-SSC', fmt: 'pct',
      calc: c => share(c.nonSSC, r => !isNAText(r.c12)) },
    { id: 'WF-05', g: 'WF', label: 'Productivity net index', desc: '(% Increased − % Decreased) for occupations with increased AI use (C.2.1), −1 to +1', src: 'C.2.1', base: 'Non-SSC', fmt: 'index', hero: true,
      calc: c => netIndex(c.sub('c21', 'nonSSC'), 'Productivity_change', 'Increased', 'Decreased') },
    { id: 'WF-06', g: 'WF', label: 'Work-quality net index', desc: '(% Increased − % Decreased) for work quality (C.2.1)', src: 'C.2.1', base: 'Non-SSC', fmt: 'index',
      calc: c => netIndex(c.sub('c21', 'nonSSC'), 'Work_quality_change', 'Increased', 'Decreased') },
    { id: 'WF-07', g: 'WF', label: 'Human-intervention net index', desc: 'Positive = more human oversight needed (C.2.1)', src: 'C.2.1', base: 'Non-SSC', fmt: 'index',
      calc: c => netIndex(c.sub('c21', 'nonSSC'), 'Increased_Decreased_No_change', 'Increased', 'Decreased') },
    { id: 'WF-08', g: 'WF', label: 'New AI-created roles', desc: 'New roles reported per non-SSC respondent (C.3.1)', src: 'C.3.1', base: 'Non-SSC', fmt: 'num1', suffix: ' per resp.',
      calc: c => ({ value: c.nNonSSC ? c.sub('c31', 'nonSSC').filter(r => hasText(r, 'New_occupation_role')).length / c.nNonSSC : null, n: c.nNonSSC }) },
    { id: 'WF-09', g: 'WF', label: 'New roles filled by new hires', desc: 'Share of new roles filled by new hires rather than internally (C.3.1)', src: 'C.3.1', base: 'Non-SSC', fmt: 'pct',
      calc: c => share(c.sub('c31', 'nonSSC').filter(r => r.Filled_internally_or_new_hire), r => r.Filled_internally_or_new_hire === 'New hire') },
    { id: 'WF-10', g: 'WF', label: 'New roles with wage increase', desc: 'Share of new roles with a wage increase (C.3.1)', src: 'C.3.1', base: 'Non-SSC', fmt: 'pct',
      calc: c => share(c.sub('c31', 'nonSSC').filter(r => r.Wage_impact), r => r.Wage_impact === 'Increased') },
    { id: 'WF-11', g: 'WF', label: 'Upskilling share', desc: 'Share of changed roles needing upskilling / reskilling of incumbents rather than new hires (C.4.1)', src: 'C.4.1', base: 'All', fmt: 'pct', hero: true,
      calc: c => share(c.sub('c41').filter(r => r.Existing_workers_requiring_training), r => r.Existing_workers_requiring_training === 'Upskilling/reskilling') },
    { id: 'WF-12', g: 'WF', label: 'Occupations at risk', desc: 'At-risk occupations reported per respondent (C.4.2)', src: 'C.4.2', base: 'All', fmt: 'num1', suffix: ' per resp.',
      calc: c => ({ value: c.n ? c.sub('c42').filter(r => hasText(r, 'Occupation_at_risk')).length / c.n : null, n: c.n }) },
    { id: 'WF-13', g: 'WF', label: 'Obsolescence exposure', desc: "Share of at-risk occupations where 'Many' or 'Most' workers are affected (C.4.2)", src: 'C.4.2', base: 'All', fmt: 'pct', hero: true,
      calc: c => share(c.sub('c42').filter(r => r.Workers_affected), r => r.Workers_affected === 'Many' || r.Workers_affected === 'Most') },
    { id: 'WF-14', g: 'WF', label: '2-year headcount outlook', desc: 'Expected headcount net index (C.4.5): (% Increase − % Decrease)', src: 'C.4.5', base: 'Non-SSC', fmt: 'index',
      calc: c => netIndex(c.sub('c45', 'nonSSC'), 'Expected_headcount_in_two_years', 'Increase', 'Decrease') },
    { id: 'WF-15', g: 'WF', label: 'Incumbents needing training', desc: "Share of systems where 'Many / Most' incumbents need training to stay in role (C.4.5)", src: 'C.4.5', base: 'Non-SSC', fmt: 'pct',
      calc: c => share(c.sub('c45', 'nonSSC').filter(r => r.Incumbents_needing_training_to_stay_in_the_role), r => /^(Many|Most)$/.test(r.Incumbents_needing_training_to_stay_in_the_role)) },
    { id: 'WF-16', g: 'WF', label: 'Work-intensification index', desc: 'Share reporting pace / intensity of work increased (C.4.6)', src: 'C.4.6', base: 'All', fmt: 'pct',
      calc: c => share(c.sub('c46').filter(r => r.Dimension === 'Pace or intensity of work' && (r.Increased || r.Decreased || r.No_change)), r => r.Increased) },
    { id: 'WF-17', g: 'WF', label: 'Algorithmic-management index', desc: 'Share reporting monitoring of individual performance increased (C.4.6)', src: 'C.4.6', base: 'All', fmt: 'pct',
      calc: c => share(c.sub('c46').filter(r => r.Dimension === 'Monitoring of individual performance' && (r.Increased || r.Decreased || r.No_change)), r => r.Increased) },

    // ---- TRAINING NEEDS : demand tests ----
    { id: 'TN-01', g: 'TN', test: 1, label: 'Test 1 — Human dependency', desc: 'Mean human-dependency score of AI systems (E.1.1): fails without human input Yes = 1, Partially = 0.5, No = 0', src: 'E.1.1', base: 'Non-SSC', fmt: 'score2', max: 1,
      calc: c => avg(c.sub('e11', 'nonSSC').filter(r => r.Yes_fails_without_it || r.Partially || r.No_works_regardless), r => r.Yes_fails_without_it ? 1 : (r.Partially ? 0.5 : 0)) },
    { id: 'TN-02', g: 'TN', test: 2, label: 'Test 2 — Portability', desc: 'Share of new skills portable across the sector (E.2.1, answered Yes)', src: 'E.2.1', base: 'All', fmt: 'pct',
      calc: c => share(c.sub('e21').filter(r => r.Portable_across_the_sector), r => r.Portable_across_the_sector === 'Yes') },
    { id: 'TN-03', g: 'TN', test: 3, label: 'Test 3 — Durability', desc: "Share of skills with useful life ≥ 3 years or 'as long as AI is in use' (E.3.1; 'Can't say' excluded)", src: 'E.3.1', base: 'All', fmt: 'pct',
      calc: c => share(c.sub('e31').filter(r => r.Expected_useful_life && !/Can.t say/i.test(r.Expected_useful_life)), r => /^(3 to 5 years|Over 5 years|As long as AI is in use)$/.test(r.Expected_useful_life)) },
    { id: 'TN-04', g: 'TN', test: 4, label: 'Test 4 — Sponsor', desc: 'Share of employers willing to co-pay (Yes or Possibly) (E.4.1a)', src: 'E.4.1(a)', base: 'Non-SSC', fmt: 'pct',
      calc: c => share(c.nonSSC.filter(r => r.e41a), r => r.e41a === 'Yes' || r.e41a === 'Possibly') },
    { id: 'TN-05', g: 'TN', test: 5, label: 'Training-demand gate', desc: 'Share of systems where a current worker cannot operate after a vendor demo OR training is not in the AMC (D.3.1)', src: 'D.3.1', base: 'Non-SSC', fmt: 'pct',
      calc: c => share(c.sub('d31', 'nonSSC').filter(r => r.Can_a_current_worker_operate_it_after_a_vendor_demo || r.Training_included_in_the_supply_AMC_contract), r => r.Can_a_current_worker_operate_it_after_a_vendor_demo === 'No, requires additional training' || r.Training_included_in_the_supply_AMC_contract === 'No') },
    // ---- TRAINING NEEDS : headline ----
    { id: 'TN-07', g: 'TN', label: 'Strong qualification candidates', desc: 'Share of skills that are portable + certifiable + durable + not obsolete on tool change (E.2.1, E.3.1)', src: 'E.2.1, E.3.1', base: 'All', fmt: 'pct', hero: true,
      calc: c => { const s = skillClasses(c); return { value: pct(s.strong, s.n), n: s.n, worked: s.n ? `${wn(s.strong)} ÷ ${wn(s.n)} × 100` : null }; } },
    { id: 'TN-08', g: 'TN', label: 'Certifiable skills', desc: 'Share of skills with scope for certification (Yes or Maybe) (E.2.1)', src: 'E.2.1', base: 'All', fmt: 'pct',
      calc: c => share(c.sub('e21').filter(r => r.Scope_for_certification), r => r.Scope_for_certification === 'Yes' || r.Scope_for_certification === 'Maybe' || r.Scope_for_certification === 'Partially') },
    { id: 'TN-09', g: 'TN', label: 'Obsolete on tool change', desc: 'Share of skills that become obsolete when the tool changes (E.3.1)', src: 'E.3.1', base: 'All', fmt: 'pct', lowerBetter: true,
      calc: c => share(c.sub('e31').filter(r => r.what_happens_to_it_after_the_related_tool_changes), r => r.what_happens_to_it_after_the_related_tool_changes === 'Becomes obsolete') },
    { id: 'TN-10', g: 'TN', label: 'Training-system readiness', desc: 'Mean status score (F.2.1): Fully in place = 1, Partially = 0.5, Not in place = 0', src: 'F.2.1', base: 'All', fmt: 'score2', max: 1, hero: true,
      calc: c => mapAvg(c.sub('f21'), 'Available_today', MAP.inPlace) },
    { id: 'TN-11', g: 'TN', label: 'Critical-gap share', desc: "Share of element ratings marked 'Critical Gap' (F.2.1)", src: 'F.2.1', base: 'All', fmt: 'pct', lowerBetter: true, hero: true,
      calc: c => share(c.sub('f21').filter(r => r.Severity_of_Gap), r => r.Severity_of_Gap === 'Critical Gap') },
    { id: 'TN-12', g: 'TN', label: 'Qualifications flagged out of date', desc: 'Count of QP / NOS rows flagged (F.3.1)', src: 'F.3.1', base: 'All', fmt: 'count',
      calc: c => { const rs = c.sub('f31').filter(r => hasText(r, 'QP_or_NOS_code_and_title')); return { value: rs.length, n: rs.length }; } },
    { id: 'TN-13', g: 'TN', label: 'High-priority revisions', desc: 'Share of flagged qualifications with HIGH priority (F.3.1)', src: 'F.3.1', base: 'All', fmt: 'pct',
      calc: c => share(c.sub('f31').filter(r => r.Priority), r => r.Priority === 'High') },
    { id: 'TN-14', g: 'TN', label: 'Workers needing training', desc: 'Total workers reported across training rows (H.3.1)', src: 'H.3.1', base: 'All', fmt: 'count', hero: true,
      calc: c => { const rs = c.sub('h31').filter(r => r.Number_of_workers != null); return { value: sum(rs.map(r => r.Number_of_workers)), n: rs.length }; } },
    { id: 'TN-15', g: 'TN', label: 'Training volume', desc: 'Total person-hours (H.3.1: workers × hours)', src: 'H.3.1', base: 'All', fmt: 'hrs',
      calc: c => { const rs = c.sub('h31').filter(r => r.Number_of_workers != null && r.Indicative_duration_hours != null); return { value: sum(rs.map(r => r.Number_of_workers * r.Indicative_duration_hours)), n: rs.length }; } },
    { id: 'TN-16', g: 'TN', label: 'Urgency', desc: "Share of workers needed 'Now' or 'Within 6 months' (H.3.1, weighted by workers)", src: 'H.3.1', base: 'All', fmt: 'pct', hero: true,
      calc: c => { const rs = c.sub('h31').filter(r => r.Number_of_workers != null && r.When_needed); const tot = sum(rs.map(r => r.Number_of_workers)); const soon = sum(rs.filter(r => /^(Now|Within 6 months)$/.test(r.When_needed)).map(r => r.Number_of_workers)); return { value: pct(soon, tot), n: rs.length, worked: tot ? `${wn(soon)} ÷ ${wn(tot)} workers × 100` : null }; } },
    { id: 'TN-17', g: 'TN', label: 'Mean indicative duration', desc: 'Mean indicative hours per training row (H.3.1)', src: 'H.3.1', base: 'All', fmt: 'num1', suffix: ' hrs',
      calc: c => avg(c.sub('h31'), r => r.Indicative_duration_hours) },
    { id: 'TN-18', g: 'TN', label: 'Mean workable batch size', desc: 'Mean workable batch size (H.4.1)', src: 'H.4.1', base: 'All', fmt: 'num1', suffix: ' persons',
      calc: c => avg(c.sub('h41'), r => r.Workable_batch_size) },
    { id: 'TN-19', g: 'TN', label: 'Candidate-pool readiness', desc: 'Share of new occupations where the candidate pool holds the entry qualification (H.2.1, Yes)', src: 'H.2.1', base: 'All', fmt: 'pct',
      calc: c => share(c.sub('h21').filter(r => r.Does_the_current_candidate_pool_hold_it), r => r.Does_the_current_candidate_pool_hold_it === 'Yes') },
    { id: 'TN-20', g: 'TN', label: 'Third-party assessment accepted', desc: '% Yes — would third-party assessment be accepted by employers (H.5.2)', src: 'H.5.2', base: 'All', fmt: 'pct',
      calc: c => share(c.rows.filter(r => r.h52), r => r.h52 === 'Yes') },
    { id: 'TN-21', g: 'TN', label: 'RPL for experienced workers', desc: '% Yes — recognition of prior learning should be offered (H.5.3)', src: 'H.5.3', base: 'All', fmt: 'pct',
      calc: c => share(c.rows.filter(r => r.h53), r => r.h53 === 'Yes') },
    { id: 'TN-22', g: 'TN', label: 'Stackable credential preferred', desc: '% Yes — short stackable credential preferred over a full qualification (H.5.4)', src: 'H.5.4', base: 'All', fmt: 'pct',
      calc: c => share(c.rows.filter(r => r.h54), r => r.h54 === 'Yes') },
    { id: 'TN-23', g: 'TN', label: 'Vendor certificate accepted', desc: '% Yes — vendor certificate accepted in place of a national one (H.5.6)', src: 'H.5.6', base: 'All', fmt: 'pct',
      calc: c => share(c.rows.filter(r => r.h56), r => r.h56 === 'Yes') },
    { id: 'TN-24', g: 'TN', label: 'Content commonality', desc: "Share of content-area ratings marked 'Common' (H.7.1)", src: 'H.7.1', base: 'All', fmt: 'pct', hero: true,
      calc: c => share(c.sub('h71').filter(r => r.Common || r.Sector_specific), r => r.Common) },
    { id: 'TN-25', g: 'TN', label: 'Skill-importance shift', desc: 'Mean net importance index across all H.1.1 skills (Increasing = +1, Stable = 0, Declining = −1)', src: 'H.1.1(a–d)', base: 'All', fmt: 'index',
      calc: c => mapAvg([].concat(c.sub('h11a'), c.sub('h11b'), c.sub('h11c'), c.sub('h11d')), 'Importance', MAP.importance) },

    // ---- FINANCING ----
    { id: 'FN-01', g: 'FN', label: 'Employer co-pay willingness', desc: '% of employers saying Yes to co-paying for training (E.4.1a)', src: 'E.4.1(a)', base: 'Non-SSC', fmt: 'pct', hero: true,
      calc: c => share(c.nonSSC.filter(r => r.e41a), r => r.e41a === 'Yes') },
    { id: 'FN-02', g: 'FN', label: 'Employer cost share', desc: 'Midpoint-weighted % of cost employers would realistically bear (E.4.1b)', src: 'E.4.1(b)', base: 'Non-SSC', fmt: 'pct', hero: true,
      calc: c => mapAvg(c.nonSSC, 'e41b', MAP.bear) },
    { id: 'FN-03', g: 'FN', label: 'Wage premium observed', desc: "% reporting any wage premium for AI skills (E.4.2; 'Don't know' excluded)", src: 'E.4.2', base: 'All', fmt: 'pct', hero: true,
      calc: c => share(c.rows.filter(r => r.e42 && r.e42 !== "Don't know"), r => /^Yes/.test(r.e42)) },
    { id: 'FN-04', g: 'FN', label: 'Wage premium size', desc: 'Midpoint-weighted premium % (E.4.2)', src: 'E.4.2', base: 'All', fmt: 'pct',
      calc: c => mapAvg(c.rows, 'e42', MAP.premium) },
    { id: 'FN-05', g: 'FN', label: 'Financing-model viability', desc: "Mean % of respondents saying a model 'could work' across the 8 named models (G.1.1a)", src: 'G.1.1(a)', base: 'All', fmt: 'pct', hero: true,
      calc: c => { const ans = c.rows.filter(r => (r.g11a || []).some(x => x.Model)); if (!ans.length) return { value: null, n: 0 }; const models = OPT.models.slice(0, 8); const shares = models.map(m => pct(ans.filter(r => r.g11a.some(x => x.Model === m && x.Could_work)).length, ans.length)); return { value: mean(shares), n: ans.length, worked: `(${shares.map(s => wn(Math.round(s * 10) / 10)).join(' + ')}) ÷ 8` }; } },
    { id: 'FN-06', g: 'FN', label: 'Mean infrastructure cost', desc: 'Mean infrastructure cost estimate — labs, venue, software (G.2.1)', src: 'G.2.1', base: 'All', fmt: 'inr',
      calc: c => avg(c.sub('g21').filter(r => /^Infrastructure/i.test(r.Item)), r => parseINR(r.Response)) },
    { id: 'FN-07', g: 'FN', label: 'Mean trainer & assessor cost', desc: 'Mean trainer and assessor cost estimate (G.2.1)', src: 'G.2.1', base: 'All', fmt: 'inr',
      calc: c => avg(c.sub('g21').filter(r => /^Trainer/i.test(r.Item)), r => parseINR(r.Response)) },
    { id: 'FN-08', g: 'FN', label: 'Outcome-indicator acceptability', desc: "% of indicator ratings 'Yes' acceptable to the payer (G.3.1)", src: 'G.3.1', base: 'All', fmt: 'pct', hero: true,
      calc: c => share(c.sub('g31').filter(r => !/^If Other/.test(r.Indicator) && (r.Acceptable_to_the_payer === 'Yes' || r.Acceptable_to_the_payer === 'No')), r => r.Acceptable_to_the_payer === 'Yes') },
    { id: 'FN-09', g: 'FN', label: 'Government as best-suited payer', desc: 'Share of respondents naming Government as best suited to pay (E.4.3)', src: 'E.4.3', base: 'All', fmt: 'pct',
      calc: c => share(c.rows.filter(r => r.e43.length), r => r.e43.includes('Government')) },
    { id: 'FN-10', g: 'FN', label: 'Employer as best-suited payer', desc: 'Share of respondents naming Employer as best suited to pay (E.4.3)', src: 'E.4.3', base: 'All', fmt: 'pct',
      calc: c => share(c.rows.filter(r => r.e43.length), r => r.e43.includes('Employer')) }
  ];

  /* Written formula for each KPI (shown on the tile's ƒx panel and in the CSV). */
  const FORMULAS = {
    'AD-01': "Locus ratings marked 'Current Use' ÷ locus ratings with any status ticked × 100",
    'AD-02': 'Σ Expected Importance (1–5) ÷ number of locus ratings',
    'AD-03': 'Σ workforce-affected midpoints (<10 = 5, 10–25 = 17.5, 26–50 = 38, >50 = 65) ÷ ratings',
    'AD-04': 'AI systems listed in B.1.2 ÷ respondents',
    'AD-05': "Systems 'Deployed by the firm' ÷ systems with a deployment answer × 100",
    'AD-06': "Tasks answered 'Yes' ÷ tasks answered Yes or No × 100 (non-SSC)",
    'AD-07': "Tasks used and paid by 'Individual' ÷ tasks used with a payer × 100",
    'AD-08': 'Σ firm-count midpoints (<10 = 5, 10–50 = 30, 50–200 = 125, 200–1,000 = 600, >1,000 = 1,500) ÷ respondents',
    'AD-09': 'Σ worker-share midpoints (0–5 = 2.5, 6–20 = 13, 21–40 = 30.5, 41–60 = 50.5, >60 = 70) ÷ respondents',
    'AD-10': 'Σ investment midpoints (<1 = 0.5, 1–3 = 2, 3–5 = 4, 5–10 = 7.5, >10 = 12) ÷ respondents',
    'AD-11': 'Σ trained-share midpoints (None = 0, <10 = 5, 10–25 = 17.5, 26–50 = 38, >50 = 60) ÷ respondents',
    'AD-12': 'Abandoned deployments named in B.3.2 ÷ non-SSC respondents',
    'AD-13': "Abandonments citing 'Lack of skilled operators' ÷ abandonments × 100",
    'AD-14': "Σ rank given to 'No one to operate or maintain it' ÷ times it was ranked",
    'AD-15': 'Respondents assigning ≥1 barrier to SSC ÷ respondents who answered D.2.1 × 100',
    'WF-01': 'Σ headcount-change midpoints (+25, +12.5, 0, −12.5, −25) ÷ systems rated',
    'WF-02': "Systems with a decrease AND 'Mostly/Partly AI' ÷ systems rated × 100",
    'WF-03': "Systems with an increase AND 'Mostly/Partly AI' ÷ systems rated × 100",
    'WF-04': 'Non-SSC respondents naming an occupation in C.1.2 (not NA) ÷ non-SSC respondents × 100',
    'WF-05': '(Occupations with productivity Increased − Decreased) ÷ occupations rated',
    'WF-06': '(Occupations with work quality Increased − Decreased) ÷ occupations rated',
    'WF-07': '(Occupations with human intervention Increased − Decreased) ÷ occupations rated',
    'WF-08': 'New roles listed in C.3.1 ÷ non-SSC respondents',
    'WF-09': "Roles 'New hire' ÷ roles with a sourcing answer × 100",
    'WF-10': "Roles with wage 'Increased' ÷ roles with a wage answer × 100",
    'WF-11': "Roles 'Upskilling/reskilling' ÷ roles with an answer × 100",
    'WF-12': 'At-risk occupations listed in C.4.2 ÷ respondents',
    'WF-13': "At-risk occupations with 'Many' or 'Most' affected ÷ occupations rated × 100",
    'WF-14': '(Occupations expected to Increase − Decrease) ÷ occupations rated',
    'WF-15': "Occupations where 'Many/Most' need training ÷ occupations rated × 100",
    'WF-16': "Respondents marking pace/intensity 'Increased' ÷ respondents rating it × 100",
    'WF-17': "Respondents marking monitoring 'Increased' ÷ respondents rating it × 100",
    'TN-01': 'Σ dependency score (Yes = 1, Partially = 0.5, No = 0) ÷ system-function ratings',
    'TN-02': "Skills 'Portable: Yes' ÷ skills rated × 100",
    'TN-03': "Skills with life ≥3 years or 'as long as AI is in use' ÷ skills rated (excl. Can't say) × 100",
    'TN-04': "Non-SSC respondents answering 'Yes' or 'Possibly' ÷ non-SSC respondents answering × 100",
    'TN-05': "Systems where worker can't operate after demo OR training not in AMC ÷ systems rated × 100",
    'TN-07': 'Skills that are portable + certifiable + durable + not obsolete ÷ skills listed × 100',
    'TN-08': "Skills with certification scope 'Yes' or 'Maybe' ÷ skills rated × 100",
    'TN-09': "Skills that 'Become obsolete' on tool change ÷ skills rated × 100",
    'TN-10': 'Σ status score (Fully = 1, Partially = 0.5, Not = 0) ÷ element ratings',
    'TN-11': "Element ratings 'Critical Gap' ÷ element ratings × 100",
    'TN-12': 'Count of QP / NOS rows entered in F.3.1',
    'TN-13': "Flagged qualifications with 'High' priority ÷ flagged qualifications × 100",
    'TN-14': 'Σ Number of workers across H.3.1 rows',
    'TN-15': 'Σ (Number of workers × Indicative hours) across H.3.1 rows',
    'TN-16': "Workers needed 'Now' or 'Within 6 months' ÷ all workers × 100",
    'TN-17': 'Σ indicative hours ÷ training rows',
    'TN-18': 'Σ workable batch size ÷ delivery rows',
    'TN-19': "New occupations where pool holds the qualification ('Yes') ÷ occupations rated × 100",
    'TN-20': "Respondents answering 'Yes' to H.5.2 ÷ respondents answering × 100",
    'TN-21': "Respondents answering 'Yes' to H.5.3 ÷ respondents answering × 100",
    'TN-22': "Respondents answering 'Yes' to H.5.4 ÷ respondents answering × 100",
    'TN-23': "Respondents answering 'Yes' to H.5.6 ÷ respondents answering × 100",
    'TN-24': "Content areas marked 'Common' ÷ content areas marked Common or Sector-specific × 100",
    'TN-25': 'Σ importance score (Increasing = +1, Stable = 0, Declining = −1) ÷ skill ratings',
    'FN-01': "Non-SSC respondents answering 'Yes' ÷ non-SSC respondents answering × 100",
    'FN-02': 'Σ cost-share midpoints (<25 = 12.5, 25–50 = 37.5, 51–75 = 63, >75 = 85) ÷ respondents',
    'FN-03': "Respondents reporting any premium ÷ respondents answering (excl. Don't know) × 100",
    'FN-04': 'Σ premium midpoints (significant = 25, moderate = 15, small = 5, none = 0) ÷ respondents',
    'FN-05': "Σ (% of respondents saying each model 'could work') ÷ 8 models",
    'FN-06': 'Σ infrastructure cost (₹, parsed from text) ÷ responses with a number',
    'FN-07': 'Σ trainer & assessor cost (₹, parsed from text) ÷ responses with a number',
    'FN-08': "Indicator ratings 'Yes' ÷ indicator ratings Yes or No × 100",
    'FN-09': 'Respondents ticking Government in E.4.3 ÷ respondents answering × 100',
    'FN-10': 'Respondents ticking Employer in E.4.3 ÷ respondents answering × 100'
  };

  // Qualification candidate strength per skill (E.2.1 row i matched with E.3.1 row i within a respondent)
  function skillClasses(c) {
    let strong = 0, moderate = 0, weak = 0, n = 0;
    c.rows.forEach(r => {
      (r.e21 || []).forEach((s, i) => {
        if (!hasText(s, 'New_skill_required')) return;
        const life = (r.e31 || [])[i] || {};
        const portable = s.Portable_across_the_sector === 'Yes';
        const certifiable = /^(Yes|Maybe|Partially)$/.test(s.Scope_for_certification || '');
        const durable = /^(3 to 5 years|Over 5 years|As long as AI is in use)$/.test(life.Expected_useful_life || '');
        const obsolete = life.what_happens_to_it_after_the_related_tool_changes === 'Becomes obsolete';
        n++;
        if (portable && certifiable && durable && !obsolete) strong++;
        else if (s.Portable_across_the_sector === 'No' || obsolete) weak++;
        else moderate++;
      });
    });
    return { strong, moderate, weak, n };
  }

  function computeKPIs(rows, thresholds) {
    const c = makeCtx(rows);
    const out = {};
    KPIS.forEach(k => {
      let res;
      try { res = k.calc(c); } catch (e) { res = { value: null, n: 0, error: e.message }; }
      const value = res.value == null || isNaN(res.value) ? null : res.value;
      let worked = res.worked || null;
      // per-respondent ratios and plain counts/sums: build the arithmetic from value and n
      if (!worked && value != null && res.n) {
        if (/per resp|systems/.test(k.suffix || '')) worked = `${wn(Math.round(value * res.n))} ÷ ${wn(res.n)}`;
        else if (k.fmt === 'count' || k.fmt === 'hrs') worked = `sum over ${wn(res.n)} rows`;
      }
      out[k.id] = Object.assign({}, k, { value, n: res.n || 0, worked: value == null ? null : worked, formula: FORMULAS[k.id] || k.desc });
      delete out[k.id].calc;
    });
    // five-test scorecard
    const th = Object.assign({}, AIKPI.CONFIG.thresholds, thresholds || {});
    const tests = ['TN-01', 'TN-02', 'TN-03', 'TN-04', 'TN-05'].map(id => {
      const k = out[id];
      const key = id.replace('-', '');
      const threshold = th[key];
      const pass = k.value == null ? null : k.value >= threshold;
      return Object.assign({ threshold, pass }, k);
    });
    const passed = tests.filter(t => t.pass === true).length;
    const evaluated = tests.filter(t => t.pass !== null).length;
    out['TN-06'] = { id: 'TN-06', g: 'TN', label: 'Demand tests passed', desc: 'Number of the 5 tests passing their thresholds — the composite case for a national AI skilling intervention in this slice', src: 'E, D.3', base: '—', fmt: 'count', value: passed, n: evaluated, max: 5 };
    return { kpis: out, list: KPIS.map(k => out[k.id]), tests, passed, evaluated, skills: skillClasses(c),
      n: c.n, nSSC: rows.filter(r => r.stake === 'SSC').length, nIndustry: rows.filter(r => r.stake === 'Industry').length,
      nFinancier: rows.filter(r => r.stake === 'Financier').length, nOther: rows.filter(r => r.stake === 'Other').length };
  }

  /* ---------------- chart datasets ---------------- */
  const DIV3 = cats(['Increased', 'Decreased', 'No change']);
  const DIV3b = cats(['Increase', 'Decrease', 'No change']);

  const CHARTS = {
    AD: [
      { id: 'b11status', title: 'B.1.1 — AI status by locus', sub: 'Current use, emerging or not present, per locus', type: 'stack', mode: 'ordinal',
        build: c => ({ cats: cats(['Current_Use', 'Emerging', 'Not_Present'], ['Current use', 'Emerging', 'Not present']), items: stackFromBools(c.sub('b11'), 'Locus', OPT.locus, cats(['Current_Use', 'Emerging', 'Not_Present'])).map((it, i) => Object.assign(it, { label: OPT.locusShort[i] })) }) },
      { id: 'b11imp', title: 'B.1.1 — Expected importance and exposure by locus', sub: 'Mean importance (1–5) and midpoint-weighted workforce affected', type: 'table',
        build: c => ({ columns: [{ key: 'label', label: 'Locus' }, { key: 'imp', label: 'Mean importance (1–5)', fmt: 'score' }, { key: 'n1', label: 'n', fmt: 'int' }, { key: 'exp', label: 'Exposure midpoint %', fmt: 'pct' }, { key: 'n2', label: 'n', fmt: 'int' }],
          rows: OPT.locus.map((l, i) => { const rs = c.sub('b11').filter(r => r.Locus === l); const a = avg(rs, r => num(r.Expected_Importance)); const b = mapAvg(rs, 'Workforce_Affected', MAP.wfAffected); return { label: OPT.locusShort[i], imp: a.value, n1: a.n, exp: b.value, n2: b.n, bar: a.value != null ? a.value / 5 * 100 : null }; }) }) },
      { id: 'b13', title: 'B.1.3 — Technology categories in use', sub: 'Rank 1 = most used; NA excluded', type: 'rank', maxRank: 10,
        build: c => rankTable(c.sub('b13'), 'Technology_Category', 'Rank_by_Usage_Top_10', OPT.tech) },
      { id: 'a2', title: 'A.2 — Single most important change AI brings', sub: '% of respondents who answered', type: 'bars',
        build: c => multi(c.rows.map(r => r.a2), OPT.a2) },
      { id: 'b21', title: 'B.2.1 — General-purpose AI assistant use by task', sub: 'Non-SSC respondents · % of tasks used in the last 2 weeks, and who paid', type: 'bars', extraCols: [{ key: 'firm', label: 'Paid: firm' }, { key: 'indiv', label: 'Paid: individual' }, { key: 'both', label: 'Paid: both' }],
        build: c => { const rs = c.sub('b21', 'nonSSC'); return { n: rs.filter(r => r.Used_In_Last_2_weeks).length, items: OPT.tasks.map(t => { const tr = rs.filter(r => r.Task === t && (r.Used_In_Last_2_weeks === 'Yes' || r.Used_In_Last_2_weeks === 'No')); const yes = tr.filter(r => r.Used_In_Last_2_weeks === 'Yes'); const paid = k => yes.filter(r => r.Paid_for_by_firm_or_individual_or_any_other_Be_specific === k).length; return { label: t.replace(' (please specify):', ''), count: yes.length, n: tr.length, value: pct(yes.length, tr.length), firm: paid('Firm'), indiv: paid('Individual'), both: paid('Both (Firm and Individual)') }; }) }; } },
      { id: 'b31a', title: 'B.3.1(a) — Firms / units adopting AI', sub: 'Distribution of responses', type: 'bars', footerMap: ['firmsAdopt', 'Weighted midpoint (firms)', 'int'],
        build: c => Object.assign(dist(c.rows.map(r => r.b31a), OPT.firmsAdopt), { footer: footerFor(c.rows, 'b31a', MAP.firmsAdopt, 'Weighted midpoint', 'int') }) },
      { id: 'b31b', title: 'B.3.1(b) — Proportion of workers using AI', type: 'bars',
        build: c => Object.assign(dist(c.rows.map(r => r.b31b), OPT.workerProp), { footer: footerFor(c.rows, 'b31b', MAP.workerProp, 'Weighted % of workers', 'pct') }) },
      { id: 'b31c', title: 'B.3.1(c) — AI investment as % of revenue', type: 'bars',
        build: c => Object.assign(dist(c.rows.map(r => r.b31c), OPT.invest), { footer: footerFor(c.rows, 'b31c', MAP.invest, 'Weighted % of revenue', 'pct') }) },
      { id: 'b31d', title: 'B.3.1(d) — Employees AI-trained in last 12 months', type: 'bars',
        build: c => Object.assign(dist(c.rows.map(r => r.b31d), OPT.trained), { footer: footerFor(c.rows, 'b31d', MAP.trained, 'Weighted % trained', 'pct') }) },
      { id: 'b32', title: 'B.3.2 — Reasons for abandonment', sub: 'Share of abandoned deployments citing each reason', type: 'bars',
        build: c => multi(c.sub('b32', 'nonSSC').filter(r => hasText(r, 'Name_of_the_AI_deployment')).map(r => r.Reason_select_all_that_apply), OPT.abandonReason) },
      { id: 'd11', title: 'D.1.1 — Major advantage of AI embedment', sub: '% of respondents who answered', type: 'bars',
        build: c => multi(c.rows.map(r => r.d11), OPT.d11) },
      { id: 'd21', title: 'D.2.1 — Principal barriers to adoption for MSMEs', sub: 'Rank 1 = biggest barrier', type: 'rank', maxRank: 7,
        build: c => rankTable(c.sub('d21'), 'Principal_barrier_for_MSMEs', 'Rank', OPT.barriers.slice(0, 7)) },
      { id: 'd21actor', title: 'D.2.1 — Who should act on each barrier', sub: 'Count of respondents ticking each actor', type: 'stack', mode: 'categorical', absolute: true,
        build: c => ({ cats: cats(OPT.actors), items: OPT.barriers.slice(0, 7).map(b => { const rs = c.sub('d21').filter(r => r.Principal_barrier_for_MSMEs === b && (r.Who_Should_act || []).length); const counts = {}; OPT.actors.forEach(a => { counts[a] = rs.filter(r => r.Who_Should_act.includes(a)).length; }); const top = OPT.actors.slice().sort((x, y) => counts[y] - counts[x])[0]; return { label: b, counts, n: rs.length, note: rs.length ? top : '' }; }) }) }
    ],
    WF: [
      { id: 'c11', title: 'C.1.1 — Headcount change by AI system (last 12 months)', sub: 'Non-SSC · all listed systems', type: 'bars',
        build: c => dist(c.sub('c11', 'nonSSC').map(r => r.Headcount_change_last_12_months), OPT.headChange, { otherLabel: false }) },
      { id: 'c11attr', title: 'C.1.1 — Attribution of headcount change to AI', type: 'bars',
        build: c => dist(c.sub('c11', 'nonSSC').map(r => r.Is_this_change_attributable_to_AI), OPT.attrib, { otherLabel: false }) },
      { id: 'c21', title: 'C.2.1 — Changes alongside increased AI use', sub: 'Occupation rows · net index = (% increased − % decreased)', type: 'stack', mode: 'diverging', showNet: true,
        build: c => { const rs = c.sub('c21', 'nonSSC'); return { cats: DIV3, items: [['Productivity', 'Productivity_change'], ['Work quality', 'Work_quality_change'], ['Need for human intervention', 'Increased_Decreased_No_change']].map(([l, f]) => stackFromChoice(rs, null, [l], f, DIV3, 'Increased', 'Decreased')[0]).map((it, i) => Object.assign(it, { label: ['Productivity', 'Work quality', 'Need for human intervention'][i] })) }; } },
      { id: 'c31', title: 'C.3.1 — Wage impact of new roles', type: 'stack', mode: 'diverging', showNet: true,
        build: c => ({ cats: DIV3, items: stackFromChoice(c.sub('c31', 'nonSSC'), null, ['New roles'], 'Wage_impact', DIV3, 'Increased', 'Decreased').map(it => Object.assign(it, { label: 'New roles' })) }) },
      { id: 'c41', title: 'C.4.1 — Upskilling vs new hires for changed roles', type: 'bars',
        build: c => dist(c.sub('c41').map(r => r.Existing_workers_requiring_training), OPT.upskill, { otherLabel: false }) },
      { id: 'c42w', title: 'C.4.2 — Workers affected in at-risk occupations', type: 'bars',
        build: c => dist(c.sub('c42').map(r => r.Workers_affected), OPT.fewMost, { otherLabel: false }) },
      { id: 'c42a', title: 'C.4.2 — Age profile of workers affected', type: 'bars',
        build: c => dist(c.sub('c42').map(r => r.Age_profile_of_incumbents_years), OPT.age, { otherLabel: false }) },
      { id: 'c43', title: 'C.4.3 — Organisational consequences of AI adoption', sub: 'Non-SSC · direction of change by dimension', type: 'stack', mode: 'diverging', showNet: true,
        build: c => ({ cats: DIV3, items: stackFromBools(c.sub('c43', 'nonSSC'), 'Dimension', OPT.c43dims, DIV3, 'Increased', 'Decreased') }) },
      { id: 'c44', title: 'C.4.4 — Most vulnerable worker groups', sub: 'Rank 1 = most vulnerable; top 5', type: 'rank', maxRank: 5,
        build: c => rankTable(c.sub('c44'), 'Group', 'Rank', OPT.groups) },
      { id: 'c45h', title: 'C.4.5 — Expected headcount change in two years', sub: 'Per AI-exposed occupation', type: 'stack', mode: 'diverging', showNet: true,
        build: c => ({ cats: DIV3b, items: stackFromChoice(c.sub('c45', 'nonSSC'), null, ['Expected headcount'], 'Expected_headcount_in_two_years', DIV3b, 'Increase', 'Decrease').map(it => Object.assign(it, { label: 'Expected headcount' })) }) },
      { id: 'c45t', title: 'C.4.5 — Expected change in task content', type: 'bars',
        build: c => dist(c.sub('c45', 'nonSSC').map(r => r.Expected_change_in_task_content), OPT.magnitude, { otherLabel: false }) },
      { id: 'c45i', title: 'C.4.5 — Incumbents needing training to stay in role', type: 'bars',
        build: c => Object.assign(dist(c.sub('c45', 'nonSSC').map(r => r.Incumbents_needing_training_to_stay_in_the_role), OPT.fewMost, { otherLabel: false }), { footer: footerFor(c.sub('c45', 'nonSSC'), 'Incumbents_needing_training_to_stay_in_the_role', MAP.fewMost, 'Weighted share needing training', 'ratioPct') }) },
      { id: 'c46', title: 'C.4.6 — How work is organised and supervised', sub: 'Direction of change by dimension', type: 'stack', mode: 'diverging', showNet: true,
        build: c => ({ cats: DIV3, items: stackFromBools(c.sub('c46'), 'Dimension', OPT.c46dims.slice(0, 7), DIV3, 'Increased', 'Decreased') }) }
    ],
    TN: [
      { id: 'e11', title: 'E.1.1 — Does the system fail without human input?', sub: 'Per function, all systems · dependency score Yes = 1, Partially = 0.5, No = 0', type: 'stack', mode: 'ordinal', showScore: true,
        build: c => ({ cats: cats(['Yes_fails_without_it', 'Partially', 'No_works_regardless'], ['Yes — fails', 'Partially', 'No — works regardless']), items: stackFromBools(c.sub('e11', 'nonSSC'), 'Function1', OPT.functions, cats(['Yes_fails_without_it', 'Partially', 'No_works_regardless'])).map(it => Object.assign(it, { net: it.n ? (it.counts.Yes_fails_without_it + 0.5 * it.counts.Partially) / it.n : null })) }) },
      { id: 'd31op', title: 'D.3.1 — Can a current worker operate it after a vendor demo?', sub: 'Non-SSC · per system', type: 'bars',
        build: c => dist(c.sub('d31', 'nonSSC').map(r => r.Can_a_current_worker_operate_it_after_a_vendor_demo), OPT.operate, { otherLabel: false }) },
      { id: 'd31who', title: 'D.3.1 — Who trains the operator right now', type: 'bars',
        build: c => dist(c.sub('d31', 'nonSSC').map(r => r.Who_trains_the_operator_right_now), OPT.trainer.slice(0, 4), { otherLabel: 'Other' }) },
      { id: 'd31amc', title: 'D.3.1 — Training included in supply / AMC contract', type: 'kv',
        build: c => { const rs = c.sub('d31', 'nonSSC').filter(r => r.Training_included_in_the_supply_AMC_contract); const inc = rs.filter(r => r.Training_included_in_the_supply_AMC_contract === 'Yes'); return { rows: [{ label: '% of systems with training included in AMC', value: pct(inc.length, rs.length), fmt: 'pct', n: rs.length }, { label: 'Mean hours of vendor training where included', value: avg(inc, r => num(r.If_yes_for_how_long)).value, fmt: 'num1', n: inc.length }] }; } },
      { id: 'e21p', title: 'E.2.1 — Portability and certification scope of new skills', sub: "For certification scope, 'Maybe' is shown in the middle band", type: 'stack', mode: 'ordinal',
        build: c => {
          const rs = c.sub('e21');
          const portable = stackFromChoice(rs, null, ['Portable across the sector?'], 'Portable_across_the_sector', cats(OPT.ypn))[0];
          const scope = stackFromChoice(rs, null, ['Scope for certification'], 'Scope_for_certification', cats(['Yes', 'Maybe', 'No']))[0];
          scope.counts = remap(scope.counts, { Yes: 'Yes', Maybe: 'Partially', No: 'No' });
          portable.label = 'Portable across the sector?'; scope.label = 'Scope for certification';
          return { cats: cats(OPT.ypn, ['Yes', 'Partially / Maybe', 'No']), items: [portable, scope] };
        } },
      { id: 'e21d', title: 'E.2.1 — Training duration required', type: 'bars',
        build: c => dist(c.sub('e21').map(r => r.Training_Duration), OPT.duration, { otherLabel: false }) },
      { id: 'e21c', title: 'E.2.1 — Who is best placed to certify', sub: 'Share of skills listed', type: 'bars',
        build: c => multi(c.sub('e21').filter(r => hasText(r, 'New_skill_required')).map(r => r.Who_is_best_placed_to_certify_these_skills), OPT.certifiers) },
      { id: 'e31l', title: 'E.3.1 — Expected useful life of the competence', type: 'bars',
        build: c => Object.assign(dist(c.sub('e31').map(r => r.Expected_useful_life), OPT.life, { otherLabel: false }), { footer: footerFor(c.sub('e31'), 'Expected_useful_life', MAP.life, 'Weighted life (years; open-ended excluded)', 'num1') }) },
      { id: 'e31a', title: 'E.3.1 — What happens after the tool changes', type: 'bars',
        build: c => dist(c.sub('e31').map(r => r.what_happens_to_it_after_the_related_tool_changes), OPT.afterChange, { otherLabel: false }) },
      { id: 'skills', title: 'Qualification candidate strength', sub: 'Computed per skill: portable + certifiable + durable + not obsolete', type: 'bars',
        build: c => { const s = skillClasses(c); return { n: s.n, items: [['Strong', s.strong], ['Moderate', s.moderate], ['Weak', s.weak]].map(([l, v]) => ({ label: l, count: v, value: pct(v, s.n) })) }; } },
      { id: 'e23', title: 'E.2.3 — How industry currently tests AI skills', sub: 'Non-SSC · % of respondents', type: 'bars',
        build: c => multi(c.nonSSC.map(r => r.e23), OPT.e23) },
      { id: 'f11', title: 'F.1.1 — Who currently provides AI-related training', sub: '% of respondents', type: 'bars',
        build: c => multi(c.rows.map(r => r.f11), OPT.providers) },
      { id: 'f12', title: 'F.1.2 — Who ought to serve unserved skills', sub: 'Share of unserved-skill rows', type: 'bars',
        build: c => multi(c.sub('f12').filter(r => hasText(r, 'Skills_not_adequately_served_by_anyone_today')).map(r => r.Who_ought_to_serve_them_in_your_view), OPT.providers.filter(p => p !== 'OEM vendor')) },
      { id: 'f21s', title: 'F.2.1 — Training system: current status by element', sub: 'Readiness = Fully 1 · Partially 0.5 · Not 0', type: 'stack', mode: 'ordinal', showScore: true,
        build: c => ({ cats: cats(OPT.inPlace, ['Fully in place', 'Partially', 'Not in place']), items: stackFromChoice(c.sub('f21'), 'Element1', OPT.elements.slice(0, 7), 'Available_today', cats(OPT.inPlace)).map(it => Object.assign(it, { net: it.n ? (it.counts['Fully in place'] + 0.5 * it.counts['Partially in place']) / it.n : null })) }) },
      { id: 'f21g', title: 'F.2.1 — Training system: severity of gap by element', sub: 'Gap score = No gap 0 · Minor 0.5 · Critical 1', type: 'stack', mode: 'ordinalRev', showScore: true,
        build: c => ({ cats: cats(OPT.gap), items: stackFromChoice(c.sub('f21'), 'Element1', OPT.elements.slice(0, 7), 'Severity_of_Gap', cats(OPT.gap)).map(it => Object.assign(it, { net: it.n ? (it.counts['Critical Gap'] + 0.5 * it.counts['Minor gap']) / it.n : null })) }) },
      { id: 'f31r', title: 'F.3.1 — Revision needed for out-of-date qualifications', type: 'bars',
        build: c => dist(c.sub('f31').filter(r => hasText(r, 'QP_or_NOS_code_and_title')).map(r => r.Revision_needed), OPT.revision, { otherLabel: false }) },
      { id: 'f31p', title: 'F.3.1 — Priority of qualification revisions', type: 'bars',
        build: c => dist(c.sub('f31').filter(r => hasText(r, 'QP_or_NOS_code_and_title')).map(r => r.Priority), OPT.hml, { otherLabel: false }) },
      { id: 'h11a', title: 'H.1.1(a) — Technical skills: future importance', type: 'stack', mode: 'diverging', showNet: true,
        build: c => ({ cats: cats(OPT.importance), items: stackFromChoice(c.sub('h11a'), 'Technical_Skills', OPT.tech_skills.slice(0, 6), 'Importance', cats(OPT.importance), 'Increasing', 'Declining') }) },
      { id: 'h11b', title: 'H.1.1(b) — Cognitive skills: future importance', type: 'stack', mode: 'diverging', showNet: true,
        build: c => ({ cats: cats(OPT.importance), items: stackFromChoice(c.sub('h11b'), 'Cognitive_Skills', OPT.cog_skills.slice(0, 4), 'Importance', cats(OPT.importance), 'Increasing', 'Declining') }) },
      { id: 'h11c', title: 'H.1.1(c) — Human skills: future importance', type: 'stack', mode: 'diverging', showNet: true,
        build: c => ({ cats: cats(OPT.importance), items: stackFromChoice(c.sub('h11c'), 'Human_Skills', OPT.hum_skills.slice(0, 5), 'Importance', cats(OPT.importance), 'Increasing', 'Declining') }) },
      { id: 'h11d', title: 'H.1.1(d) — AI-specific skills: future importance', type: 'stack', mode: 'diverging', showNet: true,
        build: c => ({ cats: cats(OPT.importance), items: stackFromChoice(c.sub('h11d'), 'AI_specific_skills', OPT.ai_skills.slice(0, 6), 'Importance', cats(OPT.importance), 'Increasing', 'Declining') }) },
      { id: 'h21', title: 'H.2.1 — Does the candidate pool hold the entry qualification?', type: 'bars',
        build: c => dist(c.sub('h21').filter(r => hasText(r, 'Occupation')).map(r => r.Does_the_current_candidate_pool_hold_it), OPT.yesPartlyNo, { otherLabel: false }) },
      { id: 'h31t', title: 'H.3.1 — Training requirement by type', type: 'table',
        build: c => ({ columns: [{ key: 'label', label: 'Type of training' }, { key: 'rows', label: 'Rows', fmt: 'int' }, { key: 'workers', label: 'Workers', fmt: 'count' }, { key: 'hours', label: 'Person-hours', fmt: 'count' }, { key: 'meanH', label: 'Mean hours / row', fmt: 'num1' }, { key: 'prio', label: 'Mean priority (1 = highest)', fmt: 'num1' }],
          rows: OPT.trainType.map(t => { const rs = c.sub('h31').filter(r => r.Type_required === t); const w = sum(rs.map(r => r.Number_of_workers || 0)); return { label: t, rows: rs.length, workers: w, hours: sum(rs.map(r => (r.Number_of_workers || 0) * (r.Indicative_duration_hours || 0))), meanH: avg(rs, r => r.Indicative_duration_hours).value, prio: avg(rs, r => num(r.Priority_1_to_5)).value, bar: w }; }) }) },
      { id: 'h31w', title: 'H.3.1 — Workers needing training by timing', sub: 'Share of workers', type: 'bars', nLabel: 'training rows',
        build: c => { const rs = c.sub('h31').filter(r => r.Number_of_workers != null && r.When_needed); const tot = sum(rs.map(r => r.Number_of_workers)); return { n: rs.length, items: OPT.when.map(w => { const v = sum(rs.filter(r => r.When_needed === w).map(r => r.Number_of_workers)); return { label: w, count: v, value: pct(v, tot) }; }), countLabel: 'workers' }; } },
      { id: 'h41m', title: 'H.4.1 — Preferred delivery mode', type: 'bars',
        build: c => dist(c.sub('h41').map(r => r.Preferred_mode), OPT.mode, { otherLabel: false }) },
      { id: 'h41t', title: 'H.4.1 — Preferred timing', type: 'bars',
        build: c => dist(c.sub('h41').map(r => r.Preferred_timing), OPT.timing, { otherLabel: false }) },
      { id: 'h51', title: 'H.5.1 — How competence should be assessed', sub: '% of respondents', type: 'bars',
        build: c => multi(c.rows.map(r => r.h51), OPT.assess) },
      { id: 'h55', title: 'H.5.5 — Who should issue the certificate', sub: '% of respondents', type: 'bars',
        build: c => multi(c.rows.map(r => r.h55), OPT.issuers) },
      { id: 'h61', title: 'H.6.1 — Barriers to worker participation in training', sub: '% of respondents ticking', type: 'bars',
        build: c => { const ans = c.rows.filter(r => (r.h61 || []).some(x => x.Barrier_to_participation)); return { n: ans.length, items: OPT.partBarriers.slice(0, 8).map(b => { const k = ans.filter(r => r.h61.some(x => x.Barrier_to_participation === b && x.Applies)).length; return { label: b, count: k, value: pct(k, ans.length) }; }) }; } },
      { id: 'h71', title: 'H.7.1 — Common vs sector-specific training content', type: 'stack', mode: 'ordinal',
        build: c => ({ cats: cats(['Common', 'Sector_specific'], ['Common', 'Sector-specific']), items: stackFromBools(c.sub('h71'), 'Content_area', OPT.content.slice(0, 8), cats(['Common', 'Sector_specific'])) }) }
    ],
    FN: [
      { id: 'e41a', title: 'E.4.1(a) — Would employers co-pay?', sub: 'Non-SSC respondents', type: 'bars',
        build: c => dist(c.nonSSC.map(r => r.e41a), OPT.copay, { otherLabel: false }) },
      { id: 'e41b', title: 'E.4.1(b) — Proportion an employer would bear', sub: 'Non-SSC respondents', type: 'bars',
        build: c => Object.assign(dist(c.nonSSC.map(r => r.e41b), OPT.bear, { otherLabel: false }), { footer: footerFor(c.nonSSC, 'e41b', MAP.bear, 'Weighted employer share %', 'pct') }) },
      { id: 'e42', title: 'E.4.2 — Observable wage premium for AI competence', type: 'bars',
        build: c => Object.assign(dist(c.rows.map(r => r.e42), OPT.premium, { otherLabel: false }), { footer: footerFor(c.rows, 'e42', MAP.premium, 'Weighted premium %', 'pct') }) },
      { id: 'e43', title: 'E.4.3 — Who is best suited to pay for skill development', sub: '% of respondents', type: 'bars',
        build: c => multi(c.rows.map(r => r.e43), OPT.payers) },
      { id: 'g11a', title: 'G.1.1(a) — Financing models that could work', sub: '% of respondents ticking', type: 'bars',
        build: c => { const ans = c.rows.filter(r => (r.g11a || []).some(x => x.Model)); return { n: ans.length, items: OPT.models.slice(0, 8).map(m => { const k = ans.filter(r => r.g11a.some(x => x.Model === m && x.Could_work)).length; return { label: m, count: k, value: pct(k, ans.length) }; }) }; } },
      { id: 'g21', title: 'G.2.1 — Training cost estimates (₹)', sub: 'Parsed from free-text responses; lakh / crore understood', type: 'table',
        build: c => ({ columns: [{ key: 'label', label: 'Item' }, { key: 'n', label: 'n', fmt: 'int' }, { key: 'mean', label: 'Mean', fmt: 'inr' }, { key: 'min', label: 'Min', fmt: 'inr' }, { key: 'max', label: 'Max', fmt: 'inr' }],
          rows: [['Infrastructure (labs, venue, software)', /^Infrastructure/i], ['Trainer & assessor cost', /^Trainer/i]].map(([l, re]) => { const v = c.sub('g21').filter(r => re.test(r.Item)).map(r => parseINR(r.Response)).filter(x => x != null); return { label: l, n: v.length, mean: mean(v), min: v.length ? Math.min.apply(null, v) : null, max: v.length ? Math.max.apply(null, v) : null, bar: mean(v) }; }) }) },
      { id: 'g31', title: 'G.3.1 — Outcome indicators acceptable to the payer', sub: '% of ratings acceptable', type: 'bars',
        build: c => { const rs = c.sub('g31').filter(r => r.Acceptable_to_the_payer === 'Yes' || r.Acceptable_to_the_payer === 'No'); return { n: rs.length, items: OPT.indicators.slice(0, 6).map(ind => { const ir = rs.filter(r => r.Indicator === ind); const y = ir.filter(r => r.Acceptable_to_the_payer === 'Yes').length; return { label: ind, count: y, n: ir.length, value: pct(y, ir.length) }; }).sort((a, b) => (b.value || 0) - (a.value || 0)) }; } },
      { id: 'g32', title: 'G.3.2 — Period over which the outcome should be observed', type: 'bars',
        build: c => dist(c.rows.map(r => r.g32), OPT.period, { otherLabel: 'Other' }) }
    ]
  };

  function remap(counts, m) { const o = {}; Object.keys(counts).forEach(k => { o[m[k] || k] = counts[k]; }); return o; }
  function footerFor(rows, field, map, label, fmt) {
    const a = mapAvg(rows, field, map);
    return [{ label, value: fmt === 'ratioPct' && a.value != null ? a.value * 100 : a.value, fmt: fmt === 'ratioPct' ? 'pct' : fmt, n: a.n }];
  }

  function computeCharts(rows) {
    const c = makeCtx(rows);
    const out = {};
    Object.keys(CHARTS).forEach(g => {
      out[g] = CHARTS[g].map(spec => {
        let data;
        try { data = spec.build(c); } catch (e) { data = { error: e.message, items: [] }; }
        return Object.assign({}, spec, { data });
      });
    });
    return out;
  }

  AIKPI.Compute = { normalize, slice, sectors, computeKPIs, computeCharts, parseINR, parseDate, KPIS, CHARTS, util: { str, num, bool, list, mean, sum, pct } };
})();
