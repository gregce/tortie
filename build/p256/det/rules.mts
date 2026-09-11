/**
 * Phase 256 prototype — the RULE TABLE of the deterministic half.
 *
 * RESEARCH PROTOTYPE. Nothing here ships.
 *
 * Every rule turns one call site, decorator, manifest key or path into ONE
 * fact carrying a file and a line. A rule states which language families it
 * can answer for; `langs: '*'` means it is asked of every grammar and a rule
 * naming three grammars is reported as answering for three.
 *
 * The categories are the charter's own list, in its order:
 *   entrypoint · boundary · surface · store · effect · test · gate
 */

import type { CallSite } from './parse.mts';

export type Category = 'entrypoint' | 'boundary' | 'surface' | 'store' | 'effect' | 'test' | 'gate';

export interface Fact {
  category: Category;
  kind: string;
  subject: string;
  file: string;
  line: number;
  rule: string;
  lang: string;
  evidence: string;
}

export interface Ctx {
  file: string;
  lang: string;
  /** lower-case basename */
  base: string;
  /** lower-case directory path */
  dir: string;
}

export interface Rule {
  id: string;
  category: Category;
  kind: string;
  langs: readonly string[] | '*';
  match: (s: CallSite, c: Ctx) => string | null;
}

const HTTP_VERBS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'all', 'any']);

/**
 * Receivers whose `get`/`post` is a CLIENT call, never a route declaration.
 *
 * THE RULE WAS AN ALLOWLIST OF ROUTER NAMES AND THAT WAS THE WRONG WAY ROUND.
 * Measured on gotify 2026-09-10: `router/router.go` declares 41 routes and an
 * allowlist of plausible router receivers found 7, because the real receivers
 * are `oidcGroup`, `pluginRoute`, `clientAuth`, `tokenMessage`, `clientElevated`
 * and `authAdmin` — names a list cannot anticipate. A denylist of the half-dozen
 * http CLIENT objects is a closed set and the router half is open, so the
 * closed set is the one to write down.
 */
const CLIENT_RECV = /^(requests|axios|http|https|httpx|urllib|fetch|client|session|req|reqwest|superagent|got|ky|rest|api_client|httpclient|webclient|resttemplate|urlsession|okhttp)$/i;

/** A path a test file walks is a REQUEST to a route, never a declaration of one. */
export function isTestPath(file: string): boolean {
  return (
    /(^|[._\-/])(test|tests|spec|specs|__tests__|testing)([._\-/]|$)/i.test(file) ||
    /_test\.[a-z]+$/i.test(file)
  );
}

function pathish(v: string): boolean {
  if (v.length === 0 || v.length > 200) return false;
  if (v.startsWith('/')) return true;
  return /^[a-z0-9][a-z0-9_\-/:{}*.<>]*$/i.test(v) && v.includes('/');
}

function firstPath(s: CallSite): string | null {
  for (const a of s.args) if (pathish(a)) return a;
  return null;
}

/** A word that reads as a channel / event / topic name rather than prose. */
function channelish(v: string): boolean {
  return v.length > 0 && v.length <= 80 && /^[a-z0-9][a-z0-9_.:\-/]*$/i.test(v) && !v.includes(' ');
}

export const RULES: readonly Rule[] = [
  // ───────────────────────── surface: HTTP routes ─────────────────────────
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
      // An UPPERCASE verb is Go's and Java's route convention and is never a
      // client call, so an empty mount path ("" under a group) still counts.
      // An UPPERCASE verb also licenses a bare mount word: gin's own
      // `g.GET("version", …)` and `g.GET("gotifyinfo", …)` carry no slash and
      // were 2 of the 6 routes this rule missed on gotify, measured 2026-09-10.
      const upper = s.last === s.last.toUpperCase();
      const bareWord = upper && /^[A-Za-z0-9_\-]{0,40}$/.test(p);
      if (!pathish(p) && !bareWord) return null;
      if (/^(https?|wss?):\/\//.test(p)) return null;
      if (s.argc < 2) return null; // a bare `get(url)` is a client call, not a route
      return `HTTP ${s.last.toUpperCase()} ${p === '' ? '(group root)' : p}`;
    }
  },
  {
    id: 'surface.http.handlefunc',
    category: 'surface',
    kind: 'http-route',
    langs: ['go'],
    match: (s) => {
      if (!/^(HandleFunc|Handle)$/.test(s.last)) return null;
      const p = s.args[0];
      return p !== undefined && pathish(p) ? `HTTP ${p}` : null;
    }
  },
  {
    id: 'surface.http.decorator',
    category: 'surface',
    kind: 'http-route',
    langs: ['python', 'java', 'c-sharp', 'php', 'kotlin'],
    match: (s) => {
      if (s.form !== 'decorator') return null;
      const nm = s.last;
      if (/^(route|get|post|put|patch|delete|head|options)$/i.test(nm) && s.recv !== '') {
        const p = firstPath(s);
        return p !== null ? `HTTP ${nm.toUpperCase()} ${p}` : null;
      }
      const m = /^(Get|Post|Put|Patch|Delete|Request)Mapping$/.exec(nm) ?? /^Http(Get|Post|Put|Patch|Delete)$/.exec(nm);
      if (m) {
        const p = firstPath(s) ?? '/';
        return `HTTP ${m[1].toUpperCase()} ${p}`;
      }
      if (/^(Route|Path)$/.test(nm)) {
        const p = firstPath(s);
        return p !== null ? `HTTP ${p}` : null;
      }
      return null;
    }
  },
  {
    id: 'surface.http.django-urls',
    category: 'surface',
    kind: 'http-route',
    langs: ['python'],
    match: (s, c) => {
      if (!/urls?\.py$/.test(c.base)) return null;
      if (!/^(path|re_path|url)$/.test(s.last)) return null;
      const p = s.args[0];
      return p !== undefined && p.length > 0 ? `HTTP ${p === '' ? '/' : p}` : null;
    }
  },
  {
    id: 'surface.http.rails-routes',
    category: 'surface',
    kind: 'http-route',
    langs: ['ruby'],
    match: (s, c) => {
      if (!/routes\.rb$/.test(c.base) && !/^config\/routes\//.test(c.file)) return null;
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

  // ───────────────────────── surface: IPC / bridge ─────────────────────────
  {
    id: 'surface.ipc.electron',
    category: 'surface',
    kind: 'ipc-channel',
    langs: ['typescript', 'tsx', 'javascript'],
    match: (s) => {
      if (!/^(ipcMain|ipcRenderer|ipc)$/.test(s.recv)) return null;
      if (!/^(handle|handleOnce|on|once|invoke|send|sendSync)$/.test(s.last)) return null;
      const ch = s.args[0];
      if (ch === undefined || !channelish(ch)) return null;
      const dir = /^(handle|handleOnce|on|once)$/.test(s.last) ? 'serves' : 'calls';
      return `IPC ${dir} ${ch}`;
    }
  },
  {
    id: 'surface.ipc.bridge',
    category: 'surface',
    kind: 'ipc-channel',
    langs: ['typescript', 'tsx', 'javascript'],
    match: (s) => {
      if (s.last !== 'exposeInMainWorld') return null;
      return `bridge exposes window.${s.args[0] || '?'}`;
    }
  },
  {
    id: 'surface.ipc.webcontents',
    category: 'surface',
    kind: 'ipc-channel',
    langs: ['typescript', 'tsx', 'javascript'],
    match: (s) => {
      if (s.last !== 'send' && s.last !== 'postMessage') return null;
      if (!/^(webContents|win|window|port|parentPort|worker|self)$/.test(s.recv)) return null;
      const ch = s.args[0];
      return ch !== undefined && channelish(ch) ? `IPC push ${ch}` : null;
    }
  },

  // ───────────────────────── surface: message handlers ─────────────────────
  {
    id: 'surface.handler.on',
    category: 'surface',
    kind: 'handler',
    langs: '*',
    match: (s) => {
      if (!/^(on|once|addEventListener|addListener|subscribe|consume|listen)$/.test(s.last)) return null;
      if (/^(ipcMain|ipcRenderer|ipc)$/.test(s.recv)) return null; // owned by the IPC rule
      const ev = s.args[0];
      if (ev === undefined || !channelish(ev)) return null;
      if (s.argc < 2) return null;
      return `handles ${s.recv !== '' ? `${s.recv}.` : ''}${ev}`;
    }
  },

  // ───────────────────────── surface: CLI ─────────────────────────
  {
    id: 'surface.cli.command',
    category: 'surface',
    kind: 'cli-command',
    langs: '*',
    match: (s) => {
      if (!/^(command|subcommand|add_parser|addCommand|add_command|register|SubCommand)$/.test(s.last)) return null;
      const n = s.args[0];
      return n !== undefined && channelish(n) ? `CLI command ${n}` : null;
    }
  },
  {
    id: 'surface.cli.arg',
    category: 'surface',
    kind: 'cli-flag',
    langs: '*',
    match: (s) => {
      if (!/^(add_argument|addOption|option|arg|flag|Flag|StringVar|BoolVar|IntVar)$/.test(s.last)) return null;
      const n = s.args.find((a) => a.startsWith('-')) ?? s.args[0];
      return n !== undefined && n.length > 0 && n.length < 60 && !n.includes(' ') ? `CLI flag ${n}` : null;
    }
  },
  {
    id: 'surface.cli.clap',
    category: 'surface',
    kind: 'cli-command',
    langs: ['rust'],
    match: (s) => {
      if (!/^(Command|App|SubCommand)$/.test(s.recv) || s.last !== 'new') return null;
      const n = s.args[0];
      return n !== undefined && channelish(n) ? `CLI command ${n}` : null;
    }
  },
  {
    id: 'surface.cli.click',
    category: 'surface',
    kind: 'cli-command',
    langs: ['python'],
    match: (s) => {
      if (s.form !== 'decorator') return null;
      if (!/^(command|group)$/.test(s.last) || !/^click$/i.test(s.recv)) return null;
      return `CLI command ${s.args[0] || '(function name)'}`;
    }
  },

  // ───────────────────────── surface: scheduled jobs ─────────────────────────
  {
    id: 'surface.job.schedule',
    category: 'surface',
    kind: 'job',
    langs: '*',
    match: (s) => {
      if (/^(schedule|scheduleJob|cron|addCron|scheduleAtFixedRate|enqueue_at|perform_later)$/.test(s.last) && s.argc > 0) {
        return `scheduled ${s.args[0] || `${s.recv}.${s.last}`}`;
      }
      // `every` and `repeat` are answered ONLY for a named scheduler receiver:
      // measured 2026-09-10, a bare `every` matched Array.prototype.every 700+
      // times on this repository alone.
      if (/^(every|repeat)$/.test(s.last) && /^(sched|schedule|scheduler|cron|job|jobs|timer|clock|agenda)$/i.test(s.recv)) {
        return `scheduled ${s.recv}.${s.last} ${s.args[0] ?? ''}`.trim();
      }
      if (s.form === 'decorator' && /^(Scheduled|task|periodic_task|shared_task)$/.test(s.last)) {
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
    match: (s) => (s.last === 'setInterval' && s.argc >= 2 ? `repeating timer` : null)
  },

  // ───────────────────────── boundary: threads / workers ─────────────────────
  {
    id: 'boundary.worker',
    category: 'boundary',
    kind: 'worker',
    langs: '*',
    match: (s) => {
      if (s.form !== 'new' && s.form !== 'call') return null;
      if (/^(Worker|SharedWorker|Thread|NSThread|ThreadPoolExecutor|ProcessPoolExecutor)$/.test(s.last)) {
        return `starts a ${s.last}`;
      }
      if (s.recv === 'threading' && /^(Thread|Timer)$/.test(s.last)) return `starts a thread`;
      if (s.recv === 'multiprocessing' && /^(Process|Pool)$/.test(s.last)) return `starts a process`;
      return null;
    }
  },
  {
    id: 'boundary.spawn-thread',
    category: 'boundary',
    kind: 'thread',
    langs: ['rust', 'go', 'kotlin', 'swift'],
    match: (s) => {
      if (s.last !== 'spawn') return null;
      if (/^(thread|tokio|task|rayon|async_std)$/.test(s.recv)) return `starts a task on ${s.recv}`;
      return null;
    }
  },
  {
    id: 'boundary.utilityprocess',
    category: 'boundary',
    kind: 'process',
    langs: ['typescript', 'tsx', 'javascript'],
    match: (s) => (s.recv === 'utilityProcess' && s.last === 'fork' ? 'starts a utility process' : null)
  },

  // ───────────────────────── effect: spawns ─────────────────────────
  {
    id: 'effect.spawn.node',
    category: 'effect',
    kind: 'spawn',
    langs: ['typescript', 'tsx', 'javascript'],
    match: (s) => {
      if (!/^(spawn|spawnSync|exec|execSync|execFile|execFileSync|fork)$/.test(s.last)) return null;
      if (s.recv !== '' && !/^(child_process|cp|childProcess|proc)$/.test(s.recv)) return null;
      return `runs ${s.args[0] || '(computed)'}`;
    }
  },
  {
    id: 'effect.spawn.python',
    category: 'effect',
    kind: 'spawn',
    langs: ['python'],
    match: (s) => {
      if (/^(subprocess|sp)$/.test(s.recv) && /^(run|Popen|call|check_call|check_output)$/.test(s.last)) {
        return `runs ${s.args[0] || '(computed)'}`;
      }
      if (s.recv === 'os' && /^(system|popen|execv|spawnv)$/.test(s.last)) return `runs ${s.args[0] || '(computed)'}`;
      return null;
    }
  },
  {
    id: 'effect.spawn.other',
    category: 'effect',
    kind: 'spawn',
    langs: ['go', 'rust', 'ruby', 'java', 'php', 'c-sharp', 'swift', 'objc', 'kotlin'],
    match: (s) => {
      if (s.recv === 'exec' && /^(Command|CommandContext)$/.test(s.last)) return `runs ${s.args[0] || '(computed)'}`;
      if (s.recv === 'Command' && s.last === 'new') return `runs ${s.args[0] || '(computed)'}`;
      if (/^(system|backtick|popen|passthru|shell_exec|proc_open)$/.test(s.last) && s.recv === '') {
        return `runs ${s.args[0] || '(computed)'}`;
      }
      if (s.last === 'exec' && /Runtime/.test(s.callee)) return `runs ${s.args[0] || '(computed)'}`;
      if (s.recv === 'Process' && /^(Start|launch|run)$/.test(s.last)) return `runs ${s.args[0] || '(computed)'}`;
      if (s.recv === 'ProcessBuilder' || s.last === 'ProcessBuilder') return `runs ${s.args[0] || '(computed)'}`;
      if (s.last === 'NSTask' || s.recv === 'NSTask') return `runs ${s.args[0] || '(computed)'}`;
      return null;
    }
  },

  // ───────────────────────── effect: network ─────────────────────────
  {
    id: 'effect.net.client',
    category: 'effect',
    kind: 'net',
    langs: '*',
    match: (s) => {
      const u = s.args.find((a) => /^(https?|wss?|grpc):\/\/[^\s'"]{3,}/.test(a));
      if (u !== undefined) return `talks to ${u.slice(0, 80)}`;
      if (s.last === 'fetch' && s.recv === '' && s.argc > 0) return `HTTP client call`;
      if (/^(axios|requests|httpx|urllib|http|reqwest|HttpClient|URLSession|RestTemplate|WebClient)$/i.test(s.recv)) {
        if (/^(get|post|put|patch|delete|request|send|Do|execute|dataTask)$/i.test(s.last)) return `HTTP client call`;
      }
      if (s.last === 'WebSocket' || s.recv === 'WebSocket') return `opens a websocket`;
      if (/^(Dial|DialContext|connect|Connect)$/.test(s.last) && /^(net|grpc|tls|amqp|redis)$/.test(s.recv)) {
        return `opens a ${s.recv} connection`;
      }
      if (s.recv === 'http' && /^(ListenAndServe|Serve|ListenAndServeTLS)$/.test(s.last)) return `serves HTTP`;
      return null;
    }
  },
  {
    id: 'effect.net.listen',
    category: 'effect',
    kind: 'net',
    langs: '*',
    match: (s) => {
      if (!/^(listen|Listen|bind|run|serve|Serve)$/.test(s.last)) return null;
      if (!/^(app|server|srv|http|net|httpd|uvicorn|listener)$/i.test(s.recv)) return null;
      if (s.argc === 0) return null;
      return `listens (${s.args[0] || 'computed'})`;
    }
  },

  // ───────────────────────── effect: filesystem ─────────────────────────
  {
    id: 'effect.fs.write',
    category: 'effect',
    kind: 'fs-write',
    langs: '*',
    match: (s) => {
      if (!/^(writeFile|writeFileSync|appendFile|appendFileSync|mkdir|mkdirSync|rm|rmSync|unlink|unlinkSync|rename|renameSync|copyFile|copyFileSync|createWriteStream|WriteFile|write_text|write_bytes|makedirs|remove|rmtree|create|write)$/.test(s.last)) {
        return null;
      }
      if (!/^(fs|fsp|promises|os|shutil|pathlib|Path|ioutil|File|std|NSFileManager|FileManager|Files|f)$/i.test(s.recv) && s.recv !== '') {
        return null;
      }
      if (s.recv === '' && !/Sync$/.test(s.last)) return null;
      return `writes the filesystem (${s.last})`;
    }
  },

  // ───────────────────────── store ─────────────────────────
  {
    id: 'store.sql',
    category: 'store',
    kind: 'store-write',
    langs: '*',
    match: (s) => {
      for (const a of s.args) {
        // Anchored at the start of the string or after a statement break:
        // measured 2026-09-10, an unanchored \bUPDATE matched English prose in
        // 40 of this repository's own error messages.
        const m = /(?:^|[\n;])\s*(INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|ALTER\s+TABLE|DROP\s+TABLE)\s+`?"?\[?([A-Za-z_][A-Za-z0-9_.]*)/i.exec(a);
        if (m) return `${m[1].toUpperCase().replace(/\s+/g, ' ')} ${m[2]}`;
      }
      return null;
    }
  },
  {
    id: 'store.kv',
    category: 'store',
    kind: 'store-write',
    langs: '*',
    match: (s) => {
      if (/^(localStorage|sessionStorage|store|cache|redis|kv)$/i.test(s.recv) && /^(setItem|removeItem|set|del|hset|put|save)$/.test(s.last)) {
        return `writes ${s.recv}${s.args[0] ? `[${s.args[0].slice(0, 40)}]` : ''}`;
      }
      return null;
    }
  },
  {
    id: 'store.orm',
    category: 'store',
    kind: 'store-write',
    langs: '*',
    match: (s) => {
      if (!/^(save|create|update|insert|upsert|destroy|delete|persist|bulkCreate|update_all|save!|create!)$/.test(s.last)) {
        return null;
      }
      if (s.recv === '' || /^(this|self)$/.test(s.recv)) return null;
      // Builtins and framework objects that answer to the same verb but write
      // no store; measured 2026-09-10 on fastapi-app, `Object.create(null)` and
      // a generated route table's `.update({…})` were 8 of 12 sampled facts.
      if (/^(Object|Array|Promise|JSON|Map|Set|String|Number|Date|Math|React|window|document|process|console)$/.test(s.recv)) {
        return null;
      }
      if (/(Route|Router|Component|Element|Props|Config|Options|Import)$/.test(s.recv)) return null;
      if (!/^[A-Z]/.test(s.recv) && !/^(db|session|repo|repository|em|orm|prisma|knex|conn|tx|store|manifest)$/i.test(s.recv)) {
        return null;
      }
      return `writes ${s.recv} (${s.last})`;
    }
  },

  // ───────────────────────── tests ─────────────────────────
  {
    id: 'test.case.call',
    category: 'test',
    kind: 'test-case',
    langs: '*',
    match: (s, c) => {
      if (!/(^|[._\-/])(test|spec)([._\-/]|$)/i.test(c.file) && !/(^|\/)(tests?|specs?|__tests__)\//i.test(c.file)) {
        return null;
      }
      if (!/^(it|test|describe|context|Describe|Context|It|scenario|given)$/.test(s.last)) return null;
      const n = s.args[0];
      if (n === undefined || n.length === 0) return null;
      return `${s.last} "${n.slice(0, 90)}"`;
    }
  },
  {
    id: 'test.case.attribute',
    category: 'test',
    kind: 'test-case',
    langs: ['rust', 'java', 'c-sharp', 'kotlin', 'python', 'swift'],
    match: (s) => {
      if (s.form !== 'decorator') return null;
      if (!/^(test|Test|Fact|Theory|TestMethod|pytest|parametrize|tokio::test)$/.test(s.last)) return null;
      return `test attribute @${s.callee.slice(0, 60)}`;
    }
  },

  // ───────────────────────── gates ─────────────────────────
  {
    id: 'gate.auth',
    category: 'gate',
    kind: 'auth',
    langs: '*',
    match: (s) => {
      const n = s.callee;
      if (!/(authenticate|authoriz|requireAuth|require_login|login_required|checkPermission|hasPermission|isAllowed|canAccess|ensureSignedIn|verifyToken|currentUser|authorize|Authorize|permit|access_control)/i.test(n)) {
        return null;
      }
      return `auth gate ${s.callee.slice(0, 60)}`;
    }
  },
  {
    id: 'gate.flag',
    category: 'gate',
    kind: 'flag',
    langs: '*',
    match: (s) => {
      if (/(featureFlag|isEnabled|isFeatureEnabled|flagEnabled|getFlag|variation|checkFlag|toggles?\.)/i.test(s.callee)) {
        return `feature flag ${s.args[0] || s.callee.slice(0, 50)}`;
      }
      return null;
    }
  },
  {
    id: 'gate.refusal',
    category: 'gate',
    kind: 'refusal',
    langs: '*',
    match: (s) => {
      const msg = s.args.find((a) => a.length > 6 && /\s/.test(a));
      if (/^(Error|TypeError|ValueError|RuntimeError|Exception)$/.test(s.last) && s.form === 'new') {
        return msg !== undefined ? `refuses: ${msg.slice(0, 90)}` : null;
      }
      // `require` is deliberately absent: in JS it is the module loader and it
      // matched 300+ imports on this repository before it was removed.
      if (/^(panic|fatal|Fatalf|Fatal|abort|invariant|raise|throwError)$/.test(s.last)) {
        return msg !== undefined ? `refuses: ${msg.slice(0, 90)}` : `refuses (${s.last})`;
      }
      if (s.recv === 'errors' && s.last === 'New') return msg !== undefined ? `refuses: ${msg.slice(0, 90)}` : null;
      return null;
    }
  },
  {
    id: 'gate.guard-name',
    category: 'gate',
    kind: 'guard',
    langs: '*',
    match: (s) => {
      if (s.form === 'decorator' && /^(guard|Guard|RequiresRole|PreAuthorize|Secured|RolesAllowed|Authorize)$/.test(s.last)) {
        return `guard @${s.callee.slice(0, 50)}`;
      }
      if (/^(middleware|use)$/.test(s.last) && s.args.some((a) => /auth|guard|protect|csrf|cors|ratelimit|rate_limit/i.test(a))) {
        return `middleware ${s.args.find((a) => /auth|guard|protect|csrf|cors|ratelimit|rate_limit/i.test(a))}`;
      }
      return null;
    }
  },

  // ───────────────────────── entrypoints (call-shaped) ─────────────────────
  {
    id: 'entrypoint.composition',
    category: 'entrypoint',
    kind: 'composition-root',
    langs: '*',
    match: (s) => {
      if (/^(createApp|express|Flask|FastAPI|Application|Sinatra|Gin|Default|NewRouter|createServer|BrowserWindow|whenReady|bootstrapApplication|runApp|ApplicationContext|SpringApplication)$/.test(s.last)) {
        return `composes ${s.callee.slice(0, 60)}`;
      }
      if (s.recv === 'SpringApplication' && s.last === 'run') return 'composes SpringApplication.run';
      if (s.recv === 'uvicorn' && s.last === 'run') return 'composes uvicorn.run';
      return null;
    }
  }
];

/**
 * DECLARATION-SHAPED SURFACES. Some frameworks declare a route with no call at
 * all: a Next.js app-router handler is `export async function GET(req)` in a
 * file whose PATH is the route. 362 of stoa's 362 handlers were invisible to
 * every call-site rule above, measured 2026-09-10, because there is nothing to
 * call. The rule is a path convention plus an exported name, and it is the
 * shape a rule table needs beside the call-site one.
 */
export function declarationSurfaces(file: string, lines: readonly string[]): Fact[] {
  const out: Fact[] = [];
  const nextRoute = /^(.*\/)?(app|src\/app|pages\/api)\/(.+)\/route\.(ts|tsx|js|mjs)$/.exec(file);
  if (nextRoute !== null) {
    const path = `/${nextRoute[3].replace(/\/route$/, '')}`;
    lines.forEach((ln, i) => {
      const m = /^export\s+(?:async\s+)?(?:const|function)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/.exec(ln);
      if (m === null) return;
      out.push({
        category: 'surface',
        kind: 'http-route',
        subject: `HTTP ${m[1]} ${path}`,
        file,
        line: i + 1,
        rule: 'surface.http.next-export',
        lang: 'path+export',
        evidence: ln.trim().slice(0, 200)
      });
    });
  }
  // A Sveltekit / Remix / Nuxt server route is the same shape with other names.
  const svelte = /^(.*\/)?(src\/routes)\/(.+)\/\+server\.(ts|js)$/.exec(file);
  if (svelte !== null) {
    lines.forEach((ln, i) => {
      const m = /^export\s+(?:async\s+)?(?:const|function)\s+(GET|POST|PUT|PATCH|DELETE)\b/.exec(ln);
      if (m === null) return;
      out.push({
        category: 'surface',
        kind: 'http-route',
        subject: `HTTP ${m[1]} /${svelte[3]}`,
        file,
        line: i + 1,
        rule: 'surface.http.svelte-export',
        lang: 'path+export',
        evidence: ln.trim().slice(0, 200)
      });
    });
  }
  return out;
}

export function applyRules(sites: readonly CallSite[], ctx: Ctx, lines: readonly string[]): Fact[] {
  const out: Fact[] = [];
  const seen = new Set<string>();
  for (const s of sites) {
    for (const r of RULES) {
      if (r.langs !== '*' && !r.langs.includes(ctx.lang)) continue;
      let subject: string | null = null;
      try {
        subject = r.match(s, ctx);
      } catch {
        subject = null;
      }
      if (subject === null) continue;
      // Cross-RULE dedupe, not just cross-site: on a python route two rules
      // legitimately fire, the decorator rule on `(decorator …)` and the
      // method-call rule on the `(call …)` inside it, and counting both halved
      // this prototype's measured precision on fastapi-app before the key
      // dropped the rule id (41 facts for 23 routes, 2026-09-10).
      const key = `${r.category}|${r.kind}|${subject}|${s.line}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        category: r.category,
        kind: r.kind,
        subject,
        file: ctx.file,
        line: s.line,
        rule: r.id,
        lang: ctx.lang,
        evidence: (lines[s.line - 1] ?? '').trim().slice(0, 200)
      });
    }
  }
  return out;
}
