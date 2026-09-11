/**
 * The vendor filter (Phase 257, research 118 §6.1).
 *
 * The deterministic half has no notion of "the project's own code", and git
 * tracked-ness does not supply one: alamofire tracks a jQuery build inside
 * `docs/` and babel tracks `.yarn/releases/yarn-4.17.0.cjs`. Nineteen of the
 * 341 hand judged facts were third party bytes the project only carries, and
 * refusing them is the single cheapest precision win there is, 79% to 84%.
 *
 * Two halves, and the reason names which one fired. The PATH half is a closed
 * list of directory segments and two basename shapes. The BYTES half is a
 * heuristic, and that is its stated limit: a generated file with short lines
 * and no banner is read as first party. A vendored file is linked with no
 * facts and counted, so the denominator stays honest.
 */

/** Path segments that mean "not this project's code". One segment, or two joined by `/`. */
const VENDOR_SEGMENTS: readonly string[] = [
  'vendor',
  'vendors',
  'third_party',
  'third-party',
  'node_modules',
  '.yarn',
  'dist',
  'build/vendor',
  'bower_components',
  'Pods',
  'Carthage/Checkouts',
  '.venv',
  'site-packages'
];

/** A minified basename. */
const MINIFIED_BASENAME = /(\.min\.(js|css)|-min\.js)$/;

/** Any line this long is a minified or generated file. */
const LONG_LINE = 2000;
/** With a `/*!` banner or a source map comment, a line this long is enough. */
const BANNER_LINE = 500;

const NEWLINE = 0x0a;

/** The reason a path or its bytes are vendored, or null when the file is read. */
export function vendoredReason(relPath: string, buf: Buffer): string | null {
  const byPath = pathReason(relPath);
  if (byPath !== null) return byPath;
  return bytesReason(buf);
}

function pathReason(relPath: string): string | null {
  const slashed = `/${relPath}/`;
  for (const seg of VENDOR_SEGMENTS) {
    if (slashed.includes(`/${seg}/`)) return `path: segment ${seg}`;
  }
  const base = relPath.slice(relPath.lastIndexOf('/') + 1);
  if (MINIFIED_BASENAME.test(base)) return `path: basename ${base}`;
  return null;
}

function bytesReason(buf: Buffer): string | null {
  let longest = 0;
  let start = 0;
  let firstLine: string | null = null;
  let sourceMap = false;
  for (let i = 0; i <= buf.length; i += 1) {
    if (i === buf.length || buf[i] === NEWLINE) {
      const len = i - start;
      if (len >= LONG_LINE) return `bytes: a line of ${len} bytes`;
      if (len > longest) longest = len;
      if (len > 0 && len < 200) {
        const line = buf.toString('utf8', start, i);
        if (firstLine === null && line.trim() !== '') firstLine = line;
        if (line.startsWith('//# sourceMappingURL=')) sourceMap = true;
      } else if (len > 0 && firstLine === null) {
        firstLine = buf.toString('utf8', start, Math.min(i, start + 8));
      }
      start = i + 1;
    }
  }
  if (longest >= BANNER_LINE) {
    if (firstLine !== null && firstLine.trimStart().startsWith('/*!')) {
      return `bytes: /*! banner with a line of ${longest} bytes`;
    }
    if (sourceMap) return `bytes: sourceMappingURL with a line of ${longest} bytes`;
  }
  return null;
}
