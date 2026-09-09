/**
 * Phase 242.2. THE PICTURE PUT ON A MACHINE, DRIVEN AGAINST THE REAL ONE.
 *
 * `npm run probe:p2422`. About four minutes after the build, TWO Electrons one
 * after the other and never at once, on one scratch profile and the
 * `gmux-p242-2-<pid>` socket. It spawns no agent, spends no token, opens no
 * keychain and never reads the operator's own Tortie profile.
 *
 * ## What it measures, and why the second half is the one that counts
 *
 *  A. THE SHIPPING `image-put` TEXT ON THE REAL FAR SIDE, driven over the real
 *     link with `HOME` pointed at this run's own scratch directory, so the far
 *     side's own `sh`, `base64`, `shasum` and `mv` decide the answer and not
 *     this Mac's. Nothing near his own home is touched by this half at all.
 *
 *  B. THE SAME THING THROUGH TORTIE, being `machines.putImage` from a renderer
 *     in an Electron on a scratch profile whose `machines.json` names his Mac
 *     Pro and whose confirmation this run gives itself. That half writes into
 *     `$HOME/.tortie/images` on his machine, because the script composes that
 *     path from his own shell's `HOME` and nothing can redirect it. The census
 *     taken by research 105 says `~/.tortie` DID NOT EXIST on that machine
 *     before Phase 242.2 ran, so the whole directory is this run's and the
 *     teardown removes exactly it.
 *
 * ## The reading it exists to move
 *
 * At the parent commit, with a SYMLINK and again with a HARD LINK planted at
 * the staged name `<name>.part`, both halves answered `added` — B answering
 * `{"outcome":"added","refusal":null}` with `remotePath` naming a file inside
 * `~/.tortie/images` — while the victim OUTSIDE that directory held the
 * picture's own bytes, the symlink arm leaving the person's own landed name as
 * a LINK rather than a picture and the hard link arm leaving the landed name
 * and the victim as one inode under two names (research 105 sections 4 and 5).
 * At HEAD every victim reads `victim, untouched`, both pictures are in
 * `~/.tortie/images` as pictures, and the answer word is still `added`.
 *
 * EVERY ARM IS GRADED HERE rather than printed for a person to read, and the
 * three halves of each arm are graded TOGETHER, because any one of them alone
 * passes for the wrong reason: an answer word with no far-side reading behind
 * it, a victim that was never written to because the plant failed, and a
 * picture that landed while the victim took a copy of it as well.
 *
 * `--self-test` grades fixtures and launches nothing, contacts nothing and
 * reads no environment variable.
 *
 * ## The bounds, enforced rather than documented
 *
 * Every far-side path carries this run's own `tortie-p242-2-scratch-<pid>`
 * prefix or is `~/.tortie`. `assertOurs` refuses anything else before a byte of
 * shell is composed, and the teardown asks again. No session on that machine is
 * listed for anything but counting, none is killed and none is typed into. His
 * `~/.gitconfig`, `~/.ssh` and his own Tortie profile are never opened for
 * writing. No token is spent.
 *
 * `machines.prepare` STARTS A TMUX SERVER ON THE FAR SIDE under
 * `GMUX_TMUX_SOCKET`, so the `finally` ends and UNLINKS that scratch socket on
 * BOTH machines, by its exact `gmux-p242-2-<pid>` name and never by any other,
 * and never one a process still holds. `tmux kill-server` does not unlink, and
 * Phase 224 left ten dead sockets on his machine because nothing did.
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
import { tsxCli } from './ts-runner.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PID = String(process.pid);
const TAG = '[p242-2]';
const say = (t) => process.stdout.write(`${TAG} ${t}\n`);

const FAR_SCRATCH = `/Users/gdc/tortie-p242-2-scratch-${PID}`;
const OURS = new RegExp(`^/Users/gdc/tortie-p242-2-scratch-${PID}$`);
function assertOurs(path) {
  if (!OURS.test(path)) throw new Error(`refusing to touch ${path}`);
}

const runDir = join('/private/tmp', `p242-2-run-${PID}`);
const profile = join(runDir, 'profile');
const SOCKET = `gmux-p242-2-${PID}`;
const MACHINE_ID = 'greg-s-mac-pro';
const MACHINE_LABEL = 'Greg’s Mac Pro';
const HOST = process.env['GMUX_REAL_MACHINE_HOST'] ?? '';
const SESSION_ID = `p2422probe${PID}`;

const report = { when: new Date().toISOString(), pid: PID, farScratch: FAR_SCRATCH };
const findings = [];
const record = (k, v) => { report[k] = v; say(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v).slice(0, 900)}`); };

const runScript = (m, script, timeoutMs = 120000) =>
  runOnMachine(m, `printf %s ${Buffer.from(script, 'utf8').toString('base64')} | base64 -d | /bin/sh`, { timeoutMs });

const far = (text) => {
  const out = {};
  for (const line of String(text).split('\n')) {
    const at = line.indexOf('=');
    if (at > 0) out[line.slice(0, at)] = line.slice(at + 1);
  }
  return out;
};

// --- The two pictures. Real PNGs, different bytes, so two names. ------------
const PNG_SYM = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const PNG_HARD = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mNk+M+ADzCOKqBQAQCLcQP9NrQaXAAAAABJRU5ErkJggg==', 'base64');
const shaOf = (b) => createHash('sha256').update(b).digest('hex');
const nameOf = (b) => `${SESSION_ID}-${shaOf(b).slice(0, 16)}.png`;

/**
 * Grade one arm. THE THREE HALVES ARE GRADED TOGETHER on purpose, because any
 * one of them alone passes for the wrong reason: an answer word with no
 * far-side reading behind it, a victim that was never written to because the
 * plant failed, and a picture that landed while the victim took a copy of it as
 * well.
 *
 * `arm` is what was driven, `answer` is the word the script printed, `payload`
 * is the sha256 of the bytes that were sent, and the three far-side readings
 * are what an `ssh` Tortie did not compose read back afterwards.
 */
export function gradeArm({
  arm,
  answer,
  payloadSha,
  victimSha,
  victimNlink,
  landedIsLink,
  landedSha,
  planted
}) {
  const findings = [];
  if (answer !== 'added') {
    findings.push(
      `${arm}: the script answered ${JSON.stringify(answer)} rather than ` +
        '"added". Nothing this phase changed may make a save that used to ' +
        'succeed refuse.'
    );
  }
  if (victimSha === payloadSha) {
    findings.push(
      `${arm}: the file OUTSIDE ~/.tortie/images holds the picture's own ` +
        `bytes (sha256 ${String(payloadSha).slice(0, 8)}…). The write followed ` +
        'a name somebody planted at the staged path and left the directory ' +
        'Tortie told the person it uses.'
    );
  }
  if (landedIsLink === 'yes') {
    findings.push(
      `${arm}: ~/.tortie/images/<name> is a symbolic link rather than a ` +
        'picture, so the path handed back to the prompt reads a file outside ' +
        'that directory for ever.'
    );
  }
  if (landedSha !== payloadSha) {
    findings.push(
      `${arm}: the picture did not land. ~/.tortie/images/<name> reads ` +
        `${JSON.stringify(String(landedSha).slice(0, 8))} and the payload is ` +
        `${JSON.stringify(String(payloadSha).slice(0, 8))}.`
    );
  }
  if (planted === 'hard' && String(victimNlink) !== '1') {
    findings.push(
      `${arm}: the file outside still carries ${String(victimNlink)} names, ` +
        'so it and the landed picture are one inode under two names and a ' +
        'later write to either is a write to both.'
    );
  }
  return findings;
}

async function main() {
  mkdirSync(join(profile, 'gmux', 'config'), { recursive: true });
  mkdirSync(join(profile, 'gmux', 'machines'), { recursive: true });
  const localSym = join(runDir, 'sym.png');
  const localHard = join(runDir, 'hard.png');
  writeFileSync(localSym, PNG_SYM);
  writeFileSync(localHard, PNG_HARD);

  const machine = await gate('p242-2');
  record('runDir', runDir);
  record('identityFilesBefore', identityFilesLine(machine.identityBefore));
  assertReachable(machine);
  record('localGmuxSessionsBefore', countOperatorSessions());
  record('farGmuxSessionsBefore', listFarSessions(machine, 'gmux').names);
  const tortieBefore = runOnMachine(machine, 'test -e ~/.tortie && echo yes || echo no').stdout.trim();
  record('farTortieBefore', tortieBefore);
  record('farSocketsBefore', runOnMachine(machine, 'ls -1 /private/tmp/tmux-501 2>/dev/null | tr "\\n" ","').stdout.trim());
  record('farGitconfigBefore', runOnMachine(machine, 'wc -c < ~/.gitconfig | tr -d " "; ls -1 ~/.ssh | tr "\\n" ","').stdout.trim());

  assertOurs(FAR_SCRATCH);
  let up = false;
  try {
    // ---- the scratch directory and its victims ---------------------------
    const setup = runScript(machine, `set -e
test ! -e ${FAR_SCRATCH}
mkdir -p ${FAR_SCRATCH}/outside ${FAR_SCRATCH}/home
printf 'victim, untouched\\n' > ${FAR_SCRATCH}/outside/victim-a-sym.txt
printf 'victim, untouched\\n' > ${FAR_SCRATCH}/outside/victim-a-hard.txt
printf 'victim, untouched\\n' > ${FAR_SCRATCH}/outside/victim-b-sym.txt
printf 'victim, untouched\\n' > ${FAR_SCRATCH}/outside/victim-b-hard.txt
echo "made=$(test -d ${FAR_SCRATCH} && echo yes)"
echo "sh=$(command -v sh)"
echo "base64d=$(printf 'aGk=' | base64 -d 2>/dev/null && echo ok || echo no)"
echo "uname=$(uname -sm)"
`);
    if (setup.code !== 0) throw new Error(`setup failed: ${setup.stdout}${setup.stderr}`);
    up = true;
    record('farSetup', far(setup.stdout));

    // ---- READING A. The shipping text, on the far side, scratch HOME ------
    const IMAGE_PUT_TEXT = readShippedImagePut();
    record('imagePutBytes', IMAGE_PUT_TEXT.length);
    record('imagePutSha', shaOf(Buffer.from(IMAGE_PUT_TEXT, 'utf8')).slice(0, 16));

    const armsA = [];
    for (const [arm, plant, victim] of [
      ['control, nothing planted', 'none', 'victim-a-sym.txt'],
      ['a SYMLINK at $d/$1.part', 'sym', 'victim-a-sym.txt'],
      ['a HARD LINK at $d/$1.part', 'hard', 'victim-a-hard.txt']
    ]) {
      const name = nameOf(PNG_SYM);
      const home = `${FAR_SCRATCH}/home/${plant}`;
      const v = `${FAR_SCRATCH}/outside/${victim}`;
      const prep = `set -e
rm -rf ${home}
mkdir -p ${home}/.tortie/images
printf 'victim, untouched\\n' > ${v}
${plant === 'sym' ? `ln -s ${v} ${home}/.tortie/images/${name}.part` : ''}
${plant === 'hard' ? `ln ${v} ${home}/.tortie/images/${name}.part` : ''}
`;
      const p = runScript(machine, prep);
      if (p.code !== 0) throw new Error(`arm prep failed: ${p.stdout}${p.stderr}`);
      const drive = `HOME=${home} /bin/sh -c ${shq(IMAGE_PUT_TEXT)} image-put ${name} ${PNG_SYM.toString('base64')}`;
      const ran = runScript(machine, `${drive}\n`);
      const answer = (ran.stdout + ran.stderr).match(/__TORTIE_RUN__(.*?)__TORTIE_RUN__/);
      const read = far(runScript(machine, `set -e
echo "victimHead=$(head -c 8 ${v} | od -An -c | tr -s ' ' | tr -d '\\n')"
echo "victimIsThePng=$(shasum -a 256 ${v} | cut -d' ' -f1)"
echo "victimNlink=$(stat -f %l ${v})"
echo "landedIsLink=$(test -L ${home}/.tortie/images/${name} && echo yes || echo no)"
echo "landedSha=$(shasum -a 256 ${home}/.tortie/images/${name} 2>/dev/null | cut -d' ' -f1 || echo GONE)"
echo "partLeft=$(test -e ${home}/.tortie/images/${name}.part && echo yes || echo no)"
`).stdout);
      const word = answer === null ? '(no markers)' : ((answer[1] ?? '').trim().split(/\s+/)[0] ?? '');
      const graded = gradeArm({
        arm: `A, ${arm}`,
        answer: word,
        payloadSha: shaOf(PNG_SYM),
        victimSha: read.victimIsThePng,
        victimNlink: read.victimNlink,
        landedIsLink: read.landedIsLink,
        landedSha: read.landedSha,
        planted: plant
      });
      findings.push(...graded);
      armsA.push({
        arm,
        answer: answer === null ? '(no markers)' : (answer[1] ?? '').trim(),
        payloadSha: shaOf(PNG_SYM),
        victimTookThePayload: read.victimIsThePng === shaOf(PNG_SYM),
        victimNlink: read.victimNlink,
        landedIsLink: read.landedIsLink,
        landedIsThePng: read.landedSha === shaOf(PNG_SYM),
        partLeft: read.partLeft,
        findings: graded
      });
      say(`  A ${arm} -> ${word} victimTook=${armsA[armsA.length - 1].victimTookThePayload} findings=${graded.length}`);
    }
    record('readingA', armsA);

    // ---- READING B. Through Tortie, into his own $HOME/.tortie/images -----
    writeFileSync(join(profile, 'gmux', 'config', 'machines.json'),
      `${JSON.stringify({ schema: 1, machines: [{ id: MACHINE_ID, label: MACHINE_LABEL, color: 'orange', host: HOST, remoteTmuxPath: '/usr/local/bin/tmux' }] }, null, 2)}\n`, 'utf8');
    writeFileSync(join(profile, 'gmux', 'machines', 'known-machines'),
      keyscanText({ host: HOST, port: 22, caller: 'build/probe-p242-2-image.mjs' }), 'utf8');

    const nSym = nameOf(PNG_SYM);
    const nHard = nameOf(PNG_HARD);
    const vSym = `${FAR_SCRATCH}/outside/victim-b-sym.txt`;
    const vHard = `${FAR_SCRATCH}/outside/victim-b-hard.txt`;
    const plant = runScript(machine, `set -e
mkdir -p ~/.tortie/images
chmod 700 ~/.tortie ~/.tortie/images
ln -s ${vSym} ~/.tortie/images/${nSym}.part
ln ${vHard} ~/.tortie/images/${nHard}.part
echo "planted=$(ls -1A ~/.tortie/images | wc -l | tr -d ' ')"
`);
    if (plant.code !== 0) throw new Error(`plant failed: ${plant.stdout}${plant.stderr}`);
    record('farPlant', far(plant.stdout));

    const a = await launch({
      label: 'A-confirm', settings: true, timeoutMs: 300000,
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
    record('B_confirm_code', a.code);
    record('B_confirm', a.parsed);

    const b = await launch({
      label: 'B-putImage', timeoutMs: 600000,
      js: `(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const out = {};
        try {
          out.prepare = JSON.stringify(await window.gmux.machines.prepare(${JSON.stringify(MACHINE_ID)})).slice(0, 300);
          await wait(1500);
          out.sym = JSON.stringify(await window.gmux.machines.putImage({ machineId: ${JSON.stringify(MACHINE_ID)}, sessionId: ${JSON.stringify(SESSION_ID)}, paths: [${JSON.stringify(localSym)}] }));
          out.hard = JSON.stringify(await window.gmux.machines.putImage({ machineId: ${JSON.stringify(MACHINE_ID)}, sessionId: ${JSON.stringify(SESSION_ID)}, paths: [${JSON.stringify(localHard)}] }));
        } catch (e) { out.threw = String(e && e.message ? e.message : e); }
        return out;
      })()`
    });
    record('B_put_code', b.code);
    record('B_put', b.parsed);

    const after = far(runScript(machine, `set -e
echo "symVictimSha=$(shasum -a 256 ${vSym} | cut -d' ' -f1)"
echo "symVictimNlink=$(stat -f %l ${vSym})"
echo "hardVictimSha=$(shasum -a 256 ${vHard} | cut -d' ' -f1)"
echo "hardVictimNlink=$(stat -f %l ${vHard})"
echo "symLandedIsLink=$(test -L ~/.tortie/images/${nSym} && echo yes || echo no)"
echo "symLandedSha=$(shasum -a 256 ~/.tortie/images/${nSym} 2>/dev/null | cut -d' ' -f1 || echo GONE)"
echo "hardLandedIsLink=$(test -L ~/.tortie/images/${nHard} && echo yes || echo no)"
echo "hardLandedSha=$(shasum -a 256 ~/.tortie/images/${nHard} 2>/dev/null | cut -d' ' -f1 || echo GONE)"
echo "imagesEntries=$(ls -1A ~/.tortie/images | tr '\\n' ',')"
`).stdout);
    record('farAfter', after);
    record('payloadShas', { sym: shaOf(PNG_SYM), hard: shaOf(PNG_HARD) });
    // The answer word Tortie itself reported, read out of the two placements
    // rather than out of the shell, because B's whole point is that the
    // PRODUCT's own channel is what is being graded.
    const placements = (() => {
      const out = {};
      for (const key of ['sym', 'hard']) {
        try {
          const rows = JSON.parse(String((b.parsed ?? {})[key] ?? '[]'));
          const row = Array.isArray(rows) ? (rows[0] ?? {}) : {};
          out[key] = String(row.outcome ?? '(no outcome)');
        } catch { out[key] = '(unreadable)'; }
      }
      return out;
    })();
    record('placementOutcomes', placements);
    findings.push(
      ...gradeArm({
        arm: 'B, a SYMLINK at the staged name, through machines.putImage',
        answer: placements.sym,
        payloadSha: shaOf(PNG_SYM),
        victimSha: after.symVictimSha,
        victimNlink: after.symVictimNlink,
        landedIsLink: after.symLandedIsLink,
        landedSha: after.symLandedSha,
        planted: 'sym'
      }),
      ...gradeArm({
        arm: 'B, a HARD LINK at the staged name, through machines.putImage',
        answer: placements.hard,
        payloadSha: shaOf(PNG_HARD),
        victimSha: after.hardVictimSha,
        victimNlink: after.hardVictimNlink,
        landedIsLink: after.hardLandedIsLink,
        landedSha: after.hardLandedSha,
        planted: 'hard'
      })
    );
    record('verdict', {
      symlinkArmEscaped: after.symVictimSha === shaOf(PNG_SYM),
      hardlinkArmEscaped: after.hardVictimSha === shaOf(PNG_HARD),
      symLandedIsALink: after.symLandedIsLink,
      hardVictimNlink: after.hardVictimNlink
    });
  } finally {
    if (up) {
      // `~/.tortie` IS REMOVED ONLY IF THIS RUN MADE IT. The census reads it
      // before anything is driven, and a directory that was already there is
      // his and is left exactly as it is — the run says so rather than
      // removing a directory it did not create.
      const down = runScript(machine, `rm -rf ${FAR_SCRATCH}
${tortieBefore === 'no' ? 'rm -rf ~/.tortie' : '# ~/.tortie was there before this run and is left alone'}
test -e ${FAR_SCRATCH} && echo SCRATCH-STILL-THERE || echo SCRATCH-GONE
test -e ~/.tortie && echo TORTIE-STILL-THERE || echo TORTIE-GONE
`, 60000);
      record('teardown', down.stdout.trim());
    }
    // THE FAR SIDE'S OWN SCRATCH SOCKET. `machines.prepare` starts a tmux
    // server there under GMUX_TMUX_SOCKET, and `kill-server` does not unlink
    // the socket file — Phase 224 left ten dead ones on his machine because
    // nothing did. Exactly this run's name, never any other, and never one a
    // process still holds.
    record('farSocketTeardown', endFarScratchSocket(machine));
    record('localGmuxSessionsAfter', countOperatorSessions());
    record('farGmuxSessionsAfter', listFarSessions(machine, 'gmux').names);
    record('farSocketsAfter', runOnMachine(machine, 'ls -1 /private/tmp/tmux-501 2>/dev/null | tr "\\n" ","').stdout.trim());
    record('findings', findings);
    record('farGitconfigAfter', runOnMachine(machine, 'wc -c < ~/.gitconfig | tr -d " "; ls -1 ~/.ssh | tr "\\n" ","').stdout.trim());
    record('identityFilesUnmoved', identityFilesUnmoved(machine.identityBefore, hostKeyFileFacts()));
    closeMaster(machine);
    endRecordedPids(machine);
    writeFileSync(join(runDir, `p242-2-${PID}.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    say(`written to ${join(runDir, `p242-2-${PID}.json`)}`);
  }
}

function shq(text) { return `'${text.split("'").join(`'\\''`)}'`; }

/**
 * End and UNLINK this run's own scratch tmux socket on the far side.
 *
 * It refuses any name that is not `gmux-p242-2-<this pid>`, asks `lsof` before
 * it unlinks, and leaves the socket in place and says so when anything still
 * holds it. The operator's own `-L gmux` server is never named.
 */
function endFarScratchSocket(machine) {
  if (!/^gmux-p242-2-\d+$/.test(SOCKET)) return `refused ${SOCKET}`;
  const path = `/private/tmp/tmux-501/${SOCKET}`;
  const done = runOnMachine(
    machine,
    `if [ -S ${path} ]; then ` +
      `/usr/local/bin/tmux -L ${SOCKET} kill-server 2>/dev/null || true; ` +
      `h=$(lsof -t ${path} 2>/dev/null | tr '\\n' ' '); ` +
      `if [ -z "$h" ]; then rm -f ${path}; echo UNLINKED; else echo "HELD-BY $h"; fi; ` +
      `else echo ABSENT; fi`,
    { timeoutMs: 60000 }
  );
  return done.stdout.trim() || done.stderr.trim();
}

/**
 * The shipping IMAGE_PUT text, taken from the module through the pinned tsx.
 *
 * It runs a FILE rather than a `tsx -e` line. `-e` exits 0 having printed
 * nothing at all, because it does not wait for the module's top level import,
 * and an empty script handed to `/bin/sh` answers nothing and reads as a
 * refusal — which is how the measure step's own reading A came back empty. An
 * empty answer is refused here rather than driven.
 */
function readShippedImagePut() {
  const done = spawnSync(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', join(repoRoot, 'build', 'p242-2', 'print-image-put.mts')],
    { cwd: repoRoot, encoding: 'utf8' }
  );
  if (done.status !== 0) throw new Error(`could not read image-put: ${done.stderr}`);
  if (done.stdout.trim() === '') {
    throw new Error(
      'the image-put text read back empty. Reading A would then hand /bin/sh ' +
        'an empty script and grade its silence as a refusal, which says ' +
        'nothing about the script this phase changed.'
    );
  }
  return done.stdout;
}

function launch({ label, js, settings, timeoutMs = 600000, delayMs = 4000 }) {
  const env = { ...process.env, GMUX_SHOT: join(runDir, `${label}.png`), GMUX_SHOT_DELAY_MS: String(delayMs), GMUX_TMUX_SOCKET: SOCKET };
  if (settings) { env['GMUX_SHOT_SETTINGS'] = '1'; env['GMUX_SHOT_SETTINGS_JS'] = js; } else { env['GMUX_SHOT_JS'] = js; }
  return withElectron({ label: `p242-2-${label}`, userDataDir: profile, cwd: repoRoot, env }, (handle) =>
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
          try { parsed = JSON.parse(line.replace(/^\s*→\s*/, '').trim()); } catch { parsed = null; }
        }
        if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch { /* plain */ } }
        writeFileSync(join(runDir, `${label}.log`), out, 'utf8');
        done({ code, out, parsed });
      });
    }));
}

if (process.argv.includes('--self-test')) {
  // Proves the grader on fixtures. It launches nothing, contacts nothing and
  // reads no environment variable, so a grader that cannot fail is never
  // mistaken for a run that passed.
  const P = 'aaaaaaaa11111111';
  const V = 'bbbbbbbb22222222';
  const cases = [
    ['HEAD, control', { arm: 'x', answer: 'added', payloadSha: P, victimSha: V, victimNlink: '1', landedIsLink: 'no', landedSha: P, planted: 'none' }, 0],
    ['HEAD, symlink arm', { arm: 'x', answer: 'added', payloadSha: P, victimSha: V, victimNlink: '1', landedIsLink: 'no', landedSha: P, planted: 'sym' }, 0],
    ['HEAD, hard link arm', { arm: 'x', answer: 'added', payloadSha: P, victimSha: V, victimNlink: '1', landedIsLink: 'no', landedSha: P, planted: 'hard' }, 0],
    ['the parent symlink arm, which escaped and left a link', { arm: 'x', answer: 'added', payloadSha: P, victimSha: P, victimNlink: '1', landedIsLink: 'yes', landedSha: P, planted: 'sym' }, 2],
    ['the parent hard link arm, one inode two names', { arm: 'x', answer: 'added', payloadSha: P, victimSha: P, victimNlink: '2', landedIsLink: 'no', landedSha: P, planted: 'hard' }, 2],
    ['a save that started refusing', { arm: 'x', answer: 'present', payloadSha: P, victimSha: V, victimNlink: '1', landedIsLink: 'no', landedSha: P, planted: 'none' }, 1],
    ['no answer at all', { arm: 'x', answer: '(no markers)', payloadSha: P, victimSha: V, victimNlink: '1', landedIsLink: 'no', landedSha: 'GONE', planted: 'none' }, 2],
    ['the picture did not land', { arm: 'x', answer: 'added', payloadSha: P, victimSha: V, victimNlink: '1', landedIsLink: 'no', landedSha: 'GONE', planted: 'none' }, 1]
  ];
  let bad = 0;
  for (const [why, input, wanted] of cases) {
    const got = gradeArm(input).length;
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
  // THIS MAC'S OWN SCRATCH SOCKET, ended AND unlinked. `machines.prepare`
  // starts a local tmux server under GMUX_TMUX_SOCKET as well as the far one,
  // and `build/electron-run.mjs` kills a scratch server without unlinking its
  // socket, which is where 56 dead ones came from. The name is checked before
  // anything is signalled, so the operator's own `-L gmux` server can never be
  // the one named.
  if (/^gmux-p242-2-\d+$/.test(SOCKET)) {
    const path = join('/private/tmp/tmux-501', SOCKET);
    const left = spawnSync('/bin/ls', ['-1', '/private/tmp/tmux-501'], { encoding: 'utf8' }).stdout ?? '';
    if (left.includes(SOCKET)) {
      spawnSync(join(repoRoot, 'build', 'vendor', 'tmux', 'bin', 'tmux'), ['-L', SOCKET, 'kill-server'], { encoding: 'utf8' });
      const held = spawnSync('/usr/sbin/lsof', ['-t', path], { encoding: 'utf8' }).stdout.trim();
      if (held === '') { rmSync(path, { force: true }); say(`ended and unlinked the scratch socket ${SOCKET}`); }
      else say(`LEFT the scratch socket ${SOCKET}, held by ${held}`);
    } else say(`the scratch socket ${SOCKET} was not there`);
  }
  // THE VERDICT IS AN EXIT CODE, not a paragraph a person has to read. Every
  // arm of both readings is graded, and one finding fails the run.
  if (findings.length > 0) {
    say(`FINDINGS, ${findings.length}:`);
    for (const one of findings) say(`  - ${one}`);
    process.exitCode = 1;
  } else {
    say('findings: none. Every arm answered added, every file outside ' +
      '~/.tortie/images still reads "victim, untouched", and both pictures ' +
      'landed as pictures.');
  }
}
