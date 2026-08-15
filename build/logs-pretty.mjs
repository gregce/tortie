#!/usr/bin/env node
/**
 * logs-pretty.mjs — read app.log with human eyes (Phase 35, research 42 §9).
 *
 * The stored format is NDJSON and it stays that way. Human readability is
 * served at READ time, never by loosening what is written. This script is
 * that read-time half: one aligned line per record, in the order they were
 * written.
 *
 * Usage:
 *   node build/logs-pretty.mjs [path-to-app.log] [--level warn] [--scope proc]
 *   npm run logs:pretty -- ~/Library/Application\ Support/Tortie/logs/app.log
 *
 * With no path it reads the repo scratch copy at ./app.log, then
 * ./logs/app.log, and says so when neither is there. `-` reads stdin.
 *
 * The jq expression per record type, so the reader never needs this script:
 *
 *   boot.env           jq -c 'select(.event=="boot.env")' app.log
 *   process.gone       jq -c 'select(.event=="process.gone")' app.log
 *   process.gone, GPU  jq -c 'select(.event=="process.gone" and .ptype=="GPU")' app.log
 *   boot.unclean_exit  jq -c 'select(.event=="boot.unclean_exit")' app.log
 *   notice.shown       jq -c 'select(.event=="notice.shown")' app.log
 *   every error        jq -c 'select(.level=="error")' app.log
 *   one scope          jq -c 'select(.scope=="updates")' app.log
 *   renderer lines     jq -c 'select(.proctype=="renderer")' app.log
 *
 * No dependencies. It reads a file and prints text.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LEVEL_ORDER = { error: 0, warn: 1, info: 2, debug: 3 };
/** The envelope names. Everything else on a line is a record field. */
const ENVELOPE = new Set(['ts', 'level', 'scope', 'pid', 'proctype', 'msg']);

function parseArgs(argv) {
  const opts = { path: null, level: 'debug', scope: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--level') {
      opts.level = argv[i + 1] ?? 'debug';
      i += 1;
    } else if (arg === '--scope') {
      opts.scope = argv[i + 1] ?? null;
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (!arg.startsWith('--')) {
      opts.path = arg;
    }
  }
  return opts;
}

/** The time as HH:MM:SS.mmm in local time, which is how a person reads it. */
function shortTime(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts).slice(0, 12).padEnd(12);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return (
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `.${pad(d.getMilliseconds(), 3)}`
  );
}

function formatRecord(record) {
  const level = String(record.level ?? '?').toUpperCase().padEnd(5);
  const scope = String(record.scope ?? '?').padEnd(9);
  const where =
    record.proctype === 'main' ? '' : ` (${String(record.proctype ?? '?')})`;
  const head = `${shortTime(record.ts)}  ${level} ${scope}${where} ${String(
    record.msg ?? ''
  )}`;
  const extras = [];
  if (typeof record.event === 'string') extras.push(`event=${record.event}`);
  for (const [key, value] of Object.entries(record)) {
    if (ENVELOPE.has(key) || key === 'event') continue;
    extras.push(
      `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`
    );
  }
  return extras.length === 0 ? head : `${head}\n${' '.repeat(14)}${extras.join('  ')}`;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help === true) {
    console.log(readFileSync(new URL(import.meta.url), 'utf8').slice(0, 1600));
    return;
  }

  let text;
  if (opts.path === '-') {
    text = readFileSync(0, 'utf8');
  } else {
    const candidates =
      opts.path === null
        ? [resolve('app.log'), resolve('logs', 'app.log')]
        : [resolve(opts.path)];
    const found = candidates.find((p) => existsSync(p));
    if (found === undefined) {
      console.error(
        `no log file found. Looked at:\n  ${candidates.join('\n  ')}\n` +
          'Pass a path, e.g. node build/logs-pretty.mjs ' +
          '"$HOME/Library/Application Support/Tortie/logs/app.log"'
      );
      process.exit(1);
    }
    text = readFileSync(found, 'utf8');
  }

  const floor = LEVEL_ORDER[opts.level] ?? 3;
  let shown = 0;
  let skipped = 0;
  for (const line of text.split('\n')) {
    if (line === '') continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      // A line that is not JSON is printed raw rather than dropped: a
      // truncated tail is evidence too.
      console.log(line);
      skipped += 1;
      continue;
    }
    if ((LEVEL_ORDER[record.level] ?? 3) > floor) continue;
    if (opts.scope !== null && record.scope !== opts.scope) continue;
    console.log(formatRecord(record));
    shown += 1;
  }
  console.log(
    `\n${shown} record(s) shown${skipped > 0 ? `, ${skipped} unparsed line(s)` : ''}.`
  );
}

main();
