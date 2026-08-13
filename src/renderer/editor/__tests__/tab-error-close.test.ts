/**
 * Phase 26 item 1, the two general rules.
 *
 * One: any error text a person can see is one plain sentence — never a JSON
 * body, never Electron's handler wrapper, never a stack. The operator got
 * "Error occurred in handler for 'git:showHead'" with a GmuxError JSON body
 * on screen; `errorSentence` is the shape that makes that impossible.
 *
 * Two: a tab in a failed state can always be closed. The broken surface the
 * operator could not dismiss must never exist, so the store-level fact —
 * a tab whose load threw still responds to close — gets a test rather than
 * a reading of the code.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const readFile = vi.fn();
const showHead = vi.fn(async () => '');
const readImage = vi.fn(async () => ({ status: 'ok' }));

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  gmux: {
    fs: { readFile, readImage, writeFile: vi.fn(), readDir: vi.fn() },
    git: { showHead, onChanged: () => () => undefined }
  }
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } }
});

const { useEditor } = await import('../store');
const { errorSentence } = await import('../tab-io');
type OpenFileRequest = import('../../state/open-file').OpenFileRequest;

/** What Electron hands the renderer when a handler threw a GmuxError. */
const WRAPPED =
  "Error occurred in handler for 'git:showHead': GmuxError: " +
  '{"code":"INVALID_INPUT","message":"Paths must be relative to the ' +
  'repository root.","detail":"/Users/op/.claude/skills/s/SKILL.md"}';

function req(over: Partial<OpenFileRequest> = {}): OpenFileRequest {
  return {
    repoPath: '/repo',
    relPath: 'src/auth.ts',
    path: '/repo/src/auth.ts',
    mode: 'file',
    source: 'tree',
    ...over
  };
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  useEditor.setState({ tabs: [], activeId: null, panelOpen: false });
  vi.clearAllMocks();
});

describe('errorSentence — one plain sentence, whatever arrived', () => {
  it('unwraps a classified GmuxError to its own sentence', () => {
    const err = new Error(
      '{"code":"INVALID_INPUT","message":"Paths must be relative to the repository root.","detail":"/x"}'
    );
    expect(errorSentence(err, 'Fallback.')).toBe(
      'Paths must be relative to the repository root.'
    );
  });

  it('never lets a JSON body through, even when the payload parses', () => {
    // A wrapped-but-parseable rejection still unwraps to the inner sentence.
    expect(errorSentence(new Error(WRAPPED), 'Fallback.')).toBe(
      'Paths must be relative to the repository root.'
    );
  });

  it('falls back to the caller sentence when the body cannot be parsed', () => {
    const truncated = new Error(
      "Error occurred in handler for 'git:showHead': GmuxError: {\"code\":"
    );
    const text = errorSentence(truncated, 'The file could not be read.');
    expect(text).toBe('The file could not be read.');
    expect(text).not.toContain('{');
    expect(text).not.toContain('handler');
  });

  it('keeps a plain message and finishes it as a sentence', () => {
    expect(
      errorSentence(new Error('ENOENT: no such file or directory'), 'F.')
    ).toBe('ENOENT: no such file or directory.');
  });

  it('takes only the first line of a stack-shaped message', () => {
    const err = new Error('It broke\n    at loadHead (tab-io.ts:80:11)');
    expect(errorSentence(err, 'F.')).toBe('It broke.');
  });

  it('rejects an over-long first line rather than flooding a toast', () => {
    expect(errorSentence(new Error('x'.repeat(400)), 'Fallback.')).toBe(
      'Fallback.'
    );
  });
});

describe('a tab whose load threw still responds to close', () => {
  it('shows a sentence, not the wrapper, and closes on request', async () => {
    readFile.mockRejectedValue(new Error(WRAPPED));
    useEditor.getState().openFromRequest(req());
    await flush();

    const tab = useEditor.getState().activeTab();
    expect(tab?.error).not.toBeNull();
    expect(tab?.error).not.toContain('{');
    expect(tab?.error).not.toContain('Error occurred in handler');

    useEditor.getState().closeTab(tab?.id as string);
    expect(useEditor.getState().tabs).toHaveLength(0);
    expect(useEditor.getState().activeId).toBeNull();
  });

  it('a failed CONTEXT detail tab closes the same way', async () => {
    readFile.mockRejectedValue(new Error(WRAPPED));
    useEditor.getState().openFromRequest(
      req({
        repoPath: '/repo',
        relPath: '/Users/op/.claude/skills/s/SKILL.md',
        path: '/Users/op/.claude/skills/s/SKILL.md',
        contextEntry: { id: 'skill|s', category: 'skill' }
      })
    );
    await flush();

    const tab = useEditor.getState().activeTab();
    expect(tab?.id).toBe('context:skill|s');
    expect(tab?.error).not.toBeNull();

    useEditor.getState().closeTab(tab?.id as string);
    expect(useEditor.getState().tabs).toHaveLength(0);
  });

  it('closeActive works on a failed tab too (the keyboard path)', async () => {
    readFile.mockRejectedValue(new Error('boom'));
    useEditor.getState().openFromRequest(req());
    await flush();
    useEditor.getState().closeActive();
    expect(useEditor.getState().tabs).toHaveLength(0);
  });
});
