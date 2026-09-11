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
        // repository's own error messages.
        const m =
          /(?:^|[\n;])\s*(INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|ALTER\s+TABLE|DROP\s+TABLE)\s+`?"?\[?([A-Za-z_][A-Za-z0-9_.]*)/i.exec(
            a
          );
        if (m) return `${m[1]!.toUpperCase().replace(/\s+/g, ' ')} ${m[2]}`;
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
