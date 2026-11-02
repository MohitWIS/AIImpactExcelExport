/* =====================================================================
   demo-data.js : deterministic sample respondents in the exact shape the
   Creator REST API v2.1 returns (field link names, subform arrays,
   booleans for decision boxes, arrays for multi-select). Used only when
   the widget is opened outside Zoho Creator or when no SDK is present.
   ===================================================================== */
(function () {
  const F = AIKPI.F, OPT = AIKPI.OPT, ORG = AIKPI.ORG;

  function rng(seed) { // mulberry32
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const SYSTEMS = ['Vision QC inspection', 'Predictive maintenance', 'Demand forecasting', 'Chatbot for customer service', 'Document OCR & extraction', 'Route optimisation', 'Resume screening', 'Generative design assistant', 'Fraud detection', 'Voice IVR', 'Inventory optimisation', 'Welding robot cell', 'Energy optimisation', 'Price recommendation', 'Compliance document drafting'];
  const VENDORS = ['Siemens', 'In-house', 'Zoho', 'Microsoft', 'Google', 'SAP', 'Local SI', 'OEM bundled', 'TCS', 'Startup vendor'];
  const OCC = ['Quality inspector', 'Line supervisor', 'Data entry operator', 'Customer service executive', 'Maintenance technician', 'Procurement officer', 'Accounts assistant', 'Sales coordinator', 'CNC operator', 'Field service engineer', 'Warehouse picker', 'Design draughtsman', 'Compliance officer', 'HR recruiter', 'Telecaller'];
  const NEWROLES = ['AI output verifier', 'Prompt specialist', 'Data annotator', 'Automation technician', 'AI systems coordinator', 'Model monitoring analyst', 'Digital twin operator'];
  const SKILLS = ['Prompt writing for documentation', 'Vision system calibration', 'Interpreting dashboards & alerts', 'Data labelling & QA', 'Exception handling on AI output', 'Basic model retraining', 'Robot cell supervision', 'AI-assisted estimating', 'Verifying generated drawings', 'Chatbot escalation handling'];
  const SITES = ['Pune plant', 'Head office', 'Chennai unit', 'NCR cluster', 'Bengaluru centre', 'N/A', 'Surat cluster', 'Kolkata unit'];

  function make(seedVal, count) {
    const R = rng(seedVal || 20261022);
    const pick = a => a[Math.floor(R() * a.length)];
    const chance = p => R() < p;
    const wpick = (arr, weights) => { let s = 0; const t = weights.reduce((x, y) => x + y, 0); const r = R() * t; for (let i = 0; i < arr.length; i++) { s += weights[i]; if (r <= s) return arr[i]; } return arr[arr.length - 1]; };
    const int = (a, b) => a + Math.floor(R() * (b - a + 1));
    const some = (arr, min, max) => { const n = int(min, Math.min(max, arr.length)); const copy = arr.slice(); const out = []; while (out.length < n && copy.length) out.push(copy.splice(Math.floor(R() * copy.length), 1)[0]); return out; };
    const sub = (rows) => rows.map((r, i) => Object.assign({ ID: String(4000000000000 + i) }, r));
    const fmtDate = d => `${String(d.getDate()).padStart(2, '0')}-${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]}-${d.getFullYear()}`;
    const INC3 = ['Increased', 'Decreased', 'No change'];
    const sectorPool = some(OPT.sectors, 9, 12);

    const records = [];
    for (let i = 0; i < count; i++) {
      const orgType = wpick([ORG.SSC, ORG.EMP, ORG.PAY, 'Technology vendor'], [30, 55, 10, 5]);
      const isSSC = orgType === ORG.SSC, isPay = orgType === ORG.PAY, isEmp = !isSSC && !isPay;
      const sector = pick(sectorPool);
      const d = new Date(); d.setDate(d.getDate() - int(0, 150));
      const rec = {};
      rec[F.id] = String(3000000000000 + i);
      rec[F.sector] = sector;
      rec[F.respondent] = 'Respondent ' + (i + 1);
      rec[F.designation] = pick(['CEO', 'Plant Head', 'HR Manager', 'Program Director', 'CFO', 'Unit Manager']);
      rec[F.organisation] = pick(['Zylker Industries', sector + ' SSC', 'Acme Components', 'Bharat Services Ltd', 'Northstar Capital', 'Metro Works']);
      rec[F.orgType] = orgType;
      rec[F.segment] = some(['Large / OEM', 'MSME', 'Organised service', 'Informal / unorganised'], 1, 2);
      rec[F.employees] = pick(OPT.employees.slice(0, 6));
      rec[F.date] = fmtDate(d);
      rec[F.email] = 'respondent' + (i + 1) + '@example.org';
      if (!isSSC && !isPay) {
        const a = int(10, 30), b = int(20, 35), c = int(20, 35);
        rec[F.wfSenior] = String(a); rec[F.wfMid] = String(b); rec[F.wfEarly] = String(c); rec[F.wfEntry] = String(100 - a - b - c);
      }
      if (!isPay) {
        rec[F.a2] = [wpick(OPT.a2, [25, 45, 28, 2])];
        rec[F.b11] = sub(OPT.locus.map((l, li) => { const st = wpick(['cur', 'em', 'np'], [li === 3 ? 60 : 40, 40, li === 0 ? 30 : 15]); return { Locus: l, Current_Use: st === 'cur', Emerging: st === 'em', Not_Present: st === 'np', Expected_Importance: String(wpick([1, 2, 3, 4, 5], [5, 10, 25, 35, 25])), Workforce_Affected: wpick(Object.keys(AIKPI.MAP.wfAffected), [35, 35, 20, 10]) }; }));
        const nSys = int(2, 5);
        const systems = some(SYSTEMS, nSys, nSys);
        rec[F.b12] = sub([1, 2, 3, 4, 5].map(s => s <= nSys ? { Serial_No: String(s), AI_System: systems[s - 1], Vendor_if_applicable: pick(VENDORS), Locus: pick(['P - in the product', 'Pr - in the production or delivery process', 'C - at the customer or service interface', 'E - in the enterprise layer']), Site_or_unit_where_it_runs_N_A_if_Not_Applicable: pick(SITES), Deployed_by_firm_or_used_through_a_pre_installed_system: wpick(['Deployed by the firm', 'Used through a pre-installed system'], [55, 45]) } : { Serial_No: String(s), AI_System: '', Vendor_if_applicable: '', Locus: '', Site_or_unit_where_it_runs_N_A_if_Not_Applicable: '', Deployed_by_firm_or_used_through_a_pre_installed_system: '' }));
        const ranks = some(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], 10, 10);
        const popular = [6, 8, 0, 1, 9, 4, 5, 2, 10, 3, 7, 11, 12];
        rec[F.b13] = sub(OPT.tech.map((t, ti) => { const pos = popular.indexOf(ti); const rk = pos < 10 ? ranks[(pos + int(0, 2)) % 10] : 'NA'; return { Technology_Category: t, Rank_by_Usage_Top_10: rk }; }).concat([{ Technology_Category: 'If Other, please specify below', Rank_by_Usage_Top_10: '' }]));
        // de-duplicate ranks (keep first occurrence)
        const seen = new Set(); rec[F.b13].forEach(r => { if (r.Rank_by_Usage_Top_10 !== 'NA' && r.Rank_by_Usage_Top_10) { if (seen.has(r.Rank_by_Usage_Top_10)) r.Rank_by_Usage_Top_10 = 'NA'; else seen.add(r.Rank_by_Usage_Top_10); } });
        rec[F.b31a] = wpick(OPT.firmsAdopt, [20, 30, 25, 15, 8, 2]);
        rec[F.b31b] = wpick(OPT.workerProp, [30, 35, 20, 10, 4, 1]);
        rec[F.b31c] = wpick(OPT.invest, [40, 30, 18, 9, 3]);
        rec[F.b31d] = wpick(OPT.trained, [25, 35, 22, 13, 5]);
        rec[F.c41] = sub(some(OCC, 1, 3).map(o => ({ Occupation: o, Key_task_expectation: 'Verify AI output, maintain data quality', Existing_workers_requiring_training: wpick(OPT.upskill, [65, 20, 15]) })));
        rec[F.c42] = sub(some(OCC, 1, 3).map(o => ({ Occupation_at_risk: o, Related_tasks_to_be_obsolete: 'Manual data entry, routine inspection', Workers_affected: wpick(OPT.fewMost, [25, 35, 28, 12]), Age_profile_of_incumbents_years: wpick(OPT.age, [25, 40, 25, 10]) })));
        const grpRanks = some(['1', '2', '3', '4', '5'], 5, 5); const grpIdx = some([0, 1, 2, 3, 4, 5, 6, 7], 5, 5);
        rec[F.c44] = sub(OPT.groups.map((g, gi) => ({ Group: g, Rank: grpIdx.indexOf(gi) >= 0 ? grpRanks[grpIdx.indexOf(gi)] : '' })));
        rec[F.c46] = sub(OPT.c46dims.map((dm, di) => { if (di === 7) return { Dimension: dm, Increased: false, No_change: false, Decreased: false, Area_Roles_if_impacted: '' }; const st = wpick(INC3, [di <= 2 || di === 6 ? 60 : 30, di === 3 ? 40 : 15, 30]); return { Dimension: dm, Increased: st === 'Increased', Decreased: st === 'Decreased', No_change: st === 'No change', Area_Roles_if_impacted: st === 'No change' ? '' : 'Shop floor, QC' }; }));
        rec[F.d11] = [wpick(OPT.d11, [35, 15, 15, 20, 15])];
        const barRanks = some(['1', '2', '3', '4', '5', '6', '7'], 7, 7);
        rec[F.d21] = sub(OPT.barriers.map((b, bi) => bi < 7 ? { Principal_barrier_for_MSMEs: b, Rank: barRanks[bi], Who_Should_act: some(OPT.actors, 1, 2) } : { Principal_barrier_for_MSMEs: b, Rank: '', Who_Should_act: [] }));
        const nSkills = int(2, 4); const skills = some(SKILLS, nSkills, nSkills);
        rec[F.e21] = sub(skills.map(s => ({ New_skill_required: s, Portable_across_the_sector: wpick(OPT.ypn, [55, 30, 15]), Scope_for_certification: wpick(['Yes', 'Maybe', 'No'], [55, 30, 15]), Training_Duration: wpick(OPT.duration, [25, 40, 25, 10]), Who_is_best_placed_to_certify_these_skills: some(OPT.certifiers, 1, 2) })));
        rec[F.e31] = sub(skills.map(s => ({ Skill_from_E_2_1: s, Expected_useful_life: wpick(OPT.life, [10, 30, 25, 10, 15, 10]), what_happens_to_it_after_the_related_tool_changes: wpick(OPT.afterChange, [20, 45, 25, 10]) })));
        rec[F.e42] = wpick(OPT.premium, [10, 30, 25, 20, 15]);
        rec[F.f11] = some(OPT.providers.slice(0, 9), 1, 4);
        rec[F.f12] = sub(some(SKILLS, 1, 2).map(s => ({ Skills_employers_can_develop_themselves: 'Basic tool operation', Skills_not_adequately_served_by_anyone_today: s, Who_ought_to_serve_them_in_your_view: some(OPT.providers.filter(p => p !== 'OEM vendor' && p !== 'Other'), 1, 2) })));
        rec[F.f21] = sub(OPT.elements.map((e, ei) => ei < 7 ? { Element1: e, Available_today: wpick(OPT.inPlace, [15, 45, 40]), Severity_of_Gap: wpick(OPT.gap, [15, 40, 45]) } : { Element1: e, Available_today: '', Severity_of_Gap: '' }));
        rec[F.g11a] = sub(OPT.models.map((m, mi) => ({ Model: m, Could_work: mi < 8 ? chance([0.7, 0.75, 0.45, 0.5, 0.55, 0.35, 0.5, 0.25][mi]) : false, If_any_remarks_share: '' })));
        rec[F.g21] = sub([{ Item: OPT.costItems[0], Response: pick(['₹ 12 lakh per lab', '8,00,000', 'Approx 25 lakh', '₹5 lakh', '1.2 crore for 4 centres', '15 lakh']) }, { Item: OPT.costItems[1], Response: pick(['₹ 1,500 per hour', '2 lakh per batch', '80,000 per batch', '₹ 3.5 lakh', '1.2 lakh']) }, { Item: OPT.costItems[2], Response: pick(['Certification fees 2,000 per candidate', 'NA', 'Travel and stipend']) }]);
        rec[F.h11a] = sub(OPT.tech_skills.map((s, si) => ({ Technical_Skills: s, Importance: si < 6 ? wpick(OPT.importance, [si === 3 ? 30 : 65, 25, si === 3 ? 35 : 10]) : '' })));
        rec[F.h11b] = sub(OPT.cog_skills.map((s, si) => ({ Cognitive_Skills: s, Importance: si < 4 ? wpick(OPT.importance, [70, 25, 5]) : '' })));
        rec[F.h11c] = sub(OPT.hum_skills.map((s, si) => ({ Human_Skills: s, Importance: si < 5 ? wpick(OPT.importance, [55, 35, 10]) : '' })));
        rec[F.h11d] = sub(OPT.ai_skills.map((s, si) => ({ AI_specific_skills: s, Importance: si < 6 ? wpick(OPT.importance, [80, 17, 3]) : '' })));
        const trows = some(OCC, 1, 3).map(o => { const type = wpick(OPT.trainType, [35, 35, 20, 10]); return { Occupation: o, Type_required: type, Number_of_workers: int(20, 800), Indicative_duration_hours: [8, 24, 40, 80][OPT.trainType.indexOf(type)] + int(0, 16), When_needed: wpick(OPT.when, [30, 35, 25, 10]), Priority_1_to_5: String(int(1, 5)) }; });
        rec[F.h31] = sub(trows);
        rec[F.h41] = sub(trows.map(t => ({ Type_of_Training_from_QH_3_1: t.Type_required, Preferred_mode: wpick(OPT.mode, [20, 30, 30, 15, 5]), Preferred_timing: wpick(OPT.timing, [45, 35, 20]), Workable_batch_size: int(10, 40) })));
        rec[F.h51] = some(OPT.assess.slice(0, 4), 1, 3);
        rec[F.h52] = wpick(['Yes', 'No'], [65, 35]);
        rec[F.h53] = wpick(['Yes', 'No'], [75, 25]);
        rec[F.h54] = wpick(['Yes', 'No'], [70, 30]);
        rec[F.h55] = some(OPT.issuers.slice(0, 3), 1, 2);
        rec[F.h56] = wpick(['Yes', 'No'], [40, 60]);
        rec[F.h61] = sub(OPT.partBarriers.map((b, bi) => ({ Barrier_to_participation: b, Applies: bi < 8 ? chance([0.3, 0.6, 0.4, 0.3, 0.35, 0.3, 0.5, 0.45][bi]) : false })));
      }
      if (isSSC) {
        rec[F.e43] = some(OPT.payers.slice(0, 8), 1, 3);
        rec[F.f31] = sub(some(['QP/NOS ASC/Q1401 Quality Inspector', 'QP ELE/Q4601 Field Technician', 'NOS SSC/N0501 Customer Care', 'QP LSC/Q2101 Warehouse Associate', 'QP CGS/Q1301 CNC Operator'], 0, 3).map(q => ({ QP_or_NOS_code_and_title: q, NSQF_level: String(int(3, 6)), Revision_needed: wpick(OPT.revision, [25, 50, 20, 5]), Priority: wpick(OPT.hml, [45, 40, 15]) })));
        rec[F.h21] = sub(some(NEWROLES, 1, 3).map(r => ({ Occupation: r, Proposed_NSQF_level: String(int(4, 6)), Realistic_entry_qualification: pick(['ITI', 'Diploma', '12th pass', 'Graduate']), Does_the_current_candidate_pool_hold_it: wpick(OPT.yesPartlyNo, [30, 45, 25]) })));
        rec[F.h71] = sub(OPT.content.map((cn, ci) => { if (ci === 8) return { Content_area: cn, Common: false, Sector_specific: false, If_sector_specific_name_the_AI_used: '' }; const common = chance([0.9, 0.85, 0.8, 0.8, 0.85, 0.1, 0.2, 0.5][ci]); return { Content_area: cn, Common: common, Sector_specific: !common, If_sector_specific_name_the_AI_used: common ? '' : pick(SYSTEMS) }; }));
        rec[F.g32] = wpick(OPT.period, [5, 30, 40, 15, 10]);
      }
      if (isEmp) {
        rec[F.b21] = sub(OPT.tasks.map((t, ti) => { const used = ti === 6 ? false : chance([0.55, 0.35, 0.7, 0.4, 0.5, 0.45][ti]); return { Task: t, Used_In_Last_2_weeks: ti === 6 ? '' : (used ? 'Yes' : 'No'), By_whom_role: used ? pick(['Sales', 'Accounts', 'Design', 'Admin', 'Owner']) : '', Paid_for_by_firm_or_individual_or_any_other_Be_specific: used ? wpick(['Firm', 'Individual', 'Both (Firm and Individual)'], [40, 45, 15]) : '' }; }));
        const nAb = wpick([0, 1, 2, 3], [45, 35, 15, 5]);
        rec[F.b32] = sub([0, 1, 2, 3].map(k => k < nAb ? { Name_of_the_AI_deployment: pick(SYSTEMS), Reason_select_all_that_apply: some(OPT.abandonReason.slice(0, 6), 1, 2), If_Other_Please_Specify: '' } : { Name_of_the_AI_deployment: '', Reason_select_all_that_apply: [], If_Other_Please_Specify: '' }));
        const sysRows = rec[F.b12].filter(s => s.AI_System);
        rec[F.c11] = sub(sysRows.map(s => ({ System_FromQB_1_2: s.AI_System, Related_occupations: pick(OCC), Headcount_change_last_12_months: wpick(OPT.headChange, [8, 20, 40, 24, 8]), Is_this_change_attributable_to_AI: wpick(OPT.attrib, [30, 45, 25]) })));
        rec[F.c12] = chance(0.4) ? pick(OCC) : pick(['NA', 'N/A', 'None']);
        rec[F.c21] = sub(some(OCC, 1, 3).map(o => ({ Occupation: o, Additional_skills_tasks_now_required: pick(SYSTEMS), Productivity_change: wpick(INC3, [70, 8, 22]), Work_quality_change: wpick(INC3, [60, 10, 30]), Increased_Decreased_No_change: wpick(INC3, [45, 30, 25]) })));
        rec[F.c31] = sub(some(NEWROLES, 1, 2).map(r => ({ New_occupation_role: r, Key_task_expectation: 'Check and correct AI output', Filled_internally_or_new_hire: wpick(OPT.filled, [55, 45]), Wage_impact: wpick(INC3, [55, 5, 40]) })));
        rec[F.c43] = sub(OPT.c43dims.map((dm, di) => { const st = wpick(INC3, [[20, 45, 35], [70, 5, 25], [60, 5, 35], [35, 15, 50], [30, 20, 50], [15, 15, 70]][di]); return { Dimension: dm, Increased: st === 'Increased', Decreased: st === 'Decreased', No_change: st === 'No change', Note_on_magnitude_which_roles_are_affected: 'Moderate' }; }));
        rec[F.c45] = sub(rec[F.c11].map(cr => ({ Occupation: cr.Related_occupations, Expected_headcount_in_two_years: wpick(OPT.incNoDec, [30, 40, 30]), Expected_change_in_task_content: wpick(OPT.magnitude, [40, 45, 15]), Incumbents_needing_training_to_stay_in_the_role: wpick(OPT.fewMost, [15, 30, 35, 20]) })));
        rec[F.d31] = sub(sysRows.map(s => { const amc = wpick(['Yes', 'No'], [55, 45]); return { System_number_from_B_1_2: s.AI_System, Needs_setup_before_use: wpick(['Yes', 'No'], [65, 35]), Works_right_away: wpick(['Yes', 'No'], [40, 60]), Can_a_current_worker_operate_it_after_a_vendor_demo: wpick(OPT.operate, [25, 45, 30]), Who_trains_the_operator_right_now: wpick(OPT.trainer.slice(0, 4), [50, 30, 8, 12]), Training_included_in_the_supply_AMC_contract: amc, If_yes_for_how_long: amc === 'Yes' ? String(int(4, 40)) : '' }; }));
        rec[F.e11] = sub([].concat.apply([], sysRows.map(s => OPT.functions.map((fn, fi) => { const st = wpick(['y', 'p', 'n'], [[40, 40, 20], [35, 45, 20], [55, 35, 10], [65, 25, 10]][fi]); return { System_number_from_B_1_2: s.AI_System, Function1: fn, Yes_fails_without_it: st === 'y', Partially: st === 'p', No_works_regardless: st === 'n', What_goes_wrong_when_it_is_absent: st === 'n' ? '' : 'Quality drift, missed exceptions' }; }))));
        rec[F.e23] = some(OPT.e23, 1, 4);
        rec[F.e41a] = wpick(OPT.copay, [35, 45, 20]);
        rec[F.e41b] = wpick(OPT.bear, [35, 40, 18, 7]);
        rec[F.e43] = some(OPT.payers.slice(0, 8), 1, 3);
        rec[F.g32] = wpick(OPT.period, [5, 30, 40, 15, 10]);
      }
      if (isPay) {
        rec[F.e41a] = wpick(OPT.copay, [40, 40, 20]);
        rec[F.e41b] = wpick(OPT.bear, [30, 45, 20, 5]);
        rec[F.e43] = some(OPT.payers.slice(0, 8), 1, 3);
        rec[F.g11a] = sub(OPT.models.map((m, mi) => ({ Model: m, Could_work: mi < 8 ? chance([0.75, 0.5, 0.7, 0.45, 0.5, 0.35, 0.55, 0.3][mi]) : false, If_any_remarks_share: '' })));
        rec[F.g32] = wpick(OPT.period, [5, 25, 45, 15, 10]);
      }
      if (!isSSC) {
        rec[F.g31] = sub(OPT.indicators.map((ind, ii) => ({ Indicator: ind, Acceptable_to_the_payer: ii < 6 ? (chance([0.75, 0.85, 0.5, 0.8, 0.6, 0.45][ii]) ? 'Yes' : 'No') : 'No', Who_would_verify_it: pick(['Employer', 'SSC', 'Third-party assessor']), Source_of_the_data: pick(['HR records', 'Payroll', 'Production MIS', 'Assessment agency']) })));
      } else {
        rec[F.g31] = sub(OPT.indicators.map((ind, ii) => ({ Indicator: ind, Acceptable_to_the_payer: ii < 6 ? (chance([0.7, 0.8, 0.55, 0.75, 0.65, 0.5][ii]) ? 'Yes' : 'No') : 'No', Who_would_verify_it: 'SSC', Source_of_the_data: 'Assessment agency' })));
      }
      records.push(rec);
    }
    return records;
  }

  AIKPI.Demo = { make };
})();
