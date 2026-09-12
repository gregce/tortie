/**
 * The path rules, the declaration shaped surfaces and the manifest rules
 * (Phase 257): a fact from a filename, from an exported name in a file whose
 * path is the route, and from a non-source file read as text.
 */

import { describe, expect, it } from 'vitest';
import { isManifestPath, readManifestFacts } from '../manifests';
import { declarationSurfaces, pathFacts } from '../path-rules';

function facts(rel: string, text: string): string[] {
  return readManifestFacts(rel, text).map((f) => `${f.line} ${f.rule} ${f.category}/${f.kind} ${f.subject}`);
}

describe('pathFacts', () => {
  it('names an entry file, a command file, a module root and a migration, by convention', () => {
    expect(pathFacts('src/main.ts').map((f) => f.rule)).toEqual(['entrypoint.path.by-name']);
    expect(pathFacts('config.ru').map((f) => f.rule)).toEqual(['entrypoint.path.by-name']);
    expect(pathFacts('cmd/server/run.go').map((f) => f.rule)).toEqual(['entrypoint.path.cmd-dir']);
    expect(pathFacts('src/arch/index.ts').map((f) => f.subject)).toEqual(['module root src/arch/index.ts']);
    expect(pathFacts('src/lib.rs')[0]).toMatchObject({ category: 'boundary', kind: 'module-root', line: 1, evidence: 'src/lib.rs' });
    expect(pathFacts('db/migrate/20260911_x.rb').map((f) => f.rule)).toEqual(['store.path.migration']);
    expect(pathFacts('src/index.ts').map((f) => f.rule)).toEqual(['entrypoint.path.by-name', 'boundary.path.module-root']);
  });

  it('a migration directory entry is a migration only with a migration extension (the fix round)', () => {
    expect(pathFacts('migrations/001_init.sql').map((f) => f.rule)).toEqual(['store.path.migration']);
    expect(pathFacts('app/migrations/0001_initial.py').map((f) => f.rule)).toEqual(['store.path.migration']);
    expect(pathFacts('docs/migrations/guide.md')).toEqual([]);
    expect(pathFacts('docs/migration/diagram.png')).toEqual([]);
    expect(isManifestPath('docs/migrations/guide.md')).toBe(false);
    expect(isManifestPath('docs/migration/diagram.png')).toBe(false);
    // A bare `migrate/` segment is a module, not a migration directory: this
    // repository's src/main/migrate/userdata.ts was a manifest to the reader
    // and never parsed as TypeScript before the fix round.
    expect(pathFacts('src/main/migrate/userdata.ts')).toEqual([]);
    expect(isManifestPath('src/main/migrate/userdata.ts')).toBe(false);
    expect(isManifestPath('db/migrate/20260911_x.rb')).toBe(true);
  });

  it('the by-name extensions are the exercised grammars only', () => {
    expect(pathFacts('src/main.kt')).toEqual([]);
    expect(pathFacts('src/main.java')).toEqual([]);
    expect(pathFacts('src/main.php')).toEqual([]);
  });
});

describe('declarationSurfaces', () => {
  it('reads a Next.js app router handler and a SvelteKit server route from the path plus the export', () => {
    const next = declarationSurfaces('app/api/items/route.ts', ['import x from "y";', 'export async function GET(req) {}', 'export const POST = handler;']);
    expect(next.map((f) => `${f.line} ${f.subject}`)).toEqual(['2 HTTP GET /api/items', '3 HTTP POST /api/items']);
    expect(declarationSurfaces('app/api/[id]/route.ts', ['export function DELETE() {}'])[0]?.subject).toBe('HTTP DELETE /api/[id]');
    expect(declarationSurfaces('src/routes/x/+server.ts', ['export const GET = () => 1;'])[0]).toMatchObject({
      subject: 'HTTP GET /x',
      rule: 'surface.http.svelte-export'
    });
    expect(declarationSurfaces('src/routes/x/server.ts', ['export const GET = () => 1;'])).toEqual([]);
  });
});

describe('isManifestPath', () => {
  it('names the manifests it reads and not the ones it dropped', () => {
    for (const p of ['package.json', 'a/Cargo.toml', 'go.mod', 'pyproject.toml', 'setup.cfg', 'Gemfile', 'x.gemspec', 'Rakefile', 'Procfile', 'Dockerfile', 'Dockerfile.dev', 'docker-compose.yml', 'compose.yaml', 'Package.swift', 'db/schema.rb', 'crontab', '.github/workflows/ci.yml', 'migrations/001_init.sql', 'prisma/schema.prisma']) {
      expect(isManifestPath(p), p).toBe(true);
    }
    for (const p of ['AndroidManifest.xml', 'build.gradle', 'pom.xml', 'a.csproj', 'a.sln', 'src/main.ts', 'README.md']) {
      expect(isManifestPath(p), p).toBe(false);
    }
  });
});

describe('readManifestFacts', () => {
  it('package.json: main, bin as a string or an object, workspaces and the named scripts', () => {
    const text = JSON.stringify(
      { name: 'tortie', main: 'out/main.js', bin: { tortie: 'bin/t.js', other: 'bin/o.js' }, workspaces: ['packages/*'], scripts: { build: 'x', 'test:unit': 'y', deploy: 'z' } },
      null,
      2
    );
    expect(facts('package.json', text)).toEqual([
      '3 entrypoint.pkg.main entrypoint/package-main node entry out/main.js',
      '5 entrypoint.pkg.bin entrypoint/bin command tortie → bin/t.js',
      '6 entrypoint.pkg.bin entrypoint/bin command other → bin/o.js',
      '8 boundary.pkg.workspaces boundary/workspace npm workspaces declared',
      '12 entrypoint.pkg.script entrypoint/script npm run build',
      '13 entrypoint.pkg.script entrypoint/script npm run test:unit'
    ]);
    expect(facts('package.json', '{"name":"c","bin":"cli.js"}')).toEqual(['1 entrypoint.pkg.bin entrypoint/bin command c → cli.js']);
    expect(facts('package.json', '{not json')).toEqual([]);
    expect(facts('package.json', '[1,2]')).toEqual([]);
  });

  it('Cargo.toml: the bin reads its own name, and lib, workspace and crate', () => {
    const text = ['[package]', 'name = "rg"', '', '[[bin]]', 'bench = false', 'name = "rg"', 'path = "crates/core/main.rs"', '', '[lib]', '', '[workspace]', 'members = ["crates/*"]'].join('\n');
    expect(facts('Cargo.toml', text)).toEqual([
      '2 entrypoint.cargo.name entrypoint/package crate rg',
      '4 entrypoint.cargo.bin entrypoint/bin cargo bin rg',
      '9 boundary.cargo.lib boundary/library cargo library target',
      '12 boundary.cargo.workspace boundary/workspace cargo workspace members'
    ]);
    expect(facts('Cargo.toml', '[[bin]]\n[lib]')).toEqual(['1 entrypoint.cargo.bin entrypoint/bin cargo bin', '2 boundary.cargo.lib boundary/library cargo library target']);
    expect(facts('Cargo.toml', '[dependencies]\nname = "x"')).toEqual([]);
  });

  it('pyproject: a console script only inside a scripts table; the [tool.x] decoy is nothing', () => {
    const text = ['[project]', 'name = "lift"', '', '[project.scripts]', 'lift = "lift.cli:main"', '', '[tool.x]', 'y = "a:b"', '', '[tool.poetry.scripts]', 'p = "pkg:run"'].join('\n');
    expect(facts('pyproject.toml', text)).toEqual([
      '4 entrypoint.py.scripts entrypoint/bin python console script table',
      '5 entrypoint.py.script entrypoint/bin command lift → lift.cli:main',
      '10 entrypoint.py.scripts entrypoint/bin python console script table',
      '11 entrypoint.py.script entrypoint/bin command p → pkg:run'
    ]);
  });

  it('setup.cfg and setup.py console_scripts, left at the indent or the list end', () => {
    const cfg = ['[options.entry_points]', 'console_scripts =', '    foo = pkg.mod:main', '    bar = pkg.other:run', '[other]', 'baz = a:b'].join('\n');
    expect(facts('setup.cfg', cfg).map((f) => f.split(' ').slice(2).join(' '))).toEqual([
      'entrypoint/bin python console script table',
      'entrypoint/bin command foo → pkg.mod:main',
      'entrypoint/bin command bar → pkg.other:run'
    ]);
    const py = ['setup(', "  entry_points={'console_scripts': [", "    'foo = pkg.mod:main',", '  ]},', "  x='a:b',", ')'].join('\n');
    expect(facts('setup.py', py).map((f) => f.split(' ').slice(2).join(' '))).toEqual([
      'entrypoint/bin python console script table',
      'entrypoint/bin command foo → pkg.mod:main'
    ]);
  });

  it('go.mod, Gemfile, Procfile, Dockerfile, compose, crontab', () => {
    expect(facts('go.mod', 'module github.com/gotify/server\n\ngo 1.22')).toEqual(['1 entrypoint.go.module entrypoint/package go module github.com/gotify/server']);
    expect(facts('Gemfile', 'source "x"')).toEqual(['1 entrypoint.ruby.project entrypoint/package ruby project file gemfile']);
    expect(facts('Procfile', 'web: bundle exec puma\nworker: sidekiq\n')).toEqual([
      '1 entrypoint.procfile entrypoint/process web: bundle exec puma',
      '2 entrypoint.procfile entrypoint/process worker: sidekiq'
    ]);
    expect(facts('Dockerfile', 'FROM node\nEXPOSE 3000\nCMD ["node", "x"]')).toEqual([
      '2 surface.docker.expose surface/port exposes port 3000',
      '3 entrypoint.docker.cmd entrypoint/container CMD ["node", "x"]'
    ]);
    // A suffixed Dockerfile is read only when it opens as one (the fix round's docs/Dockerfile.md).
    expect(facts('Dockerfile.dev', '# dev\n\nFROM node\nENTRYPOINT ["node", "x"]')).toEqual(['4 entrypoint.docker.cmd entrypoint/container ENTRYPOINT ["node", "x"]']);
    expect(facts('Dockerfile.prod', 'ARG BASE\nFROM $BASE\nEXPOSE 80')).toEqual(['3 surface.docker.expose surface/port exposes port 80']);
    expect(facts('docs/Dockerfile.md', '# Writing one\n\n    ENTRYPOINT ["node", "server.js"]\n    EXPOSE 8080\n')).toEqual([]);
    expect(facts('Dockerfile', '# comment only\nEXPOSE 8080')).toEqual(['2 surface.docker.expose surface/port exposes port 8080']);
    expect(facts('compose.yaml', 'services:\n  web:\n    image: x\n  db:\n    image: y\nvolumes:\n  data:\n')).toEqual([
      '2 boundary.compose.service boundary/service compose service web',
      '4 boundary.compose.service boundary/service compose service db'
    ]);
    expect(facts('crontab', '# comment\n*/5 * * * * job\n')).toEqual(['2 surface.crontab surface/job cron */5 * * * * job']);
  });

  it('a workflow: jobs only inside jobs:, the on: keys are not jobs, and a cron', () => {
    const text = ['on:', '  push:', '  pull_request:', '  schedule:', "    - cron: '0 3 * * *'", 'jobs:', '  build:', '    runs-on: x', '  test:', '    runs-on: y'].join('\n');
    expect(facts('.github/workflows/ci.yml', text)).toEqual([
      '4 surface.ci.schedule surface/job CI schedule',
      '5 surface.ci.cron surface/job cron 0 3 * * *',
      '7 entrypoint.ci.job entrypoint/ci-job CI job build',
      '9 entrypoint.ci.job entrypoint/ci-job CI job test'
    ]);
  });

  it('Package.swift: an executable target is an entrypoint, a library target a boundary, under two ids', () => {
    const text = ['.executableTarget(name: "app"),', '.target(name: "Kit"),', '.testTarget(name: "KitTests"),'].join('\n');
    expect(facts('Package.swift', text)).toEqual([
      '1 entrypoint.swiftpm.target entrypoint/bin swift executableTarget app',
      '2 boundary.swiftpm.target boundary/library swift target Kit',
      '3 test.swiftpm.target test/test-target swift test target KitTests'
    ]);
  });

  it('store definitions: sql, schema.rb, prisma', () => {
    expect(facts('migrations/001_init.sql', 'CREATE TABLE users (id int);\nCREATE TABLE IF NOT EXISTS posts (id int);')).toEqual([
      '1 store.sql.file store/store-def CREATE TABLE users',
      '2 store.sql.file store/store-def CREATE TABLE IF NOT EXISTS posts'
    ]);
    expect(facts('db/schema.rb', 'create_table "accounts" do |t|\ncreate_table :statuses')).toEqual([
      '1 store.rails.schema store/store-def table accounts',
      '2 store.rails.schema store/store-def table statuses'
    ]);
    expect(facts('prisma/schema.prisma', 'model User {\n}\nmodel Post {')).toEqual([
      '1 store.prisma.model store/store-def prisma model User',
      '3 store.prisma.model store/store-def prisma model Post'
    ]);
  });

  it('the dropped manifests answer nothing, and a manifest over the cap answers nothing', () => {
    expect(facts('AndroidManifest.xml', '<activity android:name="Main"/>')).toEqual([]);
    expect(facts('build.gradle', "mainClass = 'x'")).toEqual([]);
    expect(facts('a.csproj', '<OutputType>Exe</OutputType>')).toEqual([]);
    expect(facts('package.json', `{"main":"x","pad":"${'p'.repeat(2 * 1024 * 1024)}"}`)).toEqual([]);
  });
});
