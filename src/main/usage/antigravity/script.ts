/**
 * The Antigravity status line script (Phase 374): its text, the command string
 * that runs it and the `--settings` value that names it.
 *
 * THE WHOLE MECHANISM IN ONE PARAGRAPH. `agy` hands its status line command a
 * JSON payload on standard input, and the payload carries the plan's quota
 * block (docs/research/146, section 6). Tortie starts a NEW Antigravity session
 * with an inline `--settings` naming the command below, the command sources one
 * generated script, and the script keeps four buckets, the plan word, a
 * salted hash of the address and, since Phase 375, the address itself when it
 * is a plain one, in one small private file under Tortie's own folder. Main
 * reads that folder (./folder.ts) while the switch is on.
 *
 * THIS FILE IS PURE. No file system, no electron, no clock and no random
 * number of its own: the salt is handed in. The folder is ./folder.ts's and
 * the decision to use it at all is ./launch.ts's.
 *
 * SEVEN RULES, each measured (build/p374/SPEC.md section 2, build/p375/SPEC.md
 * section 2, docs/research/146 sections 6.5 and 6.6), and each one a later
 * round must not undo.
 *
 *  1. IT WRITES A FILE AND POSTS NOTHING. The Claude tap beside this one
 *     (../statusline.ts) posts to a loopback route with a token. There is no
 *     home for a token here and a post loses the last number: that tap's
 *     fifteen second clock, replayed over the recorded runs, never carried a
 *     turn's final numbers. So this one keys on CONTENT and never on a clock.
 *  2. IT SAYS NOTHING AND ANSWERS 0. A run that exits non zero draws an error
 *     block in the person's conversation and it stays there. So the command
 *     string answers 0 for a script that is missing, unreadable, a folder, or
 *     broken, and closes both outputs of the WHOLE run before it sources a
 *     byte. Closing them on the sourcing alone was not enough: bash 3.2 keeps
 *     the bytes of a `printf` that met a full disk and writes them to its
 *     standard output as it ends, after such a redirection has gone, so the
 *     kept line reached the person's screen (the fix round, read on a full
 *     APFS volume).
 *  3. IT IS SOURCED, NOT STARTED. agy ends a run by killing the `sh` it
 *     started and nothing else. Sourced, that `sh` is the process that waits on
 *     standard input, so a kill at any step leaves nothing waiting.
 *  4. THE COUNTDOWN IS LEFT OUT. `reset_in_seconds` moves in every run, so a
 *     comparison that held it would write on nearly every run and the age of
 *     the file would be the age of the last run rather than of the numbers.
 *  5. THE ADDRESS LANDS IN ONE PLACE, IN ONE SHAPE (Phase 375, on the
 *     person's word; Phase 374 kept only the hash). It reaches `openssl`
 *     through a pipe, salted, for the hash that tells two accounts apart, and
 *     it reaches the slot line, as `"e"` straight after `"h"`, only when the
 *     raw JSON token is a PLAIN ASCII address: letters, digits and
 *     `. _ % + ' -`, one `@` at token positions 3 to 66 (a local part of 1 to
 *     64), a dot after it, at most 256 characters with the quotes, and no line
 *     break inside. Anything else, an escape of any kind included, is written
 *     `"e":null` with every other byte the parent's. NOTHING IS EVER ESCAPED:
 *     the class holds no quote, backslash or control byte, so a kept token is
 *     already a JSON string and the line needs nothing done to it. The line
 *     goes out through the builtin `printf` alone. No payload text is ever an
 *     argument of a program, an exported variable, a here-document (bash
 *     writes one to a temporary file) or a byte of any other file, and every
 *     other kept field is held to a character set that cannot spell an
 *     address. The main side asks `usageAddress` (src/shared/usage.ts) again,
 *     and `conformance:usage` G12 holds the two to one corpus. The hash is
 *     not claimed to hide the address from the person's own user, and the
 *     address is not hidden from them at all.
 *  6. ONLY WHERE TORTIE MADE A PLACE. It writes only over the regular file main
 *     opened for this session, so a removed session's file is never made again
 *     and a forged id has nowhere to write.
 *  7. THE READER READS EXACTLY WHAT PHASE 374 READ, AND A LINE BREAK IS ONLY
 *     A MARK BESIDE IT (Phase 375 and its fix round). Phase 374 glued the
 *     payload's lines, so a raw line break inside the address vanished and a
 *     different address would have been kept. So the shell glues the lines as
 *     374 did and leaves a newline between two lines only where the first one
 *     holds a quote, which every line that opens the address does; the reader
 *     notes where those newlines stood, removes them, and parses the glued text,
 *     which is 374's input byte for byte, so every byte it writes but `e` is
 *     374's for any payload at all, a raw break inside a key, a number or the
 *     plan word included. `e` is refused when a newline stood strictly inside
 *     the address token. The bound is 374's (`tt_c`, the sum of the lines' own
 *     lengths, against the reader's glued length), and the shell's early look
 *     for `"quota"` lets through any payload a newline was left in, because a
 *     newline can stand inside that key too, and the reader then answers as 374
 *     did. A compact payload, which is what agy sends, holds no newline, so its
 *     look is 374's exactly. A BLANK LINE COSTS NOTHING:
 *     it adds no byte, no count and no mark, because a newline for each one
 *     grew the payload without bound and the joining took seconds over tens of
 *     thousands of them, past agy's 300 ms, where 374 wrote (the verify round).
 *     A raw NUL inside the token is the one case the shells disagree on (dash
 *     and ksh drop it, bash and zsh write nothing), as at 374; JSON forbids one
 *     and agy's encoder never writes one.
 *
 * THE PROGRAMS are `/usr/bin/awk`, `/usr/bin/openssl`, `/bin/mv` and, only for
 * a write that did not land, `/bin/rm`, by absolute path, and the shell's own
 * builtins. A missing or a different one
 * fails closed: an empty or odd answer writes nothing and the run answers 0.
 * Python, Node and jq are not on every Mac Tortie runs on, so there is none.
 */

import { shellQuote } from '../statusline';

/** The four bucket ids kept, compiled, matched exactly and never by shape. */
export const ANTIGRAVITY_BUCKET_IDS = ['gemini-5h', 'gemini-weekly', '3p-5h', '3p-weekly'] as const;

/** The longest payload read. The recorded ones are 761 to 1,540 bytes. */
export const ANTIGRAVITY_PAYLOAD_CAP = 16_384;

/** The salt's one shape: 16 random bytes, in hex. */
const SALT_SHAPE = /^[0-9a-f]{32}$/;

/**
 * The JSON reader, in awk, and it walks the WHOLE document.
 *
 * Why a reader and not a cut: the smallest textual cut of the quota block
 * cannot tell that block from a bucket-looking string inside
 * `conversation_title`, and the address has to be found anyway to be hashed.
 * It keeps a stack of containers, so a bucket is a bucket only at
 * `quota.<id>.<field>` of the top level object, and it prints nothing at all
 * unless the document closed cleanly with nothing after it.
 *
 * It reads the payload as Phase 374 handed it, glued: the newlines the shell
 * left are noted by where they stood in the glued text (`br`) and removed
 * before a byte is parsed (rule 7). What it prints is two lines: the raw
 * token of the top level `email`, for the hash, and the kept fields, which
 * begin with `"e"`, being that token when it is a plain address with no
 * newline noted inside it and `null` otherwise (rule 5). The address's shape
 * is built in `BEGIN` with `sprintf("%c",39)` for its apostrophe, because the
 * program sits between apostrophes.
 *
 * A container's key is empty until one is read and an array never has one, so
 * an array anywhere on the way matches nothing. A duplicate key takes the last,
 * whole, as `JSON.parse` does. A container where a value was expected is read
 * as an odd value: an odd
 * `disabled` is true and any `remaining_amount` is an amount, because both
 * make main draw nothing, which is the safe direction.
 *
 * NO APOSTROPHE MAY APPEAR IN IT. It sits between two in the script.
 */
const AWK_READER = String.raw`BEGIN{RS="\001";sq=sprintf("%c",39);ad="^\"[A-Za-z0-9._%+" sq "-]+@[A-Za-z0-9-]+([.][A-Za-z0-9-]+)+\"$";m=split("${ANTIGRAVITY_BUCKET_IDS.join(' ')}",id," ")}
NR>1{bad=1}
{s=$0}
END{
 np=split(s,ln,"\n");c=0;for(i=1;i<np;i++){c+=length(ln[i]);br[c]=1}
 gsub(/\n/,"",s);L=length(s)
 if(bad||L>${String(ANTIGRAVITY_PAYLOAD_CAP)})exit
 n=0;want="v"
 while(1){
  sub(/^[ \t\r\n]+/,"",s)
  if(s=="")break
  if(done)exit
  c=substr(s,1,1)
  if(c=="\""){
   if(!match(s,/^"([^"\\]|\\.)*"/))exit
   t=substr(s,1,RLENGTH);s=substr(s,RLENGTH+1)
   if(want=="k"||want=="K"){key[n]=substr(t,2,length(t)-2);want=":";continue}
   if(want!="v"&&want!="V")exit
   if(n==1&&key[1]=="email")ea=L-length(s)-length(t)+1
   leaf(t,"s");want=",";if(n==0)done=1;continue
  }
  if(c=="{"||c=="["){
   if(want!="v"&&want!="V")exit
   leaf(c,"o")
   s=substr(s,2);n++;if(n>64)exit
   typ[n]=c;key[n]="";want=(c=="{")?"K":"V";continue
  }
  if(c=="}"||c=="]"){
   if(n<1)exit
   if(c=="}"&&(typ[n]!="{"||(want!=","&&want!="K")))exit
   if(c=="]"&&(typ[n]!="["||(want!=","&&want!="V")))exit
   s=substr(s,2);n--;want=",";if(n==0)done=1;continue
  }
  if(c==":"){if(want!=":")exit;s=substr(s,2);want="v";continue}
  if(c==","){if(want!=","||n<1)exit;s=substr(s,2);want=(typ[n]=="{")?"k":"v";continue}
  if(!match(s,/^[-+.A-Za-z0-9]+/))exit
  t=substr(s,1,RLENGTH);s=substr(s,RLENGTH+1)
  if(want!="v"&&want!="V")exit
  leaf(t,"a");want=",";if(n==0)done=1
 }
 if(!done||mail=="")exit
 o=""
 for(i=1;i<=m;i++){if(!(id[i] in seen))continue
  o=o (o==""?"":",") "\"" id[i] "\":{\"f\":" ((id[i] in fr)?fr[id[i]]:"null") ",\"r\":" ((id[i] in rs)?rs[id[i]]:"null") ",\"d\":" ((id[i] in di)?di[id[i]]:"null") ",\"a\":" ((id[i] in am)?"true":"false") "}"}
 if(o=="")exit
 e="null"
 if(!nl&&length(mail)<=256&&mail~ad){at=index(mail,"@");if(at>=3&&at<=66)e=mail}
 print mail
 print "\"e\":" e ",\"p\":" (plan==""?"null":plan) ",\"q\":{" o "}"
}
function wipe(q){delete seen[q];delete fr[q];delete rs[q];delete di[q];delete am[q]}
function known(q, i){for(i=1;i<=m;i++)if(id[i]==q)return 1;return 0}
function leaf(t,k, q,i,j){
 if(n==0)return
 if(n==1){
  if(key[1]=="email"){nl=0;if(k=="s"&&length(t)<=256)for(j=ea;j<ea+length(t)-1;j++)if(j in br)nl=1;mail=(k=="s"&&length(t)>2&&length(t)<=514)?t:""}
  else if(key[1]=="plan_tier")plan=(k=="s"&&length(t)<=42&&t~/^"[A-Za-z][A-Za-z0-9 _-]*"$/)?t:""
  else if(key[1]=="quota")for(i=1;i<=m;i++)wipe(id[i])
  return
 }
 if(key[1]!="quota")return
 q=key[2]
 if(!known(q))return
 if(n==2){wipe(q);return}
 if(n!=3||typ[3]!="{")return
 seen[q]=1
 if(key[3]=="remaining_fraction"){if(k=="a"&&length(t)<=24&&t~/^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][-+]?[0-9]+)?$/)fr[q]=t;else delete fr[q]}
 else if(key[3]=="reset_time"){if(k=="s"&&length(t)<=42&&t~/^"[0-9TZ:.+-]+"$/)rs[q]=t;else delete rs[q]}
 else if(key[3]=="disabled"){if(t=="null"&&k=="a")delete di[q];else if(k=="a"&&(t=="true"||t=="false"))di[q]=t;else di[q]="true"}
 else if(key[3]=="remaining_amount"){if(t=="null"&&k=="a")delete am[q];else am[q]=1}
}
`;

/** Where the script lives and the salt it hashes with. */
export interface AntigravityScriptPlaces {
  /** The folder holding one `<session id>.json` per session, absolute. */
  readonly dir: string;
  /** 16 random bytes in lower case hex, kept for the life of the folder. */
  readonly salt: string;
}

/**
 * The script, generated whole so there is nothing to keep in step.
 *
 * The order is the order it must keep: names unset first, so an inherited
 * exported variable cannot carry payload text into a program's environment;
 * then who this session is; then the place main made for it; and only then a
 * byte of standard input. `exit 0` ends the sourcing shell, which is the point.
 */
export function antigravityStatusScript(places: AntigravityScriptPlaces): string {
  if (!SALT_SHAPE.test(places.salt)) throw new Error('the salt is not 32 lower case hex digits');
  return `# Tortie's Antigravity usage line. Generated by Tortie (Phase 374); edits are
# overwritten. It prints nothing and keeps four buckets, the plan word and the
# account's plain address (Phase 375), or none.
unset tt_p tt_l tt_o tt_m tt_b tt_h tt_v tt_f tt_s tt_t tt_k tt_c tt_q
set +a
umask 077
LC_ALL=C
export LC_ALL
[ "\${GMUX_MANAGED:-}" = 1 ] || exit 0
tt_s=\${GMUX_SESSION_ID:-}
case $tt_s in '' | *[!0-9a-f-]*) exit 0 ;; esac
tt_f=${shellQuote(places.dir)}/$tt_s.json
[ -f "$tt_f" ] || exit 0
tt_p=
tt_l=
tt_q=
tt_c=0
while IFS= read -r tt_l || [ -n "$tt_l" ]; do
  case $tt_l in
  '') ;;
  *)
    tt_c=$((tt_c+\${#tt_l}))
    [ $tt_c -le ${String(ANTIGRAVITY_PAYLOAD_CAP)} ] || exit 0
    tt_p=$tt_p$tt_q$tt_l
    case $tt_l in *'"'*) tt_q='
' ;; *) tt_q= ;; esac
    ;;
  esac
  tt_l=
done
case $tt_p in *'"quota"'* | *'
'*) ;; *) exit 0 ;; esac
tt_o=$(printf '%s' "$tt_p" | /usr/bin/awk '${AWK_READER}')
tt_p=
tt_m=\${tt_o%%
*}
tt_b=\${tt_o#*
}
[ -n "$tt_b" ] || exit 0
[ "$tt_b" != "$tt_o" ] || exit 0
tt_k=${places.salt}
tt_h=$(printf '%s' "$tt_k$tt_m" | /usr/bin/openssl dgst -sha256 -r)
tt_m=
tt_o=
tt_h=\${tt_h%% *}
case $tt_h in '' | *[!0-9a-f]*) exit 0 ;; esac
[ \${#tt_h} -eq 64 ] || exit 0
tt_l="{\\"v\\":1,\\"h\\":\\"$tt_h\\",$tt_b}"
IFS= read -r tt_v <"$tt_f"
[ "$tt_l" != "$tt_v" ] || exit 0
tt_t=$tt_f.$$.tmp
printf '%s\\n' "$tt_l" >"$tt_t" && [ -f "$tt_f" ] && /bin/mv -f "$tt_t" "$tt_f" && exit 0
/bin/rm -f "$tt_t"
exit 0
`;
}

/**
 * The salt a script on disk carries, or null when it carries none in the one
 * shape this file writes. Read back so that regenerating the script keeps it:
 * a new salt would make the same account look like another one.
 */
export function saltOf(scriptText: string): string | null {
  const found = scriptText.match(/^tt_k=([0-9a-f]{32})$/m);
  return found?.[1] ?? null;
}

/** How the command string begins and ends, whatever the path between. Both are ASCII. */
const COMMAND_HEAD = "trap 'exit 0' 0; exec >/dev/null 2>&1; [ -r ";
const COMMAND_TAIL = '; exit 0';
/** The folder and the name every script path ends in (./folder.ts). */
const SCRIPT_TAIL = "/antigravity-usage/status.sh'";

/**
 * The command string agy hands to `sh -c`.
 *
 * The trap is the first thing in it, so an error the shell treats as fatal (a
 * folder where the script should be, a syntax error, `set -eu` inside) still
 * answers 0, measured under bash 3.2, dash, ksh, bash in POSIX mode and zsh as
 * sh. The outputs are closed for the whole run straight after it (rule 2).
 */
export function antigravityStatusCommand(scriptPath: string): string {
  const path = shellQuote(scriptPath);
  return `${COMMAND_HEAD}${path} ] && . ${path}${COMMAND_TAIL}`;
}

/**
 * JSON that reads the same inside single quotes in every shell.
 *
 * Every character a shell could read inside them is written as a JSON escape:
 * the apostrophe that would end them, the exclamation mark csh expands there,
 * and each backslash escape of JSON's own, because fish reads a doubled
 * backslash there as one. Non-ASCII goes the same way, so no locale reads it.
 */
function quotable(json: string): string {
  const hex = (c: string): string => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`;
  const plain: Record<string, string> = { b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
  return json
    .replace(/\\([^u])/g, (_all, c: string) => hex(plain[c] ?? c))
    .replace(/['!]|[^\x20-\x7e]/g, hex);
}

/**
 * The inline `--settings` value: `statusLine` with three keys and NOTHING ELSE.
 *
 * An unknown top level key ends agy at once (docs/research/146 section 16), so
 * a fourth key here could stop every Antigravity session from starting.
 * `stack_with_default` true keeps agy's own line, and with an empty output the
 * screen is the screen without the setting, row for row.
 */
export function antigravitySettingsJson(scriptPath: string): string {
  return quotable(
    JSON.stringify({
      statusLine: {
        type: 'command',
        command: antigravityStatusCommand(scriptPath),
        stack_with_default: true
      }
    })
  );
}

/**
 * A program with nothing after it, as ONE line for the person's own shell, with
 * the flag behind it.
 *
 * WHY A LINE AT ALL. tmux hands a command of one element to the person's shell
 * (`<shell> -c agy`) and starts a command of several itself. So a plain create
 * runs whatever their shell reads for `-c` (`~/.zshenv`, a fish config), which
 * is where a proxy, a certificate file or a key may be set. Two more elements
 * would leave that road, and agy would start without them. The program is
 * spelled exactly as the one element was, and the value holds nothing a shell
 * reads inside single quotes ({@link quotable}), so no shell need be known.
 */
export function antigravityShellLine(program: string, args: readonly string[]): string {
  const words = args.map((word) => (/^[A-Za-z0-9-]+$/.test(word) ? word : `'${word}'`));
  return [program, ...words].join(' ');
}

/**
 * Is this command line, as `ps` prints it, one RUN of Tortie's status line?
 * The path between the two ends is not compared, because `ps` spells what is
 * not ASCII its own way.
 */
export function isAntigravityStatusRun(command: string): boolean {
  return (
    / -c $/.test(command.slice(0, Math.max(0, command.indexOf(COMMAND_HEAD)))) &&
    command.endsWith(`${SCRIPT_TAIL}${COMMAND_TAIL}`)
  );
}

/** Is this command line, as `ps` prints it, an agy started with Tortie's status line? */
export function carriesAntigravityStatusLine(command: string): boolean {
  return command.includes('--settings {"statusLine":{"type":"command","command":"trap ') &&
    command.includes('/antigravity-usage/status.sh');
}
