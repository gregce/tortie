// The hand sample's own false rows for the dropped rules. Each yields nothing.
const LOADING_CJS_FILES = new Set<string>();
export function decoys(f: unknown, filepath: string): void {
  Object.create(null);
  LOADING_CJS_FILES.delete(filepath);
  Foo.update(f);
  [].every((x: unknown) => x === null);
}
