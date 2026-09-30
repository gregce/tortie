/**
 * Settings IPC (Phase 10 S13) — settings:get / settings:set /
 * settings:openWindow / agents:flagPresets.
 *
 * settings:set persists the patch, rebuilds the native menu when hotkeys
 * changed (accelerators live on Session-menu items — src/main/menu.ts) OR
 * when the Architecture switch flipped (Phase 175: three menu rows are drawn
 * only while it is on), and broadcasts EVT_SETTINGS_CHANGED to EVERY window
 * so the main window's ⌘T-modal defaults, its activity rail and the Settings
 * window stay in lockstep.
 */

import type { IpcMain } from 'electron';
import { EVT_SETTINGS_CHANGED } from '@shared/ipc';
import type {
  AgentFlagCatalogs,
  AgentFlagCatalogView,
  EnvVarCandidates,
  GmuxSettings
} from '@shared/settings';
import { noEnvRejections } from '@shared/settings';
import type { LaunchableAgentId } from '@shared/types';
// Phase 269: the ONE spelling of "will Tortie read this variable?", shared
// with the Settings window so the file a name is refused in cannot disagree
// with the file it is explained in.
import { envPassthroughRefusal } from '@shared/agent-overlay';
import { AGENT_FLAG_PRESETS } from '../agents/flags';
import { compiledLaunchEnvKeys } from '../agents/registry';
// Phase 269: the login shell's exported names, NAMES ONLY. One shared probe
// per concurrent ask, and no cross-ask cache, so a person who has just edited
// their profile gets a fresh answer.
import { loginShellEnvNames } from '../tmux';
// Phase 276: drop the cached login-shell answer and take a fresh one. The
// button behind it is in Launch defaults, beside the lists whose values it
// re-reads.
import { refreshEnvNow } from '../env/watch';
import { disarmArchWatch } from '../arch/ipc';
import { rebuildAppMenu } from '../menu';
import { handle } from '../typed-ipc';
import { broadcastEvent } from '../typed-events';
import { registerSpecStoryStatusIpc } from '../specstory';
import {
  envRejectionsNow,
  getSettings,
  sharedRefusedEnvKeys,
  updateSettings
} from './store';
import { openSettingsWindow } from './window';

// ---------------------------------------------------------------------------
// Flag catalogs → renderer-safe views (static per build; renderers cache)
// ---------------------------------------------------------------------------

let catalogViews: AgentFlagCatalogs | null = null;

/** The flag catalogs (src/main/agents/flags.ts) as wire views. */
export function getFlagCatalogViews(): AgentFlagCatalogs {
  if (catalogViews !== null) return catalogViews;
  const views: AgentFlagCatalogs = {};
  for (const [id, catalog] of Object.entries(AGENT_FLAG_PRESETS)) {
    const agentId = id as LaunchableAgentId;
    const view: AgentFlagCatalogView = {
      agentId,
      binary: catalog.binary,
      helpVerifiedVersion: catalog.helpVerifiedVersion,
      presets: catalog.presets.map((p) => ({
        flag: p.flag,
        label: p.label,
        description: p.description,
        danger: p.danger,
        verified: p.provenance === 'VERIFIED'
      })),
      // Phase 269. What this agent's COMPILED row already sets, so the
      // Settings window can say "this agent already sets FORCE_COLOR itself"
      // without a second round trip. Empty for all but three agents: cursor,
      // grok and, since Phase 331, Claude Code.
      envKeys: [...compiledLaunchEnvKeys(agentId)]
    };
    views[agentId] = view;
  }
  catalogViews = views;
  return views;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

function broadcastSettings(settings: GmuxSettings): void {
  broadcastEvent(EVT_SETTINGS_CHANGED, settings);
}

/** Did the patch change the persisted hotkey map? (menu rebuild trigger) */
function hotkeysChanged(before: GmuxSettings, after: GmuxSettings): boolean {
  return JSON.stringify(before.hotkeys) !== JSON.stringify(after.hotkeys);
}

/**
 * Did the patch flip the Architecture switch (Phase 175)? Second menu
 * rebuild trigger: the two View menu rows are present only while the switch
 * is on, so a flip must rebuild the native menu in the same breath or the
 * menu would show the state from before the change until the next hotkey
 * edit.
 */
function archVisibilityChanged(
  before: GmuxSettings,
  after: GmuxSettings
): boolean {
  return before.arch.enabled !== after.arch.enabled;
}

/**
 * PHASE 268. Did the auto-save MODE move? The File > Auto Save row draws its
 * tick from it, so the menu is rebuilt when it does. The DELAY is deliberately
 * not asked about: no menu row draws it, and rebuilding the whole application
 * menu because a person moved a select from 1 second to 2 would be work for a
 * template that comes back byte-identical.
 */
function autoSaveModeChanged(
  before: GmuxSettings,
  after: GmuxSettings
): boolean {
  return before.autoSave.mode !== after.autoSave.mode;
}

export function registerSettingsIpc(ipc: IpcMain): void {
  handle(ipc, 'settings:get', () => getSettings());

  handle(ipc, 'settings:set', (_e, patch) => {
    const before = getSettings();
    const next = updateSettings(patch);
    if (
      hotkeysChanged(before, next) ||
      archVisibilityChanged(before, next) ||
      autoSaveModeChanged(before, next)
    ) {
      // Accelerators are Session-menu items — the menu is the source of
      // nativeness (S13 Hotkeys). Rebuild picks up the new chord map, and
      // since Phase 175 the Architecture rows' presence too, and since Phase
      // 268 the tick on File > Auto Save.
      rebuildAppMenu();
    }
    if (archVisibilityChanged(before, next) && !next.arch.enabled) {
      // Phase 197 item 7. Off means off: a repository armed while the switch
      // was on stops being re-checked on file changes, rather than running
      // for the life of the app behind a hidden surface.
      disarmArchWatch();
    }
    broadcastSettings(next);
    return next;
  });

  handle(ipc, 'settings:openWindow', () => {
    openSettingsWindow();
  });

  handle(ipc, 'agents:flagPresets', () => getFlagCatalogViews());

  // PHASE 269. The names the person's login shell exports, as suggestions for
  // the shell-variable picker in Launch defaults. NAMES ONLY: the probe asks
  // `awk` for the KEYS of its environment and prints nothing else, so there is
  // no path by which a value could reach this handler, let alone a renderer.
  //
  // The list is filtered by the SAME refusal the picker shows a sentence for,
  // so the picker offers only names that would actually be accepted.
  //
  // PHASE 275 CHANGED TWO THINGS HERE.
  //
  // It takes a SCOPE. The shared list has no agent, so it cannot take one, and
  // the two arms refuse different sets: an agent arm refuses that agent's own
  // compiled `launch.env` keys, the shared arm refuses the union over every
  // launchable agent, because the shared list reaches every one of them.
  // `sharedRefusedEnvKeys` in ./store.ts is the ONE spelling of that union,
  // read here and by the shared sanitizer, so the door that refuses a name and
  // the list that offers one cannot disagree.
  //
  // AND IT STOPPED FILTERING OUT `existing`. Doing so made a name a person
  // already had VANISH from the list, so the list changed shape between
  // openings and a person hunted for a name that was there all along. The
  // picker draws those rows ticked and locked instead — EnableForDialog's
  // treatment, and the reason it gives applies here: a row that cannot be
  // chosen is shown with its reason, never hidden. The cap stays disabled for
  // the same reason it always was: this is a suggestion list, and the add is
  // where the cap is said.
  handle(ipc, 'settings:envCandidates', async (_e, scope) => {
    const probe = await loginShellEnvNames();
    const agentEnvKeys =
      scope.kind === 'shared'
        ? sharedRefusedEnvKeys()
        : compiledLaunchEnvKeys(scope.agentId);
    const names = probe.names.filter(
      (name) =>
        envPassthroughRefusal(name, {
          agentEnvKeys,
          cap: Number.MAX_SAFE_INTEGER,
          ...(scope.kind === 'shared' ? { scope: 'shared' as const } : {})
        }) === null
    );
    const answer: EnvVarCandidates = { names, probeFailed: probe.probeFailed };
    return answer;
  });

  // PHASE 275. What the last read of settings.json DROPPED from those two
  // lists. Phase 269 named every drop in app.log and nowhere else, so a person
  // whose key stopped arriving had to find a log file to learn why. This is the
  // same fact, on the card it belongs to.
  //
  // `getSettings()` FIRST, and the order is load bearing: the seal half of the
  // answer only exists once a load has actually run its seal check, and asking
  // before that would report "nothing was dropped" about a check that has not
  // happened.
  handle(ipc, 'settings:envRejections', () => {
    try {
      getSettings();
      return envRejectionsNow();
    } catch {
      // A read that cannot happen has dropped nothing, and a Settings window
      // that drew an error here would be reporting on its own failure to ask.
      return noEnvRejections();
    }
  });

  // PHASE 276. Ask the login shell again, now.
  //
  // Phase 276 caches the login-shell env answer for the life of the process and
  // watches the person's shell config files so a rotated key still takes effect
  // on the next session they start, with nothing to restart. This handler is
  // the deliberate half, for the class the watch provably cannot see: a key
  // exported by a file the rc SOURCES (measured, zero events on both watch
  // arms), one read from a vault at shell start, a `.env` a plugin loads, a
  // credential rotated in the keychain, a value the shell inherits.
  //
  // ONE CALL AND NOTHING ELSE. `refreshEnvNow()` drops the cache immediately,
  // re-derives the watch targets so a config file created since the last derive
  // is watched from this moment, then re-warms past the floor and awaits it, so
  // the spinner in the window means the shell is actually being asked.
  //
  // IT RESOLVES `void` WHATEVER HAPPENED, including a probe that failed and a
  // build where nothing is armed at all. Nothing this learned may cross back:
  // not a value, not a name, not a count. See the channel's own doc comment.
  handle(ipc, 'settings:envRefresh', async () => {
    await refreshEnvNow();
  });

  // Phase 15: the SpecStory section's status pull + its two auth actions. It
  // registers here rather than from src/main/index.ts because the Settings
  // window is its only consumer and this registrar already owns that surface;
  // when capture grows a registrar of its own, the call moves there.
  registerSpecStoryStatusIpc(ipc);
}
