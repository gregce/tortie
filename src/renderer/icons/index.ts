/**
 * gmux icon system — the one import site for downstream UI:
 *
 *   import { AgentIcon, Codicon } from '@renderer/icons';
 *
 * - AgentIcon  — vendor logo per agent kind; terminal glyph for shell/unknown.
 * - Codicon    — VS Code codicon glyphs for app chrome (activity bar, SCM…).
 *
 * The material-icon-theme file icons (file-icons.generated.ts) are NOT
 * re-exported here: since Phase 11 they have exactly one consumer, the
 * @pierre/trees sprite sheet built in src/renderer/tree/pierre-icons.ts,
 * which imports the generated maps directly.
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
