/**
 * PHASE 242.2 VERIFIER'S OWN PROBE. Independent of the builder's.
 *
 * Two readings, one Electron each and never two at once, on one scratch
 * profile and the `gmux-p242-2v-<pid>` socket. It spawns no agent, spends no
 * token, opens no keychain and never reads the operator's own Tortie profile.
 *
 *  A. THE SHIPPING TEXT AND THE PARENT'S TEXT on the far side's own shell,
 *     under a scratch HOME, over SIX plant shapes each. Three of the six are
 *     shapes the builder's own test and gate never drive: a DANGLING symbolic
 *     link at the staged name, and a symbolic link at the FINAL name pointing
 *     at a directory.
 *
 *  B. THE SAME SHAPES THROUGH TORTIE, being `machines.putImage` from a
 *     renderer, writing into `$HOME/.tortie/images` on the far machine.
 *
 * BOUNDS. Every far-side path this run composes carries its own
 * `tortie-p242-2v-scratch-<pid>` prefix or is `~/.tortie`, which the census
 * reads as absent before anything is driven and which the teardown removes
 * only for that reason. No session on that machine is listed for anything but
 * counting. The scratch tmux socket is ended AND unlinked on both machines in
 * the `finally`.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  gate, assertReachable, runOnMachine, listFarSessions, countOperatorSessions,
  identityFilesLine, hostKeyFileFacts, identityFilesUnmoved, closeMaster, endRecordedPids
} from './real-machine.mjs';
import { keyscanText } from './ssh-run.mjs';
import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PID = String(process.pid);
const TAG = '[p242-2v]';
const say = (t) => process.stdout.write(`${TAG} ${t}\n`);

const FAR_SCRATCH = `/Users/gdc/tortie-p242-2v-scratch-${PID}`;
const OURS = new RegExp(`^/Users/gdc/tortie-p242-2v-scratch-${PID}$`);
function assertOurs(path) { if (!OURS.test(path)) throw new Error(`refusing to touch ${path}`); }

const runDir = join('/private/tmp', `p242-2v-run-${PID}`);
const profile = join(runDir, 'profile');
const SOCKET = `gmux-p242-2v-${PID}`;
const MACHINE_ID = 'greg-s-mac-pro';
const HOST = process.env['GMUX_REAL_MACHINE_HOST'] ?? '';
const SESSION_ID = `p2422v${PID}`;

const report = { when: new Date().toISOString(), pid: PID, farScratch: FAR_SCRATCH };
const findings = [];
const record = (k, v) => { report[k] = v; say(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v).slice(0, 1600)}`); };

const runScript = (m, script, timeoutMs = 120000) =>
  runOnMachine(m, `printf %s ${Buffer.from(script, 'utf8').toString('base64')} | base64 -d | /bin/sh`, { timeoutMs });
const far = (text) => {
  const out = {};
  for (const line of String(text).split('\n')) { const at = line.indexOf('='); if (at > 0) out[line.slice(0, at)] = line.slice(at + 1); }
  return out;
};
function shq(text) { return `'${text.split("'").join(`'\\''`)}'`; }
const shaOf = (b) => createHash('sha256').update(b).digest('hex');

const BASE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);
/** Distinct pictures, so distinct content addressed names. */
const png = (n) => Buffer.concat([BASE_PNG, Buffer.from(`\n#p242-2v-${n}\n`, 'utf8')]);
const nameOf = (b) => `${SESSION_ID}-${shaOf(b).slice(0, 16)}.png`;

/** The SHIPPING image-put text, extracted from the source by this file's own reader. */
function imagePutFrom(sourceText) {
  const start = sourceText.indexOf('const IMAGE_PUT = [');
  if (start < 0) throw new Error('no IMAGE_PUT literal');
  const open = sourceText.indexOf('[', start);
  let depth = 0, i = open, q = null, esc = false;
  for (; i < sourceText.length; i += 1) {
    const ch = sourceText[i];
    if (q !== null) { if (esc) { esc = false; continue; } if (ch === '\\') { esc = true; continue; } if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; }
    if (ch === '/' && sourceText[i + 1] === '/') { while (i < sourceText.length && sourceText[i] !== '\n') i += 1; continue; }
    if (ch === '[') depth += 1; else if (ch === ']') { depth -= 1; if (depth === 0) break; }
  }
  const arr = new Function(`return ${sourceText.slice(open, i + 1)};`)();
  if (!Array.isArray(arr) || arr.length === 0) throw new Error('IMAGE_PUT read back empty');
  return arr.join('\n');
}

/**
 * ONE PROPERTY, asked of every arm: nothing outside `~/.tortie/images`
 * changed, and no name appeared there that was not there before.
 */
export function gradeContainment({ where, arm, word, victimNow, strayNames, hisFileNow }) {
  const out = [];
  if (victimNow !== undefined && victimNow !== 'victim, untouched') {
    out.push(`${where} ${arm}: the file OUTSIDE ~/.tortie/images reads ${JSON.stringify(victimNow)} rather than "victim, untouched". The write left the directory Tortie told the person it uses, and the answer word was ${JSON.stringify(word)}.`);
  }
  if (hisFileNow !== undefined && hisFileNow !== 'HIS OWN FILE') {
    out.push(`${where} ${arm}: a file OUTSIDE ~/.tortie/images that this run planted as the person's own reads ${JSON.stringify(hisFileNow)}. It was REPLACED, and the answer word was ${JSON.stringify(word)}.`);
  }
  if (strayNames !== undefined && strayNames !== '') {
    out.push(`${where} ${arm}: names appeared outside ~/.tortie/images that were not there before: ${JSON.stringify(strayNames)}.`);
  }
  return out;
}

async function main() {
  mkdirSync(join(profile, 'gmux', 'config'), { recursive: true });
  mkdirSync(join(profile, 'gmux', 'machines'), { recursive: true });

  const machine = await gate('p242-2v');
  record('runDir', runDir);
  record('identityFilesBefore', identityFilesLine(machine.identityBefore));
  assertReachable(machine);
  record('localGmuxSessionsBefore', countOperatorSessions());
  record('farGmuxSessionsBefore', listFarSessions(machine, 'gmux').names);
  const tortieBefore = runOnMachine(machine, 'test -e ~/.tortie && echo yes || echo no').stdout.trim();
  record('farTortieBefore', tortieBefore);
  if (tortieBefore !== 'no') throw new Error('~/.tortie exists on that machine; this run refuses to touch a directory it did not make');
  record('farGitconfigBefore', runOnMachine(machine, 'wc -c < ~/.gitconfig | tr -d " "; stat -f %m ~/.gitconfig; ls -1 ~/.ssh | tr "\\n" ","; stat -f %m ~/.ssh').stdout.trim());
  record('farSocketsBefore', runOnMachine(machine, 'ls -1 /private/tmp/tmux-501 2>/dev/null | tr "\\n" ","').stdout.trim());

  assertOurs(FAR_SCRATCH);
  let up = false;
  try {
    const setup = runScript(machine, `set -e
test ! -e ${FAR_SCRATCH}
mkdir -p ${FAR_SCRATCH}/home ${FAR_SCRATCH}/repo-he-cares-about
echo "made=$(test -d ${FAR_SCRATCH} && echo yes)"
echo "uname=$(uname -sm)"
echo "shell=$(command -v sh)"
`);
    if (setup.code !== 0) throw new Error(`setup failed: ${setup.stdout}${setup.stderr}`);
    up = true;
    record('farSetup', far(setup.stdout));

    // ---------------- READING A. Far side's own shell, scratch HOME ---------
    const headText = imagePutFrom(readFileSync(join(repoRoot, 'src/main/machines/remote-scripts.ts'), 'utf8'));
    const parentSrc = spawnSync('/usr/bin/git', ['-C', repoRoot, 'show', '93bdaaec:src/main/machines/remote-scripts.ts'], { encoding: 'utf8' });
    if (parentSrc.status !== 0) throw new Error('could not read the parent source');
    const parentText = imagePutFrom(parentSrc.stdout);
    if (parentText === headText) throw new Error('the parent and HEAD image-put texts are identical, so reading A would prove nothing');
    record('imagePutTexts', { headBytes: headText.length, headSha: shaOf(Buffer.from(headText)).slice(0, 16), parentBytes: parentText.length, parentSha: shaOf(Buffer.from(parentText)).slice(0, 16) });

    const ARMS = [
      ['control, nothing planted', 'none'],
      ['a SYMLINK at the staged name', 'sym'],
      ['a HARD LINK at the staged name', 'hard'],
      ['a DANGLING SYMLINK at the staged name', 'dangling'],
      ['ordinary debris at the staged name', 'debris'],
      ['a SYMLINK at the FINAL name pointing at a directory', 'finaldir']
    ];
    const readingA = [];
    for (const [where, text] of [['PARENT', parentText], ['HEAD', headText]]) {
      for (const [arm, plant] of ARMS) {
        const home = `${FAR_SCRATCH}/home/${where}-${plant}`;
        const nameBytes = png(`${where}-${plant}`);
        const name = nameOf(nameBytes);
        const outside = `${home}-outside`;
        const victim = `${outside}/victim.txt`;
        const landing = `${outside}/landing`;
        const hisFile = `${landing}/${name}.part`;
        const gone = `${outside}/gone.txt`;
        const prep = `set -e
rm -rf ${home} ${outside}
mkdir -p ${home}/.tortie/images ${landing}
printf 'victim, untouched' > ${victim}
printf 'HIS OWN FILE' > ${hisFile}
${plant === 'sym' ? `ln -s ${victim} ${home}/.tortie/images/${name}.part` : ''}
${plant === 'hard' ? `ln ${victim} ${home}/.tortie/images/${name}.part` : ''}
${plant === 'dangling' ? `ln -s ${gone} ${home}/.tortie/images/${name}.part` : ''}
${plant === 'debris' ? `printf 'half an upload' > ${home}/.tortie/images/${name}.part` : ''}
${plant === 'finaldir' ? `ln -s ${landing} ${home}/.tortie/images/${name}` : ''}
`;
        const p = runScript(machine, prep);
        if (p.code !== 0) throw new Error(`arm prep failed: ${p.stdout}${p.stderr}`);
        const drive = `HOME=${home} /bin/sh -c ${shq(text)} image-put ${name} ${nameBytes.toString('base64')}`;
        const ran = runScript(machine, `${drive}\n`);
        const marker = (ran.stdout + ran.stderr).match(/__TORTIE_RUN__(.*?)__TORTIE_RUN__/);
        const word = marker === null ? '(no marker)' : ((marker[1] ?? '').trim().split(/\s+/)[0] ?? '');
        const read = far(runScript(machine, `set -e
echo "victimNow=$(cat ${victim} 2>/dev/null | head -c 40)"
echo "hisFileNow=$(cat ${hisFile} 2>/dev/null | head -c 40)"
echo "strayNames=$(cd ${outside} && find . \\( -type f -o -type l \\) | grep -v -e '^\\./victim.txt$' -e '^\\./landing/${name}.part$' | tr '\\n' ',')"
echo "landedIsLink=$(test -L ${home}/.tortie/images/${name} && echo yes || echo no)"
echo "landedSha=$(shasum -a 256 ${home}/.tortie/images/${name} 2>/dev/null | cut -d' ' -f1 || echo GONE)"
`).stdout);
        const graded = gradeContainment({ where, arm, word, victimNow: read.victimNow, strayNames: read.strayNames, hisFileNow: read.hisFileNow });
        const row = { where, arm, word, victimNow: read.victimNow, hisFileNow: read.hisFileNow, strayNames: read.strayNames, landedIsLink: read.landedIsLink, landedIsThePicture: read.landedSha === shaOf(nameBytes), findings: graded.length };
        readingA.push(row);
        if (where === 'HEAD') findings.push(...graded);
        say(`  A ${where} ${arm} -> ${word} contained=${graded.length === 0 ? 'yes' : 'NO'}`);
      }
    }
    record('readingA', readingA);
    record('readingAVerdict', {
      parentEscapes: readingA.filter((r) => r.where === 'PARENT' && r.findings > 0).map((r) => r.arm),
      headEscapes: readingA.filter((r) => r.where === 'HEAD' && r.findings > 0).map((r) => r.arm)
    });

    // ---------------- READING B. Through Tortie -----------------------------
    writeFileSync(join(profile, 'gmux', 'config', 'machines.json'),
      `${JSON.stringify({ schema: 1, machines: [{ id: MACHINE_ID, label: 'Mac Pro', color: 'orange', host: HOST, remoteTmuxPath: '/usr/local/bin/tmux' }] }, null, 2)}\n`, 'utf8');
    writeFileSync(join(profile, 'gmux', 'machines', 'known-machines'),
      keyscanText({ host: HOST, port: 22, caller: 'build/probe-p242-2v-verify.mjs' }), 'utf8');

    const B_ARMS = [
      ['a SYMLINK at the staged name', 'sym'],
      ['a DANGLING SYMLINK at the staged name', 'dangling'],
      ['ordinary debris at the staged name', 'debris'],
      ['a SYMLINK at the FINAL name pointing at a directory', 'finaldir']
    ];
    const locals = [];
    const plants = [];
    for (const [, plant] of B_ARMS) {
      const bytes = png(`B-${plant}`);
      const name = nameOf(bytes);
      const local = join(runDir, `${plant}.png`);
      writeFileSync(local, bytes);
      const outside = `${FAR_SCRATCH}/repo-he-cares-about/${plant}`;
      locals.push({ plant, local, name, bytes, outside });
      plants.push(`mkdir -p ${outside}/landing`);
      plants.push(`printf 'victim, untouched' > ${outside}/victim.txt`);
      plants.push(`printf 'HIS OWN FILE' > ${outside}/landing/${name}.part`);
      if (plant === 'sym') plants.push(`ln -s ${outside}/victim.txt ~/.tortie/images/${name}.part`);
      if (plant === 'dangling') plants.push(`ln -s ${outside}/gone.txt ~/.tortie/images/${name}.part`);
      if (plant === 'debris') plants.push(`printf 'half an upload' > ~/.tortie/images/${name}.part`);
      if (plant === 'finaldir') plants.push(`ln -s ${outside}/landing ~/.tortie/images/${name}`);
    }
    const plant = runScript(machine, `set -e\nmkdir -p ~/.tortie/images\nchmod 700 ~/.tortie ~/.tortie/images\n${plants.join('\n')}\necho "planted=$(ls -1A ~/.tortie/images | wc -l | tr -d ' ')"\n`);
    if (plant.code !== 0) throw new Error(`plant failed: ${plant.stdout}${plant.stderr}`);
    record('farPlant', far(plant.stdout));

    const confirm = await launch({
      label: 'B1-confirm', settings: true, timeoutMs: 300000,
      js: `(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        const rail = Array.from(document.querySelectorAll('button, [role="tab"], li, a')).find((n) => (n.textContent || '').trim() === 'Machines');
        if (rail) { rail.click(); await wait(900); }
        for (const t of Array.from(document.querySelectorAll('[data-machines-action="toggle-lines"]'))) {
          if (t.getAttribute('aria-expanded') !== 'true') { t.click(); await wait(500); }
        }
        await wait(800);
        const confirms = Array.from(document.querySelectorAll('[data-machines-action="confirm"]'));
        r.confirmButtons = confirms.length;
        for (const c of confirms) { c.click(); await wait(1800); }
        r.rows = JSON.stringify(await window.gmux.machines.rows()).slice(0, 400);
        return r;
      })()`
    });
    record('B_confirm', { code: confirm.code, parsed: confirm.parsed });

    const calls = locals.map((one) => `out[${JSON.stringify(one.plant)}] = JSON.stringify(await window.gmux.machines.putImage({ machineId: ${JSON.stringify(MACHINE_ID)}, sessionId: ${JSON.stringify(SESSION_ID)}, paths: [${JSON.stringify(one.local)}] }));`).join('\n          ');
    const put = await launch({
      label: 'B2-putImage', timeoutMs: 600000,
      js: `(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const out = {};
        try {
          out.prepare = JSON.stringify(await window.gmux.machines.prepare(${JSON.stringify(MACHINE_ID)})).slice(0, 300);
          await wait(1500);
          ${calls}
        } catch (e) { out.threw = String(e && e.message ? e.message : e); }
        return out;
      })()`
    });
    record('B_put', { code: put.code, parsed: put.parsed });

    const readingB = [];
    for (const one of locals) {
      const read = far(runScript(machine, `set -e
echo "victimNow=$(cat ${one.outside}/victim.txt 2>/dev/null | head -c 40)"
echo "hisFileNow=$(cat ${one.outside}/landing/${one.name}.part 2>/dev/null | head -c 40)"
echo "strayNames=$(cd ${one.outside} && find . \\( -type f -o -type l \\) | grep -v -e '^\\./victim.txt$' -e '^\\./landing/${one.name}.part$' | tr '\\n' ',')"
echo "landedIsLink=$(test -L ~/.tortie/images/${one.name} && echo yes || echo no)"
echo "landedSha=$(shasum -a 256 ~/.tortie/images/${one.name} 2>/dev/null | cut -d' ' -f1 || echo GONE)"
`).stdout);
      let outcome = '(unreadable)';
      let remotePath = '(none)';
      let refusal = '(none)';
      try {
        const rows = JSON.parse(String((put.parsed ?? {})[one.plant] ?? '[]'));
        const row = Array.isArray(rows) ? (rows[0] ?? {}) : {};
        outcome = String(row.outcome ?? '(no outcome)');
        remotePath = String(row.remotePath ?? '(null)');
        refusal = String(row.refusal ?? '(null)');
      } catch { /* left unreadable */ }
      const armLabel = (B_ARMS.find(([, p]) => p === one.plant) ?? ['?'])[0];
      const graded = gradeContainment({ where: 'B, through machines.putImage,', arm: armLabel, word: outcome, victimNow: read.victimNow, strayNames: read.strayNames, hisFileNow: read.hisFileNow });
      findings.push(...graded);
      readingB.push({ arm: armLabel, outcome, remotePath, refusal, victimNow: read.victimNow, hisFileNow: read.hisFileNow, strayNames: read.strayNames, landedIsLink: read.landedIsLink, landedIsThePicture: read.landedSha === shaOf(one.bytes), findings: graded.length });
      say(`  B ${armLabel} -> ${outcome} contained=${graded.length === 0 ? 'yes' : 'NO'}`);
    }
    record('readingB', readingB);
    record('farImagesAfter', runScript(machine, 'ls -1A ~/.tortie/images | tr "\\n" ","').stdout.trim());
  } finally {
    if (up) {
      const down = runScript(machine, `rm -rf ${FAR_SCRATCH}
rm -rf ~/.tortie
test -e ${FAR_SCRATCH} && echo SCRATCH-STILL-THERE || echo SCRATCH-GONE
test -e ~/.tortie && echo TORTIE-STILL-THERE || echo TORTIE-GONE
`, 60000);
      record('teardown', down.stdout.trim());
    }
    record('farSocketTeardown', endFarScratchSocket(machine));
    record('localGmuxSessionsAfter', countOperatorSessions());
    record('farGmuxSessionsAfter', listFarSessions(machine, 'gmux').names);
    record('farSocketsAfter', runOnMachine(machine, 'ls -1 /private/tmp/tmux-501 2>/dev/null | tr "\\n" ","').stdout.trim());
    record('farGitconfigAfter', runOnMachine(machine, 'wc -c < ~/.gitconfig | tr -d " "; stat -f %m ~/.gitconfig; ls -1 ~/.ssh | tr "\\n" ","; stat -f %m ~/.ssh').stdout.trim());
    record('farScratchLeft', runOnMachine(machine, 'ls -d ~/tortie-p242-2v-* 2>/dev/null | tr "\\n" "," || true').stdout.trim());
    record('findings', findings);
    record('identityFilesUnmoved', identityFilesUnmoved(machine.identityBefore, hostKeyFileFacts()));
    closeMaster(machine);
    endRecordedPids(machine);
    writeFileSync(join(runDir, `p242-2v-${PID}.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    say(`written to ${join(runDir, `p242-2v-${PID}.json`)}`);
  }
}

function endFarScratchSocket(machine) {
  if (!/^gmux-p242-2v-\d+$/.test(SOCKET)) return `refused ${SOCKET}`;
  const path = `/private/tmp/tmux-501/${SOCKET}`;
  const done = runOnMachine(machine,
    `if [ -S ${path} ]; then /usr/local/bin/tmux -L ${SOCKET} kill-server 2>/dev/null || true; ` +
      `h=$(lsof -t ${path} 2>/dev/null | tr '\\n' ' '); ` +
      `if [ -z "$h" ]; then rm -f ${path}; echo UNLINKED; else echo "HELD-BY $h"; fi; else echo ABSENT; fi`,
    { timeoutMs: 60000 });
  return done.stdout.trim() || done.stderr.trim();
}

function launch({ label, js, settings, timeoutMs = 600000, delayMs = 4000 }) {
  const env = { ...process.env, GMUX_SHOT: join(runDir, `${label}.png`), GMUX_SHOT_DELAY_MS: String(delayMs), GMUX_TMUX_SOCKET: SOCKET };
  if (settings) { env['GMUX_SHOT_SETTINGS'] = '1'; env['GMUX_SHOT_SETTINGS_JS'] = js; } else { env['GMUX_SHOT_JS'] = js; }
  return withElectron({ label: `p242-2v-${label}`, userDataDir: profile, cwd: repoRoot, env }, (handle) =>
    new Promise((done) => {
      const child = handle.child;
      let out = '';
      const take = (c) => { out += String(c); };
      child.stdout.on('data', take);
      child.stderr.on('data', take);
      const timer = setTimeout(() => { try { process.kill(child.pid, 'SIGKILL'); } catch { /* gone */ } }, timeoutMs);
      child.on('exit', (code) => {
        clearTimeout(timer);
        const marker = settings ? '[gmux-shot] driver' : '[gmux-shot] probe ';
        const at = out.lastIndexOf(marker);
        let parsed = null;
        if (at !== -1) {
          const line = out.slice(at + marker.length).split('\n')[0] ?? '';
          try { parsed = JSON.parse(line.replace(/^\s*[^{["']*/, '').trim()); } catch { parsed = null; }
        }
        if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch { /* plain */ } }
        writeFileSync(join(runDir, `${label}.log`), out, 'utf8');
        done({ code, out, parsed });
      });
    }));
}

if (process.argv.includes('--self-test')) {
  const cases = [
    ['contained', { where: 'X', arm: 'y', word: 'added', victimNow: 'victim, untouched', hisFileNow: 'HIS OWN FILE', strayNames: '' }, 0],
    ['the victim took the payload', { where: 'X', arm: 'y', word: 'added', victimNow: 'PNG', hisFileNow: 'HIS OWN FILE', strayNames: '' }, 1],
    ['his own file replaced', { where: 'X', arm: 'y', word: 'added', victimNow: 'victim, untouched', hisFileNow: 'PNG', strayNames: '' }, 1],
    ['a name appeared outside', { where: 'X', arm: 'y', word: 'added', victimNow: 'victim, untouched', hisFileNow: 'HIS OWN FILE', strayNames: './gone.txt,' }, 1],
    ['all three at once', { where: 'X', arm: 'y', word: 'added', victimNow: 'x', hisFileNow: 'y', strayNames: 'z' }, 3],
    ['nothing asked is nothing found', { where: 'X', arm: 'y', word: 'added' }, 0]
  ];
  let bad = 0;
  for (const [why, input, wanted] of cases) {
    const got = gradeContainment(input).length;
    if (got !== wanted) { bad += 1; say(`SELF-TEST FAILED: ${why} graded ${got}, wanted ${wanted}`); }
    else say(`self-test ok: ${why} -> ${got}`);
  }
  say(bad === 0 ? `SELF-TEST PASS, ${cases.length} fixtures` : `SELF-TEST FAIL, ${bad}`);
  process.exit(bad === 0 ? 0 : 1);
}

mkdirSync(runDir, { recursive: true });
try {
  await main();
} finally {
  if (/^gmux-p242-2v-\d+$/.test(SOCKET)) {
    const path = join('/private/tmp/tmux-501', SOCKET);
    const left = spawnSync('/bin/ls', ['-1', '/private/tmp/tmux-501'], { encoding: 'utf8' }).stdout ?? '';
    if (left.includes(SOCKET)) {
      spawnSync(join(repoRoot, 'build', 'vendor', 'tmux', 'bin', 'tmux'), ['-L', SOCKET, 'kill-server'], { encoding: 'utf8' });
      const held = spawnSync('/usr/sbin/lsof', ['-t', path], { encoding: 'utf8' }).stdout.trim();
      if (held === '') { rmSync(path, { force: true }); say(`ended and unlinked the scratch socket ${SOCKET}`); }
      else say(`LEFT the scratch socket ${SOCKET}, held by ${held}`);
    } else say(`the scratch socket ${SOCKET} was not there`);
  }
  if (findings.length > 0) {
    say(`FINDINGS, ${findings.length}:`);
    for (const one of findings) say(`  - ${one}`);
    process.exitCode = 1;
  } else {
    say('findings: none at HEAD. Every file outside ~/.tortie/images still reads what it read before.');
  }
}
