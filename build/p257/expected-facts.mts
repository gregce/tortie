/**
 * The writer of build/fixtures/facts/expected.json (Phase 257).
 *
 *   tsx build/p257/expected-facts.mts            prints what it would write and the diff line count
 *   tsx build/p257/expected-facts.mts --write    rewrites expected.json
 *
 * The pinned file is what the SHIPPING reader answers over the eight
 * fixtures, PLUS three things that are knowledge rather than output and live
 * here so they survive: the DECOY TABLE, being every planted line taken from
 * the hand sample's own false rows (build/p256/det/hand-precision.json) with
 * its sample id, or from the spec's own shapes; the OVERRIDES, being the rows
 * where the reader's current answer is NOT the expectation, so the gate stays
 * red on them until the rule is fixed; and the dropped and fixed rule lists.
 *
 * REGENERATING IS NOT REVIEWING. A rule that moves moves this file, and the
 * diff is read line by line before it is committed: a new fact is either a
 * known true, a decoy that must be added to the table with its reason, or a
 * defect. `npm run conformance:facts` rule 1 is the check; this is the pen.
 * It reads the fixtures with node:fs and spawns nothing.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { grammarFor } from '../../src/main/symbols/languages';
import { grammarPath, runtimeWasmPath } from '../../src/main/symbols/paths';
import { SymbolExtractor } from '../../src/main/symbols/extract';
import * as facts from '../../src/main/arch/facts/index';
import { countByCategory, readTree, walkFiles, type DriverFact } from './facts-driver.mts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const fixturesDir = join(repoRoot, 'build', 'fixtures', 'facts');
const FIXTURES = ['ts-electron', 'ts-next', 'python', 'go', 'rust', 'ruby', 'swift', 'manifests'] as const;

/** Rows the reader still answers and the expectation refuses. The gate is red on these until the rule is fixed. */
const OVERRIDES: { fixture: string; file: string; line: number; rule: string; why: string }[] = [
  {
    fixture: 'ts-electron',
    file: 'src/main/consumers.ts',
    line: 6,
    rule: 'surface.ipc.electron+wrap',
    why: 'a receiver written as a call, $(window).on(...), is not a bare call and must not unwrap (clause 1; alamofire/surface/0)'
  },
  {
    fixture: 'ruby',
    file: 'spec/x_spec.rb',
    line: 9,
    rule: 'gate.auth',
    why: "expect(subject).to_not permit(alice, john) is an assertion ABOUT a policy, the sample's mastodon/gate/5 (t)"
  }
];

/** [file, a substring found on exactly one line, the rule it must not fire under, the sample id or the spec's own reason]. */
const DECOYS: Record<(typeof FIXTURES)[number], [string, string, string, string][]> = {
  'ts-electron': [
    ['src/main/consumers.ts', "sock.on('data'", 'surface.handler.on', 'spec §1.1 (the bare-call decoy)'],
    ['src/main/consumers.ts', "$(window).on('hashchange'", 'surface.handler.on', 'alamofire/surface/0'],
    ['src/main/consumers.ts', 'this.$input.on("input.tt"', 'surface.handler.on', 'alamofire/surface/2'],
    ['src/main/decoys.ts', 'Object.create(null)', 'store.orm', 'spec §1.1 (fastapi-app, 8 of 12 sampled)'],
    ['src/main/decoys.ts', 'LOADING_CJS_FILES.delete(filepath)', 'store.orm', 'babel/store/2'],
    ['src/main/decoys.ts', 'Foo.update(f)', 'store.orm', 'babel/store/3'],
    ['src/__tests__/auth.test.ts', 'expect(authenticate).toHaveBeenCalled()', 'gate.auth', "spec §1.1 (the assertion shape of the sample's m rows)"],
    ['src/__tests__/auth.test.ts', 'expect(page).toBeAuthorized()', 'gate.auth', 'not in the sample: the witness for the assertion-receiver ablation'],
    ['src/__tests__/auth.test.ts', "throw new Error('no key found')", 'gate.refusal', 'spec §1.1 (a raise in a test is a fixture)'],
    ['src/__tests__/auth.test.ts', "await fetch('https://api.example/v1')", 'network.client', 'spec §5 rule 13'],
    ['src/__tests__/auth.test.ts', 'SymbolExtractor.create({', 'store.orm', 'tortie/store/5'],
    ['.github/workflows/ci.yml', '  push:', 'entrypoint.ci.job', 'spec §1.4 (a trigger under on: is not a job)'],
    ['.github/workflows/ci.yml', '  pull_request:', 'entrypoint.ci.job', 'spec §1.4'],
    // The fix round's clauses, one line each; the gate's ablations turn each red.
    ['src/main/decoys.ts', 'write(buf);', 'effect.fs.write', 'fix round H13 (a bare write( is not a filesystem write)'],
    ['src/main/decoys.ts', "app.get('https://api.example/v1/users', h);", 'surface.http.method-call', 'fix round H3 (an absolute URL is a client call, never a route)'],
    ['src/main/decoys.ts', "app.get('/aaaa", 'surface.http.method-call', 'fix round H11 (a path over 200 characters is not a route)'],
    ['src/main/decoys.ts', 'app.get(`/multi', 'surface.http.method-call', 'fix round (a real line break inside a route is not a route)'],
    ['src/main/decoys.ts', 'throw new Error();', 'gate.refusal', 'fix round H14 (no message, no refusal)'],
    ['src/main/decoys.ts', 'process.env.OK', 'gate.env-read', 'fix round H15 (a two character name is not a switch)'],
    ['src/main/decoys.ts', "log('update check failed');", 'store.sql', "fix round (tortie's own prose beginning with a verb, ~65 of 244)"],
    ['src/main/decoys.ts', "fail('Update password successfully');", 'store.sql', "fix round (fastapi's test name)"],
    ['src/main/decoys.ts', "new URL(path, 'http://127.0.0.1');", 'network.client', 'fix round (the base of a URL parse reaches nothing)'],
    ['src/main/decoys.ts', 'activitystreams#Public', 'network.client', 'fix round (a vocabulary IRI, 136 of mastodon\'s 367)'],
    ['src/main/decoys.ts', 'elasticsearch/#', 'network.client', 'fix round (a fragment is never sent on the wire; only the fragment clause refuses this one)'],
    ['src/main/decoys.ts', 'w3id.org/security/v1', 'network.client', 'fix round (a vocabulary host with no fragment; only the host clause refuses this one)'],
    ['src/main/decoys.ts', "fetchIt('https:///path');", 'network.client', 'fix round (no host)'],
    ['src/main/late-nul.ts', 'LATE_NUL_SECRET', 'gate.env-read', 'fix round (a NUL at byte 8,100 is a binary to every reader)'],
    // Phase 261 item 6, class 1: the msw handlers, which live outside every test path.
    ['src/mocks/handlers.ts', "http.get('https://api.example/v1/users'", 'network.client', 'Phase 261 item 6 (an msw handler declares a route a test will answer and reaches nothing)'],
    ['src/mocks/handlers.ts', "http.post('/local'", 'network.client', 'Phase 261 item 6 (the receiver branch half of the same handler set)']
  ],
  'ts-next': [],
  python: [
    ['tests/test_items.py', 'authenticated_user.hashed_password.startswith', 'gate.auth', 'fastapi-app/gate/2'],
    ['tests/test_items.py', "r.request.headers['Authorization'].startswith", 'gate.auth', 'requests/gate/0'],
    ['tests/test_items.py', 'requests.get("https://example.test/items")', 'network.client', 'spec §1.1 (a literal URL in a test is a fixture)'],
    ['cli.py', 'arr.flag(1)', 'surface.cli.arg', 'spec §1.1 (the x.flag(1) shape)'],
    ['cli.py', 'cache.option("k")', 'surface.cli.arg', "spec §1.1 (the map.option('k') shape)"],
    ['pyproject.toml', 'y = "a:b"', 'entrypoint.py.script', 'spec §1.4 (outside a scripts table)'],
    // Phase 261 item 6, class 2: a construction reached by a call rather than by new.
    ['src/client.py', 'requests.Request("GET", url)', 'network.client', 'Phase 261 item 6 (a Request is built here and reaches nothing until a session sends it)']
  ],
  go: [
    ['main.go', 'viper.Default()', 'entrypoint.composition', "spec §1.1 (gotify's shape)"],
    ['main.go', 'cfg.Default()', 'entrypoint.composition', 'spec §1.1'],
    ['main.go', 'x.Default()', 'entrypoint.composition', 'spec §1.1'],
    ['run.go', 'app := &model.Application{ID: 1}', 'entrypoint.composition', 'gotify/entrypoint/4'],
    ['router/router_test.go', 't.Fatal("boom here")', 'gate.refusal', 'spec §1.1 (a fatal in a test)'],
    ['router/router_test.go', "file with key 'file' must be present", 'gate.refusal', 'gotify/gate/0'],
    ['router/router_test.go', 'this reader cannot be read', 'gate.refusal', 'gotify/gate/3'],
    ['router/router_test.go', 'errors.New("test error")', 'gate.refusal', 'gotify/gate/4'],
    ['router/router_test.go', 't.Fatalf("put: %v"', 'gate.refusal', 'stoa/gate/1'],
    ['router/router_test.go', 'http://go.example.com', 'network.client', 'gotify/effect/1'],
    ['router/router_test.go', 'expected := &model.Application{ID: 2}', 'entrypoint.composition', 'gotify/entrypoint/1'],
    ['router/router.go', 'client.Get(url)', 'surface.http.method-call', 'spec §1.1 (a client receiver)'],
    ['router/router.go', 'update plugin conf failed', 'store.sql', "fix round (gotify's error message beginning with a verb)"],
    ['main.go', '&http.Request{Method: "GET"}', 'network.client', "fix round (a struct literal captured as new, 25 of miniflux's 48)"],
    ['router/router_test.go', 'http.NewServeMux()', 'entrypoint.composition', "fix round (a composition root in _test.go, 2 of miniflux's 7)"],
    // Phase 261 item 4: BOTH branches of surface.http.handlefunc, which is the half the entry's summary did not name.
    ['main.go', 'mux.HandleFunc("GET https://evil.example.com/abs", h)', 'surface.http.handlefunc', 'Phase 261 item 4 (an absolute URL inside the Go 1.22 method pattern is not a route)'],
    ['main.go', 'mux.HandleFunc("https://evil.example.com/plain", h)', 'surface.http.handlefunc', 'Phase 261 item 4 (the plain branch is affected too)']
  ],
  rust: [
    ['build.rs', 'Command::new("git").args(args).output()', 'surface.cli.clap', 'ripgrep/surface/2'],
    ['src/main.rs', 'std::process::Command::new("git")', 'surface.cli.clap', 'ripgrep/surface/2 (the qualified shape)'],
    ['tests/util.rs', 'Command::new(program).arg("--help")', 'surface.cli.arg', 'ripgrep/surface/3'],
    ['tests/util.rs', 'cmd.arg("--path-separator").arg("/")', 'surface.cli.arg', 'ripgrep/surface/4 and /5'],
    ['tests/a.rs', 'fn helper()', 'test.rust.fn', 'spec §1.2 (no attribute above it)'],
    ['src/net.rs', 'let regex = RegexBuilder::new(pattern)', 'gate.auth', 'ripgrep/gate/2'],
    ['tests/a.rs', 'fn cfg_helper()', 'test.rust.fn', 'fix round H10 (#[cfg(test)] marks a module, not a test)']
  ],
  ruby: [
    ['spec/x_spec.rb', 'stub_request(:get, "https://example.com/x")', 'network.client', 'spec §1.1'],
    ['spec/x_spec.rb', 'featured_collection_url', 'network.client', 'mastodon/effect/2'],
    ['spec/x_spec.rb', "a_request(:get, 'https://example.com/alice')", 'network.client', 'mastodon/effect/4'],
    ['spec/x_spec.rb', 'expect(subject).to_not permit(alice, john)', 'gate.auth', 'mastodon/gate/5'],
    ['app/models/u.rb', 'Model.create!(name: "x")', 'store.orm', 'spec §1.1 (the Rails bang form, not measured)'],
    ['lib/run.rb', "ENV.fetch('API_KEY')", 'network.client', "fix round (ENV.fetch read as a bare fetch was 195 of mastodon's 365)"],
    ['lib/run.rb', "Rails.cache.fetch('c')", 'network.client', 'fix round (Hash#fetch on a receiver)']
  ],
  swift: [['Tests/KitTests/KitTests.swift', 'URL(string: "https://example.com/image.jpg")', 'network.client', 'alamofire/effect/5']],
  manifests: [
    ['compose.yaml', '  data:', 'boundary.compose.service', 'spec §5.1 (a top level volumes: key)'],
    ['docs/Dockerfile.md', 'ENTRYPOINT ["node", "server.js"]', 'entrypoint.docker.cmd', 'fix round (a Dockerfile.<suffix> that does not open as one)'],
    ['docs/Dockerfile.md', 'EXPOSE 8080', 'surface.docker.expose', 'fix round'],
    ['docs/migrations/guide.md', '# Migrations', 'store.path.migration', 'fix round (a migration directory entry with no migration extension)'],
    ['docs/migrations/guide.md', 'CREATE TABLE guide', 'store.sql.file', 'fix round']
  ]
};

const DROPPED = [
  'store.orm',
  'surface.handler.on',
  'gate.refusal-guard',
  'effect.net.client',
  'effect.net.listen',
  'entrypoint.jvm.main',
  'entrypoint.objc.main',
  'entrypoint.php.main',
  'test.jvm.class',
  'test.php.method',
  'entrypoint.android.component',
  'entrypoint.android.launcher',
  'entrypoint.jvm.mainclass',
  'entrypoint.android.appid',
  'entrypoint.dotnet.exe',
  'decl.symbol'
];
const FIX_FIRST = ['surface.cli.arg', 'surface.cli.clap', 'network.client', 'gate.auth', 'gate.refusal', 'entrypoint.composition'];

function lineOf(fixture: string, file: string, needle: string): { line: number; evidence: string } {
  const lines = readFileSync(join(fixturesDir, fixture, file), 'utf8').split('\n');
  const hits = lines.map((l, i) => (l.includes(needle) ? i + 1 : 0)).filter((n) => n > 0);
  if (hits.length !== 1) throw new Error(`${fixture}/${file}: "${needle}" is on ${hits.length} lines, and a decoy names one`);
  return { line: hits[0]!, evidence: lines[hits[0]! - 1]!.trim().slice(0, 200) };
}

const extractor = await SymbolExtractor.create({ runtimeWasm: runtimeWasmPath(), grammarPath });
const out: Record<string, unknown> = {
  _note:
    "Phase 257. What the SHIPPING reader answers over build/fixtures/facts/*, pinned byte for byte by npm run conformance:facts rule 1. Every planted line is a known true, a decoy from the hand sample's own false rows (build/p256/det/hand-precision.json) marked with its sample id, or a control. A decoy yields no fact under its target rule. Two rows below are the TRUE expectation where the first port still answered a fact, and _overrides names them. Written by build/p257/expected-facts.mts and reviewed line by line.",
  _overrides: OVERRIDES,
  dropped: DROPPED,
  fixFirst: FIX_FIRST,
  fixtures: {}
};
try {
  for (const name of FIXTURES) {
    const root = join(fixturesDir, name);
    const r = await readTree({ root, files: walkFiles(root), facts, extractor, grammarFor, wrapperPass: true });
    const kept: DriverFact[] = [];
    const removed: string[] = [];
    for (const f of r.facts) {
      const o = OVERRIDES.find((x) => x.fixture === name && x.file === f.file && x.line === f.line && x.rule === f.rule);
      if (o !== undefined) removed.push(`${name} ${f.file}:${f.line} ${f.subject}`);
      else kept.push(f);
    }
    (out['fixtures'] as Record<string, unknown>)[name] = {
      counts: {
        tracked: r.links.length,
        parsed: r.parsed,
        manifests: r.manifests,
        pathOnly: r.pathOnly,
        vendored: r.vendored,
        truncated: r.truncated,
        unread: r.unread,
        byCategory: countByCategory(kept)
      },
      wrapFacts: kept.filter((f) => f.viaWrapper).length,
      vendored: r.links.filter((l) => l.vendored !== null).map((l) => ({ file: l.relPath, reason: l.vendored })),
      decoys: DECOYS[name].map(([file, needle, rule, sample]) => ({ file, ...lineOf(name, file, needle), rule, sample })).map((d) => ({ file: d.file, line: d.line, rule: d.rule, sample: d.sample, evidence: d.evidence })),
      facts: kept
    };
    for (const line of removed) process.stderr.write(`[expected-facts] override applied: ${line}\n`);
  }
} finally {
  extractor.dispose();
}
const text = `${JSON.stringify(out, null, 1)}\n`;
const target = join(fixturesDir, 'expected.json');
let before = '';
try {
  before = readFileSync(target, 'utf8');
} catch {
  before = '';
}
const changed = before === text ? 0 : text.split('\n').filter((l, i) => before.split('\n')[i] !== l).length;
if (process.argv.includes('--write')) {
  writeFileSync(target, text);
  console.log(`[expected-facts] wrote ${target}: ${changed === 0 ? 'byte identical to what was there' : `${changed} line(s) moved; review the diff before committing`}`);
} else {
  console.log(`[expected-facts] ${changed === 0 ? 'expected.json is byte identical to what the reader answers' : `${changed} line(s) would move; run with --write and review the diff`}`);
  process.exit(changed === 0 ? 0 : 1);
}
