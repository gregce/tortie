#!/usr/bin/env node
/**
 * probe-p149-surfaces.mjs. The Phase 149 measure and photograph lane.
 *
 * ## What it proves
 *
 * The operator reported all four items himself, so every surface is measured
 * at the parent commit before anything is edited and again afterwards. This
 * probe opens the real app on a project that holds no sessions and reads, from
 * the running window:
 *
 *   1. The empty state's heading and sentence, their font size, their line
 *      height and their weight, plus the agent grid's own rectangle, which is
 *      the number Phase 139 says must not move.
 *   2. Each of the four side views on the activity bar, being Explorer,
 *      Search, Source Control and Context, switched by clicking the activity
 *      bar the way a person does. For each one it reads the view heading, every
 *      section heading, every label and every text box, including the boxes the
 *      file tree keeps inside its own shadow root.
 *   3. The Commit button in the Source Control view, read with the message
 *      empty, which is its disabled state, and again with a message typed,
 *      which is its enabled state.
 *
 * ## What it changes
 *
 * Nothing that belongs to the person. It writes two pictures and one JSON
 * reading into its output directory, in a scratch project it makes and
 * removes. No session is created and the operator's tmux server is only ever
 * listed.
 *
 * ## The two launches, and why there are two rather than one
 *
 * The shot harness writes ONE picture per launch. The first launch measures
 * every surface and photographs the empty state. The second launch clones the
 * four side views into one row and photographs that row, so all four views and
 * both Commit states are in a single picture. The clones are laid side by side
 * by this probe and the report says so; every NUMBER in the report is read from
 * the live view and never from a clone.
 *
 * ## Environment it reads
 *
 *   P149_OUT_DIR   where the pictures and the JSON go. Default out/p149.
 *   P149_LABEL     a word folded into the file names, e.g. parent or after.
 *
 * ## Safety, absolute
 *
 *  - It refuses to run unless build/harness-socket.mjs handed it a socket of
 *    its own, and it refuses the names `gmux` and `default` outright.
 *  - `-L gmux` is named in exactly one place, a read only `list-sessions`
 *    count taken before and after, which must match.
 *  - Every Electron launch uses a scratch `--user-data-dir` under the harness
 *    directory, and every launch goes through build/electron-run.mjs, which
 *    ends the whole tree it started in a finally block whatever happened.
 *  - There is no pkill and no kill-server anywhere in this file.
 *
 * ## Usage, from the worktree root
 *
 *   npm run build
 *   P149_LABEL=parent node build/harness-socket.mjs gmux-p149-surfaces \
 *     'node build/probe-p149-surfaces.mjs'
 *
 * Exit 0 when both launches produced a picture and the first produced a full
 * reading. 1 when they did not. 2 when the probe refuses to run at all.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p149]';

const say = (line) => { console.log(`${TAG} ${line}`); };
const refuse = (why) => { console.error(`${TAG} ${why}`); process.exit(2); };

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  refuse(
    'no GMUX_TMUX_SOCKET. Run me through the harness so I get a socket of ' +
      "my own: node build/harness-socket.mjs gmux-p149-surfaces 'node " +
      "build/probe-p149-surfaces.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to measure on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

const label = (process.env['P149_LABEL'] ?? '').trim() || 'run';
const outDir = resolve(repoRoot, (process.env['P149_OUT_DIR'] ?? '').trim() || 'out/p149');
mkdirSync(outDir, { recursive: true });

/** The operator's live server, listed and never written. Named once. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' });
  return (out.stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
}

const operatorBefore = operatorSessionCount();
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);
say(`harness socket: ${socket}`);
say(`label: ${label}`);

// ---------------------------------------------------------------------------
// One scratch project: a git repository with a change, holding no sessions.
// The repository is what gives the Source Control view something to show, and
// the change is what lets the Commit button reach its enabled state.
// ---------------------------------------------------------------------------

const scratch = process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'gmux-p149-surfaces');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'p149-project', 'src'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'p149-project');
writeFileSync(join(project, 'README.md'), '# Phase 149\n\nScratch project.\n', 'utf8');
writeFileSync(join(project, 'src', 'index.ts'), 'export const one = 1;\n', 'utf8');

const git = (...args) =>
  spawnSync('git', ['-C', project, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p149@example.invalid');
git('config', 'user.name', 'Phase 149 probe');
git('config', 'commit.gpgsign', 'false');
git('add', '-A');
git('commit', '-q', '-m', 'first');
writeFileSync(join(project, 'src', 'index.ts'), 'export const one = 1;\nexport const two = 2;\n', 'utf8');
writeFileSync(join(project, 'src', 'added.ts'), 'export const three = 3;\n', 'utf8');
git('add', 'src/index.ts');

// ---------------------------------------------------------------------------
// The one expression the driven window evaluates
// ---------------------------------------------------------------------------

/**
 * @param {'empty'|'views'} mode which picture this launch should leave on
 *                               screen once every reading is taken.
 */
function probeJs(mode) {
  return `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const frame = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res(1))));
  const q = (s, r) => (r || document).querySelector(s);
  const qa = (s, r) => Array.from((r || document).querySelectorAll(s));
  const r1 = (n) => Math.round(n * 10) / 10;
  const px = (v) => {
    const n = Number.parseFloat(String(v));
    return Number.isFinite(n) ? r1(n) : String(v);
  };
  const flat = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  const box = (el) => {
    if (el === null || el === undefined) return null;
    const b = el.getBoundingClientRect();
    return { top: r1(b.top), left: r1(b.left), width: r1(b.width), height: r1(b.height) };
  };
  /** Font facts every heading, label and box in the report carries. */
  const type = (el) => {
    if (el === null || el === undefined) return null;
    const c = getComputedStyle(el);
    return {
      text: flat(el.textContent).slice(0, 40),
      fontSize: px(c.fontSize),
      lineHeight: px(c.lineHeight),
      fontWeight: c.fontWeight,
      letterSpacing: c.letterSpacing,
      textTransform: c.textTransform,
      color: c.color,
      fontFamily: c.fontFamily.split(',')[0].trim(),
      height: r1(el.getBoundingClientRect().height)
    };
  };
  /** The same for a text box, where the height of the control is the point. */
  const field = (el) => {
    if (el === null || el === undefined) return null;
    const c = getComputedStyle(el);
    const b = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      cls: String(el.className || '').slice(0, 60),
      placeholder: (el.getAttribute('placeholder') || '').slice(0, 40),
      cssHeight: px(c.height),
      renderedHeight: r1(b.height),
      fontSize: px(c.fontSize),
      lineHeight: px(c.lineHeight),
      fontFamily: c.fontFamily.split(',')[0].trim(),
      borderRadius: px(c.borderRadius),
      paddingInlineStart: px(c.paddingInlineStart)
    };
  };
  /** Every text box under a root, following shadow roots the tree opens. */
  const fieldsUnder = (rootEl) => {
    const out = [];
    const walk = (node, depth) => {
      if (node === null || node === undefined || depth > 12) return;
      for (const el of Array.from(node.querySelectorAll('input, textarea'))) {
        const t = (el.getAttribute('type') || 'text').toLowerCase();
        if (t === 'checkbox' || t === 'radio' || t === 'hidden') continue;
        const b = el.getBoundingClientRect();
        if (b.width === 0 && b.height === 0) continue;
        out.push(field(el));
      }
      for (const el of Array.from(node.querySelectorAll('*'))) {
        if (el.shadowRoot) walk(el.shadowRoot, depth + 1);
      }
    };
    walk(rootEl, 0);
    return out;
  };

  const sidebar = () => q('.sidebar');
  const railButton = (name) =>
    qa('[data-slot="activity-bar"] .ab-item').find(
      (b) => (b.getAttribute('aria-label') || '').toLowerCase().startsWith(name)
    ) ?? null;

  /** Click the activity bar the way a person does, then let React settle. */
  const showView = async (name) => {
    const btn = railButton(name);
    if (btn === null) return false;
    if (btn.getAttribute('aria-pressed') !== 'true') btn.click();
    await wait(900);
    await frame();
    return true;
  };

  /** One side view, read live. */
  const readView = (name) => {
    const side = sidebar();
    if (side === null) return { name, error: 'the sidebar is not on the page' };
    const header = q('.view-header', side);
    const branch = q('.branch-header', side);
    return {
      name,
      sidebarWidth: r1(side.getBoundingClientRect().width),
      viewHeaderBand: header !== null ? box(header) : box(branch),
      viewHeaderKind: header !== null ? 'view-header' : (branch !== null ? 'branch-header' : 'none'),
      viewHeading: type(q('.view-header-title', side)) ?? type(q('.branch-name', side)),
      sectionHeadings: qa('.section-header', side).slice(0, 6).map(type),
      labels: qa('.search-field-label, .ctx-row-label, .files-filter-note, .scm-commit-caption, .search-summary', side)
        .slice(0, 6)
        .map(type),
      fields: fieldsUnder(side)
    };
  };

  /** Everything about the Commit button that is drawn rather than declared. */
  const commitLook = (state) => {
    const btn = q('.scm-commit-btn');
    if (btn === null) return { state, error: 'no commit button' };
    const c = getComputedStyle(btn);
    return {
      state,
      disabled: btn.disabled === true,
      labelText: flat(btn.textContent),
      background: c.backgroundImage !== 'none' ? c.backgroundImage : c.backgroundColor,
      backgroundColor: c.backgroundColor,
      color: c.color,
      border: c.border,
      borderRadius: px(c.borderRadius),
      boxShadow: c.boxShadow,
      fontSize: px(c.fontSize),
      fontWeight: c.fontWeight,
      height: r1(btn.getBoundingClientRect().height),
      transition: c.transition,
      cursor: c.cursor
    };
  };

  /** Type into the controlled commit box the way React accepts it. */
  const typeCommitMessage = async (text) => {
    const ta = q('.scm-commit-input');
    if (ta === null) return false;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    ).set;
    setter.call(ta, text);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(500);
    await frame();
    return true;
  };

  try {
    // The board has to have finished its agent scan, or the empty state is
    // still drawing its seed.
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      if (qa('.onb-inner .agent-grid .agent-tile').length > 0) break;
      await wait(500);
    }
    await wait(1200);

    // 1. The empty state.
    const emptyState = {
      title: type(q('.onb-inner .empty-title')),
      body: type(q('.onb-inner .empty-body')),
      titleBox: box(q('.onb-inner .empty-title')),
      bodyBox: box(q('.onb-inner .empty-body')),
      grid: box(q('.onb-inner .agent-grid')),
      hint: box(qa('.onb-inner .onb-hint').slice(-1)[0] ?? null),
      inner: box(q('.empty-inner.onb-inner')),
      tiles: qa('.onb-inner .agent-grid .agent-tile').length,
      mark: box(q('[data-slot="empty-mark"]')),
      markOpacity: (() => {
        const m = q('[data-slot="empty-mark"]');
        return m === null ? null : getComputedStyle(m).opacity;
      })(),
      markTokenValue: flat(
        getComputedStyle(document.documentElement).getPropertyValue('--empty-mark-opacity')
      ) || null
    };

    // The Phase 139 rule, proved rather than asserted. The mark is hidden with
    // one stylesheet rule, which React never sees, and the grid is read again.
    // Two identical rectangles is the proof that the mark is out of flow and
    // cannot move the board. The same comparison is repeated with the column
    // cap lowered, because a narrower column is where a mark that reserved
    // height would show itself first.
    const hider = document.createElement('style');
    hider.setAttribute('data-p149-hide-mark', '1');
    document.head.appendChild(hider);
    const gridWith = box(q('.onb-inner .agent-grid'));
    hider.textContent = '[data-slot="empty-mark"] { display: none !important; }';
    await frame();
    await wait(200);
    const gridWithout = box(q('.onb-inner .agent-grid'));
    hider.textContent = '';
    await frame();

    const narrow = document.createElement('style');
    narrow.setAttribute('data-p149-narrow', '1');
    narrow.textContent = '.empty-inner.onb-inner { max-width: 360px; }';
    document.head.appendChild(narrow);
    await wait(400);
    const narrowWith = box(q('.onb-inner .agent-grid'));
    hider.textContent = '[data-slot="empty-mark"] { display: none !important; }';
    await frame();
    await wait(200);
    const narrowWithout = box(q('.onb-inner .agent-grid'));
    hider.remove();
    narrow.remove();
    await wait(400);
    emptyState.markMovesNothing = {
      wide: { withMark: gridWith, withoutMark: gridWithout },
      narrow360: { withMark: narrowWith, withoutMark: narrowWithout }
    };

    // 2. The four side views, switched from the activity bar.
    const views = [];
    for (const name of ['explorer', 'search', 'source control', 'context']) {
      const ok = await showView(name);
      if (!ok) { views.push({ name, error: 'no activity bar button' }); continue; }
      if (name === 'search') {
        // Open the details block, which is where the two labelled boxes are.
        const more = q('.search-details-toggle');
        if (more !== null && !more.classList.contains('on')) { more.click(); await wait(500); }
      }
      views.push(readView(name));
    }

    // 3. The Commit button, both states, on the live view.
    await showView('source control');
    await wait(700);
    const commit = [];
    commit.push(commitLook('disabled, no message'));
    const typed = await typeCommitMessage('a real commit message');
    commit.push(typed ? commitLook('enabled, message typed') : { state: 'enabled', error: 'no commit box' });

    const report = {
      label: ${JSON.stringify(label)},
      mode: ${JSON.stringify(mode)},
      window: { w: window.innerWidth, h: window.innerHeight },
      emptyState,
      views,
      commit
    };

    if (${JSON.stringify(mode)} === 'empty') {
      // Leave the app on the Explorer, which is the state the picture shows.
      await typeCommitMessage('');
      await showView('explorer');
      await wait(700);
      return report;
    }

    // The picture that carries all four views. Each view is switched to, its
    // sidebar cloned, and the clones are laid in one row. Only the PICTURE is
    // built this way; every number above was read from the live view.
    const strip = document.createElement('div');
    strip.setAttribute('data-p149-strip', '1');
    strip.style.cssText =
      'position:fixed;inset:0;z-index:99999;display:flex;align-items:stretch;' +
      'gap:8px;padding:8px;background:#131417;overflow:hidden';
    const capture = async (name, caption) => {
      await showView(name);
      await wait(700);
      const side = sidebar();
      if (side === null) return;
      const cell = document.createElement('div');
      cell.style.cssText = 'display:flex;flex-direction:column;min-width:0;flex:1 1 0';
      const tag = document.createElement('div');
      tag.textContent = caption;
      tag.style.cssText =
        'font:600 11px -apple-system,sans-serif;letter-spacing:.04em;' +
        'text-transform:uppercase;color:#838996;padding:4px 6px';
      const holder = document.createElement('div');
      holder.style.cssText =
        'flex:1 1 auto;min-height:0;overflow:hidden;border:1px solid #2a2d34;' +
        'border-radius:6px;background:#17181c';
      const clone = side.cloneNode(true);
      clone.style.width = '100%';
      clone.style.flexBasis = 'auto';
      clone.style.height = '100%';
      holder.appendChild(clone);
      cell.appendChild(tag);
      cell.appendChild(holder);
      strip.appendChild(cell);
    };
    await typeCommitMessage('');
    await capture('explorer', 'Explorer');
    await capture('search', 'Search');
    await capture('source control', 'Source Control, Commit off');
    await typeCommitMessage('a real commit message');
    await capture('source control', 'Source Control, Commit on');
    await capture('context', 'Context');
    document.body.appendChild(strip);
    await wait(600);
    await frame();
    return report;
  } catch (err) {
    return { error: String((err && err.stack) || err) };
  }
})()`;
}

// ---------------------------------------------------------------------------
// One launch, one picture, one reading. Never two at a time.
// ---------------------------------------------------------------------------

async function launch(mode) {
  const png = join(outDir, `p149-${label}-${mode}.png`);
  rmSync(png, { force: true });
  const drive = { projectPath: project, sidebarView: 'explorer' };
  say(`launch ${mode}`);
  const { code, text } = await runElectron({
    label: `p149 ${label} ${mode}`,
    userDataDir: join(root, `profile-${mode}`),
    cwd: repoRoot,
    env: {
      ...process.env,
      GMUX_SHOT: png,
      GMUX_SHOT_DELAY_MS: '9000',
      GMUX_SHOT_SIZE: '1600x1000',
      GMUX_SHOT_DRIVE: JSON.stringify(drive),
      GMUX_SHOT_JS: probeJs(mode)
    },
    ceilingMs: 300_000,
    settleMs: 500
  });
  const marker = '[gmux-shot] probe ';
  const at = text.lastIndexOf(marker);
  let report = null;
  if (at !== -1) {
    try { report = JSON.parse(text.slice(at + marker.length).split('\n')[0] ?? ''); } catch { report = null; }
  }
  return { code, png: existsSync(png) ? png : null, report, text };
}

const failures = [];

function pad(s, n) { return String(s).padEnd(n); }

function printViewTable(views) {
  console.log('  view            heading  weight  case        label   box h   box type   boxes');
  console.log('  ' + '-'.repeat(78));
  for (const v of views) {
    if (v.error !== undefined) { console.log(`  ${pad(v.name, 16)}${v.error}`); continue; }
    const heading = v.viewHeading;
    const labelOne = (v.labels ?? []).find((l) => l !== null) ?? null;
    const boxes = v.fields ?? [];
    const first = boxes[0] ?? null;
    console.log(
      '  ' +
        pad(v.name, 16) +
        pad(heading === null ? '-' : `${heading.fontSize}px`, 9) +
        pad(heading === null ? '-' : heading.fontWeight, 8) +
        pad(heading === null ? '-' : heading.textTransform, 12) +
        pad(labelOne === null ? '-' : `${labelOne.fontSize}px`, 8) +
        pad(first === null ? '-' : `${first.renderedHeight}px`, 8) +
        pad(first === null ? '-' : `${first.fontSize}px`, 11) +
        String(boxes.length)
    );
  }
  console.log('');
  console.log('  every text box in each view');
  for (const v of views) {
    for (const f of v.fields ?? []) {
      console.log(
        `    ${pad(v.name, 16)}${pad(f.cls || f.tag, 34)}h ${pad(String(f.renderedHeight) + 'px', 9)}type ${pad(String(f.fontSize) + 'px', 8)}${f.fontFamily}`
      );
    }
  }
}

async function main() {
  const a = await launch('empty');
  const b = await launch('views');

  for (const [name, res] of [['empty', a], ['views', b]]) {
    if (res.png === null) failures.push(`${name}: no picture was written`);
    if (res.report === null) {
      failures.push(`${name}: the driven window printed no reading (electron exited ${String(res.code)})`);
    } else if (res.report.error !== undefined) {
      failures.push(`${name}: the driver reported ${String(res.report.error)}`);
    }
  }

  const rep = a.report !== null && a.report !== undefined && a.report.error === undefined ? a.report : null;
  if (rep === null) return;

  console.log('');
  say(`window ${String(rep.window.w)} by ${String(rep.window.h)}`);
  console.log('');
  say('THE EMPTY STATE');
  const t = rep.emptyState.title;
  const bd = rep.emptyState.body;
  console.log(`    heading   "${t === null ? '?' : t.text}"`);
  console.log(`              font-size ${t === null ? '?' : t.fontSize}px, line-height ${t === null ? '?' : t.lineHeight}px, weight ${t === null ? '?' : t.fontWeight}`);
  console.log(`    sentence  "${bd === null ? '?' : bd.text}"`);
  console.log(`              font-size ${bd === null ? '?' : bd.fontSize}px, line-height ${bd === null ? '?' : bd.lineHeight}px, weight ${bd === null ? '?' : bd.fontWeight}`);
  console.log(`    agent grid rect ${JSON.stringify(rep.emptyState.grid)}`);
  console.log(`    tiles on the board ${String(rep.emptyState.tiles)}`);
  console.log(`    mark rect ${JSON.stringify(rep.emptyState.mark)}, opacity ${String(rep.emptyState.markOpacity)}, token ${String(rep.emptyState.markTokenValue)}`);
  const mm = rep.emptyState.markMovesNothing;
  if (mm !== undefined && mm !== null) {
    console.log('    the mark moves nothing, grid rect with it drawn and with it hidden');
    console.log(`      wide      with ${JSON.stringify(mm.wide.withMark)}`);
    console.log(`                without ${JSON.stringify(mm.wide.withoutMark)}`);
    console.log(`      narrow360 with ${JSON.stringify(mm.narrow360.withMark)}`);
    console.log(`                without ${JSON.stringify(mm.narrow360.withoutMark)}`);
    const same = (a, b) => a !== null && b !== null && JSON.stringify(a) === JSON.stringify(b);
    const wideSame = same(mm.wide.withMark, mm.wide.withoutMark);
    const narrowSame = same(mm.narrow360.withMark, mm.narrow360.withoutMark);
    console.log(`      identical: wide ${String(wideSame)}, narrow ${String(narrowSame)}`);
    if (!wideSame) failures.push('the mark moved the agent grid at the shipped column width');
    if (!narrowSame) failures.push('the mark moved the agent grid at a 360px column');
  }

  console.log('');
  say('THE FOUR SIDE VIEWS');
  printViewTable(rep.views);

  console.log('');
  say('THE COMMIT BUTTON');
  for (const c of rep.commit) {
    if (c.error !== undefined) { console.log(`    ${c.state}: ${c.error}`); continue; }
    console.log(`    ${c.state}`);
    console.log(`      label "${c.labelText}", disabled ${String(c.disabled)}`);
    console.log(`      background ${c.background}`);
    console.log(`      color ${c.color}, radius ${c.borderRadius}px, height ${c.height}px`);
    console.log(`      box-shadow ${c.boxShadow}`);
    console.log(`      border ${c.border}`);
  }

  const jsonPath = join(outDir, `p149-${label}.json`);
  writeFileSync(jsonPath, JSON.stringify({ empty: a.report, views: b.report }, null, 2), 'utf8');
  console.log('');
  say(`pictures: ${String(a.png)} and ${String(b.png)}`);
  say(`reading: ${jsonPath}`);
}

await main();

const operatorAfter = operatorSessionCount();
console.log('');
say(`operator sessions on -L gmux after: ${String(operatorAfter)}`);
if (operatorAfter !== operatorBefore) {
  failures.push(
    `the operator's session count moved from ${String(operatorBefore)} to ${String(operatorAfter)}`
  );
}

rmSync(root, { recursive: true, force: true });

if (failures.length > 0) {
  console.log('');
  say(`FAIL, ${String(failures.length)}:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
say('PASS. Two launches, two pictures, one full set of readings.');
