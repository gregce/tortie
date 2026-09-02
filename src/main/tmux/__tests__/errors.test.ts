/**
 * Unit tests for classifyTmuxFailure and serverProbeVerdict
 * (src/main/tmux/errors.ts).
 *
 * Phase 41 added two patterns and put them ahead of the three that were there,
 * so the order is now load bearing. These tests cover all five, and the one
 * string that is deliberately NOT matched.
 *
 * Phase 67 added the serverProbeVerdict suite at the bottom. Its cases are
 * pinned to stderr bytes MEASURED on this machine, not to bytes anybody typed
 * from memory. P67_MEASURED records the capture and the states it came from.
 *
 * Runner: vitest (`npm test`). Assertions on node:assert/strict.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

import { classifyTmuxFailure, serverProbeVerdict } from '../errors';
import { gmuxError } from '../../errors';

describe('the version patterns Phase 41 added', () => {
  it('classifies a protocol version mismatch', () => {
    const err = classifyTmuxFailure(
      'protocol version mismatch (client 8, server 7)\n',
      'fallback'
    );
    assert.equal(err.payload.code, 'TMUX_VERSION_MISMATCH');
    assert.equal(
      err.payload.message,
      'The session server is running a different version of tmux than ' +
        'Tortie, and the two cannot talk to each other.'
    );
    assert.match(err.payload.detail ?? '', /client 8, server 7/);
  });

  it('classifies a server that is too old for the client', () => {
    const err = classifyTmuxFailure(
      'server version is too old for client\n',
      'fallback'
    );
    assert.equal(err.payload.code, 'TMUX_VERSION_MISMATCH');
  });

  /**
   * MEASURED 2026-08-15 on a scratch socket: a 3.5a client against a 3.7b
   * server prints exactly this and exits 1. It is not matched, because an
   * ordinary crashed server prints it too and calling that a version problem
   * would put the wrong name on a real crash.
   */
  it('leaves "server exited unexpectedly" unclassified', () => {
    const err = classifyTmuxFailure('server exited unexpectedly\n', 'fallback');
    assert.equal(err.payload.code, 'UNKNOWN');
    assert.equal(err.payload.message, 'fallback');
  });
});

describe('the three patterns that were already here', () => {
  it('no server running', () => {
    assert.equal(
      classifyTmuxFailure('no server running on /tmp/tmux-501/gmux', 'x').payload
        .code,
      'TMUX_UNREACHABLE'
    );
  });

  it('missing session', () => {
    assert.equal(
      classifyTmuxFailure("can't find session: $12", 'x').payload.code,
      'SESSION_NOT_FOUND'
    );
  });

  // Phase 117 fix round. MEASURED 2026-08-20 on tmux 3.6a: this is the sentence
  // show-environment prints for a target that is not there, and it used to fall
  // through to UNKNOWN.
  it('no such session', () => {
    assert.equal(
      classifyTmuxFailure('no such session: =p117-absent-1', 'x').payload.code,
      'SESSION_NOT_FOUND'
    );
  });

  it('duplicate session', () => {
    assert.equal(
      classifyTmuxFailure('duplicate session: fix-auth', 'x').payload.code,
      'INVALID_INPUT'
    );
  });

  it('anything else keeps the caller sentence and the raw text', () => {
    const err = classifyTmuxFailure('some new tmux complaint', 'tmux x failed');
    assert.equal(err.payload.code, 'UNKNOWN');
    assert.equal(err.payload.detail, 'some new tmux complaint');
  });

  it('empty stderr carries no detail at all', () => {
    assert.equal(classifyTmuxFailure('', 'tmux x failed').payload.detail, undefined);
  });
});

// ---------------------------------------------------------------------------
// Phase 67 — the probe verdict, pinned to measured bytes
// ---------------------------------------------------------------------------

/**
 * GROUND TRUTH, captured 2026-08-17 with tmux 3.6a on scratch sockets under
 * /private/tmp/tmux-501, never on the socket named gmux. Every server in the
 * capture was started by the capture script and signalled by its recorded pid.
 * Only the socket path differs from the bytes as captured.
 *
 * The capture also settled the question this boundary exists for, which is
 * whether a STALLED server can produce a confirming sentence. It cannot. A
 * server stopped with SIGSTOP makes the client hang and print nothing at all,
 * and the exec timeout is what ends it.
 *
 * Two numbers from that state, because they changed the exec layer. With
 * node's default killSignal of SIGTERM the tmux client caught the signal and
 * exited 0, so the exec RESOLVED with empty stdout after 3005 ms, and an empty
 * stdout from list-sessions reads as a completed probe with zero sessions.
 * With killSignal SIGKILL the client cannot answer, the exec REJECTED after
 * 3010 ms with empty stderr, and the classifier returns code UNKNOWN.
 * supervisor.execTmux passes SIGKILL for exactly that reason.
 */
const P67_MEASURED = {
  /** State 2. Server killed with SIGKILL, its socket file left behind. */
  killedServer: 'no server running on /private/tmp/tmux-501/gmux-p67a-kill9\n',
  /** State 1. A socket file that was never created. */
  freshSocket:
    'error connecting to /private/tmp/tmux-501/gmux-p67a-fresh ' +
    '(No such file or directory)\n',
  /** State 4. Socket file chmod 000 while the server was still alive. */
  unreadableSocket:
    'error connecting to /private/tmp/tmux-501/gmux-p67a-chmod ' +
    '(Permission denied)\n',
  /** State 5. Socket file deleted while the server was still alive. */
  deletedSocket:
    'error connecting to /private/tmp/tmux-501/gmux-p67a-unlink ' +
    '(No such file or directory)\n',
  /** State 3. A client killed by the exec timeout says nothing. */
  timeoutSilence: ''
} as const;

describe('serverProbeVerdict: only a completed probe confirms death', () => {
  it('confirms death for the sentence a refused connect produces', () => {
    const err = classifyTmuxFailure(P67_MEASURED.killedServer, 'x');
    assert.equal(err.payload.code, 'TMUX_UNREACHABLE');
    assert.equal(serverProbeVerdict(err), 'no-server');
  });

  it('refuses to confirm death for a socket file that is not there', () => {
    const err = classifyTmuxFailure(P67_MEASURED.freshSocket, 'x');
    assert.equal(err.payload.code, 'TMUX_UNREACHABLE');
    assert.equal(serverProbeVerdict(err), 'not-confirmed');
  });

  /**
   * This string and the one above differ only in the socket path, and this
   * one came from a server that was alive for the whole capture. That is the
   * entire case for reading "No such file or directory" as proof of nothing.
   */
  it('refuses to confirm death for a deleted socket over a live server', () => {
    const err = classifyTmuxFailure(P67_MEASURED.deletedSocket, 'x');
    assert.equal(serverProbeVerdict(err), 'not-confirmed');
  });

  it('refuses to confirm death for a permission error', () => {
    const err = classifyTmuxFailure(P67_MEASURED.unreadableSocket, 'x');
    assert.equal(err.payload.code, 'TMUX_UNREACHABLE');
    assert.equal(serverProbeVerdict(err), 'not-confirmed');
  });

  it('refuses to confirm death for a client that timed out silently', () => {
    const err = classifyTmuxFailure(
      P67_MEASURED.timeoutSilence,
      'tmux list-sessions failed: Command failed'
    );
    assert.equal(err.payload.code, 'UNKNOWN');
    assert.equal(err.payload.detail, undefined);
    assert.equal(serverProbeVerdict(err), 'not-confirmed');
  });

  it('refuses to confirm death for a version mismatch', () => {
    const err = classifyTmuxFailure(
      'protocol version mismatch (client 8, server 7)\n',
      'x'
    );
    assert.equal(serverProbeVerdict(err), 'not-confirmed');
  });

  /**
   * The error code alone is not the evidence. A TMUX_UNREACHABLE that carries
   * no detail has no completed sentence inside it, so it confirms nothing.
   */
  it('refuses to confirm death for TMUX_UNREACHABLE with no detail', () => {
    const err = gmuxError('TMUX_UNREACHABLE', 'server is not running');
    assert.equal(serverProbeVerdict(err), 'not-confirmed');
  });

  it('refuses to confirm death for anything that is not a GmuxError', () => {
    assert.equal(
      serverProbeVerdict(new Error('no server running')),
      'not-confirmed'
    );
    assert.equal(serverProbeVerdict('no server running'), 'not-confirmed');
    assert.equal(serverProbeVerdict(undefined), 'not-confirmed');
    assert.equal(serverProbeVerdict(null), 'not-confirmed');
  });
});

// ---------------------------------------------------------------------------
// Phase 200. The verdict reads the payload's shape, never the constructor
// ---------------------------------------------------------------------------
//
// The 0.98.0 audit read the machine conformance gate refusing the one completed
// answer, being tmux's own "no server running", because the value and this
// module were loaded by two different loaders and `err instanceof GmuxError`
// answered no before the code or the detail could be read. The rows below carry
// the payload WITHOUT carrying the class, which is what a loader boundary, a
// structured clone and a serialised error all look like from here.
describe('Phase 200: serverProbeVerdict reads the payload by shape', () => {
  const withPayload = (payload: unknown): unknown =>
    Object.assign(new Error('a message that names nothing'), { payload });

  it('reads the completed no server answer off a plain object', () => {
    assert.equal(
      serverProbeVerdict(
        withPayload({
          code: 'TMUX_UNREACHABLE',
          message: 'no answer',
          detail: 'no server running on /tmp/x'
        })
      ),
      'no-server'
    );
  });

  it('keeps a reachable failure not confirmed', () => {
    assert.equal(
      serverProbeVerdict(
        withPayload({
          code: 'TMUX_UNREACHABLE',
          message: 'no answer',
          detail: 'connection refused'
        })
      ),
      'not-confirmed'
    );
  });

  // Every malformed shape is refused WHOLE. Not one of them may reach
  // 'no-server' on the strength of the sentence inside it, because a payload
  // that is not exactly the shape this release writes was not written by it.
  it('refuses every malformed payload whole', () => {
    const malformed: Array<readonly [string, unknown]> = [
      ['the payload is a string', 'no server running on /tmp/x'],
      [
        'the payload is an array',
        ['TMUX_UNREACHABLE', 'no server running on /tmp/x']
      ],
      ['the payload is null', null],
      [
        'the code is a number',
        { code: 7, message: 'x', detail: 'no server running on /tmp/x' }
      ],
      [
        'the code is a word this release never named',
        {
          code: 'TMUX_HOLDS_NOTHING',
          message: 'x',
          detail: 'no server running on /tmp/x'
        }
      ],
      [
        'the message is missing',
        { code: 'TMUX_UNREACHABLE', detail: 'no server running on /tmp/x' }
      ],
      [
        'the detail is not text',
        {
          code: 'TMUX_UNREACHABLE',
          message: 'x',
          detail: { text: 'no server running on /tmp/x' }
        }
      ]
    ];
    for (const [name, payload] of malformed) {
      assert.equal(
        serverProbeVerdict(withPayload(payload)),
        'not-confirmed',
        `${name} must be refused whole and keep the durable row`
      );
    }
  });

  it('answers not confirmed for a value carrying no payload at all', () => {
    assert.equal(
      serverProbeVerdict(new Error('no server running on /tmp/x')),
      'not-confirmed'
    );
    assert.equal(
      serverProbeVerdict('no server running on /tmp/x'),
      'not-confirmed'
    );
    assert.equal(serverProbeVerdict(null), 'not-confirmed');
    assert.equal(serverProbeVerdict(undefined), 'not-confirmed');
  });
});
