// Generates a student's raw fruit dataset from their student id. Each student
// gets the same base data, shuffled, lightly jittered, and corrupted in a
// deterministic way. Used by index.html.
(function (root) {
  const HEADER = ['Weight (g)', 'Diameter (cm)', 'Sweetness (0-1)', 'Color', 'Fruit'];
  const COLORS = ['red', 'green', 'yellow', 'orange'];
  const FRUITS = ['apple', 'orange', 'lemon'];

  // weight, diameter, sweetness, color, fruit
  const BASE = [
    [182, 8.1, 0.8, 'red', 'apple'],
    [205, 8.6, 0.7, 'red', 'apple'],
    [164, 7.6, 0.9, 'red', 'apple'],
    [231, 9.0, 0.8, 'red', 'apple'],
    [176, 7.9, 0.6, 'green', 'apple'],
    [198, 8.3, 0.7, 'green', 'apple'],
    [153, 7.3, 0.6, 'green', 'apple'],
    [214, 8.7, 0.8, 'yellow', 'apple'],
    [189, 8.2, 0.9, 'yellow', 'apple'],
    [171, 7.8, 0.7, 'red', 'apple'],
    [226, 8.9, 0.8, 'green', 'apple'],
    [160, 7.5, 0.9, 'red', 'apple'],
    [196, 8.4, 0.6, 'orange', 'orange'],
    [221, 9.2, 0.7, 'orange', 'orange'],
    [178, 7.9, 0.5, 'orange', 'orange'],
    [243, 9.6, 0.6, 'orange', 'orange'],
    [204, 8.7, 0.7, 'orange', 'orange'],
    [167, 7.6, 0.6, 'orange', 'orange'],
    [232, 9.4, 0.8, 'orange', 'orange'],
    [189, 8.2, 0.5, 'orange', 'orange'],
    [210, 8.9, 0.7, 'orange', 'orange'],
    [157, 7.4, 0.6, 'orange', 'orange'],
    [248, 9.8, 0.7, 'orange', 'orange'],
    [185, 8.1, 0.6, 'orange', 'orange'],
    [84, 5.6, 0.2, 'yellow', 'lemon'],
    [102, 6.1, 0.1, 'yellow', 'lemon'],
    [71, 5.2, 0.2, 'yellow', 'lemon'],
    [95, 5.9, 0.3, 'yellow', 'lemon'],
    [110, 6.4, 0.2, 'yellow', 'lemon'],
    [78, 5.4, 0.1, 'green', 'lemon'],
    [89, 5.7, 0.2, 'yellow', 'lemon'],
    [118, 6.6, 0.3, 'yellow', 'lemon'],
    [66, 5.0, 0.1, 'yellow', 'lemon'],
    [99, 6.0, 0.2, 'green', 'lemon'],
    [92, 5.8, 0.1, 'yellow', 'lemon'],
    [75, 5.3, 0.2, 'yellow', 'lemon']
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

  const MISSPELLED = { red: 'rde', green: 'gren', yellow: 'yelow', orange: 'ornage' };

  // Each corruption changes one cell of a row (an array of strings).
  // Indices: 0 weight, 1 diameter, 2 sweetness, 3 color, 4 fruit.
  const CORRUPTIONS = {
    blank: (random, row) => { row[randInt(random, 0, 2)] = ''; },
    na: (random, row) => { row[randInt(random, 0, 2)] = 'NA'; },
    question: (random, row) => { row[randInt(random, 0, 2)] = '?'; },
    negative: (random, row) => { row[0] = `-${row[0]}`; },
    zero: (random, row) => { row[choose(random, [0, 1])] = '0'; },
    absurd: (random, row) => {
      if (random() < 0.5) row[0] = '99999';
      else row[1] = String(Math.round(Number(row[1]) * 100));
    },
    words: (random, row) => { row[0] = numberToWords(Number(row[0])); },
    misspelled: (random, row) => { row[3] = MISSPELLED[row[3]]; }
  };

  function jitter(random, base) {
    const [weight, diameter, sweetness, color, fruit] = base;
    const newWeight = weight + randInt(random, -6, 6);
    const newDiameter = Math.round((diameter + (random() - 0.5) * 0.4) * 10) / 10;
    let newSweetness = sweetness;
    if (random() < 0.2) newSweetness = Math.min(1, Math.max(0.1, sweetness + choose(random, [-0.1, 0.1])));
    return [String(newWeight), newDiameter.toFixed(1), newSweetness.toFixed(1), color, fruit];
  }

  // Returns { header, rows } where rows are arrays of strings, in file order.
  // Blank cells are to be imputed; every other corruption means the row is removed.
  function generateDataset(studentId) {
    const random = seededRandom(hashId(studentId));
    const rows = shuffle(random, BASE).map((base) => jitter(random, base));
    const rowOrder = shuffle(random, rows.map((_, i) => i));
    const removals = shuffle(random, Object.keys(CORRUPTIONS).filter((t) => t !== 'blank'))
      .slice(0, randInt(random, 4, 6));
    const blanks = Array(randInt(random, 4, 5)).fill('blank');
    removals.concat(blanks).forEach((type, i) => CORRUPTIONS[type](random, rows[rowOrder[i]]));
    return { header: HEADER.slice(), rows };
  }

  function toCsv(dataset) {
    return [dataset.header].concat(dataset.rows).map((row) => row.join(',')).join('\n') + '\n';
  }

  const api = { generateDataset, toCsv, HEADER, COLORS, FRUITS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FruitDataset = api;
})(this);
