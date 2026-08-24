#!/usr/bin/env node
/**
 * probe-p139-caption.mjs. The Phase 139 MEASURE lane, run on the parent
 * commit before any product file is changed.
 *
 * ## What it proves
 *
 * The operator opened a project with no sessions, moved the pointer onto an
 * agent that is not installed, and the whole screen moved. This probe opens
 * the real app on that screen and reads getBoundingClientRect() for four
 * rectangles, being the heading, the agent grid, the hint line and the caption
 * itself. It reads them with nothing hinted and then with an agent hinted, so
 * the movement is a number rather than a description.
 *
 * ## What it changes
 *
 * Nothing. It writes two pictures and two JSON readings into its output
 * directory. No product file is touched, no session is created, and the
 * operator's tmux server is only ever listed.
 *
 * ## How it drives
 *
 * The shot harness opens a scratch project through GMUX_SHOT_DRIVE. The
 * measuring expression is handed to GMUX_SHOT_JS, which the harness evaluates
 * in the driven window just before it photographs it. The hover is a real
 * mouseover event on the shipped tile button, which is the event React turns
 * into the tile's onMouseEnter. When that event does not reach the handler the
 * driver falls back to focusing the tile, which sets the same state, and it
 * reports which route it used.
 *
 * ## The synthetic shapes, and why they are honest
 *
 * Only the agents that are actually absent from this Mac have a caption to
 * hover, and on the operator's Mac that is a short list. The caption shapes
 * that cannot be hovered are therefore built in the page instead. The driver
 * hovers one absent agent, then edits the caption that React drew:
 *
 *   - For a command shape it writes another agent's command into the
 *     `.onb-cmd` element. Nothing else changes, so the tree is the one
 *     `HintedInstallCaption` draws for that agent.
 *   - For the sentence only shape it drops the command row and the note line
 *     and writes the no-command sentence into the first span. That is exactly
 *     the tree `HintedInstallCaption` returns when `install` is null.
 *
 * NEITHER EDIT TOUCHES A NODE REACT OWNS, and the first version of this probe
 * proved why that rule is needed. It removed two of the caption's own children
 * and React threw on its next update, which took the whole empty state off the
 * page and ended the run. So the driver clones the caption React drew, hides
 * the original with one stylesheet rule, edits the clone, measures the clone,
 * and then removes the clone and the rule. The clone is a node this probe
 * made, so removing it is this probe's own business, and a stylesheet rule is
 * invisible to React.
 *
 * Every synthetic shape is labelled `synthetic` in the output.
 *
 * ## The narrow pass, said plainly so nobody reads more into it
 *
 * The app's own minimum window is 960 by 600 and the empty column is capped at
 * 660px, so a real window cannot squeeze this column much below 660px on its
 * own. The narrow pass therefore appends one stylesheet that lowers that cap.
 * It is a column width override and not a window resize, and the report says
 * so.
 *
 * ## Environment it reads
 *
 *   P139_OUT_DIR   where the pictures and the JSON go. Default out/p139.
 *   P139_NARROW    the narrow column width in px. Default 300.
 *
 * ## Safety, absolute
 *
 *  - It refuses to run unless build/harness-socket.mjs handed it a socket of
 *    its own, and it refuses the names `gmux` and `default` outright.
 *  - `-L gmux` is named in exactly one place, a read only `list-sessions`
 *    count taken before and after, which must match.
 *  - Every Electron launch uses a scratch `--user-data-dir` under the harness
 *    directory. The operator's profile is never opened.
 *  - At most one Electron runs at a time. Every launch goes through
 *    build/electron-run.mjs, which ends the whole tree it started in a finally
 *    block whatever happened.
 *  - There is no pkill and no kill-server anywhere in this file.
 *
 * ## Usage, from the worktree root
 *
 *   npm run build
 *   P139_OUT_DIR=out/p139 node build/harness-socket.mjs gmux-p139-caption \
 *     'node build/probe-p139-caption.mjs'
 *
 * Exit 0 when both launches produced a picture and a reading. 1 when they did
 * not. 2 when the probe refuses to run at all.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p139caption]';

const say = (line) => { console.log(`${TAG} ${line}`); };
const refuse = (why) => { console.error(`${TAG} ${why}`); process.exit(2); };

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  refuse(
    'no GMUX_TMUX_SOCKET. Run me through the harness so I get a socket of ' +
      "my own: node build/harness-socket.mjs gmux-p139-caption 'node " +
      "build/probe-p139-caption.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to measure on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

const outDir = resolve(repoRoot, (process.env['P139_OUT_DIR'] ?? '').trim() || 'out/p139');
mkdirSync(outDir, { recursive: true });
const narrowPx = Number(process.env['P139_NARROW'] ?? '') || 300;

// ---------------------------------------------------------------------------
// The install map, read from the registry rather than typed here
// ---------------------------------------------------------------------------

/**
 * Every launchable agent's canonical install command, read out of
 * src/main/agents/registry.ts at run time. Reading the file is what keeps this
 * probe truthful when a command in the registry changes length.
 */
function readInstallMap() {
  const source = readFileSync(join(repoRoot, 'src', 'main', 'agents', 'registry.ts'), 'utf8');
  const idRe = /\n {4}id: '([a-z0-9]+)',/g;
  const marks = [];
  let m = idRe.exec(source);
  while (m !== null) {
    marks.push({ id: m[1], at: m.index });
    m = idRe.exec(source);
  }
  const rows = [];
  for (let i = 0; i < marks.length; i += 1) {
    const end = i + 1 < marks.length ? marks[i + 1].at : source.length;
    const block = source.slice(marks[i].at, end);
    const nameMatch = block.match(/displayName: '([^']+)'/);
    const at = block.indexOf('    install: {');
    let command = null;
    if (at !== -1) {
      const window = block.slice(at, at + 600);
      const cmd = window.match(/canonical: \{\s*command:\s*\n?\s*'([^']+)'/);
      command = cmd === null ? null : cmd[1];
    }
    rows.push({
      id: marks[i].id,
      displayName: nameMatch === null ? marks[i].id : nameMatch[1],
      command,
      chars: command === null ? 0 : command.length
    });
  }
  return rows;
}

const installMap = readInstallMap();
const withCommand = installMap.filter((r) => r.command !== null);
const longest = withCommand.reduce((a, b) => (b.chars > a.chars ? b : a), withCommand[0]);
const noCommand = installMap.find((r) => r.command === null) ?? null;

/**
 * The no-command sentence, copied from `HintedInstallCaption` in
 * src/renderer/app/EmptyStates.tsx. `Muse` is the chip label the seed in
 * src/renderer/state/agents.ts gives the muse row.
 */
const NO_COMMAND_SENTENCE =
  'Muse is not installed. Tortie finds it as soon as it is on your login ' +
  'shell’s PATH.';

/** The operator's live server, listed and never written. Named once. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' });
  return (out.stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
}

const operatorBefore = operatorSessionCount();
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);
say(`harness socket: ${socket}`);
say(
  `longest install command in the registry: ${longest.displayName}, ` +
    `${String(longest.chars)} characters`
);

// ---------------------------------------------------------------------------
// One scratch project, so the app opens a tab that holds no sessions
// ---------------------------------------------------------------------------

const scratch = process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'gmux-p139-caption');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'p139-project', 'src'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'p139-project');
writeFileSync(join(project, 'README.md'), '# Phase 139\n\nScratch project.\n', 'utf8');
writeFileSync(join(project, 'src', 'index.ts'), 'export const one = 1;\n', 'utf8');

// ---------------------------------------------------------------------------
// The one expression the driven window evaluates
// ---------------------------------------------------------------------------

/**
 * @param {string} finalHint 'none' leaves nothing hinted before the picture is
 *                           taken. Anything else is a tile label to leave
 *                           hinted.
 */
function probeJs(finalHint) {
  return `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const frame = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res(1))));
  const q = (s) => document.querySelector(s);
  const r1 = (n) => Math.round(n * 10) / 10;
  const box = (el) => {
    if (el === null || el === undefined) return null;
    const b = el.getBoundingClientRect();
    return { top: r1(b.top), left: r1(b.left), width: r1(b.width), height: r1(b.height) };
  };
  const lastHintLine = () => {
    const all = Array.from(document.querySelectorAll('.onb-inner .onb-hint'));
    return all.length === 0 ? null : all[all.length - 1];
  };
  const tiles = () => Array.from(document.querySelectorAll('.onb-inner .agent-grid .agent-tile'));
  const nameOf = (t) => {
    const n = t.querySelector('.agent-tile-name');
    return n === null ? '' : (n.textContent || '').trim();
  };
  const isMissing = (t) => t.classList.contains('missing');
  const flat = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  // Always look a tile up again. React replaces these nodes whenever the hint
  // state changes, and an event sent to a node it already threw away reaches
  // nothing.
  const tileByLabel = (label) => tiles().find((t) => nameOf(t) === label) ?? null;
  const captionEl = () => q('.onb-caption:not([data-p139-clone])');
  const captionText = () => {
    const c = captionEl();
    return c === null ? null : (c.innerText || '').trim();
  };
  const INSTALLS = ${JSON.stringify(withCommand)};
  const NO_COMMAND_SENTENCE = ${JSON.stringify(NO_COMMAND_SENTENCE)};

  /** The four rectangles, plus what the caption is holding right now. */
  const read = (capEl) => {
    const cap = capEl === undefined || capEl === null ? captionEl() : capEl;
    const code = cap === null ? null : cap.querySelector('.code-row');
    const cmd = cap === null ? null : cap.querySelector('.onb-cmd');
    return {
      title: box(q('.onb-inner .empty-title')),
      grid: box(q('.onb-inner .agent-grid')),
      hintLine: box(lastHintLine()),
      caption: box(cap),
      captionText: cap === null ? null : flat(cap.innerText),
      captionChildren: cap === null ? 0 : cap.childElementCount,
      hasCodeRow: code !== null,
      codeRow: box(code),
      commandText: cmd === null ? null : flat(cmd.textContent),
      commandChars: cmd === null ? 0 : flat(cmd.textContent).length
    };
  };

  /** A real mouseover, with a focus fallback that says it was used. */
  const hover = async (label) => {
    const tile = tileByLabel(label);
    if (tile === null) return 'no-tile';
    tile.dispatchEvent(new MouseEvent('mouseover', {
      bubbles: true, cancelable: true, view: window, relatedTarget: document.body
    }));
    await wait(160);
    const first = captionText();
    if (first === null) return 'no-caption';
    if (first !== '') return 'mouseover';
    const again = tileByLabel(label);
    if (again !== null) again.focus();
    await wait(160);
    const second = captionText();
    if (second === null) return 'no-caption';
    return second !== '' ? 'focus' : 'neither';
  };
  const unhover = async (label) => {
    const tile = tileByLabel(label);
    if (tile === null) return;
    tile.dispatchEvent(new MouseEvent('mouseout', {
      bubbles: true, cancelable: true, view: window, relatedTarget: document.body
    }));
    tile.blur();
    await wait(160);
  };

  /** The movement of the three rectangles against a baseline reading. */
  const movedFrom = (base, on) => ({
    title: base.title === null || on.title === null ? null : r1(on.title.top - base.title.top),
    grid: base.grid === null || on.grid === null ? null : r1(on.grid.top - base.grid.top),
    hintLine: base.hintLine === null || on.hintLine === null ? null : r1(on.hintLine.top - base.hintLine.top),
    captionHeight: base.caption === null || on.caption === null ? null : r1(on.caption.height - base.caption.height)
  });

  try {
    // Wait for the agent detection scan to land. Before it answers the board
    // draws the seed, in which almost every tile reads as installed, and
    // hovering one of those shows nothing.
    let sig = '';
    let stable = 0;
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      const now = tiles().map((t) => nameOf(t) + (isMissing(t) ? ':missing' : ':ok')).join('|');
      if (now !== '' && now === sig) { stable += 1; if (stable >= 3) break; } else { stable = 0; }
      sig = now;
      await wait(700);
    }
    if (tiles().length === 0) return { error: 'the agent grid drew no tiles' };
    if (q('.onb-caption') === null) return { error: 'the caption element is not on the page' };

    const inventory = tiles().map((t) => ({ label: nameOf(t), missing: isMissing(t) }));
    const missingLabels = tiles().filter(isMissing).map(nameOf);
    if (missingLabels.length === 0) {
      return { error: 'every agent on this Mac is installed, so no tile can be hinted' };
    }
    // The tile every synthetic shape is drawn on. A tile whose real caption
    // carries a command is preferred, because that shape already has the
    // command row the swap writes into.
    let carrierLabel = missingLabels[0];
    for (const label of missingLabels) {
      await hover(label);
      const has = captionEl() !== null && captionEl().querySelector('.onb-cmd') !== null;
      await unhover(label);
      if (has) { carrierLabel = label; break; }
    }

    // The one stylesheet rule that hides the caption React owns while a clone
    // of it stands in the same place. Empty for the whole of the real pass.
    const swap = document.createElement('style');
    swap.setAttribute('data-p139-swap', '1');
    document.head.appendChild(swap);

    /**
     * Hover the carrier, clone the caption React drew, edit the clone, measure
     * it, then put everything back. React never sees any of it.
     */
    const shaped = async (base, label, kind, chars, mutate) => {
      const route = await hover(carrierLabel);
      const realCap = captionEl();
      if (realCap === null) return null;
      const clone = realCap.cloneNode(true);
      clone.setAttribute('data-p139-clone', '1');
      clone.removeAttribute('aria-live');
      realCap.parentNode.insertBefore(clone, realCap.nextSibling);
      swap.textContent = '.onb-caption:not([data-p139-clone]) { display: none !important; }';
      let ok = true;
      try { mutate(clone); } catch (e) { ok = false; }
      await frame();
      const on = ok ? read(clone) : null;
      swap.textContent = '';
      clone.remove();
      await unhover(carrierLabel);
      if (!ok || on === null) return null;
      return { label, route, kind, chars, on, moved: movedFrom(base, on) };
    };

    /** One full sweep at the current column width. */
    const sweep = async (passName) => {
      await wait(250);
      const base = read();

      // 1. Every tile the scan says is absent, hovered for real.
      const real = [];
      for (const label of missingLabels) {
        const route = await hover(label);
        const on = read();
        real.push({ label, route, kind: 'real hover', chars: on.commandChars, on, moved: movedFrom(base, on) });
        await unhover(label);
      }

      // 2. The caption shapes this Mac cannot show, built on a clone.
      const synthetic = [];

      // 2a. The sentence only shape, being an agent with no install command.
      const only = await shaped(base, 'Muse, no install command', 'synthetic sentence only', 0, (clone) => {
        const first = clone.children[0] ?? null;
        if (first === null) throw new Error('the clone has no first span');
        while (clone.children.length > 1) clone.removeChild(clone.children[1]);
        first.textContent = NO_COMMAND_SENTENCE;
      });
      if (only !== null) synthetic.push(only);

      // 2b. Every install command in the registry, written into the command
      //     element of the clone.
      for (const row of INSTALLS) {
        const one = await shaped(base, row.displayName, 'synthetic command', row.chars, (clone) => {
          const cmd = clone.querySelector('.onb-cmd');
          if (cmd === null) throw new Error('the clone has no command element');
          cmd.textContent = row.command;
        });
        if (one !== null) synthetic.push(one);
      }

      const back = read();
      return { pass: passName, base, real, synthetic, back };
    };

    const wide = await sweep('wide');

    // The narrow pass. One stylesheet lowers the column cap so the sentence
    // wraps. It is a column width override and not a window resize.
    const style = document.createElement('style');
    style.setAttribute('data-p139-narrow', '1');
    style.textContent = '.empty-inner.onb-inner { max-width: ${String(narrowPx)}px; }';
    document.head.appendChild(style);
    await wait(500);
    const narrow = await sweep('narrow-${String(narrowPx)}px');
    style.remove();
    await wait(500);

    // Leave the page in the state the picture should show.
    let finalState = 'none';
    swap.remove();
    const want = ${JSON.stringify(finalHint)};
    if (want !== 'none') {
      const label = missingLabels.includes(want) ? want : missingLabels[0];
      await hover(label);
      finalState = label;
    }
    await wait(400);

    return {
      window: { w: window.innerWidth, h: window.innerHeight },
      captionMinHeightCss: getComputedStyle(q('.onb-caption')).minHeight,
      emptyJustify: getComputedStyle(q('.empty')).justifyContent,
      inventory,
      carrierLabel,
      wide,
      narrow,
      narrowPx: ${String(narrowPx)},
      finalState,
      finalRead: read()
    };
  } catch (err) {
    return { error: String((err && err.stack) || err) };
  }
})()`;
}

// ---------------------------------------------------------------------------
// One launch, one picture, one reading. Never two at a time.
// ---------------------------------------------------------------------------

async function launch(label, finalHint) {
  const png = join(outDir, `p139-${label}.png`);
  rmSync(png, { force: true });
  const drive = { projectPath: project, sidebarView: 'explorer' };
  say(`launch ${label}, final state ${finalHint}`);
  // build/electron-run.mjs owns the launch and ends the whole tree it started
  // in a finally block whatever happened here (Phase 140). The kill this
  // function used to do by hand sent SIGKILL to node_modules/.bin/electron,
  // which is a Node shim that cannot forward SIGKILL, so it ended the shim and
  // left the app running. The helper sends SIGTERM first for that reason.
  const { code, text } = await runElectron({
    label: `p139 ${label}`,
    userDataDir: join(root, `profile-${label}`),
    cwd: repoRoot,
    env: {
      ...process.env,
      GMUX_SHOT: png,
      GMUX_SHOT_DELAY_MS: '9000',
      GMUX_SHOT_DRIVE: JSON.stringify(drive),
      GMUX_SHOT_JS: probeJs(finalHint)
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

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const failures = [];

function movementTable(pass) {
  const lines = [];
  lines.push(
    '  caption                        source     chars   caption h   title dy   grid dy   hint dy'
  );
  lines.push('  ' + '-'.repeat(92));
  for (const s of [...pass.real, ...pass.synthetic]) {
    lines.push(
      '  ' +
        String(s.label).padEnd(31) +
        String(s.kind === 'real hover' ? 'hovered' : 'synthetic').padEnd(11) +
        String(s.on.commandChars === 0 ? '-' : String(s.on.commandChars)).padEnd(8) +
        `${String(s.on.caption === null ? '?' : s.on.caption.height)}px`.padEnd(12) +
        `${String(s.moved.title)}px`.padEnd(11) +
        `${String(s.moved.grid)}px`.padEnd(10) +
        `${String(s.moved.hintLine)}px`
    );
  }
  const baseCap = pass.base.caption === null ? '?' : String(pass.base.caption.height);
  lines.push(`  nothing hinted                 -          -       ${baseCap}px`);
  return lines.join('\n');
}

async function main() {
  const a = await launch('unhinted', 'none');
  const b = await launch('hinted', 'Droid');

  for (const [label, res] of [['unhinted', a], ['hinted', b]]) {
    if (res.png === null) failures.push(`${label}: no picture was written`);
    if (res.report === null) {
      failures.push(`${label}: the driven window printed no reading (electron exited ${String(res.code)})`);
    } else if (res.report.error !== undefined) {
      failures.push(`${label}: the driver reported ${String(res.report.error)}`);
    }
  }

  const rep = a.report !== null && a.report !== undefined && a.report.error === undefined ? a.report : null;
  if (rep === null) return;

  console.log('');
  say(`window ${String(rep.window.w)} by ${String(rep.window.h)}`);
  say(`.onb-caption min-height as shipped: ${String(rep.captionMinHeightCss)}`);
  say(`.empty justify-content as shipped: ${String(rep.emptyJustify)}`);
  say(`the tile every synthetic shape was drawn on: ${String(rep.carrierLabel)}`);
  say('tiles on the board');
  for (const t of rep.inventory) {
    console.log(`    ${String(t.label).padEnd(16)}${t.missing ? 'not installed' : 'installed'}`);
  }

  console.log('');
  say('WIDE PASS, the column at its shipped 660px cap');
  console.log(movementTable(rep.wide));

  console.log('');
  say(`NARROW PASS, the column cap lowered to ${String(rep.narrowPx)}px. This is a column`);
  say('width override and NOT a window resize. The app cannot make a real window');
  say('narrow enough to squeeze this column on its own.');
  console.log(movementTable(rep.narrow));

  console.log('');
  say('the page returns to its baseline when the pointer leaves');
  console.log(`    wide   title back at ${String(rep.wide.back.title.top)}px, baseline ${String(rep.wide.base.title.top)}px`);
  console.log(`    narrow title back at ${String(rep.narrow.back.title.top)}px, baseline ${String(rep.narrow.base.title.top)}px`);

  writeFileSync(join(outDir, 'p139-unhinted.json'), JSON.stringify(a.report, null, 2), 'utf8');
  writeFileSync(join(outDir, 'p139-hinted.json'), JSON.stringify(b.report, null, 2), 'utf8');
  console.log('');
  say(`pictures: ${String(a.png)} and ${String(b.png)}`);
  say(`readings: ${join(outDir, 'p139-unhinted.json')} and ${join(outDir, 'p139-hinted.json')}`);
  if (b.report !== null && b.report !== undefined && b.report.error === undefined) {
    say(`the hinted picture shows ${String(b.report.finalState)} hinted`);
  }
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
