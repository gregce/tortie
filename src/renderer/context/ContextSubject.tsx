/**
 * The Context subject's body with its write verbs attached (Phase 165).
 *
 * Before Phase 165, `src/renderer/app/Sidebar.tsx` called `useContextActions()`
 * itself on every render of every subject, because hooks are called
 * unconditionally, and passed the result into `<ContextSection />` only when
 * the Context branch rendered. The subject is lazy now, so the hook lives
 * inside the chunk with the section it feeds, and the sidebar never has to
 * reach the install and enable stores on a launch that shows another subject.
 *
 * SEAM 3 stays closed: the object is passed, so Remove, Update and Install
 * are in the row menus exactly as before.
 */

import React from 'react';
import { useContextActions } from './actions';
import { ContextSection } from './ContextView';

export function ContextSubject(): React.JSX.Element {
  const actions = useContextActions();
  return <ContextSection actions={actions} />;
}
