/**
 * The demo's agent registry scan: what agents:list / agents:rescan answer.
 *
 * All 13 registry rows so the ⌘T picker and the Settings Agents section
 * draw their real grids; claude and codex are "installed" (the two the
 * fixture sessions run), everything else shows its honest not-installed
 * tile. Shapes follow DetectedAgent in src/shared/types.ts.
 */
import type { AgentsScanResult, DetectedAgent } from '@shared/types';

function row(
  id: string,
  displayName: string,
  extra?: Partial<DetectedAgent>
): DetectedAgent {
  return {
    id,
    displayName,
    kind: 'cli',
    launchable: true,
    installed: false,
    binPath: null,
    version: null,
    storeDetected: false,
    iconKey: id,
    unverified: false,
    ...extra
  };
}

const AGENTS: DetectedAgent[] = [
  row('claude', 'Claude Code', {
    installed: true,
    binPath: '/opt/homebrew/bin/claude',
    version: '2.1.34',
    storeDetected: true
  }),
  row('cursor', 'Cursor CLI'),
  row('codex', 'Codex CLI', {
    installed: true,
    binPath: '/opt/homebrew/bin/codex',
    version: '0.52.0',
    storeDetected: true
  }),
  row('gemini', 'Gemini CLI'),
  row('droid', 'Droid'),
  row('deepseek', 'DeepSeek CLI'),
  row('antigravity', 'Antigravity'),
  row('muse', 'Muse'),
  row('qwen', 'Qwen Code'),
  row('pi', 'pi', { unverified: true }),
  row('grok', 'Grok CLI'),
  row('cursoride', 'Cursor', { kind: 'ide', launchable: false }),
  row('copilotide', 'GitHub Copilot', { kind: 'ide', launchable: false })
];

export function demoAgentsScan(): AgentsScanResult {
  return { agents: AGENTS.map((a) => ({ ...a })), scannedAt: Date.now() };
}
