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
      const test = isTestPath(c.file);
      const first = s.args[0] ?? '';
      const u = URL_PARSE.test(s.last) ? (reachableUrl(first) ? first : undefined) : s.args.find(reachableUrl);
      if (u !== undefined) return test ? null : `talks to ${u.slice(0, 80)}`;
      if (s.last === 'fetch' && s.recv === '' && s.argc > 0) return test ? null : 'HTTP client call';
      if (s.form !== 'new' && /^(axios|requests|httpx|urllib|http|reqwest|HttpClient|URLSession|RestTemplate|WebClient)$/i.test(s.recv)) {
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
