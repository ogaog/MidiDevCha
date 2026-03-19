const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const mod12 = (n) => ((n % 12) + 12) % 12;

function uniquePitchClasses(notes) {
  return [...new Set(notes.map((n) => mod12(n)))].sort((a, b) => a - b);
}

function intervalSet(root, pcs) {
  return new Set(pcs.map((pc) => mod12(pc - root)));
}

function addAll(set, values) {
  values.forEach((v) => set.add(v));
}

function buildCandidate(root, pcs, bassPc) {
  const iv = intervalSet(root, pcs);
  const has = (n) => iv.has(n);

  const has2 = has(2);
  const hasb3 = has(3);
  const has3 = has(4);
  const has4 = has(5);
  const hasb5 = has(6);
  const has5 = has(7);
  const hasSharp5 = has(8);
  const has6 = has(9);
  const hasb7 = has(10);
  const has7 = has(11);
  const hasb9 = has(1);
  const hasSharp9 = has(3) && has3;

  const explained = new Set([0]);
  let suffix = '';
  let quality = 'unknown';
  let family = 'other';
  let score = 0;

  if (hasb3 && hasb5 && has6) {
    suffix = 'dim7';
    quality = 'dim7';
    family = 'dim';
    addAll(explained, [3, 6, 9]);
    score += 44;
  } else if (hasb3 && hasb5 && hasb7) {
    suffix = 'm7b5';
    quality = 'm7b5';
    family = 'half-diminished';
    addAll(explained, [3, 6, 10]);
    score += 43;
  } else if (!has3 && !hasb3 && has4 && has5 && hasb7) {
    suffix = has2 ? '9sus4' : '7sus4';
    quality = has2 ? '9sus4' : '7sus4';
    family = 'sus';
    addAll(explained, has2 ? [2, 5, 7, 10] : [5, 7, 10]);
    score += has2 ? 42 : 39;
  } else if (has3 && has5 && has7 && has2) {
    suffix = 'maj9';
    quality = 'maj9';
    family = 'major';
    addAll(explained, [2, 4, 7, 11]);
    score += 43;
  } else if (hasb3 && has5 && hasb7 && has2) {
    suffix = 'm9';
    quality = 'm9';
    family = 'minor';
    addAll(explained, [2, 3, 7, 10]);
    score += 43;
  } else if (has3 && has5 && hasb7 && has2) {
    suffix = '9';
    quality = '9';
    family = 'dominant';
    addAll(explained, [2, 4, 7, 10]);
    score += 42;
  } else if (has3 && has5 && has7) {
    suffix = 'maj7';
    quality = 'maj7';
    family = 'major';
    addAll(explained, [4, 7, 11]);
    score += 38;
  } else if (hasb3 && has5 && has7) {
    suffix = 'mMaj7';
    quality = 'mMaj7';
    family = 'minor';
    addAll(explained, [3, 7, 11]);
    score += 38;
  } else if (has3 && has5 && hasb7) {
    suffix = '7';
    quality = '7';
    family = 'dominant';
    addAll(explained, [4, 7, 10]);
    score += 37;
  } else if (hasb3 && has5 && hasb7) {
    suffix = 'm7';
    quality = 'm7';
    family = 'minor';
    addAll(explained, [3, 7, 10]);
    score += 37;
  } else if (has3 && has5 && has6 && has2) {
    suffix = '6/9';
    quality = '6/9';
    family = 'major';
    addAll(explained, [2, 4, 7, 9]);
    score += 36;
  } else if (hasb3 && has5 && has6 && has2) {
    suffix = 'm6/9';
    quality = 'm6/9';
    family = 'minor';
    addAll(explained, [2, 3, 7, 9]);
    score += 36;
  } else if (has3 && has5 && has6) {
    suffix = '6';
    quality = '6';
    family = 'major';
    addAll(explained, [4, 7, 9]);
    score += 33;
  } else if (hasb3 && has5 && has6) {
    suffix = 'm6';
    quality = 'm6';
    family = 'minor';
    addAll(explained, [3, 7, 9]);
    score += 33;
  } else if (has3 && hasSharp5) {
    suffix = 'aug';
    quality = 'aug';
    family = 'aug';
    addAll(explained, [4, 8]);
    score += 31;
  } else if (hasb3 && hasb5) {
    suffix = 'dim';
    quality = 'dim';
    family = 'dim';
    addAll(explained, [3, 6]);
    score += 31;
  } else if (!has3 && !hasb3 && has4 && has5) {
    suffix = 'sus4';
    quality = 'sus4';
    family = 'sus';
    addAll(explained, [5, 7]);
    score += 28;
  } else if (!has3 && !hasb3 && has2 && has5) {
    suffix = 'sus2';
    quality = 'sus2';
    family = 'sus';
    addAll(explained, [2, 7]);
    score += 27;
  } else if (has3 && has5 && has2) {
    suffix = 'add9';
    quality = 'add9';
    family = 'major';
    addAll(explained, [2, 4, 7]);
    score += 29;
  } else if (hasb3 && has5 && has2) {
    suffix = 'madd9';
    quality = 'madd9';
    family = 'minor';
    addAll(explained, [2, 3, 7]);
    score += 29;
  } else if (has3 && has5 && has4) {
    suffix = 'add11';
    quality = 'add11';
    family = 'major';
    addAll(explained, [4, 5, 7]);
    score += 28;
  } else if (hasb3 && has5 && has4) {
    suffix = 'madd11';
    quality = 'madd11';
    family = 'minor';
    addAll(explained, [3, 5, 7]);
    score += 28;
  } else if (has3 && has5) {
    suffix = '';
    quality = 'major';
    family = 'major';
    addAll(explained, [4, 7]);
    score += 26;
  } else if (hasb3 && has5) {
    suffix = 'm';
    quality = 'minor';
    family = 'minor';
    addAll(explained, [3, 7]);
    score += 26;
  } else if (has5) {
    suffix = '5';
    quality = 'power';
    family = 'power';
    explained.add(7);
    score += 18;
  } else if (has3) {
    suffix = '(omit5)';
    quality = 'major-omit5';
    family = 'major';
    explained.add(4);
    score += 14;
  } else if (hasb3) {
    suffix = 'm(omit5)';
    quality = 'minor-omit5';
    family = 'minor';
    explained.add(3);
    score += 14;
  } else {
    return null;
  }

  if (family === 'dominant') {
    if (hasb9) {
      suffix += '(b9)';
      explained.add(1);
      score += 3;
    }
    if (hasSharp9) {
      suffix += '(#9)';
      explained.add(3);
      score += 2;
    }
    if (hasb5 && !explained.has(6)) {
      suffix += '(b5)';
      explained.add(6);
      score += 2;
    }
    if (hasSharp5 && !explained.has(8)) {
      suffix += '(#5)';
      explained.add(8);
      score += 2;
    }
    if (has6 && !explained.has(9) && !has4) {
      suffix = suffix.replace(/^(7|9)/, '$1(13)');
      explained.add(9);
      score += 2;
    }
  }

  if ((quality === 'major' || quality === 'minor') && has6 && !explained.has(9)) {
    suffix += '6';
    explained.add(9);
    score += 1;
  }

  if ((quality === 'major' || quality === 'minor') && has2 && !explained.has(2)) {
    suffix += '(add9)';
    explained.add(2);
    score += 1;
  }

  if ((quality === 'major' || quality === 'minor') && has4 && !explained.has(5)) {
    suffix += '(add11)';
    explained.add(5);
    score += 1;
  }

  if (has3 && hasb3) score -= 8;
  if (has5 && hasb5) score -= 5;
  if (has5 && hasSharp5) score -= 5;
  if (hasb7 && has7) score -= 7;

  const extras = [...iv].filter((n) => !explained.has(n));
  score -= extras.length * 4;

  if (bassPc === root) score += 6;
  else if (iv.has(mod12(bassPc - root))) score += 2;

  const slashBassPc = bassPc !== root && iv.has(mod12(bassPc - root)) ? bassPc : null;
  const label = `${NOTE_NAMES[root]}${suffix}${slashBassPc !== null ? `/${NOTE_NAMES[slashBassPc]}` : ''}`;

  return {
    root,
    bassPc,
    slashBassPc,
    suffix,
    label,
    quality,
    family,
    score,
  };
}

export function detectChord(pressedNotes) {
  if (!pressedNotes?.length) {
    return {
      label: '–',
      root: null,
      bassPc: null,
      slashBassPc: null,
      suffix: '',
      quality: null,
      family: null,
      score: -Infinity,
    };
  }

  const sortedNotes = [...new Set(pressedNotes)].sort((a, b) => a - b);
  const pcs = uniquePitchClasses(sortedNotes);
  const bassPc = mod12(sortedNotes[0]);

  let best = null;
  for (const root of pcs) {
    const candidate = buildCandidate(root, pcs, bassPc);
    if (!candidate) continue;
    if (!best || candidate.score > best.score) best = candidate;
  }

  if (best) return best;

  return {
    label: NOTE_NAMES[bassPc],
    root: bassPc,
    bassPc,
    slashBassPc: null,
    suffix: '',
    quality: 'single',
    family: 'single',
    score: 0,
  };
}
