/**
 * Context stream public surface — the sidebar's fourth view (research 29).
 *
 * INTEGRATOR wiring, and what is already done:
 *   - `src/renderer/app/Sidebar.tsx` renders `<ContextHeader />` in the band
 *     and `<ContextSection />` inside `.sidebar-rest`. Wired.
 *   - `src/renderer/app/ActivityBar.tsx` carries the rail item, and
 *     `state/sidebar-views.ts` carries the id that makes it zoomable. Wired.
 *   - SEAM 3 is CLOSED. `src/renderer/app/Sidebar.tsx` passes
 *     `actions={useContextActions()}`, so the write verbs are in the row
 *     menus. It shipped once with no object at all, which meant no Remove, no
 *     Update and no way to install anything: the install modules were a
 *     well-tested library with no caller. `actions.ts` is that caller and
 *     `install/InstallHost.tsx` is where its two surfaces are mounted.
 *   - SEAM 4 is closed. `src/renderer/editor/EditorPanel.tsx` hosts the
 *     `context:<id>` detail tab.
 *   - SEAM 2 is closed. `window.gmux.context` carries eleven methods, and
 *     `bridge.ts` still feature-detects them in two groups so a build that can
 *     read configuration but not write it renders honestly.
 *   - `model.ts` was SEAM 1 and is closed: the types come from
 *     `src/shared/context.ts`.
 */

export { ContextHeader } from './ContextHeader';
export { ContextRow } from './ContextRow';
export type { ContextRowProps } from './ContextRow';
export { ContextSection, focusInsideContext } from './ContextView';
export { contextAvailable } from './bridge';
export {
  onOpenContext,
  OPEN_CONTEXT_EVENT,
  openFileAt,
  requestOpenContext
} from './open-detail';
export type { OpenContextRequest } from './open-detail';
export { useContext } from './store';
export type { ContextStatus, ContextViewState } from './store';
export type { ContextRowActions } from './menus';
export { useContextActions } from './actions';
export { closeSessionContext, openSessionContext } from './open-session';
export { ContextInstallHost } from './install/InstallHost';
export { useInstallFlow } from './install/install-store';
export {
  CONTEXT_SECTION_IDS,
  CONTEXT_SECTION_LABELS,
  groupEntries,
  precedenceView,
  resolutionSentence,
  scopeGroupHint,
  scopeOrderFor,
  sectionCount,
  sectionHint,
  unknownPrecedence
} from './groups';
export type {
  ContextGroup,
  ContextSectionId,
  PrecedenceView
} from './groups';
