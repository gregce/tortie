/**
 * check-skills-pin.cjs — fail when the pinned `skills` CLI has drifted too far
 * from what the registry publishes.
 *
 * Phase 22, trigger 1 of the three that keep the pin current. The other two are
 * human acts: a version bump is an ordinary Tier 2 change, and a `compatBand`
 * change is Tier 3 with an independent verifier. This one is a gate, so nobody
 * has to remember.
 *
 * Two failures, and they are different things:
 *
 *  - The published version has left `compatBand`. A copy Tortie would refuse to
 *    run on the user's PATH is now the copy everybody else gets, so the pin is
 *    not merely old, it is a different product.
 *  - The published version is more than `maxMinorDrift` minor releases ahead.
 *    The CLI publishes roughly every 5 to 8 days, so this fires on time rather
 *    than on version number theatre.
 *
 * Run it by hand with `npm run pin:skills:check`. It makes one request to the
 * registry and writes nothing. Offline it says so and exits 0, because a
 * network outage is not a pin problem.
 */

const { execFileSync } = require('node:child_process');
const { readPin } = require('./fetch-skills.cjs');

/** `1.5.22` → [1, 5, 22]. Null when it is not a plain three-part version. */
function parts(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
  if (match === null) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compare(a, b) {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

function published(pkg) {
  try {
    return execFileSync('npm', ['view', pkg, 'version'], {
      encoding: 'utf8',
      timeout: 30_000,
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
  } catch {
    return null;
  }
}

function main() {
  const pin = readPin();
  const latest = published(pin.package);
  if (latest === null) {
    console.log(`check-skills-pin: could not reach the registry, so nothing was checked.`);
    return;
  }

  const pinned = parts(pin.version);
  const now = parts(latest);
  if (pinned === null || now === null) {
    throw new Error(`cannot compare "${pin.version}" with "${latest}"`);
  }

  const problems = [];
  if (compare(now, parts(pin.compatBand.min)) < 0 || now[0] >= pin.compatBand.belowMajor) {
    problems.push(
      `${pin.package}@${latest} is outside compatBand ` +
        `[${pin.compatBand.min}, ${pin.compatBand.belowMajor}.0.0). ` +
        `Tortie would refuse a user's own copy at that version.`
    );
  }
  const drift = now[0] === pinned[0] ? now[1] - pinned[1] : Infinity;
  if (drift > pin.maxMinorDrift) {
    problems.push(
      `${pin.package}@${latest} is ${drift === Infinity ? 'a major release' : `${drift} minor releases`} ` +
        `ahead of the pinned ${pin.version}, and the limit is ${pin.maxMinorDrift}.`
    );
  }

  if (problems.length > 0) {
    console.error(`check-skills-pin: the pin needs attention.`);
    for (const problem of problems) console.error(`  ${problem}`);
    console.error(`  Re-pin with build/skills-release.json, then run npm run vendor:skills.`);
    process.exit(1);
  }
  console.log(`check-skills-pin: pinned ${pin.version}, published ${latest}. Within limits.`);
}

main();
