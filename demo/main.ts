/**
 * Demo entry: install the fixture bridge, THEN load the real renderer.
 *
 * The dynamic import is the ordering guarantee. A static
 * `import '../src/renderer/main'` would hoist and evaluate the renderer —
 * including its module-scope `initAppearance()` bridge read — before the
 * bridge exists.
 */
import { installDemoBridge } from './bridge/install';

installDemoBridge();

void import('../src/renderer/main').then(async () => {
  // The host page's chip remote-control; must import AFTER the renderer so
  // it shares the app's live store instances.
  const { installDemoDirectives } = await import('./directives');
  installDemoDirectives();
});
