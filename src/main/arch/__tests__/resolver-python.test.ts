/**
 * The Python arm, over real packaging files on disk (Phase 157).
 *
 * THE ONE THING THIS FILE IS FOR. Every case below is really about the line
 * between `external` and `unresolved`, because that line is where a false green
 * comes from. `src/main/arch/checkers/imports.ts` drops an `external` out of
 * both the crossing list and the unresolved count, so a first party import
 * wearing `external` leaves a `must-not` promise rendering CONVERGENT. Before
 * this phase every Python import was `unverifiable`, which is counted, so the
 * defect could not bite in Python. This arm is what arms it, and these tests
 * are what keep it disarmed.
 *
 * So the shape of the suite is: a handful of tests that resolution works at
 * all, and then a long run of tests that every single way the arm can fail
 * produces `unresolved` and never `external`.
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { archResolveContext, type ArchResolveContext } from '../resolver';
import { readArchManifests } from '../resolver/manifest';
import { readPythonProject, normalizeDistribution } from '../resolver/pyproject';
import { resolvePython, PYTHON_STDLIB_SIZE } from '../resolver/python';

/**
 * One imaginary repository, tracked file list only. It carries every shape the
 * arm has a rule for, plus three traps.
 */
const FILES = [
  'pyproject.toml',
  // A package with an __init__.py, the ordinary case.
  'app/__init__.py',
  'app/main.py',
  'app/ir/__init__.py',
  'app/ir/node.py',
  'app/ir/models.py',
  // A package directory AND a module file of the same name. CPython prefers
  // the package, and so must the walk.
  'app/shadow/__init__.py',
  'app/shadow/inner.py',
  'app/shadow.py',
  // A namespace package: a directory with no __init__.py.
  'app/space/leaf.py',
  // A module whose dotted tail is an item rather than a submodule.
  'app/util.py',
  // A top level module that shares its name with the standard library, and one
  // that shares its name with a declared dependency. Both are traps.
  'types/__init__.py',
  'httpx/__init__.py',
  // A sibling of the root, so a relative import can be walked up into.
  'sibling.py',
  'tests/__init__.py',
  'tests/test_main.py'
];

let root: string;
let cachedCtx: ArchResolveContext | null = null;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-arch-python-'));
  writeFileSync(
    join(root, 'pyproject.toml'),
    `# a comment, and a "#" inside a string must not end one
[project]
name = "Demo-App"
dependencies = [
  "httpx>=0.27.0",        # a trailing comment
  "z3-solver>=4.13.0",
  "google-generativeai>=0.5.0",
  "thing[extra] ; python_version < '3.12'",
]

[project.optional-dependencies]
dev = ["pytest>=8", "anyio"]

[dependency-groups]
lint = ["ruff>=0.14.0"]

[tool.ruff]
line-length = 100
`
  );
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

function ctx(): ArchResolveContext {
  cachedCtx ??= archResolveContext(readArchManifests(root), FILES);
  return cachedCtx;
}

/** Every answer as one string, so a failing test says what it got. */
function answer(specifier: string, fromPath = 'app/main.py'): string {
  const got = resolvePython(specifier, fromPath, ctx());
  return got.resolution === 'first-party' ? `first-party:${got.toPath}` : got.resolution;
}

describe('the Python arm resolves the shapes the query produces', () => {
  it('resolves a dotted name to a module file', () => {
    expect(answer('app.ir.node')).toBe('first-party:app/ir/node.py');
  });

  it('resolves a dotted name to a package __init__.py', () => {
    expect(answer('app.ir')).toBe('first-party:app/ir/__init__.py');
  });

  it('prefers the package over a module file of the same name, as CPython does', () => {
    expect(answer('app.shadow')).toBe('first-party:app/shadow/__init__.py');
    expect(answer('app.shadow.inner')).toBe('first-party:app/shadow/inner.py');
  });

  it('stops the walk at the first segment that names neither, so a tail item resolves to its module', () => {
    // `from app.util import Thing` arrives as `app.util`; `app.util.Thing` is
    // what `import app.util.Thing` would give and it must answer the same file.
    expect(answer('app.util')).toBe('first-party:app/util.py');
    expect(answer('app.util.Thing')).toBe('first-party:app/util.py');
    expect(answer('app.ir.node.IRNode.inner')).toBe('first-party:app/ir/node.py');
  });

  it('walks through a namespace package to the file on the far side of it', () => {
    expect(answer('app.space.leaf')).toBe('first-party:app/space/leaf.py');
  });

  it('answers the deepest tracked file when the leaf is a namespace package with no file', () => {
    // `app.space` names a directory with no __init__.py, so there is no file
    // for it. The honest answer is the deepest prefix that DID name a file.
    expect(answer('app.space')).toBe('first-party:app/__init__.py');
  });
});

describe('relative imports, which are first party or they are nothing', () => {
  it('resolves one dot against the importing file own package', () => {
    expect(answer('.node', 'app/ir/models.py')).toBe('first-party:app/ir/node.py');
  });

  it('gives a package __init__.py the same package as a module beside it', () => {
    expect(answer('.node', 'app/ir/__init__.py')).toBe('first-party:app/ir/node.py');
  });

  it('resolves a bare dot to the package own __init__.py', () => {
    expect(answer('.', 'app/ir/models.py')).toBe('first-party:app/ir/__init__.py');
    expect(answer('.', 'app/ir/__init__.py')).toBe('first-party:app/ir/__init__.py');
  });

  it('resolves two dots one package up', () => {
    expect(answer('..util', 'app/ir/models.py')).toBe('first-party:app/util.py');
    expect(answer('..', 'app/ir/models.py')).toBe('first-party:app/__init__.py');
  });

  it('resolves three dots to the repository root and finds a top level module', () => {
    expect(answer('...sibling', 'app/ir/models.py')).toBe('first-party:sibling.py');
  });

  it('answers unresolved for a bare dot whose package has no __init__.py', () => {
    // `app/space/` is a namespace package. There is no file to point at.
    expect(answer('.', 'app/space/leaf.py')).toBe('unresolved');
  });
});

// ---------------------------------------------------------------------------
// The half of the suite that matters: never `external` by accident
// ---------------------------------------------------------------------------

describe('external is returned only when something the arm READ accounts for the name', () => {
  it('answers external for the standard library', () => {
    expect(answer('os')).toBe('external');
    expect(answer('os.path')).toBe('external');
    expect(answer('concurrent.futures')).toBe('external');
  });

  it('answers external for a module removed from a later Python, because it was the standard library', () => {
    expect(answer('distutils.core')).toBe('external');
    expect(answer('telnetlib')).toBe('external');
  });

  it('answers external for a distribution the pyproject declares', () => {
    expect(answer('anyio')).toBe('external');
    expect(answer('pytest')).toBe('external');
    expect(answer('ruff')).toBe('external');
    expect(answer('thing')).toBe('external');
  });

  it('matches a declared name across the hyphen and underscore spelling', () => {
    expect(answer('z3_solver')).toBe('external');
  });

  it('matches a namespace distribution by its first two segments joined', () => {
    expect(answer('google.generativeai')).toBe('external');
  });

  it('ANSWERS UNRESOLVED, NEVER EXTERNAL, for a bare name nobody declared', () => {
    // This is the whole rule. `requests` is a real package and this repository
    // never said so, so the arm has no account of it.
    for (const specifier of [
      'requests',
      'torch',
      'transformers.models',
      'z3',
      'dotenv',
      'git'
    ]) {
      expect(answer(specifier), specifier).toBe('unresolved');
    }
  });

  it('resolves the repository OWN module before it consults the standard library', () => {
    // A repository that ships `types/__init__.py` really does shadow the
    // standard library `types` for its own code. If the stdlib list were
    // consulted first this would be a first party import wearing `external`,
    // which is the false green shape exactly.
    expect(answer('types')).toBe('first-party:types/__init__.py');
  });

  it('resolves the repository OWN module before it consults the dependency table', () => {
    expect(answer('httpx')).toBe('first-party:httpx/__init__.py');
  });
});

describe('the hostile shapes', () => {
  it('refuses a relative import that walks out of the repository, and does not clamp it to the root', () => {
    // normalizeRel in ../resolver/manifest.ts silently DROPS a `..` it cannot
    // honour, so a clamped walk would answer the repository root and call it
    // first party. Counting the dots ourselves is what stops that.
    expect(answer('....sibling', 'app/ir/models.py')).toBe('unresolved');
    expect(answer('.....', 'app/main.py')).toBe('unresolved');
    expect(answer('..sibling', 'sibling.py')).toBe('unresolved');
  });

  it('answers unresolved for a specifier that is not a dotted name at all', () => {
    for (const specifier of [
      '',
      '   ',
      '-leading-dash',
      'has-a-dash',
      'a b',
      '/etc/passwd',
      '../../../etc/passwd',
      'a..b',
      '9lives',
      'a.b c',
      'a/b'
    ]) {
      expect(answer(specifier), JSON.stringify(specifier)).toBe('unresolved');
    }
  });

  it('answers unresolved for an absurdly long dotted name rather than walking it', () => {
    expect(answer(new Array(200).fill('a').join('.'))).toBe('unresolved');
  });

  it('answers unresolved for a relative import whose tail is not a dotted name', () => {
    expect(answer('.-bad', 'app/ir/models.py')).toBe('unresolved');
    expect(answer('./passwd', 'app/ir/models.py')).toBe('unresolved');
  });

  it('answers unresolved rather than external for every relative miss', () => {
    expect(answer('.nothere', 'app/ir/models.py')).toBe('unresolved');
    expect(answer('..nothere.deep', 'app/ir/models.py')).toBe('unresolved');
    // `os` is the standard library, and a RELATIVE `os` is not.
    expect(answer('.os', 'app/ir/models.py')).toBe('unresolved');
  });
});

describe('the limits the arm states on its own face are the limits it really has', () => {
  it('resolves a re-export chain to the file that FORWARDS, not the one that defines', () => {
    // app/ir/__init__.py is the file a `from app.ir import IRNode` executes.
    // The file that defines IRNode is app/ir/node.py and the arm never says so.
    expect(answer('app.ir')).toBe('first-party:app/ir/__init__.py');
  });

  it('understates a submodule import by one level, because the query captures the module name only', () => {
    // `from app.ir import node` arrives as `app.ir`. The real edge is to
    // app/ir/node.py and this is the documented shortfall.
    expect(answer('app.ir')).toBe('first-party:app/ir/__init__.py');
    expect(answer('app.ir.node')).toBe('first-party:app/ir/node.py');
  });

  it('makes no item level claim: two different items in one module give one answer', () => {
    expect(answer('app.ir.node.IRNode')).toBe(answer('app.ir.node.Other'));
  });

  it('answers the FORWARDING file at every step of a re-export chain three deep', () => {
    // The chain in the imaginary repository is three files long:
    //   app/__init__.py       re-exports from app.ir
    //   app/ir/__init__.py    re-exports from app.ir.node
    //   app/ir/node.py        defines the thing
    // A person importing the name from any of the three gets the file they
    // named and never the file at the end of the chain. That is the limit,
    // stated as three assertions rather than as a sentence.
    expect(answer('app')).toBe('first-party:app/__init__.py');
    expect(answer('app.ir')).toBe('first-party:app/ir/__init__.py');
    expect(answer('app.ir.node')).toBe('first-party:app/ir/node.py');
    // And the item on the end of the chain never moves the answer.
    expect(answer('app.IRNode')).toBe('first-party:app/__init__.py');
    expect(answer('app.ir.IRNode')).toBe('first-party:app/ir/__init__.py');
  });
});

// ---------------------------------------------------------------------------
// The manifest reader
// ---------------------------------------------------------------------------

describe('the packaging file reader', () => {
  it('reads a PEP 621 pyproject, comments and multi line arrays and all', () => {
    const project = readPythonProject(root);
    expect(project.name).toBe('demo_app');
    expect(project.sources).toEqual(['pyproject.toml']);
    expect([...project.dependencies].sort()).toEqual([
      'anyio',
      'google_generativeai',
      'httpx',
      'pytest',
      'ruff',
      'thing',
      'z3_solver'
    ]);
  });

  it('reads a Poetry pyproject, whose dependencies are table keys rather than strings', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gmux-arch-poetry-'));
    try {
      writeFileSync(
        join(dir, 'pyproject.toml'),
        `[tool.poetry]
name = "poems"
[tool.poetry.dependencies]
python = "^3.11"
requests = "^2.31"
"ruamel.yaml" = "*"
[tool.poetry.group.dev.dependencies]
pytest = "^8"
`
      );
      const project = readPythonProject(dir);
      expect(project.name).toBe('poems');
      // `python` is the interpreter, not a distribution, and must not be one.
      expect([...project.dependencies].sort()).toEqual([
        'pytest',
        'requests',
        'ruamel_yaml'
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reads a setup.cfg, including an indented install_requires block', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gmux-arch-setupcfg-'));
    try {
      writeFileSync(
        join(dir, 'setup.cfg'),
        `[metadata]
name = Old.Style

[options]
package_dir =
    = src
install_requires =
    requests>=2
    click

[options.packages.find]
where = src
`
      );
      const project = readPythonProject(dir);
      expect(project.name).toBe('old_style');
      expect([...project.dependencies].sort()).toEqual(['click', 'requests']);
      expect(project.declaredRoots).toEqual(['src']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reads a setup.py AS TEXT and never runs a line of it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gmux-arch-setuppy-'));
    const sentinel = join(dir, 'IT-RAN');
    try {
      writeFileSync(
        join(dir, 'setup.py'),
        `import os
os.system("touch ${sentinel}")
open("${sentinel}", "w").close()
from setuptools import setup
setup(
    name="legacy-thing",
    package_dir={"": "lib"},
    install_requires=["requests>=2", "click"],
)
`
      );
      const project = readPythonProject(dir);
      expect(project.name).toBe('legacy_thing');
      expect([...project.dependencies].sort()).toEqual(['click', 'requests']);
      expect(project.declaredRoots).toEqual(['lib']);
      // The proof that it was read rather than executed.
      expect(existsSync(sentinel)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reads setuptools and hatch package roots out of a pyproject', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gmux-arch-roots-'));
    try {
      writeFileSync(
        join(dir, 'pyproject.toml'),
        `[project]
name = "rooted"
[tool.setuptools]
package-dir = { "" = "source" }
[tool.hatch.build.targets.wheel]
sources = ["lib"]
`
      );
      expect(readPythonProject(dir).declaredRoots).toEqual(['source', 'lib']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('gives an empty project, and never a crash, for a repository with no packaging file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gmux-arch-bare-'));
    try {
      const project = readPythonProject(dir);
      expect(project.name).toBeNull();
      expect(project.dependencies.size).toBe(0);
      expect(project.declaredRoots).toEqual([]);
      expect(project.sources).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('survives a pyproject that is not valid TOML at all, and declares nothing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gmux-arch-broken-'));
    try {
      writeFileSync(
        join(dir, 'pyproject.toml'),
        '[project\nname = broken = "yes\ndependencies = [ "a", \n'
      );
      const project = readPythonProject(dir);
      expect(project.sources).toEqual(['pyproject.toml']);
      expect(project.name).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('pins the size of the compiled standard library list', () => {
    // 322 is `sys.stdlib_module_names` on CPython 3.14.4 plus the 25 modules
    // removed in 3.12 and 3.13. It is the ONE thing in this arm that answers
    // `external` with no manifest behind it, so it growing should be a thing
    // somebody wrote down.
    expect(PYTHON_STDLIB_SIZE).toBe(322);
  });

  it('normalises a distribution name the way an import writes it', () => {
    expect(normalizeDistribution('Google-Generative.AI')).toBe('google_generative_ai');
    expect(normalizeDistribution('z3-solver')).toBe('z3_solver');
    expect(normalizeDistribution('pytest__asyncio')).toBe('pytest_asyncio');
  });
});

describe('a declared package root is used, and an undeclared src is a convention', () => {
  it('resolves through a declared root', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gmux-arch-srclayout-'));
    try {
      writeFileSync(
        join(dir, 'pyproject.toml'),
        `[project]
name = "layered"
[tool.setuptools]
package-dir = { "" = "source" }
`
      );
      const files = ['source/layered/__init__.py', 'source/layered/core.py'];
      const context = archResolveContext(readArchManifests(dir), files);
      expect(resolvePython('layered.core', 'source/layered/__init__.py', context)).toEqual({
        toPath: 'source/layered/core.py',
        resolution: 'first-party'
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('resolves through an UNDECLARED src directory, which is the convention', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gmux-arch-srcconv-'));
    try {
      mkdirSync(dir, { recursive: true });
      const files = ['src/thing/__init__.py', 'src/thing/core.py', 'tests/test_thing.py'];
      const context = archResolveContext(readArchManifests(dir), files);
      expect(resolvePython('thing.core', 'tests/test_thing.py', context)).toEqual({
        toPath: 'src/thing/core.py',
        resolution: 'first-party'
      });
      // And the repository root is still a root, so the test package resolves.
      expect(resolvePython('tests.test_thing', 'src/thing/core.py', context)).toEqual({
        toPath: 'tests/test_thing.py',
        resolution: 'first-party'
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does NOT treat the importing file own directory as a package root', () => {
    // Python 2 implicit relative imports. `app/main.py` importing `util` must
    // not silently mean `app/util.py`, because in Python 3 it does not.
    expect(answer('util', 'app/main.py')).toBe('unresolved');
  });
});
