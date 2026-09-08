/**
 * PHASE 229. git's words after a failed commit on a machine are behind a
 * disclosure, and Tortie's own sentence is not.
 *
 * Research 88 section 4.5 read the parent on his Mac Pro: a visible `<pre>` of
 * thirteen lines beginning "Author identity unknown" on the resting face,
 * inside no disclosure and under no aria-expanded control. This pins the
 * shape that replaced it: closed, the face holds one text button reading
 * Show details and no `<pre>`; open, the button reads Hide details and the
 * `<pre>` holds the machine's words verbatim. The state itself lives in the
 * commit box and is exercised in the app run, which presses the control and
 * reads the face; what a static render can prove is both faces.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CommitMachineSaid } from '../CommitMachineSaid';
import { remoteCommitDetailsToggle } from '../../machines/scm';

const SAID =
  'Author identity unknown\n\n*** Please tell me who you are.\n\nRun\n\n' +
  '  git config --global user.email "you@example.com"';

function draw(open: boolean): string {
  return renderToStaticMarkup(
    <CommitMachineSaid text={SAID} open={open} onToggle={() => undefined} />
  );
}

describe('the disclosure in front of git\'s words', () => {
  it('starts with the words off the face and one control to show them', () => {
    const html = draw(false);
    expect(html).toContain('data-scm-commit-details="1"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('>Show details<');
    expect(html).not.toContain('data-scm-commit-said');
    expect(html).not.toContain('Author identity unknown');
  });

  it('shows the words verbatim once asked, and offers to hide them', () => {
    const html = draw(true);
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('>Hide details<');
    expect(html).toContain('data-scm-commit-said="1"');
    expect(html).toContain('Author identity unknown');
    expect(html).toContain('Please tell me who you are.');
  });

  it('uses the clone dialog\'s own two labels, so the remote face adds no words', () => {
    expect(remoteCommitDetailsToggle(false)).toBe('Show details');
    expect(remoteCommitDetailsToggle(true)).toBe('Hide details');
  });

  it('is a text button and never a paragraph', () => {
    const html = draw(false);
    expect(html).toContain('class="btn-text scm-remote-commit-details-toggle"');
    expect(html).not.toContain('<p');
  });
});
