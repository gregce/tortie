/**
 * gmux icon system — the one import site for downstream UI:
 *
 *   import { AgentIcon, Codicon, getFileIcon } from '@renderer/icons';
 *
 * - AgentIcon  — vendor logo per agent kind; terminal glyph for shell/unknown.
 * - Codicon    — VS Code codicon glyphs for app chrome (activity bar, SCM…).
 * - getFileIcon — material-icon-theme file/folder icons for the Files tree.
 *
 * Licenses: @vscode/codicons CC-BY-4.0 (© Microsoft — credit in About);
 * material-icon-theme MIT (© Philipp Kief); agent marks are the vendors'
 * own logos, used nominatively to identify each vendor's CLI.
 */
import './icons.css';

export { AgentIcon } from './AgentIcon';
export type { AgentIconProps } from './AgentIcon';
export { Codicon } from './Codicon';
export type { CodiconProps } from './Codicon';
export { getFileIcon } from './fileIcon';
export type { FileIconOptions, FileIconProps } from './fileIcon';
