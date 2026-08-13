#!/usr/bin/env node
/**
 * assert-preview-containment.mjs — the HTML preview's three locks must survive
 * the bundler (Phase 20.5).
 *
 * ## Why this file exists, and it is the same lesson as its sibling
 *
 * `build/assert-bundle-refusals.mjs` was written in Phase 20 after a refusal
 * that a unit test proved present in the source was found absent from
 * `out/main/index.js`. Vitest runs the source. The bundler ships something
 * else. No test in this repository can see the difference.
 *
 * Phase 20.5 puts a page from a cloned repository on screen inside the
 * application that holds the user's source, their credentials and their agent
 * sessions. Three things stop that page doing anything, they were each
 * measured separately, and each one is a single string:
 *
 *   1. `sandbox=""` on the frame, with no keywords in it. With
 *      `allow-same-origin` a probe read `window.parent.gmux` and 9,196 bytes
 *      of /etc/passwd. With `allow-scripts` a `<meta http-equiv="refresh">`
 *      fired.
 *   2. `default-src 'none'` on every response the `gmux-preview:` handler
 *      builds. With the header removed, 5 requests reached a local HTTP sink
 *      from a fixture page under that same empty sandbox attribute.
 *   3. `frame-src gmux-preview:` in the application policy, and nothing else
 *      new in it. Research 37 §8.1 says this renderer cannot reach a network
 *      host, and that claim has to keep holding.
 *
 * A bundler that dropped any one of them would leave every unit test passing.
 * So this script reads the artifacts.
 *
 * Run by `npm run build`, so it cannot be skipped by anything that builds,
 * including `npm run package`.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rendererDir = join(repoRoot, 'out', 'renderer');
const assetsDir = join(rendererDir, 'assets');
const mainBundle = join(repoRoot, 'out', 'main', 'index.js');
const rendererHtml = join(rendererDir, 'index.html');

/** The exact application policy. One directive was added and no other. */
const EXPECTED_APP_POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: gmux-asset:; font-src 'self' data:; " +
  "worker-src 'self' blob:; frame-src gmux-preview:";

/**
 * Sandbox keywords. Any of these reaching the shipped frame would turn a
 * document into code running beside the user's work. `allow-scripts` and
 * `allow-same-origin` are the two that matter most, and the rest are listed
 * because a widening usually arrives one convenience at a time.
 */
const SANDBOX_KEYWORDS = [
  'allow-same-origin',
  'allow-scripts',
  'allow-top-navigation',
  'allow-popups',
  'allow-forms',
  'allow-modals',
  'allow-downloads',
  'allow-pointer-lock',
  'allow-presentation',
  'allow-orientation-lock'
];

const failures = [];

function fail(what, detail) {
  failures.push({ what, detail });
}

function readRendererChunks() {
  if (!existsSync(assetsDir)) return null;
  const out = [];
  for (const name of readdirSync(assetsDir)) {
    if (!name.endsWith('.js')) continue;
    out.push({ name, code: readFileSync(join(assetsDir, name), 'utf8') });
  }
  return out;
}

/** Lock 1. The frame's sandbox attribute, read out of the shipped chunk. */
function checkSandbox(chunks) {
  const hits = chunks.filter((c) => c.code.includes('htmlp-frame'));
  if (hits.length === 0) {
    fail(
      'the preview frame is not in the renderer bundle',
      'No shipped chunk mentions `htmlp-frame`. Either the HTML preview was ' +
        'removed, or the class name changed and this check went stale.'
    );
    return;
  }
  for (const { name, code } of hits) {
    // The attribute sits within a few dozen characters of the class name in
    // the element's props object. The window is generous so a formatting
    // change cannot break the check, and narrow enough that it cannot pick up
    // an unrelated `sandbox` elsewhere in a 3 MB chunk.
    let found = false;
    for (const match of code.matchAll(/htmlp-frame/g)) {
      const window = code.slice(match.index, match.index + 600);
      const sandbox = /sandbox\s*:\s*(""|''|`` )/.exec(window);
      if (sandbox) {
        found = true;
        continue;
      }
      const anySandbox = /sandbox\s*:\s*([^,}\n]+)/.exec(window);
      fail(
        `the preview frame in ${name} does not carry an empty sandbox`,
        anySandbox
          ? `Its sandbox value is ${anySandbox[1].trim()}. It must be the ` +
            'literal empty string. A value the bundler cannot see through is ' +
            'a value nobody can check.'
          : 'No sandbox attribute is on the element at all. Every keyword is ' +
            'forbidden and the attribute itself is required: without it the ' +
            'frame is same origin with the application.'
      );
    }
    if (!found) return;
  }
}

/**
 * Lock 1, the other direction, and the other half: exactly one iframe in the
 * application chunk, and no sandbox keyword in the code Tortie itself wrote.
 *
 * The scan is limited to the chunk that holds the application, and it does not
 * sweep the vendor chunks. Monaco's HTML language service ships the full
 * sandbox keyword list as completion DATA, so `monaco-impl-*.js` and
 * `html.worker-*.js` both contain every string in SANDBOX_KEYWORDS and always
 * will. Those are words in a table, not an attribute on an element we render.
 * Failing on them would mean deleting this check within a week, which is worse
 * than scoping it honestly now.
 */
function checkNoOtherFrames(chunks) {
  const app = chunks.filter((c) => c.code.includes('htmlp-frame'));
  for (const { name, code } of app) {
    // JSX is compiled away, so an element is a quoted tag name handed to a
    // factory. A bare `<iframe` in a bundle is prose in a vendored comment,
    // which is why it is not counted: two of them are in the hast property
    // table that markdown rendering pulls in.
    const frames =
      (code.match(/["'`]iframe["'`]/g) ?? []).length +
      (code.match(/createElement\(\s*["'`]iframe/g) ?? []).length;
    if (frames !== 1) {
      fail(
        `${name} creates ${String(frames)} iframes and should create 1`,
        'The preview frame is meant to be the only iframe in this ' +
          'application. A second one needs its own decision about what it ' +
          'may reach, and this check is where that decision gets noticed.'
      );
    }
    // The QUOTED keyword, which is what a sandbox value compiles to. The bare
    // word is not searched for, because Monaco's HTML language service ships
    // the whole keyword list as completion data and would fail this check
    // forever if it were ever bundled into the same chunk.
    for (const keyword of SANDBOX_KEYWORDS) {
      if (code.includes(`"${keyword}`) || code.includes(`'${keyword}`)) {
        fail(
          `${name} contains the sandbox keyword ${keyword} as a value`,
          'The preview frame is the only iframe this application creates and ' +
            'its sandbox attribute is empty. A keyword reaching a shipped ' +
            'chunk means somebody widened it.'
        );
      }
    }
  }
}

/** Lock 2. The policy the handler puts on every response it builds. */
function checkResponsePolicy() {
  if (!existsSync(mainBundle)) {
    fail(
      `${mainBundle} is not there`,
      'Run the build before this check.'
    );
    return;
  }
  const code = readFileSync(mainBundle, 'utf8');
  const required = [
    "default-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
    'content-security-policy'
  ];
  for (const fragment of required) {
    if (!code.includes(fragment)) {
      fail(
        `out/main/index.js is missing ${JSON.stringify(fragment)}`,
        'This is part of the policy header the `gmux-preview:` handler sets ' +
          'on every response, including every refusal. With the header ' +
          'removed, a fixture page reached a local HTTP sink 5 times under ' +
          'the same empty sandbox attribute.'
      );
    }
  }
  // The sentinel route an earlier draft of this phase used to hand an
  // attacker-chosen address to `shell.openExternal`. A one pixel nested
  // iframe fired it on load with no script and no click. It must never come
  // back, in either process.
  if (code.includes('__external')) {
    fail(
      'out/main/index.js contains the `__external` sentinel route',
      'There must be no path from a previewed document into the main ' +
        'process. The rewrite only ever removes an attribute.'
    );
  }
}

/** Lock 3. One directive was added to the application policy and no other. */
function checkAppPolicy() {
  if (!existsSync(rendererHtml)) {
    fail(`${rendererHtml} is not there`, 'Run the build before this check.');
    return;
  }
  const html = readFileSync(rendererHtml, 'utf8');
  const meta = /http-equiv="Content-Security-Policy"\s*\n?\s*content="([^"]+)"/
    .exec(html);
  if (!meta) {
    fail(
      'out/renderer/index.html has no Content-Security-Policy meta tag',
      'The application policy is the third lock and it is not optional.'
    );
    return;
  }
  const policy = meta[1];
  if (policy !== EXPECTED_APP_POLICY) {
    fail(
      'the application policy is not the string this check expects',
      `shipped:  ${policy}\n    expected: ${EXPECTED_APP_POLICY}\n    ` +
        'Phase 20.5 added exactly one directive, `frame-src gmux-preview:`. ' +
        'If a directive was deliberately added or changed, update ' +
        'EXPECTED_APP_POLICY here and in ' +
        'src/renderer/editor/html/__tests__/csp.test.ts together, so the ' +
        'change is a decision somebody made rather than a drift.'
    );
  }
  for (const forbidden of ['connect-src', 'http://', 'https://', ' *']) {
    if (policy.includes(forbidden)) {
      fail(
        `the application policy contains ${JSON.stringify(forbidden)}`,
        'Research 37 §8.1 records that this renderer cannot reach any ' +
          'network host, and the HTML preview must not be the reason that ' +
          'stops being true.'
      );
    }
  }
}

function main() {
  const chunks = readRendererChunks();
  if (chunks === null) {
    console.error(
      `[preview] ${assetsDir} is not there. Run the build before this check.`
    );
    process.exit(1);
  }
  checkSandbox(chunks);
  checkNoOtherFrames(chunks);
  checkResponsePolicy();
  checkAppPolicy();

  if (failures.length > 0) {
    console.error(
      '[preview] a containment control the HTML preview depends on is not in ' +
        'the shipped artifact.'
    );
    for (const { what, detail } of failures) {
      console.error(`  ${what}`);
      console.error(`    ${detail}`);
    }
    process.exit(1);
  }

  console.log(
    '[preview] sandbox="" on the frame, the response policy in ' +
      'out/main/index.js, and one added directive in out/renderer/index.html.'
  );
}

main();
