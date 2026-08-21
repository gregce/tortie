/**
 * The found-program log line states the size of the search list (Phase 109,
 * fix 8, pinned in the fix round).
 *
 * The sentence used to say the program was found "after N folder(s) were
 * tested" while N was computed BEFORE the call and the far side script breaks
 * on the first hit, so the number was not a count of tests. Fix 8 rewrote the
 * line to state the honest number, being how many folders the search list
 * held. The rewrite was observed correct live in smoke:remote and pinned by
 * no test, so one string assertion holds it here.
 *
 * A SOURCE-SHAPE test, because `remoteBinFor` is private to
 * remote-sessions.ts and exercising it functionally means mocking the wire,
 * which would prove the mock. The string is the property.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const MODULE = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'remote-sessions.ts'
);

describe('remoteBinFor', () => {
  it('logs the size of the search list, not a count of folders tested', () => {
    const src = readFileSync(MODULE, 'utf8');
    expect(src).toContain(
      '`The search list held ${String(found.searched)} folder(s).`'
    );
    // The fix 8 comment above the call quotes the old wording, so the
    // negative match is anchored to the sentence form the code would use.
    expect(src).not.toMatch(/were tested\./);
  });
});
