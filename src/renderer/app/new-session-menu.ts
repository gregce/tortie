/**
 * The ˅ menu next to ＋ in the SESSIONS header — quick-create without the ⌘T
 * modal. ONE builder for both orientations (the top strip's
 * NewSessionSplitButton and the right dock's toolbar), because the bug this
 * module fixes was two hand-maintained copies of a three-agent array
 * (`claude / codex / shell`) drifting away from a twelve-agent registry.
 *
 * The list is therefore derived, never written: `buildAgentOptions` is the
 * same helper the ⌘T picker uses, so the menu and the modal cannot disagree
 * about which agents exist, which are installed, or what they are called.
 * Detection is optimistic in exactly the same way — an agent is disabled only
 * when the scan POSITIVELY reported the CLI missing.
 */

import { useCallback, useEffect, useMemo } from 'react';
import type { AgentPickerOption } from '../state/agents';
import { buildAgentOptions, useAgentAvailability } from '../state/agents';
import { useSettingsStore } from '../settings/settings-store';
import { useApp } from '../state/store';
import type { MenuItemSpec } from '../state/store';
import { agentMenuIcon, warmAgentMenuIcons } from '../icons';
import type { LaunchableAgentKind } from '@shared/types';

/**
 * Picker options → native menu items. Pure, so the ordering and the
 * disabled/actionable split are testable without a menu or a browser.
 *
 * `icon` resolves through the cache the hook warms on mount; a mark that has
 * not finished rasterizing yields a text-only row rather than a late menu.
 */
export function quickCreateMenuItems(
  options: readonly AgentPickerOption[],
  quickCreate: (agent: LaunchableAgentKind) => void
): MenuItemSpec[] {
  return options.map((opt) => {
    const icon = agentMenuIcon(opt.iconKey);
    return {
      label: opt.label,
      disabled: !opt.installed,
      // Native menus grey a disabled item; the sublabel says WHY, which is
      // the same promise the ⌘T caption row makes.
      ...(opt.installed ? {} : { sublabel: 'not installed' }),
      ...(icon !== undefined ? { icon } : {}),
      run: () => {
        quickCreate(opt.id);
      }
    };
  });
}

/**
 * Open the quick-create menu under `anchor` (the ˅ button). Both orientations
 * call this and nothing else.
 */
export function useQuickCreateMenu(): (anchor: HTMLElement) => void {
  const quickCreate = useApp((s) => s.quickCreate);
  const setMenu = useApp((s) => s.setMenu);
  const avail = useAgentAvailability();
  const initSettings = useSettingsStore((s) => s.init);
  const scan = useSettingsStore((s) => s.scan);

  // The agents:list scan lives in the shared settings store; the header may
  // be the first surface to need it in a session where ⌘T never opened.
  useEffect(() => {
    initSettings();
  }, [initSettings]);

  const options = useMemo(() => buildAgentOptions(scan, avail), [scan, avail]);

  useEffect(() => {
    void warmAgentMenuIcons(options.map((o) => o.iconKey));
  }, [options]);

  return useCallback(
    (anchor: HTMLElement): void => {
      const r = anchor.getBoundingClientRect();
      setMenu({
        x: r.left,
        y: r.bottom + 4,
        items: quickCreateMenuItems(options, (agent) => void quickCreate(agent))
      });
    },
    [options, quickCreate, setMenu]
  );
}
