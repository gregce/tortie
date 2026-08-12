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
import { Codicon } from '../icons';
import { AgentsSection } from './AgentsSection';
import { GeneralSection } from './GeneralSection';
import { KeyboardSection } from './KeyboardSection';
import { LaunchDefaultsSection } from './LaunchDefaultsSection';
import { useSettingsStore } from './settings-store';
import { SpecStorySection } from './SpecStorySection';
import './settings.css';

type SectionId =
  | 'general'
  | 'agents'
  | 'keyboard'
  | 'launch-defaults'
  | 'specstory';

const SECTIONS: { id: SectionId; label: string; icon: string }[] = [
  { id: 'general', label: 'General', icon: 'settings-gear' },
  { id: 'agents', label: 'Agents', icon: 'hubot' },
  { id: 'keyboard', label: 'Keyboard', icon: 'keyboard' },
  { id: 'launch-defaults', label: 'Launch defaults', icon: 'rocket' },
  // Phase 15. Last on the rail: it is the newest section and the least often
  // visited, and inserting it mid-list would move four items people already
  // know the position of.
  { id: 'specstory', label: 'SpecStory', icon: 'cloud' }
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
            <Codicon name={s.icon} size={16} />
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
      </main>
    </div>
  );
}
