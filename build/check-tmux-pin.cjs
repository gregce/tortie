/**
 * check-tmux-pin.cjs — the pin in build/ and the version table in src/main/
 * must say the same thing.
 *
 * Phase 41. The pin lives in build/tmux-release.json because the build lane
 * reads it, and src/main may not import from build/ (build/assert-import-
 * boundaries.mjs draws that line). So the runtime carries its own two
 * constants and this script proves the two copies agree. Without it the app
 * could tell a user "Tortie runs tmux 3.6a" while the bundle carried 3.7b, and
 * every gate in the repo would still pass.
 *
 * Three failures, and they are different things:
 *
 *  - BUNDLED_TMUX_VERSION is not the pinned version. The screens and the log
 *    lines would name a version the app does not carry.
 *  - The pin's testedPair is missing from TESTED_TMUX_PAIRS. The release
 *    claims a pair was measured and the app would refuse it.
 *  - A row in TESTED_TMUX_PAIRS names a client that is not the pinned version.
 *    That row describes a different release, so it is evidence about a build
 *    nobody is shipping.
 *
 * Run it by hand with `npm run pin:tmux:check`. `npm run package` and
 * `npm run package:dir` run it too, so a drifted pin cannot reach a build. It
 * spawns nothing, opens no manifest and makes no request, which is why it can
 * sit in the packaging chain the way `pin:skills:check` cannot: that one asks
 * the registry a question, and a build must not need the network to be up.
 * This is a text scan on purpose: importing the TypeScript module would need a
 * bundler in a gate measured at 0.1 s.
 */

const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

const ROOT = join(__dirname, '..');
const PIN_PATH = join(ROOT, 'build', 'tmux-release.json');
const VERSION_TS = join(ROOT, 'src', 'main', 'tmux', 'version.ts');

/** The two export names the spec fixed. Neither builder may change them. */
const VERSION_EXPORT = 'BUNDLED_TMUX_VERSION';
const PAIRS_EXPORT = 'TESTED_TMUX_PAIRS';

function fail(lines) {
  console.error('check-tmux-pin: the pin and the runtime table disagree.');
  for (const line of lines) console.error(`  ${line}`);
  console.error(
    `  The pin is build/tmux-release.json and the table is src/main/tmux/version.ts. ` +
      'Move both in the same commit.'
  );
  process.exit(1);
}

function main() {
  const pin = JSON.parse(readFileSync(PIN_PATH, 'utf8'));

  if (!existsSync(VERSION_TS)) {
    fail([
      `src/main/tmux/version.ts is not there, so nothing carries ${VERSION_EXPORT} ` +
        `or ${PAIRS_EXPORT} at run time.`
    ]);
  }
  const source = readFileSync(VERSION_TS, 'utf8');

  const versionMatch = new RegExp(
    `${VERSION_EXPORT}\\s*(?::[^=]*)?=\\s*['"\`]([^'"\`]+)['"\`]`
  ).exec(source);
  if (versionMatch === null) {
    fail([`src/main/tmux/version.ts does not export ${VERSION_EXPORT} as a string literal.`]);
  }
  const runtimeVersion = versionMatch[1];

  // Anchor on the DECLARATION, never on the first mention of the name: the
  // doc comment above it names it too, and a scan from there would read some
  // other array.
  const pairsDecl = new RegExp(`${PAIRS_EXPORT}\\s*(?::[^=]*)?=\\s*\\[`).exec(source);
  const openBracket = pairsDecl === null ? -1 : pairsDecl.index + pairsDecl[0].length - 1;
  const closeBracket = openBracket === -1 ? -1 : source.indexOf(']', openBracket);
  if (closeBracket === -1) {
    fail([`src/main/tmux/version.ts does not declare ${PAIRS_EXPORT} as an array literal.`]);
  }
  const pairsBody = source.slice(openBracket, closeBracket + 1);
  const pairs = [
    ...pairsBody.matchAll(
      /server\s*:\s*['"`]([^'"`]+)['"`]\s*,\s*client\s*:\s*['"`]([^'"`]+)['"`]/g
    )
  ].map((m) => ({ server: m[1], client: m[2] }));

  const problems = [];

  if (runtimeVersion !== pin.version) {
    problems.push(
      `${VERSION_EXPORT} is "${runtimeVersion}" and the pin says "${pin.version}". ` +
        'The app would name a version it does not carry.'
    );
  }

  if (pairs.length === 0) {
    problems.push(`${PAIRS_EXPORT} lists no pairs, so no warm server would ever be accepted.`);
  }

  const tested = pin.testedPair;
  const hasTested = pairs.some(
    (p) => p.server === tested?.server && p.client === tested?.client
  );
  if (!hasTested) {
    problems.push(
      `the pin's testedPair is server ${String(tested?.server)} with client ` +
        `${String(tested?.client)}, and ${PAIRS_EXPORT} does not list it. ` +
        `The table lists: ${pairs.map((p) => `${p.server}→${p.client}`).join(', ') || 'nothing'}.`
    );
  }

  for (const pair of pairs) {
    if (pair.client !== pin.version) {
      problems.push(
        `${PAIRS_EXPORT} has a row whose client is ${pair.client}, and the pin ships ` +
          `${pin.version}. That row describes a release nobody is building.`
      );
    }
  }

  if (problems.length > 0) fail(problems);

  console.log(
    `check-tmux-pin: pin ${pin.version}, ${VERSION_EXPORT} ${runtimeVersion}, ` +
      `${String(pairs.length)} tested pair${pairs.length === 1 ? '' : 's'} ` +
      `(${pairs.map((p) => `server ${p.server} with client ${p.client}`).join(', ')}). They agree.`
  );
}

main();
