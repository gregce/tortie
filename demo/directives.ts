/**
 * Demo directives: the host page's remote control.
 *
 * The marketing site's expanded-demo stage shows suggestion chips ("Restore
 * the saved session", "⌘T — start an agent", "Open the diff"). Each chip
 * posts a message into this iframe; this module receives it and navigates
 * the REAL app's own store to that moment. Navigation only — the chip takes
 * the visitor to the doorway (the tern-docs restore card, the open ⌘T
 * modal, the queue.ts diff) and the visitor performs the act themselves.
 *
 * Loaded by ./main.ts AFTER the renderer entry, so the store singletons it
 * imports are the same module instances the app is running on.
 */
import { requestOpenFile } from '../src/renderer/state/open-file';
import { useApp } from '../src/renderer/state/store';

const ROOKERY = '/Users/you/rookery';

export type DemoDirective = 'restore' | 'new-session' | 'open-diff';

export function installDemoDirectives(): void {
  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as
      | { type?: string; action?: DemoDirective }
      | null;
    if (!data || data.type !== 'tortie-demo-directive') return;
    const app = useApp.getState();
    switch (data.action) {
      case 'restore':
        app.setActiveProject('demo-project-tern');
        break;
      case 'new-session':
        app.setCreateOpen(true);
        break;
      case 'open-diff':
        app.setActiveProject('demo-project-rookery');
        requestOpenFile({
          repoPath: ROOKERY,
          relPath: 'src/queue.ts',
          path: `${ROOKERY}/src/queue.ts`,
          mode: 'diff'
        });
        break;
    }
  });
}
