/**
 * The story panel's own state (Phase 143).
 *
 * The Catch Me Up slice in ../state/overview-slice.ts is NOT touched. This is
 * a module scope external store of its own, read with useSyncExternalStore the
 * way AskRail.tsx reads the ask rail's, because the story is a second surface
 * inside one view rather than a second page.
 *
 * Two reads reach main, being the story of one session and the turns behind
 * one of its sentences. Both are feature detected together, the way the slice
 * detects its own two reads, so a build without the reader says one sentence
 * rather than throwing.
 *
 * The store is cleared when the session under the panel changes and when the
 * panel closes, so a cursor can never outlive the rows it was counting.
 *
 * Nothing here sets a session's status and nothing here spawns anything. Both
 * channels are a SELECT against a table that is already written.
 */

import type { OverviewTimeline, OverviewTurnView } from '@shared/overview';
import { gmuxBridge } from '../bridge';
import { STORY_BRIDGE_MISSING, STORY_TURNS_UNREADABLE } from './copy';

/** One entry of the drawn list, as main hands it over. */
export type StoryEntry = OverviewTimeline['entries'][number];

export interface StoryState {
  /** True while the panel stands in for the conversation. */
  open: boolean;
  /** The session the panel belongs to. A different one clears everything. */
  sessionId: string | null;
  /** True while the story is being read. */
  loading: boolean;
  /** What main answered, or null before the first answer. */
  timeline: OverviewTimeline | null;
  /** One sentence when the read failed. */
  error: string | null;
  /** The row the keyboard is on, by position in the drawn list. */
  cursor: number;
  /** The row whose turns are drawn under it, or null when none is. */
  expanded: number | null;
  /** The turns of the expanded row, or null while they are being read. */
  turns: OverviewTurnView[] | null;
  /** One sentence when those turns could not be read. */
  turnsError: string | null;
}

const CLOSED: StoryState = {
  open: false,
  sessionId: null,
  loading: false,
  timeline: null,
  error: null,
  cursor: 0,
  expanded: null,
  turns: null,
  turnsError: null
};

let state: StoryState = CLOSED;
const listeners = new Set<() => void>();

/**
 * A read that finishes for an older token is dropped. One panel is open at a
 * time, so a plain counter is enough.
 */
let token = 0;

function publish(next: StoryState): void {
  state = next;
  for (const listener of listeners) listener();
}

/** For useSyncExternalStore in SessionConversation.tsx. */
export function subscribeStory(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The stable snapshot useSyncExternalStore reads, on both sides of render. */
export function storySnapshot(): StoryState {
  return state;
}

/**
 * What the two reads look like on the bridge. The shape is written out here
 * rather than imported, so the detection below is a real question about the
 * object the preload installed rather than a promise the compiler made.
 */
interface StoryBridge {
  timeline(sessionId: string): Promise<OverviewTimeline>;
  timelineTurns(input: {
    sessionId: string;
    fromTurn: number;
    toTurn: number;
  }): Promise<OverviewTurnView[]>;
}

function storyBridge(): StoryBridge | undefined {
  const extras: unknown = gmuxBridge()?.overview;
  if (extras === null || typeof extras !== 'object') return undefined;
  const surface = extras as Partial<StoryBridge>;
  return typeof surface.timeline === 'function' &&
    typeof surface.timelineTurns === 'function'
    ? (surface as StoryBridge)
    : undefined;
}

/** How many rows the list draws right now. */
function rowCount(): number {
  return state.timeline?.entries.length ?? 0;
}

function clamp(index: number, count: number): number {
  return Math.min(count - 1, Math.max(0, index));
}

/**
 * True when a pressed row covered more turns than main handed back, which is
 * how a very wide stretch tells the reader that only its newest turns are
 * drawn. The arithmetic lives here rather than in the view, because the view
 * may hold no digit of its own.
 */
export function storyTurnsClipped(
  entry: StoryEntry,
  turns: OverviewTurnView[]
): boolean {
  return turns.length > 0 && turns.length < entry.toTurn - entry.fromTurn + 1;
}

/**
 * The conversation view says which session it is drawing on every mount. A
 * different session closes the panel and drops everything, because a story
 * belongs to exactly one session.
 */
export function noteStorySession(sessionId: string): void {
  if (state.sessionId === sessionId) return;
  token += 1;
  publish({ ...CLOSED, sessionId });
}

/** The header's press target. Opening reads the story again. */
export function toggleStory(sessionId: string): void {
  if (state.open && state.sessionId === sessionId) {
    closeStory();
    return;
  }
  token += 1;
  const mine = token;
  publish({
    ...CLOSED,
    sessionId,
    open: true,
    loading: true
  });
  void readStory(sessionId, mine);
}

/** The way back to the conversation. The selection behind it is untouched. */
export function closeStory(): void {
  token += 1;
  publish({ ...CLOSED, sessionId: state.sessionId });
}

async function readStory(sessionId: string, mine: number): Promise<void> {
  const bridge = storyBridge();
  if (bridge === undefined) {
    if (mine === token) {
      publish({ ...state, loading: false, error: STORY_BRIDGE_MISSING });
    }
    return;
  }
  try {
    const timeline = await bridge.timeline(sessionId);
    if (mine !== token) return;
    publish({ ...state, loading: false, timeline, error: null });
  } catch (err) {
    if (mine !== token) return;
    const detail = err instanceof Error ? err.message : String(err);
    publish({ ...state, loading: false, error: detail });
  }
}

/**
 * The arrows, while the panel is open.
 *
 * `from` is the row the keyboard is on, when it is on one. The walk starts
 * there rather than from the highlight, so a person who stepped onto a row
 * with Tab walks away from the row they are standing on. Without it the two
 * could start apart and the first arrow would jump.
 */
export function moveStoryCursor(delta: number, from?: number): void {
  const count = rowCount();
  if (count === 0) return;
  const start = from === undefined ? state.cursor : clamp(from, count);
  publish({ ...state, cursor: clamp(start + delta, count) });
}

/**
 * Tab stepped onto a row, so the highlight goes there too.
 *
 * A row can hold the keyboard on its own, and Return on a row is answered by
 * that row. If the highlight stayed where it was, the row a person is standing
 * on and the row the arrows would walk from would be two different rows. This
 * is the one seam that keeps them one row, and it is a no-op when they already
 * agree, so the focus the panel itself moves cannot loop.
 */
export function setStoryCursor(index: number): void {
  const count = rowCount();
  if (count === 0) return;
  const target = clamp(index, count);
  if (state.cursor === target) return;
  publish({ ...state, cursor: target });
}

/**
 * A press on one row, from the pointer or from Return. Pressing the row that
 * is already open closes it, so one row is expanded at a time.
 */
export function pressStoryRow(index: number): void {
  const count = rowCount();
  if (count === 0) return;
  const target = clamp(index, count);
  if (state.expanded === target) {
    token += 1;
    publish({
      ...state,
      cursor: target,
      expanded: null,
      turns: null,
      turnsError: null
    });
    return;
  }
  const entry = state.timeline?.entries[target];
  if (entry === undefined) return;
  token += 1;
  const mine = token;
  publish({
    ...state,
    cursor: target,
    expanded: target,
    turns: null,
    turnsError: null
  });
  void readStoryTurns(entry, mine);
}

async function readStoryTurns(entry: StoryEntry, mine: number): Promise<void> {
  const sessionId = state.sessionId;
  const bridge = storyBridge();
  if (sessionId === null) return;
  if (bridge === undefined) {
    if (mine === token) {
      publish({ ...state, turns: [], turnsError: STORY_BRIDGE_MISSING });
    }
    return;
  }
  try {
    const turns = await bridge.timelineTurns({
      sessionId,
      fromTurn: entry.fromTurn,
      toTurn: entry.toTurn
    });
    if (mine !== token) return;
    publish({ ...state, turns, turnsError: null });
  } catch {
    if (mine !== token) return;
    publish({ ...state, turns: [], turnsError: STORY_TURNS_UNREADABLE });
  }
}

/**
 * Asked by the Escape ladder in ../app/keyboard.ts, immediately before it asks
 * the ask rail. True exactly when the panel was open and this press closed it,
 * so Escape steps out of the story before it steps out of the page.
 */
export function storyTookEscape(): boolean {
  if (!state.open) return false;
  closeStory();
  return true;
}
