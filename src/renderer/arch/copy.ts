/**
 * Every sentence the Architecture view says to a person, in one file.
 *
 * The precedent is `src/renderer/machines/editor.ts`, which holds every
 * sentence that view says about a machine so a vocabulary audit reads one file
 * rather than nine components. The same reason applies here twice over,
 * because this view's whole job is telling a person something is wrong and the
 * difference between "broke" and "cannot be checked" is the feature.
 *
 * THE COPY RULING (the operator, 2026-08-28): the panel carries just enough
 * words to say what is happening. Short labels, one line sentences and
 * visual state on the resting face; a longer explanation lives behind a
 * hover title or one collapsed disclosure, never on the face. The unit
 * suite counts the words on every resting sentence, so a later round that
 * grows one back into a paragraph fails before it ships.
 *
 * THE VOCABULARY, fixed here so no component invents a second word for it:
 *
 *  - A promise HOLDS, BROKE, IS MISSING, or CANNOT BE CHECKED. Those four
 *    words are `convergent`, `divergent`, `absent` and `unverifiable`, and no
 *    surface says the machine word.
 *  - Coverage is CHECKED, PARTLY CHECKED or NOT CHECKABLE. A behavioural
 *    promise with evidence is partly checked, and the panel says what that
 *    bought in one sentence rather than leaving a person to guess.
 *  - Nothing here says "stale", "drift" or "out of date" as a verdict. Age is
 *    a number of commits and it is stated as one.
 *
 * NO TMUX VOCABULARY, NO COUNT THAT RISES ON ITS OWN, and no yellow anywhere:
 * amber belongs to "an agent needs you" and nothing on this surface is that.
 */

/** The view's own name, as a person reads it. */
export const ARCH_VIEW_TITLE = 'Architecture';

/** No preload method at all. One sentence, and the view still renders. */
export const ARCH_NO_BRIDGE =
  'This build cannot read a contract. Everything else in Tortie works as it always did.';

/**
 * PHASE 228 DELETED `ARCH_ELSEWHERE`. It was the one sentence this view drew
 * on a tab whose folder is on a machine, "A contract is read on the computer
 * its repository is on, and this build cannot ask that computer anything.",
 * 19 words of standing prose with no equivalent on a local tab. The
 * operator's rule of 2026-09-07 takes it off: on a machine the view draws
 * nothing, and the one genuinely different limit is the disabled Open the map
 * control with the label below as its hover title, until Phase 234 reads
 * a repository on a machine.
 */

/**
 * PHASE 234 DELETED `ARCH_MAP_ON_THIS_MAC`. It was the disabled Open the map
 * control's hover title on a tab whose folder is on a machine, "The map works
 * on this Mac only", and it was the last word on this surface that appeared
 * only there. The map reads a repository on a machine now, so the control is
 * enabled and carries the SAME title it carries here. There is no sentence,
 * no label and no disabled action left on the Architecture face that a folder
 * on this Mac does not also have.
 */

/**
 * PHASE 160, the map's own sentences.
 *
 * The map is the product and the contract is annotation on it, in the
 * operator's own ruling. So the pane's first control opens the map, the map
 * needs no contract, and the sentence about contracts says what one ADDS
 * rather than what is missing.
 */

/** The control in the pane that opens or focuses the map tab. */
export const ARCH_MAP_OPEN_TITLE = 'Open the map';

/** What the control does, on the hover title only (the copy ruling). */
export const ARCH_MAP_OPEN_BODY =
  'Draws this repository as a small map in a full size tab. No contract is needed and nothing is written.';

/** The map tab while main is still reading the code the first time. */
export const ARCH_MAP_LOADING =
  'Tortie is reading the code. The map draws the moment the reading lands, and every later open reuses it.';

/** A map read that failed outright, when there is no earlier picture to keep. */
export const ARCH_MAP_ERROR = 'The map could not be drawn.';

/** The reading finished and found nothing to draw. Honest, never a spinner. */
export const ARCH_MAP_EMPTY_REPO =
  'There is nothing to draw. No tracked source files were found in this repository.';

/**
 * The reading finished, tracked files exist, and still nothing draws: every
 * one of them sits at the top level of the repository, and the grouping draws
 * folders (Phase 63's rule, which the map inherits). Saying no tracked files
 * were found here would be false, which the Phase 160 fix round measured on a
 * one file repository.
 *
 * The second fix round made this sentence exact: the grouping now composes
 * zero groups ONLY when no tracked file sits inside a folder, so a small
 * nested repository draws its real folders instead of being called flat.
 */
export const ARCH_MAP_FLAT_REPO =
  'There is nothing to draw yet. Every tracked file sits at the top level of this repository, and the map draws the folders a codebase grows into.';

/** An older preload with no map channel. One sentence, and the tab still renders. */
export const ARCH_MAP_NO_BRIDGE =
  'This build cannot draw the map. Everything else in Tortie works as it always did.';

/** A newer read failed and the picture on screen is the read before it. */
export const ARCH_MAP_STALE =
  'The newest reading failed, so this picture is the one before it.';

/**
 * PHASE 244, audit finding F3. The lead-in for the sentence main sends when the
 * scan behind this picture did not see the whole folder.
 *
 * It is one line and the rest of it is main's own sentence, which already names
 * what was left out and why, so this adds the ONE thing that sentence cannot
 * say from where it is written: that the picture on screen is about part of the
 * folder. Until this phase nothing said it at all — a mirror that stopped at its
 * ceiling was recorded as a complete scan and the map drew a settled answer.
 */
export const ARCH_MAP_PARTIAL_PREFIX = 'This picture is about part of the folder.';

/**
 * PHASE 201, THE READING (research 77 section 7). The sidebar reads, top to
 * bottom: the repository line, the model slot, the components each with its
 * sentence and the ten hover facts, and the contract last. Every sentence
 * on a face is the code's own, and every explanation rides a hover.
 */

/** The hover on the repository's name row. */
export const ARCH_SUBJECT_TITLE = 'The name package.json or Cargo.toml declares.';

/** The hover on rule R, saying how each number is counted. */
export const ARCH_REPO_LINE_TITLE =
  'From the code alone. Files are what git tracks, the language is the most common file type, a part is a box on the map, a connection is one part importing another, and an import leads inside the repository when it resolves to a tracked file.';

/** The model slot, drawn absent: one line, and no control until layer 2 lands. */
export const ARCH_MODEL_NONE = 'No model reading yet.';
export const ARCH_MODEL_NONE_TITLE =
  'The line above comes from the code alone. A model can add what the repository is for, drawn under its own label and never as a fact.';

/** The heading over the parts. */
export const ARCH_COMPONENTS_TITLE = 'Components';

/** The band glyph's hover: which row of the map the part sits in, and why. */
export function archBandTitle(band: string): string {
  if (band === 'surface') return 'Surface. No other part imports it.';
  if (band === 'foundation') return 'Foundation. Other parts import it and it imports none.';
  return 'Engine. Other parts import it and it imports others.';
}

/** The weight bar's hover: the share of the repository's files, as a percent. */
export function archWeightTitle(percent: number): string {
  return `${String(percent)}% of the files in the repository`;
}

/** The header's refresh control, since Phase 201 a re-read rather than only a re-check. */
export const ARCH_CHECK_LABEL = 'Read the code again';
export const ARCH_CHECK_BODY =
  'Reads the code again and checks any promises against it. The file watcher cannot see a folder that did not exist when this view opened.';

/** The contract section's heading, last on the face since Phase 201. */
export const ARCH_CONTRACT_OFFER_TITLE = 'Contract';

/** No `docs/arch/` at all, which is every repository until somebody writes one. */
export const ARCH_EMPTY_TITLE = 'No contract in this repository yet';

/** The offer's one resting line. The paragraph moved behind the disclosure. */

export const ARCH_EMPTY_BODY =
  'None yet. Promises about how parts may touch, checked against the code.';

/** The collapsed disclosure's label. The teaching lives behind it. */
export const ARCH_EMPTY_MORE = 'What a contract is';

/**
 * The teaching, behind the disclosure (the copy ruling, 2026-08-28). This
 * is the paragraph that used to sit on the resting face; the face now says
 * the one line above and this opens on a click.
 */
export const ARCH_EMPTY_LONG =
  'A contract is a small set of promises about how the parts of this project are allowed to touch. Tortie checks them against the code and says which ones hold, which ones broke and at which line, and which ones it cannot check.';

/**
 * The promise-set guidance, and it is a number for a reason. Research 49
 * section 9.6 read thirty architecture documents the operator wrote by hand
 * and none of them opened with more than nine boxes. A set of three says
 * nothing and a set of forty is a second codebase to maintain.
 */
export const ARCH_PROMISE_GUIDANCE =
  'A healthy set is 5 to 10 promises. Fewer says nothing, and more is a second codebase to keep current.';

/** What the one control does, said before it is pressed (Phase 158). */
export const ARCH_DRAFT_TITLE = 'Draft the contract';

/**
 * IT SAYS THE WRITE OUT LOUD, and that sentence is load bearing.
 *
 * Phase 158 replaced the unsaved buffers with a direct write, on the
 * operator's own amendment: the gesture asks main to write the deterministic
 * skeleton under `docs/arch/`, so the result lands as an ordinary
 * uncommitted change a person reviews in Source Control, never as buffers
 * they must save one by one. The sentence names the write before the button
 * is pressed, because the earlier version of this surface once promised the
 * opposite of what it did. Since the copy ruling it rides the button's hover
 * title rather than its face.
 */
export const ARCH_DRAFT_BODY =
  'Writes a small deterministic skeleton into docs/arch, drawn from the code alone. It lands as an ordinary uncommitted change, so Source Control shows every line and you commit it or throw it away.';

/**
 * THE ONE QUIET SENTENCE ABOUT THE PASS, with its Settings pointer.
 *
 * There is one way a contract starts. A model improves it afterwards, where
 * a model is the right tool, and only under the agent the person confirmed
 * in Settings. These two sentences are the whole story the offer tells; the
 * run face below tells the rest while it happens.
 */
export const ARCH_PASS_QUIET =
  'The agent you picked in Settings then fills it in.';

/** The pass is off. Said plainly, so off never reads as broken. */
export const ARCH_PASS_OFF = 'No agent fills this in yet. Pick one in Settings.';

/** The one sentence the prose panel carries under every description. */
export const ARCH_PROSE_UNVERIFIED =
  'The author\'s own words. Tortie never checks them.';

/** What a behavioural promise with evidence actually bought. */
export const ARCH_PARTLY_CHECKED_NOTE =
  'The quoted code is still there. What it does when run is unproven.';

/** The gap strip's own heading, first class because the corpus makes it so. */
export const ARCH_GAPS_TITLE = 'Known gaps';

/**
 * The accepted-divergence rule, said on the face of the strip.
 *
 * PHASE 158 CHANGED THE SECOND SENTENCE. Accepting a divergence became a
 * button on the failing row, on the operator's own amendment, so "Tortie
 * never writes that file" stopped being true. What stays true, and what the
 * sentence now says, is the part that matters: the decision and the reason
 * are the person's, the button is the one way the file is ever written, and
 * every accepted row still shows here in the person's own words so an agent
 * cannot quietly accept its own violation. Since the copy ruling the strip
 * says the count and the rows, and this sentence rides the hover title.
 */
export const ARCH_ACCEPTED_NOTE =
  'Accepted divergences are counted here with the reason the person gave. The accept control on a failing row is the one way Tortie ever writes that file.';

/**
 * THE FOUR VERDICT WORDS, THE THREE COVERAGE WORDS, THE FRESHNESS RIBBON AND
 * THE UNRESOLVED SENTENCE NOW LIVE IN `src/shared/arch-copy.ts` (Phase 64).
 *
 * They moved because the main process composes a text block for a running
 * agent, and that block says "broke" and carries the same freshness sentence
 * this ribbon draws. Two copies of a sentence a person reads in two places is
 * how the two drift, and nothing compares them. The names below are what this
 * view already called them, so every caller in this directory is unchanged.
 */
export {
  archCoverageWord as coverageWord,
  archFreshnessRibbon as freshnessSentence,
  archUnresolvedSentence as unresolvedSentence,
  archVerdictWord as verdictWord
} from '@shared/arch-copy';

/** A run that has not finished yet. Never a stale verdict wearing a fresh face. */
export const ARCH_FIRST_CHECK = 'Not checked yet';

/**
 * PHASE 178, the strip on a contract with zero promises between parts.
 *
 * Research 71 section 5 measured the dishonesty: rookery's strip read "9
 * checked and holds" over a contract whose `edges.json` was `{"edges": []}`.
 * With zero edges there are no promise verdicts at all, so the strip says so
 * first and the held lane stops wearing the word a person reads as a promise.
 */
export const ARCH_NO_PROMISES_NOTE =
  'No promises between parts are written yet.';

/**
 * The held lane's word when there are zero promises. "Checks", never a
 * narrower name: research 71 called rookery's nine "evidence quotes", but on
 * that repository every component's evidence array is empty and all nine are
 * anchor checks. The lane counts whatever held, anchors and quotes alike, so
 * the word claims no more than the data says. The fix round of 2026-08-31
 * measured this live: planting one real quote read "10 evidence checks hold"
 * off a strip whose other nine were anchors.
 */
export function archChecksHoldWord(n: number): string {
  return n === 1 ? 'check holds, not a promise' : 'checks hold, none a promise';
}

/**
 * PHASE 178, the folded "Would not load" wall.
 *
 * Rookery drew 34 near identical red rows out of 17 files. The resting face
 * now carries one line and the per file rows sit behind a disclosure, per
 * Just enough words. Phase 177 already made the usual case empty, so this
 * line is the general case for the contracts that still refuse rows.
 */
export function archProblemsSummary(files: number): string {
  return files === 1
    ? '1 file would not load.'
    : `${String(files)} files would not load.`;
}

/** The disclosure's label under the folded wall. */
export const ARCH_PROBLEMS_MORE = 'Each file and the reason';

/**
 * PHASE 178, the clause a kept lead carries when the contract on disk did
 * not read back whole. A pass that wrote a contract a third of which cannot
 * be loaded must not lead with a plain kept sentence.
 */
export function archUnreadableClause(files: number): string {
  return files === 1
    ? '1 file of it would not load.'
    : `${String(files)} files of it would not load.`;
}

/** The failure list's own heading, and the empty case reads as an answer. */
export const ARCH_NO_FAILURES = 'Every promise Tortie can check holds.';

/**
 * A read that failed on the bytes, showing the last good rows instead.
 *
 * It exists because an agent rewriting `edges.json` writes it in stages, and a
 * view that blanked on every half written save would be unusable for the exact
 * minute a person most wants to look at it. So the rows on screen are the
 * previous good read and the banner says so, rather than the view pretending
 * they are current or pretending there is nothing there.
 */
export const ARCH_LAST_VALID =
  'These are the last rows that loaded. The files on disk did not, so what is on screen may be behind them.';

/**
 * PHASE 161, the drill's own sentences.
 *
 * The ladder is the navigation: the whole map, one part, one module. The
 * breadcrumb names where a person is and one click returns to the whole. The
 * pane's strip and failure list scope with the drill, and every scoped state
 * below says what it means in one sentence rather than drawing zero filled
 * lanes about nothing.
 */

/** The breadcrumb's own name, for the reader that cannot see it. */
export const ARCH_DRILL_CRUMB_LABEL = 'Where you are in the map';

/** The first breadcrumb segment when the model has no better name yet. */
export const ARCH_DRILL_WHOLE = 'Whole map';

/** An older preload with no scoped read. One sentence, and the map still draws. */
export const ARCH_DRILL_NO_BRIDGE =
  'This build cannot look inside a part. Everything else in Tortie works as it always did.';

/** A scoped read that failed outright, with no earlier picture to keep. */
export const ARCH_DRILL_PART_ERROR = 'The inside of this part could not be read.';

/** The pane's strip while the scoped answer is on its way. */
export const ARCH_SCOPED_LOADING = 'Reading the promises for this part.';

/**
 * A contract whose promises do not touch the drilled part. The sentence is
 * the honest face here: zero filled lanes would be a reassuring number about
 * nothing, which is the exact thing the unscoped strip refuses.
 */
export const ARCH_SCOPED_NO_PROMISES =
  'No promise in the contract touches this part, so there is nothing to check inside it.';

/** The scoped failure list when everything checkable in the part holds. */
export const ARCH_SCOPED_NO_FAILURES =
  'Every promise Tortie can check in this part holds.';

/**
 * PHASE 158, the run face and the accept verb.
 *
 * The pass is visible while it runs, the way a session row says written and
 * the time. Every state below is one sentence a person can act on, and a
 * refused run says so with the refusal named rather than pretending nothing
 * happened.
 */

/** The run face's own heading. */
export const ARCH_PASS_TITLE = 'Filling in';

/** The control that runs the pass over an existing contract. */
export const ARCH_ENRICH_TITLE = 'Fill in the contract';

/** What the run control does, on the hover title only (the copy ruling). */
export const ARCH_ENRICH_BODY =
  'Runs the agent you confirmed in Settings once over this repository. Its answer is checked whole before anything is written, and what it writes lands as an ordinary uncommitted change.';

/** The pass is running right now. */
export const ARCH_PASS_RUNNING =
  'Running. Nothing is written until the whole answer passes the checks.';

/** The last answer was refused whole. The refusal name follows this lead. */
export const ARCH_PASS_REFUSED =
  'The last answer was refused whole and nothing was written.';

/** The last run failed for a reason that is not a refusal. */
export const ARCH_PASS_FAILED = 'The last run failed and nothing was written.';

/** Repeated failures parked the pass, the fold's own discipline. */
export const ARCH_PASS_SUSPENDED =
  'Paused after repeated failures. Run it again when you want another try.';

/** The heading over the answer's regroup suggestions, when it made any. */
export const ARCH_PASS_SUGGESTIONS = 'Suggested regroupings';

/** The rule the suggestions live under, said on their face. */
export const ARCH_PASS_SUGGESTIONS_NOTE = 'Listed only, never written.';

/**
 * The sentence for a gesture main refused before any spawn. The tokens are
 * main's, the fold options convention: main decides, the renderer writes the
 * words, and an unknown token still gets an honest sentence with the token
 * named rather than a blank face.
 */
export function enrichRefusalSentence(token: string): string {
  switch (token) {
    case 'no-choice':
      return ARCH_PASS_OFF;
    case 'not-confirmed':
      return 'The picked agent is not confirmed in Settings right now, so nothing was started.';
    case 'no-recipe':
      return 'The picked agent has no measured recipe yet, so nothing was started.';
    case 'in-flight':
      return 'A pass is already running for this repository.';
    case 'suspended':
      return ARCH_PASS_SUSPENDED;
    default:
      return `Nothing was started. The reason is named ${token}.`;
  }
}

/** The accept control on a failing row. One word, the decision is the click. */
export const ARCH_ACCEPT_TITLE = 'Accept';

/** An offence a baseline row already covers. One word; the reason rides hover. */
export const ARCH_OFFENCE_ACCEPTED = 'accepted';

/** What pressing it does, said before it is pressed. */
export const ARCH_ACCEPT_BODY =
  'Writes this divergence into docs/arch/baseline.json with your reason. The decision and the reason are yours, and the typing is not.';

/** The reason field, which the write refuses to go without. */
export const ARCH_ACCEPT_REASON_LABEL = 'Why this divergence is fine';

/** The confirm control inside the open accept form. */
export const ARCH_ACCEPT_WRITE = 'Write it down';

/**
 * PHASE 159, the freshness loop: the change diff and the repair keypress.
 *
 * The diff draws what the last check moved, one line per row and a glyph
 * before every word, with the checker's own reason on hover and never on
 * the face. The keypress rides the freshness ribbon and asks main for the
 * same pass the fill in button asks for, scoped to what drifted. Nothing
 * here says "stale" or "drift" as a verdict; a promise broke, a part fell
 * behind by a number of commits, and the words say exactly that.
 */

/** The change diff's own heading. The commit the burst landed at sits beside it. */
export const ARCH_CHANGES_TITLE = 'Changed';

/** What the section is, on the header's hover title only. */
export const ARCH_CHANGES_BODY =
  'What the last check moved, against the check before it. Press a row to read it.';

/** A subject the check before did not have. One word beside the arrow. */
export const ARCH_CHANGE_NEW = 'new';

/** A subject this check no longer has. One word beside the arrow. */
export const ARCH_CHANGE_GONE = 'gone';

/** The one control on the ribbon, for the reader that cannot see the glyph. */
export const ARCH_REPAIR_LABEL = 'Repair what drifted';

/** What pressing it does, on the hover title only (the copy ruling). */
export const ARCH_REPAIR_BODY =
  'Runs the agent you confirmed in Settings once, over what broke or fell behind and nothing else. The answer is checked whole before anything is written.';

/** The kept repair's own line, the twin of the whole pass's written sentence. */
export const ARCH_REPAIR_WRITTEN = 'The repair was last written at';

/**
 * The hover title on a part row of the diff: how far the part moved since
 * the check before, and whether some of that is still uncommitted. The
 * number is the point here, so the sentence carries it.
 */
export function partChangeTitle(
  commitsBehind: number,
  uncommittedFiles: number
): string {
  const commits =
    commitsBehind === 1
      ? '1 more commit has landed'
      : `${String(commitsBehind)} more commits have landed`;
  const head = `${commits} under this part since the check before.`;
  if (uncommittedFiles === 0) return head;
  const files =
    uncommittedFiles === 1
      ? '1 changed file is'
      : `${String(uncommittedFiles)} changed files are`;
  return `${head} ${files} not committed yet.`;
}

// ---------------------------------------------------------------------------
// Phase 258: the reading surface (research 118 §10 Phase 2, SPEC §4)
// ---------------------------------------------------------------------------
// The map tab grew an inner tab row and three computed views. Every sentence
// here is short on purpose: the copy ruling holds on the map tab as it holds
// on the pane, and the phase's word budgets (SPEC §4.5) are counted by the
// probe over the resting face.

/** What the whole map tab is a picture of. The tab row's label and the map's own. */
export const ARCH_MAP_VIEW_LABEL = 'What this repository builds and starts';

/** The three inner tabs, in order. */
export const ARCH_TAB_MAP = 'Map';
export const ARCH_TAB_SURFACES = 'Surfaces';
export const ARCH_TAB_GATES = 'Gates';

/** The one line the outside band says: nothing in it is this repository's code. */
export const ARCH_OUTSIDE_EMPTY = "Nothing here is this repository's code.";

/** The inspector with nothing selected. */
export const ARCH_INSPECT_NONE = 'Select a part.';

/** The inspector's control that opens the selected part up. */
export const ARCH_INSPECT_OPEN = 'Open';

/** The six inspector field labels, in their fixed order. */
export const ARCH_INSPECT_RUNS_IN = 'Runs in';
export const ARCH_INSPECT_EXPOSES = 'Exposes';
export const ARCH_INSPECT_KEEPS = 'Keeps';
export const ARCH_INSPECT_REACHES = 'Reaches';
export const ARCH_INSPECT_GUARDS = 'Guards';
export const ARCH_INSPECT_TESTS = 'Tests';
export const ARCH_INSPECT_RUNG = 'Rung';

/** A field with a count of zero. */
export const ARCH_INSPECT_NOTHING = 'nothing';
/** Exposes at zero: the reader saw no surface, which is a claim about the reader. */
export const ARCH_INSPECT_NO_SURFACE = 'nothing this reader sees';

/** The disclosure that lists the rows behind a field. */
export const ARCH_FACTS_SHOW = 'Show';
export const ARCH_FACTS_HIDE = 'Hide';
/** The rows are still being read. */
export const ARCH_FACTS_LOADING = 'Reading the rows.';
/** A read that failed, one sentence. */
export const ARCH_FACTS_ERROR = 'The rows could not be read.';
/** An older preload with no facts channel. */
export const ARCH_FACTS_NO_BRIDGE = 'This build cannot list the rows.';
/** The list was cut at the channel's cap. */
export const ARCH_FACTS_TRUNCATED = 'The first 2,000 rows. The rest are not listed.';
/** A scope with no rows in the asked categories. */
export const ARCH_FACTS_EMPTY = 'No rows.';

/** The surfaces list's six kinds, in their fixed order, with the word each draws. */
export const ARCH_SURFACE_KINDS: readonly { kind: string; label: string }[] = [
  { kind: 'ipc-channel', label: 'IPC channels' },
  { kind: 'http-route', label: 'HTTP routes' },
  { kind: 'cli-command', label: 'commands' },
  { kind: 'cli-flag', label: 'flags' },
  { kind: 'job', label: 'jobs' },
  { kind: 'port', label: 'ports' }
];

/** The hover on a surface kind at zero, saying the zero is a reading. */
export function archZeroSurfaceTitle(label: string): string {
  return `0 ${label} found in this part`;
}

/** The gates worksheet's four kinds, in order, all on by default. */
export const ARCH_GATE_KINDS: readonly string[] = ['auth', 'flag', 'refusal', 'guard'];

/** The worksheet's whole-repository choice. */
export const ARCH_GATES_WHOLE = 'Whole repository';

/** The worksheet's select, named for the screen reader. */
export const ARCH_GATES_SCOPE_LABEL = 'Which part';

/** The hover on a transport wire: what crosses, from where to where. */
export function archTransportTitle(
  kind: string,
  count: number,
  from: string,
  to: string
): string {
  const n = count.toLocaleString('en-US');
  switch (kind) {
    case 'imports':
      return `${n} resolved imports written in ${from} land in ${to}.`;
    case 'spawns':
      return `${from} starts ${n} programs outside this repository.`;
    case 'reaches':
      return `${from} reaches ${n} network addresses outside this repository.`;
    case 'listens':
      return `${to} listens on ${n} ports or addresses.`;
    default:
      return `${kind} · ${n}`;
  }
}

/** The one word a transport says on the wire, before its count. */
export function archTransportWord(kind: string): string {
  return kind;
}

/**
 * The word a fact kind counts as, in the inspector's field sentences:
 * `229 IPC channels`, `12 store writes`, `30 spawns`. A kind this table does
 * not know is drawn by its own name, so a new kind is never hidden.
 */
export function archKindWord(category: string, kind: string, n: number): string {
  const one = n === 1;
  const surface = ARCH_SURFACE_KINDS.find((k) => k.kind === kind);
  if (category === 'surface' && surface !== undefined) {
    return one ? surface.label.replace(/s$/, '') : surface.label;
  }
  const table: Record<string, [string, string]> = {
    'store-write': ['store write', 'store writes'],
    'store-def': ['store definition', 'store definitions'],
    migration: ['migration', 'migrations'],
    spawn: ['spawn', 'spawns'],
    'fs-write': ['file write', 'file writes'],
    client: ['network reach', 'network reaches'],
    listen: ['listen', 'listens'],
    auth: ['auth gate', 'auth gates'],
    flag: ['flag gate', 'flag gates'],
    refusal: ['refusal', 'refusals'],
    guard: ['guard', 'guards']
  };
  const words = table[kind];
  if (words === undefined) return kind;
  return one ? words[0] : words[1];
}

/** `12 gates`, the Guards field's one phrase. */
export function archGatesWord(n: number): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? 'gate' : 'gates'}`;
}

/** The Tests field: `395 of 1,068 parsed files imported by a test`. */
export function archTestsSentence(tested: number, parsed: number): string {
  return `${tested.toLocaleString('en-US')} of ${parsed.toLocaleString('en-US')} parsed files imported by a test`;
}

/** The header's file count: `1,068 files, 1,068 parsed`. */
export function archFilesWord(files: number, parsed: number): string {
  return `${files.toLocaleString('en-US')} files, ${parsed.toLocaleString('en-US')} parsed`;
}

/** A region's denominator line on the surfaces list. */
export function archRegionDenominator(
  parsed: number,
  files: number,
  vendored: number | undefined,
  truncated: number | undefined
): string {
  const parts = [`read ${parsed.toLocaleString('en-US')} of ${files.toLocaleString('en-US')} files`];
  if (vendored !== undefined) parts.push(`${vendored.toLocaleString('en-US')} vendored`);
  if (truncated !== undefined) parts.push(`${truncated.toLocaleString('en-US')} truncated`);
  return parts.join(' · ');
}

/** The worksheet's first answer line. */
export function archGatesAnswer(
  n: number,
  scopeName: string | null,
  parsed: number,
  total: number | null
): string {
  const where = scopeName === null ? 'in the repository' : `in ${scopeName}`;
  const head = `${archGatesWord(n)} ${where} over ${parsed.toLocaleString('en-US')} parsed files`;
  return scopeName === null || total === null
    ? head
    : `${head} · of ${total.toLocaleString('en-US')} in the repository`;
}

/** The worksheet's second answer line: the four counts, in the fixed order. */
export function archGatesBreakdown(counts: Readonly<Record<string, number>>): string {
  return ARCH_GATE_KINDS.map((k) => `${k} ${String(counts[k] ?? 0)}`).join(' · ');
}

/** The worksheet's placeholder option before a part is named. */
export const ARCH_GATES_NAME_ONE = 'Name a part';
