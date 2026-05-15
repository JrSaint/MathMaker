(function () {
  'use strict';

  const STORAGE_KEY = 'mathmaker:v1';
  const MAX_NUM = 9999;

  const state = {
    N: 2,
    M: 2,
    multiplicand: 0,
    multiplier: 0,
    allowZeros: false,
    expected: {},
    inputs: new Map(),
    showedAnswer: false,
    score: 0,
    solvedKeys: new Set(),
  };

  const $ = (id) => document.getElementById(id);

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomDigit(allowZero) {
    return allowZero ? randomInt(0, 9) : randomInt(1, 9);
  }

  function generateNumber(digits, allowZeros) {
    if (digits === 1) return randomInt(2, 9);
    let n = randomInt(1, 9);
    for (let i = 1; i < digits; i++) {
      n = n * 10 + randomDigit(allowZeros);
    }
    return n;
  }

  function digitsOf(n, minLen) {
    const out = [];
    if (n === 0) out.push(0);
    let v = n;
    while (v > 0) {
      out.push(v % 10);
      v = Math.floor(v / 10);
    }
    while (out.length < minLen) out.push(0);
    return out;
  }

  function parseId(id) {
    const parts = id.split(':');
    const type = parts[0];
    if (parts.length === 3) {
      return { type, k: +parts[1], col: +parts[2].slice(1) };
    }
    return { type, k: null, col: +parts[1].slice(1) };
  }

  function makeId(type, k, col) {
    return k !== null && k !== undefined
      ? `${type}:${k}:c${col}`
      : `${type}:c${col}`;
  }

  function computeExpected() {
    const { N, M, multiplicand, multiplier } = state;
    const cols = N + M;
    const mD = digitsOf(multiplicand, N);
    const rD = digitsOf(multiplier, M);
    const expected = {};

    for (let c = 0; c < N; c++) expected[makeId('multiplicand', null, c)] = String(mD[c]);
    for (let c = 0; c < M; c++) expected[makeId('multiplier', null, c)] = String(rD[c]);

    const ppByCol = [];

    for (let k = 0; k < M; k++) {
      const d = rD[k];
      let carry = 0;
      const pp = new Array(cols).fill(null);
      const carryRow = new Array(cols).fill(null);

      for (let i = 0; i < N; i++) {
        const prod = mD[i] * d + carry;
        const digit = prod % 10;
        const nextCarry = Math.floor(prod / 10);
        const col = i + k;
        pp[col] = digit;
        if (i < N - 1) {
          if (nextCarry > 0) carryRow[col + 1] = nextCarry;
        } else if (nextCarry > 0) {
          pp[col + 1] = nextCarry;
        }
        carry = nextCarry;
      }

      ppByCol.push(pp);

      for (let c = k; c <= N + k; c++) {
        const key = makeId('pp', k, c);
        expected[key] = pp[c] !== null ? String(pp[c]) : '';
      }
      for (let c = k + 1; c <= N + k; c++) {
        const key = makeId('carry', k, c);
        expected[key] = carryRow[c] !== null ? String(carryRow[c]) : '';
      }
    }

    if (M >= 2) {
      let addCarry = 0;
      for (let c = 0; c < cols; c++) {
        let columnSum = addCarry;
        for (let k = 0; k < M; k++) {
          const v = ppByCol[k][c];
          if (v !== null) columnSum += v;
        }
        const digit = columnSum % 10;
        const nextAddCarry = Math.floor(columnSum / 10);
        expected[makeId('sum', null, c)] = String(digit);
        if (nextAddCarry > 0 && c + 1 < cols) {
          expected[makeId('addcarry', null, c + 1)] = String(nextAddCarry);
        }
        addCarry = nextAddCarry;
      }
      for (let c = 1; c < cols; c++) {
        const key = makeId('addcarry', null, c);
        if (!(key in expected)) expected[key] = '';
      }
      const product = state.multiplicand * state.multiplier;
      const productDigits = String(product).length;
      for (let c = productDigits; c < cols; c++) {
        expected[makeId('sum', null, c)] = '';
      }
    }

    state.expected = expected;
  }

  function mkCell(cls) {
    const div = document.createElement('div');
    div.className = cls;
    return div;
  }

  function appendMargin(grid, label, opts) {
    const cell = document.createElement('div');
    cell.className = 'cell margin';
    if (opts && opts.op) cell.classList.add('op');
    if (opts && opts.divider) cell.classList.add('divider-bottom');
    if (label) {
      const main = document.createElement('span');
      main.textContent = label;
      cell.appendChild(main);
    }
    grid.appendChild(cell);
  }


  function formatPlaceValue(c) {
    const v = Math.pow(10, c);
    return v.toLocaleString('en-US');
  }

  function attachInput(cell, id) {
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 1;
    input.inputMode = 'numeric';
    input.autocomplete = 'off';
    input.dataset.id = id;
    input.setAttribute('aria-label', id);
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKeyDown);
    input.addEventListener('focus', () => input.select());
    cell.appendChild(input);
    state.inputs.set(id, input);
  }

  function buildGrid() {
    const grid = $('grid');
    grid.innerHTML = '';
    state.inputs.clear();

    const { N, M } = state;
    const cols = N + M;
    grid.style.gridTemplateColumns = `40px repeat(${cols}, 72px)`;

    appendMargin(grid, '');
    for (let c = cols - 1; c >= 0; c--) {
      const cell = mkCell('cell header');
      const label = formatPlaceValue(c);
      cell.textContent = label;
      cell.dataset.len = String(label.length);
      grid.appendChild(cell);
    }

    appendMargin(grid, '');
    for (let c = cols - 1; c >= 0; c--) {
      if (c < N) {
        const cell = mkCell('cell given');
        cell.textContent = state.expected[makeId('multiplicand', null, c)] || '';
        grid.appendChild(cell);
      } else {
        grid.appendChild(mkCell('cell black'));
      }
    }

    appendMargin(grid, '×', { op: true, divider: true });
    for (let c = cols - 1; c >= 0; c--) {
      if (c < M) {
        const cell = mkCell('cell given divider-bottom');
        cell.textContent = state.expected[makeId('multiplier', null, c)] || '';
        grid.appendChild(cell);
      } else {
        grid.appendChild(mkCell('cell black divider-bottom'));
      }
    }

    for (let k = 0; k < M; k++) {
      const isLastPP = k === M - 1;
      const showPPDivider = isLastPP && M >= 2;
      const ppDividerClass = showPPDivider ? ' divider-bottom' : '';

      appendMargin(grid, '');
      for (let c = cols - 1; c >= 0; c--) {
        if (c > k && c < N + k) {
          const cell = mkCell('cell carry');
          attachInput(cell, makeId('carry', k, c));
          grid.appendChild(cell);
        } else {
          grid.appendChild(mkCell('cell black'));
        }
      }

      appendMargin(grid, showPPDivider ? '+' : '', { op: showPPDivider, divider: showPPDivider });
      for (let c = cols - 1; c >= 0; c--) {
        if (c >= k && c <= N + k) {
          const cell = mkCell('cell input' + ppDividerClass);
          attachInput(cell, makeId('pp', k, c));
          grid.appendChild(cell);
        } else {
          grid.appendChild(mkCell('cell black' + ppDividerClass));
        }
      }
    }

    if (M >= 2) {
      appendMargin(grid, '');
      for (let c = cols - 1; c >= 0; c--) {
        if (c >= 1) {
          const cell = mkCell('cell carry');
          attachInput(cell, makeId('addcarry', null, c));
          grid.appendChild(cell);
        } else {
          grid.appendChild(mkCell('cell black'));
        }
      }

      appendMargin(grid, '=', { op: true });
      for (let c = cols - 1; c >= 0; c--) {
        const cell = mkCell('cell input sum-cell');
        attachInput(cell, makeId('sum', null, c));
        grid.appendChild(cell);
      }
    }

    requestAnimationFrame(() => {
      const wrap = grid.parentElement;
      if (wrap && wrap.classList.contains('grid-scroll')) {
        wrap.scrollLeft = wrap.scrollWidth;
      }
    });
  }

  function onInput(e) {
    const input = e.target;
    let val = input.value.replace(/[^0-9]/g, '');
    if (val.length > 1) val = val.slice(-1);
    input.value = val;
    validateCell(input);
    if (val.length === 1) moveByCol(input, +1);
  }

  function onKeyDown(e) {
    const input = e.target;
    if (e.key === 'Backspace' && !input.value) {
      moveByCol(input, -1);
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      moveByCol(input, +1);
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      moveByCol(input, -1);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      moveByRow(input, -1);
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      moveByRow(input, +1);
      e.preventDefault();
    } else if (e.key === 'Enter') {
      checkAll();
      e.preventDefault();
    }
  }

  function moveByCol(input, delta) {
    const parsed = parseId(input.dataset.id);
    const newId = makeId(parsed.type, parsed.k, parsed.col + delta);
    const next = state.inputs.get(newId);
    if (next) next.focus();
  }

  function rowList() {
    const rows = [];
    for (let k = 0; k < state.M; k++) {
      rows.push({ type: 'carry', k });
      rows.push({ type: 'pp', k });
    }
    if (state.M >= 2) {
      rows.push({ type: 'addcarry', k: null });
      rows.push({ type: 'sum', k: null });
    }
    return rows;
  }

  function moveByRow(input, delta) {
    const parsed = parseId(input.dataset.id);
    const rows = rowList();
    let idx = rows.findIndex(r => r.type === parsed.type && r.k === parsed.k);
    if (idx === -1) return;
    let next = idx + delta;
    while (next >= 0 && next < rows.length) {
      const r = rows[next];
      const candidate = state.inputs.get(makeId(r.type, r.k, parsed.col));
      if (candidate) { candidate.focus(); return; }
      next += delta;
    }
  }

  let opHintShown = false;
  function showOperationHint(msg) {
    const status = $('status');
    status.textContent = msg;
    status.classList.remove('ok');
    status.classList.add('bad');
    opHintShown = true;
  }
  function clearOperationHint() {
    if (!opHintShown) return;
    const status = $('status');
    status.textContent = '';
    status.classList.remove('ok', 'bad');
    opHintShown = false;
  }

  function getMultPair(id) {
    const p = parseId(id);
    if (p.type === 'pp') {
      const k = p.k;
      const col = p.col;
      const i = col - k;
      if (i >= 0 && i < state.N) {
        const tensId = i < state.N - 1
          ? makeId('carry', k, col + 1)
          : makeId('pp', k, col + 1);
        return { onesId: id, tensId, i, k };
      }
      if (i === state.N) {
        return { onesId: makeId('pp', k, col - 1), tensId: id, i: i - 1, k };
      }
      return null;
    }
    if (p.type === 'carry') {
      const k = p.k;
      const col = p.col;
      const i = col - k - 1;
      if (i < 0 || i >= state.N - 1) return null;
      return { onesId: makeId('pp', k, col - 1), tensId: id, i, k };
    }
    return null;
  }

  function getAddPair(id) {
    const p = parseId(id);
    const cols = state.N + state.M;
    if (p.type === 'sum') {
      const c = p.col;
      if (c + 1 >= cols) return null;
      return { onesId: id, tensId: makeId('addcarry', null, c + 1), c };
    }
    if (p.type === 'addcarry') {
      const c = p.col;
      if (c < 1) return null;
      return { onesId: makeId('sum', null, c - 1), tensId: id, c: c - 1 };
    }
    return null;
  }

  function detectMultiplyMistake(id) {
    const pair = getMultPair(id);
    if (!pair) return null;
    const onesInput = state.inputs.get(pair.onesId);
    const tensInput = state.inputs.get(pair.tensId);
    if (!onesInput || !tensInput) return null;
    if (onesInput.value === '' || tensInput.value === '') return null;
    const typedOnes = parseInt(onesInput.value, 10);
    const typedTens = parseInt(tensInput.value, 10);
    if (!Number.isInteger(typedOnes) || !Number.isInteger(typedTens)) return null;

    const mD = digitsOf(state.multiplicand, state.N);
    const rD = digitsOf(state.multiplier, state.M);
    const a = mD[pair.i];
    const b = rD[pair.k];
    let prevCarry = 0;
    for (let j = 0; j < pair.i; j++) {
      prevCarry = Math.floor((mD[j] * b + prevCarry) / 10);
    }
    const product = a * b + prevCarry;
    const correctOnes = product % 10;
    const correctTens = Math.floor(product / 10);

    if (typedOnes === correctOnes && typedTens === correctTens) return null;

    if (correctTens !== correctOnes &&
        typedOnes === correctTens && typedTens === correctOnes) {
      return `Looks like the two digits got swapped — try flipping them.`;
    }

    const sumValue = a + b + prevCarry;
    const addOnes = sumValue % 10;
    const addTens = Math.floor(sumValue / 10);
    if (typedOnes === addOnes && typedTens === addTens &&
        (addOnes !== correctOnes || addTens !== correctTens)) {
      return `This row is the × row — make sure you're multiplying the digits, not adding them.`;
    }
    return null;
  }

  function detectAddMistake(id) {
    const pair = getAddPair(id);
    if (!pair) return null;
    const onesInput = state.inputs.get(pair.onesId);
    const tensInput = state.inputs.get(pair.tensId);
    if (!onesInput || !tensInput) return null;
    if (onesInput.value === '' || tensInput.value === '') return null;
    const typedOnes = parseInt(onesInput.value, 10);
    const typedTens = parseInt(tensInput.value, 10);
    if (!Number.isInteger(typedOnes) || !Number.isInteger(typedTens)) return null;

    const c = pair.c;
    const ppVals = [];
    for (let k = 0; k < state.M; k++) {
      const v = state.expected[makeId('pp', k, c)];
      if (v !== '' && v !== undefined) {
        const n = parseInt(v, 10);
        if (Number.isInteger(n)) ppVals.push(n);
      }
    }
    const addCarryVal = parseInt(state.expected[makeId('addcarry', null, c)] || '0', 10) || 0;
    const total = ppVals.reduce((acc, v) => acc + v, 0) + addCarryVal;
    const correctOnes = total % 10;
    const correctTens = Math.floor(total / 10);

    if (typedOnes === correctOnes && typedTens === correctTens) return null;

    if (correctTens !== correctOnes &&
        typedOnes === correctTens && typedTens === correctOnes) {
      return `Looks like the two digits got swapped — try flipping them.`;
    }

    if (ppVals.length >= 2) {
      const product = ppVals.reduce((acc, v) => acc * v, 1);
      const mulOnes = product % 10;
      const mulTens = Math.floor(product / 10);
      if (typedOnes === mulOnes && typedTens === mulTens &&
          (mulOnes !== correctOnes || mulTens !== correctTens)) {
        return `This row is the + row — add the column instead of multiplying.`;
      }
    }
    return null;
  }

  function detectPairedMistake(id) {
    const p = parseId(id);
    if (p.type === 'pp' || p.type === 'carry') return detectMultiplyMistake(id);
    if (p.type === 'sum' || p.type === 'addcarry') return detectAddMistake(id);
    return null;
  }

  function refreshMistakeMarkers(focusedId) {
    const mistakeIds = new Set();
    let focusedHint = null;
    let anyHint = null;
    const evaluated = new Set();
    state.inputs.forEach((inp, cellId) => {
      if (evaluated.has(cellId)) return;
      const p = parseId(cellId);
      let pair = null;
      if (p.type === 'pp' || p.type === 'carry') pair = getMultPair(cellId);
      else if (p.type === 'sum' || p.type === 'addcarry') pair = getAddPair(cellId);
      if (!pair) return;
      evaluated.add(pair.onesId);
      evaluated.add(pair.tensId);
      const hint = detectPairedMistake(cellId);
      if (hint) {
        mistakeIds.add(pair.onesId);
        mistakeIds.add(pair.tensId);
        if (!anyHint) anyHint = hint;
        if (focusedId && (pair.onesId === focusedId || pair.tensId === focusedId)) {
          focusedHint = hint;
        }
      }
    });
    state.inputs.forEach((inp, cellId) => {
      const cell = inp.parentElement;
      if (mistakeIds.has(cellId)) cell.classList.add('mistake');
      else cell.classList.remove('mistake');
    });
    return focusedHint || anyHint;
  }

  function isMultiplicationComplete() {
    if (state.inputs.size === 0) return false;
    for (const [id, input] of state.inputs) {
      const p = parseId(id);
      if (p.type !== 'pp' && p.type !== 'carry') continue;
      const exp = state.expected[id] || '';
      if (input.value !== exp) return false;
    }
    return true;
  }

  function refreshSumRowGreen() {
    const multComplete = isMultiplicationComplete();
    state.inputs.forEach((input, id) => {
      const p = parseId(id);
      if (p.type !== 'sum' && p.type !== 'addcarry') return;
      const cell = input.parentElement;
      if (cell.classList.contains('revealed') || cell.classList.contains('wrong')) return;
      if (!multComplete) {
        cell.classList.remove('correct');
        return;
      }
      const exp = state.expected[id] || '';
      if (input.value !== '' && input.value === exp) {
        cell.classList.add('correct');
      } else {
        cell.classList.remove('correct');
      }
    });
  }

  function validateCell(input) {
    const cell = input.parentElement;
    cell.classList.remove('correct', 'wrong', 'revealed');
    const hint = refreshMistakeMarkers(input.dataset.id);
    clearOperationHint();
    if (hint) showOperationHint(hint);
    refreshSumRowGreen();
  }

  function celebrate() {
    let i = 0;
    state.inputs.forEach((input) => {
      const cell = input.parentElement;
      if (cell.classList.contains('correct')) {
        setTimeout(() => {
          cell.classList.add('celebrate');
          setTimeout(() => cell.classList.remove('celebrate'), 600);
        }, i * 35);
        i++;
      }
    });
  }

  function checkAll() {
    let allCorrect = true;
    let mistakes = 0;
    let blank = 0;
    let anyFilled = false;
    state.inputs.forEach((input, id) => {
      const exp = state.expected[id] || '';
      const cell = input.parentElement;
      cell.classList.remove('correct', 'wrong', 'revealed');
      if (input.value === exp) {
        if (input.value !== '') {
          cell.classList.add('correct');
          anyFilled = true;
        }
      } else if (input.value === '') {
        if (exp !== '') { blank++; allCorrect = false; }
      } else {
        cell.classList.add('wrong');
        mistakes++;
        anyFilled = true;
        allCorrect = false;
      }
    });
    const status = $('status');
    status.classList.remove('ok', 'bad');
    opHintShown = false;
    if (!anyFilled) {
      status.textContent = 'Type your answers into the white cells, then check again.';
      return;
    }
    if (allCorrect) {
      status.textContent = `Nice work! ${state.multiplicand} × ${state.multiplier} = ${state.multiplicand * state.multiplier}`;
      status.classList.add('ok');
      celebrate();
      recordSolved();
    } else {
      const parts = [];
      if (mistakes) parts.push(`${mistakes} ${mistakes === 1 ? 'mistake' : 'mistakes'}`);
      if (blank) parts.push(`${blank} blank ${blank === 1 ? 'cell' : 'cells'}`);
      status.textContent = `Keep going — ${parts.join(' and ')}. Reds are wrong, greens are right.`;
      status.classList.add('bad');
    }
  }

  function naturalFillOrder() {
    const order = [];
    const { N, M } = state;
    for (let k = 0; k < M; k++) {
      for (let i = 0; i < N; i++) {
        order.push(makeId('pp', k, i + k));
        if (i < N - 1) {
          order.push(makeId('carry', k, i + k + 1));
        } else {
          order.push(makeId('pp', k, i + k + 1));
        }
      }
    }
    if (M >= 2) {
      const cols = N + M;
      for (let c = 0; c < cols; c++) {
        order.push(makeId('sum', null, c));
        if (c + 1 < cols) order.push(makeId('addcarry', null, c + 1));
      }
    }
    return order;
  }

  function explainHint(id) {
    const p = parseId(id);
    const mD = digitsOf(state.multiplicand, state.N);
    const rD = digitsOf(state.multiplier, state.M);

    const carryBefore = (k, i) => {
      let c = 0;
      for (let j = 0; j < i; j++) {
        c = Math.floor((mD[j] * rD[k] + c) / 10);
      }
      return c;
    };

    if (p.type === 'pp') {
      const k = p.k;
      const i = p.col - k;
      if (i < state.N) {
        const a = mD[i];
        const b = rD[k];
        const carry = carryBefore(k, i);
        const raw = a * b;
        const total = raw + carry;
        const write = total % 10;
        const out = Math.floor(total / 10);
        let msg = `${a} × ${b} = ${raw}`;
        if (carry > 0) msg += `, plus the carry ${carry} = ${total}`;
        msg += `. Write ${write}`;
        if (out > 0) {
          msg += i < state.N - 1
            ? `, and carry ${out} into the next column.`
            : `, and put the ${out} in the next column on the left.`;
        } else {
          msg += '.';
        }
        return msg;
      } else {
        const finalCarry = carryBefore(k, state.N);
        return `Bring down the carry ${finalCarry} as the next digit.`;
      }
    }

    if (p.type === 'carry') {
      return `That's the carry from the last multiplication. Write it above the next column.`;
    }

    if (p.type === 'sum') {
      const c = p.col;
      const parts = [];
      let total = 0;
      const addCarryKey = makeId('addcarry', null, c);
      const addCarry = parseInt(state.expected[addCarryKey] || '0', 10) || 0;
      if (addCarry > 0) { parts.push(`${addCarry} (carry)`); total += addCarry; }
      for (let k = 0; k < state.M; k++) {
        const v = state.expected[makeId('pp', k, c)];
        if (v) { parts.push(v); total += parseInt(v, 10); }
      }
      if (parts.length === 0) return 'This column has nothing to add — it stays blank.';
      const digit = total % 10;
      const out = Math.floor(total / 10);
      let msg = `Add this column: ${parts.join(' + ')} = ${total}. Write ${digit}`;
      if (out > 0) msg += `, carry ${out}.`;
      else msg += '.';
      return msg;
    }

    if (p.type === 'addcarry') {
      return `That's the carry from the column on the right.`;
    }

    return '';
  }

  function fillNextHint() {
    const order = naturalFillOrder();
    for (const id of order) {
      const input = state.inputs.get(id);
      if (!input) continue;
      if (input.value !== '') continue;
      const exp = state.expected[id] || '';
      if (exp === '') continue;
      input.value = exp;
      const cell = input.parentElement;
      cell.classList.remove('correct', 'wrong', 'mistake');
      cell.classList.add('revealed');
      state.showedAnswer = true;
      const status = $('status');
      const explanation = explainHint(id);
      status.textContent = explanation || 'Here\'s the next digit.';
      status.classList.remove('ok', 'bad');
      opHintShown = false;
      input.focus();
      return;
    }
    const status = $('status');
    status.textContent = 'Looks like every cell is filled — click Check my work!';
    status.classList.remove('ok', 'bad');
    opHintShown = false;
  }

  function showAnswer() {
    state.inputs.forEach((input, id) => {
      const exp = state.expected[id] || '';
      const cell = input.parentElement;
      if (input.value === '' && exp !== '') {
        input.value = exp;
        cell.classList.remove('correct', 'wrong', 'mistake');
        cell.classList.add('revealed');
      }
    });
    state.showedAnswer = true;
    const status = $('status');
    status.classList.remove('bad');
    status.classList.add('ok');
    status.textContent = `${state.multiplicand} × ${state.multiplier} = ${state.multiplicand * state.multiplier}`;
    opHintShown = false;
  }

  function resetAnswers() {
    state.inputs.forEach((input) => {
      input.value = '';
      input.parentElement.classList.remove('correct', 'wrong', 'revealed', 'mistake');
    });
    const status = $('status');
    status.textContent = '';
    status.classList.remove('ok', 'bad');
    opHintShown = false;
  }

  function loadProblem(a, b) {
    state.multiplicand = a;
    state.multiplier = b;
    state.N = String(a).length;
    state.M = String(b).length;
    state.showedAnswer = false;

    if ($('digits-n')) $('digits-n').value = String(state.N);
    if ($('digits-m')) $('digits-m').value = String(state.M);
    const numA = $('num-a');
    const numB = $('num-b');
    if (numA && numA.value !== String(a)) numA.value = String(a);
    if (numB && numB.value !== String(b)) numB.value = String(b);

    computeExpected();
    buildGrid();
    $('problem-label').textContent = `${a} × ${b} = ?`;
    const status = $('status');
    status.textContent = '';
    status.classList.remove('ok', 'bad');
    opHintShown = false;
    saveState();
  }

  function newRandomProblem() {
    const n = +$('digits-n').value;
    const m = +$('digits-m').value;
    state.N = n;
    state.M = m;
    const a = generateNumber(n, state.allowZeros);
    const b = generateNumber(m, state.allowZeros);
    $('num-a').value = String(a);
    $('num-b').value = String(b);
    $('num-a').classList.remove('invalid');
    $('num-b').classList.remove('invalid');
    loadProblem(a, b);
  }

  let customDebounce = null;
  function onCustomInput() {
    const aInput = $('num-a');
    const bInput = $('num-b');
    aInput.value = aInput.value.replace(/[^0-9]/g, '').slice(0, 4);
    bInput.value = bInput.value.replace(/[^0-9]/g, '').slice(0, 4);
    clearTimeout(customDebounce);
    customDebounce = setTimeout(applyCustom, 350);
  }

  function applyCustom() {
    const aInput = $('num-a');
    const bInput = $('num-b');
    const a = parseInt(aInput.value, 10);
    const b = parseInt(bInput.value, 10);
    const aValid = Number.isInteger(a) && a >= 1 && a <= MAX_NUM;
    const bValid = Number.isInteger(b) && b >= 1 && b <= MAX_NUM;
    aInput.classList.toggle('invalid', !aValid && aInput.value !== '');
    bInput.classList.toggle('invalid', !bValid && bInput.value !== '');
    if (aValid && bValid && (a !== state.multiplicand || b !== state.multiplier)) {
      loadProblem(a, b);
    }
  }

  function recordSolved() {
    if (state.showedAnswer) return;
    const key = `${state.multiplicand}x${state.multiplier}`;
    if (state.solvedKeys.has(key)) return;
    state.solvedKeys.add(key);
    state.score++;
    updateScoreDisplay();
    saveState();
  }

  function updateScoreDisplay() {
    $('score-count').textContent = String(state.score);
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        a: state.multiplicand,
        b: state.multiplier,
        score: state.score,
        solved: Array.from(state.solvedKeys),
        allowZeros: state.allowZeros,
      }));
    } catch (e) { /* ignore quota errors */ }
  }

  function restoreState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        state.score = +data.score || 0;
        state.solvedKeys = new Set(Array.isArray(data.solved) ? data.solved : []);
        state.allowZeros = !!data.allowZeros;
        return data;
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  function init() {
    const nSel = $('digits-n');
    const mSel = $('digits-m');
    const zChk = $('allow-zeros');
    const numA = $('num-a');
    const numB = $('num-b');

    nSel.addEventListener('change', () => { state.N = +nSel.value; });
    mSel.addEventListener('change', () => { state.M = +mSel.value; });
    zChk.addEventListener('change', () => {
      state.allowZeros = zChk.checked;
      saveState();
    });

    numA.addEventListener('input', onCustomInput);
    numB.addEventListener('input', onCustomInput);
    numA.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); numB.focus(); }
    });
    numB.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyCustom();
        const firstInput = state.inputs.values().next().value;
        if (firstInput) firstInput.focus();
      }
    });

    $('btn-new').addEventListener('click', newRandomProblem);
    $('btn-check').addEventListener('click', checkAll);
    $('btn-hint').addEventListener('click', fillNextHint);
    $('btn-show').addEventListener('click', showAnswer);
    $('btn-reset').addEventListener('click', resetAnswers);

    const resetScoreBtn = $('btn-reset-score');
    if (resetScoreBtn) {
      resetScoreBtn.addEventListener('click', () => {
        if (confirm('Reset your solved count to 0?')) {
          state.score = 0;
          state.solvedKeys.clear();
          updateScoreDisplay();
          saveState();
        }
      });
    }

    const restored = restoreState();
    zChk.checked = state.allowZeros;
    updateScoreDisplay();

    if (restored && restored.a && restored.b) {
      numA.value = String(restored.a);
      numB.value = String(restored.b);
      loadProblem(restored.a, restored.b);
    } else {
      newRandomProblem();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
