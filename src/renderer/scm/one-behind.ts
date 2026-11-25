/**
 * One call in flight, and one behind it (Phase 371).
 *
 * A change that arrives while the read it asks for is running cannot use that
 * read's answer, because git may have moved under it, and needs no read of its
 * own beyond the next one. So the first call runs at once, the ones that come
 * while it runs share ONE call that starts when it ends, and any number of
 * changes hold at most one git process and one waiting. `state/git.ts` keeps
 * the same rule for `git status`.
 *
 * `run` is started in the same step the call is made when nothing is out, so a
 * quiet repository is read exactly as soon as it was before.
 *
 * THE GAP A COPY OF THIS GETS WRONG. Whether anything waits is read, and the
 * line is closed, in ONE synchronous step. With an await between the two, a
 * call made there would join a line that nothing will ever run again, and a
 * move of git's data would be lost with it. A `run` that throws ends its turn
 * the same way, so a failure can neither close the line for good nor drop the
 * call behind it.
 */

interface Waiting {
  readonly promise: Promise<void>;
  resolve(value: void | PromiseLike<void>): void;
}

/**
 * One call of `run` per key in flight, and one behind it. Every caller of a
 * window waits for the last call it needs: the one its own call started, or
 * the one behind when it came while another ran.
 */
export function oneBehind(
  run: (key: string) => Promise<void>
): (key: string) => Promise<void> {
  const lines = new Map<string, { behind: Waiting | null }>();

  const start = (key: string): Promise<void> => {
    const line: { behind: Waiting | null } = { behind: null };
    lines.set(key, line);
    let call: Promise<void>;
    try {
      call = run(key);
    } catch (err) {
      call = Promise.reject(err);
    }
    return call.finally(() => {
      // One step: nothing behind, so the line closes; or the call behind is
      // started here, which puts its own line in this one's place.
      if (line.behind === null) lines.delete(key);
      else line.behind.resolve(start(key));
    });
  };

  return (key) => {
    const line = lines.get(key);
    if (line === undefined) return start(key);
    if (line.behind === null) {
      let resolve!: Waiting['resolve'];
      const promise = new Promise<void>((r) => {
        resolve = r;
      });
      line.behind = { promise, resolve };
    }
    return line.behind.promise;
  };
}
