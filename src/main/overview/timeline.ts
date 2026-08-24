/**
 * The story a session told, version by version (Phase 143).
 *
 * Phase 138's `summary` table already holds every fold a session ever had,
 * appended and never edited. This module turns those rows into the two things
 * the one session view draws, and it is the only place the rules live, so a
 * test can prove them without React and the page cannot reach a different
 * answer.
 *
 * The rules, and every one of them is decided here:
 * - Only versions the fold KEPT are drawn. A refused fold and a failed fold
 *   carry no sentence at all, so there is nothing on them for a person to
 *   read. They stay on record and their only mark is the coverage flag below.
 * - Two versions that follow each other and say exactly the same thing become
 *   ONE drawn row, carrying the later writing time. Collapsing repeats, so
 *   three identical versions become one row. A summary rewritten as the
 *   session grows starts at the same turn every time, and those versions
 *   collapse the same way a chain of separate stretches does. They join ONLY
 *   when joining loses nothing, which means the same harness and model wrote
 *   both, no turns between them are missing from the story, and the later
 *   version starts no earlier than the row above starts and no later than one
 *   turn past where it ends. That last pair keeps the joined row's range to
 *   turns its own versions really covered. When any of those is not so the two
 *   versions stay two rows, because the row that would be dropped is the only
 *   place the difference could be said.
 * - A row says turns before it are missing from the story when its first turn
 *   sits past the furthest turn any earlier version reached, or, for the
 *   oldest row, when the session's opening turns were never covered. That
 *   watermark only ever moves forward, so a version covering ground an earlier
 *   one already covered cannot make a later row claim a break that is not
 *   there.
 * - When every drawn row was written by the same harness and model, no row
 *   names a model. When any two differ, every row names its own. That is one
 *   boolean on the wire, decided once.
 *
 * What the table cannot tell this module, stated plainly because the entry
 * asked for a rebuilt chain to say so on its own row. There is no field that
 * marks one. `summary.parent_version` looks like it would, and it is carried
 * on `StoredSummary`, but `appendSummary` always sets it to the newest kept
 * row of that session, so a chain that was thrown away and built again gets
 * the same unbroken parent line as one that never was. The only shape a
 * rebuild could leave is a version whose range reaches back over ground an
 * earlier version already covered, and the shipped fold cannot write one: its
 * floor in src/main/sessions/fold-wiring.ts is the newest row's last turn,
 * whatever that row's verdict, so every range starts above every range before
 * it. There is a second writer of `appendSummary`, being the harness seed in
 * src/main/harness/summary-seed.ts, and it passes the ranges it is handed
 * straight through with no floor at all. Its own refusal, the function
 * `summarySeedRefusal` in that file, keeps it to an isolated harness launch
 * whose profile directory sits under the harness directory, so it can write
 * such a row into a probe's store and never into a person's. Either way such
 * a row is handled rather than announced, being folded into the watermark
 * above so it can never make a later row lie, and being kept out of the join
 * below so it can never be dropped either. Saying more would need a new
 * column, and this phase adds none.
 *
 * What this module never does: it spawns no model, it runs no git command, it
 * writes nothing, and it sets no session status. Both functions are SELECTs
 * against tables Tortie already wrote, and everything after the SELECT is
 * arithmetic.
 */

import type {
  OverviewTimeline,
  OverviewTimelineEntry,
  OverviewTimelineTurnsInput,
  OverviewTurnView
} from '@shared/overview';
import { MAX_TURN_LIMIT, toTurnView } from './turn-view';
import type { StoredSummary, StoredTurn } from './store';

/**
 * The two reads this module needs. The overview store satisfies it, and a
 * test satisfies it with a plain object, which is why the shape is named here
 * rather than the whole store being taken.
 */
export interface TimelineSource {
  listSummaries(sessionId: string): StoredSummary[];
  listTurnsBetween(
    sessionId: string,
    fromTurn: number,
    toTurn: number,
    limit?: number
  ): StoredTurn[];
}

/** Nothing is writing these, so there is nothing to list. */
function nothingChosen(sessionId: string): OverviewTimeline {
  return { sessionId, entries: [], chosen: false, modelChanged: false };
}

/**
 * One session's story, newest first.
 *
 * `chosen` is the person's own setting, handed in by the registrar the same
 * way the project read is handed it. When nothing is chosen this answers with
 * an empty list and reads no rows at all, and the page says in one line that
 * no model is writing these rather than drawing an empty list.
 */
export function buildTimeline(
  source: TimelineSource,
  sessionId: string,
  chosen: boolean
): OverviewTimeline {
  if (!chosen) return nothingChosen(sessionId);

  // Oldest first, so the walk below reads the way the session happened. The
  // reverse at the end is what puts the newest row on top.
  const kept = source
    .listSummaries(sessionId)
    .filter(
      (row) => row.verdict === 'kept' && row.text !== null && row.text !== ''
    );

  const entries: OverviewTimelineEntry[] = [];
  // The furthest turn any kept version has reached so far. Null until the
  // first one. It never moves backwards, so a version that covers ground an
  // earlier one already covered leaves it where it was.
  let coveredTo: number | null = null;

  for (const row of kept) {
    const text = row.text ?? '';
    // The coverage mark is taken BEFORE the join below, against every version
    // that came before this one in the chain. That is the same answer as
    // taking it against the previous DRAWN row, because a joined row starts
    // where its earliest member started.
    const gapBefore =
      coveredTo === null ? row.fromTurn > 0 : row.fromTurn > coveredTo + 1;
    const previous = entries.at(-1);
    // A fold that changed nothing is not news, so it joins the row above it.
    // It joins ONLY when the join loses nothing a person needs: the same
    // sentence, written by the same harness and model, with no turns missing
    // between the two versions, and starting no earlier than the row above
    // starts and no later than one turn past where it ends. That last pair of
    // questions is about the RANGE the joined row would then carry, and it is
    // deliberately not "starts past everything the row above covers", because
    // a summary that is rewritten as the session grows starts at the same turn
    // every time, which is the commonest chain there is, and that reading left
    // every version of it as its own row. A repeat that straddles a break
    // stays its own row so the break is still said, a repeat written by a
    // different model stays its own row so both models are still named, a
    // repeat that starts before the row above stays its own row because the
    // joined row would keep the earlier start and hide that the later version
    // covered the ground before it, and a repeat that starts more than one
    // turn past the row above's end stays its own row because the joined row
    // would otherwise cover turns neither of its own versions ever wrote about.
    const joins =
      previous !== undefined &&
      previous.text === text &&
      previous.harness === row.harness &&
      previous.model === row.model &&
      !gapBefore &&
      row.fromTurn >= previous.fromTurn &&
      row.fromTurn <= previous.toTurn + 1;
    if (previous !== undefined && joins) {
      // The row keeps the earlier start and takes the later end and the later
      // time. The end is a maximum rather than an assignment, for the same
      // reason the watermark below is.
      previous.toTurn = Math.max(previous.toTurn, row.toTurn);
      previous.writtenAt = row.writtenAt;
      previous.repeated = true;
    } else {
      entries.push({
        text,
        writtenAt: row.writtenAt,
        fromTurn: row.fromTurn,
        toTurn: row.toTurn,
        harness: row.harness,
        model: row.model,
        repeated: false,
        gapBefore
      });
    }
    coveredTo =
      coveredTo === null ? row.toTurn : Math.max(coveredTo, row.toTurn);
  }

  // Decided once, over the rows a person will actually see. A pair that only
  // ever appeared on a refused version never reaches this count, and no kept
  // pair is lost on the way here, because a repeat only joins the row above it
  // when the same pair wrote both.
  const pairs = new Set(
    entries.map((entry) => `${entry.harness} ${entry.model}`)
  );
  entries.reverse();

  return {
    sessionId,
    entries,
    chosen: true,
    modelChanged: pairs.size > 1
  };
}

/**
 * The turns one drawn row covers, oldest first.
 *
 * The git mark comes from the STORED verdict on the turn, written when the
 * page last read this session, so nothing here runs a git command. A turn
 * that was never marked answers `nothing-to-check`, which is what the views
 * already draw for a turn with no evidence either way.
 *
 * `namedOnlyOutside` is false on every turn here. It is a judgement about the
 * project a turn's paths sit in, the read path computes it against the open
 * project, and this read is given a session rather than a project.
 *
 * One drawn row can cover a very wide range, so the read is held to the same
 * ceiling the page's own turn read uses and it takes the NEWEST turns of the
 * range.
 */
export function timelineTurns(
  source: TimelineSource,
  input: OverviewTimelineTurnsInput
): OverviewTurnView[] {
  const turns = source.listTurnsBetween(
    input.sessionId,
    input.fromTurn,
    input.toTurn,
    MAX_TURN_LIMIT
  );
  // The STORED verdict, because this read runs no git command. The last
  // field is false on every turn for the same reason: whether a turn named
  // files only outside the project is a judgement about a project, and this
  // read is given a session.
  return turns
    .slice(-MAX_TURN_LIMIT)
    .map((turn) =>
      toTurnView(turn, turn.gitVerdict ?? 'nothing-to-check', false)
    );
}
