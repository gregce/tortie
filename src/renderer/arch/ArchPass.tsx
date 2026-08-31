/**
 * THE PASS AND DIVERGENCE FACE of the Architecture pane (Phase 172, the
 * view seam).
 *
 * The run face and the accept verb moved whole out of ArchView.tsx, bodies
 * unchanged: the pure sentences the unit suite holds (the lead, the detail,
 * the painted coverage, the clock word), the accept vocabulary
 * (acceptEdgeId, canAcceptOffence), the run face itself, and the accept
 * control that rides a failing row. The refusals travel with the code: main
 * holds the gate on every pass, the accept channel is the one write, and no
 * agent can press a button.
 */

import React, { useEffect, useState } from 'react';
import { ARCH_LIMITS } from '@shared/arch';
import { Codicon } from '../icons';
import { passSentence } from './ArchEmptyState';
import { passAvailable } from './bridge';
import type { ArchPassRunFace, ArchPassStatusResult } from './bridge';
import {
  ARCH_ACCEPT_BODY,
  ARCH_ACCEPT_REASON_LABEL,
  ARCH_ACCEPT_TITLE,
  ARCH_ACCEPT_WRITE,
  ARCH_ENRICH_BODY,
  ARCH_ENRICH_TITLE,
  enrichRefusalSentence,
  ARCH_PASS_FAILED,
  ARCH_PASS_REFUSED,
  ARCH_PASS_RUNNING,
  ARCH_PASS_SUGGESTIONS,
  ARCH_PASS_SUGGESTIONS_NOTE,
  ARCH_PASS_TITLE,
  ARCH_REPAIR_WRITTEN
} from './copy';
import { useArch } from './store';

/**
 * The promise id an accepted divergence names, out of the verdict's own
 * subject vocabulary. `edge:<id>` and `edge:<id>#<facet>` both answer the
 * id; a component or gap subject answers undefined, because a baseline row
 * without an edge id matches offences by path pair alone.
 */
export function acceptEdgeId(subjectId: string): string | undefined {
  if (!subjectId.startsWith('edge:')) return undefined;
  const rest = subjectId.slice('edge:'.length);
  const hash = rest.indexOf('#');
  const id = hash === -1 ? rest : rest.slice(0, hash);
  return id.length === 0 ? undefined : id;
}

/**
 * Whether one offending record can be accepted at all. A baseline row names
 * a `fromPath` and a `toPath`, so an offence with no target, which is what
 * an absent component reports, has nothing a row could match and gets no
 * button rather than a button that writes a row main must refuse.
 */
export function canAcceptOffence(o: {
  fromPath: string;
  toPath: string;
  accepted?: string;
}): boolean {
  // An offence a baseline row already covers gets no second button: the
  // person accepted it, and the row says so in their words instead.
  return o.fromPath.length > 0 && o.toPath.length > 0 && o.accepted === undefined;
}

/** The clock word the run face says, hours and minutes, this computer's day. */
export function timeWord(ms: number): string {
  const d = new Date(ms);
  const two = (n: number): string => String(n).padStart(2, '0');
  return `${two(d.getHours())}:${two(d.getMinutes())}`;
}

/**
 * The painted coverage sentence, on the run's face because the map binding
 * makes it the proof: an enrichment that painted nothing did not reach the
 * picture, and main records such a run failed rather than kept. Null when
 * the run carries no counts, which a refused run does not.
 */
export function paintedSentence(run: ArchPassRunFace): string | null {
  if (run.painted === null || run.components === null) return null;
  return `Painted ${String(run.painted)} of ${String(run.components)} parts on the map.`;
}

/**
 * The one sentence the run face leads with, decided by main's status and
 * the last gesture's refusal alone, so the unit suite can hold every state.
 * Null means the face has nothing to say yet, which is a chosen pass that
 * has never run.
 */
export function passLead(
  status: ArchPassStatusResult,
  askRefusal: string | null
): string | null {
  if (status.running) return ARCH_PASS_RUNNING;
  if (askRefusal !== null) return enrichRefusalSentence(askRefusal);
  const run = status.lastRun;
  if (status.suspended !== null) {
    // A suspension after a kept run still owes the written time: the
    // contract on disk is that run's, whatever the window is doing now.
    return run !== null && run.verdict === 'kept'
      ? `${status.suspended} ${writtenSentence(run)}`
      : status.suspended;
  }
  if (run === null) return null;
  if (run.verdict === 'refused') {
    return run.reason === null
      ? ARCH_PASS_REFUSED
      : `${ARCH_PASS_REFUSED} The refusal is named ${run.reason}.`;
  }
  if (run.verdict === 'failed') {
    return run.reason === null
      ? ARCH_PASS_FAILED
      : `${ARCH_PASS_FAILED} ${run.reason}`;
  }
  // Kept: the contract on disk is the run's own write, said with the time,
  // the way a session row says written and when.
  return writtenSentence(run);
}

/**
 * The kept run's own line: written, and when. A repair (Phase 159) says so,
 * because a pass scoped to what drifted wrote the drifted parts and left
 * the rest of the contract exactly as it was.
 */
function writtenSentence(run: ArchPassRunFace): string {
  const head =
    run.scope === 'drift' ? ARCH_REPAIR_WRITTEN : 'The contract was last written at';
  return `${head} ${timeWord(run.startedAt + run.wallMs)}.`;
}

/**
 * The validator's own sentence under a refused run's lead, naming the field
 * and the reason, so the person reads what to change and not only the
 * token's name. Null unless the last run carried one.
 */
export function passDetail(status: ArchPassStatusResult): string | null {
  const run = status.lastRun;
  if (run === null || status.running || run.verdict === 'kept') return null;
  return run.detail;
}

/**
 * THE RUN FACE (Phase 158). What the pass is doing, when the contract was
 * last written, the painted coverage, and the answer's regroup suggestions,
 * on one quiet section of the cockpit.
 *
 * IT IS VISIBLE WHILE IT RUNS, the charter's own words: a headless pass a
 * person cannot see is a pass they cannot trust. The face reads the pass
 * record main reports and nothing else; it derives nothing of its own, so
 * the numbers here are the numbers main counted. With no agent picked it
 * says the pass is off, plainly, with the Settings pointer, and the one
 * control it carries asks main to run the pass once. Main holds the gate:
 * nothing this face sends can start an agent the person has not confirmed.
 */
export function PassFace({
  repoPath
}: {
  repoPath: string | null;
}): React.JSX.Element | null {
  const loadPass = useArch((s) => s.loadPass);
  const enrich = useArch((s) => s.enrich);
  const enriching = useArch((s) => s.enriching);
  const drafting = useArch((s) => s.drafting);
  const entry = useArch((s) =>
    repoPath === null ? null : (s.passes[repoPath] ?? null)
  );
  useEffect(() => {
    if (repoPath !== null) void loadPass(repoPath);
  }, [repoPath, loadPass]);

  if (repoPath === null || !passAvailable()) return null;

  const status = entry?.status ?? null;
  const chosen = status?.chosen ?? false;
  const running = enriching || status?.running === true;
  const lead =
    status === null ? null : passLead(status, entry?.refusal ?? null);
  const detail = status === null ? null : passDetail(status);
  const run = status?.lastRun ?? null;
  const painted = run === null ? null : paintedSentence(run);
  const suggestions = run?.suggestions ?? [];
  const offSentence = passSentence(true, chosen);

  return (
    <section className="arch-pass" aria-label={ARCH_PASS_TITLE}>
      <div className="section-header">
        <span className="section-toggle">{ARCH_PASS_TITLE}</span>
        {running ? (
          // VISUAL STATE OVER WORDS (the copy ruling): the header spins
          // while the agent runs, the same modifier the SCM run row uses.
          <Codicon name="sync" size={12} className="codicon-modifier-spin" />
        ) : null}
      </div>
      {!chosen ? (
        <p className="arch-note arch-note-inline">{offSentence}</p>
      ) : (
        <>
          {lead !== null ? (
            <p className="arch-note arch-note-inline">{lead}</p>
          ) : null}
          {detail !== null ? (
            // PLAIN TEXT: the sentence quotes the model's answer by field.
            <p className="arch-note arch-note-inline arch-pass-detail">
              {detail}
            </p>
          ) : null}
          {painted !== null ? (
            <p className="arch-note arch-note-inline">{painted}</p>
          ) : null}
          <button
            type="button"
            className="arch-empty-action arch-pass-run"
            disabled={running || drafting}
            title={ARCH_ENRICH_BODY}
            onClick={() => void enrich()}
          >
            <Codicon name="sparkle" size={14} />
            <span className="arch-empty-action-title">{ARCH_ENRICH_TITLE}</span>
          </button>
          {suggestions.length > 0 ? (
            <div className="arch-pass-suggestions">
              <p className="arch-note arch-note-inline">
                {`${ARCH_PASS_SUGGESTIONS} · ${ARCH_PASS_SUGGESTIONS_NOTE}`}
              </p>
              <ul>
                {suggestions.map((sentence, i) => (
                  // PLAIN TEXT, the prose panel's own rule: these sentences
                  // came out of a model's answer and render as text nodes.
                  <li key={`${String(i)}:${sentence.slice(0, 24)}`}>
                    {sentence}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

/**
 * THE ACCEPT CONTROL on one failing row (Phase 158, the operator's
 * amendment). The decision and the reason are the person's; the typing is
 * not. The button opens a small reason form, the write stays disabled until
 * the reason is non-empty, and the submit asks main to append one validated
 * row to `docs/arch/baseline.json`. A refused write says main's own sentence
 * on the row rather than vanishing.
 */
export function AcceptDivergence({
  edgeId,
  fromPath,
  toPath
}: {
  edgeId: string | undefined;
  fromPath: string;
  toPath: string;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [because, setBecause] = useState('');
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const accept = useArch((s) => s.acceptDivergence);

  if (!open) {
    return (
      <button
        type="button"
        className="arch-accept-open"
        title={ARCH_ACCEPT_BODY}
        onClick={() => setOpen(true)}
      >
        {ARCH_ACCEPT_TITLE}
      </button>
    );
  }
  return (
    <form
      className="arch-accept"
      onSubmit={(e) => {
        e.preventDefault();
        if (busy || because.trim().length === 0) return;
        setBusy(true);
        setRefused(null);
        void accept(
          edgeId === undefined
            ? { fromPath, toPath, because: because.trim() }
            : { edgeId, fromPath, toPath, because: because.trim() }
        ).then((result) => {
          setBusy(false);
          if (result.ok) {
            setOpen(false);
            setBecause('');
          } else {
            setRefused(result.reason);
          }
        });
      }}
    >
      <input
        className="arch-accept-input"
        type="text"
        value={because}
        maxLength={ARCH_LIMITS.maxBecause}
        placeholder={ARCH_ACCEPT_REASON_LABEL}
        aria-label={ARCH_ACCEPT_REASON_LABEL}
        onChange={(e) => setBecause(e.target.value)}
      />
      <button
        type="submit"
        className="arch-accept-write"
        disabled={busy || because.trim().length === 0}
        title={ARCH_ACCEPT_BODY}
      >
        {ARCH_ACCEPT_WRITE}
      </button>
      {refused !== null ? (
        <p className="arch-accept-refused">{refused}</p>
      ) : null}
    </form>
  );
}
