/**
 * The spike's safety net: fabricate a harmless answer for any bridge member
 * the demo has not implemented yet, and say so on the console.
 *
 * A fabricated member is, at once:
 *  - an object whose properties are more fabrications (`gmux.git.status`),
 *  - a function (`gmux.git.status(...)`),
 *  - whose RESULT is both a thenable resolving to `undefined` (invoke-style
 *    members are awaited) and a callable no-op (subscribe-style members'
 *    results are kept as unsubscribe functions).
 *
 * This is deliberately not correct — `undefined` where a list belongs will
 * make some component throw. That throw plus the console line names the next
 * member to implement for real. The net exists so one missing member stops
 * one panel instead of the whole boot.
 */

const seen = new Set<string>();

function note(path: string): void {
  if (seen.has(path)) return;
  seen.add(path);
  console.warn(`[demo-bridge] unmocked member used: ${path}`);
}

/** The value returned by CALLING a fabricated member. */
function fabricatedResult(path: string): unknown {
  const unsub = (): undefined => undefined;
  const carrier = unsub as unknown as Record<string, unknown>;
  carrier.then = (resolve?: (v: undefined) => unknown) =>
    Promise.resolve(undefined).then(resolve);
  carrier.catch = () => carrier;
  carrier.finally = (f?: () => void) => {
    f?.();
    return carrier;
  };
  carrier.__demoFabricated = path;
  return carrier;
}

export function fabricated(path: string): unknown {
  const fn = (..._args: unknown[]): unknown => {
    note(path);
    return fabricatedResult(path);
  };
  return new Proxy(fn, {
    get(target, prop) {
      if (typeof prop === 'symbol') return undefined;
      // Not thenable itself: `await gmux.someObj` must not hang or recurse.
      if (prop === 'then' || prop === 'catch' || prop === 'finally')
        return undefined;
      // Real function-prototype members, so `x.bind(gmux)()` still lands in
      // the fabricated call (renderer stores bind bridge methods).
      if (prop === 'bind' || prop === 'call' || prop === 'apply')
        return Reflect.get(target, prop);
      return fabricated(`${path}.${prop}`);
    }
  });
}

/**
 * Wrap a partial bridge: explicit members win, everything else fabricates.
 * Explicit PLAIN OBJECTS are wrapped recursively, so a partial `sessions`
 * object still fabricates its missing methods.
 */
export function withSafetyNet<T extends object>(
  explicit: object,
  path = 'gmux'
): T {
  return new Proxy(explicit, {
    get(target, prop, receiver) {
      if (Reflect.has(target, prop)) {
        const value = Reflect.get(target, prop, receiver);
        if (
          value !== null &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          typeof prop === 'string'
        ) {
          return withSafetyNet(value, `${path}.${prop}`);
        }
        return value;
      }
      if (typeof prop === 'symbol') return undefined;
      if (prop === 'then' || prop === 'catch' || prop === 'finally')
        return undefined;
      return fabricated(`${path}.${prop}`);
    },
    has() {
      // Feature detection must see a fully-installed bridge.
      return true;
    }
  }) as T;
}
