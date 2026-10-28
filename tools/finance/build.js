// Builds the Finance *.dc.html screens from the templates in this folder.
// Each template uses placeholders that this script fills in:
//   /*@SHARED*/          shared sample data + helpers (same in every screen)
//   <!--@HEAD title-->   page head + helmet
//   <!--@NAV file-->     the Finance sidebar with `file` marked active
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];

// ---- Sample data: a 2026 household / executive office budget, today = 20 Oct 2026 ----
const cats = [
  { id: 'staff', name: 'Staff salaries', ini: 'ST', alloc: [11400, 11400, 11400, 11400, 11400, 11400, 17400, 11400, 11400, 11400, 11400, 11400], f: [1, 1, 1, 1, 1, 1, 1, 1, 1] },
  { id: 'util', name: 'Utilities', ini: 'UT', alloc: [3600, 3400, 3500, 3800, 4600, 5400, 5900, 6000, 5200, 4200, 3700, 3600], f: [0.97, 1.02, 0.95, 1.04, 1.08, 1.11, 1.06, 1.09, 1.03] },
  { id: 'veh', name: 'Vehicles', ini: 'VH', alloc: [5800, 5800, 5800, 5800, 5800, 5800, 5800, 5800, 5800, 5800, 9800, 5800], f: [0.92, 1.05, 1.0, 0.88, 1.12, 0.97, 1.04, 0.95, 1.1] },
  { id: 'home', name: 'Household', ini: 'HH', alloc: [6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 8000], f: [1.05, 0.9, 1.15, 0.98, 1.02, 0.94, 0.85, 0.9, 1.08] },
  { id: 'travel', name: 'Travel', ini: 'TR', alloc: [6000, 4000, 9000, 5000, 4000, 12000, 15000, 8000, 6000, 9000, 5000, 14000], f: [0.8, 1.1, 1.25, 0.6, 0.9, 1.05, 1.18, 0.7, 1.3] },
  { id: 'gov', name: 'Visas & govt fees', ini: 'GF', alloc: [1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 6500, 1500, 1500], f: [1.2, 0.6, 0.9, 1.4, 0.8, 1.0, 0.7, 1.1, 0.9] },
  { id: 'hosp', name: 'Hospitality', ini: 'HS', alloc: [2500, 2500, 4000, 2500, 2500, 2500, 1500, 1500, 2500, 3000, 3000, 5000], f: [0.9, 1.1, 1.3, 0.8, 1.0, 0.7, 0.6, 1.2, 0.9] }
].map((c) => ({ id: c.id, name: c.name, ini: c.ini, alloc: c.alloc, spent: c.f.map((x, i) => Math.round((c.alloc[i] * x) / 10) * 10) }));

// October transactions so far (month index 9). Oct spend per category comes from these.
const T = (id, d, desc, cat, payee, method, amount, type, receipt, by) => ({ id, m: 9, d, desc, cat, payee, method, amount, type, receipt, by });
const txns = [
  T('t19', 19, 'Airport transfer – Riyadh return', 'travel', 'Careem', 'Card ••4417', 180, 'One-off', false, 'Fatima Noor'),
  T('t18', 18, 'AC repair – master bedroom', 'home', 'CoolTech Services', 'Bank transfer', 750, 'One-off', true, 'Fatima Noor'),
  T('t17', 17, 'Petrol – Nissan Patrol', 'veh', 'ADNOC', 'Fuel card', 380, 'One-off', true, 'Ravi Kumar'),
  T('t16', 16, 'Cleaning supplies', 'home', 'Spinneys', 'Petty cash', 310, 'One-off', true, 'Maria Santos'),
  T('t15', 14, 'Groceries', 'home', 'Spinneys', 'Card ••4417', 980, 'One-off', true, 'Maria Santos'),
  T('t14', 14, 'Etisalat – Mobiles', 'util', 'Etisalat', 'Autopay', 650, 'Recurring', true, 'Fatima Noor'),
  T('t13', 12, 'Business dinner – Northgate', 'hosp', 'Zuma DIFC', 'Card ••4417', 1500, 'One-off', false, 'Fatima Noor'),
  T('t12', 11, 'OSN+ subscription', 'util', 'OSN', 'Autopay', 55, 'Recurring', true, 'Fatima Noor'),
  T('t11', 10, 'Pool maintenance', 'home', 'BlueWave Pools', 'Petty cash', 450, 'Recurring', false, 'Maria Santos'),
  T('t10', 9, 'Salik top-up', 'veh', 'RTA Salik', 'Card ••4417', 200, 'One-off', true, 'Ravi Kumar'),
  T('t09', 8, 'Flights DXB–RUH', 'travel', 'Emirates', 'Card ••4417', 2950, 'One-off', true, 'Fatima Noor'),
  T('t08', 8, 'Hotel – Riyadh trip', 'travel', 'Four Seasons Riyadh', 'Card ••4417', 4600, 'One-off', true, 'Fatima Noor'),
  T('t07', 6, 'Emirates ID renewal – Ravi Kumar', 'gov', 'ICP', 'Card ••4417', 1870, 'One-off', true, 'Fatima Noor'),
  T('t06', 5, 'Residence visa renewal – Ravi Kumar', 'gov', 'GDRFA Dubai', 'Card ••4417', 3850, 'One-off', true, 'Fatima Noor'),
  T('t05', 3, 'Petrol – Land Cruiser', 'veh', 'ENOC', 'Fuel card', 420, 'One-off', true, 'Ravi Kumar'),
  T('t04', 2, 'Groceries', 'home', 'Carrefour', 'Card ••4417', 1245, 'One-off', true, 'Maria Santos'),
  T('t03', 1, 'Car lease – Nissan Patrol', 'veh', 'Al Futtaim Leasing', 'Autopay', 3200, 'Recurring', true, 'Fatima Noor')
];

// Who (person) and what (object) each expense was for, so transactions can be filtered by them.
const persons = [
  { id: 'ceo', name: 'CEO' }, { id: 'ravi', name: 'Ravi Kumar' }, { id: 'maria', name: 'Maria Santos' },
  { id: 'joseph', name: 'Joseph Mathew' }, { id: 'ahmed', name: 'Ahmed Hassan' }
];
const objects = [
  { id: 'lc', name: 'Land Cruiser' }, { id: 'patrol', name: 'Nissan Patrol' }, { id: 'merc', name: 'Mercedes S 500' },
  { id: 'villa', name: 'Villa' }, { id: 'apt', name: 'Jumeirah apartment' }
];
const tags = {
  t19: ['ceo', ''], t18: ['', 'villa'], t17: ['', 'patrol'], t16: ['', 'villa'], t15: ['', 'villa'], t14: ['', ''], t13: ['ceo', ''],
  t12: ['', 'villa'], t11: ['', 'villa'], t10: ['', 'lc'], t09: ['ceo', ''], t08: ['ceo', ''], t07: ['ravi', ''], t06: ['ravi', ''],
  t05: ['', 'lc'], t04: ['', 'villa'], t03: ['', 'patrol']
};
txns.forEach((t) => { t.p = tags[t.id][0]; t.o = tags[t.id][1]; });

// Jan–Sep history: each category's monthly spend split into realistic transactions that add up exactly.
const history = [];
let hn = 0;
const H = (m, d, desc, cat, payee, method, amount, type, p, o) =>
  history.push({ id: 'h' + (++hn), m, d, desc, cat, payee, method, amount, type, receipt: true, by: 'Fatima Noor', p, o });
const split = (total, parts) => {
  // Split `total` by the given shares, rounded to 5, with the remainder on the last part.
  const out = []; let left = total;
  parts.forEach((share, i) => { const v = i === parts.length - 1 ? left : Math.round((total * share) / 5) * 5; out.push(v); left -= v; });
  return out;
};
const govPeople = ['maria', 'joseph', 'ahmed', 'ceo', 'ravi', 'maria', 'joseph', 'ahmed', 'ceo'];
const pname = (id) => persons.find((x) => x.id === id).name;
for (let m = 0; m < 9; m++) {
  const sp = (id) => cats.find((c) => c.id === id).spent[m];
  // Staff: one salary per person, plus annual leave tickets in July.
  [['ravi', 3500], ['maria', 2500], ['joseph', 2800], ['ahmed', 2600]].forEach(([p, a]) => H(m, 28, 'Salary – ' + pname(p), 'staff', 'WPS payroll', 'Bank transfer', a, 'Recurring', p, ''));
  if (sp('staff') > 11400) H(m, 12, 'Annual leave flight – Ravi Kumar', 'staff', 'Emirates', 'Card ••4417', sp('staff') - 11400, 'One-off', 'ravi', '');
  // Utilities: fixed bills, DEWA takes the rest.
  const fixed = [['du – Internet and TV', 'du', 399, 18], ['Empower – Chiller', 'Empower', 720, 28], ['Etisalat – Mobiles', 'Etisalat', 650, 14], ['OSN+ subscription', 'OSN', 55, 11]];
  fixed.forEach(([desc, payee, a, d]) => H(m, d, desc, 'util', payee, desc.startsWith('du') ? 'Card ••4417' : 'Autopay', a, 'Recurring', '', desc.startsWith('Etisalat') ? '' : 'villa'));
  H(m, 22, 'DEWA – Villa', 'util', 'DEWA', 'Bank transfer', sp('util') - 1824, 'Recurring', '', 'villa');
  // Vehicles: Patrol lease, then fuel and Salik.
  H(m, 1, 'Car lease – Nissan Patrol', 'veh', 'Al Futtaim Leasing', 'Autopay', 3200, 'Recurring', '', 'patrol');
  const v = split(sp('veh') - 3200, [0.4, 0.25, 0.2, 0.15]);
  H(m, 6, 'Petrol – Land Cruiser', 'veh', 'ENOC', 'Fuel card', v[0], 'One-off', '', 'lc');
  H(m, 13, 'Petrol – Nissan Patrol', 'veh', 'ADNOC', 'Fuel card', v[1], 'One-off', '', 'patrol');
  H(m, 19, 'Petrol – Mercedes S 500', 'veh', 'ENOC', 'Fuel card', v[2], 'One-off', '', 'merc');
  H(m, 9, 'Salik top-up', 'veh', 'RTA Salik', 'Card ••4417', v[3], 'One-off', '', 'lc');
  // Household: pool, groceries, maintenance (the apartment gets an AC service in Mar and Jul).
  const aptJob = m === 2 || m === 6 ? 600 : 0;
  const hh = split(sp('home') - 450 - aptJob, [0.6, 0.25, 0.15]);
  H(m, 10, 'Pool maintenance', 'home', 'BlueWave Pools', 'Petty cash', 450, 'Recurring', '', 'villa');
  H(m, 3, 'Groceries', 'home', 'Carrefour', 'Card ••4417', hh[0], 'One-off', '', 'villa');
  H(m, 16, 'Groceries', 'home', 'Spinneys', 'Card ••4417', hh[1], 'One-off', '', 'villa');
  H(m, 24, 'Villa maintenance', 'home', 'FixIt Home Services', 'Bank transfer', hh[2], 'One-off', '', 'villa');
  if (aptJob) H(m, 20, 'AC service – apartment', 'home', 'CoolTech Services', 'Bank transfer', aptJob, 'One-off', '', 'apt');
  // Travel, government fees, hospitality.
  const tr = split(sp('travel'), [0.45, 0.55]);
  H(m, 7, 'Flights – CEO trip', 'travel', 'Emirates', 'Card ••4417', tr[0], 'One-off', 'ceo', '');
  H(m, 8, 'Hotel – CEO trip', 'travel', 'Marriott Bonvoy', 'Card ••4417', tr[1], 'One-off', 'ceo', '');
  H(m, 15, 'Visa and medical – ' + pname(govPeople[m]), 'gov', 'GDRFA Dubai', 'Card ••4417', sp('gov'), 'One-off', govPeople[m], '');
  H(m, 21, 'Business dinner', 'hosp', 'Zuma DIFC', 'Card ••4417', sp('hosp'), 'One-off', 'ceo', '');
}
// Sanity check: history adds up to each category's monthly spend.
cats.forEach((c) => c.spent.forEach((s, m) => {
  const got = history.filter((h) => h.cat === c.id && h.m === m).reduce((a, h) => a + h.amount, 0);
  if (got !== s || history.some((h) => h.amount <= 0)) throw new Error('history mismatch ' + c.id + ' ' + m + ' ' + got + ' vs ' + s);
}));

// Recurring payments: next due date (month index, day), amount, how it is paid.
const R = (id, name, cat, freq, m, d, amount, method, autopay, note) => ({ id, name, cat, freq, m, d, amount, method, autopay, note });
const recurring = [
  R('r1', 'du – Internet and TV', 'util', 'Monthly', 9, 18, 399, 'Card ••4417', false, 'Account 0400••••88'),
  R('r2', 'Fuel card top-up', 'veh', 'Monthly', 9, 20, 800, 'Bank transfer', false, 'ADNOC fleet card'),
  R('r3', 'DEWA – Villa', 'util', 'Monthly', 9, 22, 1840, 'Bank transfer', false, 'Amount changes each month'),
  R('r4', 'Staff salaries (4 people)', 'staff', 'Monthly', 9, 28, 11400, 'Bank transfer (WPS)', false, 'Ravi, Maria, Joseph, Ahmed'),
  R('r5', 'Empower – Chiller', 'util', 'Monthly', 9, 28, 720, 'Bank transfer', false, 'Account EMP-••••-311'),
  R('r6', 'Car lease – Nissan Patrol', 'veh', 'Monthly', 10, 1, 3200, 'Autopay', true, 'Lease ends 31 Aug 2027'),
  R('r7', 'Pool maintenance', 'home', 'Monthly', 10, 10, 450, 'Petty cash', false, 'BlueWave Pools'),
  R('r8', 'OSN+ subscription', 'util', 'Monthly', 10, 11, 55, 'Autopay', true, ''),
  R('r9', 'Etisalat – Mobiles', 'util', 'Monthly', 10, 14, 650, 'Autopay', true, '3 lines'),
  R('r10', 'Insurance and registration – Land Cruiser', 'veh', 'Yearly', 10, 14, 5600, 'Card ••4417', false, 'Dubai A 12345')
];

// Income: each expected receipt with what actually came in.
const sources = [
  { id: 'allow', name: 'Monthly allowance', from: 'Holding company', ini: 'MA' },
  { id: 'rent', name: 'Rental income – Jumeirah apartment', from: 'Tenant: Khalid Saeed', ini: 'RI' },
  { id: 'div', name: 'Dividends – Northgate fund', from: 'Northgate Capital', ini: 'DV' },
  { id: 'reimb', name: 'Travel reimbursements', from: 'Holding company', ini: 'TR' }
];
const income = [];
for (let m = 0; m < 12; m++) income.push({ id: 'a' + m, src: 'allow', m, d: 25, expected: 42000, received: m < 9 ? 42000 : null, ref: 'Bank transfer' });
[[0, 30000], [3, 30000], [6, 30000], [9, null]].forEach(([m, r]) => income.push({ id: 'rent' + m, src: 'rent', m, d: 15, expected: 30000, received: r, ref: 'Cheque' }));
[[2, 18000], [5, 17200], [8, 16500], [11, null]].forEach(([m, r]) => income.push({ id: 'div' + m, src: 'div', m, d: 30, expected: 18000, received: r, ref: 'Bank transfer' }));
[[1, 3000, 3000, 'Jan trip'], [2, 6000, 4800, 'London trip'], [5, 5000, 5000, 'Paris trip'], [6, 8000, 6200, 'Summer trips'], [9, 4500, null, 'Riyadh – Sep claim'], [10, 7600, null, 'Riyadh – Oct claim']]
  .forEach(([m, e, r, ref], i) => income.push({ id: 'rb' + i, src: 'reimb', m, d: m === 9 ? 15 : 10, expected: e, received: r, ref }));

const FIN = { year: 2026, budget: 500000, today: { m: 9, d: 20 }, cats, txns, history, persons, objects, recurring, sources, income };

const SHARED = `const FIN = ${JSON.stringify(FIN)};
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const aed = (n) => (n < 0 ? '−' : '') + 'AED ' + Math.abs(Math.round(n)).toLocaleString('en-US');
    const num = (n) => Math.abs(Math.round(n)).toLocaleString('en-US');
    const kfmt = (n) => (Math.abs(n) >= 1000 ? (Math.round(Math.abs(n) / 100) / 10).toLocaleString('en-US') + 'k' : String(Math.round(Math.abs(n))));
    const sum = (a) => a.reduce((x, y) => x + (y || 0), 0);
    const tone = { bad: ['#FDE7E1', '#9A3412'], warn: ['#FDF0DC', '#8A4B08'], soon: ['#E3EAF7', '#1E3A8A'], ok: ['#DDF1EE', '#0B5C55'], none: ['#EEF0F3', '#3D4654'] };
    const daysTo = (m, d) => Math.round((new Date(FIN.year, m, d) - new Date(FIN.year, FIN.today.m, FIN.today.d)) / 86400000);
    const dateText = (m, d) => d + ' ' + MON[m];
    const catOf = (id) => FIN.cats.find((c) => c.id === id) || { name: 'Other', ini: '··' };
    const catColor = { staff: ['#E8E4F5', '#3F2F8F'], util: ['#E3EAF7', '#1E3A8A'], veh: ['#FDF0DC', '#8A4B08'], home: ['#DDF1EE', '#0B5C55'], travel: ['#FDE7E1', '#9A3412'], gov: ['#EEF0F3', '#3D4654'], hosp: ['#F6E7F0', '#7A1F57'] };
    const chipOf = (on) => ({ on, bg: on ? '#14213D' : '#FFFFFF', fg: on ? '#FFFFFF' : '#14213D', border: on ? '#14213D' : '#D9D5CB' });
    // Spend per category for a month: Jan–Sep from history, Oct (current) from transactions.
    const spentOf = (cat, m, txns) => (m < FIN.today.m ? cat.spent[m] : m === FIN.today.m ? sum((txns || FIN.txns).filter((t) => t.cat === cat.id && t.m === m).map((t) => t.amount)) : 0);
    // Variance = allocated − spent: positive is under budget, negative is over.
    const varText = (v) => (Math.round(v) === 0 ? 'On budget' : v > 0 ? 'Under ' + aed(v) : 'Over ' + aed(-v));
    const varTone = (v) => (v < 0 ? tone.bad : tone.ok);
    // Filter bar: a row of dropdowns, each a checklist with counts. defs: { key, label, options: [{ v, label } | { head }], test(row, sel), single, def }.
    const filterBar = (rows, fb, openKey, setFb, setOpen, defs) => {
      const passes = (r, skip) => defs.every((d) => d.key === skip || d.test(r, fb[d.key]));
      const filtered = rows.filter((r) => passes(r));
      const items = defs.map((d) => {
        const sel = fb[d.key], isOpen = openKey === d.key;
        const base = isOpen ? rows.filter((r) => passes(r, d.key)) : [];
        const opts = !isOpen ? [] : d.options.map((o) => {
          if (o.head) return { isHead: true, isOpt: false, label: o.head };
          const checked = d.single ? sel === o.v : sel.includes(o.v);
          const n = base.filter((r) => d.test(r, d.single ? o.v : [o.v])).length;
          return { isHead: false, isOpt: true, label: o.label, count: n, checked, fg: n || checked ? '#14213D' : '#9AA3AF',
            boxBg: checked ? '#0F766E' : '#FFFFFF', boxBorder: checked ? '#0F766E' : '#9AA3AF', radius: d.single ? '9px' : '5px',
            toggle: () => setFb({ [d.key]: d.single ? o.v : checked ? sel.filter((x) => x !== o.v) : [...sel, o.v] }, d.single) };
        });
        const active = d.single ? sel !== d.def : sel.length > 0;
        const name = (v) => (d.options.find((o) => o.v === v) || {}).label;
        const text = d.single ? (active ? name(sel) : d.label) : sel.length === 0 ? d.label : sel.length === 1 ? name(sel[0]) : d.label + ' · ' + sel.length;
        return { text, open: isOpen, active, bg: active ? '#E6F2F0' : '#FFFFFF', fg: active ? '#0B5C55' : '#14213D', border: active ? '#0F766E' : '#D9D5CB',
          toggle: () => setOpen(isOpen ? null : d.key), close: () => setOpen(null), multi: !d.single,
          clear: () => setFb({ [d.key]: d.single ? d.def : [] }), opts };
      });
      const tokens = [];
      defs.forEach((d) => {
        const sel = fb[d.key];
        if (d.single) { if (sel !== d.def) tokens.push({ label: (d.options.find((o) => o.v === sel) || {}).label, remove: () => setFb({ [d.key]: d.def }) }); }
        else sel.forEach((v) => tokens.push({ label: (d.options.find((o) => o.v === v) || {}).label, remove: () => setFb({ [d.key]: sel.filter((x) => x !== v) }) }));
      });
      return { items, filtered, tokens, hasTokens: tokens.length > 0, anyOpen: !!openKey, closeAll: () => setOpen(null),
        clearAll: () => setFb(Object.fromEntries(defs.map((d) => [d.key, d.single ? d.def : []]))) };
    };
    const periodDef = (get) => ({
      key: 'period', label: 'Period', single: true, def: 'ytd',
      options: [{ head: 'Quick picks' }, { v: 'ytd', label: 'Year to date' }, { v: 'this', label: 'This month' }, { v: 'last', label: 'Last month' }, { v: 'last3', label: 'Last 3 months' }, { head: 'Month' }]
        .concat([...Array(FIN.today.m + 1).keys()].reverse().map((m) => ({ v: 'm' + m, label: MONTHS[m] }))),
      test: (r, v) => { const m = get(r); return v === 'ytd' || (v === 'this' && m === FIN.today.m) || (v === 'last' && m === FIN.today.m - 1) || (v === 'last3' && m > FIN.today.m - 3) || v === 'm' + m; }
    });
    const listDef = (key, label, options, get) => ({ key, label, options, test: (r, sel) => sel.length === 0 || sel.includes(get(r)) });`;

const NAV = [
  ['Finance_Today.dc.html', 'To-do today', '<path d="M9 11l3 3 8-8"></path><path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9"></path>'],
  ['Finance_Overview.dc.html', 'Budget overview', '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"></path>'],
  ['Finance_Income.dc.html', 'Income', '<path d="M12 3v14M6 11l6 6 6-6"></path><path d="M4 21h16"></path>'],
  ['Finance_Expenses.dc.html', 'Expenses', '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"></path><path d="M9 8h6M9 12h6M9 16h4"></path>'],
  ['Finance_Transactions.dc.html', 'All transactions', '<path d="M7 4v16M7 4L3 8M7 4l4 4"></path><path d="M17 20V4M17 20l-4-4M17 20l4-4"></path>']
];
// Pages reached from another page rather than the sidebar keep their parent highlighted.
const NAV_PARENT = { 'Finance_Budget.dc.html': 'Finance_Overview.dc.html' };
const link = (href, label, icon, on) =>
  `      <a href="${href}" style="flex:1 1 170px;min-height:44px;box-sizing:border-box;border-radius:10px;padding:0 12px;display:flex;align-items:center;gap:10px;${on ? 'background:#0F766E;color:#FFFFFF;font-size:14px;font-weight:700' : 'color:#C9D1DE;font-size:14px;font-weight:600'}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg>${label}</a>`;
const nav = (active) => `  <nav aria-label="Main" style="flex:1 1 220px;max-width:100%;box-sizing:border-box;background:#14213D;color:#FFFFFF;padding:24px 14px;display:flex;flex-direction:column;gap:20px">
    <div style="display:flex;align-items:center;gap:10px;padding:0 8px">
      <span style="width:36px;height:36px;border-radius:10px;background:#0F766E;display:flex;align-items:center;justify-content:center;flex:none">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h10l3 3v13H6z"></path><path d="M9 10h7M9 14h7M9 18h4"></path></svg>
      </span>
      <span style="font-size:17px;font-weight:800">Executive Log</span>
    </div>
    <span style="padding:0 12px;font-size:11px;font-weight:700;letter-spacing:0.6px;color:#8C97AA">FINANCE · 2026</span>
    <div style="display:flex;flex-wrap:wrap;gap:4px">
${NAV.map(([h, l, i]) => link(h, l, i, h === (NAV_PARENT[active] || active))).join('\n')}
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;padding-top:12px;border-top:1px solid #2A3A5C">
${link('Laptop_Today.dc.html', 'Back to logs', '<path d="M15 6l-6 6 6 6"></path>', false)}
    </div>
    <div style="margin-top:auto;display:flex;align-items:center;gap:10px;padding:12px 8px 0;border-top:1px solid #2A3A5C">
      <span style="width:36px;height:36px;border-radius:18px;background:#DDF1EE;color:#0B5C55;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none">FN</span>
      <div style="display:flex;flex-direction:column"><span style="font-size:13px;font-weight:700">Fatima Noor</span><span style="font-size:12px;color:#C9D1DE">Finance</span></div>
    </div>
  </nav>`;

// Phone bottom menu for the Finance screens.
const TABS = [
  ['FinPhone_Today.dc.html', 'Home', '<path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1z"></path>'],
  ['FinPhone_Overview.dc.html', 'Overview', '<rect x="4" y="4" width="7" height="7" rx="1.5"></rect><rect x="13" y="4" width="7" height="4" rx="1.5"></rect><rect x="13" y="10" width="7" height="10" rx="1.5"></rect><rect x="4" y="13" width="7" height="7" rx="1.5"></rect>'],
  ['FinPhone_AddExpense.dc.html', 'Add', '<circle cx="12" cy="12" r="9"></circle><path d="M12 8v8M8 12h8"></path>'],
  ['FinPhone_Transactions.dc.html', 'Recent', '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"></path><path d="M9 8h6M9 12h6M9 16h4"></path>'],
  ['Main.dc.html', 'Logs', '<rect x="4" y="5" width="16" height="15" rx="2"></rect><path d="M4 10h16M9 3v4M15 3v4"></path>']
];
const tabs = (active) => `  <nav aria-label="Finance" style="height:76px;flex:none;background:#FFFFFF;border-top:1px solid #E6E2D8;display:flex;justify-content:space-around;align-items:center;padding:0 6px 8px;box-sizing:border-box">
${TABS.map(([h, l, i]) => `    <a href="${h}"${h === active ? ' aria-current="page"' : ''} style="min-width:64px;min-height:44px;display:flex;flex-direction:column;align-items:center;gap:3px;color:${h === active ? '#0F766E' : '#5B6472'};font-size:11px;font-weight:${h === active ? 700 : 600}">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${i}</svg>${l}</a>`).join('\n')}
  </nav>`;

const FILTERBAR = String.raw`<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
            <sc-if value="{{fb.anyOpen}}" hint-placeholder-val="{{false}}">
              <div onClick="{{fb.closeAll}}" aria-hidden="true" style="position:fixed;inset:0;z-index:25"></div>
            </sc-if>
            <sc-for list="{{fb.items}}" as="it" hint-placeholder-count="5">
              <div style="position:relative">
                <button onClick="{{it.toggle}}" aria-expanded="{{it.open}}" aria-haspopup="true" style="height:40px;padding:0 12px 0 14px;border-radius:12px;border:1px solid {{it.border}};background:{{it.bg}};color:{{it.fg}};font-weight:700;font-size:13px;display:flex;align-items:center;gap:6px;white-space:nowrap">{{it.text}}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg></button>
                <sc-if value="{{it.open}}" hint-placeholder-val="{{false}}">
                  <div role="menu" style="position:absolute;top:46px;left:0;z-index:30;width:270px;background:#FFFFFF;border:1px solid #E6E2D8;border-radius:14px;box-shadow:0 12px 32px rgba(20,33,61,0.18);padding:6px;display:flex;flex-direction:column">
                    <div style="max-height:420px;overflow-y:auto;display:flex;flex-direction:column">
                      <sc-for list="{{it.opts}}" as="o" hint-placeholder-count="6">
                        <sc-if value="{{o.isHead}}" hint-placeholder-val="{{false}}">
                          <span style="font-size:10.5px;font-weight:800;letter-spacing:0.6px;color:#5B6472;padding:10px 10px 4px;text-transform:uppercase">{{o.label}}</span>
                        </sc-if>
                        <sc-if value="{{o.isOpt}}" hint-placeholder-val="{{true}}">
                          <button role="menuitemcheckbox" aria-checked="{{o.checked}}" onClick="{{o.toggle}}" style="width:100%;min-height:38px;border:none;border-radius:9px;background:transparent;padding:0 10px;display:flex;align-items:center;gap:10px;color:{{o.fg}};font-size:13.5px;font-weight:600;text-align:left">
                            <span aria-hidden="true" style="width:18px;height:18px;flex:none;border-radius:{{o.radius}};border:2px solid {{o.boxBorder}};background:{{o.boxBg}};box-sizing:border-box;display:flex;align-items:center;justify-content:center;color:#FFFFFF;font-size:12px;line-height:1">✓</span>
                            <span style="flex:1;min-width:0">{{o.label}}</span>
                            <span style="font-size:12px;color:#5B6472;font-variant-numeric:tabular-nums">{{o.count}}</span>
                          </button>
                        </sc-if>
                      </sc-for>
                    </div>
                    <div style="display:flex;justify-content:space-between;gap:8px;padding:8px 4px 2px;border-top:1px solid #EFEBE2;margin-top:4px">
                      <button onClick="{{it.clear}}" style="height:34px;padding:0 10px;border-radius:9px;border:none;background:transparent;color:#5B6472;font-weight:700;font-size:13px">Reset</button>
                      <button onClick="{{it.close}}" style="height:34px;padding:0 14px;border-radius:9px;border:none;background:#0F766E;color:#FFFFFF;font-weight:700;font-size:13px">Done</button>
                    </div>
                  </div>
                </sc-if>
              </div>
            </sc-for>
            <sc-if value="{{fb.hasTokens}}" hint-placeholder-val="{{false}}">
              <button onClick="{{fb.clearAll}}" style="height:40px;padding:0 10px;border:none;background:transparent;color:#0B5C55;font-weight:700;font-size:13px">Clear all</button>
            </sc-if>
          </div>
          <sc-if value="{{fb.hasTokens}}" hint-placeholder-val="{{false}}">
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              <sc-for list="{{fb.tokens}}" as="tk" hint-placeholder-count="2">
                <button onClick="{{tk.remove}}" aria-label="Remove filter {{tk.label}}" style="height:30px;padding:0 8px 0 12px;border-radius:15px;border:none;background:#14213D;color:#FFFFFF;font-weight:600;font-size:12.5px;display:flex;align-items:center;gap:6px">{{tk.label}}<span aria-hidden="true" style="font-size:15px;line-height:1">×</span></button>
              </sc-for>
            </div>
          </sc-if>`;

const head = (title) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet">
<style>
body{margin:0;font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:#F5F3EE}
button,input,textarea{font-family:inherit}
button{cursor:pointer}
button:disabled{cursor:not-allowed}
a{text-decoration:none}
[data-scroll]>*{flex-shrink:0}
input:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid #0F766E;outline-offset:2px}
</style>
</helmet>`;

for (const f of fs.readdirSync(__dirname).filter((x) => x.endsWith('.tpl.html'))) {
  let s = fs.readFileSync(path.join(__dirname, f), 'utf8');
  s = s.replace(/<!--@HEAD (.+?)-->/, (_, t) => head(t));
  s = s.replace(/<!--@NAV (.+?)-->/, (_, a) => nav(a));
  s = s.replace(/<!--@TABS (.+?)-->/, (_, a) => tabs(a));
  s = s.replace('<!--@FILTERBAR-->', FILTERBAR);
  s = s.replace('/*@SHARED*/', SHARED);
  const out = f.replace('.tpl.html', '.dc.html');
  fs.writeFileSync(path.join(OUT, out), s);
  console.log('built', out, s.length);
}
