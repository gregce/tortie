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
  /** Font size in px — glyphs are designed on a 16px grid (default 16). */
  size?: number;
  className?: string;
}

export const Codicon: FC<CodiconProps> = ({ name, size = 16, className }) => {
  const style: CSSProperties | undefined = size === 16 ? undefined : { fontSize: size };
  const cls = `codicon codicon-${name}${className ? ` ${className}` : ''}`;
  return <span className={cls} {...(style !== undefined ? { style } : {})} aria-hidden="true" />;
};
