/**
 * Native-module proof (node-pty + better-sqlite3 must load inside Electron).
 *
 * Two callers, and the answer means something different to each. Normal
 * startup (src/main/index.ts) logs the result so a broken native rebuild is
 * visible immediately in dev consoles, and never treats it as fatal. The
 * basic smoke harness (src/main/harness/basic.ts) treats any failure as the
 * verdict, because a build whose native modules do not load cannot host a
 * session at all.
 *
 * Moved out of src/main/index.ts in Phase 42 stage 3, byte for byte.
 */

import { app } from 'electron';

export interface NativeProofResult {
  ok: boolean;
  detail: string;
}

export async function proveNativeModules(): Promise<NativeProofResult> {
  const parts: string[] = [];

  // better-sqlite3: open an in-memory DB and run a query end-to-end.
  try {
    const { default: Database } = await import('better-sqlite3');
    const db = new Database(':memory:');
    const row = db.prepare('SELECT 1 + 1 AS v').get() as { v: number };
    db.close();
    if (row.v !== 2) {
      return { ok: false, detail: 'better-sqlite3 query returned wrong value' };
    }
    parts.push('better-sqlite3 ok (in-memory SELECT)');
  } catch (err) {
    return {
      ok: false,
      detail: `better-sqlite3 failed to load: ${(err as Error).message}`
    };
  }

  // node-pty: spawn a real PTY and wait for clean exit.
  try {
    const pty = await import('node-pty');
    const exitCode = await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('pty spawn timed out (5s)')),
        5000
      );
      const p = pty.spawn('/bin/sh', ['-c', 'exit 0'], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: app.getPath('home'),
        env: process.env as Record<string, string>
      });
      p.onExit(({ exitCode: code }) => {
        clearTimeout(timer);
        resolve(code);
      });
    });
    if (exitCode !== 0) {
      return { ok: false, detail: `node-pty test shell exited ${exitCode}` };
    }
    parts.push('node-pty ok (PTY spawn/exit roundtrip)');
  } catch (err) {
    return {
      ok: false,
      detail: `node-pty failed to load: ${(err as Error).message}`
    };
  }

  return { ok: true, detail: parts.join('; ') };
}
