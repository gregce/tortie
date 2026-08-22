/**
 * The ＋ that opens the project menu (Phase 135).
 *
 * ONE VERB PAIR, four places. The button is drawn in the title band whether
 * the project row is expanded or collapsed, and in the project rail whether
 * the rail is expanded or collapsed. Behind it are two verbs, being open a
 * project that exists (⌘O) and make one that does not (Phase 12.9 item 1).
 * It opens a native menu rather than standing beside a second button, because
 * the tab strip is the one row that must stay scannable, and DESIGN.md §3 has
 * no DOM menus.
 *
 * ALL FOUR PLACES RENDER THIS COMPONENT. Before Phase 135 the button's body
 * was written out twice, once in Titlebar.tsx and once in ProjectRail.tsx, so
 * the label, the accessible name and the menu call each existed in two copies.
 * A second hand written copy is how two surfaces drift apart, and
 * ProjectsPositionButton.tsx carries the same note for the same reason.
 *
 * THE CLASS IS THE ONLY THING THAT VARIES, and it is a prop rather than a
 * branch inside this file. The title band's copy is `ptab-add`, which
 * styles/app.css sizes at 24px and takes out of the window's drag region. The
 * rail's copy is `icon-btn prail-add`, which project-rail.css sizes at 24px
 * beside the chevron and the position button. Nothing else differs.
 *
 * SAY WHAT IS NOT TRUE. This component does not decide where the menu opens
 * on screen. It reads its own rectangle and asks for the menu under its own
 * left edge, so the caller places the button and the menu follows it.
 */

import React from 'react';
import { showProjectMenu } from './project-menu';
import { Codicon } from '../icons';

/** The label and the accessible name, which are the same string everywhere. */
export const NEW_PROJECT_LABEL = 'New project, or open one';

export function NewProjectButton({
  className
}: {
  /**
   * The class the calling region sizes and positions the button with. Pass
   * `ptab-add` in the title band and `icon-btn prail-add` in the project
   * rail. There is no default, so a new call site has to state which region
   * it is in.
   */
  className: string;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={className}
      title={NEW_PROJECT_LABEL}
      aria-label={NEW_PROJECT_LABEL}
      aria-haspopup="menu"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        showProjectMenu(r.left, r.bottom);
      }}
    >
      <Codicon name="add" size={16} />
    </button>
  );
}
