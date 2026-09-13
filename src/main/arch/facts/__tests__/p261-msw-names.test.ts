/**
 * PHASE 261 — THE MSW REFUSAL IS ABOUT A SPELLING, NOT AN IMPORT AND NOT A
 * MENTION.
 *
 * The sentence in `rules-network.ts` has been wrong twice. It first said the
 * refusal fires "in a file that imports msw", which is too narrow, because
 * `NAMES_MSW` is tested against `RuleContext.text`, the whole file, so the
 * spelling counts inside a COMMENT too. The fix round replaced it with "a file
 * that NAMES the msw package", which the committer drove over twelve shapes
 * and found too WIDE: a plain `// … msw …` mention matches nothing, and
 * neither does a bare `import 'msw'` or a dynamic `import('msw')`.
 *
 * What the regex asks for is msw's `from '…'` or `require('…')` spelling,
 * subpath included, anywhere in the text. The behaviour is the deliberate one
 * and has not moved in either round: it is the same question `NAMES_CLAP`
 * asks, and being wrong the wide way costs a row this base does not draw
 * rather than a row it invents. What moved both times is the sentence, and
 * this file is that sentence made executable so it cannot drift a third time.
 *
 * Every shape of the split is pinned below, with the file that never says msw
 * as the control that stops a rule refusing EVERYTHING from reading as a rule
 * that refuses the right thing.
 *
 * It goes red both ways round. Narrow `NAMES_MSW` to a real import and the
 * comment case answers; widen it to the word `msw` and the three answered
 * spellings go quiet.
 */

import { describe, expect, it } from 'vitest';
import { applyCallRules } from '../rules';
import { ctx, site } from './site';

const LINES = ['line one', 'line two'];

function subjects(
  sites: Parameters<typeof applyCallRules>[0],
  c: ReturnType<typeof ctx>
): string[] {
  return applyCallRules(sites, c, LINES).map((f) => `${f.category}/${f.kind} ${f.subject}`);
}

/** The two sites, one on each branch of the network rule. */
const URL_SITE = site('http.get', ['https://really.example.com/v1', null]);
const VERB_SITE = site('http.post', ['/x', null]);

const NO_MSW = ctx(
  'src/main/net.ts',
  'typescript',
  "import { thing } from './real-net';\n"
);
const COMMENT_ONLY = ctx(
  'src/main/mockish.ts',
  'typescript',
  "// the handlers used to live here: import { http } from 'msw'\n" +
    "import { thing } from './real-net';\n"
);
const IMPORTS = ctx(
  'src/mocks/handlers.ts',
  'typescript',
  "import { http } from 'msw';\n"
);

/** The spellings the regex carries, and the ones it does not. */
const CARRIED: ReadonlyArray<readonly [string, string]> = [
  ["from 'msw'", "import { http } from 'msw';\n"],
  ["require('msw')", "const { http } = require('msw');\n"],
  ["from 'msw/node'", "import { setupServer } from 'msw/node';\n"],
  ["require('msw/node')", "const s = require('msw/node');\n"],
  ['the same spelling inside a comment', "// import { http } from 'msw'\n"]
];
const NOT_CARRIED: ReadonlyArray<readonly [string, string]> = [
  ["a bare import 'msw'", "import 'msw';\n"],
  ["a dynamic import('msw')", "const m = await import('msw');\n"],
  ['a plain mention of the word', '// these handlers are msw handlers\n'],
  ['a string constant', "const pkg = 'msw';\n"],
  ["vi.mock('msw')", "vi.mock('msw');\n"],
  ['a relative helper named for it', "import { h } from './msw-helpers';\n"]
];

describe('the msw refusal reads the whole file', () => {
  it('answers both sites in a file that never says msw, which is the control', () => {
    expect(subjects([URL_SITE], NO_MSW)).toEqual([
      'network/client talks to https://really.example.com/v1'
    ]);
    expect(subjects([VERB_SITE], NO_MSW)).toEqual(['network/client HTTP client call']);
  });

  it('refuses both sites in a file that IMPORTS msw', () => {
    expect(subjects([URL_SITE], IMPORTS)).toEqual([]);
    expect(subjects([VERB_SITE], IMPORTS)).toEqual([]);
  });

  it('refuses both sites where the ONLY msw is in a comment, which is the stated cost', () => {
    expect(subjects([URL_SITE], COMMENT_ONLY)).toEqual([]);
    expect(subjects([VERB_SITE], COMMENT_ONLY)).toEqual([]);
  });

  it('refuses every spelling the regex carries, a comment included', () => {
    for (const [name, text] of CARRIED) {
      const c = ctx('src/mocks/handlers.ts', 'typescript', text);
      expect(subjects([URL_SITE], c), name).toEqual([]);
      expect(subjects([VERB_SITE], c), name).toEqual([]);
    }
  });

  it('ANSWERS every spelling it does not carry, which is the corrected sentence', () => {
    // COMMITTER'S ROUND. "A file that NAMES the msw package" would have to
    // refuse all six of these, and it refuses none of them. Two are genuine
    // msw imports, so this list is the limit as well as the wording.
    for (const [name, text] of NOT_CARRIED) {
      const c = ctx('src/mocks/handlers.ts', 'typescript', text);
      expect(subjects([URL_SITE], c), name).toEqual([
        'network/client talks to https://really.example.com/v1'
      ]);
      expect(subjects([VERB_SITE], c), name).toEqual(['network/client HTTP client call']);
    }
  });

  it('refuses the node stdlib receiver in a file that names msw, the narrower mistake', () => {
    // `https.get` is node's own, and it is refused here for the same reason:
    // the receiver is one of msw's three and the file names the package. It is
    // the honest half of the limit rather than a defect this test hides.
    expect(subjects([site('https.get', ['https://real.example.com/needed', null])], IMPORTS)).toEqual([]);
    expect(subjects([site('https.get', ['https://real.example.com/needed', null])], NO_MSW)).toEqual([
      'network/client talks to https://real.example.com/needed'
    ]);
  });
});
