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
 * THE CONTACT SHEET IS NOT A SCREEN. `index.html` draws every screen (twelve
 * since Phase 316.6, thirteen since Phase 317's End these, fifteen since Phase
 * 316.7's Sessions tab, its menu and its older-Mac face) through
 * `<iframe src="…">` and its own prose is
 * commentary about the mock. It
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
 * MARKDOWN OFF, his ruling of 2026-10-02 ("Ship tabs + Settings, markdown
 * off"). The phone draws every answer as written, as Phase 316.5 drew it, and
 * no answer holds a link, so Conversation.html's answer drawn as markdown and
 * Link.html's alert are the drawing a later phase switches back on. Their words
 * are OWED to that phase, printed on every run, rather than declared as
 * drawn.
 */
const MARKDOWN_LATER = 'the later phase that draws the conversation lazily and switches markdown back on (build/p3166/SPEC.md "As built, markdown off")';

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
/**
 * THE END WORDS (Phase 317, build/p317/SPEC.md §5.2, D9). `endSessionConfirm`
 * and `END_UNREACHABLE_TITLE` moved byte for byte from the renderer to this
 * shared module, so main can compose the Mac's own confirmation for the phone.
 * The renderer's words modules re-export them; the literal lives here alone.
 */
const LIFECYCLE_WORDS = 'src/shared/lifecycle-words.ts';

/**
 * The rows of the committed sample screen (Phase 337), as the mock draws them:
 * each row's runs joined, trailing blanks dropped, split at Tortie's separator
 * and tidied the way a drawn line is. Unique, in order. Empty when the sample
 * is not there, which leaves Screen.html's rows uncovered and failing by name.
 */
function screenSampleRows() {
  let sample;
  try {
    sample = JSON.parse(readFileSync(join(ROOT, 'build', 'fixtures', 'screen', 'sample-claude-2.1.287.json'), 'utf8'));
  } catch {
    return [];
  }
  const out = [];
  for (const line of sample?.screen?.lines ?? []) {
    const text = Array.isArray(line) ? line.map((run) => run.text).join('').replace(/ +$/, '') : '';
    for (const piece of text.split(' · ')) {
      const value = piece.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
      if (value !== '' && !out.includes(value)) out.push(value);
    }
  }
  return out;
}

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
  // Phase 333.1 (build/p3331/SPEC.md §5.6.3): the resting face's three steps,
  // Scan code and the foot, each the phone's own word in Copy.swift; the old
  // first step ("In Tortie on your Mac, open Settings then Phone and press
  // Pair.") left with the mock that drew it.
  owned({
    is: 'Get Tortie for Mac',
    module: PHONE_COPY,
    needle: 'static let setupGetMac = "Get Tortie for Mac"',
    draws: 'Get Tortie for Mac',
    why: 'the first step: Tortie for Mac is where the code comes from (D20)'
  }),
  owned({
    is: 'Free at tortie.sh',
    module: PHONE_COPY,
    needle: 'static let freeAtSite = "Free at tortie.sh"',
    draws: 'Free at tortie.sh',
    why: 'where the Mac app is, in words; the row opens it (research 140 §8 row 3)'
  }),
  owned({
    is: 'Apple silicon',
    module: PHONE_COPY,
    needle: 'static let appleSilicon = "Apple silicon"',
    draws: 'Apple silicon',
    why: 'the Mac app is arm64 only, so an Intel Mac can never pair (research 140 §5 row 9)'
  }),
  owned({
    is: '0.111 or later',
    module: PHONE_COPY,
    needle: 'static let macVersion = "0.111 or later"',
    draws: '0.111 or later',
    why: 'the first Mac release with Settings then Phone; it moves with the tag (research 140 §10)'
  }),
  owned({
    is: 'Open Settings then Phone',
    module: PHONE_COPY,
    needle: 'static let setupOpenPhone = "Open Settings then Phone"',
    draws: 'Open Settings then Phone',
    why: 'the second step; its two nouns are the Mac\'s own, pinned by the `/// Names:` lines above it in Copy.swift'
  }),
  owned({
    is: 'Scan the code',
    module: PHONE_COPY,
    needle: 'static let setupScan = "Scan the code"',
    draws: 'Scan the code',
    why: 'the third step'
  }),
  owned({
    is: 'Scan code',
    module: PHONE_COPY,
    needle: 'static let scanCode = "Scan code"',
    draws: 'Scan code',
    why: 'the press that opens the camera, and only then asks for it (D20, av5)'
  }),
  owned({
    is: 'This iPhone is not paired with a Mac.',
    module: PHONE_COPY,
    needle: 'static let notPaired = "This iPhone is not paired with a Mac."',
    draws: 'This iPhone is not paired with a Mac.',
    why: "the resting face's one line, under Scan code"
  }),
  owned({
    is: 'Privacy',
    module: PHONE_COPY,
    needle: 'static let privacy = "Privacy"',
    draws: 'Privacy',
    why: 'the privacy page on tortie.sh (research 136 §7, 5.1.1(i)); no Mac surface links it'
  }),
  owned({
    is: 'Support',
    module: PHONE_COPY,
    needle: 'static let support = "Support"',
    draws: 'Support',
    why: 'the support page on tortie.sh (research 136 §7, 1.5); no Mac surface links it'
  }),
  owned({
    is: 'Waiting for you to allow this iPhone on your Mac.',
    module: PHONE_COPY,
    needle: 'static let pairWaitingForAllow = "Waiting for you to allow this iPhone on your Mac."',
    draws: 'Waiting for you to allow this iPhone on your Mac.',
    why: "the camera face's foot once the code is read: the Mac's press is next"
  }),
  owned({
    is: 'Tortie for Mac',
    module: PHONE_COPY,
    needle: 'static let macOnSite = "Tortie for Mac"',
    draws: 'Tortie for Mac',
    why: "About's row for the Mac app's page (D22)"
  }),
  owned({
    is: 'tortie.sh',
    module: PHONE_COPY,
    needle: 'static let siteName = "tortie.sh"',
    draws: 'tortie.sh',
    why: 'the address that row opens, as words'
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
    // Phase 333.1 replaced "There is nothing else to install.", which read as
    // the Mac too: the Mac has its own Tailscale.
    is: 'Nothing else to install on this phone.',
    module: PHONE_COPY,
    needle: 'static let pairNothingElse = "Nothing else to install on this phone."',
    draws: 'Nothing else to install on this phone.',
    why: 'the phone installs nothing besides Tortie (Phase 330 took the tailnet node out of the app, build/p330/SPEC.md §4.12.6)'
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
    module: LIFECYCLE_WORDS,
    needle: "title: `End '${session.name}'?`",
    draws: "End '",
    why: "endSessionConfirm's shipped title, which the phone draws word for word since Phase 317 (D10); the module moved from src/renderer/state/resume.ts with the words, needle unchanged"
  }),
  // PHASE 317 (build/p317/SPEC.md §5.8, D10, F4). The End sheet is the Mac's own
  // confirmation, word for word, and End these is the Mac sheet's, in its
  // order. Every word below is a Mac module's, owned there.
  owned({
    is: 'This stops what is running in it. The scrollback and the conversation are saved first, so you can restore this session later.',
    module: LIFECYCLE_WORDS,
    needle: "'This stops what is running in it. The scrollback and the conversation are saved first, so you can restore this session later.'",
    draws: 'This stops what is running in it. The scrollback and the conversation are saved first, so you can restore this session later.',
    why: "endSessionConfirm's body for a session on this Mac whose conversation is recorded, which the door composes over main's own row and the phone draws verbatim"
  }),
  owned({
    is: 'End session',
    module: LIFECYCLE_WORDS,
    needle: "confirmLabel: 'End session'",
    draws: 'End session',
    why: "endSessionConfirm's press, the confirmation's destructive button; Face ID, Touch ID or the passcode is asked after it and before anything is sent"
  }),
  // PHASE 337 took the End bar above the tab bar out (build/p337/SPEC.md
  // D33), and with it the last mock drawing `End session…`: End is the top
  // bar's one word now. The phone still says `End session…` as the fallback
  // title of the Mac's confirmation, which no mock draws, and Copy.swift's
  // `/// Mac:` line still holds it to MANAGER_COPY's END_SESSION.
  owned({
    when: /^\d+ selected$/,
    module: MANAGER_COPY,
    needle: 'return `${String(n)} selected`;',
    draws: ' selected',
    why: "selectedCount, the bar's count while Select is on; the number is how many rows are ticked"
  }),
  owned({
    is: 'End selected sessions…',
    module: MANAGER_COPY,
    needle: "END_SELECTED = 'End selected sessions…'",
    draws: 'End selected sessions…',
    why: "the Mac sheet's batch press, drawn in the bar while Select is on"
  }),
  owned({
    when: /^End \d+ running sessions?\?$/,
    module: MANAGER_COPY,
    needle: 'return `End ${String(n)} running ${sessionWord(n)}?`;',
    draws: ' running session',
    why: "batchHeading, the batch confirmation's title"
  }),
  owned({
    is: 'This stops what is running in them, including sessions in closed projects. What each printed is saved first, and they stay in Managed as Ended.',
    module: MANAGER_COPY,
    needle: "'This stops what is running in them, including sessions in closed projects. What each printed is saved first, and they stay in Managed as Ended.'",
    draws: 'This stops what is running in them, including sessions in closed projects. What each printed is saved first, and they stay in Managed as Ended.',
    why: "batchBody's local sentence, which the Mac sheet draws FIRST in its confirmation and the phone draws in the same place (F4); no target in the mock is on another machine, so the remote tail is not drawn"
  }),
  owned({
    is: '1 selected session stays unchanged: 1 already ended',
    module: MANAGER_COPY,
    needle: "'1 selected session stays unchanged:'",
    draws: '1 selected session stays unchanged: ',
    why: 'batchSkippedLine: a selected row the confirmation will not end is counted with its reason and never listed as a target (F19)'
  }),
  owned({
    when: /^End \d+ sessions?$/,
    module: MANAGER_COPY,
    needle: 'return `End ${String(n)} ${sessionWord(n)}`;',
    draws: 'End ',
    why: "batchConfirmLabel, the batch confirmation's destructive press"
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
    why: "the Settings window's own title, the third tab's label and the Settings screen's title"
  }),
  // PHASE 316.6 (build/p3166/SPEC.md §4.2, §4.3): the tab bar, Settings,
  // Unpair's question, the conversation's first approved mock and the link's
  // alert. Each word is a `static let` in the phone's Copy.swift, whose own
  // owner line says who owns it; three are the Mac's own, named here by the
  // Mac module that holds them.
  owned({
    is: 'This Mac',
    module: PHONE_COPY,
    needle: 'static let thisMac = "This Mac"',
    draws: 'This Mac',
    why: 'the Settings card for the one Mac this iPhone is paired with'
  }),
  owned({
    is: 'Paired',
    module: PHONE_COPY,
    needle: 'static let paired = "Paired"',
    draws: 'Paired',
    why: 'before the day this iPhone paired, on the This Mac card'
  }),
  owned({
    is: 'Alerts',
    module: 'src/renderer/settings/PhoneSection.tsx',
    needle: "ALERTS_GROUP = 'Alerts'",
    draws: 'Alerts',
    why: "the Mac's own group heading in Settings then Phone, over the phone's alerts card"
  }),
  owned({
    is: 'Notifications',
    module: PHONE_COPY,
    needle: 'static let notifications = "Notifications"',
    draws: 'Notifications',
    why: "the iOS setting the alerts row opens, by iOS's own name for it"
  }),
  owned({
    is: 'Allowed',
    module: PHONE_COPY,
    needle: 'static let notificationsAllowed = "Allowed"',
    draws: 'Allowed',
    why: 'what iOS allows, never "On": the phone cannot see the Mac\'s switch'
  }),
  owned({
    is: 'Unpair this iPhone',
    module: PHONE_COPY,
    needle: 'static let unpairThisIPhone = "Unpair this iPhone"',
    draws: 'Unpair this iPhone',
    why: "Settings' press that forgets the pairing on this iPhone"
  }),
  owned({
    is: 'Unpair this iPhone?',
    module: PHONE_COPY,
    needle: 'static let unpairQuestion = "Unpair this iPhone?"',
    draws: 'Unpair this iPhone?',
    why: "Unpair's question, asked before anything is forgotten"
  }),
  owned({
    is: 'It forgets this Mac and its keys. Your Mac lists this iPhone until you press Remove in Settings then Phone.',
    module: PHONE_COPY,
    needle: 'static let unpairNote = "It forgets this Mac and its keys. Your Mac lists this iPhone until you press Remove in Settings then Phone."',
    draws: 'It forgets this Mac and its keys. Your Mac lists this iPhone until you press Remove in Settings then Phone.',
    why: "what Unpair does and does not do: the Mac's half is not built (Phase 317's fix round took its signed unpair out); its three Mac nouns are pinned by the `/// Names:` lines above it in Copy.swift"
  }),
  // PHASE 318 LANDED THE FOUR IT OWED (build/p318/SPEC.md §5.7.5, §6.3). They
  // were owed by Phase 318 since Phase 316.2 re-pointed them, and the gate's own
  // instruction, "move the rule to the owned table and name the module", is
  // what this is: the message strip is the phone's own, drawn ONLY on a session
  // idle at its own prompt (Composer.html, at rest), so each word is a
  // `/// Phone:` line in Copy.swift. Three are drawn and judged here. The
  // fourth, `Sending…`, is the strip's line while its write runs, which no
  // screen draws at rest (the redrawn Composer shows the strip before Send, and
  // the old one's sending bubble is not what the phone draws); it is judged with
  // `Sent` and the not-taken sentence by REPLY_PHONE_WORDS against Copy.swift.
  owned({
    is: 'Send',
    module: PHONE_COPY,
    needle: 'static let send = "Send"',
    draws: 'Send',
    why: "the message strip's press, its arrow's accessibility label: Send is a press, deliberately, and Return in the field is a new line"
  }),
  owned({
    is: 'Message this session',
    module: PHONE_COPY,
    needle: 'static let messagePlaceholder = "Message this session"',
    draws: 'Message this session',
    why: "the message field's placeholder and its accessibility label"
  }),
  owned({
    is: 'Goes to this session as one message.',
    module: PHONE_COPY,
    needle: 'static let oneMessage = "Goes to this session as one message."',
    draws: 'Goes to this session as one message.',
    why: 'the line under the strip at rest: the words go in as ONE paste and one Return, never as keystrokes'
  }),
  // PHASE 317: Select is the phone's own word now (SPEC §5.8.4, §5.8.7). No Mac
  // surface says it, so Copy.swift declares it with its reason.
  owned({
    is: 'Select',
    module: PHONE_COPY,
    needle: 'static let select = "Select"',
    draws: 'Select',
    why: "the Sessions tab's press that starts End these, drawn only when at least one row's End is offered"
  }),
  owned({
    is: 'Unpair',
    module: PHONE_COPY,
    needle: 'static let unpair = "Unpair"',
    draws: 'Unpair',
    why: "the question's destructive press"
  }),
  owned({
    is: 'About',
    module: PHONE_COPY,
    needle: 'static let about = "About"',
    draws: 'About',
    why: "the heading over the app's own facts"
  }),
  owned({
    is: 'Version',
    module: PHONE_COPY,
    needle: 'static let version = "Version"',
    draws: 'Version',
    why: "the row that says the app's version and build"
  }),
  // PHASE 337.1 (build/p3371/SPEC.md D20 to D22, his rulings "Yes, rename it"
  // and "lets do B"): the conversation is CATCH ME UP, the Mac's own View menu
  // word for the record it reads, drawn as the page's second title line and as
  // the spoken name of the Terminal's icon; the Terminal is his word for the
  // session's own terminal, the grid's spoken name. `Conversation`, `Screen`
  // and the line that kept the terminal's scrollback on the Mac left with the
  // rename (the Terminal scrolls back now, so that line was false).
  owned({
    is: 'Catch Me Up',
    module: PHONE_COPY,
    needle: 'static let catchMeUp = "Catch Me Up"',
    draws: 'Catch Me Up',
    why: "the page that reads a session's conversation and where it stands now, and the Terminal's icon that opens it; the phone's line names src/main/menu.ts's item('Catch Me Up', …) as its owner"
  }),
  owned({
    is: 'Terminal',
    module: PHONE_COPY,
    needle: 'static let terminal = "Terminal"',
    draws: 'Terminal',
    why: "the spoken name of a session's own terminal on the phone, his word; the Mac draws the terminal itself and never names it"
  }),
  // PHASE 337, the Screen (build/p337/SPEC.md §5.8.7): the Session page's
  // row, End at the top right, and the key bar's caps and spoken names. Each
  // is a `/// Phone:` line in Copy.swift; End's top word is the phone's own
  // because a top bar holds one word (D33). Declared before the data rules
  // below, because several are single lowercase words that the keyboard and
  // name rules would otherwise take.
  ...[
    ['End', 'endTop', "End's press at the top right of a session's page (D33); the confirmation is still the Mac's own words"],
    ['esc', 'keyEsc', "the key bar's Escape cap"],
    ['tab', 'keyTab', "the key bar's Tab cap"],
    ['⇧tab', 'keyBackTab', "the key bar's Shift-Tab cap, as the key's own cap draws it"],
    ['ctrl', 'keyCtrl', "the key bar's one-shot Control cap"],
    ['return', 'keyReturn', "the key bar's Return cap, and the iOS keyboard's own, which say the same word"],
    ['Escape', 'keyEscapeLabel', "the spoken name of the key bar's Escape"],
    ['Tab', 'keyTabLabel', "the spoken name of the key bar's Tab"],
    ['Shift Tab', 'keyBackTabLabel', "the spoken name of the key bar's Shift-Tab"],
    ['Left', 'keyLeftLabel', "the spoken name of the key bar's left arrow, drawn as a symbol"],
    ['Up', 'keyUpLabel', "the spoken name of the key bar's up arrow, drawn as a symbol"],
    ['Down', 'keyDownLabel', "the spoken name of the key bar's down arrow, drawn as a symbol"],
    ['Right', 'keyRightLabel', "the spoken name of the key bar's right arrow, drawn as a symbol"],
    ['Control', 'keyControlLabel', "the spoken name of the key bar's one-shot Control"],
    ['Return', 'keyReturnLabel', "the spoken name of the key bar's Return"],
    ['Hide keyboard', 'hideKeyboard', "the spoken name of the key bar's last button, which puts the keyboard away"]
  ].map(([is, name, why]) =>
    owned({
      is,
      module: PHONE_COPY,
      needle: `static let ${name} = "${is}"`,
      draws: is,
      why
    })
  ),
  // THE SCREEN'S ROWS (Phase 337): the agent's own text, drawn as the Mac's
  // terminal shows it, so data and never copy. Declared one exact row (or one
  // separator-split piece of a row) at a time, read from the committed sample
  // the SHIPPING composer wrote (build/fixtures/screen/sample-claude-2.1.287.json),
  // so Screen.html draws THAT screen and a row the mock invents fails by name.
  ...screenSampleRows().map((is) =>
    data({
      is,
      why: "a row of a session's own screen, the agent's own text, drawn as the Mac's terminal shows it: build/fixtures/screen/sample-claude-2.1.287.json, the shipping composer's answer for a committed Claude Code capture"
    })
  ),
  // Markdown off (2026-10-02): Link.html's press is owed, not drawn. The word
  // stays the Mac's own (`ARCH_INSPECT_OPEN = 'Open'`), and Copy.swift's
  // `open` still says so under its `/// Mac:` line; the owned-rule floor
  // dropped from 48 to 47 with this rule.
  owed({
    is: 'Open',
    phase: MARKDOWN_LATER,
    why: "Link.html's press that hands a link's whole address to iOS. While markdown is off no answer holds a link, so the alert is never drawn"
  }),
  owned({
    is: 'Tortie',
    module: 'package.json',
    needle: '"productName": "Tortie"',
    draws: 'Tortie',
    why: "the product's name, from the one place the bundle takes it"
  }),
  // PHASE 316.7 (build/p3167/SPEC.md §6.5, §7): the Sessions tab shows, groups,
  // sorts and filters. Show is the session manager's own lifecycle segment, word
  // for word; Clear filters and the empty face are the sheet's; Group by, Sort
  // by and their sort words are the phone's own, because no Mac surface offers
  // that choice, and Copy.swift declares each with its reason.
  owned({
    is: 'All',
    module: MANAGER_COPY,
    needle: "label: 'All'",
    draws: 'All',
    why: "the Show control's first word, the session manager's lifecycle segment"
  }),
  owned({
    is: 'Active',
    module: MANAGER_COPY,
    needle: "label: 'Active'",
    draws: 'Active',
    why: "the Show control's word the tab opens on, the session manager's lifecycle segment"
  }),
  owned({
    is: 'Ended',
    module: MANAGER_COPY,
    needle: "label: 'Ended'",
    draws: 'Ended',
    why: "the Show control's third word, the session manager's lifecycle segment"
  }),
  owned({
    is: 'Group, sort and filter',
    module: PHONE_COPY,
    needle: 'static let sessionsOptions = "Group, sort and filter"',
    draws: 'Group, sort and filter',
    why: "the menu button's spoken name; the button draws no words"
  }),
  owned({
    is: 'Group by',
    module: PHONE_COPY,
    needle: 'static let groupBy = "Group by"',
    draws: 'Group by',
    why: 'the menu\'s grouping choice; no Mac surface offers one, the sheet always groups by project'
  }),
  owned({
    is: 'Project',
    module: MANAGER_COPY,
    needle: "project: 'Project'",
    draws: 'Project',
    why: "Group by's default, the session manager's own word for the column a session's project is in"
  }),
  owned({
    is: 'Sort by',
    module: PHONE_COPY,
    needle: 'static let sortBy = "Sort by"',
    draws: 'Sort by',
    why: 'the menu\'s order choice; the sheet sorts by pressing a column heading, which a phone does not have'
  }),
  owned({
    is: 'Recent activity',
    module: PHONE_COPY,
    needle: 'static let sortRecent = "Recent activity"',
    draws: 'Recent activity',
    why: "Sort by's default, the order today's list already has: waiting first, then output, then creation"
  }),
  owned({
    is: 'Agent',
    module: 'src/renderer/diagnostics/copy.ts',
    needle: "COL_AGENT = 'Agent'",
    draws: 'Agent',
    why: "the menu's agent filter, the Mac's own column word for an agent"
  }),
  owned({
    is: 'Machine',
    module: 'src/renderer/machines/machine-choice.ts',
    needle: "MACHINE_FIELD_LABEL = 'Machine'",
    draws: 'Machine',
    why: "the menu's machine filter, the Mac's own field word for a machine"
  }),
  owned({
    is: 'All machines',
    module: PHONE_COPY,
    needle: 'static let allMachines = "All machines"',
    draws: 'All machines',
    why: "the machine filter's no-filter value; no Mac surface filters sessions by machine"
  }),
  owned({
    is: 'Clear filters',
    module: MANAGER_COPY,
    needle: "CLEAR_FILTERS = 'Clear filters'",
    draws: 'Clear filters',
    why: "the session manager's own reset, with its meaning: Show to All and both filters cleared (D12)"
  }),
  owned({
    is: 'No matching sessions',
    module: MANAGER_COPY,
    needle: "NO_MATCH_HEADING = 'No matching sessions'",
    draws: 'No matching sessions',
    why: "the session manager's face when the words keep nothing"
  }),
  owned({
    // The age is main's (`formatAge`), and the word after it is `createdOld`'s,
    // which Phase 316.7 moved byte for byte from the sheet's copy.ts to
    // src/shared/age.ts so main can say it to the phone (§6.3, D11).
    when: /^\d+[smhd] old$/,
    module: 'src/shared/age.ts',
    needle: '`${age} old`',
    draws: ' old',
    why: "an age counted from a session's creation, which the sheet's Created cell also says with `old`, so one clock is never drawn as another"
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
    why: "a count from the store, under the integer rule's data-quoted span, or a step's place in a list, drawn from its position (Phase 333.1, D25)"
  }),
  // PHASE 316.6's data, each declared before the name rule below, because
  // several are single lowercase words that rule would otherwise take.
  data({
    is: 'studio',
    why: "the Mac's name, the first label of its public name, which Tailscale composes"
  }),
  data({
    when: /^[a-z0-9-]+\.tail[0-9a-f]+\.ts\.net:\d+$/,
    why: "the Mac's public name and port, which Tailscale composes and the code carries"
  }),
  data({
    when: /^[0-9a-f]{4}(?: [0-9a-f]{4}){5}$/,
    why: 'the pairing fingerprint, six groups of a digest of three keys, which the app draws in lower case hex'
  }),
  data({
    when: /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/,
    why: "a date, in the phone's own format: the day this iPhone paired"
  }),
  data({
    when: /^\d+\.\d+\.\d+ \(\d+\)$/,
    why: "the app's own version and build, read from its bundle"
  }),
  data({
    when: /^\d{1,2}:\d{2} [AP]M$/,
    why: "a turn's clock, in the phone's own format"
  }),
  owed({
    when: /^https:\/\/[a-z0-9.-]+\/\S*$/,
    phase: MARKDOWN_LATER,
    why: "an address an answer links to, which Link.html's alert draws whole before it opens. While markdown is off no link is pressable and the address is not drawn"
  }),
  data({
    when: /^~\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/,
    why: "a project's folder, home-relative as main states it, drawn under a header only when two projects share a name (Phase 316.7, D7)"
  }),
  owed({
    is: '-',
    phase: MARKDOWN_LATER,
    why: "a bullet item's mark in Conversation.html's answer drawn as markdown: the bullet the agent wrote (`-`, `+` or `*`), so an unfenced diff's - and + lines stay told apart. While markdown is off the phone draws it as the agent's character in the answer as written"
  }),
  data({
    is: 'make the session cookie httpOnly and show me what changed',
    why: "the person's own ask, drawn as typed"
  }),
  ...[
    'What changed',
    'The cookie now sets httpOnly and sameSite. The pull request has the diff.',
    'src/auth/session.ts',
    'sets both flags',
    'reads the parsed cookie',
    'test/session.test.ts',
    "res.cookie('sid', id, { httpOnly: true, sameSite: 'lax', secure: true });",
    'The login handler is unchanged.',
    'File',
    'Added',
    'Removed',
    'Tests',
    'Owner',
    'Risk',
    'Status',
    'Merged',
    'session.ts',
    'session.test.ts',
    'auth',
    'low',
    'done',
    'no',
    'the login screen before the fix'
  ].map((is) =>
    owed({
      is,
      phase: MARKDOWN_LATER,
      why: "the agent's own answer in Conversation.html, drawn there as the markdown the later phase switches back on: one exact string each, never a shape. While markdown is off the phone draws these words as written, one text, as Phase 316.5 did"
    })
  ),
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
  // PHASE 318: Answer.html draws a PRESSABLE Claude Code question, and its
  // question is what the leaf really composes, not the design's wording: the
  // tool's name and its command, `Bash npm test`, with no question mark. It is
  // pressable only because hook-says.ts found that question to be `Bash `
  // followed by the hook's own command byte for byte (build/p318/SPEC.md D12).
  data({
    is: 'Bash npm test',
    why: "the question Phase 311's leaf composes from Claude Code's Bash PermissionRequest: the tool's own name and the command the agent asks to run, which is the agent's"
  }),
  data({
    is: 'auto mode handles these prompts for you',
    why: "the tail of Claude Code 2.1.287's own third option, after its own ` · ` (build/fixtures/reply/claude-bash-2.1.287.txt); the phone draws an option verbatim, so the agent's separator splits it here"
  }),
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
  // PHASE 337.1 took out the agent's last answer card: the Session mock is the
  // Terminal now, and Catch Me Up draws the last answer only when a session has
  // no turns, because it IS the newest turn's answer (build/p3371/SPEC.md D20).
  // PHASE 318 took out the person's sent message: Composer.html was redrawn as
  // the strip at rest (build/p318/SPEC.md §3 row 18), and the phone draws no
  // bubble for a message it sent; the box clears and its line reads Sent.
  data({
    is: 'and run the suite when you are done',
    why: "the person's own message, mid-typing"
  }),

  // -------------------------------------------------------------------------
  // Copy no module owns yet. Each names the phase that owes it. THESE ARE
  // PRINTED AND COUNTED, and one whose words the tree has since grown fails.
  // -------------------------------------------------------------------------
  // RE-POINTED IN PHASE 316.2 (build/p316/SPEC.md §2 row 31, §7): the ssh
  // hand-off is removed from the product and owed to nobody, and "Open in
  // Claude" waits for the phase that first measures where the Remote Control URL
  // is recorded.
  owed({
    is: 'Open in Terminal',
    phase: 'no phase: removed by Phase 316 (build/p316/SPEC.md §7)',
    why: "the ssh hand-off's press, research 127 §4. The phone reaches the Mac only at the door's public name and port (Phase 330), so an ssh link could reach nothing. The approved Session.html still draws it until the screen is redrawn"
  }),
  // PHASE 337 redrew Session.html with the Conversation row and the Screen
  // row in that card's place, so "Open in Claude", the Remote Control hand-off
  // press nothing ever built, left with it.
  owed({
    is: 'The last line is only there when the question can be decrypted on this phone. Without it the card stops after the project and the agent — never filler.',
    phase: 'the Notification Service Extension’s later entry',
    why: "the mock's own note about the push, drawn on the lock screen sheet rather than in a caption. Phase 314 REFUSED the question line — a native alert is JSON Apple reads — so the decrypting extension that would add it is later Swift and its own entry, and this note is owed there rather than to 314"
  })
  // "Enter a code instead" left with Phase 333.1's resting face
  // (build/p3331/SPEC.md §5.6.3): no mock draws the fallback any more.
];

/** The shortest owed string whose absence from the tree is asserted. */
const OWED_ABSENCE_FLOOR = 16;

/**
 * The fewest `owned` rules that must match something. A ledger whose owned
 * rules were quietly moved to `data` would still pass every other check, so the
 * floor is what keeps this gate a comparison rather than a census. A deliberate
 * removal lowers it in the same commit and names the rule.
 *
 * PHASE 317 RAISED IT FROM 48 TO 58, the count the run matches: ten owned rules
 * for End, End these and Select joined (the confirmation's body and press, the
 * End bar's word, the batch bar's count and press, the batch heading, body,
 * skipped line and press, and Select), and the six owed 317 rows and the
 * `Actions for` data rule left with the refusals card and the actions button.
 *
 * PHASE 316.7 RAISED IT FROM 58 TO 72, the count the run matches: fourteen
 * owned rules for the Sessions tab joined (All, Active and Ended, the menu
 * button's spoken name, Group by, Project, Sort by, Recent activity, Agent,
 * Machine, All machines, Clear filters, No matching sessions, and a creation
 * age's ` old`). Every rule the parent's list matched still matches, in
 * SessionsOlderMac.html, which is that list byte for byte but its title.
 */
/* PHASE 318 RAISED IT BY THREE, FROM 57 TO 60, the count the run matches: the
   three message strip words Composer.html draws at rest, owned by Copy.swift
   now rather than owed (Send, Message this session, Goes to this session as
   one message.). PHASE 316.7 RAISED IT BY FOURTEEN, FROM 60 TO 74, landing
   second: the fourteen owned rules its Sessions mocks (Main.html,
   SessionsMenu.html, SessionsOlderMac.html) draw. */
/* PHASE 337 RAISED IT BY SIXTEEN, FROM 74 TO 90, the count the run matches:
   seventeen owned rules for the Screen joined (Screen, End at the top right,
   the key bar's five caps and its ten spoken names, all Copy.swift's), and
   `End session…` left with the End bar above the tab bar, which no mock draws
   any more (build/p337/SPEC.md D33). */
/* PHASE 337.1 LOWERED IT BY ONE, FROM 90 TO 89, the count the run matches:
   three owned rules left with the rename (Conversation, Screen, and The
   terminal's scrollback stays on your Mac., which the Terminal scrolling back
   made false), and two joined (Catch Me Up, the Mac's own word, and Terminal),
   build/p3371/SPEC.md D21, D22. */
/* PHASE 333.1 RAISED IT BY TWELVE, FROM 89 TO 101, the count the run matches:
   fourteen owned rules joined for the resting pairing face, the camera's face
   and About (Get Tortie for Mac, Free at tortie.sh, Apple silicon, 0.111 or
   later, Open Settings then Phone, Scan the code, Scan code, This iPhone is
   not paired with a Mac., Privacy, Support, Waiting for you to allow this
   iPhone on your Mac., Tortie for Mac, tortie.sh, and Nothing else to install
   on this phone. in place of There is nothing else to install.), and two left
   with the old mock (the first step "In Tortie on your Mac, open Settings then
   Phone and press Pair." and "There is nothing else to install."),
   build/p3331/SPEC.md §5.6.3. */
const OWNED_RULE_FLOOR = 101;

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
    // A module that is not there owns nothing: its rules fail on their needle
    // by name, rather than the whole gate dying on a read.
    try {
      out.set(rule.module, readFileSync(join(ROOT, rule.module), 'utf8'));
    } catch {
      out.set(rule.module, '');
    }
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
 *
 * PHASE 317 RAISED PHONE_MAC_FLOOR FROM 39 TO 68, the count the run matches:
 * End's and End these' words are each a piece of a Mac composer, pinned
 * `/// Mac:` to src/renderer/session-manager/copy.ts (the batch heading, body
 * and its remote tail, the skipped line's pieces, the running and done
 * headings, every outcome word, Stop and Done). PHONE_NAMES_FLOOR stays 7, the
 * count the run matches: Unpair's three `/// Names:` pins stay on unpairNote,
 * the words that send a person to Remove (the fix round took the line that
 * would have carried them, unpairMacMayList, out with Unpair's Mac half).
 *
 * PHASE 316.7 RAISED PHONE_MAC_FLOOR FROM 68 TO 79, the count the run
 * matches, and not the 80 build/p3167/SPEC.md §7 wrote: eleven of its twelve
 * `/// Mac:` words joined or moved (All, Active, Project, None, Agent, All
 * agents, Machine, Clear filters, No matching sessions, No sessions to manage,
 * and This Mac, which was the phone's own and is now the Mac's machine-choice
 * word), and the twelfth, the Show control's `Ended`, is `Copy.ended`, which
 * was already declared, because a word is declared once (the duplicate rule
 * above, and CopyTests.testEveryWordIsDeclaredOnceWithItsOwner).
 */
/* PHASE 337 RAISED IT FROM 79 TO 80, the count the run matches: the Screen's
   Copy, the Mac terminal menu's own word (src/renderer/terminal/terminal-menu.ts). */
const PHONE_MAC_FLOOR = 80;
/* PHASE 333.1 RAISED PHONE_NAMES_FLOOR FROM 7 TO 9, the count the run matches:
   the second step names Settings and Phone, and the Allow line under "could
   not reach" names Allow, Settings and Phone (build/p3331/SPEC.md §5.6.1). */
const PHONE_NAMES_FLOOR = 9;

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

// ---------------------------------------------------------------------------
// Phase 318's words (build/p318/SPEC.md §5.7.5, D20, §6.3)
// ---------------------------------------------------------------------------

/**
 * THE MESSAGE STRIP'S WORDS, judged against Copy.swift whether or not a screen
 * draws them. Each must be one `static let` of exactly this name and literal,
 * declared `/// Phone:` with a reason: no Mac surface says them, because the
 * strip is the phone's alone. `sending`, `replySent` and `replyNotTaken` are
 * drawn only after a press (the strip's line while its write runs, after a
 * message landed, and after a write the Mac did not take), so no screen at rest
 * holds them and this is where a drift in them is caught.
 */
export const REPLY_PHONE_WORDS = Object.freeze([
  ['send', 'Send'],
  ['messagePlaceholder', 'Message this session'],
  ['oneMessage', 'Goes to this session as one message.'],
  ['sending', 'Sending…'],
  ['replySent', 'Sent'],
  ['replyNotTaken', 'Your Mac did not take it. Nothing was sent.']
]);
/** The Mac's sentence for a choice the phone may not press, spelled once more for main (D20). */
const REPLY_COPY = 'src/shared/reply-copy.ts';
const CHOICE_MODULE = 'src/renderer/choice.ts';

/** The value of `export const NAME = '…'` in a module's text, or null. */
function exportedWord(text, name) {
  if (typeof text !== 'string') return null;
  const m = new RegExp(`\\bexport\\s+const\\s+${name}\\s*(?::\\s*string\\s*)?=\\s*'((?:[^'\\\\]|\\\\.)*)'`).exec(text);
  return m === null ? null : m[1].replace(/\\(.)/g, '$1');
}

/**
 * Judge Phase 318's words. Pure over Copy.swift's text and a module reader, so
 * the self-test hands it a mutation. Two halves: every strip word is a phone
 * word in Copy.swift, exactly; and REPLY_ANSWER_IN_SESSION in
 * src/shared/reply-copy.ts is CHOICE_NOT_PRESSABLE in src/renderer/choice.ts,
 * byte for byte, because main cannot import the renderer and the phone draws
 * main's spelling under every option it may not press.
 */
function judgeReplyWords(swift, readModule) {
  const findings = [];
  const { entries } = copySwiftEntries(swift);
  for (const [name, literal] of REPLY_PHONE_WORDS) {
    const e = entries.find((x) => x.name === name);
    if (e === undefined) {
      findings.push({ file: PHONE_COPY, text: `static let ${name} = "${literal}"`, why: `the message strip's word ${name} is not declared, so the phone draws it from somewhere this gate cannot read (build/p318/SPEC.md §5.7.5)` });
    } else if (e.literal !== literal) {
      findings.push({ file: PHONE_COPY, text: e.literal, why: `${name} is ${JSON.stringify(e.literal)}; it is ${JSON.stringify(literal)}, the word build/p318/SPEC.md §5.7.5 pins` });
    } else if (e.owner?.kind !== 'phone') {
      findings.push({ file: PHONE_COPY, text: name, why: `${name} is not declared /// Phone: with a reason; no Mac surface says it, so its reason is the ledger entry` });
    }
  }
  const mine = exportedWord(readModule(REPLY_COPY), 'REPLY_ANSWER_IN_SESSION');
  const macs = exportedWord(readModule(CHOICE_MODULE), 'CHOICE_NOT_PRESSABLE');
  if (mine === null) findings.push({ file: REPLY_COPY, text: 'REPLY_ANSWER_IN_SESSION', why: 'main declares no REPLY_ANSWER_IN_SESSION, the sentence the door sends for a choice the phone may not press (D20)' });
  if (macs === null) findings.push({ file: CHOICE_MODULE, text: 'CHOICE_NOT_PRESSABLE', why: "the Mac's own sentence for an unpressable choice cannot be read, so main's copy of it is held against nothing" });
  if (mine !== null && macs !== null && mine !== macs) findings.push({ file: REPLY_COPY, text: mine, why: `REPLY_ANSWER_IN_SESSION drifted from the Mac's CHOICE_NOT_PRESSABLE, ${JSON.stringify(macs)}; it is the same sentence spelled once more for main` });
  return findings;
}

/** The mutations that prove Phase 318's words are judged. */
const REPLY_MUTATIONS = [
  {
    what: 'REPLY_ANSWER_IN_SESSION changed by one letter',
    swift: (t) => t,
    module: [REPLY_COPY, (t) => t.replace("REPLY_ANSWER_IN_SESSION = 'Answer this in the session.'", "REPLY_ANSWER_IN_SESSION = 'Answer this in the sessions.'")],
    names: 'REPLY_ANSWER_IN_SESSION'
  },
  {
    what: "the strip's Sent re-worded on the phone",
    swift: (t) => t.replace('static let replySent = "Sent"', 'static let replySent = "Delivered"'),
    module: null,
    names: 'replySent'
  },
  {
    what: "the not-taken sentence drops a word",
    swift: (t) => t.replace('static let replyNotTaken = "Your Mac did not take it. Nothing was sent."', 'static let replyNotTaken = "Your Mac did not take it."'),
    module: null,
    names: 'replyNotTaken'
  }
];

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
    // Phase 333.1: the line that named the Mac's Pair left; the Allow line
    // under "could not reach" names Allow, Settings and Phone instead.
    what: 'a phone line that stops naming the Mac control it points at',
    swift: (t) => t.replace('press Allow in its Settings then Phone."', 'press Go in its Settings then Phone."'),
    module: null
  },

  {
    what: 'a word declared twice',
    swift: (t) => t.replace('static let pairAgain = "Pair again"', 'static let pairAgain = "Try again"'),
    module: null
  },
  {
    // Phase 316.6: Unpair's note sends him to the Mac's Remove, so a renamed
    // button must turn Copy.unpairNote red.
    what: "the Mac renames Remove, the button Unpair's note sends a person to",
    swift: (t) => t,
    module: ['src/renderer/settings/PhoneSection.tsx', (t) => t.replace("BTN_REMOVE = 'Remove'", "BTN_REMOVE = 'Forget'")]
  },
  {
    // Phase 317: End these' press is the Mac sheet's own word, so a Mac that
    // renames it must turn Copy.endSelected red, by name.
    what: 'the Mac renames END_SELECTED, the batch press the phone copied',
    swift: (t) => t,
    module: [MANAGER_COPY, (t) => t.replace("END_SELECTED = 'End selected sessions…'", "END_SELECTED = 'End the selected sessions…'")],
    names: 'endSelected'
  },
  {
    // Phase 316.7: the Show control's words are the sheet's lifecycle segment,
    // so a Mac that renames Active must turn Copy.showActive red, by name.
    what: "the Mac renames Active, the Show word the phone copied",
    swift: (t) => t,
    module: [MANAGER_COPY, (t) => t.replace("label: 'Active'", "label: 'Live'")],
    names: 'showActive'
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
        'Conversation.html',
        (next.get('Conversation.html') ?? '')
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
        'SessionsOlderMac.html',
        (next.get('SessionsOlderMac.html') ?? '').replace(
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
        'SessionsOlderMac.html',
        (next.get('SessionsOlderMac.html') ?? '').replace('Unreachable', 'Offline')
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
    // Phase 333.1 (build/p3331/SPEC.md §5.6.3): the press that opens the
    // camera, renamed in the resting face's mock.
    what: 'Scan code renamed in Pairing.html',
    apply(screens) {
      const next = new Map(screens);
      next.set('Pairing.html', (next.get('Pairing.html') ?? '').replace('>Scan code<', '>Scan a code<'));
      return next;
    },
    names: 'Scan a code'
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
        'SessionsOlderMac.html',
        (next.get('SessionsOlderMac.html') ?? '').replace(
          'Run rm -rf build?',
          'Run make install and then deploy?'
        )
      );
      return next;
    },
    names: 'Run make install and then deploy?'
  },
  {
    // Phase 317: the End sheet is the Mac's sentence for the session, word for
    // word, so one word changed in its body must fail by name (D10).
    what: "one word changed in the End sheet's body",
    apply(screens) {
      const next = new Map(screens);
      next.set(
        'End.html',
        (next.get('End.html') ?? '').replace(
          'The scrollback and the conversation are saved first',
          'The scrollback and the conversation are kept first'
        )
      );
      return next;
    },
    names: 'This stops what is running in it. The scrollback and the conversation are kept first, so you can restore this session later.'
  },
  {
    // Phase 318: the message strip's press renamed in the mock must go red
    // against Copy.swift's `send` (build/p318/SPEC.md §6.3).
    what: "the strip's Send renamed in the mock",
    apply(screens) {
      const next = new Map(screens);
      next.set('Composer.html', (next.get('Composer.html') ?? '').replace('aria-label="Send"', 'aria-label="Submit"'));
      return next;
    },
    names: 'Submit'
  },
  {
    // Phase 316.6: a tab label re-cased, in the drawn text and not the
    // document's <title>, which is exempt.
    what: 'a tab label re-cased',
    apply(screens) {
      const next = new Map(screens);
      next.set('NeedsInput.html', (next.get('NeedsInput.html') ?? '').replace('>Needs input<', '>Needs Input<'));
      return next;
    },
    names: 'Needs Input'
  },
  {
    // Phase 316.7: the Show control is the session manager's lifecycle
    // segment, word for word, so a word re-typed on the phone must fail by name.
    what: 'a Show word re-typed',
    apply(screens) {
      const next = new Map(screens);
      next.set('Main.html', (next.get('Main.html') ?? '').replace('>Ended<', '>Over<'));
      return next;
    },
    names: 'Over'
  },
  {
    // Phase 337.1: the Terminal's icon spoken in other words must go red
    // against Copy.swift's `catchMeUp`, the Mac's word (build/p3371/SPEC.md §6.4).
    what: "the Catch Me Up icon's spoken name re-cased in the mock",
    apply(screens) {
      const next = new Map(screens);
      next.set('Session.html', (next.get('Session.html') ?? '').replace('aria-label="Catch Me Up"', 'aria-label="Catch me up"'));
      return next;
    },
    names: 'Catch me up'
  },
  {
    // Phase 337.1: the word the rename took away, put back in a mock (D21).
    what: 'Conversation put back as the title',
    apply(screens) {
      const next = new Map(screens);
      next.set('Conversation.html', (next.get('Conversation.html') ?? '').replace('>Catch Me Up</div>', '>Conversation</div>'));
      return next;
    },
    names: 'Conversation'
  },
  {
    // Phase 316.7: Clear filters is the Mac's own reset (D12).
    what: "the Mac's Clear filters re-worded in the menu",
    apply(screens) {
      const next = new Map(screens);
      next.set('SessionsMenu.html', (next.get('SessionsMenu.html') ?? '').replace('>Clear filters<', '>Clear all filters<'));
      return next;
    },
    names: 'Clear all filters'
  }
];

/**
 * Phase 337: mutations of a MODULE the ledger reads, judged over the unmutated
 * mock, so a word moved in Tortie and not in the mock goes red by its needle.
 */
const MODULE_MUTATIONS = [
  {
    // Phase 337.1: Catch Me Up cased differently in Copy.swift (build/p3371/SPEC.md §6.4).
    what: 'Catch Me Up cased differently in Copy.swift',
    module: PHONE_COPY,
    edit: (text) => text.replace('static let catchMeUp = "Catch Me Up"', 'static let catchMeUp = "Catch me up"'),
    names: 'static let catchMeUp = "Catch Me Up"'
  },
  {
    // Phase 333.1 (build/p3331/SPEC.md §5.6.3): the address About opens, as
    // words, changed by one letter in Copy.swift; the mock's row then names
    // an address the phone does not say.
    what: "tortie.sh changed by one letter in Copy.swift's siteName",
    module: PHONE_COPY,
    edit: (text) => text.replace('static let siteName = "tortie.sh"', 'static let siteName = "tortie.io"'),
    names: 'static let siteName = "tortie.sh"'
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
  // Phase 318's words: the strip's six phone words, and main's copy of the
  // Mac's unpressable sentence.
  const replyFindings = judgeReplyWords(phoneSwift, readModule);
  findings.push(...replyFindings);

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
    for (const mutation of MODULE_MUTATIONS) {
      const was = modules.get(mutation.module) ?? '';
      const edited = mutation.edit(was);
      if (edited === was) {
        failed = true;
        console.error(`phonecopy SELF-TEST FAIL: ${mutation.what} changed nothing in ${mutation.module}, so it proves nothing`);
        continue;
      }
      const mutatedModules = new Map(modules);
      mutatedModules.set(mutation.module, edited);
      const mutated = judge(screens, mutatedModules, production);
      const caught = mutated.findings.some((f) => f.text === mutation.names);
      if (!caught) {
        failed = true;
        console.error(`phonecopy SELF-TEST FAIL: ${mutation.what} produced no finding naming ${JSON.stringify(mutation.names)}`);
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
      const mutatedFindings = judgeCopySwift(mutatedSwift, reader).findings;
      const red = mutatedFindings.length > phone.findings.length;
      const named = mutation.names === undefined || mutatedFindings.some((f) => `${f.text} ${f.why}`.includes(mutation.names));
      if (!red) {
        failed = true;
        console.error(`phonecopy SELF-TEST FAIL: ${mutation.what} produced no finding, so Copy.swift is not being judged`);
      } else if (!named) {
        failed = true;
        console.error(`phonecopy SELF-TEST FAIL: ${mutation.what} went red without naming ${mutation.names}, so the word it was written for is not the one judged`);
      } else if (!quiet) {
        console.log(`  self-test: ${mutation.what} → red, as it must be`);
      }
    }
    for (const mutation of REPLY_MUTATIONS) {
      const mutatedSwift = mutation.swift(phoneSwift);
      const reader = mutation.module === null
        ? readModule
        : (path) => (path === mutation.module[0] ? mutation.module[1](readModule(path) ?? '') : readModule(path));
      const moved = mutatedSwift !== phoneSwift || (mutation.module !== null && reader(mutation.module[0]) !== (readModule(mutation.module[0]) ?? ''));
      if (!moved) {
        // The anchor is absent: the word it breaks is not there to break,
        // which the base run has already failed on by name.
        failed = true;
        console.error(`phonecopy SELF-TEST FAIL: ${mutation.what} changed nothing, so it proves nothing (the word it breaks is not in the tree yet)`);
        continue;
      }
      const mutated = judgeReplyWords(mutatedSwift, reader);
      const red = mutated.length > replyFindings.length && mutated.some((f) => `${f.text} ${f.why}`.includes(mutation.names));
      if (!red) {
        failed = true;
        console.error(`phonecopy SELF-TEST FAIL: ${mutation.what} produced no finding naming ${mutation.names}, so Phase 318's words are not judged`);
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
