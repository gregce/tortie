#!/usr/bin/env node
/**
 * `npm run measure:p342`. The re-derivation outside Electron: Tortie's
 * SHIPPING far strings on seven Linux distributions' OWN tmux, in throwaway
 * containers in the operator's Docker (Phase 342, build/p342/SPEC.md §7.4).
 *
 * ## What it measures, per row
 *
 * The rows are build/docker-run.mjs's seven (`P342_ROWS` narrows): Ubuntu
 * 22.04 (3.2a), Debian 12 (3.3a), Ubuntu 24.04 (3.4), Debian 13 (3.5a),
 * Ubuntu 26.04 (3.6), Fedora and Arch (3.7c, Arch emulated, D28). Every row
 * gets its tmux from its own package manager INSIDE the container. Then:
 *
 *   facts      the distribution, the architecture, `tmux -V`, the package,
 *              coreutils, findutils, `/bin/sh` and dash.
 *   options    the twelve rows (emitted from `src/` by drive-p342.mts, byte for
 *              byte) set and read back one by one on a scratch server, and
 *              `mode-style`'s fallback: what each version took, refused and in
 *              which words (§5.1). → matrix.json
 *   refusals   tmux's own refusal of a value or a name in its seven shapes,
 *              which D6's reader is built from (§14 M5). → refusals.json
 *   dollar     sixteen stored values holding `$`, a session name and a folder
 *              (§14 M9), read back. → dollar-3.4.json
 *   capture    one joined capture and one without, over the same printed
 *              lines (§14 M10). → capj-3.2a.txt, capj-3.3a.txt
 *   dialect    Phase 324's eight comparable control-dialect steps over a raw
 *              control child on a fresh scratch server, normalised by
 *              build/p324/drive-p324.mts's OWN `normalize` and `SHELL_VOLATILE`
 *              (lifted from its text, never copied), compared with the 3.6
 *              row's (§Attack M-A2). Each row's `control: true` rests on this.
 *              → dialect.json
 *   keys       the 33 key names of build/fixtures/screen/keys-encoding.json in
 *              its seven modes, through build/p342/key-recorder.sh in a pane on
 *              a server set up as Prepare sets it, graded against that
 *              fixture's 3.6a cells on D22's two measured differences and
 *              nothing else (§Attack M-A3). → keys.json
 *   indicator  copy mode's position box in a real attached client's top row,
 *              entered with `-e` and with `-e -H` (D8 b, D11, §14 M7).
 *   far texts  EVERY one of the catalogue's 30 far texts, once, over one
 *              honest fixture each, against the same text's answer on THIS
 *              Mac over the same fixture (answer word, field count, line
 *              count) (§Attack F13); the three edited texts over a 644 and a
 *              755 file, 755, 700 and set-group-ID parents, a rename, a rename
 *              onto another file and onto a hard link of the same one, and
 *              `store-list` (D15, §Attack M-A1); `folder-pin` and `tree-list`
 *              under `/bin/sh` and the distribution's dash where it has one.
 *   drive      build/p342/drive-p342.mts under the pinned tsx, through ONE ssh
 *              stand-in per row: the SHIPPING `readRemoteTmuxVersion`,
 *              `ensureRemoteServer` born and warm, the list read by
 *              `parseRemoteListLine` and `undoDollarEscape`, the shipping
 *              control client (greeting, list, the scroll shapes through
 *              scroll.ts, the phone's 35 key names) and the attach's `=$N`.
 *   pair       Debian 12 and 13 only, LAST: the backports' tmux installed under
 *              a running server; the old live connection, a new one, an attach
 *              and the server after (D2, §14 M8, §Attack M-A6).
 *
 * ## What it writes, and grades
 *
 * The seven fixtures of SPEC §7.3, into the run's scratch directory, and
 * compares them with the committed ones in build/fixtures/p342/, cell by cell
 * on what was measured (the dates and package strings are printed, never
 * compared). `--write` puts them in build/fixtures/p342/ instead, which is how
 * a builder commits a re-measurement. Every grader below runs on every run.
 * `--self-test` grades the COMMITTED fixtures, then one-cell corruptions of
 * them, and starts nothing.
 *
 * ## What it starts, and what it touches
 *
 * Containers, only through build/docker-run.mjs (withContainers), which
 * removes every one and every image it pulled in a `finally` and fails the run
 * when Docker's lists afterwards differ from the lists before. The pinned tsx
 * for drive-p342.mts and build/p336/far-texts.mts. `/bin/sh` and `/bin/dash`
 * on this Mac for the far texts' Mac answers, over one scratch tree under
 * `/private/tmp` with HOME, ZDOTDIR and HISTFILE scratch, removed in a
 * `finally`. No Electron, no ssh, no model, no agent; nothing names `-L gmux`.
 * His shell history is read (size and time only) before and after, and a run
 * during which it moved says so and exits 1.
 *
 * Exit 0 when every grader passed, 1 when one failed or Docker was not left as
 * it was found, 2 when it could not run (no Docker, under 10 GB free).
 */

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

import { ROWS, assertDockerAsFound, lastReport, withContainers } from '../docker-run.mjs';
import { tsxCli } from '../ts-runner.mjs';
import { answerOf, loadFarTexts } from '../p336/script-arms.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[measure:p342]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const FIXTURES = join(REPO, 'build', 'fixtures', 'p342');

/** The row of each distribution, the version it measured, oldest first. */
export const ROW_VERSION = Object.freeze({ u2204: '3.2a', d12: '3.3a', u2404: '3.4', d13: '3.5a', u2604: '3.6', fed: '3.7c', arch: '3.7c' });
/** The matrix's order, which each option's `oldest` is read along. */
export const MATRIX_ORDER = Object.freeze(['3.2a', '3.3a', '3.4', '3.5a', '3.6', '3.7c']);
/** The row the dialect and the keys are compared with. */
const REFERENCE_ROW = 'u2604';
/** The four rows D1 adds, and the programs D2 measured against each. */
export const D2_PROGRAMS = Object.freeze({ '3.2a': ['3.2a'], '3.3a': ['3.3a', '3.5a'], '3.4': ['3.4'], '3.5a': ['3.5a'] });
/** The 33 key names and seven modes of build/fixtures/screen/keys-encoding.json. */
const KEY_MODES = ['normal', 'decckm', 'decckm,keypad', 'mok1', 'mok2', 'kitty', 'paste'];
/** The sixteen stored values of §14 M9. */
export const DOLLAR_VALUES = Object.freeze([
  'a $HOME b',
  '\\$x',
  '${x}',
  '$_a',
  '$ab$cd',
  '$a b$c',
  'a$Bc',
  'cost $5',
  '$',
  '$1',
  '$-',
  '$$',
  '$#',
  '$}',
  '$é',
  'x$'
]);

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const b64 = (text) => Buffer.from(text, 'utf8').toString('base64');

// ---------------------------------------------------------------------------
// The scripts that run INSIDE a container, as root unless said otherwise.
// Every tmux server is on a scratch socket named here and killed before the
// script ends. They name no container program: they run inside one.
// ---------------------------------------------------------------------------

const FACTS = [
  '. /etc/os-release 2>/dev/null; printf "os=%s\\n" "${PRETTY_NAME:-unknown}"',
  'printf "arch=%s\\n" "$(uname -m)"',
  'printf "tmux=%s\\n" "$(tmux -V 2>&1)"',
  'if command -v dpkg-query >/dev/null 2>&1; then printf "package=%s\\n" "$(dpkg-query -W -f=\'${Version}\' tmux 2>/dev/null)"; fi',
  'if command -v rpm >/dev/null 2>&1; then printf "package=%s\\n" "$(rpm -q tmux 2>/dev/null)"; fi',
  'if command -v pacman >/dev/null 2>&1; then printf "package=%s\\n" "$(pacman -Q tmux 2>/dev/null)"; fi',
  'printf "coreutils=%s\\n" "$( (stat --version 2>&1 || true) | head -n 1)"',
  'printf "findutils=%s\\n" "$( (find --version 2>&1 || true) | head -n 1)"',
  'printf "sh=%s\\n" "$(readlink -f /bin/sh)"',
  'printf "dash=%s\\n" "$(command -v dash || true)"',
  'printf "useradd=%s\\n" "$(useradd -D 2>/dev/null | grep "^SHELL=" | cut -d= -f2)"'
].join('\n');

const OPTIONS = `
T="tmux -L p342opt -f /dev/null"
$T kill-server >/dev/null 2>&1
$T start-server \\; set-option -s exit-empty off >/dev/null 2>&1
while IFS='|' read -r scope name value; do
  [ -n "$name" ] || continue
  err=$($T set-option "$scope" "$name" "$value" 2>&1 >/dev/null); rc=$?
  back=$($T show-options "\${scope}v" "$name" 2>/dev/null)
  printf 'OPT|%s|%s|%s|%s\\n' "$name" "$rc" "$(printf '%s' "$err" | tail -n 1)" "$back"
done
err=$($T set-option -g mode-style 'bg=default,fg=default' 2>&1 >/dev/null); rc=$?
printf 'FALLBACK|mode-style|%s|%s|%s\\n' "$rc" "$(printf '%s' "$err" | tail -n 1)" "$($T show-options -gv mode-style 2>/dev/null)"
$T kill-server >/dev/null 2>&1
`;

const REFUSALS = `
T="tmux -L p342ref -f /dev/null"
$T kill-server >/dev/null 2>&1
$T start-server \\; set-option -s exit-empty off >/dev/null 2>&1
r() { err=$($T set-option "$1" "$2" "$3" 2>&1 >/dev/null); rc=$?; printf 'REF|%s|%s|%s|%s|%s\\n' "$1" "$2" "$3" "$rc" "$(printf '%s' "$err" | tail -n 1)"; }
r -g mouse maybe
r -g history-limit abc
r -g history-limit -5
r -g history-limit 2147483648
r -g history-limit 99999999999
r -g remain-on-exit sometimes
r -s escape-time x
r -s escape-time 99999999999
r -g mode-style bogus=1
r -g no-such-option x
r -g status sometimes
$T kill-server >/dev/null 2>&1
`;

const DOLLAR = `
T="tmux -L p342dol -f /dev/null"
$T kill-server >/dev/null 2>&1
$T new-session -d -s base -x 80 -y 24 -- /bin/sh
while IFS= read -r v; do
  $T set-option -t base @gmux-name "$v" 2>/dev/null
  printf 'DOLLAR\\t%s\\t%s\\n' "$v" "$($T show-options -t base -v @gmux-name 2>&1)"
done
mkdir -p '/tmp/p342 $d'
$T new-session -d -s pth -c '/tmp/p342 $d' -- /bin/sh
printf 'PATH\\t%s\\n' "$($T display-message -p -t pth '#{session_path}')"
$T new-session -d -s 'cost $HOME' -- /bin/sh 2>/dev/null
$T has-session -t '=cost $HOME' 2>/dev/null; rc=$?
printf 'NAME\\t%s\\t%s\\n' "$rc" "$($T list-sessions -F '#{session_name}' 2>/dev/null | grep '^cost' | head -n 1)"
$T new-session -d -s 'cost _HOME' -- /bin/sh 2>/dev/null
$T has-session -t '=cost _HOME' 2>/dev/null; printf 'UNDERSCORE\\t%s\\n' "$?"
$T kill-server >/dev/null 2>&1
rm -rf '/tmp/p342 $d'
`;

const CAPTURE = `
T="tmux -L p342cap -f /dev/null"
$T kill-server >/dev/null 2>&1
cat > /tmp/p342cap.sh <<'EOS'
i=1; while [ $i -le 30 ]; do printf '%s\\n' "$i"; i=$((i+1)); done
printf '\\033[31mred\\033[39m\\n'
printf 'trail   \\n'
printf 'tab\\there\\n'
printf 'wrap-%s\\n' 0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
printf '\\033[1;32mbold green\\033[0m after\\n'
printf 'end\\n'
EOS
$T new-session -d -s cap -x 80 -y 24 -- /bin/sh -c 'sh /tmp/p342cap.sh; exec sleep 7200'
sleep 1.5
$T capture-pane -p -e -J -t cap -S -100 > /tmp/p342capj.txt
$T capture-pane -p -e -t cap -S -100 > /tmp/p342cap.txt
printf 'CAPJ %s %s\\n' "$(wc -c < /tmp/p342capj.txt | tr -d ' ')" "$(grep -c ' $' /tmp/p342capj.txt)"
printf 'CAP %s %s\\n' "$(wc -c < /tmp/p342cap.txt | tr -d ' ')" "$(grep -c ' $' /tmp/p342cap.txt)"
printf 'B64J %s\\n' "$(base64 < /tmp/p342capj.txt | tr -d '\\n')"
printf 'B64 %s\\n' "$(base64 < /tmp/p342cap.txt | tr -d '\\n')"
$T kill-server >/dev/null 2>&1
rm -f /tmp/p342capj.txt /tmp/p342cap.txt /tmp/p342cap.sh
`;

/** The dialect steps, the adversary's method (SPEC §Attack M-A2), with the shipping list format. */
const dialectScript = (listFormat) => `
export SHELL=/bin/sh
T="tmux -L p342dia -f /dev/null"
$T kill-server >/dev/null 2>&1
rm -f /tmp/d.in /tmp/d.out /tmp/d.marks; mkfifo /tmp/d.in
( $T -C new-session -A -s gmux-control < /tmp/d.in > /tmp/d.out 2>&1 ) &
exec 7>/tmp/d.in
mark() { printf '%s %s\\n' "$1" "$(wc -c < /tmp/d.out | tr -d ' ')" >> /tmp/d.marks; }
send() { printf '%s\\n' "$1" >&7; }
sleep 1.5; mark greeting
send 'refresh-client -f no-output'; sleep 0.6; mark nooutput
$T new-session -d -s p324-w; sleep 0.6; mark create
$T rename-session -t =p324-w p324-w-2; sleep 0.6; mark rename
$T new-window -t =p324-w-2; sleep 0.6; mark window
send "list-sessions -F '${listFormat}'"; sleep 0.6; mark list
$T kill-session -t =p324-w-2; sleep 0.6; mark kill
send 'kill-server'; sleep 1.2; mark exit
exec 7>&-
sleep 0.3
echo "VERSION $(tmux -V)"
echo "MARKS_BEGIN"; cat /tmp/d.marks; echo "MARKS_END"
echo "RAW_BEGIN"; base64 < /tmp/d.out | tr -d '\\n'; echo; echo "RAW_END"
$T kill-server >/dev/null 2>&1
rm -f /tmp/d.in /tmp/d.out /tmp/d.marks
`;

/** The keys: a server set up as Prepare sets it, the recorder in a pane, one mode at a time. */
const keysScript = (rows, keyNames) => `
export SHELL=/bin/sh
K="tmux -L p342key -f /dev/null"
KEYS='${keyNames.join(' ')}'
for mode in ${KEY_MODES.map((m) => `'${m}'`).join(' ')}; do
  $K kill-server >/dev/null 2>&1
  rm -f /tmp/k.bin
  $K start-server \\; set-option -s exit-empty off >/dev/null 2>&1
  while IFS='|' read -r scope name value; do
    [ -n "$name" ] || continue
    $K set-option "$scope" "$name" "$value" >/dev/null 2>&1 || true
  done <<'ROWS'
${rows.map((r) => `${r.scope}|${r.name}|${r.value}`).join('\n')}
ROWS
  pane=$($K new-session -d -P -F '#{pane_id}' -s k -x 80 -y 24 "sh /tmp/p342-key-recorder.sh '$mode' /tmp/k.bin")
  sleep 0.8
  for k in $KEYS; do
    $K send-keys -t "$pane" "$k"
    $K send-keys -t "$pane" -H 7c
  done
  sleep 0.8
  $K kill-server >/dev/null 2>&1
  sleep 0.2
  printf 'MODE %s %s\\n' "$mode" "$(od -An -tx1 -v /tmp/k.bin | tr -d ' \\n')"
done
rm -f /tmp/k.bin
`;

const INDICATOR = `
export SHELL=/bin/sh
T="tmux -L p342ind -f /dev/null"
O="tmux -L p342out -f /dev/null"
$T kill-server >/dev/null 2>&1; $O kill-server >/dev/null 2>&1
$T start-server \\; set-option -s exit-empty off >/dev/null 2>&1
$T set-option -g history-limit 25000 >/dev/null 2>&1
$T set-option -g status off >/dev/null 2>&1
# Tortie's own row, as Prepare writes it (refused by 3.2a to 3.5a, which is
# what -H stands in for there; taken from 3.6, where row 0 then reads the same
# both ways, §14 M7).
$T set-option -g copy-mode-position-format '' >/dev/null 2>&1
sid=$($T new-session -d -P -F '#{session_id}' -s ind -x 80 -y 24 -- /bin/sh -c 'seq 1 3000; exec sleep 7200')
sleep 1
$O start-server \\; set-option -g remain-on-exit on >/dev/null 2>&1
# The id is single-quoted inside the command: a tmux id begins with $, and the
# outer pane's own shell would otherwise read $0 as its own name and attach
# nothing, which drew an empty top row on every version.
$O new-session -d -x 80 -y 24 -s outer "env -u TMUX TERM=xterm-256color tmux -L p342ind -f /dev/null attach -t '$sid'"
sleep 1.5
$T copy-mode -e -t "$sid"; $T send-keys -t "$sid" -X -N 30 scroll-up; sleep 0.8
printf 'PLAIN\\t%s\\n' "$($O capture-pane -p -t outer | head -n 1)"
printf 'PLAINE\\t%s\\n' "$($O capture-pane -p -e -t outer | head -n 1 | base64 | tr -d '\\n')"
$T send-keys -t "$sid" -X cancel; sleep 0.5
$T copy-mode -e -H -t "$sid"; $T send-keys -t "$sid" -X -N 30 scroll-up; sleep 0.8
printf 'HIDDEN\\t%s\\n' "$($O capture-pane -p -t outer | head -n 1)"
printf 'HIDDENE\\t%s\\n' "$($O capture-pane -p -e -t outer | head -n 1 | base64 | tr -d '\\n')"
printf 'STATE\\t%s\\n' "$($T display-message -p -t "$sid" '#{pane_in_mode} #{scroll_position}')"
$T send-keys -t "$sid" -X cancel
$O kill-server >/dev/null 2>&1; $T kill-server >/dev/null 2>&1
`;

/** The pair: the backports' tmux installed under a running server (D2, §14 M8, §Attack M-A6). */
const pairScript = (suite) => `
export SHELL=/bin/sh
export DEBIAN_FRONTEND=noninteractive
T="tmux -L p342pair -f /dev/null"
$T kill-server >/dev/null 2>&1
$T start-server \\; set-option -s exit-empty off >/dev/null 2>&1
$T new-session -d -s keep -x 80 -y 24 -- /bin/sh -c 'seq 1 100; exec sleep 7200'
rm -f /tmp/pl.in /tmp/pl.out; mkfifo /tmp/pl.in
( $T -C new-session -A -s gmux-control < /tmp/pl.in > /tmp/pl.out 2>&1 ) &
exec 7>/tmp/pl.in
sleep 1
printf 'refresh-client -f no-output\\n' >&7; sleep 0.5
printf 'BEFORE\\t%s\\t%s\\n' "$(tmux -V)" "$($T display-message -p '#{version} #{pid}')"
echo 'deb http://deb.debian.org/debian ${suite} main' > /etc/apt/sources.list.d/p342-bp.list
apt-get update -qq >/dev/null 2>&1
apt-get install -y -qq -t ${suite} tmux >/dev/null 2>&1; printf 'INSTALL\\t%s\\n' "$?"
printf 'AFTER\\t%s\\t%s\\n' "$(tmux -V)" "$($T display-message -p '#{version} #{pid}' 2>&1)"
before=$(wc -c < /tmp/pl.out | tr -d ' ')
printf "list-sessions -F '#{session_name}'\\n" >&7; sleep 1
printf 'OLDLIVE\\t%s\\n' "$(tail -c +$((before + 1)) /tmp/pl.out | tr '\\n' '|')"
rm -f /tmp/pl2.out /tmp/pl2.in; mkfifo /tmp/pl2.in
# Its input held open, as the first client's is: on /dev/null a control client
# reads end of file at once and answers %exit whatever the pair, which read the
# working 3.3a and 3.5a pair as broken.
( timeout 10 $T -C new-session -A -s gmux-control < /tmp/pl2.in > /tmp/pl2.out 2>&1; echo "$?" > /tmp/pl2.exit ) &
exec 8>/tmp/pl2.in
sleep 11
exec 8>&-
printf 'NEWLIVE\\t%s\\t%s\\t%s\\n' "$(wc -c < /tmp/pl2.out | tr -d ' ')" "$(cat /tmp/pl2.exit 2>/dev/null)" "$(head -c 60 /tmp/pl2.out | tr '\\n' '|')"
if command -v script >/dev/null 2>&1; then
  # Bounded: an attach that works stays attached, and a pair that works is the
  # case this must not hang on.
  a=$(TERM=xterm-256color timeout 5 script -qec "$T attach -t =keep" /dev/null 2>&1 </dev/null | head -c 200 | tr -d '\\r' | tr '\\n' '|')
  printf 'ATTACH\\t%s\\n' "$a"
fi
printf 'SERVER\\t%s\\t%s\\n' "$($T display-message -p '#{version} #{pid}' 2>&1)" "$($T list-sessions -F '#{session_name}' 2>&1 | tr '\\n' ' ')"
exec 7>&-
$T kill-server >/dev/null 2>&1
rm -f /tmp/pl.in /tmp/pl.out /tmp/pl2.in /tmp/pl2.out /tmp/pl2.exit /etc/apt/sources.list.d/p342-bp.list
`;

/**
 * The far texts' fixture: ONE tree, made the same way on this Mac and in the
 * container (POSIX sh and git, nothing else), so the two answers are over the
 * same shape. `$1` is the tree's root. It prints the repository's HEAD.
 */
const FAR_FIXTURE = `
set -e
B=$1
rm -rf "$B"; mkdir -p "$B"; cd "$B"
mkdir repo; cd repo
git init -q 2>/dev/null; git symbolic-ref HEAD refs/heads/main
git config user.name p342; git config user.email p342@example.invalid
git config remote.origin.url https://example.invalid/p342.git
printf 'one\\n' > a.txt; printf '# p342\\n' > README.md
git add -A; git commit -q -m 'p342 base'
printf 'two\\n' > a.txt; git commit -q -am 'p342 second'
printf 'three\\n' > a.txt; printf 'u\\n' > u.txt
cd "$B"
mkdir -p store/sub; printf 'abc\\n' > store/s1.jsonl; printf 'defg\\n' > store/sub/s2.jsonl
mkdir -p tree/sub real/inner; printf 'f\\n' > tree/sub/f; printf 'x\\n' > real/inner/f
ln -s "$B/real" tree/link; ln -s "$B/real" rootlink
mkdir -p bin; printf '#!/bin/sh\\necho hi\\n' > bin/p342prog; chmod 755 bin/p342prog
mkdir -p ctx/d1; printf 'c\\n' > ctx/d1/c.md; printf 'r\\n' > ctx/r.md; ln -s "$B/ctx/d1" ctx/ld
mkdir -p arch/src; printf 'export const x = 1;\\n' > arch/src/a.ts; printf '{}\\n' > arch/package.json
mkdir -p fp/p755 fp/p700 fp/sg
printf 'old\\n' > fp/a.txt; chmod 644 fp/a.txt
printf 'x\\n' > fp/b.sh; chmod 755 fp/b.sh
printf 'k\\n' > fp/k.txt; ln fp/k.txt fp/kk.txt
printf 'e\\n' > fp/e.txt
chmod 755 fp/p755; chmod 700 fp/p700
chmod 2775 fp/sg 2>/dev/null || true
printf 'HEAD=%s\\n' "$(git -C "$B/repo" rev-parse HEAD)"
`;

/**
 * One call of every far text, over the fixture at `B` with the home `H`.
 * `pin` is folder-pin's answer for the folder a folder-bound write is handed,
 * read by the same shell first. git-clone runs LAST, so its clone is in no
 * other text's listing.
 */
export function farCalls(B, H, head) {
  const lines = (...xs) => xs.join('\n');
  return [
    { id: 'machine-facts', args: [] },
    { id: 'store-list', args: [`${B}/store`, '2', '0'] },
    { id: 'store-head', args: [`${B}/store/s1.jsonl`, '3'] },
    { id: 'store-copy', args: [`${B}/store/s1.jsonl`, '100'] },
    { id: 'image-put', args: ['p342.png', b64('hello')] },
    { id: 'review-list', args: [`${B}/repo`] },
    { id: 'review-file', args: [`${B}/repo`, 'a.txt', '1000'] },
    { id: 'dir-list', args: [B, '50'] },
    { id: 'program-find', args: ['p342prog', `${B}/bin`, '/nonexistent'] },
    { id: 'agents-find', args: [`${B}/bin`, '/nonexistent', lines('p342prog', 'nope /nonexistent')] },
    { id: 'repo-find', args: [B, '3', '10'] },
    { id: 'tree-list', args: [`${B}/tree`, '2', '100'] },
    { id: 'tree-list', label: 'tree-list under a root that is a link (Phase 343)', args: [`${B}/rootlink`, '2', '100'] },
    { id: 'repo-search', args: [`${B}/repo`, 'three', '', '100', '200'] },
    { id: 'repo-files', args: [`${B}/repo`, '100'] },
    { id: 'repo-facts', args: [`${B}/repo`] },
    { id: 'repo-branch', args: [`${B}/repo`] },
    { id: 'repo-history', args: [`${B}/repo`, '50'] },
    { id: 'commit-files', args: [`${B}/repo`, head, '', '1000'] },
    { id: 'context-read', args: [lines(`${B}/ctx`, `${B}/ctx/ld`), '2', lines(`${B}/ctx/r.md`, `${B}/ctx/d1`)] },
    { id: 'arch-read', args: [`${B}/arch`, lines('src/a.ts', 'package.json'), 'package.json', 'src'] },
    { id: 'arch-git', args: [`${B}/repo`, 'rev-parse-head', ''] },
    { id: 'env-names', args: ['~~', 'HOME PATH P342_NONE'] },
    { id: 'folder-pin', args: [`${B}/fp`] },
    { id: 'file-put', label: 'file-put over a 644 file', pin: `${B}/fp`, args: (pin) => [`${B}/fp`, 'a.txt', sha256('old\n'), b64('new\n'), pin], file: `${B}/fp/a.txt` },
    { id: 'file-put', label: 'file-put over a 755 file', pin: `${B}/fp`, args: (pin) => [`${B}/fp`, 'b.sh', sha256('x\n'), b64('y\n'), pin], file: `${B}/fp/b.sh` },
    { id: 'file-put', label: 'file-put of a new file', pin: `${B}/fp`, args: (pin) => [`${B}/fp`, 'n.txt', 'new', b64('n\n'), pin], file: `${B}/fp/n.txt` },
    { id: 'dir-new', label: 'dir-new under a 755 parent', pin: `${B}/fp/p755`, args: (pin) => [`${B}/fp/p755`, 'made', pin], file: `${B}/fp/p755/made` },
    { id: 'dir-new', label: 'dir-new under a 700 parent', pin: `${B}/fp/p700`, args: (pin) => [`${B}/fp/p700`, 'made', pin], file: `${B}/fp/p700/made` },
    { id: 'dir-new', label: 'dir-new under a set-group-ID parent', pin: `${B}/fp/sg`, args: (pin) => [`${B}/fp/sg`, 'made', pin], file: `${B}/fp/sg/made` },
    { id: 'entry-rename', label: 'entry-rename onto a free name', pin: `${B}/fp`, args: (pin) => [`${B}/fp`, 'e.txt', 'e2.txt', pin] },
    { id: 'entry-rename', label: 'entry-rename onto another file', pin: `${B}/fp`, args: (pin) => [`${B}/fp`, 'e2.txt', 'a.txt', pin] },
    { id: 'entry-rename', label: 'entry-rename onto a hard link of the same file', pin: `${B}/fp`, args: (pin) => [`${B}/fp`, 'k.txt', 'kk.txt', pin] },
    { id: 'git-stage', pin: `${B}/repo`, args: (pin) => [`${B}/repo`, 'a.txt', `${B}/repo`, '', pin] },
    { id: 'git-unstage', pin: `${B}/repo`, args: (pin) => [`${B}/repo`, 'a.txt', `${B}/repo`, '', pin] },
    { id: 'git-stage', label: 'git-stage again', pin: `${B}/repo`, args: (pin) => [`${B}/repo`, 'a.txt', `${B}/repo`, '', pin] },
    { id: 'git-commit', pin: `${B}/repo`, args: (pin) => [`${B}/repo`, 'none', 'p342 commit', `${B}/repo`, '', pin] },
    { id: 'git-clone', args: [`${B}/repo`, `${B}/clone`] }
  ];
}

/** An answer, normalised so this Mac's and a Linux machine's can be compared: paths, times, sums, ids. */
export function normalizeAnswer(text, B, H) {
  let t = String(text ?? '');
  for (const [from, to] of [
    [B, '<B>'],
    [H, '<H>']
  ]) {
    if (from) t = t.split(from).join(to);
  }
  return t
    .replace(/\b1[0-9]{9}\b/g, '<T>')
    .replace(/\b[0-9a-f]{40}\b/g, '<SHA1>')
    .replace(/\b[0-9a-f]{7,12}\b/g, '<ABBR>')
    .replace(/\b[0-9]+:[0-9]+\b/g, '<ID>');
}

/**
 * One answer's shape, compared between two machines: the word itself when it
 * is one of the closed answer words (lower case letters and dashes), else only
 * that there is a word (data: a clock, a path, a checksum, an id); and its
 * field and line counts.
 */
export function shapeKind(shape) {
  const w = shape?.word ?? null;
  return { word: w === null ? null : /^[a-z][a-z-]*$/.test(w) ? w : '<data>', fields: shape?.fields ?? 0, lines: shape?.lines ?? 0 };
}

/** The shape of one answer: its word, its field count and its line count. */
export function answerShape(stdout) {
  const a = answerOf(String(stdout ?? ''));
  const at = String(stdout ?? '').indexOf('__TORTIE_RUN__');
  const end = at === -1 ? -1 : String(stdout).indexOf('__TORTIE_RUN__', at + 14);
  const inner = at === -1 || end === -1 ? '' : String(stdout).slice(at + 14, end);
  return { word: a.word, fields: a.fields.length, lines: inner === '' ? 0 : inner.split('\n').length };
}

// ---------------------------------------------------------------------------
// Readers of what the containers printed
// ---------------------------------------------------------------------------

function parseFacts(text) {
  const out = {};
  for (const line of String(text).split('\n')) {
    const at = line.indexOf('=');
    if (at > 0) out[line.slice(0, at)] = line.slice(at + 1);
  }
  return out;
}

export function parseOptions(text) {
  const options = {};
  let fallback = null;
  for (const line of String(text).split('\n')) {
    const p = line.split('|');
    if (p[0] === 'OPT') options[p[1]] = { exit: Number(p[2]), refusal: p[3] === '' ? null : p[3], readBack: p[4] ?? '' };
    if (p[0] === 'FALLBACK') fallback = { exit: Number(p[2]), refusal: p[3] === '' ? null : p[3], readBack: p[4] ?? '' };
  }
  return { options, fallback };
}

export function parseRefusals(text) {
  const out = [];
  for (const line of String(text).split('\n')) {
    const p = line.split('|');
    if (p[0] === 'REF') out.push({ scope: p[1], name: p[2], value: p[3], exit: Number(p[4]), text: p[5] ?? '' });
  }
  return out;
}

/** Which of tmux's seven refusal shapes one line is, or null. */
export function refusalShapeOf(line, name, value) {
  if (line === `invalid option: ${name}`) return 'invalid option';
  for (const shape of ['invalid style', 'unknown value', 'bad value', 'value is invalid', 'value is too small', 'value is too large']) {
    if (line === `${shape}: ${value}`) return shape;
  }
  return null;
}

/**
 * Lift Phase 324's own normalizers out of build/p324/drive-p324.mts's TEXT, so
 * the dialect is compared exactly as Phase 324 compared it and never by a copy.
 */
export function p324Normalizers() {
  const src = readFileSync(join(REPO, 'build', 'p324', 'drive-p324.mts'), 'utf8');
  const take = (re, what) => {
    const m = re.exec(src);
    if (m === null) throw new Error(`build/p324/drive-p324.mts no longer declares ${what}`);
    return m[0];
  };
  const parts = [
    take(/function normalize\(text: string\): string \{[\s\S]*?\n\}/, 'normalize'),
    take(/const SHELL_VOLATILE = \/[^\n]*\/;/, 'SHELL_VOLATILE'),
    take(/function normalizeProtocol\(lines: readonly string\[\]\): string \{[\s\S]*?\n\}/, 'normalizeProtocol'),
    take(/const GUARD_RE = \/[^\n]*\/;/, 'GUARD_RE'),
    take(/const PARSED_NOTIFICATIONS = new Set\([^\n]*\);/, 'PARSED_NOTIFICATIONS'),
    take(/function notificationNames\(lines: readonly string\[\]\): string\[\] \{[\s\S]*?\n\}/, 'notificationNames'),
    take(/function knownNames\(lines: readonly string\[\]\): string \{[\s\S]*?\n\}/, 'knownNames'),
    take(/function unparsedNames\(lines: readonly string\[\]\): string\[\] \{[\s\S]*?\n\}/, 'unparsedNames')
  ];
  const js = ts.transpileModule(`${parts.join('\n')}\nreturn { normalize, SHELL_VOLATILE, normalizeProtocol, GUARD_RE, knownNames, unparsedNames };`, {
    compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  // eslint-disable-next-line no-new-func
  return new Function(js)();
}

/** The eight comparable steps of one dialect stream, by Phase 324's own normalizers. */
export function dialectSteps(text, n) {
  const t = String(text);
  const version = t.split('\n')[0] ?? '';
  const marks = (t.split('MARKS_BEGIN\n')[1] ?? '').split('MARKS_END')[0].trim().split('\n').map((l) => l.split(' '));
  const raw = Buffer.from(((t.split('RAW_BEGIN\n')[1] ?? '').split('\nRAW_END')[0] ?? '').trim(), 'base64').toString('utf8');
  const s = {};
  let from = 0;
  for (const [name, at] of marks) {
    s[name] = raw.slice(from, Number(at)).split('\n').filter((l) => l.length > 0);
    from = Number(at);
  }
  const need = ['greeting', 'nooutput', 'create', 'rename', 'window', 'list', 'kill', 'exit'];
  if (need.some((k) => !Array.isArray(s[k]))) return { version, unreadable: `the marks named ${JSON.stringify(Object.keys(s))}` };
  return {
    version,
    greeting: n.normalizeProtocol(s.greeting),
    guardShape: s.greeting
      .filter((l) => n.GUARD_RE.test(l))
      .map((l) => {
        const m = n.GUARD_RE.exec(l);
        return `${m[1]}:${m[4]}`;
      })
      .join(','),
    noOutput: n.normalizeProtocol(s.nooutput),
    noOutputEmpty: s.nooutput.filter((l) => !l.startsWith('%')).join('') === '',
    onCreate: n.knownNames(s.create),
    onRename: n.knownNames(s.rename),
    renamedLine: n.normalize(s.rename.find((l) => l.startsWith('%session-renamed')) ?? ''),
    window: n.knownNames(s.window),
    // The names Tortie does not parse, less the shell's own timing ones,
    // which Phase 324 drops from its greeting for the same reason.
    unparsed: n.unparsedNames([...s.greeting, ...s.window]).filter((name) => !n.SHELL_VOLATILE.test(`%${name}`)).sort().join(','),
    list: n.normalize(s.list.filter((l) => !l.startsWith('%')).join('\n')),
    onKill: n.knownNames(s.kill),
    exitLine: n.normalize(s.exit.find((l) => l.startsWith('%exit')) ?? '(no %exit)')
  };
}

/** One recorded key stream, split at the 0x7c separators, byte by byte. */
export function splitKeys(hex, keyNames) {
  const bytes = Buffer.from(String(hex ?? ''), 'hex');
  const parts = [];
  let cur = [];
  for (const b of bytes) {
    if (b === 0x7c) {
      parts.push(Buffer.from(cur).toString('hex'));
      cur = [];
    } else cur.push(b);
  }
  const keys = {};
  keyNames.forEach((k, i) => {
    keys[k] = parts[i] ?? '(missing)';
  });
  return keys;
}

// ---------------------------------------------------------------------------
// The graders. Each takes the run's (or a fixture's) reading and answers the
// problems it found, empty when it holds. --self-test runs them over the
// committed fixtures and over one-cell corruptions of them.
// ---------------------------------------------------------------------------

/** The matrix: each version's refusals and what a person sees without each (§5.1). */
export function gradeMatrix(matrix) {
  const out = [];
  const v = matrix?.versions ?? {};
  for (const version of MATRIX_ORDER) {
    if (v[version] === undefined) out.push(`the matrix has no ${version}`);
  }
  for (const [version, cell] of Object.entries(v)) {
    const opts = cell.options ?? {};
    if (Object.keys(opts).length !== 12) out.push(`${version}: ${String(Object.keys(opts).length)} options read, not twelve`);
    for (const required of ['history-limit', 'exit-empty', 'remain-on-exit', 'mouse']) {
      if (opts[required]?.took !== true) out.push(`${version}: ${required} was not taken, and Tortie cannot do without it`);
    }
    if (opts['history-limit']?.readBack !== '25000') out.push(`${version}: history-limit read back ${JSON.stringify(opts['history-limit']?.readBack)}`);
    const ms = opts['mode-style'];
    if (ms !== undefined && ms.took !== true && ms.fallback?.took !== true) out.push(`${version}: mode-style and its fallback were both refused`);
    for (const [name, o] of Object.entries(opts)) {
      if (o.took === false && (o.refusal === null || refusalShapeOf(o.refusal, name, o.value ?? '') === null)) out.push(`${version}: ${name} was refused in words D6 does not read: ${JSON.stringify(o.refusal)}`);
    }
    // THE FIX ROUND. Exactly what §5.1 measured each version refusing, and
    // nothing else: a version that refuses one more row, or one fewer, is not
    // the version its row's `lacks` describes.
    const refused = Object.entries(opts).filter(([, o]) => o.took !== true).map(([name]) => name).sort();
    const measured = [...(MEASURED_REFUSALS[version] ?? [])].sort();
    if (MEASURED_REFUSALS[version] !== undefined && JSON.stringify(refused) !== JSON.stringify(measured)) {
      out.push(`${version}: refused ${JSON.stringify(refused)} where §5.1 measured ${JSON.stringify(measured)}`);
    }
  }
  return out;
}

/** What §5.1 measured each version refusing (the rows' `lacks`, D7). */
export const MEASURED_REFUSALS = Object.freeze({
  '3.2a': ['allow-passthrough', 'copy-mode-position-format', 'mode-style'],
  '3.3a': ['copy-mode-position-format', 'mode-style'],
  '3.4': ['copy-mode-position-format', 'mode-style'],
  '3.5a': ['copy-mode-position-format', 'mode-style'],
  '3.6': [],
  '3.7c': []
});

/** The seven refusal shapes, each measured and the same on every version. */
export function gradeRefusals(fixture) {
  const out = [];
  const rows = fixture?.refusals ?? [];
  const shapes = new Set(rows.map((r) => r.shape));
  for (const shape of ['invalid option', 'invalid style', 'unknown value', 'bad value', 'value is invalid', 'value is too small', 'value is too large']) {
    if (!shapes.has(shape)) out.push(`no measured refusal reads "${shape}"`);
  }
  for (const r of rows) {
    if (refusalShapeOf(r.text, r.name, r.value) !== r.shape) out.push(`${JSON.stringify(r.text)} is not the "${r.shape}" shape for ${r.name} ${JSON.stringify(r.value)}`);
    if ((r.versions ?? []).length < 2) out.push(`${JSON.stringify(r.text)} was read on fewer than two versions`);
  }
  return out;
}

/** 3.4 alone adds a backslash before `$` and a letter, `_` or `{`; undone, every value is itself. */
export function gradeDollar(fixture, undo) {
  const out = [];
  const vals = fixture?.values ?? [];
  if (vals.length < 13) out.push(`only ${String(vals.length)} values, not the thirteen and more of §14 M9`);
  for (const v of vals) {
    const a34 = v.answers?.['3.4'];
    for (const [version, a] of Object.entries(v.answers ?? {})) {
      if (version !== '3.4' && a !== v.value) out.push(`${version} answered ${JSON.stringify(a)} for ${JSON.stringify(v.value)}; only 3.4 changes a value on read`);
    }
    if (a34 === undefined) out.push(`no 3.4 answer for ${JSON.stringify(v.value)}`);
    else if (undo(a34) !== v.value) out.push(`3.4's ${JSON.stringify(a34)} undone reads ${JSON.stringify(undo(a34))}, not ${JSON.stringify(v.value)}`);
  }
  return out;
}

/** The rule D13 measured: one backslash before every `$[A-Za-z_{]`, removed. Independent of src/. */
export const undoByRule = (s) => String(s).replace(/\\(\$[A-Za-z_{])/g, '$1');

/** 3.2a pads every joined line; 3.3a keeps only a line's own trailing spaces. */
export function gradeCapture(cap32, cap33) {
  const out = [];
  if (cap32 === null || cap33 === null) return ['a capture fixture is missing'];
  const pad = (t) => t.split('\n').filter((l) => / $/.test(l)).length;
  if (pad(cap32) <= pad(cap33)) out.push(`3.2a's joined capture pads ${String(pad(cap32))} lines and 3.3a's ${String(pad(cap33))}; 3.2a pads every line`);
  if (pad(cap33) > 2) out.push(`3.3a's joined capture has ${String(pad(cap33))} lines ending in a space; only a line's own trailing spaces stay`);
  // Compared as a person sees each line, escapes out and trailing spaces off
  // on both sides: 3.2a puts a line's colour reset at its end and 3.3a at the
  // start of the next line (builder "far", measured), so the two agree on what
  // is drawn and not byte for byte.
  const seen = (t) => t.split('\n').map((l) => l.replace(/\u001b\[[0-9;]*m/g, '').replace(/ +$/, '')).join('\n');
  if (seen(cap32) !== seen(cap33)) out.push("3.2a's and 3.3a's joined captures differ beyond escapes and trailing spaces, so stripping the padding would not make them agree");
  return out;
}

/** Every version's eight steps equal to 3.6's (SPEC D1: `control: true` rests on this). */
export function gradeDialect(fixture) {
  const out = [];
  const v = fixture?.versions ?? {};
  const ref = v[fixture?.reference ?? '3.6'];
  if (ref === undefined) return [`no ${String(fixture?.reference ?? '3.6')} reference stream`];
  const keys = ['greeting', 'guardShape', 'noOutput', 'noOutputEmpty', 'onCreate', 'onRename', 'renamedLine', 'window', 'unparsed', 'list', 'onKill', 'exitLine'];
  for (const [version, steps] of Object.entries(v)) {
    if (steps.unreadable !== undefined) {
      out.push(`${version}: the stream could not be read (${steps.unreadable})`);
      continue;
    }
    for (const k of keys) {
      if (JSON.stringify(steps[k]) !== JSON.stringify(ref[k])) out.push(`${version}: ${k} differs from 3.6's (${JSON.stringify(steps[k]).slice(0, 80)} against ${JSON.stringify(ref[k]).slice(0, 80)})`);
    }
  }
  return out;
}

/**
 * The keys against Phase 337's 3.6a cells, allowing exactly D22's two measured
 * differences: under modifyOtherKeys 2, 3.2a to 3.4 answer at level 1 (the
 * normal-mode bytes) for the keys level 2 extends; under modifyOtherKeys 1,
 * 3.5a sends Shift+Tab as CSI 27;2;9~.
 */
export function gradeKeys(fixture, reference) {
  const out = [];
  const ref = reference?.modes?.['3.6a'];
  if (ref === undefined) return ['keys-encoding.json has no 3.6a cells'];
  for (const [version, modes] of Object.entries(fixture?.versions ?? {})) {
    for (const mode of KEY_MODES) {
      const got = modes[mode] ?? {};
      const want = ref[mode]?.keys ?? {};
      for (const [key, bytes] of Object.entries(want)) {
        let expected = bytes;
        if (['3.2a', '3.3a', '3.4'].includes(version) && mode === 'mok2' && ref.normal?.keys?.[key] !== undefined && bytes !== ref.mok1?.keys?.[key] && /^1b5b32373b/.test(bytes)) {
          expected = ref.mok1?.keys?.[key] ?? ref.normal.keys[key];
        }
        if (version === '3.5a' && mode === 'mok1' && key === 'BTab') expected = '1b5b32373b323b397e';
        if (got[key] !== expected) out.push(`${version} ${mode} ${key}: ${String(got[key])}, measured ${expected}`);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The far texts, on this Mac
// ---------------------------------------------------------------------------

/**
 * Run every far call on this Mac under /bin/sh over the same fixture, and
 * answer each call's reading.
 *
 * Run here with the WHOLE standard output kept, in the environment
 * build/p336/script-arms.mjs's `farRunner` builds (a PATH of the system's,
 * the call's HOME, a scratch ZDOTDIR, no history file, `LC_ALL=C`):
 * `farRunner.run` hands back only the first 400 characters, so an answer
 * longer than that (the history copy, the context read) lost its closing
 * marker and read as no answer at all on this Mac, on every row.
 */
function macFarAnswers(texts, calls, B, H, scratch) {
  const byId = new Map((texts.scripts ?? []).map((row) => [row.id, row.text]));
  const zdot = join(scratch, 'mac-zdot');
  mkdirSync(zdot, { recursive: true, mode: 0o700 });
  const env = { PATH: '/usr/bin:/bin:/usr/sbin:/sbin', ZDOTDIR: zdot, HISTFILE: '/dev/null', LC_ALL: 'C', HOME: H, SHELL: '/bin/sh' };
  const run = (id, args) => {
    const text = byId.get(id);
    if (text === undefined) throw new Error(`the catalogue holds no ${id}`);
    const r = spawnSync('/bin/sh', ['-c', text, `tortie-${id}`, ...args], { cwd: scratch, env, encoding: 'utf8', timeout: 60_000, maxBuffer: 16 * 1024 * 1024 });
    return { stdout: String(r.stdout ?? ''), status: r.status };
  };
  const out = [];
  for (const call of calls) {
    let args = call.args;
    if (typeof args === 'function') args = args(answerOf(run('folder-pin', [call.pin]).stdout).word ?? 'none');
    const r = run(call.id, args);
    const mode = call.file !== undefined && existsSync(call.file) ? (statSync(call.file).mode & 0o7777).toString(8) : null;
    out.push({ label: call.label ?? call.id, id: call.id, stdout: r.stdout.slice(0, 4000), shape: answerShape(r.stdout), normalized: normalizeAnswer(r.stdout, B, H), mode, status: r.status });
  }
  return out;
}

// ---------------------------------------------------------------------------
// A row, in its container
// ---------------------------------------------------------------------------

async function measureRow(row, h, ctx) {
  const version = ROW_VERSION[row];
  const r = { row, version, ref: ROWS[row].ref, problems: [] };
  const sh = async (what, script, opts = {}) => {
    const got = await h.sh(script, { timeoutMs: 180_000, ...opts });
    if (got.timedOut) r.problems.push(`${what} did not finish in time`);
    return got;
  };
  r.facts = { ...h.facts, ...parseFacts((await sh('facts', FACTS)).stdout) };
  say(`${row}: ${r.facts.os ?? '?'}, ${r.facts.tmux ?? '?'}, ${r.facts.package ?? '?'}`);

  // options
  const rowsText = `${ctx.emit.serverOptions.map((o) => `${o.scope}|${o.name}|${o.value}`).join('\n')}\n`;
  const opt = parseOptions((await sh('options', OPTIONS, { input: rowsText })).stdout);
  r.options = {};
  for (const o of ctx.emit.serverOptions) {
    const got = opt.options[o.name];
    const took = got !== undefined && got.exit === 0 && got.readBack === o.value;
    r.options[o.name] = {
      value: o.value,
      took,
      refusal: took ? null : (got?.refusal ?? '(no answer)'),
      readBack: got?.readBack ?? null,
      ...(o.name === 'mode-style' && !took ? { fallback: { value: 'bg=default,fg=default', took: opt.fallback?.exit === 0 && opt.fallback.readBack === 'bg=default,fg=default', refusal: opt.fallback?.refusal ?? null } } : {})
    };
  }

  // refusals
  r.refusals = parseRefusals((await sh('refusals', REFUSALS)).stdout);

  // dollar
  const dol = (await sh('dollar', DOLLAR, { input: `${DOLLAR_VALUES.join('\n')}\n`, env: { LANG: 'C.UTF-8' } })).stdout;
  r.dollar = { values: {}, path: null, name: null, underscore: null };
  for (const line of dol.split('\n')) {
    const p = line.split('\t');
    if (p[0] === 'DOLLAR') r.dollar.values[p[1]] = p[2] ?? '';
    if (p[0] === 'PATH') r.dollar.path = p[1] ?? '';
    if (p[0] === 'NAME') r.dollar.name = { exact: p[1] === '0', stored: p[2] ?? '' };
    if (p[0] === 'UNDERSCORE') r.dollar.underscore = p[1] === '0';
  }

  // capture
  const cap = (await sh('capture', CAPTURE)).stdout;
  r.capture = {};
  for (const line of cap.split('\n')) {
    const [k, a, b] = line.split(' ');
    if (k === 'CAPJ') r.capture.joined = { bytes: Number(a), trailingSpaceLines: Number(b) };
    if (k === 'CAP') r.capture.plain = { bytes: Number(a), trailingSpaceLines: Number(b) };
    if (k === 'B64J') r.capture.joinedText = Buffer.from(a ?? '', 'base64').toString('utf8');
    if (k === 'B64') r.capture.plainText = Buffer.from(a ?? '', 'base64').toString('utf8');
  }

  // dialect
  r.dialectRaw = (await sh('dialect', dialectScript(ctx.emit.listFormat))).stdout;
  r.dialect = dialectSteps(r.dialectRaw, ctx.normalizers);

  // keys
  await h.writeFile('/tmp/p342-key-recorder.sh', readFileSync(join(REPO, 'build', 'p342', 'key-recorder.sh')), { mode: 0o755 });
  const keys = (await sh('keys', keysScript(ctx.emit.serverOptions, ctx.keyNames), { timeoutMs: 300_000 })).stdout;
  r.keys = {};
  for (const line of keys.split('\n')) {
    const [k, mode, hex] = line.split(' ');
    if (k === 'MODE') r.keys[mode] = splitKeys(hex ?? '', ctx.keyNames);
  }

  // indicator
  const ind = (await sh('indicator', INDICATOR)).stdout;
  r.indicator = {};
  for (const line of ind.split('\n')) {
    const [k, a] = line.split('\t');
    if (k === 'PLAIN') r.indicator.plain = a ?? '';
    if (k === 'HIDDEN') r.indicator.hidden = a ?? '';
    if (k === 'PLAINE') r.indicator.plainEscapes = Buffer.from(a ?? '', 'base64').toString('utf8');
    if (k === 'HIDDENE') r.indicator.hiddenEscapes = Buffer.from(a ?? '', 'base64').toString('utf8');
    if (k === 'STATE') r.indicator.state = a ?? '';
  }

  // far texts, as tortie in its own home, under /bin/sh; folder-pin and
  // tree-list again under dash where the distribution has one.
  const home = h.accounts.tortie?.home ?? '/home/tortie';
  const B = `${home}/p342ft`;
  const made = await h.run(['/bin/sh', '-c', FAR_FIXTURE, 'p342-fixture', B], { user: 'tortie', workdir: home, env: { HOME: home }, timeoutMs: 60_000 });
  const head = /HEAD=([0-9a-f]{40})/.exec(made.stdout)?.[1] ?? 'none';
  if (made.code !== 0) r.problems.push(`the far fixture was not made in ${row}: ${made.stderr.slice(0, 200)}`);
  r.far = [];
  const shells = ['/bin/sh', ...(r.facts.dash ? [r.facts.dash] : [])];
  const textOf = new Map(ctx.texts.scripts.map((s) => [s.id, s.text]));
  const farRun = (shell, id, args) =>
    h.run([shell, '-c', textOf.get(id), `tortie-${id}`, ...args], { user: 'tortie', workdir: home, env: { HOME: home, SHELL: h.accounts.tortie?.shell ?? '/bin/bash', HISTFILE: '/dev/null' }, timeoutMs: 60_000 });
  const pinOf = async (shell, folder) => answerOf((await farRun(shell, 'folder-pin', [folder])).stdout).word ?? 'none';
  for (const call of farCalls(B, home, head)) {
    let args = call.args;
    if (typeof args === 'function') args = args(await pinOf('/bin/sh', call.pin));
    const got = await farRun('/bin/sh', call.id, args);
    let mode = null;
    if (call.file !== undefined) {
      const m = await h.run(['/bin/sh', '-c', 'stat -c %a "$1" 2>/dev/null || true', 'p342', call.file], { user: 'tortie', timeoutMs: 30_000 });
      mode = m.stdout.trim() || null;
    }
    r.far.push({ label: call.label ?? call.id, id: call.id, stdout: got.stdout.slice(0, 4000), shape: answerShape(got.stdout), normalized: normalizeAnswer(got.stdout, B, home), mode, status: got.code });
  }
  const parts = await h.run(['/bin/sh', '-c', 'cd "$1" && ls -a fp fp/p755 fp/p700 fp/sg 2>/dev/null | grep -c tortie-part || true', 'p342', B], { user: 'tortie', timeoutMs: 30_000 });
  r.tortieParts = Number(parts.stdout.trim()) || 0;
  r.shells = {};
  for (const shell of shells) {
    const pin = await farRun(shell, 'folder-pin', [`${B}/fp`]);
    const oracle = await h.run(['/bin/sh', '-c', 'stat -c %d:%i "$1/."', 'p342', `${B}/fp`], { user: 'tortie', timeoutMs: 30_000 });
    const tree = await farRun(shell, 'tree-list', [`${B}/rootlink`, '2', '100']);
    r.shells[shell] = { pin: answerOf(pin.stdout).word, oracle: oracle.stdout.trim(), tree: normalizeAnswer(tree.stdout, B, home) };
  }

  // drive: the shipping modules over this row's stand-in.
  const stand = h.writeSshStandIn(join(ctx.scratch, `ssh-${row}`), { user: 'tortie', log: join(ctx.scratch, `ssh-${row}.log`) });
  await h.run(['/bin/sh', '-c', 'mkdir -p "/tmp/p342 $d"'], { user: 'tortie', timeoutMs: 30_000 });
  const drive = await new Promise((done) => {
    const child = spawn(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/p342/drive-p342.mts'], {
      cwd: REPO,
      env: { ...ctx.env, P342_ROOT: REPO, P342_MODE: 'row', P342_SSH: stand.file, P342_RUN: join(ctx.scratch, `drive-${row}`), P342_ROW: row },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c) => (stdout += String(c)));
    child.stderr.on('data', (c) => (stderr += String(c)));
    const timer = setTimeout(() => child.kill('SIGTERM'), 300_000);
    child.on('close', (code) => {
      clearTimeout(timer);
      done({ code, stdout, stderr });
    });
  });
  const line = drive.stdout.trimEnd().split('\n').filter((l) => l.startsWith('{"id":"p342-drive"')).pop();
  r.drive = line === undefined ? { unreadable: `drive-p342 exited ${String(drive.code)}: ${drive.stderr.slice(-400)}` } : JSON.parse(line);
  await h.run(['/bin/sh', '-c', 'tmux -L p342drv kill-server >/dev/null 2>&1; tmux -L p342ao kill-server >/dev/null 2>&1; true'], { user: 'tortie', timeoutMs: 30_000 });

  // pair, LAST: it replaces this row's tmux.
  if (ROWS[row].backports !== undefined) {
    const pair = (await sh('pair', pairScript(ROWS[row].backports), { timeoutMs: 600_000 })).stdout;
    r.pair = {};
    for (const l of pair.split('\n')) {
      const p = l.split('\t');
      if (p[0] === 'BEFORE') r.pair.before = { program: p[1], server: p[2] };
      if (p[0] === 'INSTALL') r.pair.install = Number(p[1]);
      if (p[0] === 'AFTER') r.pair.after = { program: p[1], server: p[2] };
      if (p[0] === 'OLDLIVE') r.pair.oldLive = p[1] ?? '';
      if (p[0] === 'NEWLIVE') r.pair.newLive = { bytes: Number(p[1]), exit: p[2], head: p[3] ?? '' };
      if (p[0] === 'ATTACH') r.pair.attach = p[1] ?? '';
      if (p[0] === 'SERVER') r.pair.server = { version: p[1], sessions: p[2] };
    }
  }
  return r;
}

// ---------------------------------------------------------------------------
// The run's own grades, beside the fixtures'
// ---------------------------------------------------------------------------

function gradeRow(r, ctx, mac) {
  const out = [];
  const v = r.version;
  const lacks = Object.entries(r.options ?? {})
    .filter(([, o]) => o.took === false)
    .map(([n]) => n)
    .sort();
  // drive: the shipping set-up meets this version's real words.
  const d = r.drive ?? {};
  if (d.unreadable !== undefined) out.push(`${r.row}: the drive could not be read: ${d.unreadable}`);
  else {
    if (d.read?.kind !== 'version' || d.read.version !== v) out.push(`${r.row}: readRemoteTmuxVersion answered ${JSON.stringify(d.read)}, not ${v}`);
    if (d.born?.threw !== undefined) out.push(`${r.row}: ensureRemoteServer threw on a server it started: ${d.born.threw}`);
    else {
      if (d.born?.born !== true) out.push(`${r.row}: the first set-up did not start the server`);
      const refused = (d.born?.refused ?? []).map((x) => x.name).sort();
      if (JSON.stringify(refused) !== JSON.stringify(lacks)) out.push(`${r.row}: the shipping set-up skipped ${JSON.stringify(refused)} where the version refused ${JSON.stringify(lacks)}`);
      if ((d.born?.refused ?? []).some((x) => x.expected !== true)) out.push(`${r.row}: a refusal the row's lacks did not predict, so Prepare would append a sentence on a measured version`);
      if ((d.born?.disagreed ?? 0) !== 0) out.push(`${r.row}: ${String(d.born.disagreed)} option(s) read back differently`);
      const hl = (d.born?.options ?? []).find((o) => o.name === 'history-limit');
      if (hl?.observed !== '25000') out.push(`${r.row}: history-limit read back ${JSON.stringify(hl?.observed)}`);
    }
    if (d.bornNoted !== v) out.push(`${r.row}: the born re-read noted ${JSON.stringify(d.bornNoted)}, not ${v}`);
    if (d.warm?.threw !== undefined || d.warm?.born !== false) out.push(`${r.row}: the second set-up did not find the server warm: ${JSON.stringify(d.warm).slice(0, 160)}`);
    const list = d.list ?? {};
    if (list.read === null || list.read === undefined || JSON.stringify(list.read) !== JSON.stringify(list.wanted)) out.push(`${r.row}: the listed row reads ${JSON.stringify(list.read)}, not ${JSON.stringify(list.wanted)}`);
    if ((list.fields ?? []).some((n) => n < 10)) out.push(`${r.row}: a listed line carried fewer than ten fields`);
    if (v === '3.4' && JSON.stringify(list.raw) === JSON.stringify(list.wanted)) out.push(`${r.row}: 3.4 answered the dollar unchanged, so the quirk is not measured here`);
    if (v === '3.4' && d.dollarOnRead !== true) out.push(`${r.row}: the 3.4 row does not carry dollarOnRead`);
    const c = d.control ?? {};
    if (typeof c.greetMs !== 'number') out.push(`${r.row}: the shipping control client did not greet (${JSON.stringify(c.greetMs)} ${String(c.refusal ?? '')})`);
    else {
      if (c.listAgrees !== true) out.push(`${r.row}: the list over the live connection differs from the exec plane's`);
      const calls = c.scroll?.calls ?? [];
      if (calls.length === 0) out.push(`${r.row}: no scroll argv was sent`);
      if (calls.some((x) => x.verdict?.ok !== true)) out.push(`${r.row}: the carriage's table refused ${JSON.stringify(calls.find((x) => x.verdict?.ok !== true)?.args)}`);
      if ((c.scroll?.entries ?? []).some((a) => JSON.stringify(a.slice(0, 3)) !== JSON.stringify(['copy-mode', '-e', '-H']))) out.push(`${r.row}: a machine's copy mode was entered without -H`);
      const back = c.scroll?.steps?.back30?.value;
      if (back?.inMode !== true || back?.position !== 30) out.push(`${r.row}: scrolling back 30 read ${JSON.stringify(back)}`);
      if ((c.keys?.refused ?? []).length > 0 || (c.keys?.sent ?? 0) !== 35) out.push(`${r.row}: of the phone's key names, ${String((c.keys?.refused ?? []).length)} were refused and ${String(c.keys?.sent)} sent`);
    }
    if (d.attach?.attached !== '1' || d.attach?.decoyAttached !== '0') out.push(`${r.row}: the attach's =$N attached ${JSON.stringify(d.attach)}`);
  }
  // indicator (D8 b)
  const box = (s) => /\[\d+\/\d+\]/.test(String(s ?? ''));
  if (['3.2a', '3.3a', '3.4', '3.5a'].includes(v)) {
    if (!box(r.indicator.plain)) out.push(`${r.row}: copy mode entered with -e drew no position box (${JSON.stringify(r.indicator.plain)}), so the control is not seen`);
    if (box(r.indicator.hidden)) out.push(`${r.row}: copy mode entered with -e -H still drew tmux's position box`);
  } else {
    if (box(r.indicator.plain) || box(r.indicator.hidden)) out.push(`${r.row}: a ${v} drew tmux's position box`);
    if (r.indicator.plainEscapes !== r.indicator.hiddenEscapes) out.push(`${r.row}: row 0 differs with and without -H on ${v}, where the spec measured it byte-identical`);
  }
  // far texts against this Mac, by the SHAPE of each answer: its word when
  // the word is one of the closed answer words, and only that it is data when
  // it is data (a clock, a base64 path, a checksum, a device and inode, which
  // differ between two machines by construction), its field count and its
  // line count.
  for (let i = 0; i < r.far.length; i += 1) {
    const linux = r.far[i];
    const here = mac[i];
    if (here === undefined) continue;
    if (linux.id === 'machine-facts') continue;
    // The one measured difference, stated (SPEC D15, §Attack F9): a rename
    // onto a hard link of the same file. The shipping entry-rename compares
    // two `stat -f` reads, which on GNU are file-system blocks naming each
    // NAME, so it answers `exists` there, where this Mac's identity pair is
    // the same file and the rename is rename(2)'s no-op, `moved`. The edited
    // identity read was refused because GNU mv answered nothing for it.
    if (linux.label === 'entry-rename onto a hard link of the same file') {
      if (linux.shape.word !== 'exists') out.push(`${r.row}: ${linux.label} answered ${JSON.stringify(linux.shape.word)}, where the shipping text measured exists on GNU`);
      if (here.shape.word !== 'moved') out.push(`${r.row}: on this Mac ${here.label} answered ${JSON.stringify(here.shape.word)}, where it measured moved`);
      continue;
    }
    if (JSON.stringify(shapeKind(linux.shape)) !== JSON.stringify(shapeKind(here.shape))) {
      out.push(`${r.row}: ${linux.label} answered ${JSON.stringify(shapeKind(linux.shape))}, this Mac ${JSON.stringify(shapeKind(here.shape))} (${JSON.stringify(linux.stdout.slice(0, 120))})`);
    }
  }
  const word = (label) => r.far.find((x) => x.label === label)?.shape?.word ?? null;
  const modeOf = (label) => r.far.find((x) => x.label === label)?.mode ?? null;
  if (word('file-put over a 644 file') !== 'wrote' || modeOf('file-put over a 644 file') !== '644') out.push(`${r.row}: saving over a 644 file answered ${String(word('file-put over a 644 file'))}, mode ${String(modeOf('file-put over a 644 file'))}`);
  if (word('file-put over a 755 file') !== 'wrote' || modeOf('file-put over a 755 file') !== '755') out.push(`${r.row}: saving over a 755 file answered ${String(word('file-put over a 755 file'))}, mode ${String(modeOf('file-put over a 755 file'))}`);
  if (word('dir-new under a 755 parent') !== 'made' || modeOf('dir-new under a 755 parent') !== '755') out.push(`${r.row}: New Folder under 755 answered ${String(word('dir-new under a 755 parent'))}, mode ${String(modeOf('dir-new under a 755 parent'))}`);
  if (word('dir-new under a 700 parent') !== 'made' || modeOf('dir-new under a 700 parent') !== '700') out.push(`${r.row}: New Folder under 700 answered ${String(word('dir-new under a 700 parent'))}, mode ${String(modeOf('dir-new under a 700 parent'))}`);
  if (word('entry-rename onto a free name') !== 'moved') out.push(`${r.row}: a rename answered ${String(word('entry-rename onto a free name'))}`);
  if (word('entry-rename onto another file') !== 'exists') out.push(`${r.row}: a rename onto another file answered ${String(word('entry-rename onto another file'))}`);
  if (r.tortieParts !== 0) out.push(`${r.row}: ${String(r.tortieParts)} .tortie-part file(s) left`);
  const store = r.far.find((x) => x.id === 'store-list');
  if (store !== undefined) {
    const inner = (store.stdout.split('__TORTIE_RUN__')[1] ?? '').split('\n').filter((l) => l.length > 0);
    if (inner.length === 0 || inner.some((l) => l.split(' ').length !== 3)) out.push(`${r.row}: store-list answered lines that are not the three-field shape: ${JSON.stringify(inner).slice(0, 200)}`);
  }
  for (const [shell, s] of Object.entries(r.shells ?? {})) {
    if (s.pin !== s.oracle) out.push(`${r.row}: folder-pin under ${shell} answered ${String(s.pin)}, stat -c answered ${String(s.oracle)}`);
    if (!/inner\//.test(s.tree)) out.push(`${r.row}: tree-list under a linked root under ${shell} did not follow the link`);
  }
  // pair
  if (r.pair !== undefined) {
    if (r.pair.install !== 0) out.push(`${r.row}: the backports' tmux did not install`);
    if (!/gmux-control\|?/.test(r.pair.oldLive ?? '') || !/%end/.test(r.pair.oldLive ?? '')) out.push(`${r.row}: the live connection opened before the update did not answer after it: ${JSON.stringify(r.pair.oldLive)}`);
    if (r.row === 'd13') {
      if ((r.pair.newLive?.bytes ?? 0) > 10) out.push(`${r.row}: a 3.6b program greeted a 3.5a server (${String(r.pair.newLive?.bytes)} bytes); the pair 3.5a refuses is no longer measured broken`);
      if (r.pair.server?.version?.split(' ')[0] !== '3.5a') out.push(`${r.row}: the 3.5a server did not survive the update`);
    }
    if (r.row === 'd12' && !/%begin/.test(r.pair.newLive?.head ?? '')) out.push(`${r.row}: a 3.5a program did not greet a 3.3a server: ${JSON.stringify(r.pair.newLive)}`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Fixtures from the run
// ---------------------------------------------------------------------------

const SOURCE = (date) =>
  `Measured by npm run measure:p342 (build/p342/measure-p342.mjs) on ${date}, in throwaway containers made by build/docker-run.mjs from the distributions' own images, each with the tmux its own package manager installs, on scratch sockets inside each container. Never -L gmux, never this Mac's tmux.`;

function fixturesOf(results, date) {
  const by = Object.fromEntries(results.map((r) => [r.row, r]));
  const versions = {};
  for (const version of MATRIX_ORDER) {
    const rows = results.filter((r) => r.version === version);
    if (rows.length === 0) continue;
    const first = rows[0];
    versions[version] = {
      rows: rows.map((r) => ({ row: r.row, ref: r.ref, os: r.facts.os, arch: r.facts.arch, package: r.facts.package ?? null, tmux: r.facts.tmux, coreutils: r.facts.coreutils, sh: r.facts.sh })),
      agree: rows.every((r) => JSON.stringify(r.options) === JSON.stringify(first.options)),
      options: first.options,
      indicator: { plain: first.indicator.plain, hidden: first.indicator.hidden },
      capture: { joined: first.capture.joined, plain: first.capture.plain },
      pair: by.d12?.version === version ? (by.d12.pair ?? null) : by.d13?.version === version ? (by.d13.pair ?? null) : null
    };
  }
  const matrix = { source: SOURCE(date), order: MATRIX_ORDER.filter((v) => versions[v] !== undefined), versions };
  const refusals = [];
  for (const r of results) {
    for (const ref of r.refusals) {
      const shape = refusalShapeOf(ref.text, ref.name, ref.value);
      if (ref.exit === 0 || shape === null) continue;
      const seen = refusals.find((x) => x.text === ref.text && x.name === ref.name && x.value === ref.value);
      if (seen === undefined) refusals.push({ shape, scope: ref.scope, name: ref.name, value: ref.value, text: ref.text, versions: [r.version] });
      else if (!seen.versions.includes(r.version)) seen.versions.push(r.version);
    }
  }
  const dollar = {
    source: SOURCE(date),
    values: DOLLAR_VALUES.map((value) => ({
      value,
      answers: Object.fromEntries(MATRIX_ORDER.map((v) => [v, results.find((r) => r.version === v)?.dollar.values[value]]).filter(([, a]) => a !== undefined))
    })),
    sessionName: Object.fromEntries(MATRIX_ORDER.map((v) => [v, results.find((r) => r.version === v)?.dollar.name ?? null])),
    folder: Object.fromEntries(MATRIX_ORDER.map((v) => [v, results.find((r) => r.version === v)?.dollar.path ?? null]))
  };
  const dialect = { source: SOURCE(date), reference: '3.6', versions: Object.fromEntries(MATRIX_ORDER.map((v) => [v, results.find((r) => r.version === v)?.dialect]).filter(([, s]) => s !== undefined)) };
  const keys = { source: SOURCE(date), modes: KEY_MODES, versions: Object.fromEntries(MATRIX_ORDER.map((v) => [v, results.find((r) => r.version === v)?.keys]).filter(([, k]) => k !== undefined)) };
  /** Escapes written as the six characters `\033[`, decoded at test time. */
  const asText = (t) => (t === undefined || t === null ? null : String(t).replace(/\u001b\[/g, '\\033['));
  const capj32 = asText(by.u2204?.capture?.joinedText);
  const capj33 = asText(by.d12?.capture?.joinedText);
  return { matrix, refusals: { source: SOURCE(date), refusals }, dollar, dialect, keys, capj32, capj33 };
}

/** What the run measured against what is committed, on what was measured. */
function compareFixtures(made) {
  const out = [];
  const committed = (name) => {
    try {
      return readFileSync(join(FIXTURES, name), 'utf8');
    } catch {
      return null;
    }
  };
  const json = (name) => {
    const t = committed(name);
    return t === null ? null : JSON.parse(t);
  };
  const m = json('matrix.json');
  if (m === null) out.push('build/fixtures/p342/matrix.json is not committed');
  else {
    for (const [v, cell] of Object.entries(made.matrix.versions)) {
      if (JSON.stringify(cell.options) !== JSON.stringify(m.versions?.[v]?.options)) out.push(`matrix.json ${v}: the options measured now differ from the committed cells`);
    }
  }
  const rf = json('refusals.json');
  if (rf === null) out.push('build/fixtures/p342/refusals.json is not committed');
  else {
    const key = (x) => `${x.shape}|${x.name}|${x.value}|${x.text}`;
    const now = made.refusals.refusals.map(key).sort();
    const then = (rf.refusals ?? []).map(key).sort();
    if (JSON.stringify(now) !== JSON.stringify(then)) out.push('refusals.json: the refusal lines measured now differ from the committed ones');
  }
  const dl = json('dollar-3.4.json');
  if (dl === null) out.push('build/fixtures/p342/dollar-3.4.json is not committed');
  else if (JSON.stringify(made.dollar.values) !== JSON.stringify(dl.values)) out.push('dollar-3.4.json: the answers measured now differ from the committed ones');
  const di = json('dialect.json');
  if (di === null) out.push('build/fixtures/p342/dialect.json is not committed');
  else if (JSON.stringify(made.dialect.versions) !== JSON.stringify(di.versions)) out.push('dialect.json: the steps measured now differ from the committed ones');
  const ke = json('keys.json');
  if (ke === null) out.push('build/fixtures/p342/keys.json is not committed');
  else if (JSON.stringify(made.keys.versions) !== JSON.stringify(ke.versions)) out.push('keys.json: the bytes measured now differ from the committed ones');
  for (const [name, text] of [
    ['capj-3.2a.txt', made.capj32],
    ['capj-3.3a.txt', made.capj33]
  ]) {
    const c = committed(name);
    if (text !== null && c === null) out.push(`build/fixtures/p342/${name} is not committed`);
    else if (text !== null && c !== text) out.push(`${name}: the capture measured now differs from the committed one`);
  }
  return out;
}

function writeFixtures(dir, made) {
  mkdirSync(dir, { recursive: true });
  const w = (name, value) => writeFileSync(join(dir, name), typeof value === 'string' ? value : `${JSON.stringify(value, null, 1)}\n`);
  w('matrix.json', made.matrix);
  w('refusals.json', made.refusals);
  w('dollar-3.4.json', made.dollar);
  w('dialect.json', made.dialect);
  w('keys.json', made.keys);
  if (made.capj32 !== null) w('capj-3.2a.txt', made.capj32);
  if (made.capj33 !== null) w('capj-3.3a.txt', made.capj33);
}

// ---------------------------------------------------------------------------
// --self-test: the graders over the committed fixtures and over corruptions
// ---------------------------------------------------------------------------

function selfTest() {
  const problems = [];
  const read = (name) => JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));
  const text = (name) => readFileSync(join(FIXTURES, name), 'utf8').replace(/\\033\[/g, '\u001b[');
  const reference = JSON.parse(readFileSync(join(REPO, 'build', 'fixtures', 'screen', 'keys-encoding.json'), 'utf8'));
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const matrix = read('matrix.json');
  const refusals = read('refusals.json');
  const dollar = read('dollar-3.4.json');
  const dialect = read('dialect.json');
  const keys = read('keys.json');
  const cap32 = text('capj-3.2a.txt');
  const cap33 = text('capj-3.3a.txt');
  const honest = [
    ['matrix', gradeMatrix(matrix)],
    ['refusals', gradeRefusals(refusals)],
    ['dollar', gradeDollar(dollar, undoByRule)],
    ['capture', gradeCapture(cap32, cap33)],
    ['dialect', gradeDialect(dialect)],
    ['keys', gradeKeys(keys, reference)]
  ];
  for (const [what, got] of honest) {
    if (got.length > 0) problems.push(`the committed ${what} fixture failed its own grader: ${got.slice(0, 3).join('; ')}`);
  }
  const broken = [];
  {
    const m = clone(matrix);
    m.versions['3.4'].options['history-limit'].took = false;
    broken.push(['a required option refused in the matrix', gradeMatrix(m)]);
  }
  {
    const m = clone(matrix);
    m.versions['3.2a'].options['allow-passthrough'].refusal = 'unsupported option: allow-passthrough';
    broken.push(['a refusal in words D6 does not read', gradeMatrix(m)]);
  }
  {
    // THE FIX ROUND: a version refusing a row §5.1 measured it taking.
    const m = clone(matrix);
    m.versions['3.6'].options['allow-passthrough'] = { ...m.versions['3.6'].options['allow-passthrough'], took: false, refusal: 'invalid option: allow-passthrough' };
    broken.push(['3.6 refusing a row §5.1 measured it taking', gradeMatrix(m)]);
  }
  {
    const m = clone(matrix);
    m.versions['3.3a'].options['copy-mode-position-format'] = { ...m.versions['3.3a'].options['copy-mode-position-format'], took: true, refusal: null };
    broken.push(['3.3a taking a row §5.1 measured it refusing', gradeMatrix(m)]);
  }
  {
    const r = clone(refusals);
    r.refusals = r.refusals.filter((x) => x.shape !== 'value is too large');
    broken.push(['a refusal shape no longer measured', gradeRefusals(r)]);
  }
  {
    const d = clone(dollar);
    d.values[0].answers['3.6'] = `${d.values[0].value}x`;
    broken.push(['a version other than 3.4 changing a value', gradeDollar(d, undoByRule)]);
  }
  broken.push(['an undo that removes every backslash', gradeDollar(dollar, (s) => String(s).replace(/\\/g, ''))]);
  broken.push(['3.2a with its padding already gone', gradeCapture(cap33, cap33)]);
  broken.push(['3.3a padded like 3.2a', gradeCapture(cap32, cap32)]);
  {
    const d = clone(dialect);
    d.versions['3.3a'].exitLine = '(no %exit)';
    broken.push(['a dialect step that differs', gradeDialect(d)]);
  }
  {
    const k = clone(keys);
    const v = Object.keys(k.versions)[0];
    k.versions[v].normal.Up = '1b4f41';
    broken.push(['a key that reaches a program in other bytes', gradeKeys(k, reference)]);
  }
  {
    const k = clone(keys);
    k.versions['3.5a'].mok1.BTab = '1b5b5a';
    broken.push(['3.5a sending Shift+Tab as 3.6 does, which is not what was measured', gradeKeys(k, reference)]);
  }
  for (const [what, got] of broken) {
    if (got.length === 0) problems.push(`the grader passed ${what}`);
  }
  return { problems, graded: honest.length, broken: broken.length };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

function historyStats() {
  // THE INTEGRATOR'S FIX. His real home, from the account record: this run
  // points HOME at scratch for every child, and a guard that read HOME printed
  // "absent → absent" and guarded nothing.
  const home = userInfo().homedir;
  const one = (f) => {
    try {
      const s = statSync(join(home, f));
      return `${String(s.size)} ${String(Math.floor(s.mtimeMs / 1000))}`;
    } catch {
      return 'absent';
    }
  };
  return { zsh: one('.zsh_history'), bash: one('.bash_history') };
}

async function main() {
  if (process.argv.includes('--self-test')) {
    const t = selfTest();
    if (t.problems.length > 0) {
      for (const p of t.problems) process.stdout.write(`  - ${p}\n`);
      process.stdout.write(`${TAG} --self-test FAIL\n`);
      process.exit(1);
    }
    process.stdout.write(`${TAG} --self-test PASS: ${String(t.graded)} committed fixtures pass their graders, ${String(t.broken)} corruptions each fail one. Nothing was started.\n`);
    return;
  }
  const rows = (process.env['P342_ROWS'] ?? Object.keys(ROWS).join(','))
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
  for (const row of rows) {
    if (ROW_VERSION[row] === undefined) {
      process.stderr.write(`${TAG} ${row} is not a row (${Object.keys(ROW_VERSION).join(', ')}).\n`);
      process.exit(2);
    }
  }
  const before = historyStats();
  const scratch = mkdtempSync('/private/tmp/p342-measure-');
  // The environment every child of this run gets: built, never inherited
  // whole, with a scratch HOME and ZDOTDIR and no history file.
  const env = {
    PATH: String(process.env.PATH ?? '/usr/bin:/bin'),
    HOME: join(scratch, 'home'),
    ZDOTDIR: join(scratch, 'home'),
    HISTFILE: '/dev/null',
    LANG: 'en_US.UTF-8',
    TMPDIR: scratch
  };
  mkdirSync(env.HOME, { recursive: true, mode: 0o700 });
  say(`scratch ${scratch}; rows ${rows.join(', ')}`);
  let results = [];
  let failed = [];
  let runError = null;
  try {
    const emitted = spawnSync(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/p342/drive-p342.mts'], {
      cwd: REPO,
      env: { ...env, P342_ROOT: REPO, P342_MODE: 'emit' },
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024
    });
    const line = String(emitted.stdout ?? '').trimEnd().split('\n').filter((l) => l.startsWith('{"id":"p342-drive"')).pop();
    if (line === undefined) throw new Error(`drive-p342.mts --emit printed nothing: ${String(emitted.stderr ?? '').slice(-400)}`);
    const emit = JSON.parse(line);
    const reference = JSON.parse(readFileSync(join(REPO, 'build', 'fixtures', 'screen', 'keys-encoding.json'), 'utf8'));
    const keyNames = Object.keys(reference.modes['3.6a'].normal.keys);
    const texts = loadFarTexts(REPO);
    if (texts.loadError) throw new Error(`the far texts did not load: ${texts.loadError}`);
    const ctx = { emit, keyNames, texts, scratch, env, normalizers: p324Normalizers() };
    // This Mac's own answers, over the same fixture, once.
    const macB = join(scratch, 'macft');
    const macH = join(scratch, 'mach');
    mkdirSync(macH, { recursive: true, mode: 0o700 });
    const macMade = spawnSync('/bin/sh', ['-c', FAR_FIXTURE, 'p342-fixture', macB], { env: { ...env, HOME: macH }, encoding: 'utf8' });
    const macHead = /HEAD=([0-9a-f]{40})/.exec(String(macMade.stdout))?.[1] ?? 'none';
    const mac = macFarAnswers(texts, farCalls(macB, macH, macHead), macB, macH, scratch);
    // On this Mac the hard link stays whole: a rename between two names of one file is rename(2)'s no-op.
    void linkSync;
    void chmodSync;
    await withContainers({ label: 'measure:p342', rows, scratch, runId: `m${String(process.pid)}` }, async (handles) => {
      const settled = await Promise.allSettled(rows.map((row) => measureRow(row, handles[row], ctx)));
      for (let i = 0; i < settled.length; i += 1) {
        const s = settled[i];
        if (s.status === 'fulfilled') results.push(s.value);
        else failed.push(`${rows[i]}: ${String(s.reason?.stack ?? s.reason).slice(0, 600)}`);
      }
      for (const r of results) r.grades = [...r.problems, ...gradeRow(r, ctx, mac)];
    });
  } catch (err) {
    runError = err;
  }
  const report = lastReport();
  const after = historyStats();
  const date = new Date().toISOString().slice(0, 10);
  const problems = [...failed];
  if (runError !== null) problems.push(`the run stopped: ${String(runError?.message ?? runError)}`);
  let made = null;
  if (results.length > 0) {
    made = fixturesOf(results, date);
    const reference = JSON.parse(readFileSync(join(REPO, 'build', 'fixtures', 'screen', 'keys-encoding.json'), 'utf8'));
    problems.push(...gradeMatrix(made.matrix).map((p) => `matrix: ${p}`));
    if (rows.length === Object.keys(ROWS).length) problems.push(...gradeRefusals(made.refusals).map((p) => `refusals: ${p}`));
    if (made.dollar.values.every((v) => v.answers['3.4'] !== undefined)) problems.push(...gradeDollar(made.dollar, undoByRule).map((p) => `dollar: ${p}`));
    if (made.capj32 !== null && made.capj33 !== null) {
      problems.push(...gradeCapture(made.capj32.replace(/\\033\[/g, '\u001b['), made.capj33.replace(/\\033\[/g, '\u001b[')).map((p) => `capture: ${p}`));
    }
    if (made.dialect.versions['3.6'] !== undefined) problems.push(...gradeDialect(made.dialect).map((p) => `dialect: ${p}`));
    problems.push(...gradeKeys(made.keys, reference).map((p) => `keys: ${p}`));
    for (const r of results) problems.push(...(r.grades ?? []));
    writeFixtures(join(scratch, 'fixtures'), made);
    if (process.argv.includes('--write')) {
      writeFixtures(FIXTURES, made);
      say(`wrote the fixtures into ${FIXTURES}`);
    } else if (rows.length === Object.keys(ROWS).length) {
      problems.push(...compareFixtures(made).map((p) => `fixtures: ${p}`));
    }
  }
  writeFileSync(join(scratch, 'results.json'), `${JSON.stringify({ rows, results, failed, report, before, after }, null, 1)}\n`);
  try {
    assertDockerAsFound(report);
  } catch (err) {
    problems.push(String(err?.message ?? err));
  }
  if (before.zsh !== after.zsh || before.bash !== after.bash) {
    problems.push(`his shell history moved during the run (zsh ${before.zsh} → ${after.zsh}, bash ${before.bash} → ${after.bash}); nothing this run starts writes it, so attribute it to his own terminals or report it`);
  }
  say(`Docker after the run: ${report?.clean === true ? 'as it was found' : 'NOT as it was found'} (${String(report?.containersRemoved?.length ?? 0)} container(s), ${String(report?.imagesRemoved?.length ?? 0)} pulled image(s) removed; kept ${JSON.stringify(report?.kept ?? [])})`);
  say(`history zsh ${before.zsh} → ${after.zsh}, bash ${before.bash} → ${after.bash}`);
  say(`results ${join(scratch, 'results.json')}`);
  if (runError?.exitCode === 2) {
    process.stderr.write(`${TAG} could not run: ${String(runError.message)}\n`);
    process.exit(2);
  }
  if (problems.length > 0) {
    process.stdout.write(`${TAG} FAIL, ${String(problems.length)}:\n`);
    for (const p of problems) process.stdout.write(`  - ${p}\n`);
    if (process.env['P342_KEEP'] !== '1') rmSync(join(scratch, 'home'), { recursive: true, force: true });
    process.exit(1);
  }
  process.stdout.write(`${TAG} PASS over ${rows.join(', ')}: every grader held and Docker is as it was found.\n`);
  if (process.env['P342_KEEP'] !== '1') {
    // build/docker-run.mjs removes the config folder it made itself; this run
    // removes only what it made.
    for (const sub of ['home', 'macft', 'mach']) rmSync(join(scratch, sub), { recursive: true, force: true });
  }
}

await main();
