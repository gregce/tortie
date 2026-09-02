/**
 * Codicon — VS Code's own UI glyph set, for app chrome (activity bar,
 * SCM header actions, view headers, context-menu accents…).
 *
 * Source: @vscode/codicons (npm). License: CC-BY-4.0 (© Microsoft,
 * https://github.com/microsoft/vscode-codicons — verified 2026-08-09 in the
 * package LICENSE and npm metadata). Attribution required: keep the credit
 * line for "codicons by Microsoft (CC BY 4.0)" in the app's About/credits.
 *
 * Rendered via the codicon icon font (one ~80 KB ttf, every glyph, tints
 * with `currentColor`). Names are the codicon ids, e.g. "source-control",
 * "files", "git-commit", "history", "layout-sidebar-right", "terminal":
 * full list at https://microsoft.github.io/vscode-codicons/dist/codicon.html
 * (or node_modules/@vscode/codicons/dist/codicon.csv).
 */
import '@vscode/codicons/dist/codicon.css';
import type { CSSProperties, FC } from 'react';

export interface CodiconProps {
  /** Codicon id without the "codicon-" prefix (e.g. "source-control"). */
  name: string;
  /**
   * A step of the icon scale, `sm` 12, `md` 14 or `lg` 16 (tokens.css §1.9b),
   * or a font size in px for the few glyphs that are not a step (24 in the
   * activity bar, 18 on the home screen, 11 and 10 inside two badges).
   * Glyphs are designed on a 16px grid; the default is `lg`, which emits no
   * inline style at all, exactly as 16 does.
   */
  size?: CodiconSize;
  className?: string;
}

export type CodiconSize = number | 'sm' | 'md' | 'lg';

function sizeStyle(size: CodiconSize): CSSProperties | undefined {
  if (size === 16 || size === 'lg') return undefined;
  if (typeof size === 'number') return { fontSize: size };
  return { fontSize: `var(--icon-${size})` };
}

export const Codicon: FC<CodiconProps> = ({ name, size = 'lg', className }) => {
  const style = sizeStyle(size);
  const cls = `codicon codicon-${name}${className ? ` ${className}` : ''}`;
  return <span className={cls} {...(style !== undefined ? { style } : {})} aria-hidden="true" />;
};
