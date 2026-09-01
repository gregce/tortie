#!/usr/bin/env node
/**
 * probe-p194-redline-view.mjs. ONE app run that proves the Redline view
 * (Phase 194), which replaced build/probe-p191-redline.mjs when the toggle
 * that probe drove left the diff at the operator's word.
 *
 * ## THE NAMED INDEPENDENT METHOD, and it is exact
 *
 * The drawn document with every `ins` removed must equal the OLD file byte
 * for byte, and with every `del` removed the NEW file byte for byte. This
 * script wrote both files, so it holds the answer without trusting any code
 * that drew the document. It reads the runs off the DOM of the running app,
 * joins them here, and compares. That is rows 2 and 3 for every fixture and
 * it is the whole correctness claim of a redline.
 *
 * ## WHAT IT PROVES, every cell read off the running app or re-derived here
 *
 *   #   what must be true                                        read from
 *   --  ------------------------------------------------------   ------------
 *    0  the drive answered with a reading                         the drive
 *    1  every prose fixture opens as DIFF with Redline offered    the document
 *       beside it, and the click makes Redline the checked mode
 *    2  THE OLD PROJECTION: the runs without the insertions       node + DOM
 *       equal the old file byte for byte, every fixture
 *    3  THE NEW PROJECTION: the runs without the deletions        node + DOM
 *       equal the new file byte for byte, every fixture
 *    4  no Pierre, no Monaco, no line number and no rendered      the document
 *       markdown in the view's tree, and nothing editable
 *    5  deletions are --error and struck through, insertions      getComputedStyle
 *       are --success and not, from the live tokens
 *    6  the document keeps its whitespace (pre-wrap) and is       getComputedStyle
 *       drawn in the UI face, not the editor's monospace
 *    7  a block the caps refuse draws WHOLE and the note says     the document
 *       so, and the projections still hold over it
 *    8  a file with no changes reads as the plain document,       the document
 *       with no note and no error state
 *    9  markdown offers Redline beside Preview, Source and         the document
 *       Split, and draws the SOURCE, never a rendered preview
 *   10  a file that is not prose gets no Redline at all           the document
 *   11  the journey: Diff first, Redline, File (Monaco, no         the document
 *       document), Redline again with the same runs
 *   12  the document scrolls on its own scroller                  the document
 *   13  it reflows when the panel is squeezed to its floor        rectangles
 *   14  a second file opens as DIFF, Redline offered, unchosen    the document
 *   15  an edit made in Source shows in the redline as an          the DOM + the
 *       insertion, its new projection is the model's text, and    Monaco model
 *       taking the edit back restores the document
 *   16  THE PARENT MEASUREMENT'S OTHER HALF: one changed word     rectangles
 *       on one line draws ONE row, with zero Pierre rows
 *   17  a second independent method: git diff --word-diff         git + the DOM
 *       agrees on which words went and which arrived
 *   18  THE CLIPBOARD: the whole document copies as the NEW       the system
 *       file, byte for byte                                       clipboard
 *   19  a selection from a deletion to its insertion copies       the system
 *       the insertion and not the deletion                        clipboard
 *   20  a selection wholly inside a deletion copies the           the system
 *       deleted words, which is what selecting them means         clipboard
 *   21  the person's own clipboard is put back exactly, its       pbpaste and
 *       flavour names included and not one added                  clipboard info
 *   22  the operator's session count did not move                 tmux, read only
 *
 * ## SAFETY, ABSOLUTE
 *
 * Without GMUX_TMUX_SOCKET this script re-runs itself through
 * build/harness-socket.mjs, so the socket is always one that script composed
 * and ends afterwards, never `gmux` or `default`. The app gets its own user
 * data directory and its own scratch project under the harness directory. It
 * spawns no agent and spends no token. `-L gmux` appears in exactly one
 * place, a read only session count taken before and after, which must match.
 * The Electron goes through build/electron-run.mjs, whose kill is in a
 * finally block. The system clipboard is read before the run and compared
 * after, and main is what puts the prior contents back, inside a finally.
 *
 * Usage, from the repository root:
 *
 *   npm run probe:p194
 *
 * Exit 0 when every row passes, 1 otherwise with every failing row named,
 * 2 when the probe refuses to run.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p194redline]';

function say(line) {
  console.log(`${TAG} ${line}`);
}
function refuse(why) {
  console.error(`${TAG} ${why}`);
  process.exit(2);
}

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  say('no GMUX_TMUX_SOCKET, so this run wraps itself in the harness script');
  const wrapped = spawnSync(
    process.execPath,
    [
      join(repoRoot, 'build', 'harness-socket.mjs'),
      '--fresh',
      'gmux-p194-redline',
      'node build/probe-p194-redline-view.mjs'
    ],
    { cwd: repoRoot, stdio: 'inherit' }
  );
  process.exit(wrapped.status ?? 1);
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to run on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

/** The operator's live server, listed and never written. The ONLY place this file names it. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' });
  return (out.stdout ?? '').split('\n').filter((line) => line.trim() !== '').length;
}
const operatorBefore = operatorSessionCount();
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);

/** His clipboard, fingerprinted and never printed. */
function clipboardFingerprint() {
  const out = spawnSync('pbpaste', [], { encoding: 'utf8' });
  const text = out.stdout ?? '';
  const info = spawnSync('osascript', ['-e', 'clipboard info'], { encoding: 'utf8' });
  return {
    bytes: Buffer.byteLength(text),
    md5: createHash('md5').update(text).digest('hex'),
    flavours: (info.stdout ?? '').trim()
  };
}
const clipBefore = clipboardFingerprint();
say(`the clipboard held ${String(clipBefore.bytes)} bytes before this run (md5 ${clipBefore.md5.slice(0, 8)})`);

const scratch = process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'p194-redline');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'project'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'project');
const profile = join(root, 'profile');

/** Deterministic filler, so the rewritten block is the same on every machine. */
function words(count, seed) {
  const out = [];
  let x = seed;
  for (let i = 0; i < count; i++) {
    x = (x * 1103515245 + 12345) % 2147483648;
    out.push(`w${String(x % 500)}`);
  }
  return out.join(' ');
}

// ---------------------------------------------------------------------------
// THE FIXTURES. Each is a pair of whole files, and the probe holds both.
// ---------------------------------------------------------------------------

/** Filler paragraphs, so the journey file is taller than the panel and its lines wrap at the floor. */
function paragraphs(count, seed) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(
      `Paragraph ${String(i + 1)} of the notes keeps going for a while so that the document ` +
        `is taller than the panel it is read in and every line is long enough to wrap when ` +
        `the panel is squeezed to its floor, ${words(6, seed + i)}.`,
      ''
    );
  }
  return out;
}

/**
 * THE OPERATOR'S SHAPE, and the journey file. One word changes on one line
 * in a long plain text file. At the parent this drew three rows in the diff
 * with Redline on; here it must draw one.
 */
const OLD_TEST = ['The quick brown fox jumped over the lazy dog.', '', ...paragraphs(40, 1000)].join('\n');
const NEW_TEST = ['The quick red fox jumped over the lazy dog.', '', ...paragraphs(40, 1000)].join('\n');

const FIXTURES = {
  'test.txt': [OLD_TEST, NEW_TEST],
  'replacement.txt': [
    'Release notes for the quarter.\n\nThe quick brown fox jumped over the lazy dog near the river bank.\n\nThe ending stays exactly as it is.\n',
    'Release notes for the quarter.\n\nThe quick red fox leapt over the sleepy dog beside the river bank.\n\nThe ending stays exactly as it is.\n'
  ],
  'deletion.txt': [
    'First paragraph stays.\n\nThis whole paragraph goes away entirely.\n\nLast paragraph stays.\n',
    'First paragraph stays.\n\nLast paragraph stays.\n'
  ],
  'insertion.txt': [
    'First paragraph stays.\n\nLast paragraph stays.\n',
    'First paragraph stays.\n\nAn entirely new paragraph arrives here.\n\nLast paragraph stays.\n'
  ],
  'multiline.txt': [
    [
      'Release notes.',
      '',
      'Alpha beta gamma.',
      'Delta epsilon zeta.',
      'Eta theta iota.',
      '',
      'The report opened with a careful note',
      'about the timing of the release and',
      'the people who would be affected by',
      'it, and then said very little else.',
      '',
      'The last line never moves.',
      ''
    ].join('\n'),
    [
      'Release notes.',
      '',
      'Alpha beta gamma delta epsilon zeta eta theta iota.',
      '',
      'The report opened with a careful memo',
      'about the timing of the launch and',
      'the people who would be helped by',
      'it, and then said very little more.',
      '',
      'The last line never moves.',
      ''
    ].join('\n')
  ],
  'twoinone.txt': [
    [
      'One paragraph, four lines long, with two changes in it.',
      'The first change is on this line, which says Tuesday.',
      'This middle line does not change at all.',
      'The second change is on this line, which says the manager.',
      '',
      'A second paragraph with two changes on ONE line: alpha here and beta there.',
      ''
    ].join('\n'),
    [
      'One paragraph, four lines long, with two changes in it.',
      'The first change is on this line, which says Thursday.',
      'This middle line does not change at all.',
      'The second change is on this line, which says the director.',
      '',
      'A second paragraph with two changes on ONE line: gamma here and delta there.',
      ''
    ].join('\n')
  ],
  'capped.txt': [
    [
      'A settled line before.',
      '',
      ...Array.from({ length: 20 }, (_, i) => words(15, 77 + i * 3)),
      '',
      `A very long line ${'x'.repeat(4_100)} end.`,
      '',
      'A settled line after.',
      ''
    ].join('\n'),
    [
      'A settled line before.',
      '',
      ...Array.from({ length: 20 }, (_, i) => words(15, 78 + i * 3)),
      '',
      `A very long line ${'x'.repeat(4_100)} END.`,
      '',
      'A settled line after.',
      ''
    ].join('\n')
  ],
  'unicode.txt': [
    [
      'The team shipped 👩‍💻 café naïve résumé today.',
      'The sign read مرحبا بالعالم before the change.',
      '今日は良い天気ですね。',
      'Spaced   out     words   here.',
      '    indented by four spaces',
      ''
    ].join('\n'),
    [
      'The team shipped 👨‍🚀 café naive résumé tomorrow.',
      'The sign read مرحبا بالجميع after the change.',
      '明日は良い天気ですね。',
      'Spaced out words here.',
      '\tindented by four spaces',
      ''
    ].join('\n')
  ],
  'same.txt': [
    'Nothing here changes.\n\nNot one word of it.\n',
    'Nothing here changes.\n\nNot one word of it.\n'
  ],
  'guide.md': [
    '# Guide\n\nThe old sentence names the wrong person entirely.\n\n- a list item\n',
    '# Guide\n\nThe new sentence names the right person entirely.\n\n- a list item\n'
  ],
  'sample.ts': [
    'export const answer = 41;\nexport const other = 1;\n',
    'export const answer = 42;\nexport const other = 1;\n'
  ]
};

const PROSE = ['test.txt', 'replacement.txt', 'deletion.txt', 'insertion.txt', 'multiline.txt', 'twoinone.txt', 'capped.txt', 'unicode.txt'];

for (const [name, [oldText]] of Object.entries(FIXTURES)) {
  writeFileSync(join(project, name), oldText);
}
for (const argv of [
  ['init', '-q', '-b', 'main'],
  ['add', '-A'],
  ['-c', 'user.email=p194@example.invalid', '-c', 'user.name=p194 probe', 'commit', '-q', '-m', 'p194 fixture']
]) {
  spawnSync('git', argv, { cwd: project, encoding: 'utf8' });
}
for (const [name, [, newText]] of Object.entries(FIXTURES)) {
  writeFileSync(join(project, name), newText);
}

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------

let reading = null;
let clipboard = null;
let priorFormats = null;
let text = '';
await withElectron(
  {
    label: 'p194-redline',
    userDataDir: profile,
    tmuxSocket: socket,
    cwd: repoRoot,
    env: {
      GMUX_SHOT: join(scratch, 'p194-redline.png'),
      GMUX_SHOT_VERBOSE: '1',
      GMUX_SHOT_DELAY_MS: '3000',
      GMUX_SHOT_CLIPBOARD: JSON.stringify([
        "window.__gmuxRedlineSelect('doc')",
        "window.__gmuxRedlineSelect('pair')",
        "window.__gmuxRedlineSelect('del')"
      ]),
      GMUX_SHOT_DRIVE: JSON.stringify({
        projectPath: project,
        openRel: 'test.txt',
        mode: 'diff',
        editorWidth: 1200,
        redline: {
          rels: PROSE,
          codeRel: 'sample.ts',
          markdownRel: 'guide.md',
          sameRel: 'same.txt',
          secondRel: 'deletion.txt'
        }
      }),
      GMUX_SHOT_JS: 'window.__gmuxP194Redline'
    }
  },
  async (handle) => {
    say(`launched the app, pid ${String(handle.pid)}`);
    const code = await new Promise((r) => {
      const ceiling = setTimeout(() => {
        console.error(`${TAG} the run passed its ceiling; the teardown ends it.`);
        r(1);
      }, 300_000);
      void handle.exited.then((c) => {
        clearTimeout(ceiling);
        r(c);
      });
    });
    text = handle.text();
    say(`the app exited with ${String(code)}`);
    const readOne = (marker) => {
      const at = text.lastIndexOf(marker);
      if (at === -1) return null;
      const line = text.slice(at + marker.length).split('\n')[0] ?? '';
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    };
    reading = readOne('[gmux-shot] probe ');
    clipboard = readOne('[gmux-shot] clipboard ');
    priorFormats = readOne('[gmux-shot] clipboard-formats ');
  }
);

// ---------------------------------------------------------------------------
// The judgement.
// ---------------------------------------------------------------------------

const failures = [];
const results = [];
function check(step, claim, pass, detail) {
  results.push({ step, claim, verdict: pass ? 'pass' : 'FAIL', detail });
  if (!pass) failures.push(`${String(step)}. ${claim}. ${detail}`);
}

const oldOf = (runs) => runs.filter((r) => r.kind !== 'ins').map((r) => r.text).join('');
const newOf = (runs) => runs.filter((r) => r.kind !== 'del').map((r) => r.text).join('');
const firstDiff = (a, b) => {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return `at ${String(i)}: got ${JSON.stringify(a.slice(i, i + 24))} want ${JSON.stringify(b.slice(i, i + 24))}`;
};
const rgb = (hex) => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex).trim());
  return m === null
    ? null
    : `rgb(${String(parseInt(m[1], 16))}, ${String(parseInt(m[2], 16))}, ${String(parseInt(m[3], 16))})`;
};
/** Words for the git comparison: whitespace runs with sentence punctuation trimmed. */
const PUNCT = /^[.,;:!?"'`()[\]{}]+|[.,;:!?"'`()[\]{}]+$/g;
const compareWords = (s) =>
  s
    .split(/\s+/)
    .map((w) => w.replace(PUNCT, ''))
    .filter((w) => w !== '');

/** The projections at HEAD, printed per fixture as the evidence itself. */
const projectionReport = [];

if (reading === null || typeof reading !== 'object') {
  failures.push('0. the drive printed no reading, so nothing was measured.');
  console.error(text.split('\n').slice(-60).join('\n'));
} else {
  const r = reading;
  const fixtures = r.fixtures ?? {};
  check(0, 'the drive answered with a reading', true, `${String(Object.keys(fixtures).length)} fixture(s) read`);

  // -- 1. every prose fixture opens as DIFF and the click chooses Redline ----
  {
    const bad = [];
    for (const rel of PROSE) {
      const f = fixtures[rel] ?? {};
      const opened = f.opened ?? {};
      const after = f.afterClick ?? {};
      const options = Array.isArray(opened.options) ? opened.options : [];
      const ok =
        opened.checked === 'Diff' &&
        options[0] === 'Diff' &&
        options[1] === 'Redline' &&
        options[2] === 'File' &&
        opened.redline?.text === 'Redline' &&
        opened.redline?.disabled === false &&
        after.checked === 'Redline' &&
        f.doc?.present === true &&
        f.pierreBefore >= 1;
      if (!ok) bad.push(`${rel}: opened ${JSON.stringify(opened)} then ${JSON.stringify(after)} doc ${String(f.doc?.present)}`);
    }
    check(
      1,
      'every prose fixture opens as DIFF with Redline offered beside it, and the click makes Redline the checked mode',
      bad.length === 0,
      bad.length === 0 ? `${String(PROSE.length)} fixtures: Diff, Redline, File, opened on Diff` : bad.join(' | ')
    );
  }

  // -- 2 and 3. THE PROJECTIONS, byte for byte, every fixture ----------------
  {
    const badOld = [];
    const badNew = [];
    for (const rel of PROSE) {
      const runs = fixtures[rel]?.doc?.runs;
      const [oldText, newText] = FIXTURES[rel];
      if (!Array.isArray(runs)) {
        badOld.push(`${rel}: no runs read`);
        badNew.push(`${rel}: no runs read`);
        continue;
      }
      const o = oldOf(runs);
      const n = newOf(runs);
      const kinds = { same: 0, del: 0, ins: 0 };
      for (const run of runs) kinds[run.kind] = (kinds[run.kind] ?? 0) + 1;
      projectionReport.push(
        `${rel}: ${String(runs.length)} runs (${String(kinds.same)} same, ${String(kinds.del)} del, ${String(kinds.ins)} ins); ` +
          `old ${o === oldText ? 'EQUAL' : 'DIFFERS'} (${String(Buffer.byteLength(o))} of ${String(Buffer.byteLength(oldText))} bytes); ` +
          `new ${n === newText ? 'EQUAL' : 'DIFFERS'} (${String(Buffer.byteLength(n))} of ${String(Buffer.byteLength(newText))} bytes)`
      );
      if (o !== oldText) badOld.push(`${rel} ${firstDiff(o, oldText)}`);
      if (n !== newText) badNew.push(`${rel} ${firstDiff(n, newText)}`);
    }
    check(
      2,
      'THE OLD PROJECTION: the runs without the insertions equal the old file byte for byte, every fixture',
      badOld.length === 0,
      badOld.length === 0 ? `${String(PROSE.length)} fixtures equal` : badOld.join(' | ')
    );
    check(
      3,
      'THE NEW PROJECTION: the runs without the deletions equal the new file byte for byte, every fixture',
      badNew.length === 0,
      badNew.length === 0 ? `${String(PROSE.length)} fixtures equal` : badNew.join(' | ')
    );
  }

  // -- 4. nothing that is not the document is in the tree --------------------
  {
    const bad = [];
    for (const rel of PROSE) {
      const d = fixtures[rel]?.doc ?? {};
      if (
        d.pierre !== 0 ||
        d.monaco !== 0 ||
        d.lineNumbers !== 0 ||
        d.renderedMarkdown !== 0 ||
        d.contentEditable !== false ||
        d.editableInside !== 0
      ) {
        bad.push(`${rel}: pierre ${String(d.pierre)} monaco ${String(d.monaco)} numbers ${String(d.lineNumbers)} md ${String(d.renderedMarkdown)} editable ${String(d.contentEditable)}/${String(d.editableInside)}`);
      }
    }
    check(
      4,
      'no Pierre, no Monaco, no line number and no rendered markdown in the view, and nothing editable',
      bad.length === 0,
      bad.length === 0 ? 'zero of each, every fixture' : bad.join(' | ')
    );
  }

  // -- 5. colours from the live tokens ---------------------------------------
  {
    const wantError = rgb(r.tokens?.error ?? '');
    const wantSuccess = rgb(r.tokens?.success ?? '');
    const bad = [];
    for (const rel of PROSE) {
      const d = fixtures[rel]?.doc ?? {};
      const runs = Array.isArray(d.runs) ? d.runs : [];
      const hasDel = runs.some((x) => x.kind === 'del');
      const hasIns = runs.some((x) => x.kind === 'ins');
      if (hasDel && !(d.delColor === wantError && d.delDecoration === 'line-through')) bad.push(`${rel} del ${String(d.delColor)} ${String(d.delDecoration)}`);
      if (hasIns && !(d.insColor === wantSuccess && d.insDecoration === 'none')) bad.push(`${rel} ins ${String(d.insColor)} ${String(d.insDecoration)}`);
    }
    check(
      5,
      'deletions are --error and struck through, insertions are --success and not',
      wantError !== null && wantSuccess !== null && bad.length === 0,
      bad.length === 0 ? `--error ${String(r.tokens?.error)} and --success ${String(r.tokens?.success)}, read live` : bad.join(' | ')
    );
  }

  // -- 6. whitespace kept, UI face ------------------------------------------
  {
    const d = fixtures['test.txt']?.doc ?? {};
    check(
      6,
      'the document keeps its whitespace (pre-wrap) and is drawn in the UI face rather than the editor monospace',
      d.whiteSpace === 'pre-wrap' && typeof d.fontFamily === 'string' && !/mono|menlo|courier/i.test(d.fontFamily),
      `white-space ${String(d.whiteSpace)}, font ${String(d.fontFamily)}`
    );
  }

  // -- 7. the caps: drawn whole and said so ---------------------------------
  {
    const d = fixtures['capped.txt']?.doc ?? {};
    const runs = Array.isArray(d.runs) ? d.runs : [];
    const dels = runs.filter((x) => x.kind === 'del');
    const inses = runs.filter((x) => x.kind === 'ins');
    // Two blocks the caps refuse, being the rewritten paragraph and the
    // 4,100 character line, and each draws as ONE deletion and ONE insertion.
    check(
      7,
      'a block the caps refuse draws WHOLE and the note says so, with both projections still holding',
      typeof d.note === 'string' &&
        d.note.includes('2 changes drawn whole') &&
        d.note.includes('1 rewritten') &&
        d.note.includes('1 too long') &&
        dels.length === 2 &&
        inses.length === 2 &&
        dels[0]?.text.startsWith(words(15, 77)) &&
        dels[1]?.text.includes('x'.repeat(4_100)),
      `note ${JSON.stringify(d.note)}, ${String(dels.length)} deletion(s) and ${String(inses.length)} insertion(s) for two refused blocks`
    );
  }

  // -- 8. no changes: the plain document ------------------------------------
  {
    const s = r.onSame ?? {};
    const runs = Array.isArray(s.doc?.runs) ? s.doc.runs : [];
    check(
      8,
      'a file with no changes reads as the plain document, with no note and no error state',
      s.diffState === 'No changes' &&
        s.afterClick?.checked === 'Redline' &&
        runs.length === 1 &&
        runs[0]?.kind === 'same' &&
        runs[0]?.text === FIXTURES['same.txt'][1] &&
        s.doc?.note === null &&
        s.errorState === false,
      `diff said ${JSON.stringify(s.diffState)}, ${String(runs.length)} run(s), note ${JSON.stringify(s.doc?.note)}, error state ${String(s.errorState)}`
    );
  }

  // -- 9. markdown: the SOURCE ----------------------------------------------
  {
    const m = r.onMarkdown ?? {};
    const runs = Array.isArray(m.doc?.runs) ? m.doc.runs : [];
    const [oldMd, newMd] = FIXTURES['guide.md'];
    check(
      9,
      'markdown offers Redline beside Preview, Source and Split, and draws the SOURCE, never a rendered preview',
      JSON.stringify(m.opened?.options) === JSON.stringify(['Diff', 'Redline', 'Preview', 'Source', 'Split']) &&
        m.afterClick?.checked === 'Redline' &&
        m.doc?.renderedMarkdown === 0 &&
        oldOf(runs) === oldMd &&
        newOf(runs) === newMd &&
        runs.some((x) => x.kind === 'same' && x.text.includes('# Guide')),
      `options ${JSON.stringify(m.opened?.options)}, rendered ${String(m.doc?.renderedMarkdown)}, old ${String(oldOf(runs) === oldMd)}, new ${String(newOf(runs) === newMd)}`
    );
  }

  // -- 10. not prose: no Redline --------------------------------------------
  {
    const c = r.onCode ?? {};
    check(
      10,
      'a file that is not prose gets no Redline at all',
      JSON.stringify(c.options) === JSON.stringify(['Diff', 'File']) && c.redline === null && c.doc === false,
      `options ${JSON.stringify(c.options)}, redline ${JSON.stringify(c.redline)}`
    );
  }

  // -- 11 to 15. THE JOURNEY -------------------------------------------------
  const j = r.journey ?? {};
  {
    const same = JSON.stringify(j.redline?.runs) === JSON.stringify(j.redlineAgain?.runs);
    check(
      11,
      'the journey: Diff first, Redline, File with Monaco and no document, Redline again with the same runs',
      j.diffFirst?.checked === 'Diff' &&
        j.redline?.present === true &&
        j.file?.checked === 'File' &&
        j.file?.monaco === 1 &&
        j.file?.doc === false &&
        j.redlineAgain?.present === true &&
        same,
      `Diff ${String(j.diffFirst?.checked)}, File monaco ${String(j.file?.monaco)} doc ${String(j.file?.doc)}, runs the same after ${String(same)}`
    );
  }
  {
    const s = j.scrolled ?? {};
    check(
      12,
      'the document scrolls on its own scroller',
      s.scrollTop > 0 && s.scrollHeight > s.clientHeight && Array.isArray(s.runs) && oldOf(s.runs) === OLD_TEST,
      `scrollTop ${String(s.scrollTop)} of ${String(s.scrollHeight)} in ${String(s.clientHeight)}`
    );
  }
  {
    const f = j.reflow ?? {};
    check(
      13,
      'the document reflows when the panel is squeezed to its floor and comes back',
      f.narrowWidth < f.wideWidth &&
        f.narrow?.width < f.wide?.width &&
        f.narrow?.height > f.wide?.height &&
        f.back?.width === f.wide?.width,
      `panel ${String(f.wideWidth)} to ${String(f.narrowWidth)} to ${String(f.backWidth)}; document ${String(f.wide?.width)}x${String(f.wide?.height)} to ${String(f.narrow?.width)}x${String(f.narrow?.height)} and back to ${String(f.back?.width)}x${String(f.back?.height)}`
    );
  }
  {
    const s = j.second ?? {};
    check(
      14,
      'a second file opens as DIFF, with Redline offered and unchosen',
      s.checked === 'Diff' && s.redline?.checked === 'false' && s.doc === false,
      `${String(s.rel)} opened on ${String(s.checked)}, Redline ${JSON.stringify(s.redline)}`
    );
  }
  {
    const e = j.edited ?? {};
    const runs = Array.isArray(e.doc?.runs) ? e.doc.runs : [];
    const reverted = Array.isArray(e.reverted?.runs) ? e.reverted.runs : [];
    check(
      15,
      'an edit made in Source shows in the redline as an insertion, its new projection is the model text, and taking it back restores the document',
      e.modelPresent === true &&
        runs.some((x) => x.kind === 'ins' && x.text.startsWith(e.edit)) &&
        newOf(runs) === e.modelText &&
        oldOf(runs) === OLD_TEST &&
        newOf(reverted) === NEW_TEST &&
        oldOf(reverted) === OLD_TEST,
      `first run ${JSON.stringify(runs[0])}, new projection is the model ${String(newOf(runs) === e.modelText)}, reverted back to the file ${String(newOf(reverted) === NEW_TEST)}, dirty after revert ${String(e.dirtyAfterRevert)}`
    );
  }

  // -- 16. THE PARENT MEASUREMENT'S OTHER HALF -------------------------------
  {
    const d = fixtures['test.txt']?.doc ?? {};
    check(
      16,
      'one changed word on one line draws ONE row in the view, with zero Pierre rows',
      d.firstChangeRows === 1 && d.firstPairSameTop === true && d.pierre === 0,
      `the first change occupies ${String(d.firstChangeRows)} line box(es), del and ins on the same line ${String(d.firstPairSameTop)}, Pierre containers ${String(d.pierre)}`
    );
  }

  // -- 17. git diff --word-diff, a different implementation ------------------
  {
    const out = spawnSync(
      'git',
      ['diff', '--word-diff=porcelain', '--unified=0', '--', 'replacement.txt', 'twoinone.txt'],
      { cwd: project, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }
    );
    const removed = [];
    const added = [];
    for (const line of (out.stdout ?? '').split('\n')) {
      if (line.startsWith('-') && !line.startsWith('---')) removed.push(...compareWords(line.slice(1)));
      else if (line.startsWith('+') && !line.startsWith('+++')) added.push(...compareWords(line.slice(1)));
    }
    const mismatches = [];
    for (const rel of ['replacement.txt', 'twoinone.txt']) {
      const runs = fixtures[rel]?.doc?.runs ?? [];
      for (const w of runs.filter((x) => x.kind === 'del').flatMap((x) => compareWords(x.text))) {
        if (!removed.includes(w)) mismatches.push(`${rel}: git did not remove ${w}`);
      }
      for (const w of runs.filter((x) => x.kind === 'ins').flatMap((x) => compareWords(x.text))) {
        if (!added.includes(w)) mismatches.push(`${rel}: git did not add ${w}`);
      }
    }
    check(
      17,
      'git diff --word-diff agrees on which words went and which arrived',
      out.status === 0 && mismatches.length === 0 && removed.length > 0,
      mismatches.length === 0 ? `git removed ${String(removed.length)} and added ${String(added.length)} words; every drawn run is in them` : mismatches.join(' | ')
    );
  }

  // -- 18 to 20. THE CLIPBOARD, read in main off the system pasteboard ------
  const steps = Array.isArray(clipboard) ? clipboard : [];
  const stepOf = (which) => steps.find((one) => ((one ?? {}).setup ?? {}).which === which) ?? null;
  {
    const s = stepOf('doc');
    const got = (s ?? {}).text;
    check(
      18,
      'the whole document copies as the NEW file, byte for byte',
      typeof got === 'string' && got === NEW_TEST && (s?.setup?.ok === true),
      typeof got === 'string' ? (got === NEW_TEST ? `${String(Buffer.byteLength(got))} bytes, equal` : firstDiff(got, NEW_TEST)) : 'no text'
    );
  }
  {
    const s = stepOf('pair');
    const got = (s ?? {}).text;
    const setup = (s ?? {}).setup ?? {};
    const runs = Array.isArray(setup.runs) ? setup.runs : [];
    const covers = Array.isArray(setup.covers) ? setup.covers : null;
    const expected = covers === null ? null : newOf(runs.slice(covers[0], covers[1] + 1));
    const deleted = covers === null ? [] : runs.slice(covers[0], covers[1] + 1).filter((x) => x.kind === 'del').map((x) => x.text);
    check(
      19,
      'a selection from a deletion to its insertion copies the insertion and not the deletion',
      typeof got === 'string' && expected !== null && got === expected && deleted.every((w) => !got.includes(w)),
      `covered runs ${JSON.stringify(covers)} ${JSON.stringify(runs.slice(covers?.[0] ?? 0, (covers?.[1] ?? -1) + 1))}; clipboard ${JSON.stringify(got)}; wanted ${JSON.stringify(expected)}`
    );
  }
  {
    const s = stepOf('del');
    const got = (s ?? {}).text;
    const setup = (s ?? {}).setup ?? {};
    const runs = Array.isArray(setup.runs) ? setup.runs : [];
    const at = Array.isArray(setup.covers) ? setup.covers[0] : -1;
    const expected = runs[at]?.text ?? null;
    check(
      20,
      'a selection wholly inside a deletion copies the deleted words, which is what selecting them means',
      typeof got === 'string' && expected !== null && got === expected,
      `clipboard ${JSON.stringify(got)}, the deletion ${JSON.stringify(expected)}`
    );
  }
}

const clipAfter = clipboardFingerprint();
check(
  21,
  'the person’s own clipboard was put back exactly, its flavours included',
  clipAfter.md5 === clipBefore.md5 &&
    clipAfter.bytes === clipBefore.bytes &&
    clipAfter.flavours === clipBefore.flavours &&
    Array.isArray(priorFormats) &&
    (clipBefore.bytes === 0 || priorFormats.some((one) => String(one).toLowerCase().includes('text'))),
  `${String(clipBefore.bytes)} bytes md5 ${clipBefore.md5.slice(0, 8)} before, ` +
    `${String(clipAfter.bytes)} bytes md5 ${clipAfter.md5.slice(0, 8)} after; ` +
    `flavours before ${JSON.stringify(clipBefore.flavours)}, after ${JSON.stringify(clipAfter.flavours)}; ` +
    `the names the restore matched on were ${JSON.stringify(priorFormats)}`
);

const operatorAfter = operatorSessionCount();
check(
  22,
  'the operator session count did not move',
  operatorAfter === operatorBefore,
  `${String(operatorBefore)} before, ${String(operatorAfter)} after`
);

if (reading !== null && Array.isArray(reading.journeyLog)) {
  say('the journey the drive walked:');
  for (const one of reading.journeyLog) say(`   ${one}`);
}
if (projectionReport.length > 0) {
  say('the projections, per fixture:');
  for (const one of projectionReport) say(`   ${one}`);
}
for (const row of results) {
  say(`${String(row.step).padStart(2)}  ${row.verdict.padEnd(4)}  ${row.claim}  (${row.detail})`);
}
if (failures.length > 0) {
  console.error(`${TAG} ${String(failures.length)} row(s) failed:`);
  for (const f of failures) console.error(`${TAG}   ${f}`);
  process.exit(1);
}
say('every row passed.');
process.exit(0);
