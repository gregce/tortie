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
 */

import type { FactRule } from './types';
import { isTestPath } from './predicates';

export const NETWORK_RULES: readonly FactRule[] = [
  {
    id: 'network.client',
    category: 'network',
    kind: 'client',
    langs: '*',
    match: (s, c) => {
      const test = isTestPath(c.file);
      const u = s.args.find((a) => /^(https?|wss?|grpc):\/\/[^\s'"]{3,}/.test(a));
      if (u !== undefined) return test ? null : `talks to ${u.slice(0, 80)}`;
      if (s.last === 'fetch' && s.recv === '' && s.argc > 0) return test ? null : 'HTTP client call';
      if (/^(axios|requests|httpx|urllib|http|reqwest|HttpClient|URLSession|RestTemplate|WebClient)$/i.test(s.recv)) {
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
