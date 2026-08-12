/**
 * Phase 18.6 — the clone progress bar cannot tell the user a number that git
 * never printed.
 *
 * THE THING THESE TESTS EXIST TO PREVENT. The first draft of the design mapped
 * counting and compressing onto 0 to 15 of one bar, receiving onto 15 to 85,
 * and the rest onto 85 to 100, then claimed every value on the bar came from a
 * number git printed. It did not. Measured on a depth 1 clone of
 * microsoft/TypeScript, resolving and checking out were 192 of 505 frames, so
 * the last 15 percent of that bar would have covered about a third of the
 * wait. The bar shipped here shows the CURRENT PHASE'S OWN percentage and
 * nothing else.
 *
 * Four rules, one test each, plus the two sentences a cancel can produce.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CloneDone, CloneProgress } from '@shared/ipc';

type Frame = CloneProgress | CloneDone;

const listeners = new Map<string, (frame: Frame) => void>();
let cancelled: string[] = [];
/** Every address a preflight was actually run against, in order. */
let preflighted: string[] = [];
/** What the clipboard holds for the next dialog open. */
let clipboard = '';
/** When set, every preflight rejects with it, the way main reports a failure. */
let preflightRejection: { kind: string; detail: string } | null = null;

function installGlobals(): void {
  vi.stubGlobal('window', {
    addEventListener() {},
    removeEventListener() {},
    gmux: {
      projects: {
        list: () => Promise.resolve([]),
        add: () => Promise.resolve({ id: 'p', name: 'r', path: '/tmp/r' }),
        pickDirectory: () => Promise.resolve(null),
        clonePreflight: (input: { raw: string }) => {
          preflighted.push(input.raw);
          if (preflightRejection !== null) {
            // The wire shape main rejects with: a sentence, then the JSON
            // payload that carries the kind and git's raw stderr.
            return Promise.reject(
              new Error(
                `Error invoking remote method: ${JSON.stringify({
                  message: 'main built this one',
                  ...preflightRejection
                })}`
              )
            );
          }
          return Promise.resolve({
            url: 'https://github.com/owner/repo.git',
            host: 'github.com',
            owner: 'owner',
            repo: 'repo',
            suggestedName: 'repo'
          });
        },
        clone: (input: { cloneId: string }) =>
          Promise.resolve({ cloneId: input.cloneId }),
        cancelClone: (id: string) => {
          cancelled.push(id);
          return Promise.resolve();
        },
        onCloneProgress: (id: string, cb: (frame: Frame) => void) => {
          listeners.set(id, cb);
          return () => listeners.delete(id);
        }
      }
    }
  });
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem() {},
    removeItem() {}
  });
  vi.stubGlobal('document', {
    body: { classList: { add() {}, remove() {}, contains: () => false } },
    querySelector: () => null
  });
  // The clipboard prefill reads this. A dialog that opens with an address on
  // the clipboard is the case research 35 §5.9 cut a network call out of.
  vi.stubGlobal('navigator', {
    clipboard: { readText: () => Promise.resolve(clipboard) }
  });
}

installGlobals();

const { useClone } = await import('../clone');

/** Let every queued promise in the preflight-then-clone chain run. */
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Open the dialog, fill it in, and get git "running" with a live listener. */
async function startClone(): Promise<(frame: Frame) => void> {
  useClone.getState().openDialog();
  useClone.setState({
    address: 'https://github.com/owner/repo.git',
    parentDir: '/tmp/p186',
    name: 'repo'
  });
  useClone.getState().submit();
  await settle();
  const entry = [...listeners.entries()].pop();
  if (entry === undefined) throw new Error('no clone stream was subscribed');
  return entry[1];
}

beforeEach(() => {
  listeners.clear();
  cancelled = [];
  preflighted = [];
  clipboard = '';
  preflightRejection = null;
  useClone.setState({ open: false, status: 'editing' });
});

// ---------------------------------------------------------------------------
// The preflight only ever runs because the user did something
// ---------------------------------------------------------------------------

describe('opening the dialog sends nothing to anybody', () => {
  it('prefills from the clipboard and runs no preflight', async () => {
    clipboard = 'https://private.example.com/team/secret.git';
    useClone.getState().openDialog();
    await settle();
    await settle();
    // The address is in the field, which is the whole point of the prefill.
    expect(useClone.getState().address).toBe(clipboard);
    // The prefill moved the keyboard to the folder field, because that is the
    // thing still missing. In the real dialog that move BLURS the address
    // field, and the address field's onBlur is `checkAddress`. This line is
    // that blur, and it is the whole defect: without the suppression the
    // assertion below fails and a request goes out.
    useClone.getState().checkAddress();
    await settle();
    // And nothing was sent to private.example.com. Research 35 §3.5 and §5.9:
    // a preflight on open would send a request, and whatever credential the
    // keychain offers for that host, to whatever the user happened to copy.
    //
    // THE REGRESSION THIS CATCHES. The prefill moves the keyboard to the
    // folder field when there is no folder guess, that move blurs the address
    // field, and the blur is what runs the preflight. Composed, they fired a
    // real `git ls-remote` at an unrelated host on the first launch of the
    // integrated build.
    expect(preflighted).toEqual([]);
  });

  it('still checks when the user leaves the field themselves', async () => {
    clipboard = 'https://github.com/owner/repo.git';
    useClone.getState().openDialog();
    await settle();
    await settle();
    useClone.getState().checkAddress();
    await settle();
    expect(preflighted).toEqual([]);
    // The user edits, then tabs away. That is an explicit action and it checks.
    useClone.getState().setAddress('https://github.com/owner/other.git');
    useClone.getState().checkAddress();
    await settle();
    expect(preflighted).toEqual(['https://github.com/owner/other.git']);
  });

  it('checks an untouched prefilled address when the user submits', async () => {
    clipboard = 'https://github.com/owner/repo.git';
    useClone.getState().openDialog();
    await settle();
    await settle();
    useClone.getState().checkAddress();
    await settle();
    expect(preflighted).toEqual([]);
    useClone.setState({ parentDir: '/tmp/p186', name: 'repo' });
    useClone.getState().submit();
    await settle();
    // Suppressing the blur check never loses the check that matters: submit
    // runs its own before a single byte is written.
    expect(preflighted).toEqual(['https://github.com/owner/repo.git']);
  });
});

describe('the bar shows one phase at a time', () => {
  it('resets when the phase word changes', async () => {
    const send = await startClone();
    send({ cloneId: 'c', phase: 'receiving', percent: 46 });
    expect(useClone.getState().percent).toBe(46);
    expect(useClone.getState().phaseWord).toBe('Downloading');

    // A new phase whose first frame carries no percentage. The bar must be
    // empty, not stuck at 46, and not a synthesized 87.
    send({ cloneId: 'c', phase: 'resolving' });
    expect(useClone.getState().phaseWord).toBe('Setting up');
    expect(useClone.getState().percent).toBeNull();

    send({ cloneId: 'c', phase: 'resolving', percent: 3 });
    expect(useClone.getState().percent).toBe(3);
  });

  it('does not reset between two phases that share one word', async () => {
    const send = await startClone();
    send({ cloneId: 'c', phase: 'enumerating' });
    send({ cloneId: 'c', phase: 'counting', percent: 51 });
    expect(useClone.getState().phaseWord).toBe('Preparing on the server');
    expect(useClone.getState().percent).toBe(51);
  });

  it('shows nothing until a percentage arrives', async () => {
    const send = await startClone();
    expect(useClone.getState().phaseWord).toBe('Preparing on the server');
    expect(useClone.getState().percent).toBeNull();
    // Enumerating carries a count and no percentage, and appears once.
    send({ cloneId: 'c', phase: 'enumerating' });
    expect(useClone.getState().percent).toBeNull();
  });

  it('carries git own byte figure only while downloading', async () => {
    const send = await startClone();
    send({ cloneId: 'c', phase: 'receiving', percent: 50, bytes: '18.25 MiB' });
    expect(useClone.getState().bytes).toBe('18.25 MiB');
    // A receiving frame with no figure keeps the last one rather than
    // flickering the line away.
    send({ cloneId: 'c', phase: 'receiving', percent: 51 });
    expect(useClone.getState().bytes).toBe('18.25 MiB');
    // Leaving the phase drops it. There is no total to keep it against.
    send({ cloneId: 'c', phase: 'resolving', percent: 1 });
    expect(useClone.getState().bytes).toBeNull();
  });

  it('ignores frames from a superseded clone', async () => {
    const send = await startClone();
    send({ cloneId: 'c', phase: 'receiving', percent: 40 });
    const stale = send;
    // Esc and the scrim are inert while git is running, so the store's own
    // close is too. A reflex keystroke must not end a download.
    useClone.getState().close();
    expect(useClone.getState().open).toBe(true);
    useClone.setState({ status: 'editing' });
    const fresh = await startClone();
    fresh({ cloneId: 'c2', phase: 'compressing', percent: 10 });
    stale({ cloneId: 'c', phase: 'receiving', percent: 99 });
    expect(useClone.getState().phaseWord).toBe('Compressing on the server');
    expect(useClone.getState().percent).toBe(10);
  });
});

describe('a cancel says what main did on disk, and never more', () => {
  it('claims nothing was left only when main removed it', async () => {
    const send = await startClone();
    useClone.getState().cancel();
    expect(cancelled).toHaveLength(1);
    expect(useClone.getState().status).toBe('stopping');
    send({ cloneId: 'c', done: true, cancelled: true });
    expect(useClone.getState().status).toBe('editing');
    expect(useClone.getState().cancelNote).toBe(
      'Clone cancelled. Nothing was left on disk.'
    );
    // The fields survive, so the user can try again without retyping.
    expect(useClone.getState().address).toBe(
      'https://github.com/owner/repo.git'
    );
  });

  it('names the leftover when the removal failed', async () => {
    const send = await startClone();
    useClone.getState().cancel();
    send({
      cloneId: 'c',
      done: true,
      cancelled: true,
      leftoverPath: '/tmp/p186/.tortie-clone-BfgUzn'
    });
    expect(useClone.getState().cancelNote).toBe(
      'Clone cancelled. Tortie could not remove /tmp/p186/.tortie-clone-BfgUzn. You can delete it yourself.'
    );
  });
});

describe('each failure says its own thing', () => {
  it('tells an unauthenticated user to sign in, not to check the address', async () => {
    const send = await startClone();
    send({
      cloneId: 'c',
      done: true,
      error: {
        kind: 'unauthenticated',
        message: 'ignored, the renderer builds its own sentence',
        detail: "fatal: could not read Username for 'https://github.com'"
      }
    });
    const failure = useClone.getState().failure;
    expect(failure?.message).toBe(
      'Tortie could not sign in to github.com. Clone this repository once from your terminal so macOS saves the credential, then try again.'
    );
    expect(useClone.getState().status).toBe('editing');
  });

  it('adds the gh line only when main reported gh can help', async () => {
    const send = await startClone();
    send({
      cloneId: 'c',
      done: true,
      error: {
        kind: 'unauthenticated',
        message:
          'Tortie could not sign in to github.com. Clone this repository once from your terminal so macOS saves the credential, then try again.\nRunning gh auth setup-git will let git use your GitHub login.'
      }
    });
    expect(useClone.getState().failure?.message.split('\n')).toHaveLength(2);
  });

  it('names the folder in the collision message', async () => {
    const send = await startClone();
    send({
      cloneId: 'c',
      done: true,
      error: { kind: 'destinationExists', message: 'ignored' }
    });
    expect(useClone.getState().failure?.message).toBe(
      "'repo' already exists in that folder."
    );
  });

  it('prints git own last line rather than inventing a diagnosis', async () => {
    const send = await startClone();
    send({
      cloneId: 'c',
      done: true,
      error: {
        kind: 'unknown',
        message: 'ignored',
        detail: 'Cloning into ...\n\nfatal: something nobody classified\n'
      }
    });
    expect(useClone.getState().failure?.message).toBe(
      'The clone did not finish.\nfatal: something nobody classified'
    );
  });
});

describe('the address field', () => {
  it('refuses a string that cannot be an address without a network call', () => {
    useClone.getState().openDialog();
    useClone.getState().setAddress('not an address');
    useClone.getState().checkAddress();
    expect(useClone.getState().failure?.kind).toBe('badUrl');
    expect(useClone.getState().status).toBe('editing');
  });

  it('does not drop the click that caused the check', async () => {
    useClone.getState().openDialog();
    useClone.getState().setAddress('https://github.com/owner/repo.git');
    useClone.setState({ parentDir: '/tmp/p186' });
    // The blur fires first, because clicking the button is what caused it.
    useClone.getState().checkAddress();
    expect(useClone.getState().status).toBe('checking');
    useClone.getState().submit();
    await settle();
    expect(useClone.getState().status).toBe('running');
    // One round trip, not two: the click reused the blur's check.
    expect(listeners.size).toBe(1);
  });

  /**
   * THE PHASE 18.6 FIX ROUND. A failure has to stay on screen long enough to
   * be read, and reading it costs nothing.
   *
   * What was measured on the real build. One bad address, then three mouse
   * clicks on [Show details] and six presses of Tab, sent ten `git ls-remote`
   * round trips to the host and never once showed the raw stderr. Each blur
   * re-checked the failed string, the re-check opened by clearing `failure`,
   * and clearing it unmounted the button before the mouseup arrived.
   *
   * These three tests are that probe, with the same counts.
   */
  describe('a failed address is answered once', () => {
    const bad = 'https://127.0.0.1:8771/verify/needs-a-token.git';

    async function failOnce(): Promise<void> {
      preflightRejection = {
        kind: 'unauthenticated',
        detail: 'fatal: unable to get password from user'
      };
      useClone.getState().openDialog();
      useClone.getState().setAddress(bad);
      useClone.getState().checkAddress();
      await settle();
    }

    it('spends one round trip on a bad address, not ten', async () => {
      await failOnce();
      expect(preflighted).toEqual([bad]);
      expect(useClone.getState().failure?.kind).toBe('unauthenticated');

      // Three clicks on [Show details]. Each one blurs the address field
      // first, because the field holds the keyboard after a failure.
      for (let i = 0; i < 3; i += 1) {
        useClone.getState().checkAddress();
        await settle();
      }
      // Six presses of Tab, which blur the field the same way.
      for (let i = 0; i < 6; i += 1) {
        useClone.getState().checkAddress();
        await settle();
      }
      expect(preflighted).toEqual([bad]);
    });

    it('leaves the failure block mounted, so the button can be clicked', async () => {
      await failOnce();
      // The unmount was the defect. `checking` clears `failure`, React drops
      // the error block and the [Show details] button inside it, and the
      // mouseup lands on nothing. A blur after a failure must do neither.
      useClone.getState().checkAddress();
      expect(useClone.getState().status).toBe('editing');
      expect(useClone.getState().failure).not.toBeNull();

      useClone.getState().toggleDetails();
      expect(useClone.getState().detailsOpen).toBe(true);
      expect(useClone.getState().failure?.detail).toBe(
        'fatal: unable to get password from user'
      );
    });

    it('checks again as soon as the user edits the address', async () => {
      await failOnce();
      preflightRejection = null;
      useClone.getState().setAddress('https://github.com/owner/repo.git');
      useClone.getState().checkAddress();
      await settle();
      expect(preflighted).toEqual([bad, 'https://github.com/owner/repo.git']);
      expect(useClone.getState().failure).toBeNull();
      expect(useClone.getState().resolvedUrl).toBe(
        'https://github.com/owner/repo.git'
      );
    });

    it('never clones on a failed check, even though the string is recorded', async () => {
      await failOnce();
      useClone.setState({ parentDir: '/tmp/p186', name: 'needs-a-token' });
      // `submit` reuses a check only when it produced a URL. A failure did
      // not, so the address is checked again and nothing is spawned.
      useClone.getState().submit();
      await settle();
      expect(preflighted).toEqual([bad, bad]);
      expect(listeners.size).toBe(0);
      expect(useClone.getState().status).toBe('editing');
    });
  });

  it('follows the address with a folder name until the user types one', () => {
    useClone.getState().openDialog();
    useClone.getState().setAddress('https://github.com/owner/repo/tree/main');
    expect(useClone.getState().name).toBe('repo');
    useClone.getState().setName('mine');
    useClone.getState().setAddress('https://github.com/owner/other.git');
    expect(useClone.getState().name).toBe('mine');
  });
});
