#!/usr/bin/env node
/**
 * `npm run probe:p1741`. Phase 174.1's own Tier 2 probe for the Custom font
 * field in Settings then Appearance.
 *
 * The operator reported two things on 2026-08-31, with a screenshot. The field
 * JUMPED upward the moment the "not installed on this Mac" note appeared while
 * he was typing in it, and it SUGGESTED NOTHING, so he could not tell which
 * families his Mac has. This probe measures both, in ONE app run, by driving
 * the real Settings window rather than by reading the source.
 *
 * WHAT IT DOES
 *  1. Seeds a scratch profile whose settings.json already picks the Custom
 *     face with an empty family, so the field is on screen at boot.
 *  2. Opens Appearance and reads the field's box at rest.
 *  3. TYPES 'Menlo' ONE CHARACTER AT A TIME. That is the operator's own
 *     scenario and it crosses the note's state twice: 'M', 'Me', 'Men' and
 *     'Menl' are families this Mac does not have, so the note speaks, and
 *     'Menlo' is one it does, so the note goes quiet again. The field's box is
 *     read after every keystroke.
 *  4. Reads the suggestion list off the DOM, with the count, the head of it,
 *     and the answer to two named families: one that really is installed and
 *     one that is not.
 *  5. Cross checks that list against `system_profiler SPFontsDataType`, which
 *     is Apple's own font registry and a DIFFERENT route from the Chromium API
 *     the product uses. A list that agrees only with itself proves nothing.
 *  6. Photographs the field with the note speaking.
 *
 * THE PARENT COMMIT. `--app <dir>` points the launch at another built worktree,
 * so the same instrument reads the same rectangles before and after the fix:
 *
 *     node build/probe-p1741-font-field.mjs --app /private/tmp/wt-p1741-parent
 *
 * The verdict for the jump is computed, not asserted: every rectangle in the
 * typing sequence must be identical to the one at rest, to the pixel.
 *
 * SAFETY. One Electron, through build/electron-run.mjs, on a scratch profile
 * under the system temporary directory, ended in that helper's `finally` block.
 * No tmux server of the operator's is touched: the launch carries its own
 * scratch socket name and the helper ends it. No font is installed, moved or
 * read for anything but its name. Nothing under the person's home is written.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron } from './electron-run.mjs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function flag(name, fallback) {
  const at = process.argv.indexOf(name);
  return at >= 0 && at + 1 < process.argv.length ? process.argv[at + 1] : fallback;
}

/** The built worktree to launch. Defaults to this one. */
const appDir = resolve(flag('--app', here));
/** A short tag for the output files, so a parent run does not overwrite a head run. */
const tag = flag('--tag', appDir === here ? 'head' : 'parent');

const scratch = join(
  process.env['GMUX_HARNESS_DIR'] ?? tmpdir(),
  `p1741-font-field-${tag}`
);
const profile = join(scratch, 'profile');
const outDir = join(here, 'out');
const shotPath = join(outDir, `p1741-font-field-${tag}.png`);

// A family this Mac really has, and one nothing could have. The first is the
// terminal's own guaranteed floor, so it is installed on every Mac this app
// runs on; the second is the shape Phase 174 measured document.fonts.check
// answering wrongly about.
const REAL = 'Menlo';
const FAKE = 'Zznonexistent Family';

if (!existsSync(join(appDir, 'out', 'main', 'index.js'))) {
  console.error(
    `[p1741] ${appDir} is not built. Run npm run build there first.`
  );
  process.exit(1);
}

rmSync(scratch, { recursive: true, force: true });
mkdirSync(profile, { recursive: true });
mkdirSync(outDir, { recursive: true });

writeFileSync(
  join(profile, 'settings.json'),
  `${JSON.stringify(
    {
      version: 1,
      settings: { workAreaFont: 'custom', workAreaFontCustom: '' }
    },
    null,
    2
  )}\n`,
  'utf8'
);

// ---------------------------------------------------------------------------
// The driver, run inside the real Settings renderer
// ---------------------------------------------------------------------------

const driver = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return [
      Math.round(r.x * 100) / 100,
      Math.round(r.y * 100) / 100,
      Math.round(r.width * 100) / 100,
      Math.round(r.height * 100) / 100
    ];
  };
  const noteState = () => {
    const note = document.querySelector('.set-font-missing');
    if (!note) return { present: false };
    const cs = getComputedStyle(note);
    return {
      present: true,
      visibility: cs.visibility,
      display: cs.display,
      text: (note.textContent || '').trim(),
      box: box(note)
    };
  };
  const setValue = (el, v) => {
    const desc = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(el),
      'value'
    );
    desc.set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const vis0 = document.visibilityState;
  const early = {};
  try {
    const faces = await window.queryLocalFonts();
    early.faces = faces.length;
  } catch (err) {
    early.error = String(err && err.message ? err.message : err);
  }
  const visLog = [];
  document.addEventListener('visibilitychange', () => {
    visLog.push([Math.round(performance.now()), document.visibilityState]);
  });

  const rail = Array.from(
    document.querySelectorAll('button, [role="tab"], li, a')
  ).find((n) => (n.textContent || '').trim() === 'Appearance');
  if (!rail) return JSON.stringify({ error: 'no Appearance item in the rail' });
  rail.click();
  await wait(500);

  const input = document.querySelector('input[aria-label="Custom font family"]');
  if (!input) return JSON.stringify({ error: 'no custom font field' });
  input.focus();
  await wait(400);

  const frames = [];
  frames.push({ typed: '', field: box(input), note: noteState() });

  // The operator's own scenario, keystroke by keystroke. Four prefixes this
  // Mac cannot draw, then the whole family, which it can.
  const target = ${JSON.stringify(REAL)};
  for (let i = 1; i <= target.length; i += 1) {
    setValue(input, target.slice(0, i));
    await wait(320);
    frames.push({
      typed: target.slice(0, i),
      field: box(input),
      note: noteState()
    });
  }

  // And a family nothing has, held long enough to photograph.
  setValue(input, ${JSON.stringify(FAKE)});
  await wait(500);
  frames.push({ typed: ${JSON.stringify(FAKE)}, field: box(input), note: noteState() });

  // The suggestions, read off the DOM the person's own dropdown reads. Read
  // twice, a second apart, because the platform call is asynchronous and a
  // window that only just came to the front may still be answering it.
  const list = document.getElementById('set-font-installed');
  const firstCount = list ? list.options.length : -1;
  await wait(1500);
  const secondCount = list ? list.options.length : -1;
  // A synthetic nudge, to separate "the read never happened" from "the read
  // happened and failed": the field asks again on any visibilitychange.
  document.dispatchEvent(new Event('visibilitychange'));
  await wait(2000);
  const options = list ? Array.from(list.options).map((o) => o.value) : null;

  // What the platform itself answered, for the record.
  let api = { available: typeof window.queryLocalFonts === 'function' };
  try {
    api.permission = (
      await navigator.permissions.query({ name: 'local-fonts' })
    ).state;
  } catch (err) {
    api.permission = 'query failed: ' + err.message;
  }
  api.visibility = document.visibilityState;
  if (api.available) {
    try {
      const t0 = performance.now();
      const faces = await window.queryLocalFonts();
      api.faces = faces.length;
      api.ms = Math.round(performance.now() - t0);
    } catch (err) {
      api.error = String(err && err.message ? err.message : err);
    }
  }

  return JSON.stringify({
    frames,
    vis0,
    early,
    visLog,
    firstCount,
    secondCount,
    hasDatalist: list !== null,
    options,
    optionCount: options ? options.length : 0,
    head: options ? options.slice(0, 20) : [],
    real: options ? options.indexOf(target) : -1,
    fake: options ? options.indexOf(${JSON.stringify(FAKE)}) : -1,
    api
  });
})()`;

// ---------------------------------------------------------------------------
// One launch
// ---------------------------------------------------------------------------

// The scratch socket. `npm run probe:p1741` runs this file under
// build/harness-socket.mjs, which composes a name carrying the worktree and its
// own process id and hands it over. The literal below is the fallback for a
// direct run, e.g. the parent commit measurement. `gmux` is refused by the
// launch helper itself.
const socket =
  process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p1741-${tag}-${String(process.pid)}`;

const run = await withElectron(
  {
    label: `p1741-${tag}`,
    userDataDir: profile,
    cwd: appDir,
    tmuxSocket: socket,
    ceilingMs: 180_000,
    env: {
      ...process.env,
      GMUX_SHOT: shotPath,
      GMUX_SHOT_SETTINGS: '1',
      GMUX_SHOT_SETTINGS_JS: driver,
      GMUX_TMUX_SOCKET: socket
    }
  },
  async (handle) => {
    const code = await handle.exited;
    return { code, text: handle.text() };
  }
);

const line =
  run.text.split('\n').find((l) => l.includes('[gmux-shot] driver')) ?? '';
const payload = line.slice(line.indexOf('driver') + 'driver'.length).replace(/^\s*→\s*/, '');
let read = null;
try {
  read = JSON.parse(payload);
} catch {
  read = null;
}

if (read === null || read.error !== undefined) {
  console.error(`[p1741] the driver did not answer. exit ${run.code}`);
  console.error(run.text.split('\n').slice(-40).join('\n'));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// The jump, computed rather than asserted
// ---------------------------------------------------------------------------

const rest = read.frames[0].field;
const same = (a, b) => a.every((n, i) => n === b[i]);
const moved = read.frames.filter((f) => !same(f.field, rest));

console.log(`\n[p1741] ${tag}: the field's box, keystroke by keystroke`);
console.log('  typed                      x        y        w       h   note');
for (const f of read.frames) {
  const n = f.note.present
    ? f.note.visibility === 'visible'
      ? 'SPEAKS'
      : 'quiet'
    : 'absent';
  console.log(
    `  ${JSON.stringify(f.typed).padEnd(24)} ${String(f.field[0]).padStart(7)} ` +
      `${String(f.field[1]).padStart(7)} ${String(f.field[2]).padStart(7)} ` +
      `${String(f.field[3]).padStart(6)}   ${n}`
  );
}
console.log(
  moved.length === 0
    ? `  JUMP: none. ${read.frames.length} frames, every box identical to the rest box.`
    : `  JUMP: ${moved.length} of ${read.frames.length} frames moved. ` +
        `worst dy ${Math.max(...moved.map((f) => Math.abs(f.field[1] - rest[1])))}px`
);

// ---------------------------------------------------------------------------
// The suggestions, and an independent enumeration to compare them against
// ---------------------------------------------------------------------------

console.log(`\n[p1741] ${tag}: the suggestions`);
console.log(`  datalist present: ${String(read.hasDatalist)}`);
console.log(`  families offered: ${String(read.optionCount)}`);
console.log(`  '${REAL}' at index ${String(read.real)}`);
console.log(`  '${FAKE}' at index ${String(read.fake)}`);
console.log(`  head: ${read.head.join(', ')}`);
console.log(`  platform: ${JSON.stringify(read.api)}`);
console.log(
  `  visibility at drive start: ${String(read.vis0)}, changes ` +
    `${JSON.stringify(read.visLog)}, first read ${String(read.firstCount)}, ` +
    `second ${String(read.secondCount)}, early ${JSON.stringify(read.early)}`
);

if (read.optionCount > 0) {
  // THE INDEPENDENT ROUTE. system_profiler reads Apple's own font registry.
  // It is not Chromium, it is not the Local Font Access API, and it does not
  // share a line of code with the product's path.
  const sp = spawnSync('system_profiler', ['SPFontsDataType', '-json'], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    timeout: 120_000
  });
  let apple = null;
  try {
    const doc = JSON.parse(sp.stdout ?? '');
    const found = new Set();
    for (const file of doc['SPFontsDataType'] ?? []) {
      for (const face of file['typefaces'] ?? []) {
        if (typeof face['family'] === 'string' && face['family'] !== '') {
          found.add(face['family']);
        }
      }
    }
    apple = found;
  } catch {
    apple = null;
  }
  if (apple === null) {
    console.log('  independent route: system_profiler did not parse');
  } else {
    const offered = new Set(read.options);
    const both = [...offered].filter((f) => apple.has(f));
    const onlyOffered = [...offered].filter((f) => !apple.has(f));
    const onlyApple = [...apple].filter((f) => !offered.has(f));
    console.log(
      `  independent route: system_profiler names ${String(apple.size)} families, ` +
        `${String(both.length)} of the ${String(offered.size)} offered are in it`
    );
    console.log(
      `  offered but not in the registry (${String(onlyOffered.length)}): ` +
        onlyOffered.slice(0, 12).join(', ')
    );
    const dotted = onlyApple.filter((f) => f.startsWith('.'));
    console.log(
      `  in the registry but not offered (${String(onlyApple.length)}, of which ` +
        `${String(dotted.length)} are dot prefixed system internal faces): ` +
        onlyApple.slice(0, 12).join(', ')
    );
  }
}

console.log(`\n[p1741] photograph: ${shotPath}`);
console.log(`[p1741] exit ${String(run.code)}`);
process.exit(moved.length === 0 ? 0 : 2);
