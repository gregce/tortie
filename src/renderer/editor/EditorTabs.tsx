/**
 * The editor tab strip — one module for the whole VS Code tab model
 * (Phase 12 item 5): a tab's chrome, its native context menu, and the
 * scrolling `role="tablist"` they live in.
 *
 * Split out of EditorPanel during Phase 12 integration: the panel is about
 * geometry, the keyboard map and which surface to render; the strip is about
 * tabs. They shared a file only because they shipped together.
 *
 * Two kinds of tab live here — a working-tree tab and a history tab, the
 * latter wearing its short SHA because otherwise the live file and a commit's
 * version of it read as the same tab twice (DESIGN-SPEC S5C).
 */

import React, { useEffect, useRef } from 'react';
import { keyDisplay } from '@shared/keymap';
import { useApp } from '../state/store';
import type { MenuItemSpec } from '../state/store';
import { showNativeMenu } from '../app/ContextMenu';
import { tabTooltipIdentity } from './tab-identity';
import { canReveal, reveal } from '../tree/fs-bridge';
import { Codicon, FileIcon, menuGlyph } from '../icons';
import { useEditor } from './store';
import type { EditorTab } from './store';

// ---------------------------------------------------------------------------
// Tab context menu (native — DESIGN.md §3; flat, like every other gmux menu)
// ---------------------------------------------------------------------------

function tabMenuItems(tab: EditorTab): (MenuItemSpec | 'sep')[] {
  const ed = useEditor.getState();
  const { tabs } = ed;
  const index = tabs.findIndex((t) => t.id === tab.id);
  const items: (MenuItemSpec | 'sep')[] = [
    {
      label: 'Close',
      // Every one of the five closes wears the × the tab itself draws, which
      // is the glyph a person is already pointing at when they open this menu.
      // The label is what says how many tabs go.
      ...menuGlyph('close'),
      hint: keyDisplay('editor.close'),
      run: () => ed.closeTab(tab.id)
    },
    {
      label: 'Close Others',
      ...menuGlyph('close'),
      disabled: tabs.length < 2,
      run: () => ed.closeOthers(tab.id)
    },
    {
      label: 'Close to the Right',
      ...menuGlyph('close'),
      disabled: index === -1 || index === tabs.length - 1,
      run: () => ed.closeToRight(tab.id)
    },
    {
      label: 'Close Saved',
      ...menuGlyph('close'),
      disabled: !tabs.some((t) => !t.dirty),
      run: () => ed.closeSaved()
    },
    { label: 'Close All', ...menuGlyph('close'), run: () => ed.closeAll() },
    'sep'
  ];
  if (tab.preview) {
    items.push({
      label: 'Keep Open',
      // Keeping a preview tab is the same act `Open in New Tab` names in the
      // tree and in search, and it wears the same mark.
      ...menuGlyph('pin'),
      run: () => ed.pin(tab.id)
    });
    items.push('sep');
  }
  items.push({
    label: 'Copy Path',
    ...menuGlyph('copy'),
    run: () => void navigator.clipboard.writeText(tab.path)
  });
  // Phase 160: the map tab's path IS the repository root, so Copy Path already
  // says everything and a relative path of nothing would copy an empty string.
  if (tab.archMap === undefined) {
    items.push({
      label: 'Copy Relative Path',
      ...menuGlyph('copy'),
      run: () => void navigator.clipboard.writeText(tab.relPath)
    });
  }
  items.push({
    label: 'Reveal in Finder',
    ...menuGlyph('link-external'),
    disabled: !canReveal() || tab.deleted,
    run: () => {
      void reveal(tab.path).catch(() =>
        useApp
          .getState()
          .toast('error', 'Could not reveal the file in Finder')
      );
    }
  });
  return items;
}

// ---------------------------------------------------------------------------
// Tab button
// ---------------------------------------------------------------------------

/** What the italic tab means, and both gestures that end it. */
const PREVIEW_HINT = 'Preview — double-click the tab or start editing to keep it';

function TabButton({
  tab,
  active
}: {
  tab: EditorTab;
  active: boolean;
}): React.JSX.Element {
  const activate = useEditor((s) => s.activate);
  const closeTab = useEditor((s) => s.closeTab);
  const pin = useEditor((s) => s.pin);
  const ref = useRef<HTMLDivElement | null>(null);

  // ⌘⌥→ can land on a tab that scrolled out of sight — bring it back.
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active]);

  // Five answers, one per kind of tab, and they live in ./tab-identity.ts so a
  // test can read them without rendering the strip. A REVIEW tab is the first
  // one asked about, because its `path` is a path on another computer.
  const identity = tabTooltipIdentity(tab);

  // The italic slant is the only thing on screen saying this tab is on loan,
  // and italics teach nobody (Phase 12.4). The tooltip says what it is AND
  // both ways out of it; the accessible name carries the same word, because
  // a slant is invisible to a screen reader.
  const title = tab.preview ? `${identity}\n${PREVIEW_HINT}` : identity;

  return (
    <div
      ref={ref}
      role="tab"
      aria-selected={active}
      {...(tab.preview ? { 'aria-label': `${tab.name} — preview` } : {})}
      tabIndex={0}
      className={`ed-tab${active ? ' active' : ''}`}
      title={title}
      onClick={() => activate(tab.id)}
      onDoubleClick={() => pin(tab.id)}
      onAuxClick={(e) => {
        if (e.button === 1) closeTab(tab.id);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        activate(tab.id);
        showNativeMenu({ x: e.clientX, y: e.clientY, items: tabMenuItems(tab) });
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') activate(tab.id);
      }}
    >
      {/* Phase 160. The map tab is not a file, so it wears the map codicon
          rather than a file-type icon guessed from a repository root. */}
      {tab.archMap !== undefined ? (
        <Codicon name="map" size={14} className="ed-tab-icon" />
      ) : (
        <FileIcon path={tab.path} size={14} className="ed-tab-icon" />
      )}
      <span
        className={`ed-tab-name${tab.preview ? ' preview' : ''}${
          tab.deleted ? ' deleted' : ''
        }`}
      >
        {tab.name}
      </span>
      {/* A commit tab and the live file are two tabs with one filename —
          the short SHA is what tells them apart at a glance. */}
      {tab.commit !== null ? (
        <span className="ed-tab-sha">{tab.commit.shortSha}</span>
      ) : null}
      <button
        type="button"
        className={`ed-tab-close${tab.dirty ? ' dirty' : ''}`}
        aria-label={tab.dirty ? `Close ${tab.name} — unsaved` : `Close ${tab.name}`}
        tabIndex={-1}
        onClick={(e) => {
          e.stopPropagation();
          closeTab(tab.id);
        }}
      >
        {/* Dirty tabs wear the dot until hovered, then the × takes its place
            (VS Code) — one slot, so the strip never reflows on hover. */}
        <span className="ed-tab-dot" aria-hidden="true" />
        <Codicon name="close" size={12} className="ed-tab-x" />
      </button>
    </div>
  );
}


// ---------------------------------------------------------------------------
// The strip
// ---------------------------------------------------------------------------

export function EditorTabStrip({
  tabs,
  activeId
}: {
  tabs: EditorTab[];
  activeId: string | null;
}): React.JSX.Element {
  const listRef = useRef<HTMLDivElement | null>(null);

  // Past ten tabs the strip scrolls, and a filename cut off mid-word at the
  // edge reads as a rendering bug rather than as "there is more this way".
  // A fade marks each end that actually has something hidden behind it —
  // hence measuring instead of a permanent gradient, which would dim the
  // first tab even when the strip fits.
  useEffect(() => {
    const el = listRef.current;
    if (el === null) return;
    const update = (): void => {
      const max = el.scrollWidth - el.clientWidth;
      el.dataset['fadeStart'] = el.scrollLeft > 1 ? 'on' : 'off';
      el.dataset['fadeEnd'] = el.scrollLeft < max - 1 ? 'on' : 'off';
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [tabs.length]);

  return (
    <div
      ref={listRef}
      className="ed-tabs-list"
      role="tablist"
      aria-label="Open files"
    >
      {tabs.map((tab) => (
        <TabButton key={tab.id} tab={tab} active={tab.id === activeId} />
      ))}
    </div>
  );
}
