/**
 * The smallest DOM a real `@xterm/xterm` Terminal needs in order to PARSE.
 *
 * xterm's buffer, its wrap flag and its link providers are all DOM free; only
 * `Terminal.open()` touches a real document, and nothing here calls it. So the
 * shipping library — the exact bytes in node_modules that the renderer loads —
 * can be driven under plain node, which is what lets this measurement read
 * `isWrapped` off the real implementation rather than off a model of it.
 */
export function installDomShim() {
  const el = () => ({
    style: {},
    classList: { add() {}, remove() {}, contains: () => false, toggle() {} },
    appendChild() {},
    removeChild() {},
    setAttribute() {},
    removeAttribute() {},
    getContext: () => null,
    addEventListener() {},
    removeEventListener() {},
    remove() {},
    ownerDocument: null
  });
  globalThis.window = globalThis;
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent: 'node', platform: 'MacIntel' },
    configurable: true
  });
  globalThis.document = {
    createElement: el,
    createElementNS: el,
    createTextNode: () => ({}),
    body: { appendChild() {} },
    addEventListener() {},
    removeEventListener() {}
  };
  globalThis.matchMedia = () => ({
    matches: false,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {}
  });
}
