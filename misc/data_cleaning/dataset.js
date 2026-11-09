// Generates a student's raw fruit dataset from their student id. Each student
// gets the same base data, shuffled, lightly jittered, and corrupted in a
// deterministic way. Used by index.html.
(function (root) {
  const HEADER = ['Weight (g)', 'Diameter (cm)', 'Sweetness (0-1)', 'Fruit'];
  const FRUITS = ['apple', 'orange', 'lemon'];

  // weight, diameter, sweetness, fruit
  const BASE = [
    [182, 8.1, 0.8, 'apple'],
    [205, 8.6, 0.7, 'apple'],
    [164, 7.6, 0.9, 'apple'],
    [231, 9.0, 0.8, 'apple'],
    [176, 7.9, 0.7, 'apple'],
    [198, 8.3, 0.7, 'apple'],
    [153, 7.3, 0.7, 'apple'],
    [214, 8.7, 0.8, 'apple'],
    [189, 8.2, 0.9, 'apple'],
    [171, 7.8, 0.7, 'apple'],
    [226, 8.9, 0.8, 'apple'],
    [160, 7.5, 0.9, 'apple'],
    [196, 8.4, 0.4, 'orange'],
    [221, 9.2, 0.5, 'orange'],
    [178, 7.9, 0.3, 'orange'],
    [243, 9.6, 0.4, 'orange'],
    [204, 8.7, 0.5, 'orange'],
    [167, 7.6, 0.4, 'orange'],
    [232, 9.4, 0.6, 'orange'],
    [189, 8.2, 0.3, 'orange'],
    [210, 8.9, 0.5, 'orange'],
    [157, 7.4, 0.4, 'orange'],
    [248, 9.8, 0.5, 'orange'],
    [185, 8.1, 0.4, 'orange'],
    [84, 5.6, 0.2, 'lemon'],
    [102, 6.1, 0.1, 'lemon'],
    [71, 5.2, 0.2, 'lemon'],
    [95, 5.9, 0.3, 'lemon'],
    [110, 6.4, 0.2, 'lemon'],
    [78, 5.4, 0.1, 'lemon'],
    [89, 5.7, 0.2, 'lemon'],
    [118, 6.6, 0.3, 'lemon'],
    [66, 5.0, 0.1, 'lemon'],
    [99, 6.0, 0.2, 'lemon'],
    [92, 5.8, 0.1, 'lemon'],
    [75, 5.3, 0.2, 'lemon']
  ];

  // Same hash and generator as the logic gate homework.
  function hashId(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededRandom(seed) {
    let state = seed;
    return () => {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randInt(random, min, max) {
    return min + Math.floor(random() * (max - min + 1));
  }

  function choose(random, values) {
    return values[Math.floor(random() * values.length)];
  }

  function shuffle(random, values) {
    const result = values.slice();
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function numberToWords(n) {
    const ones = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
      'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
      'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const parts = [];
    if (n >= 100) {
      parts.push(`${ones[Math.floor(n / 100)]} hundred`);
      n %= 100;
    }
    if (n >= 20) {
      parts.push(n % 10 ? `${tens[Math.floor(n / 10)]}-${ones[n % 10]}` : tens[Math.floor(n / 10)]);
    } else if (n > 0 || parts.length === 0) {
      parts.push(ones[n]);
    }
    return parts.join(' ');
  }

  // Rows to remove (bad fruit label) and number cells to impute (one per numeric column).
  const NUM_BAD_ROWS = 2;
  const NUM_IMPUTED = 3;

  // Obviously broken text, the kind left by a bad export or a sensor glitch.
  const GARBAGE = ['#####', '%$#@!', 'xqzvk', 'Ã¤Ã¶Ã', '0x3F2A', '???', 'null', '-1'];

  // Corruptions that make a row unusable. Index 3 is the fruit.
  const ROW_CORRUPTIONS = [
    (random, row) => { row[3] = ''; },
    (random, row) => { row[3] = choose(random, GARBAGE); }
  ];

  // Corruptions of a single number, to be imputed. Each lists the columns it
  // applies to (0 weight, 1 diameter, 2 sweetness) and returns the new cell.
  const CELL_CORRUPTIONS = [
    { columns: [0, 1, 2], apply: () => '' },
    { columns: [0, 1, 2], apply: () => 'NA' },
    { columns: [0, 1, 2], apply: () => '?' },
    { columns: [0, 1, 2], apply: (value) => `-${value}` },
    { columns: [0, 1], apply: () => '0' },
    { columns: [0], apply: () => '99999' },
    { columns: [1, 2], apply: (value) => String(Math.round(Number(value) * 100)) },
    { columns: [0], apply: (value) => numberToWords(Number(value)) }
  ];

  function jitter(random, base) {
    const [weight, diameter, sweetness, fruit] = base;
    const newWeight = weight + randInt(random, -6, 6);
    const newDiameter = Math.round((diameter + (random() - 0.5) * 0.4) * 10) / 10;
    let newSweetness = sweetness;
    if (random() < 0.2) newSweetness = Math.min(1, Math.max(0.1, sweetness + choose(random, [-0.1, 0.1])));
    return [String(newWeight), newDiameter.toFixed(1), newSweetness.toFixed(1), fruit];
  }

  // Returns { header, rows } where rows are arrays of strings, in file order.
  function generateDataset(studentId) {
    const random = seededRandom(hashId(studentId));
    const rows = shuffle(random, BASE).map((base) => jitter(random, base));
    const rowOrder = shuffle(random, rows.map((_, i) => i));

    shuffle(random, ROW_CORRUPTIONS).slice(0, NUM_BAD_ROWS)
      .forEach((corrupt, i) => corrupt(random, rows[rowOrder[i]]));

    // Each imputed cell is in a different numeric column, with a different kind of problem.
    const cellTypes = shuffle(random, CELL_CORRUPTIONS);
    shuffle(random, [0, 1, 2]).slice(0, NUM_IMPUTED).forEach((column, i) => {
      const typeIndex = cellTypes.findIndex((type) => type.columns.includes(column));
      const [type] = cellTypes.splice(typeIndex, 1);
      const row = rows[rowOrder[NUM_BAD_ROWS + i]];
      row[column] = type.apply(row[column]);
    });

    return { header: HEADER.slice(), rows };
  }

  function toCsv(dataset) {
    return [dataset.header].concat(dataset.rows).map((row) => row.join(',')).join('\n') + '\n';
  }

  const api = { generateDataset, toCsv, HEADER, FRUITS, NUM_BAD_ROWS, NUM_IMPUTED };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FruitDataset = api;
})(this);
