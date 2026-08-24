/**
 * The only browser shaped globals shared code may name, declared by hand.
 *
 * Phase 144 stage 3 removed the DOM library from tsconfig.shared.json.
 * Shared code compiles into both processes, so it may use only what both
 * provide, and the whole DOM library made window, document and every other
 * browser global look valid in code that runs in main. Exactly two members
 * were really in use, and they are the two declared here:
 *
 *  - the URL constructor, used by clone-url.ts to parse and rewrite a
 *    pasted clone address. Both runtimes provide the WHATWG URL class as a
 *    global, so shared may name it.
 *  - the File handle named by the preload drop contract in ipc/terminal.ts.
 *    Shared only passes the handle through, and research 16 §4.2 forbids
 *    ever constructing one, so there is deliberately no File constructor
 *    below.
 *
 * These declarations are inputs to the shared project only. An input .d.ts
 * is never re-emitted through a project reference, so main, preload and the
 * renderer keep resolving URL and File against their own ambient types,
 * being @types/node in main and preload and the DOM library in the
 * renderer.
 *
 * build/assert-shared-types.mjs holds this file narrow. It proves the URL
 * operations and the File handle still compile in a shared shaped program,
 * and that window, document, process, Buffer, electron/main and
 * electron/renderer each fail there. Add a member here only when shared
 * production code needs it in both processes, and never add the DOM
 * library or the Node types to compensate.
 */

/** The WHATWG URL members clone-url.ts actually uses, and no more. */
interface URL {
  protocol: string;
  hostname: string;
  host: string;
  pathname: string;
  search: string;
  hash: string;
  username: string;
  password: string;
  toString(): string;
}

declare var URL: {
  prototype: URL;
  /** Throws on an address that does not parse, in both runtimes. */
  new (url: string): URL;
};

/**
 * An opaque dropped file handle. Shared code names it in the preload drop
 * contract and passes it through untouched. It never reads the bytes and
 * never constructs one, so the three identity fields are the whole surface.
 */
interface File {
  readonly name: string;
  readonly size: number;
  readonly type: string;
}
