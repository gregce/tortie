/**
 * Per-agent conformance data — the small set of facts the harness needs that
 * the registry does not carry, plus the pattern libraries that let a pane
 * capture be classified instead of guessed at.
 *
 * Everything derivable from the registry (launch argv, resume template,
 * capture route, cwd sensitivity) is READ from the registry at run time —
 * duplicating it here would let the harness pass against its own copy of the
 * data while the app shipped something else, which is precisely the failure
 * mode research 22 documents.
 *
 * Ownership: src/main/conformance/**. Pure data + tiny helpers.
 */

import type { LaunchableAgentId } from '@shared/types';
import { AGENT_FLAG_PRESETS } from '../agents/flags';

// ---------------------------------------------------------------------------
// First-run gates
// ---------------------------------------------------------------------------

/**
 * Flags that get a first-run agent to a prompt without a human.
 *
 * WHY THIS EXISTS AND WHY IT IS DEFENSIBLE. Every one of these CLIs opens a
 * trust/approval gate the first time it sees a directory, and the harness's
 * scratch cwd is new by construction, so without these flags the run stalls
 * on a modal dialog for eight of nine agents and proves nothing. The cwd is
 * an empty temp directory, the prompt asks for a token to be echoed and
 * explicitly forbids tool use, and the session is killed at the end.
 *
 * There is a second, better reason: research 22 §3.4 rule 3 requires the
 * original launch flags to be RE-APPENDED to every resume argv, because four
 * agents were MEASURED losing their permission flags across resume. Running
 * the conformance case with flags is what exercises that rule; running it
 * bare would leave the repo's own correction untested.
 *
 * Every flag below is `provenance: 'VERIFIED'` in src/main/agents/flags.ts —
 * seen in that build's `--help` on this machine. asserted at run time by
 * {@link assertBypassFlagsAreCataloged} so a flag cannot rot into a guess.
 *
 * Set GMUX_CONF_BYPASS=0 to run without them (expect BLOCKED verdicts).
 */
export const BYPASS_FLAGS: Readonly<Record<LaunchableAgentId, readonly string[]>> = {
  claude: ['--dangerously-skip-permissions'],
  // `--force` = "skip all confirmation prompts" (cursor-agent).
  cursor: ['--force'],
  codex: ['--dangerously-bypass-approvals-and-sandbox'],
  // --yolo auto-approves; --skip-trust answers the workspace-trust dialog,
  // which --yolo alone does NOT (gemini asks them separately).
  gemini: ['--yolo', '--skip-trust'],
  deepseek: ['--skip-onboarding'],
  antigravity: ['--dangerously-skip-permissions'],
  muse: ['--yolo'],
  // DELIBERATELY EMPTY. qwen 0.21.7 has NO autonomy flag in its help at all —
  // `--yolo` and `--approval-mode yolo` are gemini-derived guesses carried in
  // the catalog as provenance RESEARCH, and re-verified absent on 2026-08-11.
  // Passing one would hand yargs an unknown option and produce the dead pane
  // this harness exists to catch. If qwen gates on a trust dialog here, the
  // honest verdict is BLOCKED.
  qwen: [],
  // pi has no approval system at all — its safety lever is --tools, and it
  // needs no gate answered to reach a prompt (research 22 §1.3).
  pi: [],
  // grok needs no gate ANSWERED to reach a prompt. The first-run "Help
  // improve Grok" banner is a different problem: the typed prompt stays
  // live under it, but the REPLY never paints while it is on screen (Phase
  // 59 fix round, measured twice at 150 s each; the turn ran and
  // updates.jsonl held the reply both times). The registry's launch.env
  // sets GROK_PRIVACY_NOTICE_ROLLOUT=0, so no pane this harness creates
  // shows the banner. --always-approve is passed because running with a
  // flag is what exercises the extras re-append rule on the resume argv
  // (research 22 §3.4 rule 3).
  grok: ['--always-approve'],
  // Not installed on any audited machine, and its flag catalog is therefore
  // empty (helpVerifiedVersion: null). Left blank rather than guessed: an
  // invented flag would produce a dead pane the day droid arrives, and the
  // whole point of research 22 is that guessed flags are how we got here.
  droid: []
};

/**
 * Prove every bypass flag for the agents UNDER TEST is still a cataloged,
 * help-verified flag. Called once at run start: a flag renamed upstream must
 * fail the harness loudly, not silently degrade into a BLOCKED verdict that
 * reads like the operator's fault.
 */
export function assertBypassFlagsAreCataloged(
  agents: readonly LaunchableAgentId[]
): string[] {
  const problems: string[] = [];
  for (const agent of agents) {
    const flags = BYPASS_FLAGS[agent] ?? [];
    const catalog = AGENT_FLAG_PRESETS[agent as keyof typeof AGENT_FLAG_PRESETS];
    if (catalog === undefined) continue;
    for (const flag of flags) {
      const preset = catalog.presets.find((p) => p.flag === flag);
      if (preset === undefined) {
        problems.push(`${agent}: "${flag}" is not in AGENT_FLAG_PRESETS`);
      } else if (preset.provenance !== 'VERIFIED' && catalog.helpVerifiedVersion !== null) {
        problems.push(
          `${agent}: "${flag}" is provenance ${preset.provenance}, not VERIFIED`
        );
      }
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Pane classification
// ---------------------------------------------------------------------------

/**
 * Positive evidence that the CLI is installed and running but is waiting on
 * a HUMAN — a login, an API key, a paid-plan wall, a trust dialog the bypass
 * flag did not answer. A case that stalls with one of these on screen is
 * BLOCKED (a fact about this machine); a case that stalls with none of them
 * is FAIL (a fact about gmux or the agent).
 *
 * Deliberately narrow. Anything vague enough to match a normal working pane
 * would turn every regression into a shrug.
 */
export const INTERACTIVE_GATE_PATTERNS: readonly RegExp[] = [
  // Provider-side refusals. MEASURED 2026-08-11: gemini on this machine
  // paints "This request failed." for every turn — research 22 §6 item 2
  // already recorded the account returning API 400, which is why gemini's
  // resume RESTORE was source-verified only. That is a fact about the
  // account, not about gmux's capture, so it must not read as a defect.
  /\bthis request failed\b/i,
  /\bapi (?:error|request failed)\b/i,
  /\b(?:please\s+)?(?:sign|log)\s?in\b/i,
  /\bnot (?:logged in|authenticated)\b/i,
  /\bauthenticat(?:e|ion required|ion failed)\b/i,
  /\bapi key\b[^\n]{0,40}\b(?:missing|not set|required|invalid)\b/i,
  /\b(?:missing|invalid|expired)\b[^\n]{0,20}\b(?:api key|credentials|token)\b/i,
  /\bunauthorized\b|\b401\b|\b403\b/i,
  /\b(?:quota|rate limit|usage limit|credit balance)\b[^\n]{0,40}\b(?:exceeded|too low|reached)\b/i,
  /\bdo you trust\b/i,
  /\btrust (?:this )?(?:folder|workspace|directory)\b/i,
  /\bpress enter to (?:continue|authenticate)\b/i,
  /\bselect (?:a|your) (?:login|auth|account) method\b/i,
  /\bonboarding\b[^\n]{0,30}\brequired\b/i,
  /\bstatus\s*(?:code)?\s*4\d\d\b/i,
  // grok's first-run data-sharing banner. Its buttons are mouse-only, and
  // while it is on screen the reply never paints (Phase 59 fix round). The
  // registry suppresses it with GROK_PRIVACY_NOTICE_ROLLOUT=0, so matching
  // here is a tripwire: if that variable ever rots, the case reads BLOCKED
  // with this line named instead of a bare 150 s timeout.
  /\bhelp improve grok\b/i
];

/**
 * The workspace-trust dialog, which is a DIFFERENT animal from the gates
 * above: it is answerable without a human, and the harness answers it.
 *
 * MEASURED 2026-08-11 (codex 0.147.0): `--dangerously-bypass-approvals-and-
 * sandbox` does NOT skip it — codex still asks "Do you trust the contents of
 * this directory?" in a fresh cwd, and codex has no flag that does. The
 * harness therefore has to clear the dialog, and clearing it is safe here in
 * a way it would not be in general: the directory is an empty temp dir the
 * harness itself created seconds earlier.
 *
 * This is also the reason nonces contain NO DIGITS. The first version typed
 * the prompt straight into this dialog; the nonce happened to contain a `2`,
 * which selected "2. No, quit", and codex exited — a self-inflicted FAIL
 * that looked exactly like a launch regression.
 */
export const TRUST_DIALOG_PATTERNS: readonly RegExp[] = [
  /\bdo you trust\b/i,
  /\btrust (?:the contents of )?(?:this )?(?:folder|workspace|director)/i
];

/**
 * A dialog whose CURRENTLY SELECTED option is affirmative — the selection
 * marker (`›`, `▶`, `❯`, `>`) followed by an accept verb, with an optional
 * `1.` or `[a]` accelerator in between. Both installed shapes match:
 *
 *   codex   `› 1. Yes, continue`
 *   cursor  `▶ [a] Trust this workspace`
 *
 * The harness presses Enter only when this matches, so it never picks an
 * option it cannot read — it accepts the one already highlighted. deepseek's
 * onboarding screen has no such line and is therefore left alone.
 */
export const SELECTED_AFFIRMATIVE =
  /^[\s│┃|]{0,10}[›❯▶>*]\s*(?:\[[a-z]\]\s*)?(?:1[.)]\s*)?(?:yes|trust|continue|proceed|allow)\b/im;

/**
 * Evidence that the argv gmux fired was REJECTED — the dead-pane class this
 * whole phase exists to prevent. `deepseek --resume <id>` exiting RC=2 with
 * "unexpected argument" is the canonical member (research 22 §1.3).
 */
export const ARGV_REJECTED_PATTERNS: readonly RegExp[] = [
  /command not found/i,
  /no such file or directory/i,
  /unexpected argument/i,
  /unrecognized (?:option|argument|subcommand)/i,
  /unknown (?:option|argument|command|flag)/i,
  /invalid (?:option|argument|value for)/i,
  /\berror: .*\b(?:usage|--help)\b/i,
  /^usage: /im,
  /no conversation found/i,
  /no saved session found/i,
  /invalid resume session/i,
  /session .* not found/i
];

/** First pattern that matches, or null. Used for the failure reason line. */
export function firstMatch(
  text: string,
  patterns: readonly RegExp[]
): string | null {
  for (const re of patterns) {
    const m = re.exec(text);
    if (m !== null) {
      // Report the whole matched LINE — the match alone is rarely readable.
      const start = text.lastIndexOf('\n', m.index) + 1;
      const end = text.indexOf('\n', m.index);
      return text.slice(start, end === -1 ? undefined : end).trim();
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// The two turns
// ---------------------------------------------------------------------------

/**
 * Turn 1 — plant the token.
 *
 * The reply the harness looks for is `ready<plant>`, and that string does
 * NOT appear in the prompt: "ready" and the token are separated by words, so
 * only an agent that actually answered can produce them adjacent (see
 * containsJoined in ./report.ts). The prompt also forbids tool use, so a
 * conformance run cannot do work in the scratch directory even in principle.
 */
export function plantPrompt(plantNonce: string): string {
  return (
    `Remember this token: ${plantNonce}. ` +
    `Reply with the word ready, then a hyphen, then that token, and nothing else. ` +
    `Do not use any tools and do not read or write any files.`
  );
}

/**
 * Turn 2 — after the kill and the restore, ask for the token BACK.
 *
 * This is the assertion that survives gmux's own scrollback replay. Restore
 * cats the pre-kill snapshot into the pane, so the plant nonce is on screen
 * whether or not resume worked; only a process that HOLDS THE CONVERSATION
 * can emit it next to a verify nonce it is seeing for the first time.
 */
export function recallPrompt(verifyNonce: string): string {
  return (
    `Output one line and nothing else: ${verifyNonce} immediately followed by ` +
    `the token I asked you to remember earlier, with no characters between them. ` +
    `Do not use any tools.`
  );
}
