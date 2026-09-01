/**
 * The statusLine tap (Phase 182): the managed script, its settings block and
 * the wire shape it posts back.
 *
 * THE WHOLE MECHANISM IN ONE PARAGRAPH. Claude Code hands its status line
 * command a JSON payload on stdin, and since 2.1.80 that payload carries a
 * `rate_limits` block on every turn, piggybacked on the answer the model
 * already sent. So a session that is running is already being told what its
 * remaining quota is, and Tortie only has to be in the room. It gets there
 * through the settings file it ALREADY writes per session for the activity
 * hooks (src/main/activity/hooks.ts, Phase 13), so this phase opens no second
 * socket, mints no second token and adds no second flag: the `--settings`
 * path is on the argv already, the loopback server is bound already, and the
 * session's 128 bit token is already in that file.
 *
 * THIS FILE IS PURE. No file system, no electron, no clock of its own. It
 * builds the script text, it builds the settings fragment, and it reads the
 * form encoded body back. The file writing, the settings switch and the
 * refusal live in src/main/activity/hooks.ts beside the settings file they
 * belong to, and the ingest rules live in ./service.ts beside the snapshot
 * they change.
 *
 * FOUR RULES THE SCRIPT OBEYS, and every one of them is measured in
 * docs/research/72 section 10 rather than assumed.
 *
 *  1. IT PRINTS NOTHING. A status line command that writes to stdout puts its
 *     line in the pane. Measured: a script that prints leaves an extra row and
 *     a script that prints nothing leaves the pane byte for byte as it was. So
 *     the person's terminal is unchanged, which is the whole permission this
 *     feature has to be invisible.
 *  2. IT GUARDS ON A SUBSTRING FIRST. The binary re runs the status line
 *     whenever token usage moves, which is on every streaming tick of a long
 *     turn, and the startup invocation carries no `rate_limits` key at all. A
 *     plain `case` on the raw text is the cheapest possible answer to "is
 *     there anything here", and nothing else runs when there is not.
 *  3. IT THROTTLES ITSELF PER PANE. One post per pane per fifteen seconds,
 *     kept in a stamp file named for the session. The stamp is written BEFORE
 *     the post, so a slow or failed post still costs the throttle rather than
 *     opening the gate for the next tick.
 *  4. THE TOKEN IS NEVER IN AN ARGV. It is read out of the settings file
 *     Tortie already wrote for this session, at the moment of the post, which
 *     is also what makes a session that outlived a Tortie restart post to the
 *     CURRENT port instead of a dead one. Research 72 section 10.9 is the
 *     rule: argv is world readable through `ps` on this machine, so a URL
 *     carrying a token may not ride in one, not in claude's and not in the
 *     status line command's own.
 *
 * WHAT THE SCRIPT SENDS, and it is the shortest list that answers the ingest
 * rules: a version, the session id stamped into the pane, the config directory
 * as an opaque encoding, and up to four numbers. The payload also carries the
 * person's cwd, their transcript path, their prompt id and a cost block, and
 * none of that is read, encoded or posted.
 */

import type { UsageWindow } from '@shared/usage';
import { boundUsageReset, clampUsagePercent } from '@shared/usage';

/** The tap's route on the server the activity hooks already own. */
export const TAP_PATH_RE = /^\/u\/([0-9a-f]{32})$/;

/** One post per pane per this many seconds, enforced in the script. */
export const TAP_THROTTLE_SECONDS = 15;

/**
 * The tap's own body cap, well under the hook channel's 64 KB. The measured
 * body is under 200 bytes: four numbers, a uuid and a short encoding.
 */
export const TAP_BODY_CAP_BYTES = 4096;

/** The longest config directory encoding the reader will look at. */
const CONFIG_KEY_MAX = 1024;

/**
 * A config directory as the wire carries it: base64url, no padding.
 *
 * It is an ENCODING and not a hash, and the reason it is encoded at all is
 * that a form body has no room for a path with a space or an ampersand in it,
 * which `~/Library/Application Support` has. Main encodes its own the same
 * way and compares the two, and a trailing slash is trimmed on both sides
 * first so one written `~/.claude/` and one written `~/.claude` are the same
 * account. The value is never logged, never stored and never drawn.
 */
export function tapConfigKey(configDir: string | undefined): string {
  return Buffer.from(normalizeConfigDir(configDir), 'utf8').toString(
    'base64url'
  );
}

/** The same directory written one way: no trailing separators. */
export function normalizeConfigDir(configDir: string | undefined): string {
  const raw = (configDir ?? '').trim();
  return raw.replace(/\/+$/, '');
}

/** A wire config key back to the directory it encodes, for comparison only. */
export function decodeConfigKey(key: string): string {
  try {
    return normalizeConfigDir(Buffer.from(key, 'base64url').toString('utf8'));
  } catch {
    return '';
  }
}

/** One window as the tap states it. Percent used, and a reset in epoch ms. */
export interface TapSample {
  /** base64url of the posting session's `CLAUDE_CONFIG_DIR`, possibly empty. */
  configKey: string;
  /** The session id the poster claims, checked against the token's own. */
  sessionId: string;
  fiveHour: UsageWindow | null;
  sevenDay: UsageWindow | null;
}

function formField(body: string, name: string): string | null {
  for (const pair of body.split('&')) {
    const eq = pair.indexOf('=');
    if (eq < 0) continue;
    if (pair.slice(0, eq) !== name) continue;
    try {
      return decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, ' '));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * One window out of the body, or null when the tap named none.
 *
 * THE TRAP THIS FUNCTION EXISTS FOR, docs/research/72 section 10.4. The
 * served endpoint states `utilization` as a FLOAT and `resets_at` as an ISO
 * 8601 STRING. The tap states `used_percentage` as an INTEGER and `resets_at`
 * in UNIX SECONDS. A parser shared between the two sources is wrong for one of
 * them by construction, so ./parse.ts reads the endpoint and this reads the
 * tap, and neither is asked to guess which it is looking at.
 */
function tapWindow(
  body: string,
  prefix: string,
  now: number
): UsageWindow | null {
  const rawPercent = formField(body, `${prefix}_pct`);
  if (rawPercent === null || !/^\d+(\.\d+)?$/.test(rawPercent)) return null;
  const percent = clampUsagePercent(Number(rawPercent));
  if (percent === null) return null;
  const rawReset = formField(body, `${prefix}_reset`);
  // Seconds, ten digits, measured, and corroborated by the binary multiplying
  // it by 1000 before it meets a Date. Anything that is not a plain run of
  // digits is no reset rather than a guess.
  const seconds =
    rawReset !== null && /^\d{1,12}$/.test(rawReset) ? Number(rawReset) : null;
  const resetsAt =
    seconds === null || seconds <= 0
      ? null
      : boundUsageReset(seconds * 1000, now);
  return { percent, resetsAt };
}

/**
 * The posted body as a sample, or null when there is nothing to apply.
 *
 * Null means NO UPDATE and never a cleared meter, which is the research 72
 * ingest rule about an absent window: the tap not naming a window is the tap
 * saying nothing about it, and a bar that emptied itself on silence would be
 * the meter lying.
 */
export function parseTapBody(body: string, now: number): TapSample | null {
  if (body.length === 0 || body.length > TAP_BODY_CAP_BYTES) return null;
  if (formField(body, 'v') !== '1') return null;
  const sessionId = formField(body, 's');
  if (sessionId === null || sessionId.length === 0) return null;
  const configKey = formField(body, 'cfg') ?? '';
  if (configKey.length > CONFIG_KEY_MAX) return null;
  if (!/^[A-Za-z0-9_-]*$/.test(configKey)) return null;
  const fiveHour = tapWindow(body, 'five', now);
  const sevenDay = tapWindow(body, 'seven', now);
  if (fiveHour === null && sevenDay === null) return null;
  return { configKey, sessionId, fiveHour, sevenDay };
}

// ---------------------------------------------------------------------------
// The settings fragment
// ---------------------------------------------------------------------------

/** A path inside a shell command line, quoted for `sh -c`. */
export function shellQuote(path: string): string {
  return `'${path.replace(/'/g, `'\\''`)}'`;
}

/**
 * The `statusLine` block for the settings file.
 *
 * IT IS A WHOLE BLOCK AND IT DOES NOT MERGE, which is the one consequence
 * research 72 section 10.2 measured and this phase has to answer. Claude Code
 * resolves settings sources in the order user, project, local, flag, policy,
 * and the highest source that names a status line wins OUTRIGHT. Measured
 * directly: a flag file naming script A beside a project file naming script B
 * ran A twice and never created B's log at all. So Tortie's block would
 * REPLACE a status line the person wrote, inside Tortie launched sessions
 * only, and silently.
 *
 * THE ANSWER IS THE REFUSAL AND NOT A COMPOSITION, and the reason is the
 * standing one rather than a preference. Composing would mean Tortie's own
 * script reading a command out of a configuration file and running it, which
 * is exactly what the project refuses: configuration selects from choices the
 * compiled world already contains, or names an executable the person has
 * personally confirmed, and his `~/.claude/settings.json` is neither of those
 * to Tortie. So when the person already names a status line anywhere Tortie
 * outranks, Tortie installs none and the meter falls back to the fifteen
 * minute endpoint poll it already had. `claudeStatusLineRefusal` in
 * src/main/activity/hooks.ts is where that decision is taken.
 */
export function statusLineBlock(scriptPath: string): {
  statusLine: { type: 'command'; command: string };
} {
  return {
    statusLine: { type: 'command', command: shellQuote(scriptPath) }
  };
}

/**
 * Does this settings file already name a status line?
 *
 * A file that does not parse is one claude itself skips entirely, its own
 * copy being "Files with errors are skipped entirely", so it names nothing
 * and this answers false.
 */
export function textNamesStatusLine(text: string | null): boolean {
  if (text === null) return false;
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed === null || typeof parsed !== 'object') return false;
    const value = (parsed as Record<string, unknown>)['statusLine'];
    return value !== undefined && value !== null;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// The script
// ---------------------------------------------------------------------------

/** Where the script reads and writes, all of it inside Tortie's own userData. */
export interface TapScriptPlaces {
  /** The directory holding `<sessionId>.json`, one per claude session. */
  settingsDir: string;
  /** The directory holding one throttle stamp per session. */
  stampDir: string;
}

/**
 * The managed script, generated whole so there is nothing to keep in step.
 *
 * It is `/bin/sh` and uses `cat`, `date`, `grep`, `sed`, `tr`, `base64` and
 * `curl`, all of which ship with macOS. It reads two things out of its own
 * environment, `GMUX_SESSION_ID` and `GMUX_MANAGED`, both measured present in
 * a status line invocation with the values Tortie stamped, so a session's
 * identity needs nothing parsed out of the payload.
 *
 * `--noproxy '*'` is not a detail. A person with `http_proxy` set would
 * otherwise have their quota numbers posted through their proxy instead of to
 * the loopback address one line above it.
 */
export function claudeStatusLineScript(places: TapScriptPlaces): string {
  const settings = shellQuote(places.settingsDir);
  const stamps = shellQuote(places.stampDir);
  return `#!/bin/sh
# Tortie's managed status line. Generated by Tortie (Phase 182); edits are
# overwritten on the next launch. It prints NOTHING, so the pane is unchanged.
#
# It posts the rate_limits block Claude Code hands it, and nothing else, to
# the loopback address Tortie already wrote into this session's settings file.
# It never reads a credential and never leaves this machine.

payload=$(cat)

# 1. The cheap guard. No rate_limits, no work: this is every streaming tick.
case "$payload" in
  *rate_limits*) ;;
  *) exit 0 ;;
esac

# 2. Ours, and one of ours we can name.
[ "\${GMUX_MANAGED:-}" = "1" ] || exit 0
sid=\${GMUX_SESSION_ID:-}
case "$sid" in
  '' | *[!A-Za-z0-9._-]*) exit 0 ;;
esac

# 3. The per pane throttle, stamped before the post rather than after.
stamp=${stamps}/"$sid"
now=$(date +%s)
last=$(cat "$stamp" 2>/dev/null)
case "$last" in
  '' | *[!0-9]*) last=0 ;;
esac
[ $((now - last)) -ge ${TAP_THROTTLE_SECONDS} ] || exit 0

# 4. The destination, read from this session's own settings file at post time.
#    Never from an argv: argv is world readable through ps.
base=$(grep -o 'http://127\\.0\\.0\\.1:[0-9]\\{1,5\\}/h/[0-9a-f]\\{32\\}' \\
  ${settings}/"$sid".json 2>/dev/null | head -1)
[ -n "$base" ] || exit 0
url=$(printf '%s' "$base" | sed 's|/h/|/u/|')

# 5. The numbers. Everything from the FIRST rate_limits key onward is kept,
#    which can never drop the real block, and whitespace goes so the two
#    shapes below stay simple. The braces are what make them unambiguous:
#    context_window carries a used_percentage of its own and [^}] cannot
#    reach it from inside five_hour.
key='"rate_limits"'
rl=\${payload#*$key}
rl=$(printf '%s' "$rl" | tr -d ' \\t\\n')
five=$(printf '%s' "$rl" | grep -o '"five_hour":{[^}]*}' | head -1)
seven=$(printf '%s' "$rl" | grep -o '"seven_day":{[^}]*}' | head -1)
field() {
  printf '%s' "$2" | grep -o "\\"$1\\":[0-9][0-9.]*" | head -1 | sed 's/.*://'
}
fp=$(field used_percentage "$five")
fr=$(field resets_at "$five")
sp=$(field used_percentage "$seven")
sr=$(field resets_at "$seven")
[ -n "$fp" ] || [ -n "$sp" ] || exit 0

# The config directory, trailing separators trimmed the same way main trims
# them, then base64url. sed is deliberately NOT used here: it would append a
# newline to a value that has none, and that byte would land inside the
# encoding and make every post look like a foreign account.
cfgdir=\${CLAUDE_CONFIG_DIR:-}
while :; do
  case "$cfgdir" in
    */) cfgdir=\${cfgdir%/} ;;
    *) break ;;
  esac
done
cfg=$(printf '%s' "$cfgdir" | base64 | tr -d '\\n' | tr '+/' '-_' | tr -d '=')
body="v=1&s=$sid&cfg=$cfg"
[ -n "$fp" ] && body="$body&five_pct=$fp"
[ -n "$fr" ] && body="$body&five_reset=$fr"
[ -n "$sp" ] && body="$body&seven_pct=$sp"
[ -n "$sr" ] && body="$body&seven_reset=$sr"

printf '%s' "$now" > "$stamp" 2>/dev/null
printf '%s' "$body" | curl -s -m 3 --noproxy '*' -o /dev/null \\
  -H 'content-type: application/x-www-form-urlencoded' \\
  --data-binary @- "$url" >/dev/null 2>&1

exit 0
`;
}
