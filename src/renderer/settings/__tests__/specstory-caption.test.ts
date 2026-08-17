/**
 * Phase 74, GitHub issue 5. The caption under "Enter the code from your
 * browser".
 *
 * WHY THIS TEST EXISTS. The code row is only on screen during a real sign-in.
 * Driving it would run `specstory login`, which opens a browser tab on the
 * operator's machine, and the section reads the operator's own SpecStory
 * sign-in state, so a capture could put their email address in a report. The
 * sentence is lifted out of the JSX for exactly this reason, and this test is
 * how it is proven instead.
 */

import { describe, expect, it } from 'vitest';
import { signInCodeCaption } from '../SpecStorySection';

/** An em dash or an en dash, anywhere. */
const DASHES = /[—–]/;

const LOGIN_URL = 'https://cloud.specstory.com/cli-login';

describe('signInCodeCaption', () => {
  it('names the address the person signs in at', () => {
    expect(signInCodeCaption(LOGIN_URL, true)).toContain('cloud.specstory.com');
  });

  it('says Tortie cannot close the browser tab, which is the whole fix', () => {
    expect(signInCodeCaption(LOGIN_URL, true)).toContain(
      'close it when you’re done'
    );
    expect(signInCodeCaption(LOGIN_URL, true)).toContain('can’t close');
  });

  it('is the exact sentence pair, and no more', () => {
    expect(signInCodeCaption(LOGIN_URL, true)).toBe(
      'Sign in at cloud.specstory.com. It shows a 6-character code. ' +
        'Tortie can’t close that browser tab, so close it when you’re done.'
    );
  });

  it('writes no em dash and no en dash', () => {
    expect(signInCodeCaption(LOGIN_URL, true)).not.toMatch(DASHES);
    expect(signInCodeCaption(LOGIN_URL, false)).not.toMatch(DASHES);
  });

  it('shows a self-hosted address rather than a production one', () => {
    expect(signInCodeCaption('https://specstory.example.com/cli-login', true)).toContain(
      'specstory.example.com'
    );
  });

  it('leaves the could-not-start sentence exactly as it was', () => {
    expect(signInCodeCaption(LOGIN_URL, false)).toBe(
      'Tortie couldn’t start SpecStory sign-in. Check the SpecStory command above, then try again.'
    );
  });
});
