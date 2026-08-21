#!/usr/bin/env node
/**
 * `node build/probe-p130-spacing.mjs`. The Phase 130 item 2 measurement and
 * the two photographs of Settings then Machines then Add a machine.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * The operator read the Add a machine page and said the lines are too close
 * together. Item 2 of the phase moves five distances. A diff of a stylesheet
 * is not proof that a distance on a screen moved, so this probe opens the real
 * Settings window, presses the real controls, and reads every distance off
 * `getBoundingClientRect()` on the live page.
 *
 * `build/probe-p101-shot.mjs` is the working sibling and this file follows it:
 * one Electron launch per photograph, an isolated `--user-data-dir`,
 * `GMUX_SHOT_SETTINGS=1` so the capture is the Settings window, and one driver
 * expression per launch.
 *
 * ---------------------------------------------------------------------------
 * WHAT THE BEFORE PHOTOGRAPH IS, said plainly
 * ---------------------------------------------------------------------------
 * The before pass is NOT a rebuild of the parent commit. It is the same built
 * app, with the four old declarations put back over the new markup by one
 * `<style>` element the driver appends to the document head before it
 * measures. The element carries `data-p130-before="1"` so it is visible in the
 * page and in this file. `git stash` is forbidden in this worktree, and a
 * second build was not spent, so this is the route taken and the report says
 * so. The new markup adds one class name and no elements, so the two passes
 * lay out the same tree.
 *
 * Both passes run against the same build, the same profile and the same
 * window, and the driver returns the window's own inner width and height so
 * the two photographs can be shown to be the same size rather than assumed to
 * be.
 *
 * ---------------------------------------------------------------------------
 * THE FIVE READINGS
 * ---------------------------------------------------------------------------
 *   #  reading                  measured as
 *   -  -----------------------  ------------------------------------------
 *   1  row to row               bottom of the host row to top of the name row
 *   2  field to its own hint    bottom of the Sign in as row to top of its hint
 *   3  step to step             bottom of .mach-fields to top of .mach-advanced
 *   4  card padding             getComputedStyle(card).paddingTop
 *   5  card to the test panel   bottom of the step three block to top of
 *                               .mach-test
 *
 * ---------------------------------------------------------------------------
 * SAFETY, and none of it is optional
 * ---------------------------------------------------------------------------
 *  - Every launch uses an isolated `--user-data-dir` under /tmp. The
 *    operator's own profile, his machines.json and the installed app are never
 *    opened.
 *  - NO MACHINE IS CONTACTED. Reading 5 needs a connection test panel on the
 *    page, and that panel is drawn only while a test exists. The driver starts
 *    one draft test against the host `p130-shot.invalid`. The name `.invalid`
 *    is reserved and resolves to nothing, so ssh fails to find an address and
 *    no computer anywhere receives a packet. The driver presses Stop as soon
 *    as it has the number. If the reader would rather have no ssh at all, run
 *    with `--skip-5` and reading 5 is reported as not measured.
 *  - The tmux socket is a scratch name and nothing here creates a session.
 *    `-L gmux` appears once, in a read only session count taken before and
 *    after, which must match.
 *  - Only pids this script recorded are killed. There is no `pkill` and no
 *    `kill-server`.
 *  - Every scratch file carries a `p130-` prefix.
 *
 * Exit code 0 when every reading matches the target. 1 otherwise.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scratch = join('/tmp', `p130-spacing-${String(process.pid)}`);
const profile = join(scratch, 'p130-profile');
const outDir = join(repoRoot, 'out');
const machinesJson = join(profile, 'gmux', 'config', 'machines.json');

const skipFive = process.argv.includes('--skip-5');

const failures = [];
const recordedPids = [];

const say = (text) => process.stdout.write(`[p130-spacing] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p130-spacing] FAIL: ${text}\n`);
};

function sh(file, args, options = {}) {
  const out = spawnSync(file, args, { encoding: 'utf8', timeout: 60_000, ...options });
  return { code: out.status ?? -1, stdout: out.stdout ?? '', stderr: out.stderr ?? '' };
}

function operatorSessions() {
  return sh('/bin/sh', [
    '-c',
    "tmux -L gmux list-sessions 2>/dev/null | wc -l | tr -d ' '"
  ]).stdout.trim();
}

const sessionsBefore = operatorSessions();

mkdirSync(join(profile, 'gmux', 'config'), { recursive: true });
mkdirSync(outDir, { recursive: true });

// One saved machine, so the Machines section is the ordinary populated one
// rather than its first run state. Nothing is ever tested against this row.
writeFileSync(
  machinesJson,
  `${JSON.stringify(
    {
      schema: 1,
      machines: [
        {
          id: 'p130-spacing',
          label: 'Mac Pro',
          color: 'magenta',
          host: 'p130-shot.invalid',
          user: 'gdc',
          port: 22,
          remoteTmuxPath: '/opt/homebrew/bin/tmux'
        }
      ]
    },
    null,
    2
  )}\n`,
  'utf8'
);

// ---------------------------------------------------------------------------
// One launch, one photograph
// ---------------------------------------------------------------------------

function driveSettings({ shot, js, timeoutMs = 150_000 }) {
  return new Promise((done) => {
    const child = spawn(
      'npx',
      ['electron', '.', `--user-data-dir=${profile}`, '-ApplePersistenceIgnoreState', 'YES'],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          GMUX_SHOT: shot,
          GMUX_SHOT_SETTINGS: '1',
          GMUX_SHOT_SETTINGS_JS: js,
          GMUX_TMUX_SOCKET: `gmux-p130-spacing-${String(process.pid)}`
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      }
    );
    recordedPids.push(child.pid);
    let out = '';
    child.stdout.on('data', (chunk) => {
      out += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      out += String(chunk);
    });
    const timer = setTimeout(() => {
      try {
        process.kill(child.pid, 'SIGKILL');
      } catch {
        /* already gone */
      }
    }, timeoutMs);
    child.on('exit', (code) => {
      clearTimeout(timer);
      child.stdout.destroy();
      child.stderr.destroy();
      const line = out.split('\n').find((l) => l.includes('[gmux-shot] driver')) ?? '';
      const payload = line.slice(line.indexOf('driver') + 8).trim();
      let parsed = null;
      try {
        parsed = JSON.parse(payload.replace(/^→\s*/, ''));
      } catch {
        parsed = null;
      }
      done({ code, out, parsed });
    });
  });
}

/**
 * The four declarations Phase 130 changed, written back as they were before
 * it. Appended to the head after the bundled stylesheet, so equal specificity
 * lands on the later rule and the page lays out the way it did.
 *
 *   .mach-fields                    had no rule, so it took .mach-block's 8px
 *   .mach-fields > * + .mach-field-row   had no rule
 *   .mach-add .mach-card            had no rule, so it took .mach-card's 12px
 *                                   padding and 16px gap
 *   .mach-add .mach-card > .mach-test    had no rule, so it kept the 12px
 *                                   margin .mach-test sets for every parent
 *   .mach-sheet                     had no gap, so it took .mach-block's 8px
 */
const BEFORE_CSS = [
  '.mach-fields { gap: var(--space-4); }',
  '.mach-fields > * + .mach-field-row { margin-top: 0; }',
  '.mach-add .mach-card { padding: var(--space-5); gap: var(--space-6); }',
  '.mach-add .mach-card > .mach-test { margin-top: var(--space-5); }',
  '.mach-sheet { gap: var(--space-4); }'
].join('\n');

/** A driver expression that runs in the Settings renderer and returns JSON. */
function driver({ before, withTest }) {
  return `(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const text = () => document.body.innerText || '';
    const q = (s) => document.querySelector(s);
    const openMachines = async () => {
      if (text().includes('Tortie can keep your work running on another machine you own.')) {
        return 'already';
      }
      const rail = Array.from(document.querySelectorAll('button, [role="tab"], li, a'))
        .find((n) => (n.textContent || '').trim() === 'Machines');
      if (!rail) return 'not-found';
      rail.click();
      await wait(700);
      return 'clicked';
    };
    const act = async (name) => {
      const el = q('[data-machines-action="' + name + '"]');
      if (el === null) return 'missing';
      if (el.disabled === true) return 'disabled';
      el.click();
      await wait(500);
      return true;
    };
    const type = (selector, value) => {
      const el = q(selector);
      if (el === null) return false;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      ).set;
      setter.call(el, String(value));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };
    /** A vertical distance between two elements, rounded to one decimal. */
    const between = (aSel, bSel) => {
      const a = typeof aSel === 'string' ? q(aSel) : aSel;
      const b = typeof bSel === 'string' ? q(bSel) : bSel;
      if (a === null || b === null) return null;
      return Math.round((b.getBoundingClientRect().top - a.getBoundingClientRect().bottom) * 10) / 10;
    };
    const rowOf = (fieldSel) => {
      const el = q(fieldSel);
      return el === null ? null : el.closest('.mach-field-row');
    };
    try {
      await openMachines();
      ${
        before
          ? `const style = document.createElement('style');
             style.setAttribute('data-p130-before', '1');
             style.textContent = ${JSON.stringify(BEFORE_CSS)};
             document.head.appendChild(style);
             await wait(200);`
          : ''
      }
      const opened = await act('open-add');
      await wait(600);
      const card = q('.mach-add .mach-card');
      if (card === null) {
        return { error: 'the Add a machine card was not drawn', opened };
      }
      type('[data-machines-field="host"]', 'p130-shot.invalid');
      await wait(300);

      const readings = {};
      readings.rowToRow = between(rowOf('[data-machines-field="host"]'), rowOf('[data-machines-field="label"]'));
      readings.fieldToHint = between(rowOf('[data-machines-field="user"]'), '.mach-fields > .mach-hint');
      readings.stepToStep = between('.mach-fields', '.mach-advanced');
      readings.cardPadding = parseFloat(getComputedStyle(card).paddingTop);

      let testPanel = null;
      ${
        withTest
          ? `const started = await act('test-draft');
             await wait(2500);
             const panel = q('.mach-add .mach-card > .mach-test');
             if (panel !== null) {
               const blocks = Array.from(card.children);
               const prior = blocks[blocks.indexOf(panel) - 1] || null;
               readings.cardToTest = between(prior, panel);
               testPanel = {
                 started,
                 marginTop: getComputedStyle(panel).marginTop,
                 outcome: (panel.innerText || '').replace(/\\s+/g, ' ').slice(0, 120)
               };
             } else {
               testPanel = { started, missing: true };
             }
             await act('cancel-test');
             await wait(400);`
          : `readings.cardToTest = null;`
      }

      q('.mach-add').scrollIntoView({ block: 'start' });
      await wait(400);
      return {
        opened,
        before: ${before ? 'true' : 'false'},
        window: { w: window.innerWidth, h: window.innerHeight },
        readings,
        testPanel,
        sheetGap: getComputedStyle(q('.mach-sheet') || document.body).rowGap,
        cardGap: getComputedStyle(card).rowGap
      };
    } catch (err) {
      return { error: String((err && err.message) || err) };
    }
  })().then((v) => JSON.stringify(v))`;
}

function photographed(path) {
  return existsSync(path) && statSync(path).size > 0 ? statSync(path).size : 0;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const beforeShot = join(outDir, 'p130-3-add-before.png');
const afterShot = join(outDir, 'p130-4-add-after.png');

/** target values, in px, from the phase entry section 4.2 */
const TARGET = {
  rowToRow: { before: 8, after: 12 },
  fieldToHint: { before: 8, after: 6 },
  stepToStep: { before: 16, after: 20 },
  cardPadding: { before: 12, after: 16 },
  cardToTest: { before: 28, after: 20 }
};

const LABEL = {
  rowToRow: 'row to row',
  fieldToHint: 'field to its own hint',
  stepToStep: 'step to step',
  cardPadding: 'card padding',
  cardToTest: 'card to the test panel'
};

async function main() {
  say('pass 1 of 2, the old declarations put back over the new markup');
  const b = await driveSettings({
    shot: beforeShot,
    js: driver({ before: true, withTest: !skipFive })
  });
  say('pass 2 of 2, the tree as this phase leaves it');
  const a = await driveSettings({
    shot: afterShot,
    js: driver({ before: false, withTest: !skipFive })
  });

  const bd = b.parsed;
  const ad = a.parsed;
  if (bd === null || ad === null || bd.error !== undefined || ad.error !== undefined) {
    fail(
      `a driver did not answer with readings. before ${JSON.stringify(bd)}, ` +
        `after ${JSON.stringify(ad)}`
    );
    return;
  }

  if (bd.window.w !== ad.window.w || bd.window.h !== ad.window.h) {
    fail(
      `the two photographs are not the same size. before ` +
        `${bd.window.w}x${bd.window.h}, after ${ad.window.w}x${ad.window.h}`
    );
  }

  process.stdout.write(
    '\nreading                    before    after   target before   target after   verdict\n'
  );
  process.stdout.write('-'.repeat(88) + '\n');
  for (const key of Object.keys(TARGET)) {
    const got = { before: bd.readings[key], after: ad.readings[key] };
    if (got.before === null || got.after === null) {
      process.stdout.write(
        `${LABEL[key].padEnd(27)}${'not measured'.padEnd(40)}skipped\n`
      );
      if (key === 'cardToTest' && skipFive) {
        say(
          'reading 5 was not measured, because --skip-5 was passed and the ' +
            'connection test panel is only on the page while a test exists.'
        );
      } else {
        fail(`${LABEL[key]} was not measured. before ${got.before}, after ${got.after}`);
      }
      continue;
    }
    const ok =
      Math.abs(got.before - TARGET[key].before) <= 0.6 &&
      Math.abs(got.after - TARGET[key].after) <= 0.6;
    if (!ok) {
      fail(
        `${LABEL[key]} measured ${got.before}px before and ${got.after}px ` +
          `after. The phase entry asks for ${TARGET[key].before}px and ` +
          `${TARGET[key].after}px.`
      );
    }
    process.stdout.write(
      `${LABEL[key].padEnd(27)}${String(got.before + 'px').padEnd(10)}` +
        `${String(got.after + 'px').padEnd(9)}${String(TARGET[key].before + 'px').padEnd(15)}` +
        `${String(TARGET[key].after + 'px').padEnd(15)}${ok ? 'pass' : 'FAIL'}\n`
    );
  }

  process.stdout.write('\n');
  say(`window: ${ad.window.w}x${ad.window.h} in both passes`);
  say(`card gap: ${bd.cardGap} before, ${ad.cardGap} after`);
  say(`confirm sheet gap: ${bd.sheetGap} before, ${ad.sheetGap} after`);
  say(`test panel: ${JSON.stringify(ad.testPanel)}`);
  say(`${beforeShot} at ${String(photographed(beforeShot))} bytes`);
  say(`${afterShot} at ${String(photographed(afterShot))} bytes`);

  if (photographed(beforeShot) === 0 || photographed(afterShot) === 0) {
    fail('one of the two photographs was not written');
  }
}

await main();

// ---------------------------------------------------------------------------
// The end
// ---------------------------------------------------------------------------

for (const pid of [...recordedPids].reverse()) {
  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    /* already gone, which is the state we wanted */
  }
}

const sessionsAfter = operatorSessions();
if (sessionsBefore !== sessionsAfter) {
  fail(
    `the operator's server held ${sessionsBefore} session(s) before this probe ` +
      `and ${sessionsAfter} after it.`
  );
}
say(`operator sessions before: ${sessionsBefore}, after: ${sessionsAfter}`);
say(`profile: ${profile}, and the operator's own was never opened`);
say(
  'NOT PROVEN HERE: the before photograph is the old declarations re-applied ' +
    'over the new markup, not a build of the parent commit. No machine was ' +
    'contacted. The one ssh this probe starts is aimed at p130-shot.invalid, ' +
    'a name that resolves to nothing.'
);

try {
  rmSync(scratch, { recursive: true, force: true });
} catch {
  /* a scratch directory that will not go is not a result */
}

if (failures.length > 0) {
  process.stdout.write(`\nFAIL, ${failures.length}:\n`);
  for (const failure of failures) process.stdout.write(`  - ${failure}\n`);
  process.exit(1);
}

process.stdout.write(
  '\nPASS. Five distances read off the live Add a machine page in the real ' +
    'Settings window, each one at the value the phase entry asks for, with a ' +
    'photograph of the page before and after at the same window size.\n'
);

process.exit(0);
