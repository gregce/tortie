/**
 * THE ONE PLACE A RESPONSE LEAVES THE DOOR (Phase 313; moved into the door
 * process by Phase 330, build/p330/SPEC.md §4.6 step 6).
 *
 * Every answer and every refusal goes through {@link sendPocket}, so the
 * headers below are on every byte the door ever sends. `Referrer-Policy` in
 * particular is emitted here and nowhere else (`conformance:pocket` S1): a
 * URL-borne secret leaks by `Referer` the first time a client follows an
 * outbound link, and although nothing this door needs is in a URL, one header
 * in one place cannot be forgotten by a route added later.
 *
 * ALWAYS AN EXPLICIT `Content-Length`, `0` INCLUDED, AND NEVER
 * `Transfer-Encoding` (`conformance:pocket` C1). The phone's HTTP/1.1 reader is
 * hand-written and bounded (build/p330/SPEC.md §4.12.3): it requires the
 * length and refuses any transfer coding. A body written by `res.end(body)`
 * with no length is sent with the length Node computes, but a later round that
 * streamed an answer would switch to chunked with every other gate green, so
 * the length is set here in so many words and the answer is never streamed.
 */

import type { ServerResponse } from 'node:http';

export function sendPocket(res: ServerResponse, status: number, body: string | null): void {
  if (res.headersSent || res.writableEnded || res.destroyed) return;
  const bytes = body === null ? null : Buffer.from(body, 'utf8');
  res.statusCode = status;
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (bytes !== null) res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Length', String(bytes === null ? 0 : bytes.length));
  res.end(bytes ?? undefined);
}
