/**
 * The five checkers, on the cases that decide whether a verdict can lie
 * (Phase 63).
 *
 * The gate proves these over a fixture. These prove the rules themselves, one
 * at a time, including the two that exist to stop a false green: the
 * conservative rule and the behavioural ceiling.
 */

import { describe, expect, it } from 'vitest';
import type { ArchComponent, ArchEdge } from '@shared/arch';
import {
  checkEvidence,
  checkGlobs,
  checkImports,
  collectManifestFacts,
  commitsSinceContract,
  countCommitsBehind,
  countUncommitted,
  countByCoverage,
  freshnessSentence,
  globMatches,
  matchAnchor,
  parseManifest,
  quoteLine,
  type ArchFactBase,
  type ArchImportFact
} from '../checkers';
import { compileGlob, matchGlobTokens } from '../glob-pattern';
import { readCatFileBatch, readLogNameOnly, readStatusPorcelain } from '../git-facts';

const NUL = '\u0000';

const component = (over: Partial<ArchComponent> = {}): ArchComponent => ({
  id: 'app',
  name: 'app',
  kind: 'component',
  layer: 'surface',
  provenance: 'first-party',
  anchors: ['src/app'],
  boundary: 'open',
  description: '',
  evidence: [],
  deprecated: false,
  gaps: [],
  ...over
});

const edge = (over: Partial<ArchEdge> = {}): ArchEdge => ({
  id: 'app-must-not-store',
  from: 'app',
  to: 'store',
  kind: 'imports',
  rule: 'must-not',
  checker: 'imports',
  evidence: [],
  ...over
});

const imported = (over: Partial<ArchImportFact> = {}): ArchImportFact => ({
  fromPath: 'src/app/main.ts',
  specifier: '../store/db',
  line: 3,
  toPath: 'src/store/db.ts',
  resolution: 'first-party',
  reason: null,
  ...over
});

function facts(over: Partial<ArchFactBase> = {}): ArchFactBase {
  return {
    contract: {
      version: 1,
      subject: 's',
      strictness: 'not-wrong',
      layers: [
        { id: 'surface', name: 'surface', order: 0 },
        { id: 'engine', name: 'engine', order: 1 },
        { id: 'foundation', name: 'foundation', order: 2 }
      ],
      flows: []
    },
    components: [component(), component({ id: 'store', anchors: ['src/store'] })],
    edges: [edge()],
    baseline: { accepted: [] },
    trackedFiles: ['src/app/main.ts', 'src/store/db.ts'],
    imports: [],
    manifest: { names: new Set<string>(), filesRead: [] },
    headBytes: new Map<string, string | null>(),
    commitsBehind: new Map<string, number>(),
    uncommittedFiles: new Map<string, number>(),
    headCommit: '0123456789abcdef0123456789abcdef01234567',
    unparsed: [],
    ...over
  };
}

describe('the glob matcher', () => {
  it('takes a plain path as the directory a person meant', () => {
    expect(matchAnchor('src/app', ['src/app/main.ts', 'src/store/db.ts'])).toEqual([
      'src/app/main.ts'
    ]);
  });

  it('keeps a single star inside one segment and lets a double star cross', () => {
    expect(globMatches('src/*/main.ts', 'src/app/main.ts')).toBe(true);
    expect(globMatches('src/*/main.ts', 'src/a/b/main.ts')).toBe(false);
    expect(globMatches('src/**/main.ts', 'src/a/b/main.ts')).toBe(true);
    expect(globMatches('src/**/main.ts', 'src/main.ts')).toBe(true);
  });

  it('matches a maximum length wildcard bomb in under a millisecond', () => {
    // THE BLOCKING DEFECT OF THE FIRST BUILD, kept as a test rather than as a
    // paragraph. `**a` repeated eight times followed by `zz` is 26 characters,
    // passes every path rule, and took a MEASURED 33,001 ms against one
    // repository path when the matcher compiled it to `.*a.*a...` and handed it
    // to `new RegExp`. At fourteen repeats it took 142,684 ms. The scan in
    // ../glob-pattern.ts has no such shape, and this is the pattern at the
    // format's own 512 character ceiling.
    const bomb = '**a'.repeat(170) + 'zz';
    expect(bomb.length).toBeLessThanOrEqual(512);
    const path = 'src/renderer/terminal/drop/insert.ts/' + 'a'.repeat(36);
    const tokens = compileGlob(bomb);
    const started = Date.now();
    expect(matchGlobTokens(tokens, path)).toBe(false);
    expect(Date.now() - started).toBeLessThan(50);
  });

  it('agrees with the four rules its header states', () => {
    const cases: [string, string, boolean][] = [
      ['src/**', 'src/a/b/c.ts', true],
      ['src/?.ts', 'src/a.ts', true],
      ['src/?.ts', 'src/ab.ts', false],
      ['src/?.ts', 'src//.ts', false],
      ['*.ts', 'a.ts', true],
      ['*.ts', 'a/b.ts', false],
      ['src/**/*.ts', 'src/x.ts', true],
      ['src/**/*.ts', 'src/a/b/x.ts', true],
      ['**', 'anything/at/all', true]
    ];
    for (const [glob, path, want] of cases) {
      expect(globMatches(glob, path), `${glob} against ${path}`).toBe(want);
    }
  });

  it('calls an anchor that matches nothing absent rather than broken', () => {
    const result = checkGlobs(
      facts({ components: [component({ anchors: ['src/gone-*'] })] })
    );
    expect(result.verdicts[0]?.status).toBe('absent');
    expect(result.verdicts[0]?.coverage).toBe('checked');
  });
});

describe('freshness counts from the contract, never from the beginning of time', () => {
  const log = [
    { commit: 'a'.repeat(40), paths: ['src/app/main.ts'] },
    { commit: 'b'.repeat(40), paths: ['docs/arch/edges.json'] },
    { commit: 'c'.repeat(40), paths: ['src/app/view.ts'] }
  ];

  it('cuts the newest first walk at the commit that touched docs/arch', () => {
    expect(commitsSinceContract(log).map((c) => c.commit)).toEqual(['a'.repeat(40)]);
  });

  it('counts nothing behind when the contract is not committed at all', () => {
    // NO COMMIT IN THIS HISTORY TOUCHES docs/arch, which is what "not
    // committed at all" means and is every repository on the day the contract
    // is drafted. The contract was written after HEAD, so nothing has landed
    // since it was written.
    //
    // An earlier version of this test named this case and did not drive it: its
    // log held ONE commit and that commit touched docs/arch/contract.json, so
    // the walk found its boundary on the first step and returned empty for the
    // ordinary reason. The arm that falls out of the bottom of the loop was
    // never entered, the test passed, and the defect shipped twice. Measured on
    // Tortie's own history on 2026-08-26 with that arm still wrong: 530 commits
    // walked, 0 touching docs/arch, 530 handed back, and the main process read
    // "169 commits have landed under the main process since this was written"
    // about a contract two minutes old.
    const uncommitted = [
      { commit: 'd'.repeat(40), paths: ['src/app/main.ts'] },
      { commit: 'e'.repeat(40), paths: ['src/app/view.ts'] },
      { commit: 'f'.repeat(40), paths: ['README.md'] }
    ];
    expect(commitsSinceContract(uncommitted)).toEqual([]);
    const behind = countCommitsBehind(
      [component()],
      ['src/app/main.ts', 'src/app/view.ts'],
      commitsSinceContract(uncommitted)
    );
    expect(behind.get('app')).toBe(0);
  });

  it('counts nothing behind when the newest commit is the contract itself', () => {
    // The other end of the same question. Here the boundary IS found, on the
    // first step, so the answer is empty for the ordinary reason rather than
    // for the reason above. Both arms are driven, because they returned the
    // same value for different reasons and only one of them was ever right.
    const justWritten = [
      { commit: 'd'.repeat(40), paths: ['docs/arch/contract.json'] },
      { commit: 'e'.repeat(40), paths: ['src/app/main.ts'] }
    ];
    expect(commitsSinceContract(justWritten)).toEqual([]);
  });

  it('counts only what landed after it, per part', () => {
    const behind = countCommitsBehind(
      [component()],
      ['src/app/main.ts', 'src/app/view.ts'],
      commitsSinceContract(log)
    );
    expect(behind.get('app')).toBe(1);
  });
});

describe('the conservative rule', () => {
  it('never calls a must-not green while an import out of that part is unresolved', () => {
    const result = checkImports(
      facts({
        imports: [
          imported({
            toPath: null,
            resolution: 'unverifiable',
            reason: 'Imports are not checked for Swift.'
          })
        ]
      })
    );
    const verdict = result.verdicts.find((v) => v.subjectId === 'edge:app-must-not-store');
    expect(verdict?.status).toBe('unverifiable');
    expect(verdict?.coverage).toBe('unverifiable');
    expect(verdict?.reason).toContain('definite answer');
  });

  it('never counts a dependency as an import it could not resolve', () => {
    // The face said "2363 of 8447 imports unresolved" on Tortie's own tree when
    // the true number was none of them, because `toPath` is null for an
    // `external` as well as for a miss, and a real promise went grey with a
    // reason that named forty two node builtins.
    const base = facts({
      imports: [
        imported({
          specifier: 'node:path',
          toPath: null,
          resolution: 'external',
          reason: 'The specifier names a dependency rather than a file in this repository'
        })
      ]
    });
    const counts = countByCoverage(checkImports(base).verdicts, base);
    expect(counts.unresolvedImports).toBe(0);
    expect(counts.totalImports).toBe(1);
    const verdict = checkImports(base).verdicts.find(
      (v) => v.subjectId === 'edge:app-must-not-store'
    );
    expect(verdict?.status).toBe('convergent');
  });

  it('calls a must-not green only when every import out of that part resolved', () => {
    const result = checkImports(
      facts({ imports: [imported({ toPath: 'src/app/other.ts' })] })
    );
    const verdict = result.verdicts.find((v) => v.subjectId === 'edge:app-must-not-store');
    expect(verdict?.status).toBe('convergent');
  });

  it('calls a crossed must-not divergent, and names every offending place', () => {
    const result = checkImports(facts({ imports: [imported()] }));
    const verdict = result.verdicts.find((v) => v.subjectId === 'edge:app-must-not-store');
    expect(verdict?.status).toBe('divergent');
    expect(verdict?.offending).toHaveLength(1);
    expect(verdict?.offending?.[0]?.line).toBe(3);
  });

  it('calls a must with nothing across it absent rather than divergent', () => {
    const result = checkImports(facts({ edges: [edge({ rule: 'must' })] }));
    const verdict = result.verdicts.find((v) => v.subjectId === 'edge:app-must-not-store');
    expect(verdict?.status).toBe('absent');
  });
});

describe('a directory-shaped first-party answer is not invisible', () => {
  // THE PHASE 180 FIX-ROUND FINDING. Swift resolves at target grain, so EVERY
  // Swift first-party answer is a directory, and Go's package answers are the
  // same shape. `fileOwners` keys only tracked files, so a directory answer
  // used to vanish from both sides of the ledger: not a crossing, not
  // unresolved. Over the rookery copy, a must-not crossed by 33 real resolved
  // imports reported convergent with 0 offending, indistinguishable from the
  // honored reverse promise. These pin the fall-back: a directory answer lands
  // on the component(s) owning tracked files under that prefix.

  const swiftFacts = (toPath: string): ArchFactBase =>
    facts({
      trackedFiles: ['src/app/Main.swift', 'src/store/Db.swift', 'src/store/Io.swift'],
      imports: [
        imported({
          fromPath: 'src/app/Main.swift',
          specifier: 'Store',
          line: 1,
          toPath,
          resolution: 'first-party'
        })
      ]
    });

  it('calls a must-not crossed by a Swift target-directory answer divergent', () => {
    const result = checkImports(swiftFacts('src/store'));
    const verdict = result.verdicts.find((v) => v.subjectId === 'edge:app-must-not-store');
    expect(verdict?.status).toBe('divergent');
    expect(verdict?.offending).toHaveLength(1);
    expect(verdict?.offending?.[0]?.toPath).toBe('src/store');
  });

  it('counts one crossing per import fact, not one per file the directory owns', () => {
    // src/store owns two tracked files. The import is still ONE import.
    const result = checkImports(swiftFacts('src/store'));
    const verdict = result.verdicts.find((v) => v.subjectId === 'edge:app-must-not-store');
    expect(verdict?.offending).toHaveLength(1);
  });

  it('matches by path segment, never by string prefix', () => {
    // 'src/store' must not claim 'src/storefront/x.ts'.
    const base = facts({
      components: [component(), component({ id: 'store', anchors: ['src/storefront'] })],
      trackedFiles: ['src/app/main.go', 'src/storefront/x.go'],
      imports: [
        imported({
          fromPath: 'src/app/main.go',
          specifier: 'example.com/mod/src/store',
          toPath: 'src/store',
          resolution: 'first-party'
        })
      ]
    });
    const verdict = checkImports(base).verdicts.find(
      (v) => v.subjectId === 'edge:app-must-not-store'
    );
    expect(verdict?.status).toBe('convergent');
  });

  it('sees a Go package-directory answer the same way (the pre-existing shape)', () => {
    const base = facts({
      trackedFiles: ['src/app/main.go', 'src/store/db.go'],
      imports: [
        imported({
          fromPath: 'src/app/main.go',
          specifier: 'example.com/mod/src/store',
          line: 2,
          toPath: 'src/store',
          resolution: 'first-party'
        })
      ]
    });
    const verdict = checkImports(base).verdicts.find(
      (v) => v.subjectId === 'edge:app-must-not-store'
    );
    expect(verdict?.status).toBe('divergent');
    expect(verdict?.offending).toHaveLength(1);
  });

  it('treats an EMPTY directory answer as a miss, never as a green', () => {
    // THE PHASE 184 FIX ROUND, AND IT IS THE SAME DEFECT AT ITS BOUNDARY. A
    // C sharp `.csproj` at the repository ROOT has the empty string for its
    // directory, so the arm used to answer first-party with `''`. `owners`
    // holds no empty key and the directory fall-back built the prefix `/`,
    // which no repository relative path starts with, so the fact vanished
    // and a must-not a real `using` crosses printed convergent with 0
    // offending. An edge to the whole tree is not a definite answer, so it
    // withholds the verdict instead.
    const base = facts({
      trackedFiles: ['src/app/Api.cs', 'src/store/Rows.cs'],
      imports: [
        imported({
          fromPath: 'src/app/Api.cs',
          specifier: 'Store.Rows',
          toPath: '',
          resolution: 'first-party'
        })
      ]
    });
    const verdict = checkImports(base).verdicts.find(
      (v) => v.subjectId === 'edge:app-must-not-store'
    );
    expect(verdict?.status).toBe('unverifiable');
    expect(countByCoverage(checkImports(base).verdicts, base).unresolvedImports).toBe(1);
  });

  it('still drops a directory nobody owns, the unmapped-code rule unchanged', () => {
    const base = facts({
      trackedFiles: ['src/app/Main.swift', 'src/other/Loose.swift'],
      imports: [
        imported({
          fromPath: 'src/app/Main.swift',
          specifier: 'Other',
          toPath: 'src/other',
          resolution: 'first-party'
        })
      ]
    });
    const counts = countByCoverage(checkImports(base).verdicts, base);
    // Unmapped code is counted rather than failed, and it is not a miss.
    expect(counts.unresolvedImports).toBe(0);
    const verdict = checkImports(base).verdicts.find(
      (v) => v.subjectId === 'edge:app-must-not-store'
    );
    expect(verdict?.status).toBe('convergent');
  });

  it('feeds the closed boundary the same crossings', () => {
    const base = facts({
      components: [
        component(),
        component({ id: 'store', anchors: ['src/store'], boundary: 'closed' })
      ],
      edges: [],
      trackedFiles: ['src/app/Main.swift', 'src/store/Db.swift'],
      imports: [
        imported({
          fromPath: 'src/app/Main.swift',
          specifier: 'Store',
          toPath: 'src/store',
          resolution: 'first-party'
        })
      ]
    });
    const verdict = checkImports(base).verdicts.find(
      (v) => v.subjectId === 'component:store#boundary'
    );
    expect(verdict?.status).toBe('divergent');
  });
});

describe('an accepted divergence stays a divergence', () => {
  it('keeps the status and carries the person own words', () => {
    const result = checkImports(
      facts({
        imports: [imported()],
        baseline: {
          accepted: [
            {
              fromPath: 'src/app/main.ts',
              toPath: 'src/store/db.ts',
              because: 'The read path is being moved and this is on the list.',
              at: '2026-08-25'
            }
          ]
        }
      })
    );
    const verdict = result.verdicts.find((v) => v.subjectId === 'edge:app-must-not-store');
    expect(verdict?.status).toBe('divergent');
    expect(verdict?.accepted).toBe(true);
    expect(verdict?.reason).toContain('on the list');
  });

  it('marks each accepted offence with the reason and leaves the open ones bare', () => {
    // Two imports cross the same closed line; a baseline row covers one of
    // them. The promise stays divergent with one open, the accepted offence
    // carries the person's words, and the verdict is NOT accepted whole.
    const second = { ...imported(), fromPath: 'src/app/other.ts', line: 3 };
    const result = checkImports(
      facts({
        trackedFiles: ['src/app/main.ts', 'src/app/other.ts', 'src/store/db.ts'],
        imports: [imported(), second],
        baseline: {
          accepted: [
            {
              fromPath: 'src/app/main.ts',
              toPath: 'src/store/db.ts',
              because: 'The read path is being moved.',
              at: '2026-08-25'
            }
          ]
        }
      })
    );
    const verdict = result.verdicts.find((v) => v.subjectId === 'edge:app-must-not-store');
    expect(verdict?.status).toBe('divergent');
    expect(verdict?.accepted).toBeUndefined();
    expect(verdict?.reason).toBe('1 import crosses a line this contract says nothing may cross.');
    const byPath = new Map((verdict?.offending ?? []).map((o) => [o.fromPath, o.accepted]));
    expect(byPath.get('src/app/main.ts')).toBe('The read path is being moved.');
    expect(byPath.get('src/app/other.ts')).toBeUndefined();
    expect(verdict?.offending).toHaveLength(2);
  });

  it('is counted in its own column rather than folded into the ones that hold', () => {
    const base = facts({
      imports: [imported()],
      baseline: {
        accepted: [
          {
            fromPath: 'src/app/main.ts',
            toPath: 'src/store/db.ts',
            because: 'Accepted.',
            at: '2026-08-25'
          }
        ]
      }
    });
    const counts = countByCoverage(checkImports(base).verdicts, base);
    expect(counts.accepted).toBe(1);
    expect(counts.checkedHold).toBe(0);
    expect(counts.broke).toBe(0);
  });
});

describe('the behavioural ceiling', () => {
  it('never lets a calls promise be better than partly checked', () => {
    const base = facts({
      imports: [imported()],
      edges: [edge({ kind: 'calls', rule: 'must-not' })]
    });
    const verdict = checkImports(base).verdicts.find(
      (v) => v.subjectId === 'edge:app-must-not-store'
    );
    expect(verdict?.coverage).toBe('partly-checked');
  });
});

describe('the closed boundary', () => {
  it('is quiet about what a may promise permits and loud about the rest', () => {
    const base = facts({
      components: [
        component(),
        component({ id: 'store', anchors: ['src/store'], boundary: 'closed' })
      ],
      edges: [edge({ id: 'app-may-store', rule: 'may' })],
      imports: [imported()]
    });
    const verdict = checkImports(base).verdicts.find(
      (v) => v.subjectId === 'component:store#boundary'
    );
    expect(verdict?.status).toBe('convergent');
  });

  it('withholds only for a miss that could have crossed into it', () => {
    // The first build summed every unresolved import in the repository, so one
    // miss anywhere made every closed boundary in the project unverifiable and
    // the reason line said "out of this part" about a number that was about
    // somewhere else. A miss written INSIDE the closed part points outward, and
    // a miss written in a part already allowed in would be permitted whatever
    // it named.
    const base = facts({
      components: [
        component(),
        component({ id: 'store', anchors: ['src/store'], boundary: 'closed' })
      ],
      edges: [edge({ id: 'app-may-store', rule: 'may' })],
      imports: [
        imported({
          fromPath: 'src/store/db.ts',
          specifier: '~/unknown',
          toPath: null,
          resolution: 'unresolved',
          reason: 'The specifier could not be resolved to a tracked file'
        })
      ]
    });
    const verdict = checkImports(base).verdicts.find(
      (v) => v.subjectId === 'component:store#boundary'
    );
    expect(verdict?.status).toBe('convergent');
  });

  it('says how many PARTS import in, not how many imports there are', () => {
    const base = facts({
      components: [
        component(),
        component({ id: 'store', anchors: ['src/store'], boundary: 'closed' })
      ],
      edges: [],
      trackedFiles: ['src/app/main.ts', 'src/app/view.ts', 'src/store/db.ts'],
      imports: [
        imported({ line: 3 }),
        imported({ line: 4 }),
        imported({ fromPath: 'src/app/view.ts', line: 9 })
      ]
    });
    const verdict = checkImports(base).verdicts.find(
      (v) => v.subjectId === 'component:store#boundary'
    );
    expect(verdict?.status).toBe('divergent');
    expect(verdict?.offending).toHaveLength(3);
    expect(verdict?.reason).toContain('1 part imports');
  });
});

describe('the evidence checker', () => {
  it('reads the file at HEAD and not the recorded blob', () => {
    const base = facts({
      components: [
        component({
          evidence: [
            {
              path: 'src/app/main.ts',
              blobOid: '1111111111111111111111111111111111111111',
              lineStart: 1,
              lineEnd: 1,
              quote: 'export function main'
            }
          ]
        })
      ],
      headBytes: new Map([['src/app/main.ts', 'export function main(): void {}\n']])
    });
    expect(checkEvidence(base).verdicts[0]?.status).toBe('convergent');
  });

  it('calls a quote that no longer reads as written divergent', () => {
    const base = facts({
      components: [
        component({
          evidence: [
            { path: 'src/app/main.ts', lineStart: 1, lineEnd: 1, quote: 'gone' }
          ]
        })
      ],
      headBytes: new Map([['src/app/main.ts', 'export function main(): void {}\n']])
    });
    const verdict = checkEvidence(base).verdicts[0];
    expect(verdict?.status).toBe('divergent');
    expect(verdict?.reason).toContain('no longer holds the quoted words');
  });

  it('follows a quote that only moved, and jumps to where it is now', () => {
    const base = facts({
      components: [
        component({
          evidence: [
            { path: 'src/app/main.ts', lineStart: 1, lineEnd: 1, quote: 'here' }
          ]
        })
      ],
      headBytes: new Map([['src/app/main.ts', 'one\ntwo\nhere\n']])
    });
    const verdict = checkEvidence(base).verdicts[0];
    expect(verdict?.status).toBe('convergent');
    expect(verdict?.offending?.[0]?.line).toBe(3);
  });

  it('finds the line a quote starts on', () => {
    expect(quoteLine('a\nb\nc\n', 'c')).toBe(3);
    expect(quoteLine('a\nb\n', 'z')).toBeNull();
  });
});

describe('the manifest checker', () => {
  it('reads the five kinds shallowly and wants only the names', () => {
    expect(parseManifest('package.json', '{"dependencies":{"left-pad":"1"}}')).toEqual([
      'left-pad'
    ]);
    expect(parseManifest('go.mod', 'require (\n\tgithub.com/x/y v1.0.0\n)\n')).toEqual([
      'github.com/x/y'
    ]);
    expect(parseManifest('Cargo.toml', '[dependencies]\nserde = "1"\n')).toEqual(['serde']);
    expect(
      parseManifest('Package.swift', '.package(url: "https://github.com/a/b.git", from: "1")')
    ).toEqual(['b']);
    expect(parseManifest('requirements.txt', 'requests==2.0\n# a note\n')).toEqual([
      'requests'
    ]);
  });

  it('gives nothing at all from a file it cannot read, rather than half an answer', () => {
    expect(parseManifest('package.json', 'not json')).toEqual([]);
    expect(collectManifestFacts([{ path: 'package.json', text: 'not json' }]).names.size).toBe(
      0
    );
  });
});

describe('freshness', () => {
  it('counts a commit once per part however many files it touched', () => {
    const counts = countCommitsBehind(
      [component({ anchors: ['src/app'] })],
      ['src/app/main.ts', 'src/app/view.ts'],
      [{ commit: 'a'.repeat(40), paths: ['src/app/main.ts', 'src/app/view.ts'] }]
    );
    expect(counts.get('app')).toBe(1);
  });

  it('counts a file that is not tracked yet, because that is the case it exists for', () => {
    const counts = countUncommitted(
      [component({ anchors: ['src/app'] })],
      [{ path: 'src/app/brand-new.ts', code: '??' }]
    );
    expect(counts.get('app')).toBe(1);
  });

  it('says both numbers in one sentence', () => {
    expect(freshnessSentence('app', 3, 2)).toContain('3 commits have landed under app');
    expect(freshnessSentence('app', 3, 2)).toContain('2 files are changed and not committed');
    expect(freshnessSentence('app', 1, 1)).toContain('1 commit has landed');
    expect(freshnessSentence('app', 0, 0)).toBe('Nothing has landed under app since this was written.');
  });
});

describe('the git readers', () => {
  it('reads a zero separated status, and takes a rename as one change', () => {
    const bytes = Buffer.from(`R  new.ts${NUL}old.ts${NUL} M other.ts${NUL}`, 'utf8');
    expect(readStatusPorcelain(bytes).map((e) => e.path)).toEqual(['new.ts', 'other.ts']);
  });

  it('reads a log stream into commits and the paths each touched', () => {
    const bytes = Buffer.from(
      `${'a'.repeat(40)}\nsrc/a.ts${NUL}src/b.ts${NUL}${'b'.repeat(40)}\nsrc/c.ts${NUL}`,
      'utf8'
    );
    const commits = readLogNameOnly(bytes);
    expect(commits).toHaveLength(2);
    expect(commits[0]?.paths).toEqual(['src/a.ts', 'src/b.ts']);
    expect(commits[1]?.paths).toEqual(['src/c.ts']);
  });

  it('reads a batch answer, and calls a missing object missing', () => {
    const body = 'hello\n';
    const bytes = Buffer.from(
      `${'a'.repeat(40)} blob ${body.length}\n${body}\nHEAD:gone.ts missing\n`,
      'utf8'
    );
    const answers = readCatFileBatch(bytes, ['HEAD:a.ts', 'HEAD:gone.ts']);
    expect(answers[0]?.bytes?.toString('utf8')).toBe(body);
    expect(answers[1]?.bytes).toBeNull();
  });
});
