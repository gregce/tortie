#!/usr/bin/env node
/**
 * `node build/probe-p101-shot.mjs`. The Phase 101 photographs of the confirm
 * moment, driven in the REAL Settings window.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * The phase entry's evidence item 16 is the one the operator reviews himself,
 * and the first verifier found it had not been done at all. It asks for six
 * photographs of the moment a person lets Tortie replace files on another
 * computer. Items 12 and 13 ask for two more rulings to be driven through the
 * product rather than proved by a unit test. This probe drives all of them.
 *
 * `build/probe-machines.mjs` is the working sibling and this file follows it:
 * one Electron launch per photograph, `GMUX_SHOT_SETTINGS=1` so the capture is
 * the Settings window, and one driver expression per launch that presses the
 * real controls with the real preload in place. The profile is one isolated
 * `--user-data-dir` shared by every launch, so what one launch confirms the
 * next one reads.
 *
 * ---------------------------------------------------------------------------
 * THE PHOTOGRAPHS
 * ---------------------------------------------------------------------------
 *   file                                what it shows
 *   ----------------------------------  -----------------------------------
 *   p101-1-saving-off.png               the Saving files block, saving off
 *   p101-2-folder-field.png             the folder field
 *   p101-3-sheet-sixth-line.png         the sheet, with its sixth line
 *   p101-4-confirm-warning.png          MACHINE_CONFIRM_WARNING above it
 *   p101-5-write-honesty.png            the honesty paragraph beside it
 *   p101-6-row-after.png                the row after confirming
 *   p101-7-reconfirm-sheet.png          the ORDINARY re-confirm sheet after
 *                                       the port moved, carrying the sixth
 *                                       line and the honesty paragraph
 *   p101-8-withdrawn.png                the row after Stop Tortie saving
 *                                       files here
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS PROBE DOES NOT PROVE, and the report says so
 * ---------------------------------------------------------------------------
 * IT NEVER SAVES A FILE. No ssh starts, no machine is contacted, and the
 * seeded host is a name that resolves to nothing. What is proven here is what
 * a person READS and PRESSES at the confirm moment, and what the row does
 * afterwards. That a save then works is `node build/probe-p101-save.mjs`,
 * which drives real bytes over a real link.
 *
 * So the half of evidence item 12 that reads "prove a save still works
 * afterwards", and the half of item 13 that reads "a save afterwards refuses",
 * are NOT driven here. They are driven in the save probe against a machine
 * that has a folder and against one that does not.
 *
 * ---------------------------------------------------------------------------
 * SAFETY, and none of it is optional
 * ---------------------------------------------------------------------------
 *  - Every launch uses an isolated `--user-data-dir` under /tmp. The
 *    operator's own profile, his `machines.json` and the installed app are
 *    never opened.
 *  - No machine is contacted. The seeded host is `p101-shot.invalid`.
 *  - The tmux socket is a scratch name and nothing here creates a session.
 *    `-L gmux` appears once, in a read only session count taken before and
 *    after, which must match.
 *  - Only pids this script recorded are killed. There is no `pkill` and no
 *    `kill-server`.
 *  - Every scratch file carries a `p101-` prefix.
 *
 * Exit code 0 when every reading passes. 1 otherwise, with each failure named.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scratch = join('/tmp', `p101-shot-${String(process.pid)}`);
const profile = join(scratch, 'p101-profile');
const outDir = join(repoRoot, 'out');
const machinesJson = join(profile, 'gmux', 'config', 'machines.json');

const MACHINE_ID = 'p101-shot';
const MACHINE_LABEL = 'Mac Pro';
const ROOT = '/Users/gdc/code';

const recordedPids = [];
const failures = [];
const rows = [];

const say = (text) => process.stdout.write(`[p101-shot] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p101-shot] FAIL: ${text}\n`);
};
const note = (n, what, verdict, detail) => {
  rows.push({ n, what, verdict, detail });
  process.stdout.write(
    `[p101-shot] ${String(n)}. ${what}: ${verdict}. ${detail}\n`
  );
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

function seedMachines(extra = {}) {
  writeFileSync(
    machinesJson,
    `${JSON.stringify(
      {
        schema: 1,
        machines: [
          {
            id: MACHINE_ID,
            label: MACHINE_LABEL,
            color: 'magenta',
            host: 'p101-shot.invalid',
            // Every optional execution field is set, so the sheet draws all
            // SIX hashed lines and the photograph shows the sixth rather than
            // a shorter list a fuller row would not produce.
            user: 'gdc',
            port: 22,
            remoteTmuxPath: '/opt/homebrew/bin/tmux',
            // The fifth confirmed field, so the folder is drawn as the SIXTH
            // hashed line rather than the fifth. It is written here by hand
            // the way Phase 83 lets a person accept one, and no tmux is run.
            acceptedTmuxVersion: '3.5a',
            ...extra
          }
        ]
      },
      null,
      2
    )}\n`,
    'utf8'
  );
}

seedMachines();

// ---------------------------------------------------------------------------
// One launch, one photograph
// ---------------------------------------------------------------------------

function driveSettings({ shot, js, timeoutMs = 120_000 }) {
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
          GMUX_TMUX_SOCKET: `gmux-p101-shot-${String(process.pid)}`
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        // The crash handler Electron starts inherits stdio and outlives the
        // app, so a piped stdout keeps this process alive after every launch
        // has finished. The pipes are closed as soon as the child exits.
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

/** A driver expression that runs in the Settings renderer and returns JSON. */
function driver(body) {
  return `(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const text = () => document.body.innerText || '';
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
      const el = document.querySelector('[data-machines-action="' + name + '"]');
      if (el === null) return 'missing';
      if (el.disabled === true) return 'disabled';
      el.click();
      await wait(500);
      return true;
    };
    const type = (selector, value) => {
      const el = document.querySelector(selector);
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
    const show = (selector) => {
      const el = document.querySelector(selector);
      if (el === null) return false;
      el.scrollIntoView({ block: 'center' });
      return true;
    };
    const textOf = (selector) => {
      const el = document.querySelector(selector);
      return el === null ? null : (el.textContent || '').trim();
    };
    const allText = (selector) =>
      Array.from(document.querySelectorAll(selector)).map(
        (n) => (n.textContent || '').trim()
      );
    /** Open the one row and wait for its detail to be drawn. */
    const openRow = async () => {
      await openMachines();
      const toggle = document.querySelector('[data-machines-action="toggle-lines"]');
      if (toggle === null) return 'no-row';
      if (toggle.getAttribute('aria-expanded') !== 'true') {
        toggle.click();
        await wait(600);
      }
      return true;
    };
    /** The Saving files block, whichever half of it is drawn. */
    const savingBlock = () => textOf('.mach-writes');
    const m = () => window.gmux && window.gmux.machines;
    try {
      const result = await (async () => { ${body} })();
      return JSON.stringify(result);
    } catch (err) {
      return JSON.stringify({ error: String((err && err.message) || err) });
    }
  })()`;
}

const shot = (name) => join(outDir, `p101-${name}.png`);

function photographed(path) {
  return existsSync(path) && statSync(path).size > 0 ? statSync(path).size : 0;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

async function main() {
  // -- 0. Confirm the machine, so every later step reads a confirmed row -----
  const confirmed = await driveSettings({
    shot: join(scratch, 'p101-0-confirm.png'),
    js: driver(`
      await openRow();
      const pressed = await act('confirm');
      await wait(1200);
      const listed = await m().rows();
      return {
        pressed,
        rows: listed.rows.map((r) => ({ id: r.id, state: r.state, writeRoot: r.writeRoot }))
      };
    `)
  });
  const c0 = confirmed.parsed;
  if (c0 === null || (c0.rows ?? [])[0]?.state !== 'confirmed') {
    fail(
      `the seeded machine did not reach the confirmed state, so nothing below ` +
        `is a photograph of the moment this phase owns. The driver answered ` +
        `${JSON.stringify(c0)}.`
    );
  }
  note(
    0,
    'the seeded machine is confirmed, so the row reads as the operator\'s does',
    (c0?.rows ?? [])[0]?.state === 'confirmed' ? 'pass' : 'FAIL',
    `rows ${JSON.stringify(c0?.rows ?? null)}`
  );

  // -- 1. The Saving files block with saving off ----------------------------
  const one = shot('1-saving-off');
  const r1 = await driveSettings({
    shot: one,
    js: driver(`
      await openRow();
      show('.mach-writes');
      await wait(300);
      return {
        block: savingBlock(),
        buttonLabel: textOf('[data-machines-action="open-writes"]'),
        rootAttr: textOf('[data-machine-write-root]')
      };
    `)
  });
  const d1 = r1.parsed;
  const offOk =
    d1 !== null &&
    typeof d1.block === 'string' &&
    d1.block.includes('Saving files') &&
    d1.block.includes('does not save files on') &&
    typeof d1.buttonLabel === 'string' &&
    d1.buttonLabel.length > 0 &&
    photographed(one) > 0;
  if (!offOk) fail(`the Saving files block with saving off was not photographed. Driver: ${JSON.stringify(d1)}`);
  note(
    1,
    'the Saving files block, saving off',
    offOk ? 'pass' : 'FAIL',
    `button reads ${JSON.stringify(d1?.buttonLabel ?? null)}, block reads ` +
      `${JSON.stringify((d1?.block ?? '').replace(/\s+/g, ' ').slice(0, 200))}, ` +
      `photograph ${one} at ${String(photographed(one))} bytes`
  );

  // -- 2. The folder field ---------------------------------------------------
  const two = shot('2-folder-field');
  const r2 = await driveSettings({
    shot: two,
    js: driver(`
      await openRow();
      const opened = await act('open-writes');
      await wait(300);
      show('[data-machines-field="write-root"]');
      await wait(300);
      const label = (() => {
        const el = document.querySelector('[data-machines-field="write-root"]');
        return el === null ? null : (el.closest('label')?.textContent || '').trim();
      })();
      return {
        opened,
        fieldThere: document.querySelector('[data-machines-field="write-root"]') !== null,
        label
      };
    `)
  });
  const d2 = r2.parsed;
  const fieldOk = d2 !== null && d2.fieldThere === true && photographed(two) > 0;
  if (!fieldOk) fail(`the folder field was not photographed. Driver: ${JSON.stringify(d2)}`);
  note(
    2,
    'the folder field',
    fieldOk ? 'pass' : 'FAIL',
    `the field is labelled ${JSON.stringify(d2?.label ?? null)}, photograph ` +
      `${two} at ${String(photographed(two))} bytes`
  );

  // -- 3, 4 and 5. The sheet, the warning above it, the honesty beside it ----
  //
  // Three photographs of ONE driven state, because the three things the entry
  // asks for are drawn together and a person reads them together. Each launch
  // scrolls its own subject into the middle of the window before the capture,
  // and each reads its subject out of the document by name so the photograph
  // is not the only evidence.
  const sheetSteps = [
    ['3-sheet-sixth-line', '.mach-writes .set-config-lines'],
    ['4-confirm-warning', '.mach-writes .set-config-warning'],
    ['5-write-honesty', '.mach-writes .set-config-warning:last-of-type']
  ];
  let sheetReading = null;
  for (const [name, selector] of sheetSteps) {
    const path = shot(name);
    const res = await driveSettings({
      shot: path,
      js: driver(`
        await openRow();
        await act('open-writes');
        type('[data-machines-field="write-root"]', ${JSON.stringify(ROOT)});
        // The sheet is read once the typing pauses, which is 250 ms in the row.
        await wait(1400);
        show(${JSON.stringify(selector)});
        await wait(400);
        return {
          lines: allText('.mach-writes .set-config-lines li'),
          warnings: allText('.mach-writes .set-config-warning'),
          confirmLabel: textOf('[data-machines-action="allow-writes"]')
        };
      `)
    });
    const d = res.parsed;
    if (sheetReading === null) sheetReading = d;
    const lines = d?.lines ?? [];
    const warnings = d?.warnings ?? [];
    // The folder line has to be the LAST of the hashed lines, which is what
    // "the sixth line" means on a row that carries every execution field.
    const sixth = lines[lines.length - 1]?.includes(ROOT)
      ? lines[lines.length - 1]
      : null;
    const honesty = warnings.find((one) => one.includes('cannot be undone')) ?? null;
    const warning = warnings.find((one) => one !== honesty) ?? null;
    const ok =
      sixth !== null &&
      lines.length === 6 &&
      honesty !== null &&
      warning !== null &&
      photographed(path) > 0;
    if (!ok) {
      fail(
        `${name} did not photograph its subject. lines ${JSON.stringify(lines)}, ` +
          `warnings ${JSON.stringify(warnings)}`
      );
    }
    note(
      Number(name[0]),
      name === '3-sheet-sixth-line'
        ? 'the sheet, showing its sixth line'
        : name === '4-confirm-warning'
          ? 'MACHINE_CONFIRM_WARNING above it'
          : 'the honesty paragraph beside it',
      ok ? 'pass' : 'FAIL',
      `${String(lines.length)} hashed line(s), and the LAST one reads ` +
        `${JSON.stringify(sixth)}. The warning reads ` +
        `${JSON.stringify((warning ?? '').slice(0, 120))}. The honesty ` +
        `paragraph reads ${JSON.stringify((honesty ?? '').slice(0, 160))}. ` +
        `Photograph ${path} at ${String(photographed(path))} bytes`
    );
  }

  // -- 6. Confirm, and the row afterwards ------------------------------------
  const six = shot('6-row-after');
  const r6 = await driveSettings({
    shot: six,
    js: driver(`
      await openRow();
      await act('open-writes');
      type('[data-machines-field="write-root"]', ${JSON.stringify(ROOT)});
      await wait(1400);
      const pressed = await act('allow-writes');
      await wait(1400);
      show('.mach-writes');
      await wait(300);
      const listed = await m().rows();
      return {
        pressed,
        block: savingBlock(),
        stopLabel: textOf('[data-machines-action="stop-saving"]'),
        rows: listed.rows.map((r) => ({
          id: r.id,
          state: r.state,
          usable: r.usable,
          writeRoot: r.writeRoot
        }))
      };
    `)
  });
  const d6 = r6.parsed;
  const row6 = (d6?.rows ?? [])[0] ?? null;
  const savedOk =
    row6 !== null &&
    row6.writeRoot === ROOT &&
    row6.state === 'confirmed' &&
    typeof d6.stopLabel === 'string' &&
    d6.stopLabel.length > 0 &&
    photographed(six) > 0;
  if (!savedOk) fail(`turning saving on did not leave the row carrying the folder. Driver: ${JSON.stringify(d6)}`);
  note(
    6,
    'the row after confirming',
    savedOk ? 'pass' : 'FAIL',
    `the row now reads state ${JSON.stringify(row6?.state)} with writeRoot ` +
      `${JSON.stringify(row6?.writeRoot)}, the block reads ` +
      `${JSON.stringify((d6?.block ?? '').replace(/\s+/g, ' ').slice(0, 200))}, ` +
      `and the button reads ${JSON.stringify(d6?.stopLabel ?? null)}. ` +
      `Photograph ${six} at ${String(photographed(six))} bytes`
  );

  // -- 7. Evidence item 12. The port moves and the sheet still says it all ---
  //
  // The folder stays on the row through an ordinary re-confirm, so the sheet a
  // person then reads has to carry BOTH the sixth line and the honesty
  // paragraph. This is the door the phase would otherwise open in silence.
  const onDisk = JSON.parse(readFileSync(machinesJson, 'utf8'));
  const carried = onDisk.machines?.[0]?.writeRoot ?? null;
  onDisk.machines[0].port = 2201;
  writeFileSync(machinesJson, `${JSON.stringify(onDisk, null, 2)}\n`, 'utf8');
  const seven = shot('7-reconfirm-sheet');
  const r7 = await driveSettings({
    shot: seven,
    js: driver(`
      await openRow();
      show('.set-config-detail');
      await wait(400);
      const listed = await m().rows();
      return {
        rows: listed.rows.map((r) => ({ id: r.id, state: r.state, usable: r.usable, writeRoot: r.writeRoot })),
        lines: allText('.set-config-detail .set-config-lines li'),
        warnings: allText('.set-config-detail > .set-config-warning'),
        writeHonesty: textOf('[data-machine-write-honesty]'),
        confirmLabel: textOf('[data-machines-action="confirm"]')
      };
    `)
  });
  const d7 = r7.parsed;
  const row7 = (d7?.rows ?? [])[0] ?? null;
  const sixthOnReconfirm = (d7?.lines ?? []).some((one) => one.includes(ROOT));
  const honestyOnReconfirm =
    typeof d7?.writeHonesty === 'string' && d7.writeHonesty.includes('cannot be undone');
  const item12Ok =
    carried === ROOT &&
    row7?.state === 'changed' &&
    sixthOnReconfirm &&
    honestyOnReconfirm &&
    photographed(seven) > 0;
  if (!item12Ok) {
    fail(
      `the ordinary re-confirm sheet did not carry both the sixth line and the ` +
        `honesty paragraph. On disk the folder is ${JSON.stringify(carried)} ` +
        `and the driver answered ${JSON.stringify(d7)}.`
    );
  }
  note(
    7,
    'the port moved, and the ordinary re-confirm sheet still says it all',
    item12Ok ? 'pass' : 'FAIL',
    `machines.json carries writeRoot ${JSON.stringify(carried)} written by the ` +
      `product itself. After the port moved the row reads ` +
      `${JSON.stringify(row7?.state)} and usable ${String(row7?.usable)}. The ` +
      `sheet draws ${String((d7?.lines ?? []).length)} line(s) and one of them ` +
      `names the folder: ${String(sixthOnReconfirm)}. The honesty paragraph is ` +
      `on the sheet: ${String(honestyOnReconfirm)}. Photograph ${seven} at ` +
      `${String(photographed(seven))} bytes`
  );

  // -- 8. Evidence item 13. The withdrawal ----------------------------------
  const eight = shot('8-withdrawn');
  const r8 = await driveSettings({
    shot: eight,
    js: driver(`
      await openRow();
      const reconfirm = await act('confirm');
      await wait(1200);
      await openRow();
      const before = await m().rows();
      const pressed = await act('stop-saving');
      await wait(1400);
      await openRow();
      show('.mach-writes');
      await wait(300);
      const after = await m().rows();
      return {
        reconfirm,
        pressed,
        before: before.rows.map((r) => ({ state: r.state, usable: r.usable, writeRoot: r.writeRoot })),
        after: after.rows.map((r) => ({ state: r.state, usable: r.usable, writeRoot: r.writeRoot })),
        block: savingBlock()
      };
    `)
  });
  const d8 = r8.parsed;
  const was = (d8?.before ?? [])[0] ?? null;
  const now = (d8?.after ?? [])[0] ?? null;
  const item13Ok =
    was?.writeRoot === ROOT &&
    now?.state === 'never' &&
    now?.usable === false &&
    (now?.writeRoot ?? null) === null &&
    photographed(eight) > 0;
  if (!item13Ok) {
    fail(
      `Stop Tortie saving files here did not do the three things its own ` +
        `sentence promises. Driver: ${JSON.stringify(d8)}`
    );
  }
  note(
    8,
    'Stop Tortie saving files here takes the folder and the confirmation away',
    item13Ok ? 'pass' : 'FAIL',
    `before the press the row read ${JSON.stringify(was)}. After it the row ` +
      `reads ${JSON.stringify(now)}, so it is unreachable until it is ` +
      `confirmed again. The block now reads ` +
      `${JSON.stringify((d8?.block ?? '').replace(/\s+/g, ' ').slice(0, 160))}. ` +
      `Photograph ${eight} at ${String(photographed(eight))} bytes`
  );
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

process.stdout.write('\n#   what                                                          verdict\n');
process.stdout.write('-'.repeat(90) + '\n');
for (const row of rows) {
  process.stdout.write(
    `${String(row.n).padEnd(4)}${String(row.what).padEnd(62)}${row.verdict}\n`
  );
}

say(`profile: ${profile}, and the operator's own was never opened`);
say(`operator sessions before: ${sessionsBefore}, after: ${sessionsAfter}`);
say(
  'NOT DRIVEN HERE: no file was saved and no machine was contacted. That a ' +
    'save works after a re-confirm, and that a save refuses after the ' +
    'withdrawal, are driven by node build/probe-p101-save.mjs.'
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

// The crash handler Electron leaves behind holds this process's stdout open, so
// the exit is explicit rather than left to the handle count.
process.stdout.write(
  '\nPASS. Eight photographs of the real Settings window. A person turned ' +
    'saving on for one machine by pressing the real controls, the sheet they ' +
    'read carried the folder and the paragraph that says what replacing a ' +
    'file costs, the folder survived an ordinary re-confirm with that ' +
    'paragraph still on the sheet, and the withdrawal took both the folder ' +
    'and the confirmation away.\n'
);

process.exit(0);
