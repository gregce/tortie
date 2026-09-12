/**
 * The closed call rule table (Phase 257), one family at a time, with the
 * FIX FIRST rules driven on the hand sample's own false rows and the DROPPED
 * rules proved absent. Every site here is what the worker would hand over
 * for the quoted line, split by the worker's own `splitCallee`.
 */

import { describe, expect, it } from 'vitest';
import { ARCH_FACT_CATEGORIES, ARCH_FACT_KINDS } from '@shared/arch';
import { applyCallRules, CALL_RULES } from '../rules';
import { LINE_RULES } from '../line-rules';
import { ctx, site } from './site';

const TS = ctx('src/main/ipc.ts', 'typescript');
const LINES = ['line one', 'line two'];

function subjects(sites: Parameters<typeof applyCallRules>[0], c = TS): string[] {
  return applyCallRules(sites, c, LINES).map((f) => `${f.category}/${f.kind} ${f.subject}`);
}

describe('the table itself', () => {
  it('names only the eight categories and a kind each category lists', () => {
    for (const r of [...CALL_RULES, ...LINE_RULES]) {
      expect(ARCH_FACT_CATEGORIES).toContain(r.category);
      expect(ARCH_FACT_KINDS[r.category], `${r.id} kind ${r.kind}`).toContain(r.kind);
    }
  });

  it('has one id per rule', () => {
    const ids = [...CALL_RULES, ...LINE_RULES].map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('holds NO dropped rule, and no rule for an unexercised grammar', () => {
    const ids = new Set([...CALL_RULES, ...LINE_RULES].map((r) => r.id));
    for (const dropped of [
      'store.orm',
      'surface.handler.on',
      'gate.refusal-guard',
      'entrypoint.jvm.main',
      'entrypoint.objc.main',
      'entrypoint.php.main',
      'test.jvm.class',
      'test.php.method',
      'effect.net.client',
      'effect.net.listen'
    ]) {
      expect(ids.has(dropped), dropped).toBe(false);
    }
    for (const r of [...CALL_RULES, ...LINE_RULES]) {
      if (r.langs === '*') continue;
      for (const g of r.langs) expect(['java', 'php', 'c-sharp', 'kotlin', 'objc'], `${r.id}`).not.toContain(g);
    }
  });
});

describe('surface: http routes', () => {
  it('reads a route with a path and a handler, and refuses a client call', () => {
    expect(subjects([site('app.get', ['/users', null])])).toEqual(['surface/http-route HTTP GET /users']);
    // H3: an absolute URL with a handler is still a client call, never a route (the URL lands in network).
    expect(subjects([site('app.get', ['https://api.example/v1', null])])).toEqual(['network/client talks to https://api.example/v1']);
    // H11 and the control character refusal: over 200 characters, or a real line break, is not a route.
    expect(subjects([site('app.get', [`/${'a'.repeat(200)}`, null])])).toEqual([]);
    expect(subjects([site('app.get', ['/multi\nline', null])])).toEqual([]);
    expect(subjects([site('app.get', ['/x; rm -rf ~', null])])).toEqual(['surface/http-route HTTP GET /x; rm -rf ~']);
    expect(subjects([site('router.post', ['/x', null])])).toEqual(['surface/http-route HTTP POST /x']);
    expect(subjects([site('axios.get', ['/users', null])])).toEqual(['network/client HTTP client call']);
    expect(subjects([site('requests.get', ['https://a/b', null])])).toEqual(['network/client talks to https://a/b']);
    expect(subjects([site('app.get', ['/users'])])).toEqual([]);
  });

  it('licenses a bare mount word and an empty group root for an UPPERCASE verb (gotify)', () => {
    const go = ctx('router/router.go', 'go');
    expect(subjects([site('g.GET', ['version', null])], go)).toEqual(['surface/http-route HTTP GET version']);
    expect(subjects([site('g.POST', ['', null])], go)).toEqual(['surface/http-route HTTP POST (group root)']);
    expect(subjects([site('oidcGroup.GET', ['/x', null])], go)).toEqual(['surface/http-route HTTP GET /x']);
    expect(subjects([site('client.Get', ['/x', null])], go)).toEqual([]);
  });

  it('refuses a test path on every surface rule', () => {
    const test = ctx('src/__tests__/routes.test.ts', 'typescript');
    expect(subjects([site('app.get', ['/users', null])], test)).toEqual([]);
    expect(subjects([site('ipcMain.handle', ['a:b', null])], test)).toEqual([]);
    expect(subjects([site('program.command', ['run'])], test)).toEqual([]);
    expect(subjects([site('setInterval', [null, null])], test)).toEqual([]);
    const goTest = ctx('router/router_test.go', 'go');
    expect(subjects([site('http.HandleFunc', ['/h', null])], goTest)).toEqual([]);
  });

  it('reads HandleFunc, a python decorator, django urls and rails routes', () => {
    expect(subjects([site('http.HandleFunc', ['/h', null])], ctx('run.go', 'go'))).toEqual(['surface/http-route HTTP /h']);
    // Go 1.22's method pattern (miniflux, 167 of 177 routes).
    expect(subjects([site('mux.HandleFunc', ['GET /v1/me', null])], ctx('run.go', 'go'))).toEqual(['surface/http-route HTTP GET /v1/me']);
    expect(subjects([site('mux.Handle', ['POST /v1/entries/{id}', null])], ctx('run.go', 'go'))).toEqual(['surface/http-route HTTP POST /v1/entries/{id}']);
    expect(subjects([site('mux.HandleFunc', ['GET some words', null])], ctx('run.go', 'go'))).toEqual([]);
    const py = ctx('backend/app/api/routes/items.py', 'python');
    expect(subjects([site('router.get', ['/items/'], { form: 'decorator' })], py)).toEqual([
      'surface/http-route HTTP GET /items/'
    ]);
    expect(subjects([site('path', ['admin/', null])], ctx('site/urls.py', 'python'))).toEqual([
      'surface/http-route HTTP admin/'
    ]);
    const rb = ctx('config/routes.rb', 'ruby');
    expect(subjects([site('get', [':activity'])], rb)).toEqual(['surface/http-route HTTP GET activity']);
    expect(subjects([site('resources', [':users'])], rb)).toEqual(['surface/http-route HTTP resources users']);
    expect(subjects([site('root', ['home#index'])], rb)).toEqual(['surface/http-route HTTP root home#index']);
    expect(subjects([site('get', [':activity'])], ctx('app/models/u.rb', 'ruby'))).toEqual([]);
  });

  it('decorator form answers python only (the JVM, C# and PHP branches are gone)', () => {
    expect(subjects([site('GetMapping', ['/x'], { form: 'decorator' })], ctx('A.java' as string, 'python'))).toEqual([]);
  });
});

describe('surface: IPC', () => {
  it('reads serves, calls, the bridge and a push', () => {
    expect(subjects([site('ipcMain.handle', ['arch:map', null])])).toEqual(['surface/ipc-channel IPC serves arch:map']);
    expect(subjects([site('ipcRenderer.invoke', ['arch:map'])])).toEqual(['surface/ipc-channel IPC calls arch:map']);
    expect(subjects([site('contextBridge.exposeInMainWorld', ['gmux', null])])).toEqual([
      'surface/ipc-channel bridge exposes window.gmux'
    ]);
    expect(subjects([site('webContents.send', ['push:x', null])])).toEqual(['surface/ipc-channel IPC push push:x']);
  });

  it('carries a hostile channel name verbatim into the subject and does nothing else', () => {
    expect(subjects([site('ipcMain.handle', ['$(touch /tmp/p)', null])])).toEqual([
      'surface/ipc-channel IPC serves $(touch /tmp/p)'
    ]);
    expect(subjects([site('app.get', ['--upload-pack=/x', null])])).toEqual([
      'surface/http-route HTTP GET --upload-pack=/x'
    ]);
    expect(subjects([site('ipcMain.handle', ['a\nb', null])])).toEqual([]);
  });

  it('surface.handler.on is DROPPED: sock.on(data) is nothing', () => {
    expect(subjects([site('sock.on', ['data', null])])).toEqual([]);
    expect(subjects([site('ws.on', ['message', null])])).toEqual([]);
  });
});

describe('surface: command line (surface.cli.arg is FIXED)', () => {
  const py = ctx('cli.py', 'python');
  it('fires on argparse and commander names whatever the receiver', () => {
    expect(subjects([site('p.add_argument', ['--x'])], py)).toEqual(['surface/cli-flag CLI flag --x']);
    expect(subjects([site('p.add_argument', ['name'])], py)).toEqual(['surface/cli-flag CLI flag name']);
    expect(subjects([site('cmd.addOption', ['-v'])])).toEqual(['surface/cli-flag CLI flag -v']);
  });

  it('fires on an ambiguous verb only with a dash or a parser receiver', () => {
    expect(subjects([site('arr.flag', [null])], py)).toEqual([]);
    expect(subjects([site('map.option', ['k'])])).toEqual([]);
    expect(subjects([site('x.flag', [null])], py)).toEqual([]);
    expect(subjects([site('program.option', ['-p, --port <n>'])])).toEqual([]);
    expect(subjects([site('program.option', ['--port'])])).toEqual(['surface/cli-flag CLI flag --port']);
    expect(subjects([site('parser.arg', ['name'])], py)).toEqual(['surface/cli-flag CLI flag name']);
  });

  it("reads the first STRING argument, so pflag's pointer-first *Var names its flag (miniflux, 0 of 18 before the fix round)", () => {
    const go = ctx('main.go', 'go');
    expect(subjects([site('flag.BoolVar', [null, 'info', null, 'say more'])], go)).toEqual(['surface/cli-flag CLI flag info']);
    expect(subjects([site('flag.StringVar', [null, 'config-file', null, null])], go)).toEqual(['surface/cli-flag CLI flag config-file']);
    expect(subjects([site('flag.IntVar', [null, null, null, null])], go)).toEqual([]);
  });

  it('reads a command and a click decorator', () => {
    expect(subjects([site('program.command', ['run'])])).toEqual(['surface/cli-command CLI command run']);
    expect(subjects([site('click.command', [], { form: 'decorator' })], py)).toEqual([
      'surface/cli-command CLI command (function name)'
    ]);
  });
});

describe('rust: Command::new is clap OR std::process, decided by the file (FIXED)', () => {
  it('a file naming clap gets a command; one naming std::process gets a spawn', () => {
    const clap = ctx('src/cli.rs', 'rust', 'use clap::Command;\nfn x() { Command::new("rg"); }');
    const proc = ctx('src/main.rs', 'rust', 'use std::process::Command;\nfn x() { Command::new("git"); }');
    expect(subjects([site('Command::new', ['rg'])], clap)).toEqual(['surface/cli-command CLI command rg']);
    expect(subjects([site('Command::new', ['git'])], proc)).toEqual(['effect/spawn runs git']);
  });

  it('a file naming neither answers nothing for either; a bare call in a file naming both is ambiguous', () => {
    const neither = ctx('src/x.rs', 'rust', 'fn x() { Command::new("y"); }');
    expect(subjects([site('Command::new', ['y'])], neither)).toEqual([]);
    const both = ctx('src/b.rs', 'rust', 'use clap::Command;\nuse std::process;\nfn x() {}');
    expect(subjects([site('Command::new', ['y'])], both)).toEqual([]);
    expect(subjects([site('std::process::Command::new', ['git'])], both)).toEqual(['effect/spawn runs git']);
    expect(subjects([site('clap::Command::new', ['rg'])], both)).toEqual(['surface/cli-command CLI command rg']);
  });

  it('build.rs from the sample: no clap named, a spawn', () => {
    const build = ctx('build.rs', 'rust', 'use std::process::Command;\nlet output = Command::new("git").args(args).output();');
    expect(subjects([site('Command::new', ['git'])], build)).toEqual(['effect/spawn runs git']);
  });
});

describe('boundary and effect', () => {
  it('reads a worker, a thread, a utility process, a spawn and a filesystem write', () => {
    expect(subjects([site('Worker', [null], { form: 'new' })])).toEqual(['boundary/worker starts a Worker']);
    expect(subjects([site('utilityProcess.fork', [null])])).toEqual(['boundary/process starts a utility process']);
    expect(subjects([site('thread::spawn', [null])], ctx('src/net.rs', 'rust'))).toEqual([
      'boundary/thread starts a task on thread'
    ]);
    expect(subjects([site('child_process.spawn', ['git', null])])).toEqual(['effect/spawn runs git']);
    expect(subjects([site('spawn', ['git'])])).toEqual(['effect/spawn runs git']);
    expect(subjects([site('fs.writeFileSync', ['x'])])).toEqual(['effect/fs-write writes the filesystem (writeFileSync)']);
    expect(subjects([site('path.remove', [])])).toEqual([]);
    // H13: a BARE call is a filesystem write only in its *Sync spelling.
    expect(subjects([site('write', [null])])).toEqual([]);
    expect(subjects([site('create', ['x'])])).toEqual([]);
    expect(subjects([site('remove', ['x'])])).toEqual([]);
    expect(subjects([site('writeFileSync', ['x'])])).toEqual(['effect/fs-write writes the filesystem (writeFileSync)']);
    expect(subjects([site('subprocess.run', [null])], ctx('a.py', 'python'))).toEqual(['effect/spawn runs (computed)']);
    expect(subjects([site('exec.Command', ['git'])], ctx('run.go', 'go'))).toEqual(['effect/spawn runs git']);
    expect(subjects([site('system', ['ls'])], ctx('lib/run.rb', 'ruby'))).toEqual(['effect/spawn runs ls']);
  });

  it('effect holds spawn and fs-write only', () => {
    for (const r of CALL_RULES) {
      if (r.category === 'effect') expect(['spawn', 'fs-write']).toContain(r.kind);
    }
  });
});

describe('network (RENAMED out of effect, and the URL branch refuses a test path)', () => {
  it('lands a literal URL and a bare fetch in network/client outside a test', () => {
    expect(subjects([site('fetch', ['https://api.example'])])).toEqual(['network/client talks to https://api.example']);
    expect(subjects([site('fetch', [null])])).toEqual(['network/client HTTP client call']);
  });

  it('lands nothing for the same call in a test path', () => {
    const test = ctx('src/__tests__/net.test.ts', 'typescript');
    expect(subjects([site('fetch', ['https://api.example'])], test)).toEqual([]);
    expect(subjects([site('fetch', [null])], test)).toEqual([]);
    // The sample's own false rows.
    expect(subjects([site('stub_request', [':get', 'https://example.com/x'])], ctx('spec/x_spec.rb', 'ruby'))).toEqual([]);
    expect(subjects([site('URL', ['https://example.com/image.jpg'])], ctx('Tests/MultipartFormDataTests.swift', 'swift'))).toEqual([]);
    expect(subjects([site('req.Header.Set', ['Origin', 'http://go.example.com'])], ctx('api/stream/stream_test.go', 'go'))).toEqual([]);
  });

  it('keeps the client receiver branch in a test, because the hand method counts it', () => {
    expect(subjects([site('requests.get', [null])], ctx('tests/test_items.py', 'python'))).toEqual(['network/client HTTP client call']);
  });

  it("refuses the fix round's four false classes and keeps their controls", () => {
    // A construction on the receiver branch: Go's &http.Request{…} captured as new (25 of miniflux's 48).
    const go = ctx('main.go', 'go');
    expect(subjects([site('http.Request', [], { form: 'new' })], go)).toEqual([]);
    expect(subjects([site('http.Get', ['https://api.example/v1'])], go)).toEqual(['network/client talks to https://api.example/v1']);
    expect(subjects([site('client.Do', [null])], go)).toEqual([]);
    // The base of a URL parse reaches nothing; a parse's FIRST string is the URL the code holds.
    expect(subjects([site('URL', [null, 'http://127.0.0.1'], { form: 'new' })])).toEqual([]);
    expect(subjects([site('URL', ['https://api.example/v1'], { form: 'new' })])).toEqual(['network/client talks to https://api.example/v1']);
    expect(subjects([site('URL', ['https://api.example/v1'])], ctx('Sources/Kit/Net.swift', 'swift'))).toEqual(['network/client talks to https://api.example/v1']);
    // A vocabulary IRI: a fragment is never sent on the wire, and the namespace hosts name rather than serve.
    for (const iri of [
      'https://www.w3.org/ns/activitystreams#Public',
      'https://w3id.org/security#expiration',
      'http://www.w3.org/2001/XMLSchema#',
      'https://w3id.org/security/v1',
      'http://purl.org/dc/terms/created',
      'https://schema.org/Person',
      'http://xmlns.com/foaf/0.1/'
    ]) {
      expect(subjects([site('context', [iri])]), iri).toEqual([]);
    }
    expect(subjects([site('reach', ['https://docs.joinmastodon.org/admin/'])])).toEqual(['network/client talks to https://docs.joinmastodon.org/admin/']);
    // No host.
    expect(subjects([site('reach', ['https:///path'])])).toEqual([]);
    expect(subjects([site('reach', ['https://${domain}/.well-known/webfinger'])])).toEqual(['network/client talks to https://${domain}/.well-known/webfinger']);
    // Ruby's ENV.fetch carries its receiver now (the calls.ts divergence), so it is not a bare fetch.
    const rb = ctx('lib/run.rb', 'ruby');
    expect(subjects([site('ENV.fetch', ['API_KEY'])], rb)).toEqual([]);
    expect(subjects([site('Rails.cache.fetch', ['c'])], rb)).toEqual([]);
    expect(subjects([site('fetch', ['x'])], rb)).toEqual(['network/client HTTP client call']);
  });

  it('reads a listen, ListenAndServe included', () => {
    expect(subjects([site('http.ListenAndServe', [':80', null])], ctx('main.go', 'go'))).toEqual(['network/listen serves HTTP']);
    expect(subjects([site('app.listen', [null])])).toEqual(['network/listen listens (computed)']);
    expect(subjects([site('uvicorn.run', [null])], ctx('main.py', 'python'))).toEqual([
      'entrypoint/composition-root composes uvicorn.run',
      'network/listen listens (computed)'
    ]);
  });
});

describe('store', () => {
  it('reads an anchored SQL statement and a kv write, and nothing for the ORM verbs', () => {
    expect(subjects([site('db.exec', ['INSERT INTO users (a) VALUES (1)'])])).toEqual(['store/store-write INSERT INTO users']);
    expect(subjects([site('log', ['Please UPDATE your settings'])])).toEqual([]);
    // The fix round: a sentence BEGINS with a verb too, so a lower case
    // keyword is a statement only when the statement continues past its
    // subject the way SQL does.
    expect(subjects([site('errors.New', ['update plugin conf failed'])], ctx('plugin/conf.go', 'go'))).toEqual(['gate/refusal refuses: update plugin conf failed']);
    expect(subjects([site('test', ['Update password successfully'])])).toEqual([]);
    expect(subjects([site('clickDialogButton', [null, 'update check failed'])])).toEqual([]);
    expect(subjects([site('say', ['delete from the list'])])).toEqual([]);
    expect(subjects([site('db.exec', ['update users set name = ?'])])).toEqual(['store/store-write UPDATE users']);
    expect(subjects([site('db.exec', ['delete from sessions where id = ?'])])).toEqual(['store/store-write DELETE FROM sessions']);
    expect(subjects([site('db.exec', ['insert into users (a) values (1)'])])).toEqual(['store/store-write INSERT INTO users']);
    expect(subjects([site('db.exec', ['create table users (id int)'])])).toEqual(['store/store-write CREATE TABLE users']);
    expect(subjects([site('db.exec', ['UPDATE users'])])).toEqual(['store/store-write UPDATE users']);
    // The stated limit: a lower case whole-table statement with nothing after the table name.
    expect(subjects([site('db.exec', ['delete from sessions'])])).toEqual([]);
    // DROP TABLE IF EXISTS names the table, not the word IF.
    expect(subjects([site('db.exec', ['DROP TABLE IF EXISTS x'])])).toEqual(['store/store-write DROP TABLE IF EXISTS x']);
    expect(subjects([site('db.exec', ['ALTER TABLE IF EXISTS x ADD COLUMN y int'])])).toEqual(['store/store-write ALTER TABLE IF EXISTS x']);
    // The receiver clauses are live on Ruby now.
    expect(subjects([site('redis.set', ['k', 'v'])], ctx('lib/run.rb', 'ruby'))).toEqual(['store/store-write writes redis[k]']);
    expect(subjects([site('localStorage.setItem', ['gmux.x'])])).toEqual(['store/store-write writes localStorage[gmux.x]']);
    expect(subjects([site('Object.create', [null])])).toEqual([]);
    expect(subjects([site('Model.create!', [null])], ctx('app/models/u.rb', 'ruby'))).toEqual([]);
    expect(subjects([site('LOADING_CJS_FILES.delete', [null])])).toEqual([]);
  });
});

describe('gate (gate.auth and gate.refusal are FIXED)', () => {
  it('auth: the word is asked of the last segment and the receiver, never the whole callee', () => {
    expect(subjects([site('authenticate', [null])])).toEqual(['gate/auth auth gate authenticate']);
    expect(subjects([site('auth.requireAuth', [null])])).toEqual(['gate/auth auth gate auth.requireAuth']);
    expect(subjects([site('authenticated_user.hashed_password.startswith', ['$argon2'])], ctx('backend/tests/crud/test_user.py', 'python'))).toEqual([]);
    expect(subjects([site("r.request.headers['Authorization'].startswith", ['Digest '])], ctx('tests/test_lowlevel.py', 'python'))).toEqual([]);
  });

  it('auth: an assertion or mocking receiver answers nothing; a decorator counts', () => {
    expect(subjects([site('expect(authenticate).toHaveBeenCalled', [])])).toEqual([]);
    expect(subjects([site('expect.authenticate', [])])).toEqual([]);
    expect(subjects([site('login_required', [], { form: 'decorator' })], ctx('views.py', 'python'))).toEqual([
      'gate/auth auth gate @login_required'
    ]);
    expect(subjects([site('.authorization', [null])], ctx('Tests/AuthenticationInterceptorTests.swift', 'swift'))).toEqual([]);
  });

  it('refusal: a thrown error with a message in src, and nothing in a test path', () => {
    expect(subjects([site('Error', ['no key here'], { form: 'new' })])).toEqual(['gate/refusal refuses: no key here']);
    expect(subjects([site('Error', ['no key here'], { form: 'new' })], ctx('src/__tests__/x.test.ts', 'typescript'))).toEqual([]);
    expect(subjects([site('errors.New', ['not found here'])], ctx('run.go', 'go'))).toEqual(['gate/refusal refuses: not found here']);
    expect(subjects([site('t.Fatalf', ['put: %v'])], ctx('router_test.go', 'go'))).toEqual([]);
    expect(subjects([site('raise', [])], ctx('lib/run.rb', 'ruby'))).toEqual(['gate/refusal refuses (raise)']);
    // H14: a messageless construction is not a refusal the product states.
    expect(subjects([site('Error', [], { form: 'new' })])).toEqual([]);
    expect(subjects([site('Error', [null], { form: 'new' })])).toEqual([]);
  });

  it('flag and guard', () => {
    expect(subjects([site('flags.isEnabled', ['beta'])])).toEqual(['gate/flag feature flag beta']);
    expect(subjects([site('app.use', ['auth'])])).toEqual(['gate/guard middleware auth']);
    expect(subjects([site('Authorize', [], { form: 'decorator' })], ctx('x.py', 'python'))).toEqual([
      'gate/auth auth gate @Authorize',
      'gate/guard guard @Authorize'
    ]);
  });
});

describe('entrypoint.composition is a closed PAIR table (FIXED)', () => {
  const go = ctx('main.go', 'go');
  it('gin.Default() is a root and the sample decoys are not', () => {
    expect(subjects([site('gin.Default', [])], go)).toEqual(['entrypoint/composition-root composes gin.Default']);
    expect(subjects([site('viper.Default', [])], go)).toEqual([]);
    expect(subjects([site('cfg.Default', [])], go)).toEqual([]);
    expect(subjects([site('x.Default', [])], go)).toEqual([]);
    expect(subjects([site('Default', [])], go)).toEqual([]);
    expect(subjects([site('model.Application', [], { form: 'new' })], go)).toEqual([]);
    expect(subjects([site('NewRouter', [])], go)).toEqual([]);
    expect(subjects([site('mux.NewRouter', [])], go)).toEqual(['entrypoint/composition-root composes mux.NewRouter']);
    // The fix round: a composition root in a test file is a fixture (miniflux, 2 of 7).
    expect(subjects([site('http.NewServeMux', [])], go)).toEqual(['entrypoint/composition-root composes http.NewServeMux']);
    expect(subjects([site('http.NewServeMux', [])], ctx('internal/api/api_test.go', 'go'))).toEqual([]);
    expect(subjects([site('express', [])], ctx('src/__tests__/app.test.ts', 'typescript'))).toEqual([]);
  });

  it('the JS, python, rust and swift rows', () => {
    expect(subjects([site('express', [])])).toEqual(['entrypoint/composition-root composes express']);
    expect(subjects([site('foo.express', [])])).toEqual([]);
    expect(subjects([site('BrowserWindow', [null], { form: 'new' })])).toEqual(['entrypoint/composition-root composes BrowserWindow']);
    expect(subjects([site('app.whenReady', [])])).toEqual(['entrypoint/composition-root composes app.whenReady']);
    const py = ctx('main.py', 'python');
    expect(subjects([site('FastAPI', [])], py)).toEqual(['entrypoint/composition-root composes FastAPI']);
    expect(subjects([site('fastapi.FastAPI', [])], py)).toEqual(['entrypoint/composition-root composes fastapi.FastAPI']);
    expect(subjects([site('Flask', ['__main__'])], py)).toEqual(['entrypoint/composition-root composes Flask']);
    expect(subjects([site('run', [])], py)).toEqual([]);
    expect(subjects([site('Router::new', [])], ctx('src/main.rs', 'rust', 'use axum::Router;'))).toEqual([
      'entrypoint/composition-root composes Router::new'
    ]);
    expect(subjects([site('Router::new', [])], ctx('src/main.rs', 'rust', 'use my::Router;'))).toEqual([]);
    expect(subjects([site('UIApplicationMain', [], { form: 'attribute' })], ctx('App.swift', 'swift'))).toEqual([
      'entrypoint/composition-root composes UIApplicationMain'
    ]);
  });
});

describe('test', () => {
  it('reads a case call in a test path only, and swift @Test', () => {
    const test = ctx('src/__tests__/a.test.ts', 'typescript');
    expect(subjects([site('it', ['reads'])], test)).toEqual(['test/test-case it "reads"']);
    expect(subjects([site('describe', ['x'])], TS)).toEqual([]);
    expect(subjects([site('Test', [], { form: 'attribute' })], ctx('Tests/K.swift', 'swift'))).toEqual([
      'test/test-case test attribute @Test'
    ]);
    expect(subjects([site('pytest.mark.parametrize', ['x'], { form: 'decorator' })], ctx('tests/test_a.py', 'python'))).toEqual([]);
    expect(subjects([site('test', [], { form: 'attribute' })], ctx('tests/a.rs', 'rust'))).toEqual([]);
  });
});

describe('the cross rule dedupe', () => {
  it('counts a python route ONCE when the decorator and the call inside it both fire', () => {
    const py = ctx('backend/app/api/routes/items.py', 'python');
    const facts = applyCallRules(
      [site('router.get', ['/items/'], { form: 'decorator', line: 4 }), site('router.get', ['/items/', null], { line: 4 })],
      py,
      ['', '', '', '@router.get("/items/")']
    );
    expect(facts).toHaveLength(1);
    expect(facts[0]?.evidence).toBe('@router.get("/items/")');
  });

  it('survives a rule that throws', () => {
    const bad = { ...site('app.get', ['/x', null]), args: null as unknown as string[] };
    expect(() => applyCallRules([bad], TS, LINES)).not.toThrow();
  });
});
