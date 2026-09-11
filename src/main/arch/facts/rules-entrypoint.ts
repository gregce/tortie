/**
 * The ENTRYPOINT rule that is call shaped (Phase 257): the composition root.
 *
 * The prototype's `entrypoint.composition` was an open NAME list and
 * measured 38% (3 of 8); on gotify it read 1 of 6, every miss being
 * `&model.Application{…}`, a struct literal that happened to end in a word on
 * the list. The charter says fix or drop before anything seeds from it, and
 * the fix is a CLOSED PAIR table: receiver, final segment, form and grammar
 * together, so a bare `Default`, `Application`, `run` or `NewRouter` with no
 * receiver answers nothing. `viper.Default()`, `cfg.Default()` and
 * `x.Default()` are the decoys the gate plants from gotify's own shape.
 *
 * Rails' composition root is a class declaration rather than a call and is
 * the line rule `entrypoint.rails.application` in `./line-rules.ts`.
 */

import type { CallForm } from '../../symbols/extract';
import type { GrammarId } from '../../symbols/languages';
import type { FactRule } from './types';

const JS: readonly GrammarId[] = ['typescript', 'tsx', 'javascript'];

export interface CompositionRoot {
  /** The receiver the callee must carry: '' for a bare call, else a pattern over the receiver. */
  readonly recv: RegExp | '';
  /** The callee's final segment, exactly. */
  readonly last: string;
  readonly form: CallForm;
  readonly langs: readonly GrammarId[];
  /** A pattern the whole file must match, for a name two crates share. */
  readonly needs?: RegExp;
}

export const COMPOSITION_ROOTS: readonly CompositionRoot[] = [
  // JavaScript family.
  { recv: '', last: 'express', form: 'call', langs: JS },
  { recv: '', last: 'createApp', form: 'call', langs: JS },
  { recv: /^(http|https|net)$/, last: 'createServer', form: 'call', langs: JS },
  { recv: '', last: 'BrowserWindow', form: 'new', langs: JS },
  { recv: /^app$/, last: 'whenReady', form: 'call', langs: JS },
  { recv: '', last: 'bootstrapApplication', form: 'call', langs: JS },
  { recv: '', last: 'Koa', form: 'new', langs: JS },
  { recv: '', last: 'Fastify', form: 'call', langs: JS },
  // Python.
  { recv: /^(|flask)$/, last: 'Flask', form: 'call', langs: ['python'] },
  { recv: /^(|fastapi)$/, last: 'FastAPI', form: 'call', langs: ['python'] },
  { recv: /^uvicorn$/, last: 'run', form: 'call', langs: ['python'] },
  { recv: '', last: 'Celery', form: 'call', langs: ['python'] },
  // Go.
  { recv: /^gin$/, last: 'Default', form: 'call', langs: ['go'] },
  { recv: /^gin$/, last: 'New', form: 'call', langs: ['go'] },
  { recv: /^mux$/, last: 'NewRouter', form: 'call', langs: ['go'] },
  { recv: /^echo$/, last: 'New', form: 'call', langs: ['go'] },
  { recv: /^fiber$/, last: 'New', form: 'call', langs: ['go'] },
  { recv: /^chi$/, last: 'NewRouter', form: 'call', langs: ['go'] },
  { recv: /^http$/, last: 'NewServeMux', form: 'call', langs: ['go'] },
  // Rust: three names two crates share, so the file must name the crate.
  { recv: /^HttpServer$/, last: 'new', form: 'call', langs: ['rust'], needs: /\bactix\b/ },
  { recv: /^Router$/, last: 'new', form: 'call', langs: ['rust'], needs: /\baxum\b/ },
  { recv: /^App$/, last: 'new', form: 'call', langs: ['rust'], needs: /\bactix\b/ },
  // Swift: written as an attribute or as a call.
  { recv: '', last: 'UIApplicationMain', form: 'attribute', langs: ['swift'] },
  { recv: '', last: 'UIApplicationMain', form: 'call', langs: ['swift'] },
  { recv: '', last: 'NSApplicationMain', form: 'attribute', langs: ['swift'] },
  { recv: '', last: 'NSApplicationMain', form: 'call', langs: ['swift'] }
];

export const ENTRYPOINT_RULES: readonly FactRule[] = [
  {
    id: 'entrypoint.composition',
    category: 'entrypoint',
    kind: 'composition-root',
    langs: '*',
    match: (s, c) => {
      for (const r of COMPOSITION_ROOTS) {
        if (r.last !== s.last || r.form !== s.form) continue;
        if (!r.langs.includes(c.lang)) continue;
        if (r.recv === '' ? s.recv !== '' : !r.recv.test(s.recv)) continue;
        if (r.needs !== undefined && !r.needs.test(c.text)) continue;
        return `composes ${s.callee.slice(0, 60)}`;
      }
      return null;
    }
  }
];
