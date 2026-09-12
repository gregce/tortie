/**
 * The STORE rules that are call shaped (Phase 257): a SQL statement in a
 * string and a key value write. The store DEFINITIONS, being schema files,
 * migrations and prisma models, are manifest rules in `./manifests.ts`.
 *
 * `store.orm` is NOT here and the charter is why: it measured 8% (1 of 13)
 * because every ORM verb has a non ORM homonym and a name rule has no types,
 * `Object.create(null)` and `LOADING_CJS_FILES.delete(path)` being the shape.
 * Rails' bang forms are the one unambiguous idiom and are not added either,
 * because nothing measured them; re-entry is a `store.orm.rails-bang` rule
 * with a mastodon scoped recall count in its own commit.
 */

import type { FactRule } from './types';

const SQL_STATEMENT =
  /(?:^|[\n;])\s*(INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|ALTER\s+TABLE(?:\s+IF\s+EXISTS)?|DROP\s+TABLE(?:\s+IF\s+EXISTS)?)\s+`?"?\[?([A-Za-z_][A-Za-z0-9_.]*)/i;
/** What follows a table name in a statement and never in a sentence. */
const SQL_CONTINUES = /^[`"\]]?\s*(?:\(|(?:AS\s+\w+\s+)?(?:SET|VALUES|SELECT|WHERE|ADD|DROP|RENAME|MODIFY|ALTER|DEFAULT)\b)/i;

export const STORE_RULES: readonly FactRule[] = [
  {
    id: 'store.sql',
    category: 'store',
    kind: 'store-write',
    langs: '*',
    match: (s) => {
      for (const a of s.args) {
        // Anchored at the start of the string or after a statement break: an
        // unanchored \bUPDATE matched English prose in 40 of this
        // repository's own error messages. THE ANCHOR WAS NOT ENOUGH: the
        // Phase 257 fix round read `errors.New("update plugin conf failed")`
        // as `UPDATE plugin` on gotify and `'update check failed'` on this
        // repository, about 65 of tortie's 244 store facts by a line count,
        // because a sentence BEGINS with a verb too. So a keyword is a
        // statement only when it is written in SQL's own upper case, or when
        // the statement continues past its subject the way SQL does, being
        // `SET`, `VALUES`, `SELECT`, `WHERE`, a column clause or a `(`. The
        // stated limit is a lower case whole-table statement with nothing
        // after the table name, `"delete from sessions"`, which is missed.
        const m = SQL_STATEMENT.exec(a);
        if (m === null) continue;
        const keyword = m[1]!;
        const rest = a.slice(m.index + m[0].length);
        if (keyword !== keyword.toUpperCase() && !SQL_CONTINUES.test(rest)) continue;
        return `${keyword.toUpperCase().replace(/\s+/g, ' ')} ${m[2]}`;
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
  }
];
