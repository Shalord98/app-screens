// Builds the Finance *.dc.html screens from the templates in this folder.
// Each template uses placeholders that this script fills in:
//   /*@SHARED*/          shared sample data + helpers (same in every screen)
//   <!--@HEAD title-->   page head + helmet
//   <!--@NAV file-->     the Finance sidebar with `file` marked active
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];

// ---- Sample data: a 2026 household / executive office budget, today = 20 Oct 2026 ----
// Budget categories (the client's list). Each has a monthly allocation for the year.
const persons = [
  { id: 'ceo', name: 'CEO' }, { id: 'ravi', name: 'Ravi Kumar' }, { id: 'maria', name: 'Maria Santos' },
  { id: 'joseph', name: 'Joseph Mathew' }, { id: 'ahmed', name: 'Ahmed Hassan' }
];
const objects = [
  { id: 'lc', name: 'Land Cruiser' }, { id: 'patrol', name: 'Nissan Patrol' }, { id: 'merc', name: 'Mercedes S 500' },
  { id: 'villa', name: 'Villa' }, { id: 'apt', name: 'Jumeirah apartment' }
];
const every = (v) => Array(12).fill(v);
const at = (pairs) => { const a = every(0); pairs.forEach(([m, v]) => { a[m] = v; }); return a; };
const catDefs = [
  // id, name, monthly allocation, fixed (spend equals allocation) or varies
  ['staff', 'Staff Salaries', at([...Array(12).keys()].map((m) => [m, m === 6 ? 17400 : 11400])), true],
  ['elec', 'Electricity & Water', [1700, 1500, 1600, 1900, 2600, 3300, 3700, 3800, 3100, 2200, 1800, 1700].map((v) => v + 800), false],
  ['net', 'Internet & Mobile', every(1050), true],
  ['maint', 'Property Maintenance', [...every(2500).slice(0, 11), 3500], false],
  ['rent', 'Rent & Service Charges', at([[0, 4200], [3, 4200], [6, 4200], [9, 4200]]), true],
  ['groc', 'Groceries', [...every(3200).slice(0, 11), 4000], false],
  ['trans', 'Transportation', every(4200), false],
  ['ins', 'Insurance', at([[0, 9000], [10, 5600]]), true],
  ['edu', 'Education', at([[0, 15000], [3, 15000], [8, 15000]]), true],
  ['travel', 'Travel', [5000, 3000, 7500, 4000, 3000, 10000, 12000, 6500, 5000, 7500, 4000, 12000], false],
  ['health', 'Healthcare', every(600), false],
  ['life', 'Personal & Lifestyle', [2500, 2500, 4000, 2500, 2500, 2500, 1500, 1500, 2500, 3000, 3000, 5000], false],
  ['other', 'Other Expenses', every(500), false],
  ['petrol', 'Petrol Top Up', every(1300), false],
  ['cash', 'Cash collection for travel', [1000, 1000, 2000, 1000, 1000, 3000, 3000, 1500, 1000, 3000, 1000, 3000], false],
  ['visa', 'Visa Renewal', [1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 6500, 1500, 1500], false]
];
// Short codes shown in the category badges.
const CODES = { staff: 'SS', elec: 'EW', net: 'IM', maint: 'PM', rent: 'RS', groc: 'GR', trans: 'TP', ins: 'IN', edu: 'ED', travel: 'TV',
  health: 'HC', life: 'PL', other: 'OE', petrol: 'PT', cash: 'CT', visa: 'VR' };
const cats = catDefs.map(([id, name, alloc, fixed], i) => ({
  id, name, ini: CODES[id], alloc, fixed,
  // Jan–Sep actual spend: fixed items match the allocation, the rest vary a little around it.
  spent: alloc.slice(0, 9).map((a, m) => (fixed ? a : Math.round((a * (0.85 + ((i * 7 + m * 13) % 30) / 100)) / 10) * 10))
}));

// October transactions so far (month index 9). October spend per category comes from these.
const T = (id, d, desc, cat, payee, method, amount, type, receipt, by, p, o) => ({ id, m: 9, d, desc, cat, payee, method, amount, type, receipt, by, p, o });
const txns = [
  T('t19', 19, 'Airport transfer – Riyadh return', 'trans', 'Careem', 'Card ••4417', 180, 'One-off', false, 'Fatima Noor', 'ceo', ''),
  T('t18', 18, 'AC repair – master bedroom', 'maint', 'CoolTech Services', 'Bank transfer', 750, 'One-off', true, 'Fatima Noor', '', 'villa'),
  T('t17', 17, 'Petrol – Nissan Patrol', 'petrol', 'ADNOC', 'Fuel card', 380, 'One-off', true, 'Ravi Kumar', '', 'patrol'),
  T('t16', 16, 'Cleaning supplies', 'groc', 'Spinneys', 'Petty cash', 310, 'One-off', true, 'Maria Santos', '', 'villa'),
  T('t15', 14, 'Groceries', 'groc', 'Spinneys', 'Card ••4417', 980, 'One-off', true, 'Maria Santos', '', 'villa'),
  T('t14', 14, 'Etisalat – Mobiles', 'net', 'Etisalat', 'Autopay', 650, 'Recurring', true, 'Fatima Noor', '', ''),
  T('t20', 13, 'Clinic visit – Maria Santos', 'health', 'Mediclinic', 'Card ••4417', 350, 'One-off', true, 'Fatima Noor', 'maria', ''),
  T('t13', 12, 'Business dinner – Northgate', 'life', 'Zuma DIFC', 'Card ••4417', 1500, 'One-off', false, 'Fatima Noor', 'ceo', ''),
  T('t12', 11, 'OSN+ subscription', 'life', 'OSN', 'Autopay', 55, 'Recurring', true, 'Fatima Noor', '', 'villa'),
  T('t11', 10, 'Pool maintenance', 'maint', 'BlueWave Pools', 'Petty cash', 450, 'Recurring', false, 'Maria Santos', '', 'villa'),
  T('t10', 9, 'Salik top-up', 'trans', 'RTA Salik', 'Card ••4417', 200, 'One-off', true, 'Ravi Kumar', '', 'lc'),
  T('t09', 8, 'Flights DXB–RUH', 'travel', 'Emirates', 'Card ••4417', 2950, 'One-off', true, 'Fatima Noor', 'ceo', ''),
  T('t08', 8, 'Hotel – Riyadh trip', 'travel', 'Four Seasons Riyadh', 'Card ••4417', 4600, 'One-off', true, 'Fatima Noor', 'ceo', ''),
  T('t21', 7, 'Cash for Riyadh trip', 'cash', 'Cash withdrawal', 'Bank transfer', 3000, 'One-off', true, 'Fatima Noor', 'ceo', ''),
  T('t07', 6, 'Emirates ID renewal – Ravi Kumar', 'visa', 'ICP', 'Card ••4417', 1870, 'One-off', true, 'Fatima Noor', 'ravi', ''),
  T('t06', 5, 'Residence visa renewal – Ravi Kumar', 'visa', 'GDRFA Dubai', 'Card ••4417', 3850, 'One-off', true, 'Fatima Noor', 'ravi', ''),
  T('t05', 3, 'Petrol – Land Cruiser', 'petrol', 'ENOC', 'Fuel card', 420, 'One-off', true, 'Ravi Kumar', '', 'lc'),
  T('t04', 2, 'Groceries', 'groc', 'Carrefour', 'Card ••4417', 1245, 'One-off', true, 'Maria Santos', '', 'villa'),
  T('t22', 1, 'Service charges Q4 – Jumeirah apartment', 'rent', 'Emaar Community', 'Bank transfer', 4200, 'Recurring', true, 'Fatima Noor', '', 'apt'),
  T('t03', 1, 'Car lease – Nissan Patrol', 'trans', 'Al Futtaim Leasing', 'Autopay', 3200, 'Recurring', true, 'Fatima Noor', '', 'patrol')
];

// Jan–Sep history: each category's monthly spend split into transactions that add up exactly.
const history = [];
let hn = 0;
const H = (m, d, desc, cat, payee, method, amount, type, p, o) => {
  if (amount > 0) history.push({ id: 'h' + (++hn), m, d, desc, cat, payee, method, amount, type, receipt: true, by: 'Fatima Noor', p, o });
};
const split = (total, parts) => {
  // Split `total` by the given shares, rounded to 5, with the remainder on the last part.
  const out = []; let left = total;
  parts.forEach((share, i) => { const v = i === parts.length - 1 ? left : Math.round((total * share) / 5) * 5; out.push(v); left -= v; });
  return out;
};
const pname = (id) => persons.find((x) => x.id === id).name;
const rota = ['maria', 'joseph', 'ahmed', 'ceo', 'ravi', 'maria', 'joseph', 'ahmed', 'ceo'];
const terms = { 0: 'Term 2', 3: 'Term 3', 8: 'Term 1' };
for (let m = 0; m < 9; m++) {
  const sp = (id) => cats.find((c) => c.id === id).spent[m];
  [['ravi', 3500], ['maria', 2500], ['joseph', 2800], ['ahmed', 2600]].forEach(([p, a]) => H(m, 28, 'Salary – ' + pname(p), 'staff', 'WPS payroll', 'Bank transfer', a, 'Recurring', p, ''));
  if (sp('staff') > 11400) H(m, 12, 'Annual leave flight – Ravi Kumar', 'staff', 'Emirates', 'Card ••4417', sp('staff') - 11400, 'One-off', 'ravi', '');
  H(m, 22, 'DEWA – Villa', 'elec', 'DEWA', 'Bank transfer', sp('elec') - 800, 'Recurring', '', 'villa');
  H(m, 18, 'du – Internet and TV', 'net', 'du', 'Card ••4417', 399, 'Recurring', '', 'villa');
  H(m, 14, 'Etisalat – Mobiles', 'net', 'Etisalat', 'Autopay', sp('net') - 399, 'Recurring', '', '');
  const aptJob = m === 2 || m === 6 ? 600 : 0;
  H(m, 10, 'Pool maintenance', 'maint', 'BlueWave Pools', 'Petty cash', 450, 'Recurring', '', 'villa');
  H(m, 24, 'Villa maintenance', 'maint', 'FixIt Home Services', 'Bank transfer', sp('maint') - 450 - aptJob, 'One-off', '', 'villa');
  H(m, 20, 'AC service – apartment', 'maint', 'CoolTech Services', 'Bank transfer', aptJob, 'One-off', '', 'apt');
  H(m, 1, 'Service charges – Jumeirah apartment', 'rent', 'Emaar Community', 'Bank transfer', sp('rent'), 'Recurring', '', 'apt');
  const g = split(sp('groc'), [0.65, 0.35]);
  H(m, 3, 'Groceries', 'groc', 'Carrefour', 'Card ••4417', g[0], 'One-off', '', 'villa');
  H(m, 16, 'Groceries', 'groc', 'Spinneys', 'Card ••4417', g[1], 'One-off', '', 'villa');
  H(m, 1, 'Car lease – Nissan Patrol', 'trans', 'Al Futtaim Leasing', 'Autopay', 3200, 'Recurring', '', 'patrol');
  const tr = split(sp('trans') - 3200, [0.45, 0.35, 0.2]);
  H(m, 9, 'Salik top-up', 'trans', 'RTA Salik', 'Card ••4417', tr[0], 'One-off', '', 'lc');
  H(m, 17, 'Taxis', 'trans', 'Careem', 'Card ••4417', tr[1], 'One-off', 'ceo', '');
  H(m, 25, 'Car wash and service', 'trans', 'Al-Futtaim Toyota', 'Card ••4417', tr[2], 'One-off', '', 'lc');
  H(m, 5, 'Health insurance – family', 'ins', 'Daman', 'Bank transfer', sp('ins'), 'Recurring', 'ceo', '');
  H(m, 6, 'School fees – ' + terms[m], 'edu', 'Dubai International School', 'Bank transfer', sp('edu'), 'Recurring', 'ceo', '');
  const t = split(sp('travel'), [0.45, 0.55]);
  H(m, 7, 'Flights – CEO trip', 'travel', 'Emirates', 'Card ••4417', t[0], 'One-off', 'ceo', '');
  H(m, 8, 'Hotel – CEO trip', 'travel', 'Marriott Bonvoy', 'Card ••4417', t[1], 'One-off', 'ceo', '');
  H(m, 13, 'Clinic and medicine – ' + pname(rota[m]), 'health', 'Mediclinic', 'Card ••4417', sp('health'), 'One-off', rota[m], '');
  H(m, 11, 'OSN+ subscription', 'life', 'OSN', 'Autopay', 55, 'Recurring', '', 'villa');
  H(m, 21, 'Business dinner', 'life', 'Zuma DIFC', 'Card ••4417', sp('life') - 55, 'One-off', 'ceo', '');
  H(m, 26, 'Miscellaneous', 'other', 'Various', 'Petty cash', sp('other'), 'One-off', '', '');
  H(m, 28, 'Empower – Chiller', 'elec', 'Empower', 'Bank transfer', 720, 'Recurring', '', 'villa');
  H(m, 15, 'Gas cylinders', 'elec', 'Emirates Gas', 'Petty cash', 80, 'One-off', '', 'villa');
  const pt = split(sp('petrol'), [0.4, 0.35, 0.25]);
  H(m, 6, 'Petrol – Land Cruiser', 'petrol', 'ENOC', 'Fuel card', pt[0], 'One-off', '', 'lc');
  H(m, 13, 'Petrol – Nissan Patrol', 'petrol', 'ADNOC', 'Fuel card', pt[1], 'One-off', '', 'patrol');
  H(m, 19, 'Petrol – Mercedes S 500', 'petrol', 'ENOC', 'Fuel card', pt[2], 'One-off', '', 'merc');
  H(m, 6, 'Cash for CEO trip', 'cash', 'Cash withdrawal', 'Bank transfer', sp('cash'), 'One-off', 'ceo', '');
  H(m, 15, 'Visa and medical – ' + pname(rota[m]), 'visa', 'GDRFA Dubai', 'Card ••4417', sp('visa'), 'One-off', rota[m], '');
}
// Sanity check: history adds up to each category's monthly spend.
cats.forEach((c) => c.spent.forEach((s, m) => {
  const got = history.filter((h) => h.cat === c.id && h.m === m).reduce((a, h) => a + h.amount, 0);
  if (got !== s) throw new Error('history mismatch ' + c.id + ' ' + m + ' ' + got + ' vs ' + s);
}));

// Recurring payments: next due date (month index, day), amount, how it is paid.
const R = (id, name, cat, freq, m, d, amount, method, autopay, note) => ({ id, name, cat, freq, m, d, amount, method, autopay, note });
const recurring = [
  R('r1', 'du – Internet and TV', 'net', 'Monthly', 9, 18, 399, 'Card ••4417', false, 'Account 0400••••88'),
  R('r2', 'Fuel card top-up', 'petrol', 'Monthly', 9, 20, 800, 'Bank transfer', false, 'ADNOC fleet card'),
  R('r3', 'DEWA – Villa', 'elec', 'Monthly', 9, 22, 1840, 'Bank transfer', false, 'Amount changes each month'),
  R('r4', 'Staff salaries (4 people)', 'staff', 'Monthly', 9, 28, 11400, 'Bank transfer (WPS)', false, 'Ravi, Maria, Joseph, Ahmed'),
  R('r5', 'Empower – Chiller', 'elec', 'Monthly', 9, 28, 720, 'Bank transfer', false, 'Account EMP-••••-311'),
  R('r6', 'Car lease – Nissan Patrol', 'trans', 'Monthly', 10, 1, 3200, 'Autopay', true, 'Lease ends 31 Aug 2027'),
  R('r7', 'Pool maintenance', 'maint', 'Monthly', 10, 10, 450, 'Petty cash', false, 'BlueWave Pools'),
  R('r8', 'OSN+ subscription', 'life', 'Monthly', 10, 11, 55, 'Autopay', true, ''),
  R('r9', 'Etisalat – Mobiles', 'net', 'Monthly', 10, 14, 650, 'Autopay', true, '3 lines'),
  R('r10', 'Insurance and registration – Land Cruiser', 'ins', 'Yearly', 10, 14, 5600, 'Card ••4417', false, 'Dubai A 12345'),
  R('r11', 'Service charges – Jumeirah apartment', 'rent', 'Quarterly', 12, 1, 4200, 'Bank transfer', false, 'Emaar Community')
];

// Income categories (the client's list), each with expected receipts and what actually came in.
const sources = [
  { id: 'salary', name: 'Salary & Bonuses', from: 'Holding company', ini: 'SB' },
  { id: 'div', name: 'Dividends', from: 'Northgate Capital', ini: 'DV' },
  { id: 'rent', name: 'Rental Income', from: 'Tenant: Khalid Saeed · Jumeirah apartment', ini: 'RI' },
  { id: 'interest', name: 'Interest Income', from: 'Emirates NBD savings', ini: 'II' },
  { id: 'other', name: 'Other Income', from: 'Holding company', ini: 'OI' }
];
const income = [];
for (let m = 0; m < 12; m++) income.push({ id: 'sal' + m, src: 'salary', m, d: 25, expected: 42000, received: m < 9 ? 42000 : null, ref: 'Monthly salary' });
income.push({ id: 'bonus', src: 'salary', m: 2, d: 28, expected: 30000, received: 30000, ref: 'Annual bonus' });
[[0, 30000], [3, 30000], [6, 30000], [9, null]].forEach(([m, r]) => income.push({ id: 'rent' + m, src: 'rent', m, d: 15, expected: 30000, received: r, ref: 'Quarterly cheque' }));
[[2, 18000], [5, 17200], [8, 16500], [11, null]].forEach(([m, r]) => income.push({ id: 'div' + m, src: 'div', m, d: 30, expected: 18000, received: r, ref: 'Quarterly dividend' }));
for (let m = 0; m < 12; m++) income.push({ id: 'int' + m, src: 'interest', m, d: 28, expected: 1150, received: m < 9 ? 1150 + ((m * 37) % 60) - 30 : null, ref: 'Savings interest' });
[[1, 3000, 3000, 'Travel reimbursement – Jan trip'], [2, 6000, 4800, 'Travel reimbursement – London'], [5, 5000, 5000, 'Travel reimbursement – Paris'],
 [6, 8000, 6200, 'Travel reimbursement – summer'], [9, 4500, null, 'Travel reimbursement – Riyadh (Sep)'], [10, 7600, null, 'Travel reimbursement – Riyadh (Oct)']]
  .forEach(([m, e, r, ref], i) => income.push({ id: 'oth' + i, src: 'other', m, d: m === 9 ? 15 : 10, expected: e, received: r, ref }));

// Annual budget: what is allocated, rounded up to leave a little unallocated.
const allocated = cats.reduce((a, c) => a + c.alloc.reduce((x, y) => x + y, 0), 0);
const budget = Math.ceil((allocated + 2000) / 10000) * 10000;

const FIN = { year: 2026, budget, today: { m: 9, d: 20 }, cats, txns, history, persons, objects, recurring, sources, income };

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
    const PAL = [['#E8E4F5', '#3F2F8F'], ['#E3EAF7', '#1E3A8A'], ['#FDF0DC', '#8A4B08'], ['#DDF1EE', '#0B5C55'], ['#FDE7E1', '#9A3412'], ['#EEF0F3', '#3D4654'], ['#F6E7F0', '#7A1F57'], ['#E6F0DA', '#3F5F17']];
    const catColor = Object.fromEntries(FIN.cats.map((c, i) => [c.id, PAL[i % PAL.length]]));
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

const STAFF_JS = String.raw`
    // ---- Staff records (sample data) and the fields shown for each person ----
    const STAFF = [
      { id: 's1', empId: 'EMP-001', name: 'Ravi Kumar', preferred: 'Ravi', gender: 'Male', dob: '1988-04-12', nationality: 'Indian', marital: 'Married', email: 'ravi.kumar88@example.com', mobile: '+971 50 118 4412',
        sponsor: 'CEO (household sponsor)', department: 'Transport', jobTitle: 'Driver', empType: 'Full-time, 2-year contract', location: 'Villa 14, Emirates Hills', manager: 'Rahul Menon',
        joined: '2023-03-01', probationEnd: '2023-08-31', contractStart: '2025-03-01', contractEnd: '2027-02-28', status: 'Active', lastDay: '', exitReason: '',
        paidVia: 'WPS bank transfer', bank: 'Emirates NBD', iban: 'AE07 0260 0010 1234 5678 901', basic: 2000, housing: 800, transport: 300, otherAllow: 400, bonus: 1750, lastIncrement: '2025-03-01', nextReview: '2027-03-01',
        leaveEnt: 30, leaveTaken: 18, sickTaken: 3, otherLeave: 0, ticketEnt: 6000, ticketPaid: 6000, ticketDue: '2027-07-01', route: 'Economy, DXB – Kochi (family)',
        medProvider: 'Daman', medPolicy: 'DMN-77310245', medPlan: 'Basic (essential benefits)', medStart: '2026-01-01', medExpiry: '2026-12-31', dependants: 0, medPremium: 1100,
        lifeProvider: '', lifePolicy: '', lifeExpiry: '', lifePremium: 0, otherInsCost: 0,
        visaType: 'Domestic worker residence visa', uid: '201/2024/7700512', visaIssue: '2024-10-10', visaExpiry: '2026-10-09', visaCost: 3850, eidNo: '784-1990-7654321-7', eidExpiry: '2026-10-09',
        passportNo: 'Z4471209', passportExpiry: '2031-05-14', permitNo: 'MOHRE DW-558213', permitExpiry: '2026-10-09', govtCost: 1870,
        vehicle: 'Toyota Land Cruiser (Dubai A 12345)', mobileAllow: 100, otherBenefits: 600, assets: 'SIM 050 118 4412 · ADNOC fuel card ••2231',
        emName: 'Anjali Kumar', emRel: 'Wife', emPhone: '+91 98470 22314', address: 'Staff quarters, Villa 14, Emirates Hills, Dubai', homeAddress: 'Kochi, Kerala, India',
        docLink: 'Shared drive › Staff › Ravi Kumar', remarks: 'Visa and Emirates ID renewal submitted on 5 Oct. Waiting for the new visa.', updated: '2026-10-05', updatedBy: 'Fatima Noor' },
      { id: 's2', empId: 'EMP-002', name: 'Maria Santos', preferred: 'Maria', gender: 'Female', dob: '1992-09-03', nationality: 'Filipino', marital: 'Single', email: 'maria.santos92@example.com', mobile: '+971 52 340 7781',
        sponsor: 'CEO (household sponsor)', department: 'Household', jobTitle: 'Housekeeper', empType: 'Full-time, 2-year contract', location: 'Villa 14, Emirates Hills', manager: 'Fatima Noor',
        joined: '2025-08-10', probationEnd: '2026-02-09', contractStart: '2025-08-10', contractEnd: '2027-08-09', status: 'Active', lastDay: '', exitReason: '',
        paidVia: 'WPS salary card', bank: 'Al Ansari Exchange', iban: '', basic: 1600, housing: 500, transport: 0, otherAllow: 400, bonus: 1250, lastIncrement: '', nextReview: '2026-08-10',
        leaveEnt: 30, leaveTaken: 6, sickTaken: 2, otherLeave: 0, ticketEnt: 2200, ticketPaid: 0, ticketDue: '2026-12-15', route: 'Economy, DXB – Cebu',
        medProvider: 'Daman', medPolicy: 'DMN-80455120', medPlan: 'Basic (essential benefits)', medStart: '2026-08-10', medExpiry: '2027-08-09', dependants: 0, medPremium: 1100,
        lifeProvider: '', lifePolicy: '', lifeExpiry: '', lifePremium: 0, otherInsCost: 0,
        visaType: 'Domestic worker residence visa', uid: '201/2025/3300094', visaIssue: '2025-01-06', visaExpiry: '2027-01-05', visaCost: 3600, eidNo: '784-1992-3300094-1', eidExpiry: '2027-01-05',
        passportNo: 'P5507703', passportExpiry: '2030-06-30', permitNo: 'MOHRE DW-602177', permitExpiry: '2027-01-05', govtCost: 450,
        vehicle: '', mobileAllow: 50, otherBenefits: 600, assets: 'SIM 052 340 7781',
        emName: 'Rosa Santos', emRel: 'Mother', emPhone: '+63 917 555 0142', address: 'Staff quarters, Villa 14, Emirates Hills, Dubai', homeAddress: 'Cebu City, Philippines',
        docLink: 'Shared drive › Staff › Maria Santos', remarks: 'Leave planned 15 Dec – 5 Jan. Book the ticket by 15 Nov.', updated: '2026-09-20', updatedBy: 'Fatima Noor' },
      { id: 's3', empId: 'EMP-003', name: 'Joseph Mathew', preferred: 'Joseph', gender: 'Male', dob: '1985-12-20', nationality: 'Indian', marital: 'Married', email: '', mobile: '+971 55 902 3309',
        sponsor: 'CEO (household sponsor)', department: 'Property', jobTitle: 'Gardener and maintenance', empType: 'Full-time, 2-year contract', location: 'Villa 14, Emirates Hills', manager: 'Rahul Menon',
        joined: '2025-06-01', probationEnd: '2025-11-30', contractStart: '2025-06-01', contractEnd: '2027-05-31', status: 'Active', lastDay: '', exitReason: '',
        paidVia: 'WPS salary card', bank: 'Al Ansari Exchange', iban: '', basic: 1800, housing: 600, transport: 200, otherAllow: 200, bonus: 1400, lastIncrement: '', nextReview: '2026-06-01',
        leaveEnt: 30, leaveTaken: 0, sickTaken: 4, otherLeave: 2, ticketEnt: 1800, ticketPaid: 0, ticketDue: '2027-06-01', route: 'Economy, DXB – Kochi',
        medProvider: 'Daman', medPolicy: 'DMN-78812004', medPlan: 'Basic (essential benefits)', medStart: '2026-01-01', medExpiry: '2026-12-31', dependants: 0, medPremium: 1100,
        lifeProvider: '', lifePolicy: '', lifeExpiry: '', lifePremium: 0, otherInsCost: 0,
        visaType: 'Domestic worker residence visa', uid: '201/2025/2104471', visaIssue: '2025-06-01', visaExpiry: '2027-05-31', visaCost: 3600, eidNo: '784-1985-2104471-3', eidExpiry: '2027-05-31',
        passportNo: 'U8823145', passportExpiry: '2028-02-11', permitNo: 'MOHRE DW-590034', permitExpiry: '2027-05-31', govtCost: 450,
        vehicle: '', mobileAllow: 50, otherBenefits: 600, assets: 'SIM 055 902 3309 · Garden tools set',
        emName: 'Mary Joseph', emRel: 'Wife', emPhone: '+91 94470 81236', address: 'Staff quarters, Villa 14, Emirates Hills, Dubai', homeAddress: 'Kottayam, Kerala, India',
        docLink: 'Shared drive › Staff › Joseph Mathew', remarks: 'Salary review was due in June. Not done yet.', updated: '2026-07-02', updatedBy: 'Rahul Menon' },
      { id: 's4', empId: 'EMP-004', name: 'Ahmed Hassan', preferred: 'Ahmed', gender: 'Male', dob: '1994-07-07', nationality: 'Egyptian', marital: 'Single', email: 'ahmed.hassan94@example.com', mobile: '+971 56 207 1290',
        sponsor: 'CEO (household sponsor)', department: 'Household', jobTitle: 'Cleaner and maintenance', empType: 'Full-time, 2-year contract', location: 'Villa 14, Emirates Hills', manager: 'Fatima Noor',
        joined: '2026-01-15', probationEnd: '2026-07-14', contractStart: '2026-01-15', contractEnd: '2028-01-14', status: 'Active', lastDay: '', exitReason: '',
        paidVia: 'WPS salary card', bank: 'Al Ansari Exchange', iban: '', basic: 1700, housing: 600, transport: 100, otherAllow: 200, bonus: 0, lastIncrement: '', nextReview: '2027-01-15',
        leaveEnt: 30, leaveTaken: 0, sickTaken: 1, otherLeave: 0, ticketEnt: 1500, ticketPaid: 0, ticketDue: '2027-01-15', route: 'Economy, DXB – Cairo',
        medProvider: 'Daman', medPolicy: 'DMN-81230977', medPlan: 'Basic (essential benefits)', medStart: '2026-01-15', medExpiry: '2027-01-14', dependants: 0, medPremium: 1100,
        lifeProvider: '', lifePolicy: '', lifeExpiry: '', lifePremium: 0, otherInsCost: 0,
        visaType: 'Domestic worker residence visa', uid: '201/2026/0412986', visaIssue: '2026-01-15', visaExpiry: '2028-01-14', visaCost: 3600, eidNo: '784-1994-0412986-5', eidExpiry: '2028-01-14',
        passportNo: 'A27719034', passportExpiry: '2026-12-02', permitNo: 'MOHRE DW-631508', permitExpiry: '2028-01-14', govtCost: 450,
        vehicle: '', mobileAllow: 50, otherBenefits: 600, assets: 'SIM 056 207 1290',
        emName: 'Omar Hassan', emRel: 'Brother', emPhone: '+20 100 245 7781', address: 'Staff quarters, Villa 14, Emirates Hills, Dubai', homeAddress: 'Giza, Egypt',
        docLink: 'Shared drive › Staff › Ahmed Hassan', remarks: 'Passport expires 2 Dec. Renewal appointment at the Egyptian consulate needed.', updated: '2026-10-01', updatedBy: 'Fatima Noor' }
    ];
    const S_TODAY = new Date(2026, 9, 20);
    const S_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const sDate = (s) => (s ? new Date(s + 'T00:00:00') : null);
    const sFmt = (s) => { const d = sDate(s); return d ? d.getDate() + ' ' + S_MON[d.getMonth()] + ' ' + d.getFullYear() : '—'; };
    const sAed = (n) => 'AED ' + Math.round(n || 0).toLocaleString('en-US');
    const sDays = (s) => Math.round((sDate(s) - S_TODAY) / 86400000);
    const STONE = { bad: ['#FDE7E1', '#9A3412'], warn: ['#FDF0DC', '#8A4B08'], soon: ['#E3EAF7', '#1E3A8A'], ok: ['#DDF1EE', '#0B5C55'], none: ['#EEF0F3', '#3D4654'] };
    const AVATAR = [['#FDF0DC', '#8A4B08'], ['#E3EAF7', '#1E3A8A'], ['#DDF1EE', '#0B5C55'], ['#E8E4F5', '#3F2F8F']];
    // Everything worked out from the record rather than typed in.
    const staffCalc = (p) => {
      const n = (v) => Number(v) || 0;
      const monthly = n(p.basic) + n(p.housing) + n(p.transport) + n(p.otherAllow);
      const years = p.joined ? Math.max(0, (S_TODAY - sDate(p.joined)) / (365.25 * 86400000)) : 0;
      const gratuityYear = (n(p.basic) / 30) * 21; // UAE: 21 days' basic pay per year for the first 5 years
      const docs = [['Visa', p.visaExpiry], ['Emirates ID', p.eidExpiry], ['Passport', p.passportExpiry], ['Work permit', p.permitExpiry], ['Medical insurance', p.medExpiry]]
        .filter((d) => d[1]).map(([what, date]) => ({ what, date, days: sDays(date) })).sort((a, b) => a.days - b.days);
      const next = docs[0];
      const alert = !next ? ['No documents', STONE.none] : next.days < 0 ? [next.what + ' expired ' + (-next.days) + 'd ago', STONE.bad]
        : next.days <= 30 ? [next.what + ' in ' + next.days + ' days', STONE.warn] : next.days <= 90 ? [next.what + ' in ' + next.days + ' days', STONE.soon] : ['Documents valid', STONE.ok];
      const costLines = [
        ['Salary and allowances (12 months)', monthly * 12], ['Bonus', n(p.bonus)], ['Air ticket', n(p.ticketEnt)],
        ['Medical insurance', n(p.medPremium)], ['Life and other insurance', n(p.lifePremium) + n(p.otherInsCost)],
        ['Visa and government fees (per year, 2-year visa)', (n(p.visaCost) + n(p.govtCost)) / 2], ['Mobile allowance (12 months)', n(p.mobileAllow) * 12],
        ['Other benefits', n(p.otherBenefits)], ['End-of-service gratuity for the year', gratuityYear]
      ];
      return {
        monthly, annual: monthly * 12, years, yearsText: years < 1 ? Math.round(years * 12) + ' months' : years.toFixed(1) + ' years',
        leaveBalance: n(p.leaveEnt) - n(p.leaveTaken), gratuity: gratuityYear * Math.min(years, 5) + (years > 5 ? (n(p.basic) * (years - 5)) : 0),
        next, nextText: next ? next.what + ', ' + sFmt(next.date) : '—', alertText: alert[0], alertBg: alert[1][0], alertFg: alert[1][1], docs,
        costLines, totalCost: costLines.reduce((a, l) => a + l[1], 0)
      };
    };
    // Tabs and their fields. kind: text | date | money | num | auto (worked out, not typed).
    const STAFF_TABS = [
      ['personal', 'Personal', [['empId', 'Employee ID'], ['name', 'Full name'], ['preferred', 'Preferred name'], ['gender', 'Gender'], ['dob', 'Date of birth', 'date'], ['nationality', 'Nationality'],
        ['marital', 'Marital status'], ['email', 'Personal email'], ['mobile', 'Mobile number']]],
      ['job', 'Job', [['sponsor', 'Sponsor / employer'], ['department', 'Department'], ['jobTitle', 'Job title'], ['empType', 'Employment type'], ['location', 'Work location'], ['manager', 'Reports to'],
        ['joined', 'Joining date', 'date'], ['probationEnd', 'Probation end date', 'date'], ['contractStart', 'Contract start', 'date'], ['contractEnd', 'Contract end', 'date'], ['status', 'Status'],
        ['lastDay', 'Last working date', 'date'], ['exitReason', 'Exit reason']]],
      ['pay', 'Pay', [['paidVia', 'Paid via'], ['bank', 'Bank / exchange'], ['iban', 'IBAN'], ['basic', 'Basic salary', 'money'], ['housing', 'Housing allowance', 'money'], ['transport', 'Transport allowance', 'money'],
        ['otherAllow', 'Other fixed allowance', 'money'], ['$monthly', 'Monthly gross', 'auto'], ['$annual', 'Annual gross', 'auto'], ['bonus', 'Variable pay / bonus (year)', 'money'],
        ['lastIncrement', 'Last increment', 'date'], ['nextReview', 'Next salary review', 'date']]],
      ['leave', 'Leave & travel', [['leaveEnt', 'Annual leave entitlement (days)', 'num'], ['leaveTaken', 'Annual leave taken (days)', 'num'], ['$leaveBalance', 'Annual leave balance (days)', 'auto'],
        ['sickTaken', 'Sick leave taken (days)', 'num'], ['otherLeave', 'Other leave taken (days)', 'num'], ['ticketEnt', 'Air ticket entitlement', 'money'], ['ticketPaid', 'Air ticket paid', 'money'],
        ['ticketDue', 'Air ticket due', 'date'], ['route', 'Travel class / route']]],
      ['insurance', 'Insurance', [['medProvider', 'Medical insurer'], ['medPolicy', 'Medical policy no.'], ['medPlan', 'Plan / category'], ['medStart', 'Medical start', 'date'], ['medExpiry', 'Medical expiry', 'date'],
        ['dependants', 'Dependants covered', 'num'], ['medPremium', 'Medical premium (year)', 'money'], ['lifeProvider', 'Life insurer'], ['lifePolicy', 'Life policy no.'], ['lifeExpiry', 'Life expiry', 'date'],
        ['lifePremium', 'Life premium (year)', 'money'], ['otherInsCost', 'Other medical / insurance cost', 'money']]],
      ['visa', 'Visa & documents', [['visaType', 'Visa type'], ['uid', 'Visa / UID no.'], ['visaIssue', 'Visa issue date', 'date'], ['visaExpiry', 'Visa expiry', 'date'], ['visaCost', 'Visa cost', 'money'],
        ['eidNo', 'Emirates ID no.'], ['eidExpiry', 'Emirates ID expiry', 'date'], ['passportNo', 'Passport no.'], ['passportExpiry', 'Passport expiry', 'date'], ['permitNo', 'Work permit no.'],
        ['permitExpiry', 'Work permit expiry', 'date'], ['govtCost', 'Other government / PRO cost', 'money']]],
      ['benefits', 'Benefits & assets', [['vehicle', 'Vehicle assigned'], ['mobileAllow', 'Mobile allowance (month)', 'money'], ['otherBenefits', 'Other benefits (year)', 'money'], ['assets', 'Assigned items'],
        ['$gratuity', 'Gratuity built up so far', 'auto']]],
      ['emergency', 'Emergency', [['emName', 'Emergency contact'], ['emRel', 'Relationship'], ['emPhone', 'Contact number'], ['address', 'Address in UAE'], ['homeAddress', 'Home country address']]],
      ['records', 'Cost & records', [['$totalCost', 'Total annual cost', 'auto'], ['$yearsText', 'Service', 'auto'], ['$nextText', 'Next document expiry', 'auto'], ['$alertText', 'Expiry alert', 'auto'],
        ['docLink', 'Document folder'], ['remarks', 'Remarks'], ['updated', 'Last updated', 'date'], ['updatedBy', 'Updated by']]]
    ];
    const staffValue = (p, c, key, kind) => {
      if (kind === 'auto') { const v = c[key.slice(1)]; return typeof v === 'number' ? (key === '$leaveBalance' ? String(v) : sAed(v)) : String(v); }
      const v = p[key];
      if (v === '' || v === null || v === undefined) return '—';
      return kind === 'date' ? sFmt(v) : kind === 'money' ? sAed(v) : String(v);
    };
`;

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
  s = s.replace('/*@STAFF*/', STAFF_JS);
  const out = f.replace('.tpl.html', '.dc.html');
  fs.writeFileSync(path.join(OUT, out), s);
  console.log('built', out, s.length);
}
