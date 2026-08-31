/**
 * Settings then Architecture (Phase 158): who fills in the architecture
 * contract when a person asks for that from the Architecture view.
 *
 * TWO CONTROLS AND NOTHING ELSE, the shape the Catch Me Up section settled.
 * One picks the agent, one picks the model that agent uses. There is no
 * interval and no trigger control, because the pass runs on a person's
 * gesture and at no other moment. The picker rows themselves are the shared
 * components FoldSection exports, so the two pages cannot drift apart in
 * markup.
 *
 * THE LIST IS BUILT IN MAIN AND THERE IS NO ARRAY OF AGENT IDS IN THIS FILE.
 * Main joins three things and offers a row only when all three agree: the
 * merged agent table, the Phase 23 confirm gate, and the compiled table of
 * one shot ARCH recipes Tortie has actually measured. Main names WHY a row
 * cannot be picked and this file writes the words, so every user facing
 * string lives in ./arch-copy.ts where the copy rules test reads them.
 *
 * NONE IS THE SHIPPED ANSWER AND IT STAYS A VALID ONE FOREVER. With None
 * chosen nothing spawns, and a project with no contract still gets the
 * deterministic skeleton, which is complete on its own. Choosing an agent
 * here starts nothing either. The pass runs only from the Architecture view,
 * behind main's own re-read of the confirm gate at spawn.
 *
 * JUST ENOUGH WORDS, the operator's rule set on this surface on
 * 2026-08-28. The resting face is the two picker rows, each with a one line
 * caption, plus one line per group of refused agents, plus whatever has
 * actually gone wrong. Everything a person needs once rather than on every
 * visit, being what the enrichment is, where the writes land, where the
 * boundary sits and when the flags were measured, sits behind ONE shut
 * disclosure at the bottom. Nothing on the resting face is a paragraph.
 *
 * THE CHOICE IS SEALED, because it decides that a program runs. CLAUDE.md
 * refusal 8 reads that nothing may cause a process to start on a
 * configuration change alone, and that a person confirms the bytes out of
 * band of any agent turn. Main drops an arch choice that its seal does not
 * cover, so a settings file an agent edited comes back as None and the page
 * says one sentence about it. The seal field is the arch choice's OWN, so a
 * fold agreement can never be replayed as an arch agreement.
 */

import React, { useState } from 'react';
import type { ArchOptions } from '@shared/fold';
import type { ArchSettings } from '@shared/settings';
import { noArchChosen } from '@shared/settings';
import {
  ARCH_ABOUT_BOUNDARY,
  ARCH_ABOUT_DRIFT,
  ARCH_ABOUT_GROUP,
  ARCH_ABOUT_WHAT,
  ARCH_ABOUT_WRITES,
  ARCH_AGENT_CAPTION,
  ARCH_AGENT_LABEL,
  ARCH_BRIDGE_MISSING,
  ARCH_CHOICE_DROPPED,
  ARCH_GROUP,
  ARCH_LOADING,
  ARCH_MODEL_CAPTION,
  ARCH_MODEL_LABEL,
  ARCH_NONE_OPTION,
  ARCH_NO_HARNESSES,
  ARCH_SHOW_CAPTION,
  ARCH_SHOW_LABEL,
  ARCH_SUGGESTED_MARK,
  ARCH_TITLE,
  archChosenUnavailable,
  archMeasuredOn,
  archNotConfirmed,
  archNotMeasured
} from './arch-copy';
import {
  CaptionRow,
  ErrorRow,
  HarnessAgentRow,
  HarnessModelRow,
  firstFoldModel,
  foldHarnessById,
  foldRefusedNames
} from './FoldSection';
import { Switch } from './Switch';
import { useSettingsStore } from './settings-store';

/** The select's value for "no agent fills in the contract". Never an agent id. */
const NONE = '';

/**
 * Persist an agent pick and report whether the write stuck.
 *
 * False means main refused the pair, which is what the seal does to a choice
 * that did not come from this window, and what membership checking does to
 * an agent or a model this build has no arch recipe for. The section says
 * one sentence then rather than showing a choice that is not in force.
 *
 * Exported for the unit test, which runs under the node environment and
 * cannot fire a change event on server rendered markup.
 */
export async function selectArchAgent(agentId: string): Promise<boolean> {
  const store = useSettingsStore.getState();
  // PHASE 175. Every write from this page carries the visibility switch
  // through unchanged. Main patches `arch` WHOLESALE, so a patch naming only
  // the pair would sanitize to `enabled: false` and turn the surface off the
  // moment a person changed the agent.
  const enabled = store.settings.arch.enabled;
  if (agentId === NONE) {
    await store.update({ arch: { ...noArchChosen(), enabled } });
    return true;
  }
  const harness = foldHarnessById(store.archOptions, agentId);
  if (harness === undefined || !harness.available) return false;
  const model = firstFoldModel(harness);
  if (model === null) return false;
  const next = await store.update({ arch: { enabled, agentId, model } });
  return next?.arch.agentId === agentId && next.arch.model === model;
}

/**
 * Persist a model pick against the agent already chosen.
 *
 * The model has to be one main offered for that agent. Main checks the same
 * thing before its seal is consulted and drops the whole pair when the check
 * fails, so checking here only saves a pointless write. Exported for the
 * test.
 */
export async function selectArchModel(model: string): Promise<boolean> {
  const store = useSettingsStore.getState();
  const agentId = store.settings.arch.agentId;
  if (agentId === null) return false;
  const harness = foldHarnessById(store.archOptions, agentId);
  if (harness === undefined || !harness.models.some((m) => m.id === model)) {
    return false;
  }
  const next = await store.update({
    arch: { enabled: store.settings.arch.enabled, agentId, model }
  });
  return next?.arch.model === model;
}

/**
 * Turn the whole Architecture surface on or off (Phase 175).
 *
 * The harness PAIR is carried through untouched, so a person who chose an
 * agent once and turns the surface off and on again finds that choice
 * waiting. Nothing spawns from this write: it decides what is DRAWN and
 * nothing else, which is why it is no part of the sealed key. Exported for
 * the test, which runs under the node environment and cannot click a button
 * on server rendered markup.
 */
export async function setArchEnabled(enabled: boolean): Promise<boolean> {
  const store = useSettingsStore.getState();
  const { agentId, model } = store.settings.arch;
  const next = await store.update({ arch: { enabled, agentId, model } });
  return next?.arch.enabled === enabled;
}

export interface ArchSectionViewProps {
  /** What main offered, or null while the read is out or on a build with no bridge. */
  options: ArchOptions | null;
  /** Has the read settled? Null and settled is a build that cannot run the pass. */
  loaded: boolean;
  /** The stored choice. Both fields null is None. */
  arch: ArchSettings;
  /** True when the last write did not come back in force. */
  dropped: boolean;
  onAgent(agentId: string): void;
  onModel(model: string): void;
  /** Phase 175: turn the whole surface on or off. */
  onEnabled(enabled: boolean): void;
}

/**
 * The section as markup, with no store behind it.
 *
 * Split out for the reason FoldSectionView is: the Settings window renders
 * under React's server renderer in the unit tests, where a zustand hook
 * answers with the store's INITIAL state, so the props here are the whole
 * input and every state the section can be in is reachable from a test.
 */
export function ArchSectionView(
  props: ArchSectionViewProps
): React.JSX.Element {
  const { options, loaded, arch, dropped, onAgent, onModel, onEnabled } =
    props;
  const harness = foldHarnessById(options, arch.agentId);
  // The two groups of refused rows, each named together on one line rather
  // than one paragraph per agent.
  const notMeasured =
    options === null ? '' : foldRefusedNames(options, 'not-measured');
  const notConfirmed =
    options === null ? '' : foldRefusedNames(options, 'not-confirmed');

  return (
    <section aria-label={ARCH_TITLE}>
      <h1 className="set-title">{ARCH_TITLE}</h1>

      {/* PHASE 175, THE SWITCH, AT THE HEAD BECAUSE THIS PAGE IS THE ONLY WAY
          BACK IN. Everything Architecture shows is gated on it and it ships
          OFF, so this page is reachable whatever the switch says: a flag that
          hid its own page would strand whoever turned the surface off and
          hide it from whoever never saw it. */}
      <div className="set-card">
        <div className="set-row tall">
          <div className="set-row-text">
            <span className="set-row-label">{ARCH_SHOW_LABEL}</span>
            <span className="set-row-caption">{ARCH_SHOW_CAPTION}</span>
          </div>
          <Switch
            checked={arch.enabled}
            label={ARCH_SHOW_LABEL}
            onChange={onEnabled}
          />
        </div>
      </div>

      {/* The harness pair is HIDDEN while the surface is off, not dimmed.
          Just enough words, the ruling of 2026-08-28: a person who has not
          turned Architecture on has nothing to decide about who fills in a
          contract they cannot see, and a card of dimmed pickers is words to
          read past. The stored choice is kept, so turning the surface back on
          restores it. The disclosure below STAYS in both states, because what
          the agent does is what a person deciding about the switch wants to
          read. */}
      {!arch.enabled ? null : (
        <>
          <div className="set-group-label">{ARCH_GROUP}</div>
          <div className="set-card">
            {options === null ? (
              <CaptionRow text={loaded ? ARCH_BRIDGE_MISSING : ARCH_LOADING} />
            ) : (
              <>
                <HarnessAgentRow
                  options={options}
                  chosen={arch.agentId}
                  label={ARCH_AGENT_LABEL}
                  caption={ARCH_AGENT_CAPTION}
                  noneLabel={ARCH_NONE_OPTION}
                  suggestedMark={ARCH_SUGGESTED_MARK}
                  onAgent={onAgent}
                />
                {harness !== undefined && harness.models.length > 0 ? (
                  <HarnessModelRow
                    harness={harness}
                    chosen={arch.model}
                    label={ARCH_MODEL_LABEL}
                    caption={ARCH_MODEL_CAPTION}
                    onModel={onModel}
                  />
                ) : null}

                {dropped ? <ErrorRow text={ARCH_CHOICE_DROPPED} /> : null}

                {harness !== undefined && !harness.available ? (
                  <ErrorRow text={archChosenUnavailable(harness.agentLabel)} />
                ) : null}

                {options.suspended !== null ? (
                  <ErrorRow text={options.suspended} />
                ) : null}

                {options.harnesses.length === 0 ? (
                  <CaptionRow text={ARCH_NO_HARNESSES} />
                ) : null}

                {/* The agents Tortie cannot offer are named rather than hidden,
                    on one line per reason. */}
                {notMeasured !== '' ? (
                  <CaptionRow text={archNotMeasured(notMeasured)} />
                ) : null}
                {notConfirmed !== '' ? (
                  <CaptionRow text={archNotConfirmed(notConfirmed)} />
                ) : null}
              </>
            )}
          </div>
        </>
      )}

      {/* The words a person needs once and not on every visit, behind one
          disclosure that ships SHUT (the just enough words rule, set on this
          surface on 2026-08-28). The resting face of the block is the
          summary line and nothing else. The measured date lives here too,
          because a person changing a dropdown does not need the date, and a
          person deciding whether to trust the pass does. */}
      <details className="set-disclosure" data-arch-about="1">
        <summary>{ARCH_ABOUT_GROUP}</summary>
        <p className="set-section-caption">{ARCH_ABOUT_WHAT}</p>
        <p className="set-section-caption">{ARCH_ABOUT_WRITES}</p>
        <p className="set-section-caption">{ARCH_ABOUT_BOUNDARY}</p>
        <p className="set-section-caption">{ARCH_ABOUT_DRIFT}</p>
        {options !== null && harness?.measuredOn != null ? (
          <p className="set-section-caption">
            {archMeasuredOn(harness.measuredOn)}
          </p>
        ) : null}
      </details>
    </section>
  );
}

/** The section as the Settings window mounts it, reading the one store. */
export function ArchSection(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings);
  const options = useSettingsStore((s) => s.archOptions);
  const loaded = useSettingsStore((s) => s.archOptionsLoaded);
  const [dropped, setDropped] = useState(false);

  const onWrote = (kept: boolean): void => setDropped(!kept);

  return (
    <ArchSectionView
      options={options}
      loaded={loaded}
      arch={settings.arch}
      dropped={dropped}
      onAgent={(agentId) => {
        void selectArchAgent(agentId).then(onWrote);
      }}
      onModel={(model) => {
        void selectArchModel(model).then(onWrote);
      }}
      onEnabled={(enabled) => {
        void setArchEnabled(enabled).then(onWrote);
      }}
    />
  );
}
