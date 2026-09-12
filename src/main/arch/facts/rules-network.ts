/**
 * The NETWORK rules (Phase 257): what a repository reaches and what it
 * listens on. A category of its own since this phase, out of `effect`.
 *
 * `effect.net.client` measured 48% (14 of 29) and every one of its `t` rows
 * was a literal URL inside a test, `stub_request(:get, "https://…")` in a
 * spec or `URL(string: "https://example.com/…")` in a test target. So the
 * literal URL branch and the bare `fetch` branch refuse a test path. The
 * client RECEIVER branch is unchanged, because the hand method counts a test
 * that CALLS `requests.get` as the repository's own code, and requests'
 * recall of 0 of 5 real reaches is a different question the model half
 * answers (research 118 §6.1).
 *
 * THE FIX ROUND MEASURED THE RULE AT 48% ON FRESH ROWS, the same number,
 * because the test-path refusal had reached the test half alone. Four false
 * classes were counted over ten repositories and each is refused below by a
 * mechanical test: a VOCABULARY IRI in a string, being a URL carrying a `#`
 * fragment (a fragment is never sent on the wire, RFC 3986 §3.5) or one under
 * a closed set of namespace hosts (136 of mastodon's 367 network facts were
 * `https://w3id.org/security#…`, `http://www.w3.org/2001/XMLSchema#` and
 * `http://purl.org/dc/terms/`); a CONSTRUCTION on the receiver branch, being
 * Go's `&http.Request{…}` captured as `new` and read as "HTTP client call" (25
 * of miniflux's 48); the BASE of a URL parse, `new URL(x, 'http://127.0.0.1')`,
 * which resolves a relative path and reaches nothing, while the first string
 * of `URL(string: "https://api…")` is still the URL the code holds; and a URL
 * with NO HOST, `https:///path`. Ruby's `ENV.fetch` was the largest class of all,
 * 195 of mastodon's 365, and is fixed where it arose, in
 * `src/main/symbols/calls.ts`, which now reads a Ruby receiver. What is left
 * at 48% after these is the receiver branch's own ambiguity, `http.Get` in a
 * test that the hand method counts as product code, and the number Phase 258
 * draws "the network reaches" from is the one this header states, not
 * "fixed".
 *
 * PHASE 261 CLOSED TWO MORE OF THOSE CLASSES AND REFUSED THE THIRD, and the
 * refusal is written down here rather than dropped in silence.
 *
 * Closed: an msw handler, `http.get('https://api…', …)` in a file that NAMES
 * msw, which DECLARES a route a test will answer and reaches nothing; and
 * `requests.Request('GET', url)`, a CONSTRUCTION reached by a call rather
 * than by `new`. The second one changes nothing where the URL is a LITERAL,
 * because the URL argument branch above answers that site whatever the
 * receiver is, and saying so is the honest half of the fix.
 *
 * NAMES, NOT IMPORTS, AND THE FIX ROUND CORRECTED THIS SENTENCE. It read "in
 * a file that imports msw" while `NAMES_MSW` is tested against `c.text`, being
 * the WHOLE file, so a mention inside a COMMENT counts. That is the same
 * question `NAMES_CLAP` asks in `./rules-surface.ts` and the one
 * `RuleContext.text` exists for, and it is deliberately the wide direction: a
 * file that names msw at all is a file whose `http.get` is most likely a
 * handler, and the cost of being wrong that way is a row this base does not
 * draw rather than a row it invents.
 *
 * THE COST IS MEASURED AND IS THE STATED LIMIT. A file whose ONLY mention of
 * msw is a comment loses its real client rows: driven through the shipping
 * rule, `http.get('https://really.example.com/v1')` and `http.post('/x')` in
 * such a file both answer nothing, where the same two sites in a file that
 * never says msw answer `talks to https://really.example.com/v1` and `HTTP
 * client call`. `__tests__/p261-msw-names.test.ts` pins both readings, so this
 * paragraph cannot drift away from the code the way the first one did. The
 * second half of the same limit is a REAL `http.get` in a file that also names
 * msw, which is the narrower mistake and is named above.
 *
 * REFUSED, AND IT STAYS A STATED LIMIT: the URL argument branch fires on ANY
 * callee, so `anything("https://x.example.com")` reads as a reach and a URL
 * that is only ever logged or documented does too. Every mechanical answer
 * costs more than it buys. A callee ALLOWLIST is the wrong way round for an
 * open set, which this domain has already paid for once (`predicates.ts`: an
 * allowlist of router names found 7 of gotify's 41 routes). Narrowing the
 * literal branch would move the 48% this header publishes with nobody
 * re-judging a row, and that branch is the rule's recall engine — it is what
 * finds `stub_request(:get, "https://…")` and `URL(string: "https://…")`.
 * Telling "the code reaches this URL" from "this string happens to be a URL"
 * needs data flow, which means types or a model, and this base has neither by
 * charter. Closing it is a phase that can re-judge the rows, not a nit.
 *
 * Two more shapes belong beside it, because Phase 261 measured both and left
 * both alone. `http.get(PREFIX + '/z', h)` answers `HTTP client call` on the
 * receiver branch even though it is a route declaration, because the receiver
 * decides and no literal is read. And a CONCATENATED url,
 * `fetch('https://a.example.com' + '/y')`, reads `talks to
 * https://a.example.com`, the first half of its own URL, because
 * `argString` in `src/main/symbols/calls.ts` reads the first literal of a
 * join; that file's header carries the measurement that refused the obvious
 * fix and the reason it is a rule's judgement rather than the reader's.
 */

import type { FactRule } from './types';
import { isTestPath } from './predicates';

/** A literal URL with a host: scheme, `://`, then something that is not a slash. */
const LITERAL_URL = /^(https?|wss?|grpc):\/\/[^\s'"/]{1,}[^\s'"]{2,}/;
/**
 * Hosts whose URLs NAME things rather than serve them: the JSON-LD and RDF
 * vocabularies. Closed, and measured on mastodon (2026-09-11).
 */
const VOCABULARY_HOST = /^(https?):\/\/(www\.)?(w3\.org|w3id\.org|purl\.org|schema\.org|xmlns\.com)(\/|$)/i;
/**
 * A construction that parses a URL into a value. Its FIRST string is the
 * URL the code holds and may reach, `URL(string: "https://api…")`; a string
 * after it is a BASE for resolving a relative one, `new URL(x, 'http://127.0.0.1')`,
 * and reaches nothing.
 */
const URL_PARSE = /^(URL|URI|Uri|NSURL)$/;

/**
 * A file that NAMES the msw package, a mention in a comment included, because
 * this is asked of `RuleContext.text` and that is the whole file. An msw
 * handler DECLARES a route a test will answer and reaches nothing, and the
 * test-path refusal never caught them because they live in
 * `src/mocks/handlers.ts` rather than under a test path. So the test is the
 * FILE, the way `NAMES_CLAP` is in `./rules-surface.ts`. What that costs, and
 * why it is not narrowed to an import, is in this file's header.
 */
const NAMES_MSW = /\bfrom\s+['"]msw(\/\w+)?['"]|require\(['"]msw(\/\w+)?['"]\)/;
/** The msw receivers. `http.get`, `https.post` and `graphql.query` are its whole surface. */
const MSW_RECV = /^(http|https|graphql)$/;

/** Is a string argument a URL the code could reach, rather than a name? */
export function reachableUrl(a: string): boolean {
  if (!LITERAL_URL.test(a)) return false;
  if (a.includes('#')) return false;
  if (VOCABULARY_HOST.test(a)) return false;
  return true;
}

export const NETWORK_RULES: readonly FactRule[] = [
  {
    id: 'network.client',
    category: 'network',
    kind: 'client',
    langs: '*',
    match: (s, c) => {
      // An msw handler reaches nothing, and the refusal is asked FIRST
      // because the URL argument branch below fires ahead of the receiver
      // branch and would otherwise keep answering for the same site. The cost
      // is a real `http.get` in a file that also imports msw, which is the
      // narrower mistake.
      if (MSW_RECV.test(s.recv) && NAMES_MSW.test(c.text)) return null;
      const test = isTestPath(c.file);
      const first = s.args[0] ?? '';
      const u = URL_PARSE.test(s.last) ? (reachableUrl(first) ? first : undefined) : s.args.find(reachableUrl);
      if (u !== undefined) return test ? null : `talks to ${u.slice(0, 80)}`;
      if (s.last === 'fetch' && s.recv === '' && s.argc > 0) return test ? null : 'HTTP client call';
      if (s.form !== 'new' && /^(axios|requests|httpx|urllib|http|reqwest|HttpClient|URLSession|RestTemplate|WebClient)$/i.test(s.recv)) {
        // `requests.Request('GET', url)` BUILDS a request and reaches nothing
        // until a session sends it, which is the same refusal Phase 257 made
        // for Go's `&http.Request{}` in the condition above, reached by a CALL
        // rather than by `new`. Two clauses carry it and both are load
        // bearing. The case matters, because `requests.request('GET', url)` is
        // a real reach and the verb test below is case insensitive, so it
        // would swallow both. And the FORM is asked even though this block is
        // already inside `s.form !== 'new'`: without it this clause would
        // catch Go's struct literal too, and `conformance:facts`' ablation of
        // the `new` refusal could no longer fail, which is a guard made
        // unfalsifiable by a neighbour rather than a guard kept.
        if (s.form === 'call' && (s.last === 'Request' || s.last === 'HttpRequest')) return null;
        if (/^(get|post|put|patch|delete|request|send|Do|execute|dataTask)$/i.test(s.last)) return 'HTTP client call';
      }
      if (s.last === 'WebSocket' || s.recv === 'WebSocket') return 'opens a websocket';
      if (/^(Dial|DialContext|connect|Connect)$/.test(s.last) && /^(net|grpc|tls|amqp|redis)$/.test(s.recv)) {
        return `opens a ${s.recv} connection`;
      }
      return null;
    }
  },
  {
    id: 'network.listen',
    category: 'network',
    kind: 'listen',
    langs: '*',
    match: (s) => {
      if (s.recv === 'http' && /^(ListenAndServe|Serve|ListenAndServeTLS)$/.test(s.last)) return 'serves HTTP';
      if (!/^(listen|Listen|bind|run|serve|Serve)$/.test(s.last)) return null;
      if (!/^(app|server|srv|http|net|httpd|uvicorn|listener)$/i.test(s.recv)) return null;
      if (s.argc === 0) return null;
      return `listens (${s.args[0] || 'computed'})`;
    }
  }
];
