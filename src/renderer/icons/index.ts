/**
 * gmux icon system — the one import site for downstream UI:
 *
 *   import { AgentIcon, Codicon } from '@renderer/icons';
 *
 * - AgentIcon  — vendor logo per agent kind; terminal glyph for shell/unknown.
 * - Codicon    — VS Code codicon glyphs for app chrome (activity bar, SCM…).
 * - FileIcon   — material-icon-theme glyph for a filename, in ordinary DOM
 *                (editor tabs). The tree resolves the same maps through the
 *                @pierre/trees sprite sheet because it renders in shadow DOM;
 *                both go through the generated maps so one file never wears
 *                two icons.
 *
 * Licenses: @vscode/codicons CC-BY-4.0 (© Microsoft — credit in About);
 * material-icon-theme MIT (© Philipp Kief); agent marks are the vendors'
 * own logos, used nominatively to identify each vendor's CLI.
 */
import './icons.css';

export { AgentIcon, agentSvgFor } from './AgentIcon';
export type { AgentIconProps } from './AgentIcon';
export { agentMenuIcon, warmAgentMenuIcons } from './agent-menu-icon';
export { Codicon } from './Codicon';
export type { CodiconProps } from './Codicon';
export { FileIcon, fileIconIdFor } from './FileIcon';
export type { FileIconProps } from './FileIcon';
