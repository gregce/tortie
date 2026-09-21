/**
 * Phase 299, C3. A slash command typed with no arguments is the person's own
 * message, and WHETHER it is dropped is the vendor's rule rather than the
 * engine's.
 *
 * Two halves, deliberately separate.
 *
 * The first half drives `transform` directly over hand-written ops, so the
 * engine's behaviour is pinned for every provider and not only for the one
 * the shipping map happens to configure. A provider that omits the field must
 * read exactly as it read before this phase, which is what makes the change
 * safe for the nine providers nobody touched.
 *
 * The second half drives the SHIPPING reader over the SHIPPING keep map, on
 * scratch claude records written here, so the seam between the map's
 * `"bareCommand": "keep"` and the engine's `dropBare` is proved to be joined
 * rather than assumed. These are §6.3's rows 13 to 17: a bare command as the
 * only message, one between two real turns, one that is on `dropCommands`, a
 * name that is not a command at all, and the args-bearing control.
 *
 * Each assertion here is owned by one clause. Taking `dropBare` out of
 * `expr.ts` reddens the `'keep'` rows; hard-coding the drop reddens them too;
 * taking the `??  'drop'` default out reddens the omitted-field rows; and
 * moving `dropCommands` behind the bare test reddens row 15.
 *
 * THE CASE OF A COMMAND NAME, settled in the fix round because the verify's
 * merged no-regression table marked this one row WORSE. A bare `/MODEL` is
 * dropped by the parent and counted here. The parent's blanket bare-command
 * drop folded case BY ACCIDENT — its own `dropCommands` test was `includes`,
 * exact, so the parent counts `/MODEL rewrite the release script` and drops
 * bare `/MODEL`, which is two answers to one question and neither of them a
 * ruling. The question is whether the AGENT treats them as one command, and it
 * does not: in claude 2.1.277 the lookup is
 *   `GHn(e,n){return e.name===n||bo(e)===n||(e.aliases?.includes(n)??!1)}`
 *   `ti(e,n){…n.find(g=>{if(g.name===e)return!0;if(GHn(g,e))…})…}`
 * three exact comparisons and no `toLowerCase` anywhere in them, and a name
 * that misses takes the `cmd_unknown` path, which writes `Unknown command:
 * /MODEL. Did you mean /model?` or an `unknown_command_fallback` attachment and
 * never a `<command-name>` wrapper. So a wrapper naming `/MODEL` means a
 * command NAMED `MODEL` resolved — a file under `commands/`, a plugin, an MCP
 * prompt — and that is a prompt expansion, which is the person's message and
 * the very thing this phase exists to count. Folding case for the drop list
 * would silence it AND would move `/MODEL rewrite the release script` from
 * counted to dropped, a regression the table does not report and a widening of
 * `dropCommands`'s membership to every spelling of nine names.
 *
 * It cannot be folded on the keep side either, for a second reason: a kept
 * command's name is DRAWN to a person in the Last message cell and in Details,
 * so the text has to be the record's own bytes. A fold there would change what
 * a row says, not only which rows there are.
 *
 * Both spellings are pinned both ways below, at the engine and through the
 * reader, so a later round cannot fold it quietly. Making the `dropCommands`
 * comparison case-insensitive reddens the case describe and reader rows 18 and
 * 19; making it looser still, by comparing without the `trim`, reddens the
 * padded row.
 */

import * as fs from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { KEEP_MAP, providerMap, providerVersion, readSessionLog } from '../reader';
import type { ReadResult } from '../reader';
import type { TransformOp } from '../reader/map-types';
import { test as testPredicate, transform } from '../reader/expr';
import { scratchDir } from './reader-helpers';

const NINE = [
  '/model',
  '/effort',
  '/login',
  '/config',
  '/logout',
  '/status',
  '/theme',
  '/vim',
  '/terminal-setup'
];

/** The claude shape, minus the field under test. */
function echo(extra: Partial<TransformOp>): TransformOp[] {
  return [
    {
      op: 'commandEcho',
      nameTag: 'command-name',
      argsTag: 'command-args',
      dropCommands: NINE,
      ...extra
    }
  ];
}

function record(name: string, args: string): string {
  return (
    '<command-name>' +
    name +
    '</command-name>\n<command-message>' +
    name.replace(/^\//, '') +
    '</command-message>\n<command-args>' +
    args +
    '</command-args>'
  );
}

describe('Phase 299 C3, the engine: bareCommand is the vendor rule', () => {
  it('omitting the field keeps the behaviour before this phase, so nine providers do not move', () => {
    expect(transform(echo({}), record('/as-built-architecture', ''))).toBe('');
  });

  it("'drop' written out reads the same as omitting it", () => {
    expect(transform(echo({ bareCommand: 'drop' }), record('/as-built-architecture', ''))).toBe('');
  });

  it("'keep' counts the bare command under its own name", () => {
    expect(transform(echo({ bareCommand: 'keep' }), record('/as-built-architecture', ''))).toBe(
      '/as-built-architecture'
    );
  });

  it('dropCommands is checked FIRST and still wins under keep, which is the 444 that must not move', () => {
    for (const n of NINE) {
      expect(transform(echo({ bareCommand: 'keep' }), record(n, ''))).toBe('');
      expect(transform(echo({ bareCommand: 'keep' }), record(n, 'some argument'))).toBe('');
    }
  });

  it('a command WITH arguments reads identically under all three settings', () => {
    const r = record('/loop', 'keep going on the packaging gate until it is green');
    const want = '/loop keep going on the packaging gate until it is green';
    expect(transform(echo({}), r)).toBe(want);
    expect(transform(echo({ bareCommand: 'drop' }), r)).toBe(want);
    expect(transform(echo({ bareCommand: 'keep' }), r)).toBe(want);
  });

  it('whitespace-only arguments are the empty case, because the clause trims', () => {
    expect(transform(echo({ bareCommand: 'drop' }), record('/context', '   \n\t '))).toBe('');
    expect(transform(echo({ bareCommand: 'keep' }), record('/context', '   \n\t '))).toBe(
      '/context'
    );
  });

  it('the rule is about the TAG, so a name that is not a command at all is kept under keep', () => {
    expect(transform(echo({ bareCommand: 'keep' }), record('hello', ''))).toBe('hello');
  });

  it('a missing args TAG is the empty case, not a pass-through', () => {
    const noArgsTag = '<command-name>/context</command-name>';
    expect(transform(echo({ bareCommand: 'drop' }), noArgsTag)).toBe('');
    expect(transform(echo({ bareCommand: 'keep' }), noArgsTag)).toBe('/context');
  });

  it('text with no command tag at all is untouched under every setting', () => {
    const plain = 'Can you check whether the release script still signs the build?';
    expect(transform(echo({}), plain)).toBe(plain);
    expect(transform(echo({ bareCommand: 'keep' }), plain)).toBe(plain);
  });

  /**
   * THE RULED FORM, and the ruling is the integrator's round. This builder
   * wrote `build/p299/SPEC.md`'s prescribed `(op.bareCommand ?? 'drop') ===
   * 'drop'`, under which the only things that DROP are the exact word `drop`
   * and the absent field, so `'Keep'`, `'true'` or any typo read as the NEW
   * behaviour. Two builders reported it independently. What ships is
   * `!== 'keep'`: behaviour-identical for every value the declared type allows,
   * and for everything else it fails to the reading before this phase rather
   * than to the reading after it.
   *
   * IT MATTERS BECAUSE NOTHING VALIDATES THE MAP. `reader/map.ts` casts the
   * JSON straight to `KeepMap`, so a misspelled value reaches the engine
   * unremarked, and the phase's own §6.3 refuses a third spelling of a part
   * type for exactly this reason. A value is not a safer place to guess than a
   * key. This test reddens the moment that character changes back.
   */
  it('a value that is not one of the two words drops, which is the reading before this phase', () => {
    const bogus = echo({ bareCommand: 'Keep' as unknown as 'keep' });
    expect(transform(bogus, record('/as-built-architecture', ''))).toBe('');
    // And the exact word is the whole of what turns the new rule on.
    expect(transform(echo({ bareCommand: 'keep' }), record('/as-built-architecture', ''))).toBe(
      '/as-built-architecture'
    );
  });

  it('the ABSENT field is what the nine untouched providers rely on, and it drops', () => {
    const noField = echo({});
    expect('bareCommand' in noField[0]!).toBe(false);
    expect(transform(noField, record('/as-built-architecture', ''))).toBe('');
  });
});

/**
 * THE CASE RULING. The file header argues it; this is where it is pinned.
 * `dropCommands` names the nine control commands in the vendor's own spelling,
 * and a different spelling is a different command because the vendor's own
 * lookup says so.
 */
describe('Phase 299 C3, a command name is matched exactly and only trimmed', () => {
  it('bare, under keep: the exact name drops and the case variant is counted', () => {
    expect(transform(echo({ bareCommand: 'keep' }), record('/model', ''))).toBe('');
    expect(transform(echo({ bareCommand: 'keep' }), record('/MODEL', ''))).toBe('/MODEL');
  });

  it('every variant of every one of the nine is counted, and the nine themselves still go', () => {
    for (const n of ['/MODEL', '/Model', '/MoDeL', '/EFFORT', '/Terminal-Setup', '/VIM']) {
      expect(transform(echo({ bareCommand: 'keep' }), record(n, ''))).toBe(n);
    }
    for (const n of NINE) {
      expect(transform(echo({ bareCommand: 'keep' }), record(n, ''))).toBe('');
    }
  });

  it('WITH arguments the variant is counted at BOTH builds, which is what a fold would break', () => {
    // `dropCommands` has always been an exact `includes`, so this reading is
    // the parent's too. A case-insensitive comparison would move it.
    const r = record('/MODEL', 'rewrite the release script');
    const want = '/MODEL rewrite the release script';
    expect(transform(echo({}), r)).toBe(want);
    expect(transform(echo({ bareCommand: 'drop' }), r)).toBe(want);
    expect(transform(echo({ bareCommand: 'keep' }), r)).toBe(want);
    // And the exact name with arguments is dropped at both, as it always was.
    expect(transform(echo({}), record('/model', 'opus'))).toBe('');
    expect(transform(echo({ bareCommand: 'keep' }), record('/model', 'opus'))).toBe('');
  });

  it('trimming is the ONLY normalisation, so a padded exact name still drops', () => {
    expect(transform(echo({ bareCommand: 'keep' }), record('  /model  ', ''))).toBe('');
    expect(transform(echo({ bareCommand: 'keep' }), record('  /MODEL  ', ''))).toBe('/MODEL');
  });

  it('where a bare command is dropped the case question does not arise, so nine providers are unmoved', () => {
    expect(transform(echo({}), record('/MODEL', ''))).toBe('');
    expect(transform(echo({ bareCommand: 'drop' }), record('/MODEL', ''))).toBe('');
  });
});

/**
 * Not C3, but it is the engine's and the engine is this builder's file. C1 is
 * written as `or` in the map because `test` reads `Object.keys(pred)[0]` and
 * IGNORES every other key, and there is no `in` op. That is stated in the
 * phase entry as a trap for whoever edits a predicate, and it was stated for a
 * tree that could since have changed, so it is pinned rather than trusted: a
 * round that makes `test` read every key would make a two-key predicate mean
 * something new everywhere, and this test is where that shows up.
 */
describe('Phase 299, the predicate engine C1 depends on', () => {
  it('test reads only the FIRST key of a predicate, so a two-key predicate tests one thing', () => {
    const rec = { type: 'Text' };
    // First key passes, second would fail: the whole predicate passes.
    const firstWins = { eq: ['type', 'Text'], not: { eq: ['type', 'Text'] } } as never;
    expect(testPredicate(firstWins, rec)).toBe(true);
    // First key fails, second would pass: the whole predicate fails.
    const firstLoses = { eq: ['type', 'text'], eq2: ['type', 'Text'] } as never;
    expect(testPredicate(firstLoses, rec)).toBe(false);
  });

  it('or is the only way to accept either spelling, and it does', () => {
    const pred = { or: [{ eq: ['type', 'Text'] }, { eq: ['type', 'text'] }] } as never;
    expect(testPredicate(pred, { type: 'Text' })).toBe(true);
    expect(testPredicate(pred, { type: 'text' })).toBe(true);
    expect(testPredicate(pred, { type: 'TEXT' })).toBe(false);
    expect(testPredicate(pred, { type: 'Texts' })).toBe(false);
  });

  it('there is no in op, so a spelling list cannot be written as one predicate', () => {
    expect(() => testPredicate({ in: ['type', ['Text', 'text']] } as never, { type: 'Text' })).toThrow(
      /unknown predicate in/
    );
  });
});

describe('Phase 299 C3, the seam: the shipping claude map asks the engine to keep', () => {
  const cfg = providerMap('claude');

  it("claude's one commandEcho op carries bareCommand: keep", () => {
    const ops = cfg!.ask!.transform as TransformOp[];
    const op = ops.find((o) => o.op === 'commandEcho');
    expect(op).toBeDefined();
    expect(op!.bareCommand).toBe('keep');
  });

  it('the nine dropCommands names are unchanged, because no name is added or removed', () => {
    const ops = cfg!.ask!.transform as TransformOp[];
    const op = ops.find((o) => o.op === 'commandEcho')!;
    expect(op.dropCommands).toEqual(NINE);
  });

  it("claude's version is 2, which is what re-reads records already stored", () => {
    expect(providerVersion('claude')).toBe(2);
  });

  it('no other provider asks to keep a bare command, and none gains a commandEcho op', () => {
    const keepers: string[] = [];
    const users: string[] = [];
    for (const [name, p] of Object.entries(KEEP_MAP.providers)) {
      for (const o of (p.ask?.transform ?? []) as TransformOp[]) {
        if (o.op !== 'commandEcho') continue;
        users.push(name);
        if (o.bareCommand === 'keep') keepers.push(name);
      }
    }
    expect(users).toEqual(['claude']);
    expect(keepers).toEqual(['claude']);
  });
});

describe('Phase 299 C3, through the reader: what a bare command does to a turn', () => {
  const dir = scratchDir('p299-bare');
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  const CWD = '/Users/dev/demo-app';
  const SID = '99999999-8888-4777-8666-555544443333';
  let n = 0;
  const uuid = () => '0000000' + String(++n).padStart(1, '0') + '-aaaa-4bbb-8ccc-ddddeeeeffff';
  const at = (i: number) => '2026-09-19T10:' + String(10 + i).padStart(2, '0') + ':00.000Z';

  function ask(content: string, i: number): string {
    return JSON.stringify({
      parentUuid: null,
      isSidechain: false,
      type: 'user',
      message: { role: 'user', content },
      uuid: uuid(),
      timestamp: at(i),
      userType: 'external',
      entrypoint: 'cli',
      cwd: CWD,
      sessionId: SID,
      version: '2.1.238',
      gitBranch: 'main',
      promptSource: 'typed',
      origin: { kind: 'human' }
    });
  }

  function answer(text: string, i: number): string {
    return JSON.stringify({
      parentUuid: null,
      isSidechain: false,
      message: {
        model: 'claude-opus-5',
        id: 'msg_0000000000000000000' + n,
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text }]
      },
      requestId: 'req_0000000000000000000' + n,
      type: 'assistant',
      uuid: uuid(),
      timestamp: at(i),
      userType: 'external',
      entrypoint: 'cli',
      cwd: CWD,
      sessionId: SID,
      version: '2.1.238',
      gitBranch: 'main'
    });
  }

  function read(name: string, lines: string[]): ReadResult {
    const file = join(dir, name + '.jsonl');
    fs.writeFileSync(file, lines.join('\n') + '\n');
    return readSessionLog({
      provider: 'claude',
      file,
      sessionId: null,
      cwd: CWD,
      projectPath: CWD,
      watermark: null
    });
  }

  it('row 13: a bare command as the ONLY message reads one ask and one reply', () => {
    const r = read('only', [
      ask(record('/as-built-architecture', ''), 0),
      answer('Reading the tree now and drawing the as-built view.', 1)
    ]);
    expect(r.turns.length).toBe(1);
    expect(r.turns[0]!.ask.text).toBe('/as-built-architecture');
    expect(r.turns[0]!.answer).not.toBeNull();
    expect(r.turns[0]!.answer!.text).toBe('Reading the tree now and drawing the as-built view.');
  });

  it('row 14: a bare command between two real turns gets its own turn, and the turn before it keeps its own reply', () => {
    const r = read('between', [
      ask('Does the release script still sign the build?', 0),
      answer('It signs, but it never notarises.', 1),
      ask(record('/as-built-architecture', ''), 2),
      answer('Drawing the as-built view.', 3),
      ask('Now fix the notarisation step.', 4),
      answer('Fixed, and the gate is green.', 5)
    ]);
    expect(r.turns.length).toBe(3);
    expect(r.turns[0]!.ask.text).toBe('Does the release script still sign the build?');
    expect(r.turns[0]!.answer!.text).toBe('It signs, but it never notarises.');
    expect(r.turns[1]!.ask.text).toBe('/as-built-architecture');
    expect(r.turns[1]!.answer!.text).toBe('Drawing the as-built view.');
    expect(r.turns[2]!.ask.text).toBe('Now fix the notarisation step.');
    expect(r.turns[2]!.answer!.text).toBe('Fixed, and the gate is green.');
  });

  it('row 15: a bare command that IS on dropCommands is still dropped, reply and all', () => {
    const r = read('dropped', [
      ask(record('/model', ''), 0),
      answer('Switched to claude-opus-5.', 1)
    ]);
    expect(r.turns.length).toBe(0);
  });

  it('row 15b: a dropped bare command mid-session leaves the turn before it alone', () => {
    const r = read('dropped-mid', [
      ask('Does the release script still sign the build?', 0),
      answer('It signs, but it never notarises.', 1),
      ask(record('/status', ''), 2),
      ask('Now fix the notarisation step.', 3),
      answer('Fixed, and the gate is green.', 4)
    ]);
    expect(r.turns.length).toBe(2);
    expect(r.turns[0]!.answer!.text).toBe('It signs, but it never notarises.');
    expect(r.turns[1]!.ask.text).toBe('Now fix the notarisation step.');
  });

  it('row 16: a bare tag whose name is not a command at all is counted under that name', () => {
    const r = read('notacommand', [ask(record('hello', ''), 0), answer('Hello back.', 1)]);
    expect(r.turns.length).toBe(1);
    expect(r.turns[0]!.ask.text).toBe('hello');
  });

  /**
   * MEASURED at HEAD and with `dropBare` ablated away, and the two readings
   * are IDENTICAL, which is the point of the control. It also records a
   * residual this phase deliberately does not fix: the turn-folding C3
   * describes happens for a `dropCommands` drop too, so the `/loop` turn draws
   * the reply to the dropped `/effort` because `"pick"` is
   * `last-answer-before-close`. The entry's refusal "No change to
   * `dropCommands`" is why, and the 444 records that name one of the nine are
   * exactly this shape. Pinned so a later round sees it stated rather than
   * finds it.
   */
  /**
   * Rows 18 and 19, THE CASE RULING through the shipping map. This is the one
   * row the verify's merged table marked worse, and these three assertions are
   * what a later round has to argue with before folding case.
   *
   * What a person sees, for a session whose only message is bare `/MODEL`:
   * here the Messages cell reads `2` over `1 you · 1 agent` and Last message
   * reads the age over `Agent reply`; at the parent the ask is dropped, the
   * reply goes with it, and the row reads `0` over `0 you · 0 agent` beside
   * `— / No messages yet` — an empty conversation, for a message the person
   * typed and the agent answered.
   */
  it('row 18: a bare command whose name is a CASE VARIANT of a dropped one is the person’s message', () => {
    const r = read('case-variant', [
      ask(record('/MODEL', ''), 0),
      answer('Drawing the model diagram for this repository.', 1)
    ]);
    expect(r.turns.length).toBe(1);
    expect(r.turns[0]!.ask.text).toBe('/MODEL');
    expect(r.turns[0]!.answer!.text).toBe('Drawing the model diagram for this repository.');
  });

  it('row 18b: the exact name, in the same file shape, is still dropped whole', () => {
    const r = read('case-exact', [
      ask(record('/model', ''), 0),
      answer('Switched to claude-opus-5.', 1)
    ]);
    expect(r.turns.length).toBe(0);
  });

  it('row 19: the variant WITH arguments is counted, exactly as it was before this phase', () => {
    const r = read('case-variant-args', [
      ask(record('/MODEL', 'rewrite the release script'), 0),
      answer('Rewritten, and the gate is green.', 1)
    ]);
    expect(r.turns.length).toBe(1);
    expect(r.turns[0]!.ask.text).toBe('/MODEL rewrite the release script');
  });

  it('row 17, the control: an argument-bearing command reads exactly as it read before', () => {
    const r = read('withargs', [
      ask(record('/loop', 'keep going until the gate is green'), 0),
      answer('Looping.', 1),
      ask(record('/effort', 'ultracode'), 2),
      answer('Effort set.', 3)
    ]);
    expect(r.turns.length).toBe(1);
    expect(r.turns[0]!.ask.text).toBe('/loop keep going until the gate is green');
    expect(r.turns[0]!.answer!.text).toBe('Effort set.');
  });
});
