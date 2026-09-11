// Phase 256 research probe (question 2). Reads three as-built explorers off the
// DOM in a scratch Electron. Written by the researcher; builds nothing.
const { app, BrowserWindow } = require('electron');
// The harness this probe runs under refuses the Chromium mach-port rendezvous,
// so the renderer sandbox and the GPU process are turned off for this scratch
// read of three local files. Nothing remote is loaded.
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('in-process-gpu');
app.disableHardwareAcceleration();

const files = (process.env.P256_FILES || '').split(',').filter(Boolean);
console.log('[p256] main booted with ' + files.length + ' files');

const MEASURE = `(() => {
  const words = (t) => (t || '').trim().split(/\\s+/).filter(Boolean).length;
  const vis = (el) => {
    if (!el) return false;
    if (el.hidden) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    return el.offsetParent !== null || s.position === 'fixed';
  };
  const text = (el) => (el ? (el.innerText || el.textContent || '') : '');
  const out = {};
  out.title = document.title;
  out.desc = (document.querySelector('meta[name=description]') || {}).content || '';
  out.hash = location.hash;
  out.bodyWords = words(document.body.innerText);
  out.tabs = [...document.querySelectorAll('[role=tab]')].map((b) => b.textContent.trim());
  const views = [...document.querySelectorAll('[role=tabpanel], section.view')];
  out.views = views.map((v) => ({
    id: v.id,
    hidden: !!v.hidden,
    words: words(v.innerText),
    buttons: v.querySelectorAll('button').length,
    selects: v.querySelectorAll('select').length,
    checkboxes: v.querySelectorAll('input[type=checkbox]').length,
    tables: v.querySelectorAll('table').length,
    tableRows: v.querySelectorAll('tbody tr').length,
    pre: v.querySelectorAll('pre').length,
    links: v.querySelectorAll('a').length,
    details: v.querySelectorAll('details').length
  }));
  out.headline = text(document.querySelector('h1')).trim();
  out.masthead = words(text(document.querySelector('header')));
  // components
  const nodes = [...document.querySelectorAll('[data-component], .node[data-c]')];
  out.componentCount = nodes.length;
  out.componentLabels = nodes.map((n) => n.innerText.replace(/\\s+/g, ' ').trim());
  out.componentWords = nodes.map((n) => words(n.innerText));
  // regions / locations
  out.regions = [...document.querySelectorAll('.location, .region, .location-head h3')]
    .map((r) => (r.querySelector ? text(r.querySelector('h3')) : text(r)).trim())
    .filter(Boolean);
  // evidence markers
  const evs = [...document.querySelectorAll('.ev, .tag, .badge')].map((e) => e.className + '|' + e.textContent.trim());
  out.evidenceMarks = evs;
  // journeys / steps
  out.journeySections = [...document.querySelectorAll('.journey[id], section.journey')].map((j) => ({
    id: j.id, steps: j.querySelectorAll('.step, li.step').length, hidden: !!j.hidden,
    title: text(j.querySelector('h3')).trim()
  }));
  out.stepButtons = document.querySelectorAll('[data-step], .jbtn').length;
  out.gateSections = [...document.querySelectorAll('.gate[id]')].map((g) => ({
    id: g.id, cases: g.querySelectorAll('.case').length, title: text(g.querySelector('h3')).trim()
  }));
  out.gateButtons = [...document.querySelectorAll('.gbtn, [data-track], #gate-case option')].map((b) => b.textContent.trim());
  // inspector at rest
  const insp = document.querySelector('#component-detail, .inspector .panel-card:not([hidden]), #inspector .panel-card:not([hidden])');
  out.inspector = insp ? { id: insp.id, words: words(insp.innerText), fields: [...insp.querySelectorAll('dt')].map((d) => d.textContent.trim()), sources: insp.querySelectorAll('a').length, text: insp.innerText.replace(/\\s+/g,' ').trim().slice(0, 1200) } : null;
  // visible-at-rest words (first screenful is not measurable headlessly; report the visible view)
  const shown = views.find((v) => !v.hidden);
  out.restingView = shown ? { id: shown.id, words: words(shown.innerText) } : null;
  out.foldWords = (() => {
    // Words a person can see without scrolling, in a 1440x900 window: every
    // text node whose rectangle starts above the fold.
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n = 0;
    while (walker.nextNode()) {
      const t = walker.currentNode;
      const s = (t.nodeValue || '').trim();
      if (!s) continue;
      const p = t.parentElement;
      if (!p || !vis(p)) continue;
      const r = p.getBoundingClientRect();
      if (r.top >= 900 || r.bottom <= 0 || r.height === 0) continue;
      n += words(s);
    }
    return n;
  })();
  out.bridgeLabels = [...document.querySelectorAll('.bridge, .bridge-line, .mini-flow, .flow-return')]
    .map((b) => b.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean);
  out.regionCards = [...document.querySelectorAll('.location-head, .region, .location-title')].map((r) => ({
    label: (r.querySelector('.location-label') || {}).textContent || '',
    head: ((r.querySelector('h3') || {}).textContent || '').trim(),
    blurb: ((r.querySelector('p, .rblurb, .mono') || {}).textContent || '').trim()
  }));
  out.legend = [...document.querySelectorAll('.legend, .legend *')].map((l) => l.textContent.replace(/\s+/g,' ').trim()).filter(Boolean).slice(0, 8);
  out.notes = [...document.querySelectorAll('.note, .banner, aside')].map((a) => ({ words: words(a.innerText), head: ((a.querySelector('h3,strong')||{}).textContent||'').trim(), hidden: !vis(a) }));
  out.introWords = (() => {
    const shown2 = [...document.querySelectorAll('[role=tabpanel], section.view')].find((v) => !v.hidden);
    if (!shown2) return 0;
    const intro = shown2.querySelector('.view-intro, .section-head, h2');
    if (!intro) return 0;
    const p = intro.parentElement === shown2 ? intro : intro;
    return words(p.innerText) + words((shown2.querySelector('p.note') || {}).innerText || '');
  })();
  out.crossLinks = document.querySelectorAll('[data-component-jump], [data-squad-jump], .xlink, [data-jump], [data-view-link]').length;
  out.anchors = document.querySelectorAll('a[href]').length;
  out.externalRefs = [...document.querySelectorAll('a[href]')].filter((a) => /^https?:/.test(a.getAttribute('href'))).length;
  out.sourceLinks = [...document.querySelectorAll('a[href]')].filter((a) => !/^(https?:|#)/.test(a.getAttribute('href'))).length;
  out.colorTokens = (() => {
    const s = [...document.styleSheets].flatMap((sh) => { try { return [...sh.cssRules]; } catch { return []; } });
    const root = s.find((r) => r.selectorText === ':root');
    return root ? root.style.cssText.split(';').filter((x) => x.includes('--')).length : 0;
  })();
  return out;
})()`;

async function drive(win, file) {
  const rec = { file };
  rec.rest = await win.webContents.executeJavaScript(MEASURE);
  // interaction 1: select the LAST component node and read the inspector
  rec.select = await win.webContents.executeJavaScript(`(() => {
    const words = (t) => (t || '').trim().split(/\\s+/).filter(Boolean).length;
    const nodes = [...document.querySelectorAll('[data-component], .node[data-c]')];
    const n = nodes[nodes.length - 1];
    if (!n) return null;
    n.click();
    const insp = document.querySelector('#component-detail, .inspector .panel-card:not([hidden]), #inspector .panel-card:not([hidden])');
    return {
      clicked: n.innerText.replace(/\\s+/g,' ').trim(),
      hash: location.hash,
      words: insp ? words(insp.innerText) : 0,
      fields: insp ? [...insp.querySelectorAll('dt')].map((d)=>d.textContent.trim()) : [],
      sources: insp ? [...insp.querySelectorAll('a')].map((a)=>a.getAttribute('href')) : [],
      text: insp ? insp.innerText.replace(/\\s+/g,' ').trim() : ''
    };
  })()`);
  // interaction 2: open every tab, measure its resting words, then step a journey
  rec.tabs = await win.webContents.executeJavaScript(`(() => {
    const words = (t) => (t || '').trim().split(/\\s+/).filter(Boolean).length;
    const res = [];
    for (const t of [...document.querySelectorAll('[role=tab]')]) {
      t.click();
      const panel = document.getElementById(t.getAttribute('aria-controls')) || document.querySelector('.view:not([hidden])');
      res.push({ tab: t.textContent.trim(), hash: location.hash, words: panel ? words(panel.innerText) : 0,
        heading: panel ? (panel.querySelector('h2')||{textContent:''}).textContent.trim() : '',
        firstPara: panel ? (panel.querySelector('p')||{textContent:''}).textContent.replace(/\\s+/g,' ').trim().slice(0,300) : '' });
    }
    return res;
  })()`);
  rec.journey = await win.webContents.executeJavaScript(`(() => {
    const words = (t) => (t || '').trim().split(/\\s+/).filter(Boolean).length;
    const jt = [...document.querySelectorAll('[role=tab]')].find((t)=>/journey|follow|walk/i.test(t.textContent));
    if (jt) jt.click();
    const nextBtn = document.querySelector('#step-next, [data-step-next], #next');
    const sheetSel = '#step-sheet, .step.cur, .journey:not([hidden])';
    const read = () => {
      const s = document.querySelector('#step-sheet') || document.querySelector('.step.cur') || document.querySelector('.journey:not([hidden])');
      return s ? { words: words(s.innerText), text: s.innerText.replace(/\\s+/g,' ').trim().slice(0,700), hash: location.hash } : null;
    };
    const first = read();
    if (nextBtn) nextBtn.click();
    const second = read();
    return { hasNext: !!nextBtn, first, second };
  })()`);
  rec.gate = await win.webContents.executeJavaScript(`(() => {
    const words = (t) => (t || '').trim().split(/\\s+/).filter(Boolean).length;
    const gt = [...document.querySelectorAll('[role=tab]')].find((t)=>/what runs|checks|gates/i.test(t.textContent));
    if (gt) gt.click();
    const sel = document.getElementById('gate-case');
    const gbtns = [...document.querySelectorAll('.gbtn')];
    let picked = null;
    if (sel && sel.options.length > 1) { sel.selectedIndex = 1; sel.dispatchEvent(new Event('change')); picked = sel.options[1].textContent.trim(); }
    else if (gbtns.length > 1) { gbtns[1].click(); picked = gbtns[1].textContent.trim(); }
    const res = document.querySelector('#gate-result, .gate:not([hidden]), #run-result');
    const form = document.getElementById('scenario-form');
    let worksheet = null;
    if (form) {
      const kind = document.getElementById('app-kind');
      if (kind) { kind.value = 'web'; form.dispatchEvent(new Event('change', {bubbles:true})); }
      const rows = document.getElementById('run-result');
      const summary = document.getElementById('route-result');
      worksheet = { rows: rows ? rows.querySelectorAll('tr').length : 0,
        summary: summary ? summary.innerText.replace(/\\s+/g,' ').trim().slice(0,400) : '',
        firstRow: rows && rows.querySelector('tr') ? rows.querySelector('tr').innerText.replace(/\\s+/g,' ').trim() : '' };
    }
    return { picked, hash: location.hash, words: res ? words(res.innerText) : 0,
      text: res ? res.innerText.replace(/\\s+/g,' ').trim().slice(0,900) : '', worksheet };
  })()`);
  return rec;
}

app.whenReady().then(async () => {
  const results = [];
  // ONE window, reused for every file: a second BrowserWindow cannot spawn a
  // renderer under this harness, so the loop reloads the same one.
  const win = new BrowserWindow({ width: 1440, height: 900, show: false, webPreferences: { sandbox: false, contextIsolation: true, javascript: true } });
  win.webContents.on('did-fail-load', (_e, code, desc) => console.log('[p256] did-fail-load ' + code + ' ' + desc));
  win.webContents.on('render-process-gone', (_e, d) => console.log('[p256] render-process-gone ' + JSON.stringify(d)));
  try {
    for (const f of files) {
      try {
        console.log('[p256] loading ' + f);
        await Promise.race([win.loadFile(f), new Promise((_r, rej) => setTimeout(() => rej(new Error('load timeout')), 20000))]);
        await new Promise((r) => setTimeout(r, 400));
        results.push(await Promise.race([drive(win, f), new Promise((_r, rej) => setTimeout(() => rej(new Error('drive timeout')), 40000))]));
        console.log('[p256] drove ' + f);
      } catch (err) {
        results.push({ file: f, error: String(err) });
      }
    }
  } finally {
    win.destroy();
  }
  console.log('P256_JSON_BEGIN');
  console.log(JSON.stringify(results));
  console.log('P256_JSON_END');
  app.quit();
});
