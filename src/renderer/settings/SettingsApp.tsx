/**
 * S13 — the Settings window's app shell: nav rail (w:200, --bg-sidebar) +
 * content (--bg-canvas, padding 24, max-w 560). Four sections: General /
 * Agents / Keyboard / Launch defaults. ↑↓ on the rail switches sections;
 * every control is keyboard-reachable; changes apply immediately (no Save).
 *
 * S13 shipped "Hotkeys" — two reference rows typed by hand plus the per-agent
 * recorders. Phase 12.12 replaced it with KEYBOARD, the whole map rendered
 * from src/shared/keymap.ts with the recorders folded in where they belong.
 * There is deliberately no second section: two shortcut lists in one window
 * is the drift this phase exists to end.
 */

import React, { useEffect, useState } from 'react';
import { Codicon, InlineSvg } from '../icons';
// SpecStory's own book mark, monochrome. Derived in Phase 18.5 from the
// vendor's 380x550 export, whose four source paths are recorded in
// docs/research/30 §4.2. Two steps: drop path 4, which is a white knockout
// and would paint an opaque wedge on a dark rail, then fit the long axis to
// 24 and bake the transform (§4.4). Dropping path 4 is what SpecStory itself
// does in its 12x16 menu bar template. The file lives in assets/brand/ and
// not in assets/agents/, because SpecStory is not a launchable agent and a
// non-agent key does not belong in AgentIcon's LOGOS map. No attribution
// line is needed. It is SpecStory's own mark and this app ships as
// com.specstory.tortie.
import specstorySvg from '../assets/brand/specstory.svg?raw';
import { AgentsSection } from './AgentsSection';
import { AppearanceSection } from './AppearanceSection';
import { DiagnosticsSection } from './DiagnosticsSection';
import { GeneralSection } from './GeneralSection';
import { KeyboardSection } from './KeyboardSection';
import { LaunchDefaultsSection } from './LaunchDefaultsSection';
import { MachinesSection } from './MachinesSection';
import { useSettingsStore } from './settings-store';
import { SpecStorySection } from './SpecStorySection';
import './settings.css';

type SectionId =
  | 'general'
  | 'agents'
  | 'keyboard'
  | 'launch-defaults'
  | 'specstory'
  | 'diagnostics'
  | 'appearance'
  | 'machines';

/**
 * A rail entry wears either a codicon, which is what app chrome uses, or a
 * bundled brand SVG for the one section named after a product. Keeping both
 * in one union is why the rail no longer hardcodes Codicon.
 */
type RailIcon = { codicon: string } | { svg: string };

const SECTIONS: { id: SectionId; label: string; icon: RailIcon }[] = [
  { id: 'general', label: 'General', icon: { codicon: 'settings-gear' } },
  { id: 'agents', label: 'Agents', icon: { codicon: 'hubot' } },
  { id: 'keyboard', label: 'Keyboard', icon: { codicon: 'keyboard' } },
  {
    id: 'launch-defaults',
    label: 'Launch defaults',
    icon: { codicon: 'rocket' }
  },
  // Phase 15. Last on the rail: it is the newest section and the least often
  // visited, and inserting it mid-list would move four items people already
  // know the position of.
  //
  // Phase 18.5 replaced the `cloud` codicon here with SpecStory's book. The
  // old glyph was ambiguous, because `cloud` already means "this branch is on
  // a remote" at scm/ref-badges.tsx and scm/BranchesView.tsx. Those two sites
  // keep `cloud`, which is the right glyph there. The book is a solid slab and
  // carries about 2.4 times the ink of the codicons beside it, measured in
  // docs/research/30 §4.5. It ships at the house scale anyway, because it is a
  // brand mark rather than UI furniture, and because this entry sits at the
  // end of the rail. §4.5 also records a 22-of-24 inset variant if review ever
  // judges the weight too heavy.
  { id: 'specstory', label: 'SpecStory', icon: { svg: specstorySvg } },
  // Phase 35. Last on the rail, the same reasoning as SpecStory above: it is
  // the newest section and the least often visited, and inserting it
  // mid-list would move entries people already know the position of. It is
  // actions, not readings, so it does not break the no-dashboard rule.
  { id: 'diagnostics', label: 'Diagnostics', icon: { codicon: 'output' } },
  // Phase 62. Last on the rail, the house rule for a new section: it is the
  // newest and inserting it mid-list would move entries people already know
  // the position of.
  { id: 'appearance', label: 'Appearance', icon: { codicon: 'symbol-color' } },
  // Phase 68. Last on the rail, the house rule for a new section: it is the
  // newest and inserting it mid-list would move entries people already know
  // the position of. The `vm` glyph, not `server` and not `remote`: a machine
  // here is another computer a person owns and signs in to as themselves,
  // which is what that glyph draws. `remote` already means "this branch is on
  // a remote" everywhere else in this app.
  { id: 'machines', label: 'Machines', icon: { codicon: 'vm' } }
];

export function SettingsApp(): React.JSX.Element {
  const [section, setSection] = useState<SectionId>('general');
  const init = useSettingsStore((s) => s.init);
  const available = useSettingsStore((s) => s.available);

  useEffect(() => init(), [init]);

  const idx = SECTIONS.findIndex((s) => s.id === section);
  const onNavKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const next =
      SECTIONS[
        (idx + (e.key === 'ArrowDown' ? 1 : -1) + SECTIONS.length) %
          SECTIONS.length
      ];
    if (next) {
      setSection(next.id);
      // Keep focus with the active tab so ↑↓ keeps working.
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLButtonElement>('.set-nav-item.active')
          ?.focus();
      });
    }
  };

  if (!available) {
    return (
      <div className="set-shell">
        <div className="set-content">
          <h1 className="set-title">Settings</h1>
          <div className="set-card">
            <div className="set-empty-line">
              Settings are not available in this build — quit and reopen Tortie;
              if this keeps happening, reinstall it.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="set-shell">
      <nav
        className="set-nav"
        aria-label="Settings sections"
        onKeyDown={onNavKeyDown}
      >
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`set-nav-item${section === s.id ? ' active' : ''}`}
            aria-current={section === s.id ? 'page' : undefined}
            onClick={() => setSection(s.id)}
          >
            {'svg' in s.icon ? (
              <InlineSvg svg={s.icon.svg} size={16} />
            ) : (
              <Codicon name={s.icon.codicon} size={16} />
            )}
            {s.label}
          </button>
        ))}
      </nav>
      <main className="set-content">
        {section === 'general' ? <GeneralSection /> : null}
        {section === 'agents' ? <AgentsSection /> : null}
        {section === 'keyboard' ? <KeyboardSection /> : null}
        {section === 'launch-defaults' ? <LaunchDefaultsSection /> : null}
        {section === 'specstory' ? <SpecStorySection /> : null}
        {section === 'diagnostics' ? <DiagnosticsSection /> : null}
        {section === 'appearance' ? <AppearanceSection /> : null}
        {section === 'machines' ? <MachinesSection /> : null}
      </main>
    </div>
  );
}
