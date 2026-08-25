/**
 * Right-click on a result — NATIVE, through the existing `ui:popupMenu`
 * bridge, because DESIGN.md §3 has one rule about context menus and it is that
 * they are macOS menus and never DOM.
 *
 * The verbs are the ones the tree and the SCM rows already offer, in the same
 * order and with the same words, so a file opens the same way wherever you
 * found it — that consistency is the whole reason this lives beside them
 * rather than inventing a search-flavoured menu.
 *
 * "Open to the Side" is deliberately ABSENT rather than present-and-disabled:
 * gmux has no split-editor model, and a permanently grey item is a promise the
 * app never keeps.
 */

import { menuGlyph } from '../icons';
import type { MenuSpec } from '../state/store';
import type { SearchRow } from './rows';

export interface ResultMenuInput {
  row: SearchRow;
  repoPath: string;
  x: number;
  y: number;
  open(row: SearchRow, preview: boolean): void;
  toggleGroup(relPath: string): void;
  toast(kind: 'info' | 'success' | 'error', message: string): void;
}

/** Everything on one match line, tab-free, for "Copy". */
function matchText(row: SearchRow): string | null {
  if (row.kind === 'match') return row.match.text;
  if (row.kind === 'context') return row.context.text;
  return null;
}

/** Every match in a file as `line: text`, which is what people paste. */
function allMatchesOf(row: SearchRow): string | null {
  if (row.kind !== 'file') return null;
  return row.file.matches.map((m) => `${m.line}: ${m.text}`).join('\n');
}

export function resultMenu(input: ResultMenuInput): MenuSpec {
  const { row, repoPath, open, toggleGroup, toast } = input;
  const relPath = row.relPath;
  const absPath = `${repoPath}/${relPath}`;

  const copy = (label: string, text: string): void => {
    void navigator.clipboard.writeText(text).then(
      () => toast('success', `${label} copied.`),
      () => toast('error', `Could not copy ${label.toLowerCase()}.`)
    );
  };

  const items: MenuSpec['items'] = [];

  if (row.kind === 'file') {
    items.push(
      {
        label: 'Open File',
        ...menuGlyph('go-to-file'),
        run: () => open(row, true)
      },
      {
        label: 'Open in New Tab',
        ...menuGlyph('pin'),
        run: () => open(row, false)
      },
      'sep',
      {
        label: row.file.matches.length > 0 ? 'Collapse Matches' : 'Expand Matches',
        // `collapse-all` is the Search header's own collapse button.
        // `expand-all` is a CHOSEN mark, and its whole reason is the half it
        // shares this row with: the opposite of a drawn mark, so the pair
        // reads as one toggle.
        ...menuGlyph(
          row.file.matches.length > 0 ? 'collapse-all' : 'expand-all'
        ),
        run: () => toggleGroup(relPath)
      }
    );
    const all = allMatchesOf(row);
    if (all !== null && all.length > 0) {
      items.push({
        label: 'Copy All Matches in File',
        ...menuGlyph('copy'),
        run: () => copy('Matches', all)
      });
    }
  } else {
    items.push(
      { label: 'Open', ...menuGlyph('go-to-file'), run: () => open(row, true) },
      {
        label: 'Open in New Tab',
        ...menuGlyph('pin'),
        run: () => open(row, false)
      }
    );
    const text = matchText(row);
    if (text !== null) {
      items.push('sep', {
        label: 'Copy',
        ...menuGlyph('copy'),
        run: () => copy('Line', text)
      });
    }
  }

  items.push(
    'sep',
    { label: 'Copy Path', ...menuGlyph('copy'), run: () => copy('Path', absPath) },
    {
      label: 'Copy Relative Path',
      ...menuGlyph('copy'),
      run: () => copy('Path', relPath)
    }
  );

  return { x: input.x, y: input.y, items };
}
