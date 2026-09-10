/**
 * mock-p249.js — the mock's own drawing, which is scaffolding and not a
 * proposal of shipping code. Phase 249 builds nothing; this file exists so the
 * page is a REAL page that can be measured rather than a picture of an opinion.
 *
 * It draws the runs `make-mock.mjs` composed with the product's own engine,
 * wraps each change the way Phase 227 wraps one, places the chip and the rail
 * bar from `getClientRects()[0]` and the change's last rect — being Phase 236's
 * mandatory rule, untouched — and reports what it measured.
 */
(function () {
  'use strict';
  // TWO compositions of the same two versions: the flat stream the composer
  // draws today, and the row-aligned one fault 3 proposes. The look switch
  // picks between them, so the difference is drawn rather than described.
  var DOCS = window.P249_DOCS;
  var DOC = DOCS.flat;
  var pane = document.getElementById('pane');
  var doc = document.getElementById('doc');
  var page = document.getElementById('page');
  var margin = document.getElementById('margin');
  var railbar = document.getElementById('railbar');
  var readout = document.getElementById('readout');
  var count = document.getElementById('count');
  var note = document.getElementById('note');

  var state = { look: 'new', scheme: 'dark', width: 1349, wash: 'seam', current: 0 };

  /**
   * THE `ch` UNIT, measured on the document's OWN font rather than trusted.
   * The shipping rule is written in `ch` and resolves against the element it
   * sits on; here the measure is used on a grid container one level up, and
   * this page is opened from a file rather than inside the app, so the two
   * would not agree. Measuring it once and publishing it in pixels makes the
   * mock's geometry directly comparable with research 113's readings.
   */
  /**
   * The app's own `ch`, measured off the running Redline view by
   * build/p249/probe-p249-room.mjs at 8.1885px (556.816 / 68). The mock uses
   * THAT number rather than its own so every width below is directly
   * comparable with research 113's table; the same probe measured a `0`
   * advance of 8.1123px inside the document. This page, opened from a file
   * rather than inside the app, resolves `-apple-system` to a slightly wider
   * face — `measureCh` below reports what, and it is printed rather than
   * hidden.
   */
  var APP_CH = 8.1885;

  function measureCh() {
    var probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font-family:var(--font-ui);font-size:var(--text-base)';
    probe.textContent = '0'.repeat(100);
    document.body.appendChild(probe);
    var w = probe.getBoundingClientRect().width / 100;
    probe.remove();
    return w;
  }

  // ------------------------------------------------------------------ //
  // The document. One element per run; one wrapper per change, being a
  // maximal run of adjacent non-`same` runs (research 83 B.2). A wrapper
  // carries no text of its own, so the flat leaf reading the projection
  // property is taken from is exactly what it is today.
  // ------------------------------------------------------------------ //
  function draw() {
    doc.textContent = '';
    var runs = DOC.runs;
    var i = 0;
    var host = doc;
    var table = null;
    while (i < runs.length) {
      var run = runs[i];
      // The table block: one wrapper around every consecutive run inside a
      // table region, opened and closed by the run's own flag.
      if (run.table && table === null) {
        table = document.createElement('span');
        table.className = 'rl-table';
        doc.appendChild(table);
      } else if (!run.table && table !== null) {
        table = null;
      }
      host = table === null ? doc : table;
      if (run.kind === 'same') {
        host.appendChild(document.createTextNode(run.text));
        i += 1;
        continue;
      }
      var wrap = document.createElement('span');
      wrap.className = 'rl-change';
      wrap.tabIndex = -1;
      wrap.setAttribute('role', 'group');
      wrap.dataset.change = String(run.change);
      var c = run.change;
      while (i < runs.length && runs[i].kind !== 'same' && runs[i].change === c) {
        var r = runs[i];
        var el = document.createElement(r.kind === 'del' ? 'del' : 'ins');
        el.textContent = r.text;
        if (r.wordless) el.dataset.wordless = '';
        if (r.blank) el.dataset.blank = '';
        if (r.blank && !r.spacing) el.dataset.structural = '';
        if (r.sep || r.sepRow) el.dataset.sep = '';
        if (r.drop) el.dataset.drop = '';
        wrap.appendChild(el);
        i += 1;
      }
      host.appendChild(wrap);
    }
  }

  // ------------------------------------------------------------------ //
  // The chip. Phase 236's rule is untouched: the anchor is the change's
  // FIRST client rect and never its bounding box. What moved is the box
  // it is placed in, which is the margin track rather than the view.
  // ------------------------------------------------------------------ //
  function chip() {
    var el = document.createElement('div');
    el.className = 'rl-chip';
    el.setAttribute('role', 'toolbar');
    el.setAttribute('aria-label', 'Change controls');
    el.innerHTML =
      '<button type="button" class="rl-chip-button" tabindex="-1" title="Previous change"><span class="key">⌥↑</span></button>' +
      '<button type="button" class="rl-chip-button" tabindex="-1" title="Next change"><span class="key">⌥↓</span></button>' +
      '<button type="button" class="rl-chip-button rl-chip-verb" tabindex="-1" title="Rewind this change">Rewind<span class="key">⌥⌫</span></button>' +
      '<button type="button" class="rl-chip-button rl-chip-verb" tabindex="-1" title="Accept this change — the file is not touched">Accept<span class="key">⌥↩</span></button>';
    return el;
  }

  function place() {
    var wraps = doc.querySelectorAll('.rl-change');
    for (var k = 0; k < wraps.length; k += 1) wraps[k].removeAttribute('data-current');
    var el = doc.querySelector('.rl-change[data-change="' + String(state.current) + '"]');
    var old = margin.querySelector('.rl-chip') || pane.querySelector(':scope > .rl-chip');
    if (old) old.remove();
    railbar.hidden = true;
    if (!el) return null;
    el.setAttribute('data-current', '');
    var rects = el.getClientRects();
    if (rects.length === 0) return null;
    var first = rects[0];
    var last = rects[rects.length - 1];
    var pbox = page.getBoundingClientRect();

    var c = chip();
    // In the proposed look the chip lives in the margin track and scrolls
    // with the document, so it needs no scroll listener of its own. With no
    // margin to live in it falls back to Phase 236's overlay, above the
    // change's line box when there is room and below it when there is not.
    var inMargin = state.look === 'new' && margin.getBoundingClientRect().width >= 200;
    if (inMargin) {
      margin.appendChild(c);
      c.style.left = '0px';
      c.style.top = String(first.top - pbox.top) + 'px';
    } else {
      pane.appendChild(c);
      var vbox = pane.getBoundingClientRect();
      var h = 30;
      var above = first.top - vbox.top - h - 4;
      c.style.left = String(Math.max(0, Math.min(first.left - vbox.left, vbox.width - c.offsetWidth))) + 'px';
      c.style.top = String(Math.max(0, above >= 0 ? above : last.bottom - vbox.top + 4)) + 'px';
    }
    if (state.look === 'new' && parseFloat(getComputedStyle(pane).getPropertyValue('--rl-rail-w')) > 0) {
      railbar.hidden = false;
      railbar.style.top = String(first.top - pbox.top) + 'px';
      railbar.style.height = String(last.bottom - first.top) + 'px';
    }
    return { first: first, last: last, chip: c.getBoundingClientRect(), inMargin: inMargin, rects: rects.length };
  }

  // ------------------------------------------------------------------ //
  // What it measured, printed on the face so the page is a reading and
  // not an impression.
  // ------------------------------------------------------------------ //
  function measure(placed) {
    var scroll = document.getElementById('scroll');
    var sbox = scroll.getBoundingClientRect();
    var dbox = doc.getBoundingClientRect();
    var pad = parseFloat(getComputedStyle(doc).paddingLeft);
    var pbox = page.getBoundingClientRect();
    var textW = dbox.width - pad * 2;
    var dead = sbox.width - pbox.width;
    var marks = doc.querySelectorAll('del, ins');
    var frags = 0;
    var washed = 0;
    var widest = 0;
    for (var i = 0; i < marks.length; i += 1) {
      var n = marks[i].getClientRects().length;
      frags += n;
      if (n > widest) widest = n;
      if (getComputedStyle(marks[i]).backgroundColor !== 'rgba(0, 0, 0, 0)') washed += 1;
    }
    // The painted height of one mark against the line pitch: the whole of
    // the central visual question, in two numbers.
    var probe = doc.querySelector('del');
    var painted = probe ? probe.getClientRects()[0].height : 0;
    var pitch = parseFloat(getComputedStyle(doc).fontSize) * 1.65;
    var lines = new Set();
    var all = doc.getClientRects();
    var rangeLines = 0;
    (function () {
      var r = document.createRange();
      r.selectNodeContents(doc);
      var rs = r.getClientRects();
      for (var j = 0; j < rs.length; j += 1) lines.add(Math.round(((rs[j].top + rs[j].bottom) / 2) * 2) / 2);
      rangeLines = lines.size;
    })();

    // Only a PAINTED mark can be seen to cross anything, so an unwashed one is
    // not counted: that is the whole of the proposed fix for fault 5.
    var over = 0;
    var edge = dbox.left + dbox.width - pad;
    for (var m = 0; m < marks.length; m += 1) {
      if (getComputedStyle(marks[m]).backgroundColor === 'rgba(0, 0, 0, 0)') continue;
      var rr = marks[m].getClientRects();
      for (var q = 0; q < rr.length; q += 1) if (rr[q].right - edge > 0.5) over += 1;
    }

    var covered = 0;
    if (placed && !placed.inMargin) {
      var r2 = document.createRange();
      r2.selectNodeContents(doc);
      var rs2 = r2.getClientRects();
      var seen = {};
      for (var t = 0; t < rs2.length; t += 1) {
        var row = rs2[t];
        if (row.bottom > placed.chip.top && row.top < placed.chip.bottom &&
            row.right > placed.chip.left && row.left < placed.chip.right) {
          seen[Math.round(row.top * 2) / 2] = 1;
        }
      }
      covered = Object.keys(seen).length;
    }

    var lineHeight = pitch;
    readout.textContent =
      'pane ' + Math.round(sbox.width) + 'px  ·  page ' + pbox.width.toFixed(2) +
      'px  ·  text column ' + textW.toFixed(2) + 'px (' + (textW / CH).toFixed(1) + ' app characters, ' + (textW / LOCAL_CH).toFixed(1) + ' drawn here)\n' +
      'dead space ' + dead.toFixed(2) + 'px = ' + ((dead / sbox.width) * 100).toFixed(2) + '%' +
      '  ·  document height ' + doc.getBoundingClientRect().height.toFixed(2) + 'px  ·  ' + rangeLines + ' drawn line boxes\n' +
      'marks ' + marks.length + '  ·  washed ' + washed + '  ·  fragments ' + frags +
      '  ·  widest mark ' + widest + ' fragments  ·  painted ' + painted.toFixed(2) + 'px on a ' + lineHeight.toFixed(2) + 'px pitch (band ' + (lineHeight - painted).toFixed(2) + 'px)\n' +
      'fragments past the column edge ' + over +
      '  ·  chip ' + (placed ? (placed.inMargin ? 'in the margin, covering 0 rows of prose' : 'over the document, covering ' + covered + ' row(s) of prose') : 'not drawn') +
      '  ·  change ' + (state.current + 1) + ' of ' + DOC.stats.changes + ' drawn in ' + (placed ? placed.rects : 0) + ' rects';
    count.textContent = String(state.current + 1) + ' of ' + String(DOC.stats.changes) + ' changes';
    note.textContent =
      'Marked against the version on disk when this file was opened. ' +
      DOC.stats.wordlessMarks + ' of ' + DOC.stats.marks + ' marks hold no letter and no digit; ' +
      DOC.stats.tableChanges + ' of ' + DOC.stats.changes + ' changes are inside the table.';
  }

  function room(width) {
    if (width >= 1060) return 'full';
    if (width >= 420) return 'column';
    return 'narrow';
  }

  function apply() {
    DOC = state.look === 'new' ? DOCS.rows : DOCS.flat;
    if (state.current >= DOC.stats.changes) state.current = DOC.stats.changes - 1;
    document.documentElement.dataset.scheme = state.scheme;
    document.documentElement.style.setProperty('--rl-ch', String(CH) + 'px');
    pane.dataset.look = state.look;
    pane.dataset.wash = state.wash;
    pane.style.width = String(state.width) + 'px';
    pane.dataset.room = state.look === 'new' ? room(state.width) : 'narrow';
    var buttons = document.querySelectorAll('.harness button[data-set]');
    for (var i = 0; i < buttons.length; i += 1) {
      var b = buttons[i];
      b.setAttribute('aria-pressed', String(String(state[b.dataset.set]) === b.dataset.value));
    }
    draw();
    var placed = place();
    measure(placed);
  }

  document.addEventListener('click', function (event) {
    var b = event.target.closest ? event.target.closest('button') : null;
    if (!b) return;
    if (b.dataset.set) {
      state[b.dataset.set] = b.dataset.set === 'width' ? Number(b.dataset.value) : b.dataset.value;
      apply();
      return;
    }
    if (b.dataset.step) {
      var n = DOC.stats.changes;
      state.current = (state.current + Number(b.dataset.step) + n) % n;
      apply();
    }
  });

  window.P249_MOCK = {
    set: function (next) { Object.assign(state, next); apply(); },
    state: function () { return Object.assign({}, state); },
    read: function () { return readout.textContent; },
    stats: function () { return DOC.stats; }
  };

  var LOCAL_CH = measureCh();
  var CH = APP_CH;
  apply();
})();
