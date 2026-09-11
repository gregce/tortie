/**
 * The SURFACE rules (Phase 257): what a repository exposes, being http
 * routes, IPC channels, command line commands and flags, and scheduled jobs.
 *
 * Every rule here refuses a test path (spec D2), because a path a test walks
 * is a REQUEST to a route rather than a declaration of one, and a channel a
 * test registers is a fixture. Research 118 §6.1 measured the family at 75%,
 * 91% excluding vendored bytes; the two rules that were under it are
 * `surface.cli.arg`, 25%, fixed below, and `surface.handler.on`, 44%, dropped
 * outright because every emitter event in a codebase answers to `on` and a
 * name rule cannot tell `ws.on('message')` from `sock.on('data')`.
 */

import type { FactRule } from './types';
import { channelish, CLIENT_RECV, firstPath, HTTP_VERBS, ipcChannelName, isAnnotation, isTestPath, pathish } from './predicates';

/**
 * The closed set of PARSER receivers whose `option`/`arg`/`flag` is a command
 * line declaration. `add_argument`, `addOption` and pflag's `*Var` are
 * argparse's, commander's and pflag's own names and need no receiver; the
 * four ambiguous verbs need a receiver in this set OR a string argument that
 * begins with `-`. The hand sample's three false rows were `x.flag(1)` shapes.
 */
const PARSER_RECV =
  /^(parser|subparser|subparsers|argparser|program|cmd|command|cli|app|flag|flags|pflag|opts|options|yargs|commander|Arg)$/;
const CLI_ARG_VERB_OWN = /^(add_argument|addOption|StringVar|BoolVar|IntVar)$/;
const CLI_ARG_VERB_AMBIGUOUS = /^(option|arg|flag)$/;

/** A file that names the clap crate. `Command::new` is clap's only there. */
const NAMES_CLAP = /\buse\s+clap\b|\bclap::/;
/** A file that names `std::process`. A bare `Command::new` in a file naming both is ambiguous and answers nothing. */
const NAMES_PROCESS = /\bstd::process\b|process::Command/;
const PROCESS_QUALIFIED = /(^|::)process::Command$/;
const CLAP_QUALIFIED = /(^|::)clap::Command$/;

export const SURFACE_RULES: readonly FactRule[] = [
  // ───────────────────────── http routes ─────────────────────────
  {
    id: 'surface.http.method-call',
    category: 'surface',
    kind: 'http-route',
    langs: '*',
    match: (s, c) => {
      if (s.form !== 'call') return null;
      if (!HTTP_VERBS.has(s.last.toLowerCase())) return null;
      if (CLIENT_RECV.test(s.recv.replace(/^[$@]/, ''))) return null;
      if (isTestPath(c.file)) return null;
      const p = s.args[0];
      if (p === undefined) return null;
      // An UPPERCASE verb is Go's route convention and is never a client
      // call, so an empty mount path ("" under a group) still counts, and a
      // bare mount word counts too: gin's own `g.GET("version", …)` carries no
      // slash and was 2 of the 6 routes this rule missed on gotify.
      const upper = s.last === s.last.toUpperCase();
      const bareWord = upper && /^[A-Za-z0-9_\-]{0,40}$/.test(p);
      if (!pathish(p) && !bareWord) return null;
      if (/^(https?|wss?):\/\//.test(p)) return null;
      if (s.argc < 2) return null; // a bare `get(url)` is a client call
      return `HTTP ${s.last.toUpperCase()} ${p === '' ? '(group root)' : p}`;
    }
  },
  {
    id: 'surface.http.handlefunc',
    category: 'surface',
    kind: 'http-route',
    langs: ['go'],
    match: (s, c) => {
      if (isTestPath(c.file)) return null;
      if (!/^(HandleFunc|Handle)$/.test(s.last)) return null;
      const p = s.args[0];
      return p !== undefined && pathish(p) ? `HTTP ${p}` : null;
    }
  },
  {
    id: 'surface.http.decorator',
    category: 'surface',
    kind: 'http-route',
    langs: ['python'],
    match: (s, c) => {
      if (!isAnnotation(s.form)) return null;
      if (isTestPath(c.file)) return null;
      if (!/^(route|get|post|put|patch|delete|head|options)$/i.test(s.last) || s.recv === '') return null;
      const p = firstPath(s);
      return p !== null ? `HTTP ${s.last.toUpperCase()} ${p}` : null;
    }
  },
  {
    id: 'surface.http.django-urls',
    category: 'surface',
    kind: 'http-route',
    langs: ['python'],
    match: (s, c) => {
      if (!/urls?\.py$/.test(c.base)) return null;
      if (isTestPath(c.file)) return null;
      if (!/^(path|re_path|url)$/.test(s.last)) return null;
      const p = s.args[0];
      return p !== undefined && p.length > 0 ? `HTTP ${p}` : null;
    }
  },
  {
    id: 'surface.http.rails-routes',
    category: 'surface',
    kind: 'http-route',
    langs: ['ruby'],
    match: (s, c) => {
      if (!/routes\.rb$/.test(c.base) && !/^config\/routes\//.test(c.file)) return null;
      if (isTestPath(c.file)) return null;
      // A symbol arrives with its colon; `get :activity` is a member route.
      const p0 = (s.args[0] ?? '').replace(/^:/, '');
      if (HTTP_VERBS.has(s.last.toLowerCase()) && p0 !== '') {
        return `HTTP ${s.last.toUpperCase()} ${p0}`;
      }
      if (/^(match|root)$/.test(s.last) && p0 !== '') return `HTTP ${s.last} ${p0}`;
      if (/^(resources|resource)$/.test(s.last) && s.argc > 0) {
        return `HTTP resources ${p0 || '(symbol)'}`;
      }
      return null;
    }
  },

  // ───────────────────────── IPC / bridge ─────────────────────────
  {
    id: 'surface.ipc.electron',
    category: 'surface',
    kind: 'ipc-channel',
    langs: ['typescript', 'tsx', 'javascript'],
    match: (s, c) => {
      if (!/^(ipcMain|ipcRenderer|ipc)$/.test(s.recv)) return null;
      if (!/^(handle|handleOnce|on|once|invoke|send|sendSync)$/.test(s.last)) return null;
      if (isTestPath(c.file)) return null;
      const ch = s.args[0];
      if (ch === undefined || !ipcChannelName(ch)) return null;
      const dir = /^(handle|handleOnce|on|once)$/.test(s.last) ? 'serves' : 'calls';
      return `IPC ${dir} ${ch}`;
    }
  },
  {
    id: 'surface.ipc.bridge',
    category: 'surface',
    kind: 'ipc-channel',
    langs: ['typescript', 'tsx', 'javascript'],
    match: (s, c) => {
      if (s.last !== 'exposeInMainWorld') return null;
      if (isTestPath(c.file)) return null;
      return `bridge exposes window.${s.args[0] || '?'}`;
    }
  },
  {
    id: 'surface.ipc.webcontents',
    category: 'surface',
    kind: 'ipc-channel',
    langs: ['typescript', 'tsx', 'javascript'],
    match: (s, c) => {
      if (s.last !== 'send' && s.last !== 'postMessage') return null;
      if (!/^(webContents|win|window|port|parentPort|worker|self)$/.test(s.recv)) return null;
      if (isTestPath(c.file)) return null;
      const ch = s.args[0];
      return ch !== undefined && channelish(ch) ? `IPC push ${ch}` : null;
    }
  },

  // ───────────────────────── command line ─────────────────────────
  {
    id: 'surface.cli.command',
    category: 'surface',
    kind: 'cli-command',
    langs: '*',
    match: (s, c) => {
      if (!/^(command|subcommand|add_parser|addCommand|add_command|register|SubCommand)$/.test(s.last)) return null;
      if (isTestPath(c.file)) return null;
      const n = s.args[0];
      return n !== undefined && channelish(n) ? `CLI command ${n}` : null;
    }
  },
  {
    id: 'surface.cli.arg',
    category: 'surface',
    kind: 'cli-flag',
    langs: '*',
    match: (s, c) => {
      const own = CLI_ARG_VERB_OWN.test(s.last);
      if (!own && !CLI_ARG_VERB_AMBIGUOUS.test(s.last)) return null;
      if (isTestPath(c.file)) return null;
      const dashed = s.args.find((a) => a.startsWith('-'));
      // An ambiguous verb fires only when some string argument begins with
      // `-` or the receiver is a parser. A bare `x.flag(1)` or `map.option('k')`
      // answers nothing; those were 3 of the 4 sampled facts.
      if (!own && dashed === undefined && !PARSER_RECV.test(s.recv)) return null;
      const n = dashed ?? s.args[0];
      return n !== undefined && n.length > 0 && n.length < 60 && !n.includes(' ') ? `CLI flag ${n}` : null;
    }
  },
  {
    id: 'surface.cli.clap',
    category: 'surface',
    kind: 'cli-command',
    langs: ['rust'],
    match: (s, c) => {
      if (!/^(Command|App|SubCommand)$/.test(s.recv) || s.last !== 'new') return null;
      if (isTestPath(c.file)) return null;
      // `Command::new` is BOTH clap's and `std::process::Command`'s. A file
      // that does not name clap answers nothing here; a callee spelled
      // through `process::` is the spawn rule's whatever the file names.
      const head = s.callee.replace(/::new$/, '');
      if (PROCESS_QUALIFIED.test(head)) return null;
      if (!CLAP_QUALIFIED.test(head) && (!NAMES_CLAP.test(c.text) || NAMES_PROCESS.test(c.text))) return null;
      const n = s.args[0];
      return n !== undefined && channelish(n) ? `CLI command ${n}` : null;
    }
  },
  {
    id: 'surface.cli.click',
    category: 'surface',
    kind: 'cli-command',
    langs: ['python'],
    match: (s, c) => {
      if (!isAnnotation(s.form)) return null;
      if (!/^(command|group)$/.test(s.last) || !/^click$/i.test(s.recv)) return null;
      if (isTestPath(c.file)) return null;
      return `CLI command ${s.args[0] || '(function name)'}`;
    }
  },

  // ───────────────────────── scheduled jobs ─────────────────────────
  {
    id: 'surface.job.schedule',
    category: 'surface',
    kind: 'job',
    langs: '*',
    match: (s, c) => {
      if (isTestPath(c.file)) return null;
      if (/^(schedule|scheduleJob|cron|addCron|scheduleAtFixedRate|enqueue_at|perform_later)$/.test(s.last) && s.argc > 0) {
        return `scheduled ${s.args[0] || `${s.recv}.${s.last}`}`;
      }
      // `every` and `repeat` are answered ONLY for a named scheduler
      // receiver: a bare `every` matched Array.prototype.every 700+ times on
      // this repository alone.
      if (/^(every|repeat)$/.test(s.last) && /^(sched|schedule|scheduler|cron|job|jobs|timer|clock|agenda)$/i.test(s.recv)) {
        return `scheduled ${s.recv}.${s.last} ${s.args[0] ?? ''}`.trim();
      }
      if (isAnnotation(s.form) && /^(Scheduled|task|periodic_task|shared_task)$/.test(s.last)) {
        return `scheduled ${s.args[0] || s.last}`;
      }
      return null;
    }
  },
  {
    id: 'surface.job.interval',
    category: 'surface',
    kind: 'job',
    langs: ['typescript', 'tsx', 'javascript'],
    match: (s, c) =>
      s.last === 'setInterval' && s.argc >= 2 && !isTestPath(c.file) ? 'repeating timer' : null
  }
];
