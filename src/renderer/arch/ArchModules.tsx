/**
 * LEVEL 2, the computed view of one part (Phase 64, research 49 section 7).
 *
 * ## What a person sees, and what they are looking at
 *
 * Everything above this section in the Architecture view is prose somebody
 * wrote, with a verdict beside it. This section is the other half: the files
 * that part actually holds, and which of them import which. Nobody wrote any of
 * it. Research 49 section 9.6's node table calls a module "a filename inside a
 * component" and its own model column says "Computed at level 2, never
 * authored", so a contract cannot make this drawing say something the code does
 * not.
 *
 * ## Three drawings, and why there is more than one
 *
 * The field's own name for a drawing with too many crossing edges is the
 * hairball, and section 6.3 records both that Microsoft's own documentation
 * concedes it and that NDepend switched to a dependency matrix past "a few
 * dozens boxes". So:
 *
 *  - up to 30 files, one box each, in path order;
 *  - past that, the dependency matrix over the files that take part;
 *  - past 200 of those, the two lists that still say something.
 *
 * WHICH ONE IS DECIDED IN MAIN. `src/main/arch/modules.ts` grades the answer
 * and this file reads `result.grade`. There is no second copy of the rule here
 * to drift out of step with it.
 *
 * ## The divergence overlay
 *
 * A file that carries an offending line from a promise that broke or is missing
 * wears the same glyph, the same word and the same colour the failure list
 * gives it, and its lines are listed under it and jump. The flattening happens
 * in main and it is `divergences.ts`'s rule, so Source Control and this view
 * cannot disagree about what "this file broke a promise" means.
 *
 * ## The refusals this file is built on
 *
 *  - **No canvas and no rendering package.** The boxes are a list, the matrix
 *    is a CSS grid of marks, and this phase adds zero npm packages.
 *  - **No count badge on any node.** Every number is inside a sentence under
 *    the drawing. The two fallback lists are the one exception and their number
 *    is the content rather than a decoration, because an ordering with the
 *    degree hidden asks a person to take the ordering on trust.
 *  - **No layout persistence.** There is no arrangement to save and none to
 *    lose. The order is the path order, every time.
 *  - **No motion.** Nothing animates, nothing collapses on a timer.
 *  - **No amber.** That hue belongs to "an agent needs you" and nothing here is
 *    that. Every colour comes from `styles/tokens.css`.
 *  - **A cell is a mark, never a number.** Two files almost always name each
 *    other once, so a matrix of counts would be the digit 1 a thousand times.
 *
 * ## Why the DOM stays small at the matrix grade
 *
 * A 200 by 200 matrix has 40,000 positions and rendering an element for each
 * would be tens of thousands of nodes for a drawing that is almost all empty.
 * Only the marks are elements, placed by `grid-column` and `grid-row`, so the
 * node count follows the number of imports rather than the square of the number
 * of files.
 */

import React, { useEffect, useState } from 'react';
import type { ArchModulesResult } from '@shared/ipc';
import { Codicon } from '../icons';
import { requestOpenFile } from '../state/open-file';
import { unresolvedSentence, verdictWord } from './copy';
import { moduleKey, useArch } from './store';
import type { ArchModuleViewEntry } from './store';
import {
  ARCH_MODULE_FILES_EMPTY,
  ARCH_MODULE_FILES_NOTE,
  ARCH_MODULE_FILES_TITLE,
  ARCH_MODULES_EMPTY,
  ARCH_MODULES_IMPORTEES,
  ARCH_MODULES_IMPORTERS,
  ARCH_MODULES_LOADING,
  ARCH_MODULES_NOTE,
  ARCH_MODULES_NO_BRIDGE,
  ARCH_MODULES_TITLE,
  ARCH_MODULES_UNKNOWN,
  archModulesBridge,
  gradeSentence,
  gradeWord,
  isolatedSentence,
  moduleDir,
  moduleLabel,
  moduleFilesAvailable,
  rankSentence,
  unparsedSentence
} from './modules';
import './arch-modules.css';

/**
 * What the section is asked to draw.
 *
 * FROZEN IN THE PHASE 64 SPEC before any builder started, because the mount
 * point is owned by a different file than this component is. It takes plain
 * values rather than reading a store, so a test can render it and a probe can
 * drive it without the Architecture view around it.
 */
export interface ArchModulesProps {
  /** Absolute repository root. Null when the project is on another computer. */
  cwd: string | null;
  /** The part to draw, out of `docs/arch/components/`. */
  componentId: string | null;
  /** What to call it on screen, which is the contract's own name. */
  componentName: string;
  /**
   * Anything that should force a re-read, e.g. the last check's generation. A
   * new value re-asks main; the same value leaves the answer where it is.
   */
  refreshKey?: string | number;
}

export function ArchModules({
  cwd,
  componentId,
  componentName,
  refreshKey
}: ArchModulesProps): React.JSX.Element | null {
  const [result, setResult] = useState<ArchModulesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (cwd === null || componentId === null) {
      setResult(null);
      return undefined;
    }
    const api = archModulesBridge();
    if (api === null) {
      setResult(null);
      return undefined;
    }
    // A read that lands after the person has selected another part must not
    // draw. The flag is the whole guard, and it is the same shape the store's
    // own `sameTarget` check is.
    let live = true;
    setLoading(true);
    setFailed(null);
    void api.modules({ cwd, componentId }).then(
      (answer) => {
        if (!live) return;
        setResult(answer);
        setLoading(false);
      },
      (err: unknown) => {
        if (!live) return;
        setResult(null);
        setLoading(false);
        setFailed(
          err instanceof Error && err.message.length > 0
            ? err.message
            : 'The imports for this part could not be read.'
        );
      }
    );
    return () => {
      live = false;
    };
  }, [cwd, componentId, refreshKey]);

  if (cwd === null || componentId === null) return null;

  return (
    <section
      className="arch-modules"
      aria-label={`${ARCH_MODULES_TITLE}: ${componentName}`}
      // A part the contract does not have has no drawing, so it has no grade.
      // `computeArchModules` returns the default 'boxes' for an unknown part
      // because the field is not optional on the wire, and writing that word
      // here told a probe there were boxes on a section whose body reads "the
      // contract has no part with that name any more".
      data-grade={
        result === null ? 'none' : result.known ? result.grade : 'unknown'
      }
    >
      <div className="section-header">
        <span className="section-toggle">{ARCH_MODULES_TITLE}</span>
      </div>
      <p className="arch-note arch-note-inline">{ARCH_MODULES_NOTE}</p>
      <ArchModulesBody
        cwd={cwd}
        result={result}
        loading={loading}
        failed={failed}
        available={archModulesBridge() !== null}
      />
    </section>
  );
}

/**
 * Every state this section can be in, in the order a person meets them.
 *
 * EXPORTED, and it is the testable seam. This repository carries no jsdom, so a
 * renderer test draws components through `renderToStaticMarkup`, which never
 * runs an effect. Handing this the answer directly is what lets all three
 * drawings and every empty state be rendered and read as markup, rather than
 * only the sentence a component that has not fetched yet would show.
 */
export function ArchModulesBody({
  cwd,
  result,
  loading,
  failed,
  available,
  emptyText
}: {
  cwd: string;
  result: ArchModulesResult | null;
  loading: boolean;
  failed: string | null;
  available: boolean;
  /**
   * What an empty file set means HERE (Phase 161). The contract path keeps
   * its anchors sentence; the drilled path names the module folder instead,
   * because "this part anchors" would be false about a folder the drill
   * chose. One body, one override, zero copied lines.
   */
  emptyText?: string;
}): React.JSX.Element {
  if (!available) {
    return <p className="arch-note arch-note-inline">{ARCH_MODULES_NO_BRIDGE}</p>;
  }
  if (failed !== null) {
    return <p className="arch-modules-failed">{failed}</p>;
  }
  if (result === null) {
    // Loading and "not asked yet" read the same to a person, and both are
    // honest as one sentence. There is no spinner here and no blank panel.
    void loading;
    return <p className="arch-note arch-note-inline">{ARCH_MODULES_LOADING}</p>;
  }
  if (!result.known) {
    return <p className="arch-note arch-note-inline">{ARCH_MODULES_UNKNOWN}</p>;
  }
  if (result.fileCount === 0) {
    return (
      <p className="arch-note arch-note-inline">
        {emptyText ?? ARCH_MODULES_EMPTY}
      </p>
    );
  }
  return (
    <>
      <div className="arch-modules-body" data-drawing={gradeWord(result.grade)}>
        {result.grade === 'boxes' ? <Boxes cwd={cwd} result={result} /> : null}
        {result.grade === 'matrix' ? <Matrix cwd={cwd} result={result} /> : null}
        {result.grade === 'top' ? <Top cwd={cwd} result={result} /> : null}
      </div>
      <Sentences result={result} />
    </>
  );
}

/**
 * Everything countable, said once, under the drawing.
 *
 * This is where the refusal of a count badge is paid for. A person still needs
 * the numbers, so they are here in prose rather than pinned to a box, and the
 * unresolved sentence is the same one the verdict strip says, from the same
 * function, so the two can never give different denominators.
 */
function Sentences({ result }: { result: ArchModulesResult }): React.JSX.Element {
  const isolated =
    result.matrix === null ? null : isolatedSentence(result.matrix.isolated);
  const unresolved = unresolvedSentence(result.unresolved, result.totalImports);
  const unparsed = unparsedSentence(result.unparsed);
  return (
    <div className="arch-modules-sentences">
      <p>{gradeSentence(result)}</p>
      {isolated === null ? null : <p>{isolated}</p>}
      {unresolved === null ? null : <p>{unresolved}</p>}
      {unparsed === null ? null : <p>{unparsed}</p>}
    </div>
  );
}

/** Open one file, at a line when there is one to open it at. */
function open(cwd: string, relPath: string, line?: number): void {
  requestOpenFile({
    repoPath: cwd,
    relPath,
    path: `${cwd}/${relPath}`,
    mode: 'file',
    source: 'search',
    preview: false,
    ...(line === undefined ? {} : { selection: { line } })
  });
}

// ---------------------------------------------------------------------------
// Grade one: the boxes
// ---------------------------------------------------------------------------

/** One box per file, in path order. No number on any of them. */
function Boxes({
  cwd,
  result
}: {
  cwd: string;
  result: ArchModulesResult;
}): React.JSX.Element {
  return (
    <ul className="arch-modules-boxes">
      {result.boxes.map((box) => (
        <li
          key={box.path}
          className={box.broke.length > 0 ? 'arch-module-broke' : undefined}
        >
          <button
            type="button"
            className="arch-module-box"
            title={box.path}
            onClick={() => {
              open(cwd, box.path);
            }}
          >
            {box.broke.length > 0 ? (
              <Codicon name="error" size={12} />
            ) : null}
            <span className="arch-module-dir">{moduleDir(box.path)}</span>
            <span className="arch-module-name">{moduleLabel(box.path)}</span>
            {box.broke.length > 0 ? (
              <span className="arch-module-word">
                {verdictWord(box.broke[0]?.status ?? 'divergent')}
              </span>
            ) : null}
          </button>
          {box.broke.map((row, i) => (
            <button
              key={`${row.subjectId}:${String(row.line)}:${String(i)}`}
              type="button"
              className="arch-module-offending"
              title={`Open ${box.path} at line ${String(row.line)}`}
              onClick={() => {
                open(cwd, box.path, row.line);
              }}
            >
              <span className="arch-module-line">{`:${String(row.line)}`}</span>
              {row.specifier.length > 0 ? (
                <span className="arch-module-spec">{row.specifier}</span>
              ) : null}
              <span className="arch-module-subject">{row.subjectId}</span>
            </button>
          ))}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Grade two: the dependency matrix
// ---------------------------------------------------------------------------

/**
 * The matrix, the NDepend precedent.
 *
 * The axes are NUMBERED and the numbers are the same on both, which is how a
 * person reads a column back to a file without rotated headers that nothing can
 * read at the sidebar's 220px floor. The whole grid scrolls sideways inside its
 * own box, so the panel itself never scrolls sideways.
 */
function Matrix({
  cwd,
  result
}: {
  cwd: string;
  result: ArchModulesResult;
}): React.JSX.Element | null {
  const matrix = result.matrix;
  if (matrix === null) return null;
  const n = matrix.paths.length;
  return (
    <div className="arch-modules-matrix">
      <ol className="arch-matrix-labels">
        {matrix.paths.map((path, at) => (
          <li key={path}>
            <button
              type="button"
              className="arch-matrix-label"
              title={path}
              onClick={() => {
                open(cwd, path);
              }}
            >
              <span className="arch-matrix-index">{String(at + 1)}</span>
              <span className="arch-module-name">{moduleLabel(path)}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="arch-matrix-scroll">
        <div
          className="arch-matrix-grid"
          style={{ '--arch-matrix-n': String(n) } as React.CSSProperties}
          role="presentation"
        >
          {matrix.cells.map((cell) => {
            const from = matrix.paths[cell.from] ?? '';
            const to = matrix.paths[cell.to] ?? '';
            return (
              <span
                key={`${String(cell.from)}:${String(cell.to)}`}
                className={
                  cell.broke ? 'arch-matrix-cell arch-module-broke' : 'arch-matrix-cell'
                }
                style={{
                  gridColumn: String(cell.to + 1),
                  gridRow: String(cell.from + 1)
                }}
                title={`${from} imports ${to}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grade three: the two lists
// ---------------------------------------------------------------------------

/** The last fallback. The number is the content, so it is in the sentence. */
function Top({
  cwd,
  result
}: {
  cwd: string;
  result: ArchModulesResult;
}): React.JSX.Element | null {
  const top = result.top;
  if (top === null) return null;
  return (
    <div className="arch-modules-top">
      <Rank
        cwd={cwd}
        title={ARCH_MODULES_IMPORTERS}
        rows={top.importers}
        importers
      />
      <Rank
        cwd={cwd}
        title={ARCH_MODULES_IMPORTEES}
        rows={top.importees}
        importers={false}
      />
    </div>
  );
}

function Rank({
  cwd,
  title,
  rows,
  importers
}: {
  cwd: string;
  title: string;
  rows: readonly { path: string; count: number; broke: boolean }[];
  importers: boolean;
}): React.JSX.Element {
  return (
    <div className="arch-rank">
      <p className="arch-rank-title">{title}</p>
      <ul>
        {rows.map((row) => (
          <li
            key={row.path}
            className={row.broke ? 'arch-module-broke' : undefined}
          >
            <button
              type="button"
              className="arch-rank-row"
              title={row.path}
              onClick={() => {
                open(cwd, row.path);
              }}
            >
              {row.broke ? <Codicon name="error" size={12} /> : null}
              <span className="arch-module-name">{moduleLabel(row.path)}</span>
              <span className="arch-rank-count">
                {rankSentence(row.count, importers)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase 161, level 3 of the drill: one module opened up into its files
// ---------------------------------------------------------------------------

/**
 * The drilled files view, mounted by the MAP TAB at level 3.
 *
 * IT IS PHASE 64'S VIEW, SCOPED. The drawing, the three caps, the grade rule
 * and the broke overlay are all `ArchModulesBody` unchanged; what this adds
 * is the framing and where the answer comes from. The answer routes through
 * the store rather than local state, which is the one refresh path: a
 * finished check or a landed scan re-reads every held scope in one place,
 * and this component only draws what the store holds.
 *
 * PROPS FROZEN IN THE PHASE SPEC, because the mount point is owned by a
 * different hand than this file.
 */
export function ArchModuleFiles({
  repoPath,
  dir,
  label
}: {
  /** Absolute repository root. */
  repoPath: string;
  /** The module folder, repository relative. */
  dir: string;
  /** What the module is called on screen, the breadcrumb's own word. */
  label: string;
}): React.JSX.Element {
  const entry = useArch((s) => s.moduleViews[moduleKey(repoPath, dir)] ?? null);
  const loadModuleView = useArch((s) => s.loadModuleView);
  useEffect(() => {
    void loadModuleView(repoPath, dir);
  }, [repoPath, dir, loadModuleView]);
  return (
    <ArchModuleFilesBody
      cwd={repoPath}
      label={label}
      entry={entry}
      available={moduleFilesAvailable()}
    />
  );
}

/**
 * The face with the answer handed in, the `ArchModulesBody` seam one level
 * up: this repository carries no jsdom, so the unit suite renders THIS with
 * a held entry and reads the markup.
 */
export function ArchModuleFilesBody({
  cwd,
  label,
  entry,
  available
}: {
  cwd: string;
  label: string;
  entry: ArchModuleViewEntry | null;
  available: boolean;
}): React.JSX.Element {
  const result = entry?.result ?? null;
  return (
    <section
      className="arch-modules arch-module-files"
      aria-label={`${ARCH_MODULE_FILES_TITLE}: ${label}`}
      data-grade={result === null ? 'none' : result.grade}
    >
      <div className="section-header">
        <span className="section-toggle">{ARCH_MODULE_FILES_TITLE}</span>
      </div>
      <p className="arch-note arch-note-inline">{ARCH_MODULE_FILES_NOTE}</p>
      <ArchModulesBody
        cwd={cwd}
        result={result}
        loading={entry?.status === 'loading'}
        failed={entry?.status === 'error' ? entry.error : null}
        available={available}
        emptyText={ARCH_MODULE_FILES_EMPTY}
      />
    </section>
  );
}

/**
 * The name the MAP TAB mounts at level 3 (Phase 161). The tab reads this
 * export structurally, with the part's id and label in the props so the seam
 * carries the whole drill context; the files view itself needs only the
 * folder and its label, and the part context already lives in the one drill
 * record both surfaces read.
 */
export function ArchDrillFiles({
  repoPath,
  dir,
  label
}: {
  repoPath: string;
  /** The drilled part, part of the frozen seam. The drill record holds it. */
  groupId: string;
  groupLabel: string;
  dir: string;
  label: string;
}): React.JSX.Element {
  return <ArchModuleFiles repoPath={repoPath} dir={dir} label={label} />;
}
