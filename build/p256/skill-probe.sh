#!/bin/sh
# skill-probe.sh — Phase 256, question 1. What the as-built-architecture skill's
# helpers ENFORCE, measured by running them, against what the skill only ASKS of
# the agent in prose.
#
# Read only with respect to every repository of the operator's: it builds every
# fixture itself inside a scratch directory made by mktemp and removed in a trap
# (this shell's `finally`). It starts no server, no Electron and no agent, and it
# never writes inside /Users/gdc.
#
# Usage: sh build/p256/skill-probe.sh [<path to as-built-architecture skill>]
set -u
SKILL="${1:-/Users/gdc/as-built-architecture}"
ARCH="$SKILL/scripts/architecture.py"
CHECK="$SKILL/scripts/check_explorer.py"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/p256-skill-probe.XXXXXX")"
cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT INT TERM HUP
export GIT_OPTIONAL_LOCKS=0 GIT_CONFIG_NOSYSTEM=1 HOME="$WORK/home"
mkdir -p "$HOME"
py() { python3 -B "$@"; }
newrepo() {
  r="$WORK/$1"; mkdir -p "$r"; cd "$r" || exit 1
  git init --quiet -b main .
  git config user.email probe@example.invalid; git config user.name Probe
  printf 'def run():\n    """One retry only."""\n    return 1\n' > app.py
  printf '# Changelog\n' > CHANGELOG.md
  git add -A; git commit --quiet -m init
  echo "$r"
}
line() { printf '\n===== %s\n' "$1"; }

line "0. versions"
python3 --version; git --version | head -1

line "1. LIAR. A document whose every claim is false is recorded and reads current."
R=$(newrepo liar)
cat > "$R/AS-BUILT-ARCHITECTURE.html" <<'HTML'
<h1 id="top">Payment platform</h1>
<p>The scheduler retries failed jobs three times with exponential backoff and
writes receipts to Postgres. Accepted live behaviour, 2026-09-10.</p>
<script type="application/json" id="architecture-data">
{"components":[{"id":"scheduler","name":"Retry scheduler",
 "evidence":"accepted-live","job":"Retries failed jobs three times",
 "sources":["app.py"]}]}
</script>
HTML
py "$ARCH" inspect --repo "$R" --artifact AS-BUILT-ARCHITECTURE.html > "$WORK/liar-base.json"
py "$ARCH" record --repo "$R" --baseline "$WORK/liar-base.json" \
  --artifact AS-BUILT-ARCHITECTURE.html | py -c 'import json,sys; v=json.load(sys.stdin); print("record status:", v["status"], "| semantic_verification:", v["semantic_verification"])'
py "$ARCH" check --repo "$R" > "$WORK/liar-check.json"; echo "check exit=$?"
py -c 'import json;v=json.load(open("'"$WORK"'/liar-check.json"));print("check status:",v["status"],"drift:",v["source_drift"],v["artifact_drift"])'
py "$CHECK" "$R/AS-BUILT-ARCHITECTURE.html" > "$WORK/liar-explorer.json"; echo "check_explorer exit=$?"
py -c 'import json;v=json.load(open("'"$WORK"'/liar-explorer.json"));print("explorer status:",v["status"],"findings:",len(v["findings"]),"| source links:",v["checks"]["structured_source_links"])'

line "2. ORDER. The baseline may be taken AFTER the document is written."
echo "(the record above did exactly that: document written, then inspect, then record)"

line "3. WHAT A SOURCE LINK IS ALLOWED TO BE."
R=$(newrepo links); mkdir -p "$R/src"; printf 'x\n' > "$R/src/a.py"
cat > "$R/AS-BUILT-ARCHITECTURE.html" <<'HTML'
<script type="application/json" id="architecture-data">
{"components":[
 {"id":"a","sources":["src"]},
 {"id":"b","sources":["src/a.py#L4200"]},
 {"id":"c","sources":[{"path":"app.py","line":9999,"symbol":"nonexistent"}]},
 {"id":"d","evidence_files":["definitely/missing.py"],"files":["also/missing.py"],
  "source":["singular/missing.py"],"proof":"tests/test_missing.py"},
 {"id":"e","sources":["CHANGELOG.md"]}]}
</script>
HTML
py "$CHECK" "$R/AS-BUILT-ARCHITECTURE.html" > "$WORK/links.json"; echo "exit=$?"
py -c 'import json;v=json.load(open("'"$WORK"'/links.json"));print("status:",v["status"],"| checked source links:",v["checks"]["structured_source_links"],"| findings:",[f["code"] for f in v["findings"]],"| notes:",[n["code"] for n in v["notes"]])'

line "4. BASE. Source links resolve from the DOCUMENT, not the repository root."
R=$(newrepo base); mkdir -p "$R/docs"
printf '<a href="app.py">root relative</a><a href="../app.py">document relative</a>' > "$R/docs/AS-BUILT-ARCHITECTURE.html"
py "$CHECK" "$R/docs/AS-BUILT-ARCHITECTURE.html" > "$WORK/base.json"; echo "exit=$?"
py -c 'import json;v=json.load(open("'"$WORK"'/base.json"));print([ (f["code"],f["ref"]) for f in v["findings"]])'

line "5. DRIFT IS REPOSITORY-WIDE AND UNMAPPED."
R=$(newrepo drift)
printf 'map\n' > "$R/AS-BUILT-ARCHITECTURE.html"
py "$ARCH" inspect --repo "$R" --artifact AS-BUILT-ARCHITECTURE.html > "$WORK/d.json"
py "$ARCH" record --repo "$R" --baseline "$WORK/d.json" --artifact AS-BUILT-ARCHITECTURE.html > /dev/null
printf '# Changelog\n- a typo fix\n' > "$R/CHANGELOG.md"
py "$ARCH" check --repo "$R" > "$WORK/d2.json"; echo "check exit=$? (1 means drift)"
py -c 'import json;v=json.load(open("'"$WORK"'/d2.json"));print("status:",v["status"],"source_drift:",v["source_drift"])'
py "$ARCH" plan --repo "$R" --summary | py -c 'import json,sys;v=json.load(sys.stdin);print("plan:",v["actions"])'
echo "--- what the record itself remembers:"
py -c '
import json
s=json.load(open("'"$R"'/.as-built-architecture.json"))
print("top-level keys:",sorted(s))
print("per-artifact keys:",sorted(s["artifacts"][0]))
print("per-source-file keys:",sorted(s["source"]["files"][0]))
print("any component/journey/gate key anywhere:", any(k in json.dumps(s) for k in ("component","journey","gate","claim","evidence")))'

line "6. NOT A GIT WORKTREE."
mkdir -p "$WORK/plain/src"; printf 'x\n' > "$WORK/plain/src/a.py"
py "$ARCH" inspect --repo "$WORK/plain" ; echo "exit=$?"

line "7. THE HELPERS' OWN VOCABULARY. Words the skill's PROSE is built from, counted in its CODE."
for w in component journey gate evidence contract entrypoint route handler import symbol function class language parse; do
  c=$(grep -oi "$w" "$ARCH" "$CHECK" | wc -l | tr -d ' ')
  printf '%-12s %s\n' "$w" "$c"
done
echo "--- every content read in architecture.py:"
grep -n "read(\|read_text\|read_bytes\|hasher.update" "$ARCH"

line "8. FINDING CODES check_explorer can emit (its whole enforcement surface):"
grep -o 'self\.finding("[a-z-]*"' "$CHECK" | sed 's/.*("//;s/"//' | sort -u
echo "--- and its notes (things it explicitly does NOT check):"
grep -o 'self\.note("[a-z-]*"' "$CHECK" | sed 's/.*("//;s/"//' | sort -u
