/**
 * The tests more than one rule asks (Phase 257).
 *
 * Each is a closed pattern over a string the worker already produced. The two
 * closed SETS below are the design of research 118 §6.2 item 2 made
 * checkable: an allowlist is the wrong way round for an open set, so what is
 * written down is the half that is closed, being the http CLIENT receivers a
 * route rule refuses and the ASSERTION receivers a gate rule refuses.
 */

import type { ExtractedCall } from '../../symbols/extract';

export const HTTP_VERBS: ReadonlySet<string> = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
  'all',
  'any'
]);

/**
 * Receivers whose `get`/`post` is a CLIENT call, never a route declaration.
 *
 * THE RULE WAS AN ALLOWLIST OF ROUTER NAMES AND THAT WAS THE WRONG WAY ROUND.
 * Measured on gotify 2026-09-10: `router/router.go` declares 41 routes and an
 * allowlist of plausible router receivers found 7, because the real receivers
 * are `oidcGroup`, `pluginRoute`, `clientAuth`, `tokenMessage`, `clientElevated`
 * and `authAdmin`, names a list cannot anticipate. A denylist of the half dozen
 * http CLIENT objects is a closed set and the router half is open, so the
 * closed set is the one written down.
 */
export const CLIENT_RECV =
  /^(requests|axios|http|https|httpx|urllib|fetch|client|session|req|reqwest|superagent|got|ky|rest|api_client|httpclient|webclient|resttemplate|urlsession|okhttp)$/i;

/**
 * Receivers that name an assertion or a mocking chain. A callee whose
 * receiver is one of these is a test LOOKING AT a gate, never the gate: the
 * hand sample's false `gate.auth` rows are `expect(authenticate)…` and
 * `assert authenticated_user…`, research 118 §6.1.
 */
export const ASSERTION_RECV = /^(expect|assert|should|mock|stub|spy|sinon|jest|vi|t)$/;

/**
 * A path a test file walks is a REQUEST to a route, never a declaration of
 * one, and a `raise` in a test is a fixture rather than a refusal the product
 * makes. This is a PATH convention and it is the stated limit: a test in a
 * file named without `test`/`spec` is read as product code.
 */
export function isTestPath(file: string): boolean {
  return (
    /(^|[._\-/])(test|tests|spec|specs|__tests__|testing)([._\-/]|$)/i.test(file) ||
    /_test\.[a-z]+$/i.test(file)
  );
}

/**
 * Does a string literal read as a route or file PATH rather than prose?
 *
 * A leading slash decides on its own, so a hostile route reaches its subject
 * verbatim (`conformance:facts` rule 8 pins `/x; rm -rf ~`), and the one thing
 * refused after it is a CONTROL CHARACTER: a real line break inside a route
 * is not a route, it is a string that happened to begin with a slash.
 */
export function pathish(v: string): boolean {
  if (v.length === 0 || v.length > 200) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(v)) return false;
  if (v.startsWith('/')) return true;
  return /^[a-z0-9\-][a-z0-9_\-/:{}*.<>=]*$/i.test(v) && v.includes('/');
}

/** The first path shaped string argument, or null. */
export function firstPath(s: ExtractedCall): string | null {
  for (const a of s.args) if (pathish(a)) return a;
  return null;
}

/** A word that reads as a channel, event or topic name rather than prose. */
export function channelish(v: string): boolean {
  return v.length > 0 && v.length <= 80 && /^[a-z0-9][a-z0-9_.:\-/]*$/i.test(v) && !v.includes(' ');
}

/**
 * A channel name on a receiver that is ALREADY the closed IPC set. The
 * receiver carries the whole weight there, so the name is read as it was
 * written, bounded and free of line breaks, and a hostile one travels into
 * the subject verbatim rather than being quietly dropped.
 */
export function ipcChannelName(v: string): boolean {
  return v.length > 0 && v.length <= 80 && !/[\r\n\0]/.test(v);
}

/** A decorator, an attribute or an annotation: the forms that WRAP a target. */
export function isAnnotation(form: ExtractedCall['form']): boolean {
  return form === 'decorator' || form === 'attribute';
}

/**
 * The worker's own callee split, re-exported so the wrapper pass can re-split
 * an INNER callee it substitutes for a site's own with the same arithmetic
 * every captured site was split by.
 */
export { splitCallee } from '../../symbols/calls';
