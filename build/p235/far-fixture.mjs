/**
 * Phase 235. Build and remove the scratch repository on the operator's Mac Pro.
 *
 * A copy of build/p234/far-fixture.mjs with this phase's own prefix, kept as a
 * copy for the reason that file's own header gives: the prefix is what makes
 * `assertOurs` refuse every path but this run's, so two phases sharing one
 * module would share one root and a teardown could reach the other's.
 * The tree is Phase 234's: 26 files with three commits, a side branch and two
 * untracked files, plus a `docs/arch/` contract. This phase reads none of the
 * contract; it needs a repository on that machine with files a tab can open.
 *
 * Every write on that machine goes under ONE path this module composes, and
 * `teardownFar` removes exactly that path and nothing else.
 */
import { runOnMachine } from '../real-machine.mjs';

export const FAR_ROOT = `/Users/gdc/tortie-p235-scratch-${String(process.pid)}`;

function assertOurs(path) {
  if (path !== FAR_ROOT || !/^\/Users\/gdc\/tortie-p235-scratch-\d+$/.test(path)) {
    throw new Error(`refusing to touch ${path}`);
  }
}

/** One file, written with a quoted heredoc so nothing in it is expanded. */
function put(rel, body) {
  return `cat > ${rel} <<'P235FILE'\n${body}\nP235FILE\n`;
}

const component = (id, layer, anchors, description, extra = {}) =>
  JSON.stringify(
    {
      id,
      name: id,
      kind: 'component',
      layer,
      provenance: 'first-party',
      anchors,
      boundary: 'closed',
      description,
      evidence: [],
      deprecated: false,
      gaps: [],
      ...extra
    },
    null,
    2
  );

/** The contract this fixture carries. Three real components and one hostile plant. */
export function contractFiles() {
  return [
    put(
      'docs/arch/contract.json',
      JSON.stringify(
        {
          version: 1,
          subject: 'The p235 fixture, a scratch repository on another machine',
          strictness: 'not-wrong',
          layers: [
            { id: 'surface', name: 'surface', order: 0 },
            { id: 'engine', name: 'engine', order: 1 },
            { id: 'foundation', name: 'foundation', order: 2 }
          ],
          flows: []
        },
        null,
        2
      )
    ),
    put('docs/arch/components/ui.json', component('ui', 'surface', ['src/ui'], 'The panels.')),
    put('docs/arch/components/core.json', component('core', 'engine', ['src/core'], 'The work itself.')),
    put('docs/arch/components/lib.json', component('lib', 'foundation', ['lib'], 'Helpers.')),
    // The plant for independent method two: an anchor git would read as an
    // option, and a field naming a command. Both must be dropped whole and
    // neither may reach an argv on either machine.
    put(
      'docs/arch/components/hostile.json',
      component('hostile', 'engine', ['-hostile-lead-234'], 'Dropped whole.', {
        command: 'rm -rf /tmp/hostile-command-234'
      })
    ),
    put(
      'docs/arch/edges.json',
      JSON.stringify(
        {
          edges: [
            {
              id: 'ui-must-not-lib',
              from: 'ui',
              to: 'lib',
              kind: 'imports',
              rule: 'must-not',
              checker: 'imports',
              label: 'the panels stay off the helpers',
              evidence: []
            }
          ]
        },
        null,
        2
      )
    ),
    put('docs/arch/baseline.json', JSON.stringify({ accepted: [] }, null, 2))
  ].join('');
}

function files() {
  const out = [];
  for (let i = 1; i <= 6; i += 1) {
    out.push(
      put(
        `src/core/core${i}.ts`,
        `export function core${i}(n: number): number {\n  // needle-alpha marker ${i}\n  return n * ${i};\n}\n`
      )
    );
    out.push(
      put(
        `src/ui/panel${i}.tsx`,
        `import { core${i} } from '../core/core${i}';\nexport function Panel${i}(): string {\n  // needle-alpha marker ${i}\n  return 'panel ' + String(core${i}(${i}));\n}\n`
      )
    );
  }
  for (let i = 1; i <= 4; i += 1) {
    out.push(put(`lib/helper${i}.ts`, `export const helper${i} = ${i}; // needle-beta\n`));
  }
  out.push(put('README.md', '# p235 fixture\n\nA scratch repository made by Tortie phase 235.\nneedle-alpha appears in the source.\n'));
  out.push(put('.gitignore', 'node_modules\n'));
  out.push(put('docs/design.md', '# design\n\nneedle-beta in prose.\n'));
  out.push(put('docs/notes.md', '# notes\n\nnothing here.\n'));
  out.push(put('tests/core.test.ts', "import { core1 } from '../src/core/core1';\ntest('core1', () => { core1(1); });\n"));
  out.push(put('package.json', '{"name":"p235-fixture","version":"1.0.0"}\n'));
  out.push(contractFiles());
  return out.join('');
}

export const setupScript = (root) => `set -e
test ! -e ${root}
mkdir -p ${root}/src/core ${root}/src/ui ${root}/lib ${root}/docs/arch/components ${root}/tests
cd ${root}
export GIT_AUTHOR_NAME='Tortie P235' GIT_AUTHOR_EMAIL='p235@example.invalid'
export GIT_COMMITTER_NAME='Tortie P235' GIT_COMMITTER_EMAIL='p235@example.invalid'
${files()}git init -q -b main
git config --local commit.gpgsign false
git config --local user.name 'Tortie P235'
git config --local user.email 'p235@example.invalid'
git add -A
git commit -q -m 'p235 base: the tree and its contract'
${put('lib/helper5.ts', 'export const helper5 = 5; // needle-beta\n')}git add -A
git commit -q -m 'p235 second: another helper'
${put('docs/changelog.md', '# changelog\n\n- first\n')}git add -A
git commit -q -m 'p235 third: a changelog'
git checkout -q -b p235-side
${put('docs/changelog.md', '# changelog\n\n- first\n- side branch line\n')}git commit -q -am 'p235 fourth: on the side branch'
git checkout -q main
${put('src/core/core1.ts', 'export function core1(n: number): number {\n  // needle-alpha marker 1 EDITED\n  return n * 100;\n}\n')}${put('lib/helper1.ts', 'export const helper1 = 99; // needle-beta EDITED\n')}${put('NOTES-untracked.md', 'scratch, untracked\n')}${put('src/ui/untracked.tsx', 'export const untracked = true;\n')}echo "commits=$(git log --oneline | wc -l | tr -d ' ')"
echo "dirty=$(git status --porcelain=v1 | wc -l | tr -d ' ')"
echo "files=$(find . -path ./.git -prune -o -type f -print | wc -l | tr -d ' ')"
echo "tracked=$(git ls-files | wc -l | tr -d ' ')"
echo "branches=$(git branch | wc -l | tr -d ' ')"
`;

/** Send a whole script over as base64 so nothing on the far side re-quotes it. */
export function runScript(machine, script, timeoutMs = 180_000) {
  const b64 = Buffer.from(script, 'utf8').toString('base64');
  return runOnMachine(machine, `printf %s ${b64} | base64 -d | /bin/sh`, { timeoutMs });
}

export function setupFar(machine) {
  assertOurs(FAR_ROOT);
  return runScript(machine, setupScript(FAR_ROOT));
}

export function teardownFar(machine) {
  assertOurs(FAR_ROOT);
  return runScript(
    machine,
    `rm -rf ${FAR_ROOT}\ntest -e ${FAR_ROOT} && echo STILL-THERE || echo GONE\n`,
    60_000
  );
}
