/**
 * `arch:map` — the level 1 map of any repository, contract or none (Phase 160).
 *
 * ## The reorientation this channel carries
 *
 * The operator's ruling of 2026-08-27: the map is the product and the contract
 * is annotation on it. So this read answers for EVERY repository, with no
 * gesture, no draft step, no agent and zero tokens. The grouping is the
 * skeleton's own deterministic 5 to 9 parts, the edges are the resolved
 * file-to-file imports rolled up group to group, and a contract, when one
 * exists, overlays the same picture rather than replacing it.
 *
 * ## No second scan, stated as a property
 *
 * The map reads the SAME fact base the checkers read, out of `arch.db`. What
 * Phase 160 changed is that the fact base now exists for a repository with no
 * contract: the check runner grew a fact-only leg that scans and stops, so
 * both readers share one scanner and one stamp table. This channel itself
 * never parses a file. Its one process is the fixed `git ls-files -z` argv the
 * arch guard already composes, so the tracked list the boxes are drawn from is
 * the list the anchors are matched against.
 *
 * ## Never a frozen pane
 *
 * The one-time cold scan on a large repository takes seconds, so this read
 * NEVER waits for it. It answers with whatever the fact base holds right now
 * plus `building: true` while the scan it kicked off is still owed, and the
 * `arch:mapUpdated` push says when to ask again. Every later open in the
 * app's life is the warm path, measured in milliseconds.
 *
 * ## What travels, and what deliberately does not
 *
 * Weight is information: a box carries its file count and an edge carries its
 * import count, because a mental model needs to know what is big and what
 * leans on what. NO COUNT IS EVER PINNED TO A BOX in the drawing; the numbers
 * here are sizing inputs, which is how the dashboard refusal survives. The
 * unresolved counts travel per group so the honest grey of Phase 63 can say
 * "this part's language resolved nothing" on the face of the box.
 *
 * MAIN: src/main/arch/map.ts composes the model, src/main/arch/ipc.ts is the
 * registrar. The channel itself is declared in ./arch.ts in
 * `ArchInvokeChannelMap`, the arch-modules precedent: one arch surface, one
 * map, one bridge object.
 */

import type {
  ArchCoverageCounts,
  ArchProvenance,
  ArchVerdictStatus
} from '../arch';

/** The three bands the skeleton computes, top of the drawing to the bottom. */
export type ArchMapBand = 'surface' | 'engine' | 'foundation';

/** One box of the level 1 drawing. */
export interface ArchMapGroup {
  /**
   * The machine identity, the skeleton's own kebab-case group id. It is stable
   * for the same tree whatever the contract says, so the drill and the overlay
   * can never change what a box IS, only what it is called.
   */
  id: string;
  /** The directory the box stands for, repository relative. */
  dir: string;
  /**
   * What the box says on its face: the directory, or the person's own
   * component name when the contract's anchors land dominantly in this box.
   */
  label: string;
  /**
   * The contract component whose name the box wears, or null when the box is
   * computed only. A component that spans several boxes, or matches nothing,
   * paints NO box: disagreement stays visible in the cockpit rather than being
   * blended into the picture.
   */
  componentId: string | null;
  /**
   * The purpose sentence the box carries on its hover (Phase 158): the first
   * sentence of the painting component's description, or null when the box is
   * computed only or the description is empty. What a part is FOR is readable
   * from the picture itself, and the hover is the chosen surface because the
   * emitted markup stays deterministic, so a gate can prove the sentence is
   * on the box without a pointer or a photograph.
   */
  description: string | null;
  band: ArchMapBand;
  provenance: ArchProvenance;
  /** How many tracked files sit in this box. The box's visual weight. */
  fileCount: number;
  /** Imports written in this box's files, the honest denominator. */
  totalImports: number;
  /** Of those, the ones that resolved to a tracked file. */
  resolvedImports: number;
  /** Of those, the ones that name a dependency. A definite answer, not a miss. */
  externalImports: number;
  /**
   * Of those, the ones nobody could follow. A box where this is the whole
   * story draws in the honest grey, because a missing edge and an edge nobody
   * could follow must never look the same.
   */
  unresolvedImports: number;
  /**
   * THE READING (Phase 201, research 77 section 4). Five fields, every one a
   * fact the scan or one read of the tree produced, so a box can say what it
   * is without a model and without a contract.
   */
  /** Language buckets by file count, most first. Drawn behind the hover. */
  languages: ArchMapLanguage[];
  /** Lines across every file in the box, from one read of the tree. */
  lines: number;
  /** Files that are an entry by name, shallowest first, at most four. */
  entries: string[];
  /**
   * Rule S without its name: `SIZE, LANGUAGE; MADE OF; WIRING; ENTRY.` One
   * sentence of 16 to 31 words, drawn on the face under the label. It is
   * true of imports only and says nothing a person has to take on trust.
   */
  sentence: string;
  /**
   * The ten hover lines in their fixed order, each left out when it has
   * nothing to say: size, languages, definitions, declared names, entries,
   * imports, used by, uses, folders, also holds. Prose, never a badge.
   */
  facts: string[];
}

/** One language bucket of a box: the bucket's name and how many files wear it. */
export interface ArchMapLanguage {
  name: string;
  files: number;
}

/** One aggregated edge: files in `from` import files in `to`, `count` times. */
export interface ArchMapEdge {
  /** Group id, never a component id. */
  from: string;
  /** Group id, never a component id. */
  to: string;
  /** How many resolved imports cross this pair. The edge's visual weight. */
  count: number;
  /**
   * The verdict riding this edge, when the contract judged a promise between
   * the two components overlaid on its endpoints. Null on a computed-only
   * edge. Where several promises are judged between the same pair, the worst
   * status wins, so a broken promise can never hide behind a held one.
   */
  status: ArchVerdictStatus | null;
  /** The contract promise the status came from, or null. */
  edgeId: string | null;
}

/** The picture itself, pure over the fact base. Same facts, same bytes. */
export interface ArchMapModel {
  /** The one line above the drawing, the repository's own name. */
  subject: string;
  /**
   * Rule R, the repository line (Phase 201): the subject, its size and
   * language, how many parts, the biggest and its share, the connections
   * between parts, and how many imports lead inside the repository. About
   * 23 words, from the code alone.
   */
  sentence: string;
  /**
   * The boxes rule P draws, sorted by id: seeds or top level directories,
   * split while one holds more than half the parsed files, small ones folded
   * into `other`, capped at twelve boxes of no source. Five to nine before
   * Phase 201; up to thirteen since, because a box of source never folds for
   * the count.
   */
  groups: ArchMapGroup[];
  /** Every cross-group edge, unsliced, heaviest first. */
  edges: ArchMapEdge[];
  /** Every tracked file at HEAD, the denominator the box weights sit under. */
  fileCount: number;
  /** Every import in the fact base, resolved or not. */
  totalImports: number;
  /** Imports that resolved to a tracked file. */
  resolvedImports: number;
  /** Imports nobody could follow, repository wide. */
  unresolvedImports: number;
  /** True when a loadable contract overlays this picture. */
  contractPresent: boolean;
}

/** The map is asked about ONE repository, by its absolute path. */
export interface ArchMapInput {
  cwd: string;
}

/**
 * What the map read answers.
 *
 * `building` is true while the fact base for this repository is still being
 * scanned for the first time. The model is still whatever the store already
 * holds, which may be empty, and the `arch:mapUpdated` push follows when the
 * scan lands. The read itself NEVER waits on a scan.
 */
export interface ArchMapResult extends ArchMapModel {
  cwd: string;
  building: boolean;
  /** The commit the fact base was scanned at, or null before any scan. */
  scannedAtCommit: string | null;
}

/**
 * Main → renderer: the fact base behind one repository's map moved, either
 * because a scan finished or because a check republished verdicts. The view
 * asks `arch:map` again; nothing heavy travels on the event itself.
 */
export const EVT_ARCH_MAP_UPDATED = 'arch:mapUpdated' as const;

/** What moved. */
export interface ArchMapUpdatedEvent {
  cwd: string;
  /** The commit the fact base is now scanned at, or null when still partial. */
  scannedAtCommit: string | null;
}

// ---------------------------------------------------------------------------
// The drilled part (Phase 161)
// ---------------------------------------------------------------------------


/**
 * `arch:mapPart` — one level 1 part opened up: its modules as a map of the
 * same kind, with the crossing edges to the rest of the repository kept at
 * the frame so context is never lost (Phase 161).
 *
 * The modules are computed the way the level 1 boxes are: the part's files
 * grouped by the next directory level under the part's own directory,
 * descending one level at a time exactly as the level 1 grouping does until
 * there are enough boxes to be worth drawing, then folded to the same target
 * by the same rank and merge. Weight, band, provenance and the honest grey
 * denominators carry the SAME encoding as level 1, and the boxes reuse
 * {@link ArchMapGroup} whole so one renderer draws both levels.
 *
 * Everything is composed in MAIN over the SAME fact base as level 1: no file
 * list travels, no second scan exists, and recomposing the level 1 partition
 * inside the scoped read is what resolves the drilled group id without
 * shipping state across the wire.
 */

/**
 * One crossing edge at the frame: an interior module and a level 1 part
 * outside the drilled one, with the direction and the count.
 *
 * The outside part keeps its id AND its face label, the overlay name where
 * one is painted, so the frame stub names a real thing and context survives
 * the drill.
 */
export interface ArchMapCrossing {
  /** The interior module the edge touches, an id out of `modules`. */
  moduleId: string;
  /** The level 1 group id of the outside part. Never a component id. */
  outsideId: string;
  /** What the outside box says on its face at level 1. */
  outsideLabel: string;
  /** The outside part's band, so the frame can place surface up and foundation down. */
  outsideBand: ArchMapBand;
  /**
   * `out` when the module imports the outside part, `in` when the outside
   * part imports the module.
   */
  direction: 'in' | 'out';
  /** How many resolved imports cross, the stub's visual weight. */
  count: number;
}

/** The scoped picture. Pure over the fact base. Same facts, same bytes. */
export interface ArchMapPartModel {
  /** The drilled part's machine identity, as asked. */
  groupId: string;
  /** The directory the part stands for, '' when the part is not known. */
  groupDir: string;
  /** The part's face label at level 1, the overlay name where painted. */
  groupLabel: string;
  /** The contract component painting the part at level 1, or null. */
  componentId: string | null;
  /**
   * False when no group of the CURRENT level 1 partition carries `groupId`,
   * because the facts moved under the drill. Every list is then empty, and
   * the caller pops the drill rather than drawing a scope that is not there.
   */
  known: boolean;
  /**
   * The part's modules, the same box shape level 1 draws. `componentId` is
   * non null on a module when a contract component holds a strict majority
   * of its files inside that one module, the level 1 overlay rule reused.
   */
  modules: ArchMapGroup[];
  /** Module to module edges inside the part, the level 1 edge shape reused. */
  edges: ArchMapEdge[];
  /** The frame: edges with exactly one end inside the part, aggregated. */
  crossings: ArchMapCrossing[];
  /** Tracked files in the drilled part. */
  fileCount: number;
  /** Imports written in the part's files, the honest denominator. */
  totalImports: number;
  /** Of those, the ones that resolved to a tracked file. */
  resolvedImports: number;
  /** Of those, the ones nobody could follow. */
  unresolvedImports: number;
  /**
   * The verdict strip's counts scoped to this part, computed in main so the
   * pane never does count arithmetic of its own. The import denominators are
   * the part's own. `accepted` is re-derived from the baseline over the
   * stored offences, because the stored verdict row does not carry the flag.
   */
  counts: ArchCoverageCounts;
  /**
   * The subject ids in scope, sorted. A verdict is in scope when a strict
   * majority of its component's files sit inside the drilled part, or when
   * it judges a promise either end of which maps in. The failure list
   * filters by membership in this set.
   */
  subjectIds: string[];
  /** True when a loadable contract overlays the repository. */
  contractPresent: boolean;
}

/** The scoped map is asked about ONE part of ONE repository. */
export interface ArchMapPartInput {
  cwd: string;
  /** The level 1 group id a person clicked. */
  groupId: string;
}

/**
 * What the scoped read answers. The same envelope as {@link ArchMapResult}:
 * `building` while the cold scan is still owed, and the read NEVER waits on
 * a scan.
 */
export interface ArchMapPartResult extends ArchMapPartModel {
  cwd: string;
  building: boolean;
  /** The commit the fact base was scanned at, or null before any scan. */
  scannedAtCommit: string | null;
}

// ---------------------------------------------------------------------------
// The canvas (Phase 162): camera state and kept layout
// ---------------------------------------------------------------------------

/**
 * Phase 162 gives the map a camera and a layout that stays where a person
 * left it. Both persist in `arch.db`, the DISPOSABLE side of the standing
 * contract: losing the file costs a re-layout and nothing else, exactly the
 * doctrine the database's own header states. Nothing here touches the
 * manifest, a session or any file in the person's repository.
 *
 * SCOPE is the drill rung the state belongs to: `root` for the whole map and
 * `part:<groupId>` for one drilled part, so each level keeps its own camera
 * and its own kept positions. Level 3 is a file list, not a drawing, and has
 * no canvas state.
 *
 * The writes REPLACE WHOLE: a camera write replaces the scope's camera and a
 * layout write replaces every kept position in the scope in one transaction.
 * Existing nodes keep their stored positions across re-reads; a node new to
 * the facts simply has no row and is laid out around the kept ones; and
 * re-layout is an EXPLICIT act (`arch:clearLayout`) that drops the scope's
 * rows so the next draw computes fresh. An invalid value (a non-finite
 * number, an over-long id) refuses the WHOLE write with `ok: false` rather
 * than persisting half a picture.
 */

/** The camera at rest over one scope: scale, then translate. */
export interface ArchCameraState {
  /** The zoom factor. Finite and positive, or the row is dropped whole. */
  k: number;
  /** Translation, screen pixels, applied after the scale. */
  x: number;
  y: number;
}

/** One kept node position, in the scene's own coordinate space. */
export interface ArchNodePosition {
  /** The group or module id the position belongs to. */
  nodeId: string;
  x: number;
  y: number;
}

/** The whole-map scope. */
export const ARCH_CANVAS_ROOT_SCOPE = 'root' as const;

/** The scope one drilled part's canvas state lives under. */
export function archCanvasPartScope(groupId: string): string {
  return `part:${groupId}`;
}

/** One scope of one repository, the key every canvas call carries. */
export interface ArchCanvasStateInput {
  cwd: string;
  scope: string;
}

/** What the one canvas read answers: both halves in one round trip. */
export interface ArchCanvasStateResult {
  cwd: string;
  scope: string;
  /** The kept camera, or null when none was ever saved for this scope. */
  camera: ArchCameraState | null;
  /** The kept positions, empty when the scope has no stored layout. */
  positions: ArchNodePosition[];
}

/** Save the scope's camera. Written at rest, never per frame. */
export interface ArchSetCameraInput {
  cwd: string;
  scope: string;
  camera: ArchCameraState;
}

/** Replace the scope's kept layout whole, in one transaction. */
export interface ArchSetLayoutInput {
  cwd: string;
  scope: string;
  positions: ArchNodePosition[];
}

/** Drop the scope's kept layout: re-layout as an explicit act. */
export interface ArchClearLayoutInput {
  cwd: string;
  scope: string;
}

/**
 * Whether a canvas write was kept. `ok: false` means the write was refused
 * whole, with the refusing field named, never a partial merge.
 */
export interface ArchCanvasWriteResult {
  ok: boolean;
  /** One sentence naming the field and the reason, when refused. */
  reason: string | null;
}
