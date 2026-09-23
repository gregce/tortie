#!/usr/bin/env node
/**
 * conformance:phonecopy — the phone mock may not invent a word Tortie does not
 * say (Phase 311, inherited from the Phase 310 the operator deleted).
 *
 * WHAT IT DRIVES. Every user-visible string drawn by the screens in
 * `docs/design/phone/` is extracted from the HTML, split at Tortie's own ` · `
 * separator, and judged against a LEDGER declared below. A segment is one of
 * three things and nothing else:
 *
 *   owned  The words are Tortie's. The rule names the module that owns them and
 *          the literal that must be in it, and the drawn segment must carry that
 *          literal byte for byte. ONE CHARACTER OF DRIFT FAILS — a straight
 *          quote where the tree has a curly one, a dropped letter, a synonym.
 *   data   Not copy at all: a session's name, a project folder, an age, a clock,
 *          a count, a machine label, a key on the iOS keyboard, the person's own
 *          words or the agent's own output. Every rule carries its reason.
 *   owed   Copy no module owns yet, with the phase that owes it named. These are
 *          the declared exceptions and they are PRINTED AND COUNTED on every
 *          run, never silently passed. An owed string the tree has SINCE grown
 *          fails, so the exception list cannot rot into a permanent excuse.
 *
 * A segment that matches no rule FAILS BY NAME. That is the mechanism that
 * stops the mock inventing a word: inventing one means writing a rule for it,
 * in a commit, with a reason.
 *
 * WHAT IT REFUSES TO DO. It spawns nothing, starts no Electron, reads nothing
 * under the person's home and writes no file. It reads the mock and the modules
 * the ledger names, and that is all.
 *
 * THE CONTACT SHEET IS NOT A SCREEN. `index.html` draws the seven screens
 * through `<iframe src="…">` and its own prose is commentary about the mock. It
 * is exempt as a class, with that reason, and the exemption is paid for: the run
 * asserts that every screen the directory holds is shown through an iframe and
 * that the sheet draws no phone frame of its own.
 *
 * `--self-test` proves the gate can fail. It re-runs the whole judgement over
 * in-memory mutations of the mock — a curly quote straightened, a letter
 * dropped, a status word swapped, an undeclared sentence added — and each
 * mutation must produce a finding that names the string it damaged while the
 * unmutated run does not. Nothing is written, so the committed mock is never
 * touched.
 *
 * Usage:  node build/p311/copy-drift.mjs [--self-test] [--quiet]
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
/**
 * The screens. `P311_MOCK_DIR` points the whole judgement at a COPY of the mock
 * instead, which is how a proposed one-line fix to a screen is proved before
 * anybody edits the committed file, and how a verifier reads this gate against a
 * parent checkout. The ledger and the modules are always this tree's.
 */
const MOCK_DIR =
  process.env.P311_MOCK_DIR !== undefined && process.env.P311_MOCK_DIR !== ''
    ? resolve(process.env.P311_MOCK_DIR)
    : join(ROOT, 'docs', 'design', 'phone');
const CONTACT_SHEET = 'index.html';

/**
 * Tortie's separator between two facts on one line. ProjectLines draws it
 * literally and the session manager's cells compose with it, so the mock's rows
 * are split on it rather than each combination being declared.
 */
const SEPARATOR = ' · ';

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

/**
 * The tags that end a drawn line. Everything else is inline, so `Run` and
 * `rm -rf build` in two spans inside one div are one segment rather than two
 * fragments nobody can judge.
 */
const BLOCK_TAGS = [
  'html',
  'body',
  'div',
  'p',
  'button',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'ul',
  'ol',
  'tr',
  'td',
  'th',
  'section',
  'header',
  'footer',
  'nav',
  'main',
  'article',
  'aside',
  'figure',
  'figcaption',
  'blockquote',
  'pre',
  'label',
  'form',
  'table',
  'title',
  'br',
  'hr',
  'input',
  'textarea'
];

const BLOCK_RE = new RegExp(`</?(?:${BLOCK_TAGS.join('|')})\\b[^>]*>`, 'gi');

/** The attributes a person hears or reads that are not text nodes. */
const SPOKEN_ATTRS = ['aria-label', 'placeholder', 'alt'];

function unescapeHtml(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * One drawn line, normalised the way a person reads it. A no-break space is a
 * space — `Mac&nbsp;Pro` is the label `Mac Pro` — and the source's own wrapping
 * is not part of the copy.
 */
function tidy(text) {
  return unescapeHtml(text).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Every user-visible string one screen draws, as `{ kind, text }`.
 *
 * The document's own `<title>` is collected under the kind `page-title` and is
 * exempt as a class: it is the mock file's browser tab, and no phone surface
 * draws it. Styles, scripts and SVG paths carry no words a person reads.
 */
function extractStrings(source) {
  const found = [];
  let text = source.replace(/<!--[\s\S]*?-->/g, ' ');
  const title = /<title>([\s\S]*?)<\/title>/i.exec(text);
  if (title !== null) found.push({ kind: 'page-title', text: tidy(title[1]) });
  text = text
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<head\b[\s\S]*?<\/head>/gi, ' ');
  for (const attr of SPOKEN_ATTRS) {
    const re = new RegExp(`\\s${attr}="([^"]*)"`, 'gi');
    for (const hit of text.matchAll(re)) {
      const value = tidy(hit[1]);
      if (value !== '') found.push({ kind: attr, text: value });
    }
  }
  const lines = text.replace(BLOCK_RE, '\n').replace(/<[^>]*>/g, '');
  for (const piece of lines.split('\n')) {
    const value = tidy(piece);
    if (value !== '') found.push({ kind: 'text', text: value });
  }
  return found;
}

// ---------------------------------------------------------------------------
// The ledger
//
// Ordered: the first rule whose `is` or `when` matches a segment judges it, so
// the specific rules come before the general ones. Every rule carries `why`,
// because a rule with no reason is how an exception list becomes a permanent
// excuse.
// ---------------------------------------------------------------------------

/** A word Tortie says. `needle` must be in `module`; `draws` must be in the segment. */
const owned = (fields) => ({ verdict: 'owned', ...fields });
/** Not copy. */
const data = (fields) => ({ verdict: 'data', ...fields });
/** Copy no module owns yet, with the phase that owes it. */
const owed = (fields) => ({ verdict: 'owed', ...fields });

/**
 * RE-POINTED IN PHASE 316.1, both of them, because the words MOVED and were not
 * copied. `statusVisual`'s table left `src/renderer/app/status.ts` for
 * `src/shared/status-words.ts` so main can answer the phone every session's
 * word and its raised title; Catch Me Up's copy left
 * `src/renderer/overview/copy.ts` for `src/shared/overview-copy.ts` so main can
 * say a turn's absence sentence and the remote note. Every needle below is
 * byte for byte what it was; only the module that owns it moved, so a rule
 * still fails the day its word changes.
 */
const STATUS = 'src/shared/status-words.ts';
const OVERVIEW_COPY = 'src/shared/overview-copy.ts';
const MANAGER_COPY = 'src/renderer/session-manager/copy.ts';
const REGISTRY = 'src/main/agents/registry.ts';
/**
 * THE PHONE'S OWN WORDS (Phase 316.2). The iPhone app draws every word the door
 * does not send from one Swift file, and each word there says who owns it on
 * the line above it. The mock's pairing rows and its second list header are the
 * phone's words, so they are OWNED by that file now rather than owed; and the
 * file's `/// Mac:` lines are judged below against the Mac modules they quote,
 * byte for byte, so the phone cannot drift from the Mac without this gate
 * saying so (build/p316/SPEC.md §4.0 "Words", §2 row 31).
 */
const PHONE_COPY = 'ios/Tortie/Style/Copy.swift';

const LEDGER = [
  // -------------------------------------------------------------------------
  // Words Tortie already says
  // -------------------------------------------------------------------------
  owned({
    is: 'Sessions',
    module: MANAGER_COPY,
    needle: "SHEET_TITLE = 'Sessions'",
    draws: 'Sessions',
    why: "the phone's nav title is the session manager sheet's own title"
  }),
  // PHASE 312 LANDED THIS ONE. It was written here as OWED by Phase 312 while the
  // two phases were built in parallel, and the gate's own instruction — "move the
  // rule to the owned table and name the module" — is what this is. The words are
  // the mock's own, which is why the phone and the desktop have one spelling.
  owned({
    is: 'Answer this in the session.',
    module: 'src/renderer/choice.ts',
    needle: "CHOICE_NOT_PRESSABLE = 'Answer this in the session.'",
    draws: 'Answer this in the session.',
    why: 'why the numbered choices are drawn unpressable until the operator rules'
  }),
  // PHASE 316.2 LANDED THESE. They were owed by Phase 313 (the pairing screen)
  // and Phase 316 (the second header) while no app existed; the app's
  // Style/Copy.swift owns them now, one `static let` each.
  owned({
    is: 'Everything else (9)',
    module: PHONE_COPY,
    needle: 'static let everythingElseLead = "Everything else ("',
    draws: 'Everything else (',
    why: "the second section header on the phone's list, every session that is not waiting (his ruling of 2026-09-22); ⌘J draws only the blocked section"
  }),
  owned({
    is: 'Pair with your Mac',
    module: PHONE_COPY,
    needle: 'static let pairTitle = "Pair with your Mac"',
    draws: 'Pair with your Mac',
    why: "the pairing screen's title"
  }),
  owned({
    // The approved mock said "press Pair a phone", which is the Mac's group
    // HEADING and cannot be pressed; the button under it is "Pair" (316.1 as
    // built, concern 8). The mock's line was corrected to the phone's in 316.2.
    is: 'In Tortie on your Mac, open Settings then Phone and press Pair.',
    module: PHONE_COPY,
    needle: 'static let pairStepOnMac = "In Tortie on your Mac, open Settings then Phone and press Pair."',
    draws: 'In Tortie on your Mac, open Settings then Phone and press Pair.',
    why: 'the first step of pairing; its three nouns are the Mac\'s own, pinned by the `/// Names:` lines above it in Copy.swift'
  }),
  owned({
    is: 'Point this at the QR code in Tortie on your Mac.',
    module: PHONE_COPY,
    needle: 'static let pairStepScan = "Point this at the QR code in Tortie on your Mac."',
    draws: 'Point this at the QR code in Tortie on your Mac.',
    why: 'the second step of pairing'
  }),
  owned({
    is: 'Check this matches your Mac',
    module: PHONE_COPY,
    needle: 'static let pairMatchLabel = "Check this matches your Mac"',
    draws: 'Check this matches your Mac',
    why: "research 127 §7 item 18's fingerprint match, which binds a pairing to a key rather than a name"
  }),
  owned({
    is: 'Your Mac will ask you to allow this iPhone. Nothing is paired until you do.',
    module: PHONE_COPY,
    needle: 'static let pairMatchNote = "Your Mac will ask you to allow this iPhone. Nothing is paired until you do."',
    draws: 'Your Mac will ask you to allow this iPhone. Nothing is paired until you do.',
    why: 'the promise that a human confirms every pairing on the Mac'
  }),
  owned({
    is: 'Needs your input (3)',
    module: 'src/renderer/app/AttentionOverlay.tsx',
    needle: 'Needs your input (',
    draws: 'Needs your input (',
    why: "the blocked list's header, from ⌘J, with the count in it"
  }),
  owned({
    is: 'Needs input',
    module: STATUS,
    needle: "label: 'needs input'",
    draws: 'needs input',
    sentenceCase: true,
    why: 'statusVisual’s word for a blocked session, capitalised because it starts a line on the phone'
  }),
  // PHASE 314 LANDED THIS ONE. It was owed by Phase 314 as the push's own first
  // line, and the push now composes it: a session's name, one space, and main's
  // status word. The needle is the single title's template literal exactly,
  // backticks included, so this rule fails the day the composition changes.
  owned({
    when: /^[a-z0-9-]+ needs input$/,
    module: 'src/main/push/alert.ts',
    needle: '`${row.name} ${row.statusLabel}`',
    draws: ' needs input',
    why: "the push's single alert title (build/p314/SPEC.md §2.3): the session's own name and statusVisual's word, which is the only word a blocked row can have"
  }),
  owned({
    is: 'Working',
    module: STATUS,
    needle: "label: 'working'",
    draws: 'working',
    sentenceCase: true,
    why: 'statusVisual’s word for a running session'
  }),
  owned({
    is: 'Idle',
    module: STATUS,
    needle: "label: 'idle'",
    draws: 'idle',
    sentenceCase: true,
    why: 'statusVisual’s word for an idle session'
  }),
  owned({
    is: 'Saved',
    module: STATUS,
    needle: "label: 'saved'",
    draws: 'saved',
    sentenceCase: true,
    why: 'statusVisual’s word for a restorable session on this Mac'
  }),
  owned({
    is: 'Unreachable',
    module: STATUS,
    needle: "label: 'unreachable'",
    draws: 'unreachable',
    sentenceCase: true,
    why: 'statusVisual’s word for a session Tortie cannot see'
  }),
  owned({
    when: /^Failed \(exit \d+\)$/,
    module: STATUS,
    needle: 'failed (exit ',
    draws: 'failed (exit ',
    sentenceCase: true,
    why: 'statusVisual’s exit-code truth; the code itself is the session’s own'
  }),
  owned({
    is: 'The agent is waiting for you.',
    module: OVERVIEW_COPY,
    needle: "OUTCOME_WAITING = 'The agent is waiting for you.'",
    draws: 'The agent is waiting for you.',
    why: "Phase 311's needs_input arm of the Catch Me Up line"
  }),
  owned({
    when: /^you asked “.*”$/,
    module: OVERVIEW_COPY,
    needle: "YOU_ASKED_LEAD = 'you asked '",
    draws: 'you asked ',
    why: 'the lead of the project line, with the quotes ProjectLines draws'
  }),
  owned({
    is: 'Messages',
    module: MANAGER_COPY,
    needle: "messages: 'Messages'",
    draws: 'Messages',
    why: "the session manager's Messages cell"
  }),
  owned({
    is: 'Last message',
    module: MANAGER_COPY,
    needle: "lastMessage: 'Last message'",
    draws: 'Last message',
    why: "the session manager's Last message cell"
  }),
  owned({
    when: /^\d+ you$/,
    module: MANAGER_COPY,
    needle: ' you · ',
    draws: ' you',
    why: "the Messages cell's small line; the count is the store's"
  }),
  owned({
    when: /^\d+ agent$/,
    module: MANAGER_COPY,
    needle: ' agent`',
    draws: ' agent',
    why: "the Messages cell's small line; the count is the store's"
  }),
  owned({
    is: 'Your prompt',
    module: MANAGER_COPY,
    needle: "YOUR_PROMPT_WORD = 'Your prompt'",
    draws: 'Your prompt',
    why: "the label over the person's own message"
  }),
  owned({
    is: 'The agent',
    module: OVERVIEW_COPY,
    needle: "AGENT_LABEL = 'the agent'",
    draws: 'the agent',
    sentenceCase: true,
    why: 'the label over an answer; the agent is never a pronoun'
  }),
  owned({
    is: 'You',
    module: OVERVIEW_COPY,
    needle: "YOU_LABEL = 'you'",
    draws: 'you',
    sentenceCase: true,
    why: 'the label over an ask; the person is always "you"'
  }),
  owned({
    when: /^read \d{1,2}:\d{2}(?: [AP]M)?$/,
    module: OVERVIEW_COPY,
    needle: 'return `read ${clock}`',
    draws: 'read ',
    why: "the page's own read time. The WORD is Tortie's and is pinned; the digits are a formatter's output and the phone's formatter is the device's, which is why the clock itself is not compared"
  }),
  owned({
    is: 'Claude Code',
    module: REGISTRY,
    needle: "displayName: 'Claude Code'",
    draws: 'Claude Code',
    why: "the agent's name, from the registry row that owns it"
  }),
  owned({
    is: 'Codex CLI',
    module: REGISTRY,
    needle: "displayName: 'Codex CLI'",
    draws: 'Codex CLI',
    why: "the agent's name, from the registry row that owns it"
  }),
  owned({
    is: 'Grok',
    module: REGISTRY,
    needle: "displayName: 'Grok'",
    draws: 'Grok',
    why: "the agent's name, from the registry row that owns it. The registry says Grok and not Grok CLI, and a mock that says the longer name is inventing one"
  }),
  owned({
    when: /^End ‘.+’\?$|^End '.+'\?$/,
    module: 'src/renderer/state/resume.ts',
    needle: "title: `End '${session.name}'?`",
    draws: "End '",
    why: "endSessionConfirm's shipped title, which the End sheet mirrors"
  }),
  owned({
    is: 'Cancel',
    module: 'src/renderer/app/ConfirmDialog.tsx',
    needle: 'Cancel',
    draws: 'Cancel',
    why: 'the confirm dialog this sheet mirrors draws exactly this word'
  }),
  owned({
    is: 'Settings',
    module: 'src/main/settings/window.ts',
    needle: "title: 'Settings'",
    draws: 'Settings',
    why: "the Settings window's own title, spoken by the gear button"
  }),
  owned({
    is: 'Tortie',
    module: 'package.json',
    needle: '"productName": "Tortie"',
    draws: 'Tortie',
    why: "the product's name, from the one place the bundle takes it"
  }),

  // -------------------------------------------------------------------------
  // Not copy
  // -------------------------------------------------------------------------
  data({
    when: /^(?:now|\d+[smhd])$/,
    why: "formatAge's own output, which is an elapsed time and not a word"
  }),
  data({
    when: /^\d+[smhd] ago$/,
    why: 'an age on a notification, which iOS draws itself'
  }),
  data({
    when: /^\d{1,2}:\d{2}$/,
    why: "the iOS lock screen's clock, drawn by the system"
  }),
  data({
    is: 'Monday 21 September',
    why: "the iOS lock screen's date, drawn by the system"
  }),
  data({
    when: /^(?:[a-z]|⇧|⌫|123|space|return)$/,
    why: 'a key on the iOS keyboard, drawn by the system'
  }),
  data({
    is: 'Mac Pro',
    why: "a machine's label, which is whatever the person typed in Settings"
  }),
  data({
    when: /^\d+$/,
    why: "a count from the store, under the integer rule's data-quoted span"
  }),
  data({
    when: /^[0-9A-Z]{4}$/,
    why: "a group of the pairing fingerprint, which is a key's digest"
  }),
  data({
    when: /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/,
    why: "a session's name or a project folder's name, which are the person's own words"
  }),
  // THE MOCK'S THREE ILLUSTRATIONS OF A QUESTION, each declared by its EXACT
  // words rather than by a shape. The fix round is why: the rule used to be
  // `/^(?:Edit|Run|Apply patch to) .+\?$/`, and a verifier changed the mock's
  // `Run rm -rf build?` to `Run make install and then deploy?` — a sentence no
  // payload can produce — and this gate passed it. A shape rule over the one
  // string class this gate exists for is not a rule. Declared one by one, a
  // FOURTH question the mock invents now fails by name, which is the whole
  // mechanism, and each of these three must still match something or the run
  // fails on the unmatched rule.
  //
  // The reason they are `data` and not `owned`: Phase 311's leaf composes the
  // tool's name and the one telling value of its input and writes no sentence of
  // its own, so it says `Bash rm -rf build`, `Edit src/auth/session.ts` and
  // `MultiEdit a.ts` — a different verb, no question mark, and no count of files
  // that any telling key can give. The three below are the design's wording and
  // no module owns them. A phase that wants `Run …?` on a real row writes a verb
  // map, owns these strings here, and amends the mock or the leaf so the two
  // agree; until then the gate declares the gap instead of hiding it.
  data({
    is: 'Edit src/auth/session.ts?',
    why: "the mock's illustration of a question. The leaf composes `Edit src/auth/session.ts` — the tool's own name and its file path, with no question mark"
  }),
  data({
    is: 'Apply patch to 4 files?',
    why: "the mock's illustration of a question, and the one shape that is NOT producible at all: no telling key gives a count of files, and `MultiEdit` composes the first path instead"
  }),
  data({
    is: 'Run rm -rf build?',
    why: "the mock's illustration of a question. The leaf composes `Bash rm -rf build` — the tool's own name, which is `Bash` and never `Run`"
  }),
  data({
    when: /^\d+(?:Yes|No)\b/,
    why: "a numbered choice the agent's own screen drew, read back by the detector"
  }),
  data({
    is: "I can set httpOnly and sameSite: 'lax' on the session cookie. That touches the login handler and the two tests that read the raw header — shall I edit them too?",
    why: "the agent's own answer, from the store, redacted and clipped there"
  }),
  data({
    is: 'yes, edit the tests too — keep the assertions but read the parsed cookie',
    why: "the person's own message, typed into the composer"
  }),
  data({
    is: 'and run the suite when you are done',
    why: "the person's own message, mid-typing"
  }),
  data({
    when: /^Actions for .+$/,
    why: "an accessible name built from a session's own name; the noun is iOS's own word for a row menu"
  }),

  // -------------------------------------------------------------------------
  // Copy no module owns yet. Each names the phase that owes it. THESE ARE
  // PRINTED AND COUNTED, and one whose words the tree has since grown fails.
  // -------------------------------------------------------------------------
  owed({
    is: 'Select',
    phase: 'Phase 317',
    why: 'the multi-select affordance for End these; no Tortie surface has the word today'
  }),
  // RE-POINTED IN PHASE 316.2 (build/p316/SPEC.md §2 row 31, §7). The message
  // box stays the approved design for the reply door, so its four rows are owed
  // there; the ssh hand-off is removed from the product and owed to nobody; and
  // "Open in Claude" waits for the phase that first measures where the Remote
  // Control URL is recorded.
  owed({
    is: 'Send',
    phase: 'Phase 318',
    why: "the composer's press. The reply door is Phase 318 and nothing ships this word yet"
  }),
  owed({
    is: 'Message this session',
    phase: 'Phase 318',
    why: "the composer's placeholder and its label"
  }),
  owed({
    is: 'Goes to this session as one message.',
    phase: 'Phase 318',
    why: 'the sentence under the composer that says the reply is one message rather than keystrokes'
  }),
  owed({
    is: 'Sending…',
    phase: 'Phase 318',
    why: "the composer's in-flight word"
  }),
  owed({
    is: 'Open in Terminal',
    phase: 'no phase: removed by Phase 316 (build/p316/SPEC.md §7)',
    why: "the ssh hand-off's press, research 127 §4. The app's tailnet node is private to the app and the grant allows only the door's port, so an ssh link could reach nothing. The approved Session.html still draws it until the screen is redrawn"
  }),
  owed({
    is: 'Open in Claude',
    phase: 'the phase that first measures where the Remote Control URL is recorded',
    why: "the Remote Control hand-off's press, research 127 §4. No module in src/ has the URL, and the door answers `handoff: null` (build/p316/SPEC.md §2 row 20)"
  }),
  owed({
    is: 'End with Face ID',
    phase: 'Phase 317',
    why: 'the one write verb in v1, behind local authentication'
  }),
  owed({
    is: 'The agent stops. Its saved output stays.',
    phase: 'Phase 317',
    why: "the End sheet's body on a phone. The desktop's body names the scrollback and restoring, which is longer than a sheet gives"
  }),
  owed({
    is: 'What the phone will not do',
    phase: 'Phase 317',
    why: 'the refusals card on the End screen'
  }),
  owed({
    is: 'No Restore — it would relaunch an agent with its safeguards off while nobody is watching.',
    phase: 'Phase 317',
    why: "research 127 §7 item 15's refusal, drawn for the person"
  }),
  owed({
    is: 'No Remove — it deletes saved output.',
    phase: 'Phase 317',
    why: "research 127 §7 item 15's second refusal"
  }),
  owed({ is: 'No Restart.', phase: 'Phase 317', why: 'the third refusal' }),
  owed({
    is: 'The last line is only there when the question can be decrypted on this phone. Without it the card stops after the project and the agent — never filler.',
    phase: 'the Notification Service Extension’s later entry',
    why: "the mock's own note about the push, drawn on the lock screen sheet rather than in a caption. Phase 314 REFUSED the question line — a native alert is JSON Apple reads — so the decrypting extension that would add it is later Swift and its own entry, and this note is owed there rather than to 314"
  }),
  owed({
    is: 'Tortie brings its own private network. There is nothing else to install.',
    phase: 'Phase 316.3',
    why: 'the embedded tailnet node. It is false until 316.3 carries the node inside the app, so 316.2 does not draw it'
  }),
  owed({
    is: 'Enter a code instead',
    phase: 'a later phase (build/p316/SPEC.md §7)',
    why: 'the pairing fallback when a camera cannot read the code. The payload is several hundred characters and no short-code design exists'
  })
];

/** The shortest owed string whose absence from the tree is asserted. */
const OWED_ABSENCE_FLOOR = 16;

/**
 * The fewest `owned` rules that must match something. A ledger whose owned
 * rules were quietly moved to `data` would still pass every other check, so the
 * floor is what keeps this gate a comparison rather than a census. A deliberate
 * removal lowers it in the same commit and names the rule.
 */
const OWNED_RULE_FLOOR = 33;

// ---------------------------------------------------------------------------
// Judgement
// ---------------------------------------------------------------------------

function sentenceCased(text) {
  return text.length === 0 ? text : text[0].toUpperCase() + text.slice(1);
}

function ruleMatches(rule, segment) {
  if (rule.is !== undefined) return rule.is === segment;
  return rule.when.test(segment);
}

function ruleName(rule) {
  return rule.is !== undefined ? JSON.stringify(rule.is) : String(rule.when);
}

/**
 * The nearest word Tortie owns, for a segment no rule covers.
 *
 * A near miss is the common shape of drift — a longer name for an agent, a word
 * added to a header — and naming the neighbour turns "undeclared" into the
 * actual fix. Silence when nothing is near, rather than a guess.
 */
function nearestOwned(segment) {
  for (const rule of LEDGER) {
    if (rule.verdict !== 'owned') continue;
    const wanted =
      rule.sentenceCase === true ? sentenceCased(rule.draws) : rule.draws;
    if (wanted.length < 4) continue;
    if (segment.includes(wanted) || wanted.includes(segment)) {
      return ` The nearest word Tortie owns is ${JSON.stringify(wanted)}, in ${rule.module}.`;
    }
  }
  return '';
}

/** Every module the ledger names, read once. */
function readModules(ledger) {
  const out = new Map();
  for (const rule of ledger) {
    if (rule.verdict !== 'owned' || out.has(rule.module)) continue;
    out.set(rule.module, readFileSync(join(ROOT, rule.module), 'utf8'));
  }
  return out;
}

/** Everything under src/ that is not a test, joined once, for the owed check. */
function readProductionSources() {
  const parts = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__tests__') continue;
        walk(path);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) {
        continue;
      }
      parts.push(readFileSync(path, 'utf8'));
    }
  };
  walk(join(ROOT, 'src'));
  return parts.join('\n');
}

/**
 * Judge one set of screens. `screens` is a Map of file name to source, so a
 * self-test can judge a mutation without writing a file.
 */
function judge(screens, modules, production) {
  const findings = [];
  const matchedRules = new Set();
  const owedSeen = [];
  let segments = 0;

  for (const [name, source] of screens) {
    for (const { kind, text } of extractStrings(source)) {
      if (kind === 'page-title') continue;
      for (const segment of text.split(SEPARATOR)) {
        const trimmed = segment.trim();
        if (trimmed === '') continue;
        segments += 1;
        const rule = LEDGER.find((r) => ruleMatches(r, trimmed));
        if (rule === undefined) {
          findings.push({
            file: name,
            text: trimmed,
            why:
              'no ledger rule covers this string. Either Tortie owns the words, ' +
              'and the rule names the module, or it does not, and the mock may ' +
              `not say it.${nearestOwned(trimmed)}`
          });
          continue;
        }
        matchedRules.add(rule);
        if (rule.verdict === 'owned') {
          const wanted = rule.sentenceCase === true
            ? sentenceCased(rule.draws)
            : rule.draws;
          const module = modules.get(rule.module) ?? '';
          if (!module.includes(rule.needle)) {
            findings.push({
              file: rule.module,
              text: rule.needle,
              why: `the module no longer holds this literal, so ${ruleName(rule)} names an owner that does not own it any more`
            });
          }
          if (!trimmed.includes(wanted)) {
            findings.push({
              file: name,
              text: trimmed,
              why: `drifted from ${rule.module}, which says ${JSON.stringify(wanted)}`
            });
          }
        } else if (rule.verdict === 'owed') {
          owedSeen.push({ file: name, text: trimmed, rule });
          if (
            trimmed.length >= OWED_ABSENCE_FLOOR &&
            production.includes(trimmed)
          ) {
            findings.push({
              file: name,
              text: trimmed,
              why: `declared as owed by ${rule.phase}, but the tree says it now. Move the rule to the owned table and name the module`
            });
          }
        }
      }
    }
  }
  return { findings, matchedRules, owedSeen, segments };
}

// ---------------------------------------------------------------------------
// The contact sheet's exemption, paid for
// ---------------------------------------------------------------------------

function checkContactSheet(names, sheet) {
  const findings = [];
  const framed = new Set(
    [...sheet.matchAll(/<iframe\b[^>]*\bsrc="([^"]+)"/gi)].map((m) => m[1])
  );
  for (const name of names) {
    if (!framed.has(name)) {
      findings.push({
        file: CONTACT_SHEET,
        text: name,
        why: 'the contact sheet is exempt because it only FRAMES the screens, and this screen is not framed in it'
      });
    }
  }
  // A sheet that drew a phone frame of its own would be a screen, and its prose
  // would then be product copy nobody judged.
  const body = sheet.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, ' ');
  if (/\b(?:390px|844px)\b/.test(body.replace(/<style[\s\S]*?<\/style>/gi, ' '))) {
    findings.push({
      file: CONTACT_SHEET,
      text: 'a phone-sized frame outside an iframe',
      why: 'the sheet may only frame the screens; a frame of its own makes its prose product copy'
    });
  }
  return findings;
}

// ---------------------------------------------------------------------------
// The phone's own words, read from Style/Copy.swift (Phase 316.2)
// ---------------------------------------------------------------------------

/**
 * Copy.swift's shape, as its header states it: every string literal is the
 * whole right side of a one line `static let`, and the doc comment directly
 * above it says who owns the word, exactly once:
 *
 *   /// Mac: <file> ⟦<needle>⟧     the Mac already says it; <needle> is copied
 *                                  from <file> byte for byte and the value is
 *                                  the Mac's word inside it, unchanged
 *   /// Phone: <why>                no Mac surface draws it; the reason is the
 *                                  ledger entry
 *   /// Names: <file> ⟦<needle>⟧   (beside a Phone line) a Mac control the line
 *                                  names; the word <needle> quotes must be in
 *                                  the line, so a renamed button cannot leave
 *                                  the phone giving directions to a word gone
 *
 * The same rules ios/TortieTests/CopyTests.swift holds under XCTest, read here
 * as text in plain node, so a machine with no Xcode still judges the phone's
 * words on every run of this gate. Pure over its inputs so the self-test can
 * mutate the file and the modules in memory.
 */
const PHONE_MAC_FLOOR = 30;
const PHONE_NAMES_FLOOR = 3;

/** `src/x.ts ⟦text⟧` to [path, text], or null. */
function pathAndNeedle(body) {
  const t = body.trim();
  const open = t.indexOf(' ⟦');
  if (open === -1 || !t.endsWith('⟧')) return null;
  const path = t.slice(0, open);
  const needle = t.slice(open + 2, -1);
  if (path === '' || path.includes(' ') || needle === '') return null;
  return [path, needle];
}

/** The word a needle quotes: `BTN_PAIR = 'Pair'` quotes `Pair`. */
function quotedWord(needle) {
  const first = needle.indexOf("'");
  if (first === -1) return null;
  const second = needle.indexOf("'", first + 1);
  if (second === -1) return null;
  const word = needle.slice(first + 1, second);
  return word === '' ? null : word;
}

/**
 * Whether the phone's word is the Mac's word inside `needle`, unchanged. A
 * needle that quotes a word owns exactly that word, less a full stop or space
 * the Mac composes after it; a needle that quotes nothing must hold the word
 * with no letter or digit touching either end, so a word cut short is refused.
 */
function macWordHolds(literal, needle) {
  const word = quotedWord(needle);
  if (word !== null) {
    if (literal === word) return true;
    const trimmed = word.replace(/[. ]+$/u, '');
    return trimmed !== '' && literal === trimmed;
  }
  const touches = (ch) => ch !== undefined && /[\p{L}\p{N}]/u.test(ch);
  let from = 0;
  for (;;) {
    const at = needle.indexOf(literal, from);
    if (at === -1) return false;
    if (!touches(needle[at - 1]) && !touches(needle[at + literal.length])) return true;
    from = at + 1;
  }
}

/** Parse Copy.swift into its words and the problems with its shape. */
function copySwiftEntries(swift) {
  const entries = [];
  const problems = [];
  let block = [];
  swift.split('\n').forEach((raw, k) => {
    const n = k + 1;
    const line = raw.trim();
    if (line.startsWith('///')) {
      block.push(line);
      return;
    }
    const doc = block;
    block = [];
    if (line.startsWith('//') || !line.includes('"')) return;
    const m = /^static let ([A-Za-z0-9]+) = "(.*)"$/u.exec(line);
    if (m === null) {
      problems.push(`line ${String(n)}: a string literal outside a one line static let`);
      return;
    }
    const [, name, literal] = m;
    if (literal.includes('\\') || literal.includes('"')) problems.push(`line ${String(n)}: ${name} escapes or interpolates`);
    let owner = null;
    let owners = 0;
    const names = [];
    for (const d of doc) {
      const body = d.slice(3).trim();
      if (body.startsWith('Mac:')) {
        owners += 1;
        const pn = pathAndNeedle(body.slice(4));
        if (pn === null) problems.push(`line ${String(n)}: ${name} has a Mac line with no ⟦text⟧`);
        else owner = { kind: 'mac', path: pn[0], needle: pn[1] };
      } else if (body.startsWith('Phone:')) {
        owners += 1;
        const reason = body.slice(6).trim();
        if (reason === '') problems.push(`line ${String(n)}: ${name} is the phone's with no reason`);
        owner = { kind: 'phone', reason };
      } else if (body.startsWith('Names:')) {
        const pn = pathAndNeedle(body.slice(6));
        if (pn === null) problems.push(`line ${String(n)}: ${name} has a Names line with no ⟦text⟧`);
        else names.push({ path: pn[0], needle: pn[1] });
      }
    }
    if (owners !== 1) problems.push(`line ${String(n)}: ${name} says who owns it ${String(owners)} times, not once`);
    entries.push({ name, literal, owner, names, line: n });
  });
  return { entries, problems };
}

/**
 * Judge Copy.swift. `readModule(path)` answers a module's text or null, so the
 * self-test can hand it a module that moved on.
 */
function judgeCopySwift(swift, readModule) {
  const findings = [];
  const { entries, problems } = copySwiftEntries(swift);
  for (const p of problems) findings.push({ file: PHONE_COPY, text: p, why: 'Copy.swift is not written the way its header says, so its words cannot be judged' });
  const seen = new Map();
  let mac = 0;
  let phone = 0;
  let named = 0;
  for (const e of entries) {
    if (seen.has(e.literal)) {
      findings.push({ file: PHONE_COPY, text: e.name, why: `repeats the word ${seen.get(e.literal)} already declares; a word is declared once, next to its owner` });
    }
    seen.set(e.literal, e.name);
    if (e.owner?.kind === 'mac') {
      mac += 1;
      const module = readModule(e.owner.path);
      if (module === null || !module.includes(e.owner.needle)) {
        findings.push({ file: e.owner.path, text: e.owner.needle, why: `${PHONE_COPY}'s ${e.name} quotes this, and the module no longer says it` });
      } else if (!macWordHolds(e.literal, e.owner.needle)) {
        findings.push({ file: PHONE_COPY, text: e.literal, why: `${e.name} is not the Mac's word inside ⟦${e.owner.needle}⟧ unchanged` });
      }
    } else if (e.owner?.kind === 'phone') {
      phone += 1;
    }
    for (const nm of e.names) {
      named += 1;
      const module = readModule(nm.path);
      const word = quotedWord(nm.needle);
      if (module === null || !module.includes(nm.needle)) {
        findings.push({ file: nm.path, text: nm.needle, why: `${PHONE_COPY}'s ${e.name} names this Mac control, and the module no longer says it` });
      } else if (word === null || !e.literal.includes(word)) {
        findings.push({ file: PHONE_COPY, text: e.literal, why: `${e.name} names ⟦${nm.needle}⟧ and does not say ${JSON.stringify(word)}` });
      }
    }
  }
  if (mac < PHONE_MAC_FLOOR) findings.push({ file: PHONE_COPY, text: `${String(mac)} Mac words`, why: `fewer than ${String(PHONE_MAC_FLOOR)} of the phone's words were judged against the Mac, so the reader has stopped reading` });
  if (named < PHONE_NAMES_FLOOR) findings.push({ file: PHONE_COPY, text: `${String(named)} named controls`, why: `fewer than ${String(PHONE_NAMES_FLOOR)} Mac controls named by a phone line were checked` });
  return { findings, mac, phone, named, words: entries.length };
}

/** The mutations that prove the Copy.swift judgement can fail. */
const PHONE_MUTATIONS = [
  {
    what: 'a Mac word re-typed on the phone',
    swift: (t) => t.replace('static let sessions = "Sessions"', 'static let sessions = "Session"'),
    module: null
  },
  {
    what: 'the Mac renames the word the phone copied',
    swift: (t) => t,
    module: ['src/renderer/session-manager/copy.ts', (t) => t.replace("SHEET_TITLE = 'Sessions'", "SHEET_TITLE = 'All sessions'")]
  },
  {
    what: 'a word whose owner line is gone',
    swift: (t) => t.replace('    /// Phone: the press that goes back to pairing.\n', ''),
    module: null
  },
  {
    what: 'the Mac renames the button a phone line sends a person to',
    swift: (t) => t,
    module: ['src/renderer/settings/PhoneSection.tsx', (t) => t.replace("BTN_PAIR = 'Pair'", "BTN_PAIR = 'Pair a phone'")]
  },
  {
    what: 'a phone line that stops naming the Mac control it points at',
    swift: (t) => t.replace('Phone and press Pair."', 'Phone and press Go."'),
    module: null
  },
  {
    what: 'a word declared twice',
    swift: (t) => t.replace('static let pairAgain = "Pair again"', 'static let pairAgain = "Try again"'),
    module: null
  }
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

function loadScreens() {
  const names = readdirSync(MOCK_DIR)
    .filter((n) => n.endsWith('.html'))
    .sort();
  const screens = new Map();
  for (const name of names) {
    if (name === CONTACT_SHEET) continue;
    screens.set(name, readFileSync(join(MOCK_DIR, name), 'utf8'));
  }
  return { names, screens };
}

/**
 * The mutations that prove one character of drift fails. Each returns a new
 * screen map and the string whose finding must name it.
 */
const MUTATIONS = [
  {
    what: 'a curly quote straightened',
    apply(screens) {
      const next = new Map(screens);
      next.set(
        'Session.html',
        (next.get('Session.html') ?? '')
          .replace(/“/g, '"')
          .replace(/”/g, '"')
      );
      return next;
    },
    names: 'you asked "make the session cookie httpOnly and…"'
  },
  {
    what: 'one letter dropped from an owned header',
    apply(screens) {
      const next = new Map(screens);
      next.set(
        'Main.html',
        (next.get('Main.html') ?? '').replace(
          'Needs your input (3)',
          'Needs your inpt (3)'
        )
      );
      return next;
    },
    names: 'Needs your inpt (3)'
  },
  {
    what: 'a status word swapped for a synonym',
    apply(screens) {
      const next = new Map(screens);
      next.set(
        'Main.html',
        (next.get('Main.html') ?? '').replace('Unreachable', 'Offline')
      );
      return next;
    },
    names: 'Offline'
  },
  {
    what: 'an undeclared sentence added',
    apply(screens) {
      const next = new Map(screens);
      next.set(
        'Main.html',
        (next.get('Main.html') ?? '').replace(
          '</body>',
          '<div>Approve this change</div></body>'
        )
      );
      return next;
    },
    names: 'Approve this change'
  },
  {
    what: 'an agent name the registry does not carry',
    apply(screens) {
      const next = new Map(screens);
      next.set(
        'End.html',
        (next.get('End.html') ?? '').replace('Claude Code', 'Claude Coder')
      );
      return next;
    },
    names: 'Claude Coder'
  },
  {
    // THE FIX ROUND'S ARM. A question the mock invents is the one string class
    // this gate exists for, and the shape rule it used to carry passed one: a
    // verifier changed `Run rm -rf build?` to a sentence no payload can compose
    // and the gate exited 0. The three illustrations are declared by their exact
    // words now, so a fourth fails by name.
    what: 'a question shape Tortie cannot compose',
    apply(screens) {
      const next = new Map(screens);
      next.set(
        'Main.html',
        (next.get('Main.html') ?? '').replace(
          'Run rm -rf build?',
          'Run make install and then deploy?'
        )
      );
      return next;
    },
    names: 'Run make install and then deploy?'
  }
];

// ---------------------------------------------------------------------------
// Mechanism 6 of Phase 311 — NO LINE OF PAYLOAD IN ANY LOG, EVER
// ---------------------------------------------------------------------------

/**
 * The refusal, asserted as text rather than promised.
 *
 * src/main/activity/hooks.ts states the rule near its own top, and the reason
 * is that a hook payload carries the PERSON'S OWN PROMPT TEXT. Phase 311 hands
 * that body one module further on and composes a question out of it, so the
 * blast radius of a stray log line grew in exactly the domain the rule governs.
 * This is the assertion that keeps it: no file under src/main/activity/ may
 * name a log call whose arguments can reach the body, the composed question or
 * a screen capture, and ./question.ts may name no log call at all.
 *
 * It is DISCOVERED rather than listed. The two log calls that exist today are
 * hooks.ts's `log.info('usage.tap.not-installed', { reason })` and
 * `log.warn('usage.tap.dropped', { reason })`, both carrying a fixed word, and
 * a floor below asserts the finder still finds them — because a needle that
 * stops matching is how conformance:handback passed for 1,156 commits while the
 * thing it guarded was unguarded.
 *
 * WHAT THE RULE IS, exactly, so nobody reads it as more: the CALL SITES are
 * discovered by shape and the arguments are taken by matching brackets, but the
 * refusal itself is a NAMED SET OF WORDS. `log.info('x', { body })` fails and
 * `const b = body; log.info('x', { b })` does not, because a renamed binding
 * names none of the words. That limit is inherent to any text rule and it is why
 * this gate is the second line rather than the first: the first is that nothing
 * on the compose path calls a logger at all, which the leaf's own arm asserts by
 * refusing it every log call, honest or not.
 */
const ACTIVITY_DIR = join('src', 'main', 'activity');

/** A call on something that logs: `log.info(`, `console.error(`, `logLine(`. */
const LOG_CALL_RE =
  /(?:^|[^A-Za-z0-9_$.])((?:console|log|logger|getLog\(\))\s*\.\s*[A-Za-z]+|log|logLine|appLog|debugLog)\s*\(/g;

/**
 * The identifiers that can be, or can hold, a line of the person's own words.
 * Matched as whole words, so `bodyRef` counts and `somebody` does not.
 */
const PAYLOAD_WORDS = [
  'body',
  'payload',
  'question',
  'tool_input',
  'tool_name',
  'toolInput',
  'excerpt',
  'capture',
  'screen',
  'prompt'
];

/** The argument text of a call whose `(` is at `open`, by matching brackets. */
function callArgs(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return text.slice(open + 1, i);
    }
  }
  return text.slice(open + 1);
}

/** Comments blanked, so a rule is never satisfied or broken by prose. */
function withoutComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));
}

/**
 * Judge one map of activity sources. Taking a map rather than reading the disk
 * is what lets the self-test below ablate a file in memory and watch this go
 * red without ever writing one.
 */
function logRuleFindings(sources) {
  const findings = [];
  let callSites = 0;
  for (const [path, raw] of [...sources].sort()) {
    const text = withoutComments(raw);
    const isLeaf = path.endsWith(join('activity', 'question.ts'));
    LOG_CALL_RE.lastIndex = 0;
    let m;
    while ((m = LOG_CALL_RE.exec(text)) !== null) {
      callSites += 1;
      const open = text.indexOf('(', m.index + m[0].length - 1);
      const args = callArgs(text, open);
      const line = text.slice(0, m.index).split('\n').length;
      if (isLeaf) {
        findings.push({
          file: path,
          text: `${m[1] ?? 'log'}( at line ${String(line)}`,
          why: 'the question leaf may name NO log call at all. It is handed the person’s own prompt text and it is the one module whose whole job is to read it'
        });
        continue;
      }
      const reached = PAYLOAD_WORDS.filter((w) =>
        new RegExp(`(?:^|[^A-Za-z0-9_$])${w}(?![A-Za-z0-9_$])`).test(args)
      );
      if (reached.length > 0) {
        findings.push({
          file: path,
          text: `${m[1] ?? 'log'}( at line ${String(line)} names ${reached.join(', ')}`,
          why: 'a hook payload carries the person’s own prompt text, and src/main/activity/hooks.ts states that rule at the top of the file. A log call in this domain may not name the body, the question or a capture'
        });
      }
    }
  }
  return { findings, callSites };
}

/** Every production .ts under src/main/activity/, read once, keyed by path. */
function readActivitySources() {
  const out = new Map();
  const walk = (dir, rel) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name === '__tests__' || entry.name === 'fixtures') continue;
        walk(join(dir, entry.name), join(rel, entry.name));
        continue;
      }
      if (!entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts')) continue;
      out.set(join(rel, entry.name), readFileSync(join(dir, entry.name), 'utf8'));
    }
  };
  walk(join(ROOT, ACTIVITY_DIR), ACTIVITY_DIR);
  return out;
}

/**
 * The finder must still find something. Two call sites exist today and both are
 * honest; a change that legitimately removes one lowers this floor in the same
 * commit and names the file.
 */
const LOG_CALL_FLOOR = 2;

/** The ablations that prove the rule above is not decorative. */
const LOG_MUTATIONS = [
  {
    what: 'a log call in hooks.ts naming the body',
    apply(sources) {
      const next = new Map(sources);
      const path = join(ACTIVITY_DIR, 'hooks.ts');
      next.set(path, `${next.get(path) ?? ''}\nfunction p311Ablation(body) { log.info('x', { body }); }\n`);
      return next;
    }
  },
  {
    what: 'a log call in the question leaf, even one naming nothing',
    apply(sources) {
      const next = new Map(sources);
      const path = join(ACTIVITY_DIR, 'question.ts');
      next.set(path, `${next.get(path) ?? ''}\nfunction p311Ablation() { log.info('fixed-word'); }\n`);
      return next;
    }
  },
  {
    what: 'a log call naming the composed question',
    apply(sources) {
      const next = new Map(sources);
      const path = join(ACTIVITY_DIR, 'monitor.ts');
      next.set(path, `${next.get(path) ?? ''}\nfunction p311Ablation(question) { console.error('x', question); }\n`);
      return next;
    }
  },
  {
    // The CONTROL. An honest log call must stay green, or the rule is a ban on
    // logging rather than a ban on logging the person's words.
    control: true,
    what: 'an honest log call carrying a fixed reason word',
    apply(sources) {
      const next = new Map(sources);
      const path = join(ACTIVITY_DIR, 'hooks.ts');
      next.set(path, `${next.get(path) ?? ''}\nfunction p311Control(reason) { log.warn('usage.tap.dropped', { reason }); }\n`);
      return next;
    }
  }
];

function main() {
  const argv = process.argv.slice(2);
  const selfTest = argv.includes('--self-test');
  const quiet = argv.includes('--quiet');

  const { names, screens } = loadScreens();
  const modules = readModules(LEDGER);
  const production = readProductionSources();
  const sheet = readFileSync(join(MOCK_DIR, CONTACT_SHEET), 'utf8');

  const { findings, matchedRules, owedSeen, segments } = judge(
    screens,
    modules,
    production
  );
  findings.push(...checkContactSheet([...screens.keys()], sheet));

  // Every rule must earn its place: one that matches nothing is a rule about a
  // mock that has moved on, and it would go on passing forever.
  for (const rule of LEDGER) {
    if (!matchedRules.has(rule)) {
      findings.push({
        file: 'build/p311/copy-drift.mjs',
        text: ruleName(rule),
        why: 'this ledger rule matched no string the mock draws. Remove it or fix the mock it was written for'
      });
    }
  }

  const ownedMatched = [...matchedRules].filter(
    (r) => r.verdict === 'owned'
  ).length;
  if (ownedMatched < OWNED_RULE_FLOOR) {
    findings.push({
      file: 'build/p311/copy-drift.mjs',
      text: `${String(ownedMatched)} owned rules matched, floor is ${String(OWNED_RULE_FLOOR)}`,
      why: 'the ledger has stopped comparing the mock against Tortie. Lower the floor deliberately and name the rule'
    });
  }

  // The phone's own words (Phase 316.2).
  const phoneSwift = readFileSync(join(ROOT, PHONE_COPY), 'utf8');
  const moduleCache = new Map();
  const readModule = (path) => {
    if (!moduleCache.has(path)) {
      try {
        moduleCache.set(path, readFileSync(join(ROOT, path), 'utf8'));
      } catch {
        moduleCache.set(path, null);
      }
    }
    return moduleCache.get(path);
  };
  const phone = judgeCopySwift(phoneSwift, readModule);
  findings.push(...phone.findings);

  // Mechanism 6. It rides this script rather than a second one because the
  // entry says so: "the phase adds a rule to the copy gate below".
  const activity = readActivitySources();
  const logRule = logRuleFindings(activity);
  findings.push(...logRule.findings);
  if (logRule.callSites < LOG_CALL_FLOOR) {
    findings.push({
      file: 'build/p311/copy-drift.mjs',
      text: `${String(logRule.callSites)} log calls found under ${ACTIVITY_DIR}, floor is ${String(LOG_CALL_FLOOR)}`,
      why: 'the finder has stopped finding, so the rule is asserting nothing. Lower the floor deliberately and name the file whose log call went'
    });
  }

  if (!quiet) {
    console.log(
      `phonecopy: ${String(activity.size)} activity modules read, ` +
        `${String(logRule.callSites)} log calls found (floor ${String(LOG_CALL_FLOOR)}), ` +
        'none names a payload word'
    );
    console.log(
      `phonecopy: ${PHONE_COPY}: ${String(phone.words)} words, ${String(phone.mac)} judged against the Mac module that owns them (floor ${String(PHONE_MAC_FLOOR)}), ` +
        `${String(phone.phone)} the phone's own with a reason, ${String(phone.named)} Mac controls a phone line names (floor ${String(PHONE_NAMES_FLOOR)})`
    );
    console.log(
      `phonecopy: ${String(names.length - 1)} screens, ${String(segments)} segments, ` +
        `${String(ownedMatched)} owned rules matched (floor ${String(OWNED_RULE_FLOOR)}), ` +
        `${String(owedSeen.length)} drawn strings no module owns yet`
    );
    const byPhase = new Map();
    for (const row of owedSeen) {
      const list = byPhase.get(row.rule.phase) ?? [];
      list.push(row.text);
      byPhase.set(row.rule.phase, list);
    }
    for (const [phase, list] of [...byPhase].sort()) {
      console.log(`  owed by ${phase}:`);
      for (const text of [...new Set(list)].sort()) {
        console.log(`    ${JSON.stringify(text)}`);
      }
    }
  }

  let failed = findings.length > 0;
  for (const finding of findings) {
    console.error(
      `phonecopy FAIL ${finding.file}: ${JSON.stringify(finding.text)} — ${finding.why}`
    );
  }

  if (selfTest) {
    const base = new Set(findings.map((f) => `${f.file}\u0000${f.text}`));
    for (const mutation of MUTATIONS) {
      const mutated = judge(mutation.apply(screens), modules, production);
      const caught = mutated.findings.some((f) => f.text === mutation.names);
      const wasThere = [...base].some((k) => k.endsWith(`\u0000${mutation.names}`));
      if (!caught) {
        failed = true;
        console.error(
          `phonecopy SELF-TEST FAIL: ${mutation.what} produced no finding naming ${JSON.stringify(mutation.names)}`
        );
      } else if (wasThere) {
        failed = true;
        console.error(
          `phonecopy SELF-TEST FAIL: ${mutation.what} names a string the unmutated run already failed on, so it proves nothing`
        );
      } else if (!quiet) {
        console.log(`  self-test: ${mutation.what} → red, as it must be`);
      }
    }
    for (const mutation of PHONE_MUTATIONS) {
      const mutatedSwift = mutation.swift(phoneSwift);
      if (mutatedSwift === phoneSwift && mutation.module === null) {
        failed = true;
        console.error(`phonecopy SELF-TEST FAIL: ${mutation.what} changed nothing, so it proves nothing`);
        continue;
      }
      const reader = mutation.module === null
        ? readModule
        : (path) => (path === mutation.module[0] ? mutation.module[1](readModule(path) ?? '') : readModule(path));
      if (mutation.module !== null && reader(mutation.module[0]) === readModule(mutation.module[0])) {
        failed = true;
        console.error(`phonecopy SELF-TEST FAIL: ${mutation.what} changed nothing in ${mutation.module[0]}, so it proves nothing`);
        continue;
      }
      const red = judgeCopySwift(mutatedSwift, reader).findings.length > phone.findings.length;
      if (!red) {
        failed = true;
        console.error(`phonecopy SELF-TEST FAIL: ${mutation.what} produced no finding, so Copy.swift is not being judged`);
      } else if (!quiet) {
        console.log(`  self-test: ${mutation.what} → red, as it must be`);
      }
    }
    for (const mutation of LOG_MUTATIONS) {
      const red = logRuleFindings(mutation.apply(activity)).findings.length > 0;
      if (mutation.control === true) {
        if (red) {
          failed = true;
          console.error(
            `phonecopy SELF-TEST FAIL: the control, ${mutation.what}, went red — the rule bans logging rather than banning the person's words`
          );
        } else if (!quiet) {
          console.log(`  self-test: ${mutation.what} → green, as it must be`);
        }
        continue;
      }
      if (!red) {
        failed = true;
        console.error(
          `phonecopy SELF-TEST FAIL: ${mutation.what} produced no finding, so the no-log rule is decorative`
        );
      } else if (!quiet) {
        console.log(`  self-test: ${mutation.what} → red, as it must be`);
      }
    }
  }

  if (failed) {
    console.error(
      'phonecopy: the mock says something Tortie does not. Fix the mock, or, where Tortie is the one that moved, move the ledger rule and say so in the commit.'
    );
    process.exit(1);
  }
  console.log('phonecopy OK');
}

main();
