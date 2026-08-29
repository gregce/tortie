/**
 * Settings then Catch Me Up (Phase 138, cut down in Phase 138.1): who writes
 * the one line the project view draws for each session.
 *
 * TWO CONTROLS AND NOTHING ELSE. One picks the agent, one picks the model
 * that agent uses. There is no switch per session, no switch per turn and no
 * interval, because a fold runs when a session finishes a turn and at no
 * other moment.
 *
 * PHASE 138.1 CUT THE PAGE DOWN. The operator photographed it and said the
 * extra text was crap. With Claude Code chosen it drew twenty three
 * sentences, and ten of those were the same sentence with a different agent's
 * name in it, one per agent Tortie has no measured recipe for. Those ten are
 * now ONE line naming the agents together. The three paragraphs under the
 * card are gone, because each of them repeated what a picker already said.
 * The unmeasured agents are still named, because hiding them would hide the
 * truth.
 *
 * THE LIST IS BUILT IN MAIN AND THERE IS NO ARRAY OF AGENT IDS IN THIS FILE.
 * Main joins three things and offers a row only when all three agree: the
 * merged agent table, the Phase 23 confirm gate, and the compiled table of
 * one shot recipes Tortie has actually measured. Main names WHY a row cannot
 * be picked and this file writes the words, so every user facing string lives
 * in ./fold-copy.ts where the copy rules test reads it.
 *
 * NONE IS THE SHIPPED ANSWER AND IT STAYS A VALID ONE FOREVER. With None
 * chosen nothing spawns, no sentence is ever written, and the project view
 * draws the line Phase 137 builds from your own ask and from what git
 * recorded. That page is complete with no model at all.
 *
 * THE CHOICE IS SEALED, because it decides that a program runs. CLAUDE.md
 * refusal 8 reads that nothing may cause a process to start on a
 * configuration change alone, and that a person confirms the bytes out of
 * band of any agent turn. Main drops a fold choice that its seal does not
 * cover, so a settings file an agent edited comes back as None and the page
 * says one sentence about it.
 */

import React, { useState } from 'react';
import type { FoldHarnessOption, FoldOptions } from '@shared/fold';
import { keyDisplay } from '@shared/keymap';
import type { FoldSettings } from '@shared/settings';
import { noFoldChosen } from '@shared/settings';
import {
  FOLD_ABOUT_BOUNDARY,
  FOLD_ABOUT_GROUP,
  FOLD_ABOUT_LEVELS,
  FOLD_ABOUT_WHAT,
  FOLD_AGENT_CAPTION,
  FOLD_AGENT_LABEL,
  FOLD_BRIDGE_MISSING,
  FOLD_CHOICE_DROPPED,
  FOLD_GROUP,
  FOLD_LOADING,
  FOLD_MODEL_CAPTION,
  FOLD_MODEL_LABEL,
  FOLD_NONE_OPTION,
  FOLD_NO_HARNESSES,
  FOLD_SUGGESTED_MARK,
  FOLD_TITLE,
  foldAboutOpen,
  foldChosenUnavailable,
  foldMeasuredOn,
  foldNotConfirmed,
  foldNotMeasured
} from './fold-copy';
import { useSettingsStore } from './settings-store';

/** The select's value for "no agent writes the line". Never an agent id. */
const NONE = '';

/** The row for one agent id, or undefined when main did not offer the id. */
export function foldHarnessById(
  options: FoldOptions | null,
  agentId: string | null
): FoldHarnessOption | undefined {
  if (options === null || agentId === null) return undefined;
  return options.harnesses.find((h) => h.agentId === agentId);
}

/**
 * The model a freshly picked agent starts on. The row's own suggestion when
 * the row carries one, and its first model otherwise. Never a name typed
 * here, because a model this build has no recipe for cannot be spawned.
 */
export function firstFoldModel(harness: FoldHarnessOption): string | null {
  if (harness.suggestedModel !== null) return harness.suggestedModel;
  return harness.models[0]?.id ?? null;
}

/**
 * The labels of every row main refused for one reason, joined for one line.
 *
 * Empty in, empty out, and the caller draws nothing at all then. The agent
 * table's own order is kept, which is the order the picker shows.
 */
export function foldRefusedNames(
  options: FoldOptions,
  reason: FoldHarnessOption['reason']
): string {
  return options.harnesses
    .filter((h) => !h.available && h.reason === reason)
    .map((h) => h.agentLabel)
    .join(', ');
}

/**
 * Persist an agent pick and report whether the write stuck.
 *
 * False means main refused the pair, which is what the seal does to a choice
 * that did not come from this window, and what membership checking does to an
 * agent or a model this build has no recipe for. The section says one
 * sentence then rather than showing a choice that is not in force.
 *
 * Exported for the unit test, which runs under the node environment and
 * cannot fire a change event on server rendered markup.
 */
export async function selectFoldAgent(agentId: string): Promise<boolean> {
  const store = useSettingsStore.getState();
  if (agentId === NONE) {
    await store.update({ fold: noFoldChosen() });
    return true;
  }
  const harness = foldHarnessById(store.foldOptions, agentId);
  if (harness === undefined || !harness.available) return false;
  const model = firstFoldModel(harness);
  if (model === null) return false;
  const next = await store.update({ fold: { agentId, model } });
  return next?.fold.agentId === agentId && next.fold.model === model;
}

/**
 * Persist a model pick against the agent already chosen.
 *
 * The model has to be one main offered for that agent. Main checks the same
 * thing before its seal is consulted and drops the whole pair when the check
 * fails, so checking here only saves a pointless write. Exported for the test.
 */
export async function selectFoldModel(model: string): Promise<boolean> {
  const store = useSettingsStore.getState();
  const agentId = store.settings.fold.agentId;
  if (agentId === null) return false;
  const harness = foldHarnessById(store.foldOptions, agentId);
  if (harness === undefined || !harness.models.some((m) => m.id === model)) {
    return false;
  }
  const next = await store.update({ fold: { agentId, model } });
  return next?.fold.model === model;
}

/**
 * The agent picker row, shared with the Architecture section (Phase 158).
 * The markup is identical on both pages, so the copy arrives as props rather
 * than being read from either page's copy file here.
 */
export function HarnessAgentRow(props: {
  options: FoldOptions;
  chosen: string | null;
  label: string;
  caption: string;
  noneLabel: string;
  suggestedMark: string;
  onAgent(agentId: string): void;
}): React.JSX.Element {
  const { options, chosen, label, caption, noneLabel, suggestedMark, onAgent } =
    props;
  // A stored agent main no longer offers still shows as itself, so the
  // picker can never draw a different agent's name over the stored choice.
  const known = foldHarnessById(options, chosen) !== undefined;
  return (
    <div className="set-row tall">
      <div className="set-row-text">
        <span className="set-row-label">{label}</span>
        <span className="set-row-caption">{caption}</span>
      </div>
      <select
        className="set-select"
        aria-label={label}
        value={chosen ?? NONE}
        onChange={(e) => onAgent(e.target.value)}
      >
        <option value={NONE}>{noneLabel}</option>
        {options.harnesses.map((h) => (
          <option key={h.agentId} value={h.agentId} disabled={!h.available}>
            {h.agentId === options.suggestedAgentId
              ? `${h.agentLabel}${suggestedMark}`
              : h.agentLabel}
          </option>
        ))}
        {chosen !== null && !known ? (
          <option value={chosen}>{chosen}</option>
        ) : null}
      </select>
    </div>
  );
}

/** The model picker row, shared with the Architecture section (Phase 158). */
export function HarnessModelRow(props: {
  harness: FoldHarnessOption;
  chosen: string | null;
  label: string;
  caption: string;
  onModel(model: string): void;
}): React.JSX.Element {
  const { harness, chosen, label, caption, onModel } = props;
  const known = harness.models.some((m) => m.id === chosen);
  return (
    <div className="set-row tall">
      <div className="set-row-text">
        <span className="set-row-label">{label}</span>
        <span className="set-row-caption">{caption}</span>
      </div>
      <select
        className="set-select"
        aria-label={label}
        value={chosen ?? NONE}
        onChange={(e) => onModel(e.target.value)}
      >
        {harness.models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
        {chosen !== null && !known ? (
          <option value={chosen}>{chosen}</option>
        ) : null}
      </select>
    </div>
  );
}

/** One sentence on its own row, in the section's caption voice. */
export function CaptionRow(props: { text: string }): React.JSX.Element {
  return (
    <div className="set-row">
      <div className="set-row-text">
        <span className="set-row-caption">{props.text}</span>
      </div>
    </div>
  );
}

/** One sentence on its own row, where something is wrong or withheld. */
export function ErrorRow(props: { text: string }): React.JSX.Element {
  return (
    <div className="set-row">
      <div className="set-row-text">
        <span className="set-row-error">{props.text}</span>
      </div>
    </div>
  );
}

export interface FoldSectionViewProps {
  /** What main offered, or null while the read is out or on a build with no bridge. */
  options: FoldOptions | null;
  /** Has the read settled? Null and settled is a build that cannot fold. */
  loaded: boolean;
  /** The stored choice. Both fields null is None. */
  fold: FoldSettings;
  /** True when the last write did not come back in force. */
  dropped: boolean;
  onAgent(agentId: string): void;
  onModel(model: string): void;
}

/**
 * The section as markup, with no store behind it.
 *
 * It is split out because the Settings window renders under React's server
 * renderer in the unit tests, where a zustand hook answers with the store's
 * INITIAL state rather than its current one. A component that reads the
 * store directly can therefore only ever be tested on its defaults. The
 * props here are the whole input, so every state the section can be in is
 * reachable from a test.
 */
export function FoldSectionView(
  props: FoldSectionViewProps
): React.JSX.Element {
  const { options, loaded, fold, dropped, onAgent, onModel } = props;
  const harness = foldHarnessById(options, fold.agentId);
  // The two groups of refused rows, each named together on one line rather
  // than one paragraph per agent.
  const notMeasured =
    options === null ? '' : foldRefusedNames(options, 'not-measured');
  const notConfirmed =
    options === null ? '' : foldRefusedNames(options, 'not-confirmed');

  return (
    <section aria-label={FOLD_TITLE}>
      <h1 className="set-title">{FOLD_TITLE}</h1>

      <div className="set-group-label">{FOLD_GROUP}</div>
      <div className="set-card">
        {options === null ? (
          <CaptionRow text={loaded ? FOLD_BRIDGE_MISSING : FOLD_LOADING} />
        ) : (
          <>
            <HarnessAgentRow
              options={options}
              chosen={fold.agentId}
              label={FOLD_AGENT_LABEL}
              caption={FOLD_AGENT_CAPTION}
              noneLabel={FOLD_NONE_OPTION}
              suggestedMark={FOLD_SUGGESTED_MARK}
              onAgent={onAgent}
            />
            {harness !== undefined && harness.models.length > 0 ? (
              <HarnessModelRow
                harness={harness}
                chosen={fold.model}
                label={FOLD_MODEL_LABEL}
                caption={FOLD_MODEL_CAPTION}
                onModel={onModel}
              />
            ) : null}

            {dropped ? <ErrorRow text={FOLD_CHOICE_DROPPED} /> : null}

            {harness !== undefined && !harness.available ? (
              <ErrorRow text={foldChosenUnavailable(harness.agentLabel)} />
            ) : null}

            {options.suspended !== null ? (
              <ErrorRow text={options.suspended} />
            ) : null}

            {harness?.measuredOn != null ? (
              <CaptionRow text={foldMeasuredOn(harness.measuredOn)} />
            ) : null}

            {options.harnesses.length === 0 ? (
              <CaptionRow text={FOLD_NO_HARNESSES} />
            ) : null}

            {/* The agents Tortie cannot offer are named rather than hidden,
                on one line per reason. */}
            {notMeasured !== '' ? (
              <CaptionRow text={foldNotMeasured(notMeasured)} />
            ) : null}
            {notConfirmed !== '' ? (
              <CaptionRow text={foldNotConfirmed(notConfirmed)} />
            ) : null}
          </>
        )}
      </div>

      {/* The one block of prose, and the operator asked for it by name. It
          sits under the controls, because someone who came to change a
          dropdown should reach the dropdown first. The chord is read from
          the shared keymap, so this block cannot drift from the keys the app
          answers. */}
      <div className="set-group-label">{FOLD_ABOUT_GROUP}</div>
      <p className="set-section-caption">{FOLD_ABOUT_WHAT}</p>
      <p className="set-section-caption">
        {foldAboutOpen(keyDisplay('view.overview'))}
      </p>
      <p className="set-section-caption">{FOLD_ABOUT_LEVELS}</p>
      <p className="set-section-caption">{FOLD_ABOUT_BOUNDARY}</p>
    </section>
  );
}

/** The section as the Settings window mounts it, reading the one store. */
export function FoldSection(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings);
  const options = useSettingsStore((s) => s.foldOptions);
  const loaded = useSettingsStore((s) => s.foldOptionsLoaded);
  const [dropped, setDropped] = useState(false);

  const onWrote = (kept: boolean): void => setDropped(!kept);

  return (
    <FoldSectionView
      options={options}
      loaded={loaded}
      fold={settings.fold}
      dropped={dropped}
      onAgent={(agentId) => {
        void selectFoldAgent(agentId).then(onWrote);
      }}
      onModel={(model) => {
        void selectFoldModel(model).then(onWrote);
      }}
    />
  );
}
