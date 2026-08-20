set -e
umask 077
p="$1"
x="$2"
r="$3"
o=
b=
IFS=:
for d in $p; do
  if [ -n "$d" ] && [ -d "$d" ] && { [ ! -r "$d" ] || [ ! -x "$d" ]; }; then b="$b$d
"; fi
done
for d in $x; do
  if [ -n "$d" ] && [ -d "$d" ] && { [ ! -r "$d" ] || [ ! -x "$d" ]; }; then b="$b$d
"; fi
done
IFS='
'
for line in $r; do
  if [ -z "$line" ]; then continue; fi
  n=${line%% *}
  if [ "$n" = "$line" ]; then e=; else e=${line#* }; fi
  f=
  s=
  IFS=:
  for d in $p; do
    if [ -n "$d" ] && [ -f "$d/$n" ] && [ -x "$d/$n" ]; then f="$d/$n"; s=path; break; fi
  done
  if [ -z "$f" ]; then
    for d in $e; do
      if [ -n "$d" ] && [ -f "$d/$n" ] && [ -x "$d/$n" ]; then f="$d/$n"; s=agent; break; fi
    done
  fi
  if [ -z "$f" ]; then
    for d in $x; do
      if [ -n "$d" ] && [ -f "$d/$n" ] && [ -x "$d/$n" ]; then f="$d/$n"; s=install; break; fi
    done
  fi
  IFS='
'
  o="$o${s:-none} $n ${f:-none}
"
done
printf '__TORTIE_RUN__%s%s__TORTIE_RUN__\n' "${o:-none}" "${b:+unreadable
$b}"
