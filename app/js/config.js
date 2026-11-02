/* =====================================================================
   AI Impact on Skilling – KPI Dashboard widget
   config.js : link names, option lists, scoring maps (from the Excel
   "Lookups" sheet) and KPI thresholds.
   ===================================================================== */
window.AIKPI = window.AIKPI || {};

AIKPI.CONFIG = {
  // Leave appLinkName blank to auto-detect from ZOHO.CREATOR.UTIL.getInitParams()
  // or from the widget's "appName" parameter. Set it explicitly if the widget
  // is placed in a different application than the survey.
  appLinkName: '',
  reportLinkName: 'AI_S_IMPACT_ON_SKILLING_SECTOR_CONSULTATION',
  // Tried in order if the name above is not a valid report link name
  // (in the app export the report is "<form>_Report").
  reportFallbacks: ['AI_S_IMPACT_ON_SKILLING_SECTOR_CONSULTATION_Report'],
  fieldConfig: 'all',          // 'all' is required so subform (grid) data is returned
  maxRecords: 1000,            // v2 SDK allows 200 / 500 / 1000 per call
  v1PageSize: 200,             // fallback for the v1 SDK (getAllRecords)
  demoWhenOffline: true,       // render seeded sample data when the Zoho SDK is unavailable
  demoRespondents: 54,
  showHeadlineKPIs: false,     // set true to bring back the "Headline KPIs" tile grids
  maxDetailFetches: 400,       // per-record fallback (getRecordById) is capped at this many records
  // Pass thresholds for the five demand tests (editable in the UI as well)
  thresholds: { TN01: 0.5, TN02: 50, TN03: 50, TN04: 50, TN05: 50 }
};

/* ----- Organisation type values (radio field) ----- */
AIKPI.ORG = {
  SSC: 'SSC / Industry association secretariat',
  EMP: 'Employer / Plant HR / Unit head / Line manager',
  PAY: 'Prospective payer / financier'
};

/* ----- Field link names (short key -> link name in the Creator form) ----- */
AIKPI.F = {
  id: 'ID',
  sector: 'Sector_Sub_sector_Name',
  respondent: 'Name_of_Respondent',
  designation: 'Designation',
  organisation: 'Organisation',
  orgType: 'Organisation_Type',
  segment: 'Segment_You_Can_Speak_For',
  clusters: 'Major_Locations_Clusters_of_Operation',
  employees: 'Approximate_Number_of_Employees_If_Applicable',
  wfSenior: 'Senior_experienced_10_yrs',
  wfMid: 'Mid_career_5_10_yrs',
  wfEarly: 'Early_career_1_5_yrs',
  wfEntry: 'Entry_level_new_entrant',
  date: 'Date_of_Response',
  email: 'Contact_Email',
  a2: 'A_2_In_your_view_what_is_the_single_most_important_change_that_AI_is_bringing_in_your_sector',
  b11: 'B_1_1_a_How_important_do_you_expect_AI_to_become_at_each_locus_over_the_next_few_years',
  b12: 'B_1_2_List_the_TOP_5_AI_enabled_systems_by_use_in_firms_in_your_sector_today',
  b13: 'B_1_3_Which_categories_of_AI_technology_are_currently_in_use_in_your_sector_firm',
  b21: 'B_2_1_In_the_last_two_weeks_has_anyone_in_your_firm_unit_used_a_general_purpose_AI_assistant_for_a',
  b31a: 'B_3_1_a_Number_of_Firms_Units_in_Your_Sector_Adopting_AI',
  b31b: 'B_3_1_b_Proportion_of_Workers_Using_AI',
  b31c: 'B_3_1_c_AI_investment_figures_as_of_revenue_in_last_12_months',
  b31d: 'B_3_1_d_of_employees_for_whom_AI_Trainings_have_been_conducted_in_past_12_months',
  b32: 'B_3_2_In_the_last_12_months_which_AI_deployments_in_your_sector_were_abandoned_rolled_back_or_left',
  c11: 'C_1_1_For_each_system_listed_at_B_1_2_what_has_happened_to_headcount_and_output_that_can_be_attrib',
  c12: 'C_1_2_For_which_occupation_s_have_you_stopped_recruiting_altogether_in_the_last_12_months',
  c21: 'C_2_1_For_occupations_where_AI_use_has_increased_what_has_changed_alongside_output',
  c31: 'C_3_1_What_new_tasks_does_AI_deployment_require_to_operate',
  c41: 'C_4_1_What_do_current_job_descriptions_require_which_was_not_there_two_years_ago',
  c42: 'C_4_2_Which_occupations_in_your_sector_are_most_at_risk_of_being_made_obsol',
  c43: 'C_4_3_Which_of_the_following_have_changed_in_your_organisation_or_sector_as_a_consequence_of_AI_ad',
  c44: 'C_4_4_Which_groups_of_workers_in_your_sector_are_most_vulnerable_to_the_AI_related_changes',
  c45: 'C_4_5_Looking_two_years_ahead_how_do_you_expect_headcount_and_task_content_to_change_in_each_affec',
  c46: 'C_4_6_Alongside_employment_how_has_AI_changed_the_way_work_is_organised_and_supervised',
  d11: 'D_1_1_Apart_from_wages_what_is_the_major_advantage_of_AI_enablement_in_your_sector',
  d21: 'D_2_1_What_are_the_principle_barriers_in_adopting_AI_technologies_especially_in_case_of_small_unit',
  d31: 'D_3_1_For_each_AI_system_in_use_what_training_does_an_operator_actually_need_to_run_it_and_who_is',
  e11: 'E_1_1_For_the_AI_systems_in_use_do_they_fail_degrade_or_lose_value_without_competent_human_input',
  e21: 'E_2_1_Rephrase_Are_newly_created_tasks_related_to_AI_transferable_across',
  e23: 'E_2_3_How_does_industry_in_your_sector_currently_test_the_required_AI_skills',
  e31: 'E_3_1_How_long_is_the_new_competence_likely_to_remain_valid_before_the_tool_it_relates_to_changes',
  e41a: 'E_4_1_a_Would_employers_in_your_sector_co_pay_for_this_training',
  e41b: 'E_4_1_b_What_proportion_would_an_employer_realistically_bear',
  e42: 'E_4_2_Is_there_an_observable_wage_premium_in_the_market_for_new_AI_competence_or_skills_today',
  e43: 'E_4_3_Who_would_be_best_suited_to_pay_for_developing_these_skills',
  f11: 'F_1_1_Who_is_currently_providing_AI_related_training_in_your_sector',
  f12: 'F_1_2_Which_AI_related_skills_can_employers_in_your_sector_develop_on_their_own_and_which_by',
  f21: 'F_2_1_What_does_the_training_system_in_your_sector_already_have_and_what_is_missing',
  f31: 'F_3_1_Which_existing_qualifications_in_your_sector_are_now_out_of_date_because_of_AI_and_what_revi',
  g11a: 'G_1_1_a_Which_financing_models_could_work_for_AI_related_skilling_in_your_sector',
  g21: 'G_2_1_What_would_be_the_training_cost',
  g31: 'G_3_1_On_what_evidence_would_the_payer_identified_at_E_4_3_accept_that_the_training_had_worked',
  g32: 'G_3_2_Over_what_period_should_the_outcome_be_observed',
  h11a: 'H_1_1_a_Technical_skills_how_will_their_importance_change_in_your_sector_because_of_AI',
  h11b: 'H_1_1_b_Cognitive_skills_how_will_their_importance_change',
  h11c: 'H_1_1_c_Human_skills_how_will_their_importance_change',
  h11d: 'H_1_1_d_AI_specific_skills_how_will_their_importance_change',
  h21: 'H_2_1_What_should_the_minimum_qualification_level_be_for_each_new_AI_enabled_occupation_you_have_p',
  h31: 'H_3_1_For_each_affected_occupation_what_type_of_training_is_required_and_for_how_many_workers',
  h41: 'H_4_1_How_would_the_training_have_to_be_delivered_for_workers_in_your_sector_to_attend',
  h51: 'H_5_1_How_should_the_resulting_competence_be_assessed',
  h52: 'H_5_2_Would_third_party_assessment_be_accepted_by_employers_in_such_cases',
  h53: 'H_5_3_Should_recognition_of_prior_learning_be_offered_to_experienced_workers',
  h54: 'H_5_4_Is_a_short_stackable_credential_preferred_to_a_full_qualification',
  h55: 'H_5_5_Who_should_issue_the_certificate',
  h56: 'H_5_6_Would_a_vendor_certificate_be_accepted_in_place_of_a_national_one',
  h61: 'H_6_1_What_do_you_see_as_challenges_of_participation_for_workers_in_your_sector_from_attending_tra',
  h71: 'H_7_1_Which_parts_of_the_content_are_common_to_multiple_sectors_and_which_must_be_specific_to_yours'
};

/* Subform (grid) fields – used to verify that record fetches include grid rows */
AIKPI.SUBFORM_KEYS = ['b11', 'b12', 'b13', 'b21', 'b32', 'c11', 'c21', 'c31', 'c41', 'c42', 'c43', 'c44', 'c45', 'c46', 'd21', 'd31', 'e11', 'e21', 'e31', 'f12', 'f21', 'f31', 'g11a', 'g21', 'g31', 'h11a', 'h11b', 'h11c', 'h11d', 'h21', 'h31', 'h41', 'h61', 'h71'];
/* Every link name the dashboard reads – used for field_config: "custom" */
AIKPI.ALL_FIELDS = Object.keys(AIKPI.F).filter(k => k !== 'id').map(k => AIKPI.F[k]);

/* ----- Option lists (order matters for charts) ----- */
AIKPI.OPT = {
  a2: ['Domain - Products / Services Offered', 'Operational (How Work Gets Done)', 'Employment-Related (Roles, Skills, Headcount)', 'Others'],
  locus: ['Product - AI-enabled products or services', 'Process - production or service delivery', 'Customer interface - sales, service, communication', 'Enterprise - HR, finance, procurement, compliance'],
  locusShort: ['Product', 'Process', 'Customer interface', 'Enterprise'],
  tech: ['Natural Language Processing (NLP)', 'Computer Vision', 'Speech and Audio', 'Robotics and Embodied AI', 'Recommender and Ranking Systems', 'Planning, Search, and Optimisation', 'Generative AI', 'Symbolic / Rule-based AI', 'Machine Learning', 'Deep Learning', 'Probabilistic & Statistical Methods', 'Evolutionary & Swarm Computation', 'Neuro-symbolic Hybrids'],
  tasks: ['Drafting a quotation, estimate or tender response', 'Preparing or checking a GST or statutory filing', 'Writing customer or supplier correspondence', 'Translating a document or specification', 'Summarising a specification, manual or bulletin', 'Generating a drawing, image, or marketing material', 'Other (please specify):'],
  firmsAdopt: ['Fewer than 10', '10 - 50', '50 - 200', '200 - 1,000', 'Over 1,000', 'Not applicable'],
  workerProp: ['0 - 5%', '6 - 20%', '21 - 40%', '41 - 60%', 'More than 60%', 'NA'],
  invest: ['Less than 1%', '1 - 3%', '3 - 5%', '5 - 10%', 'More than 10%'],
  trained: ['None', 'Less than 10%', '10 - 25%', '26 - 50%', 'More than 50%'],
  abandonReason: ['Accuracy issues', 'Integration difficulties', 'Lack of skilled operators', 'Vendor exit / support ended', 'Cost-benefit not realised', 'Changed business priorities', 'Other'],
  d11: ['Quality consistency', 'Customer or export audit requirement', 'Safety', 'Cycle time', 'Precision beyond manual capability'],
  barriers: ['Capital cost', 'Uncertain or long payback', 'Order volumes too small or variable', 'Working capital and credit access', 'No usable digital data', 'No one to operate or maintain it', 'Awareness of what is available', 'Other, specify below'],
  actors: ['Firm', 'SSC', 'Vendor', 'Government'],
  headChange: ['Increased more than 20%', 'Increased 5 - 20%', 'No change', 'Decreased 5 - 20%', 'Decreased more than 20%'],
  attrib: ['Mostly AI', 'Partly AI', 'Not AI-related'],
  incDecNo: ['Increased', 'Decreased', 'No change'],
  filled: ['Filled internally', 'New hire'],
  upskill: ['Upskilling/reskilling', 'New hires needed', 'No impact on employees/workforce'],
  fewMost: ['Few', 'Some', 'Many', 'Most'],
  age: ['Under 30 years', '30 - 40 years', '40 - 50 years', 'Over 50 years'],
  c43dims: ['Team size', 'Skill mix within the team', 'Qualification requirements at entry', 'Internal mobility and promotion', 'Outsourcing of the affected work', 'Gender composition of the affected roles'],
  groups: ['Entry-level workers', 'Senior-aged workers', 'Low-skilled workers', 'Women', 'Contract workers', 'Informal workers', 'Workers in repetitive occupations', 'Workers with limited digital skills'],
  incNoDec: ['Increase', 'No change', 'Decrease'],
  magnitude: ['Significant', 'Moderate', 'Minimal'],
  c46dims: ['Pace or intensity of work', 'Allocation of tasks, shifts or work orders by software', 'Monitoring of individual performance', 'Discretion the worker exercises over method', 'Exposure to safety or health risk', 'Ability to question or appeal a decision made by the system', 'Requirement to record work digitally as it is done', 'Other, specify below'],
  functions: ['Operation of the system', 'Monitoring while it runs', 'Interpretation of its output', 'Exception handling'],
  operate: ['Yes, fully', 'Yes, partially', 'No, requires additional training'],
  trainer: ['Vendor', 'On-the-job training', 'Training institution', 'Self learned', 'Other'],
  ypn: ['Yes', 'Partially', 'No'],
  ynm: ['Yes', 'Maybe', 'No'],
  duration: ['Less than 1 week', '1–4 weeks', '1–3 months', 'More than 3 months'],
  certifiers: ['Vendor', 'SSC', 'Employer', 'Independent assessment body', 'Multiple agencies', 'Third party agencies', 'Government'],
  life: ['Under 1 year', '1 to 3 years', '3 to 5 years', 'Over 5 years', 'As long as AI is in use', 'Can’t say'],
  afterChange: ['Becomes obsolete', 'Evolves with the tool', 'Could be used with other tools', 'Can’t say'],
  e23: ['Interview', 'Structured trade test', 'Probation and observe', 'Referral', 'Hire and find out', 'Written test', 'Practical test', 'Simulation', 'Portfolio of work', 'Third-party certification', 'Vendor certification'],
  copay: ['Yes', 'Possibly', 'No'],
  bear: ['Less than 25%', '25 - 50%', '51 - 75%', 'More than 75%'],
  premium: ['Yes, significant premium (more than 20%)', 'Yes, moderate premium (10 - 20%)', 'Yes, small premium (less than 10%)', 'No observable premium', "Don't know"],
  payers: ['Employer', 'SSC / industry association', 'OEM / vendor', 'Worker themselves', 'Government', 'CSR', 'Customer / client', 'Outcome-based financing', 'Other'],
  providers: ['Employer', 'NSDC / SSC / industry association', 'Technology vendor', 'OEM vendor', 'Universities', 'ITIs', 'Polytechnics', 'Private training providers', 'Online platforms', 'Other'],
  elements: ['Trainers competent in the AI systems actually in use', 'Equipment or laboratory for hands-on practice', 'Simulation or sandbox environment', 'Curriculum and learning material', 'Assessment instruments and assessors', 'Industry-recognised certification', 'Training capacity in the clusters where the workers are', 'Other, specify below'],
  inPlace: ['Fully in place', 'Partially in place', 'Not in place'],
  gap: ['No Gap', 'Minor gap', 'Critical Gap'],
  revision: ['New NOS', 'Revise NOS', 'New QP', 'Withdraw'],
  hml: ['High', 'Medium', 'Low'],
  models: ['Employer co-payment', 'Government-funded training', 'Outcome-based financing', 'Vendor or OEM funded', 'CSR', 'Industry association funding', 'Apprenticeship-linked funding', 'Training loan to the learner', 'If Other, please specify below'],
  costItems: ['Infrastructure (incl. labs, venue, software, etc.)', 'Trainer & Assessor cost (₹)', 'If any other cost involved, please specify'],
  indicators: ['Placement or retention in the AI-exposed role', 'Employer confirmation that the worker is competent on the system', 'Change in wage six to twelve months after training', 'Measured change in output or quality at the workplace', 'Reduction in reliance on the vendor for routine operation', 'Certification pass rate', 'If Other, please specify below'],
  period: ['3 months', '6 months', '12 months', '18 months', '24 months'],
  tech_skills: ['AI tool operation', 'Data handling', 'Digital systems', 'Equipment operation', 'Troubleshooting', 'Data interpretation', 'If Other, please specify below'],
  cog_skills: ['Analytical thinking', 'Problem solving', 'Decision making', 'Critical evaluation of AI output', 'If Other, please specify below'],
  hum_skills: ['Communication', 'Creativity', 'Collaboration', 'Customer interaction', 'Leadership', 'If Other, please specify below'],
  ai_skills: ['Prompting and task framing', 'Verification of AI output', 'Validation against ground truth', 'Human-in-the-loop operation', 'AI ethics and accountability', 'Data privacy', 'If Other, please specify below'],
  importance: ['Increasing', 'Stable', 'Declining'],
  trainType: ['Awareness', 'Working user', 'Advanced user and verifier', 'Specialist'],
  when: ['Now', 'Within 6 months', '6 to 18 months', 'In future sometime'],
  mode: ['Classroom', 'On-job', 'Blended', 'Online', 'Simulation'],
  timing: ['Working hours', 'After shift', 'Weekend'],
  assess: ['Practical test', 'Written test', 'Observation at work', 'Portfolio', 'Other'],
  issuers: ['SSC', 'NSDC', 'Vendor', 'Other'],
  partBarriers: ['Unwillingness to participate', 'Loss of wages during training', 'Distance or cost of travel', 'Caring responsibilities at home', 'Duration', 'Not meeting the required qualification', 'No visible benefit in pay or grade', 'Low adoptability by elder employees', 'If Other, please specify below'],
  content: ['AI awareness, terminology, and limits', 'Prompting and task framing', 'Verification of AI output against ground truth', 'Data handling, privacy, and record keeping', 'AI ethics, accountability, and disclosure', 'Operation of the specific systems listed at QB1.2', 'Sector quality, safety, and regulatory judgement', 'Escalation and exception handling', 'If Other, please specify below'],
  yesPartlyNo: ['Yes', 'Partly', 'No'],
  employees: ['Less than 100', '100 - 500', '500 - 2,000', '2,000 - 10,000', '10,000 - 1 lakh', 'More than 1 lakh', 'Not Applicable'],
  sectors: ['Agriculture', 'Apparel', 'Automotive', 'Aerospace & Aviation', 'Beauty & Wellness', 'BFSI', 'Capital Goods', 'Construction', 'Electronics', 'Food Processing', 'Furniture & Fittings', 'Gems & Jewellery', 'Green Jobs', 'Handicrafts & Carpets', 'Healthcare', 'Hydrocarbon', 'Infrastructure Equipment', 'Instrumentation, Automation & Surveillance', 'Iron & Steel', 'IT-ITeS', 'Leather', 'Life Sciences', 'Logistics', 'Management & Entrepreneurship', 'Media & Entertainment', 'Mining', 'Paints & Coatings', 'Plumbing', 'Power', 'Retail', 'Rubber, Chemical & Petrochemical', 'Security', 'Sports, PE & Fitness', 'Telecom', 'Textiles', 'Tourism & Hospitality']
};

/* ----- Midpoint / scoring maps (Excel "Lookups" sheet) ----- */
AIKPI.MAP = {
  wfAffected: { 'Less than 10': 5, '10 to 25': 17.5, '26 to 50': 38, 'Greater than 50': 65 },
  firmsAdopt: { 'Fewer than 10': 5, '10 - 50': 30, '50 - 200': 125, '200 - 1,000': 600, 'Over 1,000': 1500 },
  workerProp: { '0 - 5%': 2.5, '6 - 20%': 13, '21 - 40%': 30.5, '41 - 60%': 50.5, 'More than 60%': 70 },
  invest: { 'Less than 1%': 0.5, '1 - 3%': 2, '3 - 5%': 4, '5 - 10%': 7.5, 'More than 10%': 12 },
  trained: { 'None': 0, 'Less than 10%': 5, '10 - 25%': 17.5, '26 - 50%': 38, 'More than 50%': 60 },
  headChange: { 'Increased more than 20%': 25, 'Increased 5 - 20%': 12.5, 'No change': 0, 'Decreased 5 - 20%': -12.5, 'Decreased more than 20%': -25 },
  incDecNo: { 'Increased': 1, 'Decreased': -1, 'No change': 0 },
  fewMost: { 'Few': 0.1, 'Some': 0.3, 'Many': 0.6, 'Most': 0.85 },
  incNoDec: { 'Increase': 1, 'No change': 0, 'Decrease': -1 },
  fails: { 'Yes - fails without it': 1, 'Partially': 0.5, 'No - works regardless': 0 },
  life: { 'Under 1 year': 0.5, '1 to 3 years': 2, '3 to 5 years': 4, 'Over 5 years': 6 },
  bear: { 'Less than 25%': 12.5, '25 - 50%': 37.5, '51 - 75%': 63, 'More than 75%': 85 },
  premium: { 'Yes, significant premium (more than 20%)': 25, 'Yes, moderate premium (10 - 20%)': 15, 'Yes, small premium (less than 10%)': 5, 'No observable premium': 0 },
  inPlace: { 'Fully in place': 1, 'Partially in place': 0.5, 'Not in place': 0 },
  gap: { 'No Gap': 0, 'Minor gap': 0.5, 'Critical Gap': 1 },
  importance: { 'Increasing': 1, 'Stable': 0, 'Declining': -1 },
  employees: { 'Less than 100': 50, '100 - 500': 300, '500 - 2,000': 1250, '2,000 - 10,000': 6000, '10,000 - 1 lakh': 55000, 'More than 1 lakh': 150000 }
};

/* ----- Section metadata ----- */
AIKPI.SECTIONS = [
  { key: 'overview', label: 'Overview', icon: 'grid' },
  { key: 'AD', label: 'AI Adoption', icon: 'cpu', blurb: 'Incidence, depth and velocity of AI in the sector (Sections A, B, D).' },
  { key: 'WF', label: 'Workforce Impact', icon: 'users', blurb: 'Transmission to headcount, roles, skills and work organisation (Section C).' },
  { key: 'TN', label: 'Training Needs', icon: 'book', blurb: 'The demand tests, training-system readiness and skill transition (Sections D.3, E, F, H).' },
  { key: 'FN', label: 'Financing', icon: 'coins', blurb: 'Sponsor, wage premium, financing models, cost and outcome measurement (Sections E.4, G).' }
];
