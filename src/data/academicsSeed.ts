import type {
  AcademicsData, GradPlan, PlannedCourse, PlanSemester, Requirement, TranscriptTerm,
} from '../types';

/**
 * Everything here is seeded from the UC Berkeley Academic Progress Report
 * (SAA_STD_DS.pdf, run 08/19/2026) for the Data Science BA, requirement term
 * 2024 Fall.
 *
 * The transcript and the requirement baselines are the *record* — they only
 * change when a new APR is run. The three plans are scaffolding: filler courses
 * that make the arithmetic work, meant to be edited.
 */

export const APR_DATE = '08/19/2026';

// ── The record so far ───────────────────────────────────────
export const TRANSCRIPT: TranscriptTerm[] = [
  {
    id: 'ap',
    label: 'Exam credit',
    courses: [
      { code: 'AP CMPSCA', title: 'Computer Science A',            units: 5.36, grade: 'CR', type: 'TE' },
      { code: 'AP CMPSCP', title: 'Computer Science Principles',   units: 5.36, grade: 'CR', type: 'TE' },
      { code: 'AP ENGCL',  title: 'English Lit & Composition',     units: 5.36, grade: 'CR', type: 'TE' },
      { code: 'AP ENGLNG', title: 'English Language',              units: 5.36, grade: 'CR', type: 'TE' },
      { code: 'AP EURHST', title: 'European History',              units: 5.36, grade: 'CR', type: 'TE' },
      { code: 'AP MATHAB', title: 'Calculus AB',                   units: 2.68, grade: 'CR', type: 'TE' },
      { code: 'AP STAT',   title: 'Statistics',                    units: 2.68, grade: 'CR', type: 'TE' },
      { code: 'AP USGVPL', title: 'US Government & Politics',      units: 2.68, grade: 'CR', type: 'TE' },
      { code: 'AP USHST',  title: 'US History',                    units: 5.36, grade: 'CR', type: 'TE' },
    ],
  },
  {
    id: 'fa24',
    label: 'Fall 2024',
    courses: [
      { code: 'DATA C8',   title: 'Foundations of Data Science',   units: 4, grade: 'B+', type: 'EN' },
      { code: 'DATA C88C', title: 'Computational Structures in DS',units: 3, grade: 'B+', type: 'EN' },
      { code: 'MATH 56',   title: 'Linear Algebra',                units: 4, grade: 'B-', type: 'EN' },
      { code: 'VIETNMS 1A',title: 'Introductory Vietnamese',       units: 5, grade: 'B+', type: 'EN' },
    ],
  },
  {
    id: 'sp25',
    label: 'Spring 2025',
    courses: [
      { code: 'COMPSCI 61B', title: 'Data Structures',             units: 4, grade: 'B+', type: 'EN' },
      { code: 'DATA C100',   title: 'Principles & Techniques of DS',units: 4, grade: 'B+', type: 'EN' },
      { code: 'FILM R1B',    title: 'Writing — Film Focus',        units: 4, grade: 'A',  type: 'EN' },
      { code: 'INTEGBI 35AC',title: 'Human Biological Variation',  units: 4, grade: 'A',  type: 'EN' },
    ],
  },
  {
    id: 'su25',
    label: 'Summer 2025',
    courses: [
      { code: 'COMPSCI 70', title: 'Discrete Math & Probability',  units: 4, grade: 'W', type: 'EN' },
    ],
  },
  {
    id: 'fa25',
    label: 'Fall 2025',
    courses: [
      { code: 'MATH 1B',      title: 'Calculus',                   units: 5, grade: 'TB', type: 'TR' },
      { code: 'COMPSCI 198',  title: 'Directed Group Study',       units: 2, grade: 'P',  type: 'EN' },
      { code: 'DATA C104',    title: 'Human Contexts & Ethics of Data', units: 4, grade: 'A-', type: 'EN' },
      { code: 'MATH 53',      title: 'Multivariable Calculus',     units: 4, grade: 'C',  type: 'EN' },
      { code: 'MUSIC 26AC',   title: 'Music in American Culture',  units: 4, grade: 'B+', type: 'EN' },
    ],
  },
  {
    id: 'sp26',
    label: 'Spring 2026',
    courses: [
      { code: 'ASTRON C12',  title: 'The Planets',                 units: 3, grade: 'A-', type: 'EN' },
      { code: 'COMPSCI 70',  title: 'Discrete Math & Probability', units: 4, grade: 'C+', type: 'EN' },
      { code: 'COMPSCI 189', title: 'Introduction to Machine Learning', units: 4, grade: 'P', type: 'EN' },
      { code: 'COMPSCI 194', title: 'Special Topics',              units: 1, grade: 'F',  type: 'EN' },
    ],
  },
  {
    id: 'fa26',
    label: 'Fall 2026 · in progress',
    courses: [
      { code: 'ENGIN 183', title: 'Special Topics: Tech Innovation & Entrepreneurship', units: 3, grade: 'IP', type: 'IP' },
    ],
  },
];

// ── What's left, straight off the APR ───────────────────────
export const REQUIREMENTS: Requirement[] = [
  {
    id: 'depth', group: 'Data Science BA · Upper Division',
    label: 'Computational & Inferential Depth',
    mode: 'tag', doneCourses: 0, doneUnits: 0, needCourses: 2, needUnits: 7,
    options: 'CS 161/162/164/168/169/170/186/188, DATA C101/C146/144, ECON 140, ECON 141, EECS 127, INDENG 160/162/164/165/166, INFO 154/159, STAT 135/151A/152/153/157/158/159, UGBA 142 (+ more — see APR)',
  },
  {
    id: 'prob', group: 'Data Science BA · Upper Division',
    label: 'Probability',
    mode: 'tag', doneCourses: 0, doneUnits: 0, needCourses: 1, needUnits: 0,
    options: 'DATA C140, EECS 126, INDENG 172, MATH 106, STAT C140, STAT 134',
  },
  {
    id: 'mldm', group: 'Data Science BA · Upper Division',
    label: 'Modeling, Learning & Decision-Making',
    mode: 'tag', doneCourses: 0, doneUnits: 0, needCourses: 1, needUnits: 0,
    options: 'CS C182, CS 189, DATA C102, DATA C182, INDENG 142/142A, STAT C102, STAT 154',
    note: 'CS 189 was taken P/NP in Spring 2026, so it does not count here — this requirement needs a letter grade. Retake it graded or use another course from the list.',
  },
  {
    id: 'domain-ld', group: 'Domain Emphasis · Econ / Business',
    label: 'Lower division emphasis course',
    mode: 'tag', doneCourses: 0, doneUnits: 0, needCourses: 1, needUnits: 0,
    options: 'Economics: ECON 1 or ECON 2 · Business: UGBA 10',
    note: 'The APR still says "Domain Emphasis not selected" — declare Econ or Business with your CDSS advisor so the APR starts checking these off.',
  },
  {
    id: 'domain-ud', group: 'Domain Emphasis · Econ / Business',
    label: 'Upper division emphasis courses',
    mode: 'tag', doneCourses: 0, doneUnits: 0, needCourses: 2, needUnits: 0,
    options: 'Econ: ECON 100A/100B, 136, 140, 141, 148 · Business: UGBA 103, 131, 143, 147',
    note: 'ECON 140 / 141 double count as Computational & Inferential Depth — the cheapest way to close both requirements.',
  },
  {
    id: 'udmajor', group: 'Data Science BA · Units',
    label: 'Upper division units in the major',
    mode: 'udMajorUnits', doneCourses: 0, doneUnits: 8, needCourses: 0, needUnits: 28,
    note: 'Tag a course "major" when it is an upper division course required by the major.',
  },
  {
    id: 'breadth-intl', group: 'Seven-Course Breadth',
    label: 'International Studies',
    mode: 'tag', doneCourses: 0, doneUnits: 0, needCourses: 1, needUnits: 0,
  },
  {
    id: 'breadth-hist', group: 'Seven-Course Breadth',
    label: 'Historical Studies',
    mode: 'tag', doneCourses: 0, doneUnits: 0, needCourses: 1, needUnits: 0,
  },
  {
    id: 'breadth-soc', group: 'Seven-Course Breadth',
    label: 'Social & Behavioral Sciences',
    mode: 'tag', doneCourses: 0, doneUnits: 0, needCourses: 1, needUnits: 0,
    note: 'ECON 1 clears this and the lower division emphasis course at the same time.',
  },
  {
    id: 'ud36', group: 'College & Campus',
    label: 'CDSS 36 upper division units',
    mode: 'udUnits', doneCourses: 0, doneUnits: 17, needCourses: 0, needUnits: 36,
  },
  {
    id: 'units120', group: 'College & Campus',
    label: 'Minimum total units',
    mode: 'allUnits', doneCourses: 0, doneUnits: 99.84, needCourses: 0, needUnits: 120,
  },
  {
    id: 'residence24', group: 'College & Campus',
    label: 'Senior residence — units',
    mode: 'residence', doneCourses: 0, doneUnits: 9.84, needCourses: 0, needUnits: 24,
    note: 'Units earned at Berkeley after 90 units. Study abroad and UCEAP terms do not count.',
  },
  {
    id: 'terms-res', group: 'College & Campus',
    label: 'Senior residence — terms',
    mode: 'terms', doneCourses: 0, doneUnits: 6, needCourses: 2, needUnits: 6,
    note: 'Two terms of at least 6 graded units after 90 units. Counts semesters in this plan carrying 6+ units.',
  },
];

/** Requirements the APR already marks Satisfied — kept for reassurance only. */
export const SATISFIED_REQS: string[] = [
  'Entry Level Writing (AP)',
  'American History & Institutions (AP)',
  'American Cultures — INTEGBI 35AC',
  'Reading & Composition A (AP) and B — FILM R1B',
  'Essential Skills: Computational / Statistical Reasoning, Human & Social Dynamics',
  'Breadth: Physical Sciences — ASTRON C12',
  'Breadth: Biological Sciences — INTEGBI 35AC',
  'Breadth: Philosophy & Values — DATA C104',
  'Breadth: Arts & Literature — MUSIC 26AC',
  'Major lower division: DATA C8, DATA C88C, MATH 56, CS 61B, MATH 1B, calculus exam credit',
  'Major upper division: Principles of Data Science — DATA C100',
  'Major upper division: Human Contexts & Ethics — DATA C104',
  'P/NP limit · cumulative GPA · major GPA (3.265) · upper division major GPA (3.50)',
];

// ── Filler courses used to scaffold the three plans ─────────
let seq = 0;
const c = (
  code: string, title: string, units: number, reqs: string[], extra: Partial<PlannedCourse> = {},
): PlannedCourse => ({
  id: `ac${++seq}`, code, title, units, status: 'planned', reqs, ...extra,
});

const engin183 = () => c('ENGIN 183', 'Special Topics: Tech Innovation & Entrepreneurship', 3, [], {
  status: 'enrolled', banked: true, note: 'Already on the APR as in progress.',
});
const econ1    = () => c('ECON 1', 'Introduction to Economics', 4, ['domain-ld', 'breadth-soc']);
const stat134  = () => c('STAT 134', 'Concepts of Probability', 4, ['prob', 'major'], {
  note: 'Swap for DATA C140 / EECS 126 if the schedule fits better.',
});
const econ140  = () => c('ECON 140', 'Economic Statistics & Econometrics', 4, ['depth', 'domain-ud', 'major']);
const econ141  = () => c('ECON 141', 'Econometric Analysis', 4, ['depth', 'domain-ud', 'major']);
const data102  = () => c('DATA C102', 'Data, Inference, and Decisions', 4, ['mldm', 'major'], {
  note: 'Or retake CS 189 for a letter grade.',
});
const cs188    = () => c('COMPSCI 188', 'Artificial Intelligence', 4, ['depth', 'major'], {
  note: 'ML/AI elective that also feeds upper division major units.',
});
const histBr   = () => c('HISTORY —', 'Historical Studies breadth — pick one', 4, ['breadth-hist']);
const intlBr   = () => c('POLSCI / IAS —', 'International Studies breadth — pick one', 4, ['breadth-intl']);

const term = (
  id: string, season: PlanSemester['season'], year: number, courses: PlannedCourse[],
  extra: Partial<PlanSemester> = {},
): PlanSemester => ({ id, season, year, kind: 'term', courses, ...extra });

const backlog = (courses: PlannedCourse[] = []): PlanSemester => ({
  id: 'backlog', season: 'Fall', year: 0, kind: 'backlog', courses,
  note: 'Candidates you have not scheduled yet. Nothing here counts toward a requirement.',
});

// ── The three plans ─────────────────────────────────────────
export function seedPlans(): GradPlan[] {
  return [
    {
      id: 'planA',
      name: 'Sprint',
      gradTerm: 'Spring 2027',
      unitCap: 8,
      blurb:
        'Finish in two more semesters. The 20 units still needed for the degree — plus 20 upper division units inside the major — only fit at ~15–16 units per term, so this plan blows straight through the 8-unit cap and leaves no room for an internship term. Keep it as the stretch case.',
      semesters: [
        term('a-fa26', 'Fall', 2026, [engin183(), econ1(), stat134(), histBr()]),
        term('a-sp27', 'Spring', 2027, [econ140(), econ141(), data102(), cs188()]),
        backlog([intlBr()]),
      ],
    },
    {
      id: 'planB',
      name: 'Balanced',
      gradTerm: 'Spring 2028',
      unitCap: 8,
      blurb:
        'Four teaching terms at or under 8 units, with summer 2027 free for an internship plus one summer-session course. Everything left closes out by spring 2028.',
      semesters: [
        term('b-fa26', 'Fall', 2026, [engin183(), econ1()]),
        term('b-sp27', 'Spring', 2027, [stat134(), econ140()]),
        {
          id: 'b-su27', season: 'Summer', year: 2027, kind: 'internship',
          note: 'Internship + one summer session course.',
          courses: [intlBr()],
        },
        term('b-fa27', 'Fall', 2027, [econ141(), data102()]),
        term('b-sp28', 'Spring', 2028, [cs188(), histBr()]),
        backlog(),
      ],
    },
    {
      id: 'planC',
      name: 'Internship-first',
      gradTerm: 'Fall 2028',
      unitCap: 8,
      blurb:
        'Two internship summers and a deliberately light spring 2028 so a co-op or a return offer can take priority. Same coursework as the balanced plan, spread over five teaching terms.',
      semesters: [
        term('c-fa26', 'Fall', 2026, [engin183(), econ1()]),
        term('c-sp27', 'Spring', 2027, [stat134(), histBr()]),
        {
          id: 'c-su27', season: 'Summer', year: 2027, kind: 'internship',
          note: 'Full-time internship, no coursework.', courses: [],
        },
        term('c-fa27', 'Fall', 2027, [econ140(), intlBr()]),
        term('c-sp28', 'Spring', 2028, [data102()], {
          unitCap: 4, note: 'Light term — part-time co-op alongside one course.',
        }),
        {
          id: 'c-su28', season: 'Summer', year: 2028, kind: 'internship',
          note: 'Second internship / return offer.', courses: [],
        },
        term('c-fa28', 'Fall', 2028, [econ141(), cs188()]),
        backlog(),
      ],
    },
  ];
}

export function seedAcademics(): AcademicsData {
  return { plans: seedPlans(), activePlanId: 'planB' };
}
