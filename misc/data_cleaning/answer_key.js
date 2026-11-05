#!/usr/bin/env node
// Prints the answer key for a student's dataset. Not published (excluded in _config.yml).
// Usage: node misc/data_cleaning/answer_key.js <student id> [--raw]
const { generateDataset, toCsv, COLORS, FRUITS } = require('./dataset.js');

const args = process.argv.slice(2);
const showRaw = args.includes('--raw');
const studentId = args.find((a) => !a.startsWith('--'));
if (!studentId) {
  console.error('Usage: node misc/data_cleaning/answer_key.js <student id> [--raw]');
  process.exit(1);
}

const dataset = generateDataset(studentId.trim());
const NUMERIC = [
  { name: 'weight', min: 30, max: 400 },
  { name: 'diameter', min: 3, max: 15 },
  { name: 'sweetness', min: 0, max: 1 }
];

function problem(row) {
  for (let i = 0; i < 3; i += 1) {
    const cell = row[i];
    if (cell === '') continue;
    if (!/^-?\d+(\.\d+)?$/.test(cell)) return `${NUMERIC[i].name} "${cell}"`;
    const value = Number(cell);
    if (value < NUMERIC[i].min || value > NUMERIC[i].max) return `${NUMERIC[i].name} ${cell}`;
  }
  if (!COLORS.includes(row[3])) return `color "${row[3]}"`;
  if (!FRUITS.includes(row[4])) return `fruit "${row[4]}"`;
  return null;
}

if (showRaw) {
  console.log('Raw data:\n');
  console.log(toCsv(dataset));
}

// Spreadsheet row numbers: the header is row 1.
const kept = [];
const removed = [];
dataset.rows.forEach((row, i) => {
  const reason = problem(row);
  if (reason) removed.push(`row ${i + 2}: ${reason}`);
  else kept.push({ sheetRow: i + 2, values: row.slice() });
});

const imputed = [];
for (let col = 0; col < 3; col += 1) {
  const present = kept.filter((r) => r.values[col] !== '').map((r) => Number(r.values[col]));
  const mean = present.reduce((a, b) => a + b, 0) / present.length;
  kept.forEach((r) => {
    if (r.values[col] === '') {
      r.values[col] = mean;
      imputed.push(`row ${r.sheetRow}: ${NUMERIC[col].name} = ${mean.toFixed(2)}`);
    }
  });
}

// Sweetness is already 0-1, so only weight and diameter are rescaled.
const maxes = [0, 1].map((col) => Math.max(...kept.map((r) => Number(r.values[col]))));

console.log(`Student ${studentId}`);
console.log(`\nRemoved ${removed.length} rows:`);
removed.forEach((line) => console.log(`  ${line}`));
console.log(`\nImputed ${imputed.length} cells (column average after removing bad rows):`);
imputed.forEach((line) => console.log(`  ${line}`));
console.log(`\nMaxes: weight ${maxes[0]}, diameter ${maxes[1]}`);
console.log(`\nCleaned data (${kept.length} rows):\n`);

const header = ['weight', 'diameter', 'sweetness']
  .concat(COLORS.map((c) => `color ${c}`))
  .concat(FRUITS.map((f) => `fruit ${f}`));
console.log(header.join(','));
kept.forEach((r) => {
  const scaled = [0, 1].map((col) => (Number(r.values[col]) / maxes[col]).toFixed(3))
    .concat(Number(r.values[2]).toFixed(3));
  const colors = COLORS.map((c) => (r.values[3] === c ? 1 : 0));
  const fruits = FRUITS.map((f) => (r.values[4] === f ? 1 : 0));
  console.log(scaled.concat(colors, fruits).join(','));
});
