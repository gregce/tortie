/**
 * `npm run conformance:arch:modules`. The cheap gate on the computed level 2
 * view and the two caps it falls back through (Phase 64, research 49 section 7).
 *
 * WHAT IT IS FOR. A cap nobody has crossed is a comment. Phase 64 claims that a
 * part of more than thirty files stops drawing boxes and starts drawing a
 * dependency matrix, and that a part with more than two hundred participating
 * files stops drawing a matrix and starts listing its top importers and
 * importees. Both of those claims are one comparison each, both of them are
 * invisible on any repository small enough to open quickly, and the committed
 * fixture the Phase 63 gate uses holds twelve tracked files, which cannot reach
 * the first cap let alone the second. So this gate drives a second fixture that
 * crosses both, and drives synthetic parts sitting exactly on each boundary.
 *
 * IT SPAWNS NOTHING. No git, no ripgrep, no agent, no tmux server, no Electron,
 * no request, and it reads nothing under the person's home. The reader's pure
 * core takes plain arrays, so a part of six hundred and forty files costs a few
 * milliseconds and no process at all.
 *
 * WHAT IT FAILS ON.
 *
 *  1. A part reaches a different grade than the fixture says it should.
 *  2. A cap stops biting. Thirty files must draw boxes and thirty one must not;
 *     two hundred participants must draw a matrix and two hundred and one must
 *     not.
 *  3. Either fallback never fires at all over the fixture. A gate where every
 *     part is a box proves nothing about the other two drawings.
 *  4. The second cap starts counting FILES rather than PARTICIPANTS. A part of
 *     four hundred files where only ninety talk to each other is a matrix, and
 *     a round that simplified the rule to a file count would silently take that
 *     part to the weakest drawing.
 *  5. A box grows a number. The keys of a drawn box are pinned here in full,
 *     because "no count badge on any node" is a refusal a later round can undo
 *     in one line, and research 49 section 6.3 is where it comes from.
 *  6. `toPath` becomes a resolver test again. Four resolutions are planted in
 *     one file and only `unresolved` and `unverifiable` may raise the count.
 *     `../src/main/arch/checkers/facts.ts` records what reading `toPath` cost
 *     the first time: the strip said 2,363 of 8,447 imports were unresolved
 *     when the true number was none of them.
 *  7. The divergence overlay decorates a promise that did not break. A verdict
 *     that merely cannot be checked marks nothing, and neither does one that
 *     holds.
 *  8. The answer stops being deterministic. Every part is computed twice and
 *     byte compared, and the reader is run again over reversed inputs.
 *  9. A colour literal appears in the level 2 stylesheet, or amber does, or the
 *     view grows a canvas or a third party drawing package.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tsxCli } from './ts-runner.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const rows = [];
const fail = (message) => failures.push(message);

// ---------------------------------------------------------------------------
// The probe run
// ---------------------------------------------------------------------------

const probe = spawnSync(
  process.execPath,
  [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/arch-modules-probe.mts'],
  { encoding: 'utf8', cwd: root, maxBuffer: 64 * 1024 * 1024 }
);

if (probe.status !== 0) {
  process.stderr.write(probe.stderr || 'the probe did not run\n');
  process.exit(1);
}

let data;
try {
  data = JSON.parse(probe.stdout);
} catch {
  process.stderr.write(
    `the probe did not print JSON:\n${probe.stdout.slice(0, 4000)}\n`
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1 and 3. The per part grade matrix, and both fallbacks firing
// ---------------------------------------------------------------------------

for (const part of data.parts) {
  if (part.grade !== part.expected) {
    fail(`part "${part.id}" drew ${part.grade} and the fixture says ${part.expected}`);
  }
  if (!part.repeat) {
    fail(`part "${part.id}" answered different bytes on a second run`);
  }
  rows.push(
    `  ${part.id.padEnd(8)} ${part.grade.padEnd(7)} ` +
      `${String(part.files).padStart(4)} files  ` +
      `${String(part.participants).padStart(4)} talk  ` +
      `${String(part.edges).padStart(4)} edges  ` +
      `${String(part.boxes).padStart(3)} boxes  ` +
      `${String(part.matrixRows).padStart(3)}x${String(part.matrixCells).padStart(4)} matrix  ` +
      `${String(part.importers)}/${String(part.importees)} ranked  ` +
      `${String(part.unresolved)}/${String(part.totalImports)} unresolved`
  );
}

const grades = new Set(data.parts.map((p) => p.grade));
for (const needed of ['boxes', 'matrix', 'top']) {
  if (!grades.has(needed)) {
    fail(`no part in the fixture reaches the ${needed} grade, so that drawing is untested`);
  }
}

// ---------------------------------------------------------------------------
// 2 and 4. The caps, on their own boundaries
// ---------------------------------------------------------------------------

const b = data.boundaries;
if (b.boxCap !== 30) fail(`the box cap is ${String(b.boxCap)} and research 49 section 7 says 30`);
if (b.matrixCap !== 200) {
  fail(`the matrix cap is ${String(b.matrixCap)} and research 49 fix 11 says near 200`);
}
if (b.atBoxCap !== 'boxes') fail(`${String(b.boxCap)} files did not draw boxes`);
if (b.pastBoxCap !== 'matrix') {
  fail(`${String(b.boxCap + 1)} files did not fall back to the matrix`);
}
if (b.atMatrixCap !== 'matrix') {
  fail(`${String(b.matrixCap)} participants did not draw the matrix`);
}
if (b.pastMatrixCap !== 'top') {
  fail(`${String(b.matrixCap + 1)} participants did not fall back to the two lists`);
}
if (b.quietLargePart !== 'matrix') {
  fail(
    'a part of 400 files where only 90 take part did not draw a matrix, so the ' +
      'second cap has started counting files rather than participants'
  );
}
if (b.gradeFn.boxes !== 'boxes' || b.gradeFn.matrix !== 'matrix' || b.gradeFn.top !== 'top') {
  fail('archModuleGrade disagrees with the grade the reader reached');
}

// ---------------------------------------------------------------------------
// 4.5 The caps fire SCOPED (Phase 161)
// ---------------------------------------------------------------------------
// The drilled module reaches the same core through a synthesized component
// whose one anchor is the directory. The caps are the same two comparisons,
// so they must bite at the same boundaries, the two doors must answer the
// same bytes over the same file set, and a directory naming nothing at HEAD
// must answer known false so the drill pops rather than drawing an empty
// scope as truth.

const d = data.dirScoped;
if (d.atBoxCap !== 'boxes' || d.pastBoxCap !== 'matrix') {
  fail(
    `the box cap does not bite dir scoped: ${String(b.boxCap)} files drew ` +
      `${d.atBoxCap} and ${String(b.boxCap + 1)} drew ${d.pastBoxCap}`
  );
}
if (d.atMatrixCap !== 'matrix' || d.pastMatrixCap !== 'top') {
  fail(
    `the matrix cap does not bite dir scoped: ${String(b.matrixCap)} ` +
      `participants drew ${d.atMatrixCap} and ${String(b.matrixCap + 1)} ` +
      `drew ${d.pastMatrixCap}`
  );
}
if (d.equivalence !== true) {
  fail(
    'the dir scoped door and the authored part door answered different ' +
      'bytes over the same file set, and there is supposed to be ONE core'
  );
}
if (d.goneKnown !== false || d.goneDir !== 'no/such/dir') {
  fail(
    'a directory naming zero tracked files answered known, and the drill ' +
      'must pop instead of drawing an empty scope'
  );
}

// ---------------------------------------------------------------------------
// 4.5 The Swift target grain travels with the answer (Phase 180)
// ---------------------------------------------------------------------------
// Swift resolves at TARGET grain, so a Swift part draws files with no arrows
// BY THE LANGUAGE'S OWN NATURE and the view owes one quiet line saying why.
// The line draws from `swiftFiles`; a part of four Swift files that reports
// zero has lost the count and the drawing reads as "these files import
// nothing", the false reading the whole view is built against. And the part
// must have LEFT `unparsed`, because its imports are read now.

const swiftPart = data.parts.find((p) => p.id === 'swift');
if (swiftPart === undefined) {
  fail('the fixture lost its swift part, and the target grain has no witness');
} else {
  if (swiftPart.swiftFiles !== swiftPart.files) {
    fail(
      `the swift part holds ${String(swiftPart.files)} files and reports ` +
        `${String(swiftPart.swiftFiles)} of them as Swift; the quiet line ` +
        `draws from that count and it must survive the trip`
    );
  }
  if (swiftPart.unparsed.length !== 0) {
    fail(
      `the swift part still sits in unparsed (${JSON.stringify(swiftPart.unparsed)}) ` +
        `after Phase 180 shipped its arm; captured-and-resolved must not ` +
        `read as not-read-at-all`
    );
  }
}
const tsPart = data.parts.find((p) => p.id === 'small');
if (tsPart !== undefined && tsPart.swiftFiles !== 0) {
  fail('a part with no Swift in it reports Swift files, and the quiet line would lie');
}

// ---------------------------------------------------------------------------
// 5. No count on a node
// ---------------------------------------------------------------------------

const BOX_KEYS = ['broke', 'language', 'path'];
for (const part of data.parts) {
  if (part.boxKeys.length === 0) continue;
  if (part.boxKeys.join(',') !== BOX_KEYS.join(',')) {
    fail(
      `a drawn box carries ${part.boxKeys.join(', ')} and the pinned set is ` +
        `${BOX_KEYS.join(', ')}. A number on a node is the dashboard research 49 refuses.`
    );
  }
}

// ---------------------------------------------------------------------------
// 6. `resolution` is the field, never `toPath`
// ---------------------------------------------------------------------------

const r = data.resolutionProbe;
if (r.total !== 4) fail(`the resolution probe counted ${String(r.total)} imports and planted 4`);
if (r.unresolved !== 2) {
  fail(
    `the resolution probe called ${String(r.unresolved)} imports unresolved and exactly 2 are. ` +
      'An `external` answer is DEFINITE and a null toPath is not a failure.'
  );
}
if (r.edges !== 1) fail(`the resolution probe drew ${String(r.edges)} interior edges and 1 is right`);

// ---------------------------------------------------------------------------
// 7. The overlay marks only a promise that broke or is missing
// ---------------------------------------------------------------------------

const o = data.overlayProbe;
if ((o['src/p/a.ts'] ?? []).join(',') !== 'edge:broke') {
  fail(
    `the overlay marked src/p/a.ts with ${(o['src/p/a.ts'] ?? []).join(', ') || 'nothing'} ` +
      'and only the divergent verdict may mark it'
  );
}
if ((o['src/p/b.ts'] ?? []).length !== 0) {
  fail(
    'the overlay marked a file named only by a verdict that cannot be checked. ' +
      'A grey verdict wearing a red file is the false claim this view refuses.'
  );
}

// ---------------------------------------------------------------------------
// 9. The stylesheet and the component, read as text
// ---------------------------------------------------------------------------

const css = readFileSync(
  join(root, 'src', 'renderer', 'arch', 'arch-modules.css'),
  'utf8'
);
const tsx = readFileSync(
  join(root, 'src', 'renderer', 'arch', 'ArchModules.tsx'),
  'utf8'
);

// Comments carry prose about colour, so only declarations are read.
const declarations = css
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((line) => line.includes(':'));
for (const line of declarations) {
  if (/#[0-9a-fA-F]{3,8}\b/.test(line) || /\b(rgba?|hsla?)\(/.test(line)) {
    fail(`a colour literal is in arch-modules.css: ${line.trim()}`);
  }
  if (/\bamber\b|--warning\b/.test(line)) {
    fail(`amber is in arch-modules.css: ${line.trim()}. That hue belongs to "an agent needs you".`);
  }
}
for (const banned of ['<canvas', 'getContext(', 'd3', 'cytoscape', 'elkjs', 'mermaid']) {
  if (tsx.includes(banned)) {
    fail(`ArchModules.tsx names "${banned}". This phase draws no picture and adds no package.`);
  }
}

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

process.stdout.write('the level 2 grade matrix, over build/fixtures/arch-large/\n');
process.stdout.write(`${rows.join('\n')}\n`);
process.stdout.write(
  `  caps: ${String(b.boxCap)} boxes, ${String(b.matrixCap)} matrix rows, ` +
    `${String(b.topCap)} rows per list\n`
);

if (failures.length > 0) {
  process.stderr.write(`\nconformance:arch:modules FAILED\n`);
  for (const message of failures) process.stderr.write(`  - ${message}\n`);
  process.exit(1);
}

process.stdout.write(
  'conformance:arch:modules OK: both fallbacks fire, both caps bite scoped ' +
    'and unscoped, no count on a node, no spawn\n'
);
