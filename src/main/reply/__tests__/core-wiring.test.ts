/**
 * Who bumps the question id, as core.ts WRITES it (Phase 318, build/p318/SPEC.md
 * §5.3, §5.6.4, §Revision R14, R16).
 *
 * `GmuxCore` boots a tmux server, a control client and a hook channel, so it is
 * not constructed here. Instead each wiring is LIFTED out of the real
 * src/main/sessions/core.ts with the TypeScript parser, transpiled, and RUN
 * against fakes: the arrow handed to the attach host as `onInput`, to the hook
 * server as `onEvent` and `onSessionEnd`, and to the monitor as `onStatus` and
 * `onChoiceMoved`, and the `tmuxIdOf` method. So what is driven is the code that
 * ships, not a restatement of it.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import { questionFromHookBody } from '../../activity/question';
import { hookBashOf } from '../hook-says';
import { createQuestionIds, type QuestionIds } from '../question-id';
import { hookBodies, REPO } from './fixtures';

const CORE = join(REPO, 'src', 'main', 'sessions', 'core.ts');
const source = ts.createSourceFile(CORE, readFileSync(CORE, 'utf8'), ts.ScriptTarget.Latest, true);

function nodes(root: ts.Node): ts.Node[] {
  const out: ts.Node[] = [];
  const walk = (n: ts.Node): void => {
    out.push(n);
    n.forEachChild(walk);
  };
  walk(root);
  return out;
}

/** The object literal handed to `new <ctor>(…)`, or assigned to `const <name>`. */
function objectOf(where: { ctor?: string; constName?: string }): ts.ObjectLiteralExpression {
  for (const n of nodes(source)) {
    if (where.ctor !== undefined && ts.isNewExpression(n) && n.expression.getText() === where.ctor) {
      const arg = n.arguments?.[0];
      if (arg !== undefined && ts.isObjectLiteralExpression(arg)) return arg;
    }
    if (
      where.constName !== undefined &&
      ts.isVariableDeclaration(n) &&
      n.name.getText() === where.constName &&
      n.initializer !== undefined &&
      ts.isObjectLiteralExpression(n.initializer)
    ) {
      return n.initializer;
    }
  }
  throw new Error(`core.ts holds no object for ${JSON.stringify(where)}`);
}

/** One property's arrow function, its source text. */
function arrowText(object: ts.ObjectLiteralExpression, property: string): string {
  const found = object.properties.find(
    (p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && p.name.getText() === property
  );
  if (found === undefined || !ts.isArrowFunction(found.initializer)) {
    throw new Error(`core.ts hands no arrow as ${property}`);
  }
  return found.initializer.getText();
}

/** Compile one lifted arrow and bind its `this` to `self`, with the module names it closes over. */
function lift<F>(text: string, self: object, scope: Record<string, unknown>): F {
  const js = ts.transpileModule(`const lifted = ${text};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None }
  }).outputText;
  const names = Object.keys(scope);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const make = new Function(...names, `return (function () { ${js}; return lifted; }).call(this);`) as (
    this: object,
    ...values: unknown[]
  ) => F;
  return make.call(self, ...names.map((n) => scope[n]));
}

/** A counter that records every call, delegating to a real one. */
function recordingTurns(): { turns: QuestionIds; calls: unknown[][] } {
  const real = createQuestionIds('1111111111111111');
  const calls: unknown[][] = [];
  return {
    calls,
    turns: {
      current: (id) => real.current(id),
      hook: (id, ask, bash) => {
        calls.push(['hook', id, ask, bash]);
        real.hook(id, ask, bash);
      },
      bump: (id, cause) => {
        calls.push(['bump', id, cause]);
        real.bump(id, cause);
      }
    }
  };
}

describe('the hook bumps (§5.3 item 1)', () => {
  const hookServer = objectOf({ ctor: 'GmuxHookServer' });

  it('a PermissionRequest hooks the id with its composed question and whether its Bash command is whole, before the monitor hears it', () => {
    const { turns, calls } = recordingTurns();
    const order: string[] = [];
    const self = {
      activity: {
        noteHookEvent: vi.fn((...a: unknown[]) => {
          order.push('noteHookEvent');
          calls.push(['noteHookEvent', ...a]);
        })
      }
    };
    const onEvent = lift<(id: string, state: string, event: string, body?: string) => void>(
      arrowText(hookServer, 'onEvent'),
      self,
      { replyTurns: turns, questionFromHookBody, hookBashOf }
    );
    const bodies = hookBodies();
    onEvent('s1', 'needs_input', 'PermissionRequest', bodies[0]);
    onEvent('s2', 'needs_input', 'PermissionRequest', bodies[1]);
    expect(calls).toEqual([
      ['hook', 's1', 'Bash touch p318-one.txt', 'whole'],
      ['noteHookEvent', 's1', 'needs_input', 'Bash touch p318-one.txt'],
      ['hook', 's2', questionFromHookBody(bodies[1] ?? ''), 'partial'],
      ['noteHookEvent', 's2', 'needs_input', questionFromHookBody(bodies[1] ?? '')]
    ]);
  });

  it('every other hook event hooks the id with no question, and the monitor is told exactly as before', () => {
    const { turns, calls } = recordingTurns();
    const self = { activity: { noteHookEvent: (...a: unknown[]) => calls.push(['noteHookEvent', ...a]) } };
    const onEvent = lift<(id: string, state: string, event: string, body?: string) => void>(
      arrowText(hookServer, 'onEvent'),
      self,
      { replyTurns: turns, questionFromHookBody, hookBashOf }
    );
    onEvent('s1', 'working', 'PostToolUse', hookBodies()[0]);
    onEvent('s1', 'idle', 'Stop', '{}');
    onEvent('s1', 'needs_input', 'PermissionRequest', undefined);
    expect(calls).toEqual([
      ['hook', 's1', null, null],
      ['noteHookEvent', 's1', 'working', null],
      ['hook', 's1', null, null],
      ['noteHookEvent', 's1', 'idle', null],
      ['hook', 's1', null, null],
      ['noteHookEvent', 's1', 'needs_input', null]
    ]);
  });

  it('SessionEnd hooks the id first, then does what it always did', async () => {
    const { turns, calls } = recordingTurns();
    const self = {
      resumeInPlace: { noteAgentEnded: (id: string) => calls.push(['noteAgentEnded', id]) },
      activity: {
        checkWitness: (id: string) => {
          calls.push(['checkWitness', id]);
          return Promise.resolve();
        },
        forget: (id: string, keep: boolean) => calls.push(['forget', id, keep])
      }
    };
    const onSessionEnd = lift<(id: string) => void>(arrowText(hookServer, 'onSessionEnd'), self, {
      replyTurns: turns
    });
    onSessionEnd('s1');
    await Promise.resolve();
    await Promise.resolve();
    expect(calls[0]).toEqual(['hook', 's1', null, null]);
    expect(calls.slice(1)).toEqual([['noteAgentEnded', 's1'], ['checkWitness', 's1'], ['forget', 's1', true]]);
  });
});

describe('the desk bump (§5.3 item 2, D23)', () => {
  it('the attach host\'s onInput moves the id as a desk keystroke', () => {
    const { turns, calls } = recordingTurns();
    const onInput = lift<(id: string) => void>(arrowText(objectOf({ ctor: 'AttachHost' }), 'onInput'), {}, {
      replyTurns: turns
    });
    onInput('s1');
    expect(calls).toEqual([['bump', 's1', 'desk']]);
  });
});

describe('the monitor\'s bumps (§5.3 items 3 and 5, R16)', () => {
  const activityDeps = objectOf({ constName: 'activityDeps' });

  it('a committed status that is not needs_input moves the id once, before the status is applied', () => {
    for (const status of ['running', 'idle']) {
      const { turns, calls } = recordingTurns();
      const self = { applyDetectedStatus: (...a: unknown[]) => calls.push(['apply', ...a]) };
      const onStatus = lift<(id: string, status: string) => void>(arrowText(activityDeps, 'onStatus'), self, {
        replyTurns: turns
      });
      onStatus('s1', status);
      expect(calls, status).toEqual([['bump', 's1', 'status'], ['apply', 's1', status]]);
    }
  });

  it('a needs_input commit moves nothing and is applied as before', () => {
    const { turns, calls } = recordingTurns();
    const self = { applyDetectedStatus: (...a: unknown[]) => calls.push(['apply', ...a]) };
    const onStatus = lift<(id: string, status: string) => void>(arrowText(activityDeps, 'onStatus'), self, {
      replyTurns: turns
    });
    onStatus('s1', 'needs_input');
    expect(calls).toEqual([['apply', 's1', 'needs_input']]);
  });

  it('a choice that appeared, moved or went moves the id with its cause', () => {
    const { turns, calls } = recordingTurns();
    const onChoiceMoved = lift<(id: string, kind: string) => void>(arrowText(activityDeps, 'onChoiceMoved'), {}, {
      replyTurns: turns
    });
    for (const kind of ['appeared', 'moved', 'gone']) onChoiceMoved('s1', kind);
    expect(calls).toEqual([
      ['bump', 's1', 'choice-appeared'],
      ['bump', 's1', 'choice-moved'],
      ['bump', 's1', 'choice-gone']
    ]);
  });

  it('D7 end to end through the lifted wiring: hook, needs_input committed, the choice appearing — the question survives', () => {
    const turns = createQuestionIds('2222222222222222');
    const hookServer = objectOf({ ctor: 'GmuxHookServer' });
    const status: string[] = [];
    const self = {
      activity: { noteHookEvent: () => undefined },
      applyDetectedStatus: (_id: string, s: string) => status.push(s)
    };
    const scope = { replyTurns: turns, questionFromHookBody, hookBashOf };
    const onEvent = lift<(id: string, state: string, event: string, body?: string) => void>(arrowText(hookServer, 'onEvent'), self, scope);
    const onStatus = lift<(id: string, s: string) => void>(arrowText(activityDeps, 'onStatus'), self, scope);
    const onChoiceMoved = lift<(id: string, k: string) => void>(arrowText(activityDeps, 'onChoiceMoved'), self, scope);
    onEvent('s1', 'needs_input', 'PermissionRequest', hookBodies()[0]);
    onStatus('s1', 'needs_input');
    onChoiceMoved('s1', 'appeared');
    expect(turns.current('s1').hookAsk).toBe('Bash touch p318-one.txt');
    expect(turns.current('s1').hookBash).toBe('whole');
    // The wait ends: the question goes with it.
    onStatus('s1', 'running');
    expect(turns.current('s1').hookAsk).toBeNull();
  });
});

describe('tmuxIdOf (§5.6)', () => {
  it('reads the live $-id, and null when there is none', () => {
    const method = nodes(source).find(
      (n): n is ts.MethodDeclaration => ts.isMethodDeclaration(n) && n.name.getText() === 'tmuxIdOf'
    );
    expect(method?.body).toBeDefined();
    const text = `(sessionId) => ${method?.body?.getText() ?? '{}'}`;
    const self = { liveIds: new Map([['s1', '$4']]) };
    const tmuxIdOf = lift<(id: string) => string | null>(text, self, {});
    expect(tmuxIdOf('s1')).toBe('$4');
    expect(tmuxIdOf('s2')).toBeNull();
  });
});
