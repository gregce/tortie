/**
 * The PROXY protocol v2 header, read strictly and never trusted (Phase 330,
 * build/p330/SPEC.md §4.6 step 1).
 *
 * Tailscale's Funnel child is started with `--proxy-protocol=2`, so every
 * connection it forwards to the door begins with this header before the TLS
 * bytes (`ipn/ipnlocal/serve.go:710-765`, written with `go-proxyproto` and no
 * TLVs). THE HEADER IS NOT A SECURITY PROPERTY and nothing here pretends it
 * is: the door binds `127.0.0.1`, and any process on this Mac can connect and
 * write a header naming any address it likes (research 132 §7.3). It exists so
 * the per-source limiter in `./limits.ts` ALWAYS has a key, and a connection
 * without one is refused rather than counted under a default.
 *
 * THIS MODULE DOES NOT READ THE SOURCE. It checks the header's STRUCTURE — the
 * signature, the version and command, the family, the length — and hands the
 * address block on as opaque bytes. `./limits.ts` is the one reader of what is
 * inside it (`conformance:pocket` P1), and nothing that leaves this door
 * process carries it.
 *
 * Pure: no socket, no timer, no state. The caller buffers and asks again.
 */

/** The twelve-byte v2 signature, "\r\n\r\n\0\r\nQUIT\n". */
export const PROXY_V2_SIGNATURE = Buffer.from([
  0x0d, 0x0a, 0x0d, 0x0a, 0x00, 0x0d, 0x0a, 0x51, 0x55, 0x49, 0x54, 0x0a
]);

/** Version 2 and the PROXY command. LOCAL (`0x20`) and everything else refuse. */
export const PROXY_V2_VERSION_COMMAND = 0x21;
/** AF_INET over STREAM. */
export const PROXY_V2_TCP4 = 0x11;
/** AF_INET6 over STREAM. */
export const PROXY_V2_TCP6 = 0x21;
/** The fixed part: signature, version and command, family, length. */
export const PROXY_V2_FIXED_BYTES = 16;
/** Source and destination address and port, for each family. */
export const PROXY_V2_TCP4_ADDRESS_BYTES = 12;
export const PROXY_V2_TCP6_ADDRESS_BYTES = 36;
/** The most the variable part may claim. Anything longer is refused. */
export const PROXY_V2_MAX_LENGTH = 216;
/** The most bytes a whole header can be. */
export const PROXY_V2_MAX_BYTES = PROXY_V2_FIXED_BYTES + PROXY_V2_MAX_LENGTH;

/** A header whose structure held. The address block is opaque here. */
export interface ProxyHeader {
  readonly family: 'tcp4' | 'tcp6';
  /** Exactly the family's address block (source, destination, ports), never TLVs. */
  readonly addressBlock: Buffer;
  /** How many bytes the whole header took. */
  readonly headerBytes: number;
}

export type ProxyRead =
  /** Everything so far is a prefix of a valid header; send more. */
  | { readonly kind: 'more' }
  /** It is not a v2 PROXY header, or it is one this door refuses. */
  | { readonly kind: 'refused' }
  /** The header, and whatever arrived after it (the ClientHello, usually). */
  | { readonly kind: 'ok'; readonly header: ProxyHeader; readonly rest: Buffer };

/**
 * Read a v2 header off the front of everything the connection has sent so far.
 *
 * Refuses as EARLY as the bytes allow: a first byte that is not the
 * signature's refuses at once rather than waiting out the timer, so a client
 * that speaks TLS straight at the port (no header) is refused on its first
 * segment.
 */
export function readProxyV2(buffered: Buffer): ProxyRead {
  const signatureSeen = Math.min(buffered.length, PROXY_V2_SIGNATURE.length);
  if (!buffered.subarray(0, signatureSeen).equals(PROXY_V2_SIGNATURE.subarray(0, signatureSeen))) {
    return { kind: 'refused' };
  }
  if (buffered.length >= 13 && buffered[12] !== PROXY_V2_VERSION_COMMAND) return { kind: 'refused' };
  if (buffered.length >= 14) {
    const family = buffered[13];
    if (family !== PROXY_V2_TCP4 && family !== PROXY_V2_TCP6) return { kind: 'refused' };
  }
  if (buffered.length < PROXY_V2_FIXED_BYTES) return { kind: 'more' };
  const family = buffered[13] === PROXY_V2_TCP4 ? 'tcp4' : 'tcp6';
  const length = buffered.readUInt16BE(14);
  const minimum = family === 'tcp4' ? PROXY_V2_TCP4_ADDRESS_BYTES : PROXY_V2_TCP6_ADDRESS_BYTES;
  if (length < minimum || length > PROXY_V2_MAX_LENGTH) return { kind: 'refused' };
  const total = PROXY_V2_FIXED_BYTES + length;
  if (buffered.length < total) return { kind: 'more' };
  // TLVs, if any, are the bytes between the address block and `total`. They
  // are skipped, never read.
  const addressBlock = Buffer.from(
    buffered.subarray(PROXY_V2_FIXED_BYTES, PROXY_V2_FIXED_BYTES + minimum)
  );
  return {
    kind: 'ok',
    header: { family, addressBlock, headerBytes: total },
    rest: Buffer.from(buffered.subarray(total))
  };
}
