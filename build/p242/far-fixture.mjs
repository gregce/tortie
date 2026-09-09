/**
 * Phase 242. The scratch repository on the operator's Mac Pro, the furniture
 * the containment attack needs, and the removal of exactly those paths and
 * nothing else.
 *
 * ## The bounds this file enforces rather than documents
 *
 * Every path it names carries this run's own `tortie-p242-scratch-<pid>`
 * prefix, and {@link assertOurs} refuses anything else before a byte of shell
 * is composed. There is no path in this file a person's own project could
 * match, and the teardown asks the same question again before it removes
 * anything. His `~/.gitconfig` is never written: the commit verb is driven
 * against an identity set with `git config --local` INSIDE the scratch
 * repository, which is what research 85's diagnosis said was missing and what
 * research 102 section 5.1 confirmed.
 *
 * ## The furniture, one piece per shape the attack has to reach
 *
 * | on that machine | what it is for |
 * | --- | --- |
 * | `<root>` | the confirmed folder, a real git repository |
 * | `<root>x` | the sibling whose name EXTENDS the root by one character, which is what `relativeUnderRoot`'s separator rule exists for. It is also a git repository, so the `cd`-taking git verbs can be aimed at it |
 * | `<root>x/victim.txt` | the file the escape arms try to replace |
 * | `<root>/escape-link` | a symbolic link INSIDE the folder pointing at the sibling. Three write verbs went through it at the parent |
 * | `<root>/leaf-link` | a symbolic link as the ENTRY ITSELF, which nothing had ever asked about |
 * | `<root>/docs/staged-target.md.tortie-part` | a link planted at the STAGED NAME `file-put` writes through. `> "$t"` follows one, so at the parent the payload landed outside the folder before the `mv` ran at all. It is `src/main/credentials/nofollow.ts`'s shape |
 * | `<root>/docs/hard-target.md.tortie-part` | a HARD LINK at that same staged name, which is the FIX ROUND's piece. `[ -L ]` cannot see one, because a hard link is not a link to the shell: it IS the file under a second name. The phase's verifier drove exactly this through `machines.putFile` on this machine and the file outside took the payload under the answer `wrote` |
 * | `<root>x/dirty-commit.txt` | STAGED at setup, and Phase 242.1's. The commit arm through the link has to be driven with main's two guards SATISFIED, being the sha `HEAD` really holds and the staged set main's own fresh read really reports, or it refuses in main and never reaches the far side at all. Phase 242 read `refused` from that arm and it was the sha guard rather than containment |
 * | `<root>-outside.txt` | a path elsewhere entirely, for the absolute-path arm |
 *
 * It is `.p224/far-fixture.mjs`'s shape, which every remote phase since Phase
 * 224 has used, and it is promoted out of a phase working directory into
 * `build/` because the last rule in `.gitignore` hides every phase working
 * directory, so no phase directory has ever been committed and the probe beside
 * it has to be.
 */
import { runOnMachine } from '../real-machine.mjs';

const PID = String(process.pid);

/** The confirmed folder. A real absolute path under his real home. */
export const FAR_ROOT = `/Users/gdc/tortie-p242-scratch-${PID}`;
/** The sibling whose name extends the root by exactly one character. */
export const FAR_SIBLING = `${FAR_ROOT}x`;
/** A path elsewhere entirely. */
export const FAR_OUTSIDE = `${FAR_ROOT}-outside.txt`;
/** The file every escape arm aims at. */
export const VICTIM = `${FAR_SIBLING}/victim.txt`;
/** The file the leaf-link arm aims at. */
export const VICTIM_LEAF = `${FAR_SIBLING}/victim-leaf.txt`;
/** The file the staged-name arm aims at. */
export const VICTIM_STAGED = `${FAR_SIBLING}/victim-staged.txt`;
/** The file the HARD staged-name arm aims at, and which must never move. */
export const VICTIM_HARD = `${FAR_SIBLING}/victim-hard.txt`;
/** The link inside the folder pointing out of it. */
export const ESCAPE_LINK = `${FAR_ROOT}/escape-link`;

const OURS = /^\/Users\/gdc\/tortie-p242-scratch-\d+(x|-outside\.txt)?$/;

/**
 * Refuse any path that is not this run's own. It is asked before the setup,
 * before every read and before the teardown, rather than once.
 */
function assertOurs(path) {
  if (!OURS.test(path) || !path.startsWith(`/Users/gdc/tortie-p242-scratch-${PID}`)) {
    throw new Error(`refusing to touch ${path}`);
  }
}

const put = (rel, body) => `cat > ${rel} <<'P242FILE'\n${body}\nP242FILE\n`;

function files() {
  const out = [];
  for (let i = 1; i <= 4; i += 1) {
    out.push(
      put(
        `src/core${i}.ts`,
        `export function core${i}(n: number): number {\n  // needle marker ${i}\n  return n * ${i};\n}\n`
      )
    );
  }
  out.push(put('README.md', '# p242 fixture\n\nA scratch repository made by Tortie phase 242.\n'));
  out.push(put('.gitignore', 'node_modules\n'));
  out.push(
    put(
      'docs/design.md',
      'The write root is one folder on that machine.\n\nTortie replaces files under it and refuses everything else.\n\nThis paragraph is the one the redline is measured on.\n'
    )
  );
  out.push(put('docs/notes.md', '# notes\n\nnothing here.\n'));
  out.push(put('docs/staged-target.md', '# staged target\n\nThe link beside this file is the nofollow shape.\n'));
  out.push(put('docs/hard-target.md', '# hard target\n\nThe HARD link beside this file is the shape [ -L ] cannot see.\n'));
  return out.join('');
}

export const setupScript = (root, sibling, outside) => `set -e
test ! -e ${root}
test ! -e ${sibling}
test ! -e ${outside}
mkdir -p ${root}/src ${root}/docs ${sibling}
cd ${root}
${files()}git init -q -b main
git config --local user.name 'Tortie P242'
git config --local user.email 'p242@example.invalid'
git config --local commit.gpgsign false
git add -A
git commit -q -m 'p242 base'
${put('docs/design.md', 'The write root is one folder on that machine.\n\nTortie replaces files under it and refuses absolutely everything else.\n\nThis paragraph is the one the redline is measured on.\n')}${put('src/core1.ts', 'export function core1(n: number): number {\n  // needle marker 1 EDITED\n  return n * 100;\n}\n')}${put('NOTES-untracked.md', 'scratch, untracked\n')}cat > ${sibling}/victim.txt <<'P242FILE'
victim, untouched
P242FILE
cat > ${sibling}/victim-leaf.txt <<'P242FILE'
victim leaf, untouched
P242FILE
cat > ${sibling}/victim-staged.txt <<'P242FILE'
victim staged, untouched
P242FILE
cat > ${sibling}/victim-hard.txt <<'P242FILE'
victim hard, untouched
P242FILE
ln -s ${sibling} ${root}/escape-link
ln -s ${sibling}/victim-leaf.txt ${root}/leaf-link
ln -s ${sibling}/victim-staged.txt ${root}/docs/staged-target.md.tortie-part
ln ${sibling}/victim-hard.txt ${root}/docs/hard-target.md.tortie-part
cd ${sibling}
git init -q -b main
git config --local user.name 'Tortie P242 sibling'
git config --local user.email 'p242-sibling@example.invalid'
git config --local commit.gpgsign false
git add -A
git commit -q -m 'p242 sibling base'
cat > ${sibling}/dirty.txt <<'P242FILE'
dirty, unstaged
P242FILE
cat > ${sibling}/dirty-link.txt <<'P242FILE'
dirty, for the through-the-link arm
P242FILE
cat > ${sibling}/dirty-commit.txt <<'P242FILE'
dirty, for the through-the-link COMMIT arm
P242FILE
git -C ${sibling} add dirty-commit.txt
cd ${root}
echo "commits=$(git log --oneline | wc -l | tr -d ' ')"
echo "dirty=$(git status --porcelain=v1 | wc -l | tr -d ' ')"
echo "victimMd5=$(md5 -q ${sibling}/victim.txt)"
echo "leafMd5=$(md5 -q ${sibling}/victim-leaf.txt)"
echo "stagedMd5=$(md5 -q ${sibling}/victim-staged.txt)"
echo "hardMd5=$(md5 -q ${sibling}/victim-hard.txt)"
echo "designSha=$(shasum -a 256 docs/design.md | cut -d' ' -f1)"
echo "stagedTargetSha=$(shasum -a 256 docs/staged-target.md | cut -d' ' -f1)"
echo "hardTargetSha=$(shasum -a 256 docs/hard-target.md | cut -d' ' -f1)"
echo "victimSha=$(shasum -a 256 ${sibling}/victim.txt | cut -d' ' -f1)"
echo "leafSha=$(shasum -a 256 ${sibling}/victim-leaf.txt | cut -d' ' -f1)"
echo "siblingCommits=$(cd ${sibling} && git log --oneline | wc -l | tr -d ' ')"
echo "siblingStaged=$(cd ${sibling} && git diff --cached --name-only | tr '\\n' ',')"
echo "siblingHead=$(cd ${sibling} && git rev-parse HEAD)"
echo "outsideExists=$(test -e ${outside} && echo yes || echo no)"
`;

export function runScript(machine, script, timeoutMs = 180_000) {
  const b64 = Buffer.from(script, 'utf8').toString('base64');
  return runOnMachine(machine, `printf %s ${b64} | base64 -d | /bin/sh`, { timeoutMs });
}

export function setupFar(machine) {
  assertOurs(FAR_ROOT);
  assertOurs(FAR_SIBLING);
  assertOurs(FAR_OUTSIDE);
  return runScript(machine, setupScript(FAR_ROOT, FAR_SIBLING, FAR_OUTSIDE));
}

/**
 * Read the far side with an ssh Tortie did not compose.
 *
 * EVERY CLAIM THIS PHASE MAKES ABOUT WHAT LANDED IS READ HERE and never from
 * the answer the bridge handed back, because the answer is the thing under
 * test. At the parent commit `file-put` answered `wrote` for a file it had
 * replaced OUTSIDE the confirmed folder, and only a reading like this one could
 * tell that apart from a save that worked.
 */
export function readFar(machine) {
  assertOurs(FAR_ROOT);
  assertOurs(FAR_SIBLING);
  assertOurs(FAR_OUTSIDE);
  return runScript(
    machine,
    `cd ${FAR_ROOT} 2>/dev/null || exit 0
echo "victimMd5=$(md5 -q ${FAR_SIBLING}/victim.txt 2>/dev/null || echo GONE)"
echo "victimBytes=$(wc -c < ${FAR_SIBLING}/victim.txt 2>/dev/null | tr -d ' ' || echo GONE)"
echo "leafMd5=$(md5 -q ${FAR_SIBLING}/victim-leaf.txt 2>/dev/null || echo GONE)"
echo "stagedMd5=$(md5 -q ${FAR_SIBLING}/victim-staged.txt 2>/dev/null || echo GONE)"
echo "hardMd5=$(md5 -q ${FAR_SIBLING}/victim-hard.txt 2>/dev/null || echo GONE)"
echo "hardLinks=$(stat -f %l ${FAR_SIBLING}/victim-hard.txt 2>/dev/null || echo GONE)"
echo "siblingEntries=$(ls -1a ${FAR_SIBLING} | wc -l | tr -d ' ')"
echo "siblingCommits=$(cd ${FAR_SIBLING} && git log --oneline | wc -l | tr -d ' ')"
echo "siblingStaged=$(cd ${FAR_SIBLING} && git diff --cached --name-only | tr '\\n' ',')"
echo "siblingHead=$(cd ${FAR_SIBLING} && git rev-parse HEAD)"
echo "siblingDirty=$(cd ${FAR_SIBLING} && git status --porcelain=v1 | wc -l | tr -d ' ')"
echo "outsideExists=$(test -e ${FAR_OUTSIDE} && echo yes || echo no)"
echo "escapeLink=$(readlink ${FAR_ROOT}/escape-link 2>/dev/null || echo GONE)"
echo "leafLink=$(readlink ${FAR_ROOT}/leaf-link 2>/dev/null || echo GONE)"
echo "leafLinkIsLink=$(test -L ${FAR_ROOT}/leaf-link && echo yes || echo no)"
echo "stagedPartIsLink=$(test -L ${FAR_ROOT}/docs/staged-target.md.tortie-part && echo yes || echo no)"
echo "stagedTargetIsLink=$(test -L ${FAR_ROOT}/docs/staged-target.md && echo yes || echo no)"
echo "stagedTargetMd5=$(md5 -q docs/staged-target.md 2>/dev/null || echo GONE)"
echo "hardTargetHead=$(head -c 40 docs/hard-target.md 2>/dev/null | tr '\\n' '|')"
echo "hardPartExists=$(test -e ${FAR_ROOT}/docs/hard-target.md.tortie-part && echo yes || echo no)"
echo "madeThroughLink=$(test -d ${FAR_SIBLING}/p242-made-through-the-link && echo yes || echo no)"
echo "readmeMovedOut=$(test -e ${FAR_SIBLING}/README-moved.md && echo yes || echo no)"
echo "readmeStillIn=$(test -e README.md && echo yes || echo no)"
echo "designMd5=$(md5 -q docs/design.md 2>/dev/null || echo GONE)"
echo "designHead=$(head -c 60 docs/design.md 2>/dev/null | tr '\\n' '|')"
echo "notesExists=$(test -e docs/notes.md && echo yes || echo no)"
echo "renamedExists=$(test -e docs/renamed-notes.md && echo yes || echo no)"
echo "newFileExists=$(test -e p242-new-file.md && echo yes || echo no)"
echo "newFolderExists=$(test -d p242-new-folder && echo yes || echo no)"
echo "movedExists=$(test -e p242-new-folder/notes-moved.md && echo yes || echo no)"
echo "strayParts=$(find ${FAR_ROOT} ${FAR_SIBLING} -name '*.tortie-part' ! -name 'hard-target.md.tortie-part' 2>/dev/null | wc -l | tr -d ' ')"
echo "commits=$(git log --oneline | wc -l | tr -d ' ')"
echo "lastSubject=$(git log -1 --pretty=%s)"
echo "staged=$(git diff --cached --name-only | tr '\\n' ',')"
echo "dirty=$(git status --porcelain=v1 | wc -l | tr -d ' ')"
echo "core1Md5=$(md5 -q src/core1.ts)"
`,
    60_000
  );
}

/** Remove exactly the three paths this run made, and say whether each is gone. */
export function teardownFar(machine) {
  assertOurs(FAR_ROOT);
  assertOurs(FAR_SIBLING);
  assertOurs(FAR_OUTSIDE);
  return runScript(
    machine,
    `rm -rf ${FAR_ROOT}
rm -rf ${FAR_SIBLING}
rm -f ${FAR_OUTSIDE}
test -e ${FAR_ROOT} && echo ROOT-STILL-THERE || echo ROOT-GONE
test -e ${FAR_SIBLING} && echo SIBLING-STILL-THERE || echo SIBLING-GONE
test -e ${FAR_OUTSIDE} && echo OUTSIDE-STILL-THERE || echo OUTSIDE-GONE
`,
    60_000
  );
}
