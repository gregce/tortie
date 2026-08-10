/**
 * AgentIcon — the real vendor mark for every place a session appears
 * (tab strip, right-docked session list, ⌘T create modal, ⌘J attention
 * overlay, Settings). Logos live in src/renderer/assets/agents/*.svg:
 * eight are normalized copies of the SpecStory sync-cloud asset set;
 * pi is normalized from the vendor's own mark; muse, qwen, and
 * antigravity are marks commissioned for Phase 10's wave-2 agents
 * (registry doc §3 — no vendor SVG existed; antigravity is traced from
 * the vendor's PNG). Monochrome marks are `currentColor` so they tint
 * with the surrounding text (rest: --text-secondary), while inherently
 * multi-tone marks (droid's disc) render as-is. Crisp at 14–16 px: all
 * marks are simple filled geometry on 24-ish grids, inlined as SVG (no
 * <img> rasterization).
 *
 * `codex` wears the OpenAI mark (codex.svg IS the OpenAI logo — the CLI
 * has no separate logo). Plain shells and unknown agents fall back to
 * the codicon `terminal` glyph (DESIGN.md §3/§8.6 — codicons are the
 * single UI-chrome set; the round-0 Lucide strokes were removed
 * entirely, not blended).
 */
import type { FC } from 'react';
import { InlineSvg } from './InlineSvg';
import ampSvg from '../assets/agents/amp.svg?raw';
import antigravitySvg from '../assets/agents/antigravity.svg?raw';
import claudeSvg from '../assets/agents/claude.svg?raw';
import codexSvg from '../assets/agents/codex.svg?raw';
import cursorSvg from '../assets/agents/cursor.svg?raw';
import deepseekSvg from '../assets/agents/deepseek.svg?raw';
import droidSvg from '../assets/agents/droid.svg?raw';
import geminiSvg from '../assets/agents/gemini.svg?raw';
import githubcopilotSvg from '../assets/agents/githubcopilot.svg?raw';
import museSvg from '../assets/agents/muse.svg?raw';
import piSvg from '../assets/agents/pi.svg?raw';
import qwenSvg from '../assets/agents/qwen.svg?raw';

/**
 * Codicon `terminal` (@vscode/codicons, CC-BY-4.0 — credited in About),
 * normalized to the 1em/currentColor contract the agent marks share.
 */
const TERMINAL_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="M18.75 1.5H5.25C3.1815 1.5 1.5 3.183 1.5 5.25V18.75C1.5 20.8185 3.1815 22.5 5.25 22.5H18.75C20.8185 22.5 22.5 20.8185 22.5 18.75V5.25C22.5 3.183 20.8185 1.5 18.75 1.5ZM21 18.75C21 19.9905 19.9905 21 18.75 21H5.25C4.0095 21 3 19.9905 3 18.75V5.25C3 4.0095 4.0095 3 5.25 3H18.75C19.9905 3 21 4.0095 21 5.25V18.75ZM10.281 13.281L5.781 17.781C5.634 17.928 5.442 18 5.25 18C5.058 18 4.866 17.9265 4.719 17.781C4.4265 17.4885 4.4265 17.013 4.719 16.7205L8.688 12.7515L4.719 8.7825C4.4265 8.49 4.4265 8.0145 4.719 7.722C5.0115 7.4295 5.487 7.4295 5.7795 7.722L10.2795 12.222C10.572 12.5145 10.572 12.99 10.2795 13.2825L10.281 13.281ZM19.5 17.25C19.5 17.664 19.164 18 18.75 18H11.25C10.836 18 10.5 17.664 10.5 17.25C10.5 16.836 10.836 16.5 11.25 16.5H18.75C19.164 16.5 19.5 16.836 19.5 17.25Z"/></svg>';

const LOGOS: Record<string, string> = {
  amp: ampSvg,
  antigravity: antigravitySvg,
  claude: claudeSvg,
  codex: codexSvg,
  cursor: cursorSvg,
  deepseek: deepseekSvg,
  droid: droidSvg,
  gemini: geminiSvg,
  githubcopilot: githubcopilotSvg,
  muse: museSvg,
  pi: piSvg,
  qwen: qwenSvg
};

/** Normalized-name aliases → canonical logo key. */
const ALIASES: Record<string, string> = {
  claudecode: 'claude',
  anthropic: 'claude',
  openai: 'codex',
  google: 'gemini',
  googlegemini: 'gemini',
  geminicli: 'gemini',
  ampcode: 'amp',
  sourcegraph: 'amp',
  cursoragent: 'cursor',
  factory: 'droid',
  factorydroid: 'droid',
  copilot: 'githubcopilot',
  ghcopilot: 'githubcopilot',
  githubcopilotcli: 'githubcopilot',
  agy: 'antigravity',
  googleantigravity: 'antigravity',
  musecode: 'muse',
  meta: 'muse',
  qwencode: 'qwen',
  alibaba: 'qwen',
  picodingagent: 'pi'
};

export interface AgentIconProps {
  /** Agent identifier — AgentKind ('claude' | 'codex' | 'shell') or any
   *  vendor name; matching is case/punctuation-insensitive ("GitHub Copilot"
   *  → githubcopilot). Unknown values and 'shell' render a terminal glyph. */
  agent: string;
  /** Square edge in px (default 16; designed for 14–16). */
  size?: number;
  className?: string;
}

export const AgentIcon: FC<AgentIconProps> = ({ agent, size = 16, className }) => {
  const key = agent.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const canonical = ALIASES[key] ?? key;
  const svg = LOGOS[canonical] ?? TERMINAL_SVG;
  return <InlineSvg svg={svg} size={size} {...(className !== undefined ? { className } : {})} />;
};
