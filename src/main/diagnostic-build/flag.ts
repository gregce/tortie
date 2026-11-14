/**
 * Is this the diagnostic build? (Phase 364, build/p364/SPEC.md D3.)
 *
 * THE ONE FLAG. `__TORTIE_DIAGNOSTIC__` is a build-time define:
 * electron.vite.config.ts sets it for main from `TORTIE_DIAGNOSTIC=1`, and
 * vitest.config.ts sets it to false, so a unit test runs the normal build
 * unless it stubs the global itself.
 *
 * `typeof` rather than a bare read, as src/main/build-info.ts reads its own
 * define: the build's gates import shipping modules under tsx with no define
 * at all (build/p3333/sample.mjs reaches src/main/updates/updater.ts that
 * way, inside `npm run build`), and `typeof` on an undeclared identifier is
 * the one form that does not throw. With no define this is the normal build.
 * With one, the bundler folds the whole expression to its literal.
 *
 * READ IT ONLY AS THE WHOLE TEST OF AN `if` STATEMENT, with no `else`:
 *
 *     if (DIAGNOSTIC_BUILD) armChecker();
 *
 * Rollup folds that statement away in the normal build, and the module behind
 * it goes with it, so the normal app stays byte for byte what it was. It does
 * NOT fold a conditional expression: the spec step's first prototype put a
 * ternary on this flag in the About options, and `false ? … : …` survived into
 * the normal bundle and changed it (§2.5). conformance:diagnostic (rule D2)
 * holds every read to the `if` shape.
 */
declare const __TORTIE_DIAGNOSTIC__: boolean;

export const DIAGNOSTIC_BUILD: boolean =
  typeof __TORTIE_DIAGNOSTIC__ === 'boolean' && __TORTIE_DIAGNOSTIC__;
