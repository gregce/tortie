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
// PHASE 109. On a tab whose files are on a machine, the menu reads that
// machine's own answer, so it greys the same rows the ⌘T board greys. The
// sublabel stays the literal `not installed`.
import { machineAgentsFor } from '../state/machines-slice';
import { useSettingsStore } from '../settings/settings-store';
import { useApp } from '../state/store';
import type { MenuItemSpec } from '../state/store';
import { agentMenuIcon, warmAgentMenuIcons } from '../icons';
import { sessionsPositionMenuItems } from './sessions-position';
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
  const ensureScan = useSettingsStore((s) => s.ensureScan);
  const scan = useSettingsStore((s) => s.scan);
  // Phase 12.12 item 2: the header's own verb, in words, under a separator —
  // the icon button beside this ˅ says the same thing, but only to someone who
  // reads icons. Same store setter, so the two can never disagree.
  const orientation = useApp((s) => s.sessionOrientation);
  const setSessionOrientation = useApp((s) => s.setSessionOrientation);

  // The settings truth (hotkeys, launch defaults) lives in the shared store
  // and the header may be the first surface to need it. PHASE 164: the scan
  // is NOT asked for here. This hook mounts with the session strip on every
  // boot that has a project, so asking here made every launch run the full
  // agent scan before the window was shown. It is asked for when the menu
  // OPENS, below. Until the answer lands the rows come from the seed list,
  // which is optimistic by doctrine (src/renderer/state/agents.ts): an agent
  // is greyed only when a scan POSITIVELY reported it missing, so a first
  // open before the scan lands greys nothing it should not, and the answer
  // is in the store by the second open.
  useEffect(() => {
    initSettings();
  }, [initSettings]);

  // PHASE 109. The active tab's machine answer, or null on this Mac. A
  // quick create lands in the active project, so the rows grey on the same
  // answer the create itself will be judged by.
  const machineAgents = useApp((s) => s.machineAgents);
  const project = useApp((s) => s.activeProject());
  const machineView = useMemo(
    () => machineAgentsFor(machineAgents, project?.machineId),
    [machineAgents, project?.machineId]
  );
  const options = useMemo(
    () => buildAgentOptions(scan, avail, machineView),
    [scan, avail, machineView]
  );

  useEffect(() => {
    void warmAgentMenuIcons(options.map((o) => o.iconKey));
  }, [options]);

  return useCallback(
    (anchor: HTMLElement): void => {
      // Phase 164. The open is the demand. A no-op once the scan has landed.
      ensureScan();
      const r = anchor.getBoundingClientRect();
      setMenu({
        x: r.left,
        y: r.bottom + 4,
        items: [
          ...quickCreateMenuItems(options, (agent) => void quickCreate(agent)),
          ...sessionsPositionMenuItems(orientation, setSessionOrientation)
        ]
      });
    },
    [options, quickCreate, setMenu, orientation, setSessionOrientation, ensureScan]
  );
}
