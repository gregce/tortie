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
 * - menuGlyph  — the same codicon as a NATIVE MENU icon: a template PNG main
 *                hands to nativeImage, so a menu row and the surface it acts
 *                on draw one character out of one font file. `agentGlyph` is
 *                the vendor mark in the same shape. Both read a cache that
 *                `warmMenuIcons` / `warmAgentMenuIcons` fill once per app run,
 *                because a native menu is composed synchronously at click time.
 * - InlineSvg  — the renderer underneath AgentIcon and FileIcon, exported for
 *                the few places that hold a bundled SVG string of their own
 *                (today: the SpecStory brand mark on the Settings rail, which
 *                is not an agent and so has no AgentIcon key). Trusted,
 *                build-time-bundled markup only — see InlineSvg.tsx.
 *
 * Licenses: @vscode/codicons CC-BY-4.0 (© Microsoft — credit in About);
 * material-icon-theme MIT (© Material Extensions); agent marks are the vendors'
 * own logos, used nominatively to identify each vendor's CLI.
 */
import './icons.css';

export { AgentIcon, agentSvgFor } from './AgentIcon';
export type { AgentIconProps } from './AgentIcon';
export { agentGlyph, agentMenuIcon, warmAgentMenuIcons } from './agent-menu-icon';
export { MENU_CODICONS, menuGlyph, warmMenuIcons } from './codicon-menu-icon';
export type { MenuCodicon } from './codicon-menu-icon';
export { Codicon } from './Codicon';
export type { CodiconProps } from './Codicon';
export { FileIcon, fileIconIdFor } from './FileIcon';
export type { FileIconProps } from './FileIcon';
export { InlineSvg } from './InlineSvg';
export type { InlineSvgProps } from './InlineSvg';
