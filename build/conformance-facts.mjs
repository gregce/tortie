#!/usr/bin/env node
/**
 * `npm run conformance:facts`. The gate on the fact base (Phase 257,
 * research 118 §6, §10 Phase 1; the spec is build/p257/SPEC.md §5).
 *
 * WHAT IT IS FOR. `src/main/arch/facts/` is a CLOSED rule table over eight
 * categories, ported from a prototype that was measured at 79% precision, 84%
 * excluding vendored bytes, and 229 of 229 on this repository's IPC channels.
 * Every one of those numbers decays the day a clause moves, and a clause
 * moves silently: a receiver set widened, a test-path refusal dropped, a
 * dedupe key given the rule id back. So this gate runs the SHIPPING reader,
 * extractor and store under node over eight committed fixtures, over this
 * checkout's own `src/`, and over a scratch `arch.db`, and pins what they
 * answer. Then it runs the same probe over an ablated copy of `src/main`
 * once per clause and fails unless every copy turns a pin red, naming the
 * clause: a pin that passes under ablation proves nothing.
 *
 * IT SPAWNS THE PINNED tsx ONCE PER PROBE RUN AND ONE PLAIN NODE for the
 * watcher gate (rule 11), and nothing else. No git, no Electron, no tmux, no
 * agent, no request. It reads this checkout's `src/` for rule 3 and nothing
 * under the person's home. Every ablated copy lives under a temp directory
 * removed in a finally block. That is why it is `pure` in
 * build/verification-checks.mjs.
 *
 * THE SEVENTEEN RULES, each printed as it is read. The Phase 257 fix round
 * added no rule and nineteen ablations, one per clause the verifiers removed
 * by hand and found pinned by nothing (the gate stayed green with the bare
 * `*Sync` requirement of `effect.fs.write` gone, with the absolute URL refusal
 * of the route rule gone, with `#[cfg(test)]` counted as a test attribute,
 * with the 200 character path cap, the messageless `new Error()` and the three
 * character environment name all gone), plus one per clause the round added:
 * the Ruby receiver, the network rule's four refusals, the SQL keyword's case
 * or continuation, Go 1.22's method pattern, pflag's pointer, the composition
 * root's test path refusal, the one binary window, the suffixed Dockerfile's
 * opening and the migration extension. Each is a decoy line in a fixture that
 * rule 1 pins byte for byte, so each ablation names the fixture line it moves.
 *
 * PHASE 261 ADDED NO RULE AND THREE ABLATIONS, one per clause it shipped.
 * Item 4: `surface.http.handlefunc` refuses an absolute URL, over the RESOLVED
 * target so the plain branch is covered as well as the Go 1.22 pattern one,
 * which the entry's summary did not name. Item 6: an msw handler declares a
 * route and reaches nothing, and `requests.Request(...)` builds a request
 * rather than sending one. It added NO ablation for item 5, because item 5
 * shipped no clause: the closed set of joining nodes that would stop
 * `app.get('/' + 'a', h)` reading `/` was driven over these fixtures and this
 * checkout's own `src/` and cost 56 correct rows for 0 gained, so
 * `src/main/symbols/calls.ts`'s header carries the measurement and the class
 * stays open. Two of the round's stated limits are pinned instead of ablated,
 * being that concatenation in `src/main/decoys.ts` and the class 3 reach in
 * the go fixture's `main.go`: a round that closes either moves a pinned line
 * and has to re-judge the row rather than discovering it later.
 *
 *
 *  1. The per-language table: over build/fixtures/facts/* the reader's facts
 *     equal expected.json byte for byte, and the count table is pinned.
 *  2. The precision sample and its judging rule are pinned by sha256; every
 *     FIX FIRST rule has at least two decoys from the sample's own false rows
 *     and no decoy yields a fact under its rule; every DROP rule has no id in
 *     the table and its planted rows yield nothing.
 *  3. The recall scope that runs here: this checkout's src/** with the pass
 *     on reads every channel in docs/audits/contract-baseline.txt, with the
 *     count READ from the baseline rather than pinned, and 0 extras.
 *  4. The wrapper pass's three clauses, ablated one at a time, each turning
 *     rule 3 red in its measured direction.
 *  5. The pass buys nothing where there is nothing: on the go, python and
 *     ruby fixtures and on src/main/symbols/** the fact set is the same on
 *     and off, and the empty map's digest is the pinned constant.
 *  6. The cross-rule dedupe: the python fixture's five routes read five.
 *  7. The vendor filter on planted bytes, both halves, with a control.
 *  8. Purity and the argv claim: a scan of the domain for a file system, a
 *     process, electron, git or an argv, proved on planted texts, and the
 *     twelve words of ARCH_ARGV_WORDS byte identical; hostile bytes reach a
 *     subject verbatim and nothing else.
 *  9. Identity: composed twice with the calls reversed, the same bytes; the
 *     same bytes at a test path differ exactly by the refusals; the blob oid
 *     is what git hash-object printed on 2026-09-11.
 * 10. The closed sets and the boundary split: categories and kinds pinned, a
 *     kind outside them refused whole naming the field, no SQL naming
 *     'boundary' without a kind predicate, the two readers disjoint and
 *     complete.
 * 11. No new watcher subscription: conformance:watcher passes and the domain
 *     names no subscribe(.
 * 12. The setting: absent, "yes" and 1 read false, true reads true, the seal
 *     does not move, and one module reads it.
 * 13. The network category: a URL in src/ lands in network/client and in a
 *     test lands nowhere; effect holds spawn and fs-write only.
 * 14. The six fixed rules, each on its own decoys.
 * 15. Limits: the call ceiling, the manifest cap, the subject cut.
 * 16. The store round trip over a scratch ArchStore.
 * 17. Registration: package.json, verification-checks, the teardown floor.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripComments } from './scan-source.mjs';
import { tsxCli } from './ts-runner.mjs';

const TAG = '[conformance:facts]';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const fail = (message) => failures.push(message);
const say = (line) => process.stdout.write(`${line}\n`);

const FIXTURES = ['ts-electron', 'ts-next', 'python', 'go', 'rust', 'ruby', 'swift', 'manifests'];
const expected = JSON.parse(readFileSync(join(repoRoot, 'build', 'fixtures', 'facts', 'expected.json'), 'utf8'));

// ---------------------------------------------------------------------------
// Pins that are constants
// ---------------------------------------------------------------------------

/** Rule 2: the 341 hand judgments and the sample they judge, as committed on 2026-09-10. */
const PINNED_SHA = {
  'build/p256/det/hand-precision.json': '39825217b0157f3c934745da22922efb67887d7ba703b20f69ae9138e2a1ab0c',
  'build/p256/det/measurements/precision-sample.json': 'd3b409e8df2fe33e39960c1d7fdeb238cb66a144d31b0bffe8dbe5751dd40875'
};
/** Rule 5: sha256 of the empty string, what wrapperDigest(new Map()) answers. */
const EMPTY_DIGEST = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
/** Rule 8: the twelve words conformance:arch rule 4 pins; a thirteenth is a deliberate act in three files. */
const PINNED_WORDS = ['ls-files', 'cat-file', '--batch', 'log', '--name-only', '--format=%H', '--no-renames', 'status', '--porcelain', 'rev-parse', 'HEAD', '-z'];
/** Rule 9: `git hash-object` over the bytes `app.get("/facts", h);\n`, printed 2026-09-11. No git runs here. */
const PINNED_OID = 'b6cc0c85baa88c2ca7f89ce1c7635aebd0c84c7c';
/** Rule 10: the closed sets, pinned here as well as in src/shared/arch.ts. */
const PINNED_CATEGORIES = ['entrypoint', 'boundary', 'surface', 'store', 'effect', 'network', 'gate', 'test'];
const PINNED_KINDS = {
  entrypoint: ['main', 'by-name', 'composition-root', 'package-main', 'bin', 'script', 'package', 'process', 'container', 'ci-job'],
  boundary: ['worker', 'thread', 'process', 'service', 'workspace', 'library', 'module-root'],
  surface: ['http-route', 'ipc-channel', 'cli-command', 'cli-flag', 'job', 'port'],
  store: ['store-write', 'store-def', 'migration'],
  effect: ['spawn', 'fs-write'],
  network: ['client', 'listen'],
  gate: ['auth', 'flag', 'refusal', 'guard'],
  test: ['test-case', 'test-target']
};

// ---------------------------------------------------------------------------
// The ablations, one per clause. Each edit must find its text, or the copy is
// the shipping tree and the gate would be proving the wrong thing. `arms` is
// what the probe runs over the copy; `red` names the pin that must go red and
// `direction` the measured way it goes.
// ---------------------------------------------------------------------------

const ABLATIONS = [
  {
    name: 'rule 2, store.orm put back',
    file: 'main/arch/facts/rules-store.ts',
    from: 'export const STORE_RULES: readonly FactRule[] = [',
    to: "export const STORE_RULES: readonly FactRule[] = [\n  { id: 'store.orm', category: 'store', kind: 'store-write', langs: '*', match: (s) => (/^(save|create|update|insert|upsert|destroy|delete)$/.test(s.last) && /^[A-Z]/.test(s.recv) ? `writes ${s.recv} (${s.last})` : null) },",
    arms: ['fixtures'],
    red: 'rule 2'
  },
  {
    name: 'rule 2, surface.handler.on put back',
    file: 'main/arch/facts/rules-surface.ts',
    from: 'export const SURFACE_RULES: readonly FactRule[] = [',
    to: "export const SURFACE_RULES: readonly FactRule[] = [\n  { id: 'surface.handler.on', category: 'surface', kind: 'job', langs: '*', match: (s) => (/^(on|once)$/.test(s.last) && s.argc >= 2 && channelish(s.args[0] ?? '') ? `handles ${s.args[0]}` : null) },",
    arms: ['fixtures'],
    red: 'rule 2'
  },
  {
    name: 'rule 4, the bare call clause',
    file: 'main/arch/facts/wrappers.ts',
    from: 'if (site.callee !== site.last) return null;',
    to: 'if (false) return null;',
    arms: ['recall'],
    red: 'rule 3',
    direction: (a) => a.recall !== undefined && a.recall.extras > 0
  },
  {
    name: 'rule 4, the import alias clause',
    file: 'main/symbols/wrappers.ts',
    from: 'const innerLast = aliases.get(last) ?? last;',
    to: 'const innerLast = last;',
    arms: ['recall'],
    red: 'rule 3',
    direction: (a) => a.recall !== undefined && a.recall.found < a.recall.truth
  },
  {
    name: 'rule 4, the caller-local shadow clause',
    file: 'main/arch/facts/wrappers.ts',
    from: '  const out = new Map(map);\n  for (const c of own) {',
    to: '  const out = new Map(map);\n  for (const c of [] as readonly ExtractedWrapper[]) {',
    arms: ['recall'],
    red: 'rule 3',
    direction: (a) => a.recall !== undefined && a.recall.found < a.recall.truth
  },
  {
    name: 'rule 5, the minus-base filter',
    file: 'main/arch/facts/read.ts',
    from: 'return settle(extra, already);',
    to: 'return settle(extra);',
    arms: ['fixtures'],
    red: 'rule 5',
    direction: (a) => a.fixtures !== undefined && a.fixtures['ts-electron'].wrapFacts > expected.fixtures['ts-electron'].wrapFacts
  },
  {
    name: 'rule 6, the dedupe key gains the rule id',
    file: 'main/arch/facts/rules.ts',
    from: 'return `${f.category}|${f.kind}|${f.subject}|${f.line}`;',
    to: 'return `${f.category}|${f.kind}|${f.subject}|${f.line}|${(f as { rule?: string }).rule ?? ""}`;',
    arms: ['fixtures'],
    red: 'rule 6'
  },
  {
    name: "rule 7, the vendor filter's path set emptied",
    file: 'main/arch/facts/vendored.ts',
    from: 'if (slashed.includes(`/${seg}/`)) return `path: segment ${seg}`;',
    to: 'if (false) return `path: segment ${seg}`;',
    arms: ['fixtures'],
    red: 'rule 7'
  },
  {
    name: 'rule 7, the 2,000 byte line test removed',
    file: 'main/arch/facts/vendored.ts',
    from: 'const LONG_LINE = 2000;',
    to: 'const LONG_LINE = 2_000_000;',
    arms: ['fixtures'],
    red: 'rule 7'
  },
  {
    name: 'rule 8, a process planted in oid.ts',
    file: 'main/arch/facts/oid.ts',
    from: "import { createHash } from 'node:crypto';",
    to: "import { createHash } from 'node:crypto';\nimport { spawn } from 'node:child_process';\nexport const planted = spawn;",
    arms: [],
    red: 'rule 8'
  },
  {
    name: 'rule 9, the sort removed',
    file: 'main/arch/facts/read.ts',
    from: '  out.sort(byLineRuleSubject);\n',
    to: '',
    arms: ['identity'],
    red: 'rule 9'
  },
  {
    name: 'rule 10, the kind predicate removed from boundaryStarts',
    file: 'main/arch/db.ts',
    from: "WHERE f.repo_key = ? AND a.category = 'boundary' AND a.kind IN (${marks})",
    to: "WHERE f.repo_key = ? AND a.category = 'boundary' AND (a.kind IN (${marks}) OR 1)",
    arms: ['store'],
    red: 'rule 10'
  },
  {
    name: 'rule 12, the sanitizer reads anything but false as true',
    file: 'main/settings/store.ts',
    from: "const wrapperPass = obj['wrapperPass'] === true;",
    to: "const wrapperPass = obj['wrapperPass'] !== false;",
    arms: ['setting'],
    red: 'rule 12'
  },
  {
    name: 'rule 13, the test-path refusal on the URL branch removed',
    file: 'main/arch/facts/rules-network.ts',
    from: 'if (u !== undefined) return test ? null : `talks to ${u.slice(0, 80)}`;',
    to: 'if (u !== undefined) return `talks to ${u.slice(0, 80)}`;',
    arms: ['fixtures'],
    red: 'rule 13'
  },
  {
    name: 'rule 14, bare Default re-added to the pair table',
    file: 'main/arch/facts/rules-entrypoint.ts',
    from: "{ recv: /^gin$/, last: 'Default', form: 'call', langs: ['go'] },",
    to: "{ recv: /^.*$/, last: 'Default', form: 'call', langs: ['go'] },",
    arms: ['fixtures'],
    red: 'rule 14'
  },
  {
    name: 'rule 14, the dash requirement removed from surface.cli.arg',
    file: 'main/arch/facts/rules-surface.ts',
    from: 'if (!own && dashed === undefined && !PARSER_RECV.test(s.recv)) return null;',
    to: 'if (false) return null;',
    arms: ['fixtures'],
    red: 'rule 14'
  },
  {
    name: 'rule 14, the use clap requirement removed',
    file: 'main/arch/facts/rules-surface.ts',
    from: 'if (!CLAP_QUALIFIED.test(head) && (!NAMES_CLAP.test(c.text) || NAMES_PROCESS.test(c.text))) return null;',
    to: 'if (false) return null;',
    arms: ['fixtures'],
    red: 'rule 14'
  },
  {
    name: 'rule 14, the assertion-receiver refusal removed from gate.auth',
    file: 'main/arch/facts/rules-gate.ts',
    from: 'if (ASSERTION_RECV.test(s.recv)) return null;',
    to: 'if (false) return null;',
    arms: ['fixtures'],
    red: 'rule 14'
  },
  {
    name: 'rule 14, the test-path refusal removed from gate.refusal',
    file: 'main/arch/facts/rules-gate.ts',
    from: 'if (isTestPath(c.file)) return null;',
    to: 'if (false) return null;',
    arms: ['fixtures'],
    red: 'rule 14'
  },
  {
    name: 'rule 14, the rust look-back replaced by the path test',
    file: 'main/arch/facts/line-rules.ts',
    from: 'subject: (m, _c, lines, index) => (rustTestAttributeAbove(lines, index) ? `test fn ${m[1]}` : null)',
    to: 'subject: (m, c) => (/tests?\\b|_test\\b/.test(c.file) ? `test fn ${m[1]}` : null)',
    arms: ['fixtures'],
    red: 'rule 14'
  },
  {
    name: 'rule 15, the call ceiling doubled',
    file: 'main/symbols/calls.ts',
    from: 'export const MAX_CALLS_PER_FILE = 20_000;',
    to: 'export const MAX_CALLS_PER_FILE = 40_000;',
    arms: ['limits'],
    red: 'rule 15'
  },
  {
    name: "rule 16, the prune's link condition removed",
    file: 'main/arch/db.ts',
    from: 'DELETE FROM arch_fact WHERE NOT EXISTS (',
    to: 'DELETE FROM arch_fact WHERE 0 AND NOT EXISTS (',
    arms: ['store'],
    red: 'rule 16'
  },
  // ── The fix round's seventeen, each a fixture line rule 1 pins. ──
  {
    name: 'rule 1, the Ruby receiver dropped (calls.ts reads the method field alone again)',
    file: 'main/symbols/calls.ts',
    from: 'if (receiver !== null) return collapse(`${receiver.text}.${byField.text}`).slice(0, MAX_CALLEE);',
    to: 'if (false) return collapse(`${receiver!.text}.${byField.text}`).slice(0, MAX_CALLEE);',
    arms: ['fixtures'],
    red: 'rule 1',
    direction: (a) => a.fixtures !== undefined && a.fixtures.ruby.facts.some((f) => f.file === 'lib/run.rb' && f.category === 'network')
  },
  {
    name: 'rule 13, the construction refusal removed from the network receiver branch',
    file: 'main/arch/facts/rules-network.ts',
    from: "if (s.form !== 'new' && /^(axios|requests|httpx|urllib|http|reqwest|HttpClient|URLSession|RestTemplate|WebClient)$/i.test(s.recv)) {",
    to: 'if (/^(axios|requests|httpx|urllib|http|reqwest|HttpClient|URLSession|RestTemplate|WebClient)$/i.test(s.recv)) {',
    arms: ['fixtures'],
    red: 'rule 13'
  },
  {
    name: 'rule 13, a URL parse reads every string argument again',
    file: 'main/arch/facts/rules-network.ts',
    from: 'const u = URL_PARSE.test(s.last) ? (reachableUrl(first) ? first : undefined) : s.args.find(reachableUrl);',
    to: 'const u = s.args.find(reachableUrl) ?? (first === "" ? undefined : first);',
    arms: ['fixtures'],
    red: 'rule 13'
  },
  {
    name: 'rule 13, the fragment refusal removed (a vocabulary IRI is a reach again)',
    file: 'main/arch/facts/rules-network.ts',
    from: "if (a.includes('#')) return false;",
    to: 'if (false) return false;',
    arms: ['fixtures'],
    red: 'rule 13'
  },
  {
    name: 'rule 13, the vocabulary host refusal removed',
    file: 'main/arch/facts/rules-network.ts',
    from: 'if (VOCABULARY_HOST.test(a)) return false;',
    to: 'if (false) return false;',
    arms: ['fixtures'],
    red: 'rule 13'
  },
  {
    name: 'rule 13, a URL with no host accepted again',
    file: 'main/arch/facts/rules-network.ts',
    from: `const LITERAL_URL = /^(https?|wss?|grpc):\\/\\/[^\\s'"/]{1,}[^\\s'"]{2,}/;`,
    to: `const LITERAL_URL = /^(https?|wss?|grpc):\\/\\/[^\\s'"]{3,}/;`,
    arms: ['fixtures'],
    red: 'rule 13'
  },
  {
    name: "rule 1, store.sql's case or continuation clause removed",
    file: 'main/arch/facts/rules-store.ts',
    from: 'if (keyword !== keyword.toUpperCase() && !SQL_CONTINUES.test(rest)) continue;',
    to: 'if (false) continue;',
    arms: ['fixtures'],
    red: 'rule 1'
  },
  {
    name: "rule 14, surface.cli.arg reads args[0] again (pflag's pointer)",
    file: 'main/arch/facts/rules-surface.ts',
    from: 'const n = dashed ?? s.args.find((a) => a.length > 0);',
    to: 'const n = dashed ?? s.args[0];',
    arms: ['fixtures'],
    red: 'rule 1'
  },
  {
    name: "rule 1, Go 1.22's method pattern refused again",
    file: 'main/arch/facts/rules-surface.ts',
    from: 'if (method !== null) return pathish(method[2]!) ? `HTTP ${method[1]} ${method[2]}` : null;',
    to: 'if (method !== null) return null;',
    arms: ['fixtures'],
    red: 'rule 1'
  },
  {
    name: 'rule 14, the test-path refusal removed from entrypoint.composition',
    file: 'main/arch/facts/rules-entrypoint.ts',
    from: '      if (isTestPath(c.file)) return null;\n      for (const r of COMPOSITION_ROOTS) {',
    to: '      for (const r of COMPOSITION_ROOTS) {',
    arms: ['fixtures'],
    red: 'rule 14'
  },
  {
    name: "rule 1, effect.fs.write's bare-call *Sync requirement removed (H13)",
    file: 'main/arch/facts/rules-effect.ts',
    from: "if (s.recv === '' && !/Sync$/.test(s.last)) return null;",
    to: 'if (false) return null;',
    arms: ['fixtures'],
    red: 'rule 1'
  },
  // ── Phase 261, items 4 and 6. Item 5 has no ablation because it has no
  // clause: it was measured and refused, and src/main/symbols/calls.ts's
  // header carries the numbers. ──
  {
    name: 'rule 1, the absolute-URL refusal removed from surface.http.handlefunc (Phase 261 item 4)',
    file: 'main/arch/facts/rules-surface.ts',
    from: 'if (/^(https?|wss?):\\/\\//.test(target)) return null;',
    to: 'if (false) return null;',
    arms: ['fixtures'],
    red: 'rule 1'
  },
  {
    name: 'rule 13, the msw refusal removed from network.client (Phase 261 item 6 class 1)',
    file: 'main/arch/facts/rules-network.ts',
    from: 'if (MSW_RECV.test(s.recv) && NAMES_MSW.test(c.text)) return null;',
    to: 'if (false) return null;',
    arms: ['fixtures'],
    red: 'rule 13'
  },
  {
    name: 'rule 13, the Request construction refusal removed from the receiver branch (Phase 261 item 6 class 2)',
    file: 'main/arch/facts/rules-network.ts',
    from: "if (s.form === 'call' && (s.last === 'Request' || s.last === 'HttpRequest')) return null;",
    to: 'if (false) return null;',
    arms: ['fixtures'],
    red: 'rule 13'
  },
  {
    name: 'rule 1, the absolute-URL refusal removed from surface.http.method-call (H3)',
    file: 'main/arch/facts/rules-surface.ts',
    from: 'if (/^(https?|wss?):\\/\\//.test(p)) return null;',
    to: 'if (false) return null;',
    arms: ['fixtures'],
    red: 'rule 1'
  },
  {
    name: 'rule 1, the test attribute matched anywhere in the path, so #[cfg(test)] counts (H10)',
    file: 'main/arch/facts/line-rules.ts',
    from: 'const RUST_TEST_ATTRIBUTE = /^\\s*#\\[[\\w:]*test\\b[^\\]]*\\]\\s*$/;',
    to: 'const RUST_TEST_ATTRIBUTE = /^\\s*#\\[[^\\]]*test\\b[^\\]]*\\]\\s*$/;',
    arms: ['fixtures'],
    red: 'rule 1'
  },
  {
    name: "rule 1, pathish's 200 character cap removed (H11)",
    file: 'main/arch/facts/predicates.ts',
    from: 'if (v.length === 0 || v.length > 200) return false;',
    to: 'if (v.length === 0) return false;',
    arms: ['fixtures'],
    red: 'rule 1'
  },
  {
    name: "rule 1, pathish's control character refusal removed",
    file: 'main/arch/facts/predicates.ts',
    from: 'if (/[\\x00-\\x1f\\x7f]/.test(v)) return false;',
    to: 'if (false) return false;',
    arms: ['fixtures'],
    red: 'rule 1'
  },
  {
    name: 'rule 1, a messageless new Error() is a refusal (H14)',
    file: 'main/arch/facts/rules-gate.ts',
    from: "s.form === 'new') {\n        return msg !== undefined ? `refuses: ${msg.slice(0, 90)}` : null;",
    to: "s.form === 'new') {\n        return msg !== undefined ? `refuses: ${msg.slice(0, 90)}` : `refuses (${s.last})`;",
    arms: ['fixtures'],
    red: 'rule 1'
  },
  {
    name: "rule 1, gate.env-read's three character minimum lowered (H15)",
    file: 'main/arch/facts/line-rules.ts',
    from: 'process\\.env\\.([A-Z][A-Z0-9_]{2,})',
    to: 'process\\.env\\.([A-Z][A-Z0-9_]{1,})',
    arms: ['fixtures'],
    red: 'rule 1'
  },
  {
    name: "rule 1, the binary window put back to git's 8,000 (the product and the driver move together)",
    file: 'main/symbols/languages.ts',
    from: 'export const BINARY_SNIFF_BYTES = 8192;',
    to: 'export const BINARY_SNIFF_BYTES = 8000;',
    arms: ['fixtures'],
    red: 'rule 1',
    direction: (a) => a.fixtures !== undefined && a.fixtures['ts-electron'].counts.unread === 0
  },
  {
    name: 'rule 1, a suffixed Dockerfile read without its opening instruction',
    file: 'main/arch/facts/manifests.ts',
    from: "if (base === 'dockerfile' || (base.startsWith('dockerfile.') && opensAsDockerfile(L))) {",
    to: "if (base === 'dockerfile' || base.startsWith('dockerfile.')) {",
    arms: ['fixtures'],
    red: 'rule 1'
  },
  {
    name: 'rule 1, a migration directory entry of any extension',
    file: 'main/arch/facts/manifests.ts',
    from: 'export const MIGRATION_FILE = /(^|\\/)(migrations?|db\\/migrate)\\/.*\\.(sql|prisma|rb|py|ts|tsx|js|mjs|cjs|go|rs|swift)$/;',
    to: 'export const MIGRATION_FILE = /(^|\\/)(migrations?|db\\/migrate)\\//;',
    arms: ['fixtures'],
    red: 'rule 1'
  }
];

/**
 * A copy of src/main (tests left out) under `<root>/main`, with `edit`
 * applied to one file. `@shared/*` resolves through tsconfig.node.json to the
 * real tree either way, and the grammar paths always come from the shipping
 * symbols/paths.ts, which is what keeps the copy honest about what moved.
 */
function ablatedCopy(root, edit) {
  mkdirSync(root, { recursive: true });
  cpSync(join(repoRoot, 'src', 'main'), join(root, 'main'), {
    recursive: true,
    filter: (source) => !source.includes('__tests__')
  });
  const target = join(root, edit.file);
  const before = readFileSync(target, 'utf8');
  if (!before.includes(edit.from)) {
    throw new Error(`ablation "${edit.name}" found nothing to edit in ${edit.file}`);
  }
  writeFileSync(target, before.replace(edit.from, edit.to));
  return root;
}

function runProbe(roots, scratch) {
  const probe = spawnSync(
    process.execPath,
    [
      tsxCli(),
      '--tsconfig',
      'tsconfig.node.json',
      'build/facts-conformance-probe.mts',
      JSON.stringify({ roots, checkout: repoRoot, scratch })
    ],
    { encoding: 'utf8', cwd: repoRoot, maxBuffer: 256 * 1024 * 1024 }
  );
  if (probe.status !== 0) {
    throw new Error(`the probe did not run: ${(probe.stderr || '(no output)').slice(0, 2000)}`);
  }
  const line = probe.stdout.trim().split('\n').pop() ?? '';
  return JSON.parse(line);
}

// ---------------------------------------------------------------------------
// The pins over one answer. Every rule that reads the probe is a function of
// the answer alone, so the same function judges the shipping tree and every
// ablated copy.
// ---------------------------------------------------------------------------

const factLine = (f) => `${f.viaWrapper ? 'W ' : '  '}${f.file}:${f.line} ${f.rule} :: ${f.subject}`;

function pinFixtures(got, problems) {
  if (got.fixtures === undefined) return;
  for (const name of FIXTURES) {
    const want = expected.fixtures[name];
    const have = got.fixtures[name];
    if (have === undefined) {
      problems.push(`rule 1, ${name}: not read`);
      continue;
    }
    const wantLines = want.facts.map(factLine);
    const haveLines = have.facts.map(factLine);
    if (JSON.stringify(want.facts) !== JSON.stringify(have.facts)) {
      const missing = wantLines.filter((l) => !haveLines.includes(l));
      const extra = haveLines.filter((l) => !wantLines.includes(l));
      const detail =
        missing.length + extra.length === 0
          ? 'the same lines with a moved category, kind or evidence'
          : `${missing.length} pinned line(s) missing${missing[0] ? `, first: ${missing[0]}` : ''}; ${extra.length} unpinned line(s) present${extra[0] ? `, first: ${extra[0]}` : ''}`;
      problems.push(`rule 1, ${name}: the fact list moved: ${detail}`);
    }
    const c = have.counts;
    const w = want.counts;
    for (const k of ['tracked', 'parsed', 'manifests', 'pathOnly', 'vendored', 'truncated', 'unread']) {
      if (c[k] !== w[k]) problems.push(`rule 1, ${name}: ${k} reads ${c[k]} and the fixture pins ${w[k]}`);
    }
    if (JSON.stringify(c.byCategory) !== JSON.stringify(w.byCategory)) {
      problems.push(`rule 1, ${name}: the category counts read ${JSON.stringify(c.byCategory)} and the fixture pins ${JSON.stringify(w.byCategory)}`);
    }
    if (have.wrapFacts !== want.wrapFacts) {
      problems.push(`rule 5, ${name}: ${have.wrapFacts} wrapper-only facts and the fixture pins ${want.wrapFacts}`);
    }
    // Rule 2: no decoy yields a fact under its target rule.
    for (const d of want.decoys) {
      const hit = have.facts.find((f) => f.file === d.file && f.line === d.line && f.rule.replace(/\+wrap$/, '') === d.rule);
      if (hit !== undefined) {
        problems.push(`rule 2, ${name}: the decoy ${d.file}:${d.line} (${d.sample}) yields "${hit.subject}" under ${hit.rule}`);
      }
    }
    // Rule 7: the vendored files, their reasons, and the control.
    if (name === 'ts-electron') {
      const reasons = Object.fromEntries(have.vendoredFiles.map((v) => [v.file, v.reason]));
      const wantVendored = { 'vendor/lib.js': 'path', '.yarn/releases/x.cjs': 'path', 'docs/jquery.min.js': 'path', 'assets/app.js': 'bytes' };
      for (const [file, half] of Object.entries(wantVendored)) {
        const r = reasons[file];
        if (typeof r !== 'string' || !r.startsWith(`${half}:`)) {
          problems.push(`rule 7: ${file} reads ${r === undefined ? 'rule-read' : `"${r}"`} and must be refused by the ${half} half`);
        }
        if (have.facts.some((f) => f.file === file)) problems.push(`rule 7: ${file} yields a fact although it is vendored`);
      }
      if (!have.facts.some((f) => f.file === 'src/app.js' && f.subject === 'HTTP GET /x')) {
        problems.push('rule 7: the control src/app.js, the same source un-minified, does not yield HTTP GET /x');
      }
      // Rule 8, the behaviour half: hostile bytes reach a subject verbatim.
      for (const subject of ['HTTP GET --upload-pack=/x', 'IPC serves $(touch /tmp/p)', 'runs --upload-pack=/x', 'refuses: $(touch /tmp/p) in a message', 'HTTP GET /x; rm -rf ~', 'IPC serves a:b/../../etc/passwd']) {
        if (!have.facts.some((f) => f.subject === subject)) problems.push(`rule 8: the hostile subject "${subject}" is not carried verbatim`);
      }
      // Rule 13: the network category.
      const net = have.facts.filter((f) => f.category === 'network');
      if (!net.some((f) => f.file === 'src/main/net.ts' && f.kind === 'client' && f.subject === 'talks to https://api.example/v1')) {
        problems.push('rule 13: fetch in src/ does not land in network/client');
      }
      if (have.facts.some((f) => f.file.startsWith('src/__tests__/') && f.category === 'network')) {
        problems.push('rule 13: a network fact landed on a test path');
      }
      // Rule 13, the fix round's refusals: the base of a URL parse, a vocabulary IRI and a URL with no host.
      for (const [needle, why] of [
        ["new URL(path, 'http://127.0.0.1')", 'the base of a URL parse'],
        ['activitystreams#Public', 'a vocabulary IRI'],
        ['elasticsearch/#', 'a URL with a fragment'],
        ['w3id.org/security/v1', 'a vocabulary host with no fragment'],
        ["'https:///path'", 'a URL with no host']
      ]) {
        const d = expected.fixtures['ts-electron'].decoys.find((x) => x.evidence.includes(needle));
        if (d !== undefined && net.some((f) => f.file === d.file && f.line === d.line)) problems.push(`rule 13: ${why} reads as a network reach (${d.evidence})`);
      }
      if (!net.some((f) => f.file === 'src/main/decoys.ts' && f.subject === 'talks to https://api.example/v2')) problems.push('rule 13: the control reach(https://api.example/v2) yields no network fact');
      // Rule 13, Phase 261 item 6 class 1: an msw handler DECLARES a route a
      // test will answer and reaches nothing, and it lives outside every test
      // path, which is why the refusal is the file naming msw. The controls
      // are the SAME receiver on both branches in a file that does not.
      const mswDecoys = expected.fixtures['ts-electron'].decoys.filter((x) => x.file === 'src/mocks/handlers.ts');
      if (mswDecoys.length !== 2) problems.push(`rule 13: the msw table names ${mswDecoys.length} decoy(s) and the fixture plants two`);
      for (const d of mswDecoys) {
        if (net.some((f) => f.file === d.file && f.line === d.line)) problems.push(`rule 13: an msw handler reads as a network reach (${d.evidence})`);
      }
      if (!net.some((f) => f.file === 'src/main/net.ts' && f.subject === 'talks to https://api.example/v3')) {
        problems.push('rule 13: the control http.get in a file that does not name msw yields no reach');
      }
      if (!net.some((f) => f.file === 'src/main/net.ts' && f.subject === 'HTTP client call')) {
        problems.push('rule 13: the control http.post in a file that does not name msw yields no client call');
      }
      const effectKinds = [...new Set(have.facts.filter((f) => f.category === 'effect').map((f) => f.kind))].sort();
      if (effectKinds.some((k) => k !== 'spawn' && k !== 'fs-write')) problems.push(`rule 13: effect holds ${effectKinds.join(', ')}`);
      // Rule 14: gate.auth and gate.refusal on their decoys.
      const auth = have.facts.filter((f) => f.rule === 'gate.auth');
      if (!auth.some((f) => f.file === 'src/main/auth.ts' && f.subject === 'auth gate authenticate')) problems.push('rule 14: authenticate(req) in src/ yields no auth gate');
      if (auth.some((f) => f.file.startsWith('src/__tests__/'))) problems.push('rule 14: an assertion about authenticate yields an auth gate');
      const refusals = have.facts.filter((f) => f.rule === 'gate.refusal');
      if (!refusals.some((f) => f.file === 'src/main/spawn.ts' && f.subject === 'refuses: no key found')) problems.push('rule 14: throw new Error in src/ yields no refusal');
      if (refusals.some((f) => f.file.startsWith('src/__tests__/'))) problems.push('rule 14: throw new Error in __tests__/ yields a refusal');
    }
    if (name === 'python') {
      // Rule 6: five decorated routes read five facts.
      const routes = have.facts.filter((f) => f.file === 'backend/app/api/routes/items.py' && f.kind === 'http-route');
      if (routes.length !== 5) problems.push(`rule 6: the python fixture's 5 @router routes read ${routes.length} facts`);
      // Rule 14: cli.arg on its decoys, and one fact per test.
      const flags = have.facts.filter((f) => f.rule === 'surface.cli.arg');
      if (!flags.some((f) => f.subject === 'CLI flag --x')) problems.push("rule 14: p.add_argument('--x') yields no flag");
      const flagDecoys = expected.fixtures.python.decoys.filter((d) => d.rule === 'surface.cli.arg');
      for (const d of flagDecoys) {
        if (flags.some((f) => f.file === d.file && f.line === d.line)) problems.push(`rule 14: ${d.evidence} yields a flag`);
      }
      const tests = have.facts.filter((f) => f.file === 'tests/test_items.py' && f.category === 'test');
      if (tests.length !== 3) problems.push(`rule 14: three python tests, one decorated, read ${tests.length} test facts (one per test is the rule)`);
      // Rule 13, Phase 261 item 6 class 2: `requests.Request(...)` BUILDS a
      // request and reaches nothing until a session sends it, the same
      // refusal Phase 257 made for Go's &http.Request{} reached by a call
      // rather than by new. The control is lower case `requests.request`,
      // which IS a reach, and it is what makes the case clause load bearing.
      const pyNet = have.facts.filter((f) => f.category === 'network');
      for (const d of expected.fixtures.python.decoys.filter((x) => x.rule === 'network.client')) {
        if (pyNet.some((f) => f.file === d.file && f.line === d.line)) problems.push(`rule 13: ${d.evidence} reads as a network reach`);
      }
      if (!pyNet.some((f) => f.file === 'src/client.py' && f.subject === 'HTTP client call')) {
        problems.push('rule 13: the control requests.request("GET", url) yields no client call');
      }
    }
    if (name === 'go') {
      const comp = have.facts.filter((f) => f.rule === 'entrypoint.composition');
      if (comp.length !== 1 || comp[0].subject !== 'composes gin.Default') {
        problems.push(`rule 14: gin.Default() beside viper/cfg/x.Default() reads ${comp.map((f) => f.subject).join(', ') || 'nothing'}`);
      }
      if (comp.some((f) => f.file.endsWith('_test.go'))) problems.push('rule 14: a composition root in _test.go reads as the program start');
      // Rule 13: a struct literal captured as a construction is not a client call.
      // ASKED OF ITS OWN LINE since Phase 261, because main.go now carries a
      // second client row on purpose: the class 3 limit two lines below.
      const reqDecoy = expected.fixtures.go.decoys.find((d) => d.evidence.includes('&http.Request{'));
      if (reqDecoy === undefined) problems.push('rule 13: the &http.Request{…} decoy is gone from the go table');
      else if (have.facts.some((f) => f.file === reqDecoy.file && f.line === reqDecoy.line && f.kind === 'client')) problems.push('rule 13: &http.Request{…} in main.go reads as an HTTP client call');
      // Rule 13, Phase 261 item 6 class 3, PINNED AS IT IS. The URL argument
      // branch fires on any callee, so an absolute URL handed to HandleFunc
      // reads as a reach the code may never make. rules-network.ts's header
      // says why every mechanical answer to it costs more than it buys; a
      // round that closes it moves this line and has to re-judge the row.
      if (!have.facts.some((f) => f.file === 'main.go' && f.subject === 'talks to https://evil.example.com/plain')) {
        problems.push('rule 13: the class 3 limit moved — an absolute URL argument on any callee no longer reads as a reach');
      }
      // Rule 14, Phase 261 item 4: NEITHER branch of surface.http.handlefunc
      // reads an absolute URL as a route, with the real route beside them.
      for (const d of expected.fixtures.go.decoys.filter((x) => x.rule === 'surface.http.handlefunc')) {
        if (have.facts.some((f) => f.file === d.file && f.line === d.line && f.rule === 'surface.http.handlefunc')) {
          problems.push(`rule 14: ${d.evidence} reads as a route`);
        }
      }
      if (!have.facts.some((f) => f.file === 'main.go' && f.subject === 'HTTP GET /v1/me')) problems.push('rule 14: the control mux.HandleFunc("GET /v1/me", me) yields no route');
      if (!have.facts.some((f) => f.file === 'main.go' && f.kind === 'listen')) problems.push('rule 13: the control http.ListenAndServe in main.go yields no listen');
      if (!have.facts.some((f) => f.file === 'main.go' && f.subject === 'CLI flag verbose')) problems.push("rule 14: flag.BoolVar(&v, \"verbose\", …) yields no flag (the pointer is args[0])");
    }
    if (name === 'rust') {
      const cli = have.facts.filter((f) => f.kind === 'cli-command');
      const spawn = have.facts.filter((f) => f.kind === 'spawn');
      if (!(cli.length === 1 && cli[0].file === 'src/cli.rs')) problems.push(`rule 14: Command::new lands as a cli-command in ${cli.map((f) => f.file).join(', ') || 'no file'}; only src/cli.rs names clap`);
      if (!spawn.some((f) => f.file === 'src/main.rs') || !spawn.some((f) => f.file === 'build.rs')) problems.push('rule 14: the std::process Command::new files do not land in effect/spawn');
      if (cli.some((f) => f.file === 'build.rs' || f.file === 'src/main.rs')) problems.push('rule 14: a spawn file grew a cli-command');
      const rustTests = have.facts.filter((f) => f.file === 'tests/a.rs' && f.category === 'test').map((f) => f.subject).sort();
      if (JSON.stringify(rustTests) !== JSON.stringify(['test fn one', 'test fn two'])) problems.push(`rule 14: tests/a.rs reads [${rustTests.join(', ')}]; #[test] fn one and #[tokio::test] fn two are one fact each and helper is none`);
    }
  }
  // Rule 5: where there is nothing, the pass buys nothing.
  if (got.fixturesOff !== undefined) {
    for (const name of ['go', 'python', 'ruby']) {
      const on = got.fixtures[name]?.facts ?? [];
      const off = got.fixturesOff[name]?.facts ?? [];
      if (JSON.stringify(on) !== JSON.stringify(off)) problems.push(`rule 5: the ${name} fixture reads differently with the pass on`);
      if ((got.fixtures[name]?.wrapFacts ?? -1) !== 0) problems.push(`rule 5: the ${name} fixture holds ${got.fixtures[name]?.wrapFacts} wrapper-only facts`);
    }
  }
}

function pinRecall(got, problems) {
  if (got.recall === undefined) return;
  const r = got.recall;
  if (r.truth < 200) problems.push(`rule 3: the baseline names ${r.truth} invoke channels, which is not this product`);
  if (r.found !== r.truth) problems.push(`rule 3: ${r.found} of ${r.truth} invoke channels read as IPC serves; missing ${r.missingList.slice(0, 5).join(', ')}`);
  if (r.extras !== 0) problems.push(`rule 3: ${r.extras} IPC serves subject(s) name no channel in the baseline: ${r.extrasList.slice(0, 5).join(', ')}`);
}

function pinSymbols(got, problems) {
  if (got.symbols === undefined) return;
  const s = got.symbols;
  if (!s.same) problems.push('rule 5: src/main/symbols/** reads differently with the pass on');
  if (s.wrapFacts !== 0) problems.push(`rule 5: src/main/symbols/** holds ${s.wrapFacts} wrapper-only facts and it has no anchor wrapper`);
  if (s.files < 10) problems.push(`rule 5: src/main/symbols/** read ${s.files} files`);
  if (got.emptyDigest !== EMPTY_DIGEST) problems.push(`rule 5: wrapperDigest(new Map()) reads ${got.emptyDigest} and the pin is ${EMPTY_DIGEST}`);
}

function pinIdentity(got, problems) {
  if (got.identity === undefined) return;
  const i = got.identity;
  if (!i.reversedSame) problems.push('rule 9: composed with the calls reversed, the bytes moved');
  if (i.facts < 5) problems.push(`rule 9: the identity file read ${i.facts} facts`);
  const src = new Set(i.src);
  const testOnly = i.test.filter((l) => !src.has(l));
  const srcOnly = i.src.filter((l) => !i.test.includes(l));
  if (testOnly.length !== 0) problems.push(`rule 9: the test path yields what src does not: ${testOnly.join(' | ')}`);
  // The three rules that refuse a test path on this file: a refusal is a
  // fixture there, and a timer in a test is the test's own clock.
  const refused = srcOnly.map((l) => l.split(' ')[0]).sort();
  if (JSON.stringify(refused) !== JSON.stringify(['gate.refusal', 'gate.refusal', 'surface.job.interval'])) {
    problems.push(`rule 9: src and test/x.test.ts differ by [${srcOnly.join(' | ')}], and the pinned difference is the two gate.refusal rows and the timer`);
  }
  if (i.oid !== PINNED_OID) problems.push(`rule 9: blobOid reads ${i.oid} and git hash-object printed ${PINNED_OID}`);
}

function pinLimits(got, problems) {
  if (got.limits === undefined) return;
  const l = got.limits;
  if (l.calls !== 20000 || l.callsTruncated !== true) problems.push(`rule 15: 20,001 calls read ${l.calls} with callsTruncated ${l.callsTruncated}`);
  if (l.bigManifestFacts !== 0) problems.push(`rule 15: a manifest over 2 MiB yields ${l.bigManifestFacts} facts`);
  if (l.smallManifestFacts !== 1) problems.push(`rule 15: the small manifest control yields ${l.smallManifestFacts} facts`);
  if (l.longSubject !== 160 || l.longFacts !== 1) problems.push(`rule 15: a 305 character subject reads ${l.longSubject} characters over ${l.longFacts} fact(s)`);
}

function pinStore(got, problems) {
  if (got.store === undefined) return;
  const s = got.store;
  if (JSON.stringify(s.categories) !== JSON.stringify(PINNED_CATEGORIES)) problems.push(`rule 10: ARCH_FACT_CATEGORIES reads ${JSON.stringify(s.categories)}`);
  if (JSON.stringify(s.kinds) !== JSON.stringify(PINNED_KINDS)) problems.push(`rule 10: ARCH_FACT_KINDS moved: ${JSON.stringify(s.kinds)}`);
  if (typeof s.refusal !== 'string' || !s.refusal.includes('arch_fact.kind') || !s.refusal.includes('barrel')) {
    problems.push(`rule 10: a kind of barrel was ${s.refusal === null ? 'ACCEPTED' : `refused as "${s.refusal}"`}, and the refusal must name arch_fact.kind`);
  }
  if (s.writtenAfterRefusal !== 0) problems.push(`rule 10: ${s.writtenAfterRefusal} row(s) were written by the refused call`);
  const b = s.boundary;
  if (!b.disjoint) problems.push('rule 10: boundaryStarts() and moduleRoots() overlap');
  if (!b.union) problems.push(`rule 10: boundaryStarts ${b.starts} + moduleRoots ${b.roots} != every boundary row ${b.all}`);
  if (b.roots < 1 || b.starts < 1) problems.push(`rule 10: the fixture holds ${b.starts} starts and ${b.roots} roots`);
  if (b.rootKinds.length !== 1 || b.rootKinds[0] !== 'module-root') problems.push(`rule 10: moduleRoots answers kinds ${b.rootKinds.join(', ')}`);
  if (b.startKinds.includes('module-root')) problems.push('rule 10: boundaryStarts answers a module-root');
  const r = s.roundTrip;
  if (JSON.stringify(r.stamp) !== JSON.stringify({ mtimeMs: 1.5, size: 9, oid: 'b'.repeat(40), wrapDigest: 'd'.repeat(64), lang: 'typescript', vendored: null, truncated: true })) {
    problems.push(`rule 16: factStamps does not round trip every column: ${JSON.stringify(r.stamp)}`);
  }
  if (JSON.stringify(r.sorted) !== JSON.stringify([2, 30])) problems.push(`rule 16: facts() reads lines ${JSON.stringify(r.sorted)}, not sorted`);
  if (r.prunedFirst !== 0 || r.keptForR2 !== 2 || r.declsKept !== 1) problems.push(`rule 16: with one repository still linking, prune removed ${r.prunedFirst} and the other repository reads ${r.keptForR2} facts and ${r.declsKept} wrapper file(s)`);
  if (r.prunedSecond !== 3 || !r.gone) problems.push(`rule 16: with nothing linking, prune removed ${r.prunedSecond} row(s) and hasFactsFor reads ${!r.gone}`);
  if (r.wrapCount !== 1 || !r.wrapVia) problems.push(`rule 16: saveWrapFacts twice leaves ${r.wrapCount} row(s); it must replace`);
  if (r.counts.wrapFacts !== 1 || r.counts.byCategory.surface !== 1) problems.push(`rule 16: factCounts reads ${JSON.stringify(r.counts)}`);
}

function pinSetting(got, problems) {
  if (got.setting === undefined) return;
  const s = got.setting;
  if (s.absent !== false) problems.push('rule 12: an absent wrapperPass reads true');
  if (s.yes !== false) problems.push('rule 12: wrapperPass "yes" reads true');
  if (s.one !== false) problems.push('rule 12: wrapperPass 1 reads true');
  if (s.trueCase !== true) problems.push('rule 12: wrapperPass true reads false');
  if (s.sealSame !== true) problems.push('rule 12: the seal moves with wrapperPass, and the setting decides what one worker parses, never what runs');
  if (s.readerOn !== true || s.readerOff !== false) problems.push('rule 12: wrapperPassOn does not read the field');
}

function pin(got) {
  const problems = [];
  if (got === undefined || got.error !== undefined) return [`the probe answered ${got === undefined ? 'nothing' : got.error}`];
  pinFixtures(got, problems);
  pinRecall(got, problems);
  pinSymbols(got, problems);
  pinIdentity(got, problems);
  pinLimits(got, problems);
  pinStore(got, problems);
  pinSetting(got, problems);
  return problems;
}

// ---------------------------------------------------------------------------
// The scanners (rules 8, 10, 11, 12), each proved on planted texts.
// ---------------------------------------------------------------------------

const FORBIDDEN_SPECIFIERS = /^(node:fs|node:fs\/promises|fs|fs\/promises|node:child_process|child_process|electron|electron\/main|node:worker_threads|worker_threads|node:net|node:http|node:https)$/;
const FORBIDDEN_WORDS = [/\brunGit\b/, /\bArchGitCall\b/, /\bargv\b/, /\brequire\s*\(/, /\bchild_process\b/, /\bworker_threads\b/, /\bspawnSync?\b/, /\bexecFile\b/];

/** Every way one TypeScript text reaches a file system, a process, electron, git or an argv; [] when it is pure. */
export function purityProblems(text) {
  const out = [];
  for (const m of text.matchAll(/(?:import|export)\s[^;]*?from\s+['"]([^'"]+)['"]/g)) {
    const spec = m[1];
    if (FORBIDDEN_SPECIFIERS.test(spec) || spec.endsWith('/db') || spec === '../db' || spec.includes('argv-guard') || spec.includes('git-facts')) {
      out.push(`imports ${spec}`);
    }
  }
  const code = stripComments(text);
  for (const re of FORBIDDEN_WORDS) {
    const m = re.exec(code);
    if (m !== null) out.push(`names ${m[0]}`);
  }
  return out;
}

/** Every SQL string in db.ts that names 'boundary' without a kind predicate; [] when none. */
export function boundarySqlProblems(source) {
  const out = [];
  const code = stripCommentsKeepStrings(source);
  for (const m of code.matchAll(/`([^`]*)`/g)) {
    const sql = m[1];
    if (!sql.includes("'boundary'")) continue;
    if (!/\bkind\b/.test(sql)) out.push(sql.replace(/\s+/g, ' ').trim().slice(0, 120));
  }
  return out;
}

/** Comments removed, strings kept, so a SQL template can be read. */
function stripCommentsKeepStrings(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
}

function scanDir(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') out.push(...scanDir(p));
    } else if (entry.name.endsWith('.ts')) out.push(p);
  }
  return out.sort();
}

function proveScanners() {
  const purityPlants = [
    ["import { spawn } from 'node:child_process';\nexport const x = spawn;", true],
    ['export function f(x: string) { return runGit(x); }', true],
    ["export const fs = require('fs');", true],
    ["import { app } from 'electron';\nexport const a = app;", true],
    ['// spawns nothing, names no argv, reads no file\nexport const n = 1;', false],
    ["import { createHash } from 'node:crypto';\nexport const h = createHash('sha1');", false]
  ];
  let caught = 0;
  for (const [text, mustFail] of purityPlants) {
    const red = purityProblems(text).length > 0;
    if (red !== mustFail) fail(`rule 8: the purity scanner read a planted text ${red ? 'red' : 'green'} and it must be ${mustFail ? 'red' : 'green'}: ${text.split('\n')[0]}`);
    if (mustFail && red) caught += 1;
  }
  const sqlPlants = [
    ["const q = `SELECT 1 FROM arch_fact a WHERE a.category = 'boundary' AND a.kind IN (?)`;", false],
    ["const q = `SELECT 1 FROM arch_fact a WHERE a.category = 'boundary'`;", true],
    ["// the union of 'boundary' rows is never read\nconst q = `SELECT 1 FROM arch_fact WHERE kind = ?`;", false]
  ];
  let sqlCaught = 0;
  for (const [text, mustFail] of sqlPlants) {
    const red = boundarySqlProblems(text).length > 0;
    if (red !== mustFail) fail(`rule 10: the SQL scanner read a plant ${red ? 'red' : 'green'} and it must be ${mustFail ? 'red' : 'green'}: ${text.slice(0, 60)}`);
    if (mustFail && red) sqlCaught += 1;
  }
  say(`${TAG} rule 8: the purity scanner is proved on ${purityPlants.length} plants, ${caught} of 4 that must fail caught; rule 10: the SQL scanner on ${sqlPlants.length} plants, ${sqlCaught} of 1 caught`);
}

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------

const started = Date.now();
// INSIDE the repository rather than under tmpdir, because an ablated copy of
// src/main still imports `web-tree-sitter` and `better-sqlite3` by name, and
// node resolves a bare name by walking UP from the importing file; a copy
// under /tmp never reaches this repository's node_modules. `.p238-accept-*`
// at the root is the precedent, and .gitignore keeps the directory out of
// the tree. Removed in the finally below whatever happened.
const scratch = mkdtempSync(join(repoRoot, '.p257-conformance-'));
try {
  // Rule 2, the pins on the sample.
  for (const [rel, sha] of Object.entries(PINNED_SHA)) {
    const have = createHash('sha256').update(readFileSync(join(repoRoot, rel))).digest('hex');
    if (have !== sha) fail(`rule 2: ${rel} reads sha256 ${have} and the pin is ${sha}; the hand judgments are a measurement and do not move`);
  }
  const hand = JSON.parse(readFileSync(join(repoRoot, 'build/p256/det/hand-precision.json'), 'utf8'));
  say(`${TAG} rule 2: ${Object.keys(hand.judgments).length} hand judgments pinned; the judging rule reads: ${String(hand._method).slice(0, 140)}…`);
  for (const rule of expected.fixFirst) {
    const decoys = FIXTURES.flatMap((n) => expected.fixtures[n].decoys.filter((d) => d.rule === rule));
    const fromSample = decoys.filter((d) => /^[a-z-]+\/[a-z]+\/\d/.test(d.sample));
    if (fromSample.length < 2) fail(`rule 2: ${rule} is FIX FIRST and carries ${fromSample.length} decoy(s) from the sample's own rows; two are the floor`);
    say(`${TAG} rule 2: ${rule}: ${decoys.length} decoys, ${fromSample.length} from the sample (${[...new Set(fromSample.map((d) => d.sample.split(' ')[0]))].join(', ')})`);
  }

  // The probe over the shipping tree and every ablated copy, ONE process.
  const roots = [{ name: 'shipping', root: join(repoRoot, 'src'), arms: ['fixtures', 'recall', 'symbols', 'identity', 'limits', 'store', 'setting'] }];
  for (const [i, edit] of ABLATIONS.entries()) {
    roots.push({ name: `ablation-${i}`, root: ablatedCopy(join(scratch, `ablation-${i}`), edit), arms: edit.arms });
  }
  const t0 = Date.now();
  const answers = runProbe(roots, scratch);
  say(`${TAG} ran the shipping tree and ${ABLATIONS.length} ablated copies in ${Date.now() - t0} ms`);

  const shipping = answers.shipping;
  const problems = pin(shipping);
  for (const p of problems) fail(p);
  if (shipping !== undefined && shipping.error === undefined) {
    // Rule 1, the table.
    say(`${TAG} rule 1: fixture | tracked | rule-read | manifests | vendored | entry | bound | surf | store | effect | net | gate | test | +wrap`);
    for (const name of FIXTURES) {
      const f = shipping.fixtures[name];
      const c = f.counts.byCategory;
      say(
        `${TAG} rule 1: ${name} | ${f.counts.tracked} | ${f.counts.parsed} | ${f.counts.manifests} | ${f.counts.vendored} | ${c.entrypoint} | ${c.boundary} | ${c.surface} | ${c.store} | ${c.effect} | ${c.network} | ${c.gate} | ${c.test} | ${f.wrapFacts}`
      );
    }
    // Rule 2, the dropped rules have no id.
    const ids = new Set(shipping.ruleIds);
    for (const dropped of expected.dropped) {
      if (ids.has(dropped)) fail(`rule 2: ${dropped} was dropped by the port and is back in the table`);
    }
    say(`${TAG} rule 2: ${shipping.ruleIds.length} rule ids in the table, none of the ${expected.dropped.length} dropped ones`);
    const r = shipping.recall;
    say(`${TAG} rule 3: ${r.found} of ${r.truth} invoke channels (read from the baseline) as IPC serves, ${r.extras} extras, over ${r.files} files, ${r.parsed} parsed, ${r.wrapperMap} wrappers closed from ${r.wrapperCandidates} candidates, ${r.wrapFacts} wrapper-only facts, ${r.ms} ms`);
    say(`${TAG} rule 5: src/main/symbols/** ${shipping.symbols.files} files read the same on and off (${shipping.symbols.on} facts, ${shipping.symbols.wrapFacts} wrapper-only); the empty digest is ${shipping.emptyDigest.slice(0, 12)}…`);
    say(`${TAG} rule 9: reversed calls give the same bytes; test/x.test.ts drops exactly the two gate.refusal rows and the timer; blobOid ${shipping.identity.oid}`);
    say(`${TAG} rule 10: barrel refused as "${String(shipping.store.refusal).slice(0, 90)}"; boundaryStarts ${shipping.store.boundary.starts} (${shipping.store.boundary.startKinds.join(', ')}) and moduleRoots ${shipping.store.boundary.roots} are disjoint and complete`);
    say(`${TAG} rule 12: absent ${shipping.setting.absent}, "yes" ${shipping.setting.yes}, true ${shipping.setting.trueCase}, seal unmoved ${shipping.setting.sealSame}`);
    say(`${TAG} rule 15: ${shipping.limits.calls} calls with callsTruncated ${shipping.limits.callsTruncated}; a 2 MiB manifest yields ${shipping.limits.bigManifestFacts}; a 305 character subject is cut to ${shipping.limits.longSubject}`);
    say(`${TAG} rule 16: prune ${shipping.store.roundTrip.prunedFirst} then ${shipping.store.roundTrip.prunedSecond}, wrap facts replaced to ${shipping.store.roundTrip.wrapCount}`);
  }

  // Rule 4 and every other ablation: the copy must run, and the named pin must go red.
  for (const [i, edit] of ABLATIONS.entries()) {
    const answer = answers[`ablation-${i}`];
    let red;
    if (edit.red === 'rule 8') {
      red = purityProblems(readFileSync(join(scratch, `ablation-${i}`, edit.file), 'utf8')).map((p) => `rule 8: oid.ts ${p}`);
    } else {
      if (answer === undefined || answer.error !== undefined) {
        fail(`with ${edit.name} ablated, the copy did not run: ${(answer?.error ?? 'no answer').slice(0, 300)}`);
        continue;
      }
      red = pin(answer).filter((p) => p.startsWith(edit.red));
      if (edit.direction !== undefined && !edit.direction(answer)) {
        fail(`with ${edit.name} ablated, ${edit.red} did not move in the measured direction (${JSON.stringify(answer.recall ?? answer.fixtures?.['ts-electron']?.wrapFacts).slice(0, 200)})`);
      }
    }
    if (red.length === 0) {
      fail(`with ${edit.name} ablated, ${edit.red} still passed, so the pin cannot fail`);
    } else {
      say(`${TAG} ablation: with ${edit.name} ablated, ${red.length} pin(s) of ${edit.red} went red, the first being: ${red[0].slice(0, 150)}`);
    }
  }

  // Rule 8, the scan half, over the shipping domain.
  proveScanners();
  const factsDir = join(repoRoot, 'src', 'main', 'arch', 'facts');
  for (const file of scanDir(factsDir)) {
    for (const p of purityProblems(readFileSync(file, 'utf8'))) fail(`rule 8: ${file.slice(repoRoot.length + 1)} ${p}; the domain is pure and its one node: import is node:crypto in oid.ts`);
  }
  const treeFacts = readFileSync(join(repoRoot, 'src', 'main', 'arch', 'tree-facts.ts'), 'utf8');
  for (const word of ['child_process', 'runGit', 'ArchGitCall']) {
    if (stripComments(treeFacts).includes(word)) fail(`rule 8: src/main/arch/tree-facts.ts names ${word}`);
  }
  const guard = readFileSync(join(repoRoot, 'src', 'main', 'arch', 'argv-guard.ts'), 'utf8');
  const wordsText = /ARCH_ARGV_WORDS: readonly string\[\] = \[([\s\S]*?)\];/.exec(guard);
  const words = wordsText === null ? [] : [...wordsText[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  if (JSON.stringify(words) !== JSON.stringify(PINNED_WORDS)) {
    fail(`rule 8: ARCH_ARGV_WORDS reads ${JSON.stringify(words)} and the twelve pinned words are ${JSON.stringify(PINNED_WORDS)}; the fact base needs no word of its own`);
  }
  say(`${TAG} rule 8: ${scanDir(factsDir).length} files under src/main/arch/facts/ are pure, tree-facts.ts names no process, ARCH_ARGV_WORDS is the twelve`);

  // Rule 10, the SQL scan.
  const dbSource = readFileSync(join(repoRoot, 'src', 'main', 'arch', 'db.ts'), 'utf8');
  for (const p of boundarySqlProblems(dbSource)) fail(`rule 10: src/main/arch/db.ts names 'boundary' in SQL with no kind predicate: ${p}`);

  // Rule 11.
  const watcher = spawnSync(process.execPath, ['build/conformance-watcher.mjs'], { encoding: 'utf8', cwd: repoRoot });
  if (watcher.status !== 0) fail(`rule 11: conformance:watcher failed: ${(watcher.stderr || watcher.stdout).slice(0, 300)}`);
  for (const file of [...scanDir(factsDir), join(repoRoot, 'src', 'main', 'arch', 'tree-facts.ts')]) {
    if (stripComments(readFileSync(file, 'utf8')).includes('subscribe(')) fail(`rule 11: ${file.slice(repoRoot.length + 1)} names subscribe(`);
  }
  say(`${TAG} rule 11: conformance:watcher passed and the domain names no subscribe(`);

  // Rule 12, the one reader.
  for (const file of scanDir(factsDir)) {
    if (file.endsWith('wrapper-setting.ts')) continue;
    if (/\bwrapperPass\b/.test(stripComments(readFileSync(file, 'utf8')))) fail(`rule 12: ${file.slice(repoRoot.length + 1)} reads wrapperPass, and wrapper-setting.ts is the one reader`);
  }

  // Rule 17.
  const pkg = readFileSync(join(repoRoot, 'package.json'), 'utf8');
  const checks = readFileSync(join(repoRoot, 'build/verification-checks.mjs'), 'utf8');
  if (!pkg.includes('"conformance:facts"')) fail('rule 17: package.json does not name conformance:facts');
  if (!pkg.includes('"probe:p257"')) fail('rule 17: package.json does not name probe:p257');
  if (!checks.includes("pure('conformance:facts')")) fail('rule 17: build/verification-checks.mjs does not classify conformance:facts as pure');
  if (!checks.includes("electron('probe:p257')")) fail('rule 17: build/verification-checks.mjs does not classify probe:p257 as an electron harness');
  // The same two questions assert-electron-teardown.mjs's usesHelper() asks,
  // composed so this file's own text does not read as a helper user or as a
  // launch to that gate's scanner (its comment on NOT_A_HELPER_USER is why).
  const probeSource = stripComments(readFileSync(join(repoRoot, 'build/p257/probe-p257-facts.mjs'), 'utf8'));
  const helperImport = new RegExp(['from\\s+[\'"](?:\\.\\.?\\/)+', 'electron', '-run\\.mjs[\'"]'].join(''));
  const helperCall = new RegExp(['\\b(with', 'Electron|run', 'Electron)\\s*\\('].join(''));
  if (!helperImport.test(probeSource) || !helperCall.test(probeSource)) fail('rule 17: build/p257/probe-p257-facts.mjs does not reach the electron run helper');
  const teardownSource = readFileSync(join(repoRoot, 'build', ['assert-', 'electron', '-teardown.mjs'].join('')), 'utf8');
  const floor = teardownSource.match(/const HELPER_USER_FLOOR = (\d+);/);
  if (floor === null || Number(floor[1]) < 125) fail(`rule 17: HELPER_USER_FLOOR reads ${floor?.[1] ?? 'nothing'} and the p257 probe raised it to at least 125`);
  say(`${TAG} rule 17: the gate and the probe are named, classified, and the probe reaches the run helper (floor ${floor?.[1]})`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

if (failures.length > 0) {
  for (const f of failures) process.stderr.write(`${TAG} FAIL: ${f}\n`);
  process.exit(1);
}
say(
  `${TAG} OK: eight fixtures byte for byte, the sample pinned with its decoys, the baseline's invoke channels all read with 0 extras, ` +
    `${ABLATIONS.length} ablations each red, the domain pure and the argv words the twelve, in ${Date.now() - started} ms`
);
