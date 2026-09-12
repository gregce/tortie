/**
 * PHASE 261'S FIX ROUND — THE MSW REFUSAL IS ABOUT NAMING, NOT IMPORTING.
 *
 * Item 6's module header said the refusal fires "in a file that imports msw",
 * and `NAMES_MSW` is tested against `RuleContext.text`, which is the whole
 * file, so a mention in a COMMENT counts. The verifier drove it and a file
 * whose only `msw` sits in a comment lost both of its real rows.
 *
 * The behaviour is the deliberate one and did not move: it is the same
 * question `NAMES_CLAP` asks, and the wide direction costs a row this base
 * does not draw rather than a row it invents. What moved is the sentence. This
 * file is that sentence made executable, so the two cannot drift apart again:
 * it pins the comment case as REFUSED and the same two sites in a file that
 * never says msw as ANSWERED, which is the control that stops a rule refusing
 * everything from reading as a rule that refuses the right thing.
 *
 * It goes red both ways round. Narrow `NAMES_MSW` to a real import and the
 * comment case answers; widen it to any file at all and the control goes
 * quiet.
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
